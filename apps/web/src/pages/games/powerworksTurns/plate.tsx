import React from "react";
import { Shield, Swords, Ban, Skull, Zap, TrendingDown } from "lucide-react";
import { Portrait } from "../powerworksVisuals";
import { DeltaChip, SpotlightMarks } from "./banner";
import { SupportIcon } from "./support";
import type { EnemyView, Marks, NextAct, PlatePreview, SquadView, Threat } from "./view";

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
export function MarkChips({ marks, side = "squad", preview }: { marks: Marks; side?: "squad" | "enemy"; preview?: Pick<PlatePreview, "shield" | "boost"> | null }) {
  const shield = preview?.shield;
  const boost = preview?.boost;
  if (!marks.shield && !marks.boost && !marks.hinder && !shield && !boost) return null;
  return (
    <>
      {(marks.shield > 0 || shield) && (
        <span
          className={`pwt-chip shield${shield ? " preview" : ""}`}
          aria-label={shield ? `shield ${shield.from}, would be ${shield.to}` : `shield ${marks.shield}`}
          title={shield ? `Shield ${shield.from} to ${shield.to}` : `Shield ${marks.shield}`}
          data-preview-chip={shield ? "shield" : undefined}
        >
          <Shield />
          {shield ? <Before from={shield.from} to={shield.to} /> : marks.shield}
        </span>
      )}
      {(marks.boost > 0 || boost) && (
        <span
          className={`pwt-chip${boost ? " preview" : ""}`}
          aria-label={boost ? `next attack +${boost.from}, would be +${boost.to}` : `next attack +${marks.boost}`}
          title={boost ? `Next attack +${boost.from} to +${boost.to}` : `Next attack +${marks.boost}`}
          data-preview-chip={boost ? "boost" : undefined}
        >
          <Zap />
          {boost ? <Before from={boost.from} to={boost.to} plus /> : <>+{marks.boost}</>}
        </span>
      )}
      {marks.hinder > 0 &&
        (side === "enemy" ? (
          // An enemy's hinder is its next hit made smaller: crossed swords, good for you.
          <span className="pwt-chip hit-cut" aria-label={`its next hit -${marks.hinder}`} title={`Its next hit -${marks.hinder}`}>
            <Swords />-{marks.hinder}
          </span>
        ) : (
          // A companion's hinder is your own next attack made smaller: a falling line, not the swords.
          <span className="pwt-chip own-cut" aria-label={`your next attack -${marks.hinder}`} title={`Your next attack -${marks.hinder}`}>
            <TrendingDown />-{marks.hinder}
          </span>
        ))}
    </>
  );
}

/** A number changing in its own row: the old one struck when there was one, then the new one ("34 29"). */
function Before({ from, to, plus = false }: { from: number; to: number; plus?: boolean }) {
  const sign = plus ? "+" : "";
  return (
    <>
      {from > 0 && <s className="pwt-before">{sign}{from}</s>}
      {sign}
      {to}
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
  The health row: the bar and its number. A previewed key changes it in place (rule 2): the old number struck and the new
  one, the bar segment that would go lit (or the segment a mend would add), a skull when it reaches 0.
*/
export function HealthBar({ hp, max, delta = 0, plain = false, preview }: { hp: number; max: number; delta?: number; plain?: boolean; preview?: PlatePreview["health"] | null }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
  const seg = preview && max > 0 ? { left: (Math.min(preview.from, preview.to) / max) * 100, width: (Math.abs(preview.to - preview.from) / max) * 100, gain: preview.to > preview.from } : null;
  return (
    <div className={`pwt-health${preview ? " previewing" : ""}`} data-health-preview={preview ? (preview.to > preview.from ? "gain" : "lost") : undefined}>
      <div
        className={`pwt-health-track${preview?.over ? " capped" : ""}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={hp}
        aria-label={preview ? `health ${preview.from}, would be ${preview.to}` : undefined}
      >
        <span
          className={`pwt-health-fill ${hp / Math.max(1, max) < 0.3 ? "critical" : ""}`}
          style={{ width: `${pct}%` }}
        />
        {seg && <span className={`pwt-health-seg ${seg.gain ? "gain" : "lost"}`} data-seg="" style={{ left: `${seg.left}%`, width: `${seg.width}%` }} />}
        {/* A mend that would spill past full: the bar's end cap lights, and the part that spills is a short dim sliver beyond the end. */}
        {preview?.over ? <span className="pwt-health-cap" data-cap="" /> : null}
        {preview?.over ? <span className="pwt-health-over" data-over={preview.over} /> : null}
      </div>
      {preview ? (
        <span className={`pwt-health-num changing${preview.skull ? " skull" : ""}`} data-from={preview.from} data-to={preview.to}>
          <s className="pwt-before">{preview.from}</s>
          <span className="pwt-health-arrow" aria-hidden="true">→</span>
          <span className="pwt-health-after">{preview.to}</span>
          {preview.skull && <Skull className="pwt-health-skull" aria-label="knocked out" />}
        </span>
      ) : (
        <span className="pwt-health-num">{hp}</span>
      )}
      {!!delta && !preview && <DeltaChip n={delta} plain={plain} />}
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
  ring = "",
  impactTarget = false,
  struck = false,
  onHover,
  threats,
  threatMode,
  onThreat,
  preview,
  previewKey = "",
  offTarget = false,
  previewDim = false,
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
  /** A tag is hovered: this plate is the enemy it comes from or the plate it lands on (the danger tone when the hit knocks it out). */
  ring?: "" | "threat" | "danger";
  /** This unit is the current beat's target, at the impact phase: flash and recoil. */
  impactTarget?: boolean;
  /** The blow that lands is a hit (not a heal or a mark): the flash comes with a knockback. */
  struck?: boolean;
  onHover?: (hovering: boolean) => void;
  /** The threats on this companion, as the page reads them (preview and playback applied); u.threats when absent. */
  threats?: Threat[];
  threatMode?: (fromId: string) => ThreatMode;
  onThreat?: (fromId: string | null) => void;
  /** What the hovered or selected key would change here, in the rows that carry those numbers (a mend, a guard, a boost). */
  preview?: PlatePreview | null;
  previewKey?: string;
  /** A key is hovered or selected and this unit is not one it can name: the plate steps back. */
  offTarget?: boolean;
  /** A target is pointed at with a single-target move chosen: this plate's previewed change steps back, since it is not the one being aimed at. */
  previewDim?: boolean;
  /** The plate is a legal target of the selected key: pressing it uses the key on it. */
  onPick?: () => void;
}) {
  const hasMarks = u.shield > 0 || u.boost > 0 || u.hinder > 0 || !!preview?.shield || !!preview?.boost;
  return (
    <div
      className={`pwt-plate ${u.down ? "down" : ""} ${u.active ? "active" : ""} ${lit ? "lit" : ""} ${
        spotlit ? "spotlit" : ""
      } ${dimmed ? "dimmed" : ""} ${targeted ? "targeted" : ""} ${ring ? `ring-${ring}` : ""} ${impactTarget ? "impact-target" : ""} ${struck ? "struck" : ""} ${offTarget ? "off-target" : ""} ${previewDim ? "preview-dim" : ""} ${onPick ? "pickable" : ""}`}
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
      </div>
      <div className="pwt-plaque">
        <ElementBadge element={u.element} />
        {!u.down && <ThreatTabs threats={threats ?? u.threats} onCompanion modeOf={threatMode} onHover={onThreat} />}
        <span className="pwt-name">{u.name}</span>
        <HealthBar hp={u.hp} max={u.max} delta={delta} preview={preview?.health} />
        {u.down ? (
          <span className="pwt-down-tag">Down</span>
        ) : (
          // The chip row is always there, empty or not, so a shield gained never lifts the plate (round 8, item 10).
          <div className="pwt-marks reserved">{hasMarks && <MarkChips marks={u} preview={preview} />}</div>
        )}
      </div>
    </div>
  );
}

/**
  The matchup mark on an enemy's plaque: the acting companion's element against this enemy's, said once
  per enemy (every attack takes its creature's element). Nothing on a neutral matchup.
*/
export function MatchupMark({ step, who, lit = false, element }: { step: number | null; who?: string; /** The acting companion's element: its dot opens the tab, so the tab reads as that companion's bonus or penalty. */ element?: string; /** A previewed attack is showing on this plate: this multiplier is why the lost health is more or less than the key's number. */ lit?: boolean }) {
  if (step === null || step === 1) return null;
  const by = who ? ` for ${who}` : "";
  if (step === 0)
    return (
      <span className={`pwt-match immune${lit ? " lit" : ""}`} title={`No effect${by}: the element chart gives 0`} aria-label={`no effect${by}`} data-match="immune">
        <Ban />
        <span className="pwt-match-word">no effect</span>
      </span>
    );
  const strong = step > 1;
  // The multiplier is on the tab, so a landing number larger than a key's power has its reason beside it.
  // Written without a leading zero ("×.5"): a narrow plate holds it beside the element tag.
  const times = `×${String(step).replace(/^0\./, ".")}`;
  return (
    <span
      className={`pwt-match ${strong ? "strong" : "weak"}${lit ? " lit" : ""}`}
      title={`${strong ? "Strong" : "Weak"} matchup${by}: attacks land ${times}`}
      aria-label={`${strong ? "strong" : "weak"} matchup${by}, attacks land ${times}`}
      data-match={strong ? "strong" : "weak"}
    >
      {element && <i className={`pwt-match-dot el-${element}`} aria-hidden="true" />}
      <span className="pwt-match-word">{strong ? "strong" : "weak"}</span>
      <span className="pwt-match-x">{times}</span>
    </span>
  );
}

/**
  Threat tags (docs/design/powerworks-threat-tags.md): an enemy's committed move, shown on the plate it
  lands on. The tag carries the enemy's letter (the box its figure wears), the impact glyph and the number
  it would land now; a skull and the danger border when that knocks the plate out. A support carries its
  icon and number. No words are drawn: they are the hover title and the accessible name.
*/
export type ThreatMode = "live" | "lit" | "dim";

const SUPPORT_TAG_WORD: Record<string, string> = {
  heal: "heals",
  shield: "shields",
  boost: "boosts the next attack by",
  hinder: "weakens the next attack by",
  delay: "slows the next turn by",
};

/** The tag's words, for its title and accessible name: "A's next hit on Avilily: 14, knocks Avilily out". */
export function threatWords(t: Threat, selfPlate = false): string {
  const who = selfPlate ? "itself" : t.onName;
  if (t.kind === "attack") {
    if (t.step === 0) return `${t.from}'s next hit on ${who}: no effect`;
    const cut = t.before !== undefined ? `, from ${t.before}` : "";
    const area = t.area ? " (it hits every companion)" : "";
    const matchup = t.step > 1 ? ", strong matchup" : t.step < 1 ? ", weak matchup" : "";
    const ko = t.lethal ? `, knocks ${who} out` : "";
    const gone = t.cancelled ? ", will not come: the move finishes it" : "";
    return `${t.from}'s next hit on ${who}: ${t.n}${cut}${matchup}${ko}${area}${gone}`;
  }
  const parts = t.parts.map((p) => `${SUPPORT_TAG_WORD[p.kind]} ${p.n}`).join(", ");
  return `${t.from}'s next move on ${who}: ${parts}${t.cancelled ? ", will not come: the move finishes it" : ""}`;
}

export function ThreatTag({ t, mode = "live", onCompanion = false, onHover }: { t: Threat; mode?: ThreatMode; onCompanion?: boolean; onHover?: (fromId: string | null) => void }) {
  const self = t.kind === "support" && t.on === t.fromId;
  const words = threatWords(t, self);
  const cls = `pwt-threat ${t.kind}${t.before !== undefined ? " struck" : ""}${t.lethal && !t.cancelled ? " lethal" : ""}${t.cancelled ? " cancelled" : ""} ${mode}`;
  return (
    <span
      className={cls}
      title={words}
      aria-label={words}
      role="img"
      data-threat=""
      data-from={t.from}
      data-from-id={t.fromId}
      data-on={t.on}
      data-mode={mode}
      onMouseEnter={onHover ? () => onHover(t.fromId) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
    >
      <span className="pwt-threat-letter" aria-hidden="true">
        {t.from}
      </span>
      {t.kind === "attack" ? (
        <span className="pwt-threat-what" aria-hidden="true">
          <ImpactMark />
          {t.before !== undefined && (
            <>
              <s className="pwt-threat-before">{t.before}</s>
              <span className="pwt-threat-arrow">→</span>
            </>
          )}
          {t.step === 0 ? <Ban /> : <span className="pwt-threat-n">{t.n}</span>}
          {t.lethal && <Skull className="pwt-threat-skull" />}
        </span>
      ) : (
        <span className="pwt-threat-what" aria-hidden="true">
          {t.parts.map((p) => (
            <span key={p.kind} className={`pwt-threat-part ${p.kind}`}>
              <SupportIcon kind={p.kind} onCompanion={onCompanion} />
              <span className="pwt-threat-n">
                {p.kind === "hinder" || p.kind === "delay" ? "-" : p.kind === "boost" || p.kind === "heal" ? "+" : ""}
                {p.n}
              </span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/**
  The tab row on a plaque's top edge, left side: the enemy's matchup mark first (when it has one), then
  the threat tags in the order the enemies act. A row that would run into the element tag rides one row higher, above it.
*/
export function ThreatTabs({
  threats,
  modeOf,
  onHover,
  onCompanion = false,
}: {
  threats: Threat[];
  modeOf?: (fromId: string) => ThreatMode;
  onHover?: (fromId: string | null) => void;
  onCompanion?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [raised, setRaised] = React.useState(false);
  const signature = threats.map((x) => `${x.fromId}${x.on}${x.before ?? ""}${x.n}${x.lethal ? "k" : ""}${x.parts.length}`).join("|");
  // A row that would run into the element tag beside it rides one row higher, above that tag. The width of the row does not
  // depend on the row it rides on, so this settles in one pass.
  React.useLayoutEffect(() => {
    const el = ref.current;
    const plate = el?.closest<HTMLElement>("[data-unit]");
    if (!el || !plate) return;
    const tag = plate.querySelector<HTMLElement>(".pwt-el");
    const boss = plate.classList.contains("boss");
    const need = threats.length > 0 && (boss || (!!tag && el.offsetLeft + el.offsetWidth > tag.offsetLeft - 3));
    // An enemy's matchup tab sits to the right of its incoming tags when there is room, else one row up.
    const match = plate.querySelector<HTMLElement>(".pwt-match");
    if (match) {
      match.style.left = "";
      match.style.top = "";
      if (threats.length > 0 && !need) {
        const right = el.offsetLeft + el.offsetWidth + 3;
        if (tag && right + match.offsetWidth < tag.offsetLeft - 3) match.style.left = `${right}px`;
        else match.style.top = `${el.offsetTop - match.offsetHeight - 1}px`;
      }
    }
    if (need !== raised) setRaised(need);
  });
  return (
    <div ref={ref} className={`pwt-tabs${raised ? " raised" : ""}${onCompanion ? " squad" : ""}`} data-tabs="" data-sig={signature}>
      {threats.map((t) => (
        <ThreatTag key={`${t.fromId}-${t.on}-${t.kind}`} t={t} mode={modeOf ? modeOf(t.fromId) : "live"} onCompanion={onCompanion} onHover={onHover} />
      ))}
    </div>
  );
}

/** The enemy's next act in words, for the title and the accessible name (the plate itself never names a companion). */
export function nextActWords(n: NextAct): string {
  if (n.kind === "attack") {
    const gone = n.cancelled ? ", will not come: the move finishes it" : "";
    return `${n.from}'s next hit: ${n.n}${n.before !== undefined ? `, from ${n.before}` : ""}${n.area ? ", hits every companion" : ""}${gone}`;
  }
  const parts = n.parts.map((p) => `${SUPPORT_TAG_WORD[p.kind]} ${p.n}`).join(", ");
  const who = n.self ? " on itself" : n.toLetters.length ? ` on ${n.toLetters.join(", ")}` : "";
  return `${n.from}'s next move${who}: ${parts}${n.cancelled ? ", will not come: the move finishes it" : ""}`;
}

/**
  An enemy's next act, said on its own plate, one row under its health (docs/design/powerworks-one-number-one-meaning.md,
  decision 1): the hit glyph and the number it would land, with a small pointer toward the squad; ALL for an area hit; a support's
  icon, its number and the ally it lands on. A previewed weaken changes the number in this row (old struck, new); a finishing move crosses it out.
*/
export function NextActRow({ next, mode = "live" }: { next: NextAct | null; mode?: ThreatMode }) {
  if (!next) return <div className="pwt-next reserved" data-next-act="" data-empty="" />;
  const words = nextActWords(next);
  return (
    <div className={`pwt-next ${next.kind}${next.before !== undefined ? " struck" : ""}${next.cancelled ? " cancelled" : ""} ${mode}`} data-next-act="" data-from={next.from} title={words} aria-label={words} role="img">
      {next.kind === "attack" ? (
        <span className="pwt-next-what" aria-hidden="true">
          <ImpactMark />
          {next.before !== undefined && (
            <>
              <s className="pwt-before">{next.before}</s>
              <span className="pwt-next-arrow">→</span>
            </>
          )}
          <span className="pwt-next-n">{next.n}</span>
          {next.area && <span className="pwt-next-all">ALL</span>}
        </span>
      ) : (
        <span className="pwt-next-what" aria-hidden="true">
          {next.parts.map((p) => (
            <span key={p.kind} className={`pwt-next-part ${p.kind}`}>
              <SupportIcon kind={p.kind} onCompanion={!next.self && next.toLetters.length === 0} />
              <span className="pwt-next-n">
                {p.kind === "hinder" || p.kind === "delay" ? "-" : p.kind === "boost" || p.kind === "heal" ? "+" : ""}
                {p.n}
              </span>
            </span>
          ))}
          {next.toLetters.length > 0 && <span className="pwt-next-to">{next.toLetters.length > 1 ? "ALL" : next.toLetters[0]}</span>}
        </span>
      )}
    </div>
  );
}

export function EnemyPlate({
  u,
  lit = false,
  activeName,
  activeElement,
  spotlit = false,
  dimmed = false,
  delta = 0,
  targeted = false,
  ring = "",
  impactTarget = false,
  struck = false,
  onHover,
  threats,
  threatMode,
  onThreat,
  preview,
  previewKey = "",
  offTarget = false,
  previewDim = false,
  onPick,
}: {
  u: EnemyView;
  lit?: boolean;
  /** The active companion's name, for the matchup mark's words. */
  activeName?: string;
  /** The active companion's element, shown as the dot that opens the matchup tab. */
  activeElement?: string;
  /** This unit is the spotlit actor (UX pass): brighter, a floor ring, a head pointer. */
  spotlit?: boolean;
  /** Someone else is spotlit right now: this plate steps one notch dimmer. */
  dimmed?: boolean;
  /** Health change since the player's previous turn ("-7" or "+5"); 0 shows no chip. */
  delta?: number;
  /** The pointer is on this enemy while a key waits for a target: it is ringed. */
  targeted?: boolean;
  ring?: "" | "threat" | "danger";
  /** This unit is the current beat's target, at the impact phase: flash and recoil. */
  impactTarget?: boolean;
  /** The blow that lands is a hit (not a heal or a mark): the flash comes with a knockback. */
  struck?: boolean;
  onHover?: (hovering: boolean) => void;
  /** The supports committed to this enemy, as the page reads them (preview and playback applied); u.threats when absent. */
  threats?: Threat[];
  /** While the enemies act: the acting enemy's tags are lit, the others step back. */
  threatMode?: (fromId: string) => ThreatMode;
  /** The pointer is on one of this plate's tags (the enemy it comes from), or left it. */
  onThreat?: (fromId: string | null) => void;
  /** What the hovered or selected key would change here, in the rows that carry those numbers (health, shield). */
  preview?: PlatePreview | null;
  previewKey?: string;
  /** A key is hovered or selected and this unit is not one it can name: the plate steps back. */
  offTarget?: boolean;
  /** A target is pointed at with a single-target move chosen: this plate's previewed change steps back, since it is not the one being aimed at. */
  previewDim?: boolean;
  /** The plate is a legal target of the selected key: pressing it uses the key on it. */
  onPick?: () => void;
}) {
  const who = activeName;
  return (
    <div
      className={`pwt-plate ${u.down ? "down" : ""} ${lit ? "lit" : ""} ${spotlit ? "spotlit" : ""} ${
        dimmed ? "dimmed" : ""
      } ${targeted ? "targeted" : ""} ${ring ? `ring-${ring}` : ""} ${impactTarget ? "impact-target" : ""} ${struck ? "struck" : ""} ${offTarget ? "off-target" : ""} ${previewDim ? "preview-dim" : ""} ${onPick ? "pickable" : ""} ${isBoss(u.species) ? "boss" : ""}`}
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
      </div>
      <div className="pwt-plaque">
        <ElementBadge element={u.element} />
        {!u.down && <ThreatTabs threats={threats ?? u.threats} modeOf={threatMode} onHover={onThreat} />}
        {!u.down && <MatchupMark step={u.matchup} who={who} lit={!!preview?.matchup} element={activeElement} />}
        {isBoss(u.species) && <span className="pwt-guardian-tag">Guardian</span>}
        <span className="pwt-name">
          {u.letter} · {u.name}
        </span>
        <HealthBar hp={u.hp} max={u.max} delta={delta} plain preview={preview?.health} />
        {u.down && <span className="pwt-down-tag">Down</span>}
        {!u.down && <NextActRow next={u.next} mode={threatMode ? threatMode(u.id) : "live"} />}
        {(u.shield > 0 || u.boost > 0 || u.hinder > 0) && !u.down && (
          <div className="pwt-marks">
            <MarkChips marks={u} side="enemy" preview={preview} />
          </div>
        )}
      </div>
    </div>
  );
}
