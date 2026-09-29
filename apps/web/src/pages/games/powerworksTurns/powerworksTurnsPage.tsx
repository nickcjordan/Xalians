// Tier: immersive. Powerworks, turn by turn (docs/design/powerworks-turn-screen.md): a
// timeline decides who acts next, and on a companion's turn its four answer keys already
// carry their result on every target. Enemies play back between turns.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, BookOpen, ScrollText, RotateCcw, Smartphone } from "lucide-react";

import {
  createTurnRun,
  turnCommand,
  legalOrder,
  DEFAULT_RULES,
  PILLAR_SAVE_VERSION,
  type TRun,
  type TCommand,
} from "@xalians/rules/dungeon/pillars";

import { turnView, playback, type TurnView, type Beat } from "./view";
import { EnemyPlate, SquadPlate } from "./plate";
import { KeyCard } from "./keys";
import { TurnStrip } from "./strip";
import { Playback } from "./playback";
import { CampPanel, EndPanel, GuidePanel, RecordPanel, RestartPanel } from "./panels";
import { PowerworksEnvironment } from "../powerworksEnvironment";
import "./powerworksTurns.css";

const SAVE_KEY = "xalians.powerworks.turns.v1";
const CONSOLE = { width: 1280, height: 720 } as const;
const RULES = { ...DEFAULT_RULES, rooms: "roles" as const, timeline: "round" as const, enemyHpFactor: 0.62 };

/**
  Scale the fixed 1280x720 console to fit any landscape viewport, including below 1
  (unlike the v5 console, which never shrinks below 1: this contract calls for it so the
  screen still never scrolls on a small landscape window).
*/
function consoleScale(width: number, height: number): number {
  return Math.min(width / CONSOLE.width, height / CONSOLE.height);
}

function useConsoleScale() {
  const [box, setBox] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const read = () => setBox({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return consoleScale(box.w, box.h);
}

function readSeed(): number {
  const n = Number(new URLSearchParams(window.location.search).get("seed") || 1);
  return Number.isFinite(n) ? n : 1;
}

function boot(): TRun {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("seed")) {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.version === PILLAR_SAVE_VERSION && saved.state) return saved.state as TRun;
      }
    }
  } catch {
    /* A bad or unavailable save starts fresh. */
  }
  return createTurnRun(readSeed(), "starter", RULES).state;
}

function save(state: TRun) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: PILLAR_SAVE_VERSION, state }));
  } catch {
    /* Storage unavailable: play continues without a save. */
  }
}

type Panel = "guide" | "record" | "restart" | null;

export default function PowerworksTurnsPage() {
  const [run, setRun] = useState<TRun>(boot);
  const [pendingBeats, setPendingBeats] = useState<Beat[] | null>(null);
  const [beatIndex, setBeatIndex] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [armedAlly, setArmedAlly] = useState<{ index: number } | null>(null);
  const zoom = useConsoleScale();
  // The command's settled state, applied only once playback finishes (finishPlayback):
  // applying it earlier flips view.phase out from under the still-animating keybar/camp
  // block and orphans the Playback component mid-beat (paint review round 2 follow-up).
  const nextRun = useRef<TRun | null>(null);

  const view = useMemo(() => turnView(run), [run]);
  const busy = !!pendingBeats;

  useEffect(() => {
    save(run);
  }, [run]);

  useEffect(() => {
    const old = document.title;
    document.title = "Powerworks · Xalians";
    return () => {
      document.title = old;
    };
  }, []);

  function dispatch(command: TCommand) {
    try {
      const before = run;
      const result = turnCommand(run, command);
      if (command.kind === "act") {
        const beats = playback(before, result.events);
        if (beats.length) {
          // Hold the settled state until playback actually finishes (see nextRun above):
          // view.phase (and so the keybar/camp switch) must not change mid-animation.
          nextRun.current = result.state;
          setPendingBeats(beats);
          setBeatIndex(0);
          return;
        }
      }
      setRun(result.state);
    } catch {
      /* An illegal command from a stale key: ignore it, the view will not offer it again. */
    }
  }

  function finishPlayback() {
    if (nextRun.current) {
      setRun(nextRun.current);
      nextRun.current = null;
    }
    setPendingBeats(null);
    setBeatIndex(0);
  }

  function act(index: number, target: string) {
    if (busy) return;
    setArmedAlly(null);
    dispatch({ kind: "act", order: { move: index, target } });
  }

  function pass() {
    if (busy || !view.active) return;
    dispatch({ kind: "act", order: { move: -2, target: view.active.id } });
  }

  // Keyboard: 1-4 picks a key; while an aimed key is armed, A-F an enemy cell, 1-4 a
  // squadmate cell; Escape backs out; P passes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (busy || panel || e.altKey || e.ctrlKey || e.metaKey) return;
      const field = (e.target as Element | null)?.closest?.("input, textarea, select");
      if (field) return;
      if (e.key === "Escape") {
        setArmedAlly(null);
        return;
      }
      if (e.key.toLowerCase() === "p") {
        pass();
        return;
      }
      if (/^[1-4]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        const key = view.keys[i];
        if (!key || key.state !== "ready") return;
        if (key.aim === "now") {
          act(key.index, key.cells[0]?.target ?? view.active?.id ?? "");
        } else if (key.aim === "ally" && armedAlly) {
          const cell = key.cells[i];
          if (cell) act(key.index, cell.target);
        } else {
          setArmedAlly({ index: i });
        }
        return;
      }
      if (armedAlly !== null) {
        const key = view.keys[armedAlly.index];
        if (!key) return;
        if (key.aim === "enemy" && /^[a-f]$/i.test(e.key)) {
          const letter = e.key.toUpperCase();
          const cell = key.cells.find((c) => c.letter === letter);
          if (cell) act(key.index, cell.target);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, busy, panel, armedAlly]);

  function restart() {
    const next = createTurnRun((run.seed + 1) >>> 0, "starter", RULES).state;
    setRun(next);
    setPendingBeats(null);
    setPanel(null);
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* Storage unavailable: nothing to clear. */
    }
  }

  const roomName = view.roomName;
  const currentBeat = pendingBeats ? pendingBeats[Math.min(beatIndex, pendingBeats.length - 1)] : undefined;
  const actorId = currentBeat?.actor;

  // The floating number (item 9): positioned over the target's own plate, not the page
  // origin. Measured against the stage's bounding box so it survives the console zoom.
  const stageRef = useRef<HTMLDivElement>(null);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    if (!currentBeat || currentBeat.event.kind !== "hit" || !stageRef.current) {
      setFloatPos(null);
      return;
    }
    const targetId = currentBeat.event.target;
    const stageBox = stageRef.current.getBoundingClientRect();
    const zoomFactor = stageBox.width / stageRef.current.offsetWidth || 1;
    const el = stageRef.current.querySelector<HTMLElement>(`[data-unit="${targetId}"] .pwt-figure`);
    if (!el) {
      setFloatPos(null);
      return;
    }
    const box = el.getBoundingClientRect();
    setFloatPos({
      x: (box.left + box.width / 2 - stageBox.left) / zoomFactor,
      y: (box.top + box.height * 0.3 - stageBox.top) / zoomFactor,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBeat]);

  return (
    <main className="pwt" data-tier="immersive" id="main">
      <div
        className="pwt-console"
        style={{ zoom, width: CONSOLE.width, height: CONSOLE.height } as React.CSSProperties}
      >
        <header className="pwt-top">
          <Link to="/" className="pwt-brand">
            <ArrowLeft size={16} />
            <span>XALIANS</span>
          </Link>
          <div className="pwt-room">
            <span className="pwt-round" style={{ marginBottom: 2 }}>
              SECTOR {view.room + 1}/{view.roomCount}
            </span>
            <h1>{roomName}</h1>
          </div>
          <span className="pwt-round">Round {view.round}</span>
          <nav className="pwt-top-tools" aria-label="Tools">
            <button type="button" onClick={() => setPanel("guide")}>
              <BookOpen /> Guide
            </button>
            <button type="button" onClick={() => setPanel("record")}>
              <ScrollText /> Record
            </button>
            <button type="button" onClick={() => setPanel("restart")}>
              <RotateCcw /> Restart
            </button>
          </nav>
        </header>

        <div className="pwt-stage" ref={stageRef}>
          <PowerworksEnvironment room={view.room} className="pw-environment" />
          <div className="pwt-rows">
            <div className="pwt-row enemies">
              {view.enemies.map((e) => (
                <EnemyPlate
                  key={e.id}
                  u={e}
                  lit={busy && actorId === e.id}
                  activeName={view.active?.name}
                />
              ))}
            </div>
            <div className="pwt-row squad">
              {view.squad.map((u) => (
                <SquadPlate key={u.id} u={u} lit={busy && actorId === u.id} />
              ))}
            </div>
          </div>
          {currentBeat && currentBeat.event.kind === "hit" && floatPos && (
            <span
              className={`pwt-float-num ${currentBeat.event.amount < 0 ? "heal" : ""}`}
              style={{ left: floatPos.x, top: floatPos.y }}
              aria-hidden="true"
            >
              {currentBeat.event.amount >= 0 ? "-" : "+"}
              {Math.abs(currentBeat.event.amount)}
            </span>
          )}
        </div>

        {view.phase === "turn" && view.active && (
          <>
            <div className={`pwt-keybar ${busy ? "busy" : ""}`}>
              {view.keys.map((k) => (
                <KeyCard
                  key={k.index}
                  keyView={k}
                  squad={view.squad.filter((s) => s.id !== view.active!.id && !s.down)}
                  disabled={busy}
                  onAct={(target) => act(k.index, target)}
                />
              ))}
              <button type="button" className="pwt-pass" disabled={busy} onClick={pass}>
                Pass
              </button>
              {/* The playback caption lives over the dimmed key bar, never the stage, so it
                  never covers a squad plate (paint review round 2, item 1). */}
              {pendingBeats && (
                <Playback beats={pendingBeats} onBeat={setBeatIndex} onDone={finishPlayback} />
              )}
            </div>
            <TurnStrip round={view.round} strip={view.strip} />
          </>
        )}

        {view.phase === "camp" && !busy && (
          <CampPanel
            view={view}
            onRevive={(id) => dispatch({ kind: "revive", id })}
            onContinue={() => dispatch({ kind: "advance" })}
          />
        )}
        {(view.phase === "won" || view.phase === "lost" || view.phase === "retreated") && !busy && (
          <EndPanel phase={view.phase} onPlayAgain={restart} />
        )}

        {panel === "guide" && <GuidePanel onClose={() => setPanel(null)} />}
        {panel === "record" && <RecordPanel log={run.log} onClose={() => setPanel(null)} />}
        {panel === "restart" && (
          <RestartPanel onConfirm={restart} onClose={() => setPanel(null)} />
        )}
      </div>
      <div className="pwt-rotate">
        <Smartphone />
        <p>Turn your screen upright to play.</p>
      </div>
    </main>
  );
}
