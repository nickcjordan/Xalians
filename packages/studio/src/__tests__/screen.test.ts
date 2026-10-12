import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { blobPath, hasBlob, putFile } from '../blobs.ts';
import { run } from '../cli.ts';
import { holdSourceText, needsNick, partView } from '../engine.ts';
import { ingestPacket } from '../ingest.ts';
import { recordChoice, recordReview, strikeHold } from '../review.ts';
import type { Build, Part } from '../schema.ts';
import { initCreature, openCreature, type Store } from '../store.ts';
import { scanNewReviews } from '../watch.ts';

// A fixed small file per name so hashes differ.
function file(dir: string, name: string, body = name): string {
	const p = join(dir, name);
	writeFileSync(p, body);
	return p;
}

let root: string;
let blobs: string;
const savedEnv = process.env.XALIANS_STUDIO_STORE;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'studio-screen-'));
	blobs = mkdtempSync(join(tmpdir(), 'studio-blobs-'));
	process.env.XALIANS_STUDIO_STORE = blobs;
});
afterEach(() => {
	if (savedEnv === undefined) delete process.env.XALIANS_STUDIO_STORE;
	else process.env.XALIANS_STUDIO_STORE = savedEnv;
});

function setup(): { store: Store; part: Part } {
	const store = initCreature(root, { key: 'fx', name: 'Fx', speciesTemplate: 't.json', silhouette: 's.svg' });
	store.acquireLock('t');
	const part = store.create('part', { key: 'skull', name: 'Skull', includes: [], why: 'w', scope: {}, dependsOn: [], order: 1, status: 'in-progress', budget: { builds: 6, wallMinutes: 100 } }, 'orchestrator', { session: 't' });
	return { store, part };
}

function mkBuild(store: Store, part: Part, extra: Partial<Build> = {}): Build {
	return store.create('build', { part: part.id, kind: 'build', goal: { text: 'raise the brow' }, targets: [], method: 'm', outputs: [], checks: [], lookNotes: [], cost: {}, status: 'presented', ...extra }, 'orchestrator', { session: 't' });
}

describe('blob store', () => {
	it('stores by hash, only once, under the first two hex digits', () => {
		const dir = mkdtempSync(join(tmpdir(), 'src-'));
		const a = file(dir, 'a.png', 'hello');
		const sha = putFile(a);
		expect(sha).toMatch(/^[0-9a-f]{64}$/);
		expect(blobPath(sha)).toBe(join(blobs, 'blobs', sha.slice(0, 2), sha));
		expect(hasBlob(sha)).toBe(true);
		expect(readFileSync(blobPath(sha), 'utf8')).toBe('hello');
		expect(putFile(a)).toBe(sha);
		expect(hasBlob('0'.repeat(64))).toBe(false);
	});

	it('the CLI prints the sha for blob put', () => {
		const dir = mkdtempSync(join(tmpdir(), 'src-'));
		const lines: string[] = [];
		expect(run(['blob', 'put', file(dir, 'b.png', 'bytes')], { out: (l) => lines.push(l) })).toBe(0);
		expect(hasBlob(lines[0]!)).toBe(true);
	});
});

describe('build output and ingest', () => {
	it('output stores the file in the blob store and keeps the name', () => {
		const { store, part } = setup();
		const b = mkBuild(store, part, { status: 'planned' });
		const dir = mkdtempSync(join(tmpdir(), 'src-'));
		const out: string[] = [];
		const code = run(['build', 'output', 'fx', b.alias, '--name', 'front.png', '--file', file(dir, 'f.png', 'front'), '--camera', 'front', '--root', root, '--session', 't'], { out: (l) => out.push(l) });
		expect(code).toBe(0);
		const rec = openCreature(root, 'fx').get(b.alias)!.record as Build;
		expect(rec.outputs[0]!.name).toBe('front.png');
		expect(rec.outputs[0]!.path).toBeUndefined();
		expect(hasBlob(rec.outputs[0]!.blob)).toBe(true);
	});

	function packetDir(): string {
		const dir = mkdtempSync(join(tmpdir(), 'packet-'));
		mkdirSync(join(dir, 'img'));
		for (const n of ['f', 'fb', 'fs', 'fd', 'heat', 'b']) file(join(dir, 'img'), `${n}.png`, `pixels-${n}`);
		writeFileSync(join(dir, 'packet.json'), JSON.stringify({
			assembly: 'assembly.blend', assemblySha256: 'c'.repeat(64), baseline: 'head-0204',
			cameras: [
				{ id: 'front', file: 'img/f.png', baselineFile: 'img/fb.png', sideBySide: 'img/fs.png', diffFile: 'img/fd.png', changedFraction: 0.031 },
				{ id: 'back', file: 'img/b.png', baselineFile: null, sideBySide: null, diffFile: null, changedFraction: null },
			],
			displacement: { component: 'skull', heatFile: 'img/heat.png', moved: 120, max: 3.2, median: 0.4, units: 'mm', perZone: { brow: 3.2, jaw: 0.1 } },
			minutes: 4.5,
		}));
		return dir;
	}

	it('ingestPacket returns roles, cameras, measures and minutes', () => {
		const got = ingestPacket(packetDir());
		const roles = got.outputs.map((o) => `${o.role}:${o.camera ?? '-'}`);
		expect(roles).toEqual(['render:front', 'baseline:front', 'compare:front', 'diff:front', 'render:back', 'heat:-']);
		expect(got.outputs.every((o) => hasBlob(o.blob))).toBe(true);
		const ids = got.checks.map((c) => c.id);
		expect(ids).toContain('changed-fraction:front');
		expect(ids).not.toContain('changed-fraction:back');
		expect(ids).toContain('displacement');
		expect(got.checks.every((c) => c.kind === 'measure' && c.passed === undefined)).toBe(true);
		expect(got.blenderMinutes).toBe(4.5);
	});

	it('rejects a packet with an unknown field', () => {
		const dir = packetDir();
		const p = JSON.parse(readFileSync(join(dir, 'packet.json'), 'utf8'));
		p.extra = 1;
		writeFileSync(join(dir, 'packet.json'), JSON.stringify(p));
		expect(() => ingestPacket(dir)).toThrow(/packet.json/);
	});

	it('the CLI ingests onto a build', () => {
		const { store, part } = setup();
		const b = mkBuild(store, part, { status: 'running' });
		const code = run(['build', 'ingest', 'fx', b.alias, '--packet', packetDir(), '--root', root, '--session', 't'], { out: () => {} });
		expect(code).toBe(0);
		const rec = openCreature(root, 'fx').get(b.alias)!.record as Build;
		expect(rec.outputs).toHaveLength(6);
		expect(rec.cost.blenderMinutes).toBe(4.5);
		// A second ingest replaces rather than duplicates.
		run(['build', 'ingest', 'fx', b.alias, '--packet', packetDir(), '--root', root, '--session', 't'], { out: () => {} });
		expect((openCreature(root, 'fx').get(b.alias)!.record as Build).outputs).toHaveLength(6);
	});
});

describe('watch', () => {
	it('reports each new review or decision by Nick once', () => {
		const { store, part } = setup();
		const b = mkBuild(store, part);
		const seen = new Set<string>();
		expect(scanNewReviews(root, 'fx', seen)).toEqual([]);
		recordReview(store, { build: b.alias, verdict: 'adjust', text: 'brow is  too\nflat' });
		store.create('note', { kind: 'question', by: 'orchestrator', text: 'q' }, 'orchestrator', { session: 't' });
		const lines = scanNewReviews(root, 'fx', seen);
		expect(lines).toEqual([`REVIEW ${b.alias} adjust: brow is too flat`]);
		expect(scanNewReviews(root, 'fx', seen)).toEqual([]);
	});
});

function addHold(store: Store, statement: string, source: object, scope: object = {}) {
	return store.create('hold', { statement, scope, source: source as never, status: 'active', history: [] }, 'orchestrator', { session: 't' });
}

describe('recordReview, strikeHold and recordChoice', () => {
	it('marks become defects, the review applies, and no lock is needed', () => {
		const { store, part } = setup();
		const b = mkBuild(store, part);
		const h = addHold(store, 'keep the mouth', { kind: 'nick', quote: 'mouth looks good', date: '2026-10-10' }, { part: part.id });
		store.releaseLock();
		const res = recordReview(store, {
			build: b.alias,
			verdict: 'adjust',
			text: 'brow too flat',
			holdsStruck: [h.alias],
			marks: [{ camera: 'front', shape: 'ellipse', x: 0.2, y: 0.3, w: 0.1, h: 0.1, description: 'brow is flat' }],
		});
		expect(res.defects).toHaveLength(1);
		expect(res.defects[0]!.origin).toBe('nick');
		expect(res.defects[0]!.region).toMatchObject({ buildId: b.id, camera: 'front' });
		const data = store.load();
		expect(data.builds[0]!.status).toBe('reviewed');
		expect(data.holds[0]!.status).toBe('struck');
		expect(data.notes[0]).toMatchObject({ kind: 'review', by: 'nick', via: 'studio', verdict: 'adjust' });
		expect(data.notes[0]!.marks).toEqual([res.defects[0]!.id]);
	});

	it('approve sets the part approved; a preview cannot be approved; a non-presented build is refused', () => {
		const { store, part } = setup();
		const prev = mkBuild(store, part, { kind: 'preview' });
		const b = mkBuild(store, part);
		const planned = mkBuild(store, part, { status: 'planned' });
		expect(() => recordReview(store, { build: prev.alias, verdict: 'approve', text: '' })).toThrow(/preview/);
		expect(() => recordReview(store, { build: planned.alias, verdict: 'approve', text: '' })).toThrow(/presented/);
		recordReview(store, { build: b.alias, verdict: 'approve', text: 'good' });
		const p = store.load().parts[0]!;
		expect(p.status).toBe('approved');
		expect(p.approvedBuild).toBe(b.id);
	});

	it('rejects a bad mark before writing anything', () => {
		const { store, part } = setup();
		const b = mkBuild(store, part);
		expect(() => recordReview(store, { build: b.alias, verdict: 'reject', text: '', marks: [{ camera: 'front', shape: 'rect', x: 2, y: 0, w: 0, h: 0, description: 'x' }] })).toThrow(/0 to 1/);
		expect(store.load().defects).toHaveLength(0);
		expect(store.load().notes).toHaveLength(0);
	});

	it('strikeHold strikes with a reason and refuses a second time', () => {
		const { store, part } = setup();
		const h = addHold(store, 'x', { kind: 'inferred', by: 'builder:b1', reason: 'guess' }, { part: part.id });
		const struck = strikeHold(store, h.alias, 'not needed');
		expect(struck.status).toBe('struck');
		expect(struck.history.at(-1)).toMatchObject({ by: 'nick', reason: 'not needed' });
		expect(() => strikeHold(store, h.alias, 'again')).toThrow(/already/);
		expect(() => strikeHold(store, h.alias, ' ')).toThrow(/reason/);
	});

	it('recordChoice writes a decision and settles the previews', () => {
		const { store, part } = setup();
		const a = mkBuild(store, part, { kind: 'preview' });
		const b = mkBuild(store, part, { kind: 'preview' });
		const { note } = recordChoice(store, { builds: [a.alias, b.alias], chosen: b.alias, text: 'rounder' });
		expect(note).toMatchObject({ kind: 'decision', by: 'nick', via: 'studio' });
		expect(note.text).toContain(`Chose ${b.alias} over ${a.alias}`);
		const data = store.load();
		expect(data.builds.find((x) => x.id === b.id)!.status).toBe('reviewed');
		expect(data.builds.find((x) => x.id === a.id)!.status).toBe('superseded');
		expect(() => recordChoice(store, { builds: [a.alias], chosen: a.alias, text: '' })).toThrow(/two/);
	});

	it('a non-Nick caller still needs the lock to create a defect', () => {
		const { store, part } = setup();
		store.releaseLock();
		expect(() => store.create('defect', { part: part.id, description: 'x', origin: 'orchestrator', status: 'open', attempts: [] }, 'orchestrator', { bypassLock: true })).toThrow(/lock/);
	});
});

describe('partView and needsNick', () => {
	it('gathers holds, defects, builds, baseline, notes and budget', () => {
		const { store, part } = setup();
		const other = store.create('part', { key: 'jaw', name: 'Jaw', includes: [], why: 'w', scope: {}, dependsOn: [], order: 2, status: 'in-progress', budget: { builds: 2, wallMinutes: 10 } }, 'orchestrator', { session: 't' });
		addHold(store, 'creature wide', { kind: 'imported', file: 'notes.md', line: 4 });
		addHold(store, 'weak one', { kind: 'inferred', by: 'builder:x', reason: 'a guess' }, { part: part.id });
		addHold(store, 'strong one', { kind: 'nick', quote: 'mouth looks good', date: '2026-10-10' }, { part: part.id });
		addHold(store, 'other part', { kind: 'nick', quote: 'q', date: '2026-10-10' }, { part: other.id });
		const d = store.create('defect', { part: part.id, description: 'flat brow', origin: 'nick', status: 'open', attempts: [] }, 'orchestrator', { session: 't' });
		const old = mkBuild(store, part, { status: 'reviewed', targets: [d.id], cost: { wallMinutes: 7, blenderMinutes: 2, tokens: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 } }, outputs: [{ name: 'front', blob: 'a'.repeat(64), role: 'render', camera: 'front' }, { name: 'heat', blob: 'b'.repeat(64), role: 'heat' }] });
		store.update<'part'>(part.id, { approvedBuild: old.id, status: 'approved' }, { actor: 'orchestrator', session: 't' });
		const newer = mkBuild(store, part, { targets: [d.id], cost: { wallMinutes: 5 } });
		store.create('note', { kind: 'question', by: 'orchestrator', text: 'which?', about: { part: part.id } }, 'orchestrator', { session: 't' });

		const v = partView(store.load(), 'skull');
		expect(v.holds.map((h) => h.statement)).toEqual(['strong one', 'weak one', 'creature wide']);
		expect(v.holds.map((h) => h.reach)).toEqual(['part', 'part', 'creature']);
		expect(v.holds[0]!.sourceText).toBe('You, Oct 10: "mouth looks good"');
		expect(v.holds[1]!.sourceText).toBe('Inferred by a builder x: a guess');
		expect(v.defects).toHaveLength(1);
		expect(v.defects[0]!.attempts.map((a) => a.alias).sort()).toEqual([old.alias, newer.alias].sort());
		expect(v.defects[0]!.stalled).toBe(true);
		expect(v.builds[0]!.alias).toBe(newer.alias);
		expect(v.baseline!.alias).toBe(old.alias);
		expect(v.baseline!.cameras.front).toHaveLength(1);
		expect(v.baseline!.otherOutputs).toHaveLength(1);
		expect(v.baseline!.cost).toEqual({ wallMinutes: 7, blenderMinutes: 2, tokens: 10 });
		expect(v.notes).toHaveLength(1);
		expect(v.budget).toMatchObject({ builds: 2, wallMinutes: 12, buildsLeft: 4, wallMinutesLeft: 88 });
		expect(holdSourceText(store.load().holds[0]!)).toContain('notes.md, line 4');
	});

	it('needsNick lists presented builds, open questions and ask-nick stalls, oldest first', () => {
		const { store, part } = setup();
		const d = store.create('defect', { part: part.id, description: 'flat brow', origin: 'nick', status: 'open', attempts: [] }, 'orchestrator', { session: 't' });
		mkBuild(store, part, { status: 'failed', targets: [d.id] });
		mkBuild(store, part, { status: 'reviewed', targets: [d.id] });
		mkBuild(store, part, { status: 'reviewed', targets: [d.id] });
		store.create('note', { kind: 'audit', by: 'orchestrator', text: 'cause', about: { defect: d.id }, outcome: 'ask-nick' }, 'orchestrator', { session: 't' });
		const q = store.create('note', { kind: 'question', by: 'orchestrator', text: 'bigger socket?', about: { part: part.id } }, 'orchestrator', { session: 't' });
		store.create('note', { kind: 'question', by: 'orchestrator', text: 'answered one', answered: q.id }, 'orchestrator', { session: 't' });
		const shown = mkBuild(store, part, { kind: 'preview', outputs: [{ name: 'front', blob: 'a'.repeat(64), role: 'render', camera: 'front' }] });
		const items = needsNick(store.load());
		expect(items.map((i) => i.kind).sort()).toEqual(['question', 'review', 'stalled']);
		const review = items.find((i) => i.kind === 'review')!;
		expect(review).toMatchObject({ ref: shown.alias, partKey: 'skull', buildKind: 'preview', thumb: 'a'.repeat(64) });
		const times = items.map((i) => i.since);
		expect([...times].sort()).toEqual(times);
	});

	it('is quiet when nothing is waiting', () => {
		const { store } = setup();
		expect(needsNick(store.load())).toEqual([]);
	});
});

void vi;
