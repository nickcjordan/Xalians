import React from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight, Cross, Heart, HeartCrack, LogOut, Timer, Trophy } from "lucide-react";
import { Portrait } from "../powerworksVisuals";
import type { BriefingView, CampView, Ending, RecordEntry, RunSummary, SinceItem, SquadView, TitleCard, TurnView } from "./view";

/** The screen before a new run's first turn: the goal, the sectors, the squad, the run rules. */
export function BriefingPanel({ briefing, onBegin }: { briefing: BriefingView; onBegin: () => void }) {
  return (
    <div className="pwt-overlay pwt-briefing-overlay">
      <div className="pwt-panel pwt-briefing" role="dialog" aria-label="Briefing">
        <p className="eyebrow">Powerworks</p>
        <h2>{briefing.goal}</h2>
        <ol className="pwt-briefing-sectors" aria-label="The sectors">
          {briefing.sectors.map((s) => (
            <li key={s.n} className={s.guardian ? "guardian" : ""}>
              <span className="pwt-briefing-n">Sector {s.n}</span>
              <span className="pwt-briefing-name">{s.name}</span>
              {s.guardian && <span className="pwt-briefing-tag">Guardian</span>}
            </li>
          ))}
        </ol>
        <div className="pwt-briefing-squad" aria-label="Your squad">
          {briefing.squad.map((u) => (
            <div key={u.id} className="pwt-briefing-unit">
              <div className="pwt-portrait-ring big">
                <Portrait u={{ species: u.art, element: u.element }} />
              </div>
              <span className="pwt-name">{u.name}</span>
              <span className="pwt-briefing-hp">
                {u.hp} / {u.max} health
              </span>
            </div>
          ))}
        </div>
        <ul className="pwt-briefing-rules">
          {briefing.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <div className="pwt-panel-actions">
          <button type="button" className="pwt-primary" onClick={onBegin} autoFocus>
            Begin <ArrowRight />
          </button>
          <Link to="/" className="pwt-secondary pwt-linkbtn">
            <ArrowLeft /> Back to Xalians
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Held over the stage on entering a sector, then gone. */
export function TitleCardView({ card }: { card: TitleCard }) {
  return (
    <div className="pwt-titlecard" role="status" aria-live="polite" data-title-card="">
      <p className="pwt-titlecard-kicker">{card.kicker}</p>
      <h2 className="pwt-titlecard-name">{card.name}</h2>
      {card.guardian && <p className="pwt-titlecard-tag">Guardian sector</p>}
      <p className="pwt-titlecard-enemies">
        {card.enemies.map((e, i) => (
          <span key={`${e.letter}-${i}`}>
            <b>{e.letter}</b> {e.name}
          </span>
        ))}
      </p>
      {card.note && <p className="pwt-titlecard-note">{card.note}</p>}
    </div>
  );
}

export function CampPanel({
  view,
  camp,
  revived,
  onRevive,
  onContinue,
  onRetreat,
}: {
  view: TurnView;
  camp: CampView;
  /** A revive just happened: the companion, the health it came back with, and the line about it. */
  revived: { id: string; to: number; words: string } | null;
  onRevive: (id: string) => void;
  onContinue: () => void;
  onRetreat: () => void;
}) {
  const offerRevive = camp.revives.length > 0;
  return (
    <div className="pwt-overlay">
      <div className="pwt-panel" role="dialog" aria-label="Camp">
        <p className="eyebrow">Sector cleared</p>
        <h2>Camp</h2>
        <p className="pwt-panel-total">
          +{view.xpGain} XP this sector · {view.xp} in all
        </p>
        <p>Squad health carries forward. Cooldowns and signatures refresh.</p>
        {camp.station && (
          <p className="pwt-station">
            <Cross /> {camp.station.text}
          </p>
        )}
        <div className="pwt-panel-squad">
          {view.squad.map((u) => (
            <div key={u.id} className={`pwt-panel-unit ${u.down ? "down" : ""} ${revived?.id === u.id ? "revived" : ""}`}>
              <div className="pwt-portrait-ring">
                <Portrait u={{ species: u.art, element: u.element }} />
              </div>
              {revived?.id === u.id && <span className="pwt-revived-num">+{revived.to}</span>}
              <span className="pwt-name">{u.name}</span>
              <span>
                {u.hp} / {u.max}
              </span>
              {u.down && <span className="pwt-down-tag">Down</span>}
            </div>
          ))}
        </div>
        {revived && (
          <p className="pwt-revived-line" role="status">
            <Heart /> {revived.words}
          </p>
        )}
        {!offerRevive && !revived && view.squad.some((u) => u.down) && <p>No revives left.</p>}
        <div className="pwt-panel-actions">
          {camp.revives.map((r, i) => (
            <button
              key={r.id}
              type="button"
              className={i === 0 ? "pwt-primary" : "pwt-secondary"}
              onClick={() => onRevive(r.id)}
              autoFocus={i === 0}
            >
              <Heart /> {r.text}
            </button>
          ))}
          <button
            type="button"
            className={offerRevive ? "pwt-secondary" : "pwt-primary"}
            onClick={onContinue}
            autoFocus={!offerRevive}
          >
            Continue <ArrowRight />
          </button>
          <button type="button" className="pwt-secondary" onClick={onRetreat} title="Leave the expedition here and end the run">
            Retreat
          </button>
        </div>
        {camp.unusedNote && <p className="pwt-panel-note">{camp.unusedNote}</p>}
      </div>
    </div>
  );
}

const END_MARK = { won: Trophy, lost: HeartCrack, withdrew: LogOut, forced: Timer } as const;

/** The end of a run: victory and defeat get their own layouts; withdrew and forced out share the defeat family. */
export function EndPanel({
  ending,
  summary,
  squad,
  onPlayAgain,
}: {
  ending: Ending;
  summary: RunSummary;
  squad: SquadView[];
  onPlayAgain: () => void;
}) {
  const { kind, title, text } = ending;
  const Mark = END_MARK[kind];
  const shown = kind === "won" ? squad.filter((u) => !u.down) : squad;
  return (
    <div className="pwt-overlay">
      <div className={`pwt-panel pwt-end ${kind}`} role="dialog" aria-label="Expedition report">
        <p className="eyebrow">Expedition report</p>
        <h2>
          <span className="pwt-end-mark" aria-hidden="true">
            <Mark />
          </span>
          {title}
        </h2>
        <p>{text}</p>
        <div className="pwt-end-squad" aria-label={kind === "won" ? "The surviving squad" : "The squad"}>
          {shown.map((u) => (
            <div key={u.id} className={`pwt-end-unit ${u.down ? "down" : ""}`}>
              <div className="pwt-portrait-ring big">
                <Portrait u={{ species: u.art, element: u.element }} />
              </div>
              <span className="pwt-name">{u.name}</span>
              <span className="pwt-end-hp">{u.down ? "Down" : `${u.hp} / ${u.max}`}</span>
            </div>
          ))}
        </div>
        <dl className="pwt-summary" aria-label="Run summary">
          {summary.rows.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
        <div className="pwt-panel-actions">
          <button type="button" className="pwt-primary" onClick={onPlayAgain} autoFocus>
            Play again <ArrowRight />
          </button>
          <Link to="/" className="pwt-secondary pwt-linkbtn">
            <ArrowLeft /> Back to Xalians
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
  The Record (UX pass 2): every beat's sentence, grouped by sector and round, newest first. The
  full "since your last turn" list sits on top while it has anything to say.
*/
export function RecordPanel({
  entries,
  roomNames,
  since,
  onClose,
}: {
  entries: RecordEntry[];
  roomNames: string[];
  since: SinceItem[];
  onClose: () => void;
}) {
  const groups: { key: string; room: number; round: number; lines: string[] }[] = [];
  for (const e of entries.slice().reverse()) {
    const last = groups[groups.length - 1];
    if (last && last.room === e.room && last.round === e.round) last.lines.push(e.words);
    else groups.push({ key: `${e.room}-${e.round}-${groups.length}`, room: e.room, round: e.round, lines: [e.words] });
  }
  return (
    <div className="pwt-overlay" onClick={onClose}>
      <div className="pwt-panel" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">Record</p>
        <h2>What happened</h2>
        <div className="pwt-record-list">
          {since.length > 0 && (
            <section className="pwt-record-since" aria-label="Since your last turn">
              <h3>Since your last turn</h3>
              {since.map((s) => (
                <p key={s.id}>{s.text}</p>
              ))}
            </section>
          )}
          {groups.length === 0 && <p>Nothing has happened yet.</p>}
          {groups.map((g) => (
            <section key={g.key} className="pwt-record-group" aria-label={`Sector ${g.room + 1}, round ${g.round}`}>
              <h3>
                Sector {g.room + 1} · {roomNames[g.room] ?? ""} · Round {g.round}
              </h3>
              {g.lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </section>
          ))}
        </div>
        <div className="pwt-panel-actions">
          <button type="button" className="pwt-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/** Cancel is first and the default; Restart wears the danger style, never the forward color. */
export function RestartPanel({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="pwt-overlay" onClick={onClose}>
      <div className="pwt-panel" role="dialog" aria-label="Restart" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow danger">Restart</p>
        <h2>Start a new expedition?</h2>
        <p>Your current squad and progress will be lost.</p>
        <div className="pwt-panel-actions">
          <button type="button" className="pwt-secondary" onClick={onClose} autoFocus>
            Cancel
          </button>
          <button type="button" className="pwt-danger" onClick={onConfirm}>
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}
