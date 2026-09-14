import {
  ARTILLERY_PAYLOADS,
  applyArtilleryShot,
  chooseArtilleryBotShot,
  createArtilleryState,
  simulateArtilleryShot,
  type ArtilleryDifficulty,
  type ArtilleryPayload,
  type ArtilleryShot,
  type ArtilleryState,
} from '../artillery.ts';

const seeds = Array.from({ length: 100 }, (_, index) => `artillery-v2-evaluation-${index}`);
const efficacy = Object.fromEntries(ARTILLERY_PAYLOADS.map((payload) => [payload, {
  samples: 0,
  damaging: 0,
  totalDamage: 0,
  uniqueDamage: 0,
}])) as Record<ArtilleryPayload, { samples: number; damaging: number; totalDamage: number; uniqueDamage: number }>;

for (const seed of seeds) {
  const state = createArtilleryState(seed);
  for (let angle = 12; angle <= 78; angle += 3) {
    for (let power = 18; power <= 99; power += 3) {
      const outcomes = ARTILLERY_PAYLOADS.map((payload) => simulateArtilleryShot(state, { angle, power, payload }));
      outcomes.forEach((outcome, index) => {
        const result = efficacy[ARTILLERY_PAYLOADS[index]];
        result.samples += 1;
        result.totalDamage += outcome.damage;
        if (outcome.damage > 0) result.damaging += 1;
        if (outcome.damage > 0 && outcomes.filter((candidate) => candidate.damage > 0).length === 1) result.uniqueDamage += 1;
      });
    }
  }
}

console.log('payload solution-space audit (100 fields)');
for (const payload of ARTILLERY_PAYLOADS) {
  const result = efficacy[payload];
  console.log(
    `${payload.padEnd(8)} ${(100 * result.damaging / result.samples).toFixed(2).padStart(6)}% damaging · ` +
    `${(result.totalDamage / Math.max(1, result.damaging)).toFixed(1).padStart(5)} avg on damage · ` +
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
        state = applyArtilleryShot(state, chooseArtilleryBotShot(state)).state;
      }
    }
    if (state.winner === 'left') playerWins += 1;
    turns.push(state.turn);
  }
  turns.sort((a, b) => a - b);
  console.log(
    `${difficulty.padEnd(8)} player win ${playerWins}% · median ${turns[49]} shots · ` +
    `p90 ${turns[89]} · max ${turns[99]}`,
  );
}
