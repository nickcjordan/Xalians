/*
  Simplification pass evidence (docs/design/powerworks-simplification.md). Two readings:

  1. Census: which mechanics the creatures a player can actually field carry, over the
     starter squad and every creature the draft offers across SEEDS run seeds.
  2. The grid: at every planning moment of greedy runs, for each companion and each of its
     moves that may aim at two or more machines, how the move's worth differs by machine,
     and which rule makes it differ. "Choice depends on the machine" counts the moments where
     a companion's best move is not the same move on every machine.

  Run: node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/devtools/powerworksGrid.ts
*/
import {
  areaReach,
  command,
  openRun,
  draftOffer,
  guardFactor,
  legalMoves,
  legalTargets,
  matchup,
  moveAt,
  protectionDegree,
  harmScope,
  readCompanion,
  COMPANION_RECORDS,
  COMPANION_KEYS,
  type Command,
  type Order,
  type Run,
  type Unit,
} from "../index.ts";
import { moveValue, total, valueOn } from "../value.ts";
import { randomDraft } from "./powerworksSim.ts";

const SEEDS = Number(process.argv.find((a) => a.startsWith("--seeds="))?.slice(8) ?? 120);
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "-");

// 1. Census.
const seen = new Map<string, Unit>();
for (const key of COMPANION_KEYS) seen.set(`starter-${key}`, readCompanion(COMPANION_RECORDS[key], key));
for (let seed = 1; seed <= SEEDS; seed++)
  for (const o of draftOffer(seed)) if (!seen.has(o.seed)) seen.set(o.seed, o.unit);
const units = [...seen.values()];
const moves = units.flatMap((u) => u.moves);
const count = (pred: (m: (typeof moves)[number]) => boolean) => moves.filter(pred).length;
const has = (s: string) => (m: (typeof moves)[number]) => m.effects.some((e) => e.support === s);
const groups: Record<string, number> = {};
for (const m of moves)
  for (const g of new Set(m.effects.filter((e) => e.group && e.recipient !== "self").map((e) => e.group!)))
    groups[g] = (groups[g] ?? 0) + 1;
const passives: Record<string, number> = {};
for (const u of units)
  for (const p of u.passives) {
    const k = p.support === "unsupported" ? "unsupported" : p.kind === "ongoing" ? "ongoing" : `triggered:${p.trigger}`;
    passives[k] = (passives[k] ?? 0) + 1;
  }
const innate = units.filter((u) => u.conditions.some((c) => c.source === "innate")).length;
const statusRolls = moves.filter((m) => m.effects.some((e) => e.group && e.likelihood !== "consistent")).length;
console.log(`## Census: ${units.length} distinct creatures (starter + ${SEEDS} offers), ${moves.length} moves\n`);
console.log("| Mechanic | Moves | Share |\n|---|---|---|");
const rows: [string, number][] = [
  ["harm (damage)", count(has("harm"))],
  ["any status on a foe or squadmate", count((m) => m.effects.some((e) => e.group && e.recipient !== "self"))],
  ["status that rolls (likely/occasional)", statusRolls],
  ["area", count((m) => !!m.area)],
  ["displace (pull/push)", count(has("displace"))],
  ["protect/ward", count(has("protect"))],
  ["restore (heal)", count(has("restore"))],
  ["remove (cleanse)", count(has("remove"))],
  ["unsupported effect", count(has("unsupported"))],
  ["prolonged preparation (charge-up)", count((m) => m.preparation === "prolonged")],
  ["immediate preparation (initiative bonus)", count((m) => m.preparation === "immediate")],
  ["recovery repeatable (every round)", count((m) => m.recovery === "repeatable")],
  ["recovery brief (rests 1)", count((m) => m.recovery === "brief")],
  ["recovery prolonged (rests 2)", count((m) => m.recovery === "prolonged")],
  ["closing approach", count((m) => m.approach === "closing")],
  ["own element (not physical)", count((m) => !!m.element)],
];
for (const [k, n] of rows) console.log(`| ${k} | ${n} | ${pct(n, moves.length)} |`);
console.log("\n| Status group (moves carrying it) | Moves | Share |\n|---|---|---|");
for (const [g, n] of Object.entries(groups).sort((a, b) => b[1] - a[1])) console.log(`| ${g} | ${n} | ${pct(n, moves.length)} |`);
console.log(`\nCreatures with an innate protection: ${innate} of ${units.length} (${pct(innate, units.length)}).`);
console.log(`Passives: ${Object.entries(passives).map(([k, n]) => `${k} ${n}`).join(", ")} over ${units.length} creatures.`);
const two = units.filter((u) => new Set(u.moves.filter((m) => m.element).map((m) => m.element)).size > 1).length;
console.log(`Creatures whose moves carry more than one element: ${two} of ${units.length} (${pct(two, units.length)}).`);

// 1b. Move shapes in the pillars' terms (docs/design/powerworks-pillars.md): attack, heal,
// shield, boost, hinder, and what the pillars park (lasting effects, cleanse).
const kind = (e: (typeof moves)[number]["effects"][number]): string | null => {
  if (e.support === "unsupported") return null;
  if (e.support === "harm" || e.support === "displace") return "attack";
  if (e.support === "restore" || e.group === "mending") return "heal";
  if (e.status === "stimulated") return "boost";
  if (e.support === "protect" || e.group === "guarding") return "shield";
  if (e.support === "remove") return "cleanse (parked)";
  if (e.group === "degrading") return "lasting (parked)";
  if (e.group === "concealment") return "conceal";
  return "hinder";
};
const shapes: Record<string, number> = {};
for (const m of moves) {
  const parts = [
    ...new Set(
      m.effects
        .map((e) => {
          const k = kind(e);
          return k && `${k}${e.recipient === "self" ? " (self)" : e.recipient === "area" ? " (area)" : ""}`;
        })
        .filter(Boolean)
    ),
  ].sort();
  const key = parts.join(" + ") || "nothing supported";
  shapes[key] = (shapes[key] ?? 0) + 1;
}
console.log("\n| Move shape, in the pillars' terms | Moves | Share |\n|---|---|---|");
for (const [k, n] of Object.entries(shapes).sort((a, b) => b[1] - a[1])) console.log(`| ${k} | ${n} | ${pct(n, moves.length)} |`);

// 2. The grid, along greedy runs.
const policy = (s: Run): Record<string, Order> => {
  const orders: Record<string, Order> = {};
  for (const u of s.team.filter((u) => u.hp > 0)) {
    const legal = legalMoves(u, s);
    let best: { move: number; target: string; score: number } | null = null;
    for (const i of legal) {
      if (i < 0) continue;
      const v = moveValue(s, u, i);
      const ids = legalTargets(s, u, i).map((t) => t.id);
      const target = v.target && ids.includes(v.target) ? v.target : ids[0];
      if (!target) continue;
      const score = total(v);
      if (!best || score > best.score) best = { move: i, target, score };
    }
    if (best) orders[u.id] = { move: best.move, target: best.target };
    else if (legal.includes(-1)) orders[u.id] = { move: -1, target: s.enemies.find((e) => e.hp > 0)!.id };
    else {
      const i = legal.find((k) => legalTargets(s, u, k).length);
      orders[u.id] = i === undefined ? { move: -2, target: u.id } : { move: i, target: legalTargets(s, u, i)[0].id };
    }
  }
  return orders;
};
const causes = { element: 0, guard: 0, area: 0, knockout: 0, fit: 0, blowSize: 0, other: 0 };
let grids = 0,
  flat = 0,
  moments = 0,
  dependent = 0;
const play = (seed: number, squad: Command) => {
  let s: Run = command(openRun(seed), squad);
  let guard = 0;
  while ((s.phase === "planning" || s.phase === "camp") && guard++ < 300) {
    if (s.phase === "camp") {
      const down = s.team.find((u) => u.hp <= 0);
      if (down && s.revival) s = command(s, { kind: "revive", id: down.id });
      s = command(s, { kind: "advance" });
      continue;
    }
    const foes = s.enemies.filter((e) => e.hp > 0);
    for (const u of s.team.filter((u) => u.hp > 0)) {
      if (foes.length < 2) break;
      const best: Record<string, { move: number; worth: number }> = {};
      for (const i of legalMoves(u, s)) {
        if (i < 0) continue;
        const m = moveAt(u, i);
        const targets = legalTargets(s, u, i).filter((t) => t.enemy);
        if (targets.length < 2) continue;
        const cells = targets.map((t) => ({ t, v: valueOn(s, u, i, t) }));
        for (const c of cells) {
          const w = total(c.v);
          if (!best[c.t.id] || w > best[c.t.id].worth) best[c.t.id] = { move: i, worth: w };
        }
        grids++;
        if (new Set(cells.map((c) => total(c.v))).size === 1) {
          flat++;
          continue;
        }
        const differs = <T>(f: (t: Unit) => T) => new Set(targets.map((t) => JSON.stringify(f(t)))).size > 1;
        const element = m.element ?? u.element;
        let any = false;
        const mark = (k: keyof typeof causes, yes: boolean) => {
          if (yes) {
            causes[k]++;
            any = true;
          }
        };
        const harms = m.effects.some((e) => e.support === "harm" || e.support === "displace");
        mark("element", harms && differs((t) => matchup(u, t, m)));
        mark("guard", harms && differs((t) => [guardFactor(t), ...m.effects.map((e) => protectionDegree(t, harmScope(e, element)))]));
        mark("area", !!m.area && differs((t) => areaReach(s, u, m, t).length));
        mark("knockout", differs((t) => cells.find((c) => c.t === t)!.v.knockout));
        const stops = cells.map((c) => c.v.stops);
        const controls = m.effects.some((e) => e.group && e.recipient !== "self" && e.group !== "degrading");
        mark("fit", controls && stops.some((x) => x > 0) && stops.some((x) => x === 0));
        mark("blowSize", controls && new Set(stops.filter((x) => x > 0)).size > 1);
        if (!any) causes.other++;
      }
      const picks = Object.values(best);
      if (picks.length >= 2) {
        moments++;
        if (new Set(picks.map((p) => p.move)).size > 1) dependent++;
      }
    }
    s = command(s, { kind: "round", orders: policy(s) });
  }
};
for (let seed = 1; seed <= SEEDS; seed++) {
  play(seed, { kind: "draft", squad: "starter" });
  play(seed, { kind: "draft", squad: randomDraft(seed) });
}
console.log(`\n## The grid: ${grids} (companion, move) grids over two or more machines, ${SEEDS} seeds, starter and random drafts\n`);
console.log(`Flat (same worth on every machine): ${flat} (${pct(flat, grids)}). Uneven: ${grids - flat} (${pct(grids - flat, grids)}).\n`);
console.log("| What makes an uneven grid differ (not exclusive) | Grids | Share of uneven |\n|---|---|---|");
const words: Record<keyof typeof causes, string> = {
  element: "element matchup differs by machine",
  guard: "a machine's guard or protection",
  area: "area reach depends on where you aim",
  knockout: "finishes some machines, not others",
  fit: "a status works on some machines, not others",
  blowSize: "a status stops a bigger blow on one machine",
  other: "none of the above (threat weighting, ticks)",
};
for (const [k, n] of Object.entries(causes)) console.log(`| ${words[k as keyof typeof causes]} | ${n} | ${pct(n, grids - flat)} |`);
console.log(`\nPlanning moments (companion, two or more machines standing): ${moments}. The best move differs by machine in ${dependent} (${pct(dependent, moments)}).`);
