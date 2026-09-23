import React from "react";
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
  Crown,
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
} from "lucide-react";
import {
  AREA_HARM_FACTOR,
  asMove,
  basePower,
  beneficial,
  BLINDED_RANGED_FACTOR,
  COOLDOWN_ROUNDS,
  DEGRADE_FACTOR,
  DESPERATE_STRIKE_RECOIL,
  FRIGHTENED_OUTPUT_FACTOR,
  LIKELIHOOD_PERCENT,
  MEND_FACTOR,
  reachesOwnSide,
  selfBurst,
  REINFORCED_FACTOR,
  SHIELDED_FACTOR,
  SLOWED_SPEED_FACTOR,
  tickAmount,
  type Condition,
  type Move,
  type MoveEffect,
  type Passive,
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
export const melee = (move: Move) => move.approach === "closing";
export const binds = (move: Move) =>
  move.effects.some((e) => e.support === "bind");
export const guards = (move: Move) =>
  move.effects.some((e) => e.support === "protect");
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
      return "Melee is blocked at its next opportunity, and a charge in progress is dispersed. Ranged actions still work.";
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
    : `${condition.remaining} ${condition.remaining === 1 ? "opp" : "opps"}`;

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

export function ElementIcon({ element }: { element: string }) {
  const Icon =
    (
      {
        dark: Moon,
        plant: Leaf,
        light: Sun,
        water: Droplets,
        sand: Mountain,
        electric: Zap,
      } as const
    )[element as "dark"] || Sun;
  return <Icon size={15} aria-hidden="true" />;
}
export function MoveIcon({ move }: { move: Move }) {
  const Icon = binds(move)
    ? Link2
    : guards(move)
    ? Shield
    : charges(move)
    ? Zap
    : move.signature
    ? Crown
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
export function effectSummary(effect: MoveEffect, move?: Move): string {
  const chance =
    effect.likelihood === "consistent"
      ? ""
      : ` (${LIKELIHOOD_PERCENT[effect.likelihood]}% chance)`;
  // Beneficial effects never reach a foe here (contract decision 35).
  if (move && effect.support !== "unsupported" && beneficial(effect) && !reachesOwnSide(move, effect))
    return `${cap(effect.status ?? effect.type)}: withheld here, because it would help the enemy it reaches.`;
  switch (effect.support) {
    case "harm":
      return `${cap(effect.mechanism ?? "impact")} harm${
        effect.recipient === "area" ? " to everyone it reaches" : ""
      }.`;
    case "displace":
      return "Pulls the target off its footing: breaks a charge and does impact harm.";
    case "bind":
      return `${cap(
        effect.status ?? "bound"
      )}: melee blocked through one action opportunity${chance}.`;
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
          ? `: damage at the start of each of its opportunities`
          : effect.group === "guarding"
          ? `: ${
              status === "protected" ? "a declared protection" : "less damage taken"
            }`
          : effect.group === "attention"
          ? status === "entranced"
            ? ": loses its next opportunity"
            : ": its damage halved"
          : effect.group === "concealment"
          ? ": cannot be targeted while another unit stands"
          : effect.group === "mending"
          ? ": health back each opportunity"
          : effect.group === "shock"
          ? ": loses its next opportunity and any charge"
          : effect.group === "tempo"
          ? status === "sedated"
            ? ": acts last, defenses silent"
            : ": acts at half speed"
          : effect.group === "senses"
          ? status === "disoriented"
            ? ": its next aimed action goes astray"
            : ": its ranged damage halved"
          : "";
      return `${cap(status)}${rule}${lasts}${chance}.`;
    }
    case "remove":
      return `Ends conditions that answer to ${(effect.methods ?? []).join(
        " or "
      )}.`;
    case "protect":
      return "Shields against incoming damage until its next opportunity.";
    case "restore":
      return effect.requires
        ? "Recovers health, only when its harm lands."
        : "Recovers health.";
    default:
      return `${cap(effect.status ?? effect.type)}: no effect here${
        effect.reason ? ` (${effect.reason})` : ""
      }.`;
  }
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
  return `${melee(move) ? "Melee attack" : "Ranged attack"}.${power} ${
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
        {control ? <Link2 /> : ward ? <Shield /> : <PowerIcon />}
        <b>
          {control && !harms(move)
            ? 1
            : ward && !harms(move)
            ? "½"
            : basePower(unit, move)}
        </b>
        {control && !harms(move) && <small>action</small>}
        {ward && !harms(move) && <small>damage</small>}
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
export function Portrait({ u, small = false }: { u: Unit; small?: boolean }) {
  return (
    <span
      className={`pw-portrait el-${u.element} species-${u.species} ${
        small ? "small" : ""
      }`}
      aria-hidden="true"
    >
      <img
        className="pw-painted-art"
        src={`/assets/powerworks/${u.species}.webp`}
        alt=""
        width={512}
        height={512}
        draggable={false}
      />
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
export function Health({ u, estimate = 0 }: { u: Unit; estimate?: number }) {
  const damage = Math.min(u.hp, estimate),
    remaining = ((u.hp - damage) / u.max) * 100;
  return (
    <div className="pw-health">
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
            style={{
              left: `${remaining}%`,
              width: `${(damage / u.max) * 100}%`,
            }}
          />
        )}
      </div>
      <span className="pw-hp-label">
        {u.hp}
        <small> / {u.max}</small>
        {estimate > 0 && <em> −{estimate}?</em>}
      </span>
    </div>
  );
}
