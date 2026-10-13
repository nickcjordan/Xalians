#!/usr/bin/env node
// Seeds a throwaway creature at the blockout stage for exercising the blockout review screen.
//
//   node apps/web/scripts/studio-fixture-blockout.mjs [--force]
//
// Creates art/creatures/fixture-blockout/ (gitignored) through the studio library: intake, vision and
// sheet approved with three bare-body sheet images, one earlier blockout build, one current blockout
// build with the eight standard renders, front, side and back overlays and fit numbers, a report, an
// orchestrator fit note, a mark from Nick, and the stage submitted for review. Images are generated
// placeholders and go into the studio blob store (XALIANS_STUDIO_STORE, default C:/dev/art-data/studio).
//
// Then open /studio/fixture-blockout/stage/blockout in the dev server.

import { deflateSync } from 'node:zlib';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestOverlays, initCreature, markBlockoutBuild, putFile, STANDARD_CAMERAS, submitStage } from '../../../packages/studio/src/index.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const creatureDir = join(repoRoot, 'art', 'creatures', 'fixture-blockout');

if (existsSync(creatureDir)) {
	if (!process.argv.includes('--force')) {
		console.error('art/creatures/fixture-blockout already exists; pass --force to recreate it');
		process.exit(1);
	}
	rmSync(creatureDir, { recursive: true, force: true });
}

// --- placeholder images ----------------------------------------------------

function crc32(buf) {
	let crc = 0xffffffff;
	for (let n = 0; n < buf.length; n++) {
		let c = (crc ^ buf[n]) & 0xff;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		crc = (crc >>> 8) ^ c;
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([len, body, crc]);
}

function png(w, h, pixel) {
	const raw = Buffer.alloc((w * 3 + 1) * h);
	for (let y = 0; y < h; y++) {
		raw[y * (w * 3 + 1)] = 0;
		for (let x = 0; x < w; x++) {
			const [r, g, b] = pixel(x / w, y / h);
			const o = y * (w * 3 + 1) + 1 + x * 3;
			raw[o] = r;
			raw[o + 1] = g;
			raw[o + 2] = b;
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0);
	ihdr.writeUInt32BE(h, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const inE = (u, v, cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;

/** A four-legged body seen from a camera: returns a shade (0 to 1) inside the figure, else null. `grow` fattens the model a little. */
function figure(camera, u, v, grow = 0) {
	const g = 1 + grow;
	if (camera === 'front' || camera === 'back') {
		if (inE(u, v, 0.5, 0.42, 0.2 * g, 0.2 * g)) return 0.7 - (v - 0.42) * 0.4;
		if (inE(u, v, 0.5, 0.2, 0.11 * g, 0.1 * g)) return 0.78;
		if (inE(u, v, 0.4, 0.07, 0.035, 0.1) || inE(u, v, 0.6, 0.07, 0.035, 0.1)) return 0.62;
		if ((u > 0.33 && u < 0.42) || (u > 0.58 && u < 0.67)) if (v > 0.55 && v < 0.93 + grow * 0.3) return 0.55;
		return null;
	}
	if (camera === 'top' || camera === 'below') {
		if (inE(u, v, 0.5, 0.5, 0.2 * g, 0.38 * g)) return 0.72;
		if (inE(u, v, 0.5, 0.12, 0.1, 0.09)) return 0.78;
		return null;
	}
	const flip = camera.endsWith('right') || camera.startsWith('threequarter-right');
	const uu = flip ? 1 - u : u;
	if (inE(uu, v, 0.5, 0.4, 0.3 * g, 0.16 * g)) return 0.7 - (v - 0.4) * 0.5;
	if (inE(uu, v, 0.22, 0.27, 0.1 * g, 0.09 * g)) return 0.78;
	if (inE(uu, v, 0.2, 0.15, 0.03, 0.09)) return 0.62;
	if ((uu > 0.28 && uu < 0.35) || (uu > 0.65 && uu < 0.72)) if (v > 0.5 && v < 0.92 + grow * 0.3) return 0.55;
	if (inE(uu, v, 0.84, 0.36, 0.1, 0.03)) return 0.6;
	return null;
}

const gray = (t) => {
	const v = Math.round(40 + t * 190);
	return [v, v - 4, v - 12];
};

/** The model render: clay shaded figure on a dark ground. */
const render = (camera, grow = 0.04) =>
	png(640, 640, (u, v) => {
		const s = figure(camera, u, v, grow);
		return s === null ? [32, 31, 28] : gray(s);
	});

/** The sheet's bare-body drawing: a different shape (portrait), light clay on warm paper. */
const bare = (camera) =>
	png(600, 800, (u, v) => {
		const s = figure(camera, u, 0.1 + v * 0.8, 0);
		return s === null ? [226, 220, 205] : [150 + Math.round(s * 60), 146 + Math.round(s * 56), 138 + Math.round(s * 50)];
	});

/** Overlay: where model and sheet agree, light clay; the sheet alone, amber; the model alone, blue. */
const overlay = (camera) =>
	png(640, 640, (u, v) => {
		const model = figure(camera, u, v, 0.04) !== null;
		const sheet = figure(camera, u, v, 0) !== null;
		if (model && sheet) return [200, 196, 186];
		if (sheet) return [236, 168, 52];
		if (model) return [64, 120, 214];
		return [32, 31, 28];
	});

const scratch = mkdtempSync(join(tmpdir(), 'studio-fixture-blockout-'));
function image(name, bytes) {
	const file = join(scratch, name);
	writeFileSync(file, bytes);
	return putFile(file);
}

// --- records ---------------------------------------------------------------

const store = initCreature(repoRoot, {
	key: 'fixture-blockout',
	name: 'Blockout Fixture',
	speciesTemplate: 'docs/species-templates/v5/fixture.json',
	silhouette: 'fixture.svg',
	provenance: 'Seeded by apps/web/scripts/studio-fixture-blockout.mjs; safe to delete.',
});
const session = 'fixture-seed';
store.acquireLock(session);
const who = { actor: 'orchestrator', session };
const mk = (kind, data) => store.create(kind, data, 'orchestrator', { session });

store.update(store.load().creature.id, (c) => {
	for (const id of ['intake', 'vision', 'sheet']) c.stages[id] = { status: 'approved' };
	c.stages.blockout = { status: 'open' };
}, who);

mk('part', { key: 'torso', name: 'Torso', includes: ['ribcage', 'pelvis'], why: 'Everything hangs from it.', scope: {}, dependsOn: [], order: 1, status: 'not-started', budget: { builds: 6, wallMinutes: 120 } });
mk('part', { key: 'head', name: 'Head', includes: ['skull', 'jaw'], why: 'Follows the torso.', scope: {}, dependsOn: [], order: 2, status: 'not-started', budget: { builds: 6, wallMinutes: 120 } });

for (const [el, cam] of [['bare-front', 'front'], ['bare-side', 'side-left'], ['bare-back', 'back']]) {
	mk('build', {
		kind: 'image',
		image: { stage: 'sheet', element: el, label: el.replace('-', ' '), prompt: 'placeholder', promptSha256: 'a'.repeat(64), inputs: [], tool: 'codex image_gen', generatedPath: '', codexTokens: null, model: null, round: 1 },
		goal: { text: el }, targets: [], method: 'image', outputs: [{ name: 'output.png', blob: image(`${el}.png`, bare(cam)) }], checks: [], lookNotes: [], cost: {}, status: 'presented',
	});
}

const renders = (grow) => STANDARD_CAMERAS.map((cam) => ({ name: cam, blob: image(`${cam}-${grow}.png`, render(cam, grow)), role: 'render', camera: cam }));
const looks = (outs) => outs.map((o) => ({ camera: o.camera, imageBlob: o.blob, note: 'looked' }));

// An earlier, rougher build: kept for the build picker.
const first = renders(0.14);
mk('build', { stage: 'blockout', kind: 'build', goal: { text: 'First blockout from the bare-body views' }, targets: [], method: 'blocks-from-sheet', outputs: first, checks: [{ id: 'fit-iou:front', kind: 'measure', value: 0.78 }], lookNotes: looks(first), cost: { wallMinutes: 26, blenderMinutes: 5 }, status: 'superseded' });

const current = renders(0.04);
const build = mk('build', {
	stage: 'blockout', kind: 'build',
	goal: { text: 'Shorten the legs and narrow the chest to match the bare-body views' },
	targets: [], method: 'blocks-from-sheet-v2',
	outputs: current, checks: [{ id: 'closed-manifold', kind: 'gate', passed: true }], lookNotes: looks(current),
	report: { changed: 'Legs shortened by a fifth, chest narrowed, head moved forward to meet the sheet at the side view.', outputs: ['front'], defectResults: [], blockedBy: { hold: 'nothing' }, outsideChanges: [] },
	cost: { wallMinutes: 31, blenderMinutes: 6.5, tokens: { input: 90000, output: 14000, cacheRead: 600000, cacheWrite: 40000 } },
	status: 'reported',
});

// Overlays and fit numbers, the way `studio build overlay` stores them.
const ov = join(scratch, 'overlays');
mkdirSync(ov);
for (const cam of ['front', 'side-left', 'back']) writeFileSync(join(ov, `${cam}.overlay.png`), overlay(cam));
writeFileSync(join(ov, 'fit.json'), JSON.stringify({ front: 0.94, 'side-left': 0.91, back: 0.89 }));
const got = ingestOverlays(ov);
store.update(build.id, (b) => {
	b.outputs = [...b.outputs, ...got.outputs];
	b.checks = [...b.checks, ...got.checks];
	b.status = 'presented';
}, who);

mk('note', { kind: 'decision', by: 'orchestrator', about: { stage: 'blockout' }, text: 'Fit check: front 94%, left side 91%, back 89% silhouette overlap with the bare-body views. The tail is a stub on purpose (it is hair in the fur stage). The chest is 2% wide at the back view; I left it so the haunches keep their mass.' });

// Submit through the library (the same check the CLI runs), then one mark from Nick.
submitStage(store, 'blockout', who);
markBlockoutBuild(store, { build: build.alias, marks: [{ camera: 'side-left', shape: 'ellipse', x: 0.18, y: 0.18, w: 0.18, h: 0.22, description: 'The head sits too far forward of the shoulders' }] });
store.releaseLock();
console.log('seeded art/creatures/fixture-blockout; open /studio/fixture-blockout/stage/blockout');
