import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  Zap,
  Crosshair,
  RotateCcw,
  ChevronRight,
  BookOpen,
  Activity,
  Check,
  Heart,
} from "lucide-react";
import {
  createRun,
  command,
  resolveRound,
  restoreRun,
  legalMoves,
  moveAt,
  damagePreview,
  ROOMS,
  type Run,
  type Unit,
  type Order,
  type Command,
  type Frame,
} from "@xalians/rules/dungeon";
import graviclaw from "../../svg/species/graviclaw.svg?url";
import avilily from "../../svg/species/avilily.svg?url";
import crystorn from "../../svg/species/crystorn.svg?url";
import hippochamp from "../../svg/species/hippochamp.svg?url";
import "./powerworks.css";

const portraits: Record<string, string> = {
  graviclaw,
  avilily,
  crystorn,
  hippochamp,
};
const SAVE_KEY = "xalians.powerworks.v1";
const roomCopy = [
  "Cold machinery stirs as your squad crosses the service threshold.",
  "The checkpoint wakes. Beam emitters cover the armored maintenance units.",
  "Stored energy hums beneath the floor. Watch for a charging capacitor.",
  "The guardian is online. Disrupt its charge, but prepare for it to rebuild.",
];
function boot() {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) return { ...restoreRun(saved), started: true };
  } catch {
    /* A stale or unavailable save must not prevent a new run. */
  }
  const seed = Number(
    new URLSearchParams(window.location.search).get("seed") || 1
  );
  return {
    state: createRun(Number.isFinite(seed) ? seed : 1),
    history: [] as Command[],
    started: false,
  };
}
function Machine({ species }: { species: string }) {
  return (
    <svg
      viewBox="0 0 180 130"
      className={`pw-machine pw-machine-${species}`}
      aria-hidden="true"
    >
      <ellipse
        cx="90"
        cy="119"
        rx="59"
        ry="6"
        fill="currentColor"
        opacity=".12"
      />
      {species === "drone" ? (
        <>
          <path d="M12 60 54 44 68 67 50 80ZM168 60 126 44 112 67 130 80Z" />
          <path d="M64 43 90 29 116 43 116 83 90 99 64 83Z" />
          <circle cx="90" cy="64" r="13" className="pw-core" />
          <path d="M90 29V15M81 15H99M79 99 73 113M101 99 107 113" />
        </>
      ) : (
        <>
          <path d="M48 72 27 83 18 109M132 72 153 83 162 109M61 92 45 108 45 117M119 92 135 108 135 117" />
          <path
            d={
              species === "guardian"
                ? "M47 36 69 17 112 17 134 36 126 91 108 109 72 109 54 91Z"
                : "M50 55 69 37 111 37 130 55 124 88 109 102 71 102 56 88Z"
            }
          />
          {species === "shield" ? (
            <path
              d="M90 42 116 54 112 82 90 98 68 82 64 54Z"
              className="pw-core"
            />
          ) : (
            <circle
              cx="90"
              cy="68"
              r={species === "guardian" ? 23 : 15}
              className="pw-core"
            />
          )}
          {(species === "guardian" || species === "discharge") && (
            <path d="m95 43-15 26h14l-9 24 23-32H94Z" className="pw-bolt" />
          )}
          <path d="M61 45 42 28 32 40M119 45 138 28 148 40" />
        </>
      )}
    </svg>
  );
}
function status(u: Unit) {
  if (u.hp <= 0) return "OFFLINE";
  const effects = [
    u.charge ? "CHARGED — RELEASE NEXT" : "",
    u.recovery ? "RECOVERING" : "",
    u.snared ? "RESTRAINED" : "",
    u.ward ? "SHIELDED · ½ DAMAGE" : "",
  ].filter(Boolean);
  return (
    effects.join(" / ") ||
    (u.species === "drone"
      ? "RANGED ATTACKER"
      : u.species === "shield"
      ? "SELF-PROTECTION"
      : "MELEE ATTACKER")
  );
}
function Health({ u }: { u: Unit }) {
  return (
    <div className="pw-health">
      <div>
        <span>{u.hp === 0 ? "Knocked out" : "Health"}</span>
        <strong>
          {u.hp}
          <small> / {u.max}</small>
        </strong>
      </div>
      <meter min="0" max={u.max} value={u.hp} aria-label={`${u.name} health`} />
    </div>
  );
}

export default function PowerworksPage() {
  const [initial] = useState(boot);
  const [run, setRun] = useState<Run>(initial.state);
  const [history, setHistory] = useState<Command[]>(initial.history);
  const [started, setStarted] = useState(initial.started);
  const [selected, setSelected] = useState(
    initial.state.team.find((u) => u.hp > 0)?.id || "G"
  );
  const [plans, setPlans] = useState<Record<string, Order>>({});
  const [pendingMove, setPendingMove] = useState<number | null>(null);
  const [playback, setPlayback] = useState<Frame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [error, setError] = useState("");
  const [restart, setRestart] = useState(false);
  const [rules, setRules] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const restartDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (restart) restartDialog.current?.showModal();
  }, [restart]);
  const busy = playback.length > 0;
  const frame = playback[frameIndex];
  const team = frame?.team ?? run.team,
    enemies = frame?.enemies ?? run.enemies;
  const active =
    run.team.find((u) => u.id === selected && u.hp > 0) ??
    run.team.find((u) => u.hp > 0);
  const chosenMove =
    active && pendingMove !== null ? moveAt(active, pendingMove) : null;
  const living = run.team.filter((u) => u.hp > 0);
  const ready = living.filter(
    (u) => plans[u.id] || !legalMoves(u).length
  ).length;
  const planning = started && run.phase === "planning" && !busy;

  useEffect(() => {
    if (!started) return;
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ version: 1, seed: run.seed, history })
      );
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  }, [history, run.seed, started]);
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => {
      if (frameIndex + 1 < playback.length) setFrameIndex((i) => i + 1);
      else {
        setPlayback([]);
        setFrameIndex(0);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [busy, frameIndex, playback]);
  useEffect(() => {
    if (!busy) heading.current?.focus();
  }, [run.phase, run.room, busy]);

  function apply(action: Command) {
    try {
      setRun(command(run, action));
      setHistory((h) => [...h, action]);
      setPlans({});
      setPendingMove(null);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function target(id: string) {
    if (!active || pendingMove === null || !planning) return;
    const next = { ...plans, [active.id]: { move: pendingMove, target: id } };
    setPlans(next);
    setPendingMove(null);
    const unplanned = living.find((u) => !next[u.id] && legalMoves(u).length);
    if (unplanned) setSelected(unplanned.id);
  }
  function commit() {
    const orders = { ...plans };
    for (const u of living)
      if (!legalMoves(u).length) orders[u.id] = { move: -2, target: "" };
    try {
      const result = resolveRound(run, orders);
      setRun(result.state);
      setHistory((h) => [...h, { kind: "round", orders }]);
      setPlans({});
      setPendingMove(null);
      setError("");
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setPlayback(result.frames);
        setFrameIndex(0);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function fresh(seed: number) {
    setRun(createRun(seed));
    setHistory([]);
    setPlans({});
    setPendingMove(null);
    setPlayback([]);
    setRestart(false);
    setStarted(true);
    setSelected("G");
    setError("");
  }

  return (
    <main className="pw" id="main">
      <header className="pw-top">
        <Link to="/" className="pw-back">
          <ArrowLeft size={16} /> XALIANS
        </Link>
        <span className="pw-top-label">
          DUNGEON FIELD TEST <span className="pw-dot" />
        </span>
        <button onClick={() => setRules((v) => !v)} aria-expanded={rules}>
          <BookOpen size={16} /> Field guide
        </button>
      </header>
      <div className="pw-shell">
        <div className="pw-title">
          <div>
            <p className="pw-kicker">
              EXPEDITION 001 / AUTOMATED DEFENSE NETWORK
            </p>
            <h1>The Dormant Powerworks</h1>
            <p>Four companions. A sleeping facility. One way through.</p>
          </div>
          <span className="pw-prototype">PLAYABLE PROTOTYPE</span>
        </div>
        {rules && (
          <section className="pw-guide">
            <h2>Field guide</h2>
            <p>
              Choose a companion, choose its move, then select an enemy. Commit
              once every standing companion has an order. All actions resolve
              fastest first; enemy orders stay hidden.
            </p>
            <div className="pw-guide-grid">
              <p>
                <strong>Restraint ≠ stun</strong>
                <br />
                Melee is blocked through the next opportunity. Ranged actions
                work. Blocked moves keep their uses.
              </p>
              <p>
                <strong>Commit carefully</strong>
                <br />
                If a target falls, the same move redirects to the next living
                enemy in row order. Damage previews reflect current defenses,
                which can change.
              </p>
              <p>
                <strong>Limited moves</strong>
                <br />
                Three uses per secondary, one per signature, refreshed each
                encounter. After all damaging moves run out, Desperate strike
                deals 3 neutral damage with 2 recoil.
              </p>
              <p>
                <strong>Survive the run</strong>
                <br />
                Health and knockouts carry forward. One half-health revival
                between fights. A station before the boss restores 10 HP to
                standing companions.
              </p>
              <p>
                <strong>Read the charge</strong>
                <br />
                Charge → melee release → ordinary recovery attack. Restraint
                stops the release, but the enemy can charge again after
                recovery.
              </p>
              <p>
                <strong>Practice expedition</strong>
                <br />
                Temporary cards and numbers. XP is a run score, not an account
                reward. No tokens are awarded. This browser saves your run after
                each round.
              </p>
            </div>
          </section>
        )}
        {!started ? (
          <section className="pw-briefing">
            <div>
              <p className="pw-kicker">MISSION BRIEFING</p>
              <h2>Wake the wrong machines.</h2>
              <p>
                Cross the service entrance, breach the checkpoint, and shut down
                the central guardian. Your squad’s health carries from one
                battle to the next.
              </p>
              <div className="pw-brief-stats">
                <span>
                  <strong>4</strong> encounters
                </span>
                <span>
                  <strong>4</strong> companions
                </span>
                <span>
                  <strong>1</strong> emergency revival
                </span>
              </div>
              <button className="pw-primary" onClick={() => setStarted(true)}>
                Enter the facility <ArrowRight size={18} />
              </button>
              <p className="pw-fine">
                No account needed · Local practice rewards · Progress saved in
                this browser
              </p>
            </div>
            <div className="pw-brief-art">
              <Machine species="guardian" />
              <span>CORE GUARDIAN / STATUS UNKNOWN</span>
            </div>
            <div className="pw-roster-preview">
              {run.team.map((u) => (
                <div key={u.id}>
                  <img src={portraits[u.species]} alt="" />
                  <strong>{u.name}</strong>
                  <span>
                    {u.element} · {u.max} HP
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
            <nav className="pw-route" aria-label="Dungeon progress">
              {ROOMS.map((room, i) => (
                <div
                  key={room.name}
                  className={
                    i === run.room ? "current" : i < run.room ? "complete" : ""
                  }
                  aria-current={i === run.room ? "step" : undefined}
                >
                  <span>
                    {i < run.room ? <Check size={14} /> : `0${i + 1}`}
                  </span>
                  {room.name.replace(/^\d\. /, "")}
                  <ChevronRight size={14} />
                </div>
              ))}
            </nav>
            <div className="pw-layout">
              <div className="pw-main">
                <section className="pw-arena" aria-label="Battlefield">
                  <div className="pw-room-head">
                    <div>
                      <p className="pw-kicker">
                        SECTOR 0{run.room + 1} ·{" "}
                        {busy
                          ? "RESOLVING"
                          : run.phase === "planning"
                          ? `ROUND ${run.round}`
                          : "ENCOUNTER COMPLETE"}
                      </p>
                      <h2 ref={heading} tabIndex={-1}>
                        {ROOMS[run.room].name.replace(/^\d\. /, "")}
                      </h2>
                      <p>{roomCopy[run.room]}</p>
                    </div>
                    <span className="pw-round-icon">
                      <Zap />
                    </span>
                  </div>
                  <div className="pw-side-label">
                    <span>FACILITY DEFENSES</span>
                    <span>
                      {chosenMove ? "SELECT A TARGET BELOW" : "ORDERS HIDDEN"}
                    </span>
                  </div>
                  <div className="pw-enemies">
                    {enemies.map((u) => (
                      <button
                        key={u.id}
                        className={`pw-enemy ${u.hp <= 0 ? "pw-down" : ""} ${
                          u.charge ? "pw-charging" : ""
                        } ${chosenMove && u.hp > 0 ? "pw-targetable" : ""}`}
                        onClick={() => target(u.id)}
                        disabled={!planning || !chosenMove || u.hp <= 0}
                        aria-label={`Target ${u.name} ${u.id}`}
                      >
                        <div className="pw-unit-top">
                          <span>
                            {u.element.toUpperCase()} / {u.id}
                          </span>
                          <span>SPD {u.speed}</span>
                        </div>
                        <Machine species={u.species} />
                        <h3>{u.name}</h3>
                        <div className="pw-status">{status(u)}</div>
                        <Health u={u} />
                        {chosenMove && u.hp > 0 && (
                          <span className="pw-damage">
                            {chosenMove.kind === "snare"
                              ? "Restrain melee · 1 opportunity"
                              : `${damagePreview(
                                  active!,
                                  chosenMove,
                                  u
                                )} damage now`}{" "}
                            <Crosshair size={14} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="pw-divider">
                    <span /> <Shield size={17} /> <span />
                  </div>
                  <div className="pw-side-label">
                    <span>YOUR SQUAD</span>
                    <span>FASTEST ACTION FIRST</span>
                  </div>
                  <div className="pw-squad">
                    {team.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelected(u.id);
                          setPendingMove(plans[u.id]?.move ?? null);
                        }}
                        disabled={!planning || u.hp <= 0}
                        aria-pressed={active?.id === u.id}
                        className={`pw-companion ${
                          active?.id === u.id && planning ? "pw-selected" : ""
                        } ${u.hp <= 0 ? "pw-down" : ""}`}
                      >
                        <div className="pw-unit-top">
                          <span>{u.element}</span>
                          <span>SPD {u.speed}</span>
                        </div>
                        <img src={portraits[u.species]} alt="" />
                        <h3>{u.name}</h3>
                        <Health u={u} />
                        <span className="pw-order">
                          {u.hp <= 0
                            ? "Knocked out"
                            : u.snared
                            ? "Restrained · ranged only"
                            : plans[u.id]
                            ? `${moveAt(u, plans[u.id].move).name} → ${
                                plans[u.id].target
                              }`
                            : planning
                            ? "Choose an order"
                            : "Standing by"}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
                {busy ? (
                  <section className="pw-command pw-playback">
                    <Activity size={20} />
                    <p aria-live="polite">{frame.text}</p>
                    <button
                      onClick={() => {
                        setPlayback([]);
                        setFrameIndex(0);
                      }}
                    >
                      Show round result
                    </button>
                  </section>
                ) : run.phase === "planning" && active ? (
                  <section className="pw-command">
                    <div className="pw-command-head">
                      <div>
                        <p className="pw-kicker">
                          {pendingMove === null
                            ? "01 / CHOOSE MOVE"
                            : "02 / CHOOSE TARGET"}
                        </p>
                        <h2>
                          {active.name}
                          <span> · {active.element}</span>
                        </h2>
                      </div>
                      <span>
                        {ready}/{living.length} orders ready
                      </span>
                    </div>
                    <div className="pw-moves">
                      {[
                        ...active.moves.map((_, i) => i),
                        ...(legalMoves(active).includes(-1) ? [-1] : []),
                      ].map((i) => {
                        const m = moveAt(active, i),
                          legal = legalMoves(active).includes(i);
                        return (
                          <button
                            key={i}
                            onClick={() => setPendingMove(i)}
                            disabled={!legal}
                            aria-pressed={pendingMove === i}
                          >
                            <span className="pw-move-kind">
                              {i === 3
                                ? "SIGNATURE"
                                : i === -1
                                ? "LAST RESORT"
                                : m.range.toUpperCase()}
                              <span>
                                {i === -1
                                  ? "∞"
                                  : `${active.uses[i]}/${i === 3 ? 1 : 3}`}
                              </span>
                            </span>
                            <strong>{m.name}</strong>
                            <small>
                              {m.kind === "snare"
                                ? "Block melee · 1 opportunity"
                                : `${m.damage} base damage · ${m.range}`}
                            </small>
                            {!legal && (
                              <small>
                                {active.uses[i] === 0
                                  ? "Exhausted this encounter"
                                  : "Blocked by restraint"}
                              </small>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {chosenMove && (
                      <div
                        className="pw-quick-targets"
                        aria-label="Choose target"
                      >
                        {run.enemies
                          .filter((u) => u.hp > 0)
                          .map((u) => (
                            <button key={u.id} onClick={() => target(u.id)}>
                              <Crosshair size={14} />
                              <span>
                                {u.name} ({u.id})
                                <small>
                                  {chosenMove.kind === "snare"
                                    ? u.species === "drone"
                                      ? "Ranged attack still works"
                                      : "Block next melee opportunity"
                                    : `${damagePreview(
                                        active!,
                                        chosenMove,
                                        u
                                      )} damage · ${u.hp} HP remaining`}
                                </small>
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                    <div className="pw-commit">
                      <p>
                        {pendingMove !== null
                          ? "Choose a target here or on the battlefield."
                          : ready === living.length
                          ? "All orders ready. You can revise them before committing."
                          : "Select a move, then an enemy. Plan for every standing companion."}
                      </p>
                      <button
                        className="pw-primary"
                        disabled={ready !== living.length}
                        onClick={commit}
                      >
                        Commit round <ArrowRight size={17} />
                      </button>
                    </div>
                  </section>
                ) : (
                  <section className="pw-command pw-result">
                    <p className="pw-kicker">
                      {run.phase === "camp"
                        ? "A MOMENT TO REGROUP"
                        : "EXPEDITION REPORT"}
                    </p>
                    <h2>
                      {run.phase === "camp"
                        ? "Sector secured."
                        : run.phase === "won"
                        ? "Powerworks silenced."
                        : run.phase === "lost"
                        ? "The squad has fallen."
                        : "Safely extracted."}
                    </h2>
                    <p>
                      {run.phase === "camp"
                        ? "Health carries forward. All move uses will refresh in the next encounter."
                        : `${run.xp} practice XP earned per companion. No account rewards have been issued.`}
                    </p>
                    {run.phase === "camp" && (
                      <>
                        <div className="pw-revive">
                          {run.team
                            .filter((u) => u.hp === 0)
                            .map((u) => (
                              <button
                                key={u.id}
                                disabled={!run.revival}
                                onClick={() =>
                                  apply({ kind: "revive", id: u.id })
                                }
                              >
                                <Heart size={16} /> Revive {u.name} ·{" "}
                                {Math.ceil(u.max / 2)} HP
                              </button>
                            ))}
                        </div>
                        {run.room === 2 && (
                          <p className="pw-aid">
                            Recovery station ahead: +10 HP to each standing
                            companion.
                          </p>
                        )}
                        <div className="pw-result-actions">
                          <button
                            className="pw-primary"
                            onClick={() => apply({ kind: "advance" })}
                          >
                            Enter{" "}
                            {ROOMS[run.room + 1].name.replace(/^\d\. /, "")}{" "}
                            <ArrowRight size={16} />
                          </button>
                          <button onClick={() => apply({ kind: "retreat" })}>
                            Extract with {run.xp} XP
                          </button>
                        </div>
                      </>
                    )}
                    {run.phase !== "camp" && (
                      <button
                        className="pw-primary"
                        onClick={() => fresh((run.seed + 1) >>> 0)}
                      >
                        Start another expedition <ArrowRight size={16} />
                      </button>
                    )}
                  </section>
                )}
                {error && (
                  <p role="alert" className="pw-error">
                    {error}
                  </p>
                )}
              </div>
              <aside className="pw-sidebar">
                <section className="pw-run-info">
                  <p className="pw-kicker">EXPEDITION STATUS</p>
                  <div>
                    <span>Practice XP / companion</span>
                    <strong>{busy ? "…" : run.xp}</strong>
                  </div>
                  <div>
                    <span>Emergency revival</span>
                    <strong>{run.revival} / 1</strong>
                  </div>
                  <div>
                    <span>Run seed</span>
                    <strong>{run.seed}</strong>
                  </div>
                  <p>
                    {saveFailed
                      ? "Browser storage unavailable. Keep this tab open."
                      : "Progress saved on this browser."}
                  </p>
                </section>
                <details className="pw-intel">
                  <summary>Enemy field notes</summary>
                  {run.enemies.map((u) => (
                    <div key={u.id}>
                      <strong>
                        {u.name} ({u.id})
                      </strong>
                      {u.moves.map((m) => (
                        <p key={m.name}>
                          {m.name}:{" "}
                          {m.kind === "ward"
                            ? "halves damage until next opportunity"
                            : `${m.damage} base damage · ${m.range}${
                                m.kind === "charge"
                                  ? " · requires a charge action first"
                                  : ""
                              }`}
                        </p>
                      ))}
                    </div>
                  ))}
                </details>
                <section className="pw-log">
                  <h2>
                    <Activity size={16} /> Combat record
                  </h2>
                  <div role="log" aria-label="Combat record">
                    {(busy
                      ? playback.slice(0, frameIndex + 1).map((f) => f.text)
                      : run.log
                    )
                      .slice(-45)
                      .reverse()
                      .map((line, i) => (
                        <p
                          key={`${i}-${line}`}
                          className={
                            line.startsWith("Encounter ") ? "pw-log-round" : ""
                          }
                        >
                          {line}
                        </p>
                      ))}
                  </div>
                </section>
                <button
                  className="pw-reset"
                  onClick={() => setRestart(true)}
                  disabled={busy}
                >
                  <RotateCcw size={14} /> Restart expedition
                </button>
              </aside>
            </div>
          </>
        )}
        <footer className="pw-footer">
          POWERWORKS / DESIGN BUILD 01{" "}
          <span>Dedicated dungeon enemies · Temporary combat cards</span>
        </footer>
      </div>
      {restart && (
        <dialog
          ref={restartDialog}
          onCancel={() => setRestart(false)}
          aria-labelledby="restart-title"
          className="pw-modal"
        >
          <h2 id="restart-title">Restart this expedition?</h2>
          <p>
            Your current run will be replaced. The same seed gives you a
            repeatable starting point.
          </p>
          <button autoFocus onClick={() => setRestart(false)}>
            Keep playing
          </button>
          <button onClick={() => fresh(run.seed)}>Restart same seed</button>
        </dialog>
      )}
    </main>
  );
}
