import React from "react";
import { Shield, ChevronUp, ChevronDown, Swords, Ban, Skull, Zap, HeartPulse } from "lucide-react";
import { Portrait } from "../powerworksVisuals";
import { DeltaChip, SpotlightMarks } from "./banner";
import { SupportIcon, SUPPORT_WORD } from "./support";
import type { EnemyView, IntentView, Marks, Preview, SquadView } from "./view";

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
      <span className="pwt-ko-words">can fall</span>
    </span>
  );
}

function HealthBar({ hp, max, delta = 0, plain = false }: { hp: number; max: number; delta?: number; plain?: boolean }) {
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
      {!!delta && <DeltaChip n={delta} plain={plain} />}
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
  preview,
  previewKey = "",
  offTarget = false,
  onPick,
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
  /** What the hovered or selected key would land here (a heal, a shield, a boost). */
  preview?: Preview;
  previewKey?: string;
  /** A key is hovered or selected and this unit is not one it can name: the plate steps back. */
  offTarget?: boolean;
  /** The plate is a legal target of the selected key: pressing it uses the key on it. */
  onPick?: () => void;
}) {
  const hasMarks = u.shield > 0 || u.boost > 0 || u.hinder > 0;
  return (
    <div
      className={`pwt-plate ${u.down ? "down" : ""} ${u.active ? "active" : ""} ${lit ? "lit" : ""} ${
        spotlit ? "spotlit" : ""
      } ${dimmed ? "dimmed" : ""} ${targeted ? "targeted" : ""} ${impactTarget ? "impact-target" : ""} ${struck ? "struck" : ""} ${offTarget ? "off-target" : ""} ${onPick ? "pickable" : ""}`}
      data-unit={u.id}
      onMouseMove={onHover ? () => onHover(true) : undefined}
      onMouseLeave={onHover ? () => onHover(false) : undefined}
      onClick={onPick}
      role={onPick ? "button" : undefined}
      tabIndex={onPick ? 0 : undefined}
      aria-label={onPick ? `Use ${previewKey} on ${u.name}` : undefined}
      onKeyDown={
        onPick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick();
              }
            }
          : undefined
      }
    >
      <div className="pwt-body">
        {spotlit && <SpotlightMarks />}
        <Figure art={u.art} element={u.element} />
        <span className="pwt-ground" aria-hidden="true" />
        {preview && <PreviewBadge p={preview} keyName={previewKey} />}
      </div>
      <div className="pwt-plaque">
        <ElementBadge element={u.element} />
        {u.koFrom && !u.down && <KoMark from={u.koFrom} name={u.name} />}
        <span className="pwt-name">{u.name}</span>
        <HealthBar hp={u.hp} max={u.max} delta={delta} />
        {u.down ? (
          <span className="pwt-down-tag">Down</span>
        ) : (
          // The chip row is always there, empty or not, so a shield gained never lifts the plate (round 8, item 10).
          <div className="pwt-marks reserved">{hasMarks && <MarkChips marks={u} />}</div>
        )}
      </div>
    </div>
  );
}

/** The matchup chevron beside a number: up is more damage, down is less; the color says who that favors. */
function Chevron({ step, tone }: { step: number; tone: "you" | "them" | "neutral" }) {
  if (step > 1)
    return (
      <span className={`pwt-cell-chevron-wrap ${tone === "you" ? "good" : tone === "them" ? "bad" : "neutral"}`}>
        <ChevronUp />
      </span>
    );
  if (step > 0 && step < 1)
    return (
      <span className={`pwt-cell-chevron-wrap ${tone === "you" ? "bad" : tone === "them" ? "good" : "neutral"}`}>
        <ChevronDown />
      </span>
    );
  return null;
}

/**
  The matchup mark on an enemy's plaque: the acting companion's element against this enemy's, said once
  per enemy (every attack takes its creature's element). Nothing on a neutral matchup.
*/
export function MatchupMark({ step, who }: { step: number | null; who?: string }) {
  if (step === null || step === 1) return null;
  const by = who ? ` for ${who}` : "";
  if (step === 0)
    return (
      <span className="pwt-match immune" title={`No effect${by}: the element chart gives 0`} aria-label={`no effect${by}`} data-match="immune">
        <Ban />
        <span>no effect</span>
      </span>
    );
  const strong = step > 1;
  return (
    <span
      className={`pwt-match ${strong ? "strong" : "weak"}`}
      title={`${strong ? "Strong" : "Weak"} matchup${by}`}
      aria-label={`${strong ? "strong" : "weak"} matchup${by}`}
      data-match={strong ? "strong" : "weak"}
    >
      {strong ? <ChevronUp /> : <ChevronDown />}
      <span>{strong ? "strong" : "weak"}</span>
    </span>
  );
}

/**
  What an enemy has committed to (its intent), on its plate: the companion it is aimed at (portrait and
  name), then the number it would land now, a skull when that is lethal. The move's name is on hover. A
  support intent shows its kind and its recipient. Numbers and words in place, stated as facts.
*/
export function IntentChip({ intent, off = false }: { intent: IntentView; off?: boolean }) {
  const t = intent.target;
  const who = t.self ? "itself" : t.name;
  const isAttack = intent.kind === "attack";
  const words = isAttack
    ? intent.step === 0
      ? `${intent.move} on ${who}: no effect`
      : `${intent.move} on ${intent.area ? `${who} and every companion` : who}: ${intent.n}${intent.before !== undefined ? `, cut from ${intent.before} by its hinder` : ""}${
          intent.step > 1 ? ", strong" : intent.step < 1 ? ", weak" : ""
        }${intent.lethal ? `, knocks ${who} out` : ""}`
    : `${intent.move} on ${who}: ${intent.supports.map((s) => `${SUPPORT_WORD[s.kind]} ${s.n}`).join(", ")}`;
  return (
    <span className={`pwt-intent ${isAttack ? "attack" : "support"} ${intent.lethal ? "lethal" : ""} ${off ? "off" : ""}`} aria-label={`Next: ${words}`} title={`Next: ${words}`} data-intent={intent.move}>
      <span className="pwt-intent-to">
        {t.self ? (
          <span className="pwt-intent-self">itself</span>
        ) : (
          <>
            <span className="pwt-intent-portrait" aria-hidden="true">
              <Portrait u={{ species: t.art, element: t.element }} small />
            </span>
            <span className="pwt-intent-name">{t.name}</span>
          </>
        )}
      </span>
      <span className="pwt-intent-what">
        {isAttack ? (
          <>
            <ImpactMark />
            {intent.before !== undefined && (
              <>
                <s className="pwt-hit-before">{intent.before}</s>
                <span className="pwt-hit-arrow" aria-hidden="true">
                  →
                </span>
              </>
            )}
            {intent.step === 0 ? <Ban /> : intent.n}
            {intent.lethal && <Skull className="pwt-hit-skull" />}
            {intent.area && <span className="pwt-intent-all">ALL</span>}
            {/* The chevron's direction is the damage; its color is who that favors: strong on your companion is bad for you. */}
            <Chevron step={intent.step} tone={intent.lethal ? "neutral" : "them"} />
          </>
        ) : (
          intent.supports.map((s) => (
            <span key={`${s.kind}-${s.aim}`} className={`pwt-intent-support ${s.kind}`}>
              <SupportIcon kind={s.kind} />
              {s.kind === "hinder" || s.kind === "delay" ? "-" : s.kind === "boost" ? "+" : ""}
              {s.n}
            </span>
          ))
        )}
      </span>
    </span>
  );
}

/**
  What the hovered or selected key would land on this unit, big and in the same place on every plate:
  the number, a skull when it finishes, "no effect" when the chart gives 0. A hinder shows the enemy's
  committed hit before and after; a support shows its number.
*/
export function PreviewBadge({ p, keyName }: { p: Preview; keyName: string }) {
  let body: React.ReactNode;
  let words: string;
  let cls = "";
  if (p.chips) {
    body = (
      <span className="pwt-preview-chips">
        {p.chips.map((s) => (
          <span key={`${s.kind}-${s.aim}`} className={`pwt-preview-chip ${s.kind}`}>
            <SupportIcon kind={s.kind} />
            {s.kind === "hinder" || s.kind === "delay" ? "-" : s.kind === "boost" ? "+" : ""}
            {s.n}
          </span>
        ))}
      </span>
    );
    words = p.chips.map((s) => `${SUPPORT_WORD[s.kind]} ${s.n}`).join(", ");
  } else if (p.kind === "hit") {
    if (p.immune) {
      cls = "immune";
      body = (
        <span className="pwt-preview-num plain">
          <Ban />
          <span className="pwt-preview-word">no effect</span>
        </span>
      );
      words = "no effect";
    } else {
      cls = p.finishes ? "finish" : "";
      body = (
        <>
          <span className="pwt-preview-num">
            {p.finishes && <Skull />}
            {p.ownBefore !== undefined && (
              <>
                <s className="pwt-preview-before">{p.ownBefore}</s>
                <span className="pwt-preview-arrow">→</span>
              </>
            )}
            {p.n}
            <Chevron step={p.step} tone="you" />
          </span>
          {(p.absorbed > 0 || p.rider) && (
            <span className="pwt-preview-notes">
              {p.absorbed > 0 && (
                <span className="pwt-preview-note" title={`Its shield absorbs ${p.absorbed} first`}>
                  <Shield />
                  {p.absorbed}
                </span>
              )}
              {p.rider && (
                <span className="pwt-preview-note rider" data-saves={p.saves ? "" : undefined}>
                  {p.saves ? <Skull /> : <Swords />}
                  <s>{p.rider.before}</s>
                  <span className="pwt-preview-arrow">→</span>
                  {p.rider.after}
                </span>
              )}
            </span>
          )}
        </>
      );
      words = `${p.n} damage${p.finishes ? ", finishes" : ""}${p.step > 1 ? ", strong" : p.step < 1 ? ", weak" : ""}${p.absorbed > 0 ? `, its shield absorbs ${p.absorbed} first` : ""}${
        p.rider ? `; its committed hit on ${p.hitOn ?? "a companion"} falls from ${p.rider.before} to ${p.rider.after}` : ""
      }`;
    }
  } else if (p.kind === "hinder") {
    cls = "hinder";
    const nothing = p.before === 0 && !p.hitOn;
    body = nothing ? (
      <span className="pwt-preview-num plain">
        <Swords />
        <span className="pwt-preview-word">no hit to cut</span>
      </span>
    ) : (
      <>
        <span className="pwt-preview-num">
          {p.saves && <Skull className="saved" />}
          <s className="pwt-preview-before">{p.before}</s>
          <span className="pwt-preview-arrow">→</span>
          {p.n}
        </span>
        <span className="pwt-preview-note" title={`Its committed hit${p.hitOn ? ` on ${p.hitOn}` : ""}`}>
          <Swords />
          its hit
        </span>
      </>
    );
    words = nothing ? "it has no attack committed for this to cut" : `its committed hit falls from ${p.before} to ${p.n}${p.saves ? ", no longer knocking out" : ""}`;
  } else {
    cls = p.kind;
    body = (
      <span className="pwt-preview-num">
        {p.kind === "heal" && <HeartPulse />}
        {p.kind === "shield" && <Shield />}
        {p.kind === "boost" && <Zap />}
        {p.kind === "heal" || p.kind === "boost" ? "+" : ""}
        {p.n}
      </span>
    );
    words = p.kind === "heal" ? `heals ${p.n}` : p.kind === "shield" ? `shield ${p.n}` : `next attack +${p.n}`;
  }
  return (
    <span className={`pwt-preview ${cls}`} data-preview="" aria-label={`${keyName}: ${words}`}>
      {body}
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
  intentOff = false,
  preview,
  previewKey = "",
  offTarget = false,
  onPick,
}: {
  u: EnemyView;
  lit?: boolean;
  /** The active companion's name, for the matchup mark's words. */
  activeName?: string;
  /** This unit is the spotlit actor (UX pass): brighter, a floor ring, a head pointer. */
  spotlit?: boolean;
  /** Someone else is spotlit right now: this plate steps one notch dimmer. */
  dimmed?: boolean;
  /** Health change since the player's previous turn ("-7" or "+5"); 0 shows no chip. */
  delta?: number;
  /** The pointer is on this enemy while a key waits for a target: it is ringed. */
  targeted?: boolean;
  /** This unit is the current beat's target, at the impact phase: flash and recoil. */
  impactTarget?: boolean;
  /** The blow that lands is a hit (not a heal or a mark): the flash comes with a knockback. */
  struck?: boolean;
  onHover?: (hovering: boolean) => void;
  /**
    While the enemies act the intent chips are not drawn (the space is kept, so the plate does not
    move): an intent is a promise about the next turn, and it must never disagree with the beat
    playing beside it. The settled state brings them back, freshly committed.
  */
  intentOff?: boolean;
  /** What the hovered or selected key would land here (the number, drawn big on the plate). */
  preview?: Preview;
  previewKey?: string;
  /** A key is hovered or selected and this unit is not one it can name: the plate steps back. */
  offTarget?: boolean;
  /** The plate is a legal target of the selected key: pressing it uses the key on it. */
  onPick?: () => void;
}) {
  const intent = u.intent;
  const showIntent = !!intent && !u.down;
  const who = activeName;
  return (
    <div
      className={`pwt-plate ${u.down ? "down" : ""} ${lit ? "lit" : ""} ${spotlit ? "spotlit" : ""} ${
        dimmed ? "dimmed" : ""
      } ${targeted ? "targeted" : ""} ${impactTarget ? "impact-target" : ""} ${struck ? "struck" : ""} ${offTarget ? "off-target" : ""} ${onPick ? "pickable" : ""} ${isBoss(u.species) ? "boss" : ""}`}
      data-unit={u.id}
      data-letter={u.letter}
      onMouseMove={onHover ? () => onHover(true) : undefined}
      onMouseLeave={onHover ? () => onHover(false) : undefined}
      onClick={onPick}
      role={onPick ? "button" : undefined}
      tabIndex={onPick ? 0 : undefined}
      aria-label={onPick ? `Use ${previewKey} on ${u.name} ${u.letter}` : undefined}
      onKeyDown={
        onPick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick();
              }
            }
          : undefined
      }
    >
      <div className="pwt-body">
        {spotlit && <SpotlightMarks />}
        <Figure art={u.art} element={u.element} letter={u.letter} />
        <span className="pwt-ground" aria-hidden="true" />
        {preview && <PreviewBadge p={preview} keyName={previewKey} />}
      </div>
      <div className="pwt-plaque">
        <ElementBadge element={u.element} />
        {!u.down && <MatchupMark step={u.matchup} who={who} />}
        {isBoss(u.species) && <span className="pwt-guardian-tag">Guardian</span>}
        <span className="pwt-name">
          {u.letter} · {u.name}
        </span>
        <HealthBar hp={u.hp} max={u.max} delta={delta} plain />
        {u.down && <span className="pwt-down-tag">Down</span>}
        {(u.shield > 0 || u.boost > 0 || u.hinder > 0) && !u.down && (
          <div className="pwt-marks">
            <MarkChips marks={u} />
          </div>
        )}
        {showIntent && (
          <div className="pwt-marks intent">
            <IntentChip intent={intent!} off={intentOff} />
          </div>
        )}
      </div>
    </div>
  );
}
