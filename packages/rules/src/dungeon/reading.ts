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
import type { CreatureRecord, Effect, Protection } from "@xalians/content/creature";
import {
  ATTENTION_OPPORTUNITIES,
  ATTENTION_STATUSES,
  BINDING_OPPORTUNITIES,
  BINDING_STATUSES,
  CONCEALMENT_STATUSES,
  DEGRADING_STATUS_ELEMENTS,
  DESPERATE_STRIKE_DAMAGE,
  GUARDING_STATUSES,
  HP_SCALE,
  LINGERING_OPPORTUNITIES,
  MENDING_STATUSES,
  SPEED_SCALE,
  STRENGTH_MECHANISMS,
  SUSTAINED_FALLBACK_OPPORTUNITIES,
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
  | "status"
  | "restore"
  | "remove"
  | "unsupported";
/** The five table groups a supported status falls into (contract decision 10). */
export type StatusGroup =
  | "binding"
  | "degrading"
  | "guarding"
  | "attention"
  | "concealment"
  | "mending";
export type RemovalMethod =
  | "cooling"
  | "smothering"
  | "warming"
  | "cleansing"
  | "detoxifying"
  | "freeing"
  | "stabilizing"
  | "disrupting";
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
  /** Status effects only: which table group reads it (contract decision 10). Binding also keeps support "bind" so pass 1 semantics are unchanged. */
  group?: StatusGroup;
  /** Degrading statuses only: the element its tick is classified as, for the matchup. */
  statusElement?: string;
  /** Status effects only: how many of the victim's opportunities the condition lasts; 0 means sustained by its source unit. */
  opportunities?: number;
  sustained?: boolean;
  /** Status effects only: the methods that end this application (contract decision 17). */
  removable?: RemovalMethod[];
  /** `protected` only: its declared descriptor, applied exactly (contract decision 14). */
  protection?: Protection;
  /** `remove` effects only: the methods this effect carries; it ends conditions whose removable list intersects them. */
  methods?: RemovalMethod[];
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
/**
  One applied condition on a unit (contract decision 11). Reapplying the same status
  refreshes `remaining` and keeps the higher intensity; nothing stacks additively.
  `remaining` counts the victim's own opportunities. A permanent condition
  (physiology.protections) has remaining Infinity and no source.
*/
export type Condition = {
  status: string;
  group: StatusGroup;
  intensity: number;
  /** Degrading only: the element its tick is classified as. */
  element?: string;
  remaining: number;
  /** The unit that applied it; "innate" for a physiology protection. A sustained condition ends when its source falls. */
  source: string;
  sustained?: boolean;
  removable: RemovalMethod[];
  protection?: Protection;
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
  /** Every applied condition, including the binding ones mirrored by `bound` (contract decision 11). */
  conditions: Condition[];
  /** Opportunities since this unit was last entranced, for the reapplication guard (contract decision 15). Infinity when it never was. */
  sinceEntranced: number;
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
  /** Status cards carry the same persistence and duration words a record does. */
  persistence?: "resolved" | "sustained" | "lingering";
  duration?: "brief" | "prolonged";
  removable?: RemovalMethod[];
  protection?: Protection;
  methods?: RemovalMethod[];
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

const DEGRADING = new Set<string>(Object.keys(DEGRADING_STATUS_ELEMENTS));
const GUARDING = new Set<string>(GUARDING_STATUSES);
const ATTENTION = new Set<string>(ATTENTION_STATUSES);
const CONCEALMENT = new Set<string>(CONCEALMENT_STATUSES);
const MENDING = new Set<string>(MENDING_STATUSES);
type DegradingStatus = keyof typeof DEGRADING_STATUS_ELEMENTS;

/** Which of the five table groups reads a status, or null when the table has no rule for it (contract decision 10). */
export function statusGroup(status: string): StatusGroup | null {
  if (BINDING.has(status)) return "binding";
  if (DEGRADING.has(status)) return "degrading";
  if (GUARDING.has(status)) return "guarding";
  if (ATTENTION.has(status)) return "attention";
  if (CONCEALMENT.has(status)) return "concealment";
  if (MENDING.has(status)) return "mending";
  return null;
}
/** Duration in the victim's opportunities: binding keeps its ruled value, attention is deliberately short, everything else is the lingering table (contract decision 12). */
export function statusOpportunities(
  group: StatusGroup,
  duration: "brief" | "prolonged"
): number {
  if (group === "binding") return BINDING_OPPORTUNITIES[duration];
  if (group === "attention") return ATTENTION_OPPORTUNITIES[duration];
  return LINGERING_OPPORTUNITIES[duration];
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
      const group = statusGroup(status);
      if (!group) return { ...unsupported(`${status} is not read here`), status };
      // Guarding and mending are the two groups that make sense on their own user.
      if (!aimed && group !== "guarding" && group !== "mending")
        return { ...unsupported(`${status} on itself is not read here`), status };
      const removable = ("removable" in effect ? effect.removable : undefined) as
        | RemovalMethod[]
        | undefined;
      const protection = ("protection" in effect ? effect.protection : undefined) as
        | Protection
        | undefined;
      if (status === "protected" && !protection)
        return { ...unsupported("protected without a declared scope"), status };
      const persistence = "persistence" in effect ? effect.persistence : "lingering";
      const duration =
        ("duration" in effect && effect.duration ? effect.duration : undefined) ?? "brief";
      const sustained = persistence === "sustained";
      return {
        ...base,
        status,
        group,
        ...(group === "degrading"
          ? { statusElement: DEGRADING_STATUS_ELEMENTS[status as DegradingStatus] }
          : {}),
        opportunities: sustained
          ? SUSTAINED_FALLBACK_OPPORTUNITIES
          : statusOpportunities(group, duration),
        sustained,
        removable: removable ? [...removable] : [],
        ...(protection ? { protection } : {}),
        support: group === "binding" ? "bind" : "status",
      };
    }
    case "remove": {
      const methods = ("methods" in effect ? effect.methods : undefined) as
        | RemovalMethod[]
        | undefined;
      if (!methods || !methods.length) return unsupported("no removal methods");
      return { ...base, methods: [...methods], support: "remove" };
    }
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

/** physiology.protections[] as permanent guarding conditions (contract decision 18). */
export function innateConditions(protections: readonly Protection[]): Condition[] {
  return protections.map((protection) => ({
    status: "protected",
    group: "guarding" as const,
    intensity: 50,
    remaining: Infinity,
    source: "innate",
    removable: [] as RemovalMethod[],
    protection,
  }));
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const freshState = (moves: Move[]) => ({
  cooldowns: moves.map(() => 0),
  signatureSpent: false,
  bound: 0,
  ward: false,
  conditions: [] as Condition[],
  sinceEntranced: Infinity,
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
    // physiology.protections are permanent guarding conditions of the unit (contract decision 18).
    conditions: innateConditions(record.physiology.protections),
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
