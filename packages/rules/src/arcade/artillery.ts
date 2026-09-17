import { hashSeed, nextRandom } from './random.ts';

export type ArtillerySide = 'left' | 'right';
export type ArtilleryCreature = 'codazzo' | 'terragoyle';
export type ArtilleryMode = 'bot' | 'local' | 'range' | 'challenge';
export type ArtilleryMapSize = 'compact' | 'standard' | 'wide';
export type ArtilleryWorld = 'stonera' | 'magmuth' | 'krystos' | 'endessa';
export type ArtilleryMobility = 'drive' | 'jet';
export type ArtilleryPhase = 'aiming' | 'finished';
export type ArtilleryPayload = 'shell' | 'barb' | 'bore' | 'cluster' | 'bloom' | 'lance';
export type ArtillerySpecialPayload = Exclude<ArtilleryPayload, 'shell'>;
export type ArtilleryMove = -1 | 0 | 1;
export type ArtillerySystem = 'none' | 'anchor' | 'lift';
export type ArtilleryCondition = 'standard' | 'heavy-gravity' | 'thin-air' | 'dust-gust';
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
export type ArtilleryMoveAction = { type: 'move'; direction: Exclude<ArtilleryMove, 0>; mobility?: ArtilleryMobility; thrust?: number };
export type ArtilleryAction = ArtilleryShot | ArtilleryMoveAction;
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
  coverGranted: number;
  pressureMultiplier: number;
  outOfBounds: boolean;
  payload: ArtilleryPayload;
};
export type ArtilleryPayloadInventory = Record<ArtillerySpecialPayload, number>;
export type ArtilleryState = {
  seed: string;
  mode: ArtilleryMode;
  difficulty: ArtilleryDifficulty;
  mapSize: ArtilleryMapSize;
  world: ArtilleryWorld;
  terrain: number[];
  tanks: Record<ArtillerySide, ArtilleryTank>;
  creatures: Record<ArtillerySide, ArtilleryCreature>;
  payloads: Record<ArtillerySide, ArtilleryPayloadInventory>;
  coreAmmo: Record<ArtillerySide, number>;
  traction: Record<ArtillerySide, number>;
  jetCharges: Record<ArtillerySide, number>;
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

export const ARTILLERY_WIDTH = 300;
export const ARTILLERY_HEIGHT = 110;
export const ARTILLERY_MAX_INTEGRITY = 100;
const ARTILLERY_HULL_DAMAGE_SCALE = 0.82;
export const ARTILLERY_MAX_DRIVE_FUEL = 100;
export const ARTILLERY_MAX_JET_FUEL = 100;
export const ARTILLERY_RAMPART_GUARD = 24;
export const ARTILLERY_MAX_TRACTION = ARTILLERY_MAX_DRIVE_FUEL;
export const ARTILLERY_MAX_JET_CHARGES = ARTILLERY_MAX_JET_FUEL;
export const ARTILLERY_MOVE_DISTANCE = 22;
export const ARTILLERY_DEFAULT_THRUST = 25;
export const ARTILLERY_BARREL_LENGTH = 4.2;
export const ARTILLERY_MUZZLE_BASE_HEIGHT = 4.2;
export const ARTILLERY_MAP_WIDTHS: Record<ArtilleryMapSize, number> = {
  compact: 300,
  standard: 360,
  wide: 440,
};
export const ARTILLERY_PAYLOADS: ArtilleryPayload[] = ['shell', 'barb', 'bore', 'cluster', 'bloom', 'lance'];
export const ARTILLERY_SPECIAL_PAYLOADS: ArtillerySpecialPayload[] = ['barb', 'bore', 'cluster', 'bloom', 'lance'];
export const ARTILLERY_CONDITIONS: Record<ArtilleryCondition, { gravity: number; wind: number }> = {
  standard: { gravity: 1, wind: 1 },
  'heavy-gravity': { gravity: 1.16, wind: 0.9 },
  'thin-air': { gravity: 0.86, wind: 1 },
  'dust-gust': { gravity: 1, wind: 1.4 },
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
  shell: { blastRadius: 10.5, craterRadius: 10.5, craterDepth: 0.96, projectileCount: 1, penetration: 0, baseDamage: 38, directBonus: 8, speedMultiplier: 1, gravityMultiplier: 1, terrainBuild: 0 },
  barb: { blastRadius: 7, craterRadius: 6.2, craterDepth: 0.54, projectileCount: 3, penetration: 0, baseDamage: 28, directBonus: 4, speedMultiplier: 1, gravityMultiplier: 1, terrainBuild: 0 },
  bore: { blastRadius: 10.5, craterRadius: 8.8, craterDepth: 1.48, projectileCount: 1, penetration: 7.2, baseDamage: 44, directBonus: 6, speedMultiplier: 0.96, gravityMultiplier: 1, terrainBuild: 0 },
  cluster: { blastRadius: 9.5, craterRadius: 7, craterDepth: 0.72, projectileCount: 5, penetration: 0, baseDamage: 26, directBonus: 3, speedMultiplier: 0.98, gravityMultiplier: 1.04, terrainBuild: 0 },
  bloom: { blastRadius: 5.5, craterRadius: 15.5, craterDepth: 0, projectileCount: 1, penetration: 0, baseDamage: 12, directBonus: 3, speedMultiplier: 0.9, gravityMultiplier: 1.08, terrainBuild: 1.24 },
  lance: { blastRadius: 4.6, craterRadius: 5.2, craterDepth: 1.06, projectileCount: 1, penetration: 0, baseDamage: 52, directBonus: 12, speedMultiplier: 1.22, gravityMultiplier: 0.78, terrainBuild: 0 },
};

const ARTILLERY_SPEED_SCALE = 0.3;
const PAYLOAD_STOCK: ArtilleryPayloadInventory = { barb: 2, bore: 2, cluster: 1, bloom: 1, lance: 1 };

const WORLD_CONDITIONS: Record<ArtilleryWorld, ArtilleryCondition> = {
  stonera: 'thin-air',
  magmuth: 'heavy-gravity',
  krystos: 'standard',
  endessa: 'dust-gust',
};

function buildTerrain(seed: string, world: ArtilleryWorld, width: number): { terrain: number[]; rngState: number } {
  let rngState = hashSeed(`${seed}:${world}:terrain`);
  const anchors: number[] = [];
  const anchorCount = Math.max(17, Math.round(width / 20));
  for (let index = 0; index < anchorCount; index += 1) {
    const draw = nextRandom(rngState);
    rngState = draw.state;
    const height = world === 'magmuth'
      ? 18 + draw.value * 46
      : world === 'krystos'
        ? 24 + draw.value * 28
        : world === 'endessa'
          ? 20 + draw.value * 18
          : 18 + draw.value * 34;
    anchors.push(height);
  }
  const terrain = Array.from({ length: width + 1 }, (_, x) => {
    const position = (x / width) * (anchors.length - 1);
    const a = Math.floor(position);
    const b = Math.min(anchors.length - 1, a + 1);
    const t = position - a;
    const eased = world === 'magmuth' ? t : t * t * (3 - 2 * t);
    const base = anchors[a] * (1 - eased) + anchors[b] * eased;
    if (world === 'endessa') return base + Math.sin(x / 12) * 3.8;
    if (world === 'krystos') return base + Math.max(0, Math.sin(x / 8)) * 4;
    if (world === 'stonera') {
      const craterPhase = Math.abs((x % 74) - 37);
      return base - Math.max(0, 9 - craterPhase) * 0.7;
    }
    return base;
  });
  // Both rigs deploy on a readable launch shelf. Planet quirks begin outside
  // that shelf so a crater lip never makes the opening shot physically hidden.
  for (const ratio of [0.22, 0.78]) {
    const center = Math.round(width * ratio);
    const height = terrain[center];
    for (let offset = -7; offset <= 7; offset += 1) terrain[center + offset] = height;
  }
  return { terrain, rngState };
}

export function terrainHeight(terrain: readonly number[], x: number): number {
  const width = terrain.length - 1;
  const clamped = Math.max(0, Math.min(width, x));
  const left = Math.floor(clamped);
  const right = Math.min(width, left + 1);
  const t = clamped - left;
  return terrain[left] * (1 - t) + terrain[right] * t;
}

export function createArtilleryState(
  seed: string,
  mode: ArtilleryMode = 'bot',
  difficulty: ArtilleryDifficulty = 'standard',
  setup: ArtilleryCreature | Partial<{ mapSize: ArtilleryMapSize; world: ArtilleryWorld; playerCreature: ArtilleryCreature }> = 'codazzo',
): ArtilleryState {
  const playerCreature = typeof setup === 'string' ? setup : setup.playerCreature ?? 'codazzo';
  const mapSize = typeof setup === 'string' ? 'compact' : setup.mapSize ?? 'compact';
  const world = typeof setup === 'string' ? 'stonera' : setup.world ?? 'stonera';
  const width = ARTILLERY_MAP_WIDTHS[mapSize];
  const built = buildTerrain(seed, world, width);
  const windDraw = nextRandom(built.rngState);
  return {
    seed,
    mode,
    difficulty,
    mapSize,
    world,
    terrain: built.terrain,
    tanks: {
      left: { side: 'left', x: Math.round(width * 0.22), integrity: ARTILLERY_MAX_INTEGRITY },
      right: { side: 'right', x: Math.round(width * 0.78), integrity: ARTILLERY_MAX_INTEGRITY },
    },
    creatures: {
      left: playerCreature,
      right: playerCreature === 'codazzo' ? 'terragoyle' : 'codazzo',
    },
    payloads: {
      left: mode === 'challenge' ? { barb: 1, bore: 1, cluster: 1, bloom: 0, lance: 1 } : { ...PAYLOAD_STOCK },
      right: { ...PAYLOAD_STOCK },
    },
    coreAmmo: { left: mode === 'challenge' ? 1 : -1, right: -1 },
    traction: { left: ARTILLERY_MAX_TRACTION, right: ARTILLERY_MAX_TRACTION },
    jetCharges: { left: ARTILLERY_MAX_JET_CHARGES, right: ARTILLERY_MAX_JET_CHARGES },
    systemCharges: { left: 2, right: 2 },
    guard: { left: 0, right: 0 },
    current: 'left',
    wind: Math.round((windDraw.value * 2 - 1) * 8),
    condition: WORLD_CONDITIONS[world],
    turn: 0,
    phase: 'aiming',
    winner: null,
    botPrevious: null,
    lastImpact: null,
    rngState: windDraw.state,
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
  const system: ArtillerySystem = 'none';
  const move = state.traction[state.current] <= 0 ? 0 : shot.move;
  return { ...shot, payload, move, system };
}

export function artilleryMoveDistance(
  state: ArtilleryState,
  mobility: ArtilleryMobility = 'drive',
  thrust = ARTILLERY_DEFAULT_THRUST,
): number {
  const width = state.terrain.length - 1;
  const scaledDrive = ARTILLERY_MOVE_DISTANCE * (width / ARTILLERY_WIDTH);
  const fuelScale = Math.max(0, Math.min(ARTILLERY_MAX_DRIVE_FUEL, thrust)) / ARTILLERY_DEFAULT_THRUST;
  // Driving is the efficient way to cross open ground. The jet trades range
  // for the ability to vault a wall or leave a crater.
  return Math.round(scaledDrive * (mobility === 'jet' ? 0.8 : 1) * fuelScale * 100) / 100;
}

function artilleryMovementFuelCost(
  state: ArtilleryState,
  side: ArtillerySide,
  move: ArtilleryMove,
  mobility: ArtilleryMobility,
  requestedFuel: number,
  destination: number,
): number {
  if (!move || destination === state.tanks[side].x) return 0;
  const plannedDistance = artilleryMoveDistance(state, mobility, requestedFuel);
  if (plannedDistance <= 0) return 0;
  const traveled = Math.abs(destination - state.tanks[side].x);
  return Math.min(requestedFuel, Math.round(requestedFuel * Math.min(1, traveled / plannedDistance) * 100) / 100);
}

export function artilleryMovedX(
  state: ArtilleryState,
  side: ArtillerySide,
  move: ArtilleryMove,
  mobility: ArtilleryMobility = 'drive',
  thrust = ARTILLERY_DEFAULT_THRUST,
): number {
  const available = mobility === 'jet' ? state.jetCharges[side] : state.traction[side];
  if (!move || available <= 0) return state.tanks[side].x;
  const fuel = Math.min(available, Math.max(0, thrust));
  if (fuel <= 0) return state.tanks[side].x;
  const width = state.terrain.length - 1;
  const direction = side === 'left' ? move : -move;
  const minimum = side === 'left' ? 4 : width / 2 + 4;
  const maximum = side === 'left' ? width / 2 - 4 : width - 4;
  const target = Math.max(minimum, Math.min(maximum, state.tanks[side].x + direction * artilleryMoveDistance(state, mobility, fuel)));
  if (mobility === 'jet') return Math.round(target * 10) / 10;
  let reached = state.tanks[side].x;
  const steps = Math.ceil(Math.abs(target - reached));
  for (let step = 1; step <= steps; step += 1) {
    const candidate = reached + direction * Math.min(1, Math.abs(target - reached));
    if (Math.abs(terrainHeight(state.terrain, candidate) - terrainHeight(state.terrain, reached)) > 2.8) break;
    reached = candidate;
  }
  return Math.round(reached * 10) / 10;
}

export function applyArtilleryMove(
  state: ArtilleryState,
  move: ArtilleryMove,
  mobility: ArtilleryMobility = 'drive',
  thrust = ARTILLERY_DEFAULT_THRUST,
): { state: ArtilleryState; distance: number; fuelSpent: number } {
  if (state.phase !== 'aiming') throw new Error('The artillery match is already finished.');
  const available = mobility === 'jet' ? state.jetCharges[state.current] : state.traction[state.current];
  const requestedFuel = Math.min(available, Math.max(0, thrust));
  if (move === 0 || requestedFuel <= 0) return { state, distance: 0, fuelSpent: 0 };
  const destination = artilleryMovedX(state, state.current, move, mobility, requestedFuel);
  const distance = Math.round(Math.abs(destination - state.tanks[state.current].x) * 10) / 10;
  // Pressing into an impassable ridge or sector edge is not a successful move.
  // Do not silently drain fuel while the rig cannot advance.
  if (distance === 0) return { state, distance: 0, fuelSpent: 0 };
  const fuelSpent = artilleryMovementFuelCost(state, state.current, move, mobility, requestedFuel, destination);
  return {
    distance,
    fuelSpent,
    state: {
      ...state,
      tanks: {
        ...state.tanks,
        [state.current]: { ...state.tanks[state.current], x: destination },
      },
      traction: {
        ...state.traction,
        [state.current]: Math.max(0, state.traction[state.current] - (mobility === 'drive' ? fuelSpent : 0)),
      },
      jetCharges: {
        ...state.jetCharges,
        [state.current]: Math.max(0, state.jetCharges[state.current] - (mobility === 'jet' ? fuelSpent : 0)),
      },
      guard: { ...state.guard, [state.current]: 0 },
    },
  };
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
  speedOffset = 1,
): ArtilleryProjectileOutcome {
  const rules = ARTILLERY_PAYLOAD_RULES[shot.payload];
  const targetSide: ArtillerySide = state.current === 'left' ? 'right' : 'left';
  const target = state.tanks[targetSide];
  const direction = state.current === 'left' ? 1 : -1;
  const radians = ((shot.angle + angleOffset) * Math.PI) / 180;
  const rangeScale = Math.sqrt((state.terrain.length - 1) / ARTILLERY_WIDTH);
  const speed = shot.power * ARTILLERY_SPEED_SCALE * rangeScale * rules.speedMultiplier * speedOffset;
  // Spawn at the visible muzzle. A lower origin made shots collide with a
  // crater lip immediately even while the rendered barrel cleared the ridge.
  let x = shooterX + direction * Math.cos(radians) * ARTILLERY_BARREL_LENGTH;
  let y = terrainHeight(state.terrain, shooterX) + ARTILLERY_MUZZLE_BASE_HEIGHT
    + Math.sin(radians) * ARTILLERY_BARREL_LENGTH;
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
    const width = state.terrain.length - 1;
    // The visible viewport is a camera, not the edge of the simulation. High
    // shots can leave the top of the screen and must keep flying until gravity
    // brings them back down. Horizontal range remains the only escape boundary.
    if (x < -10 || x > width + 10) {
      return { path, impact: null, hit: null, damage: 0, directHit: false, outOfBounds: true };
    }
    if (y <= terrainHeight(state.terrain, x)) {
      const surfaceY = terrainHeight(state.terrain, x);
      const impact = { x, y: Math.max(1, surfaceY - rules.penetration) };
      path.push({ x, y: surfaceY });
      if (rules.penetration) path.push(impact);
      // The drill detonates under the surface. Its shock reaches the rig above
      // the cavity; measuring through the burial depth made a centered strike
      // weaker than an ordinary shell despite its much deeper excavation.
      const distance = shot.payload === 'bore'
        ? Math.abs(impact.x - target.x)
        : Math.hypot(impact.x - target.x, impact.y - tankY);
      const damage = damageAtDistance(shot.payload, distance, false);
      return { path, impact, hit: damage ? targetSide : null, damage, directHit: false, outOfBounds: false };
    }
  }
  return { path, impact: null, hit: null, damage: 0, directHit: false, outOfBounds: true };
}

function projectileProfiles(payload: ArtilleryPayload): Array<{ angle: number; speed: number }> {
  // Multi-projectile weapons change both elevation and velocity. Angle-only fans
  // reconverge around 45 degrees because complementary ballistic angles have the
  // same range; a velocity gradient makes the pattern actually spread at impact.
  if (payload === 'barb') return [
    { angle: -5, speed: 0.88 },
    { angle: 0, speed: 1 },
    { angle: 5, speed: 1.12 },
  ];
  if (payload === 'cluster') return [
    { angle: -9, speed: 0.84 },
    { angle: -4.5, speed: 0.92 },
    { angle: 0, speed: 1 },
    { angle: 4.5, speed: 1.08 },
    { angle: 9, speed: 1.2 },
  ];
  return [{ angle: 0, speed: 1 }];
}

// A cockpit rangefinder, not a shot preview: this is the free-flight distance
// to the rival's elevation. It accounts for the raised muzzle but ignores
// intervening ridges, collision, and later terrain changes.
export function artilleryNominalReach(state: ArtilleryState, shot: ArtilleryShot): { near: number; far: number } {
  const payload = shot.payload ?? 'shell';
  const rules = ARTILLERY_PAYLOAD_RULES[payload];
  const condition = ARTILLERY_CONDITIONS[state.condition];
  const direction = state.current === 'left' ? 1 : -1;
  const shooterX = artilleryMovedX(state, state.current, shot.move ?? 0);
  const targetX = state.tanks[state.current === 'left' ? 'right' : 'left'].x;
  const targetY = terrainHeight(state.terrain, targetX) + 1.5;
  const speed = Math.max(15, Math.min(100, shot.power)) * ARTILLERY_SPEED_SCALE
    * Math.sqrt((state.terrain.length - 1) / ARTILLERY_WIDTH) * rules.speedMultiplier;
  const gravity = 3.7 * rules.gravityMultiplier * condition.gravity;
  const ranges = projectileProfiles(payload).map((profile) => {
    const radians = (Math.max(10, Math.min(80, shot.angle)) + profile.angle) * Math.PI / 180;
    const velocity = speed * profile.speed;
    const muzzleY = terrainHeight(state.terrain, shooterX) + ARTILLERY_MUZZLE_BASE_HEIGHT
      + Math.sin(radians) * ARTILLERY_BARREL_LENGTH;
    const upwardSpeed = Math.sin(radians) * velocity;
    const discriminant = upwardSpeed * upwardSpeed - 2 * gravity * (targetY - muzzleY);
    if (discriminant < 0) return 0;
    const flightTime = Math.max(0, (upwardSpeed + Math.sqrt(discriminant)) / gravity);
    const windDrift = direction * state.wind * condition.wind * 0.018 * flightTime * flightTime / 2;
    return Math.max(0, Math.cos(radians) * ARTILLERY_BARREL_LENGTH
      + Math.cos(radians) * velocity * flightTime + windDrift);
  });
  return { near: Math.round(Math.min(...ranges)), far: Math.round(Math.max(...ranges)) };
}

export function simulateArtilleryShot(state: ArtilleryState, input: ArtilleryShot): ArtilleryOutcome {
  const shot = availableShot(state, input);
  const targetSide: ArtillerySide = state.current === 'left' ? 'right' : 'left';
  const target = state.tanks[targetSide];
  const shooterX = artilleryMovedX(state, state.current, shot.move);
  const projectiles = projectileProfiles(shot.payload).map((profile) =>
    simulateProjectile(state, shot, shooterX, profile.angle, profile.speed)
  );
  const landed = projectiles.filter((projectile) => projectile.impact);
  const closest = [...landed].sort((a, b) =>
    Math.abs((a.impact?.x ?? 0) - target.x) - Math.abs((b.impact?.x ?? 0) - target.x)
  )[0] ?? projectiles[0];
  const blastDamage = Math.min(shot.payload === 'cluster' ? 60 : 75,
    projectiles.reduce((total, projectile) => total + projectile.damage, 0));
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
    coverGranted: 0,
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
    const normalized = distance / rules.craterRadius;
    if (rules.terrainBuild) {
      // Rampart is a broad, steep-sided fieldwork rather than a cosmetic bump.
      // The shallow power keeps the shoulders useful as cover while the crown
      // remains tall enough to block direct fire.
      const wall = Math.pow(1 - normalized, 0.58) * rules.craterRadius;
      return Math.min(76, height + wall * rules.terrainBuild);
    }
    const bowl = Math.sqrt(1 - normalized * normalized) * rules.craterRadius;
    const profile = payload === 'bore'
      ? 0.72 + 0.28 * Math.pow(1 - normalized, 2)
      : payload === 'lance'
        ? Math.pow(1 - normalized, 1.45)
        : payload === 'barb'
          ? 0.74 + 0.26 * (1 - normalized)
          : 1;
    return Math.max(2, height - bowl * rules.craterDepth * profile);
  });
}

export function artilleryTerrainImpactStages(
  terrain: readonly number[],
  projectiles: readonly ArtilleryProjectileOutcome[],
  payload: ArtilleryPayload,
): Array<{ projectileIndex: number; terrain: number[] }> {
  let current = [...terrain];
  return projectiles
    .map((projectile, projectileIndex) => ({ projectile, projectileIndex }))
    .filter(({ projectile }) => projectile.impact !== null)
    .sort((a, b) => a.projectile.path.length - b.projectile.path.length || a.projectileIndex - b.projectileIndex)
    .map(({ projectile, projectileIndex }) => {
      current = reshapeTerrain(current, projectile.impact, payload);
      return { projectileIndex, terrain: current };
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
  const tractionSpent = artilleryMovementFuelCost(state, state.current, shot.move, 'drive', ARTILLERY_DEFAULT_THRUST, movedX);
  tanks[state.current].x = movedX;
  const impactStages = artilleryTerrainImpactStages(state.terrain, simulated.projectiles, shot.payload);
  const terrain = impactStages.at(-1)?.terrain ?? [...state.terrain];
  const oldGround = terrainHeight(state.terrain, tanks[targetSide].x);
  const newGround = terrainHeight(terrain, tanks[targetSide].x);
  const terrainShift = Math.round((newGround - oldGround) * 10) / 10;
  const rawFallDamage = terrainShift < -3 ? Math.min(24, Math.round((-terrainShift - 3) * 4)) : 0;
  const fallDamage = rawFallDamage;
  const pressureMultiplier = Math.min(1.6, 1 + Math.max(0, state.turn - 9) * 0.12);
  // Three meaningful hits leave room for cover, recovery, and weapon choice.
  // Terrain deformation keeps its full force; only damage to the rig is paced.
  // Starfall covers the widest area, so its combined blast and collapse must
  // not also be the most lethal single volley.
  const combinedDamage = shot.payload === 'cluster'
    ? Math.min(60, simulated.blastDamage + fallDamage)
    : simulated.blastDamage + fallDamage;
  const rawDamage = Math.min(ARTILLERY_MAX_INTEGRITY,
    Math.round(combinedDamage * pressureMultiplier * ARTILLERY_HULL_DAMAGE_SCALE));
  const guardAbsorbed = Math.min(shot.payload === 'lance'
    ? Math.ceil(state.guard[targetSide] / 2)
    : state.guard[targetSide], rawDamage);
  const damage = rawDamage - guardAbsorbed;
  const forwardCover = simulated.impact &&
    (state.current === 'left' ? 1 : -1) * (simulated.impact.x - movedX);
  const coverGranted = shot.payload === 'bloom' && forwardCover !== null && forwardCover >= 3 && forwardCover <= 42
    ? ARTILLERY_RAMPART_GUARD
    : 0;
  const outcome: ArtilleryOutcome = { ...simulated, damage, fallDamage, terrainShift, guardAbsorbed, coverGranted, pressureMultiplier };
  if (damage) tanks[targetSide].integrity = Math.max(0, tanks[targetSide].integrity - damage);
  if (state.mode === 'range') tanks.right.integrity = ARTILLERY_MAX_INTEGRITY;
  const rangeFinished = state.mode === 'range' && state.turn + 1 >= 6;
  const challengeFinished = state.mode === 'challenge' && (tanks.right.integrity === 0 || state.turn + 1 >= 5);
  const winner = challengeFinished
    ? tanks.right.integrity === 0 ? 'left' : 'right'
    : tanks[targetSide].integrity === 0 || rangeFinished ? state.current : null;
  const windChanges = (state.current === 'right' || state.mode === 'range' || state.mode === 'challenge') && !winner;
  const nextWind = windChanges ? nextRandom(state.rngState) : { value: 0.5, state: state.rngState };
  const impactX = outcome.impact?.x ?? (state.current === 'left' ? state.terrain.length + 7 : -8);
  const miss = impactX - state.tanks[targetSide].x;
  const payloads = {
    left: { ...state.payloads.left },
    right: { ...state.payloads.right },
  };
  if (shot.payload !== 'shell') payloads[state.current][shot.payload] -= 1;
  const coreAmmo = { ...state.coreAmmo };
  if (shot.payload === 'shell' && coreAmmo[state.current] > 0) coreAmmo[state.current] -= 1;
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
        [state.current]: Math.max(0, state.traction[state.current] - tractionSpent),
      },
      jetCharges: state.jetCharges,
      systemCharges: state.systemCharges,
      guard: {
        ...state.guard,
        // A miss does not break cover. Any actual hit spends the emplacement,
        // including a Sunspike hit that bypasses part of its protection.
        [targetSide]: rawDamage > 0 ? 0 : state.guard[targetSide],
        [state.current]: Math.max(tractionSpent ? 0 : state.guard[state.current], coverGranted),
      },
      current: winner || state.mode === 'range' || state.mode === 'challenge' ? state.current : targetSide,
      wind: windChanges ? Math.round((nextWind.value * 2 - 1) * 8) : state.wind,
      condition: state.condition,
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
  const profile = {
    rookie: { angleError: 4.2, powerError: 9, specialChance: 0.18, angleCorrection: 7, powerCorrection: 10 },
    standard: { angleError: 2.3, powerError: 5.8, specialChance: 0.36, angleCorrection: 8, powerCorrection: 12 },
    expert: { angleError: 0.65, powerError: 1.6, specialChance: 0.72, angleCorrection: 60, powerCorrection: 80 },
  }[state.difficulty];
  const recentMiss = state.lastImpact?.shooter === 'left'
    ? Math.abs(state.lastImpact.x - state.tanks.right.x) : Infinity;
  const threatened = recentMiss <= 14;
  const retreat: ArtilleryMove = threatened
    ? state.lastImpact!.x < state.tanks.right.x ? -1 : 1 : 0;
  // A blocked retreat is not a tactic. Do not throw away traction or an
  // existing guard just because the previous shell landed nearby.
  const move: ArtilleryMove = retreat && state.guard.right === 0
    && Math.abs(artilleryMovedX(state, 'right', retreat) - state.tanks.right.x) >= 3 ? retreat : 0;
  const miss = Math.abs(state.botPrevious?.miss ?? 99);
  const targetX = state.tanks.left.x;
  const firstRangingShot = state.botPrevious === null && state.difficulty !== 'expert';
  const surveyDraw = nextRandom(nextRandom(draw.state).state);
  const surveySpread = state.difficulty === 'rookie' ? { near: 24, far: 52 } : { near: 16, far: 38 };
  const surveyedX = targetX + (surveyDraw.value < 0.5 ? -1 : 1)
    * (surveySpread.near + Math.abs(surveyDraw.value - 0.5) * 2 * (surveySpread.far - surveySpread.near));
  const targetCrater = Math.max(terrainHeight(state.terrain, targetX - 8), terrainHeight(state.terrain, targetX + 8))
    - terrainHeight(state.terrain, targetX);
  const special: ArtillerySpecialPayload | null = state.guard.left > 0 && state.payloads.right.lance > 0 ? 'lance'
    : targetCrater > 5 && state.payloads.right.bore > 0 ? 'bore'
      : miss <= 8 && state.tanks.left.integrity <= 65 && state.payloads.right.lance > 0 ? 'lance'
        : miss > 12 && state.payloads.right.cluster > 0 ? 'cluster'
          : state.payloads.right.barb > 0 ? 'barb'
            : state.payloads.right.bore > 0 ? 'bore' : null;
  const usesSpecial = special !== null && (state.guard.left > 0 || draw.value <= profile.specialChance);
  type Solution = { angle: number; power: number; score: number; damage: number; payload: ArtilleryPayload };
  const best = (payload: ArtilleryPayload): Solution => {
    let solution: Solution = { angle: 44, power: 70, score: -Infinity, damage: 0, payload };
    const previous = state.botPrevious?.shot;
    const lostRange = miss > 80 || move !== 0;
    const angleCorrection = profile.angleCorrection + (lostRange ? 7 : 0);
    const powerCorrection = profile.powerCorrection + (lostRange ? 8 : 0);
    for (let angle = 16; angle <= 76; angle += 3) {
      if (previous && Math.abs(angle - previous.angle) > angleCorrection) continue;
      for (let power = 20; power <= 100; power += 2) {
        if (previous && Math.abs(power - previous.power) > powerCorrection) continue;
        const outcome = simulateArtilleryShot(state, { angle, power, payload, move });
        const guard = payload === 'lance' ? Math.ceil(state.guard.left / 2) : state.guard.left;
        const pressure = Math.min(1.6, 1 + Math.max(0, state.turn - 9) * 0.12);
        const damage = Math.max(0, Math.round(outcome.damage * pressure * ARTILLERY_HULL_DAMAGE_SCALE) - guard);
        const landingError = outcome.impact ? Math.abs(outcome.impact.x - targetX) : state.terrain.length;
        const surveyedError = Math.min(...outcome.projectiles.map((projectile) => projectile.impact
          ? Math.abs(projectile.impact.x - surveyedX) : state.terrain.length));
        const score = firstRangingShot
          ? -surveyedError * 10 - power * 0.1
          : damage > 0
          ? damage * 100 - power - Math.abs(angle - 45) * 0.1
          : -landingError * 10 - power * 0.1;
        if (score > solution.score) solution = { angle, power, score, damage, payload };
      }
    }
    return solution;
  };
  const core = best('shell');
  const specialized = usesSpecial ? best(special) : null;
  const roleBonus = special === 'cluster' && miss > 12 ? 22
    : special === 'barb' && miss > 9 ? 16
      : special === 'bore' && targetCrater > 5 ? 17
        : special === 'lance' && state.guard.left > 0 ? 15 : 4;
  let solution = firstRangingShot
    ? specialized ?? core
    : specialized && specialized.damage > 0 && specialized.score + roleBonus * 100 > core.score
      ? specialized : core;
  // Rampart spends the attack turn. Use it to survive a credible next hit,
  // never as an automatic response to crossing an arbitrary hull threshold.
  const critical = state.tanks.right.integrity <= 28;
  const wantsCover = threatened && recentMiss <= 11 && state.guard.right === 0
    && state.payloads.right.bloom > 0 && state.tanks.right.integrity <= 45
    && solution.damage < state.tanks.left.integrity
    && (critical || draw.value < profile.specialChance);
  if (wantsCover) {
    const movedX = artilleryMovedX(state, 'right', move);
    let cover: Solution | null = null;
    for (let angle = 16; angle <= 76; angle += 3) {
      for (let power = 20; power <= 100; power += 2) {
        const impact = simulateArtilleryShot(state, { angle, power, payload: 'bloom', move }).impact;
        const distance = impact ? movedX - impact.x : 0;
        if (distance < 6 || distance > 34) continue;
        const score = 1000 - Math.abs(distance - 18) * 40 - power;
        if (!cover || score > cover.score) cover = { angle, power, score, damage: 0, payload: 'bloom' };
      }
    }
    if (cover) solution = cover;
  }
  const planned = solution;
  const aimDraw = nextRandom(draw.state);
  // Defensive construction should be deliberate even when offensive aim is imperfect.
  const calibration = solution.payload === 'bloom' ? 0.3 : state.botPrevious ? 1 : state.difficulty === 'expert' ? 1 : 1.45;
  return normalizedShot({
    angle: planned.angle + (draw.value * 2 - 1) * profile.angleError * calibration,
    power: planned.power + (aimDraw.value * 2 - 1) * profile.powerError * calibration,
    payload: solution.payload,
    move,
    system: 'none',
  });
}
