/*
  Sim players for turn-by-turn play (turns.ts): each chooses one action for the companion whose
  turn it is. Values are health, as in policy.ts: damage landed, a knockout's worth (the target's
  threat, more when it would act before this companion's next turn), health restored, damage a
  shield or hinder keeps off, and for the turn-order layer the share of a threat a delay pushes
  past this companion's next turn.
*/
import { attackOn, legalMoves, legalTargets, step, type Fighter, type Order } from "./engine.ts";
import { activeOf, actsBeforeMyNext, turnCommand, type TRun } from "./turns.ts";

export type TurnPolicy = (s: TRun, rand: () => number) => Order;
const PASS = (u: Fighter): Order => ({ move: -2, target: u.id });

function blow(e: Fighter, on: Fighter): number {
  let best = 0;
  e.moves.forEach((m, i) => {
    if (m.power > 0 && e.cooldowns[i] <= 1) best = Math.max(best, Math.floor(m.power * step(m.element, on.element)));
  });
  return Math.max(0, best - e.hinder);
}
/** An enemy's worth removing: its expected blow, or its best support. */
function threat(s: TRun, e: Fighter): number {
  const foes = s.team.filter((t) => t.hp > 0);
  const total = foes.reduce((a, f) => a + f.max, 0) || 1;
  const attack = foes.reduce((sum, f) => sum + (f.max / total) * blow(e, f), 0);
  let support = 0;
  e.moves.forEach((m, i) => {
    if (e.cooldowns[i] <= 1) for (const p of m.parts) if (p.kind !== "delay") support = Math.max(support, p.n * (p.kind === "shield" ? 0.6 : 0.8));
  });
  return Math.max(attack, support);
}
/** Blows expected on one companion before the active one's next turn. */
function incoming(s: TRun, u: Fighter, t: Fighter): number {
  const foes = s.team.filter((x) => x.hp > 0);
  const total = foes.reduce((a, f) => a + f.max, 0) || 1;
  return s.enemies.filter((e) => e.hp > 0 && actsBeforeMyNext(s, u, e)).reduce((sum, e) => sum + (t.max / total) * blow(e, t), 0);
}
export function turnWorth(s: TRun, u: Fighter, i: number, target: Fighter): number {
  const m = u.moves[i];
  let v = 0;
  if (m.power > 0)
    for (const t of m.area ? s.enemies.filter((e) => e.hp > 0) : [target]) {
      const shield = t.shields.reduce((a, b) => a + b.n, 0);
      const dealt = Math.min(t.hp, Math.max(0, attackOn(u, m, t) - shield));
      v += dealt;
      if (dealt >= t.hp) v += threat(s, t) * (actsBeforeMyNext(s, u, t) ? 1.5 : 0.8);
    }
  for (const p of m.parts) {
    const n = p.all ? Math.floor(p.n * 0.6) : p.n;
    const allies = p.aim === "self" ? [u] : p.all ? s.team.filter((t) => t.hp > 0) : [target.enemy ? u : target];
    const enemies = p.all ? s.enemies.filter((e) => e.hp > 0) : [target];
    if (p.kind === "heal") v += allies.reduce((a, t) => a + Math.min(n, t.max - t.hp) * 0.9, 0);
    if (p.kind === "shield") v += allies.reduce((a, t) => a + Math.min(n, incoming(s, u, t)), 0);
    if (p.kind === "boost") v += allies.reduce((a, t) => a + (t.id === u.id ? 0.5 : 0.9) * n, 0);
    if (p.kind === "hinder") v += enemies.reduce((a, e) => a + (e.hp > 0 ? Math.min(n, threat(s, e)) * 0.9 : 0), 0);
    if (p.kind === "delay") v += enemies.reduce((a, e) => a + (e.hp > 0 ? threat(s, e) * (p.n / 100) * (actsBeforeMyNext(s, u, e) ? 1.2 : 0.6) : 0), 0);
  }
  return v;
}
function options(s: TRun, u: Fighter): { i: number; t: Fighter }[] {
  return legalMoves(u).flatMap((i) => legalTargets(s, u, i).map((t) => ({ i, t })));
}
export const turnRandom: TurnPolicy = (s, rand) => {
  const u = activeOf(s)!;
  const o = options(s, u);
  if (!o.length) return PASS(u);
  const pick = o[Math.floor(rand() * o.length)];
  return { move: pick.i, target: pick.t.id };
};
/** The biggest number: the strongest ready attack on whichever enemy it damages most. */
export const turnBiggest: TurnPolicy = (s) => {
  const u = activeOf(s)!;
  const attacks = legalMoves(u).filter((i) => u.moves[i].power > 0).sort((a, b) => u.moves[b].power - u.moves[a].power);
  const i = attacks[0] ?? legalMoves(u)[0];
  if (i === undefined) return PASS(u);
  const t = legalTargets(s, u, i).sort((a, b) => attackOn(u, u.moves[i], b) - attackOn(u, u.moves[i], a))[0];
  return { move: i, target: t.id };
};
function best(s: TRun, naiveTarget: boolean): Order {
  const u = activeOf(s)!;
  let top: { i: number; t: Fighter; v: number } | null = null;
  for (const i of legalMoves(u)) {
    let ts = legalTargets(s, u, i);
    if (naiveTarget && u.moves[i].power > 0 && ts.some((t) => t.enemy))
      ts = [ts.reduce((a, b) => {
        const da = attackOn(u, u.moves[i], a), db = attackOn(u, u.moves[i], b);
        return db > da || (db === da && b.hp < a.hp) ? b : a;
      })];
    for (const t of ts) {
      const v = turnWorth(s, u, i, t);
      if (!top || v > top.v) top = { i, t, v };
    }
  }
  return top ? { move: top.i, target: top.t.id } : PASS(u);
}
/** Weighs every (move, target) in health against the board and the timeline. */
export const turnPlanner: TurnPolicy = (s) => best(s, false);
/** The same, but every attack goes to the enemy it damages most: what choosing a target is worth. */
export const turnHardestHit: TurnPolicy = (s) => best(s, true);

function position(s: TRun): number {
  if (s.phase === "lost") return -1000;
  const team = s.team.reduce((a, u) => a + Math.max(0, u.hp), 0) + 25 * s.team.filter((u) => u.hp > 0).length;
  const foes = s.phase === "turn" ? s.enemies.reduce((a, e) => a + Math.max(0, e.hp), 0) : 0;
  return team - 1.2 * foes + (s.phase === "camp" || s.phase === "won" ? 60 : 0);
}
/**
  The look-ahead: tries the planner's top options, plays each forward a number of the squad's
  turns with the planner (enemies choosing on their own turns, their rolls drawn fresh), and keeps
  the option whose position ends best.
*/
export function turnLookahead(opts: { candidates: number; turns: number; samples: number; from?: TurnPolicy } = { candidates: 4, turns: 6, samples: 2 }): TurnPolicy {
  return (s, rand) => {
    const u = activeOf(s)!;
    const seeded = (opts.from ?? turnPlanner)(s, rand);
    const ranked = options(s, u)
      .map((o) => ({ ...o, v: turnWorth(s, u, o.i, o.t) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, opts.candidates)
      .map((o) => ({ move: o.i, target: o.t.id }));
    const cands: Order[] = [seeded, ...ranked.filter((o) => o.move !== seeded.move || o.target !== seeded.target), PASS(u)];
    let top: { o: Order; v: number } | null = null;
    for (const o of cands) {
      let sum = 0;
      for (let k = 0; k < opts.samples; k++) {
        let t: TRun = { ...s, rng: (Math.floor(rand() * 4294967296) ^ s.rng) >>> 0 };
        try {
          t = turnCommand(t, { kind: "act", order: o }).state;
        } catch {
          sum = -Infinity;
          break;
        }
        for (let n = 0; n < opts.turns && t.phase === "turn"; n++) t = turnCommand(t, { kind: "act", order: turnPlanner(t, rand) }).state;
        sum += position(t);
      }
      const v = sum / opts.samples;
      if (!top || v > top.v) top = { o, v };
    }
    return top!.o;
  };
}
