import { CREATURES, MISSION } from './longReturnData';
import { applyMissionMemory, methodOptions, resolveScene, scanScene } from './longReturnEngine';
import { crossingNarrative } from './crossingNarrative';
import { sceneOrientation } from './sceneOrientation';
import { expeditionMemories } from './ExpeditionEpilogue';

const spine = MISSION.scenes[6];
const lead = CREATURES[2], support = CREATURES[0];

test('draining the collectors carries specific knowledge into either final recovery', () => {
  const flag = MISSION.scenes[5].routes[0].consequence.id;
  const remembered = applyMissionMemory(spine, [flag]);
  expect(remembered.knownHazardIds).toEqual(['ring-closure']);
  expect(scanScene(remembered, lead).revealedIds).toContain('ring-closure');
  expect(applyMissionMemory(MISSION.scenes[4], [flag]).knownHazardIds).toEqual([]);
  expect(remembered.routes.flatMap(route => route.methods).some(method => method.memoryId === 'powered-ring-controls')).toBe(false);
  expect(sceneOrientation(remembered, [flag])).toContain('inner ring closes three seconds');
});

test('the intact cell opens a different action without automatically revealing ring timing', () => {
  const flag = MISSION.scenes[5].routes[1].consequence.id;
  const powered = applyMissionMemory(spine, [flag]);
  const route = powered.routes[0];
  const method = methodOptions(lead, route).find(option => option.memoryId === 'powered-ring-controls');
  expect(method).toBeTruthy();
  expect(powered.knownHazardIds).toEqual([]);
  expect(spine.routes[0].methods.some(option => option.memoryId)).toBe(false);
  const result = resolveScene({ scene: powered, route, lead, support, method, scan: { revealedIds: [] } });
  expect(result.unseenHazards).toEqual([]);
  const story = crossingNarrative({ scene: powered, route, lead, support, method, result }).story;
  expect(story).toContain('cell recovered from the reservoir');
  expect(story).toContain('service controls');
  expect(sceneOrientation(powered, [flag])).toContain('cell you recovered');
});

test.each([0, 1])('reservoir recovery %i announces its actual discovery in the crossing account', index => {
  const scene = MISSION.scenes[5], route = scene.routes[index];
  const method = methodOptions(lead, route)[0];
  const result = resolveScene({ scene, route, lead, support, method, scan: { revealedIds: ['charge-bloom'] } });
  const story = crossingNarrative({ scene, route, lead, support, method, result }).story;
  expect(story).toContain(route.consequence.detail);
});

test('the ending distinguishes carrying a discovery from actually using it in the spine', () => {
  const flags = ['reservoir-cell-recovered'];
  expect(expeditionMemories([{ id: 'core-reservoir' }], flags, null)).toEqual([]);
  expect(expeditionMemories([{ id: 'generator-spine', methodMemoryId: 'powered-ring-controls' }], flags, null).map(memory => memory.id)).toEqual(['service-cell']);
  expect(expeditionMemories([{ id: 'generator-spine' }], ['reservoir-timing-diagram'], null).map(memory => memory.id)).toEqual(['ring-diagram']);
});
