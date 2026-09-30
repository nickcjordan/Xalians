/*
  Numbers census (docs/design/powerworks-pillars.md, "Numbers pass"): what the pillar reading
  produces for every creature a player can be offered, under the current levers, by source
  (docs/design/creature-sample-set.md; sources are never merged):

    catalog  the draft offers of seeds 1..--seeds (each creature once): the real catalog
    samples  the 168 generated sample creatures
    grid     every effect-grid action read as the only move of a standard unit (attributes 50)

  Per source it reports the attack count, a histogram of attack power, how often an element step
  is invisible (a weak step, x0.5, that is not strictly between 0 and the neutral damage; a
  strong step, x1.5 or x2, that is not strictly above it), health percentiles (creature sources)
  and support-number percentiles per kind. Damage comes from the engine's own stepDamage and
  attackOn, so it measures what the game does. For the grid it also prints the reading table:
  what each effect type and recipient turns into, and the shapes the reading does not read.

  Run: node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsNumbers.ts --source=all
       --source=catalog|samples|grid|all (default all), --seeds=200
*/
import chart from "@xalians/content/typeEffectivenessMatrix.json";
import type { CreatureRecord } from "@xalians/content/creature";
import { effectGrid, sampleCreatures } from "../../../samples/index.ts";
import { draftOffer } from "../../index.ts";
import { readCompanion, type Move } from "../../reading.ts";
import { DEFAULT_RULES, attackOn, fighter, type Fighter, type PMove } from "../engine.ts";
import { readMove } from "../read.ts";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const grid = chart as Record<string, Record<string, number>>;
const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const seeds = Number(arg("seeds", "200"));
const source = arg("source", "all");
const rules = { ...DEFAULT_RULES };

/** A stand-in defender whose element gives this attack the wanted step (null: none does, so the step is 1 or 0 by the chart). */
const target = (element: string): Fighter =>
  ({ id: "t", name: "t", species: "t", element, enemy: true, hp: 999, max: 999, speed: 50, moves: [], cooldowns: [], signatureSpent: false, shields: [], boost: 0, hinder: 0 });
const NEUTRAL = target("none");
function defenderFor(attackElement: string, wanted: number): Fighter | null {
  const row = grid[cap(attackElement)] ?? {};
  const hit = Object.keys(row).find((d) => row[d] === wanted);
  return hit ? target(hit.toLowerCase()) : null;
}

const q = (a: number[], p: number) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(p * (s.length - 1))] : NaN;
};
const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(1) : "0.0") + "%";

/** The census of a list of fighters. */
function census(label: string, fighters: Fighter[], withHealth: boolean) {
  const power: Record<number, number> = {};
  const health: number[] = [];
  const support: Record<string, number[]> = {};
  let attacks = 0, weakBad = 0, weakChecked = 0, strongBad = 0, strongChecked = 0, weakZero = 0, areaAttacks = 0;
  const weakFail: Record<number, number> = {};
  const strongFail: Record<number, number> = {};
  for (const f of fighters) {
    health.push(f.max);
    for (const m of f.moves) {
      for (const p of m.parts) (support[`${p.kind}${p.aim === "enemy" ? "" : `/${p.aim}`}`] ??= []).push(p.n);
      if (m.power <= 0) continue;
      attacks++;
      if (m.area) areaAttacks++;
      power[m.power] = (power[m.power] ?? 0) + 1;
      const dmg = (t: Fighter | null) => (t ? attackOn(f, m as PMove, t) : null);
      const neutral = attackOn(f, m, NEUTRAL);
      const weak = dmg(defenderFor(f.element, 0.5));
      const strong = [1.5, 2].map((x) => dmg(defenderFor(f.element, x))).filter((d): d is number => d !== null);
      if (weak !== null) {
        weakChecked++;
        if (weak === 0) weakZero++;
        if (!(weak > 0 && weak < neutral)) {
          weakBad++;
          weakFail[m.power] = (weakFail[m.power] ?? 0) + 1;
        }
      }
      if (strong.length) {
        strongChecked++;
        if (strong.some((d) => !(d > neutral))) {
          strongBad++;
          strongFail[m.power] = (strongFail[m.power] ?? 0) + 1;
        }
      }
    }
  }
  const sorted = (o: Record<number, number>) => Object.fromEntries(Object.entries(o).sort((a, b) => Number(a[0]) - Number(b[0])));
  console.log(`\n### ${label}`);
  console.log(`${withHealth ? "creatures" : "actions"} ${fighters.length}, attacks ${attacks} (area ${areaAttacks})`);
  console.log(`weak step not strictly between 0 and neutral: ${weakBad} of ${weakChecked} (${pct(weakBad, weakChecked)}); of these, weak deals 0: ${weakZero}`);
  console.log(`strong step not strictly above neutral: ${strongBad} of ${strongChecked} (${pct(strongBad, strongChecked)})`);
  console.log("failing weak steps by attack power", sorted(weakFail));
  console.log("failing strong steps by attack power", sorted(strongFail));
  console.log("power histogram", sorted(power));
  if (withHealth) console.log("health p0/5/25/50/75/95/100", [0, 0.05, 0.25, 0.5, 0.75, 0.95, 1].map((p) => q(health, p)).join(" / "));
  else console.log("health: n/a (a grid unit carries no health of its own)");
  for (const [k, v] of Object.entries(support).sort()) console.log(`support ${k}: ${v.length}, p0/5/50/95/100 ${[0, 0.05, 0.5, 0.95, 1].map((p) => q(v, p)).join(" / ")}`);
}

const asFighters = (records: readonly CreatureRecord[]) => records.map((r) => fighter(readCompanion(r, "x"), rules));

/** A standard unit whose only move is this grid action: attributes 50, element the action's own (fire when it has none). */
function gridUnit(action: unknown, element: string) {
  const record = {
    species: "grid",
    element,
    attributes: Object.fromEntries(["strength", "vitality", "endurance", "agility", "reflex", "intelligence", "willpower", "instinct", "charisma", "resilience"].map((k) => [k, 50])),
    actions: [action],
    passives: [],
    signature: { type: "none" },
    physiology: { protections: [] },
  } as unknown as CreatureRecord;
  return readCompanion(record, "G");
}

if (source === "catalog" || source === "all") {
  const seen = new Set<string>();
  const records: CreatureRecord[] = [];
  for (let seed = 1; seed <= seeds; seed++)
    for (const o of draftOffer(seed)) {
      if (seen.has(o.seed)) continue;
      seen.add(o.seed);
      records.push(o.record);
    }
  census(`catalog (draft offers of seeds 1..${seeds}, each creature once)`, asFighters(records), true);
}
if (source === "samples" || source === "all") census("samples (168 generated sample creatures)", asFighters(sampleCreatures()), true);

if (source === "grid" || source === "all") {
  const entries = effectGrid();
  const units = entries.map((e) => ({ label: e.label, unit: gridUnit(e.action, e.action.element ?? "fire") }));
  census(`grid (${entries.length} actions, each the only move of a standard unit)`, units.map(({ unit }) => fighter(unit, rules)), false);

  // The reading table: each effect read alone, under the shipped rules.
  type Row = { read: number; notRead: number; as: Record<string, number> };
  const rows: Record<string, Row> = {};
  const unread: Record<string, { n: number; shapes: Set<string>; example: string }> = {};
  for (const { label, unit } of units) {
    const move: Move = unit.moves[0];
    const whole = readMove(unit, move, rules);
    for (const e of move.effects) {
      const dependentRestore = !!e.requires && e.type === "restore";
      const solo = dependentRestore ? whole : readMove(unit, { ...move, effects: [e] }, rules);
      let as: string | null = null;
      if (dependentRestore) {
        const p = solo.parts.find((x) => x.kind === (e.support === "restore" || e.group === "mending" ? "heal" : ""));
        as = p ? `${p.kind} ${p.aim}${p.all ? " (all)" : ""}` : null;
      } else if (solo.power > 0) as = solo.area ? "attack (area)" : "attack";
      else if (solo.parts.length) as = solo.parts.map((p) => `${p.kind} ${p.aim}${p.all ? " (all)" : ""}`).join(" + ");
      const key = `${e.type} x ${e.recipient}`;
      const row = (rows[key] ??= { read: 0, notRead: 0, as: {} });
      if (as) {
        row.read++;
        row.as[as] = (row.as[as] ?? 0) + 1;
      } else {
        row.notRead++;
        const why = e.support === "unsupported" ? (e.reason ?? "unsupported").replace(/^\w+ on itself/, "a hostile status on itself")
          : e.type === "remove" ? "remove (cleanse) is parked"
          : e.group === "degrading" ? "lasting damage tick is parked"
          : e.group === "concealment" ? "concealment is parked"
          : (e.type === "restore" || e.type === "protect" || e.type === "status") && Math.round((e.intensity || 50) / 5) <= 0 ? `number rounds to 0 (intensity ${e.intensity})`
          : `${e.group ?? e.support} is not read`;
        const shape = `${e.type} x ${e.recipient}${e.status ? ` ${e.status}` : e.mechanism ? ` ${e.mechanism}` : ""}`;
        const u = (unread[why] ??= { n: 0, shapes: new Set<string>(), example: label });
        u.n++;
        u.shapes.add(shape);
      }
    }
  }
  console.log("\n### grid reading table (each effect read alone; a dependent restore is read inside its move)");
  console.log("| Effect x recipient | read | not read | read as |\n|---|---|---|---|");
  for (const [k, r] of Object.entries(rows).sort())
    console.log(`| ${k} | ${r.read} | ${r.notRead} | ${Object.entries(r.as).sort().map(([a, n]) => `${a} ${n}`).join(", ") || "-"} |`);
  const total = Object.values(rows).reduce((a, r) => ({ read: a.read + r.read, notRead: a.notRead + r.notRead }), { read: 0, notRead: 0 });
  console.log(`\neffects read ${total.read}, not read ${total.notRead}`);
  console.log("\nnot-read effects by reason (count; distinct shapes; first grid label)");
  for (const [k, u] of Object.entries(unread).sort((a, b) => b[1].n - a[1].n)) console.log(`- ${k}: ${u.n} effects, ${u.shapes.size} shapes; e.g. ${u.example}\n    ${[...u.shapes].sort().join("; ")}`);

  // Whole actions: how many are usable at all (an attack or any support part).
  let inert = 0;
  const inertLabels: string[] = [];
  for (const { label, unit } of units) {
    const p = readMove(unit, unit.moves[0], rules);
    if (p.power <= 0 && !p.parts.length) {
      inert++;
      inertLabels.push(label);
    }
  }
  console.log(`\nwhole actions the reading turns into nothing (no attack, no support): ${inert} of ${units.length}`);
}
