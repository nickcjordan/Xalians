import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createSequencer, drawFrame, frameIndexAt, markersBetween, socketAt, validateManifest,
} from './atlas-player-v2.mjs';

const SOCKETS = ['ground', 'head', 'eye_l', 'eye_r', 'emitter', 'status', 'carry'];

function frames(n, sheetW = 64) {
  return Array.from({ length: n }, (_, i) => ({
    x: (i * 20) % sheetW, y: Math.floor((i * 20) / sheetW) * 30, w: 18, h: 28, offset: [10 + i, 4],
    sockets: Object.fromEntries(SOCKETS.map((s, k) => [s, [20 + k, 10 + i]])),
  }));
}

function fixture() {
  return {
    format: 'xalians-frame-atlas-v2',
    species: 'test',
    cell: { w: 48, h: 40 },
    anchor: [24, 36],
    fps: 10,
    facings: { side: { camera: 'side_left', faces: 'left' } },
    sockets: SOCKETS,
    clips: {
      idle: { frameCount: 4, durationMs: 400, loop: true, markers: [], facings: { side: { sheet: 'idle-side.png', frames: frames(4) } } },
      'sig.test': {
        frameCount: 3, durationMs: 300, loop: false,
        markers: [{ name: 'set', timeMs: 100 }, { name: 'recover', timeMs: 200 }],
        entry: { clip: 'idle', frame: 0 }, then: { clip: 'idle', frame: 0 },
        facings: { side: { sheet: 'sig.test-side.png', frames: frames(3) } },
      },
    },
  };
}

test('a well-formed v2 manifest validates', () => {
  assert.equal(validateManifest(fixture()).format, 'xalians-frame-atlas-v2');
});

test('the v2 reader rejects what it cannot play', () => {
  const bad = (edit) => { const m = fixture(); edit(m); return () => validateManifest(m); };
  assert.throws(bad((m) => { m.format = 'xalians-frame-atlas-v1'; }), /Unsupported/);
  assert.throws(bad((m) => { m.clips.idle.facings.side.frames[2].offset = [40, 4]; }), /outside the cell/);
  assert.throws(bad((m) => { delete m.clips.idle.facings.side.frames[1].sockets.status; }), /socket status/);
  assert.throws(bad((m) => { m.clips['sig.test'].markers[0].timeMs = 300; }), /marker/);
  assert.throws(bad((m) => { m.clips['sig.test'].then = { clip: 'idle', frame: 4 }; }), /then/);
  assert.throws(bad((m) => { m.clips.idle.durationMs = 410; }), /durationMs/);
  assert.throws(bad((m) => { m.clips.idle.facings.side.frames.pop(); }), /frames/);
});

test('frame index loops or holds', () => {
  const m = fixture();
  assert.equal(frameIndexAt(m, m.clips.idle, 0), 0);
  assert.equal(frameIndexAt(m, m.clips.idle, 399), 3);
  assert.equal(frameIndexAt(m, m.clips.idle, 400), 0);
  assert.equal(frameIndexAt(m, m.clips['sig.test'], 1000), 2);
});

test('loop markers cross the seam once', () => {
  const clip = { durationMs: 1000, loop: true, markers: [{ name: 'beat', timeMs: 100 }] };
  assert.deepEqual(markersBetween(clip, 950, 1150).map((e) => e.atMs), [1100]);
  assert.deepEqual(markersBetween(clip, 0, 3000).map((e) => e.atMs), [100, 1100, 2100]);
});

test('a one-shot clip hands off to its then frame with no repeated or skipped image', () => {
  const m = fixture();
  const seq = createSequencer(m, 'idle');
  seq.advance(100);
  seq.play('sig.test');
  const shown = [[seq.clip, seq.frame()]];
  const events = [];
  for (let i = 0; i < 6; i++) {
    const r = seq.advance(100);
    shown.push([r.clip, r.frame]);
    events.push(...r.events.map((e) => `${e.clip}:${e.name}@${e.atMs}`));
  }
  assert.deepEqual(shown, [['sig.test', 0], ['sig.test', 1], ['sig.test', 2], ['idle', 0], ['idle', 1], ['idle', 2], ['idle', 3]]);
  assert.deepEqual(events, ['sig.test:set@100', 'sig.test:recover@200']);
});

test('play at entry waits for the entry frame and replaces it', () => {
  const m = fixture();
  const seq = createSequencer(m, 'idle');
  seq.advance(200);                                   // idle frame 2
  seq.play('sig.test', { atEntry: true });
  assert.equal(seq.queued, 'sig.test');
  const shown = [];
  for (let i = 0; i < 7; i++) {
    const r = seq.advance(100);
    shown.push(`${r.clip}:${r.frame}`);
  }
  assert.deepEqual(shown, ['idle:3', 'sig.test:0', 'sig.test:1', 'sig.test:2', 'idle:0', 'idle:1', 'idle:2']);
});

test('frames draw at their offset from the anchor, mirrored on request', () => {
  const m = fixture();
  const calls = [];
  const ctx = {
    save: () => calls.push('save'), restore: () => calls.push('restore'),
    translate: (...a) => calls.push(['translate', ...a]), scale: (...a) => calls.push(['scale', ...a]),
    drawImage: (...a) => calls.push(['drawImage', ...a.slice(1)]),
  };
  const images = { 'idle-side.png': {}, 'sig.test-side.png': {} };
  drawFrame(ctx, { manifest: m, images }, 'idle', 'side', 2, 100, 200, 2, true);
  assert.deepEqual(calls[1], ['translate', 100, 200]);
  assert.deepEqual(calls[2], ['scale', -2, 2]);
  const fr = m.clips.idle.facings.side.frames[2];
  assert.deepEqual(calls[3], ['drawImage', fr.x, fr.y, fr.w, fr.h, fr.offset[0] - 24, fr.offset[1] - 36, fr.w, fr.h]);
  assert.deepEqual(socketAt(m, 'idle', 'side', 2, 'head', { scale: 2 }), [(21 - 24) * 2, (12 - 36) * 2]);
  assert.deepEqual(socketAt(m, 'idle', 'side', 2, 'head', { scale: 2, flipX: true }), [(24 - 21) * 2, (12 - 36) * 2]);
});

// The Akinza sprites pass 1 atlas, when it is on this machine (it lives under untracked/).
const REAL = fileURLToPath(new URL('../../../untracked/species-construction/akinza/anim/sprites1/atlas/manifest.json', import.meta.url));
test('the Akinza atlas: idle, Night Stalk at idle frame 0, back to idle frame 0', { skip: !existsSync(REAL) && 'atlas not built here' }, () => {
  const m = validateManifest(JSON.parse(readFileSync(REAL, 'utf8')));
  const idle = m.clips.idle;
  const stalk = m.clips['sig.night-stalk'];
  assert.equal(idle.loop, true);
  assert.equal(idle.frameCount, 90);
  assert.equal(stalk.loop, false);
  assert.equal(stalk.frameCount, 45);
  assert.deepEqual(stalk.then, { clip: 'idle', frame: 0, ...(stalk.then.note ? { note: stalk.then.note } : {}) });
  assert.deepEqual(stalk.markers.map((e) => e.name), ['conceal', 'recover']);
  const fd = 1000 / m.fps;
  const seq = createSequencer(m, 'idle');
  for (let i = 0; i < 30; i++) seq.advance(fd);       // idle frame 30
  seq.play('sig.night-stalk', { atEntry: true });
  const shown = [];
  const events = [];
  for (let i = 0; i < 60 + 45 + 2; i++) {
    const r = seq.advance(fd);
    shown.push(`${r.clip}:${r.frame}`);
    events.push(...r.events.map((e) => `${e.name}@${Math.round(e.atMs)}`));
  }
  const at = shown.indexOf('sig.night-stalk:0');
  assert.equal(shown[at - 1], 'idle:89');
  assert.deepEqual(shown.slice(at, at + 45), Array.from({ length: 45 }, (_, k) => `sig.night-stalk:${k}`));
  assert.deepEqual(shown.slice(at + 45, at + 47), ['idle:0', 'idle:1']);
  assert.deepEqual(events, ['conceal@600', 'recover@967']);
});
