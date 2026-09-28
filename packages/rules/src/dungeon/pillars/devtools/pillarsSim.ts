/*
  Pillar rules measured (docs/design/powerworks-pillars.md). For each rule set, each squad kind
  and each player, the win rate; and at the planner's decisions, how much the choices matter:

    move matters   the planner's best move is not simply the strongest ready attack
    spread         how much better the best move is than the typical other move, in health
    target flips   a companion's best move is not the same move on every enemy (the grid the
                   screen would have to draw)

  Run: node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsSim.ts --runs=200
*/
import { randomDraft } from "../../devtools/powerworksSim.ts";
import { DEFAULT_RULES, attackOn, createPillarRun, legalMoves, legalTargets, pillarCommand, type PRun, type Rules } from "../engine.ts";
import { biggestPolicy, lookahead, plannerPolicy, randomPolicy, stream, worth, type Policy } from "../policy.ts";

const arg = (k: string, d: number) => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const RUNS = arg("runs", 200);
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "-");

type Tally = { wins: number; runs: number; decisions: number; moveMatters: number; spread: number; flips: number; flipBase: number; dmgFlips: number };
const tally = (): Tally => ({ wins: 0, runs: 0, decisions: 0, moveMatters: 0, spread: 0, flips: 0, flipBase: 0, dmgFlips: 0 });

function observe(s: PRun, t: Tally) {
  const hp = Object.fromEntries(s.enemies.map((e) => [e.id, e.hp]));
  for (const u of s.team.filter((x) => x.hp > 0)) {
    const moves = legalMoves(u);
    if (moves.length < 2) continue;
    // The best (move, target) worth per move.
    const perMove = moves.map((i) => Math.max(...legalTargets(s, u, i).map((tg) => worth(s, u, i, tg, hp)), 0));
    const bestK = perMove.indexOf(Math.max(...perMove));
    const strongest = moves.filter((i) => u.moves[i].power > 0).sort((a, b) => u.moves[b].power - u.moves[a].power)[0];
    t.decisions++;
    if (strongest !== undefined && moves[bestK] !== strongest && perMove[bestK] > perMove[moves.indexOf(strongest)] + 0.5) t.moveMatters++;
    const others = perMove.filter((_, k) => k !== bestK).sort((a, b) => a - b);
    t.spread += perMove[bestK] - others[Math.floor(others.length / 2)];
    // Target flips: among attacks, the best move per enemy.
    const standing = s.enemies.filter((e) => e.hp > 0);
    const attacks = moves.filter((i) => u.moves[i].power > 0);
    if (standing.length >= 2 && attacks.length >= 2) {
      t.flipBase++;
      const picks = standing.map((e) => attacks.reduce((a, b) => (worth(s, u, b, e, hp) > worth(s, u, a, e, hp) ? b : a)));
      if (new Set(picks).size > 1) t.flips++;
      // Damage alone (no finishing, no shields): does the strongest-hitting move change with the enemy?
      const hits = standing.map((e) => attacks.reduce((a, b) => (attackOn(u, u.moves[b], e) > attackOn(u, u.moves[a], e) ? b : a)));
      if (new Set(hits).size > 1) t.dmgFlips++;
    }
  }
}

function play(seed: number, squad: "starter" | number[], rules: Rules, policy: Policy, t: Tally, watch: boolean) {
  let s = createPillarRun(seed, squad, rules);
  const rand = stream(seed * 7 + 3);
  let guard = 0;
  while ((s.phase === "planning" || s.phase === "camp") && guard++ < 400) {
    if (s.phase === "camp") {
      const down = s.team.find((u) => u.hp <= 0);
      if (down && s.revival) s = pillarCommand(s, { kind: "revive", id: down.id });
      s = pillarCommand(s, { kind: "advance" });
      continue;
    }
    if (watch) observe(s, t);
    s = pillarCommand(s, { kind: "round", orders: policy(s, rand) });
  }
  t.runs++;
  if (s.phase === "won") t.wins++;
}

const CONFIGS: [string, Rules][] = [
  ["Element on each move (today)", { ...DEFAULT_RULES, elementSource: "move", uniformPower: false }],
  ["Path 1: element on the creature", { ...DEFAULT_RULES, elementSource: "creature", uniformPower: false }],
  ["Path 2: one power per creature", { ...DEFAULT_RULES, elementSource: "creature", uniformPower: true }],
];
const FAST = process.argv.includes("--fast");
const POLICIES: [string, Policy][] = [["random", randomPolicy], ["biggest number", biggestPolicy], ["planner", plannerPolicy], ...(FAST ? [] : [["look-ahead", lookahead()] as [string, Policy]])];

const hpArg = process.argv.find((a) => a.startsWith("--hp="));
if (hpArg) for (const c of CONFIGS) c[1] = { ...c[1], enemyHpFactor: Number(hpArg.split("=")[1]) };

console.log(`| Rules | Squad | random | biggest number | planner | look-ahead | move matters | spread (hp) | best move changes with the enemy | strongest hit changes with the enemy |`);
console.log(`|---|---|---|---|---|---|---|---|---|---|`);
for (const [label, rules] of CONFIGS)
  for (const squad of ["preset", "random draft"] as const) {
    const rows = POLICIES.map(([name, policy]) => {
      const t = tally();
      const n = name === "look-ahead" ? Math.max(20, Math.floor(RUNS / 4)) : RUNS;
      for (let seed = 1; seed <= n; seed++) play(seed, squad === "preset" ? "starter" : randomDraft(seed), rules, policy, t, name === "planner");
      return t;
    });
    const p = rows[2];
    while (rows.length < 4) rows.push({ ...tally(), runs: 0 });
    console.log(
      `| ${label} | ${squad} | ${rows.map((r) => pct(r.wins, r.runs)).join(" | ")} | ${pct(p.moveMatters, p.decisions)} | ${(p.spread / (p.decisions || 1)).toFixed(1)} | ${pct(p.flips, p.flipBase)} | ${pct(p.dmgFlips, p.flipBase)} |`
    );
  }
