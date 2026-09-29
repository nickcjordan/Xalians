/*
  The depth pass (docs/design/powerworks-pillars.md, "Depth pass"): three questions only the
  simulator can answer quickly, on the Path 1 rules.

    --part=difficulty  enemy health against each player, on the prototype facility and on the
                       facility with support roles
    --part=roles       what choosing a target is worth: the planner against the same planner
                       sending every attack to the enemy it damages most
    --part=rests       whether attacks that rest hitting harder makes planning ahead pay

  Run: node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsDepth.ts --part=difficulty --runs=150
*/
import { randomDraft } from "../../devtools/powerworksSim.ts";
import { DEFAULT_RULES, createPillarRun, pillarCommand, type PRun, type Rules } from "../engine.ts";
import { biggestPolicy, hardestHitPolicy, lookahead, plannerPolicy, randomPolicy, stream, type Policy } from "../policy.ts";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const RUNS = Number(arg("runs", "150"));
const LOOK_RUNS = Number(arg("look", "40"));
const part = arg("part", "difficulty");
const hps = arg("hp", "").split(",").filter(Boolean).map(Number);
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "-");

function winRate(rules: Rules, squad: "preset" | "draft", policy: Policy, runs: number): number {
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    let s: PRun = createPillarRun(seed, squad === "preset" ? "starter" : randomDraft(seed), rules);
    const rand = stream(seed * 7 + 3);
    for (let k = 0; k < 400 && (s.phase === "planning" || s.phase === "camp"); k++) {
      if (s.phase === "camp") {
        const down = s.team.find((u) => u.hp <= 0);
        if (down && s.revival) s = pillarCommand(s, { kind: "revive", id: down.id });
        s = pillarCommand(s, { kind: "advance" });
      } else s = pillarCommand(s, { kind: "round", orders: policy(s, rand) });
    }
    if (s.phase === "won") wins++;
  }
  return wins / runs;
}
const P = (x: number) => `${Math.round(100 * x)}%`;
const base: Rules = { ...DEFAULT_RULES, elementSource: "creature", uniformPower: false };

if (part === "difficulty") {
  console.log("| Rooms | Enemy health | Squad | random | biggest number | planner |\n|---|---|---|---|---|---|");
  for (const rooms of ["facility", "roles"] as const)
    for (const hp of hps.length ? hps : [0.62, 0.75, 0.9, 1.05, 1.2])
      for (const squad of ["preset", "draft"] as const) {
        const rules = { ...base, rooms, enemyHpFactor: hp };
        const r = [randomPolicy, biggestPolicy, plannerPolicy].map((p) => winRate(rules, squad, p, RUNS));
        console.log(`| ${rooms} | ${hp} | ${squad} | ${r.map(P).join(" | ")} |`);
      }
}
if (part === "roles") {
  console.log("| Rooms | Enemy health | Squad | random | biggest number | hardest-hit targets | planner | look-ahead | look-ahead from hardest-hit | target choice worth |\n|---|---|---|---|---|---|---|---|---|---|");
  for (const [rooms, hp] of [["facility", Number(arg("fhp", "0.9"))], ["roles", Number(arg("rhp", "0.9"))]] as const)
    for (const squad of ["preset", "draft"] as const) {
      const rules = { ...base, rooms, enemyHpFactor: hp };
      const r = [randomPolicy, biggestPolicy, hardestHitPolicy, plannerPolicy].map((p) => winRate(rules, squad, p, RUNS));
      const look = winRate(rules, squad, lookahead(), LOOK_RUNS);
      const hard = winRate(rules, squad, hardestHitPolicy, LOOK_RUNS);
      const lookHard = winRate(rules, squad, lookahead({ candidates: 3, horizon: 3, samples: 2, from: hardestHitPolicy }), LOOK_RUNS);
      console.log(`| ${rooms} | ${hp} | ${squad} | ${r.map(P).join(" | ")} | ${P(look)} | ${P(lookHard)} | ${Math.round(100 * (lookHard - hard))} pts |`);
    }
}
if (part === "rests") {
  const rooms = arg("rooms", "roles") as "facility" | "roles";
  const hp = Number(arg("rhp", "0.9"));
  console.log("| Rest bonus | Squad | random | planner | look-ahead | planning ahead worth |\n|---|---|---|---|---|---|");
  for (const restBonus of arg("bonus", "0,0.25,0.5").split(",").map(Number))
    for (const squad of ["preset", "draft"] as const) {
      const rules = { ...base, rooms, enemyHpFactor: hp, restBonus };
      const r = [randomPolicy, plannerPolicy].map((p) => winRate(rules, squad, p, RUNS));
      const planner40 = winRate(rules, squad, plannerPolicy, LOOK_RUNS);
      const look = winRate(rules, squad, lookahead(), LOOK_RUNS);
      console.log(`| ${restBonus} | ${squad} | ${r.map(P).join(" | ")} | ${P(look)} | ${Math.round(100 * (look - planner40))} pts |`);
    }
}
