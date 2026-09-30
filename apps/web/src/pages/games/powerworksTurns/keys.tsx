import React, { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Skull,
  Shield,
  HeartPulse,
  Zap,
  Link2,
  Swords,
  Ban,
  Star,
} from "lucide-react";
import { Portrait } from "../powerworksVisuals";
import { hinderWords, type Cell, type KeyView, type SquadView, type SupportChip } from "./view";
import { cellId, tapStep } from "./phone";

/**
  One icon per support kind, so a key's effect reads at a glance beside its number. Hinder
  uses the swords icon everywhere on this page (blind readers read the chain-link as
  "turns" or "stacks", not "weakens an attack" — paint review round 4, item 1): swords say
  "this is about a hit", the minus sign says which way. Delay (the turn-order layer) is
  the one kind that is not about a hit, so it keeps the link icon.
*/
function SupportIcon({ kind }: { kind: SupportChip["kind"] }) {
  if (kind === "heal") return <HeartPulse />;
  if (kind === "shield") return <Shield />;
  if (kind === "boost") return <Zap />;
  if (kind === "delay") return <Link2 />;
  return <Swords />; // hinder
}
const SUPPORT_WORD: Record<SupportChip["kind"], string> = {
  heal: "heal",
  shield: "shield",
  boost: "boost",
  hinder: "its next hit",
  delay: "slow",
};

/** The matchup word for a cell's step, for the aria-label. */
function matchupWord(step: number): string {
  if (step === 0) return "no effect";
  if (step > 1) return "strong";
  if (step < 1) return "weak";
  return "";
}

/**
  A key's own supports, in the foot line (right side), in words rather than centered under
  one cell (blind readers took a centered rider for a B-only effect — paint review round 4,
  item 3). `area` says whether the key's attack reaches every enemy, so the words can say
  "each" rather than implying one target.
*/
export function SupportRiders({ supports, area, kept = false }: { supports: SupportChip[]; area: boolean; kept?: boolean }) {
  if (!supports.length) return null;
  return (
    <div className="pwt-riders">
      {supports.map((s) => {
        const whom = s.aim === "enemy" && area ? " each" : s.all ? ", whole squad" : "";
        return (
          <span
            key={`${s.kind}-${s.aim}`}
            className={`pwt-rider ${s.kind}`}
            title={`${SUPPORT_WORD[s.kind]} ${s.n}${whom}${kept ? ". It still applies while the attack reads 0." : ""}`}
          >
            <SupportIcon kind={s.kind} />
            {s.n}
            {s.aim === "enemy" && area ? <span className="pwt-rider-each">each</span> : null}
            {kept ? <span className="pwt-rider-each">still applies</span> : null}
          </span>
        );
      })}
    </div>
  );
}

/** One target cell: an enemy letter head or an ally portrait head, the landed number, and its marks. */
export function CellButton({
  cell,
  kind,
  keyName,
  targetName,
  ally,
  armed,
  onPick,
  onHover,
  columnLit = false,
  hot = false,
  previewed = false,
  activeName = "the acting companion",
}: {
  cell: Cell;
  kind: KeyView["kind"];
  keyName: string;
  targetName: string;
  ally?: SquadView;
  armed: boolean;
  onPick: () => void;
  /** Hovering this cell rings its target on the stage (storyboard "choosing" step). Enemy
      cells only: an ally cell's target already sits in the squad row below the key bar. */
  onHover?: (targetId: string | null) => void;
  /** Its enemy is under the pointer somewhere else (a plate, or the same column in another
      key): the cell lights like a hovered one, so an enemy reads down every key at once. */
  columnLit?: boolean;
  /** An area key's other cells while the pointer is on any one of them: lit as strongly as the hovered one. */
  hot?: boolean;
  /** Touch: this cell has had its first tap and waits for the second (phone mode). */
  previewed?: boolean;
  /** The acting companion: the one the enemy's hit numbers are computed on. */
  activeName?: string;
}) {
  const hinderOnly = kind === "support" && cell.before !== undefined;
  // The companion's own hinder or boost changed this attack's number: show the struck plain
  // number and the marked one, the same form the enemy chips use.
  const marked = kind === "attack" && cell.ownBefore !== undefined;
  const heal = kind === "support" && !hinderOnly;
  const word = matchupWord(cell.step);
  const label = ally
    ? `${keyName} on ${targetName}: ${cell.n}${heal ? " health" : ""}`
    : hinderOnly
    ? `${keyName} on ${cell.letter}, ${targetName}: ${hinderWords(cell.hinder ?? cell.before! - cell.n, activeName, cell.before!, cell.n)}`
    : `${keyName} on ${cell.letter}, ${targetName}: ${
        cell.immune
          ? "no effect"
          : `${cell.n} damage${marked ? ` (${cell.ownBefore} without the companion's own mark)` : ""}${word ? `, ${word}` : ""}${cell.finishes ? ", finishes" : ""}${
              cell.absorbed > 0 ? `, its shield absorbs ${cell.absorbed} first` : ""
            }${cell.rider ? `; its rider takes that enemy's next hit on ${activeName} from ${cell.rider.before} to ${cell.rider.after}` : ""}`
      }`;
  return (
    <button
      type="button"
      className={`pwt-cell ${cell.finishes ? "finish" : ""} ${hinderOnly ? "hinder" : ""} ${columnLit ? "col-lit" : ""} ${hot ? "hot" : ""} ${previewed ? "previewed" : ""} ${cell.rider ? "has-rider" : ""}`}
      onClick={onPick}
      onMouseEnter={onHover ? () => onHover(cell.target) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
      onFocus={onHover ? () => onHover(cell.target) : undefined}
      onBlur={onHover ? () => onHover(null) : undefined}
      disabled={!armed}
      aria-label={label}
      title={label}
    >
      {ally ? (
        <span className="pwt-cell-portrait">
          <Portrait u={{ species: ally.art, element: ally.element }} small />
        </span>
      ) : (
        <span className="pwt-cell-letter">{cell.letter}</span>
      )}
      {hinderOnly ? (
        <span className="pwt-cell-hinder">
          <Swords className="pwt-cell-hinder-icon" />
          <span className="pwt-cell-hinder-nums">
            <s className="pwt-cell-before">{cell.before}</s>
            <span className="pwt-cell-arrow">→</span>
            <span className="pwt-cell-num hinder">{cell.n}</span>
          </span>
        </span>
      ) : cell.immune ? (
        <span className="pwt-cell-immune-wrap">
          <Ban className="pwt-cell-immune-icon" />
        </span>
      ) : marked ? (
        <span className="pwt-cell-hinder own">
          <s className="pwt-cell-before">{cell.ownBefore}</s>
          <span className="pwt-cell-arrow">→</span>
          <span className={`pwt-cell-num own ${cell.n < cell.ownBefore! ? "down" : "up"}`}>{cell.n}</span>
        </span>
      ) : (
        <span className={`pwt-cell-num ${cell.finishes ? "finish" : ""} ${heal ? "heal" : ""}`}>
          {cell.finishes && <Skull className="pwt-cell-skull" />}
          {heal && <HeartPulse className="pwt-cell-heal-icon" />}
          {cell.n}
        </span>
      )}
      {!hinderOnly && !cell.immune && cell.step > 1 && (
        <span className="pwt-cell-chevron-wrap good">
          <ChevronUp />
        </span>
      )}
      {!hinderOnly && !cell.immune && cell.step > 0 && cell.step < 1 && (
        <span className="pwt-cell-chevron-wrap bad">
          <ChevronDown />
        </span>
      )}
      {cell.rider && (
        <span className="pwt-cell-rider" data-rider="">
          <Swords />
          <s>{cell.rider.before}</s>
          <span className="pwt-cell-arrow">→</span>
          {cell.rider.after}
        </span>
      )}
      {cell.absorbed > 0 && (
        <span className="pwt-cell-shield-note" title={`Its shield absorbs ${cell.absorbed} first`}>
          <Shield />
          <b>{cell.absorbed}</b>
        </span>
      )}
    </button>
  );
}

/**
  The foot line's timing words (paint review round 4, item 4): spelled out rather than
  bare numbers, so "once", "rests 1" and "ready in 1" all read as sentences about turns.
*/
function footWords(keyView: KeyView): string {
  if (keyView.state === "resting") return `ready in ${keyView.restLeft} ${keyView.restLeft === 1 ? "turn" : "turns"}`;
  if (keyView.state === "spent") return "spent";
  if (keyView.signature) return "once per fight";
  if (keyView.rests > 0) return `rests ${keyView.rests} ${keyView.rests === 1 ? "turn" : "turns"}`;
  return "";
}

export function KeyCard({
  keyView,
  squad,
  activeId,
  disabled,
  onAct,
  onHoverTarget,
  onHoverUnits,
  litTargets = [],
  noted = false,
  activeName,
  twoTap = false,
  previewed = null,
  onPreview,
}: {
  keyView: KeyView;
  /** The active companion's standing squadmates, for ally cells' portraits. */
  squad: SquadView[];
  disabled: boolean;
  onAct: (target: string) => void;
  /** Hovering an enemy-aimed cell (or its letter, in the "same" layout) reports the target id,
      or null on leave (storyboard "choosing" step: ring the enemy, draw the aim line). */
  onHoverTarget?: (targetId: string | null) => void;
  /** The active companion, so a self-only key can ring the unit it affects. */
  activeId?: string;
  /** Hovering a key that lands on companions (a self-only key, or an ally cell) reports the
      units it affects so the stage rings them; null on leave. */
  onHoverUnits?: (ids: string[] | null) => void;
  /** The enemies under the pointer (from any key or the stage; every enemy an area key reaches):
      their cells light in every key. */
  litTargets?: string[];
  /** A first-occurrence note is about this key (the note itself sits on the key bar's top line). */
  noted?: boolean;
  /** The acting companion's name, for the hit numbers' words. */
  activeName?: string;
  /** Touch on a phone: the first tap on a cell previews it, the second uses it (phone.ts). */
  twoTap?: boolean;
  /** The previewed cell's id across every key, or null. */
  previewed?: string | null;
  onPreview?: (id: string | null) => void;
}) {
  const armed = keyView.state === "ready" && !disabled;
  // The pointer is on some cell of this area key: all of its cells light, and only this key's.
  const [areaHot, setAreaHot] = useState(false);
  // A cell answers a tap by previewing (who it lands on is ringed on the stage) or, when it is
  // the one already previewed, by acting. Off touch, and off phone, every press acts at once.
  const press = (id: string, target: string, preview: () => void) => {
    if (tapStep(twoTap, previewed, id) === "preview") {
      onPreview?.(id);
      preview();
      return;
    }
    onPreview?.(null);
    onAct(target);
  };
  // A hinder-only key names its hinder in its head, so two hinder keys never look alike by their cells
  // alone (the signature's 21 and an ordinary 14 read differently before any cell is read).
  const hinderHead = keyView.kind === "support" && keyView.aim === "enemy" ? keyView.supports.find((x) => x.kind === "hinder") : undefined;
  const previewedHere = !!previewed && previewed.startsWith(`${keyView.index}:`);
  const foot = previewedHere ? "tap again to use" : footWords(keyView);
  // The units a self-only key lands on: the user, or the whole standing squad.
  const nowIds = keyView.supports[0]?.all ? [activeId, ...squad.map((u) => u.id)].filter((x): x is string => !!x) : activeId ? [activeId] : [];
  // One rule for every enemy-aimed key: a cell per standing enemy, even when the numbers match.
  // Only an area attack draws the ALL band across them: a visible band labeled ALL, so it
  // does not read as a single target (blind readers took Water Sweep for one — paint
  // review round 4, item 2). The cells underneath stay individually clickable.
  const showAreaBand = keyView.area && keyView.aim === "enemy" && keyView.cells.length > 1;
  // An area key lands on every enemy it reaches: pointing at any of its cells rings them all and
  // lights every one of its cells, so the key never reads as aimed at one.
  const areaIds = keyView.area && keyView.aim === "enemy" ? keyView.cells.map((c) => c.target) : null;
  return (
    <div
      className={`pwt-key ${keyView.state} ${keyView.signature ? "signature" : ""} ${noted ? "noted" : ""}`}
      role="group"
      aria-label={keyView.name}
    >
      <div className="pwt-key-head">
        <span className="pwt-key-index">{keyView.index + 1}</span>
        <span className="pwt-key-name">{keyView.name}</span>
        {hinderHead && (
          <span className="pwt-key-hinder" title={`Hinder ${hinderHead.n}: that enemy's next hit falls by ${hinderHead.n}`} data-hinder={hinderHead.n}>
            -{hinderHead.n}
          </span>
        )}
        {keyView.signature && (
          <span className="pwt-key-star" title="Signature: once per fight" aria-label="Signature move">
            <Star />
          </span>
        )}
      </div>
      {keyView.aim === "now" ? (
        <div className="pwt-cells-wrap">
          <div className="pwt-cells">
            <button
              type="button"
              className={`pwt-cell now ${previewed === cellId(keyView.index, "now") ? "previewed" : ""}`}
              disabled={!armed}
              onClick={() =>
                press(cellId(keyView.index, "now"), keyView.cells[0]?.target ?? "", () => onHoverUnits?.(nowIds))
              }
              onMouseEnter={onHoverUnits ? () => onHoverUnits(nowIds) : undefined}
              onMouseLeave={onHoverUnits ? () => onHoverUnits(null) : undefined}
              onFocus={onHoverUnits ? () => onHoverUnits(nowIds) : undefined}
              onBlur={onHoverUnits ? () => onHoverUnits(null) : undefined}
              aria-label={`${keyView.name}: ${keyView.supports
                .map((s) => `${SUPPORT_WORD[s.kind]} ${s.n}`)
                .join(", ")}, ${keyView.supports[0]?.all ? "whole squad" : "on itself"}`}
            >
              <span className="pwt-key-now-chips">
                {keyView.supports.map((s) => (
                  <span key={`${s.kind}-${s.aim}`} className={`pwt-key-now-chip ${s.kind}`}>
                    <SupportIcon kind={s.kind} />
                    {s.n}
                  </span>
                ))}
              </span>
              <span className="pwt-key-now-label">
                {keyView.supports[0]?.all ? "whole squad" : "on itself"}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className={`pwt-cells-wrap ${showAreaBand ? "area" : ""}`}>
          {showAreaBand && (
            <div className="pwt-area-band" aria-hidden="true">
              <span>ALL</span>
            </div>
          )}
          <div className="pwt-cells">
            {keyView.cells.map((c) => {
              const ally = keyView.aim === "ally" ? squad.find((s) => s.id === c.target) : undefined;
              return (
                <CellButton
                  key={c.target}
                  cell={c}
                  kind={keyView.kind}
                  keyName={keyView.name}
                  targetName={ally?.name ?? c.letter ?? "target"}
                  activeName={activeName}
                  ally={ally}
                  armed={armed}
                  previewed={previewed === cellId(keyView.index, c.target)}
                  onPick={() =>
                    press(cellId(keyView.index, c.target), c.target, () =>
                      areaIds ? onHoverUnits?.(areaIds) : keyView.aim === "enemy" ? onHoverTarget?.(c.target) : onHoverUnits?.([c.target])
                    )
                  }
                  onHover={
                    areaIds && onHoverUnits
                      ? (id) => {
                          setAreaHot(!!id);
                          onHoverUnits(id ? areaIds : null);
                        }
                      : keyView.aim === "enemy"
                      ? onHoverTarget
                      : onHoverUnits
                      ? (id) => onHoverUnits(id ? [id] : null)
                      : undefined
                  }
                  columnLit={keyView.aim === "enemy" && litTargets.includes(c.target)}
                  hot={!!areaIds && (areaHot || previewedHere)}
                />
              );
            })}
          </div>
        </div>
      )}
      <div className="pwt-key-foot">
        <span className="pwt-key-foot-words">{foot}</span>
        {keyView.aim === "enemy" && keyView.kind === "attack" && (
          <SupportRiders supports={keyView.supports} area={keyView.area} kept={keyView.riderKept} />
        )}
      </div>
    </div>
  );
}
