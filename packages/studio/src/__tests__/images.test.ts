import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../cli.ts';
import { needsNick, status } from '../engine.ts';
import { adjustElement, markSheetImage, parseCodexTokens, pickImage, presentImages, runImage, setVisionContext, unpickImage, wrapperPrompt } from '../images.ts';
import { proposeParts, runIntake, setReading, submitStage } from '../intake.ts';
import { recordStageReview } from '../review.ts';
import { sheetView, visionView } from '../stages.ts';
import type { Store } from '../store.ts';
import { verifyAll } from '../verify.ts';

const FAKE = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-codex.cjs');
const who = { actor: 'orchestrator' as const, session: 's' };
const saved = { store: process.env.XALIANS_STUDIO_STORE, bin: process.env.STUDIO_CODEX_BIN, mode: process.env.FAKE_CODEX_MODE };

const TEMPLATE = {
	key: 'bird',
	name: 'Birdy',
	element: 'fire',
	homePlanet: 'magmuth',
	lore: { description: 'A feathered runner.', appearance: ['two legs'] },
	physiology: { bodyPlan: 'biped', anatomy: ['wings'], covering: 'feathers', size: { massKg: [38, 56], heightCm: [88, 112] } },
};
const PARTS = [{ key: 'torso', name: 'Torso', includes: ['ribcage'], why: 'everything hangs from it', dependsOn: [], order: 1 }];

let root: string;
let blobs: string;
let scratch: string;

function write(rel: string, body: string): string {
	const file = join(root, rel);
	mkdirSync(join(file, '..'), { recursive: true });
	writeFileSync(file, body);
	return file;
}

function prompt(text = 'A flat swatch strip of golden fur.'): string {
	const file = join(scratch, `prompt-${Math.random().toString(36).slice(2)}.txt`);
	writeFileSync(file, text);
	return file;
}

/** A creature whose intake is approved, so the vision stage is open. */
function atVision(): Store {
	const store = runIntake(root, 'fx-bird', { ...who, species: 'bird' }).store;
	proposeParts(store, PARTS, who);
	setReading(store, { mustHave: [{ feature: 'Two legs', source: 'both' }], carryOver: [], openForDesign: [], questions: [] }, who);
	submitStage(store, 'intake', who);
	recordStageReview(store, { stage: 'intake', verdict: 'approve', text: '' });
	return store;
}


beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'studio-img-'));
	blobs = mkdtempSync(join(tmpdir(), 'studio-img-blobs-'));
	scratch = mkdtempSync(join(tmpdir(), 'studio-img-scratch-'));
	process.env.XALIANS_STUDIO_STORE = blobs;
	process.env.STUDIO_CODEX_BIN = FAKE;
	delete process.env.FAKE_CODEX_MODE;
	write('docs/species-templates/v5/bird.json', JSON.stringify(TEMPLATE));
	write('apps/web/src/svg/species/bird.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>');
});
afterEach(() => {
	for (const [k, v] of [['XALIANS_STUDIO_STORE', saved.store], ['STUDIO_CODEX_BIN', saved.bin], ['FAKE_CODEX_MODE', saved.mode]] as const) {
		if (v === undefined) delete process.env[k];
		else process.env[k] = v;
	}
});

describe('the Codex wrapper', () => {
	it('adds the fixed instructions after the prompt and names the inputs', () => {
		const text = wrapperPrompt('Paint a swatch.', ['ref.png', 'two.png']);
		expect(text.startsWith('Paint a swatch.')).toBe(true);
		expect(text).toContain('Use your built-in image generation tool to generate exactly one image.');
		expect(text).toContain('named ref.png, two.png.');
		expect(text).toContain('Copy the generated PNG into the current folder as output.png.');
		expect(text).toContain('Reply with only the absolute path of the original generated file.');
		expect(wrapperPrompt('x', [])).not.toContain('Input images');
	});

	it('reads the last tokens used line', () => {
		expect(parseCodexTokens('x\ntokens used\n12,345\n')).toBe(12345);
		expect(parseCodexTokens('tokens used: 880')).toBe(880);
		expect(parseCodexTokens('nothing here')).toBeNull();
	});
});

describe('image runs as builds', () => {
	it('runs outside the repository and records the build with its prompt, tokens and output', () => {
		const store = atVision();
		const input = join(scratch, 'ref.png');
		writeFileSync(input, 'silhouette bytes');
		const b = runImage(store, { stage: 'vision', element: 'palette', label: 'A: dawn gold', promptFile: prompt(), inputs: [input], governs: ['fur color'], notFor: ['pose'] }, who);
		expect(b.status).toBe('reported');
		expect(b.kind).toBe('image');
		expect(b.part).toBeUndefined();
		expect(b.targets).toEqual([]);
		expect(b.image).toMatchObject({ stage: 'vision', element: 'palette', label: 'A: dawn gold', tool: 'codex image_gen', codexTokens: 12345, model: null, governs: ['fur color'], notFor: ['pose'] });
		expect(b.image!.promptSha256).toMatch(/^[0-9a-f]{64}$/);
		expect(b.image!.inputs).toEqual([{ name: 'ref.png', blob: expect.stringMatching(/^[0-9a-f]{64}$/) }]);
		expect(b.image!.generatedPath).toMatch(/generated-original\.png$/);
		expect(b.outputs).toEqual([{ name: 'output.png', blob: expect.stringMatching(/^[0-9a-f]{64}$/), role: 'render' }]);
		expect(b.cost.wallMinutes).toBeGreaterThanOrEqual(0);

		const runDir = join(blobs, 'codex-runs', b.alias);
		expect(existsSync(join(runDir, 'output.png'))).toBe(true);
		const seen = JSON.parse(readFileSync(join(runDir, 'seen-args.json'), 'utf8'));
		expect(seen.args).toEqual(['exec', '--sandbox', 'workspace-write', '--skip-git-repo-check', '-C', runDir, '--output-last-message', join(runDir, 'reply.md'), '-']);
		expect(seen.files).toContain('ref.png');
		expect(seen.files).toContain('prompt.md');
		expect(readFileSync(join(runDir, 'seen-prompt.txt'), 'utf8')).toContain('A flat swatch strip of golden fur.');
		expect(runDir.startsWith(root)).toBe(false);
		expect(verifyAll(root).errors).toEqual([]);
	});

	it('passes -m to Codex and records the model only when STUDIO_CODEX_MODEL is set', () => {
		const store = atVision();
		process.env.STUDIO_CODEX_MODEL = 'gpt-test';
		try {
			const b = runImage(store, { stage: 'vision', element: 'fur', label: 'M', promptFile: prompt() }, who);
			expect(b.image!.model).toBe('gpt-test');
			const seen = JSON.parse(readFileSync(join(blobs, 'codex-runs', b.alias, 'seen-args.json'), 'utf8'));
			expect(seen.args.slice(0, 3)).toEqual(['exec', '-m', 'gpt-test']);
		} finally {
			delete process.env.STUDIO_CODEX_MODEL;
		}
	});

	it('marks the build failed with the log tail when Codex fails, and when it writes no image', () => {
		const store = atVision();
		process.env.FAKE_CODEX_MODE = 'fail';
		const failed = runImage(store, { stage: 'vision', element: 'fur', label: 'A', promptFile: prompt() }, who);
		expect(failed.status).toBe('failed');
		expect(failed.image!.failure).toMatch(/status 1[\s\S]*image generation is unavailable/);
		process.env.FAKE_CODEX_MODE = 'nooutput';
		const none = runImage(store, { stage: 'vision', element: 'fur', label: 'B', promptFile: prompt() }, who);
		expect(none.status).toBe('failed');
		expect(none.image!.failure).toMatch(/no output\.png/);
		expect(verifyAll(root).errors).toEqual([]);
	});

	it('refuses a run folder inside the repository', () => {
		const store = atVision();
		process.env.XALIANS_STUDIO_STORE = join(root, 'store-inside');
		const b = runImage(store, { stage: 'vision', element: 'fur', label: 'A', promptFile: prompt() }, who);
		expect(b.status).toBe('failed');
		expect(b.image!.failure).toMatch(/inside the repository/);
	});

	it('checks the element, the stage state and the prompt', () => {
		const store = atVision();
		expect(() => runImage(store, { stage: 'vision', element: 'turnaround-front', label: 'A', promptFile: prompt() }, who)).toThrow(/not a vision element/);
		expect(() => runImage(store, { stage: 'sheet', element: 'closeup', label: 'A', promptFile: prompt() }, who)).toThrow(/not open yet/);
		expect(() => runImage(store, { stage: 'vision', element: 'fur', label: 'A', promptFile: prompt('   ') }, who)).toThrow(/empty/);
		expect(() => runImage(store, { stage: 'tail', element: 'fur', label: 'A', promptFile: prompt() }, who)).toThrow(/vision or sheet/);
	});

	it('presents a set as a round, and counts regenerations per element', () => {
		const store = atVision();
		for (const l of ['A', 'B']) runImage(store, { stage: 'vision', element: 'palette', label: l, promptFile: prompt() }, who);
		expect(() => presentImages(store, { stage: 'vision' }, who)).toThrow(/needs --element/);
		const set = presentImages(store, { stage: 'vision', element: 'palette' }, who);
		expect(set.map((b) => b.status)).toEqual(['presented', 'presented']);
		expect(set.every((b) => b.image!.round === 1)).toBe(true);
		expect(status(store.load()).imageRounds).toEqual({ 'vision:palette': 1 });
		expect(() => presentImages(store, { stage: 'vision', element: 'palette' }, who)).toThrow(/no reported/);

		adjustElement(store, { element: 'palette', text: 'too orange' });
		runImage(store, { stage: 'vision', element: 'palette', label: 'C', promptFile: prompt() }, who);
		runImage(store, { stage: 'vision', element: 'fur', label: 'A', promptFile: prompt() }, who);
		presentImages(store, { stage: 'vision', element: 'palette' }, who);
		presentImages(store, { stage: 'vision', element: 'fur' }, who);
		expect(status(store.load()).imageRounds).toEqual({ 'vision:palette': 2, 'vision:fur': 1 });
	});

	it('shows presented images under Needs you without treating them as part reviews', () => {
		const store = atVision();
		runImage(store, { stage: 'vision', element: 'palette', label: 'A', promptFile: prompt() }, who);
		runImage(store, { stage: 'vision', element: 'palette', label: 'B', promptFile: prompt() }, who);
		presentImages(store, { stage: 'vision', element: 'palette' }, who);
		const needs = needsNick(store.load());
		expect(needs).toHaveLength(1);
		expect(needs[0]).toMatchObject({ kind: 'stage', stage: 'vision', thumb: expect.any(String) });
		expect(needs[0]!.ask).toMatch(/palette/);
		expect(status(store.load()).next).toMatch(/Waiting on Nick: pick one option each for palette/);
	});
});

describe('vision picks', () => {
	function twoOptions(store: Store, element = 'palette') {
		const a = runImage(store, { stage: 'vision', element, label: 'A: dawn gold', promptFile: prompt(), governs: ['fur range', 'face color'], notFor: ['shape'] }, who);
		const b = runImage(store, { stage: 'vision', element, label: 'B: ember', promptFile: prompt() }, who);
		presentImages(store, { stage: 'vision', element }, who);
		return { a, b };
	}

	it('creates a reference from the chosen image, sets the others aside and records a decision by Nick', () => {
		const store = atVision();
		const { a, b } = twoOptions(store);
		const r = pickImage(store, { build: a.alias, text: 'warm but not red' });
		expect(r.reference).toMatchObject({ role: 'palette', blob: a.outputs[0]!.blob, governs: ['fur range', 'face color'], mustNotBeUsedFor: ['shape'], precedence: 1, createdBy: 'nick' });
		expect(r.note).toMatchObject({ kind: 'decision', by: 'nick', via: 'studio', about: { stage: 'vision', element: 'palette', build: a.id } });
		expect(r.note.text).toBe('Picked A: dawn gold for palette over B: ember. warm but not red');
		const data = store.load();
		expect(data.builds.find((x) => x.id === a.id)!.status).toBe('reviewed');
		expect(data.builds.find((x) => x.id === b.id)!.status).toBe('superseded');
		const view = visionView(data).elements.find((e) => e.element === 'palette')!;
		expect(view.picked).toMatchObject({ alias: a.alias, reference: r.reference.alias });
		expect(view.options).toEqual([]);
		expect(() => pickImage(store, { build: b.alias })).toThrow(/not presented/);
		expect(verifyAll(root).errors).toEqual([]);
	});

	describe('undoing a pick', () => {
		const nick = { actor: 'nick' as const };
		it('removes the reference, brings the set back, keeps the pick note and records the undo', () => {
			const store = atVision();
			const { a, b } = twoOptions(store);
			const picked = pickImage(store, { build: a.alias });
			const r = unpickImage(store, { element: 'palette' }, nick);
			expect(r.note).toMatchObject({ kind: 'decision', by: 'nick', via: 'studio', text: 'Undid the pick of A: dawn gold for palette' });
			const data = store.load();
			expect(data.references.find((x) => x.id === picked.reference.id)).toBeUndefined();
			expect(data.builds.find((x) => x.id === a.id)!.status).toBe('presented');
			expect(data.builds.find((x) => x.id === b.id)!.status).toBe('presented');
			expect(data.notes.find((n) => n.id === picked.note.id)).toBeDefined();
			const view = visionView(data).elements.find((e) => e.element === 'palette')!;
			expect(view.picked).toBeUndefined();
			expect(view.options.map((o) => o.alias)).toEqual([a.alias, b.alias]);
			expect(verifyAll(root).errors).toEqual([]);
			// The set can be picked again.
			expect(pickImage(store, { build: b.alias }).reference.role).toBe('palette');
		});

		it('is refused for the orchestrator and when nothing is picked', () => {
			const store = atVision();
			const { a } = twoOptions(store);
			pickImage(store, { build: a.alias });
			expect(() => unpickImage(store, { element: 'palette' }, who)).toThrow(/only Nick/);
			expect(store.load().references).toHaveLength(1);
			expect(() => unpickImage(store, { element: 'fur' }, nick)).toThrow(/no pick to undo/);
		});

		it('reopens a vision stage that was waiting for review', () => {
			const store = atVision();
			const { a } = twoOptions(store);
			pickImage(store, { build: a.alias });
			submitStage(store, 'vision', who);
			expect(store.load().creature.stages.vision.status).toBe('in-review');
			unpickImage(store, { element: 'palette' }, nick);
			expect(store.load().creature.stages.vision.status).toBe('open');
		});

		it('is refused once the vision stage is approved', () => {
			const store = atVision();
			const { a } = twoOptions(store);
			pickImage(store, { build: a.alias });
			submitStage(store, 'vision', who);
			recordStageReview(store, { stage: 'vision', verdict: 'approve', text: '' });
			expect(() => unpickImage(store, { element: 'palette' }, nick)).toThrow(/approved/);
			expect(store.load().references).toHaveLength(1);
		});
	});

	it('stores the vision context and serves it in the vision view', () => {
		const store = atVision();
		const ctx = { palette: { description: ['golden fur'], silhouette: 'paler mask', note: 'gold is open' }, fur: { description: [] } };
		setVisionContext(store, ctx, who);
		expect(visionView(store.load()).context).toEqual(ctx);
		expect(() => setVisionContext(store, { palette: { description: [], extra: 1 } }, who)).toThrow();
		expect(() => setVisionContext(store, { nonsense: { description: [] } }, who)).toThrow(/not a vision element/);
		expect(visionView(store.load()).canUnpick).toBe(true);
	});

	it('refuses a second pick for an element that is already picked', () => {
		const store = atVision();
		const { a } = twoOptions(store);
		pickImage(store, { build: a.alias });
		const c = runImage(store, { stage: 'vision', element: 'palette', label: 'C', promptFile: prompt() }, who);
		presentImages(store, { stage: 'vision', element: 'palette' }, who);
		expect(() => pickImage(store, { build: c.alias })).toThrow(/already picked/);
	});

	it('falls back to governing the element itself when the orchestrator gave no governs list', () => {
		const store = atVision();
		const { b } = twoOptions(store);
		expect(pickImage(store, { build: b.alias }).reference.governs).toEqual(['palette']);
	});

	it('records a rejected set as an adjust note about the element and sets the set aside', () => {
		const store = atVision();
		twoOptions(store, 'eyes');
		const note = adjustElement(store, { element: 'eyes', text: 'both too large' });
		expect(note).toMatchObject({ kind: 'review', verdict: 'adjust', by: 'nick', about: { stage: 'vision', element: 'eyes' } });
		const view = visionView(store.load()).elements.find((e) => e.element === 'eyes')!;
		expect(view.options).toEqual([]);
		expect(view.rounds).toBe(1);
		expect(view.adjust?.text).toBe('both too large');
		expect(() => adjustElement(store, { element: 'eyes', text: 'x' })).toThrow(/no options are waiting/);
		expect(() => adjustElement(store, { element: 'eyes', text: ' ' })).toThrow(/say what is wrong/);
		// An element note is not the stage verdict: the stage was never submitted.
		expect(store.load().creature.stages.vision.status).toBe('open');
	});

	it('submits and approves the vision stage with the picks, and opens the sheet', () => {
		const store = atVision();
		const { a } = twoOptions(store);
		pickImage(store, { build: a.alias });
		submitStage(store, 'vision', who);
		recordStageReview(store, { stage: 'vision', verdict: 'approve', text: '' });
		const c = store.load().creature;
		expect(c.stages.vision.status).toBe('approved');
		expect(c.stages.sheet.status).toBe('open');
	});
});

describe('the references stage is now vision', () => {
	it('names the stage vision and reads a creature written with the old name', () => {
		const store = atVision();
		const file = join(store.dir, 'creature.json');
		const raw = JSON.parse(readFileSync(file, 'utf8'));
		raw.stages.references = raw.stages.vision;
		delete raw.stages.vision;
		delete raw.stages.sheet;
		writeFileSync(file, JSON.stringify(raw));
		const c = store.load().creature;
		expect(c.stages.vision.status).toBe('open');
		expect(c.stages.sheet.status).toBe('locked');
		expect(Object.keys(c.stages)).not.toContain('references');
	});

	it('keeps the references submit rules on vision', () => {
		const store = atVision();
		expect(() => submitStage(store, 'vision', who)).toThrow(/no references/);
	});
});

describe('the model sheet', () => {
	const TURNS = ['turnaround-front', 'turnaround-threequarter', 'turnaround-side', 'turnaround-back'];

	function atSheet(): Store {
		const store = atVision();
		const a = runImage(store, { stage: 'vision', element: 'palette', label: 'A', promptFile: prompt() }, who);
		presentImages(store, { stage: 'vision', element: 'palette' }, who);
		pickImage(store, { build: a.alias });
		submitStage(store, 'vision', who);
		recordStageReview(store, { stage: 'vision', verdict: 'approve', text: '' });
		return store;
	}

	const note = (store: Store, text: string, over: Record<string, unknown> = {}) =>
		store.create('note', { kind: 'decision', by: 'orchestrator', about: { stage: 'sheet' }, text, ...over } as never, 'orchestrator', { session: 's' });

	it('stays locked until vision is approved', () => {
		const store = atVision();
		expect(() => submitStage(store, 'sheet', who)).toThrow(/locked/);
	});

	it('needs vision approved, the four turnarounds, a bare-body image and the consistency note', () => {
		const s = atSheet();
		expect(() => submitStage(s, 'sheet', who)).toThrow(/no front turnaround[\s\S]*no bare-body image[\s\S]*consistency note/);
		for (const e of TURNS.slice(0, 3)) runImage(s, { stage: 'sheet', element: e, label: e, promptFile: prompt() }, who);
		runImage(s, { stage: 'sheet', element: 'bare-front', label: 'bare', promptFile: prompt() }, who);
		// Reported is not enough: Nick has not been shown them.
		expect(() => submitStage(s, 'sheet', who)).toThrow(/no front turnaround/);
		presentImages(s, { stage: 'sheet' }, who);
		expect(() => submitStage(s, 'sheet', who)).toThrow(/no back turnaround/);
		runImage(s, { stage: 'sheet', element: 'turnaround-back', label: 'back', promptFile: prompt() }, who);
		presentImages(s, { stage: 'sheet' }, who);
		expect(() => submitStage(s, 'sheet', who)).toThrow(/consistency note/);
		note(s, 'The views agree.');
		expect(() => submitStage(s, 'sheet', who)).toThrow(/consistency note/);
		note(s, 'Consistency check: horn and ears match in all four views.', { by: 'nick', via: 'studio' });
		expect(() => submitStage(s, 'sheet', who)).toThrow(/consistency note/);
		note(s, 'Consistency check: horn and ears match in all four views.');
		submitStage(s, 'sheet', who);
		expect(s.load().creature.stages.sheet.status).toBe('in-review');
		recordStageReview(s, { stage: 'sheet', verdict: 'approve', text: 'good' });
		const c = s.load().creature;
		expect(c.stages.sheet).toMatchObject({ status: 'approved' });
		expect(c.stages.sheet.evidence!.length).toBeGreaterThanOrEqual(6);
		expect(c.stages.blockout.status).toBe('open');
		const view = sheetView(s.load());
		expect(view.images).toHaveLength(5);
		expect(view.consistency?.text).toMatch(/^Consistency check:/);
		expect(view.rounds).toBe(2);
	});

	it('reopens a submitted sheet when new images are presented, and turns marks into stage defects', () => {
		const s = atSheet();
		for (const e of [...TURNS, 'bare-side']) runImage(s, { stage: 'sheet', element: e, label: e, promptFile: prompt() }, who);
		presentImages(s, { stage: 'sheet' }, who);
		note(s, 'Consistency check: fine.');
		submitStage(s, 'sheet', who);
		const extra = runImage(s, { stage: 'sheet', element: 'closeup', label: 'eye', promptFile: prompt() }, who);
		presentImages(s, { stage: 'sheet' }, who);
		expect(s.load().creature.stages.sheet.status).toBe('open');
		const front = s.load().builds.find((b) => b.image?.element === 'turnaround-front')!;
		const defects = markSheetImage(s, { build: front.alias, marks: [{ camera: 'sheet', shape: 'ellipse', x: 0.1, y: 0.2, w: 0.2, h: 0.2, description: 'horn is not a spiral' }] });
		expect(defects[0]).toMatchObject({ stage: 'sheet', origin: 'nick', status: 'open', region: { buildId: front.id } });
		expect(defects[0]!.part).toBeUndefined();
		expect(status(s.load()).stageDefects).toEqual([expect.objectContaining({ stage: 'sheet', description: 'horn is not a spiral' })]);
		expect(sheetView(s.load()).marks).toEqual([expect.objectContaining({ build: front.alias, description: 'horn is not a spiral' })]);
		expect(() => markSheetImage(s, { build: front.alias, marks: [] })).toThrow(/no marks/);
		expect(() => markSheetImage(s, { build: extra.alias, marks: [{ camera: 'sheet', shape: 'rect', x: 2, y: 0, w: 0.1, h: 0.1, description: 'x' }] })).toThrow(/0 to 1/);
		expect(verifyAll(root).errors).toEqual([]);
	});
});

describe('the image cli', () => {
	it('runs, presents and reports status with the round counts', () => {
		const store = atVision();
		const out: string[] = [];
		const io = { out: (l: string) => out.push(l) };
		const base = ['--root', root, '--session', 's'];
		const file = prompt();
		const input = join(scratch, 'in.png');
		writeFileSync(input, 'in');
		expect(run(['image', 'run', 'fx-bird', '--stage', 'vision', '--element', 'palette', '--label', 'A: gold', '--prompt-file', file, '--input', input, '--governs', 'fur,face', '--not-for', 'shape', ...base], io)).toBe(0);
		expect(out.join('\n')).toMatch(/reported \(A: gold, .* 12345 Codex tokens\)/);
		expect(run(['image', 'present', 'fx-bird', '--stage', 'vision', '--element', 'palette', ...base], io)).toBe(0);
		expect(out.join('\n')).toMatch(/round 1/);
		const built = store.load().builds[0]!;
		expect(built.image).toMatchObject({ governs: ['fur', 'face'], notFor: ['shape'] });
		out.length = 0;
		expect(run(['status', 'fx-bird', ...base], io)).toBe(0);
		expect(out.join('\n')).toMatch(/Image option sets presented\s+vision:palette: 1/);
	});

	it('exits nonzero when Codex fails and still records the failed build', () => {
		const store = atVision();
		process.env.FAKE_CODEX_MODE = 'fail';
		const err = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(run(['image', 'run', 'fx-bird', '--stage', 'vision', '--element', 'fur', '--label', 'A', '--prompt-file', prompt(), '--root', root, '--session', 's'], { out: () => {} })).toBe(1);
		expect(err.mock.calls[0]![0]).toMatch(/failed/);
		err.mockRestore();
		expect(store.load().builds[0]!.status).toBe('failed');
	});
});

