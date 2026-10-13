import { StudioError } from './errors.ts';
import { ReportSchema, STAGE_IDS, STANDARD_CAMERAS, type Build, type Creature, type Defect, type Hold, type Note, type Part, type Report } from './schema.ts';
import { blockoutBuilds, currentBlockoutBuild, fitNote, imageRounds, sheetImages, staleStages, visionView } from './stages.ts';
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
	/** Approved stages whose evidence changed since approval, with the reason. */
	staleStages: { id: string; reason: string }[];
	parts: PartStatus[];
	holds: { alias: string; id: string; statement: string; source: string; strength: HoldStrength }[];
	openQuestions: { alias: string; id: string; text: string }[];
	/** Option sets presented per `vision:<element>` and `sheet`, to check experiment X14 (two failed regenerations means a different approach). */
	imageRounds: Record<string, number>;
	/** Open problems Nick marked on the model sheet images. */
	stageDefects: { alias: string; id: string; stage: string; description: string }[];
	next: string;
}

export function status(data: CreatureData, templateSha?: (path: string) => string | undefined): StatusReport {
	const stages: Record<string, string> = {};
	for (const id of STAGE_IDS) stages[id] = data.creature.stages[id].status;
	const stale = staleStages(data, templateSha);
	for (const s of stale) stages[s.id] = 'stale';

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

	const stageDefects = data.defects.filter((d) => d.stage && d.status === 'open').map((d) => ({ alias: d.alias, id: d.id, stage: d.stage!, description: d.description }));
	return { creature: data.creature.key, stages, staleStages: stale, parts, holds, openQuestions, imageRounds: imageRounds(data), stageDefects, next: nextAction(data, parts, openQuestions) };
}

function nextAction(data: CreatureData, parts: PartStatus[], questions: { alias: string }[]): string {
	if (questions.length > 0) return `Waiting on Nick: answer question ${questions[0]!.alias}.`;

	const inReview = STAGE_IDS.find((id) => data.creature.stages[id].status === 'in-review');
	if (inReview) return `Waiting on Nick: review the ${inReview} stage in the review screen.`;
	const staleStage = staleStages(data)[0];
	if (staleStage) return `Stage ${staleStage.id} is stale (${staleStage.reason}). Resubmit it for Nick's approval.`;
	// Stage guidance applies while no part has started and no build exists; a creature already building is past it.
	const partBuilds = data.builds.filter((b) => b.kind !== 'image' && b.stage !== 'blockout');
	const early = partBuilds.length === 0 && data.parts.every((p) => p.status === 'proposed' || p.status === 'not-started');
	const intakeStage = data.creature.stages.intake;
	if (early && intakeStage.status === 'open') {
		if (!data.creature.intake) return 'Run studio intake to read the species template, silhouette and encyclopedia entry.';
		if (!data.creature.intake.reading) return 'Write the reading of the creature (studio intake reading <key> --file reading.json), then propose the parts.';
		if (!data.parts.some((p) => p.status === 'proposed')) return 'Propose the functional parts (studio part propose), then submit the intake stage.';
		return 'Submit the intake stage for Nick (studio stage submit <key> intake).';
	}
	const visionStage = data.creature.stages.vision;
	if (early && visionStage.status === 'open') {
		const waiting = visionView(data).elements.filter((e) => e.options.length > 0).map((e) => e.element);
		if (waiting.length > 0) return `Waiting on Nick: pick one option each for ${waiting.join(', ')} on the vision board.`;
		if (data.references.length === 0) return 'Generate the vision board options (studio image run --stage vision), present each set (studio image present), and let Nick pick.';
		return 'Submit the vision stage for Nick (studio stage submit <key> vision).';
	}
	const sheetStage = data.creature.stages.sheet;
	if (early && sheetStage.status === 'open') {
		const shown = sheetImages(data);
		if (data.builds.some((b) => b.kind === 'image' && b.image?.stage === 'sheet' && b.status === 'reported')) return 'Present the reported sheet images (studio image present <key> --stage sheet).';
		if (shown.length === 0) return 'Generate the model sheet images (studio image run --stage sheet): four turnaround views, a bare body, close-ups.';
		return 'Submit the sheet stage for Nick (studio stage submit <key> sheet); it needs the four turnaround views, a bare-body image and your "Consistency check:" note.';
	}

	if (data.creature.stages.blockout.status === 'open') {
		const bb = blockoutBuilds(data);
		const by = (st: Build['status'][]) => bb.find((b) => st.includes(b.status));
		const running = by(['running']);
		const reported = by(['reported', 'checked']);
		const planned = by(['planned']);
		if (running) return `Wait for blockout build ${running.alias} to report, or fail it if its deadline has passed.`;
		if (reported) return `Overlay, check and look at blockout build ${reported.alias} (studio build overlay, check, look), then present it.`;
		if (planned) return `Start blockout build ${planned.alias}.`;
		if (!currentBlockoutBuild(data)) return bb.length === 0 ? 'Plan the blockout build (studio build plan <key> --stage blockout --goal ... --method ...).' : 'Plan the next blockout build against the open blockout defects.';
		return 'Submit the blockout stage for Nick (studio stage submit <key> blockout); it needs the 8 renders, front, side and back overlays and your "Fit check:" note.';
	}

	const presented = partBuilds.find((b) => b.status === 'presented');
	if (presented) return `Waiting on Nick: review build ${presented.alias} in the review screen.`;
	const running = partBuilds.find((b) => b.status === 'running');
	if (running) return `Wait for build ${running.alias} to report, or fail it if its deadline has passed.`;
	const reported = partBuilds.find((b) => b.status === 'reported' || b.status === 'checked');
	if (reported) return `Run checks and look notes for build ${reported.alias}, then present it.`;
	const planned = partBuilds.find((b) => b.status === 'planned');
	if (planned) return `Start build ${planned.alias}.`;

	for (const p of parts) {
		if (p.status === 'approved' || p.status === 'proposed') continue;
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
	kind: 'preview' | 'build';
	goal: string | { text: string; sourceNote?: string };
	targets?: string[];
	method: string;
	allowMultiple?: boolean;
}

export type PlannedBuild = Pick<Build, 'part' | 'stage'> & { kind: 'preview' | 'build' } & Pick<Build, 'goal' | 'targets' | 'method' | 'outputs' | 'checks' | 'lookNotes' | 'cost' | 'status'>;

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

export interface PlanBlockoutInput {
	goal: string | { text: string; sourceNote?: string };
	targets?: string[];
	method: string;
	allowMultiple?: boolean;
}

/**
 * Plans a blockout build: a whole-form build that belongs to no part. Its budget is the creature's default
 * (builds and wall minutes across all blockout builds). It may target no defect the first time; after that it
 * must target a defect marked about stage blockout, and the stall rules apply to those targets as for a part.
 */
export function planBlockout(data: CreatureData, input: PlanBlockoutInput): PlannedBuild {
	const st = data.creature.stages.blockout;
	if (st.status === 'locked') throw new StudioError('the blockout stage is locked; it opens when Nick approves the model sheet');
	if (st.status === 'in-review') throw new StudioError('the blockout stage is waiting on Nick; plan the next build after his verdict');
	if (st.status === 'approved') throw new StudioError('the blockout stage is approved; a new blockout build would change what the parts start from');
	const existing = blockoutBuilds(data);
	const budget = data.creature.defaultBudget;
	if (existing.length >= budget.builds) throw new StudioError(`the blockout has spent its build budget (${existing.length} of ${budget.builds}); ask Nick to raise it`);
	const wall = existing.reduce((sum, b) => sum + (b.cost.wallMinutes ?? 0), 0);
	if (wall >= budget.wallMinutes) throw new StudioError(`the blockout has spent its time budget (${wall} of ${budget.wallMinutes} minutes); ask Nick to raise it`);

	const targets = (input.targets ?? []).map((ref) => {
		const d = byIdOrAlias(data.defects, ref);
		if (!d) throw new StudioError(`no defect ${ref}`);
		return d;
	});
	if (targets.length === 0 && existing.length > 0) throw new StudioError('after the first blockout build, a build must target a defect marked about stage blockout');
	if (targets.length > 1 && !input.allowMultiple) throw new StudioError(`one defect per build by default; ${targets.length} targets need allowMultiple`);
	for (const d of targets) {
		if (d.stage !== 'blockout') throw new StudioError(`defect ${d.alias} is not about stage blockout`);
		if (d.status !== 'open') throw new StudioError(`defect ${d.alias} is ${d.status}, not open`);
		if (isStalled(data, d)) {
			const why = auditUnlocks(data, d, undefined, input.method);
			if (why !== true) throw new StudioError(`defect ${d.alias} is stalled after ${attemptsOn(data, d.id).length} builds; ${why}`);
		}
	}
	const goal = typeof input.goal === 'string' ? { text: input.goal } : input.goal;
	return { stage: 'blockout', kind: 'build', goal, targets: targets.map((d) => d.id), method: input.method, outputs: [], checks: [], lookNotes: [], cost: {}, status: 'planned' };
}

/** True when some audit note about the defect, written after its last attempt, has a satisfied outcome; otherwise a reason. */
function auditUnlocks(data: CreatureData, defect: Defect, part: Part | undefined, newMethod: string): true | string {
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

function auditSatisfied(data: CreatureData, audit: Note, defect: Defect, part: Part | undefined, attempts: Build[], newMethod: string): true | string {
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
			if (!part) return 'redefine-part does not apply to the blockout; change the method or ask Nick';
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
	if (note.about?.stage) throw new StudioError('a stage review is recorded with recordStageReview, not applyReview');
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

// ---------------------------------------------------------------------------
// Views for the review screen
// ---------------------------------------------------------------------------

type Output = Build['outputs'][number];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function plainDate(date: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
	if (!m) return date;
	return `${MONTHS[Number(m[2]) - 1] ?? m[2]} ${Number(m[3])}`;
}

/** Where a hold came from, in plain words for the review screen. */
export function holdSourceText(hold: Hold): string {
	const s = hold.source;
	switch (s.kind) {
		case 'nick': return `You, ${plainDate(s.date)}: "${s.quote}"`;
		case 'inferred': return `Inferred by ${s.by.replace(/^builder:/, 'a builder ')}: ${s.reason}`;
		case 'imported': return `Imported from ${s.file}, line ${s.line}${s.quote ? `: "${s.quote}"` : ''}`;
	}
}

export interface HoldView {
	id: string;
	alias: string;
	statement: string;
	reach: 'part' | 'creature';
	strength: HoldStrength;
	sourceKind: Hold['source']['kind'];
	sourceText: string;
}

export interface DefectView {
	id: string;
	alias: string;
	description: string;
	status: Defect['status'];
	origin: Defect['origin'];
	region?: Defect['region'];
	attempts: { alias: string; status: Build['status']; kind: Build['kind'] }[];
	stalled: boolean;
}

export interface BuildView {
	id: string;
	alias: string;
	kind: Build['kind'];
	status: Build['status'];
	goal: string;
	method: string;
	createdAt: string;
	targets: string[];
	/** Outputs that belong to a camera, grouped by camera id, in the order recorded. */
	cameras: Record<string, Output[]>;
	/** Outputs with no camera (for example a displacement heat map). */
	otherOutputs: Output[];
	checks: Build['checks'];
	report?: Build['report'];
	/** Reference images the option is judged against (X24), one per camera. */
	compare?: NonNullable<Build['compare']>;
	/** Numbered "what to judge" checks (X25). */
	judge?: string[];
	cost: { wallMinutes?: number; blenderMinutes?: number; tokens?: number; approximate?: boolean };
}

export interface PartView {
	creature: string;
	part: Part;
	holds: HoldView[];
	defects: DefectView[];
	/** Newest first. */
	builds: BuildView[];
	/** The last approved build: the comparison baseline. */
	baseline?: BuildView;
	notes: Note[];
	budget: { total: Part['budget']; builds: number; wallMinutes: number; buildsLeft: number; wallMinutesLeft: number };
}

function buildView(b: Build, data: CreatureData): BuildView {
	const cameras: Record<string, Output[]> = {};
	const otherOutputs: Output[] = [];
	for (const o of b.outputs) {
		if (o.camera) (cameras[o.camera] ??= []).push(o);
		else otherOutputs.push(o);
	}
	const t = b.cost.tokens;
	return {
		id: b.id,
		alias: b.alias,
		kind: b.kind,
		status: b.status,
		goal: b.goal.text,
		method: b.method,
		createdAt: b.createdAt,
		targets: b.targets.map((id) => data.defects.find((d) => d.id === id)?.alias ?? id),
		cameras,
		otherOutputs,
		checks: b.checks,
		...(b.report ? { report: b.report } : {}),
		...(b.compare?.length ? { compare: b.compare } : {}),
		...(b.judge?.length ? { judge: b.judge } : {}),
		cost: {
			...(b.cost.wallMinutes !== undefined ? { wallMinutes: b.cost.wallMinutes } : {}),
			...(b.cost.blenderMinutes !== undefined ? { blenderMinutes: b.cost.blenderMinutes } : {}),
			...(t ? { tokens: t.input + t.output + t.cacheRead + t.cacheWrite } : {}),
			...(b.cost.approximate ? { approximate: true } : {}),
		},
	};
}

/** Everything the review screen needs for one part, in one object. */
export function partView(data: CreatureData, partRef: string): PartView {
	const part = findPart(data, partRef);
	const inForce = (h: Hold) => h.status === 'active' && (h.scope.part === undefined || h.scope.part === part.id);
	const holds: HoldView[] = data.holds.filter(inForce).map((h) => ({
		id: h.id,
		alias: h.alias,
		statement: h.statement,
		reach: h.scope.part === part.id ? 'part' : 'creature',
		strength: holdStrength(h),
		sourceKind: h.source.kind,
		sourceText: holdSourceText(h),
	}));
	// Part-scoped holds first, then creature-wide; the strongest first within each.
	const rank = { strong: 0, medium: 1, weak: 2 } as const;
	holds.sort((a, b) => (a.reach === b.reach ? rank[a.strength] - rank[b.strength] : a.reach === 'part' ? -1 : 1));

	const defects: DefectView[] = data.defects
		.filter((d) => d.part === part.id)
		.map((d) => ({
			id: d.id,
			alias: d.alias,
			description: d.description,
			status: d.status,
			origin: d.origin,
			...(d.region ? { region: d.region } : {}),
			attempts: attemptsOn(data, d.id).map((b) => ({ alias: b.alias, status: b.status, kind: b.kind })),
			stalled: isStalled(data, d),
		}));

	const partBuilds = data.builds.filter((b) => b.part === part.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	const builds = partBuilds.map((b) => buildView(b, data));
	const approved = part.approvedBuild ? partBuilds.find((b) => b.id === part.approvedBuild) : undefined;

	const buildIds = new Set(partBuilds.map((b) => b.id));
	const defectIds = new Set(defects.map((d) => d.id));
	const holdIds = new Set(data.holds.filter((h) => h.scope.part === part.id).map((h) => h.id));
	const notes = data.notes
		.filter((n) => n.about?.part === part.id || (n.about?.build && buildIds.has(n.about.build)) || (n.about?.defect && defectIds.has(n.about.defect)) || (n.about?.hold && holdIds.has(n.about.hold)))
		.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

	const usage = partUsage(data, part);
	return {
		creature: data.creature.key,
		part,
		holds,
		defects,
		builds,
		...(approved ? { baseline: buildView(approved, data) } : {}),
		notes,
		budget: { total: part.budget, builds: usage.buildsUsed, wallMinutes: usage.wallMinutesUsed, buildsLeft: usage.buildsLeft, wallMinutesLeft: usage.wallMinutesLeft },
	};
}

export type NeedKind = 'review' | 'question' | 'stalled' | 'stage';

export interface NeedItem {
	kind: NeedKind;
	/** The record this card is about: a build alias, a question note alias or a defect alias. */
	ref: string;
	partKey?: string;
	partAlias?: string;
	partName?: string;
	/** For a review: preview or build. */
	buildKind?: Build['kind'];
	/** What is being asked, in plain words. */
	ask: string;
	since: string;
	/** Blob hash of a thumbnail, when there is an image. */
	thumb?: string;
	/** For a stage review: the stage id. */
	stage?: string;
}

/** Everything waiting on Nick, oldest first: builds presented for review, unanswered questions, stalled defects whose audit says to ask him. */
export function needsNick(data: CreatureData): NeedItem[] {
	const items: NeedItem[] = [];
	const partOf = (id: string | undefined) => (id ? data.parts.find((p) => p.id === id) : undefined);
	const partBits = (p: Part | undefined) => (p ? { partKey: p.key, partAlias: p.alias, partName: p.name } : {});

	for (const b of data.builds) {
		if (b.status !== 'presented' || b.kind === 'image' || b.stage === 'blockout') continue;
		const thumbOut = b.outputs.find((o) => o.camera === 'front' && (o.role === undefined || o.role === 'render')) ?? b.outputs.find((o) => o.role === 'render') ?? b.outputs[0];
		items.push({
			kind: 'review',
			ref: b.alias,
			...partBits(partOf(b.part)),
			buildKind: b.kind,
			ask: b.kind === 'preview' ? `Look at preview ${b.alias}: ${b.goal.text}` : `Review build ${b.alias}: ${b.goal.text}`,
			since: b.updatedAt,
			...(thumbOut ? { thumb: thumbOut.blob } : {}),
		});
	}

	// Images presented but not yet part of a submitted stage: Nick picks (vision) or looks (sheet).
	const imagePending = new Map<string, NeedItem>();
	const vision = visionView(data).elements.filter((e) => e.options.length > 0);
	if (vision.length > 0) {
		const first = vision[0]!.options[0]!;
		const since = data.builds.filter((b) => b.status === 'presented' && b.image?.stage === 'vision').map((b) => b.updatedAt).sort()[0] ?? data.creature.updatedAt;
		imagePending.set('vision', { kind: 'stage', ref: 'vision', stage: 'vision', ask: `Pick one option each for ${vision.map((e) => e.element).join(', ')} on the vision board`, since, ...(first.blob ? { thumb: first.blob } : {}) });
	}
	const sheetShown = data.builds.filter((b) => b.status === 'presented' && b.image?.stage === 'sheet');
	if (sheetShown.length > 0) {
		const first = sheetShown.find((b) => b.image!.element === 'turnaround-front') ?? sheetShown[0]!;
		imagePending.set('sheet', { kind: 'stage', ref: 'sheet', stage: 'sheet', ask: `Look at the model sheet (${sheetShown.length} images)`, since: sheetShown.map((b) => b.updatedAt).sort()[0]!, ...(first.outputs[0] ? { thumb: first.outputs[0].blob } : {}) });
	}

	const blockoutShown = currentBlockoutBuild(data);
	const blockoutThumb = blockoutShown?.outputs.find((o) => o.camera === 'front' && o.role === 'render')?.blob;
	if (blockoutShown?.status === 'presented') {
		imagePending.set('blockout', { kind: 'stage', ref: 'blockout', stage: 'blockout', ask: `Look at the blockout (build ${blockoutShown.alias}) and approve, adjust or reject it`, since: blockoutShown.updatedAt, ...(blockoutThumb ? { thumb: blockoutThumb } : {}) });
	}

	for (const id of STAGE_IDS) {
		if (data.creature.stages[id].status !== 'in-review') {
			const pending = imagePending.get(id);
			if (pending && data.creature.stages[id].status === 'open') items.push(pending);
			continue;
		}
		const last = data.notes.filter((n) => n.about?.stage === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
		const thumb = id === 'intake' ? data.creature.intake?.silhouette.blob : id === 'vision' ? [...data.references].sort((a, b) => a.precedence - b.precedence)[0]?.blob : id === 'sheet' ? (sheetImages(data).find((b) => b.image!.element === 'turnaround-front') ?? sheetImages(data)[0])?.outputs[0]?.blob : id === 'blockout' ? blockoutThumb : undefined;
		items.push({ kind: 'stage', ref: id, stage: id, ask: `Review the ${id === 'sheet' ? 'model sheet' : id === 'vision' ? 'vision board' : id} stage and approve, adjust or reject it`, since: last?.createdAt ?? data.creature.updatedAt, ...(thumb ? { thumb } : {}) });
	}

	for (const n of data.notes) {
		if (n.kind !== 'question' || n.answered) continue;
		const p = partOf(n.about?.part) ?? partOf(data.defects.find((d) => d.id === n.about?.defect)?.part) ?? partOf(data.builds.find((b) => b.id === n.about?.build)?.part);
		items.push({ kind: 'question', ref: n.alias, ...partBits(p), ask: n.text, since: n.createdAt });
	}

	for (const d of data.defects) {
		if (!isStalled(data, d)) continue;
		const audit = data.notes
			.filter((n) => n.kind === 'audit' && n.about?.defect === d.id && n.outcome === 'ask-nick')
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
		if (!audit) continue;
		const answered = data.notes.some((n) => n.kind === 'question' && n.answered && n.createdAt >= audit.createdAt && n.about?.defect === d.id);
		if (answered) continue;
		items.push({ kind: 'stalled', ref: d.alias, ...partBits(partOf(d.part)), ask: `Stuck after ${attemptsOn(data, d.id).length} tries: ${d.description}`, since: audit.createdAt });
	}

	return items.sort((a, b) => a.since.localeCompare(b.since));
}

export interface BlockoutView {
	status: Creature['stages']['blockout']['status'];
	/** Blockout builds, newest first. */
	builds: BuildView[];
	/** The build the stage is about (newest shown), by alias. */
	current?: string;
	/** The orchestrator's fit note. */
	fitNote?: { alias: string; text: string; createdAt: string };
	/** The flesh views of the model sheet (bare-body images), by view, for the comparison when a camera has no overlay. */
	flesh: { front?: string; side?: string; back?: string };
	/** Problems marked about the blockout. */
	marks: { alias: string; description: string; build: string; camera: string; status: string }[];
	budget: { builds: number; buildsLeft: number; wallMinutes: number; wallMinutesLeft: number };
}

export function blockoutView(data: CreatureData): BlockoutView {
	const all = blockoutBuilds(data).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	const current = currentBlockoutBuild(data);
	const note = fitNote(data);
	const byId = new Map(data.builds.map((b) => [b.id, b]));
	const bare = (el: string) => sheetImages(data).filter((b) => b.image!.element === el).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.outputs[0]?.blob;
	const front = bare('bare-front');
	const side = bare('bare-side');
	const back = bare('bare-back');
	const budget = data.creature.defaultBudget;
	const wall = all.reduce((sum, b) => sum + (b.cost.wallMinutes ?? 0), 0);
	return {
		status: data.creature.stages.blockout.status,
		builds: all.map((b) => buildView(b, data)),
		...(current ? { current: current.alias } : {}),
		...(note ? { fitNote: { alias: note.alias, text: note.text, createdAt: note.createdAt } } : {}),
		flesh: { ...(front ? { front } : {}), ...(side ? { side } : {}), ...(back ? { back } : {}) },
		marks: data.defects.filter((d) => d.stage === 'blockout').map((d) => ({ alias: d.alias, description: d.description, build: byId.get(d.region?.buildId ?? '')?.alias ?? '', camera: d.region?.camera ?? '', status: d.status })),
		budget: { builds: budget.builds, buildsLeft: Math.max(0, budget.builds - all.length), wallMinutes: budget.wallMinutes, wallMinutesLeft: Math.max(0, budget.wallMinutes - wall) },
	};
}
