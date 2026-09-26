import { expeditionVariation, SIGNAL_AVAILABLE, SIGNAL_READ, RELEASE_SIGNAL } from './fieldDiscovery';
import { applyMissionMemory, scanScene, resolveScene, methodOptions, encounterOptions } from './longReturnEngine';
import { MISSION, CREATURES } from './longReturnData';
import { crossingNarrative } from './crossingNarrative';

test('the departure sample can produce either an optional discovery or an ordinary crossing', () => {
  const samples = [0.2, 0.9];
  expect(expeditionVariation(() => samples.shift())).toEqual([SIGNAL_AVAILABLE]);
  expect(expeditionVariation(() => 0.8)).toEqual([]);
  expect(expeditionVariation(() => 0.35)).toEqual([SIGNAL_AVAILABLE, RELEASE_SIGNAL]);
});

test('preserving the archive unlocks a supported reservoir action with its own account', () => {
  const original = MISSION.scenes[5];
  const preserved = applyMissionMemory(original, ['archive-controls-preserved']);
  const collapsed = applyMissionMemory(original, ['archive-controls-lost']);
  const route = preserved.routes.find(entry => entry.id === 'harvest');
  const lead = CREATURES[2], support = CREATURES[0];
  const method = methodOptions(lead, route).find(entry => entry.narrativeMotion);
  expect(method).toBeTruthy();
  expect(collapsed.routes.find(entry => entry.id === 'harvest').methods.some(entry => entry.narrativeMotion)).toBe(false);
  expect(original.routes.find(entry => entry.id === 'harvest').methods.some(entry => entry.narrativeMotion)).toBe(false);
  const result = resolveScene({ scene: preserved, route, lead, support, method, scan: { revealedIds: ['charge-bloom'] } });
  expect(crossingNarrative({ scene: preserved, route, lead, support, method, result }).story).toContain('dry console');
});

test('the release instruction and the underdeck code are both needed for the learned rescue', () => {
  const archive = MISSION.scenes[2];
  const clue = [SIGNAL_AVAILABLE, SIGNAL_READ, RELEASE_SIGNAL];
  const options = flags => encounterOptions(applyMissionMemory(archive, flags), null, CREATURES.slice(0, 3), 'group');
  expect(options(clue).some(option => option.id === 'maintenance-release')).toBe(false);
  expect(options(['maintenance-codes']).some(option => option.id === 'maintenance-release')).toBe(false);
  expect(options([...clue, 'maintenance-codes']).some(option => option.id === 'maintenance-release')).toBe(true);
  expect(applyMissionMemory(MISSION.scenes[1], clue).knownHazardIds).toEqual([]);
});

test('reading the signal carries usable knowledge into the next crossing, without revealing unrelated hazards', () => {
  const hall = MISSION.scenes[1];
  expect(applyMissionMemory(hall, [SIGNAL_AVAILABLE]).knownHazardIds).toEqual([]);
  const remembered = applyMissionMemory(hall, [SIGNAL_AVAILABLE, SIGNAL_READ]);
  expect(remembered.knownHazardIds).toEqual(['servo-cycle']);
  expect(applyMissionMemory(MISSION.scenes[2], [SIGNAL_READ]).knownHazardIds).toEqual([]);
  const lead = CREATURES[1], support = CREATURES[0], route = remembered.routes[0];
  const method = methodOptions(lead, route, [])[0];
  const args = { scene: remembered, route, lead, support, method, useCommand: false };
  const uninformed = resolveScene({ ...args, scan: { revealedIds: [] } });
  const informed = resolveScene({ ...args, scan: { revealedIds: remembered.knownHazardIds } });
  expect(informed.unseenHazards).toEqual([]);
  expect(informed.pressure).toBe(uninformed.pressure - 1);
  expect(scanScene(remembered, CREATURES[2]).revealedIds).toContain('servo-cycle');
});
