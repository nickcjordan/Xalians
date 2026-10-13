import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { putFile } from './blobs.ts';
import { StudioError } from './errors.ts';
import { STAGE_IDS, type Actor, type Intake, type Part, type Reference, type StageId } from './schema.ts';
import { submitProblems, SUBMITTABLE } from './stages.ts';
import { creatureDir, initCreature, openCreature, type Store } from './store.ts';

const KEY = /^[a-z0-9][a-z0-9-]*$/;
const sha256File = (file: string): string => createHash('sha256').update(readFileSync(file)).digest('hex');

export interface Who {
	actor: Actor;
	session?: string;
}

const opts = (who: Who) => ({ actor: who.actor, ...(who.session ? { session: who.session } : {}) });

// ---------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------

export const TEMPLATE_DIR = 'docs/species-templates/v5';
export const SILHOUETTE_DIR = 'apps/web/src/svg/species';
export const ENCYCLOPEDIA_FILE = 'docs/encyclopedia/encyclopedia.json';

/** Repo-relative path of a species template. */
export function templatePath(species: string): string {
	if (!KEY.test(species)) throw new StudioError(`bad species key ${species}`);
	return `${TEMPLATE_DIR}/${species}.json`;
}

/** The sha256 of a template file by its repo-relative path; undefined when it is gone. */
export function liveTemplateSha(repoRoot: string): (path: string) => string | undefined {
	return (path) => {
		const file = join(repoRoot, path);
		return existsSync(file) ? sha256File(file) : undefined;
	};
}

function readJson(file: string): any {
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch (e) {
		throw new StudioError(`${file} is not valid JSON: ${(e as Error).message}`);
	}
}

const text = (v: unknown, what: string): string => {
	if (typeof v !== 'string' || !v.trim()) throw new StudioError(`the species template has no ${what}`);
	return v.trim();
};
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export interface IntakeOptions extends Who {
	/** Species template key; defaults to the creature key. */
	species?: string;
	/** Override for the silhouette SVG; defaults to apps/web/src/svg/species/<species>.svg. */
	silhouette?: string;
	force?: boolean;
}

export interface IntakeResult {
	store: Store;
	created: boolean;
	changed: boolean;
	intake: Intake;
}

/**
 * Reads the species template, the encyclopedia entry and Nick's silhouette into the creature's
 * intake block and opens the intake stage. Creates the creature when it is missing (then takes its
 * lock for the session). Idempotent. An approved intake is not overwritten without `force`; with
 * `force` the stage stays approved and status() reports it stale if the evidence moved.
 */
export function runIntake(repoRoot: string, key: string, o: IntakeOptions): IntakeResult {
	if (!KEY.test(key)) throw new StudioError(`bad creature key ${key}`);
	const species = o.species ?? key;
	const relTemplate = templatePath(species);
	const templateFile = join(repoRoot, relTemplate);
	if (!existsSync(templateFile)) throw new StudioError(`no species template at ${relTemplate}`);
	const template = readJson(templateFile);
	const relSilhouette = o.silhouette ? o.silhouette : `${SILHOUETTE_DIR}/${species}.svg`;
	const silhouetteFile = resolve(repoRoot, relSilhouette);
	if (!existsSync(silhouetteFile)) throw new StudioError(`no silhouette at ${relSilhouette}`);

	// The encyclopedia entry (category xalians) is the fallback source for the lore summary.
	let entryDefinition: string | undefined;
	const encFile = join(repoRoot, ENCYCLOPEDIA_FILE);
	if (existsSync(encFile)) {
		const entry = (readJson(encFile).entries as any[] | undefined)?.find((e) => e.key === species && e.category === 'xalians');
		if (typeof entry?.definition === 'string') entryDefinition = entry.definition;
	}

	const phys = template.physiology ?? {};
	const height = phys.size?.heightCm;
	const sizeCm: [number, number] | null = Array.isArray(height) && height.length === 2 && height.every((n: unknown) => typeof n === 'number') ? [height[0], height[1]] : null;
	const intake: Intake = {
		speciesTemplate: relTemplate,
		templateSha256: sha256File(templateFile),
		name: text(template.name, 'name'),
		element: text(template.element, 'element'),
		homeWorld: text(template.homePlanet, 'homePlanet'),
		bodyPlan: text(phys.bodyPlan, 'physiology.bodyPlan'),
		covering: text(phys.covering, 'physiology.covering'),
		sizeCm,
		loreSummary: text(template.lore?.description ?? entryDefinition, 'lore.description (and no encyclopedia entry to fall back on)'),
		appearance: strings(template.lore?.appearance),
		anatomy: strings(phys.anatomy),
		silhouette: { blob: putFile(silhouetteFile), fileName: basename(silhouetteFile) },
	};

	let created = false;
	let store: Store;
	if (existsSync(join(creatureDir(repoRoot, key), 'creature.json'))) {
		store = openCreature(repoRoot, key);
	} else {
		if (!o.session) throw new StudioError('creating a creature needs --session (or STUDIO_SESSION): intake takes its lock');
		store = initCreature(repoRoot, { key, name: intake.name, speciesTemplate: relTemplate, silhouette: relSilhouette }, o.actor);
		store.acquireLock(o.session);
		created = true;
	}

	const creature = store.load().creature;
	const stage = creature.stages.intake;
	if (stage.status === 'approved' && !o.force) throw new StudioError(`the intake stage of ${key} is approved; pass --force to overwrite its intake`);

	const same = JSON.stringify(creature.intake) === JSON.stringify(intake);
	const nextStatus = stage.status === 'approved' ? 'approved' : stage.status === 'in-review' && same ? 'in-review' : 'open';
	if (same && nextStatus === stage.status) return { store, created, changed: false, intake };

	store.update<'creature'>(creature.id, (c) => {
		c.intake = intake;
		if (nextStatus !== stage.status) c.stages.intake = { status: nextStatus };
	}, opts(o));
	return { store, created, changed: true, intake };
}

// ---------------------------------------------------------------------------
// Proposed parts
// ---------------------------------------------------------------------------

export interface PartProposal {
	key: string;
	name: string;
	includes: string[];
	why: string;
	dependsOn: string[];
	order: number;
}

function checkProposals(raw: unknown): PartProposal[] {
	if (!Array.isArray(raw) || raw.length === 0) throw new StudioError('the parts file must be a non-empty array');
	const items = raw.map((r, i): PartProposal => {
		const at = `part ${i + 1}`;
		if (!r || typeof r !== 'object') throw new StudioError(`${at} is not an object`);
		const o = r as Record<string, unknown>;
		if (typeof o.key !== 'string' || !KEY.test(o.key)) throw new StudioError(`${at}: key must be lowercase letters, digits and dashes`);
		if (typeof o.name !== 'string' || !o.name.trim()) throw new StudioError(`${at} (${o.key}): name is empty`);
		if (!Array.isArray(o.includes) || o.includes.some((x) => typeof x !== 'string')) throw new StudioError(`${at} (${o.key}): includes must be a list of strings`);
		if (typeof o.why !== 'string') throw new StudioError(`${at} (${o.key}): why must be a string`);
		const dependsOn = o.dependsOn ?? [];
		if (!Array.isArray(dependsOn) || dependsOn.some((x) => typeof x !== 'string')) throw new StudioError(`${at} (${o.key}): dependsOn must be a list of part keys`);
		if (typeof o.order !== 'number' || !Number.isInteger(o.order)) throw new StudioError(`${at} (${o.key}): order must be an integer`);
		return { key: o.key, name: o.name.trim(), includes: o.includes as string[], why: o.why, dependsOn: dependsOn as string[], order: o.order };
	});
	const keys = new Set<string>();
	const orders = new Set<number>();
	for (const p of items) {
		if (keys.has(p.key)) throw new StudioError(`duplicate part key ${p.key}`);
		if (orders.has(p.order)) throw new StudioError(`two parts share order ${p.order}`);
		keys.add(p.key);
		orders.add(p.order);
	}
	for (const p of items) {
		for (const d of p.dependsOn) {
			if (d === p.key) throw new StudioError(`part ${p.key} depends on itself`);
			if (!keys.has(d)) throw new StudioError(`part ${p.key} depends on ${d}, which is not in the list`);
		}
	}
	// A dependency cycle would make "reopen what depends on it" meaningless.
	const state = new Map<string, 1 | 2>();
	const byKey = new Map(items.map((p) => [p.key, p]));
	const visit = (k: string, trail: string[]) => {
		if (state.get(k) === 2) return;
		if (state.get(k) === 1) throw new StudioError(`dependency cycle: ${[...trail, k].join(' -> ')}`);
		state.set(k, 1);
		for (const d of byKey.get(k)!.dependsOn) visit(d, [...trail, k]);
		state.set(k, 2);
	};
	for (const p of items) visit(p.key, []);
	return items;
}

/** Replaces the proposed parts in one call. Refused once the intake stage is approved. A submitted intake goes back to open. */
export function proposeParts(store: Store, raw: unknown, who: Who): Part[] {
	const data = store.load();
	if (data.creature.stages.intake.status === 'approved') throw new StudioError('the intake stage is approved; the part list is no longer open for proposing');
	const items = checkProposals(raw);
	const taken = new Map(data.parts.filter((p) => p.status !== 'proposed').map((p) => [p.key, p.alias]));
	for (const p of items) if (taken.has(p.key)) throw new StudioError(`part key ${p.key} is already used by ${taken.get(p.key)}`);

	for (const old of data.parts.filter((p) => p.status === 'proposed')) store.removeProposedPart(old.id, opts(who));
	const budget = { ...data.creature.defaultBudget };
	const made = new Map<string, Part>();
	for (const p of items) {
		made.set(p.key, store.create('part', { key: p.key, name: p.name, includes: p.includes, why: p.why, scope: {}, dependsOn: [], order: p.order, status: 'proposed', budget }, who.actor, who.session ? { session: who.session } : {}));
	}
	const out: Part[] = [];
	for (const p of items) {
		const rec = made.get(p.key)!;
		const deps = p.dependsOn.map((d) => made.get(d)!.id);
		out.push(deps.length ? store.update<'part'>(rec.id, { dependsOn: deps }, opts(who)) : rec);
	}
	if (data.creature.stages.intake.status === 'in-review') store.update<'creature'>(data.creature.id, (c) => { c.stages.intake = { status: 'open' }; }, opts(who));
	return out;
}

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

function imageFile(file: string): string {
	const full = resolve(file);
	if (!existsSync(full)) throw new StudioError(`file not found: ${file}`);
	if (!IMAGE_EXT.has(extname(full).toLowerCase())) throw new StudioError(`a reference image must be PNG, JPG, WEBP or SVG, not ${extname(full) || 'a file with no extension'}`);
	return full;
}

/** A change to references reopens a submitted vision stage (the references belong to it). */
export function reopenReferences(store: Store, who: Who): void {
	const c = store.load().creature;
	if (c.stages.vision.status === 'in-review') store.update<'creature'>(c.id, (x) => { x.stages.vision = { status: 'open' }; }, opts(who));
}

export interface ReferenceInput {
	file: string;
	role: string;
	governs: string[];
	mustNotBeUsedFor: string[];
	precedence?: number;
}

export function addReference(store: Store, input: ReferenceInput, who: Who): Reference {
	if (!input.role.trim()) throw new StudioError('a reference needs a role');
	const file = imageFile(input.file);
	const existing = store.list('reference');
	const precedence = input.precedence ?? existing.reduce((m, r) => Math.max(m, r.precedence), 0) + 1;
	const rec = store.create('reference', { blob: putFile(file), fileName: basename(file), role: input.role.trim(), governs: input.governs, mustNotBeUsedFor: input.mustNotBeUsedFor, precedence }, who.actor, who.session ? { session: who.session } : {});
	reopenReferences(store, who);
	return rec;
}

export interface ReferenceEdit {
	role?: string;
	governs?: string[];
	mustNotBeUsedFor?: string[];
	precedence?: number;
}

export function editReference(store: Store, ref: string, edit: ReferenceEdit, who: Who): Reference {
	const found = store.get(ref);
	if (!found || found.kind !== 'reference') throw new StudioError(`no reference ${ref}`);
	if (edit.role !== undefined && !edit.role.trim()) throw new StudioError('a reference needs a role');
	const rec = store.update<'reference'>(found.record.id, (r) => {
		if (edit.role !== undefined) r.role = edit.role.trim();
		if (edit.governs) r.governs = edit.governs;
		if (edit.mustNotBeUsedFor) r.mustNotBeUsedFor = edit.mustNotBeUsedFor;
		if (edit.precedence !== undefined) r.precedence = edit.precedence;
	}, opts(who));
	reopenReferences(store, who);
	return rec;
}

/** Attaches a derived target image (for example a bare-body target) to a reference. */
export function addDerivedTarget(store: Store, ref: string, file: string, kind: string, provisional: boolean, who: Who): Reference {
	const found = store.get(ref);
	if (!found || found.kind !== 'reference') throw new StudioError(`no reference ${ref}`);
	if (!kind.trim()) throw new StudioError('a derived target needs a kind');
	const blob = putFile(imageFile(file));
	const rec = store.update<'reference'>(found.record.id, (r) => {
		r.derivedTargets = [...(r.derivedTargets ?? []).filter((t) => t.kind !== kind.trim()), { kind: kind.trim(), blob, provisional }];
	}, opts(who));
	reopenReferences(store, who);
	return rec;
}

// ---------------------------------------------------------------------------
// Submitting a stage
// ---------------------------------------------------------------------------

/** Checks the stage's required outputs and sets it in-review. */
export function submitStage(store: Store, stageRef: string, who: Who): StageId {
	const stage = STAGE_IDS.find((s) => s === stageRef);
	if (!stage) throw new StudioError(`unknown stage ${stageRef}; stages are ${STAGE_IDS.join(', ')}`);
	if (!SUBMITTABLE.includes(stage)) throw new StudioError(`stage ${stage} has no required outputs defined yet, so it cannot be submitted`);
	const data = store.load();
	const st = data.creature.stages[stage];
	if (st.status === 'locked') {
		const why = submitProblems(data, stage);
		throw new StudioError(`stage ${stage} is locked${why.length ? `: ${why.join('; ')}` : ''}`);
	}
	if (st.status !== 'open') throw new StudioError(`stage ${stage} is ${st.status}; only an open stage can be submitted`);
	const problems = submitProblems(data, stage);
	if (problems.length > 0) throw new StudioError(`cannot submit ${stage}: ${problems.join('; ')}`);
	store.update<'creature'>(data.creature.id, (c) => { c.stages[stage] = { status: 'in-review' }; }, opts(who));
	return stage;
}
