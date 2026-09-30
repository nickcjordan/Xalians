/*
  Turn by turn against whole-squad planning (docs/design/powerworks-pillars.md, "Turn by turn").
  The same players and the same measures as the depth pass:

    --part=difficulty  enemy health against each player, for each timeline
    --part=compare     at matched difficulty: what choosing a target is worth (planner against
                       hardest-hit) and what planning ahead is worth (look-ahead against planner),
                       for whole-squad planning, the round timeline, the speed timeline, and the
                       speed timeline with the turn-order layer
    --part=length      mean turns (companion turn commands) per encounter entered, hardest-hit rule
    --part=sweep       random, biggest and hardest-hit win rates over --hp=a,b,c (retuning enemy health)
    --modes=1,2        only these modes (indexes into the mode list), for a quick run
    --part=sources     the round timeline, roles rooms, at the chosen enemy health, for each squad source in
                       --squads=preset,draft,samples,mixed (samples: sampleSquads, four sample creatures;
                       mixed: two starter companions and two sample creatures): the five players' win rates,
                       hardest-hit outcomes and turns per encounter (docs/design/creature-sample-set.md)
    --part=roles       the samples squads only, hardest-hit, --roleruns=600: win, loss and retreat by the role,
                       attribute profile and output band of each squad member (a squad counts toward every one it holds)

  Run: node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsTurns.ts --part=compare --runs=150 --look=60
*/
import { COMPANION_KEYS, COMPANION_RECORDS } from "../../index.ts";
import { makeRng } from "../../../generator/prng.ts";
import { sampleAxes, sampleCreatures, sampleSquads } from "../../../samples/index.ts";
import { randomDraft } from "../../devtools/powerworksSim.ts";
import { DEFAULT_RULES, createPillarRun, pillarCommand, type PRun, type Rules } from "../engine.ts";
import { biggestPolicy, hardestHitPolicy, lookahead, plannerPolicy, randomPolicy, stream, type Policy } from "../policy.ts";
import { createTurnRun, createTurnRunFrom, turnCommand, type TRun } from "../turns.ts";
import { turnBiggest, turnHardestHit, turnLookahead, turnPlanner, turnRandom, type TurnPolicy } from "../turnPolicy.ts";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const RUNS = Number(arg("runs", "150"));
const LOOK = Number(arg("look", "60"));
const P = (x: number) => `${Math.round(100 * x)}%`;

type Mode = { label: string; kind: "plan" | "turns"; rules: Partial<Rules> };
const MODES: Mode[] = [
  { label: "whole-squad planning", kind: "plan", rules: {} },
  { label: "turn by turn, rounds", kind: "turns", rules: { timeline: "round" } },
  { label: "turn by turn, speed", kind: "turns", rules: { timeline: "speed" } },
  { label: "speed + turn-order layer", kind: "turns", rules: { timeline: "speed", tempo: true } },
];
type Players = { random: unknown; biggest: unknown; hardest: unknown; planner: unknown; look: unknown; lookHard: unknown };
const PLAN: Players = { random: randomPolicy, biggest: biggestPolicy, hardest: hardestHitPolicy, planner: plannerPolicy, look: lookahead(), lookHard: lookahead({ candidates: 3, horizon: 3, samples: 2, from: hardestHitPolicy }) };
const TURNS: Players = { random: turnRandom, biggest: turnBiggest, hardest: turnHardestHit, planner: turnPlanner, look: turnLookahead(), lookHard: turnLookahead({ candidates: 4, turns: 6, samples: 2, from: turnHardestHit }) };

function winRate(mode: Mode, rules: Rules, squad: "preset" | "draft", who: keyof Players, runs: number): number {
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const pick = squad === "preset" ? "starter" : randomDraft(seed);
    const rand = stream(seed * 7 + 3);
    if (mode.kind === "plan") {
      let s: PRun = createPillarRun(seed, pick, rules);
      const policy = PLAN[who] as Policy;
      for (let k = 0; k < 400 && (s.phase === "planning" || s.phase === "camp"); k++) {
        if (s.phase === "camp") {
          const down = s.team.find((u) => u.hp <= 0);
          if (down && s.revival) s = pillarCommand(s, { kind: "revive", id: down.id });
          s = pillarCommand(s, { kind: "advance" });
        } else s = pillarCommand(s, { kind: "round", orders: policy(s, rand) });
      }
      if (s.phase === "won") wins++;
    } else {
      let s: TRun = createTurnRun(seed, pick, rules).state;
      const policy = TURNS[who] as TurnPolicy;
      for (let k = 0; k < 3000 && (s.phase === "turn" || s.phase === "camp"); k++) {
        if (s.phase === "camp") {
          const down = s.team.find((u) => u.hp <= 0);
          if (down && s.revival) s = turnCommand(s, { kind: "revive", id: down.id }).state;
          s = turnCommand(s, { kind: "advance" }).state;
        } else s = turnCommand(s, { kind: "act", order: policy(s, rand) }).state;
      }
      if (s.phase === "won") wins++;
    }
  }
  return wins / runs;
}
const base: Rules = { ...DEFAULT_RULES, elementSource: "creature", uniformPower: false };
const part = arg("part", "compare");
const only = arg("modes", "").split(",").filter(Boolean).map(Number);
const modes = only.length ? only.map((k) => MODES[k]) : MODES;

if (part === "difficulty") {
  console.log("| Mode | Rooms | Enemy health | Squad | random | biggest number | planner |\n|---|---|---|---|---|---|---|");
  for (const mode of modes)
    for (const rooms of ["facility", "roles"] as const)
      for (const hp of arg("hp", "0.62,0.75,0.9,1.05").split(",").map(Number))
        for (const squad of ["preset", "draft"] as const) {
          const rules = { ...base, ...mode.rules, rooms, enemyHpFactor: hp } as Rules;
          const r = (["random", "biggest", "planner"] as const).map((w) => winRate(mode, rules, squad, w, RUNS));
          console.log(`| ${mode.label} | ${rooms} | ${hp} | ${squad} | ${r.map(P).join(" | ")} |`);
        }
}
if (part === "compare") {
  // Each mode at its own enemy health (--hps=a,b,c,d), so the comparison is at matched difficulty.
  const hps = arg("hps", "0.62,0.62,0.62,0.62").split(",").map(Number);
  const rooms = arg("rooms", "roles") as "facility" | "roles";
  console.log("| Mode | Enemy health | Squad | random | biggest number | hardest-hit | planner | look-ahead | target choice worth | planning ahead worth |\n|---|---|---|---|---|---|---|---|---|---|");
  modes.forEach((mode, k) => {
    for (const squad of ["preset", "draft"] as const) {
      const rules = { ...base, ...mode.rules, rooms, enemyHpFactor: hps[MODES.indexOf(mode)] ?? hps[k] } as Rules;
      const r = (["random", "biggest", "hardest", "planner"] as const).map((w) => winRate(mode, rules, squad, w, RUNS));
      const look = winRate(mode, rules, squad, "look", LOOK);
      const lookHard = winRate(mode, rules, squad, "lookHard", LOOK);
      const hardL = winRate(mode, rules, squad, "hardest", LOOK);
      const planL = winRate(mode, rules, squad, "planner", LOOK);
      console.log(
        `| ${mode.label} | ${rules.enemyHpFactor} | ${squad} | ${r.map(P).join(" | ")} | ${P(look)} | ${Math.round(100 * (lookHard - hardL))} pts | ${Math.round(100 * (look - planL))} pts |`
      );
    }
  });
}
if (part === "length") {
  // Turn commands per encounter entered, averaged over runs, for the hardest-hit rule.
  const rooms = arg("rooms", "roles") as "facility" | "roles";
  const hp = Number(arg("hp", String(DEFAULT_RULES.enemyHpFactor)));
  console.log("| Mode | Enemy health | Squad | turns per encounter |\n|---|---|---|---|");
  for (const mode of modes.filter((m) => m.kind === "turns"))
    for (const squad of ["preset", "draft"] as const) {
      const rules = { ...base, ...mode.rules, rooms, enemyHpFactor: hp } as Rules;
      let turns = 0, encounters = 0;
      for (let seed = 1; seed <= RUNS; seed++) {
        const rand = stream(seed * 7 + 3);
        let s: TRun = createTurnRun(seed, squad === "preset" ? "starter" : randomDraft(seed), rules).state;
        encounters++;
        for (let k = 0; k < 3000 && (s.phase === "turn" || s.phase === "camp"); k++) {
          if (s.phase === "camp") {
            const down = s.team.find((u) => u.hp <= 0);
            if (down && s.revival) s = turnCommand(s, { kind: "revive", id: down.id }).state;
            s = turnCommand(s, { kind: "advance" }).state;
            encounters++;
          } else {
            s = turnCommand(s, { kind: "act", order: turnHardestHit(s, rand) }).state;
            turns++;
          }
        }
      }
      console.log(`| ${mode.label} | ${hp} | ${squad} | ${(turns / encounters).toFixed(1)} |`);
    }
}
if (part === "sweep") {
  const rooms = arg("rooms", "roles") as "facility" | "roles";
  console.log("| Mode | Enemy health | Squad | random | biggest number | hardest-hit |\n|---|---|---|---|---|---|");
  for (const mode of modes)
    for (const hp of arg("hp", "0.5,0.56,0.62,0.68,0.74").split(",").map(Number))
      for (const squad of ["preset", "draft"] as const) {
        const rules = { ...base, ...mode.rules, rooms, enemyHpFactor: hp } as Rules;
        const r = (["random", "biggest", "hardest"] as const).map((w) => winRate(mode, rules, squad, w, RUNS));
        console.log(`| ${mode.label} | ${hp} | ${squad} | ${r.map(P).join(" | ")} |`);
      }
}

/* Squad sources (docs/design/creature-sample-set.md): each its own column, never merged. */
type Source = "preset" | "draft" | "samples" | "mixed";
const SOURCES = arg("squads", "preset,draft,samples,mixed").split(",").filter(Boolean) as Source[];
const ROLE_RUNS = Number(arg("roleruns", "600"));
const SQUAD_SEED = "numbers2";
const sampleSquadList = (n: number) => sampleSquads(n, SQUAD_SEED);
/** Two starter companions and two sample creatures of different species, seeded. */
function mixedSquad(seed: number) {
  const rng = makeRng(`${SQUAD_SEED}|mixed|${seed}`);
  const shuffled = <T,>(a: readonly T[]) => {
    const o = [...a];
    for (let k = o.length - 1; k > 0; k--) {
      const j = rng.int(k + 1);
      [o[k], o[j]] = [o[j], o[k]];
    }
    return o;
  };
  const starters = shuffled(COMPANION_KEYS).slice(0, 2).map((k) => COMPANION_RECORDS[k]);
  const samples = shuffled(sampleCreatures());
  const picked = [] as (typeof samples)[number][];
  for (const c of samples) if (picked.length < 2 && !picked.some((p) => p.species === c.species)) picked.push(c);
  return [...starters, ...picked];
}
function startFor(source: Source, seed: number, samples: ReturnType<typeof sampleSquads>, rules: Rules): TRun {
  if (source === "preset") return createTurnRun(seed, "starter", rules).state;
  if (source === "draft") return createTurnRun(seed, randomDraft(seed), rules).state;
  if (source === "samples") return createTurnRunFrom(seed, samples[seed - 1], rules).state;
  return createTurnRunFrom(seed, mixedSquad(seed), rules).state;
}
type Played = { phase: TRun["phase"]; turns: number; encounters: number; room: number };
function playOut(s0: TRun, who: keyof Players, seed: number): Played {
  const policy = TURNS[who] as TurnPolicy;
  const rand = stream(seed * 7 + 3);
  let s = s0, turns = 0, encounters = 1;
  for (let k = 0; k < 3000 && (s.phase === "turn" || s.phase === "camp"); k++) {
    if (s.phase === "camp") {
      const down = s.team.find((u) => u.hp <= 0);
      if (down && s.revival) s = turnCommand(s, { kind: "revive", id: down.id }).state;
      s = turnCommand(s, { kind: "advance" }).state;
      encounters++;
    } else {
      s = turnCommand(s, { kind: "act", order: policy(s, rand) }).state;
      turns++;
    }
  }
  return { phase: s.phase, turns, encounters, room: s.room };
}
const sourceRules = (): Rules => ({ ...base, timeline: "round", rooms: "roles", enemyHpFactor: Number(arg("hp", String(DEFAULT_RULES.enemyHpFactor))) }) as Rules;

if (part === "sources") {
  const rules = sourceRules();
  const samples = sampleSquadList(RUNS);
  console.log(`Round timeline, roles rooms, enemy health ${rules.enemyHpFactor} (ENEMY_HP_FACTOR), ${RUNS} runs (look-ahead ${LOOK}), seeds 1-${RUNS}.\n`);
  console.log("| Squads | random | biggest number | hardest-hit | planner | look-ahead | hardest-hit won / lost / retreated / unfinished | mean rooms entered | turns per encounter (finished runs) |\n|---|---|---|---|---|---|---|---|---|");
  for (const source of SOURCES) {
    const rate = (who: keyof Players, runs: number) => {
      let w = 0;
      for (let seed = 1; seed <= runs; seed++) if (playOut(startFor(source, seed, samples, rules), who, seed).phase === "won") w++;
      return w / runs;
    };
    const r = (["random", "biggest", "hardest", "planner"] as const).map((w) => rate(w, RUNS));
    const look = rate("look", LOOK);
    const out = { won: 0, lost: 0, retreated: 0, unfinished: 0 } as Record<string, number>;
    let turns = 0, encounters = 0, rooms = 0;
    for (let seed = 1; seed <= RUNS; seed++) {
      const p = playOut(startFor(source, seed, samples, rules), "hardest", seed);
      out[p.phase === "turn" || p.phase === "camp" ? "unfinished" : p.phase]++;
      // Unfinished runs sit at the command cap, so they would swamp the mean; the length is over finished runs.
      if (p.phase !== "turn" && p.phase !== "camp") {
        turns += p.turns;
        encounters += p.encounters;
      }
      rooms += p.room + 1;
    }
    console.log(`| ${source} | ${r.map(P).join(" | ")} | ${P(look)} | ${P(out.won / RUNS)} / ${P(out.lost / RUNS)} / ${P(out.retreated / RUNS)} / ${P(out.unfinished / RUNS)} | ${(rooms / RUNS).toFixed(2)} | ${(turns / encounters).toFixed(1)} |`);
  }
}
if (part === "roles") {
  const rules = sourceRules();
  const samples = sampleSquadList(ROLE_RUNS);
  const axes = sampleAxes();
  type Tally = { n: number; won: number; lost: number; retreated: number; unfinished: number; rooms: number };
  const fresh = (): Tally => ({ n: 0, won: 0, lost: 0, retreated: 0, unfinished: 0, rooms: 0 });
  const tallies: Record<"role" | "profile" | "band", Record<string, Tally>> = { role: {}, profile: {}, band: {} };
  const total = fresh();
  const add = (t: Tally, p: Played) => {
    t.n++;
    t[p.phase === "turn" || p.phase === "camp" ? "unfinished" : (p.phase as "won" | "lost" | "retreated")]++;
    t.rooms += p.room + 1;
  };
  for (let seed = 1; seed <= ROLE_RUNS; seed++) {
    const p = playOut(startFor("samples", seed, samples, rules), "hardest", seed);
    add(total, p);
    const held = { role: new Set<string>(), profile: new Set<string>(), band: new Set<string>() };
    for (const c of samples[seed - 1]) {
      const a = axes.get(c.species)!;
      held.role.add(a.role);
      held.profile.add(a.profile);
      held.band.add(String(a.band));
    }
    for (const dim of ["role", "profile", "band"] as const) for (const k of held[dim]) add((tallies[dim][k] ??= fresh()), p);
  }
  console.log(`Samples squads, hardest-hit, round timeline, roles rooms, enemy health ${rules.enemyHpFactor}, ${ROLE_RUNS} squads (a squad counts toward every value it holds).\n`);
  const row = (k: string, t: Tally) => `| ${k} | ${t.n} | ${P(t.won / t.n)} | ${P(t.lost / t.n)} | ${P(t.retreated / t.n)} | ${P(t.unfinished / t.n)} | ${(t.rooms / t.n).toFixed(2)} |`;
  console.log("| All squads | squads | won | lost | retreated | unfinished | mean rooms entered |\n|---|---|---|---|---|---|---|");
  console.log(row("all", total));
  for (const dim of ["role", "profile", "band"] as const) {
    console.log(`\n| ${dim} | squads | won | lost | retreated | unfinished | mean rooms entered |\n|---|---|---|---|---|---|---|`);
    const keys = Object.keys(tallies[dim]).sort((a, b) => (dim === "band" ? Number(a) - Number(b) : a.localeCompare(b)));
    for (const k of keys) console.log(row(k, tallies[dim][k]));
  }
}
