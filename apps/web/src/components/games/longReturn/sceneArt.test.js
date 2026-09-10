import { describe, expect, test } from 'vitest';
import { MISSION } from './longReturnData';
import { BRIEFING_ART, SCENE_ART, sceneArtFor } from './sceneArt';

describe('Long Return scene artwork', () => {
  test('gives every mission scene a distinct environment plate', () => {
    const sources = MISSION.scenes.map((scene) => sceneArtFor(scene).src);
    expect(Object.keys(SCENE_ART)).toHaveLength(MISSION.scenes.length);
    expect(new Set(sources).size).toBe(MISSION.scenes.length);
    sources.forEach((source) => expect(source).toMatch(/\/assets\/img\/games\/long-return\/.*\.webp$/));
  });

  test('keeps the briefing console separate from room artwork', () => {
    expect(BRIEFING_ART).not.toBe(sceneArtFor(MISSION.scenes[0]).src);
  });

  test('falls back to a playable environment when scene art metadata is unavailable', () => {
    expect(sceneArtFor(null)).toBe(SCENE_ART['service-throat']);
    expect(sceneArtFor({ id: 'missing-environment' })).toBe(SCENE_ART['service-throat']);
  });
});
