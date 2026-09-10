import { describe, expect, test } from 'vitest';
import { MISSION } from './longReturnData';
import { applyMissionMemory } from './longReturnEngine';
import { ROUTE_VISUALS, routeVisualFor, visibleWorldFlags } from './routeVisuals';

describe('Long Return route visualization', () => {
  test('maps every route to a visual path and action icon', () => {
    const routes = MISSION.scenes.flatMap((scene) => scene.routes);
    expect(Object.keys(ROUTE_VISUALS)).toHaveLength(routes.length);
    routes.forEach((route) => {
      const visual = routeVisualFor(route);
      expect(visual.verb).toBeTruthy();
      expect(['upper', 'lower', 'center', 'edge']).toContain(visual.lane);
      expect(visual.icon).toMatch(/^bi-/);
    });
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
