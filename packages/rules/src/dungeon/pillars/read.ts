/*
  The pillars' reading of a unit (docs/design/powerworks-pillars.md, "What the schema can
  express"): every move becomes an attack power (or none), an element, and at most one of each
  support kind, each one number in health. The record keeps every field; this is only what
  Powerworks reads from it. Parked effects (lasting ticks, cleanse, concealment, displacement
  as its own effect, reveal) are not read.
*/
import type { Move, MoveEffect, Unit } from "../reading.ts";
import {
  AREA_FACTOR,
  BINDING_HINDER_FACTOR,
  DEFAULT_INTENSITY,
  DELAY_SHARE,
  DISPLACE_POWER_FACTOR,
  POWER_DIVISOR,
  PROLONGED_REST,
  REST_ROUNDS,
  SUPPORT_DIVISOR,
  type ElementSource,
} from "./levers.ts";

export type SupportKind = "heal" | "shield" | "boost" | "hinder" | "delay";
export type Aim = "enemy" | "ally" | "self";
export type Part = { kind: SupportKind; n: number; aim: Aim; all: boolean };
export type PMove = {
  key: string;
  name: string;
  signature: boolean;
  /** Rounds the move rests after use (0: every round). */
  rests: number;
  /** Damage to each target before the matchup; 0 when the move does not attack. */
  power: number;
  /** An area attack hits every standing opponent. */
  area: boolean;
  /** The attack's element; null is physical (steady, x1 against everything). */
  element: string | null;
  /** Supports and riders, at most one of each kind and aim. */
  parts: Part[];
};
export type Rules = {
  elementSource: ElementSource;
  uniformPower: boolean;
  enemyHpFactor: number;
  /** An attack that rests gains this share of power per rest round (depth pass, part 3). */
  restBonus?: number;
  /** Which rooms the run crosses: the prototype facility, or the facility with support roles (depth pass, part 2). */
  rooms?: "facility" | "roles";
  /**
    Turn-by-turn only. "round": every unit acts once per round, fastest first. "speed": a unit
    acts again after an interval of TIMELINE_SCALE / speed, so a faster unit acts more often.
  */
  timeline?: "round" | "speed";
  /** The turn-order layer: tempo statuses (slowed, sedated) and pulls push the target's next turn back by DELAY_SHARE of its interval. */
  tempo?: boolean;
};

const intensity = (e: MoveEffect) => e.intensity || DEFAULT_INTENSITY;
const HINDER_GROUPS = ["binding", "attention", "shock", "tempo", "senses"];

/** One effect as a support part, or null when the pillars do not read it. */
function part(e: MoveEffect, attacks: boolean, rules: Rules): Part | null {
  const all = e.recipient === "area";
  if (rules.tempo && e.recipient !== "self" && (e.group === "tempo" || e.support === "displace"))
    return { kind: "delay", n: Math.round(DELAY_SHARE * 100), aim: "enemy", all };
  const n = Math.floor(intensity(e) / SUPPORT_DIVISOR);
  // A restore that requires the move's harm is a drain: it lands on the user.
  const onUser = e.recipient === "self" || (!!e.requires && attacks);
  const help = (kind: SupportKind): Part => ({ kind, n, aim: onUser ? "self" : "ally", all });
  if (e.support === "restore" || e.group === "mending") return help("heal");
  if (e.status === "stimulated" || e.status === "focused") return help("boost");
  if (e.support === "protect" || e.group === "guarding") return help("shield");
  if (e.support === "bind" || HINDER_GROUPS.includes(e.group ?? "")) {
    if (e.recipient === "self") return null;
    const strong = e.support === "bind" || e.group === "binding";
    return { kind: "hinder", n: Math.floor(n * (strong ? BINDING_HINDER_FACTOR : 1)), aim: "enemy", all };
  }
  return null;
}

/** The raw attack power of a move before the area share: its damaging effects summed. */
function rawPower(m: Move): number {
  return m.effects.reduce((sum, e) => {
    if (e.support === "harm") return sum + e.intensity / POWER_DIVISOR;
    if (e.support === "displace") return sum + (e.intensity / POWER_DIVISOR) * DISPLACE_POWER_FACTOR;
    return sum;
  }, 0);
}

export function readMove(u: Unit, m: Move, rules: Rules, uniform?: number): PMove {
  const raw = rawPower(m);
  const attacks = raw > 0;
  const area = attacks && m.effects.some((e) => (e.support === "harm" || e.support === "displace") && e.recipient === "area");
  const base = uniform !== undefined && attacks ? uniform : raw;
  const power = attacks ? Math.max(1, Math.floor(base * (area ? AREA_FACTOR : 1))) : 0;
  const elemental = m.effects.some((e) => e.support === "harm" && e.mechanism === "elemental");
  const element = !attacks
    ? null
    : rules.elementSource === "creature"
    ? u.element
    : m.element ?? (elemental ? u.element : null);
  const parts: Part[] = [];
  for (const e of m.effects) {
    const p = part(e, attacks, rules);
    if (!p || p.n <= 0) continue;
    const same = parts.find((q) => q.kind === p.kind && q.aim === p.aim);
    if (same) same.n = Math.max(same.n, p.n);
    else parts.push(p);
  }
  const rests = Math.max(REST_ROUNDS[m.recovery], m.preparation === "prolonged" ? PROLONGED_REST : 0);
  const rested = attacks && rules.restBonus ? Math.floor(power * (1 + rules.restBonus * rests)) : power;
  return { key: m.key, name: m.name, signature: m.signature, rests, power: rested, area, element, parts };
}

/** Every move of a unit; under uniform power each attack deals the creature's one number. */
export function readMoves(u: Unit, rules: Rules): PMove[] {
  const raws = u.moves.map(rawPower).filter((p) => p > 0);
  const uniform = rules.uniformPower && raws.length ? raws.reduce((a, b) => a + b, 0) / raws.length : undefined;
  return u.moves.map((m) => readMove(u, m, rules, uniform));
}
