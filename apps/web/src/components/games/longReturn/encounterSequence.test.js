import { buildEncounterResolutionSequence, encounterEventIndex } from './encounterSequence';

const creature = (id, species) => ({ id, species });
const base = { scene: { deck: 'ACCESS 02' }, actor: creature('scout', 'Chromocat'), affected: creature('scout', 'Chromocat'), native: creature('native', 'Xylum'),energyBefore:6,energyAfter:6,stabilityBefore:10,stabilityAfter:10 };

test('orders a costly encounter response from action through consequence', () => {
  const events = buildEncounterResolutionSequence({ ...base,energyAfter:4,stabilityAfter:8, option: { id: 'hold', label: 'Hold ground', scoutStrain: 2, instability: 2, resolution: 'cleared' } });
  expect(events.map((event) => event.kind)).toEqual(['response', 'clear']);
  expect(encounterEventIndex(events, 'stability')).toBe(0);
  expect(events[0].costs.map(cost=>cost.amount)).toEqual([2,2]);
});

test('does not interrupt an uneventful withdrawal with a zero-cost notification', () => {
  const events = buildEncounterResolutionSequence({ ...base, option: { id: 'withdraw', label: 'Withdraw', resolution: 'unresolved' } });
  expect(events.map((event) => event.kind)).toEqual(['response', 'warning']);
  expect(events[0].costs).toEqual([]);
  expect(encounterEventIndex(events,'energy')).toBe(-1);
});

test('ends a successful aid response with the companion joining', () => {
  const events = buildEncounterResolutionSequence({ ...base,stabilityAfter:9, option: { id: 'aid', label: 'Treat injury', companion: true, instability: 1, resolution: 'befriended' } });
  expect(events.map((event) => event.kind)).toEqual(['response', 'companion']);
  expect(events[0].costs[0]).toMatchObject({kind:'stability',amount:1});
});

test('keeps the resolved narrative intact and distinguishes helper from the creature paying', () => {
  const events = buildEncounterResolutionSequence({ ...base, actor:creature('helper','Hippochamp'),energyBefore:1,energyAfter:0,
    result:{narrative:'Hippochamp follows the call. Chromocat is exhausted from the extra trip.\n\nXylum follows them out.'},
    option:{label:'Call for help',companion:true,scoutStrain:3,resolution:'befriended'} });
  expect(events.map(event=>event.message)).toEqual(['Hippochamp follows the call. Chromocat is exhausted from the extra trip.','Xylum follows them out.']);
  expect(events[0].actorId).toBe('helper');
  expect(events[0].costs[0]).toMatchObject({creatureId:'scout',amount:1,text:'Chromocat: −1 energy'});
});
