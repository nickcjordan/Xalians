import { hashSeed, nextRandom } from './random.ts';

export type ArtillerySide = 'left' | 'right';
export type ArtilleryMode = 'bot' | 'local';
export type ArtilleryPhase = 'aiming' | 'finished';

export type ArtilleryTank = {
  side: ArtillerySide;
  x: number;
  integrity: number;
};

export type ArtilleryShot = {
  angle: number;
  power: number;
};

export type ArtilleryPoint = { x: number; y: number };

export type ArtilleryOutcome = {
  path: ArtilleryPoint[];
  impact: ArtilleryPoint | null;
  hit: ArtillerySide | null;
  damage: number;
  outOfBounds: boolean;
};

export type ArtilleryState = {
  seed: string;
  mode: ArtilleryMode;
  terrain: number[];
  tanks: Record<ArtillerySide, ArtilleryTank>;
  current: ArtillerySide;
  wind: number;
  turn: number;
  phase: ArtilleryPhase;
  winner: ArtillerySide | null;
  botPrevious: { miss: number; shot: ArtilleryShot } | null;
  rngState: number;
};

export const ARTILLERY_WIDTH = 100;
export const ARTILLERY_HEIGHT = 60;
export const ARTILLERY_MAX_INTEGRITY = 3;
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
    current: 'left',
    wind: Math.round((windDraw.value * 2 - 1) * 8),
    turn: 0,
    phase: 'aiming',
    winner: null,
    botPrevious: null,
    rngState: windDraw.state,
  };
}

function normalizedShot(shot: ArtilleryShot): ArtilleryShot {
  return {
    angle: Math.max(10, Math.min(80, Math.round(shot.angle))),
    power: Math.max(15, Math.min(100, Math.round(shot.power))),
  };
}

export function simulateArtilleryShot(state: ArtilleryState, input: ArtilleryShot): ArtilleryOutcome {
  const shot = normalizedShot(input);
  const shooter = state.tanks[state.current];
  const targetSide: ArtillerySide = state.current === 'left' ? 'right' : 'left';
  const target = state.tanks[targetSide];
  const direction = state.current === 'left' ? 1 : -1;
  const radians = (shot.angle * Math.PI) / 180;
  const speed = shot.power * ARTILLERY_SPEED_SCALE;
  let x = shooter.x + direction * 1.8;
  let y = terrainHeight(state.terrain, shooter.x) + 3.2;
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
      return { path, impact, hit: targetSide, damage: 1, outOfBounds: false };
    }
    if (x < -3 || x > ARTILLERY_WIDTH + 3 || y > ARTILLERY_HEIGHT + 20) {
      return { path, impact: null, hit: null, damage: 0, outOfBounds: true };
    }
    if (y <= terrainHeight(state.terrain, x)) {
      const impact = { x, y: terrainHeight(state.terrain, x) };
      path.push(impact);
      const distance = Math.abs(x - target.x);
      const damage = distance <= 4.5 ? 1 : 0;
      return { path, impact, hit: damage ? targetSide : null, damage, outOfBounds: false };
    }
  }
  return { path, impact: null, hit: null, damage: 0, outOfBounds: true };
}

function craterTerrain(terrain: readonly number[], impact: ArtilleryPoint | null): number[] {
  if (!impact) return [...terrain];
  const radius = 4.8;
  return terrain.map((height, x) => {
    const distance = Math.abs(x - impact.x);
    if (distance >= radius) return height;
    const depth = Math.sqrt(radius * radius - distance * distance) * 0.72;
    return Math.max(2, height - depth);
  });
}

export function applyArtilleryShot(
  state: ArtilleryState,
  input: ArtilleryShot
): { state: ArtilleryState; outcome: ArtilleryOutcome } {
  if (state.phase !== 'aiming') throw new Error('The artillery match is already finished.');
  const shot = normalizedShot(input);
  const outcome = simulateArtilleryShot(state, shot);
  const targetSide: ArtillerySide = state.current === 'left' ? 'right' : 'left';
  const tanks = {
    left: { ...state.tanks.left },
    right: { ...state.tanks.right },
  };
  if (outcome.damage) tanks[targetSide].integrity = Math.max(0, tanks[targetSide].integrity - outcome.damage);
  const winner = tanks[targetSide].integrity === 0 ? state.current : null;
  const nextWind = nextRandom(state.rngState);
  const impactX = outcome.impact?.x ?? (state.current === 'left' ? ARTILLERY_WIDTH + 8 : -8);
  const miss = impactX - state.tanks[targetSide].x;
  return {
    outcome,
    state: {
      ...state,
      terrain: craterTerrain(state.terrain, outcome.impact),
      tanks,
      current: winner ? state.current : targetSide,
      wind: Math.round((nextWind.value * 2 - 1) * 8),
      turn: state.turn + 1,
      phase: winner ? 'finished' : 'aiming',
      winner,
      botPrevious: state.current === 'right' ? { miss, shot } : state.botPrevious,
      rngState: nextWind.state,
    },
  };
}

export function chooseArtilleryBotShot(state: ArtilleryState): ArtilleryShot {
  if (state.current !== 'right') throw new Error('The bot only controls the right tank.');
  const draw = nextRandom(state.rngState ^ (state.turn + 1));
  if (state.botPrevious) {
    const correction = Math.max(-13, Math.min(13, state.botPrevious.miss * 0.58));
    return normalizedShot({
      angle: state.botPrevious.shot.angle + (draw.value - 0.5) * 3,
      power: state.botPrevious.shot.power + correction,
    });
  }
  return normalizedShot({ angle: 42 + (draw.value - 0.5) * 12, power: 70 + (draw.value - 0.5) * 8 });
}
