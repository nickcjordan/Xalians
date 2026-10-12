import { StudioError } from './errors.ts';
import { ReportSchema, STAGE_IDS, STANDARD_CAMERAS, type Build, type Defect, type Hold, type Note, type Part, type Report } from './schema.ts';
import type { CreatureData } from './store.ts';

export { STANDARD_CAMERAS };

export type HoldStrength = 'strong' | 'medium' | 'weak';

export function holdStrength(hold: Hold): HoldStrength {
	switch (hold.source.kind) {
		case 'nick': return 'strong';
		case 'imported': return 'medium';
		case 'inferred': return 'weak';
	}
}

const byIdOrAlias = <T extends { id: string; alias: string }>(list: readonly T[], ref: string) =>
	list.find((r) => r.id === ref || r.alias === ref);

export function findPart(data: CreatureData, ref: string): Part {
	const part = data.parts.find((p) => p.id === ref || p.alias === ref || p.key === ref);
	if (!part) throw new StudioError(`no part ${ref}`);
	return part;
}

/** Builds that count as an attempt on a defect: started work, not crashed and not merely planned. */
export function attemptsOn(data: CreatureData, defectId: string): Build[] {
	return data.builds.filter((b) => b.targets.includes(defectId) && b.status !== 'planned' && b.status !== 'failed');
}

export function isStalled(data: CreatureData, defect: Defect): boolean {
	return defect.status === 'open' && attemptsOn(data, defect.id).length >= 2;
}

export function partUsage(data: CreatureData, part: Part) {
	const builds = data.builds.filter((b) => b.part === part.id);
	const wall = builds.reduce((sum, b) => sum + (b.cost.wallMinutes ?? 0), 0);
	return {
		buildsUsed: builds.length,
		wallMinutesUsed: wall,
		buildsLeft: Math.max(0, part.budget.builds - builds.length),
		wallMinutesLeft: Math.max(0, part.budget.wallMinutes - wall),
	};
}

export interface PartStatus {
	id: string;
	alias: string;
	key: string;
	status: Part['status'];
	stale: boolean;
	approvedBuild?: string;
	openDefects: { alias: string; id: string; description: string; attempts: number }[];
	stalledDefects: string[];
	buildsUsed: number;
	wallMinutesUsed: number;
	budgetLeft: { builds: number; wallMinutes: number };
}

export interface StatusReport {
	creature: string;
	stages: Record<string, string>;
	parts: PartStatus[];
	holds: { alias: string; id: string; statement: string; source: string; strength: HoldStrength }[];
	openQuestions: { alias: string; id: string; text: string }[];
	next: string;
}

export function status(data: CreatureData): StatusReport {
	const stages: Record<string, string> = {};
	for (const id of STAGE_IDS) stages[id] = data.creature.stages[id].status;

	const parts: PartStatus[] = [...data.parts]
		.sort((a, b) => a.order - b.order)
		.map((part) => {
			const usage = partUsage(data, part);
			const open = data.defects.filter((d) => d.part === part.id && d.status === 'open');
			return {
				id: part.id,
				alias: part.alias,
				key: part.key,
				status: part.status,
				stale: part.status === 'stale',
				...(part.approvedBuild ? { approvedBuild: part.approvedBuild } : {}),
				openDefects: open.map((d) => ({ alias: d.alias, id: d.id, description: d.description, attempts: attemptsOn(data, d.id).length })),
				stalledDefects: open.filter((d) => isStalled(data, d)).map((d) => d.alias),
				buildsUsed: usage.buildsUsed,
				wallMinutesUsed: usage.wallMinutesUsed,
				budgetLeft: { builds: usage.buildsLeft, wallMinutes: usage.wallMinutesLeft },
			};
		});

	const holds = data.holds
		.filter((h) => h.status === 'active')
		.map((h) => ({ alias: h.alias, id: h.id, statement: h.statement, source: h.source.kind, strength: holdStrength(h) }));

	const openQuestions = data.notes
		.filter((n) => n.kind === 'question' && !n.answered)
		.map((n) => ({ alias: n.alias, id: n.id, text: n.text }));

	return { creature: data.creature.key, stages, parts, holds, openQuestions, next: nextAction(data, parts, openQuestions) };
}

function nextAction(data: CreatureData, parts: PartStatus[], questions: { alias: string }[]): string {
	if (questions.length > 0) return `Waiting on Nick: answer question ${questions[0]!.alias}.`;

	const presented = data.builds.find((b) => b.status === 'presented');
	if (presented) return `Waiting on Nick: review build ${presented.alias} in the review screen.`;
	const running = data.builds.find((b) => b.status === 'running');
	if (running) return `Wait for build ${running.alias} to report, or fail it if its deadline has passed.`;
	const reported = data.builds.find((b) => b.status === 'reported' || b.status === 'checked');
	if (reported) return `Run checks and look notes for build ${reported.alias}, then present it.`;
	const planned = data.builds.find((b) => b.status === 'planned');
	if (planned) return `Start build ${planned.alias}.`;

	for (const p of parts) {
		if (p.status === 'approved') continue;
		if (p.stalledDefects.length > 0) {
			return `Part ${p.key}: defect ${p.stalledDefects[0]} is stalled. Write an audit note naming the physical cause and one outcome (lift an inferred hold, change the method, redefine the part, or ask Nick).`;
		}
		const left = p.budgetLeft;
		if (p.openDefects.length > 0) {
			if (left.builds === 0 || left.wallMinutes === 0) return `Part ${p.key}: budget is spent. Ask Nick to raise it or close the open defects.`;
			return `Plan a build for part ${p.key} targeting defect ${p.openDefects[0]!.alias}.`;
		}
		if (p.status === 'stale') return `Part ${p.key} is stale after an upstream change. Rebuild it or confirm it still holds.`;
		if (p.buildsUsed === 0) return `Part ${p.key} has no defects and no builds. Add the first defect (what is wrong or missing) and plan a preview.`;
		return `Part ${p.key} has no open defects. Ask Nick to approve its latest build.`;
	}

	const open = STAGE_IDS.find((id) => data.creature.stages[id].status !== 'approved' && data.creature.stages[id].status !== 'locked');
	if (open) return `Stage ${open} is ${data.creature.stages[open].status}. Collect its outputs and ask Nick to approve it.`;
	const locked = STAGE_IDS.find((id) => data.creature.stages[id].status === 'locked');
	if (locked && parts.length === 0) return 'Add the functional parts from the intake and ask Nick to approve the part list.';
	return locked ? `Open stage ${locked}.` : 'Nothing left to do for Phase 1.';
}

export interface PlanInput {
	part: string;
	kind: Build['kind'];
	goal: string | { text: string; sourceNote?: string };
	targets?: string[];
	method: string;
	allowMultiple?: boolean;
}

export type PlannedBuild = Pick<Build, 'part' | 'kind' | 'goal' | 'targets' | 'method' | 'outputs' | 'checks' | 'lookNotes' | 'cost' | 'status'>;

/** Throws a StudioError with a clear reason when the plan is not allowed; otherwise returns the build to create. */
export function planBuild(data: CreatureData, input: PlanInput): PlannedBuild {
	const part = findPart(data, input.part);
	const usage = partUsage(data, part);
	if (usage.buildsUsed >= part.budget.builds) {
		throw new StudioError(`part ${part.key} has spent its build budget (${usage.buildsUsed} of ${part.budget.builds}); ask Nick to raise it`);
	}
	if (usage.wallMinutesUsed >= part.budget.wallMinutes) {
		throw new StudioError(`part ${part.key} has spent its time budget (${usage.wallMinutesUsed} of ${part.budget.wallMinutes} minutes); ask Nick to raise it`);
	}

	const targets = (input.targets ?? []).map((ref) => {
		const d = byIdOrAlias(data.defects, ref);
		if (!d) throw new StudioError(`no defect ${ref}`);
		return d;
	});
	if (targets.length === 0 && input.kind !== 'preview') {
		throw new StudioError('a build must target a defect (a preview may target none)');
	}
	if (targets.length > 1 && !input.allowMultiple) {
		throw new StudioError(`one defect per build by default; ${targets.length} targets need allowMultiple`);
	}

	for (const d of targets) {
		if (d.part !== part.id) throw new StudioError(`defect ${d.alias} belongs to another part, not ${part.key}`);
		if (d.status !== 'open') throw new StudioError(`defect ${d.alias} is ${d.status}, not open`);
		if (isStalled(data, d)) {
			const why = auditUnlocks(data, d, part, input.method);
			if (why !== true) {
				throw new StudioError(`defect ${d.alias} is stalled after ${attemptsOn(data, d.id).length} builds; ${why}`);
			}
		}
	}

	const goal = typeof input.goal === 'string' ? { text: input.goal } : input.goal;
	return { part: part.id, kind: input.kind, goal, targets: targets.map((d) => d.id), method: input.method, outputs: [], checks: [], lookNotes: [], cost: {}, status: 'planned' };
}

/** True when some audit note about the defect, written after its last attempt, has a satisfied outcome; otherwise a reason. */
function auditUnlocks(data: CreatureData, defect: Defect, part: Part, newMethod: string): true | string {
	const attempts = attemptsOn(data, defect.id);
	const lastBuildAt = attempts.reduce((max, b) => (b.createdAt > max ? b.createdAt : max), '');
	const audits = data.notes.filter((n) => n.kind === 'audit' && n.about?.defect === defect.id && n.createdAt >= lastBuildAt);
	if (audits.length === 0) {
		return 'write an audit note about it (cause, holds checked, and one outcome) after the last build';
	}
	const reasons: string[] = [];
	for (const audit of audits) {
		const r = auditSatisfied(data, audit, defect, part, attempts, newMethod);
		if (r === true) return true;
		reasons.push(r);
	}
	return `the audit does not change anything yet: ${reasons.join('; ')}`;
}

function auditSatisfied(data: CreatureData, audit: Note, defect: Defect, part: Part, attempts: Build[], newMethod: string): true | string {
	switch (audit.outcome) {
		case 'lift-inferred-hold': {
			const hold = audit.outcomeDetail ? byIdOrAlias(data.holds, audit.outcomeDetail) : undefined;
			if (!hold) return 'lift-inferred-hold must name a hold in outcomeDetail';
			if (hold.source.kind !== 'inferred') return `hold ${hold.alias} is not inferred`;
			if (hold.status !== 'lifted') return `hold ${hold.alias} is still ${hold.status}; lift it`;
			return true;
		}
		case 'change-method': {
			if (attempts.some((b) => b.method === newMethod)) return 'the new build uses a method an earlier build on this defect already used';
			return true;
		}
		case 'redefine-part': {
			if (part.updatedAt >= audit.createdAt && part.rev > 1) return true;
			return `part ${part.key} was not updated after the audit`;
		}
		case 'ask-nick': {
			const q = audit.outcomeDetail ? byIdOrAlias(data.notes, audit.outcomeDetail) : undefined;
			const questions = q && q.kind === 'question' ? [q] : data.notes.filter((n) => n.kind === 'question' && n.about?.defect === defect.id && n.createdAt >= audit.createdAt);
			if (questions.length === 0) return 'ask-nick needs a question note about the defect';
			if (questions.some((n) => n.answered)) return true;
			return 'the question to Nick is not answered yet';
		}
		default:
			return 'the audit has no outcome';
	}
}

export function submitReport(build: Build, report: unknown): Build {
	const parsed: Report = ReportSchema.parse(report);
	for (const name of parsed.outputs) {
		const out = build.outputs.find((o) => o.name === name);
		if (!out || !out.blob) throw new StudioError(`report names output "${name}" but the build has no such output with a blob`);
	}
	return { ...build, report: parsed, status: 'reported' };
}

export function canPresent(build: Build, standardCameras: readonly string[] = STANDARD_CAMERAS): { ok: boolean; reasons: string[] } {
	const reasons: string[] = [];
	for (const c of build.checks) {
		if (c.kind === 'gate' && c.passed !== true) reasons.push(`gate check "${c.id}" has not passed`);
	}
	const blobs = new Set(build.outputs.map((o) => o.blob));
	for (const camera of standardCameras) {
		const look = build.lookNotes.find((l) => l.camera === camera);
		if (!look) reasons.push(`no look note for camera ${camera}`);
		else if (!blobs.has(look.imageBlob)) reasons.push(`look note for ${camera} points at an image that is not among the build outputs`);
	}
	return { ok: reasons.length === 0, reasons };
}

export interface ReviewUpdates {
	parts: Part[];
	holds: Hold[];
	defects: Defect[];
	builds: Build[];
}

/** Pure: the records a review changes. The caller writes them through the store. */
export function applyReview(data: CreatureData, note: Pick<Note, 'by' | 'kind' | 'about' | 'verdict' | 'holdsStruck' | 'defectsClosed' | 'text' | 'createdAt'>): ReviewUpdates {
	if (note.by !== 'nick') throw new StudioError('only Nick can approve or reject: a review note must be by nick');
	if (note.kind !== 'review') throw new StudioError('applyReview needs a review note');
	const at = note.createdAt;
	const out: ReviewUpdates = { parts: [], holds: [], defects: [], builds: [] };

	const build = note.about?.build ? data.builds.find((b) => b.id === note.about!.build) : undefined;
	if (note.about?.build && !build) throw new StudioError('review is about a build that does not exist');
	const partId = note.about?.part ?? build?.part;
	const part = partId ? data.parts.find((p) => p.id === partId) : undefined;

	if (build) out.builds.push({ ...build, status: 'reviewed' });

	if (note.verdict === 'approve') {
		if (!part) throw new StudioError('an approval must be about a part or a build');
		if (!build) throw new StudioError('an approval must be about a specific build');
		out.parts.push({ ...part, status: 'approved', approvedBuild: build.id });
		// Dependents, and their dependents, that were approved are now stale.
		const stale = new Set<string>();
		const queue = [part.id];
		while (queue.length > 0) {
			const current = queue.shift()!;
			for (const p of data.parts) {
				if (p.dependsOn.includes(current) && p.status === 'approved' && !stale.has(p.id)) {
					stale.add(p.id);
					queue.push(p.id);
				}
			}
		}
		for (const id of stale) out.parts.push({ ...data.parts.find((p) => p.id === id)!, status: 'stale' });
	} else if (part && (note.verdict === 'reject' || note.verdict === 'adjust') && part.status !== 'approved') {
		out.parts.push({ ...part, status: 'in-progress' });
	}

	for (const ref of note.holdsStruck ?? []) {
		const hold = data.holds.find((h) => h.id === ref);
		if (!hold) throw new StudioError(`review strikes hold ${ref}, which does not exist`);
		out.holds.push({ ...hold, status: 'struck', history: [...hold.history, { at, status: 'struck', by: 'nick', reason: note.text || 'struck in review' }] });
	}
	for (const ref of note.defectsClosed ?? []) {
		const defect = data.defects.find((d) => d.id === ref);
		if (!defect) throw new StudioError(`review closes defect ${ref}, which does not exist`);
		out.defects.push({ ...defect, status: 'fixed' });
	}
	return out;
}

/**
 * Pure permission check for striking or lifting a hold. Returns a refusal reason, or undefined when allowed.
 * Only Nick strikes. Anyone may lift an inferred or imported hold; lifting one Nick set needs a decision
 * note by Nick (id or alias in `decisionRef`) unless Nick himself lifts it.
 */
export function holdChangeRefusal(data: CreatureData, hold: Hold, action: 'strike' | 'lift', actor: string, decisionRef?: string): string | undefined {
	if (action === 'strike' && actor !== 'nick') return 'only Nick strikes holds; lift it with a reason instead';
	if (action === 'lift' && hold.source.kind === 'nick' && actor !== 'nick') {
		const decision = decisionRef ? byIdOrAlias(data.notes, decisionRef) : undefined;
		if (!decision || decision.kind !== 'decision' || decision.by !== 'nick') {
			return `hold ${hold.alias} was set by Nick; lifting it needs --decision <note> recording his ruling`;
		}
	}
	return undefined;
}
