import React from "react";
import { Shield, ChevronUp, ChevronDown, Swords, Ban, Zap } from "lucide-react";
import { Portrait } from "../powerworksVisuals";
import type { EnemyView, Marks, SquadView } from "./view";

/**
  Shield, boost and hinder chips shared by every plate (Marks: shield, boost, hinder).
  Kind-coded by icon, not by good/bad-for-the-player color (paint review round 3, item 3):
  the same neutral ink on a squad plate's shield and an enemy plate's boost or hinder, since
  a chip describes what condition the unit carries, not who it favors. Hinder uses the
  swords icon everywhere (blind readers read the chain-link as "turns" or "stacks", not
  "weakens an attack" — paint review round 4, item 1): the swords say "this is about a
  hit", and the minus sign says which way.

  Renders bare chips (no wrapping row of its own): the caller places them, together with
  the enemy hit chip, inside one shared .pwt-marks row so a plaque's chip line never grows
  to a second row and pushes the plate taller than its fixed figure band (paint review
  round 5, item 1).
*/
export function MarkChips({ marks }: { marks: Marks }) {
  if (!marks.shield && !marks.boost && !marks.hinder) return null;
  return (
    <>
      {marks.shield > 0 && (
        <span className="pwt-chip" aria-label={`shield ${marks.shield}`} title={`Shield ${marks.shield}`}>
          <Shield />
          {marks.shield}
        </span>
      )}
      {marks.boost > 0 && (
        <span
          className="pwt-chip"
          aria-label={`next attack +${marks.boost}`}
          title={`Next attack +${marks.boost}`}
        >
          <Zap />+{marks.boost}
        </span>
      )}
      {marks.hinder > 0 && (
        <span
          className="pwt-chip"
          aria-label={`its next hit -${marks.hinder}`}
          title={`Its next hit -${marks.hinder}`}
        >
          <Swords />-{marks.hinder}
        </span>
      )}
    </>
  );
}

function HealthBar({ hp, max }: { hp: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
  return (
    <div className="pwt-health">
      <div
        className="pwt-health-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={hp}
      >
        <span
          className={`pwt-health-fill ${hp / Math.max(1, max) < 0.3 ? "critical" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="pwt-health-num">{hp}</span>
    </div>
  );
}

/**
  The species this page treats as the boss: the Control chamber's Central guardian, the
  largest painted art (v5's .pw-scene-unit.guardian towers it the same way). A fixed,
  role-sized height, not the plaque's content, decides the figure's size (paint review
  round 4).
*/
const isBoss = (species: string) => species === "guardian";

/** The full-figure standing on the stage floor (v5's pw-scene-character proportions). */
function Figure({
  art,
  element,
  letter,
}: {
  art: string;
  element: string;
  letter?: string;
}) {
  return (
    <div className={`pwt-figure ${isBoss(art) ? "boss" : ""}`} data-unit-figure="">
      {letter && <span className="pwt-letter">{letter}</span>}
      <Portrait u={{ species: art, element }} />
    </div>
  );
}

export function SquadPlate({ u, lit = false }: { u: SquadView; lit?: boolean }) {
  const hasMarks = u.shield > 0 || u.boost > 0 || u.hinder > 0;
  return (
    <div
      className={`pwt-plate ${u.down ? "down" : ""} ${u.active ? "active" : ""} ${lit ? "lit" : ""}`}
      data-unit={u.id}
    >
      <Figure art={u.art} element={u.element} />
      <span className="pwt-ground" aria-hidden="true" />
      <div className="pwt-plaque">
        <span className="pwt-name">{u.name}</span>
        <HealthBar hp={u.hp} max={u.max} />
        {hasMarks && (
          <div className="pwt-marks">
            <MarkChips marks={u} />
          </div>
        )}
      </div>
    </div>
  );
}

export function EnemyPlate({
  u,
  lit = false,
  activeName,
}: {
  u: EnemyView;
  lit?: boolean;
  /** The active companion's name, for the hit chip's words (paint review round 4, item 6). */
  activeName?: string;
}) {
  const hit = u.hitOnActive;
  const who = activeName ?? "the active companion";
  const showHit = !!hit && !u.down;
  const hasMarks = u.shield > 0 || u.boost > 0 || u.hinder > 0 || showHit;
  return (
    <div className={`pwt-plate ${u.down ? "down" : ""} ${lit ? "lit" : ""}`} data-unit={u.id}>
      <Figure art={u.art} element={u.element} letter={u.letter} />
      <span className="pwt-ground" aria-hidden="true" />
      <div className="pwt-plaque">
        <span className="pwt-name">
          {u.letter} · {u.name}
        </span>
        <HealthBar hp={u.hp} max={u.max} />
        {hasMarks && (
          <div className="pwt-marks">
            <MarkChips marks={u} />
            {showHit && (
              <span
                className="pwt-hit-on-active"
                aria-label={
                  hit!.step === 0
                    ? `hits ${who} for no effect`
                    : `hits ${who} for ${hit!.n}${
                        hit!.step > 1 ? ", strong" : hit!.step < 1 ? ", weak" : ""
                      }`
                }
                title={
                  hit!.step === 0
                    ? `Hits ${who} for no effect`
                    : `Hits ${who} for ${hit!.n}${
                        hit!.step > 1 ? " (strong)" : hit!.step < 1 ? " (weak)" : ""
                      }`
                }
              >
                <Swords />
                {hit!.step === 0 ? <Ban /> : hit!.n}
                {hit!.step > 1 && <ChevronUp className="up" />}
                {hit!.step > 0 && hit!.step < 1 && <ChevronDown className="down" />}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
