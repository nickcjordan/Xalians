/*
  Numbers census (docs/design/powerworks-pillars.md, "Numbers pass"): what the pillar reading
  produces for every creature a player can be offered, under the current levers. Over the draft
  offers of seeds 1..200 (each creature once) it reports the attack count, a histogram of
  attack power, how often an element step is invisible (a weak step, x0.5, that is not strictly
  between 0 and the neutral damage; a strong step, x1.5 or x2, that is not strictly above it),
  and health and support-number percentiles. Damage comes from the engine's own attackOn, so it
  measures what the game does.

  Run: node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/pillarsNumbers.ts
*/
import chart from "@xalians/content/typeEffectivenessMatrix.json";
import { draftOffer } from "../../index.ts";
import { readCompanion } from "../../reading.ts";
import { DEFAULT_RULES, attackOn, fighter, type Fighter, type PMove } from "../engine.ts";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const grid = chart as Record<string, Record<string, number>>;
const seeds = Number(process.argv.find((a) => a.startsWith("--seeds="))?.split("=")[1] ?? "200");
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

const power: Record<number, number> = {};
const health: number[] = [];
const support: Record<string, number[]> = {};
const seen = new Set<string>();
let creatures = 0, attacks = 0, weakBad = 0, weakChecked = 0, strongBad = 0, strongChecked = 0, weakZero = 0;
const failing: Record<number, number> = {};
for (let seed = 1; seed <= seeds; seed++)
  for (const o of draftOffer(seed)) {
    if (seen.has(o.seed)) continue;
    seen.add(o.seed);
    creatures++;
    const f = fighter(readCompanion(o.record, "x"), rules);
    health.push(f.max);
    for (const m of f.moves) {
      for (const p of m.parts) (support[p.kind] ??= []).push(p.n);
      if (m.power <= 0) continue;
      attacks++;
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
          failing[m.power] = (failing[m.power] ?? 0) + 1;
        }
      }
      if (strong.length) {
        strongChecked++;
        if (strong.some((d) => !(d > neutral))) strongBad++;
      }
    }
  }
const q = (a: number[], p: number) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(p * (s.length - 1))];
};
const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(1) : "0.0") + "%";
console.log(`creatures ${creatures}, attacks ${attacks}`);
console.log(`weak step not strictly between 0 and neutral: ${weakBad} of ${weakChecked} (${pct(weakBad, weakChecked)}); of these, weak deals 0: ${weakZero}`);
console.log(`strong step not strictly above neutral: ${strongBad} of ${strongChecked} (${pct(strongBad, strongChecked)})`);
console.log("failing weak steps by attack power", failing);
console.log("power histogram", Object.fromEntries(Object.entries(power).sort((a, b) => Number(a[0]) - Number(b[0]))));
console.log("health p5/25/50/75/95", [0.05, 0.25, 0.5, 0.75, 0.95].map((p) => q(health, p)).join(" / "));
for (const [k, v] of Object.entries(support)) console.log(`support ${k}: ${v.length}, p5/50/95 ${[0.05, 0.5, 0.95].map((p) => q(v, p)).join(" / ")}`);
