import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest, frameIndexAt } from '../creature-motion-pilot/runtime/atlas-player.mjs';

const root = dirname(fileURLToPath(import.meta.url));

for (const variant of ['cutout', 'hybrid', 'pixel', 'rendered3d', 'blender', 'blender2']) {
  test(`${variant} exports both motions through the generic reader`, () => {
    const folder = join(root, 'exports', variant);
    const manifest = validateManifest(JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8')));
    assert.equal(manifest.species, 'avilily');
    assert.deepEqual(manifest.canvas, [384, 384]);
    for (const clipName of ['idle', 'action']) {
      const clip = manifest.clips[clipName];
      assert.ok(clip.frames.length >= 12);
      assert.ok(existsSync(join(folder, clip.sheet)));
      assert.equal(clip.loop, clipName === 'idle');
      assert.equal(frameIndexAt(clip, 0), 0);
      assert.equal(frameIndexAt(clip, clip.duration_ms + 1), clip.loop ? 0 : clip.frames.length - 1);
    }
    assert.deepEqual(manifest.clips.action.markers.map((marker) => marker.name), ['bloom_open']);
    assert.ok(manifest.clips.action.markers[0].time_ms < manifest.clips.action.duration_ms);
  });
}

test('the second Blender pass keeps the shared stage contract and projects its own emitter', () => {
  const first = JSON.parse(readFileSync(join(root, 'exports', 'blender', 'manifest.json'), 'utf8'));
  const second = JSON.parse(readFileSync(join(root, 'exports', 'blender2', 'manifest.json'), 'utf8'));
  const meta = JSON.parse(readFileSync(join(root, 'rendered', 'avilily-pass2', 'meta.json'), 'utf8'));
  assert.deepEqual(second.origin, first.origin);
  assert.deepEqual(second.canvas, first.canvas);
  assert.equal(second.clips.action.frames.length, first.clips.action.frames.length);
  assert.equal(second.clips.action.duration_ms, first.clips.action.duration_ms);
  assert.deepEqual(second.emitter, meta.emitter);
  assert.equal(second.clips.action.markers[0].time_ms, meta.markers.bloom_open.time_ms);
  const [ex, ey] = second.emitter;
  assert.ok(ex > second.origin[0] && ey < second.origin[1], 'emitter sits ahead of and above the perch anchor');
});

test('the Bioflim metaball study exports through the same reader with its own cue', () => {
  const folder = join(root, 'exports', 'bioflim-blender');
  const manifest = validateManifest(JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8')));
  const meta = JSON.parse(readFileSync(join(root, 'rendered', 'bioflim', 'meta.json'), 'utf8'));
  assert.equal(manifest.species, 'bioflim');
  assert.deepEqual(manifest.canvas, [384, 384]);
  assert.deepEqual(manifest.origin, [192, 314]);
  for (const clipName of ['idle', 'action']) {
    const clip = manifest.clips[clipName];
    assert.ok(existsSync(join(folder, clip.sheet)));
    assert.equal(clip.loop, clipName === 'idle');
  }
  assert.equal(manifest.clips.action.frames.length, 30);
  assert.deepEqual(manifest.clips.action.markers.map((marker) => marker.name), ['reach_peak']);
  assert.equal(manifest.clips.action.markers[0].time_ms, meta.markers.reach_peak.time_ms);
  assert.deepEqual(manifest.emitter, meta.emitter);
});

for (const study of ['blender2', 'bioflim-blender', 'dromeus-blender', 'akinza-blender']) {
  test(`${study} carries reproducible provenance from its spec`, () => {
    const manifest = JSON.parse(readFileSync(join(root, 'exports', study, 'manifest.json'), 'utf8'));
    assert.ok(manifest.provenance, 'provenance block present');
    assert.match(manifest.provenance.blender, /^\d+\.\d+/);
    assert.match(manifest.provenance.spec_hash, /^[0-9a-f]{16}$/);
    assert.match(manifest.provenance.library_hash, /^[0-9a-f]{16}$/);
    assert.equal(typeof manifest.provenance.cycles_seed, 'number');
    assert.ok(manifest.template, 'template recorded');
    assert.ok(manifest.points && typeof manifest.points === 'object', 'projected points recorded');
  });
}

test('the Dromeus biped study exports through the same reader with a bite cue', () => {
  const folder = join(root, 'exports', 'dromeus-blender');
  const manifest = validateManifest(JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8')));
  assert.equal(manifest.species, 'dromeus');
  assert.equal(manifest.template, 'biped');
  assert.deepEqual(manifest.origin, [192, 314]);
  assert.equal(manifest.clips.action.frames.length, 30);
  assert.deepEqual(manifest.clips.action.markers.map((marker) => marker.name), ['bite']);
});

test('Akinza and Dromeus share the biped template and differ only by spec', () => {
  const akinza = JSON.parse(readFileSync(join(root, 'exports', 'akinza-blender', 'manifest.json'), 'utf8'));
  const dromeus = JSON.parse(readFileSync(join(root, 'exports', 'dromeus-blender', 'manifest.json'), 'utf8'));
  assert.equal(akinza.template, 'biped');
  assert.equal(akinza.provenance.library_hash, dromeus.provenance.library_hash, 'same library sources rendered both');
  assert.notEqual(akinza.provenance.spec_hash, dromeus.provenance.spec_hash);
  assert.deepEqual(akinza.clips.action.markers.map((marker) => marker.name), ['contact_pose']);
});
