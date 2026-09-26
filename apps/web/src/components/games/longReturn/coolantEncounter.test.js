import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import EncounterChoices from './EncounterChoices';
import { MISSION, CREATURES } from './longReturnData';
import { applyMissionMemory, encounterOptions, methodOptions } from './longReturnEngine';
import { COOLANT_HOLD } from './encounterCircumstances';
import { expeditionVariation } from './fieldDiscovery';
import { encounterNarrative } from './longReturnGame';
import { sceneOrientation } from './sceneOrientation';

const crew = CREATURES.slice(0, 3);
const scene = applyMissionMemory(MISSION.scenes[1], [COOLANT_HOLD]);
afterEach(cleanup);

test('encounter effort and exhaustion warnings name the creature actually doing the work', () => {
  const strain = { [crew[2].id]: 5 };
  const option = encounterOptions(scene, null, crew, 'group', true, strain).find(item => item.actorId === crew[2].id);
  render(<EncounterChoices options={[option]} actor={crew[0]} crew={crew} strain={strain} energyRemaining={6} storyFirst selectedId={option.id} />);
  expect(screen.getByRole('status').textContent).toContain("Hippochamp's remaining energy");
  expect(screen.getByText(/Hippochamp: 1 energy/)).toBeTruthy();
  expect(screen.queryByText(/Graviclaw: 1 energy/)).toBeNull();
});

test('the underdeck situation is sampled separately and preserves the original native facts', () => {
  const samples = [0.9, 0.9, 0.1];
  expect(expeditionVariation(() => samples.shift())).toEqual([COOLANT_HOLD]);
  expect(scene.encounter.creatureId).toBe(MISSION.scenes[1].encounter.creatureId);
  expect(scene.encounter.archetype).toBe('coolant');
  expect(MISSION.scenes[1].encounter.archetype).not.toBe('coolant');
});

test('support options require an available matching creature and respect spent wards', () => {
  const options = encounterOptions(scene, null, crew, 'group', true);
  const anchored = options.find(option => option.actorId === crew[0].id);
  const ward = options.find(option => option.actorId === crew[2].id);
  expect(anchored.abilityId).toBeUndefined();
  expect(ward.abilityId).toBe('hippo-ward');
  expect(options.some(option => option.actorId === crew[1].id)).toBe(false);
  const unavailable = encounterOptions(scene, null, crew, 'group', true, { [crew[0].id]: 6 }, ['hippo-ward']);
  expect(unavailable.map(option => option.id)).toEqual(['isolate-coolant', 'detour']);
  const alone = encounterOptions(scene, crew[1], crew, 'scout');
  expect(alone.some(option => option.companion)).toBe(false);
  expect(alone.map(option => option.id)).toEqual(['isolate-coolant', 'withdraw']);
});

test('isolating the line opens a door action while supporting it earns a companion', () => {
  const options = encounterOptions(scene, null, crew, 'group', true);
  const support = options.find(option => option.companion);
  const valve = options.find(option => option.id === 'isolate-coolant');
  const archive = applyMissionMemory(MISSION.scenes[2], [valve.worldFlag]);
  const release = methodOptions(crew[2], archive.routes[1]).find(method => method.memoryId === 'depressurized-release');
  expect(release).toBeTruthy();
  expect(applyMissionMemory(MISSION.scenes[2], [support.worldFlag]).routes[1].methods.some(method => method.memoryId === 'depressurized-release')).toBe(false);
  expect(sceneOrientation(archive, [valve.worldFlag])).toContain('gauge beside its cracked plate has fallen to zero');
  const story = encounterNarrative({ archetype: 'coolant', option: support, actorName: 'Graviclaw', nativeName: 'Xylum', mode: 'group' });
  expect(story).toContain('locking collar');
  expect(story).not.toMatch(/injury|medic|treatment|crew crosses/);
  expect(encounterNarrative({ archetype: 'coolant', option: valve, actorName: 'Chromocat', nativeName: 'Xylum' })).toContain('door still needs opening');
});
