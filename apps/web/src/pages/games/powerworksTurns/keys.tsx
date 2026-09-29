import React from "react";
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
} from "lucide-react";
import { Portrait } from "../powerworksVisuals";
import type { Cell, KeyView, SquadView, SupportChip } from "./view";

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
function SupportRiders({ supports, area }: { supports: SupportChip[]; area: boolean }) {
  if (!supports.length) return null;
  return (
    <div className="pwt-riders">
      {supports.map((s) => {
        const whom = s.aim === "enemy" && area ? " each" : s.all ? ", whole squad" : "";
        return (
          <span
            key={`${s.kind}-${s.aim}`}
            className={`pwt-rider ${s.kind}`}
            title={`${SUPPORT_WORD[s.kind]} ${s.n}${whom}`}
          >
            <SupportIcon kind={s.kind} />
            {s.n}
            {s.aim === "enemy" && area ? <span className="pwt-rider-each">each</span> : null}
          </span>
        );
      })}
    </div>
  );
}

/** One target cell: an enemy letter head or an ally portrait head, the landed number, and its marks. */
function CellButton({
  cell,
  kind,
  keyName,
  targetName,
  ally,
  armed,
  onPick,
  onHover,
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
}) {
  const hinderOnly = kind === "support" && cell.before !== undefined;
  const heal = kind === "support" && !hinderOnly;
  const word = matchupWord(cell.step);
  const label = ally
    ? `${keyName} on ${targetName}: ${cell.n}${heal ? " health" : ""}`
    : hinderOnly
    ? `${keyName} on ${cell.letter}, ${targetName}: its next hit ${cell.before} to ${cell.n}`
    : `${keyName} on ${cell.letter}, ${targetName}: ${
        cell.immune ? "no effect" : `${cell.n} damage${word ? `, ${word}` : ""}${cell.finishes ? ", finishes" : ""}`
      }`;
  return (
    <button
      type="button"
      className={`pwt-cell ${cell.finishes ? "finish" : ""}`}
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
          <span className="pwt-cell-before">{cell.before}</span>
          <span className="pwt-cell-arrow">→</span>
          <span className="pwt-cell-num hinder">{cell.n}</span>
        </span>
      ) : cell.immune ? (
        <span className="pwt-cell-immune-wrap">
          <Ban className="pwt-cell-immune-icon" />
        </span>
      ) : (
        <span className={`pwt-cell-num ${cell.finishes ? "finish" : ""} ${heal ? "heal" : ""}`}>
          {cell.finishes && <Skull className="pwt-cell-skull" />}
          {heal && <HeartPulse className="pwt-cell-heal-icon" />}
          {cell.n}
        </span>
      )}
      {!hinderOnly && !cell.immune && cell.step > 1 && (
        <span className="pwt-cell-chevron-wrap up">
          <ChevronUp />
        </span>
      )}
      {!hinderOnly && !cell.immune && cell.step > 0 && cell.step < 1 && (
        <span className="pwt-cell-chevron-wrap down">
          <ChevronDown />
        </span>
      )}
      {cell.absorbed > 0 && (
        <span className="pwt-cell-shield-note" title={`${cell.absorbed} absorbed by shields`}>
          <Shield />
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
  disabled,
  onAct,
  onHoverTarget,
}: {
  keyView: KeyView;
  /** The active companion's standing squadmates, for ally cells' portraits. */
  squad: SquadView[];
  disabled: boolean;
  onAct: (target: string) => void;
  /** Hovering an enemy-aimed cell (or its letter, in the "same" layout) reports the target id,
      or null on leave (storyboard "choosing" step: ring the enemy, draw the aim line). */
  onHoverTarget?: (targetId: string | null) => void;
}) {
  const armed = keyView.state === "ready" && !disabled;
  const foot = footWords(keyView);
  // An area attack reaches every enemy: a visible band across its cells labeled ALL, so it
  // does not read as a single target (blind readers took Water Sweep for one — paint
  // review round 4, item 2). The cells underneath stay individually clickable.
  const showAreaBand = keyView.area && keyView.aim === "enemy" && !keyView.same && keyView.cells.length > 1;
  return (
    <div
      className={`pwt-key ${keyView.state} ${keyView.signature ? "signature" : ""}`}
      role="group"
      aria-label={keyView.name}
    >
      <div className="pwt-key-head">
        <span className="pwt-key-index">{keyView.index + 1}</span>
        <span className="pwt-key-name">{keyView.name}</span>
      </div>
      {keyView.aim === "now" ? (
        <button
          type="button"
          className="pwt-key-now"
          disabled={!armed}
          onClick={() => onAct(keyView.cells[0]?.target ?? "")}
          aria-label={`${keyView.name}: ${keyView.supports
            .map((s) => `${SUPPORT_WORD[s.kind]} ${s.n}`)
            .join(", ")}, ${keyView.supports[0]?.all ? "whole squad" : "on itself"}`}
        >
          {keyView.supports.map((s) => (
            <span key={`${s.kind}-${s.aim}`} className={`pwt-key-now-chip ${s.kind}`}>
              <SupportIcon kind={s.kind} />
              {s.n}
            </span>
          ))}
          <span className="pwt-key-now-label">
            {keyView.supports[0]?.all ? "whole squad" : "on itself"}
          </span>
        </button>
      ) : keyView.same && keyView.cells.length > 0 ? (
        <div className="pwt-same">
          <span className="pwt-same-num">{keyView.cells[0].n}</span>
          <span className="pwt-same-label">every enemy</span>
          <div className="pwt-same-letters">
            {keyView.cells.map((c) => (
              <button
                key={c.target}
                type="button"
                disabled={!armed}
                aria-label={`${keyView.name} on ${c.letter}: ${keyView.cells[0].n} damage`}
                onClick={() => onAct(c.target)}
                onMouseEnter={onHoverTarget ? () => onHoverTarget(c.target) : undefined}
                onMouseLeave={onHoverTarget ? () => onHoverTarget(null) : undefined}
                onFocus={onHoverTarget ? () => onHoverTarget(c.target) : undefined}
                onBlur={onHoverTarget ? () => onHoverTarget(null) : undefined}
              >
                {c.letter}
              </button>
            ))}
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
                  ally={ally}
                  armed={armed}
                  onPick={() => onAct(c.target)}
                  onHover={keyView.aim === "enemy" ? onHoverTarget : undefined}
                />
              );
            })}
          </div>
        </div>
      )}
      <div className="pwt-key-foot">
        <span className="pwt-key-foot-words">{foot}</span>
        {((keyView.aim === "enemy" && keyView.kind === "attack") || keyView.same) && (
          <SupportRiders supports={keyView.supports} area={keyView.area} />
        )}
      </div>
    </div>
  );
}
