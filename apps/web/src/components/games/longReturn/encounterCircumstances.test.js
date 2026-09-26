import { BEACON_LOOP } from './encounterCircumstances';
import { expeditionVariation } from './fieldDiscovery';
import { applyMissionMemory, encounterOptions } from './longReturnEngine';
import { MISSION, CREATURES } from './longReturnData';
import { encounterNarrative } from './longReturnGame';

test('native circumstances are sampled independently of the opening signal', () => {
  const samples = [0.8, 0.1, 0.9];
  expect(expeditionVariation(() => samples.shift())).toEqual([BEACON_LOOP]);
  expect(expeditionVariation(() => 0.9)).toEqual([]);
});

test('the saved gallery circumstance changes the contact, choices and outcome without changing creature facts', () => {
  const gallery = MISSION.scenes[3];
  const changed = applyMissionMemory(gallery, [BEACON_LOOP]);
  expect(gallery.encounter.archetype).toBe('territorial');
  expect(changed.encounter.firstContact).toContain('beacon');
  expect(changed.encounter.crewContact).toContain('beacon');
  expect(changed.encounter.disposition).not.toContain('defensive');
  expect(changed.arrival).not.toContain('territorial');
  expect(changed.encounter.creatureId).toBe(gallery.encounter.creatureId);
  expect(applyMissionMemory(gallery, [BEACON_LOOP]).encounter).toEqual(changed.encounter);
  const options = encounterOptions(changed, CREATURES[1], CREATURES.slice(0, 3));
  expect(options.map(option => option.id)).toEqual(['redirect-beacon', 'stop-beacon', 'withdraw']);
  const story = encounterNarrative({ archetype: 'beacon', option: options[0], nativeName: 'Ectoghoul', actorName: 'Chromocat' });
  expect(story).toContain('turns the beacon');
  expect(story).not.toMatch(/injury|bearing|crew enters|crossed/);
});
