/*
  Powerworks: how the dungeon reads a creature record.

  THIS IS THE SEAM. It is the only file in packages/rules/src/dungeon that reads
  a v5 creature record (docs/design/creature-model-current.md), and the only
  place the hand-authored enemy cards are read, so both sides of the table
  arrive in one Unit / Move shape and the engine has one resolver
  (docs/design/powerworks-v5-mechanics.md, "The reading seam").

  Nothing here invents a rule for an effect the game cannot express. Every
  effect carries a `support` reading; an unsupported one names its reason and
  the table shows it as "no effect here" (contract decision 9). A move is usable
  if any of its effects is supported.
*/
import type { CreatureRecord, Effect } from "@xalians/content/creature";
import {
  BINDING_STATUSES,
  DESPERATE_STRIKE_DAMAGE,
  HP_SCALE,
  SPEED_SCALE,
  STRENGTH_MECHANISMS,
} from "./levers.ts";

export type Approach = "closing" | "stationary" | "self";
export type Range = "contact" | "short" | "medium" | "long" | "none";
export type Preparation = "immediate" | "brief" | "prolonged";
export type Recovery = "repeatable" | "brief" | "prolonged";
export type Likelihood = "consistent" | "likely" | "occasional";
export type Support =
  | "harm"
  | "displace"
  | "protect"
  | "bind"
  | "restore"
  | "unsupported";
export type HarmMechanism =
  | "impact"
  | "cutting"
  | "piercing"
  | "compression"
  | "elemental";
/** One v5 effect as the table reads it. `support` says what the engine does with it. */
export type MoveEffect = {
  key: string;
  type: "harm" | "restore" | "protect" | "displace" | "status" | "remove";
  recipient: "self" | "target" | "area";
  likelihood: Likelihood;
  intensity: number;
  mechanism?: HarmMechanism;
  status?: string;
  support: Support;
  /** Present only when support is "unsupported": the words the table shows. */
  reason?: string;
};
export type Move = {
  key: string;
  name: string;
  signature: boolean;
  approach: Approach;
  range: Range;
  preparation: Preparation;
  recovery: Recovery;
  /** The move's own element classification when it has one; matchup falls back to the creature's element. */
  element?: string;
  effects: MoveEffect[];
  /** Desperate strike only: flat damage, no matchup, recoil. */
  fallback?: true;
};
export type Unit = {
  id: string;
  species: string;
  name: string;
  element: string;
  enemy: boolean;
  hp: number;
  max: number;
  speed: number;
  attrs: { strength: number; willpower: number };
  moves: Move[];
  cooldowns: number[];
  signatureSpent: boolean;
  bound: number;
  ward: boolean;
  charge: string | null;
  /** Index of the move being charged, -1 when none. Kept beside `charge` so a unit with two prolonged moves releases the one it began. */
  chargeMove: number;
  recovery: number;
};

/** The hand-authored shape in cards.json: a card is a Unit template whose moves carry raw v5 effects. */
export type CardEffect = {
  key: string;
  type: MoveEffect["type"];
  recipient: MoveEffect["recipient"];
  likelihood: Likelihood;
  intensity?: number;
  mechanism?: HarmMechanism;
  status?: string;
};
export type Card = {
  hp: number;
  speed: number;
  element: string;
  enemy?: boolean;
  attrs: { strength: number; willpower: number };
  moves: {
    key: string;
    name: string;
    approach: Approach;
    range: Range;
    preparation: Preparation;
    recovery: Recovery;
    element?: string;
    effects: CardEffect[];
  }[];
};

const BINDING = new Set<string>(BINDING_STATUSES);
const mean = (...values: number[]) =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

/** Which attribute scales a harm mechanism (contract: strength for the physical four, willpower for elemental). */
export function harmAttribute(mechanism: HarmMechanism): "strength" | "willpower" {
  return (STRENGTH_MECHANISMS as readonly string[]).includes(mechanism)
    ? "strength"
    : "willpower";
}

/** The support reading of one effect. Shared by records and cards so the table cannot disagree with itself. */
export function readEffect(effect: CardEffect | Effect): MoveEffect {
  const base: MoveEffect = {
    key: effect.key,
    type: effect.type,
    recipient: effect.recipient,
    likelihood: effect.likelihood,
    intensity: "intensity" in effect && effect.intensity ? effect.intensity : 0,
    support: "unsupported",
  };
  const unsupported = (reason: string): MoveEffect => ({ ...base, reason });
  const aimed = effect.recipient !== "self";
  switch (effect.type) {
    case "harm":
      if (!aimed) return unsupported("harm aimed at itself");
      return { ...base, mechanism: effect.mechanism, support: "harm" };
    case "displace":
      if (!aimed) return unsupported("displacement aimed at itself");
      return { ...base, mechanism: "impact", support: "displace" };
    case "protect":
      if (aimed) return unsupported("protection only guards its user here");
      return { ...base, support: "protect" };
    case "restore":
      if (aimed) return unsupported("restoration would mend a foe");
      return { ...base, support: "restore" };
    case "status": {
      const status = effect.status ?? "condition";
      if (!aimed) return { ...unsupported(`${status} on itself is not read yet`), status };
      if (BINDING.has(status)) return { ...base, status, support: "bind" };
      return { ...unsupported(`${status} is not read yet`), status };
    }
    case "remove":
      return unsupported("nothing to remove yet");
  }
}

/** Any supported effect makes a move usable (contract decision 9). */
export const usable = (move: Move) =>
  move.effects.some((e) => e.support !== "unsupported");
/** A move that can take health from a foe: harm or displace. Desperate strike appears only when none is legal. */
export const damaging = (move: Move) =>
  move.effects.some((e) => e.support === "harm" || e.support === "displace");

/** The exhaustion-only option. Approach closing so binding blocks it, as restraint always has. */
export const LAST_RESORT: Move = {
  key: "desperate-strike",
  name: "Desperate strike",
  signature: false,
  approach: "closing",
  range: "contact",
  preparation: "brief",
  recovery: "repeatable",
  fallback: true,
  effects: [
    {
      key: "outcome",
      type: "harm",
      recipient: "target",
      likelihood: "consistent",
      intensity: DESPERATE_STRIKE_DAMAGE,
      mechanism: "impact",
      support: "harm",
    },
  ],
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const freshState = (moves: Move[]) => ({
  cooldowns: moves.map(() => 0),
  signatureSpent: false,
  bound: 0,
  ward: false,
  charge: null,
  chargeMove: -1,
  recovery: 0,
});

/** A companion from a v5 record. Four actions in record order; the signature action is flagged. */
export function readCompanion(
  record: CreatureRecord,
  id: string,
  name = capitalize(record.species)
): Unit {
  const a = record.attributes;
  const hp = Math.round(
    mean(a.vitality, a.endurance, a.resilience) * HP_SCALE
  );
  const moves: Move[] = record.actions.map((action) => ({
    key: action.key,
    name: action.name,
    signature:
      record.signature.type === "action" && record.signature.key === action.key,
    approach:
      action.delivery.mode === "self" ? "self" : action.delivery.approach,
    range: action.spatial.range ?? "none",
    // Actions always carry timing (the schema requires it); the type is shared with passives.
    preparation: action.timing?.preparation ?? "brief",
    recovery: action.timing?.recovery ?? "repeatable",
    ...(action.element ? { element: action.element } : {}),
    effects: action.effects.map(readEffect),
  }));
  return {
    id,
    species: record.species,
    name,
    element: record.element,
    enemy: false,
    hp,
    max: hp,
    speed: Math.round(mean(a.agility, a.reflex) * SPEED_SCALE),
    attrs: { strength: a.strength, willpower: a.willpower },
    moves,
    ...freshState(moves),
  };
}

/** A facility machine from its card. Same Move shape, same support readings; HP may be overridden by the room roster. */
export function readCard(
  card: Card,
  species: string,
  id: string,
  name: string,
  hp = card.hp
): Unit {
  const moves: Move[] = card.moves.map((m) => ({
    key: m.key,
    name: m.name,
    signature: false,
    approach: m.approach,
    range: m.range,
    preparation: m.preparation,
    recovery: m.recovery,
    ...(m.element ? { element: m.element } : {}),
    effects: m.effects.map(readEffect),
  }));
  return {
    id,
    species,
    name,
    element: card.element,
    enemy: !!card.enemy,
    hp,
    max: hp,
    speed: card.speed,
    attrs: { ...card.attrs },
    moves,
    ...freshState(moves),
  };
}
