import { hashSeed, nextRandom } from './random.ts';

export type ArtillerySide = 'left' | 'right';
export type ArtilleryMode = 'bot' | 'local';
export type ArtilleryPhase = 'aiming' | 'finished';
export type ArtilleryPayload = 'shell' | 'barb' | 'bore';
export type ArtilleryMove = -1 | 0 | 1;

export type ArtilleryTank = {
  side: ArtillerySide;
  x: number;
  integrity: number;
};

export type ArtilleryShot = {
  angle: number;
  power: number;
  payload?: ArtilleryPayload;
  move?: ArtilleryMove;
};

export type ArtilleryPoint = { x: number; y: number };

export type ArtilleryProjectileOutcome = {
  path: ArtilleryPoint[];
  impact: ArtilleryPoint | null;
  hit: ArtillerySide | null;
  outOfBounds: boolean;
};

export type ArtilleryOutcome = {
  path: ArtilleryPoint[];
  projectiles: ArtilleryProjectileOutcome[];
  impact: ArtilleryPoint | null;
  hit: ArtillerySide | null;
  damage: number;
  outOfBounds: boolean;
  payload: ArtilleryPayload;
};

export type ArtilleryPayloadInventory = Record<Exclude<ArtilleryPayload, 'shell'>, number>;

export type ArtilleryState = {
  seed: string;
  mode: ArtilleryMode;
  terrain: number[];
  tanks: Record<ArtillerySide, ArtilleryTank>;
  payloads: Record<ArtillerySide, ArtilleryPayloadInventory>;
  traction: Record<ArtillerySide, number>;
  current: ArtillerySide;
  wind: number;
  turn: number;
  phase: ArtilleryPhase;
  winner: ArtillerySide | null;
  botPrevious: { miss: number; shot: ArtilleryShot } | null;
  lastImpact: { x: number; shooter: ArtillerySide } | null;
  rngState: number;
};

export const ARTILLERY_WIDTH = 100;
export const ARTILLERY_HEIGHT = 60;
export const ARTILLERY_MAX_INTEGRITY = 3;
export const ARTILLERY_MAX_TRACTION = 2;
export const ARTILLERY_MOVE_DISTANCE = 4;
export const ARTILLERY_PAYLOAD_RULES: Record<ArtilleryPayload, {
  blastRadius: number;
  craterRadius: number;
  craterDepth: number;
  projectileCount: number;
  penetration: number;
}> = {
  shell: { blastRadius: 4.5, craterRadius: 4.8, craterDepth: 0.72, projectileCount: 1, penetration: 0 },
  barb: { blastRadius: 2.8, craterRadius: 3.2, craterDepth: 0.38, projectileCount: 3, penetration: 0 },
  bore: { blastRadius: 6.2, craterRadius: 4.1, craterDepth: 1.28, projectileCount: 1, penetration: 4.5 },
};
const ARTILLERY_SPEED_SCALE = 0.2;

function buildTerrain(seed: string): { terrain: number[]; rngState: number } {
  let rngState = hashSeed(`${seed}:terrain`);
  const anchors: number[] = [];
  for (let i = 0; i < 9; i += 1) {
    const draw = nextRandom(rngState);
    rngState = draw.state;
    anchors.push(10 + draw.value * 17);
  }
  const terrain = Array.from({ length: ARTILLERY_WIDTH + 1 }, (_, x) => {
    const position = (x / ARTILLERY_WIDTH) * (anchors.length - 1);
    const a = Math.floor(position);
    const b = Math.min(anchors.length - 1, a + 1);
    const t = position - a;
    const eased = t * t * (3 - 2 * t);
    return anchors[a] * (1 - eased) + anchors[b] * eased;
  });
  return { terrain, rngState };
}

export function terrainHeight(terrain: readonly number[], x: number): number {
  const clamped = Math.max(0, Math.min(ARTILLERY_WIDTH, x));
  const left = Math.floor(clamped);
  const right = Math.min(ARTILLERY_WIDTH, left + 1);
  const t = clamped - left;
  return terrain[left] * (1 - t) + terrain[right] * t;
}

export function createArtilleryState(seed: string, mode: ArtilleryMode = 'bot'): ArtilleryState {
  const built = buildTerrain(seed);
  const windDraw = nextRandom(built.rngState);
  return {
    seed,
    mode,
    terrain: built.terrain,
    tanks: {
      left: { side: 'left', x: 10, integrity: ARTILLERY_MAX_INTEGRITY },
      right: { side: 'right', x: 90, integrity: ARTILLERY_MAX_INTEGRITY },
    },
    payloads: {
      left: { barb: 2, bore: 2 },
      right: { barb: 2, bore: 2 },
    },
    traction: { left: ARTILLERY_MAX_TRACTION, right: ARTILLERY_MAX_TRACTION },
    current: 'left',
    wind: Math.round((windDraw.value * 2 - 1) * 8),
    turn: 0,
    phase: 'aiming',
    winner: null,
    botPrevious: null,
    lastImpact: null,
    rngState: windDraw.state,
  };
}

function normalizedShot(shot: ArtilleryShot): ArtilleryShot {
  const payload: ArtilleryPayload = shot.payload === 'barb' || shot.payload === 'bore' ? shot.payload : 'shell';
  return {
    angle: Math.max(10, Math.min(80, Math.round(shot.angle))),
    power: Math.max(15, Math.min(100, Math.round(shot.power))),
    payload,
    move: shot.move === -1 || shot.move === 1 ? shot.move : 0,
  };
}

function availableShot(state: ArtilleryState, input: ArtilleryShot): Required<ArtilleryShot> {
  const shot = normalizedShot(input) as Required<ArtilleryShot>;
  const payload = shot.payload !== 'shell' && state.payloads[state.current][shot.payload] <= 0 ? 'shell' : shot.payload;
  const move = state.traction[state.current] <= 0 ? 0 : shot.move;
  return { ...shot, payload, move };
}

export function artilleryMovedX(state: ArtilleryState, side: ArtillerySide, move: ArtilleryMove): number {
  if (!move || state.traction[side] <= 0) return state.tanks[side].x;
  const direction = side === 'left' ? move : -move;
  const minimum = side === 'left' ? 5 : 55;
  const maximum = side === 'left' ? 45 : 95;
  return Math.max(minimum, Math.min(maximum, state.tanks[side].x + direction * ARTILLERY_MOVE_DISTANCE));
}

function simulateProjectile(
  state: ArtilleryState,
  shot: Required<ArtilleryShot>,
  shooterX: number,
  angleOffset: number,
): ArtilleryProjectileOutcome {
  const payloadRules = ARTILLERY_PAYLOAD_RULES[shot.payload];
  const targetSide: ArtillerySide = state.current === 'left' ? 'right' : 'left';
  const target = state.tanks[targetSide];
  const direction = state.current === 'left' ? 1 : -1;
  const radians = ((shot.angle + angleOffset) * Math.PI) / 180;
  const speed = shot.power * ARTILLERY_SPEED_SCALE;
  let x = shooterX + direction * 1.8;
  let y = terrainHeight(state.terrain, shooterX) + 3.2;
  let vx = Math.cos(radians) * speed * direction;
  let vy = Math.sin(radians) * speed;
  const dt = 0.075;
  const gravity = 3.7;
  const windAcceleration = state.wind * 0.018;
  const path: ArtilleryPoint[] = [{ x, y }];

  for (let step = 0; step < 900; step += 1) {
    vx += windAcceleration * dt;
    vy -= gravity * dt;
    x += vx * dt;
    y += vy * dt;
    if (step % 3 === 0) path.push({ x, y });

    const tankY = terrainHeight(state.terrain, target.x) + 1.5;
    if (Math.hypot(x - target.x, y - tankY) <= 2.3) {
      const impact = { x, y };
      path.push(impact);
      return { path, impact, hit: targetSide, outOfBounds: false };
    }
    if (x < -3 || x > ARTILLERY_WIDTH + 3 || y > ARTILLERY_HEIGHT + 20) {
      return { path, impact: null, hit: null, outOfBounds: true };
    }
    if (y <= terrainHeight(state.terrain, x)) {
      const surfaceY = terrainHeight(state.terrain, x);
      const impact = { x, y: Math.max(1, surfaceY - payloadRules.penetration) };
      path.push({ x, y: surfaceY });
      if (payloadRules.penetration) path.push(impact);
      const damage = Math.hypot(impact.x - target.x, impact.y - tankY) <= payloadRules.blastRadius;
      return { path, impact, hit: damage ? targetSide : null, outOfBounds: false };
    }
  }
  return { path, impact: null, hit: null, outOfBounds: true };
}

export function simulateArtilleryShot(state: ArtilleryState, input: ArtilleryShot): ArtilleryOutcome {
  const shot = availableShot(state, input);
  const targetSide: ArtillerySide = state.current === 'left' ? 'right' : 'left';
  const target = state.tanks[targetSide];
  const shooterX = artilleryMovedX(state, state.current, shot.move);
  const offsets = shot.payload === 'barb' ? [-4, 0, 4] : [0];
  const projectiles = offsets.map((offset) => simulateProjectile(state, shot, shooterX, offset));
  const landed = projectiles.filter((projectile) => projectile.impact);
  const closest = [...landed].sort((a, b) =>
    Math.abs((a.impact?.x ?? 0) - target.x) - Math.abs((b.impact?.x ?? 0) - target.x)
  )[0] ?? projectiles[0];
  const hit = projectiles.some((projectile) => projectile.hit === targetSide) ? targetSide : null;
  return {
    path: projectiles[Math.floor(projectiles.length / 2)].path,
    projectiles,
    impact: closest.impact,
    hit,
    damage: hit ? 1 : 0,
    outOfBounds: projectiles.every((projectile) => projectile.outOfBounds),
    payload: shot.payload,
  };
}

function craterTerrain(terrain: readonly number[], impact: ArtilleryPoint | null, payload: ArtilleryPayload): number[] {
  if (!impact) return [...terrain];
  const { craterRadius: radius, craterDepth } = ARTILLERY_PAYLOAD_RULES[payload];
  return terrain.map((height, x) => {
    const distance = Math.abs(x - impact.x);
    if (distance >= radius) return height;
    const depth = Math.sqrt(radius * radius - distance * distance) * craterDepth;
    return Math.max(2, height - depth);
  });
}

export function applyArtilleryShot(
  state: ArtilleryState,
  input: ArtilleryShot
): { state: ArtilleryState; outcome: ArtilleryOutcome } {
  if (state.phase !== 'aiming') throw new Error('The artillery match is already finished.');
  const shot = availableShot(state, input);
  const outcome = simulateArtilleryShot(state, shot);
  const targetSide: ArtillerySide = state.current === 'left' ? 'right' : 'left';
  const tanks = {
    left: { ...state.tanks.left },
    right: { ...state.tanks.right },
  };
  const movedX = artilleryMovedX(state, state.current, shot.move);
  const spentTraction = movedX !== state.tanks[state.current].x;
  tanks[state.current].x = movedX;
  if (outcome.damage) tanks[targetSide].integrity = Math.max(0, tanks[targetSide].integrity - outcome.damage);
  const winner = tanks[targetSide].integrity === 0 ? state.current : null;
  const windChanges = state.current === 'right' && !winner;
  const nextWind = windChanges ? nextRandom(state.rngState) : { value: 0.5, state: state.rngState };
  const impactX = outcome.impact?.x ?? (state.current === 'left' ? ARTILLERY_WIDTH + 8 : -8);
  const miss = impactX - state.tanks[targetSide].x;
  return {
    outcome,
    state: {
      ...state,
      terrain: outcome.projectiles.reduce(
        (terrain, projectile) => craterTerrain(terrain, projectile.impact, shot.payload),
        state.terrain,
      ),
      tanks,
      payloads: {
        left: { ...state.payloads.left },
        right: { ...state.payloads.right },
        ...(shot.payload === 'shell' ? {} : {
          [state.current]: {
            ...state.payloads[state.current],
            [shot.payload]: state.payloads[state.current][shot.payload] - 1,
          },
        }),
      },
      traction: {
        ...state.traction,
        [state.current]: Math.max(0, state.traction[state.current] - Number(spentTraction)),
      },
      current: winner ? state.current : targetSide,
      wind: windChanges ? Math.round((nextWind.value * 2 - 1) * 8) : state.wind,
      turn: state.turn + 1,
      phase: winner ? 'finished' : 'aiming',
      winner,
      botPrevious: state.current === 'right' ? { miss, shot } : state.botPrevious,
      lastImpact: outcome.impact ? { x: outcome.impact.x, shooter: state.current } : state.lastImpact,
      rngState: nextWind.state,
    },
  };
}

export function chooseArtilleryBotShot(state: ArtilleryState): ArtilleryShot {
  if (state.current !== 'right') throw new Error('The bot only controls the right tank.');
  const draw = nextRandom(state.rngState ^ (state.turn + 1));
  const threatened = state.lastImpact && Math.abs(state.lastImpact.x - state.tanks.right.x) <= 8;
  const move: ArtilleryMove = threatened && state.traction.right > 0
    ? state.lastImpact!.x < state.tanks.right.x ? -1 : 1
    : 0;
  if (state.botPrevious) {
    const correction = Math.max(-13, Math.min(13, state.botPrevious.miss * 0.58));
    const payload: ArtilleryPayload = Math.abs(state.botPrevious.miss) <= 9 && state.payloads.right.barb > 0
      ? 'barb'
      : state.payloads.right.bore > 0 && draw.value > 0.82 ? 'bore' : 'shell';
    return normalizedShot({
      angle: state.botPrevious.shot.angle + (draw.value - 0.5) * 3,
      power: state.botPrevious.shot.power + correction,
      payload,
      move,
    });
  }
  return normalizedShot({ angle: 42 + (draw.value - 0.5) * 12, power: 70 + (draw.value - 0.5) * 8, payload: 'shell', move });
}
