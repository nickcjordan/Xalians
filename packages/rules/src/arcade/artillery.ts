import { hashSeed, nextRandom } from './random.ts';

export type ArtillerySide = 'left' | 'right';
export type ArtilleryMode = 'bot' | 'local' | 'range' | 'challenge';
export type ArtilleryPhase = 'aiming' | 'finished';
export type ArtilleryPayload = 'shell' | 'barb' | 'bore' | 'cluster' | 'bloom' | 'lance';
export type ArtillerySpecialPayload = Exclude<ArtilleryPayload, 'shell'>;
export type ArtilleryMove = -1 | 0 | 1;
export type ArtillerySystem = 'none' | 'anchor' | 'lift';
export type ArtilleryCondition = 'standard' | 'heavy-gravity' | 'thin-air' | 'spore-gust';
export type ArtilleryDifficulty = 'rookie' | 'standard' | 'expert';
export type ArtilleryPoint = { x: number; y: number };
export type ArtilleryTank = { side: ArtillerySide; x: number; integrity: number };
export type ArtilleryShot = {
  angle: number;
  power: number;
  payload?: ArtilleryPayload;
  move?: ArtilleryMove;
  system?: ArtillerySystem;
};
export type ArtilleryProjectileOutcome = {
  path: ArtilleryPoint[];
  impact: ArtilleryPoint | null;
  hit: ArtillerySide | null;
  damage: number;
  directHit: boolean;
  outOfBounds: boolean;
};
export type ArtilleryOutcome = {
  path: ArtilleryPoint[];
  projectiles: ArtilleryProjectileOutcome[];
  impact: ArtilleryPoint | null;
  hit: ArtillerySide | null;
  damage: number;
  blastDamage: number;
  fallDamage: number;
  directHit: boolean;
  terrainShift: number;
  guardAbsorbed: number;
  pressureMultiplier: number;
  outOfBounds: boolean;
  payload: ArtilleryPayload;
};
export type ArtilleryPayloadInventory = Record<ArtillerySpecialPayload, number>;
export type ArtilleryState = {
  seed: string;
  mode: ArtilleryMode;
  difficulty: ArtilleryDifficulty;
  terrain: number[];
  tanks: Record<ArtillerySide, ArtilleryTank>;
  payloads: Record<ArtillerySide, ArtilleryPayloadInventory>;
  coreAmmo: Record<ArtillerySide, number>;
  traction: Record<ArtillerySide, number>;
  systemCharges: Record<ArtillerySide, number>;
  guard: Record<ArtillerySide, number>;
  current: ArtillerySide;
  wind: number;
  condition: ArtilleryCondition;
  turn: number;
  phase: ArtilleryPhase;
  winner: ArtillerySide | null;
  botPrevious: { miss: number; shot: ArtilleryShot } | null;
  lastImpact: { x: number; shooter: ArtillerySide } | null;
  rngState: number;
};

export const ARTILLERY_WIDTH = 100;
export const ARTILLERY_HEIGHT = 60;
export const ARTILLERY_MAX_INTEGRITY = 100;
export const ARTILLERY_MAX_TRACTION = 3;
export const ARTILLERY_MOVE_DISTANCE = 14;
export const ARTILLERY_PAYLOADS: ArtilleryPayload[] = ['shell', 'barb', 'bore', 'cluster', 'bloom', 'lance'];
export const ARTILLERY_SPECIAL_PAYLOADS: ArtillerySpecialPayload[] = ['barb', 'bore', 'cluster', 'bloom', 'lance'];
export const ARTILLERY_CONDITIONS: Record<ArtilleryCondition, { gravity: number; wind: number }> = {
  standard: { gravity: 1, wind: 1 },
  'heavy-gravity': { gravity: 1.16, wind: 0.9 },
  'thin-air': { gravity: 0.86, wind: 1 },
  'spore-gust': { gravity: 1, wind: 1.4 },
};
export const ARTILLERY_PAYLOAD_RULES: Record<ArtilleryPayload, {
  blastRadius: number;
  craterRadius: number;
  craterDepth: number;
  projectileCount: number;
  penetration: number;
  baseDamage: number;
  directBonus: number;
  speedMultiplier: number;
  gravityMultiplier: number;
  terrainBuild: number;
}> = {
  shell: { blastRadius: 5.2, craterRadius: 5, craterDepth: 0.7, projectileCount: 1, penetration: 0, baseDamage: 38, directBonus: 8, speedMultiplier: 1, gravityMultiplier: 1, terrainBuild: 0 },
  barb: { blastRadius: 3.2, craterRadius: 3.1, craterDepth: 0.34, projectileCount: 3, penetration: 0, baseDamage: 20, directBonus: 4, speedMultiplier: 1, gravityMultiplier: 1, terrainBuild: 0 },
  bore: { blastRadius: 6.5, craterRadius: 4.2, craterDepth: 1.2, projectileCount: 1, penetration: 4.8, baseDamage: 44, directBonus: 6, speedMultiplier: 0.96, gravityMultiplier: 1, terrainBuild: 0 },
  cluster: { blastRadius: 3, craterRadius: 3.4, craterDepth: 0.44, projectileCount: 5, penetration: 0, baseDamage: 14, directBonus: 2, speedMultiplier: 0.98, gravityMultiplier: 1.04, terrainBuild: 0 },
  bloom: { blastRadius: 3.8, craterRadius: 6, craterDepth: 0, projectileCount: 1, penetration: 0, baseDamage: 12, directBonus: 3, speedMultiplier: 0.9, gravityMultiplier: 1.08, terrainBuild: 0.72 },
  lance: { blastRadius: 2.7, craterRadius: 2.5, craterDepth: 0.5, projectileCount: 1, penetration: 0, baseDamage: 52, directBonus: 12, speedMultiplier: 1.22, gravityMultiplier: 0.78, terrainBuild: 0 },
};

const ARTILLERY_SPEED_SCALE = 0.2;
const PAYLOAD_STOCK: ArtilleryPayloadInventory = { barb: 2, bore: 2, cluster: 1, bloom: 1, lance: 1 };

function buildTerrain(seed: string): { terrain: number[]; rngState: number } {
  let rngState = hashSeed(`${seed}:terrain`);
  const anchors: number[] = [];
  for (let index = 0; index < 9; index += 1) {
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

export function createArtilleryState(
  seed: string,
  mode: ArtilleryMode = 'bot',
  difficulty: ArtilleryDifficulty = 'standard',
): ArtilleryState {
  const built = buildTerrain(seed);
  const windDraw = nextRandom(built.rngState);
  const conditionDraw = nextRandom(windDraw.state);
  const conditions: ArtilleryCondition[] = ['standard', 'heavy-gravity', 'thin-air', 'spore-gust'];
  return {
    seed,
    mode,
    difficulty,
    terrain: built.terrain,
    tanks: {
      left: { side: 'left', x: 9, integrity: ARTILLERY_MAX_INTEGRITY },
      right: { side: 'right', x: 91, integrity: ARTILLERY_MAX_INTEGRITY },
    },
    payloads: {
      left: mode === 'challenge' ? { barb: 1, bore: 1, cluster: 1, bloom: 0, lance: 1 } : { ...PAYLOAD_STOCK },
      right: { ...PAYLOAD_STOCK },
    },
    coreAmmo: { left: mode === 'challenge' ? 1 : -1, right: -1 },
    traction: { left: ARTILLERY_MAX_TRACTION, right: ARTILLERY_MAX_TRACTION },
    systemCharges: { left: 2, right: 2 },
    guard: { left: 0, right: 0 },
    current: 'left',
    wind: Math.round((windDraw.value * 2 - 1) * 8),
    condition: conditions[Math.floor(conditionDraw.value * conditions.length)],
    turn: 0,
    phase: 'aiming',
    winner: null,
    botPrevious: null,
    lastImpact: null,
    rngState: conditionDraw.state,
  };
}

function isPayload(value: unknown): value is ArtilleryPayload {
  return typeof value === 'string' && ARTILLERY_PAYLOADS.includes(value as ArtilleryPayload);
}

function normalizedShot(shot: ArtilleryShot): Required<ArtilleryShot> {
  return {
    angle: Math.max(10, Math.min(80, Math.round(shot.angle))),
    power: Math.max(15, Math.min(100, Math.round(shot.power))),
    payload: isPayload(shot.payload) ? shot.payload : 'shell',
    move: shot.move === -1 || shot.move === 1 ? shot.move : 0,
    system: shot.system === 'anchor' || shot.system === 'lift' ? shot.system : 'none',
  };
}

function availableShot(state: ArtilleryState, input: ArtilleryShot): Required<ArtilleryShot> {
  const shot = normalizedShot(input);
  const shellAvailable = state.coreAmmo[state.current] !== 0;
  const specialAvailable = shot.payload === 'shell' || state.payloads[state.current][shot.payload] > 0;
  const firstSpecial = ARTILLERY_SPECIAL_PAYLOADS.find((payload) => state.payloads[state.current][payload] > 0);
  const payload = specialAvailable && (shot.payload !== 'shell' || shellAvailable)
    ? shot.payload
    : shellAvailable ? 'shell' : firstSpecial ?? 'shell';
  const expectedSystem: ArtillerySystem = state.current === 'left' ? 'anchor' : 'lift';
  const system = shot.system === expectedSystem && state.systemCharges[state.current] > 0 ? shot.system : 'none';
  const move = state.traction[state.current] <= 0 || system === 'anchor' ? 0 : shot.move;
  return { ...shot, payload, move, system };
}

export function artilleryMovedX(state: ArtilleryState, side: ArtillerySide, move: ArtilleryMove): number {
  if (!move || state.traction[side] <= 0) return state.tanks[side].x;
  const direction = side === 'left' ? move : -move;
  const minimum = side === 'left' ? 4 : 52;
  const maximum = side === 'left' ? 48 : 96;
  const target = Math.max(minimum, Math.min(maximum, state.tanks[side].x + direction * ARTILLERY_MOVE_DISTANCE));
  let reached = state.tanks[side].x;
  const steps = Math.ceil(Math.abs(target - reached));
  for (let step = 1; step <= steps; step += 1) {
    const candidate = reached + direction * Math.min(1, Math.abs(target - reached));
    if (Math.abs(terrainHeight(state.terrain, candidate) - terrainHeight(state.terrain, reached)) > 2.8) break;
    reached = candidate;
  }
  return Math.round(reached * 10) / 10;
}

function damageAtDistance(payload: ArtilleryPayload, distance: number, directHit: boolean): number {
  const rules = ARTILLERY_PAYLOAD_RULES[payload];
  if (directHit) return rules.baseDamage + rules.directBonus;
  if (distance > rules.blastRadius) return 0;
  return Math.max(1, Math.round(rules.baseDamage * (1 - (distance / rules.blastRadius) * 0.72)));
}

function simulateProjectile(
  state: ArtilleryState,
  shot: Required<ArtilleryShot>,
  shooterX: number,
  angleOffset: number,
): ArtilleryProjectileOutcome {
  const rules = ARTILLERY_PAYLOAD_RULES[shot.payload];
  const targetSide: ArtillerySide = state.current === 'left' ? 'right' : 'left';
  const target = state.tanks[targetSide];
  const direction = state.current === 'left' ? 1 : -1;
  const radians = ((shot.angle + angleOffset) * Math.PI) / 180;
  const speed = shot.power * ARTILLERY_SPEED_SCALE * rules.speedMultiplier;
  let x = shooterX + direction * 1.8;
  let y = terrainHeight(state.terrain, shooterX) + 3.2;
  let vx = Math.cos(radians) * speed * direction;
  let vy = Math.sin(radians) * speed;
  const dt = 0.075;
  const path: ArtilleryPoint[] = [{ x, y }];

  for (let step = 0; step < 900; step += 1) {
    const condition = ARTILLERY_CONDITIONS[state.condition];
    vx += state.wind * condition.wind * 0.018 * dt;
    vy -= 3.7 * rules.gravityMultiplier * condition.gravity * dt;
    x += vx * dt;
    y += vy * dt;
    if (step % 3 === 0) path.push({ x, y });
    const tankY = terrainHeight(state.terrain, target.x) + 1.5;
    if (Math.hypot(x - target.x, y - tankY) <= 2.3) {
      const impact = { x, y };
      path.push(impact);
      return { path, impact, hit: targetSide, damage: damageAtDistance(shot.payload, 0, true), directHit: true, outOfBounds: false };
    }
    if (x < -3 || x > ARTILLERY_WIDTH + 3 || y > ARTILLERY_HEIGHT + 20) {
      return { path, impact: null, hit: null, damage: 0, directHit: false, outOfBounds: true };
    }
    if (y <= terrainHeight(state.terrain, x)) {
      const surfaceY = terrainHeight(state.terrain, x);
      const impact = { x, y: Math.max(1, surfaceY - rules.penetration) };
      path.push({ x, y: surfaceY });
      if (rules.penetration) path.push(impact);
      const distance = Math.hypot(impact.x - target.x, impact.y - tankY);
      const damage = damageAtDistance(shot.payload, distance, false);
      return { path, impact, hit: damage ? targetSide : null, damage, directHit: false, outOfBounds: false };
    }
  }
  return { path, impact: null, hit: null, damage: 0, directHit: false, outOfBounds: true };
}

function projectileOffsets(payload: ArtilleryPayload): number[] {
  if (payload === 'barb') return [-4, 0, 4];
  if (payload === 'cluster') return [-7, -3.5, 0, 3.5, 7];
  return [0];
}

export function simulateArtilleryShot(state: ArtilleryState, input: ArtilleryShot): ArtilleryOutcome {
  const shot = availableShot(state, input);
  const targetSide: ArtillerySide = state.current === 'left' ? 'right' : 'left';
  const target = state.tanks[targetSide];
  const shooterX = artilleryMovedX(state, state.current, shot.move);
  const projectiles = projectileOffsets(shot.payload).map((offset) => simulateProjectile(state, shot, shooterX, offset));
  const landed = projectiles.filter((projectile) => projectile.impact);
  const closest = [...landed].sort((a, b) =>
    Math.abs((a.impact?.x ?? 0) - target.x) - Math.abs((b.impact?.x ?? 0) - target.x)
  )[0] ?? projectiles[0];
  const blastDamage = Math.min(75, projectiles.reduce((total, projectile) => total + projectile.damage, 0));
  return {
    path: projectiles[Math.floor(projectiles.length / 2)].path,
    projectiles,
    impact: closest.impact,
    hit: blastDamage > 0 ? targetSide : null,
    damage: blastDamage,
    blastDamage,
    fallDamage: 0,
    directHit: projectiles.some((projectile) => projectile.directHit),
    terrainShift: 0,
    guardAbsorbed: 0,
    pressureMultiplier: 1,
    outOfBounds: projectiles.every((projectile) => projectile.outOfBounds),
    payload: shot.payload,
  };
}

function reshapeTerrain(terrain: readonly number[], impact: ArtilleryPoint | null, payload: ArtilleryPayload): number[] {
  if (!impact) return [...terrain];
  const rules = ARTILLERY_PAYLOAD_RULES[payload];
  return terrain.map((height, x) => {
    const distance = Math.abs(x - impact.x);
    if (distance >= rules.craterRadius) return height;
    const curve = Math.sqrt(rules.craterRadius * rules.craterRadius - distance * distance);
    if (rules.terrainBuild) return Math.min(36, height + curve * rules.terrainBuild);
    return Math.max(2, height - curve * rules.craterDepth);
  });
}

export function applyArtilleryShot(
  state: ArtilleryState,
  input: ArtilleryShot,
): { state: ArtilleryState; outcome: ArtilleryOutcome } {
  if (state.phase !== 'aiming') throw new Error('The artillery match is already finished.');
  const shot = availableShot(state, input);
  const simulated = simulateArtilleryShot(state, shot);
  const targetSide: ArtillerySide = state.current === 'left' ? 'right' : 'left';
  const tanks = { left: { ...state.tanks.left }, right: { ...state.tanks.right } };
  const movedX = artilleryMovedX(state, state.current, shot.move);
  const spentTraction = movedX !== state.tanks[state.current].x;
  tanks[state.current].x = movedX;
  const terrain = simulated.projectiles.reduce(
    (current, projectile) => reshapeTerrain(current, projectile.impact, shot.payload),
    state.terrain,
  );
  const oldGround = terrainHeight(state.terrain, tanks[targetSide].x);
  const newGround = terrainHeight(terrain, tanks[targetSide].x);
  const terrainShift = Math.round((newGround - oldGround) * 10) / 10;
  const rawFallDamage = terrainShift < -3 ? Math.min(24, Math.round((-terrainShift - 3) * 4)) : 0;
  const fallDamage = targetSide === 'right' ? Math.ceil(rawFallDamage / 2) : rawFallDamage;
  const pressureMultiplier = Math.min(1.6, 1 + Math.max(0, state.turn - 9) * 0.12);
  const rawDamage = Math.min(ARTILLERY_MAX_INTEGRITY, Math.round((simulated.blastDamage + fallDamage) * pressureMultiplier));
  const guardAbsorbed = Math.min(state.guard[targetSide], rawDamage);
  const damage = rawDamage - guardAbsorbed;
  const outcome: ArtilleryOutcome = { ...simulated, damage, fallDamage, terrainShift, guardAbsorbed, pressureMultiplier };
  if (damage) tanks[targetSide].integrity = Math.max(0, tanks[targetSide].integrity - damage);
  if (state.mode === 'range') tanks.right.integrity = ARTILLERY_MAX_INTEGRITY;
  if (shot.system === 'anchor') tanks[state.current].integrity = Math.min(ARTILLERY_MAX_INTEGRITY, tanks[state.current].integrity + 12);
  const rangeFinished = state.mode === 'range' && state.turn + 1 >= 6;
  const challengeFinished = state.mode === 'challenge' && (tanks.right.integrity === 0 || state.turn + 1 >= 5);
  const winner = challengeFinished
    ? tanks.right.integrity === 0 ? 'left' : 'right'
    : tanks[targetSide].integrity === 0 || rangeFinished ? state.current : null;
  const windChanges = (state.current === 'right' || state.mode === 'range' || state.mode === 'challenge') && !winner;
  const nextWind = windChanges ? nextRandom(state.rngState) : { value: 0.5, state: state.rngState };
  const nextConditionDraw = windChanges ? nextRandom(nextWind.state) : { value: 0, state: nextWind.state };
  const conditions: ArtilleryCondition[] = ['standard', 'heavy-gravity', 'thin-air', 'spore-gust'];
  const impactX = outcome.impact?.x ?? (state.current === 'left' ? ARTILLERY_WIDTH + 8 : -8);
  const miss = impactX - state.tanks[targetSide].x;
  const payloads = {
    left: { ...state.payloads.left },
    right: { ...state.payloads.right },
  };
  if (shot.payload !== 'shell') payloads[state.current][shot.payload] -= 1;
  const coreAmmo = { ...state.coreAmmo };
  if (shot.payload === 'shell' && coreAmmo[state.current] > 0) coreAmmo[state.current] -= 1;
  const completedLeftTurns = state.current === 'left' ? Math.floor(state.turn / 2) + 1 : Math.floor(state.turn / 2);
  if (state.current === 'left' && state.mode !== 'range' && state.mode !== 'challenge' && completedLeftTurns % 3 === 0) {
    payloads.left.barb = Math.min(PAYLOAD_STOCK.barb, payloads.left.barb + 1);
  }
  return {
    outcome,
    state: {
      ...state,
      terrain,
      tanks,
      payloads,
      coreAmmo,
      traction: {
        ...state.traction,
        [state.current]: Math.max(0, state.traction[state.current] - Number(spentTraction)),
      },
      systemCharges: {
        ...state.systemCharges,
        [state.current]: state.systemCharges[state.current] - Number(shot.system !== 'none'),
      },
      guard: {
        ...state.guard,
        [targetSide]: 0,
        [state.current]: shot.system === 'anchor' ? 22 : shot.system === 'lift' ? 18 : state.guard[state.current],
      },
      current: winner || state.mode === 'range' || state.mode === 'challenge' ? state.current : targetSide,
      wind: windChanges ? Math.round((nextWind.value * 2 - 1) * 8) : state.wind,
      condition: windChanges ? conditions[Math.floor(nextConditionDraw.value * conditions.length)] : state.condition,
      turn: state.turn + 1,
      phase: winner ? 'finished' : 'aiming',
      winner,
      botPrevious: state.current === 'right' ? { miss, shot } : state.botPrevious,
      lastImpact: outcome.impact ? { x: outcome.impact.x, shooter: state.current } : state.lastImpact,
      rngState: nextConditionDraw.state,
    },
  };
}

export function chooseArtilleryBotShot(state: ArtilleryState): ArtilleryShot {
  if (state.current !== 'right') throw new Error('The bot only controls the right tank.');
  const draw = nextRandom(state.rngState ^ (state.turn + 1));
  const profile = {
    rookie: { angleError: 3.4, powerError: 8, specialChance: 0.2 },
    standard: { angleError: 1.2, powerError: 3.2, specialChance: 0.48 },
    expert: { angleError: 0.55, powerError: 1.4, specialChance: 0.78 },
  }[state.difficulty];
  const threatened = state.lastImpact && Math.abs(state.lastImpact.x - state.tanks.right.x) <= 9;
  const move: ArtilleryMove = threatened && state.traction.right > 0
    ? state.lastImpact!.x < state.tanks.right.x ? -1 : 1
    : 0;
  const miss = Math.abs(state.botPrevious?.miss ?? 99);
  const usesSpecial = draw.value <= profile.specialChance;
  const fortifying = !!threatened && state.tanks.right.integrity <= 60 && state.payloads.right.bloom > 0;
  const payload: ArtilleryPayload = fortifying
    ? 'bloom'
    : usesSpecial && miss <= 5 && state.payloads.right.lance > 0
    ? 'lance'
    : usesSpecial && state.payloads.right.barb > 0
      ? 'barb'
      : usesSpecial && state.payloads.right.cluster > 0
        ? 'cluster'
        : state.payloads.right.bore > 0 && draw.value > 0.86 ? 'bore' : 'shell';
  let solution: { angle: number; power: number; score: number } | null = null;
  for (let angle = 16; angle <= 76; angle += 3) {
    for (let power = 20; power <= 100; power += 2) {
      const outcome = simulateArtilleryShot(state, { angle, power, payload, move });
      const coverX = state.tanks.right.x - 10;
      const score = fortifying
        ? outcome.impact ? 2000 - Math.abs(outcome.impact.x - coverX) * 100 - power : -1000
        : outcome.damage * 100 - power - Math.abs(angle - 45) * 0.1;
      if (!solution || score > solution.score) solution = { angle, power, score };
    }
  }
  const fallback = state.botPrevious?.shot ?? { angle: 44, power: 70 };
  const planned = solution && solution.score > 0 ? solution : fallback;
  const errorSign = draw.value < 0.5 ? -1 : 1;
  return normalizedShot({
    angle: planned.angle + errorSign * profile.angleError,
    power: planned.power + (0.5 - draw.value) * 2 * profile.powerError,
    payload,
    move,
    system: state.systemCharges.right > 0 && state.tanks.right.integrity <= 58 && draw.value > 0.35 ? 'lift' : 'none',
  });
}
