import { buildActionSequence, eventIndexFor } from './actionSequence';
import { crossingScene } from './crossingScene';
import { MISSION } from './longReturnData';

const creature = (id, species) => ({ id, species });

test('turns a crossing result into causal, ordered beats', () => {
  const lead = creature('lead', 'Chromocat');
  const support = creature('support', 'Hippochamp');
  const events = buildActionSequence({ type: 'crossing', lead, support, method: { label: 'Leap the gap' }, result: {
    unseenHazards: [{ id: 'arc', label: 'Dormant arc' }], companionHelp: null,
    crewChanges: [{ creature: lead, added: 1, before: 0, after: 1 }, { creature: support, added: 0, before: 0, after: 0 }],
    instabilityChange: { added: 2, before: 0, after: 2 }, salvage: 1, salvageAfter: 1, impactLabel: 'Costly success'
  }});
  expect(events.map((event) => event.kind)).toEqual(['move', 'hazard', 'effort', 'complete']);
  expect(eventIndexFor(events, 'energy', 'lead')).toBe(2);
  expect(events[2].costs[0]).toMatchObject({ before: 6, after: 5, amount: 1 });
  expect(eventIndexFor(events, 'stability')).toBe(2);
  expect(eventIndexFor(events, 'salvage')).toBe(3);
  expect(eventIndexFor(events, 'energy', 'support')).toBe(-1);
});

test('encounter sequence reveals the native before returning control', () => {
  const events = buildActionSequence({ type: 'encounter', lead: creature('scout', 'Chromocat'), route: null, encounter: creature('native', 'Xylum') });
  expect(events.map((event) => event.kind)).toEqual(['move', 'encounter', 'decision']);
  expect(events[1].message).toContain('Xylum');
});

test('one-use expenditure follows the actual ability action and remains explicit', () => {
  const events = buildActionSequence({ type: 'crossing', lead: creature('lead','Chromocat'), method: { label:'Corona Line — Cut a path', ability:{name:'Corona Line',instrument:'light-organs'} }, result:{ abilityId:'beam', unseenHazards:[], crewChanges:[], instabilityChange:{added:0},salvage:0,impactLabel:'Done' } });
  expect(events.map(event=>event.kind)).toEqual(['move','method','effort','complete']);
  expect(events[0].message).toContain('light organs');
  expect(events[1].costs[0]).toMatchObject({ kind:'ability', abilityId:'beam' });
  expect(events[1].costs[0].text).toContain('rest of this expedition');
  expect(eventIndexFor(events, 'ability')).toBe(1);
});

test('a costly support intervention is visible even when the crew still forces passage', () => {
  const events=buildActionSequence({type:'crossing',lead:creature('lead','Graviclaw'),support:creature('support','Hippochamp'),method:{label:'Climb'},result:{supportStrain:1,supportHelp:null,unseenHazards:[],crewChanges:[],instabilityChange:{added:0},salvage:0,impactLabel:'Forced passage'}});
  expect(events[2]).toMatchObject({kind:'effort',supportId:'support'});
  expect(events[2].message).toContain('Hippochamp takes over part of the work');
});

test('credits crew support and a field companion as separate performers', () => {
  const lead = creature('lead', 'Chromocat');
  const support = creature('support', 'Hippochamp');
  const companion = creature('native', 'Xylum');
  const events = buildActionSequence({ type: 'crossing', lead, support, companion, method: { label: 'Leap the gap' }, result: {
    unseenHazards: [], supportHelp: 'Hippochamp makes the passage possible.', companionHelp: 'Xylum preserves 1 energy.',
    crewChanges: [{ creature: lead, added: 0, before: 0, after: 0 }, { creature: support, added: 0, before: 0, after: 0 }],
    instabilityChange: { added: 0, before: 0, after: 0 }, salvage: 0, salvageAfter: 0, impactLabel: 'Clean success'
  }});
  expect(events[2]).toMatchObject({ supportId: 'support', companionId: 'native' });
  expect(events[2].message).toContain('Hippochamp makes the passage possible.');
  expect(events[2].message).toContain('Xylum preserves 1 energy.');
});

test('annotates actual reserve loss, not an uncapped demanded cost', () => {
  const lead = creature('lead', 'Chromocat');
  const events = buildActionSequence({ type:'crossing', lead, method:{label:'Climb'}, result:{
    unseenHazards:[], crewChanges:[{creature:lead,added:5,before:5,after:6}],
    instabilityChange:{added:4,before:9,after:10},salvage:0,impactLabel:'Done'
  } });
  expect(events[2].costs.map(cost=>cost.amount)).toEqual([1,1]);
  expect(events[2].costs[0].text).toBe('Chromocat: −1 energy');
});

test('all route methods preserve the resolved scene and keep its arrival last', () => {
  const lead = creature('lead', 'Hippochamp');
  const support = creature('support', 'Graviclaw');
  for (const scene of MISSION.scenes) for (const route of scene.routes) for (const method of route.methods) {
    const result = { margin:20,leadStrain:1,supportStrain:0,pressure:1,salvage:1,salvageAfter:1,
      unseenHazards:scene.hazards.filter(hazard=>route.hazardIds?.includes(hazard.id)),
      crewChanges:[{creature:lead,added:1,before:0,after:1}],instabilityChange:{added:1,before:0,after:1} };
    result.paragraphs = crossingScene({ route, lead, support, method, result });
    const events = buildActionSequence({ type:'crossing',route,lead,support,method,result });
    expect(events.map(event=>event.message)).toEqual(result.paragraphs);
    expect(events.every(event=>event.title && event.icon)).toBe(true);
    expect(events.at(-1).kind).toBe('complete');
    expect(eventIndexFor(events,'salvage')).toBe(events.length-1);
  }
});
