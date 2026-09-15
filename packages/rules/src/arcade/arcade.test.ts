import { describe, expect, it } from 'vitest';
import {
  applyArtilleryShot,
  applyArtilleryMove,
  ARTILLERY_HEIGHT,
  ARTILLERY_MAX_DRIVE_FUEL,
  ARTILLERY_MAX_JET_FUEL,
  ARTILLERY_MOVE_DISTANCE,
  ARTILLERY_MAP_WIDTHS,
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

  it('builds deterministic planet terrain at all three selectable ranges', () => {
    const worlds = ['stonera', 'magmuth', 'krystos', 'endessa'] as const;
    const sizes = ['compact', 'standard', 'wide'] as const;
    const worldSignatures = new Set<string>();
    for (const world of worlds) {
      for (const mapSize of sizes) {
        const state = createArtilleryState('world-map-options', 'bot', 'standard', { world, mapSize });
        expect(state.terrain).toHaveLength(ARTILLERY_MAP_WIDTHS[mapSize] + 1);
        expect(state.world).toBe(world);
        expect(state.mapSize).toBe(mapSize);
        if (mapSize === 'standard') {
          worldSignatures.add(`${state.condition}:${state.terrain.slice(0, 100).map(Math.round).join(',')}`);
        }
      }
    }
    expect(worldSignatures.size).toBe(4);
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

  it('lets high projectiles leave the camera and return to the terrain', () => {
    const state = createArtilleryState('high-arc-return', 'bot', 'standard', { world: 'stonera', mapSize: 'wide' });
    const outcome = simulateArtilleryShot(state, { angle: 80, power: 100 });
    const projectile = outcome.projectiles[0];

    expect(Math.max(...projectile.path.map((point) => point.y))).toBeGreaterThan(ARTILLERY_HEIGHT + 35);
    expect(projectile.outOfBounds).toBe(false);
    expect(projectile.impact).not.toBeNull();
  });

  it('always offers a shot that can reach the opposing range rig', () => {
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

    for (const world of ['stonera', 'magmuth', 'krystos', 'endessa'] as const) {
      for (const mapSize of ['compact', 'standard', 'wide'] as const) {
        const state = createArtilleryState(`reach-${world}-${mapSize}`, 'bot', 'standard', { world, mapSize });
        const canHit = Array.from({ length: 71 }, (_, index) => index + 10).some((angle) =>
          Array.from({ length: 86 }, (_, index) => index + 15).some((power) =>
            simulateArtilleryShot(state, { angle, power }).hit === 'right'
          )
        );
        expect(canHit, `${world}/${mapSize} should have a reachable opening shot`).toBe(true);
      }
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
    const shellImpactX = Math.round(shell.outcome.impact!.x);
    const boreImpactX = Math.round(bore.outcome.impact!.x);
    const shellDepth = state.terrain[shellImpactX] - shell.state.terrain[shellImpactX];
    const boreDepth = state.terrain[boreImpactX] - bore.state.terrain[boreImpactX];

    expect(boreDepth).toBeGreaterThan(shellDepth);
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

  it('commits fuel-scaled rig movement immediately', () => {
    const initial = createArtilleryState('crawler-movement');
    const originalX = initial.tanks.left.x;
    const drivenX = artilleryMovedX(initial, 'left', 1);
    expect(drivenX).toBeGreaterThan(originalX);
    expect(drivenX).toBeLessThanOrEqual(originalX + ARTILLERY_MOVE_DISTANCE);
    expect(initial.tanks.left.x).toBe(originalX);

    const first = applyArtilleryMove(initial, 1);
    expect(first.state.tanks.left.x).toBe(drivenX);
    expect(first.state.traction.left).toBe(75);
    expect(first.fuelSpent).toBe(25);
    expect(first.state.turn).toBe(0);

    const second = applyArtilleryMove(first.state, -1);
    expect(second.state.tanks.left.x).toBeLessThan(first.state.tanks.left.x);
    expect(second.state.traction.left).toBe(50);

    const third = applyArtilleryMove(second.state, -1);
    expect(third.state.traction.left).toBe(25);

    const fourth = applyArtilleryMove(third.state, 1, 'drive', 25);
    expect(fourth.state.traction.left).toBe(0);
    const exhausted = applyArtilleryMove(fourth.state, 1);
    expect(exhausted.state.tanks.left.x).toBe(fourth.state.tanks.left.x);
    expect(exhausted.state.traction.left).toBe(0);
  });

  it('supports fine movement pulses and clamps fuel to the remaining reserve', () => {
    const initial = createArtilleryState('fine-thrust');
    expect(initial.traction.left).toBe(ARTILLERY_MAX_DRIVE_FUEL);
    expect(initial.jetCharges.left).toBe(ARTILLERY_MAX_JET_FUEL);
    const nudge = applyArtilleryMove(initial, 1, 'drive', 1);
    const committed = applyArtilleryMove(initial, 1, 'drive', 25);
    expect(nudge.fuelSpent).toBe(1);
    expect(nudge.distance).toBeGreaterThan(0);
    expect(nudge.distance).toBeLessThan(committed.distance);
    expect(nudge.state.traction.left).toBe(99);
    const nearlyEmpty = { ...nudge.state, traction: { ...nudge.state.traction, left: 0.4 } };
    expect(applyArtilleryMove(nearlyEmpty, 1, 'drive', 3).fuelSpent).toBe(0.4);
    expect(applyArtilleryMove(nearlyEmpty, 1, 'drive', 3).state.traction.left).toBe(0);
  });

  it('neutralizes legacy creature-system actions in the cabinet simulation', () => {
    const initial = createArtilleryState('legacy-system');
    const applied = applyArtilleryShot(initial, { angle: 10, power: 15, system: 'lift' });
    expect(applied.state.guard.left).toBe(0);
    expect(applied.state.systemCharges.left).toBe(initial.systemCharges.left);
  });

  it('lets crater walls block a planned rig route', () => {
    const state = createArtilleryState('blocked-rig');
    const terrain = [...state.terrain];
    const startX = Math.round(state.tanks.left.x);
    terrain[startX + 1] = terrain[startX] + 6;
    const blocked = { ...state, terrain };
    expect(artilleryMovedX(blocked, 'left', 1)).toBe(blocked.tanks.left.x);
  });

  it('lets the jump jet clear terrain that blocks the drive', () => {
    const state = createArtilleryState('blocked-jet');
    const terrain = [...state.terrain];
    const startX = Math.round(state.tanks.left.x);
    terrain[startX + 1] = terrain[startX] + 12;
    const blocked = { ...state, terrain };
    expect(artilleryMovedX(blocked, 'left', 1, 'drive')).toBe(blocked.tanks.left.x);

    const landedX = artilleryMovedX(blocked, 'left', 1, 'jet', ARTILLERY_MAX_JET_FUEL);
    expect(landedX).toBeGreaterThan(blocked.tanks.left.x + ARTILLERY_MOVE_DISTANCE);
    const applied = applyArtilleryMove(blocked, 1, 'jet', ARTILLERY_MAX_JET_FUEL);
    expect(applied.state.tanks.left.x).toBe(landedX);
    expect(applied.state.jetCharges.left).toBe(0);
    expect(applied.state.traction.left).toBe(blocked.traction.left);
  });

  it('replays an artillery win with committed movement', () => {
    const seed = '2026-09-13:artillery:v1';
    const actions: ArtilleryAction[] = [{ type: 'move', direction: 1 }];
    let state = createArtilleryState(seed, 'bot', 'rookie');
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
    expect(verifyArcadeCompletion({ gameId: 'artillery', seed, difficulty: 'rookie', actions })).toBe(true);
    expect(verifyArcadeCompletion({ gameId: 'artillery', seed, difficulty: 'rookie', actions: actions.slice(0, -1) })).toBe(false);
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

  it('keeps scatter and fragment patterns separated through impact', () => {
    const state = createArtilleryState('diverging-patterns');
    for (const payload of ['barb', 'cluster'] as const) {
      const outcome = simulateArtilleryShot(state, { angle: 42, power: 62, payload });
      const impacts = outcome.projectiles.flatMap((projectile) => projectile.impact ? [projectile.impact.x] : []);
      expect(impacts).toHaveLength(outcome.projectiles.length);
      expect(Math.max(...impacts) - Math.min(...impacts)).toBeGreaterThan(payload === 'barb' ? 20 : 35);
    }
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
    expect(Math.abs(outcome.impact!.x - (state.tanks.right.x - 18))).toBeLessThan(5);
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

  it('keeps range practice on the player rig and ends after six calibration shots', () => {
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
