import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run } from '../cli.ts';
import { blockoutView, needsNick, planBlockout, status } from '../engine.ts';
import { ingestOverlays } from '../ingest.ts';
import { submitStage } from '../intake.ts';
import { markBlockoutBuild, recordReview, recordStageReview } from '../review.ts';
import { BuildSchema, STANDARD_CAMERAS, type Build } from '../schema.ts';
import { staleStages, stageEvidence, submitProblems } from '../stages.ts';
import { initCreature, type Store } from '../store.ts';
import { verifyAll } from '../verify.ts';
import { putFile } from '../blobs.ts';

const who = { actor: 'orchestrator' as const, session: 's' };
const saved = process.env.XALIANS_STUDIO_STORE;

let root: string;
let blobs: string;
let scratch: string;
let n = 0;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'studio-blockout-'));
	blobs = mkdtempSync(join(tmpdir(), 'studio-blockout-blobs-'));
	scratch = mkdtempSync(join(tmpdir(), 'studio-blockout-src-'));
	process.env.XALIANS_STUDIO_STORE = blobs;
});
afterEach(() => {
	if (saved === undefined) delete process.env.XALIANS_STUDIO_STORE;
	else process.env.XALIANS_STUDIO_STORE = saved;
});

function blob(name: string): string {
	const f = join(scratch, `${name}-${n++}.png`);
	writeFileSync(f, `${name}-${n}`);
	return putFile(f);
}

/** A creature whose sheet is approved (so the blockout is open) and which has one bare image per view. */
function atBlockout(): Store {
	const store = initCreature(root, { key: 'fx', name: 'Fx', speciesTemplate: 't.json', silhouette: 's.svg' });
	store.acquireLock('s');
	store.update<'creature'>(store.load().creature.id, (c) => {
		for (const id of ['intake', 'vision', 'sheet'] as const) c.stages[id] = { status: 'approved' };
		c.stages.blockout = { status: 'open' };
	}, who);
	store.create('part', { key: 'torso', name: 'Torso', includes: [], why: 'w', scope: {}, dependsOn: [], order: 1, status: 'not-started', budget: { builds: 6, wallMinutes: 100 } }, 'orchestrator', who);
	for (const el of ['bare-front', 'bare-side', 'bare-back']) {
		store.create('build', {
			kind: 'image',
			image: { stage: 'sheet', element: el, label: el, prompt: 'p', promptSha256: 'a'.repeat(64), inputs: [], tool: 'codex image_gen', generatedPath: '', codexTokens: null, model: null },
			goal: { text: el }, targets: [], method: 'image', outputs: [{ name: 'output.png', blob: blob(el) }], checks: [], lookNotes: [], cost: {}, status: 'presented',
		} as never, 'orchestrator', who);
	}
	return store;
}

function plan(store: Store, over: Record<string, unknown> = {}): Build {
	const planned = planBlockout(store.load(), { goal: 'first blockout', method: 'blocks', ...over });
	return store.create('build', planned as never, 'orchestrator', who);
}

/** Fills a planned build with everything the stage needs and presents it. */
function complete(store: Store, b: Build, opts: { overlays?: string[]; skipRender?: string } = {}): Build {
	const cams = STANDARD_CAMERAS.filter((c) => c !== opts.skipRender);
	const outputs: Build['outputs'] = cams.map((c) => ({ name: c, blob: blob(c), role: 'render', camera: c }));
	for (const v of opts.overlays ?? ['front', 'side-left', 'back']) outputs.push({ name: `${v}-overlay`, blob: blob(`${v}-overlay`), role: 'overlay', camera: v });
	const lookNotes = outputs.filter((o) => o.role === 'render').map((o) => ({ camera: o.camera!, imageBlob: o.blob, note: 'looked' }));
	return store.update<'build'>(b.id, (x) => { x.outputs = outputs; x.lookNotes = lookNotes; x.status = 'presented'; x.checks = [{ id: 'fit-iou:front', kind: 'measure', value: 0.93 }]; }, who);
}

function fit(store: Store, text = 'Fit check: front 0.93, side 0.91, back 0.9; the tail is short on purpose.') {
	store.create('note', { kind: 'decision', by: 'orchestrator', about: { stage: 'blockout' }, text } as never, 'orchestrator', who);
}

describe('blockout builds in the schema', () => {
	const base = { id: 'B-' + '0'.repeat(26), alias: 'B-abcd', rev: 1, createdAt: '2026-10-13T00:00:00.000Z', updatedAt: '2026-10-13T00:00:00.000Z', createdBy: 'orchestrator', goal: { text: 'g' }, targets: [], method: 'm', outputs: [], checks: [], lookNotes: [], cost: {}, status: 'planned' };

	it('allows no part only for stage blockout, and only as kind build', () => {
		expect(BuildSchema.safeParse({ ...base, kind: 'build', stage: 'blockout' }).success).toBe(true);
		expect(BuildSchema.safeParse({ ...base, kind: 'build' }).success).toBe(false);
		expect(BuildSchema.safeParse({ ...base, kind: 'preview', stage: 'blockout' }).success).toBe(false);
		expect(BuildSchema.safeParse({ ...base, kind: 'build', stage: 'blockout', part: 'P-' + '0'.repeat(26) }).success).toBe(false);
	});
});

describe('planning a blockout build', () => {
	it('works with no defect the first time and needs one afterwards', () => {
		const s = atBlockout();
		const b = plan(s);
		expect(b).toMatchObject({ stage: 'blockout', kind: 'build', status: 'planned' });
		expect(b.part).toBeUndefined();
		expect(() => planBlockout(s.load(), { goal: 'again', method: 'm2' })).toThrow(/must target a defect/);
	});

	it('is refused while the stage is locked, in review or approved', () => {
		const s = atBlockout();
		for (const [status, re] of [['locked', /locked/], ['in-review', /waiting on Nick/], ['approved', /is approved/]] as const) {
			s.update<'creature'>(s.load().creature.id, (c) => { c.stages.blockout = { status }; }, who);
			expect(() => planBlockout(s.load(), { goal: 'g', method: 'm' })).toThrow(re);
		}
	});

	it('spends the creature default budget', () => {
		const s = atBlockout();
		s.update<'creature'>(s.load().creature.id, (c) => { c.defaultBudget = { builds: 1, wallMinutes: 100 }; }, who);
		plan(s);
		expect(() => planBlockout(s.load(), { goal: 'g', method: 'm' })).toThrow(/spent its build budget \(1 of 1\)/);
	});

	it('targets only open defects about stage blockout and applies the stall rule', () => {
		const s = atBlockout();
		const first = complete(s, plan(s));
		const [d] = markBlockoutBuild(s, { build: first.alias, marks: [{ camera: 'front', shape: 'rect', x: 0.1, y: 0.1, w: 0.2, h: 0.2, description: 'legs too short' }] });
		expect(d).toMatchObject({ stage: 'blockout', origin: 'nick', status: 'open' });
		const partDefect = s.create('defect', { part: s.load().parts[0]!.id, description: 'x', origin: 'nick', status: 'open', attempts: [] }, 'nick', who);
		expect(() => planBlockout(s.load(), { goal: 'g', method: 'm', targets: [partDefect.alias] })).toThrow(/not about stage blockout/);
		// two attempts stall the defect; a third needs an audit that changes something
		for (let i = 0; i < 2; i++) {
			const p = planBlockout(s.load(), { goal: `try ${i}`, method: `method ${i}`, targets: [d!.alias] });
			const made = s.create('build', { ...p, status: 'reported' } as never, 'orchestrator', who);
			s.update<'defect'>(d!.id, (x) => { x.attempts.push(made.id); }, who);
		}
		expect(() => planBlockout(s.load(), { goal: 'g', method: 'method 3', targets: [d!.alias] })).toThrow(/stalled after 2 builds; write an audit note/);
		s.create('note', { kind: 'audit', by: 'orchestrator', about: { defect: d!.id }, text: 'cause', outcome: 'redefine-part' } as never, 'orchestrator', who);
		expect(() => planBlockout(s.load(), { goal: 'g', method: 'method 3', targets: [d!.alias] })).toThrow(/does not apply to the blockout/);
		s.create('note', { kind: 'audit', by: 'orchestrator', about: { defect: d!.id }, text: 'cause', outcome: 'change-method' } as never, 'orchestrator', who);
		expect(planBlockout(s.load(), { goal: 'g', method: 'method 3', targets: [d!.alias] }).targets).toEqual([d!.id]);
	});

	it('plans from the CLI with --stage blockout and refuses --part', () => {
		const s = atBlockout();
		const out: string[] = [];
		expect(run(['build', 'plan', 'fx', '--stage', 'blockout', '--goal', 'first', '--method', 'blocks', '--root', root, '--session', 's'], { out: (l) => out.push(l) })).toBe(0);
		expect(s.load().builds.filter((b) => b.stage === 'blockout')).toHaveLength(1);
		expect(run(['build', 'plan', 'fx', '--stage', 'blockout', '--part', 'torso', '--goal', 'g', '--method', 'm', '--root', root, '--session', 's'], { out: () => {} })).not.toBe(0);
		expect(s.load().builds.filter((b) => b.stage === 'blockout')).toHaveLength(1);
	});
});

describe('overlays', () => {
	function folder(files: Record<string, string>): string {
		const d = mkdtempSync(join(scratch, 'ov-'));
		for (const [name, body] of Object.entries(files)) {
			mkdirSync(join(d, name, '..'), { recursive: true });
			writeFileSync(join(d, name), body);
		}
		return d;
	}

	it('stores images by view with role overlay and turns fit.json into measure checks', () => {
		const r = ingestOverlays(folder({ 'front.overlay.png': 'a', 'side-left.overlay.png': 'b', 'fit.json': '{"front":0.92,"side-left":0.88}', 'notes.txt': 'ignored' }));
		expect(r.outputs).toEqual([
			expect.objectContaining({ name: 'front-overlay', role: 'overlay', camera: 'front' }),
			expect.objectContaining({ name: 'side-left-overlay', role: 'overlay', camera: 'side-left' }),
		]);
		expect(r.checks).toEqual([
			expect.objectContaining({ id: 'fit-iou:front', kind: 'measure', value: 0.92 }),
			expect.objectContaining({ id: 'fit-iou:side-left', kind: 'measure', value: 0.88 }),
		]);
	});

	it('rejects unknown views, bad numbers and an empty folder', () => {
		expect(() => ingestOverlays(folder({ 'sideways.overlay.png': 'a' }))).toThrow(/not a standard camera/);
		expect(() => ingestOverlays(folder({ 'front.overlay.png': 'a', 'fit.json': '{"front":1.4}' }))).toThrow(/0 to 1/);
		expect(() => ingestOverlays(folder({ 'fit.json': '{}' }))).toThrow(/no <view>.overlay.png/);
	});

	it('build overlay adds them to a blockout build and refuses a part build', () => {
		const s = atBlockout();
		const b = plan(s);
		const d = folder({ 'front.overlay.png': 'a', 'fit.json': '{"front":0.9}' });
		expect(run(['build', 'overlay', 'fx', b.alias, '--dir', d, '--root', root, '--session', 's'], { out: () => {} })).toBe(0);
		const rec = s.load().builds.find((x) => x.id === b.id)!;
		expect(rec.outputs).toHaveLength(1);
		expect(rec.checks).toHaveLength(1);
		const partBuild = s.create('build', { part: s.load().parts[0]!.id, kind: 'preview', goal: { text: 'g' }, targets: [], method: 'm', outputs: [], checks: [], lookNotes: [], cost: {}, status: 'planned' } as never, 'orchestrator', who);
		expect(run(['build', 'overlay', 'fx', partBuild.alias, '--dir', d, '--root', root, '--session', 's'], { out: () => {} })).not.toBe(0);
		expect(s.load().builds.find((x) => x.id === partBuild.id)!.outputs).toHaveLength(0);
	});
});

describe('submitting and approving the blockout', () => {
	it('needs the approved sheet', () => {
		const s = atBlockout();
		s.update<'creature'>(s.load().creature.id, (c) => { c.stages.sheet = { status: 'open' }; }, who);
		expect(submitProblems(s.load(), 'blockout')).toContain('the sheet stage is not approved yet');
	});

	it('needs a presented blockout build', () => {
		const s = atBlockout();
		expect(submitProblems(s.load(), 'blockout').join('\n')).toMatch(/no presented blockout build/);
		plan(s);
		expect(submitProblems(s.load(), 'blockout').join('\n')).toMatch(/no presented blockout build/);
	});

	it('needs renders for all eight standard cameras', () => {
		const s = atBlockout();
		complete(s, plan(s), { skipRender: 'below' });
		fit(s);
		expect(submitProblems(s.load(), 'blockout')).toEqual([expect.stringMatching(/no render for: below/)]);
	});

	it('needs front, side and back overlays', () => {
		const s = atBlockout();
		complete(s, plan(s), { overlays: ['front', 'back'] });
		fit(s);
		expect(submitProblems(s.load(), 'blockout')).toEqual([expect.stringMatching(/no side overlay/)]);
	});

	it('accepts either side camera for the side overlay', () => {
		const s = atBlockout();
		complete(s, plan(s), { overlays: ['front', 'side-right', 'back'] });
		fit(s);
		expect(submitProblems(s.load(), 'blockout')).toEqual([]);
	});

	it('needs the orchestrator fit note, starting "Fit check:"', () => {
		const s = atBlockout();
		complete(s, plan(s));
		expect(submitProblems(s.load(), 'blockout').join('\n')).toMatch(/Fit check:/);
		fit(s, 'Looks fine to me');
		expect(submitProblems(s.load(), 'blockout').join('\n')).toMatch(/Fit check:/);
		s.create('note', { kind: 'decision', by: 'nick', about: { stage: 'blockout' }, text: 'Fit check: from Nick does not count' } as never, 'nick', { bypassLock: true });
		expect(submitProblems(s.load(), 'blockout').join('\n')).toMatch(/Fit check:/);
		fit(s);
		expect(submitProblems(s.load(), 'blockout')).toEqual([]);
	});

	it('shows a presented blockout under Needs you before it is submitted, and as a stage review after', () => {
		const s = atBlockout();
		complete(s, plan(s));
		expect(needsNick(s.load())).toEqual([expect.objectContaining({ kind: 'stage', stage: 'blockout', thumb: expect.any(String) })]);
		fit(s);
		submitStage(s, 'blockout', who);
		const needs = needsNick(s.load());
		expect(needs).toHaveLength(1);
		expect(needs[0]).toMatchObject({ kind: 'stage', stage: 'blockout', ask: expect.stringContaining('blockout') });
	});

	it('approval records the build output hashes, opens parts and starts every part from the build', () => {
		const s = atBlockout();
		const b = complete(s, plan(s));
		fit(s);
		submitStage(s, 'blockout', who);
		const r = recordStageReview(s, { stage: 'blockout', verdict: 'approve', text: 'good proportions' });
		const data = s.load();
		expect(data.creature.stages.blockout.status).toBe('approved');
		expect(data.creature.stages.blockout.evidence).toEqual([...new Set(b.outputs.map((o) => o.blob))].sort());
		expect(data.creature.stages.parts.status).toBe('open');
		expect(data.parts.every((p) => p.startBuild === b.id)).toBe(true);
		expect(data.builds.find((x) => x.id === b.id)!.status).toBe('reviewed');
		expect(r.applied.join('; ')).toMatch(/stage parts open/);
		expect(staleStages(data)).toEqual([]);
		expect(verifyAll(root).errors).toEqual([]);
	});

	it('goes stale when a newer blockout build is shown after approval', () => {
		const s = atBlockout();
		complete(s, plan(s));
		fit(s);
		submitStage(s, 'blockout', who);
		recordStageReview(s, { stage: 'blockout', verdict: 'approve', text: '' });
		// a newer build appears (as if the stage had been reopened): the approval covered other outputs
		const later = s.create('build', { stage: 'blockout', kind: 'build', goal: { text: 'g' }, targets: [], method: 'm', outputs: [{ name: 'x', blob: blob('x'), role: 'render', camera: 'front' }], checks: [], lookNotes: [], cost: {}, status: 'presented' } as never, 'orchestrator', who);
		expect(later.status).toBe('presented');
		expect(staleStages(s.load()).map((x) => x.id)).toEqual(['blockout']);
		expect(stageEvidence(s.load(), 'blockout')).not.toEqual(s.load().creature.stages.blockout.evidence);
	});

	it('adjust sends the stage back to open and keeps the parts locked', () => {
		const s = atBlockout();
		complete(s, plan(s));
		fit(s);
		submitStage(s, 'blockout', who);
		recordStageReview(s, { stage: 'blockout', verdict: 'adjust', text: 'legs too short' });
		const data = s.load();
		expect(data.creature.stages.blockout.status).toBe('open');
		expect(data.creature.stages.parts.status).toBe('locked');
		expect(data.parts.every((p) => p.startBuild === undefined)).toBe(true);
	});

	it('a blockout build is not reviewable as a part build', () => {
		const s = atBlockout();
		const b = complete(s, plan(s));
		expect(() => recordReview(s, { build: b.alias, verdict: 'approve', text: '' })).toThrow(/is an image|stage/);
	});
});

describe('marking a blockout', () => {
	const mark = { camera: 'front', shape: 'ellipse' as const, x: 0.1, y: 0.2, w: 0.2, h: 0.2, description: 'ears too low' };

	it('creates defects about stage blockout, tied to the build and view', () => {
		const s = atBlockout();
		const b = complete(s, plan(s));
		const [d] = markBlockoutBuild(s, { build: b.alias, marks: [mark] });
		expect(d).toMatchObject({ stage: 'blockout', origin: 'nick', region: { buildId: b.id, camera: 'front' } });
		expect(d!.part).toBeUndefined();
		expect(status(s.load()).stageDefects).toEqual([expect.objectContaining({ stage: 'blockout', description: 'ears too low' })]);
		expect(blockoutView(s.load()).marks).toEqual([expect.objectContaining({ build: b.alias, camera: 'front', description: 'ears too low' })]);
	});

	it('refuses a build that was not shown, a part build, and out-of-range marks', () => {
		const s = atBlockout();
		const planned = plan(s);
		expect(() => markBlockoutBuild(s, { build: planned.alias, marks: [mark] })).toThrow(/only a shown build/);
		const b = complete(s, planned);
		expect(() => markBlockoutBuild(s, { build: b.alias, marks: [] })).toThrow(/no marks/);
		expect(() => markBlockoutBuild(s, { build: b.alias, marks: [{ ...mark, x: 2 }] })).toThrow(/0 to 1/);
		const part = s.create('build', { part: s.load().parts[0]!.id, kind: 'build', goal: { text: 'g' }, targets: [], method: 'm', outputs: [], checks: [], lookNotes: [], cost: {}, status: 'presented' } as never, 'orchestrator', who);
		expect(() => markBlockoutBuild(s, { build: part.alias, marks: [mark] })).toThrow(/not a blockout build/);
	});
});

describe('the blockout view', () => {
	it('carries the flesh images, the fit note, the build and the budget', () => {
		const s = atBlockout();
		const b = complete(s, plan(s));
		fit(s);
		const v = blockoutView(s.load());
		expect(v.current).toBe(b.alias);
		expect(v.fitNote?.text).toMatch(/^Fit check:/);
		expect(Object.keys(v.flesh).sort()).toEqual(['back', 'front', 'side']);
		expect(v.builds[0]!.cameras.front!.map((o) => o.role).sort()).toEqual(['overlay', 'render']);
		expect(v.budget).toMatchObject({ builds: 6, buildsLeft: 5 });
	});
});
