import { CREATURES } from './longReturnData';
import { fieldOptions, performFieldOperation, fieldWorkStory } from './fieldOperations';

const crew = CREATURES.slice(0, 3);
const state = (overrides = {}) => ({ crew, strain: { [crew[0].id]: 3 }, pressure: 5, salvage: 5, used: false, ...overrides });

test('every field action has a persistent physical account tied to its performer and sacrifice', () => {
  const options = fieldOptions(state({ commands: 1 }));
  expect(new Set(options.map(option => option.kind))).toEqual(new Set(['recover', 'brace', 'command']));
  options.forEach(option => {
    const story = fieldWorkStory(option);
    expect(story).toContain(option.creature.species);
    expect(story).not.toMatch(/undefined|NaN/);
    if (option.kind === 'recover') expect(story).toContain('will not be coming out as salvage');
    if (option.kind === 'brace') expect(story).toContain('remaining strength');
    if (option.kind === 'command') expect(story).toContain('effort as well as parts');
  });
});

test('recovery spends loot, restores energy, and prevents a second field action', () => {
  const next = performFieldOperation(state(), `recover-${crew[0].id}`);
  expect(next.strain[crew[0].id]).toBe(1);
  expect(next.salvage).toBe(3);
  expect(next.pressure).toBe(5);
  expect(performFieldOperation(next, `recover-${crew[0].id}`)).toBeNull();
});
test('bracing trades engineering effort and salvage for stability', () => {
  const next = performFieldOperation(state(), `brace-${crew[0].id}`);
  expect(next.pressure).toBe(3);
  expect(next.strain[crew[0].id]).toBe(4);
  expect(next.salvage).toBe(2);
  expect(fieldOptions(state()).some(option => option.id === `brace-${crew[1].id}`)).toBe(false);
});
test('resource bounds, budgets and forced extraction are enforced', () => {
  const next = performFieldOperation(state({ strain: { [crew[0].id]: 1 } }), `recover-${crew[0].id}`);
  expect(next.strain[crew[0].id]).toBe(0);
  expect(next.option.energy).toBe(-1);
  expect(performFieldOperation(state({ salvage: 1 }), `recover-${crew[0].id}`)).toBeNull();
  expect(fieldOptions(state({ pressure: 10 }))).toEqual([]);
  expect(fieldOptions(state({ strain: { [crew[0].id]: 6, [crew[1].id]: 6 } }))).toEqual([]);
  expect(fieldOptions(state({ strain: { [crew[0].id]: 6 } })).some(option => option.creature.id === crew[0].id)).toBe(false);
  expect(performFieldOperation(state({ pressure: 1 }), `brace-${crew[0].id}`).pressure).toBe(0);
});
test('a capable crew member can turn salvage and energy into a used command override', () => {
  const options = fieldOptions(state({ commands: 1 }));
  const relay = options.find(option => option.kind === 'command');
  expect(relay).toBeTruthy();
  const next = performFieldOperation(state({ commands: 1 }), relay.id);
  expect(next.commands).toBe(2);
  expect(next.salvage).toBe(3);
  expect(next.strain[relay.creature.id]).toBe((state().strain[relay.creature.id] || 0) + 1);
  expect(fieldOptions(state({ commands: 2 })).some(option => option.kind === 'command')).toBe(false);
});
