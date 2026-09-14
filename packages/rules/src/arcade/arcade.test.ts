import { describe, expect, it } from 'vitest';
import {
  applyArtilleryShot,
  applyArtilleryMove,
  ARTILLERY_MOVE_DISTANCE,
  ARTILLERY_PAYLOADS,
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
  type ArtilleryAction,
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

  it('commits crawler movement immediately and spends one drive charge', () => {
    const initial = createArtilleryState('crawler-movement');
    const originalX = initial.tanks.left.x;
    expect(artilleryMovedX(initial, 'left', 1)).toBe(originalX + ARTILLERY_MOVE_DISTANCE);
    expect(initial.tanks.left.x).toBe(originalX);

    const first = applyArtilleryMove(initial, 1);
    expect(first.state.tanks.left.x).toBe(originalX + ARTILLERY_MOVE_DISTANCE);
    expect(first.state.traction.left).toBe(2);
    expect(first.state.turn).toBe(0);

    const second = applyArtilleryMove(first.state, -1);
    expect(second.state.tanks.left.x).toBe(originalX);
    expect(second.state.traction.left).toBe(1);

    const third = applyArtilleryMove(second.state, -1);
    expect(third.state.traction.left).toBe(0);

    const fourth = applyArtilleryMove(third.state, 1);
    expect(fourth.state.tanks.left.x).toBe(third.state.tanks.left.x);
    expect(fourth.state.traction.left).toBe(0);
  });

  it('assigns the chosen player creature and its distinct system', () => {
    const terragoyle = createArtilleryState('chosen-creature', 'bot', 'standard', 'terragoyle');
    expect(terragoyle.creatures).toEqual({ left: 'terragoyle', right: 'codazzo' });
    const lifted = applyArtilleryShot(terragoyle, { angle: 10, power: 15, system: 'lift' });
    expect(lifted.state.guard.left).toBe(18);
    expect(lifted.state.systemCharges.left).toBe(1);
  });

  it('lets crater walls block a planned crawler route', () => {
    const state = createArtilleryState('blocked-crawler');
    const terrain = [...state.terrain];
    terrain[10] = terrain[9] + 6;
    const blocked = { ...state, terrain };
    expect(artilleryMovedX(blocked, 'left', 1)).toBe(blocked.tanks.left.x);
  });

  it('replays an artillery win with committed movement and a chosen creature', () => {
    const seed = '2026-09-13:artillery:v1';
    const actions: ArtilleryAction[] = [{ type: 'move', direction: 1 }];
    let state = createArtilleryState(seed, 'bot', 'rookie', 'terragoyle');
    state = applyArtilleryMove(state, 1).state;

    while (state.phase === 'aiming' && state.turn < 30) {
      let shot;
      for (let angle = 10; angle <= 80 && !shot; angle += 1) {
        for (let power = 15; power <= 100; power += 1) {
          if (simulateArtilleryShot(state, { angle, power, payload: 'shell' }).hit === 'right') {
            shot = { angle, power, payload: 'shell' as const };
            break;
          }
        }
      }
      expect(shot).toBeDefined();
      actions.push(shot!);
      state = applyArtilleryShot(state, shot!).state;
      if (state.phase === 'finished') break;
      state = applyArtilleryShot(state, chooseArtilleryBotShot(state)).state;
      if (state.phase === 'finished') break;
    }

    expect(state.winner).toBe('left');
    expect(verifyArcadeCompletion({ gameId: 'artillery', seed, difficulty: 'rookie', creature: 'terragoyle', actions })).toBe(true);
    expect(verifyArcadeCompletion({ gameId: 'artillery', seed, difficulty: 'rookie', creature: 'terragoyle', actions: actions.slice(0, -1) })).toBe(false);
  });

  it('gives all six payloads a distinct deterministic role', () => {
    const state = createArtilleryState('complete-arsenal');
    const outcomes = ARTILLERY_PAYLOADS.map((payload) => simulateArtilleryShot(state, { angle: 38, power: 72, payload }));
    expect(outcomes.map((outcome) => outcome.projectiles.length)).toEqual([1, 3, 1, 5, 1, 1]);
    expect(new Set(outcomes.map((outcome) => outcome.path.length)).size).toBeGreaterThan(2);

    const bloom = applyArtilleryShot(state, { angle: 22, power: 46, payload: 'bloom' });
    const impactX = Math.round(bloom.outcome.impact!.x);
    expect(bloom.state.terrain[impactX]).toBeGreaterThan(state.terrain[impactX]);
  });

  it('applies blast falloff and direct-hit bonus to 100-point hulls', () => {
    const state = createArtilleryState('damage-model');
    const hits = [];
    for (let angle = 10; angle <= 80; angle += 1) {
      for (let power = 15; power <= 100; power += 1) {
        const outcome = simulateArtilleryShot(state, { angle, power, payload: 'shell' });
        if (outcome.damage) hits.push(outcome);
      }
    }
    expect(hits.length).toBeGreaterThan(1);
    expect(Math.max(...hits.map((outcome) => outcome.damage))).toBeGreaterThan(Math.min(...hits.map((outcome) => outcome.damage)));
    const applied = applyArtilleryShot(state, { angle: 45, power: 70 });
    expect(applied.state.tanks.right.integrity).toBeLessThanOrEqual(100);
  });

  it('makes atmospheric conditions visibly alter identical trajectories', () => {
    const state = createArtilleryState('weather-physics');
    const heavy = simulateArtilleryShot({ ...state, condition: 'heavy-gravity' }, { angle: 50, power: 70 });
    const thin = simulateArtilleryShot({ ...state, condition: 'thin-air' }, { angle: 50, power: 70 });
    expect(heavy.path).not.toEqual(thin.path);
    expect(Math.max(...thin.path.map((point) => point.y))).toBeGreaterThan(Math.max(...heavy.path.map((point) => point.y)));
  });

  it('turns creature systems into limited, observable defenses', () => {
    const initial = createArtilleryState('creature-systems');
    initial.tanks.left.integrity = 50;
    const anchored = applyArtilleryShot(initial, { angle: 10, power: 15, system: 'anchor', move: 1 });
    expect(anchored.state.tanks.left.integrity).toBe(62);
    expect(anchored.state.tanks.left.x).toBe(initial.tanks.left.x);
    expect(anchored.state.guard.left).toBe(22);
    expect(anchored.state.systemCharges.left).toBe(1);

    let reply;
    for (let angle = 10; angle <= 80 && !reply; angle += 1) {
      for (let power = 15; power <= 100; power += 1) {
        const outcome = simulateArtilleryShot(anchored.state, { angle, power });
        if (outcome.damage) {
          reply = applyArtilleryShot(anchored.state, { angle, power });
          break;
        }
      }
    }
    expect(reply).toBeDefined();
    expect(reply!.outcome.guardAbsorbed).toBeGreaterThan(0);
    expect(reply!.state.guard.left).toBe(0);
  });

  it('gives Terragoyle a distinct lift defense and Codazzo a repeating barb growth cycle', () => {
    const initial = createArtilleryState('species-systems');
    const rightTurn = { ...initial, current: 'right' as const };
    const lifted = applyArtilleryShot(rightTurn, { angle: 10, power: 15, system: 'lift' });
    expect(lifted.state.guard.right).toBe(18);
    expect(lifted.state.systemCharges.right).toBe(1);

    let state = createArtilleryState('barb-regrowth');
    state.payloads.left.barb = 0;
    for (let volley = 0; volley < 3; volley += 1) {
      state = applyArtilleryShot(state, { angle: 10, power: 15 }).state;
      state = applyArtilleryShot(state, { angle: 10, power: 15 }).state;
    }
    expect(state.payloads.left.barb).toBe(1);
  });

  it('separates bot difficulty by bounded aiming error without changing the shared physics', () => {
    const rookie = createArtilleryState('bot-profiles', 'bot', 'rookie');
    rookie.current = 'right';
    const expert = { ...structuredClone(rookie), difficulty: 'expert' as const };
    const rookieShot = chooseArtilleryBotShot(rookie);
    const expertShot = chooseArtilleryBotShot(expert);
    expect(rookieShot).not.toEqual(expertShot);
    expect(rookieShot.angle).toBeGreaterThanOrEqual(10);
    expect(rookieShot.power).toBeLessThanOrEqual(100);
    expect(simulateArtilleryShot(rookie, rookieShot).path.length).toBeGreaterThan(2);
    expect(simulateArtilleryShot(expert, expertShot).path.length).toBeGreaterThan(2);
  });

  it('lets a threatened bot spend a bloom to grow cover instead of chasing damage', () => {
    const state = createArtilleryState('bot-cover', 'bot', 'standard');
    state.current = 'right';
    state.tanks.right.integrity = 50;
    state.lastImpact = { x: state.tanks.right.x - 2, shooter: 'left' };
    const shot = chooseArtilleryBotShot(state);
    const outcome = simulateArtilleryShot(state, shot);
    expect(shot.payload).toBe('bloom');
    expect(outcome.impact).not.toBeNull();
    expect(Math.abs(outcome.impact!.x - (state.tanks.right.x - 10))).toBeLessThan(5);
  });

  it('raises damage pressure predictably in a duel that runs long', () => {
    const base = createArtilleryState('crater-pressure');
    let damagingShot;
    for (let angle = 10; angle <= 80 && !damagingShot; angle += 1) {
      for (let power = 15; power <= 100; power += 1) {
        if (simulateArtilleryShot(base, { angle, power }).damage > 0) {
          damagingShot = { angle, power };
          break;
        }
      }
    }
    expect(damagingShot).toBeDefined();
    const normal = applyArtilleryShot(base, damagingShot!);
    const pressured = applyArtilleryShot({ ...base, turn: 14 }, damagingShot!);
    expect(normal.outcome.pressureMultiplier).toBe(1);
    expect(pressured.outcome.pressureMultiplier).toBeGreaterThan(1);
    expect(pressured.outcome.damage).toBeGreaterThan(normal.outcome.damage);
  });

  it('keeps range practice on the player crew and ends after six calibration shots', () => {
    let state = createArtilleryState('practice-range', 'range');
    for (let shot = 0; shot < 6 && state.phase === 'aiming'; shot += 1) {
      state = applyArtilleryShot(state, { angle: 10, power: 15 }).state;
      if (state.phase === 'aiming') expect(state.current).toBe('left');
    }
    expect(state.phase).toBe('finished');
    expect(state.winner).toBe('left');
    expect(state.turn).toBe(6);
    expect(state.tanks.right.integrity).toBe(100);
  });

  it('runs the limited-ordnance trial from a five-round magazine', () => {
    let state = createArtilleryState('ordnance-trial', 'challenge');
    expect(state.coreAmmo.left).toBe(1);
    const first = applyArtilleryShot(state, { angle: 10, power: 15, payload: 'shell' });
    expect(first.state.coreAmmo.left).toBe(0);
    const fallback = applyArtilleryShot(first.state, { angle: 10, power: 15, payload: 'shell' });
    expect(fallback.outcome.payload).not.toBe('shell');
    state = fallback.state;
    while (state.phase === 'aiming') state = applyArtilleryShot(state, { angle: 10, power: 15, payload: 'shell' }).state;
    expect(state.turn).toBe(5);
    expect(state.winner).toBe('right');
    expect(Object.values(state.payloads.left).reduce((total, remaining) => total + remaining, 0)).toBe(0);
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
