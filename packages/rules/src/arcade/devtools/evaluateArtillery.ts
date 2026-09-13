import {
  applyArtilleryShot,
  chooseArtilleryBotShot,
  createArtilleryState,
  simulateArtilleryShot,
  type ArtilleryMove,
  type ArtilleryPayload,
} from '../artillery.ts';

const payloads: ArtilleryPayload[] = ['shell', 'barb', 'bore'];
const moves: ArtilleryMove[] = [-1, 0, 1];
const seeds = Array.from({ length: 30 }, (_, index) => `artillery-evaluation-${index}`);

type Result = { hits: number; samples: number; uniqueHits: number };
const results = Object.fromEntries(payloads.flatMap((payload) =>
  moves.map((move) => [`${payload}:${move}`, { hits: 0, samples: 0, uniqueHits: 0 } satisfies Result]))) as Record<string, Result>;

for (const seed of seeds) {
  const state = createArtilleryState(seed);
  for (let angle = 12; angle <= 78; angle += 3) {
    for (let power = 18; power <= 99; power += 3) {
      for (const move of moves) {
        const hits = payloads.map((payload) => simulateArtilleryShot(state, { angle, power, payload, move }).hit === 'right');
        for (let index = 0; index < payloads.length; index += 1) {
          const result = results[`${payloads[index]}:${move}`];
          result.samples += 1;
          if (hits[index]) result.hits += 1;
          if (hits[index] && hits.filter(Boolean).length === 1) result.uniqueHits += 1;
        }
      }
    }
  }
}

for (const payload of payloads) {
  for (const move of moves) {
    const result = results[`${payload}:${move}`];
    const percentage = (result.hits / result.samples) * 100;
    console.log(`${payload.padEnd(5)} ${String(move).padStart(2)}: ${result.hits.toString().padStart(5)} hits (${percentage.toFixed(2)}%), ${result.uniqueHits} unique`);
  }
}

let match = createArtilleryState('2026-09-13:artillery:v1');
const matchShots = [];
for (const payload of payloads) {
  let selected: { angle: number; power: number; payload: ArtilleryPayload } | undefined;
  for (let angle = 10; angle <= 80 && !selected; angle += 1) {
    for (let power = 15; power <= 100; power += 1) {
      if (simulateArtilleryShot(match, { angle, power, payload }).hit === 'right') {
        selected = { angle, power, payload };
        break;
      }
    }
  }
  if (!selected) throw new Error(`No ${payload} hit found for the evaluation match.`);
  matchShots.push(selected);
  match = applyArtilleryShot(match, selected).state;
  if (match.phase === 'finished') break;
  match = applyArtilleryShot(match, chooseArtilleryBotShot(match)).state;
}
console.log(`evaluation match: ${JSON.stringify(matchShots)} -> ${match.winner} in ${match.turn} shots`);
