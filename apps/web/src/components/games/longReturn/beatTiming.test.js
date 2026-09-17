import { beatDuration } from './beatTiming';
test('routine ticks are shorter than meaningful discoveries and long text is bounded', () => {
  expect(beatDuration('energy', 'One energy spent.')).toBe(600);
  expect(beatDuration('encounter', 'A native appears.')).toBe(1600);
  expect(beatDuration('support', 'word '.repeat(100))).toBe(12000);
  expect(beatDuration('signal', 'word '.repeat(30))).toBe(7050);
  expect(beatDuration('energy', 'word '.repeat(20))).toBe(4850);
});
