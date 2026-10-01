/*
  Sim players for the pillar rules. A value is health: damage landed, a blow a knockout stops
  before it lands, health restored, damage a shield or hinder is expected to keep off.
  Presentation never reads these; the sim uses them to measure how much the choices matter.
*/
import { HEALTH_SCALE } from "./levers.ts";
import { actsBefore, allShare, attackOn, legalMoves, legalTargets, step, stepDamage, turnOrder, type Fighter, type Order, type PMove, type PRun } from "./engine.ts";

/** A small seeded stream for sim choices, apart from the run's rng. */
export function stream(seed: number) {
  let x = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0;
  return () => ((x = (Math.imul(1664525, x) + 1013904223) >>> 0) / 4294967296);
}
/** An enemy's strongest ready blow on one companion. */
function blow(e: Fighter, on: Fighter): number {
  let best = 0;
  e.moves.forEach((m, i) => {
    if (m.power > 0 && e.cooldowns[i] === 0) best = Math.max(best, stepDamage(m.power, step(m.element, on.element)));
  });
  return Math.max(0, best - e.hinder);
}
/** An enemy's strongest ready blow averaged over the companions it may pick, weighted by size. */
function expectedBlow(s: PRun, e: Fighter): number {
  const foes = s.team.filter((t) => t.hp > 0);
  const w = foes.map((f) => f.max);
  const total = w.reduce((a, b) => a + b, 0) || 1;
  return foes.reduce((sum, f, k) => sum + (w[k] / total) * blow(e, f), 0);
}
/** What an enemy is worth removing: its expected blow, or what its best ready support gives its side. */
export function threat(s: PRun, e: Fighter): number {
  let support = 0;
  e.moves.forEach((m, i) => {
    if (e.cooldowns[i] === 0) for (const p of m.parts) support = Math.max(support, p.n * (p.kind === "shield" ? 0.6 : 0.8));
  });
  return Math.max(expectedBlow(s, e), support);
}
/** Blows expected on one companion this round. */
function incoming(s: PRun, t: Fighter): number {
  const foes = s.team.filter((u) => u.hp > 0);
  const total = foes.reduce((a, f) => a + f.max, 0) || 1;
  return s.enemies.filter((e) => e.hp > 0).reduce((sum, e) => sum + (t.max / total) * blow(e, t), 0);
}

/** What one (move, target) is worth now, in health, against projected enemy health. */
export function worth(s: PRun, u: Fighter, i: number, target: Fighter, hp: Record<string, number>): number {
  const m: PMove = u.moves[i];
  let v = 0;
  if (m.power > 0) {
    for (const t of m.area ? s.enemies.filter((e) => hp[e.id] > 0) : [target]) {
      const left = hp[t.id] ?? t.hp;
      if (left <= 0) continue;
      const shield = t.shields.reduce((a, b) => a + b.n, 0);
      const dealt = Math.min(left, Math.max(0, attackOn(u, m, t) - shield));
      v += dealt;
      if (dealt >= left) v += threat(s, t) * (actsBefore(s, u, t) ? 1.5 : 0.8);
    }
  }
  for (const p of m.parts) {
    const n = p.all ? allShare(p.n) : p.n;
    const allies = p.aim === "self" ? [u] : p.all ? s.team.filter((t) => t.hp > 0) : [target.enemy ? u : target];
    const enemies = p.all ? s.enemies.filter((e) => (hp[e.id] ?? e.hp) > 0) : [target];
    if (p.kind === "heal") v += allies.reduce((a, t) => a + Math.min(n, t.max - t.hp) * 0.9, 0);
    if (p.kind === "shield") v += allies.reduce((a, t) => a + Math.min(n, incoming(s, t)), 0);
    if (p.kind === "boost") v += allies.reduce((a, t) => a + (t.id === u.id ? 0.5 : 0.8) * n, 0);
    if (p.kind === "hinder") v += enemies.reduce((a, e) => a + ((hp[e.id] ?? e.hp) > 0 ? Math.min(n, expectedBlow(s, e)) * 0.9 : 0), 0);
  }
  return v;
}

export type Policy = (s: PRun, rand: () => number) => Record<string, Order>;
const pass = (u: Fighter): Order => ({ move: -2, target: u.id });

/** Uniformly random legal orders. */
export const randomPolicy: Policy = (s, rand) => {
  const orders: Record<string, Order> = {};
  for (const u of s.team.filter((t) => t.hp > 0)) {
    const moves = legalMoves(u);
    if (!moves.length) {
      orders[u.id] = pass(u);
      continue;
    }
    const i = moves[Math.floor(rand() * moves.length)];
    const ts = legalTargets(s, u, i);
    orders[u.id] = { move: i, target: ts[Math.floor(rand() * ts.length)].id };
  }
  return orders;
};
/** "Highest number": each companion uses its strongest ready attack on the enemy that takes the most from it. */
export const biggestPolicy: Policy = (s) => {
  const orders: Record<string, Order> = {};
  for (const u of s.team.filter((t) => t.hp > 0)) {
    const moves = legalMoves(u);
    const attacks = moves.filter((i) => u.moves[i].power > 0).sort((a, b) => u.moves[b].power - u.moves[a].power);
    const i = attacks[0] ?? moves[0];
    if (i === undefined) {
      orders[u.id] = pass(u);
      continue;
    }
    const ts = legalTargets(s, u, i).sort((a, b) => attackOn(u, u.moves[i], b) - attackOn(u, u.moves[i], a));
    orders[u.id] = { move: i, target: ts[0].id };
  }
  return orders;
};
/**
  The planner: companions in turn order, each taking the (move, target) worth the most against
  the enemies' health after the orders before it, so kills are shared out and overkill avoided.
*/
export const plannerPolicy: Policy = (s) => plan(s, false);
/**
  The planner that never chooses whom to hit: every attack goes to the enemy it damages most
  (the lowest health on a tie). Its gap to the planner is what choosing a target is worth.
*/
export const hardestHitPolicy: Policy = (s) => plan(s, true);
function plan(s: PRun, naiveTarget: boolean): Record<string, Order> {
  const orders: Record<string, Order> = {};
  const hp: Record<string, number> = Object.fromEntries(s.enemies.map((e) => [e.id, e.hp]));
  for (const u of turnOrder(s).filter((x) => !x.enemy)) {
    let best: { i: number; t: Fighter; v: number } | null = null;
    for (const i of legalMoves(u)) {
      let targets = legalTargets(s, u, i).filter((t) => !t.enemy || hp[t.id] > 0);
      if (naiveTarget && targets.some((t) => t.enemy) && u.moves[i].power > 0)
        targets = [targets.reduce((a, b) => {
          const da = attackOn(u, u.moves[i], a), db = attackOn(u, u.moves[i], b);
          return db > da || (db === da && hp[b.id] < hp[a.id]) ? b : a;
        })];
      for (const t of targets) {
        const v = worth(s, u, i, t, hp);
        if (!best || v > best.v) best = { i, t, v };
      }
    }
    if (!best) {
      orders[u.id] = pass(u);
      continue;
    }
    orders[u.id] = { move: best.i, target: best.t.id };
    const m = u.moves[best.i];
    if (m.power > 0)
      for (const t of m.area ? s.enemies : [best.t]) if (hp[t.id] > 0) hp[t.id] = Math.max(0, hp[t.id] - attackOn(u, m, t));
  }
  for (const u of s.team.filter((t) => t.hp > 0 && !orders[t.id])) orders[u.id] = pass(u);
  return orders;
}

import { pillarCommand } from "./engine.ts";
/** A position's worth for the look-ahead: squad health kept against enemy health left, and the outcome. */
function position(s: PRun): number {
  if (s.phase === "lost") return -1000;
  const team = s.team.reduce((a, u) => a + Math.max(0, u.hp), 0) + 25 * HEALTH_SCALE * s.team.filter((u) => u.hp > 0).length;
  const foes = s.phase === "planning" ? s.enemies.reduce((a, e) => a + Math.max(0, e.hp), 0) : 0;
  return team - 1.2 * foes + (s.phase === "camp" || s.phase === "won" ? 60 * HEALTH_SCALE : 0);
}
/** Play the planner forward a few rounds from a state; the encounter's end stops it. */
function rollout(s: PRun, horizon: number): number {
  let t = s;
  for (let r = 0; r < horizon && t.phase === "planning"; r++) t = pillarCommand(t, { kind: "round", orders: plannerPolicy(t, () => 0.5) });
  return position(t);
}
/**
  The look-ahead: starts from the planner's orders and, companion by companion, tries its
  other promising moves, keeping a change when playing on a few rounds (the enemies' hidden
  choices drawn fresh each time) ends in a better position. It is the player who thinks about
  rests and timing, where the planner only sees this round.
*/
export function lookahead(opts: { candidates: number; horizon: number; samples: number; from?: Policy } = { candidates: 3, horizon: 3, samples: 2 }): Policy {
  return (s, rand) => {
    const orders = (opts.from ?? plannerPolicy)(s, rand);
    const score = (o: Record<string, Order>) => {
      let sum = 0;
      for (let k = 0; k < opts.samples; k++) {
        const t = structuredClone(s);
        t.rng = (Math.floor(rand() * 4294967296) ^ s.rng) >>> 0;
        let next: PRun;
        try {
          next = pillarCommand(t, { kind: "round", orders: o });
        } catch {
          return -Infinity;
        }
        sum += rollout(next, opts.horizon - 1);
      }
      return sum / opts.samples;
    };
    let best = score(orders);
    const hp: Record<string, number> = Object.fromEntries(s.enemies.map((e) => [e.id, e.hp]));
    for (const u of turnOrder(s).filter((x) => !x.enemy)) {
      const options: { i: number; t: string; v: number }[] = [];
      for (const i of legalMoves(u)) for (const t of legalTargets(s, u, i)) options.push({ i, t: t.id, v: worth(s, u, i, t, hp) });
      options.sort((a, b) => b.v - a.v);
      for (const o of options.slice(0, opts.candidates)) {
        if (orders[u.id]?.move === o.i && orders[u.id]?.target === o.t) continue;
        const trial = { ...orders, [u.id]: { move: o.i, target: o.t } };
        const v = score(trial);
        if (v > best) {
          best = v;
          orders[u.id] = trial[u.id];
        }
      }
      // Holding back: a pass keeps every move ready.
      const hold = { ...orders, [u.id]: { move: -2, target: u.id } };
      const v = score(hold);
      if (v > best) {
        best = v;
        orders[u.id] = hold[u.id];
      }
    }
    return orders;
  };
}
