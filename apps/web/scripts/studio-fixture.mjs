#!/usr/bin/env node
// Seeds a throwaway creature for exercising the Creature Studio review screen.
//
//   node apps/web/scripts/studio-fixture.mjs [--force]
//
// Creates art/creatures/fixture/ (gitignored) through the studio library: two
// parts, a creature-wide hold, a hold from Nick and an inferred one, a defect,
// an approved baseline build, a presented build with renders, a difference
// image and a heat map, a question for Nick, and a second part with two
// presented previews so the options view has something to show. The images are
// generated placeholders and go into the studio blob store (XALIANS_STUDIO_STORE,
// default C:/dev/art-data/studio) like any other output.
//
// Then: npm run dev -w apps/web, and open /studio/fixture/skull.

import { deflateSync } from 'node:zlib';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestPacket, initCreature, putFile, STANDARD_CAMERAS } from '../../../packages/studio/src/index.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const creatureDir = join(repoRoot, 'art', 'creatures', 'fixture');

if (existsSync(creatureDir)) {
	if (!process.argv.includes('--force')) {
		console.error('art/creatures/fixture already exists; pass --force to recreate it');
		process.exit(1);
	}
	rmSync(creatureDir, { recursive: true, force: true });
}

// --- placeholder images ----------------------------------------------------

const W = 640;
const H = 480;

function crc32(buf) {
	let c;
	let crc = 0xffffffff;
	for (let n = 0; n < buf.length; n++) {
		c = (crc ^ buf[n]) & 0xff;
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

function png(pixel) {
	const raw = Buffer.alloc((W * 3 + 1) * H);
	for (let y = 0; y < H; y++) {
		raw[y * (W * 3 + 1)] = 0;
		for (let x = 0; x < W; x++) {
			const [r, g, b] = pixel(x, y);
			const o = y * (W * 3 + 1) + 1 + x * 3;
			raw[o] = r;
			raw[o + 1] = g;
			raw[o + 2] = b;
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(W, 0);
	ihdr.writeUInt32BE(H, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const inEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

/** A clay-grey skull-ish head: cranium, snout, eye socket and a brow ridge whose height varies. */
function head({ camera = 0, brow = 8, snout = 1 }) {
	const shift = (camera - 3.5) * 14;
	return png((x, y) => {
		const bg = 30 + Math.round((y / H) * 14);
		let v = bg;
		let shade = null;
		if (inEllipse(x, y, 320 + shift, 230, 170, 150)) shade = 150 - Math.round(((x - 320 - shift) / 170) * 40) - Math.round(((y - 230) / 150) * 30);
		if (inEllipse(x, y, 430 + shift * 1.4, 280, 120 * snout, 70)) shade = 168 - Math.round(((y - 280) / 70) * 40);
		if (inEllipse(x, y, 300 + shift, 175 - brow, 90, 22 + brow)) shade = 190;
		if (shade !== null) v = Math.max(40, Math.min(230, shade));
		if (inEllipse(x, y, 330 + shift, 215, 34, 30)) v = 36;
		return [v, v - 4, v - 12];
	});
}

/** Blue where `a` has a brow that `b` lacks, amber where the baseline has it and the new one does not. */
function diff(newBrow, oldBrow) {
	return png((x, y) => {
		const isNew = inEllipse(x, y, 300, 175 - newBrow, 90, 22 + newBrow);
		const wasOld = inEllipse(x, y, 300, 175 - oldBrow, 90, 22 + oldBrow);
		if (isNew && !wasOld) return [70, 140, 230];
		if (wasOld && !isNew) return [235, 170, 60];
		return [38, 37, 34];
	});
}

/** A luminance ramp: brighter is farther moved. */
function heat() {
	return png((x, y) => {
		const d = Math.max(0, 1 - Math.hypot(x - 300, y - 150) / 150);
		const v = Math.round(30 + d * 210);
		return [v, v, v - 6];
	});
}

const scratch = mkdtempSync(join(tmpdir(), 'studio-fixture-'));
function image(name, bytes) {
	const file = join(scratch, name);
	writeFileSync(file, bytes);
	return putFile(file);
}

// --- records ---------------------------------------------------------------

const store = initCreature(repoRoot, {
	key: 'fixture',
	name: 'Fixture Creature',
	speciesTemplate: 'docs/species-templates/v5/fixture.json',
	silhouette: 'fixture.svg',
	provenance: 'Seeded by apps/web/scripts/studio-fixture.mjs; safe to delete.',
});
const session = 'fixture-seed';
store.acquireLock(session);
const mk = (kind, data, actor = 'orchestrator') => store.create(kind, data, actor, { session });

const skull = mk('part', { key: 'skull', name: 'Skull', includes: ['cranium', 'brow ridge', 'eye sockets'], why: 'The skull sets the head every other part hangs from.', scope: {}, dependsOn: [], order: 1, status: 'in-progress', budget: { builds: 6, wallMinutes: 120 } });
const jaw = mk('part', { key: 'jaw', name: 'Jaw', includes: ['lower jaw', 'chin'], why: 'The jaw follows the skull.', scope: {}, dependsOn: [skull.id], order: 2, status: 'in-progress', budget: { builds: 4, wallMinutes: 60 } });

mk('hold', { statement: 'Keep the mouth as it is', scope: { part: skull.id }, source: { kind: 'nick', quote: 'mouth looks good', date: '2026-10-10' }, status: 'active', history: [] });
mk('hold', { statement: 'Do not widen the eye socket', scope: { part: skull.id }, source: { kind: 'inferred', by: 'builder:b1', reason: 'the eye session is working on the socket and a wider one would collide' }, status: 'active', history: [] });
mk('hold', { statement: 'Keep the overall head length', scope: {}, source: { kind: 'imported', file: 'art/species-construction/akinza/NOTES.md', line: 212, quote: 'head length is right' }, status: 'active', history: [] });

const defect = mk('defect', { part: skull.id, description: 'The brow ridge is too flat', origin: 'nick', status: 'open', attempts: [] });

const cameras = [...STANDARD_CAMERAS];
function outputsFor(newBrow, oldBrow, withBaseline) {
	const outs = [];
	cameras.forEach((cam, i) => {
		outs.push({ name: cam, blob: image(`${cam}-${newBrow}.png`, head({ camera: i, brow: newBrow })), role: 'render', camera: cam });
		if (withBaseline) outs.push({ name: `${cam}-baseline`, blob: image(`${cam}-${oldBrow}.png`, head({ camera: i, brow: oldBrow })), role: 'baseline', camera: cam });
	});
	outs.push({ name: 'front-diff', blob: image('diff.png', diff(newBrow, oldBrow)), role: 'diff', camera: 'front' });
	outs.push({ name: 'heat-skull', blob: image('heat.png', heat()), role: 'heat' });
	return outs;
}

// The approved baseline: a low brow.
const baselineOutputs = cameras.map((cam, i) => ({ name: cam, blob: image(`${cam}-8.png`, head({ camera: i, brow: 8 })), role: 'render', camera: cam }));
const baseline = mk('build', { part: skull.id, kind: 'build', goal: { text: 'First pass at the cranium' }, targets: [], method: 'sculpt-from-silhouette', outputs: baselineOutputs, checks: [], lookNotes: [], cost: { wallMinutes: 42, blenderMinutes: 9, tokens: { input: 120000, output: 18000, cacheRead: 900000, cacheWrite: 60000 } }, status: 'reviewed' });
store.update(skull.id, { status: 'in-progress', approvedBuild: baseline.id }, { actor: 'orchestrator', session });

const reviewOutputs = outputsFor(26, 8, false);
const review = mk('build', {
	part: skull.id,
	kind: 'build',
	goal: { text: 'Raise the brow ridge' },
	targets: [defect.id],
	method: 'raise-brow-with-proportional-edit',
	outputs: reviewOutputs,
	checks: [
		{ id: 'changed-fraction:front', kind: 'measure', value: 0.031, detail: 'share of pixels that differ from the baseline at front' },
		{ id: 'displacement', kind: 'measure', value: { component: 'skull', moved: 1840, max: 3.2, median: 0.4, units: 'cm', perZone: { brow: 3.2, cranium: 0.6, 'eye socket rim': 0.2, snout: 0 } }, detail: 'how far the skull moved from the baseline, in cm' },
		{ id: 'closed-manifold', kind: 'gate', passed: true },
	],
	report: { changed: 'Raised the brow ridge by about a quarter of its width.', outputs: ['front'], defectResults: [{ defect: defect.id, result: 'partly', evidence: 'The ridge is higher but still smooth over the left eye.' }], blockedBy: { hold: 'nothing' }, outsideChanges: [{ what: 'The top of the eye socket rim moved 0.2 cm', why: 'The ridge is blended into the rim; moving it less leaves a visible step.' }] },
	lookNotes: cameras.map((camera, i) => ({ camera, imageBlob: reviewOutputs[i].blob, note: 'looked' })),
	cost: { wallMinutes: 18, blenderMinutes: 4.5 },
	status: 'presented',
});

mk('note', { kind: 'question', by: 'orchestrator', text: 'May the skull widen the eye socket rim by 2 mm? The eye work is separate.', about: { part: skull.id } });

for (const [label, brow, snout] of [['A', 18, 1], ['B', 26, 0.8], ['C', 12, 1.2]]) {
	mk('build', {
		part: jaw.id,
		kind: 'preview',
		goal: { text: `Jaw direction ${label}` },
		targets: [],
		method: `jaw-direction-${label.toLowerCase()}`,
		outputs: cameras.map((cam, i) => ({ name: cam, blob: image(`jaw-${label}-${cam}.png`, head({ camera: i, brow, snout })), role: 'render', camera: cam })),
		checks: [],
		lookNotes: [],
		cost: label === 'C' ? {} : { wallMinutes: 6 },
		status: 'presented',
	});
}

// --- real renders: the Akinza packet, when it is on this machine (--no-real skips it) ---
const packetDir = process.env.STUDIO_FIXTURE_PACKET ?? 'C:/dev/art-data/studio/packets/akinza-3141-vs-3101';
if (!process.argv.includes('--no-real') && existsSync(join(packetDir, 'packet.json'))) {
	const packet = JSON.parse(readFileSync(join(packetDir, 'packet.json'), 'utf8'));
	const head = mk('part', { key: 'head', name: 'Head', includes: ['skull', 'eyes', 'muzzle'], why: 'Real Akinza renders from the packet ingest, for exercising the screen.', scope: {}, dependsOn: [], order: 3, status: 'in-progress', budget: { builds: 6, wallMinutes: 180 } });
	mk('hold', { statement: 'Keep the muzzle length', scope: { part: head.id }, source: { kind: 'nick', quote: 'muzzle length is right', date: '2026-10-11' }, status: 'active', history: [] });
	const headDefect = mk('defect', { part: head.id, description: 'The brow reads flat from the front', origin: 'nick', status: 'open', attempts: [] });
	// The baseline build is made from the packet's own *.baseline.png files.
	const baselineOuts = packet.cameras.filter((c) => c.baselineFile).map((c) => ({ name: c.id, blob: putFile(join(packetDir, c.baselineFile)), role: 'render', camera: c.id }));
	const realBase = mk('build', { part: head.id, kind: 'build', goal: { text: `Approved head, ${packet.baseline}` }, targets: [], method: 'recipe', outputs: baselineOuts, checks: [], lookNotes: [], cost: { wallMinutes: 30, blenderMinutes: 6 }, status: 'reviewed' });
	store.update(head.id, { approvedBuild: realBase.id }, { actor: 'orchestrator', session });
	// The presented build goes through the same ingest as `studio build ingest`.
	const got = ingestPacket(packetDir);
	mk('build', { part: head.id, kind: 'build', goal: { text: `Rebuild the head (${packet.assembly})` }, targets: [headDefect.id], method: 'recipe', outputs: got.outputs, checks: got.checks, lookNotes: [], cost: { wallMinutes: 14, blenderMinutes: got.blenderMinutes }, status: 'presented' });
	console.log(`ingested real packet ${packet.assembly} onto part head`);
}

store.releaseLock();
rmSync(scratch, { recursive: true, force: true });
console.log(`seeded art/creatures/fixture (parts: skull, jaw, and head when the real packet exists). Open /studio/fixture/skull and /studio/fixture/jaw`);
