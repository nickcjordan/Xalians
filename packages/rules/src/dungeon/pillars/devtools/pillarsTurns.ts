/*
  Turn by turn against whole-squad planning (docs/design/powerworks-pillars.md, "Turn by turn").
  The same players and the same measures as the depth pass:

    --part=difficulty  enemy health against each player, for each timeline
    --part=compare     at matched difficulty: what choosing a target is worth (planner against
                       hardest-hit) and what planning ahead is worth (look-ahead against planner),
                       for whole-squad planning, the round timeline, the speed timeline, and the
                       speed timeline with the turn-order layer

  Run: node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsTurns.ts --part=compare --runs=150 --look=60
*/
import { randomDraft } from "../../devtools/powerworksSim.ts";
import { DEFAULT_RULES, createPillarRun, pillarCommand, type PRun, type Rules } from "../engine.ts";
import { biggestPolicy, hardestHitPolicy, lookahead, plannerPolicy, randomPolicy, stream, type Policy } from "../policy.ts";
import { createTurnRun, turnCommand, type TRun } from "../turns.ts";
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
