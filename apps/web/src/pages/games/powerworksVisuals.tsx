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
} from "lucide-react";
import type { Move, Unit } from "@xalians/rules/dungeon";
export const shortName = (u: Unit) =>
  ({
    crawler: "Crawler",
    drone: "Drone",
    shield: "Bulwark",
    discharge: "Capacitor",
    guardian: "Guardian",
  }[u.species] || u.name);
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
export function MoveIcon({
  move,
  signature = false,
}: {
  move: Move;
  signature?: boolean;
}) {
  const Icon =
    move.kind === "snare"
      ? Link2
      : move.kind === "ward"
      ? Shield
      : move.kind === "charge"
      ? Zap
      : signature
      ? Crown
      : move.range === "ranged"
      ? Crosshair
      : Swords;
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
export function moveDescription(move: Move) {
  return `${move.range === "ranged" ? "Ranged attack" : "Melee attack"}. ${
    move.kind === "snare"
      ? "Restrains melee through one action opportunity."
      : move.kind === "ward"
      ? "Shields against incoming damage."
      : `${move.damage} base power.`
  }${move.kind === "fallback" ? " Costs 2 health in recoil." : ""}`;
}
export function MoveCardContent({
  move,
  signature,
  uses,
  limit,
  selected,
  blocked,
  id,
}: {
  move: Move;
  signature: boolean;
  uses: number | null;
  limit: number;
  selected: boolean;
  blocked: boolean;
  id: string;
}) {
  const Range = move.range === "ranged" ? Crosshair : Swords;
  const control = move.kind === "snare";
  const ward = move.kind === "ward";
  return (
    <>
      <span className="pw-card-identity">
        <span className="pw-card-category" aria-hidden="true">
          <Range />
          {signature && (
            <>
              <Crown />
              Signature
            </>
          )}
        </span>
        <strong>{move.name}</strong>
      </span>
      <span
        className={`pw-card-effect ${control ? "control" : ""}`}
        title={moveDescription(move)}
        aria-hidden="true"
      >
        {control ? <Link2 /> : ward ? <Shield /> : <PowerIcon />}
        <b>{control ? 1 : ward ? "½" : move.damage}</b>
        {control && <small>action</small>}
        {ward && <small>damage</small>}
      </span>
      <span className="pw-card-resource" aria-hidden="true">
        <span className="pw-card-state">
          {blocked ? (
            <>
              <Link2 />
              Restrained
            </>
          ) : uses === 0 ? (
            "Exhausted"
          ) : selected ? (
            <>
              <Check />
              Selected
            </>
          ) : (
            "Uses"
          )}
        </span>
        <span className="pw-card-charges">
          {uses === null
            ? "∞"
            : Array.from({ length: limit }, (_, n) => (
                <i key={n} className={n < uses ? "full" : ""} />
              ))}
        </span>
        {move.kind === "fallback" && (
          <span className="pw-card-recoil">
            <RotateCcw />
            −2 HP
          </span>
        )}
      </span>
      <span className="pw-sr" id={id}>
        {moveDescription(move)}
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
          title="Releases a powerful melee attack at its next opportunity"
        >
          <Zap />
          Charged
        </span>
      )}
      {!!u.snared && (
        <span
          className="pw-status-badge snared"
          title="Melee blocked through the next action opportunity; ranged moves still work"
        >
          <Link2 />
          Restrained
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
