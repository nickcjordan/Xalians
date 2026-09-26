import { CREATURES, MISSION } from './longReturnData';
import { applyMissionMemory, methodOptions, decisionForecast, resolveScene } from './longReturnEngine';
import { crossingNarrative } from './crossingNarrative';

test('the recovered cell holds back ring closure instead of merely renaming manual alignment', () => {
  const scene = applyMissionMemory(MISSION.scenes[6], ['reservoir-cell-recovered']);
  const route = scene.routes.find(item => item.id === 'align');
  const lead = CREATURES[2], support = CREATURES[1];
  const options = methodOptions(lead, route);
  const powered = options.find(method => method.memoryId === 'powered-ring-controls');
  const manual = options.find(method => method.kind === 'attribute' && !method.memoryId);
  const args = { scene, route, lead, support, scan: { revealedIds: [] } };
  const forecast = decisionForecast({ ...args, method: powered });
  const result = resolveScene({ ...args, method: powered });
  const ordinary = resolveScene({ ...args, method: manual });
  expect(forecast.unresolvedHazards).toEqual([]);
  expect(result.unseenHazards).toEqual([]);
  expect(ordinary.unseenHazards.map(hazard => hazard.id)).toEqual(['ring-closure']);
  expect(result.difficulty).toBe(forecast.difficulty);
  expect(result.difficulty).toBeLessThan(ordinary.difficulty);
  expect(result.quality).toBe(forecast.quality);
  expect(result.environment).toEqual(ordinary.environment);
  expect(result.pressure).toBeLessThan(ordinary.pressure);
  const story = crossingNarrative({ ...args, method: powered, result }).story;
  expect(story).toContain('bringing the rings into alignment while the crew lifts the core clear');
  expect(story).not.toMatch(/closing early|wrong order|timing learned earlier/);
  expect(methodOptions(lead, MISSION.scenes[6].routes[0]).some(method => method.memoryId === 'powered-ring-controls')).toBe(false);
});
