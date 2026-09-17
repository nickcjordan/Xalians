import React, { useId } from "react";
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
import graviclaw from "../../svg/species/graviclaw.svg?url";
import avilily from "../../svg/species/avilily.svg?url";
import crystorn from "../../svg/species/crystorn.svg?url";
import hippochamp from "../../svg/species/hippochamp.svg?url";

const portraits: Record<string, string> = {
  graviclaw,
  avilily,
  crystorn,
  hippochamp,
};
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
      className={`pw-portrait el-${u.element} ${small ? "small" : ""}`}
      aria-hidden="true"
    >
      {u.enemy ? (
        <Machine species={u.species} />
      ) : (
        <span
          className="pw-creature-art"
          style={{
            maskImage: `url(${portraits[u.species]})`,
            WebkitMaskImage: `url(${portraits[u.species]})`,
          }}
        />
      )}
    </span>
  );
}
export function Machine({ species }: { species: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 220 150"
      className={`pw-machine ${species}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x2=".8" y2="1">
          <stop stopColor="#688387" />
          <stop offset=".45" stopColor="#304b55" />
          <stop offset="1" stopColor="#11232e" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="136" rx="76" ry="8" fill="#08121d" opacity=".55" />
      <g
        fill={`url(#${id})`}
        stroke="#9aafb3"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        {species === "crawler" && (
          <>
            <path
              d="M63 91 33 99 14 124M88 104 62 118 56 133M157 91 187 99 206 124M132 104 158 118 164 133"
              strokeWidth="6"
            />
            <path d="M52 75 80 57H142L171 78 151 112H72Z" />
            <path d="m69 65 15-25 42 4 22 18Z" />
            <path d="m37 91-18-19 4-17M180 90l20-18-4-17" strokeWidth="5" />
            <path d="m82 88 15-10h31l15 10-15 12H97Z" className="core" />
            <path d="M91 62h34M88 68h40" />
          </>
        )}
        {species === "drone" && (
          <>
            <path d="M72 54 26 34 8 62 64 91ZM148 54l46-20 18 28-56 29Z" />
            <path
              d="m20 61 37 10M200 61l-37 10"
              stroke="#85d7f0"
              strokeWidth="5"
            />
            <path d="m72 48 38-18 38 18v47l-38 20-38-20Z" />
            <circle cx="110" cy="70" r="23" />
            <circle cx="110" cy="70" r="12" className="core" />
            <path d="M110 29V9M97 12h26M94 114l-5 14M126 114l5 14" />
          </>
        )}
        {species === "shield" && (
          <>
            <path
              d="M52 115 46 135H82l7-18M137 116l2 19h35l-6-22"
              strokeWidth="5"
            />
            <path d="m54 32 56-17 56 17 16 50-20 40-52 16-52-16-20-40Z" />
            <path
              d="m67 42 43-13 43 13 12 39-19 30-36 13-36-13-19-30Z"
              fill="#385761"
            />
            <path d="m110 39 31 13v30l-31 28-31-28V52Z" className="core" />
            <path d="M110 49v46M89 70h42" stroke="#e5ebbf" strokeWidth="5" />
          </>
        )}
        {species === "discharge" && (
          <>
            <path d="M73 108 45 133M147 108l28 25" strokeWidth="7" />
            <path d="M75 32h70l8 86H67Z" />
            <path d="M65 42H46v51h22M155 42h19v51h-22" />
            <path
              d="M40 39h30M40 50h30M40 61h30M40 72h30M40 83h30M150 39h30M150 50h30M150 61h30M150 72h30M150 83h30"
              stroke="#a5caca"
              strokeWidth="4"
            />
            <path d="m113 39-20 39h18l-5 28 25-45h-19Z" className="core" />
            <path d="M95 31V14h30v17" />
          </>
        )}
        {species === "guardian" && (
          <>
            <path
              d="M75 107 56 130H24l8-19 29-25M145 107l19 23h32l-8-19-29-25"
              strokeWidth="8"
            />
            <path d="m61 40-33 6-17 33 29 19 23-24M159 40l33 6 17 33-29 19-23-24" />
            <path d="m65 32 22-20h46l22 20 11 72-26 24H80l-26-24Z" />
            <path d="M76 31 66 9l29 7M144 31l10-22-29 7" fill="#b18a51" />
            <circle cx="110" cy="72" r="31" stroke="#dab579" strokeWidth="5" />
            <circle cx="110" cy="72" r="22" className="core" />
            <path
              d="m114 49-17 29h16l-7 20 21-32h-16Z"
              fill="#ffefb1"
              stroke="#ffefb1"
            />
            <path d="M24 65h26M170 65h26" stroke="#edb872" strokeWidth="6" />
          </>
        )}
      </g>
    </svg>
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
