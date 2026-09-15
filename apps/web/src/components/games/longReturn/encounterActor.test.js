import { CREATURES, MISSION, MAX_STRAIN } from './longReturnData';
import { encounterActor } from './encounterActor';
import { encounterOptions } from './longReturnEngine';

test('group responses never select the spent strongest defender', () => {
  const crew = CREATURES.slice(0, 3);
  for (const scene of MISSION.scenes) {
    const strongest = encounterActor(scene, crew, {}, null);
    const next = encounterActor(scene, crew, { [strongest.id]: MAX_STRAIN }, null);
    expect(next).toBeTruthy();
    expect(next.id).not.toBe(strongest.id);
    expect(crew).toEqual(CREATURES.slice(0, 3));
  }
});

test('solo contact keeps the scout, and an exhausted group has no actor', () => {
  const crew = CREATURES.slice(0, 3);
  const strain = Object.fromEntries(crew.map(member => [member.id, MAX_STRAIN]));
  expect(encounterActor(MISSION.scenes[1], crew, strain, crew[1])).toBe(crew[1]);
  expect(encounterActor(MISSION.scenes[1], crew, strain, null)).toBeNull();
});

test('aid names its actual helper by ID and excludes spent medics', () => {
  const scene = MISSION.scenes[1];
  const medics = CREATURES.filter(c => c.traits.includes('healing') || c.abilities.some(a => a.action === 'mend'));
  const scout = CREATURES.find(c => !medics.includes(c));
  const crew = [scout, ...medics];
  const option = encounterOptions(scene, null, crew, 'group').find(o => o.id === 'aid');
  expect(option.helperId).toBe(medics[0].id);
  const renamed = { ...option, label: 'Offer help' };
  expect(crew.find(c => c.id === renamed.helperId)).toBe(medics[0]);
  const exhausted = Object.fromEntries(medics.map(c => [c.id, MAX_STRAIN]));
  expect(encounterOptions(scene, null, crew, 'group', false, exhausted).some(o => o.companion)).toBe(false);
  const solo = encounterOptions(scene, medics[0], crew, 'scout').find(o => o.id === 'aid');
  expect(solo.helperId).toBe(medics[0].id);
  expect(encounterOptions(scene, scout, crew, 'scout').filter(o => o.companion).every(o => o.helperId === medics[0].id)).toBe(true);
});
