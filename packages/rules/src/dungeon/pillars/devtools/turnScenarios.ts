/*
  Writes saved-run JSON files for the turn screen's UX pass validation
  (docs/design/powerworks-turn-screen.md, "Validation"). Each file is the page's localStorage
  format for key xalians.powerworks.turns.v1: { version: PILLAR_SAVE_VERSION, state: TRun }.

  Scenarios are reached by playing real turns with turnHardestHit against
  { ...DEFAULT_RULES, rooms: "roles", timeline: "round" }, seed 1 unless
  noted. See the doc comment above each scenario function for what it captures and why.

  Run: node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/turnScenarios.ts --out=<dir>

  Two concurrent runs of this entry collide (runNode.cjs bundles to a fixed sibling file), so
  run it once at a time.
*/
import fs from "fs";
import path from "path";
import {
  DEFAULT_RULES,
  PILLAR_SAVE_VERSION,
  activeOf,
  createTurnRun,
  roundOf,
  turnCommand,
  type Rules,
  type TRun,
} from "../index.ts";
import { turnHardestHit } from "../turnPolicy.ts";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const OUT = arg("out", "");
if (!OUT) {
  console.error("usage: node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/turnScenarios.ts --out=<dir>");
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const RULES: Rules = { ...DEFAULT_RULES, rooms: "roles", timeline: "round" };

function fresh(seed = 1): TRun {
  return createTurnRun(seed, "starter", RULES).state;
}

/** Advances the run by playing one turn (a real bot order) whenever it is a companion's turn. */
function playOneTurn(s: TRun, rand: () => number): TRun {
  if (s.phase !== "turn") return s;
  const order = turnHardestHit(s, rand);
  return turnCommand(s, { kind: "act", order }).state;
}

/** Advances camp -> the next room. */
function advanceCamp(s: TRun): TRun {
  if (s.phase !== "camp") return s;
  return turnCommand(s, { kind: "advance" }).state;
}

/** A tiny deterministic rand stream, independent of the run's own rng (matches pillarsTurns.ts's stream()). */
function stream(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(1664525, x) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function describe(s: TRun): string {
  const active = activeOf(s);
  return `room ${s.room} (${s.phase}), active ${active ? `${active.name} (${active.id})` : "none"}, round ${s.phase === "turn" || s.phase === "camp" ? roundOf(s) : "-"}`;
}

function write(name: string, s: TRun) {
  const file = path.join(OUT, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify({ version: PILLAR_SAVE_VERSION, state: s }));
  console.log(`${name}: ${describe(s)} -> ${file}`);
}

/** Play turns (companion + auto-resolved enemy phases) until `stop` is true or a guard trips. */
function playUntil(s: TRun, rand: () => number, stop: (s: TRun) => boolean, guard = 500): TRun {
  for (let k = 0; k < guard; k++) {
    if (stop(s)) return s;
    if (s.phase === "turn") s = playOneTurn(s, rand);
    else if (s.phase === "camp") s = advanceCamp(s);
    else return s; // won/lost/retreated: nothing more to play
  }
  return s;
}

// ---- first: the fresh run's first companion turn. ----
function scenarioFirst() {
  const s = fresh(1);
  write("first", s);
}

// ---- checkpoint-graviclaw: room 1 (Security checkpoint), Graviclaw active, then rig enemy 1's
// hp to 5 and give enemy 0 a shield of 4 so finish and shield marks show on the keys. ----
function scenarioCheckpointGraviclaw() {
  const rand = stream(11);
  let s = fresh(1);
  s = playUntil(s, rand, (s) => s.room >= 1 && s.phase === "turn" && activeOf(s)?.species === "graviclaw");
  if (!(s.room >= 1 && activeOf(s)?.species === "graviclaw")) {
    console.warn("checkpoint-graviclaw: could not reach room 1 with Graviclaw active before the guard tripped; writing best-effort state.");
  }
  if (s.enemies.length > 1) {
    s.enemies[1].hp = Math.min(s.enemies[1].hp, 5);
    s.enemies[0].shields = [{ n: 4, from: s.enemies[0].id }];
  }
  write("checkpoint-graviclaw", s);
}

// ---- power-hippochamp: room 2 (Power chamber), Hippochamp active. ----
function scenarioPowerHippochamp() {
  const rand = stream(12);
  let s = fresh(1);
  s = playUntil(s, rand, (s) => s.room >= 2 && s.phase === "turn" && activeOf(s)?.species === "hippochamp");
  if (!(s.room >= 2 && activeOf(s)?.species === "hippochamp")) {
    console.warn("power-hippochamp: could not reach room 2 with Hippochamp active before the guard tripped; writing best-effort state.");
  }
  write("power-hippochamp", s);
}

// ---- control-crystorn: room 3 (Control chamber), Crystorn active. ----
function scenarioControlCrystorn() {
  const rand = stream(13);
  let s = fresh(1);
  s = playUntil(s, rand, (s) => s.room >= 3 && s.phase === "turn" && activeOf(s)?.species === "crystorn");
  if (!(s.room >= 3 && activeOf(s)?.species === "crystorn")) {
    console.warn("control-crystorn: could not reach room 3 with Crystorn active before the guard tripped; writing best-effort state.");
  }
  write("control-crystorn", s);
}

// ---- before-enemy-phase: a state where the active companion is followed by at least two
// enemies in the round's timeline order (so acting brings up an enemy phase of >= 2 beats). ----
function followedByTwoEnemies(s: TRun): boolean {
  if (s.phase !== "turn" || !s.active) return false;
  // Timeline order this round: sort standing units by clock, tie-break enemy-after-team then row.
  const standing = [...s.team, ...s.enemies].filter((u) => u.hp > 0);
  const ordered = standing
    .map((u) => ({ u, c: s.clock[u.id] }))
    .sort((a, b) => a.c - b.c)
    .map((x) => x.u);
  const i = ordered.findIndex((u) => u.id === s.active);
  if (i < 0) return false;
  let enemyStreak = 0;
  for (let k = i + 1; k < ordered.length; k++) {
    if (ordered[k].enemy) enemyStreak++;
    else break;
  }
  return enemyStreak >= 2;
}
function scenarioBeforeEnemyPhase() {
  const rand = stream(14);
  let s = fresh(1);
  s = playUntil(s, rand, followedByTwoEnemies);
  if (!followedByTwoEnemies(s)) {
    console.warn("before-enemy-phase: no state with >=2 enemies queued after the active companion was found before the guard tripped; writing best-effort state.");
  }
  write("before-enemy-phase", s);
}

// ---- camp: phase camp after room 0 (Service entrance) clears. ----
function scenarioCamp() {
  const rand = stream(15);
  let s = fresh(1);
  s = playUntil(s, rand, (s) => s.phase === "camp");
  if (s.phase !== "camp") {
    console.warn("camp: never reached camp phase before the guard tripped; writing best-effort state.");
  }
  write("camp", s);
}

scenarioFirst();
scenarioCheckpointGraviclaw();
scenarioPowerHippochamp();
scenarioControlCrystorn();
scenarioBeforeEnemyPhase();
scenarioCamp();
