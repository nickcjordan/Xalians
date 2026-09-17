import {
  ARTILLERY_PAYLOADS,
  applyArtilleryShot,
  artilleryNominalReach,
  chooseArtilleryBotShot,
  createArtilleryState,
  simulateArtilleryShot,
  type ArtilleryDifficulty,
  type ArtilleryMapSize,
  type ArtilleryPayload,
  type ArtilleryShot,
  type ArtilleryState,
  type ArtilleryWorld,
} from '../artillery.ts';

const seeds = Array.from({ length: 100 }, (_, index) => `artillery-v2-evaluation-${index}`);
const efficacy = Object.fromEntries(ARTILLERY_PAYLOADS.map((payload) => [payload, {
  samples: 0,
  damaging: 0,
  totalDamage: 0,
  uniqueDamage: 0,
  bestDamage: 0,
}])) as Record<ArtilleryPayload, { samples: number; damaging: number; totalDamage: number; uniqueDamage: number; bestDamage: number }>;

for (const seed of seeds) {
  const state = createArtilleryState(seed);
  const bestInField = Object.fromEntries(ARTILLERY_PAYLOADS.map((payload) => [payload, 0])) as Record<ArtilleryPayload, number>;
  for (let angle = 12; angle <= 78; angle += 3) {
    for (let power = 18; power <= 99; power += 3) {
      const outcomes = ARTILLERY_PAYLOADS.map((payload) => simulateArtilleryShot(state, { angle, power, payload }));
      outcomes.forEach((outcome, index) => {
        const result = efficacy[ARTILLERY_PAYLOADS[index]];
        result.samples += 1;
        result.totalDamage += outcome.damage;
        bestInField[ARTILLERY_PAYLOADS[index]] = Math.max(bestInField[ARTILLERY_PAYLOADS[index]], outcome.damage);
        if (outcome.damage > 0) result.damaging += 1;
        if (outcome.damage > 0 && outcomes.filter((candidate) => candidate.damage > 0).length === 1) result.uniqueDamage += 1;
      });
    }
  }
  for (const payload of ARTILLERY_PAYLOADS) efficacy[payload].bestDamage += bestInField[payload];
}

console.log('payload solution-space audit (100 fields)');
for (const payload of ARTILLERY_PAYLOADS) {
  const result = efficacy[payload];
  console.log(
    `${payload.padEnd(8)} ${(100 * result.damaging / result.samples).toFixed(2).padStart(6)}% damaging · ` +
    `${(result.totalDamage / Math.max(1, result.damaging)).toFixed(1).padStart(5)} avg on damage · ` +
    `${(result.bestDamage / seeds.length).toFixed(1).padStart(5)} best per field · ` +
    `${String(result.uniqueDamage).padStart(4)} unique solutions`,
  );
}

function playerShot(state: ArtilleryState, previous: { miss: number; shot: ArtilleryShot } | null): ArtilleryShot {
  const miss = Math.abs(previous?.miss ?? 99);
  const payload: ArtilleryPayload = miss <= 5 && state.payloads.left.lance > 0
    ? 'lance'
    : miss <= 11 && state.payloads.left.barb > 0
      ? 'barb'
      : miss <= 18 && state.payloads.left.cluster > 0 ? 'cluster' : 'shell';
  const move = state.lastImpact && Math.abs(state.lastImpact.x - state.tanks.left.x) <= 9 && state.traction.left > 0 ? 1 : 0;
  let solution = { angle: previous?.shot.angle ?? 44, power: previous?.shot.power ?? 70, score: -1 };
  for (let angle = 16; angle <= 76; angle += 3) {
    for (let power = 20; power <= 100; power += 2) {
      const outcome = simulateArtilleryShot(state, { angle, power, payload, move });
      const score = outcome.damage * 100 - power;
      if (score > solution.score) solution = { angle, power, score };
    }
  }
  const error = state.turn % 3 - 1;
  return {
    angle: solution.angle + error,
    power: solution.power + error * 1.6,
    payload,
    move,
    system: state.tanks.left.integrity <= 58 && state.systemCharges.left > 0 ? 'anchor' : 'none',
  };
}

for (const difficulty of ['rookie', 'standard', 'expert'] as ArtilleryDifficulty[]) {
  const turns: number[] = [];
  let playerWins = 0;
  const botPayloads = Object.fromEntries(ARTILLERY_PAYLOADS.map((payload) => [payload, 0])) as Record<ArtilleryPayload, number>;
  let botMoves = 0;
  let usefulCovers = 0;
  for (const seed of seeds) {
    let state = createArtilleryState(seed, 'bot', difficulty);
    let previous: { miss: number; shot: ArtilleryShot } | null = null;
    while (state.phase === 'aiming' && state.turn < 40) {
      if (state.current === 'left') {
        const shot = playerShot(state, previous);
        const applied = applyArtilleryShot(state, shot);
        const impactX = applied.outcome.impact?.x ?? 108;
        previous = { miss: impactX - state.tanks.right.x, shot };
        state = applied.state;
      } else {
        const shot = chooseArtilleryBotShot(state);
        botPayloads[shot.payload ?? 'shell'] += 1;
        if (shot.move) botMoves += 1;
        const applied = applyArtilleryShot(state, shot);
        if (applied.outcome.coverGranted > 0) usefulCovers += 1;
        state = applied.state;
      }
    }
    if (state.winner === 'left') playerWins += 1;
    turns.push(state.turn);
  }
  turns.sort((a, b) => a - b);
  console.log(
    `${difficulty.padEnd(8)} player win ${playerWins}% · median ${turns[49]} shots · ` +
    `p90 ${turns[89]} · max ${turns[99]} · bot arsenal ${JSON.stringify(botPayloads)} · moves ${botMoves} · cover ${usefulCovers}`,
  );
}

console.log('world/range reachability (12 fields per combination)');
for (const world of ['stonera', 'magmuth', 'krystos', 'endessa'] as ArtilleryWorld[]) {
  for (const mapSize of ['compact', 'standard', 'wide'] as ArtilleryMapSize[]) {
    let shellSolutions = 0;
    let specialRescues = 0;
    let bestDamage = 0;
    for (let field = 0; field < 12; field += 1) {
      const state = createArtilleryState(`artillery-cross-world-${world}-${mapSize}-${field}`, 'bot', 'standard', { mapSize, world });
      let shellBest = 0;
      let specialBest = 0;
      for (let angle = 16; angle <= 76; angle += 3) {
        for (let power = 20; power <= 100; power += 2) {
          shellBest = Math.max(shellBest, simulateArtilleryShot(state, { angle, power, payload: 'shell' }).damage);
          specialBest = Math.max(specialBest,
            simulateArtilleryShot(state, { angle, power, payload: 'bore' }).damage,
            simulateArtilleryShot(state, { angle, power, payload: 'cluster' }).damage);
        }
      }
      if (shellBest > 0) shellSolutions += 1;
      if (shellBest === 0 && specialBest > 0) specialRescues += 1;
      bestDamage += Math.max(shellBest, specialBest);
    }
    console.log(`${world.padEnd(8)} ${mapSize.padEnd(8)} shell ${shellSolutions}/12 · special rescue ${specialRescues}/12 · best ${Math.round(bestDamage / 12)}`);
  }
}

console.log('coarse-range player proxy (30 fields, no exact trajectory search)');
for (const difficulty of ['rookie', 'standard', 'expert'] as ArtilleryDifficulty[]) {
  let wins = 0;
  let totalPlayerShots = 0;
  for (let field = 0; field < 30; field += 1) {
    let state = createArtilleryState(`artillery-coarse-player-${field}`, 'bot', difficulty,
      { mapSize: field % 2 ? 'standard' : 'wide', world: (['stonera', 'magmuth', 'krystos', 'endessa'] as ArtilleryWorld[])[field % 4] });
    let prior: { angle: number; miss: number; damage: number } | null = null;
    while (state.phase === 'aiming' && state.turn < 40) {
      if (state.current === 'right') {
        state = applyArtilleryShot(state, chooseArtilleryBotShot(state)).state;
        continue;
      }
      const angle: number = prior && prior.damage === 0 && Math.abs(prior.miss) <= 18
        ? Math.min(72, prior.angle + 8) : prior?.angle ?? 45;
      const distance = Math.round(Math.abs(state.tanks.right.x - state.tanks.left.x) / 10) * 10;
      let power = 70;
      let error = Infinity;
      for (let candidate = 15; candidate <= 100; candidate += 1) {
        const reach = artilleryNominalReach(state, { angle, power: candidate }).near;
        const gap = Math.abs(Math.round(reach / 10) * 10 - distance);
        if (gap < error) { power = candidate; error = gap; }
      }
      const outcome = applyArtilleryShot(state, { angle, power, payload: 'shell' });
      prior = { angle, miss: (outcome.outcome.impact?.x ?? state.terrain.length + 10) - state.tanks.right.x,
        damage: outcome.outcome.damage };
      state = outcome.state;
      totalPlayerShots += 1;
    }
    if (state.winner === 'left') wins += 1;
  }
  console.log(`${difficulty.padEnd(8)} wins ${wins}/30 · mean player shots ${(totalPlayerShots / 30).toFixed(1)}`);
}
