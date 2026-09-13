import { describe, expect, it } from 'vitest';
import {
  applyArtilleryShot,
  artilleryMovedX,
  chooseArtilleryBotShot,
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

  it('always offers a shot that can reach the opposing crawler', () => {
    const seeds = [
      '2026-09-13:artillery:v1',
      ...Array.from({ length: 50 }, (_, index) => `artillery-reach-${index}`),
    ];

    for (const seed of seeds) {
      const state = createArtilleryState(seed);
      const canHit = Array.from({ length: 71 }, (_, index) => index + 10).some((angle) =>
        Array.from({ length: 86 }, (_, index) => index + 15).some((power) =>
          simulateArtilleryShot(state, { angle, power }).hit === 'right'
        )
      );
      expect(canHit, `${seed} should have a reachable opening shot`).toBe(true);
    }
  });

  it('spends limited artillery payloads and falls back to a core shell when empty', () => {
    const initial = createArtilleryState('payload-stock');
    const first = applyArtilleryShot(initial, { angle: 45, power: 70, payload: 'barb' });
    expect(first.outcome.payload).toBe('barb');
    expect(first.state.payloads.left.barb).toBe(1);

    const leftAgain = { ...first.state, current: 'left' as const };
    const second = applyArtilleryShot(leftAgain, { angle: 45, power: 70, payload: 'barb' });
    expect(second.state.payloads.left.barb).toBe(0);

    const empty = { ...second.state, current: 'left' as const };
    const fallback = applyArtilleryShot(empty, { angle: 45, power: 70, payload: 'barb' });
    expect(fallback.outcome.payload).toBe('shell');
    expect(fallback.state.payloads.left.barb).toBe(0);
  });

  it('gives artillery payloads distinct terrain effects', () => {
    const state = createArtilleryState('payload-terrain');
    const shell = applyArtilleryShot(state, { angle: 32, power: 54, payload: 'shell' });
    const barb = applyArtilleryShot(state, { angle: 32, power: 54, payload: 'barb' });
    const bore = applyArtilleryShot(state, { angle: 32, power: 54, payload: 'bore' });
    const impactX = Math.round(shell.outcome.impact!.x);

    expect(bore.state.terrain[impactX]).toBeLessThan(shell.state.terrain[impactX]);
    expect(shell.outcome.projectiles).toHaveLength(1);
    expect(barb.outcome.projectiles).toHaveLength(3);
    expect(barb.state.terrain).not.toEqual(shell.state.terrain);
    expect(bore.outcome.path.at(-1)!.y).toBeLessThan(bore.outcome.path.at(-2)!.y);
  });

  it('holds wind through a volley so the reply preserves ranging information', () => {
    const initial = createArtilleryState('stable-volley');
    const left = applyArtilleryShot(initial, { angle: 45, power: 62 });
    expect(left.state.wind).toBe(initial.wind);
    expect(left.state.rngState).toBe(initial.rngState);

    const right = applyArtilleryShot(left.state, { angle: 45, power: 62 });
    expect(right.state.rngState).not.toBe(initial.rngState);
  });

  it('previews and commits two tactical crawler moves without mutating the field', () => {
    const initial = createArtilleryState('crawler-movement');
    const originalX = initial.tanks.left.x;
    expect(artilleryMovedX(initial, 'left', 1)).toBe(originalX + 8);
    expect(initial.tanks.left.x).toBe(originalX);

    const first = applyArtilleryShot(initial, { angle: 45, power: 62, move: 1 });
    expect(first.state.tanks.left.x).toBe(originalX + 8);
    expect(first.state.traction.left).toBe(1);

    const leftAgain = { ...first.state, current: 'left' as const };
    const second = applyArtilleryShot(leftAgain, { angle: 45, power: 62, move: -1 });
    expect(second.state.tanks.left.x).toBe(originalX);
    expect(second.state.traction.left).toBe(0);

    const exhausted = { ...second.state, current: 'left' as const };
    const third = applyArtilleryShot(exhausted, { angle: 45, power: 62, move: 1 });
    expect(third.state.tanks.left.x).toBe(originalX);
    expect(third.state.traction.left).toBe(0);
  });

  it('replays an artillery win that uses every payload', () => {
    const seed = '2026-09-13:artillery:v1';
    const payloads = ['barb', 'bore', 'shell'] as const;
    const actions = [];
    let state = createArtilleryState(seed, 'bot');

    for (const payload of payloads) {
      let shot;
      for (let angle = 10; angle <= 80 && !shot; angle += 1) {
        for (let power = 15; power <= 100; power += 1) {
          if (simulateArtilleryShot(state, { angle, power, payload }).hit === 'right') {
            shot = { angle, power, payload };
            break;
          }
        }
      }
      expect(shot).toBeDefined();
      actions.push(shot!);
      state = applyArtilleryShot(state, shot!).state;
      if (state.phase === 'finished') break;
      state = applyArtilleryShot(state, chooseArtilleryBotShot(state)).state;
    }

    expect(state.winner).toBe('left');
    expect(verifyArcadeCompletion({ gameId: 'artillery', seed, actions })).toBe(true);
    expect(verifyArcadeCompletion({ gameId: 'artillery', seed, actions: actions.slice(0, -1) })).toBe(false);
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
