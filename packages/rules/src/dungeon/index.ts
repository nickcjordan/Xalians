// Isolated Powerworks prototype. No collection mutations or real reward grants.
// Rules per docs/design/powerworks-v5-mechanics.md. Every constant is in levers.ts;
// every record read is in reading.ts. This file is the one resolver for both sides.
import cards from "./cards.json";
import effectiveness from "@xalians/content/typeEffectivenessMatrix.json";
import { DEFAULT_STATUS_INTENSITY } from "@xalians/content/creature";
import {
  generateXalian,
  getSpeciesTemplates,
} from "../generator/canonicalCreatureRelease.ts";
import type { CreatureRecord } from "@xalians/content/creature";
import {
  LAST_RESORT,
  beneficial,
  contactDelivery,
  damaging,
  harmAttribute,
  readCard,
  readCompanion,
  usable,
  type Card,
  type Condition,
  type Move,
  type MoveEffect,
  type Passive,
  type RemovalMethod,
  type StatusGroup,
  type Trigger,
  type Unit,
} from "./reading.ts";
import {
  AREA_HARM_FACTOR,
  BLINDED_RANGED_FACTOR,
  SLOWED_SPEED_FACTOR,
  DEGRADE_FACTOR,
  ENTRANCE_IMMUNITY_OPPORTUNITIES,
  FOCUS_STATUS,
  FRIGHTENED_OUTPUT_FACTOR,
  MEND_FACTOR,
  REINFORCED_FACTOR,
  SHIELDED_FACTOR,
  CHARGE_RECOVERY_OPPORTUNITIES,
  INTERRUPTED_CHARGE_RECOVERY_OPPORTUNITIES,
  COMPANION_GENERATED_AT,
  COMPANION_SEEDS,
  COOLDOWN_ROUNDS,
  DESPERATE_STRIKE_DAMAGE,
  DESPERATE_STRIKE_RECOIL,
  DISPLACE_HARM_FACTOR,
  ENCOUNTER_XP,
  FINAL_ENCOUNTER_XP,
  HARM_ATTR_DIVISOR,
  HARM_BASE,
  HARM_DIVISOR,
  IMMEDIATE_INITIATIVE_BONUS,
  LIKELIHOOD_PERCENT,
  RECOVERY_STATION_HP,
  RESTORE_DIVISOR,
  SAVE_HISTORY_LIMIT,
  SAVE_VERSION,
  REACTIONS_PER_TRIGGERING_MOVE,
  REACTION_DEPTH,
  SIGNATURE_ONCE_PER_ENCOUNTER,
  WARD_FACTOR,
} from "./levers.ts";

export type {
  Approach,
  Area,
  Condition,
  Move,
  MoveEffect,
  Passive,
  Range,
  RemovalMethod,
  StatusGroup,
  Support,
  Trigger,
  Unit,
} from "./reading.ts";
export {
  LAST_RESORT,
  beneficial,
  contactDelivery,
  ongoingConditions,
  reachesOwnSide,
  readCompanion,
  selfBurst,
  usable,
  damaging,
  statusGroup,
  statusOpportunities,
} from "./reading.ts";
export {
  AREA_HARM_FACTOR,
  BLINDED_RANGED_FACTOR,
  COOLDOWN_ROUNDS,
  DEGRADE_FACTOR,
  DESPERATE_STRIKE_RECOIL,
  FRIGHTENED_OUTPUT_FACTOR,
  LIKELIHOOD_PERCENT,
  MEND_FACTOR,
  REINFORCED_FACTOR,
  SAVE_VERSION,
  SHIELDED_FACTOR,
  SLOWED_SPEED_FACTOR,
} from "./levers.ts";

export type Order = { move: number; target: string };
export type Phase = "planning" | "camp" | "won" | "lost" | "retreated";
export type Run = {
  seed: number;
  rng: number;
  room: number;
  round: number;
  team: Unit[];
  enemies: Unit[];
  orders: Record<string, Order>;
  phase: Phase;
  revival: number;
  xp: number;
  log: string[];
};
export type BattleEvent = {
  kind:
    | "round"
    | "hit"
    | "bind"
    | "missed"
    | "displace"
    | "ward"
    | "restore"
    | "charge"
    | "blocked"
    | "redirect"
    | "status"
    | "resisted"
    | "tick"
    | "expired"
    | "removed"
    | "lost"
    | "hidden"
    | "react"
    | "stumble"
    | "withheld"
    | "broken"
    | "result";
  /** status / tick / expired / removed events: which condition. */
  status?: string;
  group?: StatusGroup;
  remaining?: number;
  /** hit events only: this recipient was reached by the move's area, not selected (contract decision 33). */
  area?: true;
  /**
    withheld events only: why an effect did not resolve. "foe" is a beneficial effect that
    would have reached an opposing unit (contract decision 35); "requires" is a dependent
    effect whose prerequisite did not succeed (contract decision 34).
  */
  reason?: "foe" | "requires";
  /** withheld events only: the effect that did not resolve, as a status name or an effect type. */
  effect?: string;
  actorId?: string;
  targetId?: string;
  amount?: number;
  moveName?: string;
};
export type Frame = {
  team: Unit[];
  enemies: Unit[];
  text: string;
  event?: BattleEvent;
};
export type Command =
  | { kind: "round"; orders: Record<string, Order> }
  | { kind: "advance" }
  | { kind: "revive"; id: string }
  | { kind: "retreat" };
export const ROOMS = cards.rooms;
export const COMPANION_KEYS = ["graviclaw", "avilily", "crystorn", "hippochamp"] as const;
const COMPANION_IDS = ["G", "A", "C", "H"] as const;

// The four companions are generated once, at module load, from fixed seeds of the
// frozen release, so every run reads the same records and a save replays.
const templates = getSpeciesTemplates();
export const COMPANION_RECORDS: Readonly<Record<string, CreatureRecord>> =
  Object.freeze(
    Object.fromEntries(
      COMPANION_KEYS.map((key) => {
        const species = templates.find((t) => t.key === key);
        if (!species) throw new Error(`Unknown companion species ${key}`);
        return [
          key,
          generateXalian(key, COMPANION_SEEDS[key], {
            origin: species.homePlanet,
            serial: 1,
            profile: "full",
            generatedAt: COMPANION_GENERATED_AT,
          }),
        ];
      })
    )
  );

const names: Record<string, string> = {
  crawler: "Maintenance crawler",
  drone: "Security drone",
  shield: "Shield unit",
  discharge: "Discharge unit",
  guardian: "Central guardian",
};
const clone = <T>(value: T): T => structuredClone(value);
const standing = (units: Unit[]) => units.filter((u) => u.hp > 0);
function random(s: Run) {
  s.rng = (Math.imul(1664525, s.rng) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
const prolonged = (m: Move) => m.preparation === "prolonged";

// Public initiative. Without orders it is the speed order the table shows; with them,
// immediate preparation earns its bonus. It never reads or exposes committed enemy orders.
export function initiative(
  team: Unit[],
  enemies: Unit[],
  round: number,
  orders?: Record<string, Order>
): Unit[] {
  const all = [...team, ...enemies].filter((u) => u.hp > 0);
  const tie = [...all].sort((a, b) => a.id.localeCompare(b.id));
  const shift = (round - 1) % (tie.length || 1);
  const priority = [...tie.slice(shift), ...tie.slice(0, shift)];
  const pace = (u: Unit) => {
    const q = orders?.[u.id];
    const m = q && q.move >= -1 ? moveAt(u, q.move) : null;
    return (
      effectiveSpeed(u) +
      (m && m.preparation === "immediate" ? IMMEDIATE_INITIATIVE_BONUS : 0)
    );
  };
  // Sedated units act after every unsedated one (contract decision 29), then speed.
  const late = (u: Unit) => (sedated(u) ? 1 : 0);
  return [...all].sort(
    (a, b) =>
      late(a) - late(b) ||
      pace(b) - pace(a) ||
      priority.indexOf(a) - priority.indexOf(b)
  );
}
/** Speed as initiative reads it: a slowed unit moves at SLOWED_SPEED_FACTOR through its duration (contract decision 28). */
export function effectiveSpeed(u: Unit): number {
  return u.conditions.some((c) => c.status === "slowed")
    ? Math.floor(u.speed * SLOWED_SPEED_FACTOR)
    : u.speed;
}
/** A sedated unit acts after every unsedated one and its passives do not react (contract decision 29). */
export const sedated = (u: Unit) =>
  u.conditions.some((c) => c.status === "sedated");
function enemyUnit(species: string, id: string, hp?: number): Unit {
  const card = cards.templates[species as keyof typeof cards.templates] as Card;
  return readCard(card, species, id, names[species] ?? species, hp);
}
export function moveAt(u: Unit, i: number): Move {
  return i === -1 ? LAST_RESORT : u.moves[i];
}
/*
  Legality per opportunity (contract): not on cooldown; usable; not (bound and closing);
  not (recovering and prolonged); signature not spent. While charging, the only legal
  move is the release. Desperate strike is the exhaustion-only option: it appears when
  nothing damaging is legal and the unit is not bound (it is a closing move).
*/
export function legalMoves(u: Unit): number[] {
  if (u.hp <= 0) return [];
  if (u.charge !== null) return [u.chargeMove];
  const moves = u.moves
    .map((_, i) => i)
    .filter((i) => {
      const m = u.moves[i];
      return (
        u.cooldowns[i] === 0 &&
        usable(m) &&
        !(SIGNATURE_ONCE_PER_ENCOUNTER && m.signature && u.signatureSpent) &&
        !(u.bound && m.approach === "closing") &&
        !(u.recovery && prolonged(m))
      );
    });
  if (!u.enemy && !u.bound && !moves.some((i) => damaging(u.moves[i])))
    moves.push(-1);
  return moves;
}
/*
  The status layer (contract decisions 10 to 18). Conditions live on the unit;
  every rule below reads them and nothing else invents state.
*/
export const conditionsIn = (u: Unit, group: StatusGroup) =>
  u.conditions.filter((c) => c.group === group);
const has = (u: Unit, status: string) =>
  u.conditions.some((c) => c.status === status);

/** The guarding factor on incoming harm: the better of ward and shielded (they do not multiply), then reinforced. */
export function guardFactor(target: Unit): number {
  const shielded = has(target, "shielded") ? SHIELDED_FACTOR : 1;
  const ward = target.ward ? WARD_FACTOR : 1;
  const barrier = Math.min(shielded, ward);
  const reinforced = has(target, "reinforced") ? REINFORCED_FACTOR : 1;
  return barrier * reinforced;
}
/**
  Does any protection descriptor on this unit cover the thing being done to it?
  `immune` blocks it outright; `resistant` is reported but does not block, so the
  harm curve stays the one number the cards show (this game reads resistance through
  the guarding factor, and a resistant descriptor adds the reinforced quarter).
*/
type Scope =
  | { kind: "status"; status: string }
  | { kind: "harm"; mechanism: string; element?: string }
  | { kind: "displace" };
export function protectionDegree(
  u: Unit,
  scope: Scope
): "immune" | "resistant" | null {
  let best: "immune" | "resistant" | null = null;
  for (const c of u.conditions) {
    const p = c.protection;
    if (!p) continue;
    const matches =
      p.type === "displace"
        ? scope.kind === "displace"
        : p.type === "status"
        ? scope.kind === "status" && p.status === scope.status
        : scope.kind === "harm" &&
          p.mechanism === scope.mechanism &&
          (p.mechanism !== "elemental" || p.element === scope.element);
    if (!matches) continue;
    // The strongest active degree for one scope applies; degrees never add.
    if (p.degree === "immune") return "immune";
    best = "resistant";
  }
  return best;
}
/** The harm scope of one effect, for a protection descriptor to match against. */
export function harmScope(e: MoveEffect, element: string): Scope {
  if (e.support === "displace") return { kind: "displace" };
  const mechanism = e.mechanism ?? "impact";
  return mechanism === "elemental"
    ? { kind: "harm", mechanism, element }
    : { kind: "harm", mechanism };
}
/** frightened halves what the unit's harm does, through its next opportunity (contract decision 15). */
export const outputFactor = (u: Unit) =>
  has(u, "frightened") ? FRIGHTENED_OUTPUT_FACTOR : 1;
/** A concealed unit is not selectable while another legal target stands (contract decision 16). */
export const concealed = (u: Unit) => has(u, "concealed");
export function selectableTargets(units: Unit[]): Unit[] {
  const alive = units.filter((u) => u.hp > 0);
  const open = alive.filter((u) => !concealed(u));
  return open.length ? open : alive;
}

/** Matchup by the move's element classification when it has one, else the attacker's element, against the target's element. */
export function matchup(attacker: Unit, target: Unit, move?: Move): number {
  if (move?.fallback) return 1;
  const key = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return (effectiveness as Record<string, Record<string, number>>)[
    key(move?.element ?? attacker.element)
  ][key(target.element)];
}
/**
  Unscaled harm of one effect: intensity/10 * (0.5 + attr/100); displace at its lever
  share; an area effect at AREA_HARM_FACTOR for every recipient, the selected target
  included (contract decision 33).
*/
function rawHarm(u: Unit, e: MoveEffect): number {
  if (e.support !== "harm" && e.support !== "displace") return 0;
  const attr = u.attrs[harmAttribute(e.mechanism ?? "impact")];
  const intensity =
    (e.support === "displace" ? e.intensity * DISPLACE_HARM_FACTOR : e.intensity) *
    (e.recipient === "area" ? AREA_HARM_FACTOR : 1);
  return (intensity / HARM_DIVISOR) * (HARM_BASE + attr / HARM_ATTR_DIVISOR);
}
/** Which recipient a unit is for one move: the selected target, or a unit only its area reaches. */
export type Reach = "target" | "area";
/** Does this effect land on a unit reached this way? The target receives target and area effects; an area recipient only area effects. */
const reaches = (e: MoveEffect, reach: Reach) =>
  e.recipient === "area" || (reach === "target" && e.recipient === "target");
/** blinded halves the unit's non-contact harm (contract decision 30); contact harm is unaffected. */
export const sensesFactor = (u: Unit, move: Move) =>
  !move.fallback && move.range !== "contact" && has(u, "blinded")
    ? BLINDED_RANGED_FACTOR
    : 1;
/** Attribute-scaled harm before matchup and ward: the number a move card shows. */
export function basePower(u: Unit, move: Move): number {
  return Math.floor(
    move.fallback
      ? DESPERATE_STRIKE_DAMAGE
      : move.effects.reduce((sum, e) => sum + rawHarm(u, e), 0)
  );
}
/*
  Damage as the table shows it and as the resolver deals it, one function so the
  preview cannot disagree with the outcome. Per effect: the harm curve, then the
  target's protection descriptors (immune blocks that effect outright, resistant
  takes the reinforced quarter off it). Then, once: the element matchup, the
  attacker's own output factors (frightened, blinded on a non-contact move), and the
  target's guarding factor (the better of ward and shielded, times reinforced).

  `reach` says how the unit is reached: "target" (the default, the selected target) takes
  every harm effect, "area" (a unit the move's area caught) only the area ones
  (contract decision 33).
*/
export function damagePreview(
  u: Unit,
  move: Move,
  target: Unit,
  reach: Reach = "target"
): number {
  const element = move.element ?? u.element;
  const base = move.fallback
    ? DESPERATE_STRIKE_DAMAGE
    : move.effects.reduce((sum, e) => {
        if (!reaches(e, reach)) return sum;
        const raw = rawHarm(u, e);
        if (!raw) return sum;
        const degree = protectionDegree(target, harmScope(e, element));
        if (degree === "immune") return sum;
        return sum + raw * (degree === "resistant" ? REINFORCED_FACTOR : 1);
      }, 0);
  return Math.floor(
    base *
      matchup(u, target, move) *
      outputFactor(u) *
      sensesFactor(u, move) *
      guardFactor(target)
  );
}
/*
  Who a move's area reaches beyond its selected target (contract decision 33). The line
  is the order of the `team` and `enemies` arrays, standing units only, so a line closes
  up when a unit falls.

    - line, cone, sweep: small reaches the next unit after the target in the opposing
      line (the far side), medium both neighbors, large the whole opposing line;
    - radial anchored on self: every standing opposing unit and the performer's own
      adjacent allies (the model's no-ally-filter rule);
    - radial anchored on the target or a location: the target's two neighbors.

  The selected target is never in the returned list: it is always a recipient already.
  Concealment does not protect a unit from an area; it only prevents selection.
*/
export function areaReach(
  s: { team: Unit[]; enemies: Unit[] },
  u: Unit,
  move: Move,
  target: Unit
): Unit[] {
  const area = move.area;
  if (!area || !move.effects.some((e) => e.recipient === "area" && e.support !== "unsupported"))
    return [];
  const foes = (u.enemy ? s.team : s.enemies).filter((t) => t.hp > 0);
  const own = (u.enemy ? s.enemies : s.team).filter((t) => t.hp > 0);
  const at = foes.findIndex((t) => t.id === target.id);
  const around = (line: Unit[], i: number) =>
    [line[i - 1], line[i + 1]].filter((t): t is Unit => !!t && i >= 0);
  if (area.shape === "radial") {
    if (area.anchor === "self")
      return [
        ...foes.filter((t) => t.id !== target.id),
        ...around(own, own.findIndex((t) => t.id === u.id)),
      ];
    return around(foes, at);
  }
  if (area.extent === "small")
    return at >= 0 && foes[at + 1] ? [foes[at + 1]] : [];
  if (area.extent === "medium") return around(foes, at);
  return foes.filter((t) => t.id !== target.id);
}
export function restorePreview(u: Unit, effect: MoveEffect): number {
  return Math.floor(
    (effect.intensity / RESTORE_DIVISOR) *
      (HARM_BASE + u.attrs.willpower / HARM_ATTR_DIVISOR)
  );
}
type Emit = (text: string, event?: BattleEvent) => void;

/** A degrading tick or a mending tick, on the harm curve, at the element matchup (contract decisions 13 and 17). */
export function tickAmount(c: Condition, victim: Unit): number {
  const factor = c.group === "degrading" ? DEGRADE_FACTOR : MEND_FACTOR;
  const raw = (c.intensity / HARM_DIVISOR) * factor;
  if (c.group !== "degrading") return Math.floor(raw);
  const key = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  const table = effectiveness as Record<string, Record<string, number>>;
  const row = c.element ? table[key(c.element)] : undefined;
  const against = row?.[key(victim.element)] ?? 1;
  return Math.floor(raw * against);
}

/*
  The start of the victim's own opportunity (contract decisions 12, 13 and 17):
  degrading conditions tick harm (never reduced by ward), mending ticks restoration,
  then every condition spends one of the victim's opportunities and an exhausted one
  expires. A sustained condition ends when its source unit falls instead.
*/
function openOpportunity(s: Run, u: Unit, emit: Emit) {
  for (const c of [...u.conditions]) {
    if (u.hp <= 0) break;
    if (c.group === "degrading") {
      const amount = tickAmount(c, u);
      if (amount > 0) {
        u.hp = Math.max(0, u.hp - amount);
        emit(
          `${u.name} takes ${amount} damage from ${c.status}.${
            u.hp === 0 ? " Knocked out." : ""
          }`,
          {
            kind: "tick",
            targetId: u.id,
            amount,
            status: c.status,
            group: c.group,
          }
        );
      }
    } else if (c.group === "mending") {
      const amount = Math.min(u.max - u.hp, tickAmount(c, u));
      if (amount > 0) {
        u.hp += amount;
        emit(`${u.name} recovers ${amount} HP from ${c.status}.`, {
          kind: "tick",
          targetId: u.id,
          amount,
          status: c.status,
          group: c.group,
        });
      }
    }
  }
}
/*
  The close of the same opportunity: every condition spends one of the victim's own
  opportunities and an exhausted one expires. A sustained condition ends when its
  source unit falls instead (contract decision 12).
*/
function spendOpportunity(s: Run, u: Unit, emit: Emit) {
  const standingIds = new Set(
    [...s.team, ...s.enemies].filter((t) => t.hp > 0).map((t) => t.id)
  );
  u.sinceEntranced = Math.min(
    u.sinceEntranced + 1,
    ENTRANCE_IMMUNITY_OPPORTUNITIES + 1
  );
  u.sinceStunned = Math.min(
    u.sinceStunned + 1,
    ENTRANCE_IMMUNITY_OPPORTUNITIES + 1
  );
  const survivors: Condition[] = [];
  for (const c of u.conditions) {
    if (c.remaining === Infinity) {
      survivors.push(c);
      continue;
    }
    if (c.sustained && !standingIds.has(c.source)) {
      emit(`${u.name} is no longer ${c.status}: its source has fallen.`, {
        kind: "expired",
        targetId: u.id,
        status: c.status,
        group: c.group,
      });
      continue;
    }
    const remaining = c.remaining - 1;
    if (remaining <= 0) {
      emit(`${u.name} is no longer ${c.status}.`, {
        kind: "expired",
        targetId: u.id,
        status: c.status,
        group: c.group,
      });
      continue;
    }
    survivors.push({ ...c, remaining });
  }
  u.conditions = survivors;
  syncBound(u);
}
/** `bound` is the pass 1 counter; binding conditions are its record. They move together. */
function syncBound(u: Unit) {
  const binding = conditionsIn(u, "binding");
  u.bound = binding.length ? Math.max(...binding.map((c) => c.remaining)) : 0;
}

/*
  One status application (contract decisions 14, 15, 18, 27 and 30): the likelihood roll
  from the run rng, then the target's protection descriptors, the senses guard (a blinded
  unit cannot receive a visual signal), the attention and shock guards, then
  refresh-or-add. Reapplying the same status refreshes the duration and keeps the higher
  intensity; nothing stacks additively. A shock that lands breaks a charge in progress.
  Returns whether the status landed.
*/
function applyStatus(
  s: Run,
  u: Unit,
  m: Move,
  target: Unit,
  e: MoveEffect,
  acted: Set<string>,
  emit: Emit
): boolean {
  if (target.hp <= 0 || !e.group) return false;
  const status = e.status ?? "condition";
  const binding = e.group === "binding";
  const refuse = (text: string) =>
    emit(text, {
      kind: "resisted",
      actorId: u.id,
      targetId: target.id,
      moveName: m.name,
      status,
      group: e.group,
    });
  const chance = LIKELIHOOD_PERCENT[e.likelihood];
  if (!(chance >= 100 || random(s) * 100 < chance)) {
    // Binding keeps the pass 1 "missed" word; every other status reads as resisted.
    if (binding)
      emit(`${u.name}'s ${m.name} fails to take hold on ${target.name}.`, {
        kind: "missed",
        actorId: u.id,
        targetId: target.id,
        moveName: m.name,
        status,
        group: e.group,
      });
    else refuse(`${target.name} shakes off ${status}.`);
    return false;
  }
  if (protectionDegree(target, { kind: "status", status }) === "immune") {
    refuse(`${target.name} is immune to ${status}.`);
    return false;
  }
  // A blinded unit cannot see a visual signal, so nothing it carries takes hold
  // (contract decision 30).
  if (m.reception === "visual" && has(target, "blinded")) {
    refuse(`${target.name} is blinded: ${m.name} cannot be seen.`);
    return false;
  }
  if (e.group === "attention") {
    if (has(target, FOCUS_STATUS)) {
      refuse(`${target.name} is focused: ${status} cannot take its attention.`);
      return false;
    }
    if (
      status === "entranced" &&
      target.sinceEntranced < ENTRANCE_IMMUNITY_OPPORTUNITIES
    ) {
      refuse(
        `${target.name} broke a trance too recently to be entranced again.`
      );
      return false;
    }
  }
  // Shock is physical, not attention: focus does not block it, but the same window
  // as a trance does (contract decision 27).
  if (
    e.group === "shock" &&
    target.sinceStunned < ENTRANCE_IMMUNITY_OPPORTUNITIES
  ) {
    refuse(`${target.name} was stunned too recently to be stunned again.`);
    return false;
  }
  const intensity = e.intensity || DEFAULT_STATUS_INTENSITY;
  const opportunities = e.opportunities ?? 1;
  const existing = target.conditions.find((c) => c.status === status);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, opportunities);
    existing.intensity = Math.max(existing.intensity, intensity);
    existing.source = u.id;
  } else {
    target.conditions.push({
      status,
      group: e.group,
      intensity,
      ...(e.statusElement ? { element: e.statusElement } : {}),
      remaining: opportunities,
      source: u.id,
      ...(e.sustained ? { sustained: true } : {}),
      removable: [...(e.removable ?? [])],
      ...(e.protection ? { protection: e.protection } : {}),
    });
  }
  if (status === "entranced") target.sinceEntranced = 0;
  if (e.group === "shock") target.sinceStunned = 0;
  syncBound(target);
  const remaining = target.conditions.find((c) => c.status === status)!
    .remaining;
  emit(
    binding
      ? `${u.name} uses ${m.name}: ${target.name} is ${status} through its next opportunity.`
      : `${u.name} uses ${m.name}: ${target.name} is ${status} for ${remaining} ${
          remaining === 1 ? "opportunity" : "opportunities"
        }.`,
    {
      kind: binding ? "bind" : "status",
      actorId: u.id,
      targetId: target.id,
      moveName: m.name,
      status,
      group: e.group,
      remaining,
    }
  );
  // An acute shock disrupts what the body was doing: a charge in progress breaks
  // (contract decision 27), exactly as a pull breaks one.
  if (e.group === "shock" && target.charge !== null) {
    breakCharge(target, acted.has(target.id));
    emit(`${target.name} is stunned: its charge is broken.`, {
      kind: "broken",
      actorId: u.id,
      targetId: target.id,
      moveName: m.name,
      status,
      group: e.group,
    });
  }
  return true;
}

/** `remove` ends every condition whose removable methods intersect the effect's; nothing else (contract decision 17). */
function applyRemove(
  u: Unit,
  m: Move,
  target: Unit,
  methods: RemovalMethod[],
  emit: Emit
) {
  const cleared = target.conditions.filter(
    (c) =>
      c.remaining !== Infinity && c.removable.some((r) => methods.includes(r))
  );
  if (!cleared.length) {
    emit(`${u.name} uses ${m.name}: nothing on ${target.name} answers to it.`, {
      kind: "removed",
      actorId: u.id,
      targetId: target.id,
      moveName: m.name,
    });
    return;
  }
  target.conditions = target.conditions.filter((c) => !cleared.includes(c));
  syncBound(target);
  for (const c of cleared)
    emit(`${u.name} uses ${m.name}: ${target.name} is no longer ${c.status}.`, {
      kind: "removed",
      actorId: u.id,
      targetId: target.id,
      moveName: m.name,
      status: c.status,
      group: c.group,
    });
}

function prepare(s: Run) {
  s.orders = {};
  for (const u of standing(s.enemies)) {
    const available = legalMoves(u);
    const charge = available.find((i) => prolonged(u.moves[i]));
    const guard = available.find((i) =>
      u.moves[i].effects.some((e) => e.support === "protect")
    );
    let move = charge ?? available.find((i) => i !== guard) ?? available[0];
    if (guard !== undefined && available.length > 1 && charge === undefined)
      move = random(s) < 1 / 3 ? guard : move;
    // Decision 20: the enemy planner does not read conditions. It does obey the one
    // targeting rule every unit obeys: a concealed companion is not selectable while
    // another one stands (decision 16).
    const foes = selectableTargets(s.team);
    s.orders[u.id] = {
      move: move ?? -2,
      target: u.charge ?? foes[Math.floor(random(s) * foes.length)].id,
    };
  }
}
function enter(s: Run) {
  s.round = 1;
  s.phase = "planning";
  for (const u of s.team) {
    u.cooldowns = u.moves.map(() => 0);
    u.signatureSpent = false;
    u.bound = 0;
    u.ward = false;
    u.passiveCooldowns = u.passives.map(() => 0);
    // Applied conditions do not carry between encounters; permanent ones (physiology
    // protections and ongoing passives) do, and an ongoing passive re-seeds its own at
    // entry so a condition a `remove` somehow reached is back (contract decision 21).
    u.conditions = u.conditions.filter((c) => c.remaining === Infinity);
    for (const condition of u.passives.flatMap((p) => p.conditions))
      if (!u.conditions.some((c) => c.status === condition.status))
        u.conditions.push({ ...condition });
    u.sinceEntranced = Infinity;
    u.sinceStunned = Infinity;
    u.charge = null;
    u.chargeMove = -1;
    u.recovery = 0;
  }
  s.enemies = ROOMS[s.room].enemies.map((row) =>
    enemyUnit(String(row[0]), String(row[1]), Number(row[2]))
  );
  for (const row of [s.team, s.enemies])
    for (let i = row.length - 1; i > 0; i--) {
      const j = Math.floor(random(s) * (i + 1));
      [row[i], row[j]] = [row[j], row[i]];
    }
  s.log.push(`Entered ${ROOMS[s.room].name}.`);
  prepare(s);
}
export function createRun(seed = 1): Run {
  const s: Run = {
    seed: seed >>> 0,
    rng: seed >>> 0,
    room: 0,
    round: 1,
    team: COMPANION_KEYS.map((key, i) =>
      readCompanion(COMPANION_RECORDS[key], COMPANION_IDS[i])
    ),
    enemies: [],
    orders: {},
    phase: "planning",
    revival: 1,
    xp: 0,
    log: [],
  };
  enter(s);
  return s;
}
function breakCharge(u: Unit, acted: boolean) {
  u.charge = null;
  u.chargeMove = -1;
  // Recovery counts opportunities. A unit interrupted before its own opportunity this
  // round passes that one (its stale release order is blocked) and the next; one that
  // already acted passes just the next. An interruption costs the lever
  // INTERRUPTED_CHARGE_RECOVERY_OPPORTUNITIES rather than the post-release pause: the
  // first sim (2026-09-21) showed a blind pull on a one-round cooldown locked both
  // chargers out for whole encounters when the two pauses were equal.
  u.recovery = INTERRUPTED_CHARGE_RECOVERY_OPPORTUNITIES + (acted ? 0 : 1);
}
export function resolveRound(
  previous: Run,
  orders: Record<string, Order>
): { state: Run; frames: Frame[] } {
  if (previous.phase !== "planning")
    throw new Error("This encounter is not accepting orders.");
  for (const u of standing(previous.team)) {
    const q = orders[u.id];
    const legal = legalMoves(u);
    if (
      !q ||
      !(legal.length ? legal.includes(q.move) : q.move === -2) ||
      (q.move !== -2 &&
        !selectableTargets(previous.enemies).some((t) => t.id === q.target))
    )
      throw new Error(`Choose a legal move and target for ${u.name}.`);
  }
  const s = clone(previous);
  const frames: Frame[] = [];
  const emit = (text: string, event?: BattleEvent) => {
    s.log.push(text);
    frames.push({
      text,
      team: clone(s.team),
      enemies: clone(s.enemies),
      event,
    });
  };
  emit(`Encounter ${s.room + 1} · Round ${s.round}`, { kind: "round" });
  // A passive's recovery counts rounds, and a reaction fires at whatever moment in the
  // round the triggering move happens, so its cooldown is spent and refunded at the
  // round boundary rather than at the owner's own opportunity: decrementing at the
  // opportunity would refund a reaction mid-round to every attacker who came after it
  // (contract decision 23).
  for (const u of [...s.team, ...s.enemies])
    u.passiveCooldowns = u.passiveCooldowns.map((n) => Math.max(0, n - 1));
  const sequence = initiative(s.team, s.enemies, s.round, {
    ...s.orders,
    ...orders,
  });
  const acted = new Set<string>();
  for (const u of sequence) {
    if (!standing(s.team).length || !standing(s.enemies).length) break;
    if (u.hp <= 0) continue;
    acted.add(u.id);
    const q = (u.enemy ? s.orders : orders)[u.id];
    const wasBound = u.bound > 0;
    const entranced = u.conditions.some((c) => c.status === "entranced");
    const stunned = u.conditions.some((c) => c.group === "shock");
    u.ward = false;
    // Read before the decrement: a charge broken before this opportunity leaves a stale
    // release order that must still be blocked here, even when the interrupted-charge
    // recovery lever is 0.
    const recovering = u.recovery > 0;
    if (u.recovery) u.recovery--;
    u.cooldowns = u.cooldowns.map((n) => Math.max(0, n - 1));
    // The start of this unit's opportunity: degrading and mending ticks
    // (contract decisions 13 and 17).
    openOpportunity(s, u, emit);
    if (u.hp <= 0) continue;
    if (stunned) {
      // Shock takes the opportunity like a trance (contract decision 27); its charge
      // was already broken when the shock landed.
      emit(`${u.name} is stunned and loses its opportunity.`, {
        kind: "lost",
        actorId: u.id,
        status: "stunned",
        group: "shock",
      });
      spendOpportunity(s, u, emit);
      continue;
    }
    if (entranced) {
      // Its committed order is not executed and not charged; a charge in progress
      // stands (contract decision 15). The lost opportunity is the one the trance
      // spends, so it is reported before the condition expires.
      emit(`${u.name} is entranced and loses its opportunity.`, {
        kind: "lost",
        actorId: u.id,
        status: "entranced",
        group: "attention",
      });
      spendOpportunity(s, u, emit);
      continue;
    }
    spendOpportunity(s, u, emit);
    if (q.move === -2)
      emit(`${u.name} cannot act while bound.`, {
        kind: "blocked",
        actorId: u.id,
      });
    else {
      const m = moveAt(u, q.move);
      const release = prolonged(m) && u.charge !== null;
      if (wasBound && m.approach === "closing") {
        if (release) breakCharge(u, true);
        emit(
          `${u.name}'s ${m.name} is stopped by binding.${
            release ? " Charge dispersed; recovery begins." : ""
          }`,
          { kind: "blocked", actorId: u.id, moveName: m.name }
        );
      } else if (prolonged(m) && !release && recovering) {
        // A stale release order after the charge was broken this round.
        emit(`${u.name}'s charge was broken; it cannot begin another yet.`, {
          kind: "blocked",
          actorId: u.id,
          moveName: m.name,
        });
      } else {
        const targets = u.enemy ? s.team : s.enemies;
        let target = targets.find((t) => t.id === q.target);
        // Retargeting walks the fixed row order and skips a concealed unit while
        // another one stands (contract decision 16).
        const open = new Set(selectableTargets(targets).map((t) => t.id));
        // A move whose every effect lands on its performer (Ground Anchor) still
        // carries a target id from the order, but nothing about it is aimed, so a
        // fallen or concealed target changes nothing and is not announced. Seen on
        // the live site 2026-09-22: "Graviclaw redirects Ground Anchor to Shield unit".
        const aimed = m.effects.some((e) => e.recipient !== "self");
        // Beginning a charge delivers nothing yet; only an execution can stumble.
        const executes = !(prolonged(m) && !release);
        if (aimed && executes && has(u, "disoriented") && open.size) {
          // Disoriented: the aimed order goes to a uniformly drawn standing legal
          // target from the run rng, announced as a stumble (contract decision 31).
          const pool = targets.filter((t) => open.has(t.id));
          target = pool[Math.floor(random(s) * pool.length)];
          emit(
            `${u.name} is disoriented: ${m.name} stumbles toward ${target.name} (${target.id}).`,
            {
              kind: "stumble",
              actorId: u.id,
              targetId: target.id,
              moveName: m.name,
              status: "disoriented",
              group: "senses",
            }
          );
        } else if (!target || target.hp <= 0 || !open.has(target.id)) {
          const skipped =
            aimed && target && target.hp > 0 && !open.has(target.id);
          const index = target ? targets.indexOf(target) : -1;
          const next = Array.from(
            { length: targets.length },
            (_, i) => targets[(index + i + 1) % targets.length]
          ).find((t) => open.has(t.id));
          if (skipped && next)
            emit(`${target!.name} is concealed; ${m.name} cannot find it.`, {
              kind: "hidden",
              actorId: u.id,
              targetId: target!.id,
              moveName: m.name,
            });
          target = next;
          if (target && aimed)
            emit(
              `${u.name} redirects ${m.name} to ${target.name} (${target.id}).`,
              {
                kind: "redirect",
                actorId: u.id,
                targetId: target.id,
                moveName: m.name,
              }
            );
        }
        if (target) {
          if (prolonged(m) && !release) {
            u.charge = target.id;
            u.chargeMove = q.move;
            emit(
              `${u.name} begins ${m.name}. A powerful release is coming at its next opportunity.`,
              { kind: "charge", actorId: u.id, moveName: m.name }
            );
          } else {
            if (q.move >= 0) {
              u.cooldowns[q.move] = COOLDOWN_ROUNDS[m.recovery];
              if (m.signature) u.signatureSpent = true;
            }
            if (release) {
              u.charge = null;
              u.chargeMove = -1;
              u.recovery = CHARGE_RECOVERY_OPPORTUNITIES;
            }
            const outcome = apply(s, u, m, target, acted, emit);
            // Reactions resolve after the triggering move finishes (contract decision 22).
            reactions(s, u, m, outcome, acted, 0, emit);
          }
        }
      }
    }
  }
  if (!standing(s.team).length) {
    s.phase = "lost";
    emit("The squad has fallen. Previously earned practice XP is retained.");
  } else if (!standing(s.enemies).length) {
    const xp = s.room === 3 ? FINAL_ENCOUNTER_XP : ENCOUNTER_XP;
    s.xp += xp;
    s.phase = s.room === 3 ? "won" : "camp";
    emit(`Encounter cleared. +${xp} practice XP per squad member.`);
  } else {
    s.round++;
    prepare(s);
  }
  return { state: s, frames };
}
/**
  What one move actually did, for the trigger layer to read (contract decision 22).
  `harmed` lists every unit that lost HP to the move itself, never to a tick.
*/
export type Outcome = {
  /** Units that lost HP to this move, with the amount. */
  harmed: { id: string; amount: number }[];
  /** Units a status or a binding landed on. */
  afflicted: string[];
};

/**
  One resolver for every effect on both sides. Harm is deterministic; statuses roll the run rng.

  Recipients (contract decision 33): the selected target, plus whoever the move's area
  reaches (`areaReach`). The target takes every harm effect; an area recipient only the
  area ones, each at AREA_HARM_FACTOR; statuses roll independently per recipient.

  Order: harm and displacement first, per recipient; then every independent effect; then
  every effect that `requires` another, which resolves only when its prerequisite
  succeeded on at least one recipient (contract decision 34). A beneficial effect that
  would reach an opposing unit is withheld and recorded (contract decision 35).
*/
function apply(
  s: Run,
  u: Unit,
  m: Move,
  target: Unit,
  acted: Set<string>,
  emit: (text: string, event?: BattleEvent) => void
): Outcome {
  const outcome: Outcome = { harmed: [], afflicted: [] };
  const supported = m.effects.filter((e) => e.support !== "unsupported");
  const element = m.element ?? u.element;
  // Concealment ends when its owner executes a harm or a displace: the strike gives
  // its position away (contract decision 16).
  if (damaging(m) && concealed(u)) {
    u.conditions = u.conditions.filter((c) => c.group !== "concealment");
    emit(`${u.name} breaks cover to attack.`, {
      kind: "expired",
      actorId: u.id,
      status: "concealed",
      group: "concealment",
    });
  }
  const around = areaReach(s, u, m, target);
  /** Effect keys that succeeded on at least one recipient, for `requires`. */
  const succeeded = new Set<string>();
  const recipientsOf = (e: MoveEffect): Unit[] =>
    e.recipient === "self"
      ? [u]
      : e.recipient === "area"
      ? [target, ...around]
      : [target];

  // Harm and displacement, per recipient.
  const strike = (victim: Unit, reach: Reach) => {
    const landing = supported.filter(
      (e) =>
        (e.support === "harm" || e.support === "displace") &&
        (reach === "target" || e.recipient === "area")
    );
    if (!landing.length && !(m.fallback && reach === "target")) return;
    // A victim immune to displacement takes neither the impact harm nor the charge
    // break: the descriptor blocks the whole mechanism (contract decision 14).
    const displaceImmune =
      protectionDegree(victim, { kind: "displace" }) === "immune";
    const damage = damagePreview(u, m, victim, reach);
    victim.hp = Math.max(0, victim.hp - damage);
    if (damage > 0) outcome.harmed.push({ id: victim.id, amount: damage });
    for (const e of landing) {
      const immune =
        protectionDegree(victim, harmScope(e, element)) === "immune";
      if (e.support === "harm" && damage > 0 && !immune) succeeded.add(e.key);
      if (e.support === "displace" && !displaceImmune) succeeded.add(e.key);
    }
    if (m.fallback && reach === "target")
      u.hp = Math.max(0, u.hp - DESPERATE_STRIKE_RECOIL);
    emit(
      reach === "target"
        ? `${u.name} uses ${m.name} on ${victim.name} (${victim.id}): ${damage} damage.${
            victim.hp === 0 ? " Knocked out." : ""
          }${
            m.fallback
              ? ` Attacker takes ${DESPERATE_STRIKE_RECOIL} recoil damage.`
              : ""
          }`
        : `${u.name}'s ${m.name} reaches ${victim.name} (${victim.id}): ${damage} damage.${
            victim.hp === 0 ? " Knocked out." : ""
          }`,
      {
        kind: "hit",
        actorId: u.id,
        targetId: victim.id,
        amount: damage,
        moveName: m.name,
        ...(reach === "area" ? { area: true as const } : {}),
      }
    );
    const pulls = landing.some((e) => e.support === "displace");
    if (victim.hp > 0 && victim.charge !== null && !displaceImmune && pulls) {
      breakCharge(victim, acted.has(victim.id));
      emit(
        `${victim.name} is pulled off its footing: its charge is broken.`,
        {
          kind: "displace",
          actorId: u.id,
          targetId: victim.id,
          moveName: m.name,
        }
      );
    }
    if (displaceImmune && pulls)
      emit(`${victim.name} is anchored: displacement cannot move it.`, {
        kind: "resisted",
        actorId: u.id,
        targetId: victim.id,
        moveName: m.name,
        status: "protected",
        group: "guarding",
      });
  };
  if (damaging(m)) {
    strike(target, "target");
    for (const victim of around) strike(victim, "area");
  }

  const withhold = (
    e: MoveEffect,
    victim: Unit,
    reason: "foe" | "requires",
    text: string
  ) =>
    emit(text, {
      kind: "withheld",
      actorId: u.id,
      targetId: victim.id,
      moveName: m.name,
      reason,
      effect: e.status ?? e.type,
      ...(e.group ? { group: e.group } : {}),
    });
  const resolve = (e: MoveEffect) => {
    if (e.support === "harm" || e.support === "displace") return;
    if (e.requires && !succeeded.has(e.requires)) {
      // A drain's restore needs harm actually dealt (contract decision 34).
      withhold(
        e,
        u,
        "requires",
        `${u.name}'s ${m.name} draws nothing, so nothing returns.`
      );
      return;
    }
    for (const victim of recipientsOf(e)) {
      if (victim.hp <= 0) continue;
      // Beneficial effects never reach an opposing unit (contract decision 35). A
      // reaction aimed at an ally by its trigger is on the owner's side, so it passes.
      if (beneficial(e) && victim.enemy !== u.enemy) {
        withhold(
          e,
          victim,
          "foe",
          `${u.name}'s ${m.name} would ${
            e.support === "restore"
              ? "restore"
              : e.support === "protect"
              ? "shield"
              : `leave ${e.status}`
          } ${victim.name}, a foe: withheld.`
        );
        continue;
      }
      if (e.support === "bind" || e.support === "status") {
        // Binding writes the pass 1 counter through its condition, so the accepted Snare
        // rule is unchanged while the badge can name the status (contract decision 11).
        if (applyStatus(s, u, m, victim, e, acted, emit)) {
          succeeded.add(e.key);
          outcome.afflicted.push(victim.id);
        }
      } else if (e.support === "remove") {
        if (e.methods?.length) applyRemove(u, m, victim, e.methods, emit);
        succeeded.add(e.key);
      } else if (e.support === "protect") {
        victim.ward = true;
        succeeded.add(e.key);
        emit(
          victim.id === u.id
            ? `${u.name} activates ${m.name}: incoming damage halved until its next opportunity.`
            : `${u.name}'s ${m.name} shields ${victim.name}: incoming damage halved until its next opportunity.`,
          { kind: "ward", actorId: u.id, targetId: victim.id, moveName: m.name }
        );
      } else if (e.support === "restore") {
        const amount = Math.min(victim.max - victim.hp, restorePreview(u, e));
        victim.hp += amount;
        succeeded.add(e.key);
        emit(
          victim.id === u.id
            ? `${u.name} uses ${m.name}: recovers ${amount} HP.`
            : `${u.name}'s ${m.name} restores ${amount} HP to ${victim.name}.`,
          {
            kind: "restore",
            actorId: u.id,
            targetId: victim.id,
            amount,
            moveName: m.name,
          }
        );
      }
    }
  };
  for (const e of supported.filter((e) => !e.requires)) resolve(e);
  for (const e of supported.filter((e) => e.requires)) resolve(e);
  return outcome;
}
/*
  The trigger layer (contract decisions 22, 23 and 25).

  Every discrete passive on the table is offered the triggering move once it has
  finished. A reaction resolves in its owner's name, with its owner's attributes,
  through the same `apply` path as an action, so nothing about a reaction's harm,
  status or matchup is a second set of rules. Constraints, all levers:

    - never while the owner is knocked out (the strike that felled it kills the reply);
    - at most REACTIONS_PER_TRIGGERING_MOVE per passive per triggering move;
    - its `timing.recovery` as a cooldown in rounds, spent when it fires;
    - depth REACTION_DEPTH: a reaction's own harm or status triggers nothing further;
    - `likelihood` rolls from the run rng, exactly as an action's status does.

  The triggers and their targets come from the model: `contact` when a contact-delivery
  move landed harm or a status on the owner (target: the attacker); `harmed` when the
  owner lost HP to a unit's move, never to a tick (target: the attacker); `ally-harmed`
  when a same-side standing unit lost HP to a move (target: that ally).
*/
function triggersFor(
  owner: Unit,
  attacker: Unit,
  move: Move,
  outcome: Outcome
): Trigger[] {
  const triggers: Trigger[] = [];
  const hitOwner =
    outcome.harmed.some((h) => h.id === owner.id) ||
    outcome.afflicted.includes(owner.id);
  if (owner.id !== attacker.id && hitOwner && contactDelivery(move))
    triggers.push("contact");
  if (
    owner.id !== attacker.id &&
    outcome.harmed.some((h) => h.id === owner.id)
  )
    triggers.push("harmed");
  return triggers;
}

function reactions(
  s: Run,
  attacker: Unit,
  move: Move,
  outcome: Outcome,
  acted: Set<string>,
  depth: number,
  emit: Emit
) {
  if (depth >= REACTION_DEPTH) return;
  const all = [...s.team, ...s.enemies];
  for (const owner of all) {
    if (owner.hp <= 0) continue;
    if (!owner.passives.length) continue;
    // A sedated unit's passives do not react while it lasts (contract decision 29).
    if (sedated(owner)) continue;
    // Only a foe's move provokes a reaction. A radial area anchored on its performer
    // reaches the performer's own neighbors (contract decision 33); that friendly harm
    // triggers nothing, so no squadmate ever answers another.
    if (owner.enemy === attacker.enemy) continue;
    // ally-harmed reads the harmed same-side unit, which is not the owner itself.
    const ally = all.find(
      (u) =>
        u.id !== owner.id &&
        u.enemy === owner.enemy &&
        u.hp > 0 &&
        outcome.harmed.some((h) => h.id === u.id)
    );
    const available = triggersFor(owner, attacker, move, outcome);
    if (ally) available.push("ally-harmed");
    if (!available.length) continue;
    let fired = 0;
    for (let i = 0; i < owner.passives.length; i++) {
      if (fired >= REACTIONS_PER_TRIGGERING_MOVE) break;
      const passive = owner.passives[i];
      if (passive.kind !== "triggered" || passive.support !== "supported") continue;
      if (!passive.trigger || !available.includes(passive.trigger)) continue;
      if (owner.passiveCooldowns[i] > 0) continue;
      // The trigger supplies the target: the attacker, or the harmed ally
      // (contract decisions 22 and 26 - this is the one place an effect reaches an ally).
      const target = passive.trigger === "ally-harmed" ? ally : attacker;
      if (!target) continue;
      owner.passiveCooldowns[i] = passive.cooldown;
      fired++;
      emit(
        `${owner.name} reacts: ${passive.name} answers ${target.name}.`,
        {
          kind: "react",
          actorId: owner.id,
          targetId: target.id,
          moveName: passive.name,
        }
      );
      // A reaction is an action for the resolver: same effects, same rolls, same events.
      apply(s, owner, asMove(passive), target, acted, emit);
      if (owner.hp <= 0) break;
    }
  }
}

/** A triggered passive in Move clothing, so the one resolver runs it unchanged (contract decision 22). */
export function asMove(passive: Passive): Move {
  return {
    key: passive.key,
    name: passive.name,
    signature: passive.signature,
    // A reaction is not an approach the table can block: it is stationary at contact
    // range, so binding never stops a reply and a reply never reads as a contact
    // delivery that could trigger another one (depth one is the lever that guarantees it).
    approach: "stationary",
    range: "contact",
    preparation: "immediate",
    recovery: "repeatable",
    ...(passive.element ? { element: passive.element } : {}),
    effects: passive.effects,
  };
}

export function command(previous: Run, action: Command): Run {
  if (action.kind === "round")
    return resolveRound(previous, action.orders).state;
  const s = clone(previous);
  if (s.phase !== "camp")
    throw new Error("This action is available between encounters.");
  if (action.kind === "revive") {
    const u = s.team.find((t) => t.id === action.id);
    if (!u || u.hp > 0 || !s.revival)
      throw new Error("Revival is unavailable.");
    u.hp = Math.ceil(u.max / 2);
    s.revival = 0;
    s.log.push(`${u.name} revived at ${u.hp} HP.`);
  } else if (action.kind === "retreat") {
    s.phase = "retreated";
    s.log.push("Squad extracted. Earned practice XP retained.");
  } else {
    s.room++;
    if (s.room === 3) {
      for (const u of standing(s.team))
        u.hp = Math.min(u.max, u.hp + RECOVERY_STATION_HP);
      s.log.push(
        `Recovery station: +${RECOVERY_STATION_HP} HP to standing squad members.`
      );
    }
    enter(s);
  }
  return s;
}

// Saves contain commands, not trusted arbitrary combat state. Replay validates each action.
export function restoreRun(raw: string): { state: Run; history: Command[] } {
  const save = JSON.parse(raw);
  if (
    save.version !== SAVE_VERSION ||
    !Number.isInteger(save.seed) ||
    !Array.isArray(save.history) ||
    save.history.length > SAVE_HISTORY_LIMIT
  )
    throw new Error("Unsupported save.");
  let state = createRun(save.seed);
  for (const action of save.history) state = command(state, action);
  return { state, history: save.history };
}
