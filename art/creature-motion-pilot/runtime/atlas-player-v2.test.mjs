import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createSequencer, drawFrame, frameIndexAt, markersBetween, mirrorX, socketAt, socketInCell, socketVisible, statusBarY,
  validateManifest,
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
    alpha: 'straight',
    facings: { side: { camera: 'side_left', faces: 'left', socketVisibility: { eye_r: 'hidden' } } },
    sockets: SOCKETS,
    clips: {
      idle: { frameCount: 4, durationMs: 400, loop: true, markers: [], statusBarY: { side: 3 }, facings: { side: { sheet: 'idle-side.png', frames: frames(4) } } },
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
  assert.throws(bad((m) => { m.alpha = 'premultiplied'; }), /alpha/);
  assert.throws(bad((m) => { m.facings.side.socketVisibility.eye_r = 'faint'; }), /socketVisibility/);
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

function recorder() {
  const calls = [];
  const ctx = {
    save: () => calls.push('save'), restore: () => calls.push('restore'),
    translate: (...a) => calls.push(['translate', ...a]), scale: (...a) => calls.push(['scale', ...a]),
    drawImage: (...a) => calls.push(['drawImage', ...a.slice(1)]),
  };
  return { ctx, calls };
}

// Where drawFrame puts a frame's own pixel column u (0 at its left edge, w at its right), on the screen.
function columnOnScreen(calls, u) {
  const [, tx] = calls.find((c) => c[0] === 'translate');
  const [, sx] = calls.find((c) => c[0] === 'scale');
  const d = calls.find((c) => c[0] === 'drawImage');
  return tx + sx * (d[5] + u);
}

test('frames draw at their offset from the anchor', () => {
  const m = fixture();
  const { ctx, calls } = recorder();
  drawFrame(ctx, { manifest: m, images: { 'idle-side.png': {} } }, 'idle', 'side', 2, 100, 200, 2);
  const fr = m.clips.idle.facings.side.frames[2];
  assert.deepEqual(calls[3], ['drawImage', fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h]);
  for (const u of [0, 7, fr.w]) assert.equal(columnOnScreen(calls, u), 100 + (fr.offset[0] + u - 24) * 2);
  assert.deepEqual(calls[1], ['translate', 100 + (fr.offset[0] - 24) * 2, 200 + (fr.offset[1] - 36) * 2]);
});

test("mirroring uses x' = 2*ax - x about the anchor, for frames and sockets", () => {
  const m = fixture();
  m.anchor = [24.37, 36.5];                           // a continuous anchor, as the ground socket
  const { ctx, calls } = recorder();
  drawFrame(ctx, { manifest: m, images: { 'idle-side.png': {} } }, 'idle', 'side', 2, 100, 200, 2, true);
  const fr = m.clips.idle.facings.side.frames[2];
  assert.deepEqual(calls[2], ['scale', -2, 2]);
  for (const u of [0, 5, fr.w]) {
    const mirrored = mirrorX(m, fr.offset[0] + u);    // the cell x of column u after the mirror
    assert.ok(Math.abs(columnOnScreen(calls, u) - (100 + (mirrored - m.anchor[0]) * 2)) < 1e-9);
  }
  assert.equal(mirrorX(m, 21), 2 * 24.37 - 21);
  assert.deepEqual(socketInCell(m, 'idle', 'side', 2, 'head', { flipX: true }), [2 * 24.37 - 21, 12]);
  const [hx, hy] = socketAt(m, 'idle', 'side', 2, 'head', { scale: 2 });
  const [fx, fy] = socketAt(m, 'idle', 'side', 2, 'head', { scale: 2, flipX: true });
  assert.ok(Math.abs(fx + hx) < 1e-9 && fy === hy);
  // a socket on the anchor (the ground at the anchor frame) does not move when mirrored
  m.clips.idle.facings.side.frames[0].sockets.ground = [...m.anchor];
  assert.deepEqual(socketAt(m, 'idle', 'side', 0, 'ground', { flipX: true }), [0, 0]);
  assert.deepEqual(socketInCell(m, 'idle', 'side', 0, 'ground', { flipX: true }), m.anchor);
});

test('socket visibility per facing and the steady status bar', () => {
  const m = fixture();
  assert.equal(socketVisible(m, 'side', 'eye_r'), false);
  assert.equal(socketVisible(m, 'side', 'eye_l'), true);
  assert.equal(statusBarY(m, 'idle', 'side'), 3);
  assert.equal(statusBarY(m, 'sig.test', 'side'), null);
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
  assert.deepEqual(stalk.markers.map((e) => e.name), ['set', 'recover']);
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
  assert.deepEqual(events, ['set@600', 'recover@967']);
});

test('the Akinza atlas: anchor, mirror, scale, visibility, status bar and frame gaps', { skip: !existsSync(REAL) && 'atlas not built here' }, () => {
  const m = validateManifest(JSON.parse(readFileSync(REAL, 'utf8')));
  const { clip, frame, socket } = m.anchorFrom;
  assert.deepEqual(socketInCell(m, clip, 'side', frame, socket), m.anchor);
  assert.deepEqual(socketInCell(m, clip, 'side', frame, socket, { flipX: true }), m.anchor);
  assert.equal(m.mirror.formula, "x' = 2*ax - x");
  assert.equal(m.alpha, 'straight');
  assert.ok(m.scale.pixelsPerMeter > 0 && Math.abs(m.scale.pixelsPerMeter * m.scale.metersPerPixel - 1) < 1e-4);
  assert.equal(socketVisible(m, 'side', 'eye_r'), false);
  for (const s of m.sockets.filter((x) => x !== 'eye_r')) assert.equal(socketVisible(m, 'side', s), true);
  for (const [name, c] of Object.entries(m.clips)) {
    const bar = statusBarY(m, name, 'side');
    const side = c.facings.side;
    assert.ok(bar !== null && side.frames.every((f) => f.sockets.status[1] >= bar), name);
    const fr = side.frames;
    for (let i = 0; i < fr.length; i++) {
      for (let j = i + 1; j < fr.length; j++) {
        const a = fr[i], b = fr[j];
        const gx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
        const gy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
        assert.ok(Math.max(gx, gy) >= m.frameGapPx && m.frameGapPx >= 4, `${name} frames ${i} and ${j}`);
      }
    }
  }
});
