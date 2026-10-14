import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run } from '../cli.ts';
import { partView, planBuild } from '../engine.ts';
import { BuildSchema } from '../schema.ts';
import { firstJudge, visionView } from '../stages.ts';
import { initCreature, type Store } from '../store.ts';

const who = { actor: 'orchestrator' as const, session: 's' };
const saved = process.env.XALIANS_STUDIO_STORE;
let root: string;
let scratch: string;
let store: Store;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'studio-compare-'));
	scratch = mkdtempSync(join(tmpdir(), 'studio-compare-src-'));
	process.env.XALIANS_STUDIO_STORE = mkdtempSync(join(tmpdir(), 'studio-compare-blobs-'));
	store = initCreature(root, { key: 'fx', name: 'Fx', speciesTemplate: 't.json', silhouette: 's.svg' });
	store.acquireLock('s');
	store.create('part', { key: 'face', name: 'Face', includes: [], why: 'w', scope: {}, dependsOn: [], order: 1, status: 'not-started', budget: { builds: 6, wallMinutes: 100 } }, 'orchestrator', who);
});
afterEach(() => {
	if (saved === undefined) delete process.env.XALIANS_STUDIO_STORE;
	else process.env.XALIANS_STUDIO_STORE = saved;
});

const file = (name: string, body: string) => {
	const f = join(scratch, name);
	writeFileSync(f, body);
	return f;
};
const cli = (...a: string[]) => {
	const out: string[] = [];
	const code = run([...a, '--root', root, '--session', 's'], { out: (l) => out.push(l) });
	return { code, out: out.join('\n') };
};
function preview(): string {
	const data = store.load();
	const planned = planBuild(data, { part: 'face', kind: 'preview', goal: 'option', method: 'm' });
	return store.create('build', { ...planned, status: 'presented' } as never, 'orchestrator', who).alias;
}

describe('compare references (X24)', () => {
	it('stores a labeled reference and an overlay per camera, replacing a repeat', () => {
		const a = preview();
		expect(cli('build', 'reference', 'fx', a, '--camera', 'front', '--file', file('ref.png', 'r1'), '--label', 'sheet face', '--overlay', file('ov.png', 'o1')).code).toBe(0);
		expect(cli('build', 'reference', 'fx', a, '--camera', 'front', '--file', file('ref2.png', 'r2'), '--label', 'sheet face v2').code).toBe(0);
		const b = store.load().builds.find((x) => x.alias === a)!;
		expect(b.compare).toHaveLength(1);
		expect(b.compare![0]).toMatchObject({ camera: 'front', label: 'sheet face v2' });
		expect(b.outputs.filter((o) => o.role === 'overlay' && o.camera === 'front')).toHaveLength(1);
		expect(BuildSchema.safeParse(b).success).toBe(true);
		const view = partView(store.load(), 'face').builds[0]!;
		expect(view.compare).toEqual(b.compare);
		expect(view.cameras.front?.some((o) => o.role === 'overlay')).toBe(true);
	});

	it('needs a label with a file, and something to store', () => {
		const a = preview();
		expect(cli('build', 'reference', 'fx', a, '--camera', 'front', '--file', file('r.png', 'x')).code).toBe(1);
		expect(cli('build', 'reference', 'fx', a, '--camera', 'front').code).toBe(1);
	});

	it('leaves builds without a reference as they were', () => {
		preview();
		const view = partView(store.load(), 'face').builds[0]!;
		expect(view.compare).toBeUndefined();
		expect(view.judge).toBeUndefined();
	});
});

describe('judge checks (X25)', () => {
	it('sets numbered checks from a JSON array and shows them in the view', () => {
		const a = preview();
		expect(cli('build', 'judge', 'fx', a, '--file', file('checks.json', JSON.stringify(['Are the eyes set wide?', 'Is the brow heavy?']))).code).toBe(0);
		expect(partView(store.load(), 'face').builds[0]!.judge).toEqual(['Are the eyes set wide?', 'Is the brow heavy?']);
	});

	it('refuses anything but a non-empty array of strings', () => {
		const a = preview();
		expect(cli('build', 'judge', 'fx', a, '--file', file('bad.json', '{"a":1}')).code).toBe(1);
		expect(cli('build', 'judge', 'fx', a, '--file', file('empty.json', '[]')).code).toBe(1);
		expect(cli('build', 'judge', 'fx', a, '--file', file('num.json', '[1]')).code).toBe(1);
	});

	it('takes the first option that has checks', () => {
		expect(firstJudge([{}, { judge: ['one'] }, { judge: ['two'] }])).toEqual(['one']);
		expect(firstJudge([{}, { judge: [] }])).toBeUndefined();
	});

	it('reaches an image set on the vision board', () => {
		const mk = (judge?: string[]) =>
			store.create('build', {
				kind: 'image',
				image: { stage: 'vision', element: 'eyes', label: 'A', prompt: 'p', promptSha256: 'a'.repeat(64), inputs: [], tool: 'codex image_gen', generatedPath: '', codexTokens: null, model: null },
				goal: { text: 'g' }, targets: [], method: 'image', outputs: [], checks: [], lookNotes: [], cost: {}, status: 'presented', ...(judge ? { judge } : {}),
			} as never, 'orchestrator', who);
		mk();
		const second = mk();
		expect(cli('build', 'judge', 'fx', second.alias, '--file', file('j.json', '["Is the iris warm?"]')).code).toBe(0);
		const el = visionView(store.load()).elements.find((e) => e.element === 'eyes')!;
		expect(el.judge).toEqual(['Is the iris warm?']);
		expect(el.options[1]!.judge).toEqual(['Is the iris warm?']);
	});
});

describe('build retire', () => {
	it('takes a presented option off the page and records the reason as a decision note', () => {
		const a = preview();
		expect(cli('build', 'retire', 'fx', a).code).toBe(1);                       // a reason is required
		expect(cli('build', 'retire', 'fx', a, '--reason', 'replaced by the fitted set').code).toBe(0);
		const data = store.load();
		const b = data.builds.find((x) => x.alias === a)!;
		expect(b.status).toBe('superseded');
		const note = data.notes.find((n) => n.about?.build === b.id)!;
		expect(note).toMatchObject({ kind: 'decision', by: 'orchestrator' });
		expect(note.text).toContain('replaced by the fitted set');
		expect(cli('build', 'retire', 'fx', a, '--reason', 'again').code).toBe(1);  // already retired
	});
});

describe('build choose-from-chat', () => {
	it('records Nick\'s pick from chat with his words, like the page does', () => {
		const a = preview(); const b = preview(); const c = preview();
		expect(cli('build', 'choose-from-chat', 'fx', '--builds', `${a},${b},${c}`, '--chosen', a).code).toBe(1); // a quote is required
		expect(cli('build', 'choose-from-chat', 'fx', '--builds', `${a},${b},${c}`, '--chosen', a, '--quote', 'Option one seems to align best').code).toBe(0);
		const data = store.load();
		const by = (x: string) => data.builds.find((k) => k.alias === x)!.status;
		expect([by(a), by(b), by(c)]).toEqual(['reviewed', 'superseded', 'superseded']);
		const note = data.notes.find((n) => n.kind === 'decision' && n.by === 'nick')!;
		expect(note).toMatchObject({ via: 'chat', quote: 'Option one seems to align best' });
	});
});
