import { createHash } from 'node:crypto';
import { hasBlob } from './blobs.ts';
import { STAGE_IDS, type Creature, type Intake, type Note, type Part, type Reference, type StageId } from './schema.ts';
import type { CreatureData } from './store.ts';

export type StageStatus = Creature['stages']['intake']['status'];

const sha = (text: string): string => createHash('sha256').update(text).digest('hex');

/** Phase 1 stages come first; the last three are reserved names for Phase 2. */
export const PHASE_ONE: readonly StageId[] = STAGE_IDS.slice(0, 8);
export const PHASE_TWO: readonly StageId[] = STAGE_IDS.slice(8);

/** Stages whose submit checks and evidence exist in this build. */
export const SUBMITTABLE: readonly StageId[] = ['intake', 'references'];

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
		for (const p of data.parts) items.push({ label: `part ${p.key}`, hash: partContentHash(data, p) });
		return items;
	}
	if (stage === 'references') {
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
	if (stage === 'references') {
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
