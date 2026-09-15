import { scoutBeats } from './ScoutTransition';

test('return narration agrees with actual energy and stability changes', () => {
  const action = { type: 'scout-return', scout: { species: 'Chromocat' }, energyBefore: 5, energyAfter: 4, stabilityBefore: 10, stabilityAfter: 9 };
  expect(scoutBeats(action).map(beat => beat.text).join(' ')).toContain('consumes another energy');
  const exhausted = scoutBeats({ ...action, energyBefore: 0, energyAfter: 0, stabilityBefore: 0, stabilityAfter: 0 }).map(beat => beat.text).join(' ');
  expect(exhausted).toContain('already spent');
  expect(exhausted).not.toContain('consumes another energy');
  expect(exhausted).not.toContain('loses stability');
});
