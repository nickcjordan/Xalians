import { buildEncounterResolutionSequence, encounterEventIndex } from './encounterSequence';

const creature = (id, species) => ({ id, species });
const base = { scene: { deck: 'ACCESS 02' }, actor: creature('scout', 'Chromocat'), affected: creature('scout', 'Chromocat'), native: creature('native', 'Xylum') };

test('orders a costly encounter response from action through consequence', () => {
  const events = buildEncounterResolutionSequence({ ...base, option: { id: 'hold', label: 'Hold ground', scoutStrain: 2, instability: 2, resolution: 'cleared' } });
  expect(events.map((event) => event.kind)).toEqual(['response', 'energy', 'stability', 'clear']);
  expect(encounterEventIndex(events, 'stability')).toBe(2);
});

test('makes preserved resources an explicit beat', () => {
  const events = buildEncounterResolutionSequence({ ...base, option: { id: 'withdraw', label: 'Withdraw', resolution: 'unresolved' } });
  expect(events.map((event) => event.kind)).toEqual(['response', 'preserve', 'warning']);
});

test('ends a successful aid response with the companion joining', () => {
  const events = buildEncounterResolutionSequence({ ...base, option: { id: 'aid', label: 'Treat injury', companion: true, instability: 1, resolution: 'befriended' } });
  expect(events.map((event) => event.kind)).toEqual(['response', 'stability', 'companion']);
});
