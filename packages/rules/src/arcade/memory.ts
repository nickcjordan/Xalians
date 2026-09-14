import { shuffleSeeded } from './random.ts';

export type MemoryState = {
  seed: string;
  deck: number[];
  open: number[];
  matched: number[];
  attempts: number;
  phase: 'playing' | 'won';
};

export const MEMORY_PAIRS = 6;

export function createMemoryState(seed: string, pairs = MEMORY_PAIRS): MemoryState {
  if (!Number.isInteger(pairs) || pairs < 2 || pairs > 12) throw new Error('Memory pair count is out of range.');
  return {
    seed,
    deck: shuffleSeeded(Array.from({ length: pairs }, (_, pair) => [pair, pair]).flat(), `${seed}:memory`),
    open: [],
    matched: [],
    attempts: 0,
    phase: 'playing',
  };
}

export function applyMemoryReveal(state: MemoryState, index: number): MemoryState {
  if (state.phase !== 'playing' || !Number.isInteger(index) || index < 0 || index >= state.deck.length) return state;
  const matched = new Set(state.matched);
  if (matched.has(index) || state.open.includes(index)) return state;

  const open = state.open.length === 2 ? [] : [...state.open];
  open.push(index);
  let nextMatched = [...state.matched];
  let attempts = state.attempts;
  if (open.length === 2) {
    attempts += 1;
    if (state.deck[open[0]] === state.deck[open[1]]) nextMatched = [...nextMatched, ...open];
  }
  const won = nextMatched.length === state.deck.length;
  return { ...state, open: won || nextMatched.length > state.matched.length ? [] : open, matched: nextMatched, attempts, phase: won ? 'won' : 'playing' };
}
