import React from "react";
import { Shield, ChevronUp, ChevronDown, Swords, Ban, Skull, Zap } from "lucide-react";
import { Portrait } from "../powerworksVisuals";
import { DeltaChip, SpotlightMarks } from "./banner";
import type { EnemyView, Marks, SquadView } from "./view";

/**
  The enemy hit's own glyph (UX pass 2, round 5): a jagged burst, an impact. The swords stay the
  hinder's glyph ("its next hit is smaller"), so a plate's hit chip and its hinder chip never share
  a picture. Drawn inline so it takes the chip's ink like a lucide icon does.
*/
export function ImpactMark({ className = "" }: { className?: string }) {
  return (
    <svg className={`pwt-impact ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <polygon
        points="12,1.5 14.6,8.2 21.6,6.4 17.2,12 22.5,16.6 15.4,16.4 14.6,22.5 12,17.2 9.4,22.5 8.6,16.4 1.5,16.6 6.8,12 2.4,6.4 9.4,8.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
        <span className="pwt-chip shield" aria-label={`shield ${marks.shield}`} title={`Shield ${marks.shield}`}>
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

/**
  A small element tag on every unit (UX pass 2, round 3): the element's own hue through the
  `el-<element>` scope, a dot and the word. Small on purpose: the chevrons stay the matchup
  signal, this only teaches which element the unit is so the lesson carries to the next room.
*/
export function ElementBadge({ element, className = "" }: { element: string; className?: string }) {
  return (
    <span className={`pwt-el el-${element} ${className}`} title={`Element: ${element}`} data-element={element}>
      <i aria-hidden="true" />
      {element}
    </span>
  );
}

/**
  The knockout mark on a companion's plaque (UX pass 2, round 5): an enemy that acts before this
  companion's next turn has a ready hit that equals or exceeds its health. The same skull the
  player's finishing cells carry, as a fact.
*/
export function KoMark({ from, name }: { from: string[]; name: string }) {
  const who = from.length > 1 ? `${from.join(" and ")} each have` : `${from[0]} has`;
  const words = `${who} a ready hit that knocks ${name} out before its next turn`;
  return (
    <span className="pwt-ko" title={words} aria-label={words} data-ko={from.join("")}>
      <Skull />
    </span>
  );
}

function HealthBar({ hp, max, delta = 0 }: { hp: number; max: number; delta?: number }) {
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
      {!!delta && <DeltaChip n={delta} />}
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

export function SquadPlate({
  u,
  lit = false,
  spotlit = false,
  dimmed = false,
  delta = 0,
  targeted = false,
  impactTarget = false,
  struck = false,
  onHover,
}: {
  u: SquadView;
  lit?: boolean;
  /** This unit is the spotlit actor (UX pass): brighter, a floor ring, a head pointer. */
  spotlit?: boolean;
  /** Someone else is spotlit right now: this plate steps one notch dimmer. */
  dimmed?: boolean;
  /** Health change since the player's previous turn ("-7" or "+5"); 0 shows no chip. */
  delta?: number;
  /** Hovering an enemy key cell that targets this squadmate (not used by squad plates today,
      kept for symmetry with EnemyPlate's targeting ring). */
  targeted?: boolean;
  /** This unit is the current beat's target, at the impact phase: flash and recoil. */
  impactTarget?: boolean;
  /** The blow that lands is a hit (not a heal or a mark): the flash comes with a knockback. */
  struck?: boolean;
  onHover?: (hovering: boolean) => void;
}) {
  const hasMarks = u.shield > 0 || u.boost > 0 || u.hinder > 0;
  return (
    <div
      className={`pwt-plate ${u.down ? "down" : ""} ${u.active ? "active" : ""} ${lit ? "lit" : ""} ${
        spotlit ? "spotlit" : ""
      } ${dimmed ? "dimmed" : ""} ${targeted ? "targeted" : ""} ${impactTarget ? "impact-target" : ""} ${struck ? "struck" : ""}`}
      data-unit={u.id}
      onMouseEnter={onHover ? () => onHover(true) : undefined}
      onMouseLeave={onHover ? () => onHover(false) : undefined}
    >
      <div className="pwt-body">
        {spotlit && <SpotlightMarks />}
        <Figure art={u.art} element={u.element} />
        <span className="pwt-ground" aria-hidden="true" />
      </div>
      <div className="pwt-plaque">
        <ElementBadge element={u.element} />
        {u.koFrom && !u.down && <KoMark from={u.koFrom} name={u.name} />}
        <span className="pwt-name">{u.name}</span>
        <HealthBar hp={u.hp} max={u.max} delta={delta} />
        {u.down ? (
          <span className="pwt-down-tag">Down</span>
        ) : (
          hasMarks && (
            <div className="pwt-marks">
              <MarkChips marks={u} />
            </div>
          )
        )}
      </div>
    </div>
  );
}

/** The enemy's strongest ready hit on the acting companion at its next turn. */
export function HitChip({ hit, who }: { hit: NonNullable<EnemyView["hitOnActive"]>; who: string }) {
  return (
    <span
      className={`pwt-hit-on-active ${hit.lethal ? "lethal" : ""}`}
      aria-label={
        hit.step === 0
          ? `hits ${who} for no effect`
          : `hits ${who} for ${hit.n}${hit.before !== undefined ? `, weakened from ${hit.before}` : ""}${
              hit.step > 1 ? ", strong" : hit.step < 1 ? ", weak" : ""
            }${hit.lethal ? `, knocks ${who} out` : ""}`
      }
      title={
        hit.step === 0
          ? `Its strongest hit on ${who} at its next turn does no effect`
          : `Its strongest hit on ${who} at its next turn: ${hit.n}${
              hit.step > 1 ? " (strong)" : hit.step < 1 ? " (weak)" : ""
            }${hit.lethal ? `. That equals or exceeds ${who}'s health: it knocks ${who} out.` : ""}`
      }
    >
      <ImpactMark />
      {hit.before !== undefined && <s className="pwt-hit-before">{hit.before}</s>}
      {hit.step === 0 ? <Ban /> : hit.n}
      {hit.lethal && <Skull className="pwt-hit-skull" />}
      {/* The chevron's direction is the damage (more, less); its color is who that favors:
          a strong hit on your companion is bad for you, a weak one is good (the same rule as
          the key cells, where a strong hit on an enemy is good for you). A hit that knocks the
          companion out is never dressed as good news: its chevron goes neutral. */}
      {hit.step > 1 && (
        <span className={`pwt-cell-chevron-wrap ${hit.lethal ? "neutral" : "bad"}`}>
          <ChevronUp />
        </span>
      )}
      {hit.step > 0 && hit.step < 1 && (
        <span className={`pwt-cell-chevron-wrap ${hit.lethal ? "neutral" : "good"}`}>
          <ChevronDown />
        </span>
      )}
    </span>
  );
}

/** A stronger hit that is resting now, shown with the turns until it can act. */
export function ComingChip({ coming, who }: { coming: NonNullable<EnemyView["hitComing"]>; who: string }) {
  return (
    <span
      className="pwt-hit-on-active coming"
      aria-label={`a stronger hit on ${who}, ${coming.n}, is resting: ready ${coming.turns} ${coming.turns === 1 ? "turn" : "turns"} after its next turn`}
      title={`Resting: its stronger hit on ${who}, ${coming.n}${
        coming.step > 1 ? " (strong)" : coming.step < 1 ? " (weak)" : ""
      }, is usable ${coming.turns} ${coming.turns === 1 ? "turn" : "turns"} after its next turn`}
    >
      <ImpactMark />
      {coming.step === 0 ? <Ban /> : coming.n}
      <span className="pwt-hit-in">in {coming.turns}</span>
    </span>
  );
}

export function EnemyPlate({
  u,
  lit = false,
  activeName,
  spotlit = false,
  dimmed = false,
  delta = 0,
  targeted = false,
  impactTarget = false,
  struck = false,
  onHover,
  onTap,
}: {
  u: EnemyView;
  lit?: boolean;
  /** The active companion's name, for the hit chip's words (paint review round 4, item 6). */
  activeName?: string;
  /** This unit is the spotlit actor (UX pass): brighter, a floor ring, a head pointer. */
  spotlit?: boolean;
  /** Someone else is spotlit right now: this plate steps one notch dimmer. */
  dimmed?: boolean;
  /** Health change since the player's previous turn ("-7" or "+5"); 0 shows no chip. */
  delta?: number;
  /** Hovering the key cell that targets this enemy rings it (storyboard "choosing" step). */
  targeted?: boolean;
  /** This unit is the current beat's target, at the impact phase: flash and recoil. */
  impactTarget?: boolean;
  /** The blow that lands is a hit (not a heal or a mark): the flash comes with a knockback. */
  struck?: boolean;
  onHover?: (hovering: boolean) => void;
  /** Touch on a phone: tapping the plate rings it and lights its cell in every key. */
  onTap?: () => void;
}) {
  const hit = u.hitOnActive;
  const who = activeName ?? "the active companion";
  const coming = u.hitComing;
  const showHit = !!hit && !u.down;
  const showComing = !!coming && !u.down;
  const hasMarks = u.shield > 0 || u.boost > 0 || u.hinder > 0 || showHit || showComing;
  return (
    <div
      className={`pwt-plate ${u.down ? "down" : ""} ${lit ? "lit" : ""} ${spotlit ? "spotlit" : ""} ${
        dimmed ? "dimmed" : ""
      } ${targeted ? "targeted" : ""} ${impactTarget ? "impact-target" : ""} ${struck ? "struck" : ""}`}
      data-unit={u.id}
      onMouseEnter={onHover ? () => onHover(true) : undefined}
      onMouseLeave={onHover ? () => onHover(false) : undefined}
      onClick={onTap}
    >
      <div className="pwt-body">
        {spotlit && <SpotlightMarks />}
        <Figure art={u.art} element={u.element} letter={u.letter} />
        <span className="pwt-ground" aria-hidden="true" />
      </div>
      <div className="pwt-plaque">
        <ElementBadge element={u.element} />
        <span className="pwt-name">
          {u.letter} · {u.name}
        </span>
        <HealthBar hp={u.hp} max={u.max} delta={delta} />
        {u.down && <span className="pwt-down-tag">Down</span>}
        {hasMarks && !u.down && (
          <div className="pwt-marks">
            <MarkChips marks={u} />
            {showHit && <HitChip hit={hit!} who={who} />}
            {showComing && <ComingChip coming={coming!} who={who} />}
          </div>
        )}
      </div>
    </div>
  );
}
