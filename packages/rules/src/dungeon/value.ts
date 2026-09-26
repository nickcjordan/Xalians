/*
  What a move is worth right now, in health (move value pass, 2026-09-26). The play screen
  compares moves in one currency: the HP a move takes from the machines, and the HP it keeps
  for the squad. Both are read from the same previews the resolver uses, so the numbers the
  wheel draws cannot disagree with what the round does. Presentation only: nothing here
  changes a rule, and the sim keeps its own policies.

  Hidden information stays hidden: a machine's threat is its most dangerous legal move, not
  the order it has actually chosen, and its target is the expectation over the companions it
  may select, weighted the way it picks them (TARGET_SIZE_WEIGHT).
*/
import {
  areaReach,
  damagePreview,
  guardedThreat,
  legalMoves,
  legalTargets,
  moveAt,
  protectionDegree,
  restorePreview,
  selectableTargets,
  squadmateOf,
  tickAmount,
  type Move,
  type MoveEffect,
  type Run,
  type Unit,
} from "./index.ts";
import {
  BLINDED_RANGED_FACTOR,
  FRIGHTENED_OUTPUT_FACTOR,
  LIKELIHOOD_PERCENT,
  TARGET_SIZE_WEIGHT,
  WARD_FACTOR,
} from "./levers.ts";

export type Threat = {
  /** The HP the machine's most dangerous legal move is expected to take from one companion. */
  amount: number;
  /** That move's index on the machine, or null when it has none. */
  move: number | null;
  /** A closing move (binding stops it) or a non-contact one (blinding halves it). */
  closing: boolean;
  ranged: boolean;
};

const NONE: Threat = { amount: 0, move: null, closing: false, ranged: false };

/** The machine's next blow, as the squad can read it: its most dangerous legal move, averaged over whom it may pick. */
export function machineThreat(s: Pick<Run, "team" | "enemies">, machine: Unit): Threat {
  if (machine.hp <= 0) return NONE;
  const foes = selectableTargets(s.team.filter((u) => u.hp > 0));
  if (!foes.length) return NONE;
  const weights = foes.map((f) => (TARGET_SIZE_WEIGHT ? Math.pow(f.max, TARGET_SIZE_WEIGHT) : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const moves = machine.charge !== null ? [machine.chargeMove] : legalMoves(machine);
  let best = NONE;
  for (const i of moves) {
    if (i < 0) continue;
    const m = moveAt(machine, i);
    const amount =
      foes.reduce((sum, f, k) => sum + weights[k] * Math.min(f.hp, damagePreview(machine, m, f)), 0) / total;
    if (amount > best.amount)
      best = { amount, move: i, closing: m.approach === "closing", ranged: m.range !== "contact" };
  }
  return best;
}

export type MoveValue = {
  /** HP taken from the machines by the best use of the move: its target, its area, and any degrading ticks it leaves. */
  harm: number;
  /** HP kept for the squad: a machine's blows prevented (a knockout stops its next one), a squadmate guarded or healed. */
  saved: number;
  /** The best use knocks its target out. */
  knockout: boolean;
  /** The target that best use names. */
  target: string | null;
};

const chance = (e: MoveEffect) => LIKELIHOOD_PERCENT[e.likelihood] / 100;
/** How many of the victim's opportunities a status holds; a sustained one (0) is counted as two. */
const lasting = (e: MoveEffect) => (e.opportunities && e.opportunities > 0 ? e.opportunities : 2);

/** What one use of the move on one target is worth, in HP taken and HP kept. */
export function valueOn(s: Run, u: Unit, index: number, t: Unit): MoveValue {
  const m: Move = moveAt(u, index);
  const mate = squadmateOf(u, t) || t.id === u.id;
  let harm = 0,
    saved = 0,
    knockout = false;
  if (!mate) {
    const hit = damagePreview(u, m, t);
    harm += Math.min(t.hp, hit);
    knockout = hit > 0 && hit >= t.hp;
    for (const r of areaReach(s, u, m, t))
      if (r.enemy !== u.enemy) harm += Math.min(r.hp, damagePreview(u, m, r, "area"));
    const threat = machineThreat(s, t);
    // A machine that falls strikes no more: its next blow is kept for the squad.
    if (knockout) saved += threat.amount;
    for (const e of m.effects) {
      if ((e.support !== "status" && e.support !== "bind" && e.support !== "displace") || e.recipient === "self") continue;
      if (e.support === "displace") {
        // A pull breaks a charge: the release it was building never lands.
        if (t.charge !== null && protectionDegree(t, { kind: "displace" }) !== "immune") saved += threat.amount;
        continue;
      }
      const status = e.status ?? "condition";
      if (protectionDegree(t, { kind: "status", status }) === "immune") continue;
      const p = chance(e),
        turns = knockout ? 0 : lasting(e);
      if (e.group === "binding") saved += threat.closing || t.charge !== null ? p * threat.amount * turns : 0;
      else if (e.group === "shock" || status === "entranced") saved += p * threat.amount * turns;
      else if (status === "frightened") saved += p * threat.amount * (1 - FRIGHTENED_OUTPUT_FACTOR) * turns;
      else if (status === "blinded") saved += threat.ranged ? p * threat.amount * (1 - BLINDED_RANGED_FACTOR) * turns : 0;
      else if (e.group === "degrading" && !knockout) {
        const tick = tickAmount(
          { status, group: "degrading", intensity: e.intensity, remaining: 1, source: u.id, removable: [], ...(e.statusElement ? { element: e.statusElement } : {}) },
          t
        );
        harm += p * Math.min(Math.max(0, t.hp - harm), tick * turns);
      }
    }
  } else {
    for (const e of m.effects) {
      if (e.recipient === "self" && t.id !== u.id) continue;
      if (e.support === "restore") saved += Math.min(t.max - t.hp, restorePreview(u, e));
      else if (e.support === "protect" || (e.support === "status" && e.group === "guarding"))
        saved += guardedThreat(s, t, e) * (1 - WARD_FACTOR);
      else if (e.support === "status" && e.group === "mending")
        saved += Math.min(t.max - t.hp, tickAmount({ status: e.status ?? "mending", group: "mending", intensity: e.intensity, remaining: 1, source: u.id, removable: [] }, t) * lasting(e));
    }
  }
  return { harm: Math.round(harm), saved: Math.round(saved), knockout, target: t.id };
}

/** The move's best use this round: the legal target where it takes and keeps the most HP together. */
export function moveValue(s: Run, u: Unit, index: number): MoveValue {
  let best: MoveValue = { harm: 0, saved: 0, knockout: false, target: null };
  for (const t of legalTargets(s, u, index)) {
    const v = valueOn(s, u, index, t);
    const score = v.harm + v.saved + (v.knockout ? 0.5 : 0);
    const bestScore = best.harm + best.saved + (best.knockout ? 0.5 : 0);
    if (score > bestScore) best = v;
  }
  return best;
}
