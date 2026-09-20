import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { drawFrame, frameIndexAt, markersBetween, validateManifest } from './atlas-player.mjs';

const catalog = JSON.parse(await readFile(new URL('../godot/catalog.json', import.meta.url)));

for (const species of Object.keys(catalog.species)) {
  for (const profile of Object.keys(catalog.profiles)) {
    test(`${species} ${profile} export stays usable by a generic canvas reader`, async () => {
      const suffix = profile === 'full' ? '' : `${profile}/`;
      const manifest = validateManifest(JSON.parse(await readFile(new URL(`../exports/${species}/${suffix}manifest.json`, import.meta.url))));
      for (const [name, clip] of Object.entries(manifest.clips)) {
        assert.equal(frameIndexAt(clip, 0), 0);
        assert.equal(frameIndexAt(clip, clip.duration_ms + 100), clip.loop ? Math.floor((clip.duration_ms + 100) * clip.fps / 1000) % clip.frames.length : clip.frames.length - 1);
        assert.ok(clip.frames.every((frame) => frame.w === manifest.canvas[0] && frame.h === manifest.canvas[1]));
        if (name !== 'idle') assert.ok(markersBetween(clip, 0, clip.duration_ms).length > 0);
      }
      const calls = [];
      const ctx = {
        save: () => calls.push('save'),
        translate: (...args) => calls.push(['translate', ...args]),
        scale: (...args) => calls.push(['scale', ...args]),
        drawImage: (...args) => calls.push(['drawImage', ...args]),
        restore: () => calls.push('restore'),
      };
      const images = Object.fromEntries(Object.values(manifest.clips).map((clip) => [clip.sheet, {}]));
      drawFrame(ctx, { manifest, images }, 'action', 560, 100, 200, 0.5, true);
      assert.deepEqual(calls[2], ['scale', -0.5, 0.5]);
      assert.equal(calls.at(-1), 'restore');
    });
  }
}

test('loop markers cross the seam once', () => {
  const clip = { fps: 10, loop: true, frames: Array(10).fill({}), markers: [{ name: 'beat', time_ms: 100 }] };
  assert.deepEqual(markersBetween(clip, 950, 1150).map((event) => event.at_ms), [1100]);
});
