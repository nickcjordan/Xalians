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
  if any of its effects is supported. Since pass 5 an effect is also helpful or
  hostile (decision 38), which decides whether an order may name a squadmate or a
  foe (decision 39).
*/
import type { CreatureRecord, Effect, Protection } from "@xalians/content/creature";
import {
  ATTENTION_OPPORTUNITIES,
  CONTACT_TRIGGER_RANGES,
  COOLDOWN_ROUNDS,
  ONGOING_PASSIVE_DEFAULT_INTENSITY,
  ONGOING_PASSIVE_STATUS,
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
  SENSES_STATUSES,
  SHOCK_OPPORTUNITIES,
  SHOCK_STATUSES,
  SPEED_SCALE,
  STRENGTH_MECHANISMS,
  SUSTAINED_FALLBACK_OPPORTUNITIES,
  TEMPO_STATUSES,
} from "./levers.ts";

export type Approach = "closing" | "stationary" | "self";
export type Range = "contact" | "short" | "medium" | "long" | "none";
export type Preparation = "immediate" | "brief" | "prolonged";
export type Recovery = "repeatable" | "brief" | "prolonged";
export type Likelihood = "consistent" | "likely" | "occasional";
/** The three v5 automatic triggers. A discrete passive carries exactly one (contract decision 22). */
export type Trigger = "contact" | "harmed" | "ally-harmed";
export type Support =
  | "harm"
  | "displace"
  | "protect"
  | "bind"
  | "status"
  | "restore"
  | "remove"
  | "unsupported";
/** The table groups a supported status falls into (contract decision 10; shock, tempo and senses from pass 4, decisions 27 to 31). */
export type StatusGroup =
  | "binding"
  | "degrading"
  | "guarding"
  | "attention"
  | "concealment"
  | "mending"
  | "shock"
  | "tempo"
  | "senses";
/** An area's geometry as the table reads it (contract decision 33). Persistence is not kept: a lingering area applies once at resolution. */
export type Area = {
  shape: "line" | "cone" | "radial" | "sweep";
  extent: "small" | "medium" | "large";
  anchor: "self" | "target" | "location";
};
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
  /** The key of another effect on the same move that must succeed on at least one recipient before this one resolves (contract decision 34): a drain's restore requires its harm. */
  requires?: string;
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
  /** Present when an effect's recipient is `area`: who beyond the target it reaches (contract decision 33). */
  area?: Area;
  /** Signal delivery only: the sense the signal must reach. A blinded unit is immune to statuses from a visual signal (contract decision 30). */
  reception?: "visual" | "auditory";
  effects: MoveEffect[];
  /** Desperate strike only: flat damage, no matchup, recoil. */
  fallback?: true;
};
/**
  One v5 passive as the table reads it (contract decisions 21 to 23).

  `kind` "ongoing" is a passive with no trigger and no timing: it becomes a permanent
  condition on its owner at encounter entry. `kind` "triggered" is a discrete passive:
  it fires on its trigger, after the triggering move finishes, in the owner's name,
  through the same apply path as an action. `cooldown` is its recovery in rounds;
  `support` is "unsupported" with a `reason` when no effect of it is supported.
*/
export type Passive = {
  key: string;
  name: string;
  signature: boolean;
  kind: "ongoing" | "triggered";
  /** Triggered passives only. */
  trigger?: Trigger;
  /** The move-level element classification, for the matchup of an elemental effect. */
  element?: string;
  effects: MoveEffect[];
  /** Triggered passives only: recovery read as rounds through COOLDOWN_ROUNDS. */
  cooldown: number;
  /** Ongoing passives only: the permanent conditions this passive puts on its owner at encounter entry. */
  conditions: Condition[];
  support: "supported" | "unsupported";
  /** Present only when support is "unsupported": the words the table shows. */
  reason?: string;
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
  /** Automatic processes read from record.passives[] or a card's passives[] (contract decisions 21 to 23). */
  passives: Passive[];
  cooldowns: number[];
  /** Rounds remaining per passive, in passives order; an ongoing passive never cools. */
  passiveCooldowns: number[];
  signatureSpent: boolean;
  bound: number;
  ward: boolean;
  /** Every applied condition, including the binding ones mirrored by `bound` (contract decision 11). */
  conditions: Condition[];
  /** Opportunities since this unit was last entranced, for the reapplication guard (contract decision 15). Infinity when it never was. */
  sinceEntranced: number;
  /** Opportunities since this unit was last stunned, for the same guard on shock (contract decision 27). Infinity when it never was. */
  sinceStunned: number;
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
  requires?: string;
};
export type CardPassive = {
  key: string;
  name: string;
  /** A card passive is discrete when it declares a trigger, ongoing when it does not. */
  trigger?: Trigger;
  recovery?: Recovery;
  element?: string;
  effects: CardEffect[];
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
    area?: Area;
    reception?: "visual" | "auditory";
    effects: CardEffect[];
  }[];
  passives?: CardPassive[];
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
const SHOCK = new Set<string>(SHOCK_STATUSES);
const TEMPO = new Set<string>(TEMPO_STATUSES);
const SENSES = new Set<string>(SENSES_STATUSES);
type DegradingStatus = keyof typeof DEGRADING_STATUS_ELEMENTS;

/** Which table group reads a status, or null when the table has no rule for it (contract decisions 10 and 27 to 31). */
export function statusGroup(status: string): StatusGroup | null {
  if (BINDING.has(status)) return "binding";
  if (DEGRADING.has(status)) return "degrading";
  if (GUARDING.has(status)) return "guarding";
  if (ATTENTION.has(status)) return "attention";
  if (CONCEALMENT.has(status)) return "concealment";
  if (MENDING.has(status)) return "mending";
  if (SHOCK.has(status)) return "shock";
  if (TEMPO.has(status)) return "tempo";
  if (SENSES.has(status)) return "senses";
  return null;
}
/** Duration in the victim's opportunities: binding keeps its ruled value, attention and shock are deliberately short, everything else is the lingering table (contract decisions 12 and 27). */
export function statusOpportunities(
  group: StatusGroup,
  duration: "brief" | "prolonged"
): number {
  if (group === "binding") return BINDING_OPPORTUNITIES[duration];
  if (group === "attention") return ATTENTION_OPPORTUNITIES[duration];
  if (group === "shock") return SHOCK_OPPORTUNITIES[duration];
  return LINGERING_OPPORTUNITIES[duration];
}
/** The groups that make sense on their own user when an action aims them there (pass 2, relaxed for concealment by contract decision 32). */
const SELF_GROUPS = new Set<StatusGroup>(["guarding", "mending", "concealment"]);

/**
  The support reading of one effect. Shared by records and cards so the table cannot
  disagree with itself.

  `ongoing` relaxes exactly one pass 2 rule: a status on its own user is refused for an
  action, because an action aimed at itself has no reading here, but an ongoing passive
  targets self by construction (v5 requires it), so decision 21 reads whatever group the
  status falls into. Nothing else about the reading changes.
*/
export function readEffect(
  effect: CardEffect | Effect,
  ongoing = false
): MoveEffect {
  const base: MoveEffect = {
    key: effect.key,
    type: effect.type,
    recipient: effect.recipient,
    likelihood: effect.likelihood,
    intensity: "intensity" in effect && effect.intensity ? effect.intensity : 0,
    ...(effect.requires ? { requires: effect.requires } : {}),
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
    // Aimed protection and restoration are read since pass 5 (contract decisions 39 to 41):
    // an order may name a squadmate, and decision 35 still withholds them from a foe.
    case "protect":
      return { ...base, support: "protect" };
    case "restore":
      return { ...base, support: "restore" };
    case "status": {
      const status = effect.status ?? "condition";
      const group = statusGroup(status);
      if (!group) return { ...unsupported(`${status} is not read here`), status };
      // Guarding, mending and concealment are the groups that make sense on their own
      // user (decision 32 added concealment: Akinza's Night Stalk); an ongoing passive
      // may keep any group on itself (contract decision 21).
      if (!aimed && !ongoing && !SELF_GROUPS.has(group))
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

/**
  A beneficial effect: it guards, mends, focuses, restores or protects whoever receives it
  (contract decision 35). Aimed at a foe it is withheld, never applied.
*/
export const beneficial = (e: MoveEffect) =>
  e.support === "restore" ||
  e.support === "protect" ||
  (e.support === "status" && (e.group === "guarding" || e.group === "mending"));
/**
  Helpful and hostile (contract decision 38). Helpful: restore, protect, remove, and a
  guarding, mending or focused status (focused is in the guarding group). Hostile: harm,
  displace and every other status. `remove` is both: it only clears conditions, so it helps
  a squadmate, and aimed at a foe it strips that foe's guards, so it is also legal there.
  An unsupported effect is neither.
*/
export const helpful = (e: MoveEffect) =>
  e.support !== "unsupported" && (beneficial(e) || e.support === "remove");
export const hostile = (e: MoveEffect) =>
  e.support !== "unsupported" && !beneficial(e) && e.support !== "remove";
/** An effect that reaches the selected target: a target effect, or an area effect, whose recipients always include the target (contract decision 33). */
const reachesTarget = (e: MoveEffect) => e.recipient !== "self";
/**
  Who a move may be aimed at (contract decision 39). A standing squadmate when at least one
  of its target-reaching effects is helpful; a foe when at least one is hostile or is
  `remove`. A move carrying only effects on its performer (Ground Anchor) keeps the nominal
  foe target it has always carried, so nothing about ordering it changes. Area effects count
  as target-reaching because the selected target is always one of an area's recipients.
*/
export const aimsAtSquadmate = (move: Move) =>
  move.effects.some((e) => reachesTarget(e) && helpful(e));
export const aimsAtFoe = (move: Move) =>
  move.fallback === true ||
  move.effects.some((e) => reachesTarget(e) && (hostile(e) || e.support === "remove")) ||
  !move.effects.some((e) => reachesTarget(e) && e.support !== "unsupported");
/** A radial area anchored on its performer: it reaches every foe and the performer's own adjacent allies (contract decision 33). */
export const selfBurst = (move: Move) =>
  move.area?.shape === "radial" && move.area.anchor === "self";
/**
  Any supported effect makes a move usable (contract decision 9). Since pass 5 every
  supported effect has somewhere to land: a self effect on its user, a helpful one on a
  squadmate, a hostile one on a foe (decision 39), so the pass 4 exception for a beneficial
  effect that could only reach a foe is gone. Whether a target stands right now is the
  table's question (`legalTargets`), not the move's.
*/
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

/*
  One passive as the table reads it (contract decisions 21 to 23). The effects get the
  same support readings as a move's, so the resolver cannot treat a reaction differently
  from an action. An ongoing passive additionally resolves its effects into the permanent
  conditions the owner enters an encounter with; a triggered one carries its cooldown.
*/
function readPassive(
  passive: {
    key: string;
    name: string;
    element?: string;
    effects: readonly (CardEffect | Effect)[];
  },
  kind: "ongoing" | "triggered",
  trigger: Trigger | undefined,
  recovery: Recovery | undefined,
  signature: boolean,
  ownerId: string
): Passive {
  const effects = passive.effects.map((effect) =>
    readEffect(effect, kind === "ongoing")
  );
  const conditions =
    kind === "ongoing" ? ongoingConditions(effects, ownerId) : [];
  // Support: an ongoing passive is supported when it yields at least one permanent
  // condition; a triggered one when at least one of its effects is supported.
  const supported =
    kind === "ongoing" ? conditions.length > 0 : effects.some((e) => e.support !== "unsupported");
  const reason = supported
    ? undefined
    : kind === "ongoing"
    ? `nothing here reads ${effects.map((e) => e.type).join(" or ")} as a lasting state`
    : (effects.find((e) => e.reason)?.reason ?? "no effect the table reads");
  return {
    key: passive.key,
    name: passive.name,
    signature,
    kind,
    ...(trigger ? { trigger } : {}),
    ...(passive.element ? { element: passive.element } : {}),
    effects,
    cooldown: kind === "triggered" ? COOLDOWN_ROUNDS[recovery ?? "repeatable"] : 0,
    conditions,
    support: supported ? "supported" : "unsupported",
    ...(reason ? { reason } : {}),
  };
}

/**
  An ongoing passive's effects as permanent conditions on its owner (contract decision 21):
  ongoing restore is `mending`, ongoing protect is `shielded`, and an ongoing status keeps
  the status it declares as long as the table reads its group. `remaining` is Infinity and
  the source is the owner itself, so nothing expires it and `remove` cannot reach it.
*/
export function ongoingConditions(
  effects: readonly MoveEffect[],
  ownerId: string
): Condition[] {
  const conditions: Condition[] = [];
  for (const e of effects) {
    // A status effect already carries its group through the seam; keep it verbatim.
    if ((e.support === "status" || e.support === "bind") && e.group) {
      conditions.push({
        status: e.status ?? "condition",
        group: e.group,
        intensity: e.intensity || ONGOING_PASSIVE_DEFAULT_INTENSITY,
        ...(e.statusElement ? { element: e.statusElement } : {}),
        remaining: Infinity,
        source: ownerId,
        removable: [...(e.removable ?? [])],
        ...(e.protection ? { protection: e.protection } : {}),
      });
      continue;
    }
    // restore and protect become the status their lever names; nothing else has a state.
    const status =
      e.type === "restore" || e.type === "protect"
        ? ONGOING_PASSIVE_STATUS[e.type]
        : null;
    if (!status) continue;
    const group = statusGroup(status);
    if (!group) continue;
    conditions.push({
      status,
      group,
      intensity: e.intensity || ONGOING_PASSIVE_DEFAULT_INTENSITY,
      remaining: Infinity,
      source: ownerId,
      removable: [] as RemovalMethod[],
    });
  }
  return conditions;
}

/** Does this move reach its target by touching it? A `contact` trigger reads exactly these (contract decision 22). */
export const contactDelivery = (move: Move) =>
  (CONTACT_TRIGGER_RANGES as readonly string[]).includes(move.range) &&
  move.approach !== "self";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const freshState = (moves: Move[], passives: Passive[]) => ({
  cooldowns: moves.map(() => 0),
  passiveCooldowns: passives.map(() => 0),
  signatureSpent: false,
  bound: 0,
  ward: false,
  conditions: [] as Condition[],
  sinceEntranced: Infinity,
  sinceStunned: Infinity,
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
    ...(action.spatial.area
      ? {
          area: {
            shape: action.spatial.area.shape,
            extent: action.spatial.area.extent,
            anchor: action.spatial.area.anchor,
          },
        }
      : {}),
    ...(action.delivery.reception ? { reception: action.delivery.reception } : {}),
    effects: action.effects.map((effect) => readEffect(effect)),
  }));
  const passives: Passive[] = record.passives.map((passive) =>
    readPassive(
      passive,
      passive.activation.continuity === "ongoing" ? "ongoing" : "triggered",
      passive.activation.trigger,
      passive.timing?.recovery,
      record.signature.type === "passive" && record.signature.key === passive.key,
      id
    )
  );
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
    passives,
    ...freshState(moves, passives),
    // physiology.protections are permanent guarding conditions of the unit (contract
    // decision 18); an ongoing passive adds its own permanent condition (decision 21).
    conditions: [
      ...innateConditions(record.physiology.protections),
      ...passives.flatMap((p) => p.conditions),
    ],
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
    ...(m.area ? { area: { ...m.area } } : {}),
    ...(m.reception ? { reception: m.reception } : {}),
    effects: m.effects.map((effect) => readEffect(effect)),
  }));
  const passives: Passive[] = (card.passives ?? []).map((passive) =>
    readPassive(
      passive,
      passive.trigger ? "triggered" : "ongoing",
      passive.trigger,
      passive.recovery,
      false,
      id
    )
  );
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
    passives,
    ...freshState(moves, passives),
    conditions: passives.flatMap((p) => p.conditions),
  };
}
