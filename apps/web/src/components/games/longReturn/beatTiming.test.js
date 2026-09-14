import { beatDuration } from './beatTiming';
test('routine ticks are shorter than meaningful discoveries and long text is bounded', () => {
  expect(beatDuration('energy', 'One energy spent.')).toBe(600);
  expect(beatDuration('encounter', 'A native appears.')).toBe(1500);
  expect(beatDuration('support', 'word '.repeat(100))).toBe(2400);
});
