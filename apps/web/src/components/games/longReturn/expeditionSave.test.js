import { CHECKPOINT_KEY, readCheckpoint, writeCheckpoint, clearCheckpoint } from './expeditionSave';
import { CREATURES } from './longReturnData';

const entry = () => ({ selectedCrew: CREATURES.slice(0, 3).map(c => c.id), sceneIndex: 0, phase: 'scout',
  strain: Object.fromEntries(CREATURES.slice(0, 3).map(c => [c.id, 0])), pressure: 0, salvage: 0, commands: 2,
  guidanceLevel: 'simple', objectiveReached: false, spentAbilities: [], runFlags: [], journal: [], log: [], lastResult: null });

beforeEach(() => localStorage.clear());
test('round trips a versioned checkpoint and removes only its own key', () => {
  localStorage.setItem('unrelated-game', 'keep');
  expect(writeCheckpoint(entry())).toBe(true);
  expect(readCheckpoint()).toEqual(entry());
  expect(clearCheckpoint()).toBe(true);
  expect(readCheckpoint()).toBeNull();
  expect(localStorage.getItem('unrelated-game')).toBe('keep');
});
test('rejects malformed, incompatible, tampered and invalid saves', () => {
  localStorage.setItem(CHECKPOINT_KEY, '{');
  expect(readCheckpoint()).toBeNull();
  writeCheckpoint(entry());
  const original = localStorage.getItem(CHECKPOINT_KEY);
  const incompatible = JSON.parse(original);
  incompatible.version = 999;
  localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(incompatible));
  expect(readCheckpoint()).toBeNull();
  const edited = JSON.parse(original);
  edited.payload = edited.payload.replace('"salvage":0', '"salvage":999');
  localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(edited));
  expect(readCheckpoint()).toBeNull();
  expect(writeCheckpoint({ ...entry(), selectedCrew: ['missing', 'missing', 'missing'] })).toBe(false);
  expect(writeCheckpoint({ ...entry(), pressure: 11 })).toBe(false);
  expect(writeCheckpoint({ ...entry(), phase: 'encounter' })).toBe(false);
});
test('handles unavailable browser storage without interrupting gameplay', () => {
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); }, removeItem() { throw Error('blocked'); } };
  expect(readCheckpoint(blocked)).toBeNull();
  expect(writeCheckpoint(entry(), blocked)).toBe(false);
  expect(clearCheckpoint(blocked)).toBe(false);
  const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw Error('denied'); });
  expect(readCheckpoint()).toBeNull();
  expect(writeCheckpoint(entry())).toBe(false);
  expect(clearCheckpoint()).toBe(false);
  spy.mockRestore();
});
