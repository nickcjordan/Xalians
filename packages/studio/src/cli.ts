import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { applyReview, canPresent, findPart, planBuild, status as computeStatus, submitReport, type StatusReport } from './engine.ts';
import { StudioError } from './errors.ts';
import { ALIAS_PATTERN, SCHEMAS, type Actor, type Build, type Check, type NewRecord } from './schema.ts';
import { initCreature, listCreatureKeys, openCreature, type Store } from './store.ts';
import { verifyAll } from './verify.ts';

export interface Io {
	out(line: string): void;
}

const OPTIONS = {
	json: { type: 'boolean' },
	root: { type: 'string' },
	name: { type: 'string' },
	template: { type: 'string' },
	silhouette: { type: 'string' },
	builds: { type: 'string' },
	minutes: { type: 'string' },
	session: { type: 'string' },
	by: { type: 'string' },
	file: { type: 'string' },
	reason: { type: 'string' },
	part: { type: 'string' },
	kind: { type: 'string' },
	goal: { type: 'string' },
	method: { type: 'string' },
	targets: { type: 'string' },
	'allow-multiple': { type: 'boolean' },
	role: { type: 'string' },
	camera: { type: 'string' },
	image: { type: 'string' },
	note: { type: 'string' },
} as const;

type Flags = ReturnType<typeof parseArgs<{ options: typeof OPTIONS; allowPositionals: true }>>['values'];

function findRoot(explicit?: string): string {
	if (explicit) return resolve(explicit);
	if (process.env.STUDIO_ROOT) return resolve(process.env.STUDIO_ROOT);
	let dir = process.cwd();
	for (;;) {
		if (existsSync(join(dir, 'packages', 'studio', 'package.json'))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return process.cwd();
		dir = parent;
	}
}

function need(flags: Flags, name: keyof typeof OPTIONS): string {
	const v = flags[name];
	if (typeof v !== 'string' || v === '') throw new StudioError(`missing --${name}`);
	return v;
}

function readJsonFile(file: string): any {
	if (!existsSync(file)) throw new StudioError(`file not found: ${file}`);
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch (e) {
		throw new StudioError(`${file} is not valid JSON: ${(e as Error).message}`);
	}
}

/** Replaces any string that is exactly a record alias with that record's id, anywhere in the value. */
function resolveAliases(store: Store, value: any): any {
	if (typeof value === 'string') {
		if (ALIAS_PATTERN.test(value)) {
			const found = store.get(value);
			if (found) return found.record.id;
		}
		return value;
	}
	if (Array.isArray(value)) return value.map((v) => resolveAliases(store, v));
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveAliases(store, v)]));
	}
	return value;
}

function recordRef(store: Store, ref: string, kind: string): string {
	const found = store.get(ref);
	if (!found || found.kind !== kind) throw new StudioError(`no ${kind} ${ref}`);
	return found.record.id;
}

function minutesBetween(from: string | undefined, to: Date): number | undefined {
	if (!from) return undefined;
	return Math.round(((to.getTime() - Date.parse(from)) / 60000) * 100) / 100;
}

export function run(argv: string[], io: Io = { out: (l) => console.log(l) }): number {
	try {
		const { values: flags, positionals } = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
		execute(flags, positionals, io);
		return 0;
	} catch (e) {
		const message = e instanceof StudioError ? e.message : e instanceof Error && e.name === 'ZodError' ? zodMessage(e) : e instanceof Error ? e.message : String(e);
		console.error(`studio: ${message.split('\n')[0]}`);
		return 1;
	}
}

function zodMessage(e: Error): string {
	const issues = (e as unknown as { issues: { path: (string | number)[]; message: string }[] }).issues;
	const first = issues[0];
	return first ? `invalid ${first.path.join('.') || 'value'}: ${first.message}` : e.message;
}

function execute(flags: Flags, pos: string[], io: Io): void {
	const root = findRoot(flags.root);
	const actor = (flags.by ?? 'orchestrator') as Actor;
	const session = flags.session ?? process.env.STUDIO_SESSION;
	const emit = (data: unknown, text: string) => io.out(flags.json ? JSON.stringify(data, null, 2) : text);

	const [cmd, ...rest] = pos;
	if (!cmd) throw new StudioError('no command; try: init, status, next, lock, unlock, part, hold, defect, note, build, verify');

	if (cmd === 'verify') {
		const result = verifyAll(root);
		emit(result, result.errors.length === 0 ? `ok: ${result.creatures} creatures, ${result.records} records` : result.errors.join('\n'));
		if (result.errors.length > 0) throw new StudioError(`verify found ${result.errors.length} problem(s)`);
		return;
	}

	if (cmd === 'list') {
		emit(listCreatureKeys(root), listCreatureKeys(root).join('\n'));
		return;
	}

	const GROUPS = ['part', 'hold', 'defect', 'note', 'build'];
	const grouped = GROUPS.includes(cmd);
	const sub = grouped ? rest[0] : undefined;
	const key = grouped ? rest[1] : rest[0];
	const args = grouped ? rest.slice(2) : rest.slice(1);
	if (!key) throw new StudioError(`${cmd}: missing creature key`);

	if (cmd === 'init') {
		const store = initCreature(root, { key, name: need(flags, 'name'), speciesTemplate: need(flags, 'template'), silhouette: need(flags, 'silhouette'), ...(flags.builds || flags.minutes ? { defaultBudget: { builds: Number(flags.builds ?? 6), wallMinutes: Number(flags.minutes ?? 180) } } : {}) }, actor);
		const c = store.load().creature;
		emit(c, `created creature ${c.key} (${c.alias})`);
		return;
	}

	const store = openCreature(root, key);
	const mopts = { actor, ...(session ? { session } : {}) };
	const copts = session ? { session } : {};

	switch (cmd) {
		case 'status': {
			const s = computeStatus(store.load());
			emit(s, formatStatus(s));
			return;
		}
		case 'next': {
			const s = computeStatus(store.load());
			emit({ next: s.next }, s.next);
			return;
		}
		case 'lock': {
			const info = store.acquireLock(session ?? need(flags, 'session'));
			emit(info, `locked ${key} for session ${info.session}`);
			return;
		}
		case 'unlock': {
			store.releaseLock();
			emit({ unlocked: true }, `unlocked ${key}`);
			return;
		}
		case 'part':
			return partCommand(store, sub, flags, emit, actor, copts);
		case 'hold':
			return holdCommand(store, sub, args, flags, emit, actor, mopts, copts);
		case 'defect': {
			if (sub !== 'add') throw new StudioError('usage: defect add <key> --file defect.json');
			const input = resolveAliases(store, readJsonFile(need(flags, 'file')));
			if (typeof input.part === 'string' && !input.part.startsWith('P-')) input.part = findPart(store.load(), input.part).id;
			const rec = store.create('defect', { status: 'open', attempts: [], origin: 'orchestrator', ...input } as NewRecord<'defect'>, actor, copts);
			emit(rec, `added defect ${rec.alias}`);
			return;
		}
		case 'note': {
			if (sub !== 'add') throw new StudioError('usage: note add <key> --file note.json');
			return noteAdd(store, flags, emit, actor, mopts, copts);
		}
		case 'build':
			return buildCommand(store, sub, args, flags, emit, actor, mopts, copts);
		default:
			throw new StudioError(`unknown command ${cmd}`);
	}
}

type Emit = (data: unknown, text: string) => void;
type MOpts = { actor: Actor; session?: string };
type COpts = { session?: string };

function partCommand(store: Store, sub: string | undefined, flags: Flags, emit: Emit, actor: Actor, copts: COpts): void {
	if (sub !== 'add') throw new StudioError('usage: part add <key> --file part.json');
	const creature = store.load().creature;
	const input = resolveAliases(store, readJsonFile(need(flags, 'file')));
	const rec = store.create('part', { includes: [], why: '', scope: {}, dependsOn: [], order: store.list('part').length + 1, status: 'not-started', budget: { ...creature.defaultBudget }, ...input } as NewRecord<'part'>, actor, copts);
	emit(rec, `added part ${rec.alias} (${rec.key})`);
}

function holdCommand(store: Store, sub: string | undefined, args: string[], flags: Flags, emit: Emit, actor: Actor, mopts: MOpts, copts: COpts): void {
	if (sub === 'add') {
		const input = resolveAliases(store, readJsonFile(need(flags, 'file')));
		const now = new Date().toISOString();
		const rec = store.create('hold', { scope: {}, status: 'active', history: [{ at: now, status: 'active', by: actor, reason: 'created' }], ...input } as NewRecord<'hold'>, actor, copts);
		emit(rec, `added hold ${rec.alias}`);
		return;
	}
	if (sub === 'strike' || sub === 'lift') {
		const ref = args[0];
		if (!ref) throw new StudioError(`usage: hold ${sub} <key> <alias> --reason "..."`);
		const reason = need(flags, 'reason');
		const next = sub === 'strike' ? 'struck' : 'lifted';
		const rec = store.update<'hold'>(ref, (h) => {
			if (h.status !== 'active') throw new StudioError(`hold ${h.alias} is already ${h.status}`);
			h.status = next;
			h.history.push({ at: new Date().toISOString(), status: next, by: actor, reason });
		}, mopts);
		emit(rec, `${next} hold ${rec.alias}`);
		return;
	}
	throw new StudioError('usage: hold add|strike|lift <key> ...');
}

function noteAdd(store: Store, flags: Flags, emit: Emit, actor: Actor, mopts: MOpts, copts: COpts): void {
	const input = resolveAliases(store, readJsonFile(need(flags, 'file')));
	if (input.kind === 'review' && input.by !== 'nick') throw new StudioError('a review note must be by nick');
	const rec = store.create('note', input as NewRecord<'note'>, actor, copts);
	const applied: string[] = [];
	if (rec.kind === 'review') {
		const data = store.load();
		const updates = applyReview(data, rec);
		const opts = rec.by === 'nick' && rec.via === 'studio' ? { ...mopts, bypassLock: true } : mopts;
		for (const p of updates.parts) { store.update<'part'>(p.id, () => p, opts); applied.push(`part ${p.alias} ${p.status}`); }
		for (const h of updates.holds) { store.update<'hold'>(h.id, () => h, opts); applied.push(`hold ${h.alias} ${h.status}`); }
		for (const d of updates.defects) { store.update<'defect'>(d.id, () => d, opts); applied.push(`defect ${d.alias} ${d.status}`); }
		for (const b of updates.builds) { store.update<'build'>(b.id, () => b, opts); applied.push(`build ${b.alias} ${b.status}`); }
	}
	emit({ note: rec, applied }, `added ${rec.kind} note ${rec.alias}${applied.length ? `; ${applied.join('; ')}` : ''}`);
}

function sha256File(file: string): string {
	if (!existsSync(file)) throw new StudioError(`file not found: ${file}`);
	return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function buildCommand(store: Store, sub: string | undefined, args: string[], flags: Flags, emit: Emit, actor: Actor, mopts: MOpts, copts: COpts): void {
	const ref = args[0];
	const load = (): Build => {
		if (!ref) throw new StudioError(`usage: build ${sub} <key> <alias> ...`);
		const found = store.get(ref);
		if (!found || found.kind !== 'build') throw new StudioError(`no build ${ref}`);
		return found.record as Build;
	};
	const setBuild = (id: string, fn: (b: Build) => void): Build => store.update<'build'>(id, (b) => { fn(b); }, mopts);

	switch (sub) {
		case 'plan': {
			const data = store.load();
			const targets = flags.targets ? flags.targets.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
			const kind = need(flags, 'kind');
			if (kind !== 'preview' && kind !== 'build') throw new StudioError('--kind must be preview or build');
			const planned = planBuild(data, { part: need(flags, 'part'), kind, goal: need(flags, 'goal'), method: need(flags, 'method'), ...(targets ? { targets } : {}), ...(flags['allow-multiple'] ? { allowMultiple: true } : {}) });
			const rec = store.create('build', planned as NewRecord<'build'>, actor, copts);
			for (const d of planned.targets) store.update<'defect'>(d, (x) => { x.attempts.push(rec.id); }, mopts);
			const part = data.parts.find((p) => p.id === planned.part)!;
			if (part.status === 'not-started') store.update<'part'>(part.id, { status: 'in-progress' }, mopts);
			emit(rec, `planned ${rec.kind} ${rec.alias} for part ${part.key}`);
			return;
		}
		case 'start': {
			const b = load();
			if (b.status !== 'planned') throw new StudioError(`build ${b.alias} is ${b.status}, not planned`);
			const rec = setBuild(b.id, (x) => { x.status = 'running'; x.startedAt = new Date().toISOString(); });
			emit(rec, `started ${rec.alias}`);
			return;
		}
		case 'fail': {
			const b = load();
			if (b.status === 'failed' || b.status === 'presented' || b.status === 'reviewed') throw new StudioError(`build ${b.alias} is ${b.status}`);
			const now = new Date();
			const rec = setBuild(b.id, (x) => {
				x.status = 'failed';
				x.endedAt = now.toISOString();
				const m = minutesBetween(x.startedAt, now);
				if (m !== undefined && x.cost.wallMinutes === undefined) x.cost.wallMinutes = m;
			});
			emit(rec, `failed ${rec.alias}`);
			return;
		}
		case 'output': {
			const b = load();
			const file = resolve(need(flags, 'file'));
			const name = need(flags, 'name');
			const out = { name, blob: sha256File(file), path: file, ...(flags.role ? { role: flags.role } : {}), ...(flags.camera ? { camera: flags.camera } : {}) };
			const rec = setBuild(b.id, (x) => { x.outputs = [...x.outputs.filter((o) => o.name !== name), out]; });
			emit(rec, `recorded output ${name} (${out.blob.slice(0, 12)}) on ${rec.alias}`);
			return;
		}
		case 'report': {
			const b = load();
			if (b.status !== 'planned' && b.status !== 'running') throw new StudioError(`build ${b.alias} is ${b.status}; a report needs a planned or running build`);
			const report = resolveAliases(store, readJsonFile(need(flags, 'file')));
			const reported = submitReport(b, report);
			const now = new Date();
			const rec = setBuild(b.id, (x) => {
				x.report = reported.report;
				x.status = 'reported';
				x.endedAt = now.toISOString();
				const m = minutesBetween(x.startedAt, now);
				if (m !== undefined && x.cost.wallMinutes === undefined) x.cost.wallMinutes = m;
			});
			emit(rec, `reported ${rec.alias}`);
			return;
		}
		case 'check': {
			const b = load();
			const raw = readJsonFile(need(flags, 'file'));
			const checks: Check[] = (Array.isArray(raw) ? raw : raw.checks).map((c: unknown) => SCHEMAS.build.shape.checks.element.parse(c));
			const rec = setBuild(b.id, (x) => {
				x.checks = [...x.checks.filter((c) => !checks.some((n) => n.id === c.id)), ...checks];
				if (x.status === 'reported') x.status = 'checked';
			});
			emit(rec, `recorded ${checks.length} check(s) on ${rec.alias}`);
			return;
		}
		case 'look': {
			const b = load();
			const camera = need(flags, 'camera');
			const image = need(flags, 'image');
			const out = b.outputs.find((o) => o.name === image);
			if (!out) throw new StudioError(`build ${b.alias} has no output named ${image}`);
			const rec = setBuild(b.id, (x) => { x.lookNotes = [...x.lookNotes.filter((l) => l.camera !== camera), { camera, imageBlob: out.blob, note: need(flags, 'note') }]; });
			emit(rec, `look note for ${camera} on ${rec.alias}`);
			return;
		}
		case 'present': {
			const b = load();
			if (b.status !== 'reported' && b.status !== 'checked') throw new StudioError(`build ${b.alias} is ${b.status}; report it first`);
			const verdict = canPresent(b);
			if (!verdict.ok) throw new StudioError(`cannot present ${b.alias}: ${verdict.reasons.join('; ')}`);
			const rec = setBuild(b.id, (x) => { x.status = 'presented'; });
			emit(rec, `presented ${rec.alias}`);
			return;
		}
		default:
			throw new StudioError('usage: build plan|start|fail|output|report|check|look|present <key> ...');
	}
}

function formatStatus(s: StatusReport): string {
	const lines: string[] = [`${s.creature}`, '', 'Stages'];
	for (const [id, st] of Object.entries(s.stages)) lines.push(`  ${id.padEnd(11)} ${st}`);
	lines.push('', 'Parts');
	if (s.parts.length === 0) lines.push('  none');
	for (const p of s.parts) {
		lines.push(`  ${p.alias} ${p.key} [${p.status}${p.stale ? ', STALE' : ''}] builds ${p.buildsUsed}, ${p.wallMinutesUsed} min; left ${p.budgetLeft.builds} builds, ${p.budgetLeft.wallMinutes} min${p.approvedBuild ? `; approved ${p.approvedBuild}` : ''}`);
		for (const d of p.openDefects) lines.push(`    defect ${d.alias} (${d.attempts} attempts${p.stalledDefects.includes(d.alias) ? ', STALLED' : ''}): ${d.description}`);
	}
	lines.push('', 'Holds in force');
	if (s.holds.length === 0) lines.push('  none');
	for (const h of s.holds) lines.push(`  ${h.alias} [${h.strength}] ${h.statement}`);
	lines.push('', 'Questions for Nick');
	if (s.openQuestions.length === 0) lines.push('  none');
	for (const q of s.openQuestions) lines.push(`  ${q.alias} ${q.text}`);
	lines.push('', `Next: ${s.next}`);
	return lines.join('\n');
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
	process.exitCode = run(process.argv.slice(2));
}
