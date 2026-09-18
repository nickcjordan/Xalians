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

test('both machinery passages arrive at the next door and show how their consequence arises', () => {
  const [catwalk, underdeck] = MISSION.scenes[1].routes;
  expect(resolve(catwalk)[3]).toContain('locking ring draws tight');
  expect(resolve(catwalk)[3]).not.toContain('copies');
  expect(resolve(underdeck)[3]).toContain('same shapes appear on the door');
  expect(resolve(underdeck)[3]).not.toContain('sensor lights up');
});

test('both Index recoveries identify the record without confusing it with loose salvage', () => {
  const [plates, backup] = MISSION.scenes[4].routes;
  expect(resolve(plates)[3]).toContain('surviving record of the plague research');
  expect(resolve(plates)[3]).toContain('bring home');
  expect(resolve(backup)[3]).toContain('sealed backup');
  expect(resolve(backup)[3]).toContain('Nemesis Index');
});

test('the later crossings leave the crew at the same physical thresholds used by the next rooms', () => {
  const [hull, conduit] = MISSION.scenes[3].routes;
  expect(resolve(hull)[3]).toContain('airlock admits them one at a time');
  expect(resolve(hull)[3]).toContain('wavering light spills from the archive');
  expect(resolve(conduit)[3]).toContain('Wavering light spills across its threshold');

  for (const route of MISSION.scenes[4].routes) {
    const arrival = resolve(route)[3];
    expect(arrival).toContain('junction');
    expect(arrival).toContain('return route');
    expect(arrival).toContain('service stair');
    expect(arrival).not.toContain('the crew chooses to descend');
  }
  for (const route of MISSION.scenes[5].routes) {
    const arrival = resolve(route)[3];
    expect(arrival).toContain('junction with the return route');
    expect(arrival).toContain('Generator Spine');
  }
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
  const pressured = resolve(breach, { pressure: 2 }, breach.methods[2]).join(' ');
  expect(pressured).toContain('old release strains');
  expect(pressured).not.toMatch(/displaced iris|displaced segments/);
  const conduit = MISSION.scenes[3].routes[1];
  expect(resolve(conduit, {}, conduit.methods[2]).join(' ')).not.toMatch(/disassembles|brace gives way/);
  expect(resolve(MISSION.scenes[5].routes[0], { pressure: 10 }).join(' ')).not.toContain('still a choice');
});

test('confirmed environment and decisive support explain effort without numeric analysis', () => {
  const route = MISSION.scenes[5].routes[1];
  const result = { leadStrain: 2, rawMethodScore: route.difficulty - 2, margin: 4, environment: { strain: 1, notes: ['must cross the liquid without breathing'] } };
  const story = resolve(route, result).join(' ');
  expect(story).toContain('no breath to take');
  expect(story).toContain('Graviclaw coordinating the others');
  expect(story).not.toMatch(/support points|team score/);
  expect(resolve(route, { ...result, leadStrain: 0 }).join(' ')).not.toContain('no breath to take');
  expect(resolve(route, { ...result, rawMethodScore: route.difficulty + 20 }).join(' ')).not.toContain('instead of forcing');
});
