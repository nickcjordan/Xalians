import { createHash } from 'node:crypto';
import { hasBlob } from './blobs.ts';
import { STAGE_IDS, STANDARD_CAMERAS, type Build, type Creature, type Intake, type Note, type Part, type Reference, type StageId } from './schema.ts';
import type { CreatureData } from './store.ts';

export type StageStatus = Creature['stages']['intake']['status'];

const sha = (text: string): string => createHash('sha256').update(text).digest('hex');

/** Phase 1 stages come first; the last three are reserved names for Phase 2. */
export const PHASE_ONE: readonly StageId[] = STAGE_IDS.slice(0, 9);
export const PHASE_TWO: readonly StageId[] = STAGE_IDS.slice(9);

/** Stages whose submit checks and evidence exist in this build. */
export const SUBMITTABLE: readonly StageId[] = ['intake', 'vision', 'sheet', 'blockout'];

const partName = (data: CreatureData, id: string): string => data.parts.find((p) => p.id === id)?.key ?? id;

/**
 * Content hash of a part as the intake stage sees it. It leaves out status, revision and timestamps
 * (they change when work starts) and names dependencies by key (ids are generated).
 */
export function partContentHash(data: CreatureData, part: Part): string {
	return sha(JSON.stringify({ key: part.key, name: part.name, includes: part.includes, why: part.why, dependsOn: part.dependsOn.map((d) => partName(data, d)).sort(), order: part.order }));
}

export function referenceContentHash(ref: Reference): string {
	return sha(JSON.stringify({ blob: ref.blob, fileName: ref.fileName, role: ref.role, governs: ref.governs, mustNotBeUsedFor: ref.mustNotBeUsedFor, precedence: ref.precedence, derivedTargets: ref.derivedTargets ?? [] }));
}

export interface EvidenceItem {
	label: string;
	hash: string;
}

/** Every record and blob a stage covers, labeled for a human reason when one changes. Empty for stages with no evidence rule yet. */
export function stageEvidenceItems(data: CreatureData, stage: StageId): EvidenceItem[] {
	if (stage === 'intake') {
		const intake = data.creature.intake;
		if (!intake) return [];
		const items: EvidenceItem[] = [
			{ label: 'the silhouette', hash: intake.silhouette.blob },
			{ label: 'the species template', hash: intake.templateSha256 },
		];
		if (intake.reading) items.push({ label: 'the reading', hash: sha(JSON.stringify(intake.reading)) });
		for (const p of data.parts) items.push({ label: `part ${p.key}`, hash: partContentHash(data, p) });
		return items;
	}
	if (stage === 'sheet') {
		const items: EvidenceItem[] = [];
		for (const b of sheetImages(data)) items.push({ label: `sheet image ${b.image!.label}`, hash: b.outputs[0]!.blob });
		const note = consistencyNote(data);
		if (note) items.push({ label: 'the consistency check', hash: sha(note.text) });
		return items;
	}
	if (stage === 'blockout') {
		const build = currentBlockoutBuild(data);
		return build ? build.outputs.map((o) => ({ label: `blockout ${build.alias} output ${o.name}`, hash: o.blob })) : [];
	}
	if (stage === 'vision') {
		const items: EvidenceItem[] = [];
		for (const r of data.references) {
			items.push({ label: `reference ${r.fileName}`, hash: referenceContentHash(r) });
			items.push({ label: `image ${r.fileName}`, hash: r.blob });
			for (const t of r.derivedTargets ?? []) items.push({ label: `target ${t.kind} of ${r.fileName}`, hash: t.blob });
		}
		return items;
	}
	return [];
}

/** The evidence array recorded on approval: unique, sorted. */
export function stageEvidence(data: CreatureData, stage: StageId): string[] {
	return [...new Set(stageEvidenceItems(data, stage).map((i) => i.hash))].sort();
}

export interface StaleStage {
	id: StageId;
	reason: string;
}

/**
 * Approved stages whose evidence no longer matches. `templateSha` reads the live template (by its
 * repo-relative path) so a template edited on disk shows up without re-running intake.
 */
export function staleStages(data: CreatureData, templateSha?: (path: string) => string | undefined): StaleStage[] {
	const out: StaleStage[] = [];
	for (const id of STAGE_IDS) {
		const st = data.creature.stages[id];
		if (st.status !== 'approved' || !st.evidence) continue;
		const items = stageEvidenceItems(data, id);
		const current = new Set(items.map((i) => i.hash));
		const stored = new Set(st.evidence);
		const reasons: string[] = [];
		const changed = items.filter((i) => !stored.has(i.hash)).map((i) => i.label);
		if (changed.length > 0) reasons.push(`changed or added since approval: ${[...new Set(changed)].join(', ')}`);
		const gone = [...stored].filter((h) => !current.has(h)).length;
		if (gone > 0 && changed.length === 0) reasons.push(`${gone === 1 ? 'something' : `${gone} things`} the approval covered ${gone === 1 ? 'was' : 'were'} removed or replaced`);
		if (id === 'intake' && templateSha && data.creature.intake) {
			const live = templateSha(data.creature.intake.speciesTemplate);
			if (live !== undefined && live !== data.creature.intake.templateSha256) reasons.push('the species template on disk changed since intake');
		}
		if (reasons.length > 0) out.push({ id, reason: reasons.join('; ') });
	}
	return out;
}

/** Problems that keep a stage from being submitted; empty when it can go to review. */
export function submitProblems(data: CreatureData, stage: StageId): string[] {
	const problems: string[] = [];
	if (stage === 'intake') {
		const intake = data.creature.intake;
		if (!intake) return ['the intake block is empty; run: studio intake <key> --species <template>'];
		if (!hasBlob(intake.silhouette.blob)) problems.push('the silhouette blob is not in the blob store');
		if (!intake.reading || intake.reading.mustHave.length === 0) problems.push('no reading with at least one must-have feature; run: studio intake reading <key> --file reading.json');
		const proposed = data.parts.filter((p) => p.status === 'proposed');
		if (proposed.length === 0) problems.push('no proposed parts; run: studio part propose <key> --file parts.json');
		const ids = new Set(data.parts.map((p) => p.id));
		for (const p of proposed) {
			if (p.includes.length === 0) problems.push(`part ${p.key} has no includes`);
			if (!p.why.trim()) problems.push(`part ${p.key} has no why`);
			for (const d of p.dependsOn) if (!ids.has(d)) problems.push(`part ${p.key} depends on ${d}, which is not a part`);
		}
		return problems;
	}
	if (stage === 'sheet') {
		if (data.creature.stages.vision.status !== 'approved') problems.push('the vision stage is not approved yet');
		const images = sheetImages(data);
		for (const [need, label] of [['turnaround-front', 'front'], ['turnaround-threequarter', 'three-quarter'], ['turnaround-side', 'side'], ['turnaround-back', 'back']] as const) {
			if (!images.some((b) => b.image!.element === need)) problems.push(`no ${label} turnaround image; run: studio image run <key> --stage sheet --element ${need} ...`);
		}
		if (!images.some((b) => b.image!.element.startsWith('bare-'))) problems.push('no bare-body image (element bare-front, bare-side or bare-back)');
		if (!consistencyNote(data)) problems.push('no orchestrator consistency note; add a decision note about stage sheet whose text starts "Consistency check:"');
		return problems;
	}
	if (stage === 'blockout') {
		if (data.creature.stages.sheet.status !== 'approved') problems.push('the sheet stage is not approved yet');
		const build = currentBlockoutBuild(data);
		if (!build) {
			problems.push('no presented blockout build; plan one with: studio build plan <key> --stage blockout --goal ... --method ..., then ingest, check, look and present it');
			return problems;
		}
		const cams = new Set(build.outputs.filter((o) => o.role === 'render' && o.camera).map((o) => o.camera));
		const missing = STANDARD_CAMERAS.filter((c) => !cams.has(c));
		if (missing.length > 0) problems.push(`blockout build ${build.alias} has no render for: ${missing.join(', ')}`);
		const overlayCams = new Set(build.outputs.filter((o) => o.role === 'overlay' && o.camera).map((o) => o.camera));
		for (const v of BLOCKOUT_OVERLAY_VIEWS) {
			if (!v.cameras.some((c) => overlayCams.has(c))) problems.push(`no ${v.label} overlay on blockout build ${build.alias}; run: studio build overlay <key> ${build.alias} --dir <folder with ${v.cameras[0]}.overlay.png>`);
		}
		if (!fitNote(data)) problems.push('no orchestrator fit note; add a decision note about stage blockout whose text starts "Fit check:"');
		return problems;
	}
	if (stage === 'vision') {
		if (data.creature.stages.intake.status !== 'approved') problems.push('the intake stage is not approved yet');
		if (data.references.length === 0) problems.push('no references; run: studio reference add <key> --file <image> --role ...');
		const seen = new Map<number, string>();
		for (const r of data.references) {
			if (!r.role.trim()) problems.push(`reference ${r.alias} has no role`);
			if (r.governs.length === 0) problems.push(`reference ${r.alias} governs nothing`);
			const other = seen.get(r.precedence);
			if (other) problems.push(`references ${other} and ${r.alias} share precedence ${r.precedence}`);
			else seen.set(r.precedence, r.alias);
		}
		return problems;
	}
	return [`stage ${stage} has no required outputs defined yet`];
}

// ---------------------------------------------------------------------------
// Image builds (vision board and model sheet)
// ---------------------------------------------------------------------------

/** Image builds that have an output Nick has been shown (or has decided on). */
const SHOWN: readonly Build['status'][] = ['presented', 'reviewed'];

/** The sheet's images that count toward the stage: presented or reviewed, with an output. */
export function sheetImages(data: CreatureData): Build[] {
	return data.builds.filter((b) => b.kind === 'image' && b.image?.stage === 'sheet' && SHOWN.includes(b.status) && b.outputs.length > 0);
}

/** The orchestrator's note that the views were compared: a decision about the sheet starting "Consistency check:". Newest wins. */
export function consistencyNote(data: CreatureData): Note | undefined {
	return data.notes
		.filter((n) => n.kind === 'decision' && n.by === 'orchestrator' && n.about?.stage === 'sheet' && n.text.trimStart().startsWith('Consistency check:'))
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

// ---------------------------------------------------------------------------
// Blockout
// ---------------------------------------------------------------------------

/** The views a blockout needs an overlay for. `side` is met by either side camera. */
export const BLOCKOUT_OVERLAY_VIEWS: readonly { label: string; cameras: readonly string[] }[] = [
	{ label: 'front', cameras: ['front'] },
	{ label: 'side', cameras: ['side-left', 'side-right', 'side'] },
	{ label: 'back', cameras: ['back'] },
];

export const blockoutBuilds = (data: CreatureData): Build[] => data.builds.filter((b) => b.stage === 'blockout');

/** The blockout build the stage is about: the newest one Nick has been shown (presented) or has decided on (reviewed). */
export function currentBlockoutBuild(data: CreatureData): Build | undefined {
	return blockoutBuilds(data)
		.filter((b) => SHOWN.includes(b.status))
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/** The orchestrator's note that the blockout was measured against the sheet: a decision about the blockout starting "Fit check:". Newest wins. */
export function fitNote(data: CreatureData): Note | undefined {
	return data.notes
		.filter((n) => n.kind === 'decision' && n.by === 'orchestrator' && n.about?.stage === 'blockout' && n.text.trimStart().startsWith('Fit check:'))
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

// ---------------------------------------------------------------------------
// Views for the review screen
// ---------------------------------------------------------------------------

export interface StageView {
	id: StageId;
	phase: 1 | 2;
	status: StageStatus;
	stale: boolean;
	staleReason?: string;
	note?: string;
	/** True when a review screen exists for this stage. */
	reviewable: boolean;
}

export interface BoardPart {
	id: string;
	alias: string;
	key: string;
	name: string;
	order: number;
	status: Part['status'];
	includes: string[];
	why: string;
	/** Dependency part names, for "Depends on: Torso". */
	dependsOn: { key: string; name: string }[];
}

export interface CreatureBoard {
	key: string;
	name: string;
	alias: string;
	stages: StageView[];
	intake?: Intake;
	parts: BoardPart[];
	/** Review notes about stages, oldest first. */
	stageNotes: Pick<Note, 'id' | 'alias' | 'text' | 'verdict' | 'createdAt' | 'about'>[];
}

export function creatureBoard(data: CreatureData, templateSha?: (path: string) => string | undefined): CreatureBoard {
	const stale = new Map(staleStages(data, templateSha).map((s) => [s.id, s.reason]));
	const stages: StageView[] = STAGE_IDS.map((id) => {
		const st = data.creature.stages[id];
		return {
			id,
			phase: PHASE_ONE.includes(id) ? 1 : 2,
			status: st.status,
			stale: stale.has(id),
			...(stale.has(id) ? { staleReason: stale.get(id)! } : {}),
			...(st.note ? { note: st.note } : {}),
			reviewable: SUBMITTABLE.includes(id),
		};
	});
	const byId = new Map(data.parts.map((p) => [p.id, p]));
	const parts: BoardPart[] = [...data.parts]
		.sort((a, b) => a.order - b.order)
		.map((p) => ({
			id: p.id,
			alias: p.alias,
			key: p.key,
			name: p.name,
			order: p.order,
			status: p.status,
			includes: p.includes,
			why: p.why,
			dependsOn: p.dependsOn.map((d) => ({ key: byId.get(d)?.key ?? d, name: byId.get(d)?.name ?? d })),
		}));
	const stageNotes = data.notes
		.filter((n) => n.about?.stage)
		.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
		.map(({ id, alias, text, verdict, createdAt, about }) => ({ id, alias, text, ...(verdict ? { verdict } : {}), createdAt, ...(about ? { about } : {}) }));
	return { key: data.creature.key, name: data.creature.name, alias: data.creature.alias, stages, ...(data.creature.intake ? { intake: data.creature.intake } : {}), parts, stageNotes };
}

export interface ReferenceView {
	id: string;
	alias: string;
	blob: string;
	fileName: string;
	role: string;
	governs: string[];
	mustNotBeUsedFor: string[];
	precedence: number;
	derivedTargets: { kind: string; blob: string; provisional: boolean }[];
}

/** References sorted by precedence (lowest number first), ties by file name. */
export function referenceViews(data: CreatureData): ReferenceView[] {
	return [...data.references]
		.sort((a, b) => a.precedence - b.precedence || a.fileName.localeCompare(b.fileName))
		.map((r) => ({ id: r.id, alias: r.alias, blob: r.blob, fileName: r.fileName, role: r.role, governs: r.governs, mustNotBeUsedFor: r.mustNotBeUsedFor, precedence: r.precedence, derivedTargets: r.derivedTargets ?? [] }));
}

// ---------------------------------------------------------------------------
// Vision board and model sheet views
// ---------------------------------------------------------------------------

export interface ImageView {
	id: string;
	alias: string;
	status: Build['status'];
	stage: 'vision' | 'sheet';
	element: string;
	label: string;
	summary?: string;
	prompt: string;
	/** The generated image (the build's one output); absent while running or after a failure. */
	blob?: string;
	governs: string[];
	notFor: string[];
	round?: number;
	/** Numbered "what to judge" checks (X25). */
	judge?: string[];
	createdAt: string;
	wallMinutes?: number;
	codexTokens: number | null;
	inputs: { name: string; blob: string }[];
	failure?: string;
}

/** The "what to judge" checks of a presented set: those of the first option that has any. */
export function firstJudge(items: { judge?: string[] }[]): string[] | undefined {
	return items.find((i) => i.judge?.length)?.judge;
}

function imageView(b: Build): ImageView {
	const im = b.image!;
	const out = b.outputs[0];
	return {
		id: b.id,
		alias: b.alias,
		status: b.status,
		stage: im.stage,
		element: im.element,
		label: im.label,
		...(im.summary ? { summary: im.summary } : {}),
		prompt: im.prompt,
		...(out ? { blob: out.blob } : {}),
		governs: im.governs ?? [],
		notFor: im.notFor ?? [],
		...(im.round !== undefined ? { round: im.round } : {}),
		...(b.judge?.length ? { judge: b.judge } : {}),
		createdAt: b.createdAt,
		...(b.cost.wallMinutes !== undefined ? { wallMinutes: b.cost.wallMinutes } : {}),
		codexTokens: im.codexTokens,
		inputs: im.inputs,
		...(im.failure ? { failure: im.failure } : {}),
	};
}

const imageBuilds = (data: CreatureData, stage: 'vision' | 'sheet'): Build[] => data.builds.filter((b) => b.kind === 'image' && b.image?.stage === stage);

/** Option sets presented so far, per key (`vision:<element>` or `sheet`). */
export function imageRounds(data: CreatureData): Record<string, number> {
	const out: Record<string, number> = {};
	for (const b of data.builds) {
		if (b.kind !== 'image' || !b.image?.round) continue;
		const key = b.image.stage === 'vision' ? `vision:${b.image.element}` : 'sheet';
		out[key] = Math.max(out[key] ?? 0, b.image.round);
	}
	return out;
}

export interface VisionElementView {
	element: string;
	/** Option sets presented so far. */
	rounds: number;
	/** The set waiting for a pick, in the order generated. */
	options: ImageView[];
	/** "What to judge" for the waiting set: the checks of the first option that has them. */
	judge?: string[];
	/** The chosen image, once picked. */
	picked?: ImageView & { reference?: string };
	/** Nick's latest "none of these" for this element while no set is waiting. */
	adjust?: { text: string; createdAt: string };
	/** Runs still going or failed, so the screen can say why a set is short. */
	running: number;
	failed: ImageView[];
}

export interface VisionView {
	elements: VisionElementView[];
	/** What the species description and silhouette say about each element, by element. */
	context: Record<string, { description: string[]; silhouette?: string; note?: string }>;
	/** Whether picks can still be undone (the vision stage is not approved). */
	canUnpick: boolean;
}

export function visionView(data: CreatureData): VisionView {
	const builds = imageBuilds(data, 'vision');
	const order = new Map<string, number>(['palette', 'fur', 'pattern', 'anatomy', 'eyes', 'other'].map((e, i) => [e, i]));
	const elements = [...new Set(builds.map((b) => b.image!.element))].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99) || a.localeCompare(b));
	const rounds = imageRounds(data);
	return {
		context: data.creature.visionContext ?? {},
		canUnpick: data.creature.stages.vision.status !== 'approved',
		elements: elements.map((element) => {
			const mine = builds.filter((b) => b.image!.element === element).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
			const options = mine.filter((b) => b.status === 'presented').map(imageView);
			const pickedBuild = [...mine].reverse().find((b) => b.status === 'reviewed');
			const picked = pickedBuild ? { ...imageView(pickedBuild), ...(() => { const r = data.references.find((x) => x.blob === pickedBuild.outputs[0]?.blob && x.role === element); return r ? { reference: r.alias } : {}; })() } : undefined;
			const adjustNote = data.notes
				.filter((n) => n.kind === 'review' && n.verdict === 'adjust' && n.about?.stage === 'vision' && n.about.element === element)
				.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
			return {
				element,
				rounds: rounds[`vision:${element}`] ?? 0,
				options,
				...(firstJudge(options) ? { judge: firstJudge(options) } : {}),
				...(picked ? { picked } : {}),
				...(adjustNote && options.length === 0 && !picked ? { adjust: { text: adjustNote.text, createdAt: adjustNote.createdAt } } : {}),
				running: mine.filter((b) => b.status === 'running').length,
				failed: mine.filter((b) => b.status === 'failed').map(imageView),
			};
		}),
	};
}

export interface SheetMark {
	alias: string;
	description: string;
	build: string;
	status: string;
}

export interface SheetView {
	images: ImageView[];
	rounds: number;
	consistency?: { alias: string; text: string; createdAt: string };
	marks: SheetMark[];
	running: number;
	failed: ImageView[];
}

export function sheetView(data: CreatureData): SheetView {
	const builds = imageBuilds(data, 'sheet').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	const note = consistencyNote(data);
	const byId = new Map(data.builds.map((b) => [b.id, b]));
	return {
		images: builds.filter((b) => (b.status === 'presented' || b.status === 'reviewed') && b.outputs.length > 0).map(imageView),
		rounds: imageRounds(data).sheet ?? 0,
		...(note ? { consistency: { alias: note.alias, text: note.text, createdAt: note.createdAt } } : {}),
		marks: data.defects
			.filter((d) => d.stage === 'sheet')
			.map((d) => ({ alias: d.alias, description: d.description, build: byId.get(d.region?.buildId ?? '')?.alias ?? '', status: d.status })),
		running: builds.filter((b) => b.status === 'running').length,
		failed: builds.filter((b) => b.status === 'failed').map(imageView),
	};
}
