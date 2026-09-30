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
  roundStrip,
  standing,
  turnCommand,
  upcoming,
  type Rules,
  type TRun,
} from "../index.ts";
import { turnHardestHit, turnRandom, type TurnPolicy } from "../turnPolicy.ts";

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


// ======================================================================================
// UX pass 2 scenarios (docs/design/powerworks-ux-pass-2.md, "Capture"). Every state below is
// reached by playing real commands from a fresh seeded run and searching seeds for the state;
// nothing is hand-edited. Each function prints the seed and policy that reached it.
// ======================================================================================
const PASS_POLICY: TurnPolicy = (s) => ({ move: -2, target: activeOf(s)!.id });
const POLICIES: Record<string, TurnPolicy> = { hardest: (s) => turnHardestHit(s, () => 0), random: turnRandom, pass: PASS_POLICY };

/** Plays one seeded run with a policy, calling `probe` on every state (companion turn, camp, end); returns the first state it accepts. */
function search(name: string, policies: string[], seeds: number[], probe: (s: TRun) => boolean, guard = 400): TRun | null {
  for (const pol of policies)
    for (const seed of seeds) {
      const rand = stream(seed * 7919 + 3);
      let s = fresh(seed);
      for (let k = 0; k < guard; k++) {
        if (probe(s)) {
          console.log(`${name}: found with seed ${seed}, policy ${pol}, after ${k} steps`);
          return s;
        }
        if (s.phase === "turn") s = turnCommand(s, { kind: "act", order: POLICIES[pol](s, rand) }).state;
        else if (s.phase === "camp") s = advanceCamp(s);
        else break;
      }
      if (probe(s)) {
        console.log(`${name}: found with seed ${seed}, policy ${pol}, at the end`);
        return s;
      }
    }
  console.warn(`${name}: NOT FOUND`);
  return null;
}
const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

/** Does some legal order of the active companion end the encounter now? */
function canFinish(s: TRun): boolean {
  if (s.phase !== "turn" || !s.active) return false;
  const u = activeOf(s)!;
  for (const i of u.moves.keys()) {
    if (u.cooldowns[i] > 0 || (u.moves[i].signature && u.signatureSpent)) continue;
    for (const t of s.enemies.filter((e) => e.hp > 0)) {
      try {
        const after = turnCommand(s, { kind: "act", order: { move: i, target: t.id } }).state;
        if (after.phase !== "turn") return true;
      } catch {
        /* illegal order */
      }
    }
  }
  return false;
}

// ---- camp-fallen: camp after a clear with a fallen companion and the one revival unspent. ----
function scenarioCampFallen() {
  const s = search("camp-fallen", ["random", "hardest"], SEEDS, (s) => s.phase === "camp" && s.revival > 0 && s.team.some((u) => u.hp <= 0) && s.team.some((u) => u.hp > 0));
  if (s) write("camp-fallen", s);
}

// ---- final-blow: one enemy left, low, and the active companion can end the fight this turn (room 0..2, not the last). ----
function scenarioFinalBlow() {
  const last = 3;
  const s = search("final-blow", ["hardest", "random"], SEEDS, (s) => s.phase === "turn" && s.room >= 1 && s.room < last && standing(s.enemies).length === 1 && s.enemies.some((e) => e.hp > 0 && e.hp <= e.max * 0.5) && canFinish(s));
  if (s) write("final-blow", s);
}

// ---- round-open-enemy: the active companion is the last unit of its round (everyone else standing has acted), and the
// next round opens on an enemy's turn, so acting brings a run of enemy turns that begins a new round. ----
function scenarioRoundOpenEnemy() {
  const s = search("round-open-enemy", ["hardest", "random"], SEEDS, (s) => {
    if (s.phase !== "turn" || !s.active || standing(s.enemies).length < 2 || roundOf(s) > 6) return false;
    const lastOfRound = roundStrip(s).every(({ unit, done }) => unit.hp <= 0 || unit.id === s.active || done);
    if (!lastOfRound) return false;
    return !!upcoming(s, 2)[1]?.enemy;
  });
  if (s) write("round-open-enemy", s);
}

// ---- lost: a run the squad cannot finish (a deep room, everyone fallen). ----
function scenarioLost() {
  const s = search("lost", ["random", "pass"], SEEDS, (s) => s.phase === "lost" && s.room >= 2);
  if (s) write("lost", s);
}

// ---- won: the last chamber cleared. ----
function scenarioWon() {
  const s = search("won", ["hardest", "random"], SEEDS, (s) => s.phase === "won");
  if (s) write("won", s);
}

// ---- retreated-command: the player's own retreat command, from camp. ----
function scenarioRetreatCommand() {
  const camp = search("retreated-command (camp)", ["hardest"], [1], (s) => s.phase === "camp");
  if (camp) write("retreated-command", turnCommand(camp, { kind: "retreat" }).state);
}

// ---- retreated-stall: the fight stalls and the squad is forced out. Only reachable when neither side can lower the other's total health. ----
function scenarioRetreatStall() {
  const s = search("retreated-stall", ["pass", "random"], SEEDS.slice(0, 40), (s) => s.phase === "retreated", 300);
  if (s) write("retreated-stall", s);
}

// ---- last-stand: one companion left standing and it is that companion's turn; passing (or almost anything) hands the enemies the killing blow. ----
function scenarioLastStand() {
  const s = search("last-stand", ["random", "hardest"], SEEDS, (s) => {
    if (s.phase !== "turn" || !s.active || s.room < 1 || standing(s.team).length !== 1 || standing(s.enemies).length < 2) return false;
    const after = turnCommand(s, { kind: "act", order: PASS_POLICY(s, () => 0) }).state;
    return after.phase === "lost";
  });
  if (s) write("last-stand", s);
}

// ---- last-blow: the last chamber, one enemy left and the active companion can end the run this turn. ----
function scenarioLastBlow() {
  const s = search("last-blow", ["hardest", "random"], SEEDS, (s) => s.phase === "turn" && s.room === 3 && standing(s.enemies).length === 1 && canFinish(s));
  if (s) write("last-blow", s);
}

scenarioCampFallen();
scenarioLastStand();
scenarioLastBlow();
scenarioFinalBlow();
scenarioRoundOpenEnemy();
scenarioLost();
scenarioWon();
scenarioRetreatCommand();
scenarioRetreatStall();
