import { describe, expect, it } from 'vitest';
import {
  applyArtilleryShot,
  applyArtilleryMove,
  ARTILLERY_HEIGHT,
  ARTILLERY_BARREL_LENGTH,
  ARTILLERY_MUZZLE_BASE_HEIGHT,
  ARTILLERY_MAX_DRIVE_FUEL,
  ARTILLERY_MAX_JET_FUEL,
  ARTILLERY_MOVE_DISTANCE,
  ARTILLERY_MAP_WIDTHS,
  ARTILLERY_PAYLOADS,
  artilleryMoveDistance,
  artilleryMovedX,
  artilleryNominalReach,
  artilleryTerrainImpactStages,
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

  it('reports a useful free-flight range without revealing terrain impact', () => {
    const thin = createArtilleryState('rangefinder', 'bot', 'standard', { world: 'stonera', mapSize: 'wide' });
    const heavy = createArtilleryState('rangefinder', 'bot', 'standard', { world: 'magmuth', mapSize: 'wide' });
    const middle = artilleryNominalReach(thin, { angle: 45, power: 70, payload: 'shell' });
    expect(middle.near).toBe(middle.far);
    expect(artilleryNominalReach(thin, { angle: 45, power: 90, payload: 'shell' }).near).toBeGreaterThan(middle.near);
    expect(artilleryNominalReach(heavy, { angle: 45, power: 70, payload: 'shell' }).near).toBeLessThan(middle.near);
    const spread = artilleryNominalReach(thin, { angle: 45, power: 70, payload: 'cluster' });
    expect(spread.near).toBeLessThan(spread.far);
    expect(thin.tanks.right.x - thin.tanks.left.x).toBe(246);
  });

  it('calibrates free flight to muzzle and rival elevation while leaving ridges unknown', () => {
    const initial = createArtilleryState('rangefinder-elevation');
    const level = { ...initial, terrain: initial.terrain.map(() => 40), wind: 0 };
    const shot = { angle: 45, power: 80, payload: 'shell' as const };
    const reach = artilleryNominalReach(level, shot).near;
    const surfaceImpact = simulateArtilleryShot(level, shot).impact;
    expect(surfaceImpact).not.toBeNull();
    expect(Math.abs(reach - (surfaceImpact!.x - level.tanks.left.x))).toBeLessThan(6);

    const targetX = Math.round(level.tanks.right.x);
    const high = { ...level, terrain: level.terrain.map((height, x) => Math.abs(x - targetX) <= 3 ? height + 10 : height) };
    const low = { ...level, terrain: level.terrain.map((height, x) => Math.abs(x - targetX) <= 3 ? height - 10 : height) };
    expect(artilleryNominalReach(low, shot).near).toBeGreaterThan(reach);
    expect(artilleryNominalReach(high, shot).near).toBeLessThan(reach);
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

  it('launches from the drawn muzzle above a nearby crater lip', () => {
    const state = createArtilleryState('muzzle-clearance');
    const shooterX = state.tanks.left.x;
    const ground = state.terrain[shooterX];
    const terrain = [...state.terrain];
    for (let x = shooterX + 1; x <= shooterX + 5; x += 1) terrain[x] = ground + 5;
    const shot = { angle: 52, power: 77, payload: 'shell' as const };
    const outcome = simulateArtilleryShot({ ...state, terrain }, shot);
    const origin = outcome.path[0];
    const radians = shot.angle * Math.PI / 180;
    expect(origin.x).toBeCloseTo(shooterX + Math.cos(radians) * ARTILLERY_BARREL_LENGTH);
    expect(origin.y).toBeCloseTo(ground + ARTILLERY_MUZZLE_BASE_HEIGHT + Math.sin(radians) * ARTILLERY_BARREL_LENGTH);
    expect(outcome.impact?.x ?? terrain.length).toBeGreaterThan(shooterX + 8);
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

  it('excavates a blast-centered cavity on both faces of a slope', () => {
    const terrain = Array.from({ length: 101 }, (_, x) => x <= 50 ? 40 + (50 - x) * 0.6 : 40 - (x - 50) * 0.35);
    const projectile = {
      path: [{ x: 50, y: 40 }], impact: { x: 50, y: 40 }, hit: null,
      damage: 0, directHit: false, outOfBounds: false,
    };
    const shell = artilleryTerrainImpactStages(terrain, [projectile], 'shell')[0].terrain;
    expect(shell[50]).toBeCloseTo(40 - 16 * 1.02, 3);
    expect(shell[42]).toBeLessThan(terrain[42] - 15);
    expect(shell[58]).toBeLessThan(terrain[58] - 8);
    expect(shell[42]).toBeGreaterThan(shell[58]);
    expect(shell[33]).toBe(terrain[33]);
    expect(shell[67]).toBe(terrain[67]);
    expect(Math.abs(shell[35] - shell[34])).toBeLessThan(2);
    expect(Math.abs(shell[66] - shell[65])).toBeLessThan(2);

    const directHit = artilleryTerrainImpactStages(terrain, [{ ...projectile, impact: { x: 50, y: 41.5 } }], 'shell')[0].terrain;
    expect(directHit[50]).toBeCloseTo(shell[50], 3);
    const drill = artilleryTerrainImpactStages(terrain, [{ ...projectile, impact: { x: 50, y: 32.8 } }], 'bore')[0].terrain;
    expect(drill[50]).toBeLessThan(shell[50]);
  });

  it('keeps the opening wind for every turn in each artillery mode', () => {
    for (const mode of ['bot', 'local', 'range', 'challenge'] as const) {
      const initial = createArtilleryState(`stable-wind-${mode}`, mode);
      let current = initial;
      for (let turn = 0; turn < 3; turn += 1) {
        current = applyArtilleryShot(current, { angle: 75, power: 20 }).state;
        expect(current.wind).toBe(initial.wind);
      }
      if (mode === 'bot' || mode === 'range' || mode === 'challenge') {
        expect(current.rngState).not.toBe(initial.rngState);
      }
    }
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
    expect(first.fuelSpent).toBeGreaterThan(0);
    expect(first.fuelSpent).toBeLessThan(25);
    expect(first.state.traction.left).toBeCloseTo(100 - first.fuelSpent);
    expect(first.state.turn).toBe(0);

    const second = applyArtilleryMove(first.state, -1);
    expect(second.state.tanks.left.x).toBeLessThan(first.state.tanks.left.x);
    expect(second.state.traction.left).toBeCloseTo(first.state.traction.left - second.fuelSpent);

    const third = applyArtilleryMove(second.state, -1);
    expect(third.distance).toBe(0);
    expect(third.state.traction.left).toBe(second.state.traction.left);

    const fourth = applyArtilleryMove(third.state, 1, 'drive', 25);
    expect(fourth.state.traction.left).toBeCloseTo(third.state.traction.left - fourth.fuelSpent);
    const exhausted = applyArtilleryMove({ ...fourth.state, traction: { ...fourth.state.traction, left: 0 } }, 1);
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

  it('lets a short jet burst escape a realistic crater lip that stops the drive', () => {
    const state = createArtilleryState('crater-escape');
    const center = state.tanks.left.x;
    const radius = 12;
    const terrain = state.terrain.map((_, x) => {
      const offset = Math.abs(x - center);
      return offset < radius ? 55 - 22 * Math.sqrt(1 - (offset / radius) ** 2) : 55;
    });
    const crater = { ...state, terrain };
    const driven = applyArtilleryMove(crater, 1, 'drive', 25);
    const jetted = applyArtilleryMove(crater, 1, 'jet', 25);
    expect(artilleryMoveDistance(crater, 'drive', 25)).toBeGreaterThan(artilleryMoveDistance(crater, 'jet', 25));
    expect(driven.state.tanks.left.x).toBeLessThan(center + radius);
    expect(driven.fuelSpent).toBeLessThan(25);
    expect(jetted.state.tanks.left.x).toBeGreaterThan(center + radius);
    expect(jetted.state.jetCharges.left).toBe(75);
    expect(jetted.state.traction.left).toBe(100);
  });

  it('replays an artillery win with committed movement', () => {
    const seed = 'crater-escape';
    const actions: ArtilleryAction[] = [{ type: 'move', direction: 1, mobility: 'drive', thrust: 25 }];
    let state = createArtilleryState(seed, 'bot', 'rookie');
    const openingMove = applyArtilleryMove(state, 1, 'drive', 25);
    expect(openingMove.fuelSpent).toBeGreaterThan(0);
    expect(openingMove.fuelSpent).toBeLessThan(25);
    state = openingMove.state;

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
    expect(bloom.state.terrain[impactX] - state.terrain[impactX]).toBeGreaterThan(15);
  });

  it('makes a buried drill hit the rig above its cavity and buckle its footing', () => {
    const state = createArtilleryState('buried-shock');
    let shot: { angle: number; power: number; payload: 'bore' } | null = null;
    for (let angle = 16; angle <= 76 && !shot; angle += 2) {
      for (let power = 20; power <= 100; power += 1) {
        const candidate = { angle, power, payload: 'bore' as const };
        const outcome = simulateArtilleryShot(state, candidate);
        const offset = Math.abs((outcome.impact?.x ?? -100) - state.tanks.right.x);
        if (!outcome.directHit && offset >= 3 && offset <= 6 && outcome.damage >= 25) {
          shot = candidate;
          break;
        }
      }
    }
    expect(shot).not.toBeNull();
    if (!shot) return;
    const strike = applyArtilleryShot(state, shot);
    expect(strike.outcome.blastDamage).toBeGreaterThanOrEqual(25);
    expect(strike.outcome.fallDamage).toBeGreaterThan(0);
    expect(strike.outcome.damage).toBeGreaterThan(strike.outcome.blastDamage);
  });

  it('gives Starfall damaging coverage where a Comet at the same aim misses', () => {
    const state = createArtilleryState('starfall-coverage');
    let uniqueHit = false;
    for (let angle = 16; angle <= 76 && !uniqueHit; angle += 2) {
      for (let power = 20; power <= 100; power += 2) {
        const shell = simulateArtilleryShot(state, { angle, power, payload: 'shell' });
        const starfall = simulateArtilleryShot(state, { angle, power, payload: 'cluster' });
        if (shell.damage === 0 && starfall.damage >= 18) {
          uniqueHit = true;
          break;
        }
      }
    }
    expect(uniqueHit).toBe(true);
  });

  it('caps Starfall hull damage across both microbursts and terrain collapse', () => {
    const state = createArtilleryState('starfall-combined-damage');
    let hardest: { angle: number; power: number; damage: number } | null = null;
    for (let angle = 16; angle <= 76; angle += 3) {
      for (let power = 20; power <= 100; power += 2) {
        const damage = simulateArtilleryShot(state, { angle, power, payload: 'cluster' }).damage;
        if (!hardest || damage > hardest.damage) hardest = { angle, power, damage };
      }
    }
    expect(hardest!.damage).toBeGreaterThan(50);
    const volley = applyArtilleryShot(state, { angle: hardest!.angle, power: hardest!.power, payload: 'cluster' });
    expect(volley.outcome.damage).toBeLessThanOrEqual(49);
    expect(volley.outcome.damage).toBeGreaterThan(0);
  });

  it('lets Sunspike bypass half of an active guard', () => {
    const state = createArtilleryState('guard-piercer');
    state.guard.right = 24;
    let shot: { angle: number; power: number; payload: 'lance' } | null = null;
    for (let angle = 16; angle <= 76 && !shot; angle += 2) {
      for (let power = 20; power <= 100; power += 2) {
        const candidate = { angle, power, payload: 'lance' as const };
        if (simulateArtilleryShot(state, candidate).damage > 24) {
          shot = candidate;
          break;
        }
      }
    }
    expect(shot).not.toBeNull();
    if (!shot) return;
    const pierced = applyArtilleryShot(state, shot);
    const unguarded = applyArtilleryShot({ ...state, guard: { ...state.guard, right: 0 } }, shot);
    expect(pierced.outcome.guardAbsorbed).toBe(12);
    expect(unguarded.outcome.damage - pierced.outcome.damage).toBe(12);
    expect(pierced.state.guard.right).toBe(0);
  });

  it('makes a forward Rampart protect the next incoming shot, then spends its guard', () => {
    const state = createArtilleryState('rampart-defense');
    let coverShot: { angle: number; power: number; payload: 'bloom' } | null = null;
    for (let angle = 10; angle <= 70 && !coverShot; angle += 2) {
      for (let power = 15; power <= 80; power += 2) {
        const impact = simulateArtilleryShot(state, { angle, power, payload: 'bloom' }).impact;
        if (impact && impact.x - state.tanks.left.x >= 8 && impact.x - state.tanks.left.x <= 28) {
          coverShot = { angle, power, payload: 'bloom' };
          break;
        }
      }
    }
    expect(coverShot).not.toBeNull();
    if (!coverShot) return;
    const fortified = applyArtilleryShot(state, coverShot);
    expect(fortified.outcome.coverGranted).toBe(24);
    expect(fortified.state.guard.left).toBe(24);
    const miss = applyArtilleryShot(fortified.state, { angle: 10, power: 15 });
    expect(miss.outcome.damage).toBe(0);
    expect(miss.state.guard.left).toBe(24);
    const displaced = applyArtilleryMove({ ...fortified.state, current: 'left' }, 1, 'jet', 2);
    expect(displaced.distance).toBeGreaterThan(0);
    expect(displaced.state.guard.left).toBe(0);

    let incoming: { angle: number; power: number } | null = null;
    for (let angle = 16; angle <= 76 && !incoming; angle += 3) {
      for (let power = 20; power <= 100; power += 2) {
        const candidate = { angle, power };
        if (simulateArtilleryShot(fortified.state, candidate).damage > 0) {
          incoming = candidate;
          break;
        }
      }
    }
    expect(incoming).not.toBeNull();
    if (!incoming) return;
    const defended = applyArtilleryShot(fortified.state, incoming);
    const exposed = applyArtilleryShot({ ...fortified.state, guard: { ...fortified.state.guard, left: 0 } }, incoming);
    expect(defended.outcome.guardAbsorbed).toBeGreaterThan(0);
    expect(defended.outcome.damage).toBeLessThan(exposed.outcome.damage);
    expect(defended.state.tanks.left.integrity).toBeGreaterThan(exposed.state.tanks.left.integrity);
    expect(defended.state.guard.left).toBe(0);
  });

  it('does not consume mobility fuel when the rig cannot leave the sector', () => {
    const state = createArtilleryState('mobility-limit');
    state.tanks.left.x = 4;
    const blocked = applyArtilleryMove(state, -1, 'drive', 3);
    expect(blocked.distance).toBe(0);
    expect(blocked.fuelSpent).toBe(0);
    expect(blocked.state).toBe(state);
  });

  it('matches each destructive payload with a consequential terrain profile', () => {
    const state = createArtilleryState('terrain-signatures', 'range', 'standard', { mapSize: 'standard', world: 'stonera' });
    const excavation = (payload: 'shell' | 'barb' | 'bore' | 'cluster' | 'lance') => {
      const applied = applyArtilleryShot(state, { angle: 28, power: 42, payload });
      return Math.max(...state.terrain.map((height, index) => height - applied.state.terrain[index]));
    };
    expect(excavation('shell')).toBeGreaterThan(9);
    expect(excavation('bore')).toBeGreaterThan(11);
    expect(excavation('lance')).toBeGreaterThan(4);
    expect(excavation('barb')).toBeGreaterThan(3);
    expect(excavation('cluster')).toBeGreaterThan(3);
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

  it('resolves volley terrain in landing order and reaches the same final battlefield', () => {
    const state = createArtilleryState('staggered-terrain', 'range', 'standard', { mapSize: 'standard', world: 'stonera' });
    const shot = { angle: 42, power: 62, payload: 'cluster' as const };
    const outcome = simulateArtilleryShot(state, shot);
    const stages = artilleryTerrainImpactStages(state.terrain, outcome.projectiles, shot.payload);
    expect(stages).toHaveLength(5);
    expect(stages.map((stage) => outcome.projectiles[stage.projectileIndex].path.length)).toEqual(
      [...stages.map((stage) => outcome.projectiles[stage.projectileIndex].path.length)].sort((a, b) => a - b),
    );
    expect(stages[0].terrain).not.toEqual(state.terrain);
    expect(stages.at(-1)?.terrain).toEqual(applyArtilleryShot(state, shot).state.terrain);
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

  it('makes a Standard rival range from its last shot instead of instantly choosing a distant perfect solution', () => {
    const state = createArtilleryState('bounded-bot', 'bot', 'standard');
    state.current = 'right';
    state.botPrevious = { miss: 25, shot: { angle: 30, power: 55, payload: 'shell' } };
    const shot = chooseArtilleryBotShot(state);
    expect(Math.abs(shot.angle - state.botPrevious.shot.angle)).toBeLessThanOrEqual(11);
    expect(Math.abs(shot.power - state.botPrevious.shot.power)).toBeLessThanOrEqual(18);
    expect(shot.power).toBeGreaterThan(55);
    expect(chooseArtilleryBotShot(state)).toEqual(shot);
  });

  it('opens a Standard duel with a surveyed range rather than an exact target solve', () => {
    const initial = createArtilleryState('artillery:f8aad53d-0059-4d27-9127-712c942d3f3f', 'bot', 'standard', { world: 'stonera', mapSize: 'standard' });
    const afterPlayer = applyArtilleryShot(initial, { angle: 45, power: 71, payload: 'shell' }).state;
    const botShot = chooseArtilleryBotShot(afterPlayer);
    const outcome = applyArtilleryShot(afterPlayer, botShot).outcome;
    expect(botShot.payload).toBe('shell');
    expect(outcome.impact).not.toBeNull();
    expect(outcome.damage).toBe(0);
  });

  it('fortifies only when a nearby shot leaves the bot in lethal danger', () => {
    const state = createArtilleryState('bot-cover', 'bot', 'standard');
    state.current = 'right';
    state.tanks.right.integrity = 50;
    state.lastImpact = { x: state.tanks.right.x - 2, shooter: 'left' };
    expect(chooseArtilleryBotShot(state).payload).not.toBe('bloom');
    state.tanks.right.integrity = 25;
    const shot = chooseArtilleryBotShot(state);
    const outcome = simulateArtilleryShot(state, shot);
    expect(shot.payload).toBe('bloom');
    expect(outcome.impact).not.toBeNull();
    const movedX = artilleryMovedX(state, 'right', shot.move ?? 0);
    expect(movedX - outcome.impact!.x).toBeGreaterThanOrEqual(6);
    expect(movedX - outcome.impact!.x).toBeLessThanOrEqual(34);
  });

  it('does not retreat into a blocked ridge or sacrifice an active guard', () => {
    const state = createArtilleryState('bot-retreat', 'bot', 'standard');
    state.current = 'right';
    state.lastImpact = { x: state.tanks.right.x - 2, shooter: 'left' };
    const x = state.tanks.right.x;
    const terrain = [...state.terrain];
    terrain[x + 1] = terrain[x] + 12;
    const blocked = { ...state, terrain };
    expect(chooseArtilleryBotShot(blocked).move).toBe(0);
    expect(chooseArtilleryBotShot({ ...state, guard: { ...state.guard, right: 24 } }).move).toBe(0);
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
