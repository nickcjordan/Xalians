// @vitest-environment node
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStudioApi, studioMiddleware, contentTypeFor, loadLibrary } from '../../../studio/api.js';
import { studioPlugin } from '../../../studio/plugin.js';

const POST = { 'x-studio-request': '1' };

let root;
let blobs;
let api;
let lib;
let ids;
const savedEnv = process.env.XALIANS_STUDIO_STORE;

function image(name, body) {
	const dir = mkdtempSync(join(tmpdir(), 'studio-img-'));
	const file = join(dir, name);
	writeFileSync(file, body);
	return lib.putFile(file);
}

beforeEach(async () => {
	root = mkdtempSync(join(tmpdir(), 'studio-api-'));
	blobs = mkdtempSync(join(tmpdir(), 'studio-api-blobs-'));
	process.env.XALIANS_STUDIO_STORE = blobs;
	lib = await loadLibrary();
	api = createStudioApi({ repoRoot: root });

	const store = lib.initCreature(root, { key: 'fx', name: 'Fixture', speciesTemplate: 't.json', silhouette: 's.svg' });
	store.acquireLock('t');
	const s = { session: 't' };
	const part = store.create('part', { key: 'skull', name: 'Skull', includes: [], why: 'w', scope: {}, dependsOn: [], order: 1, status: 'in-progress', budget: { builds: 6, wallMinutes: 100 } }, 'orchestrator', s);
	const hold = store.create('hold', { statement: 'keep the mouth', scope: { part: part.id }, source: { kind: 'nick', quote: 'mouth looks good', date: '2026-10-10' }, status: 'active', history: [] }, 'orchestrator', s);
	const front = image('front.png', 'front-bytes');
	const build = store.create('build', { part: part.id, kind: 'build', goal: { text: 'raise the brow' }, targets: [], method: 'm', outputs: [{ name: 'front.png', blob: front, role: 'render', camera: 'front' }], checks: [], lookNotes: [], cost: { wallMinutes: 3 }, status: 'presented' }, 'orchestrator', s);
	const jaw = store.create('part', { key: 'jaw', name: 'Jaw', includes: [], why: 'w', scope: {}, dependsOn: [], order: 2, status: 'in-progress', budget: { builds: 6, wallMinutes: 100 } }, 'orchestrator', s);
	const mkPreview = (n) => store.create('build', { part: jaw.id, kind: 'preview', goal: { text: `option ${n}` }, targets: [], method: `m${n}`, outputs: [], checks: [], lookNotes: [], cost: {}, status: 'presented' }, 'orchestrator', s);
	const pa = mkPreview('a');
	const pb = mkPreview('b');
	store.releaseLock();
	ids = { part, hold, build, front, pa, pb };
});

afterEach(() => {
	if (savedEnv === undefined) delete process.env.XALIANS_STUDIO_STORE;
	else process.env.XALIANS_STUDIO_STORE = savedEnv;
});

describe('reads', () => {
	it('lists creatures with counts', async () => {
		const r = await api.route('GET', 'creatures');
		expect(r.status).toBe(200);
		expect(r.json).toEqual([expect.objectContaining({ key: 'fx', name: 'Fixture', parts: 2, needs: 3 })]);
	});

	it('lists what needs Nick', async () => {
		const r = await api.route('GET', 'creatures/fx/needs');
		expect(r.json.map((i) => i.kind)).toEqual(['review', 'review', 'review']);
		expect(r.json.find((i) => i.ref === ids.build.alias).thumb).toBe(ids.front);
	});

	it('lists parts with names and open defects', async () => {
		const r = await api.route('GET', 'creatures/fx/parts');
		expect(r.json.map((p) => [p.key, p.name])).toEqual([['skull', 'Skull'], ['jaw', 'Jaw']]);
	});

	it('returns the part view by key or alias', async () => {
		const byKey = await api.route('GET', 'creatures/fx/parts/skull');
		expect(byKey.status).toBe(200);
		expect(byKey.json.holds[0].sourceText).toBe('You, Oct 10: "mouth looks good"');
		expect(byKey.json.builds[0].cameras.front[0].blob).toBe(ids.front);
		const byAlias = await api.route('GET', `creatures/fx/parts/${ids.part.alias}`);
		expect(byAlias.json.part.id).toBe(ids.part.id);
	});

	it('404s on an unknown creature, part or route', async () => {
		expect((await api.route('GET', 'creatures/nope/needs')).status).toBe(404);
		expect((await api.route('GET', 'creatures/fx/parts/nope')).status).toBe(404);
		expect((await api.route('GET', 'elsewhere')).status).toBe(404);
	});
});

describe('blobs', () => {
	it('streams a stored blob with a content type from the output name', async () => {
		const r = await api.route('GET', `blob/${ids.front}`);
		expect(r.status).toBe(200);
		expect(r.contentType).toBe('image/png');
		expect(readFileSync(r.file, 'utf8')).toBe('front-bytes');
	});

	it('404s on a missing blob and 400s on a bad hash', async () => {
		expect((await api.route('GET', `blob/${'0'.repeat(64)}`)).status).toBe(404);
		expect((await api.route('GET', 'blob/../../secret')).status).toBe(404);
		expect((await api.route('GET', 'blob/zzz')).status).toBe(400);
	});

	it('maps extensions to types and defaults to png', () => {
		expect(contentTypeFor('a.JPG')).toBe('image/jpeg');
		expect(contentTypeFor('a.webp')).toBe('image/webp');
		expect(contentTypeFor('front')).toBe('image/png');
		expect(contentTypeFor(undefined)).toBe('image/png');
	});
});

describe('writes', () => {
	it('refuses a POST without the studio header', async () => {
		const r = await api.route('POST', 'creatures/fx/review', { body: { build: ids.build.alias, verdict: 'adjust', text: '' }, headers: {} });
		expect(r.status).toBe(403);
	});

	it('records a review, makes a defect per mark, and applies it', async () => {
		const r = await api.route('POST', 'creatures/fx/review', {
			headers: POST,
			body: {
				build: ids.build.alias,
				verdict: 'adjust',
				text: 'brow still flat',
				holdsStruck: [ids.hold.alias],
				marks: [{ camera: 'front', shape: 'rect', x: 0.1, y: 0.2, w: 0.3, h: 0.1, description: 'flat brow' }],
			},
		});
		expect(r.status).toBe(200);
		expect(r.json.defects).toHaveLength(1);
		expect(r.json.note).toMatchObject({ kind: 'review', by: 'nick', via: 'studio', verdict: 'adjust' });
		const view = (await api.route('GET', 'creatures/fx/parts/skull')).json;
		expect(view.defects[0]).toMatchObject({ description: 'flat brow', origin: 'nick', status: 'open' });
		expect(view.holds).toHaveLength(0);
		expect(view.builds[0].status).toBe('reviewed');
		expect(view.notes.some((n) => n.kind === 'review')).toBe(true);
		const needs = (await api.route('GET', 'creatures/fx/needs')).json;
		expect(needs.find((i) => i.ref === ids.build.alias)).toBeUndefined();
	});

	it('approves a build, and refuses to approve a preview', async () => {
		const bad = await api.route('POST', 'creatures/fx/review', { headers: POST, body: { build: ids.pa.alias, verdict: 'approve', text: '' } });
		expect(bad.status).toBe(409);
		expect(bad.json.error).toMatch(/preview/);
		const ok = await api.route('POST', 'creatures/fx/review', { headers: POST, body: { build: ids.build.alias, verdict: 'approve', text: 'good' } });
		expect(ok.status).toBe(200);
		expect((await api.route('GET', 'creatures/fx/parts/skull')).json.part.status).toBe('approved');
	});

	it('rejects a malformed mark with 409 and writes nothing', async () => {
		const r = await api.route('POST', 'creatures/fx/review', { headers: POST, body: { build: ids.build.alias, verdict: 'reject', text: '', marks: [{ camera: 'front', shape: 'blob', x: 0, y: 0, w: 0, h: 0, description: 'x' }] } });
		expect(r.status).toBe(409);
		expect((await api.route('GET', 'creatures/fx/parts/skull')).json.defects).toHaveLength(0);
	});

	it('strikes a hold as Nick with a reason', async () => {
		const none = await api.route('POST', `creatures/fx/holds/${ids.hold.alias}/strike`, { headers: POST, body: { reason: '' } });
		expect(none.status).toBe(409);
		const r = await api.route('POST', `creatures/fx/holds/${ids.hold.alias}/strike`, { headers: POST, body: { reason: 'not needed now' } });
		expect(r.status).toBe(200);
		expect(r.json.hold.status).toBe('struck');
		expect(r.json.hold.history.at(-1)).toMatchObject({ by: 'nick', reason: 'not needed now' });
	});

	it('records a choice among previews as a decision note', async () => {
		const r = await api.route('POST', 'creatures/fx/choose', { headers: POST, body: { builds: [ids.pa.alias, ids.pb.alias], chosen: ids.pb.alias, text: 'rounder' } });
		expect(r.status).toBe(200);
		expect(r.json.note).toMatchObject({ kind: 'decision', by: 'nick', via: 'studio' });
		const needs = (await api.route('GET', 'creatures/fx/needs')).json;
		expect(needs.filter((i) => i.partKey === 'jaw')).toHaveLength(0);
	});
});

describe('middleware', () => {
	function call(method, url, bodyText, headers = {}) {
		return new Promise((resolve) => {
			const req = Readable.from(bodyText ? [Buffer.from(bodyText)] : []);
			req.method = method;
			req.url = url;
			req.headers = headers;
			const res = {
				statusCode: 0,
				headers: {},
				setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
				end(text) { resolve({ status: this.statusCode, headers: this.headers, body: text }); },
			};
			studioMiddleware(api)(req, res, () => resolve({ passedThrough: true }));
		});
	}

	it('passes through anything outside /__studio/api/', async () => {
		expect((await call('GET', '/studio/fx/skull')).passedThrough).toBe(true);
	});

	it('serves JSON under the prefix, with no caching', async () => {
		const r = await call('GET', '/__studio/api/creatures/fx/needs?x=1');
		expect(r.status).toBe(200);
		expect(r.headers['content-type']).toBe('application/json');
		expect(r.headers['cache-control']).toBe('no-store');
		expect(JSON.parse(r.body)).toHaveLength(3);
	});

	it('parses a POST body and rejects bad JSON', async () => {
		const ok = await call('POST', '/__studio/api/creatures/fx/review', JSON.stringify({ build: ids.build.alias, verdict: 'adjust', text: 'x' }), POST);
		expect(ok.status).toBe(200);
		const bad = await call('POST', '/__studio/api/creatures/fx/review', '{nope', POST);
		expect(bad.status).toBe(400);
	});
});

describe('production exclusion', () => {
	it('the plugin applies to the dev server only, so vite build never loads it', () => {
		expect(studioPlugin({ repoRoot: root }).apply).toBe('serve');
	});

	it('vite.config.js registers the plugin, and App.js gates the route on DEV', () => {
		const config = readFileSync(new URL('../../../vite.config.js', import.meta.url), 'utf8');
		expect(config).toMatch(/studioPlugin\(/);
		const app = readFileSync(new URL('../../App.js', import.meta.url), 'utf8');
		expect(app).toMatch(/const includeStudio = import\.meta\.env\.DEV\b/);
		expect(app).toMatch(/includeStudio\s*\?\s*lazy\(\(\) => import\('\.\/pages\/studioPage'\)\)/);
		expect(app).toMatch(/StudioPage && <Route path="\/studio"/);
	});
});

describe('stages', () => {
	const who = { actor: 'orchestrator', session: 's' };

	async function intakeFixture() {
		writeFileSync(join(root, 'tpl.json'), '{}');
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><path d="M0 0h4v4z"/></svg>';
		const dir = mkdtempSync(join(tmpdir(), 'studio-stage-'));
		const svgFile = join(dir, 'bird.svg');
		writeFileSync(svgFile, svg);
		const store = lib.initCreature(root, { key: 'sx', name: 'Stage fixture', speciesTemplate: 'tpl.json', silhouette: 'bird.svg' });
		store.acquireLock('s');
		const blob = lib.putFile(svgFile);
		store.update(store.load().creature.id, (c) => {
			c.intake = { speciesTemplate: 'tpl.json', templateSha256: 'a'.repeat(64), name: 'Birdy', element: 'fire', homeWorld: 'magmuth', bodyPlan: 'biped', covering: 'feathers', sizeCm: [88, 112], loreSummary: 'A runner.', appearance: ['two legs'], anatomy: ['jaws'], silhouette: { blob, fileName: 'bird.svg' } };
		}, who);
		lib.proposeParts(store, [
			{ key: 'torso', name: 'Torso', includes: ['ribcage'], why: 'base', dependsOn: [], order: 1 },
			{ key: 'neck', name: 'Neck', includes: ['neck'], why: 'link', dependsOn: ['torso'], order: 2 },
		], who);
		return { store, blob };
	}

	it('returns the creature board with stages, intake, parts and needs', async () => {
		const { store, blob } = await intakeFixture();
		lib.submitStage(store, 'intake', who);
		const r = await api.route('GET', 'creatures/sx');
		expect(r.status).toBe(200);
		expect(r.json.stages).toHaveLength(12);
		expect(r.json.stages.find((s) => s.id === 'intake').status).toBe('in-review');
		expect(r.json.intake.silhouette.blob).toBe(blob);
		expect(r.json.parts.map((p) => [p.key, p.status, p.dependsOn.map((d) => d.name)])).toEqual([['torso', 'proposed', []], ['neck', 'proposed', ['Torso']]]);
		expect(r.json.needs).toEqual([expect.objectContaining({ kind: 'stage', stage: 'intake' })]);
	});

	it('serves an SVG silhouette as image/svg+xml', async () => {
		const { blob } = await intakeFixture();
		const r = await api.route('GET', `blob/${blob}`);
		expect(r.contentType).toBe('image/svg+xml');
	});

	it('lists references by precedence and serves them with their file type', async () => {
		const { store } = await intakeFixture();
		const dir = mkdtempSync(join(tmpdir(), 'studio-ref-'));
		writeFileSync(join(dir, 'a.webp'), 'webp-bytes');
		writeFileSync(join(dir, 'b.png'), 'png-bytes');
		lib.addReference(store, { file: join(dir, 'a.webp'), role: 'late', governs: ['x'], mustNotBeUsedFor: [], precedence: 2 }, who);
		const first = lib.addReference(store, { file: join(dir, 'b.png'), role: 'early', governs: ['y'], mustNotBeUsedFor: ['color'], precedence: 1 }, who);
		const r = await api.route('GET', 'creatures/sx/references');
		expect(r.json.map((x) => x.role)).toEqual(['early', 'late']);
		expect(r.json[0].mustNotBeUsedFor).toEqual(['color']);
		expect((await api.route('GET', `blob/${r.json[1].blob}`)).contentType).toBe('image/webp');
		expect(first.alias).toMatch(/^R-/);
	});

	it('records a stage verdict as Nick with the header, and refuses it without', async () => {
		const { store } = await intakeFixture();
		lib.submitStage(store, 'intake', who);
		expect((await api.route('POST', 'creatures/sx/stage-review', { body: { stage: 'intake', verdict: 'approve', text: '' } })).status).toBe(403);
		store.releaseLock();
		const r = await api.route('POST', 'creatures/sx/stage-review', { body: { stage: 'intake', verdict: 'approve', text: 'good' }, headers: POST });
		expect(r.status).toBe(200);
		expect(r.json.note).toMatchObject({ by: 'nick', via: 'studio', verdict: 'approve' });
		const board = await api.route('GET', 'creatures/sx');
		expect(board.json.stages.find((s) => s.id === 'intake').status).toBe('approved');
		expect(board.json.stages.find((s) => s.id === 'vision').status).toBe('open');
		expect(board.json.parts.every((p) => p.status === 'not-started')).toBe(true);
		const again = await api.route('POST', 'creatures/sx/stage-review', { body: { stage: 'intake', verdict: 'approve', text: '' }, headers: POST });
		expect(again.status).toBe(409);
	});

	describe('vision and sheet images', () => {
		const FAKE = fileURLToPath(new URL('../../../../../packages/studio/src/__tests__/fixtures/fake-codex.cjs', import.meta.url));
		const savedBin = process.env.STUDIO_CODEX_BIN;
		afterEach(() => {
			if (savedBin === undefined) delete process.env.STUDIO_CODEX_BIN;
			else process.env.STUDIO_CODEX_BIN = savedBin;
		});

		function prompt() {
			const file = join(mkdtempSync(join(tmpdir(), 'studio-prompt-')), 'p.txt');
			writeFileSync(file, 'A swatch.');
			return file;
		}

		async function atVision() {
			process.env.STUDIO_CODEX_BIN = FAKE;
			const { store } = await intakeFixture();
			lib.submitStage(store, 'intake', who);
			lib.recordStageReview(store, { stage: 'intake', verdict: 'approve', text: '' });
			return store;
		}

		it('lists option sets, picks one as Nick and returns the picked reference', async () => {
			const store = await atVision();
			const a = lib.runImage(store, { stage: 'vision', element: 'palette', label: 'A: dawn gold', promptFile: prompt(), governs: ['fur color'] }, who);
			lib.runImage(store, { stage: 'vision', element: 'palette', label: 'B: ember', promptFile: prompt() }, who);
			lib.presentImages(store, { stage: 'vision', element: 'palette' }, who);
			store.releaseLock();
			const needs = await api.route('GET', 'creatures/sx/needs');
			expect(needs.json).toEqual([expect.objectContaining({ kind: 'stage', stage: 'vision' })]);
			const view = await api.route('GET', 'creatures/sx/vision');
			const palette = view.json.elements[0];
			expect(palette).toMatchObject({ element: 'palette', rounds: 1 });
			expect(palette.options.map((o) => o.label)).toEqual(['A: dawn gold', 'B: ember']);
			expect((await api.route('GET', `blob/${palette.options[0].blob}`)).contentType).toBe('image/png');

			expect((await api.route('POST', 'creatures/sx/pick', { body: { build: a.alias } })).status).toBe(403);
			const r = await api.route('POST', 'creatures/sx/pick', { body: { build: a.alias, text: 'warm' }, headers: POST });
			expect(r.status).toBe(200);
			expect(r.json.reference).toMatchObject({ role: 'palette', governs: ['fur color'] });
			expect(r.json.note).toMatchObject({ kind: 'decision', by: 'nick', via: 'studio' });
			const after = await api.route('GET', 'creatures/sx/vision');
			expect(after.json.elements[0].picked.alias).toBe(a.alias);
			expect((await api.route('POST', 'creatures/sx/pick', { body: { build: a.alias }, headers: POST })).status).toBe(409);
		});

		it('records none of these for an element', async () => {
			const store = await atVision();
			lib.runImage(store, { stage: 'vision', element: 'fur', label: 'A', promptFile: prompt() }, who);
			lib.presentImages(store, { stage: 'vision', element: 'fur' }, who);
			store.releaseLock();
			const bad = await api.route('POST', 'creatures/sx/element-adjust', { body: { element: 'fur', text: '' }, headers: POST });
			expect(bad.status).toBe(409);
			const r = await api.route('POST', 'creatures/sx/element-adjust', { body: { element: 'fur', text: 'too smooth' }, headers: POST });
			expect(r.status).toBe(200);
			expect(r.json.note).toMatchObject({ verdict: 'adjust', about: { stage: 'vision', element: 'fur' } });
			const view = await api.route('GET', 'creatures/sx/vision');
			expect(view.json.elements[0].adjust.text).toBe('too smooth');
		});

		it('serves the sheet and turns marks into defects about the sheet', async () => {
			const store = await atVision();
			const a = lib.runImage(store, { stage: 'vision', element: 'palette', label: 'A', promptFile: prompt() }, who);
			lib.presentImages(store, { stage: 'vision', element: 'palette' }, who);
			lib.pickImage(store, { build: a.alias });
			lib.submitStage(store, 'vision', who);
			lib.recordStageReview(store, { stage: 'vision', verdict: 'approve', text: '' });
			const front = lib.runImage(store, { stage: 'sheet', element: 'turnaround-front', label: 'front', promptFile: prompt() }, who);
			lib.presentImages(store, { stage: 'sheet' }, who);
			store.releaseLock();
			const view = await api.route('GET', 'creatures/sx/sheet');
			expect(view.json.images.map((i) => i.element)).toEqual(['turnaround-front']);
			const mark = { camera: 'sheet', shape: 'rect', x: 0.1, y: 0.1, w: 0.3, h: 0.3, description: 'horn missing' };
			expect((await api.route('POST', 'creatures/sx/sheet-marks', { body: { build: front.alias, marks: [mark] } })).status).toBe(403);
			const r = await api.route('POST', 'creatures/sx/sheet-marks', { body: { build: front.alias, marks: [mark] }, headers: POST });
			expect(r.status).toBe(200);
			expect(r.json.defects[0]).toMatchObject({ stage: 'sheet', origin: 'nick' });
			const after = await api.route('GET', 'creatures/sx/sheet');
			expect(after.json.marks).toEqual([expect.objectContaining({ description: 'horn missing', build: front.alias })]);
			expect((await api.route('POST', 'creatures/sx/sheet-marks', { body: { build: front.alias, marks: 'x' }, headers: POST })).status).toBe(400);
		});
	});
});
