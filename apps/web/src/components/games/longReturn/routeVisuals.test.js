import { describe, expect, test } from 'vitest';
import { MISSION } from './longReturnData';
import { applyMissionMemory } from './longReturnEngine';
import { visibleWorldFlags, routeMemory, consequencePreview } from './routeVisuals';

describe('Long Return route visualization', () => {
  test('future choices name the affected approach and whether it becomes easier or harder', () => {
    expect(MISSION.scenes[0].routes.map(consequencePreview)).toEqual(['Easier upper walkway', 'Easier lower passage']);
    expect(MISSION.scenes[1].routes.map(consequencePreview)).toEqual(['Door harder to force', 'Door easier to unlock']);
  });

  test('a route remembers only a known consequence actually applied by the engine', () => {
    const effects = [
      ['quiet-entry', 1, 'catwalk', -5, 'Quiet upper walkway'],
      ['coolant-bypass', 1, 'underdeck', -4, 'Drained lower passage'],
      ['maintenance-codes', 2, 'decode', -6, 'Controls with a code'],
      ['security-pulse', 2, 'breach', 5, 'Tightened door seam']
    ];
    for (const [flag, sceneIndex, routeId, difficulty, mapLabel] of effects) {
      const scene = applyMissionMemory(MISSION.scenes[sceneIndex], [flag]);
      const route = scene.routes.find(route => route.id === routeId);
      expect(routeMemory(route, [flag])).toMatchObject({flag,difficulty,mapLabel});
      expect(routeMemory(route, [])).toBeNull();
      expect(routeMemory(MISSION.scenes[sceneIndex].routes.find(route => route.id === routeId), [flag])).toBeNull();
      expect(routeMemory(scene.routes.find(route => route.id !== routeId), [flag])).toBeNull();
    }
  });
  test('shows only consequences relevant to the current scene', () => {
    const first = MISSION.scenes[0];
    const second = MISSION.scenes[1];
    expect(visibleWorldFlags(first, ['quiet-entry']).map((flag) => flag.id)).toEqual(['quiet-entry']);
    expect(visibleWorldFlags(second, ['quiet-entry']).map((flag) => flag.id)).toEqual([]);
  });

  test('gives every persistent route consequence a visual state in its source and affected scene', () => {
    const consequences = MISSION.scenes.flatMap((scene, sourceIndex) => scene.routes
      .filter((route) => route.consequence)
      .map((route) => ({ sourceIndex, consequence: route.consequence })));
    consequences.forEach(({ sourceIndex, consequence }) => {
      expect(visibleWorldFlags(MISSION.scenes[sourceIndex], [consequence.id]).map((flag) => flag.id)).toContain(consequence.id);
      const laterScenes = MISSION.scenes.slice(sourceIndex + 1).map((scene) => applyMissionMemory(scene, [consequence.id]));
      expect(laterScenes.some((scene) => visibleWorldFlags(scene, [consequence.id]).some((flag) => flag.id === consequence.id))).toBe(true);
    });
  });
});
