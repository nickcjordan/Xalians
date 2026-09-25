import { CREATURES, MISSION } from './longReturnData';
import { applyMissionMemory, methodOptions, resolveScene, encounterOptions } from './longReturnEngine';
import { crossingNarrative } from './crossingNarrative';
import { SERVICE_LINE } from './crossingFinds';
import { COOLANT_HOLD } from './encounterCircumstances';

const scene = MISSION.scenes[0], route = scene.routes[0];
const cross = (lead, key) => {
  const support = CREATURES[0];
  const method = methodOptions(lead, route).find(option => option.key === key);
  const result = resolveScene({ scene, route, lead, support, method, scan: { revealedIds: [] } });
  return { result, story: crossingNarrative({ scene, route, lead, support, method, result }).story };
};

test('climbing can recover a physical tool that leaping along the same route does not', () => {
  const climb = cross(CREATURES[1], 'climb');
  expect(climb.result.find.id).toBe(SERVICE_LINE);
  expect(climb.story).toContain('carry it across');
  expect(cross(CREATURES[1], 'leap').result.find).toBeNull();
  const rough = cross(CREATURES[2], 'climb');
  expect(rough.result.quality).toBe('critical');
  expect(rough.result.find.id).toBe('gantry-line-broken');
  expect(rough.story).toContain('snaps');
});

test.each([{ circumstance: [] }, { circumstance: [COOLANT_HOLD] }])('the recovered tool changes the actual underdeck response for circumstance $circumstance', ({ circumstance }) => {
  const original = applyMissionMemory(MISSION.scenes[1], circumstance);
  const remembered = applyMissionMemory(MISSION.scenes[1], [...circumstance, SERVICE_LINE]);
  const options = encounterOptions(remembered, null, CREATURES.slice(0, 3), 'group');
  const tool = options.find(option => option.consumesFlag === SERVICE_LINE);
  expect(tool.id).toBe(circumstance.length ? 'lash-sleeve' : 'lift-bearing');
  expect(tool.companion).toBe(!!circumstance.length);
  expect(encounterOptions(original, null, CREATURES.slice(0, 3), 'group').some(option => option.consumesFlag)).toBe(false);
  expect(encounterOptions(remembered, CREATURES[1], CREATURES.slice(0, 3), 'scout').some(option => option.consumesFlag)).toBe(false);
});
