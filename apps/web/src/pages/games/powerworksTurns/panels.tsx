import React from "react";
import { ArrowRight, Heart, RotateCcw, Trophy, Shield, X } from "lucide-react";
import { Portrait } from "../powerworksVisuals";
import type { Ending, RecordEntry, SinceItem, TurnView } from "./view";

export function CampPanel({
  view,
  onRevive,
  onContinue,
  onRetreat,
}: {
  view: TurnView;
  onRevive: (id: string) => void;
  onContinue: () => void;
  onRetreat: () => void;
}) {
  const lastRoom = view.roomCount - 1;
  const before = lastRoom - 1;
  return (
    <div className="pwt-overlay">
      <div className="pwt-panel">
        <p className="eyebrow">Sector cleared</p>
        <h2>+{view.xpGain} XP</h2>
        <p className="pwt-panel-total">Practice XP so far: {view.xp}</p>
        <p>Squad health carries forward. Cooldowns and signatures refresh.</p>
        {view.room === before && (
          <p>
            <Shield /> The next sector holds a recovery station.
          </p>
        )}
        <div className="pwt-panel-squad">
          {view.squad.map((u) => (
            <div key={u.id} className={`pwt-panel-unit ${u.down ? "down" : ""}`}>
              <div className="pwt-portrait-ring">
                <Portrait u={{ species: u.art, element: u.element }} />
              </div>
              <span className="pwt-name">{u.name}</span>
              <span>
                {u.hp} / {u.max}
              </span>
              {u.down && view.revivalLeft > 0 && (
                <button type="button" className="pwt-revive-btn" onClick={() => onRevive(u.id)}>
                  <Heart /> Revive
                </button>
              )}
              {u.down && view.revivalLeft <= 0 && <span>No revival left</span>}
            </div>
          ))}
        </div>
        <div className="pwt-panel-actions">
          <button type="button" className="pwt-primary" onClick={onContinue}>
            Continue <ArrowRight />
          </button>
          <button
            type="button"
            className="pwt-secondary"
            onClick={onRetreat}
            title="Leave the expedition here and end the run"
          >
            Retreat
          </button>
        </div>
      </div>
    </div>
  );
}

export function EndPanel({ ending, onPlayAgain }: { ending: Ending; onPlayAgain: () => void }) {
  const { kind, title, text } = ending;
  return (
    <div className="pwt-overlay">
      <div className="pwt-panel">
        <p className="eyebrow">Expedition report</p>
        <h2>
          {kind === "won" ? <Trophy /> : kind === "lost" ? <X /> : <RotateCcw />} {title}
        </h2>
        <p>{text}</p>
        <div className="pwt-panel-actions">
          <button type="button" className="pwt-primary" onClick={onPlayAgain}>
            Play again <ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}

export function GuidePanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="pwt-overlay" onClick={onClose}>
      <div className="pwt-panel" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">Guide</p>
        <h2>How a turn works</h2>
        <ul>
          <li>Each key shows what it does to every legal target, in health, before you pick it.</li>
          <li>Element works both ways: your move's element against the enemy, and the enemy's attack against you.</li>
          <li>A key rests for a few of its own turns after use; the signature move works once per fight.</li>
          <li>The turn strip along the bottom shows the round in order. Enemies act on their own turns.</li>
          <li>Keyboard: 1 to 4 picks a key, A to F an enemy cell, 1 to 4 a squadmate cell, Escape backs out, P passes.</li>
        </ul>
        <div className="pwt-panel-actions">
          <button type="button" className="pwt-secondary" onClick={onClose}>
            Close
          </button>
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

export function RestartPanel({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="pwt-overlay" onClick={onClose}>
      <div className="pwt-panel" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">Restart</p>
        <h2>Start a new expedition?</h2>
        <p>Your current squad and progress will be lost.</p>
        <div className="pwt-panel-actions">
          <button type="button" className="pwt-primary" onClick={onConfirm}>
            Restart <ArrowRight />
          </button>
          <button type="button" className="pwt-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
