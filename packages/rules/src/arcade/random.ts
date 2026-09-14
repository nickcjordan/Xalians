/** Small deterministic PRNG for replayable Arcade sessions. Not cryptographic. */
export function hashSeed(seed: string): number {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function nextRandom(state: number): { value: number; state: number } {
  let x = state || 0x6d2b79f5;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  const next = x >>> 0;
  return { value: next / 0x100000000, state: next };
}

export function shuffleSeeded<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  let state = hashSeed(seed);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const draw = nextRandom(state);
    state = draw.state;
    const j = Math.floor(draw.value * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
