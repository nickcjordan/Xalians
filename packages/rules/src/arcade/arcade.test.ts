import { describe, expect, it } from 'vitest';
import {
  applyArtilleryShot,
  applyRelayMove,
  applySweepAction,
  createArtilleryState,
  createRelayState,
  createSweepState,
  createSolitaireState,
  applySolitaireAction,
  canMoveSolitaire,
  simulateArtilleryShot,
  applyMemoryReveal,
  createMemoryState,
  verifyArcadeCompletion,
} from './index.ts';

describe('Arcade deterministic rules', () => {
  it('creates the same artillery field and wind from the same seed', () => {
    expect(createArtilleryState('daily-1')).toEqual(createArtilleryState('daily-1'));
  });

  it('simulates and applies an artillery shot without mutating the input', () => {
    const state = createArtilleryState('shot');
    const before = structuredClone(state);
    const outcome = simulateArtilleryShot(state, { angle: 45, power: 75 });
    const applied = applyArtilleryShot(state, { angle: 45, power: 75 });
    expect(outcome.path.length).toBeGreaterThan(2);
    expect(applied.state.turn).toBe(1);
    expect(state).toEqual(before);
  });

  it('guarantees a safe first sweep reveal and is replayable', () => {
    const first = applySweepAction(createSweepState('field'), { type: 'reveal', index: 40 });
    const replay = applySweepAction(createSweepState('field'), { type: 'reveal', index: 40 });
    expect(first.cells[40].mine).toBe(false);
    expect(first.cells[40].revealed).toBe(true);
    expect(first).toEqual(replay);
  });

  it('does not let a flag choose the sweep opening', () => {
    const flagged = applySweepAction(createSweepState('flag-first'), { type: 'flag', index: 0 });
    expect(flagged.started).toBe(false);
    const revealed = applySweepAction(flagged, { type: 'reveal', index: 40 });
    expect(revealed.cells[40].mine).toBe(false);
  });

  it('moves relay tiles deterministically', () => {
    const state = createRelayState('relay');
    const first = applyRelayMove(state, 'left');
    const replay = applyRelayMove(createRelayState('relay'), 'left');
    expect(first).toEqual(replay);
  });

  it('deals a deterministic Klondike layout and draws without mutation', () => {
    const state = createSolitaireState('deal');
    const replay = createSolitaireState('deal');
    const next = applySolitaireAction(state, { type: 'draw' });
    expect(state).toEqual(replay);
    expect(state.stock).toHaveLength(24);
    expect(next.stock).toHaveLength(23);
    expect(next.waste.at(-1)?.faceUp).toBe(true);
  });

  it('allows an ace onto its empty foundation', () => {
    const state = createSolitaireState('ace');
    state.waste.push({ id: 'ember-1', suit: 'ember', rank: 1, faceUp: true });
    expect(canMoveSolitaire(state, { zone: 'waste' }, { zone: 'foundation', suit: 'ember' })).toBe(true);
  });

  it('replays a memory win from inputs alone', () => {
    const seed = 'memory-win';
    const deal = createMemoryState(seed);
    const actions = Array.from(new Set(deal.deck)).flatMap((pair) =>
      deal.deck.map((value, index) => value === pair ? index : -1).filter((index) => index >= 0)
    );
    let state = deal;
    actions.forEach((index) => { state = applyMemoryReveal(state, index); });
    expect(state.phase).toBe('won');
    expect(verifyArcadeCompletion({ gameId: 'match', seed, actions })).toBe(true);
    expect(verifyArcadeCompletion({ gameId: 'match', seed, actions: actions.slice(0, -1) })).toBe(false);
  });
});
