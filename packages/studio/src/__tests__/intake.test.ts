import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../cli.ts';
import { needsNick, status } from '../engine.ts';
import { addDerivedTarget, addReference, editReference, liveTemplateSha, proposeParts, runIntake, setReading, submitStage } from '../intake.ts';
import { recordStageReview } from '../review.ts';
import { creatureBoard, referenceViews, staleStages } from '../stages.ts';
import { openCreature } from '../store.ts';
import { verifyAll } from '../verify.ts';

let root: string;
let blobs: string;
const savedEnv = process.env.XALIANS_STUDIO_STORE;
const who = { actor: 'orchestrator' as const, session: 's' };

const TEMPLATE = {
	key: 'bird',
	name: 'Birdy',
	element: 'fire',
	homePlanet: 'magmuth',
	lore: { description: 'A feathered runner.', appearance: ['two legs', 'long tail'] },
	physiology: { bodyPlan: 'biped', anatomy: ['jaws', 'wings'], covering: 'feathers', size: { massKg: [38, 56], heightCm: [88, 112] } },
};

function write(rel: string, body: string): string {
	const file = join(root, rel);
	mkdirSync(join(file, '..'), { recursive: true });
	writeFileSync(file, body);
	return file;
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'studio-intake-'));
	blobs = mkdtempSync(join(tmpdir(), 'studio-intake-blobs-'));
	process.env.XALIANS_STUDIO_STORE = blobs;
	write('docs/species-templates/v5/bird.json', JSON.stringify(TEMPLATE));
	write('apps/web/src/svg/species/bird.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>');
	write('docs/encyclopedia/encyclopedia.json', JSON.stringify({ entries: [{ key: 'bird', category: 'xalians', definition: 'Encyclopedia words.' }] }));
});
afterEach(() => {
	if (savedEnv === undefined) delete process.env.XALIANS_STUDIO_STORE;
	else process.env.XALIANS_STUDIO_STORE = savedEnv;
});

const PARTS = [
	{ key: 'torso', name: 'Torso', includes: ['ribcage'], why: 'everything hangs from it', dependsOn: [], order: 1 },
	{ key: 'neck', name: 'Neck', includes: ['neck'], why: 'carries the head', dependsOn: ['torso'], order: 2 },
	{ key: 'head', name: 'Head', includes: ['skull', 'jaws'], why: 'the face', dependsOn: ['neck'], order: 3 },
];

const READING = { mustHave: [{ feature: 'Two legs', source: 'both' }], carryOver: [{ feature: 'Long tail' }], openForDesign: [{ feature: 'Feather pattern', note: 'vision board' }], questions: [] };

function intaken() {
	const r = runIntake(root, 'fx-bird', { ...who, species: 'bird' });
	setReading(r.store, READING, who);
	return r.store;
}

function png(name: string, body = name): string {
	return write(`img/${name}`, body);
}

describe('intake', () => {
	it('creates the creature, fills the block from the template and stores the silhouette', () => {
		const r = runIntake(root, 'fx-bird', { ...who, species: 'bird' });
		expect(r.created).toBe(true);
		const c = r.store.load().creature;
		expect(c.name).toBe('Birdy');
		expect(c.stages.intake.status).toBe('open');
		expect(c.intake).toMatchObject({ name: 'Birdy', element: 'fire', homeWorld: 'magmuth', bodyPlan: 'biped', covering: 'feathers', sizeCm: [88, 112], loreSummary: 'A feathered runner.', appearance: ['two legs', 'long tail'], anatomy: ['jaws', 'wings'] });
		expect(c.intake!.silhouette.fileName).toBe('bird.svg');
		expect(c.intake!.templateSha256).toMatch(/^[0-9a-f]{64}$/);
		expect(verifyAll(root).errors).toEqual([]);
	});

	it('is idempotent and leaves the revision alone when nothing changed', () => {
		const first = runIntake(root, 'fx-bird', { ...who, species: 'bird' });
		const rev = first.store.load().creature.rev;
		const again = runIntake(root, 'fx-bird', { ...who, species: 'bird' });
		expect(again.created).toBe(false);
		expect(again.changed).toBe(false);
		expect(again.store.load().creature.rev).toBe(rev);
	});

	it('falls back to the encyclopedia definition when the template has no description', () => {
		write('docs/species-templates/v5/bird.json', JSON.stringify({ ...TEMPLATE, lore: { appearance: [] } }));
		expect(runIntake(root, 'fx-bird', { ...who, species: 'bird' }).intake.loreSummary).toBe('Encyclopedia words.');
	});

	it('needs a session to create and a silhouette to exist', () => {
		expect(() => runIntake(root, 'fx-bird', { actor: 'orchestrator', species: 'bird' })).toThrow(/session/);
		expect(() => runIntake(root, 'fx-nope', { ...who, species: 'nope' })).toThrow(/no species template/);
		write('docs/species-templates/v5/bare.json', JSON.stringify(TEMPLATE));
		expect(() => runIntake(root, 'fx-bare', { ...who, species: 'bare' })).toThrow(/no silhouette/);
	});

	it('refuses to overwrite an approved intake unless forced', () => {
		const store = intaken();
		proposeParts(store, PARTS, who);
		submitStage(store, 'intake', who);
		recordStageReview(store, { stage: 'intake', verdict: 'approve', text: 'yes' });
		expect(() => runIntake(root, 'fx-bird', { ...who, species: 'bird' })).toThrow(/approved/);
		write('docs/species-templates/v5/bird.json', JSON.stringify({ ...TEMPLATE, name: 'Birdier' }));
		const forced = runIntake(root, 'fx-bird', { ...who, species: 'bird', force: true });
		expect(forced.changed).toBe(true);
		expect(forced.store.load().creature.stages.intake.status).toBe('approved');
		expect(status(forced.store.load()).stages.intake).toBe('stale');
	});
});

describe('proposing parts', () => {
	it('records parts as proposed with dependencies resolved to ids, and replaces the list on a second call', () => {
		const store = intaken();
		const made = proposeParts(store, PARTS, who);
		expect(made.map((p) => p.status)).toEqual(['proposed', 'proposed', 'proposed']);
		const data = store.load();
		const neck = data.parts.find((p) => p.key === 'neck')!;
		expect(neck.dependsOn).toEqual([data.parts.find((p) => p.key === 'torso')!.id]);
		proposeParts(store, PARTS.slice(0, 2), who);
		expect(store.load().parts.map((p) => p.key).sort()).toEqual(['neck', 'torso']);
		expect(verifyAll(root).errors).toEqual([]);
	});

	it('rejects bad lists before touching anything', () => {
		const store = intaken();
		proposeParts(store, PARTS, who);
		expect(() => proposeParts(store, [{ ...PARTS[0]!, dependsOn: ['head'] }, ...PARTS.slice(1)], who)).toThrow(/cycle/);
		expect(() => proposeParts(store, [{ ...PARTS[0]!, dependsOn: ['ghost'] }], who)).toThrow(/not in the list/);
		expect(() => proposeParts(store, [PARTS[0]!, { ...PARTS[1]!, order: 1 }], who)).toThrow(/share order/);
		expect(() => proposeParts(store, [], who)).toThrow(/non-empty/);
		expect(store.load().parts).toHaveLength(3);
	});

	it('refuses once the intake stage is approved', () => {
		const store = intaken();
		proposeParts(store, PARTS, who);
		submitStage(store, 'intake', who);
		recordStageReview(store, { stage: 'intake', verdict: 'approve', text: '' });
		expect(() => proposeParts(store, PARTS, who)).toThrow(/approved/);
	});

	it('sends a submitted intake back to open', () => {
		const store = intaken();
		proposeParts(store, PARTS, who);
		submitStage(store, 'intake', who);
		proposeParts(store, PARTS.slice(0, 2), who);
		expect(store.load().creature.stages.intake.status).toBe('open');
	});
});

describe('the reading', () => {
	it('is required to submit intake, survives re-running intake, and goes stale when edited after approval', () => {
		const r = runIntake(root, 'fx-bird', { ...who, species: 'bird' });
		proposeParts(r.store, PARTS, who);
		expect(() => submitStage(r.store, 'intake', who)).toThrow(/reading/);
		setReading(r.store, { ...READING, mustHave: [] }, who);
		expect(() => submitStage(r.store, 'intake', who)).toThrow(/reading/);
		setReading(r.store, READING, who);
		expect(runIntake(root, 'fx-bird', { ...who, species: 'bird' }).changed).toBe(false);
		expect(r.store.load().creature.intake!.reading).toEqual(READING);
		submitStage(r.store, 'intake', who);
		setReading(r.store, { ...READING, questions: [{ text: 'Is it nocturnal?' }] }, who);
		expect(r.store.load().creature.stages.intake.status).toBe('open');
		submitStage(r.store, 'intake', who);
		recordStageReview(r.store, { stage: 'intake', verdict: 'approve', text: '' });
		expect(() => setReading(r.store, READING, who)).toThrow(/approved/);
		setReading(r.store, READING, who, true);
		expect(status(r.store.load()).stages.intake).toBe('stale');
	});

	it('rejects a malformed reading', () => {
		const r = runIntake(root, 'fx-bird', { ...who, species: 'bird' });
		expect(() => setReading(r.store, { mustHave: [{ feature: 'x', source: 'dream' }], carryOver: [], openForDesign: [], questions: [] }, who)).toThrow(/bad reading/);
	});
});

describe('submitting stages', () => {
	it('checks the intake outputs', () => {
		const store = intaken();
		expect(() => submitStage(store, 'intake', who)).toThrow(/no proposed parts/);
		proposeParts(store, [{ ...PARTS[0]!, includes: [] }], who);
		expect(() => submitStage(store, 'intake', who)).toThrow(/no includes/);
		proposeParts(store, [{ ...PARTS[0]!, why: ' ' }], who);
		expect(() => submitStage(store, 'intake', who)).toThrow(/no why/);
		proposeParts(store, PARTS, who);
		submitStage(store, 'intake', who);
		expect(store.load().creature.stages.intake.status).toBe('in-review');
		expect(submitStage(store, 'intake', who)).toBe('intake'); // a repeat submit is a no-op
		expect(() => submitStage(store, 'parts', who)).toThrow(/no required outputs/);
	});

	it('checks the references outputs, including a unique precedence and an approved intake', () => {
		const store = intaken();
		addReference(store, { file: png('a.png'), role: 'side view', governs: ['proportions'], mustNotBeUsedFor: [], precedence: 1 }, who);
		expect(() => submitStage(store, 'vision', who)).toThrow(/intake stage is not approved/);
		proposeParts(store, PARTS, who);
		submitStage(store, 'intake', who);
		recordStageReview(store, { stage: 'intake', verdict: 'approve', text: '' });
		const second = addReference(store, { file: png('b.png'), role: 'front view', governs: [], mustNotBeUsedFor: ['color'], precedence: 1 }, who);
		expect(() => submitStage(store, 'vision', who)).toThrow(/governs nothing/);
		editReference(store, second.alias, { governs: ['head'] }, who);
		expect(() => submitStage(store, 'vision', who)).toThrow(/share precedence 1/);
		editReference(store, second.alias, { precedence: 2 }, who);
		submitStage(store, 'vision', who);
		expect(store.load().creature.stages.vision.status).toBe('in-review');
	});
});

describe('stage review', () => {
	it('approves intake with evidence, readies the parts and opens vision', () => {
		const store = intaken();
		proposeParts(store, PARTS, who);
		submitStage(store, 'intake', who);
		const r = recordStageReview(store, { stage: 'intake', verdict: 'approve', text: 'good list' });
		expect(r.note).toMatchObject({ kind: 'review', by: 'nick', via: 'studio', verdict: 'approve', about: { stage: 'intake' } });
		const data = store.load();
		const st = data.creature.stages.intake;
		expect(st.status).toBe('approved');
		expect(st.approvedBy).toBe(r.note.id);
		// silhouette + template + reading + three parts
		expect(st.evidence).toHaveLength(6);
		expect(data.parts.every((p) => p.status === 'not-started')).toBe(true);
		expect(data.creature.stages.vision.status).toBe('open');
		expect(data.creature.stages.blockout.status).toBe('locked');
		expect(verifyAll(root).errors).toEqual([]);
		expect(staleStages(data)).toEqual([]);
	});

	it('sends adjust and reject back to open with the words kept', () => {
		const store = intaken();
		proposeParts(store, PARTS, who);
		submitStage(store, 'intake', who);
		recordStageReview(store, { stage: 'intake', verdict: 'adjust', text: 'merge neck into torso' });
		const c = store.load().creature;
		expect(c.stages.intake).toEqual({ status: 'open', note: 'merge neck into torso' });
		expect(store.load().parts.every((p) => p.status === 'proposed')).toBe(true);
		expect(c.stages.vision.status).toBe('locked');
	});

	it('only reviews a submitted stage and needs no creature lock', () => {
		const store = intaken();
		expect(() => recordStageReview(store, { stage: 'intake', verdict: 'approve', text: '' })).toThrow(/only a stage that was submitted/);
		expect(() => recordStageReview(store, { stage: 'nope', verdict: 'approve', text: '' })).toThrow(/unknown stage/);
		proposeParts(store, PARTS, who);
		submitStage(store, 'intake', who);
		store.releaseLock();
		expect(() => recordStageReview(store, { stage: 'intake', verdict: 'reject', text: 'no' })).not.toThrow();
	});

	it('reports an approved stage stale when a part, the silhouette record or the template changes', () => {
		const store = intaken();
		proposeParts(store, PARTS, who);
		submitStage(store, 'intake', who);
		recordStageReview(store, { stage: 'intake', verdict: 'approve', text: '' });
		const sha = liveTemplateSha(root);
		expect(status(store.load(), sha).staleStages).toEqual([]);

		// Work starting on a part is not a change to what was approved.
		const head = store.load().parts.find((p) => p.key === 'head')!;
		store.update<'part'>(head.id, { status: 'in-progress' }, who);
		expect(status(store.load(), sha).staleStages).toEqual([]);

		// Editing what a part includes is.
		store.update<'part'>(head.id, { includes: ['skull'] }, who);
		const s = status(store.load(), sha);
		expect(s.stages.intake).toBe('stale');
		expect(s.staleStages[0]!.reason).toMatch(/part head/);
		expect(s.next).toMatch(/stale/);
	});

	it('notices a template edited on disk without re-running intake', () => {
		const store = intaken();
		proposeParts(store, PARTS, who);
		submitStage(store, 'intake', who);
		recordStageReview(store, { stage: 'intake', verdict: 'approve', text: '' });
		write('docs/species-templates/v5/bird.json', JSON.stringify({ ...TEMPLATE, element: 'water' }));
		const s = status(store.load(), liveTemplateSha(root));
		expect(s.stages.intake).toBe('stale');
		expect(s.staleStages[0]!.reason).toMatch(/template/);
	});

	it('approves the vision stage with evidence and opens the sheet', () => {
		const store = intaken();
		proposeParts(store, PARTS, who);
		submitStage(store, 'intake', who);
		recordStageReview(store, { stage: 'intake', verdict: 'approve', text: '' });
		const ref = addReference(store, { file: png('a.png'), role: 'side view', governs: ['proportions'], mustNotBeUsedFor: ['color'], precedence: 1 }, who);
		addDerivedTarget(store, ref.alias, png('t.png'), 'bare-body', true, who);
		submitStage(store, 'vision', who);
		recordStageReview(store, { stage: 'vision', verdict: 'approve', text: '' });
		const data = store.load();
		expect(data.creature.stages.vision.status).toBe('approved');
		expect(data.creature.stages.vision.evidence).toHaveLength(3);
		expect(data.creature.stages.sheet.status).toBe('open');
		expect(staleStages(data)).toEqual([]);
		editReference(store, ref.alias, { role: 'front view' }, who);
		expect(staleStages(store.load())[0]!.id).toBe('vision');
	});

	it('refuses to apply a stage note through the generic review path', () => {
		const store = intaken();
		const file = join(root, 'note.json');
		writeFileSync(file, JSON.stringify({ kind: 'review', by: 'nick', via: 'studio', text: 'x', verdict: 'approve', about: { stage: 'intake' } }));
		const err = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(run(['note', 'add', 'fx-bird', '--file', file, '--root', root, '--session', 's'])).toBe(1);
		expect(err.mock.calls[0]![0]).toMatch(/review screen/);
		err.mockRestore();
	});
});

describe('references', () => {
	it('accepts PNG, JPG, WEBP and SVG and refuses other files', () => {
		const store = intaken();
		for (const n of ['a.png', 'b.jpg', 'c.webp', 'd.svg']) addReference(store, { file: png(n), role: 'r', governs: ['x'], mustNotBeUsedFor: [] }, who);
		expect(() => addReference(store, { file: png('e.gif'), role: 'r', governs: [], mustNotBeUsedFor: [] }, who)).toThrow(/PNG, JPG, WEBP or SVG/);
		expect(() => addReference(store, { file: png('f.png'), role: ' ', governs: [], mustNotBeUsedFor: [] }, who)).toThrow(/role/);
		const sorted = referenceViews(store.load());
		expect(sorted.map((r) => r.fileName)).toEqual(['a.png', 'b.jpg', 'c.webp', 'd.svg']);
		expect(sorted.map((r) => r.precedence)).toEqual([1, 2, 3, 4]);
	});

	it('sorts by precedence and edits the fields', () => {
		const store = intaken();
		const a = addReference(store, { file: png('a.png'), role: 'a', governs: ['x'], mustNotBeUsedFor: [] }, who);
		addReference(store, { file: png('b.png'), role: 'b', governs: ['x'], mustNotBeUsedFor: [] }, who);
		editReference(store, a.alias, { precedence: 9, governs: ['x', 'y'], mustNotBeUsedFor: ['z'], role: 'aa' }, who);
		const views = referenceViews(store.load());
		expect(views.map((v) => v.fileName)).toEqual(['b.png', 'a.png']);
		expect(views[1]).toMatchObject({ role: 'aa', governs: ['x', 'y'], mustNotBeUsedFor: ['z'] });
	});
});

describe('views and the cli', () => {
	it('lists a submitted stage under Needs you and shows the board', () => {
		const store = intaken();
		proposeParts(store, PARTS, who);
		submitStage(store, 'intake', who);
		const needs = needsNick(store.load());
		expect(needs).toHaveLength(1);
		expect(needs[0]).toMatchObject({ kind: 'stage', stage: 'intake' });
		const board = creatureBoard(store.load());
		expect(board.stages).toHaveLength(12);
		expect(board.stages.filter((s) => s.phase === 2).map((s) => s.id)).toEqual(['rig', 'animate', 'atlas']);
		expect(board.parts.map((p) => p.dependsOn.map((d) => d.name))).toEqual([[], ['Torso'], ['Neck']]);
	});

	it('runs the whole flow from the command line', () => {
		const out: string[] = [];
		const io = { out: (l: string) => out.push(l) };
		const base = ['--root', root, '--session', 's'];
		expect(run(['intake', 'fx-bird', '--species', 'bird', ...base], io)).toBe(0);
		const readingFile = join(root, 'reading.json');
		writeFileSync(readingFile, JSON.stringify(READING));
		expect(run(['intake', 'reading', 'fx-bird', '--file', readingFile, ...base], io)).toBe(0);
		const partsFile = join(root, 'parts.json');
		writeFileSync(partsFile, JSON.stringify(PARTS));
		expect(run(['part', 'propose', 'fx-bird', '--file', partsFile, ...base], io)).toBe(0);
		expect(run(['stage', 'submit', 'fx-bird', 'intake', ...base], io)).toBe(0);
		const store = openCreature(root, 'fx-bird');
		recordStageReview(store, { stage: 'intake', verdict: 'approve', text: '' });
		expect(run(['reference', 'add', 'fx-bird', '--file', png('a.png'), '--role', 'side view', '--governs', 'proportions,head', '--not-for', 'color', '--precedence', '1', ...base], io)).toBe(0);
		const alias = store.load().references[0]!.alias;
		expect(run(['reference', 'edit', 'fx-bird', alias, '--role', 'side', '--not-for', 'color,pose', ...base], io)).toBe(0);
		expect(store.load().references[0]).toMatchObject({ role: 'side', governs: ['proportions', 'head'], mustNotBeUsedFor: ['color', 'pose'] });
		expect(run(['stage', 'submit', 'fx-bird', 'vision', ...base], io)).toBe(0);
		expect(run(['status', 'fx-bird', ...base], io)).toBe(0);
		expect(out.join('\n')).toMatch(/Waiting on Nick: review the vision stage/);
		expect(readFileSync(partsFile, 'utf8')).toContain('torso');
	});
});
