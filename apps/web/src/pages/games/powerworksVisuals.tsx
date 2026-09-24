import React from "react";
import XalianImageJs from "@/components/xalianImage";
/** The site's species portrait component. Its JavaScript defaults type `fill` and `padding` as undefined, so it is widened here. */
const XalianImage = XalianImageJs as unknown as React.ComponentType<{
  variant?: "portrait" | "token";
  speciesName: string;
  primaryType: string;
  padding?: string;
  fill?: string;
  unPadded?: boolean;
  moreClasses?: string;
}>;
import {
  Crosshair,
  Swords,
  Link2,
  Shield,
  Zap,
  Moon,
  Leaf,
  Sun,
  Droplets,
  Mountain,
  RotateCcw,
  Check,
  Hourglass,
  Flame,
  EyeOff,
  Sparkles,
  HeartPulse,
  Infinity as Infinite,
  Undo2,
  ZapOff,
  Snail,
  ScanEye,
  Users,
  Wind,
  Snowflake,
  Pickaxe,
  Cog,
  FlaskConical,
  Ghost,
  Brain,
  Skull,
  Ban,
  Magnet,
} from "lucide-react";
import {
  AREA_HARM_FACTOR,
  asMove,
  basePower,
  BLINDED_RANGED_FACTOR,
  COOLDOWN_ROUNDS,
  DEGRADE_FACTOR,
  DESPERATE_STRIKE_RECOIL,
  FRIGHTENED_OUTPUT_FACTOR,
  LIKELIHOOD_PERCENT,
  MEND_FACTOR,
  helpful,
  restorePreview,
  selfBurst,
  REINFORCED_FACTOR,
  SHIELDED_FACTOR,
  SLOWED_SPEED_FACTOR,
  tickAmount,
  type Condition,
  type Move,
  type MoveEffect,
  type Passive,
  type RemovalMethod,
  type StatusGroup,
  type Unit,
} from "@xalians/rules/dungeon";
export const shortName = (u: Unit) =>
  ({
    crawler: "Crawler",
    drone: "Drone",
    shield: "Bulwark",
    discharge: "Capacitor",
    guardian: "Guardian",
  }[u.species] || u.name);
/** Reach: a melee move touches its target (range contact); everything else is ranged. The words and the icons follow this. */
export const melee = (move: Move) => move.range === "contact";
/** Approach: a move that closes in on its target. This, not reach, is what binding blocks (contract decision 4). */
export const closes = (move: Move) => move.approach === "closing";
export const binds = (move: Move) =>
  move.effects.some((e) => e.support === "bind");
export const guards = (move: Move) =>
  move.effects.some((e) => e.support === "protect");
/** A move that can do something for a squadmate: restore, protect, remove or a guarding or mending status aimed past its user (contract decision 39). */
export const helps = (move: Move) =>
  move.effects.some((e) => helpful(e) && e.recipient !== "self");
export const harms = (move: Move) =>
  move.effects.some((e) => e.support === "harm" || e.support === "displace");
export const charges = (move: Move) => move.preparation === "prolonged";
/** The generated name before its parenthetical qualifiers: what a move card shows. The full name stays in labels and the inspector. */
export const baseName = (move: Move) => move.name.split(" (")[0];
/** Cooldown pips a card shows: the move's recovery in rounds; none for a repeatable move. */
export const cooldownLimit = (move: Move) => COOLDOWN_ROUNDS[move.recovery];
/** One icon per condition group, so the groups are told apart at a glance. */
export function GroupIcon({ group }: { group: StatusGroup }) {
  const Icon = (
    {
      binding: Link2,
      degrading: Flame,
      guarding: Shield,
      attention: Sparkles,
      concealment: EyeOff,
      mending: HeartPulse,
      shock: ZapOff,
      tempo: Snail,
      senses: ScanEye,
    } as const
  )[group];
  return <Icon aria-hidden="true" />;
}
const percent = (factor: number) => `${Math.round((1 - factor) * 100)}%`;
/** The share of a degrading condition's intensity that becomes damage each opportunity. */
export const degradeShare = percent(1 - DEGRADE_FACTOR);
/** What this condition does to this unit, in plain words. The inspector shows it verbatim. */
export function conditionRule(condition: Condition, u: Unit): string {
  switch (condition.group) {
    case "binding":
      return "Moves that close in on a target are blocked at its next opportunity, and a charge in progress is dispersed. Moves made from where it stands still work, at any reach.";
    case "degrading": {
      const amount = tickAmount(condition, u);
      return `Takes ${amount} damage at the start of each of its own opportunities. Shields do not reduce it.`;
    }
    case "guarding":
      if (condition.status === "shielded")
        return `Incoming damage is reduced by ${percent(SHIELDED_FACTOR)}. This does not stack with a shield from an action: the stronger one applies.`;
      if (condition.status === "reinforced")
        return `Incoming damage is reduced by ${percent(REINFORCED_FACTOR)}.`;
      if (condition.status === "focused")
        return "Attention cannot be taken: trances and fear do not apply.";
      return protectionRule(condition);
    case "attention":
      return condition.status === "entranced"
        ? "Loses its next opportunity: the order it committed is not carried out. A charge in progress survives."
        : `Its own damage is reduced by ${percent(FRIGHTENED_OUTPUT_FACTOR)} through its next opportunity.`;
    case "concealment":
      return "Cannot be chosen as a target while another unit stands. Attacking gives its position away and ends this.";
    case "mending": {
      const amount = Math.floor((condition.intensity / 10) * MEND_FACTOR);
      return `Recovers ${amount} HP at the start of each of its own opportunities.`;
    }
    case "shock":
      return "Loses its next opportunity, and a charge in progress is broken. Focus does not prevent it.";
    case "tempo":
      return condition.status === "sedated"
        ? "Acts after every alert unit, and its automatic defenses do not answer."
        : `Acts at ${Math.round(SLOWED_SPEED_FACTOR * 100)}% of its speed in the turn order (${Math.floor(
            u.speed * SLOWED_SPEED_FACTOR
          )} instead of ${u.speed}).`;
    case "senses":
      return condition.status === "disoriented"
        ? "Its next aimed action goes to a random enemy instead of the one it chose."
        : `Its ranged damage is reduced by ${percent(BLINDED_RANGED_FACTOR)}; contact attacks are unaffected. Signals that must be seen cannot reach it.`;
  }
}
function protectionRule(condition: Condition): string {
  const p = condition.protection;
  if (!p) return "Carries a declared protection.";
  const degree = p.degree === "immune" ? "Immune to" : "Resistant to";
  if (p.type === "displace")
    return `${degree} being moved: a pull or a shove neither harms it nor breaks its charge.`;
  if (p.type === "status") return `${degree} ${p.status}.`;
  return `${degree} ${
    p.mechanism === "elemental" ? `${p.element} damage` : `${p.mechanism} damage`
  }.`;
}
/** Remaining opportunities, as the badge prints it. A permanent condition has none. */
export const remainingLabel = (condition: Condition) =>
  condition.remaining === Infinity
    ? "always"
    : `${condition.remaining} ${condition.remaining === 1 ? "opportunity" : "opportunities"}`;

/** The heading a passive sits under: it answers an event, or it is simply always on (contract decision 25). */
export const passiveHeading = (passive: Passive) =>
  passive.kind === "triggered" ? "Reacts" : "Always";
/** One icon per passive kind: a reply, or a standing state. */
export function PassiveIcon({ passive }: { passive: Passive }) {
  const Icon = passive.kind === "triggered" ? Undo2 : Infinite;
  return <Icon aria-hidden="true" />;
}
/**
  What a passive does, in plain words, with no order revealed: a reaction names its
  trigger and its cooldown, an ongoing one names the state it keeps (contract decision 25).
*/
export function passiveRule(unit: Unit, passive: Passive): string {
  if (passive.support === "unsupported")
    return `No effect here${passive.reason ? ` (${passive.reason})` : ""}.`;
  if (passive.kind === "ongoing")
    return `Always active. ${passive.conditions
      .map((condition) => conditionRule(condition, unit))
      .join(" ")}`;
  const when =
    passive.trigger === "contact"
      ? "When something strikes it in contact range"
      : passive.trigger === "harmed"
      ? "When it loses health to an attack"
      : "When an ally beside it loses health to an attack";
  // The cadence its recovery buys, in the player's words rather than in rounds
  // (COOLDOWN_ROUNDS: repeatable 0, brief 1, prolonged 2).
  const cools =
    passive.cooldown >= COOLDOWN_ROUNDS.prolonged
      ? " Answers every other round."
      : passive.cooldown >= COOLDOWN_ROUNDS.brief
      ? " Answers once per round."
      : " Answers every time.";
  // The reaction's own harm, on the same curve a move card shows, so the number a
  // contact attacker will take is visible before it touches anything.
  const power = basePower(unit, asMove(passive));
  const harm = power ? ` ${power} base power.` : "";
  const rest = passive.effects
    .filter((e) => e.support !== "harm" && e.support !== "displace")
    .map((e) => effectSummary(e))
    .join(" ");
  return `${when}, it answers automatically.${harm}${
    rest ? ` ${rest}` : ""
  }${cools}`;
}

/** One glyph per element, all fourteen, so a drafted creature of any element reads at a glance (pass 6). */
const ELEMENT_ICONS = {
  dark: Moon,
  plant: Leaf,
  light: Sun,
  water: Droplets,
  sand: Mountain,
  electric: Zap,
  fire: Flame,
  ice: Snowflake,
  air: Wind,
  rock: Pickaxe,
  metal: Cog,
  chemical: FlaskConical,
  ghost: Ghost,
  psychic: Brain,
} as const;
export function ElementIcon({ element }: { element: string }) {
  const Icon = ELEMENT_ICONS[element as keyof typeof ELEMENT_ICONS] || Sun;
  return <Icon size={15} aria-hidden="true" />;
}
/** A move that pulls its target off its footing. */
export const pulls = (move: Move) => move.effects.some((e) => e.support === "displace");
/** A move that heals and does no harm. */
export const heals = (move: Move) =>
  !harms(move) && move.effects.some((e) => e.support === "restore");
/**
  The kind of act a move is, as one icon (round 2): bind, heal, guard, pull, charge, then a
  melee or ranged strike. The signature is marked by the disc's gold rim, never by its icon,
  so a signature still shows what kind of move it is.
*/
export function MoveIcon({ move }: { move: Move }) {
  const Icon = binds(move)
    ? Link2
    : heals(move)
    ? HeartPulse
    : guards(move)
    ? Shield
    : pulls(move)
    ? Magnet
    : charges(move)
    ? Zap
    : melee(move)
    ? Swords
    : Crosshair;
  return <Icon aria-hidden="true" />;
}
export function PowerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 2 2.4 5.8L21 5l-2.8 6.2L23 15l-6.7.8L16 23l-4.8-5-5.7 4 1-7L1 12l6-2-1-7 6 4z" />
    </svg>
  );
}
/**
  Who a move's area reaches, in plain words (contract decision 33), or "" for a move
  without one. The line is the order units stand in on the table.
*/
export function areaSummary(move: Move): string {
  const area = move.area;
  if (!area || !move.effects.some((e) => e.recipient === "area")) return "";
  const share = `Each takes ${Math.round(AREA_HARM_FACTOR * 100)}% of the harm.`;
  const harmed = move.effects.some(
    (e) => e.recipient === "area" && (e.support === "harm" || e.support === "displace")
  );
  const reach =
    area.shape === "radial"
      ? area.anchor === "self"
        ? "Reaches every enemy, and the squadmates standing either side of the user."
        : "Reaches the target and the enemies either side of it."
      : area.extent === "small"
      ? "Reaches the target and the next enemy in line."
      : area.extent === "medium"
      ? "Reaches the target and the enemies either side of it."
      : "Reaches the whole enemy line.";
  return harmed ? `${reach} ${share}` : reach;
}
/** One sentence per effect, from its support reading. Unsupported effects are named and say so. */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/**
  What each removal method is called and which conditions it ends, in plain words. The
  records declare removability on each status they apply (`removable`), so this mirrors that
  data; powerworksVisuals.test checks it against every record in play.
*/
export const REMOVAL_WORDS: Record<RemovalMethod, { verb: string; ends: string[] }> = {
  cooling: { verb: "Cools", ends: ["overheated", "burning"] },
  smothering: { verb: "Smothers", ends: ["burning"] },
  warming: { verb: "Warms", ends: ["chilled", "frozen", "slowed", "shielded"] },
  cleansing: { verb: "Cleanses", ends: ["corroding", "restrained", "blinded"] },
  detoxifying: { verb: "Detoxifies", ends: ["poisoned", "paralyzed"] },
  freeing: { verb: "Frees", ends: ["restrained", "frozen", "buried"] },
  stabilizing: { verb: "Steadies", ends: ["paralyzed", "blinded", "frightened", "stunned"] },
  disrupting: { verb: "Disrupts", ends: ["entranced", "concealed", "protected", "shielded"] },
};
/** "Overheated and Burning", "Blinded, Paralyzed and Stunned". */
const listed = (names: string[]) => {
  const words = names.map(cap);
  return words.length > 1
    ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`
    : words[0] ?? "";
};
/** "Cools: ends Overheated and Burning." for each method a removal carries. */
export function removalWords(methods: RemovalMethod[] = []): string {
  return methods
    .map((m) => {
      const w = REMOVAL_WORDS[m];
      return w ? `${w.verb}: ends ${listed(w.ends)}.` : `Ends what answers to ${m}.`;
    })
    .join(" ");
}
export function effectSummary(effect: MoveEffect, move?: Move): string {
  // The chance leads, so it is never the part a narrow line cuts off (round 2).
  const chance =
    effect.likelihood === "consistent"
      ? ""
      : `${LIKELIHOOD_PERCENT[effect.likelihood]}% chance: `;
  // Since pass 5 a helpful effect that reaches its target is aimed at a squadmate
  // (contract decisions 39 and 40); it is still withheld from an enemy (decision 35).
  const onMate = helpful(effect) && effect.recipient !== "self";
  const mates = effect.recipient === "area" ? "every squadmate it reaches" : "a squadmate";
  switch (effect.support) {
    case "harm":
      return `${cap(effect.mechanism ?? "impact")} harm${
        effect.recipient === "area" ? " to everyone it reaches" : ""
      }.`;
    case "displace":
      return "Pulls the target off its footing: breaks a charge and does impact harm.";
    case "bind":
      return `${chance}${cap(
        effect.status ?? "bound"
      )}, moves that close in are blocked for 1 opportunity.`;
    case "status": {
      const status = effect.status ?? "condition";
      const lasts =
        effect.opportunities && effect.opportunities > 0
          ? ` for ${effect.opportunities} ${
              effect.opportunities === 1 ? "opportunity" : "opportunities"
            }`
          : "";
      const rule =
        effect.group === "degrading"
          ? `, damage at the start of each of its opportunities`
          : effect.group === "guarding"
          ? `, ${
              status === "protected" ? "a declared protection" : "less damage taken"
            }`
          : effect.group === "attention"
          ? status === "entranced"
            ? ", loses its next opportunity"
            : ", its damage halved"
          : effect.group === "concealment"
          ? ", cannot be targeted while another unit stands"
          : effect.group === "mending"
          ? ", health back each opportunity"
          : effect.group === "shock"
          ? ", loses its next opportunity and any charge"
          : effect.group === "tempo"
          ? status === "sedated"
            ? ", acts last, defenses silent"
            : ", half speed"
          : effect.group === "senses"
          ? status === "disoriented"
            ? ", its next aimed action goes astray"
            : ", its ranged damage halved"
          : "";
      return `${chance}${cap(status)}${onMate ? ` on ${mates}` : ""}${rule}${lasts}.`;
    }
    case "remove":
      return `${removalWords(effect.methods)}${effect.recipient === "self" ? " On itself." : ""}`;
    case "protect":
      return onMate
        ? `Shields ${mates}: incoming damage halved until its next opportunity.`
        : "Shields against incoming damage until its next opportunity.";
    case "restore":
      return effect.requires
        ? "Recovers health, only when its harm lands."
        : onMate
        ? `Heals ${mates}.`
        : "Recovers health.";
    default:
      return `${cap(effect.status ?? effect.type)}: no effect here${
        effect.reason ? ` (${effect.reason})` : ""
      }.`;
  }
}
/**
  What kind of act a move is, in words: "Melee attack that closes in", "Ranged attack";
  a move that only helps is a "Touch" or "At range", never an attack (round 2).
*/
export function kindWords(move: Move): string {
  if (move.approach === "self") return "Acts on itself";
  const hostile = harms(move) || move.effects.some((e) => !helpful(e) && e.support !== "unsupported" && e.support !== "remove");
  if (!hostile) return melee(move) ? "Touch" : "At range";
  return `${melee(move) ? "Melee attack" : "Ranged attack"}${closes(move) ? " that closes in" : ""}`;
}
export function moveDescription(u: Unit, move: Move) {
  const power = harms(move) ? ` ${basePower(u, move)} base power.` : "";
  const timing = `${
    charges(move) ? " Charges first, releases at its next opportunity." : ""
  }${
    cooldownLimit(move)
      ? ` ${cooldownLimit(move)} round cooldown.`
      : move.fallback
      ? ""
      : " No cooldown."
  }`;
  const area = areaSummary(move);
  const kind = kindWords(move);
  return `${kind}.${power} ${
    area ? `${area} ` : ""
  }${move.effects
    .filter((e) => e.support !== "harm")
    .map((e) => effectSummary(e, move))
    .join(" ")}${timing}${
    move.fallback ? ` Costs ${DESPERATE_STRIKE_RECOIL} health in recoil.` : ""
  }`
    .replace(/\s+/g, " ")
    .trim();
}
/**
  A move that only acts on its user (Ground Anchor): every effect lands on the performer.
  It keeps the nominal foe target the rules require, but the order needs no target choice
  (radial orders decision 5), and the stage draws no intent line for it.
*/
export const actsOnSelf = (move: Move) =>
  move.effects.length > 0 && move.effects.every((e) => e.recipient === "self");
/** Health a move restores to a squadmate it names, for the card's number. */
const healsFor = (unit: Unit, move: Move) =>
  move.effects
    .filter((e) => e.support === "restore" && e.recipient !== "self")
    .reduce((sum, e) => sum + restorePreview(unit, e), 0);
/**
  The one number a move card and a radial slot show, and what it counts: base power for
  a harmful move, one action for a pure bind, health for a pure heal, half damage for a
  pure shield. `label` is the spoken form ("power 60", "heals 12").
*/
export function moveFigure(unit: Unit, move: Move) {
  const control = binds(move),
    ward = guards(move),
    heal = healsFor(unit, move),
    harm = harms(move);
  if (control && !harm)
    return { value: "1" as string | number, unit: "action", kind: "control" as const, label: "binds 1 action" };
  if (heal && !harm)
    return { value: heal as string | number, unit: "heal", kind: "heal" as const, label: `heals ${heal}` };
  if (ward && !harm)
    return { value: "½" as string | number, unit: "damage", kind: "ward" as const, label: "halves damage" };
  const power = basePower(unit, move);
  // A move with no power of its own (a guard on its user) shows its own icon, not a 0.
  if (!harm && !power) {
    const status = move.effects.find((e) => e.support === "status" && e.status);
    return {
      value: null as string | number | null,
      unit: "",
      kind: "none" as const,
      label: status
        ? `${status.status}${status.recipient === "self" ? " on itself" : ""}`
        : "no power",
    };
  }
  return { value: power as string | number | null, unit: "", kind: "power" as const, label: `power ${power}` };
}
/**
  The icon that stands in for a number when a move has none: its status group's icon (a
  shield for a guard on itself), else the move's own icon.
*/
export function FigureIcon({ move }: { move: Move }) {
  const status = move.effects.find((e) => e.support === "status" && e.group);
  return status?.group ? <GroupIcon group={status.group} /> : <MoveIcon move={move} />;
}
/**
  The move card's reading (round 2), one line per thing it does, none of them clipped: what
  kind of act it is and what it reaches, then each effect besides harm on its own line
  ("75% chance: Slowed, half speed for 2 opportunities."). Power and timing have their own
  lines on the card.
*/
export function cardReading(u: Unit, move: Move): string[] {
  const area = areaSummary(move).split(". ")[0];
  const head = `${kindWords(move)}.${charges(move) ? " Charges first." : ""}${
    area ? ` ${area.replace(/\.?$/, ".")}` : ""
  }`;
  const effects = move.effects
    .filter((e) => e.support !== "harm")
    .map((e) => effectSummary(e, move));
  return [
    head,
    ...effects,
    ...(move.fallback ? [`Costs ${DESPERATE_STRIKE_RECOIL} health.`] : []),
  ];
}
export function MoveCardContent({
  unit,
  move,
  cooldown,
  spent = false,
  selected,
  blocked,
  id,
  fullName = false,
}: {
  unit: Unit;
  move: Move;
  /** Show the whole generated name (the inspector) rather than the base name (the move tray). */
  fullName?: boolean;
  /** Rounds remaining before the move returns; null for a move with no cooldown pips (repeatable, or Desperate strike). */
  cooldown: number | null;
  spent?: boolean;
  selected: boolean;
  blocked: boolean;
  id: string;
}) {
  const Range = melee(move) ? Swords : Crosshair;
  const control = binds(move);
  const ward = guards(move);
  const heal = healsFor(unit, move);
  const limit = cooldownLimit(move);
  const unsupported = move.effects.filter((e) => e.support === "unsupported");
  return (
    <>
      <span
        className={`pw-card-emblem ${control ? "control" : ward ? "ward" : ""}`}
        aria-hidden="true"
      >
        <MoveIcon move={move} />
      </span>
      <span className="pw-card-identity">
        <span className="pw-card-category" aria-hidden="true">
          {(move.signature || control || ward || charges(move)) && <Range />}
          {move.signature && "Signature"}
        </span>
        <strong title={fullName ? undefined : move.name}>
          {fullName ? move.name : baseName(move)}
        </strong>
      </span>
      <span
        className={`pw-card-effect ${control ? "control" : ""}`}
        title={moveDescription(unit, move)}
        aria-hidden="true"
      >
        {moveFigure(unit, move).kind === "none" ? (
          <FigureIcon move={move} />
        ) : control ? (
          <Link2 />
        ) : heal && !harms(move) ? (
          <HeartPulse />
        ) : ward ? (
          <Shield />
        ) : (
          <PowerIcon />
        )}
        {moveFigure(unit, move).value !== null && (
          <b>{moveFigure(unit, move).value}</b>
        )}
        {control && !harms(move) && <small>action</small>}
        {!control && heal > 0 && !harms(move) && <small>heal</small>}
        {!control && !heal && ward && !harms(move) && <small>damage</small>}
        {unsupported.length === move.effects.length && <small>no effect</small>}
      </span>
      <span className="pw-card-resource" aria-hidden="true">
        <span className="pw-card-state">
          {blocked ? (
            <>
              <Link2 />
              Bound
            </>
          ) : spent ? (
            "Spent"
          ) : cooldown ? (
            <>
              <Hourglass />
              Cooling
            </>
          ) : selected ? (
            <>
              <Check />
              Selected
            </>
          ) : (
            cooldown === null || limit === 0 ? "Repeatable" : "Ready"
          )}
        </span>
        <span className="pw-card-charges">
          {cooldown === null || limit === 0
            ? "∞"
            : Array.from({ length: limit }, (_, n) => (
                <i key={n} className={n < limit - cooldown ? "full" : ""} />
              ))}
        </span>
        {move.fallback && (
          <span className="pw-card-recoil">
            <RotateCcw />−{DESPERATE_STRIKE_RECOIL} HP
          </span>
        )}
        {selfBurst(move) && (
          <span className="pw-card-recoil">
            <Users />
            Hits squadmates
          </span>
        )}
      </span>
      <span className="pw-sr" id={id}>
        {moveDescription(unit, move)}
      </span>
    </>
  );
}
/**
  Species with painted Powerworks art: the starter four and the five machines (contract
  decision 50). Every other species is drawn with the site's species silhouette inside the
  same frame; no new art is generated.
*/
export const PAINTED_SPECIES: ReadonlySet<string> = new Set([
  "graviclaw",
  "avilily",
  "crystorn",
  "hippochamp",
  "crawler",
  "drone",
  "shield",
  "discharge",
  "guardian",
]);
export const hasPaintedArt = (species: string) => PAINTED_SPECIES.has(species);
export function Portrait({ u, small = false }: { u: Unit; small?: boolean }) {
  return (
    <span
      className={`pw-portrait el-${u.element} species-${u.species} ${
        small ? "small" : ""
      } ${hasPaintedArt(u.species) ? "" : "silhouette"}`}
      aria-hidden="true"
    >
      {hasPaintedArt(u.species) ? (
        <img
          className="pw-painted-art"
          src={`/assets/powerworks/${u.species}.webp`}
          alt=""
          width={512}
          height={512}
          draggable={false}
        />
      ) : (
        // The site's species portrait component, as Reclamation's figures use it: the
        // token silhouette, filled in the element's own hue so it reads on the dark stage.
        <XalianImage
          variant="token"
          speciesName={u.species}
          primaryType={u.element}
          padding="0px"
          fill={`var(--color-el-${u.element})`}
          unPadded
          moreClasses="pw-species-art"
        />
      )}
    </span>
  );
}
export function StatusBadges({ u }: { u: Unit }) {
  if (u.hp <= 0)
    return (
      <span className="pw-status-badge down">
        <span aria-hidden="true">×</span> Down
      </span>
    );
  return (
    <>
      {!!u.charge && (
        <span
          className="pw-status-badge charged"
          title="Releases a powerful attack at its next opportunity"
        >
          <Zap />
          Charged
        </span>
      )}
      {u.conditions.map((condition) => (
        <span
          key={`${condition.status}-${condition.source}`}
          className={`pw-status-badge condition group-${condition.group}`}
          title={conditionRule(condition, u)}
        >
          <GroupIcon group={condition.group} />
          {condition.status}
          <small>{remainingLabel(condition)}</small>
        </span>
      ))}
      {u.ward && (
        <span
          className="pw-status-badge warded"
          title="Incoming damage halved until this unit’s next opportunity"
        >
          <Shield />
          Guarded
        </span>
      )}
      {!!u.recovery && (
        <span
          className="pw-status-badge recovery"
          title="Cannot start charging at its next opportunity"
        >
          <RotateCcw />
          Recovering
        </span>
      )}
    </>
  );
}
/**
  What the chosen move would do to one unit, drawn on its own health bar while a target is
  being chosen (radial orders round 2): the chunk it would remove, a heal's extension, and
  the number beside the bar. Every figure comes from the rules' preview functions.
*/
export type HealthPreview = {
  damage: number;
  heal: number;
  knockout: boolean;
  guarded: boolean;
  /** The move harms this unit but nothing gets through. */
  immune: boolean;
  /** A squadmate caught by the move's area. */
  danger: boolean;
  /** Another target is being aimed at: this one's preview steps back. */
  muted: boolean;
};
export function Health({
  u,
  estimate = 0,
  preview,
}: {
  u: Unit;
  estimate?: number;
  preview?: HealthPreview | null;
}) {
  const damage = Math.min(u.hp, preview ? preview.damage : estimate),
    heal = preview ? Math.max(0, Math.min(u.max - u.hp, preview.heal)) : 0,
    remaining = ((u.hp - damage) / u.max) * 100;
  // The damage number floats over its chunk like a hit number (round 2), kept on the bar.
  const center = Math.min(
    88,
    Math.max(
      12,
      damage > 0
        ? remaining + (damage / u.max) * 50
        : heal > 0
        ? ((u.hp + heal / 2) / u.max) * 100
        : 50
    )
  );
  const shown = !!preview && (preview.immune || damage > 0 || heal > 0);
  const track = (
      <div
        className="pw-health-track"
        role="meter"
        aria-label={`${u.name} health`}
        aria-valuemin={0}
        aria-valuemax={u.max}
        aria-valuenow={u.hp}
      >
        <span
          style={{ width: `${(u.hp / u.max) * 100}%` }}
          className={u.hp / u.max < 0.3 ? "critical" : ""}
        />
        {damage > 0 && (
          <i
            className={`pw-hp-chunk ${preview?.knockout ? "knockout" : ""}`}
            style={{
              left: `${remaining}%`,
              width: `${(damage / u.max) * 100}%`,
            }}
          />
        )}
        {heal > 0 && (
          <b
            className="pw-hp-heal"
            style={{
              left: `${(u.hp / u.max) * 100}%`,
              width: `${(heal / u.max) * 100}%`,
            }}
          />
        )}
      </div>
  );
  return (
    <div
      className={`pw-health ${preview ? "previewing" : ""} ${
        preview?.muted ? "muted" : ""
      } ${preview?.danger ? "danger" : ""}`}
    >
      {shown ? (
        <div className="pw-health-bar">
          {track}
          <span
            className={`pw-hp-delta ${preview!.knockout ? "knockout" : ""} ${
              heal > 0 && !damage ? "heal" : ""
            } ${preview!.immune ? "immune" : ""}`}
            style={{ left: `${center}%` }}
            aria-hidden="true"
          >
            {preview!.knockout ? (
              <Skull />
            ) : preview!.immune ? (
              <Ban />
            ) : preview!.guarded ? (
              <Shield />
            ) : null}
            {/* The move's own damage, as the card states it; a knockout's chunk is the rest of the bar. */}
            {preview!.immune ? "no effect" : damage > 0 ? `−${preview!.damage}` : `+${heal}`}
          </span>
        </div>
      ) : (
        track
      )}
      <span className="pw-hp-label">
        {u.hp}
        <small> / {u.max}</small>
        {estimate > 0 && <em> −{estimate}?</em>}
      </span>
    </div>
  );
}
/**
  How long a move rests after use, in the player's words: the expanded move card's timing
  line (round 2 replaces the cooldown pips with it).
*/
export function restLine(move: Move): string {
  if (move.fallback) return `Use any round · costs ${DESPERATE_STRIKE_RECOIL} health`;
  const rounds = cooldownLimit(move);
  const rest = rounds
    ? `Rests ${rounds} ${rounds === 1 ? "round" : "rounds"} after use`
    : "Use every round";
  // The signature's once-per-encounter rule (a rules lever the dungeon entry does not
  // re-export), worded as the field guide words it.
  return move.signature ? `${rest} · once per encounter` : rest;
}
