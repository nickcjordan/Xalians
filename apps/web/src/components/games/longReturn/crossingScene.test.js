import { crossingScene } from './crossingScene';
import { MISSION } from './longReturnData';

const resolve = (route, changes = {}, method = route.methods[0]) => crossingScene({
  route, lead: { species: 'Hippochamp' }, support: { species: 'Graviclaw' }, method,
  result: { margin: 20, leadStrain: 0, supportStrain: 0, pressure: 0, salvage: 0, unseenHazards: [], ...changes }
});

test('all fourteen routes tell a complete scene for each supported method', () => {
  for (const scene of MISSION.scenes) for (const route of scene.routes) for (const method of route.methods) {
    const paragraphs = resolve(route, {}, method);
    expect(paragraphs).toHaveLength(4);
    expect(paragraphs.every(p => p.length > 50)).toBe(true);
    expect(paragraphs.join(' ')).not.toMatch(/undefined|support points|route target|cost breakdown/);
    expect(paragraphs[1]).toContain('Hippochamp');
    expect(paragraphs[1]).toContain('Graviclaw');
  }
});

test('brine appears during the action and the bypass is introduced through the physical outcome', () => {
  const scene = MISSION.scenes[0];
  const paragraphs = resolve(scene.routes[1], { unseenHazards: scene.hazards, leadStrain: 2, pressure: 2, salvage: 2 });
  expect(paragraphs[1]).toContain('A blue flash');
  expect(paragraphs[2]).toContain('shudder');
  expect(paragraphs[3]).toContain('Their wake draws frozen debris');
  expect(paragraphs[3]).toContain('a side channel built to carry cooling water');
  expect(paragraphs[3]).toContain('usable components');
});

test('known danger is anticipated, not rediscovered; costs and salvage are conditional', () => {
  const paragraphs = resolve(MISSION.scenes[0].routes[1]);
  expect(paragraphs[1]).toContain('danger the scout identified');
  expect(paragraphs.join(' ')).not.toMatch(/A blue flash|shudder|takes its toll|usable components/);
  expect(resolve(MISSION.scenes[0].routes[0]).join(' ')).not.toMatch(/brine|bypass/);
});

test('remote retrieval never describes the lead diving, and support effort follows resolution', () => {
  const route = MISSION.scenes[5].routes[1];
  const paragraphs = resolve(route, { supportStrain: 1 }, route.methods[1]);
  expect(paragraphs[1]).toContain('from the rim');
  expect(paragraphs[1]).not.toContain('dives');
  expect(paragraphs[2]).toContain('worn on Graviclaw');
});

test('non-destructive methods do not claim dismantling and arrival does not promise another choice', () => {
  const breach = MISSION.scenes[2].routes[1];
  expect(resolve(breach, {}, breach.methods[2])[3]).toContain('release finally answers');
  expect(resolve(breach, {}, breach.methods[2])[3]).not.toContain('displaced segments');
  const conduit = MISSION.scenes[3].routes[1];
  expect(resolve(conduit, {}, conduit.methods[2]).join(' ')).not.toMatch(/disassembles|brace gives way/);
  expect(resolve(MISSION.scenes[5].routes[0], { pressure: 10 }).join(' ')).not.toContain('still a choice');
});
