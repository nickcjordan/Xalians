import { CREATURES, MISSION, MAX_STRAIN } from './longReturnData';
import { encounterActor } from './encounterActor';

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
