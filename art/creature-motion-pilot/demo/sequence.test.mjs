import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { battleTiming, sampleBattle, READY_MS } from './sequence.mjs';

const creature = (species, markerMs, hitMs = 700) => ({ manifest: {
  species,
  clips: {
    action: { duration_ms: 1080, markers: [{ name: 'contact_pose', time_ms: markerMs }] },
    hit: { duration_ms: hitMs },
  },
} });

test('action marker controls the defender reaction', () => {
  const timing = battleTiming(creature('akinza', 560), creature('frackworm', 500));
  assert.equal(timing.impactMs, READY_MS + 560);
  assert.equal(sampleBattle(timing, READY_MS - 1).attackerClip, 'idle');
  assert.equal(sampleBattle(timing, READY_MS).attackerClip, 'action');
  assert.equal(sampleBattle(timing, timing.impactMs - 1).defenderClip, 'idle');
  const contact = sampleBattle(timing, timing.impactMs);
  assert.equal(contact.defenderClip, 'hit');
  assert.equal(contact.impacted, true);
  assert.equal(sampleBattle(timing, timing.durationMs).done, true);
});

test('later impact marker keeps the reaction aligned', () => {
  const early = battleTiming(creature('akinza', 560), creature('frackworm', 700));
  const late = battleTiming(creature('avilily', 600), creature('frackworm', 700));
  assert.equal(late.impactMs - early.impactMs, 40);
  assert.equal(sampleBattle(late, early.impactMs).defenderClip, 'idle');
});

test('every exported attacker and profile can cue a real defender', async () => {
  for (const profile of ['full', 'compact']) {
    const manifests = await Promise.all(['akinza', 'avilily', 'frackworm'].map(async (species) => {
      const suffix = profile === 'compact' ? '/compact' : '';
      const manifest = JSON.parse(await readFile(new URL(`../exports/${species}${suffix}/manifest.json`, import.meta.url)));
      return { manifest };
    }));
    for (let i = 0; i < manifests.length; i++) {
      const timing = battleTiming(manifests[i], manifests[(i + 1) % manifests.length]);
      assert.equal(sampleBattle(timing, timing.impactMs - 1).defenderClip, 'idle');
      assert.equal(sampleBattle(timing, timing.impactMs).defenderClip, 'hit');
    }
  }
});
