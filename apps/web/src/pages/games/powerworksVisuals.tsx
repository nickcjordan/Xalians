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
} from "lucide-react";
import {
  basePower,
  COOLDOWN_ROUNDS,
  DESPERATE_STRIKE_RECOIL,
  LIKELIHOOD_PERCENT,
  type Move,
  type MoveEffect,
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
/** One sentence per effect, from its support reading. Unsupported effects are named and say so. */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function effectSummary(effect: MoveEffect): string {
  const chance =
    effect.likelihood === "consistent"
      ? ""
      : ` (${LIKELIHOOD_PERCENT[effect.likelihood]}% chance)`;
  switch (effect.support) {
    case "harm":
      return `${cap(effect.mechanism ?? "impact")} harm.`;
    case "displace":
      return "Pulls the target off its footing: breaks a charge and does impact harm.";
    case "bind":
      return `${cap(
        effect.status ?? "bound"
      )}: melee blocked through one action opportunity${chance}.`;
    case "protect":
      return "Shields against incoming damage until its next opportunity.";
    case "restore":
      return "Recovers health.";
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
  return `${melee(move) ? "Melee attack" : "Ranged attack"}.${power} ${move.effects
    .filter((e) => e.support !== "harm")
    .map(effectSummary)
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
      <span className="pw-card-identity">
        <span className="pw-card-category" aria-hidden="true">
          <Range />
          {move.signature && (
            <>
              <Crown />
              Signature
            </>
          )}
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
            "Cooldown"
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
      {!!u.bound && (
        <span
          className="pw-status-badge snared"
          title="Melee blocked through the next action opportunity; ranged moves still work"
        >
          <Link2 />
          Bound
        </span>
      )}
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
