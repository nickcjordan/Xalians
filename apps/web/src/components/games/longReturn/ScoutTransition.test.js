import { scoutBeats } from './ScoutTransition';

test('return narration agrees with actual energy and stability changes', () => {
  const action = { type: 'scout-return', scout: { species: 'Chromocat' }, energyBefore: 5, energyAfter: 4, stabilityBefore: 10, stabilityAfter: 9 };
  expect(scoutBeats(action).map(beat => beat.text).join(' ')).toContain('consumes another energy');
  const exhausted = scoutBeats({ ...action, energyBefore: 0, energyAfter: 0, stabilityBefore: 0, stabilityAfter: 0 }).map(beat => beat.text).join(' ');
  expect(exhausted).toContain('already spent');
  expect(exhausted).not.toContain('consumes another energy');
  expect(exhausted).not.toContain('loses stability');
});

test('scouting binds expenditure to departure and delivery to communication', () => {
  const action = { type: 'scout', scout: { species: 'Graviclaw' }, energyBefore: 6, energyAfter: 5, result: { revealedIds: [], relay: true }, profile: { channel: 'vibration' } };
  const beats = scoutBeats(action);
  expect(beats).toHaveLength(3);
  expect(beats[0].costs).toEqual([{ kind: 'energy', text: '−1 energy · 5 left' }]);
  expect(beats[2].text).toContain('through the structure');
  expect(beats.some(beat => beat.kind === 'energy')).toBe(false);
  const isolated = scoutBeats({ ...action, result: { revealedIds: ['danger'], relay: false }, encounter: { species: 'Native' } });
  expect(isolated[2].text).toContain('until it returns');
  expect(isolated[3].kind).toBe('encounter');
});
