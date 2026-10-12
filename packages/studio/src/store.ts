import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { StudioError } from './errors.ts';
import { newAlias, newId } from './ids.ts';
import { KIND_DIR, KINDS, SCHEMAS, STAGE_IDS, type Actor, type Creature, type Kind, type NewRecord, type RecordMap } from './schema.ts';

export const LOCK_STALE_MS = 12 * 60 * 60 * 1000;

export interface LockInfo {
	session: string;
	pid: number;
	at: string;
}

export interface CreatureData {
	creature: Creature;
	references: RecordMap['reference'][];
	parts: RecordMap['part'][];
	holds: RecordMap['hold'][];
	defects: RecordMap['defect'][];
	builds: RecordMap['build'][];
	notes: RecordMap['note'][];
}

export interface MutateOptions {
	actor: Actor;
	expectedRev?: number;
	/** The session label of the caller; when given it must match the lock holder. */
	session?: string;
	/** Only for the effects of a review Nick gave in the studio screen, which needs no lock. */
	bypassLock?: boolean;
}

type Change<K extends Kind> = Partial<RecordMap[K]> | ((draft: RecordMap[K]) => RecordMap[K] | void);

export function creatureDir(repoRoot: string, key: string): string {
	return join(repoRoot, 'art', 'creatures', key);
}

export function listCreatureKeys(repoRoot: string): string[] {
	const base = join(repoRoot, 'art', 'creatures');
	if (!existsSync(base)) return [];
	return readdirSync(base, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.sort();
}

export function writeJsonAtomic(file: string, value: unknown): void {
	const tmp = `${file}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
	writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
	renameSync(tmp, file);
}

export function kindOfLetter(letter: string | undefined): Kind | undefined {
	switch (letter) {
		case 'C': return 'creature';
		case 'R': return 'reference';
		case 'P': return 'part';
		case 'H': return 'hold';
		case 'D': return 'defect';
		case 'B': return 'build';
		case 'N': return 'note';
		default: return undefined;
	}
}

export function emptyStages(): Creature['stages'] {
	const stages: Record<string, { status: string }> = {};
	for (const id of STAGE_IDS) stages[id] = { status: id === 'intake' ? 'open' : 'locked' };
	return stages as unknown as Creature['stages'];
}

export interface Store {
	readonly root: string;
	readonly key: string;
	readonly dir: string;
	load(): CreatureData;
	list<K extends Kind>(kind: K): RecordMap[K][];
	get(idOrAlias: string): { kind: Kind; record: RecordMap[Kind] } | undefined;
	create<K extends Exclude<Kind, 'creature'>>(kind: K, data: NewRecord<K>, actor: Actor, opts?: { session?: string; bypassLock?: boolean }): RecordMap[K];
	update<K extends Kind>(idOrAlias: string, change: Change<K>, opts: MutateOptions): RecordMap[K];
	/** Deletes a part that is still only proposed. Nothing else is ever deleted. */
	removeProposedPart(idOrAlias: string, opts: MutateOptions): void;
	readLock(): LockInfo | undefined;
	acquireLock(session: string): LockInfo;
	releaseLock(): void;
}

export interface InitInput {
	key: string;
	name: string;
	speciesTemplate: string;
	silhouette: string;
	defaultBudget?: Creature['defaultBudget'];
	provenance?: string;
}

/** Creates art/creatures/<key>/creature.json. Refuses when it already exists. */
export function initCreature(repoRoot: string, input: InitInput, actor: Actor = 'orchestrator'): Store {
	const dir = creatureDir(repoRoot, input.key);
	if (existsSync(join(dir, 'creature.json'))) throw new StudioError(`creature ${input.key} already exists`);
	mkdirSync(dir, { recursive: true });
	for (const sub of Object.values(KIND_DIR)) mkdirSync(join(dir, sub), { recursive: true });
	const now = new Date().toISOString();
	const raw = {
		id: newId('creature'),
		alias: newAlias('creature', new Set()),
		rev: 1,
		createdAt: now,
		updatedAt: now,
		createdBy: actor,
		key: input.key,
		name: input.name,
		speciesTemplate: input.speciesTemplate,
		silhouette: input.silhouette,
		stages: emptyStages(),
		defaultBudget: input.defaultBudget ?? { builds: 6, wallMinutes: 180 },
		...(input.provenance ? { provenance: input.provenance } : {}),
	};
	writeJsonAtomic(join(dir, 'creature.json'), SCHEMAS.creature.parse(raw));
	return openCreature(repoRoot, input.key);
}

export function openCreature(repoRoot: string, key: string): Store {
	const dir = creatureDir(repoRoot, key);
	if (!existsSync(join(dir, 'creature.json'))) throw new StudioError(`no creature ${key} (expected art/creatures/${key}/creature.json)`);

	const lockFile = join(dir, '.lock');

	function fileFor(kind: Kind, id: string): string {
		if (kind === 'creature') return join(dir, 'creature.json');
		return join(dir, KIND_DIR[kind], `${id}.json`);
	}

	function readKind<K extends Kind>(kind: K): RecordMap[K][] {
		if (kind === 'creature') {
			const result = SCHEMAS.creature.safeParse(JSON.parse(readFileSync(join(dir, 'creature.json'), 'utf8')));
			if (!result.success) throw new StudioError(`creature.json is invalid: ${result.error.issues[0]?.message ?? 'schema error'}`);
			return [result.data] as RecordMap[K][];
		}
		const sub = join(dir, KIND_DIR[kind as Exclude<Kind, 'creature'>]);
		if (!existsSync(sub)) return [];
		const out = readdirSync(sub)
			.filter((f) => f.endsWith('.json'))
			.sort()
			.map((f) => {
				const result = SCHEMAS[kind].safeParse(JSON.parse(readFileSync(join(sub, f), 'utf8')));
				if (!result.success) throw new StudioError(`${kind}/${f} is invalid: ${result.error.issues[0]?.message ?? 'schema error'}`);
				return result.data;
			});
		return out as RecordMap[K][];
	}

	function allAliases(): Set<string> {
		const set = new Set<string>();
		for (const kind of KINDS) for (const r of readKind(kind)) set.add(r.alias);
		return set;
	}

	function readLock(): LockInfo | undefined {
		if (!existsSync(lockFile)) return undefined;
		try {
			const info = JSON.parse(readFileSync(lockFile, 'utf8')) as LockInfo;
			if (Date.now() - Date.parse(info.at) > LOCK_STALE_MS) return undefined;
			return info;
		} catch {
			return undefined;
		}
	}

	function assertCanMutate(session?: string): void {
		const lock = readLock();
		if (!lock) throw new StudioError(`creature ${key} is not locked; run: studio lock ${key} --session <label>`);
		if (session === undefined) {
			throw new StudioError(`creature ${key} is locked; pass --session <label> (or set STUDIO_SESSION) to write to it`);
		}
		if (session !== lock.session) {
			throw new StudioError(`creature ${key} is locked by session "${lock.session}", not "${session}"`);
		}
	}

	const store: Store = {
		root: repoRoot,
		key,
		dir,
		load() {
			return {
				creature: readKind('creature')[0]!,
				references: readKind('reference'),
				parts: readKind('part'),
				holds: readKind('hold'),
				defects: readKind('defect'),
				builds: readKind('build'),
				notes: readKind('note'),
			};
		},
		list(kind) {
			return readKind(kind);
		},
		get(idOrAlias) {
			const kind = kindOfLetter(idOrAlias[0]);
			if (!kind) return undefined;
			for (const r of readKind(kind)) {
				if (r.id === idOrAlias || r.alias === idOrAlias) return { kind, record: r };
			}
			return undefined;
		},
		create(kind, data, actor, opts = {}) {
			const note = data as NewRecord<'note'>;
			const reviewByNickViaStudio = kind === 'note' && note.kind === 'review' && note.by === 'nick' && note.via === 'studio';
			// Nick's own act in the review screen (a mark, a review, a choice) needs no lock; nobody else gets this.
			const nickInScreen = opts.bypassLock === true && actor === 'nick';
			if (!reviewByNickViaStudio && !nickInScreen) assertCanMutate(opts.session);
			const now = new Date().toISOString();
			const raw = {
				id: newId(kind),
				alias: newAlias(kind, allAliases()),
				rev: 1,
				createdAt: now,
				updatedAt: now,
				createdBy: actor,
				...(data as object),
			};
			const parsed = SCHEMAS[kind].parse(raw) as RecordMap[typeof kind];
			writeJsonAtomic(fileFor(kind, parsed.id), parsed);
			return parsed;
		},
		update(idOrAlias, change, opts) {
			if (!opts.bypassLock) assertCanMutate(opts.session);
			const found = store.get(idOrAlias);
			if (!found) throw new StudioError(`no record ${idOrAlias} in ${key}`);
			const current = found.record;
			if (opts.expectedRev !== undefined && opts.expectedRev !== current.rev) {
				throw new StudioError(`${current.alias} is at rev ${current.rev}, not ${opts.expectedRev}; reload and retry`);
			}
			const draft = structuredClone(current) as RecordMap[Kind];
			let next: RecordMap[Kind];
			if (typeof change === 'function') {
				const returned = (change as (d: RecordMap[Kind]) => RecordMap[Kind] | void)(draft);
				next = (returned ?? draft) as RecordMap[Kind];
			} else {
				next = { ...draft, ...(change as object) } as RecordMap[Kind];
			}
			for (const f of ['id', 'alias', 'createdAt', 'createdBy'] as const) {
				if (next[f] !== current[f]) throw new StudioError(`${f} of ${current.alias} cannot change`);
			}
			next = { ...next, rev: current.rev + 1, updatedAt: new Date().toISOString() } as RecordMap[Kind];
			const parsed = SCHEMAS[found.kind].parse(next) as RecordMap[Kind];
			// Re-read just before writing so a concurrent writer is caught.
			const again = store.get(current.id);
			if (!again || again.record.rev !== current.rev) throw new StudioError(`${current.alias} changed while updating; reload and retry`);
			writeJsonAtomic(fileFor(found.kind, current.id), parsed);
			return parsed as never;
		},
		removeProposedPart(idOrAlias, opts) {
			if (!opts.bypassLock) assertCanMutate(opts.session);
			const found = store.get(idOrAlias);
			if (!found || found.kind !== 'part') throw new StudioError(`no part ${idOrAlias} in ${key}`);
			if ((found.record as RecordMap['part']).status !== 'proposed') throw new StudioError(`part ${found.record.alias} is not a proposed part; only proposed parts can be removed`);
			unlinkSync(fileFor('part', found.record.id));
		},
		readLock,
		acquireLock(session) {
			const existing = readLock();
			if (existing && existing.session !== session) {
				throw new StudioError(`creature ${key} is locked by session "${existing.session}" since ${existing.at}`);
			}
			const info: LockInfo = { session, pid: process.pid, at: new Date().toISOString() };
			writeFileSync(lockFile, `${JSON.stringify(info, null, 2)}\n`);
			return info;
		},
		releaseLock() {
			if (existsSync(lockFile)) rmSync(lockFile);
		},
	};
	return store;
}
