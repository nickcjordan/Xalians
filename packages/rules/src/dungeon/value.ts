/*
  What a move is worth right now, in health (move value pass, 2026-09-26). The play screen
  compares moves in one currency: the HP a move takes from the machines, the HP it keeps for
  the squad, and the HP it restores. All are read from the same previews the resolver uses,
  so the numbers the wheel draws cannot disagree with what the round does. Presentation
  only: nothing here changes a rule, and the sim keeps its own policies.

  Hidden information stays hidden: a machine's threat is its most dangerous legal move, not
  the order it has actually chosen, and its target is the expectation over the companions it
  may select, weighted the way it picks them (TARGET_SIZE_WEIGHT).

  Readout pass (2026-09-26, Nick: "is that effectiveness for all enemies or one?"): a value
  names its target, says why when it is zero, and is read against the machines' health after
  the squad's other standing orders (projectOrders), so a blow on a machine the others already
  finish is worth nothing.
*/
import {
  areaReach,
  damagePreview,
  guardedThreat,
  initiative,
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
  type Order,
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

type Sides = Pick<Run, "team" | "enemies">;

export type Threat = {
  /** The HP the machine's most dangerous legal move is expected to take from one companion. */
  amount: number;
  /** That move's index on the machine, or null when it has none. */
  move: number | null;
  /** A closing move (binding stops it) or a non-contact one (blinding halves it). */
  closing: boolean;
  ranged: boolean;
  /** The machine loses its next opportunity to a status it already carries: its amount is 0. */
  held?: string;
};

const NONE: Threat = { amount: 0, move: null, closing: false, ranged: false };

/** A status that costs its carrier its next opportunity outright (stunned, entranced). */
export const losesTurn = (u: Unit) =>
  u.conditions.find((c) => c.group === "shock" || c.status === "entranced");

/** One machine move's expected blow: its preview on each companion it may pick, weighted the way it picks. */
export function blowOf(s: Sides, machine: Unit, index: number): number {
  const foes = selectableTargets(s.team.filter((u) => u.hp > 0));
  if (!foes.length || machine.hp <= 0) return 0;
  const weights = foes.map((f) => (TARGET_SIZE_WEIGHT ? Math.pow(f.max, TARGET_SIZE_WEIGHT) : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const m = moveAt(machine, index);
  return foes.reduce((sum, f, k) => sum + weights[k] * Math.min(f.hp, damagePreview(machine, m, f)), 0) / total;
}

/** The machine's next blow, as the squad can read it: its most dangerous legal move, averaged over whom it may pick. */
export function machineThreat(s: Sides, machine: Unit): Threat {
  if (machine.hp <= 0) return NONE;
  const moves = machine.charge !== null ? [machine.chargeMove] : legalMoves(machine);
  let best = NONE;
  for (const i of moves) {
    if (i < 0) continue;
    const amount = blowOf(s, machine, i);
    const m = moveAt(machine, i);
    if (amount > best.amount)
      best = { amount, move: i, closing: m.approach === "closing", ranged: m.range !== "contact" };
  }
  const lost = losesTurn(machine);
  return lost ? { ...best, amount: 0, held: lost.status } : best;
}

/**
  Why a move is worth nothing on a target, for the empty bar's reason (readout pass). The
  interface words it with the target's own label.
    falls: the squad's other orders already knock the target out;
    immune: nothing the move carries lands on it;
    harmless: its status would not weaken this machine's next blow (`status` names it);
    held: the machine already loses its next opportunity, so there is no blow to stop;
    needless: the squadmate needs nothing the move gives (full health, nothing to clear or guard);
    turn: its status changes when the machine acts or whom it aims at, not how hard it hits.
*/
export type Idle = {
  kind: "falls" | "immune" | "harmless" | "held" | "needless" | "turn";
  status?: string;
};

export type MoveValue = {
  /** HP taken from the machines by this use of the move: its target, its area, and any degrading ticks it leaves. */
  harm: number;
  /** HP kept for the squad: a machine's blows prevented (a knockout stops its next one), a squadmate guarded, ticks cleared. */
  saved: number;
  /** HP restored to a squadmate: a heal, and the ticks of a mending status. */
  healed: number;
  /** The part of `saved` that stops the target machine's own blow (a knockout, a status, a broken charge). */
  stops: number;
  /** This use knocks its target out (after the squad's other orders, when the run passed in is projected). */
  knockout: boolean;
  /** The target this use names. */
  target: string | null;
  /** Why the use is worth nothing; absent when it is worth something. */
  why?: Idle;
};

const chance = (e: MoveEffect) => LIKELIHOOD_PERCENT[e.likelihood] / 100;
/** How many of the victim's opportunities a status holds; a sustained one (0) is counted as two. */
const lasting = (e: MoveEffect) => (e.opportunities && e.opportunities > 0 ? e.opportunities : 2);
/** The same unit carrying one more condition, for "what if it lands" readings. */
const carrying = (u: Unit, status: string, group: Unit["conditions"][number]["group"]): Unit => ({
  ...u,
  conditions: [...u.conditions, { status, group, intensity: 0, remaining: 1, source: "preview", removable: [] }],
});

export const total = (v: Pick<MoveValue, "harm" | "saved" | "healed">) => v.harm + v.saved + v.healed;

/** What a helpful effect gives the squadmate (or the user) it lands on, in HP kept and restored. */
function help(s: Run, u: Unit, e: MoveEffect, t: Unit): { saved: number; healed: number } | null {
  if (e.support === "restore") return { saved: 0, healed: Math.min(t.max - t.hp, restorePreview(u, e)) };
  if (e.support === "protect" || (e.support === "status" && e.group === "guarding"))
    return { saved: guardedThreat(s, t, e) * (1 - WARD_FACTOR), healed: 0 };
  if (e.support === "status" && e.group === "mending")
    return {
      saved: 0,
      healed: Math.min(
        t.max - t.hp,
        tickAmount({ status: e.status ?? "mending", group: "mending", intensity: e.intensity, remaining: 1, source: u.id, removable: [] }, t) * lasting(e)
      ),
    };
  if (e.support === "remove" && e.methods?.length) {
    // Clearing a degrading status keeps the ticks it had left for the squad.
    const cleared = t.conditions.filter(
      (c) => c.remaining !== Infinity && c.group === "degrading" && c.removable.some((r) => e.methods!.includes(r))
    );
    return { saved: cleared.reduce((n, c) => n + Math.min(t.hp, tickAmount(c, t) * c.remaining), 0), healed: 0 };
  }
  return null;
}

/** A move whose every effect lands on its user (a guard on itself): its order's target is only nominal. */
const onItself = (m: Move) => m.effects.length > 0 && m.effects.every((e) => e.recipient === "self");

/** What one use of the move on one target is worth, in HP taken, kept and restored. */
export function valueOn(s: Run, u: Unit, index: number, aimed: Unit): MoveValue {
  const m: Move = moveAt(u, index);
  const t = onItself(m) ? u : aimed;
  const mate = squadmateOf(u, t) || t.id === u.id;
  let harm = 0,
    saved = 0,
    healed = 0,
    knockout = false;
  const idle: Idle[] = [];
  let stops = 0;
  // What the move does for its user on the way (a strike that also guards it).
  if (t.id !== u.id)
    for (const e of m.effects)
      if (e.recipient === "self") {
        const got = help(s, u, e, u);
        if (!got) continue;
        saved += got.saved;
        healed += got.healed;
      }
  if (!mate) {
    if (t.hp <= 0)
      return { harm: 0, saved: 0, healed: 0, stops: 0, knockout: false, target: t.id, why: { kind: "falls" } };
    const kept = saved;
    const hit = damagePreview(u, m, t);
    harm += Math.min(t.hp, hit);
    knockout = hit > 0 && hit >= t.hp;
    for (const r of areaReach(s, u, m, t))
      if (r.enemy !== u.enemy) harm += Math.min(r.hp, damagePreview(u, m, r, "area"));
    const threat = machineThreat(s, t);
    // A machine that falls strikes no more: its next blow is kept for the squad.
    if (knockout) saved += threat.amount;
    let carried = false;
    for (const e of m.effects) {
      if ((e.support !== "status" && e.support !== "bind" && e.support !== "displace") || e.recipient === "self") continue;
      if (e.support === "displace") {
        // A pull breaks a charge: the release it was building never lands.
        if (t.charge !== null && protectionDegree(t, { kind: "displace" }) !== "immune") saved += threat.amount;
        continue;
      }
      const status = e.status ?? "condition";
      if (protectionDegree(t, { kind: "status", status }) === "immune") continue;
      carried = true;
      if (knockout) continue;
      const p = chance(e),
        turns = lasting(e);
      if (threat.held && e.group !== "degrading") {
        idle.push({ kind: "held", status: threat.held });
        continue;
      }
      if (e.group === "binding") {
        if (threat.closing || t.charge !== null) saved += p * threat.amount * turns;
        else idle.push({ kind: "harmless", status });
      } else if (e.group === "shock" || status === "entranced") saved += p * threat.amount * turns;
      else if (status === "frightened") saved += p * threat.amount * (1 - FRIGHTENED_OUTPUT_FACTOR) * turns;
      else if (status === "blinded") {
        if (threat.ranged) saved += p * threat.amount * (1 - BLINDED_RANGED_FACTOR) * turns;
        else idle.push({ kind: "harmless", status });
      } else if (status === "slowed") {
        // Slowed halves its speed: a quicker companion then keeps more of its blow off
        // (pass 9's nimble rule). The rest of what it does is to the turn order.
        const slower = machineThreat(s, carrying(t, "slowed", e.group ?? "tempo")).amount;
        const spared = p * Math.max(0, threat.amount - slower) * turns;
        saved += spared;
        if (spared < 0.5) idle.push({ kind: "turn", status });
      } else if (e.group === "degrading") {
        const tick = tickAmount(
          { status, group: "degrading", intensity: e.intensity, remaining: 1, source: u.id, removable: [], ...(e.statusElement ? { element: e.statusElement } : {}) },
          t
        );
        harm += p * Math.min(Math.max(0, t.hp - harm), tick * turns);
      } else idle.push({ kind: "turn", status });
    }
    if (!hit && !carried && !m.effects.some((e) => e.support === "displace")) idle.unshift({ kind: "immune" });
    stops = saved - kept;
  } else {
    for (const e of m.effects) {
      if (e.recipient === "self" && t.id !== u.id) continue;
      const got = help(s, u, e, t);
      if (!got) continue;
      saved += got.saved;
      healed += got.healed;
      if (got.saved + got.healed <= 0) idle.push({ kind: "needless" });
    }
  }
  const v = {
    harm: Math.round(harm),
    saved: Math.round(saved),
    healed: Math.round(healed),
    stops: Math.round(stops),
    knockout,
    target: t.id,
  };
  return total(v) > 0 ? v : { ...v, why: idle[0] ?? { kind: mate ? "needless" : "immune" } };
}

/** The move's best use this round: the legal target where it takes, keeps and restores the most HP together. */
export function moveValue(s: Run, u: Unit, index: number): MoveValue {
  let best: MoveValue | null = null;
  const score = (v: MoveValue) => total(v) + (v.knockout ? 0.5 : 0);
  for (const t of legalTargets(s, u, index)) {
    const v = valueOn(s, u, index, t);
    if (!best || score(v) > score(best)) best = v;
  }
  return best ?? { harm: 0, saved: 0, healed: 0, stops: 0, knockout: false, target: null, why: { kind: "immune" } };
}

/** The health a unit's degrading statuses take at the start of its next opportunity. */
export function ticksDue(u: Unit): number {
  if (u.hp <= 0) return 0;
  return Math.min(
    u.hp,
    u.conditions.filter((c) => c.group === "degrading").reduce((n, c) => n + tickAmount(c, u), 0)
  );
}

/**
  The machines' health after their own degrading ticks and the squad's standing orders land (readout pass), each as its
  preview reads, in the public turn order: the direct hit and its area, never a charge that
  only begins this round. `dealt` is the health each companion's order takes, after the
  orders before it, so an order whose target the others already finish reads 0. The squad's
  own losses before it acts are not modelled: a plan is read as if every order lands.
*/
export function projectOrders(
  s: Run,
  orders: Record<string, Order>
): {
  hp: Record<string, number>;
  dealt: Record<string, number>;
  before: Record<string, Record<string, number>>;
} {
  const hp: Record<string, number> = Object.fromEntries(
    s.enemies.map((e) => [e.id, Math.max(0, e.hp - ticksDue(e))])
  );
  const dealt: Record<string, number> = {};
  const before: Record<string, Record<string, number>> = {};
  const standing = { team: s.team, enemies: s.enemies };
  for (const u of initiative(s.team, s.enemies, s.round, orders)) {
    const q = orders[u.id];
    if (u.enemy || !q || q.move < -1 || u.hp <= 0) continue;
    const m = moveAt(u, q.move);
    before[u.id] = { ...hp };
    // A charge begun this round lands at the unit's next opportunity, not this round.
    if (m.preparation === "prolonged" && u.charge === null) {
      dealt[u.id] = 0;
      continue;
    }
    const t = s.enemies.find((e) => e.id === q.target);
    let taken = 0;
    if (t && hp[t.id] > 0) {
      const hit = Math.min(hp[t.id], damagePreview(u, m, t));
      hp[t.id] -= hit;
      taken += hit;
      for (const r of areaReach(standing, u, m, t))
        if (r.enemy && hp[r.id] > 0) {
          const splash = Math.min(hp[r.id], damagePreview(u, m, r, "area"));
          hp[r.id] -= splash;
          taken += splash;
        }
    }
    dealt[u.id] = taken;
  }
  return { hp, dealt, before };
}

/** The run as it would stand after projected damage: the machines at their projected health. */
export const atHealth = (s: Run, hp: Record<string, number>): Run => ({
  ...s,
  enemies: s.enemies.map((e) => (e.id in hp && hp[e.id] !== e.hp ? { ...e, hp: hp[e.id] } : e)),
});
