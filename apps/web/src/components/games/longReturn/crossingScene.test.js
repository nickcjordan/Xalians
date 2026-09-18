import { crossingScene } from './crossingScene';
import { MISSION } from './longReturnData';
import { arrivalRecap } from './ArrivalStory';

const resolve = (route, changes = {}, method = route.methods[0], context = {}) => crossingScene({
  route, lead: { species: 'Hippochamp' }, support: { species: 'Graviclaw' }, method,
  result: { margin: 20, leadStrain: 0, supportStrain: 0, pressure: 0, salvage: 0, unseenHazards: [], ...changes }, ...context
});

test('a remote scout is physically reunited with the crew before crossing, in every room', () => {
  for (const scene of MISSION.scenes) for (const route of scene.routes) {
    const [opening] = resolve(route, {}, undefined, { scene, scoutAhead: { species: 'Chromocat' } });
    expect(opening, `${scene.id}/${route.id}`).toMatch(/Chromocat waits .*\. The crew catches up; all three are together before the next move\./);
    expect(opening).not.toMatch(/undefined|a short way ahead/);
    expect(resolve(route)[0]).not.toContain('crew catches up');
  }
});

test('all fourteen routes tell a complete scene for each supported method', () => {
  for (const scene of MISSION.scenes) for (const route of scene.routes) for (const method of route.methods) {
    const paragraphs = resolve(route, {}, method);
    expect(paragraphs).toHaveLength(4);
    expect(paragraphs.every(p => p.length > 50)).toBe(true);
    expect(paragraphs.join(' ')).not.toMatch(/undefined|support points|route target|cost breakdown/);
    expect(paragraphs[1]).toContain('Hippochamp');
    expect(paragraphs[1]).toContain('Graviclaw');
    const recap = arrivalRecap(paragraphs);
    expect(recap.headline.length).toBeGreaterThan(15);
    expect(paragraphs[3]).toBe(`${recap.headline}${recap.detail ? ` ${recap.detail}` : ''}`);
  }
});

test('brine appears during the action and the bypass is introduced through the physical outcome', () => {
  const scene = MISSION.scenes[0];
  const paragraphs = resolve(scene.routes[1], { unseenHazards: scene.hazards, leadStrain: 2, pressure: 2, salvage: 2 });
  expect(paragraphs[1]).toContain('A blue flash');
  expect(paragraphs[2]).toContain('shudder');
  expect(paragraphs[2]).toContain('surge races into submerged cabling');
  expect(paragraphs[2]).not.toContain('flood tugs at the loosened wreckage');
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

test('costly crossings use the chosen passage for their effort instead of repeating a generic cost announcement', () => {
  for (const scene of MISSION.scenes) for (const route of scene.routes) {
    const effort = resolve(route, { leadStrain: 1 })[2];
    expect(effort, `${scene.id}/${route.id}`).toContain('Hippochamp');
    expect(effort).not.toContain('By the time the work is done');
    expect(effort).not.toContain('effort has taken its toll');
  }
});

test('elemental vulnerability is pictured in the passage rather than announced as a stat', () => {
  const expected = {
    electric: 'Charge flickers across the old machinery', psychic: "lock's repeating signal presses",
    chemical: 'sharp trace from the damaged archive', metal: 'old metal fights Hippochamp',
    ice: 'Frost grips the passage', dark: 'broken hull', light: 'Light flashes through the turning rings'
  };
  for (const scene of MISSION.scenes) for (const route of scene.routes) {
    const text = resolve(route, { leadStrain: 1, environment: { notes: ['is highly exposed to the element'] } })[2];
    const clue = route.id === 'intake' ? 'Charge snaps through the flooded wreckage'
      : route.id === 'dive' ? 'Charge flickers around the submerged cell' : expected[route.environment.element];
    expect(text, `${scene.id}/${route.id}`).toContain(clue);
    expect(text).not.toContain('exposure bears particularly hard');
  }
});

test('a rim-side retrieval never describes electric exposure as crossing a channel or entering the water', () => {
  const route = MISSION.scenes[5].routes[1];
  const snare = route.methods.find(method => method.key === 'snare');
  const paragraphs = resolve(route, { leadStrain: 1, environment: { notes: ['is highly exposed to Electric'] } }, snare);
  expect(paragraphs[1]).toContain('from the rim');
  expect(paragraphs[2]).toContain('around the submerged cell');
  expect(paragraphs[2]).not.toMatch(/through the water|toward the far side/);
});

test('temperature cost describes effort without inventing a passage through a stationary work site', () => {
  for (const scene of MISSION.scenes) for (const route of scene.routes) {
    const text = resolve(route, { leadStrain: 1, environment: { notes: ['operates outside its normal temperature band'] } })[2];
    expect(text, `${scene.id}/${route.id}`).toContain(route.environment.temperatureC < 0 ? 'The cold stiffens' : 'The heat bears down');
    expect(text).not.toContain('passage advances');
  }
});

test('stability prose distinguishes ordinary route wear from an unseen hazard and uncontrolled reaction', () => {
  const intake = MISSION.scenes[0].routes[1];
  const hazard = MISSION.scenes[0].hazards[0];
  const unseen = resolve(intake, { pressure: 2, reactionControlled: true, unseenHazards: [hazard] })[2];
  expect(unseen).toContain('surge races into submerged cabling');
  expect(unseen).not.toContain('flood tugs');
  const uncontrolled = resolve(intake, { pressure: 1, reactionControlled: false })[2];
  expect(uncontrolled).toContain('flood tugs at the loosened wreckage');
  expect(uncontrolled).not.toContain('submerged cabling');

  const catwalk = MISSION.scenes[1].routes[0];
  const mixed = resolve(catwalk, { pressure: 2, reactionControlled: true, unseenHazards: [MISSION.scenes[1].hazards[0]] })[2];
  expect(mixed).toContain('waking machinery sends a tremor');
  expect(mixed).toContain('unexpected rotation jolts its mountings');
});

test('every unseen stability hazard has a physical consequence on its affected routes', () => {
  const consequence = {
    'conductive-brine': 'submerged cabling', 'servo-cycle': 'rotation jolts', countermeasure: 'arms against their frame',
    'void-shear': 'debris strikes a hull seam', 'plague-dust': 'containment frame shudders',
    'charge-bloom': 'discharge kicks through', 'ring-closure': 'closure slams a new load'
  };
  for (const scene of MISSION.scenes) for (const hazard of scene.hazards) {
    for (const route of scene.routes.filter(entry => entry.hazardIds.includes(hazard.id))) {
      const text = resolve(route, { pressure: route.pressure + hazard.pressure, reactionControlled: true, unseenHazards: [hazard] })[2];
      expect(text, `${scene.id}/${route.id}/${hazard.id}`).toContain(consequence[hazard.id]);
    }
  }
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
