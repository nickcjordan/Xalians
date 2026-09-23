// Tier: immersive. Powerworks presentation redesign authorized by Nick.
import React, { useEffect, useRef, useState } from "react";

import { Link } from "react-router";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ScrollText,
  Check,
  X,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Heart,
  Shield,
  Zap,
  Link2,
  Crosshair,
  Swords,
  Trophy,
  Info,
  ChevronRight,
  Crown,
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  createRun,
  command,
  resolveRound,
  restoreRun,
  legalMoves,
  moveAt,
  damagePreview,
  basePower,
  matchup,
  initiative,
  effectiveSpeed,
  sedated,
  areaReach,
  ROOMS,
  SAVE_VERSION,
  type Run,
  type Unit,
  type Order,
  type Command,
  type Frame,
  type Move,
} from "@xalians/rules/dungeon";

import {
  Portrait,
  ElementIcon,
  MoveIcon,
  MoveCardContent,
  PowerIcon,
  baseName,
  moveDescription,
  effectSummary,
  areaSummary,
  cooldownLimit,
  binds,
  harms,
  melee,
  StatusBadges,
  GroupIcon,
  PassiveIcon,
  passiveHeading,
  passiveRule,
  conditionRule,
  remainingLabel,
  Health,
  shortName,
} from "./powerworksVisuals";

import {
  PowerworksScene,
  ExpeditionTrail,
  sectorStory,
} from "./powerworksScene";
import { PowerworksEnvironment } from "./powerworksEnvironment";
import { useBattlePresentation } from "./powerworksPresentation";
import "./powerworks.css";
import "./powerworksScene.css";
import "./powerworksHud.css";

const SAVE_KEY = "xalians.powerworks.v1";

const roomCopy = [
  "Enter the service tunnels. The maintenance network is still awake.",
  "Breach the checkpoint. Ranged drones cover the armored units.",
  "Stored energy hums beneath the floor. Watch for a charging capacitor.",
  "Silence the guardian. Interrupting a charge buys time, but it will rebuild.",
];

function boot() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...restoreRun(raw), started: true };
  } catch {
    /* Fall back safely if storage is corrupt or unavailable. */
  }
  const n = Number(
    new URLSearchParams(window.location.search).get("seed") || 1
  );
  return {
    state: createRun(Number.isFinite(n) ? n : 1),
    history: [] as Command[],
    started: false,
  };
}

type Panel =
  | "guide"
  | "record"
  | "inspect"
  | "restart"
  | "initiative"
  | "route"
  | "extract"
  | null;

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function eventLabel(frame: Frame) {
  const e = frame.event;
  if (!e) return "Encounter complete";
  return (
    {
      hit: `−${e.amount}`,
      bind: "Bound",
      missed: "Resisted",
      displace: "Charge broken",
      restore: `+${e.amount}`,
      ward: "Shield up",
      charge: "Charging",
      blocked: "Blocked",
      redirect: "Redirected",
      round: "Round begins",
      status: e.status ? cap(e.status) : "Condition",
      resisted: "Resisted",
      tick: e.group === "mending" ? `+${e.amount}` : `−${e.amount}`,
      expired: "Wears off",
      removed: "Cleared",
      lost: "Opportunity lost",
      hidden: "Concealed",
      react: "Reacts",
      stumble: "Stumbles",
      withheld: "Withheld",
      broken: "Charge broken",
      result: "Complete",
    } as const
  )[e.kind];
}

function groupRecord(log: string[]) {
  const groups: { title: string; events: string[] }[] = [];
  for (const text of log) {
    if (/^Encounter \d.*Round/i.test(text))
      groups.push({ title: text.replace(/^Encounter/, "Sector"), events: [] });
    else if (/^Entered /.test(text))
      groups.push({ title: text.replace(/^Entered /, ""), events: [] });
    else {
      if (!groups.length) groups.push({ title: "Expedition", events: [] });
      groups[groups.length - 1].events.push(text);
    }
  }
  return groups.reverse();
}

export default function PowerworksPage() {
  const [initial] = useState(boot);

  const [run, setRun] = useState<Run>(initial.state),
    [history, setHistory] = useState<Command[]>(initial.history),
    [started, setStarted] = useState(initial.started);

  const [selected, setSelected] = useState(
    initial.state.team.find((u) => u.hp > 0)?.id || "G"
  );

  const [playbackOrders, setPlaybackOrders] = useState<Record<string, Order>>(
    {}
  );
  const [plans, setPlans] = useState<Record<string, Order>>({}),
    [pending, setPending] = useState<number | null>(null),
    [hoverTarget, setHoverTarget] = useState<string | null>(null);

  const [frames, setFrames] = useState<Frame[]>([]),
    [frameIndex, setFrameIndex] = useState(0),
    [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(1);

  const [playRound, setPlayRound] = useState(run.round),
    [turnOrder, setTurnOrder] = useState<Unit[]>([]),
    [lastFrames, setLastFrames] = useState<Frame[]>([]);

  const [panel, setPanel] = useState<Panel>(null),
    [inspectId, setInspectId] = useState<string | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [saveFailed, setSaveFailed] = useState(false);

  const dialog = useRef<HTMLDialogElement>(null),
    moveButtons = useRef<Array<HTMLButtonElement | null>>([]);

  const busy = frames.length > 0,
    frame = frames[frameIndex];
  const { impact, reducedMotion, sound, toggleSound, frameDuration } =
    useBattlePresentation(frame, frameIndex, speed, paused || !!panel);
  const shown =
    busy && !impact && frameIndex > 0 ? frames[frameIndex - 1] : frame;
  const team = shown?.team ?? run.team,
    enemies = shown?.enemies ?? run.enemies;

  const planning = started && run.phase === "planning" && !busy;

  const active =
    run.team.find((u) => u.id === selected && u.hp > 0) ??
    run.team.find((u) => u.hp > 0);

  const move = active && pending !== null ? moveAt(active, pending) : null;

  const living = run.team.filter((u) => u.hp > 0),
    ready = living.filter((u) => plans[u.id] || !legalMoves(u).length).length;

  const chosenTarget =
    hoverTarget ?? (active ? plans[active.id]?.target : null);

  const initiativeUnits = busy
    ? turnOrder
    : initiative(run.team, run.enemies, run.round);

  const inspect = [...team, ...enemies].find((u) => u.id === inspectId);

  const roomName = ROOMS[run.room].name.replace(/^\d\. /, "");

  const available = active ? legalMoves(active) : [];

  useEffect(() => {
    if (!started) return;
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ version: SAVE_VERSION, seed: run.seed, history })
      );
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  }, [history, run.seed, started]);

  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal();
    else if (!panel && dialog.current?.open) dialog.current.close();
  }, [panel]);

  useEffect(() => {
    if (!busy || paused || panel) return;
    const timer = window.setTimeout(() => nextFrame(), frameDuration / speed);
    return () => clearTimeout(timer);
  }, [busy, frameIndex, paused, speed, panel, frameDuration]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !panel) {
        setPending(null);
        setHoverTarget(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [panel]);

  useEffect(() => {
    const old = document.title;
    document.title = "Powerworks · Xalians";
    return () => {
      document.title = old;
    };
  }, []);

  function nextFrame() {
    if (frameIndex + 1 < frames.length) setFrameIndex((i) => i + 1);
    else finishPlayback();
  }

  function finishPlayback() {
    setFrames([]);
    setFrameIndex(0);
    setPaused(false);
  }

  function inspectUnit(id: string) {
    setInspectId(id);
    setPanel("inspect");
  }

  function revealControls(
    selector: string,
    block: ScrollLogicalPosition = "center"
  ) {
    if (window.innerWidth > 600) return;
    requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(selector);
      const bounds = element?.getBoundingClientRect();
      if (
        element &&
        bounds &&
        (bounds.top < 0 || bounds.bottom > window.innerHeight - 75)
      )
        element.scrollIntoView({
          block,
          behavior: reducedMotion ? "instant" : "smooth",
        });
    });
  }

  function select(u: Unit, keyboard = false) {
    if (!planning || u.hp <= 0) return;
    setSelected(u.id);
    setPending(plans[u.id]?.move ?? null);
    setHoverTarget(null);
    setNotice(
      `Planning ${u.name}${
        plans[u.id] ? ". Existing order can be changed." : ". Choose a move."
      }`
    );
    if (keyboard)
      requestAnimationFrame(() =>
        moveButtons.current.find((b) => b && !b.disabled)?.focus()
      );
    else revealControls(".pw-command");
  }

  function labelFor(u: Unit) {
    const peers = run.enemies.filter((e) => e.species === u.species);
    return (
      shortName(u) +
      (u.enemy && peers.length > 1
        ? ` ${peers.findIndex((e) => e.id === u.id) + 1}`
        : "")
    );
  }
  function assign(id: string, keyboard = false) {
    if (!planning || !active || pending === null) return;
    const next = { ...plans, [active.id]: { move: pending, target: id } };
    setPlans(next);
    setHoverTarget(null);
    const nextUnit = living.find((u) => !next[u.id] && legalMoves(u).length);
    setNotice(
      `${active.name} assigned to ${
        run.enemies.find((u) => u.id === id)?.name
      }. ${
        nextUnit
          ? `Now planning ${nextUnit.name}.`
          : "All orders ready. Review or commit."
      }`
    );
    setPending(null);
    if (nextUnit) setSelected(nextUnit.id);
    if (keyboard)
      requestAnimationFrame(() => {
        if (nextUnit)
          moveButtons.current.find((b) => b && !b.disabled)?.focus();
        else
          document
            .querySelector<HTMLButtonElement>(".pw-commit .pw-primary")
            ?.focus();
      });
    else revealControls(nextUnit ? ".pw-command" : ".pw-squad");
  }

  function clearOrder() {
    if (!active) return;
    setPlans((p) => {
      const n = { ...p };
      delete n[active.id];
      return n;
    });
    setPending(null);
    setHoverTarget(null);
    setNotice(`${active.name}'s order cleared.`);
  }

  function apply(action: Command) {
    try {
      const next = command(run, action);
      setRun(next);
      setHistory((h) => [...h, action]);
      setPlans({});
      setPending(null);
      setHoverTarget(null);
      setError("");
      setNotice(action.kind === "revive" ? "Companion revived." : "");
      if (action.kind === "advance") {
        setSelected(next.team.find((u) => u.hp > 0)?.id || "G");
        revealControls(".pw-theater", "start");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function commit() {
    const orders = { ...plans };
    living.forEach((u) => {
      if (!legalMoves(u).length) orders[u.id] = { move: -2, target: "" };
    });
    try {
      const result = resolveRound(run, orders);
      setPlayRound(run.round);
      setTurnOrder(initiative(run.team, run.enemies, run.round));
      setRun(result.state);
      setHistory((h) => [...h, { kind: "round", orders }]);
      setPlaybackOrders(orders);
      setLastFrames(result.frames);
      setFrames(result.frames);
      setFrameIndex(0);
      setPaused(false);
      setPending(null);
      setPlans({});
      setHoverTarget(null);
      setError("");
      setNotice("Orders committed. Resolving the round.");
      revealControls(".pw-theater", "start");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function fresh(seed: number) {
    const next = createRun(seed);
    setRun(next);
    setHistory([]);
    setStarted(true);
    setSelected(next.team[0].id);
    setPlans({});
    setPending(null);
    setFrames([]);
    setLastFrames([]);
    setPanel(null);
    setError("");
    setNotice("New expedition ready.");
  }

  function previewText(u: Unit) {
    if (!move || !active) return "";
    if (binds(move) && !harms(move))
      return u.moves.some((m) => !melee(m))
        ? "Melee blocked · ranged still works"
        : "Block next melee action";
    const factor = matchup(active, u, move);
    // An area move names how many more foes it reaches from this target, and names every
    // squadmate a burst on self would also hit (contract decision 33).
    const around = areaReach(run, active, move, u);
    const foes = around.filter((t) => t.enemy !== active.enemy).length;
    const friends = around.filter((t) => t.enemy === active.enemy);
    return `${damagePreview(active, move, u)} estimated${
      foes ? ` · reaches ${foes} more` : ""
    }${friends.length ? ` · also hits ${listNames(friends)}` : ""} · ${
      factor === 0
        ? "immune"
        : factor > 1
        ? "strong"
        : factor < 1
        ? "resisted"
        : "neutral"
    }${u.ward ? " · shielded" : ""}`;
  }

  /** "Avilily", "Avilily and Crystorn": squadmates an area would also hit. */
  function listNames(units: Unit[]) {
    const names = units.map(labelFor);
    return names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
      : names[0];
  }
  /** Who a burst on self would hit on its own side right now, for the inspector. */
  function squadmatesHit(u: Unit, m: Move) {
    const foe = (u.enemy ? run.team : run.enemies).find((t) => t.hp > 0);
    const self = [...run.team, ...run.enemies].find((t) => t.id === u.id);
    if (!foe || !self) return [];
    return areaReach(run, self, m, foe).filter((t) => t.enemy === u.enemy);
  }

  function actionCaption(current: Frame) {
    const e = current.event;
    if (!e) return current.text;
    const units = [...current.team, ...current.enemies];
    const target = units.find((u) => u.id === e.targetId);
    const name = target ? labelFor(target) : "The target";
    const actor = units.find((u) => u.id === e.actorId);
    const actorName = actor ? labelFor(actor) : "The unit";
    // Pass 4: area reach, stumbles, withheld effects and charges broken by shock.
    if (e.kind === "hit" && e.area)
      return `${name} is caught in the area: ${e.amount} damage.${
        target?.hp === 0 ? " Knocked out." : ""
      }`;
    if (e.kind === "stumble")
      return `${actorName} is disoriented. The move goes to ${name} instead.`;
    if (e.kind === "withheld")
      return e.reason === "requires"
        ? "Its harm did not land, so nothing returns."
        : `${name} is an enemy, so the ${e.effect} is withheld.`;
    if (e.kind === "broken")
      return `${name} is stunned. Its charge is broken.`;
    if (e.kind === "hit")
      return `${name} takes ${e.amount} damage.${
        target?.hp === 0 ? " Knocked out." : ""
      }${
        e.moveName === "Desperate strike"
          ? " Attacker takes 2 recoil damage."
          : ""
      }`;
    if (e.kind === "bind")
      return `${name} cannot use melee at its next opportunity.`;
    if (e.kind === "missed") return `${name} shrugs it off.`;
    if (e.kind === "displace")
      return `${name} is pulled off its footing. Its charge is broken.`;
    if (e.kind === "restore") return `${name} recovers ${e.amount} HP.`;
    if (e.kind === "ward")
      return "Incoming damage is halved until the next opportunity.";
    if (e.kind === "charge")
      return "Preparing a release for the next opportunity.";
    if (e.kind === "blocked")
      return current.text.includes("charge was broken")
        ? "Its charge was broken; it must recover first."
        : "Binding prevented the action.";
    if (e.kind === "redirect")
      return `The original target fell. The move redirects to ${name}.`;
    if (e.kind === "round") return "Orders resolve from fastest to slowest.";
    if (e.kind === "status")
      return `${name} is ${e.status} for ${e.remaining} ${
        e.remaining === 1 ? "opportunity" : "opportunities"
      }.`;
    if (e.kind === "resisted") return current.text;
    // Pass 3: the reaction caption names the answer without revealing any order.
    if (e.kind === "react")
      return `An automatic defense answers ${name}. Nothing was ordered.`;
    if (e.kind === "tick")
      return e.group === "mending"
        ? `${name} recovers ${e.amount} HP from ${e.status}.`
        : `${name} takes ${e.amount} damage from ${e.status}.`;
    if (e.kind === "expired") {
      const owner = units.find((u) => u.id === (e.targetId ?? e.actorId));
      const who = owner ? labelFor(owner) : "The unit";
      return e.group === "concealment" && e.actorId
        ? `${who} breaks cover to attack.`
        : `${who} is no longer ${e.status}.`;
    }
    if (e.kind === "removed")
      return e.status
        ? `${name} is no longer ${e.status}.`
        : `Nothing on ${name} answered to it.`;
    if (e.kind === "lost")
      return `${actorName} is ${
        e.status === "stunned" ? "stunned" : "entranced"
      } and loses this opportunity.`;
    if (e.kind === "hidden") return `${name} is concealed and cannot be found.`;
    return current.text;
  }

  function affected(u: Unit) {
    return (
      frame?.event?.targetId === u.id ||
      (frame?.event?.actorId === u.id &&
        ["blocked", "charge", "lost"].includes(frame.event.kind))
    );
  }

  const phaseTitle =
    run.phase === "camp"
      ? "Sector secured"
      : run.phase === "won"
      ? "Powerworks silenced"
      : run.phase === "lost"
      ? "Expedition ended"
      : "Squad extracted";

  return (
    <main
      className={`pw ${started ? "in-run" : ""} room-${run.room} ${
        planning ? "is-planning" : ""
      } ${move ? "is-targeting" : ""}`}
      data-tier="immersive"
      id="main"
    >
      <header className="pw-top">
        <Link to="/" className="pw-brand">
          <ArrowLeft size={16} />
          <span>XALIANS</span>
        </Link>
        <div className="pw-game-name">
          THE DORMANT POWERWORKS <span>Prototype</span>
        </div>
        <div className="pw-tools">
          <button
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label={sound ? "Mute battle sounds" : "Enable battle sounds"}
          >
            {sound ? <Volume2 /> : <VolumeX />}
            <span>{sound ? "Sound on" : "Sound off"}</span>
          </button>
          <button aria-label="Field guide" onClick={() => setPanel("guide")}>
            <BookOpen />
            <span>Guide</span>
          </button>
          {started && (
            <button
              aria-label="Combat record"
              onClick={() => setPanel("record")}
            >
              <ScrollText />
              <span>Record</span>
            </button>
          )}
        </div>
      </header>

      {!started ? (
        <section className="pw-briefing">
          <PowerworksEnvironment room={0} className="pw-brief-backdrop" />
          <div>
            <p className="pw-eyebrow">A SQUAD EXPEDITION</p>
            <h1>
              The Dormant
              <br />
              Powerworks
            </h1>
            <p>The facility has been abandoned. Its defenses haven’t.</p>
            <p>
              Lead four companions through four encounters. Plan their moves
              together, read the enemy’s behavior, and reach the central
              guardian.
            </p>
            <div className="pw-brief-facts">
              <span>
                <Shield />4 encounters
              </span>
              <span>
                <Heart />1 revival
              </span>
              <span>
                <Crown />1 guardian
              </span>
            </div>
            <button className="pw-primary" onClick={() => setStarted(true)}>
              Enter the facility <ArrowRight />
            </button>
            <small>
              Practice expedition · No account or real rewards required
            </small>
          </div>
          <div className="pw-brief-scene">
            <img
              className="pw-machine pw-painted-art"
              src="/assets/powerworks/guardian.webp"
              alt=""
            />
            <span>CENTRAL GUARDIAN / ONLINE</span>
          </div>
          <ExpeditionTrail room={0} />
          <div className="pw-brief-roster">
            {run.team.map((u) => (
              <div key={u.id} className={`el-${u.element}`}>
                <Portrait u={u} />
                <strong>{u.name}</strong>
                <span>
                  <ElementIcon element={u.element} />
                  {u.element}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="pw-room-bar">
            <div>
              <span className="pw-eyebrow">SECTOR {run.room + 1}/4</span>
              <h1>{roomName}</h1>
            </div>
            <nav aria-label="Dungeon progress">
              {ROOMS.map((r, i) => (
                <button
                  onClick={() => setPanel("route")}
                  key={r.name}
                  className={
                    run.phase === "won" || i < run.room
                      ? "cleared"
                      : i === run.room
                      ? "current"
                      : ""
                  }
                  aria-current={
                    i === run.room && run.phase !== "won" ? "step" : undefined
                  }
                  aria-label={`${r.name.replace(/^\d\. /, "")}: ${
                    i < run.room || run.phase === "won"
                      ? "cleared"
                      : i === run.room
                      ? "current sector"
                      : "ahead"
                  }`}
                  title={r.name}
                >
                  {i < run.room || run.phase === "won" ? <Check /> : i + 1}
                </button>
              ))}
            </nav>
            <button
              className="pw-round"
              aria-label={
                run.phase === "planning" || busy
                  ? "View turn order"
                  : "View expedition route"
              }
              onClick={() =>
                setPanel(
                  run.phase === "planning" || busy ? "initiative" : "route"
                )
              }
            >
              <span>
                {busy
                  ? `Round ${playRound}`
                  : run.phase === "planning"
                  ? `Round ${run.round}`
                  : run.phase === "camp"
                  ? "Encounter complete"
                  : "Expedition complete"}
              </span>
              <small>
                {run.phase === "planning" || busy ? "Turn order" : "Route"}
              </small>
              <ChevronRight />
            </button>
          </div>

          <div className="pw-battle-shell">
            {run.phase === "planning" || busy ? (
              <>
                <PowerworksScene
                  team={team}
                  enemies={enemies}
                  frame={frame}
                  frameIndex={frameIndex}
                  room={run.room}
                  active={active}
                  move={move || null}
                  plans={plans}
                  targetId={chosenTarget}
                  planning={planning}
                  impact={impact}
                  paused={paused || !!panel}
                  speed={speed}
                  reducedMotion={reducedMotion}
                  labelFor={labelFor}
                  previewText={previewText}
                  onTarget={assign}
                  onSelect={select}
                  onInspect={inspectUnit}
                  onHover={setHoverTarget}
                />

                <section
                  className={`pw-command ${busy ? "resolving" : ""}`}
                  aria-label={busy ? "Round playback" : "Move selection"}
                >
                  {busy ? (
                    <>
                      <div className="pw-action-story" aria-live="polite">
                        <div className="pw-action-copy">
                          <span className="pw-eyebrow">
                            {frame.event?.actorId
                              ? labelFor(
                                  [...team, ...enemies].find(
                                    (u) => u.id === frame.event?.actorId
                                  )!
                                )
                              : `Round ${playRound}`}
                          </span>
                          <strong>
                            {frame.event?.moveName || eventLabel(frame)}
                          </strong>
                          <p>
                            {impact
                              ? actionCaption(frame)
                              : "Preparing the action…"}
                          </p>
                        </div>
                      </div>
                      <div className="pw-playback-controls">
                        <span>
                          {frameIndex + 1} / {frames.length}
                        </span>
                        <button
                          onClick={() => setPaused((v) => !v)}
                          aria-label={
                            paused ? "Resume playback" : "Pause playback"
                          }
                        >
                          {paused ? <Play /> : <Pause />}
                          {paused ? "Resume" : "Pause"}
                        </button>
                        <button
                          onClick={() => {
                            setPaused(true);
                            nextFrame();
                          }}
                          aria-label="Next action"
                        >
                          <ChevronRight />
                          Next
                        </button>
                        <button
                          onClick={() =>
                            setSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1))
                          }
                          aria-label={`Playback speed ${speed}x`}
                        >
                          {speed}×
                        </button>
                        <button onClick={finishPlayback}>
                          Show round result <SkipForward />
                        </button>
                      </div>
                    </>
                  ) : active ? (
                    <>
                      <div className="pw-command-head">
                        <button
                          aria-label={`Inspect selected ${active.name}`}
                          onClick={() => inspectUnit(active.id)}
                          className={`pw-active-identity el-${active.element}`}
                          key={active.id}
                        >
                          <Portrait u={active} small />
                          <div>
                            <span>
                              <ElementIcon element={active.element} />
                              {active.element}
                            </span>
                            <h2>{active.name}</h2>
                          </div>
                        </button>
                        <span className="pw-command-prompt">
                          {plans[active.id]
                            ? "Change this order"
                            : pending !== null
                            ? "Select a target above"
                            : "Choose a move"}
                        </span>
                        <div className="pw-command-tools">
                          <button
                            className="pw-symbol-help"
                            aria-label="Explain move symbols"
                            onClick={() => setPanel("guide")}
                          >
                            <Info />
                          </button>
                          <button
                            className="pw-clear"
                            disabled={!plans[active.id] && pending === null}
                            onClick={clearOrder}
                          >
                            <X />
                            Clear <span>order</span>
                          </button>
                        </div>
                      </div>

                      <div className="pw-moves">
                        {[
                          ...active.moves.map((_, i) => i),
                          ...(available.includes(-1) ? [-1] : []),
                        ].map((i, k) => {
                          const m = moveAt(active, i),
                            legal = available.includes(i),
                            limit = cooldownLimit(m),
                            cooldown = i === -1 ? null : active.cooldowns[i],
                            spent = m.signature && active.signatureSpent;
                          return (
                            <button
                              key={i}
                              ref={(el) => {
                                moveButtons.current[k] = el;
                              }}
                              aria-label={`${m.name}${
                                m.signature ? ", signature" : ""
                              }, ${
                                i === -1 || limit === 0
                                  ? "no cooldown"
                                  : cooldown
                                  ? `${cooldown} of ${limit} rounds cooling`
                                  : `${limit} round cooldown`
                              }${
                                !legal
                                  ? spent
                                    ? ", spent this encounter"
                                    : cooldown
                                    ? ", cooling down"
                                    : active.bound && melee(m)
                                    ? ", blocked by binding"
                                    : ", no effect here"
                                  : ""
                              }`}
                              aria-describedby={`move-stats-${active.id}-${i}`}
                              title={moveDescription(active, m)}
                              aria-pressed={pending === i}
                              disabled={!legal}
                              className={`pw-move-card ${
                                pending === i ? "chosen" : ""
                              } ${m.signature ? "signature" : ""} el-${
                                active.element
                              }`}
                              onClick={(e) => {
                                setPending(i);
                                setHoverTarget(null);
                                setNotice(
                                  `${m.name} selected. Choose an enemy.`
                                );
                                if (e.detail === 0)
                                  requestAnimationFrame(() =>
                                    document
                                      .querySelector<HTMLButtonElement>(
                                        ".pw-target:not(:disabled)"
                                      )
                                      ?.focus()
                                  );
                                else revealControls(".pw-theater");
                              }}
                            >
                              <MoveCardContent
                                unit={active}
                                move={m}
                                cooldown={cooldown}
                                spent={spent}
                                selected={pending === i}
                                blocked={
                                  !legal && !!active.bound && melee(m) && !cooldown
                                }
                                id={`move-stats-${active.id}-${i}`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </section>

                <section className="pw-squad" aria-label="Your squad">
                  {team.map((u) => {
                    const order = (busy ? playbackOrders : plans)[u.id],
                      target = enemies.find((e) => e.id === order?.target),
                      selectedUnit = active?.id === u.id && planning;
                    return (
                      <div
                        key={u.id}
                        className={`pw-companion el-${u.element} ${
                          selectedUnit ? "selected" : ""
                        } ${order ? "ready" : ""} ${u.hp <= 0 ? "down" : ""} ${
                          frame?.event?.actorId === u.id ? "acting" : ""
                        } ${affected(u) ? "affected" : ""}`}
                      >
                        <span className="pw-companion-portrait">
                          <Portrait u={u} small />
                        </span>
                        <button
                          className="pw-select"
                          aria-label={`Select ${u.name}`}
                          aria-describedby={`order-${u.id}`}
                          title={
                            order && target
                              ? `${
                                  order.move === -2
                                    ? "Cannot act"
                                    : moveAt(u, order.move).name
                                } → ${labelFor(target)}`
                              : undefined
                          }
                          aria-pressed={selectedUnit}
                          disabled={!planning || u.hp <= 0}
                          onClick={(e) => select(u, e.detail === 0)}
                        >
                          <span className="pw-companion-top">
                            <ElementIcon element={u.element} />
                            <strong>{u.name}</strong>
                            {order ? (
                              <Check className="pw-ready-check" />
                            ) : (
                              <span className="pw-unassigned" />
                            )}
                          </span>
                          <span className="pw-queued" id={`order-${u.id}`}>
                            {u.hp <= 0 ? (
                              "Knocked out"
                            ) : busy && order ? (
                              <>
                                <span
                                  className="pw-order-move"
                                  title={
                                    order.move === -2
                                      ? undefined
                                      : moveAt(u, order.move).name
                                  }
                                >
                                  {order.move === -2
                                    ? "Cannot act"
                                    : baseName(moveAt(u, order.move))}
                                </span>
                                <span className="pw-order-target">
                                  {frame.event?.actorId === u.id
                                    ? "Acting now"
                                    : frames
                                        .slice(0, frameIndex)
                                        .some(
                                          (f) =>
                                            f.event?.actorId === u.id &&
                                            f.event.kind !== "redirect"
                                        )
                                    ? "Acted"
                                    : "Waiting"}
                                </span>
                              </>
                            ) : order && target ? (
                              <>
                                <span
                                  className="pw-order-move"
                                  title={
                                    order.move === -2
                                      ? undefined
                                      : moveAt(u, order.move).name
                                  }
                                >
                                  {order.move === -2
                                    ? "Cannot act"
                                    : baseName(moveAt(u, order.move))}
                                </span>
                                <span className="pw-order-target">
                                  <ArrowRight />
                                  <Portrait u={target} small />
                                  {labelFor(target)}
                                </span>
                              </>
                            ) : !legalMoves(u).length ? (
                              <>
                                <Link2 />
                                Cannot act
                              </>
                            ) : selectedUnit ? (
                              <>
                                <Crosshair />
                                {pending !== null
                                  ? "Choose a target"
                                  : "Choose a move"}
                              </>
                            ) : busy ? (
                              ""
                            ) : (
                              <>Needs an order</>
                            )}
                          </span>
                        </button>

                        <button
                          className="pw-squad-info"
                          aria-label={`Inspect ${u.name}`}
                          onClick={() => inspectUnit(u.id)}
                        >
                          <Info />
                        </button>

                        <div className="pw-squad-status">
                          <StatusBadges u={u} />
                        </div>
                      </div>
                    );
                  })}
                </section>

                <footer className="pw-commit">
                  <div className="pw-readiness" aria-live="polite">
                    <span
                      className={`pw-order-count ${
                        ready === living.length ? "complete" : ""
                      }`}
                    >
                      {busy ? (
                        <Play />
                      ) : ready === living.length ? (
                        <Check />
                      ) : (
                        <>
                          {ready}
                          <small>/{living.length}</small>
                        </>
                      )}
                    </span>
                    <p>
                      {busy
                        ? "Resolving your orders"
                        : ready === living.length
                        ? "Squad ready"
                        : "Plan your squad"}
                      <small>
                        {busy
                          ? "Pause to inspect any action."
                          : ready === living.length
                          ? "Review or edit orders."
                          : `${living.length - ready} ${
                              living.length - ready === 1 ? "order" : "orders"
                            } remaining`}
                      </small>
                    </p>
                  </div>
                  {busy ? (
                    <span className="pw-resolving-state">
                      <span />
                      Round {playRound} · {paused ? "Paused" : "Playing"}
                    </span>
                  ) : (
                    <>
                      <button
                        className="pw-primary"
                        disabled={!planning || ready !== living.length}
                        onClick={commit}
                      >
                        Commit round <ArrowRight />
                      </button>
                    </>
                  )}
                </footer>
              </>
            ) : (
              <section className={`pw-outcome ${run.phase}`}>
                <div className="pw-outcome-body">
                  <PowerworksEnvironment room={run.room} className="pw-outcome-landscape">
                    <div className="pw-travel-squad">
                      {run.team.map((u) => (
                        <span key={u.id} className={u.hp <= 0 ? "down" : ""}>
                          <Portrait u={u} />
                        </span>
                      ))}
                    </div>
                  </PowerworksEnvironment>
                  <ExpeditionTrail
                    room={run.room}
                    completed={run.phase === "won"}
                    onInspect={() => setPanel("route")}
                  />
                  <div className="pw-outcome-heading">
                    {run.phase === "won" ? (
                      <Trophy />
                    ) : run.phase === "camp" ? (
                      <Shield />
                    ) : run.phase === "lost" ? (
                      <Heart />
                    ) : (
                      <ArrowLeft />
                    )}
                    <p className="pw-eyebrow">
                      {run.phase === "camp"
                        ? "A MOMENT TO REGROUP"
                        : "EXPEDITION REPORT"}
                    </p>
                    <h2>{phaseTitle}</h2>
                    <p>
                      {run.phase === "camp"
                        ? "Carry your squad forward. Cooldowns and signatures refresh; wounds remain."
                        : run.phase === "won"
                        ? "The defense network falls silent. Your squad made it through."
                        : run.phase === "lost"
                        ? "Your squad could not continue. A fresh attempt restores everyone."
                        : "The squad leaves with its earned practice XP."}
                    </p>
                  </div>
                  {run.phase === "camp" && run.team.some((u) => u.hp === 0) && (
                    <p className="pw-recovery-notice">
                      <Heart />
                      {run.team
                        .filter((u) => u.hp === 0)
                        .map((u) => u.name)
                        .join(" and ")}{" "}
                      {run.team.filter((u) => u.hp === 0).length === 1
                        ? "is"
                        : "are"}{" "}
                      knocked out.{" "}
                      {run.revival
                        ? "Use your remaining revival below before continuing."
                        : "No revival remains."}
                    </p>
                  )}
                  <div className="pw-reward-reveal">
                    <Crown />
                    <div>
                      <strong>
                        {run.phase === "camp" || run.phase === "won"
                          ? `+${run.room === 3 ? 30 : 10}`
                          : run.xp}
                      </strong>
                      <span>
                        {run.phase === "camp" || run.phase === "won"
                          ? "Practice XP earned this sector"
                          : "Practice XP retained"}
                      </span>
                    </div>
                  </div>
                  <div className="pw-camp-stats">
                    <span>
                      <Crown />
                      <strong>{run.xp}</strong> practice XP / companion
                    </span>
                    <span>
                      <Heart />
                      <strong>{run.revival}</strong>{" "}
                      {run.phase === "camp"
                        ? "emergency revival left"
                        : "unused revival"}
                    </span>
                    {run.room === 2 && run.phase === "camp" && (
                      <span className="pw-station">
                        <Zap />
                        Ahead: +10 HP to standing companions
                      </span>
                    )}
                  </div>
                  <div className="pw-camp-squad">
                    {[...run.team]
                      .sort((a, b) => Number(b.hp === 0) - Number(a.hp === 0))
                      .map((u) => (
                        <div
                          key={u.id}
                          className={`el-${u.element} ${
                            u.hp <= 0 ? "down" : ""
                          }`}
                        >
                          <Portrait u={u} />
                          <h3>{u.name}</h3>
                          <Health u={u} />
                          {u.hp === 0 ? (
                            <button
                              disabled={!run.revival || run.phase !== "camp"}
                              aria-label={
                                run.revival && run.phase === "camp"
                                  ? `Revive ${u.name} to ${Math.ceil(
                                      u.max / 2
                                    )} health`
                                  : undefined
                              }
                              onClick={() =>
                                apply({ kind: "revive", id: u.id })
                              }
                            >
                              <Heart />{" "}
                              {run.revival && run.phase === "camp"
                                ? `Revive · ${Math.ceil(u.max / 2)} HP`
                                : "Knocked out"}
                            </button>
                          ) : (
                            <span>
                              {u.hp === u.max
                                ? "Healthy"
                                : `${u.max - u.hp} HP missing`}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                  {run.phase === "camp" && (
                    <div className="pw-next-sector">
                      <span className="pw-eyebrow">Next destination</span>
                      <strong>
                        {ROOMS[run.room + 1].name.replace(/^\d\. /, "")}
                      </strong>
                      <p>{sectorStory[run.room + 1].text}</p>
                    </div>
                  )}
                </div>
                <div className="pw-outcome-actions">
                  {run.phase === "camp" ? (
                    <>
                      <button
                        className="pw-primary"
                        onClick={() => apply({ kind: "advance" })}
                      >
                        Enter {ROOMS[run.room + 1].name.replace(/^\d\. /, "")}{" "}
                        <ArrowRight />
                      </button>
                      <button onClick={() => setPanel("extract")}>
                        Extract with {run.xp} XP
                      </button>
                    </>
                  ) : (
                    <button
                      className="pw-primary"
                      onClick={() => fresh((run.seed + 1) >>> 0)}
                    >
                      Start another expedition <ArrowRight />
                    </button>
                  )}
                  {lastFrames.length > 0 && (
                    <button
                      onClick={() => {
                        setFrames(lastFrames);
                        setFrameIndex(0);
                        setPaused(false);
                        revealControls(".pw-theater", "start");
                      }}
                    >
                      Replay last round <Play />
                    </button>
                  )}
                </div>
                <small>
                  Practice rewards only. No tokens or account rewards are
                  issued.
                </small>
              </section>
            )}
          </div>
        </>
      )}

      <div className="pw-sr" aria-live="polite">
        {notice}
      </div>
      {error && (
        <p className="pw-error" role="alert">
          {error}
        </p>
      )}
      {saveFailed && (
        <p className="pw-error" role="status">
          Browser storage unavailable. Keep this tab open to retain the run.
        </p>
      )}

      <dialog
        ref={dialog}
        className="pw-dialog"
        onCancel={() => setPanel(null)}
        onClose={() => setPanel(null)}
        aria-labelledby="pw-dialog-title"
      >
        <header>
          <h2 id="pw-dialog-title">
            {panel === "guide"
              ? "Field guide"
              : panel === "record"
              ? "Combat record"
              : panel === "initiative"
              ? "Turn order"
              : panel === "route"
              ? "Expedition route"
              : panel === "extract"
              ? "Leave the facility?"
              : panel === "restart"
              ? "Restart expedition?"
              : inspect
              ? labelFor(inspect)
              : ""}
          </h2>
          <button
            autoFocus
            aria-label="Close panel"
            onClick={() => setPanel(null)}
          >
            <X />
          </button>
        </header>

        {panel === "route" && (
          <>
            <ExpeditionTrail room={run.room} completed={run.phase === "won"} />
            <p>
              Four sectors to the central guardian. Health carries forward;
              cooldowns and signatures refresh at each encounter.
            </p>
            <ol className="pw-route-list">
              {ROOMS.map((r, i) => (
                <li
                  key={r.name}
                  className={
                    i < run.room || run.phase === "won"
                      ? "cleared"
                      : i === run.room
                      ? "current"
                      : ""
                  }
                >
                  <span>
                    {i < run.room || run.phase === "won" ? <Check /> : i + 1}
                  </span>
                  <div>
                    <strong>{r.name.replace(/^\d\. /, "")}</strong>
                    <p>{roomCopy[i]}</p>
                    <small>
                      {i < run.room || run.phase === "won"
                        ? "Secured"
                        : i === run.room
                        ? "You are here"
                        : "Ahead"}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
            <div className="pw-camp-stats">
              <span>
                <Crown />
                <strong>{run.xp}</strong> practice XP
              </span>
              <span>
                <Heart />
                <strong>{run.revival}</strong> revival kit
              </span>
            </div>
          </>
        )}
        {panel === "initiative" && (
          <>
            <p>
              Fastest acts first. This sequence shows speed, not hidden enemy
              decisions.
            </p>
            <ol className="pw-turn-list">
              {initiativeUnits.map((u, i) => (
                <li
                  key={u.id}
                  className={`${u.enemy ? "enemy" : "ally"} ${
                    frame?.event?.actorId === u.id ? "current" : ""
                  }`}
                >
                  <span>{i + 1}</span>
                  <Portrait u={u} small />
                  <div>
                    <strong>{labelFor(u)}</strong>
                    <small>{u.enemy ? "Facility defense" : "Your squad"}</small>
                  </div>
                  <span
                    className="pw-speed"
                    title={
                      sedated(u)
                        ? "Sedated: acts after every alert unit"
                        : effectiveSpeed(u) !== u.speed
                        ? `Slowed from ${u.speed}`
                        : undefined
                    }
                  >
                    <ChevronRight />
                    {effectiveSpeed(u)}
                    <small>
                      {sedated(u)
                        ? "sedated"
                        : effectiveSpeed(u) !== u.speed
                        ? "slowed"
                        : "speed"}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
        {panel === "extract" && (
          <>
            <p>
              Your expedition ends here. You keep {run.xp} practice XP;
              continuing later will start a new run.
            </p>
            <div className="pw-outcome-actions">
              <button className="pw-primary" onClick={() => setPanel(null)}>
                Stay with the squad
              </button>
              <button
                onClick={() => {
                  apply({ kind: "retreat" });
                  setPanel(null);
                }}
              >
                Extract now
              </button>
            </div>
          </>
        )}
        {panel === "guide" && (
          <>
            <div className="pw-symbol-key" aria-label="Move symbol key">
              <span>
                <Swords /> Melee attack
              </span>
              <span>
                <Crosshair /> Ranged attack
              </span>
              <span>
                <PowerIcon /> Base power
              </span>
              <span>
                <Link2 /> Binding opportunities
              </span>
              <span>
                <Crown /> Signature move
              </span>
              <span>
                <RotateCcw /> Health recoil
              </span>
              <span>
                <i className="pw-key-pip" /> Cooldown rounds
              </span>
            </div>
            <div className="pw-guide-steps">
              <span>
                <Portrait u={run.team[0]} small />
                Choose a creature
              </span>
              <ChevronRight />
              <span>
                <Swords />
                Choose a move
              </span>
              <ChevronRight />
              <span>
                <Crosshair />
                Choose an enemy
              </span>
            </div>
            <p>
              Plan one order for each standing companion, then commit the round.
              Tap any queued creature to edit its move or target. Escape leaves
              target selection; Clear removes its order.
            </p>
            <div className="pw-guide-grid">
              <section>
                <h3>
                  <Link2 />
                  Binding is not stun
                </h3>
                <p>
                  Melee is blocked through the next opportunity. Ranged moves
                  still work. Blocked moves do not start their cooldown. A
                  pull breaks a charge outright.
                </p>
              </section>
              <section>
                <h3>
                  <Zap />
                  Read the charge
                </h3>
                <p>
                  Charge → melee release → ordinary recovery attack. Stopping
                  the release buys time; the enemy can charge again.
                </p>
              </section>
              <section>
                <h3>
                  <Crosshair />
                  Targets can change
                </h3>
                <p>
                  If a target falls, the same move redirects to the next living
                  enemy in its row. Previews use current defenses; hidden
                  actions may change the result.
                </p>
              </section>
              <section>
                <h3>
                  <Crown />
                  Cooldowns and the signature
                </h3>
                <p>
                  Filled segments are rounds ready; a move on cooldown returns
                  when they refill. The signature is once per encounter.
                  Desperate strike deals 3 neutral damage with 2 recoil when
                  nothing damaging is available.
                </p>
              </section>
              <section>
                <h3>
                  <Heart />
                  Survive the dungeon
                </h3>
                <p>
                  Health and knockouts persist. One half-health revival between
                  battles. A pre-boss station restores 10 HP to standing
                  companions. A full wipe ends the run.
                </p>
              </section>
              <section>
                <h3>
                  <Shield />
                  Practice expedition
                </h3>
                <p>
                  Temporary moves and numbers. XP is a run score, not an account
                  reward. No tokens are granted. Your last resolved round is
                  saved in this browser; unfinished orders are not saved.
                </p>
              </section>
            </div>
            <div className="pw-run-details">
              Seed {run.seed} · {run.xp} practice XP · {run.revival} revival
              left
              <button onClick={() => setPanel("restart")}>
                Restart expedition <RotateCcw />
              </button>
            </div>
          </>
        )}

        {panel === "record" && (
          <>
            <p>
              Latest round first. Actions within each round follow their
              execution order.
            </p>
            <div
              role="log"
              aria-label="Combat record"
              className="pw-record-groups"
            >
              {groupRecord(run.log).map((group, i) =>
                group.events.length === 0 ? (
                  <p className="pw-record-arrival" key={`${group.title}-${i}`}>
                    Entered {group.title}
                  </p>
                ) : (
                  <details key={`${group.title}-${i}`} open={i === 0}>
                    <summary>
                      {group.title}
                      <span>{group.events.length} events</span>
                    </summary>
                    <ol>
                      {group.events.map((text, j) => (
                        <li
                          key={j}
                          className={
                            /Knocked out|stopped by restraint|CLEARED|DEFEAT|VICTORY/.test(
                              text
                            )
                              ? "record-important"
                              : ""
                          }
                        >
                          {text}
                        </li>
                      ))}
                    </ol>
                  </details>
                )
              )}
            </div>
          </>
        )}

        {panel === "inspect" && inspect && (
          <>
            <div className={`pw-inspect-hero el-${inspect.element}`}>
              <Portrait u={inspect} />
              <div>
                <span className="pw-element">
                  <ElementIcon element={inspect.element} />
                  {inspect.element}
                </span>
                <Health u={inspect} />
                <p>
                  Speed {effectiveSpeed(inspect)}
                  {effectiveSpeed(inspect) !== inspect.speed
                    ? ` (slowed from ${inspect.speed})`
                    : ""}{" "}
                  ·{" "}
                  {inspect.enemy ? "Facility defense" : "Your companion"}
                </p>
                <div className="pw-statuses">
                  <StatusBadges u={inspect} />
                </div>
              </div>
            </div>
            {inspect.charge && (
              <p className="pw-warning">
                <Zap />A release is coming at its next opportunity. The
                selected target is hidden.
              </p>
            )}
            {inspect.conditions.length > 0 && (
              <ul className="pw-condition-rules">
                {inspect.conditions.map((condition) => (
                  <li key={`${condition.status}-${condition.source}`}>
                    <span
                      className={`pw-condition-name group-${condition.group}`}
                    >
                      <GroupIcon group={condition.group} />
                      {condition.status}
                      <small>{remainingLabel(condition)}</small>
                    </span>
                    <span>{conditionRule(condition, inspect)}</span>
                  </li>
                ))}
              </ul>
            )}
            {inspect.ward && (
              <p className="pw-warning">
                <Shield />
                Guarded: incoming damage is halved until its next opportunity.
              </p>
            )}
            {!!inspect.recovery && (
              <p className="pw-warning">
                <RotateCcw />
                Recovering: it cannot start another charge at its next
                opportunity.
              </p>
            )}
            <div className="pw-inspect-moves">
              {inspect.moves.map((m, i) => (
                <div key={m.key}>
                  <div
                    className={`pw-move-card ${
                      m.signature ? "signature" : ""
                    } el-${inspect.element}`}
                  >
                    <MoveCardContent
                      unit={inspect}
                      move={m}
                      cooldown={inspect.enemy ? null : inspect.cooldowns[i]}
                      spent={m.signature && inspect.signatureSpent}
                      selected={false}
                      blocked={!!inspect.bound && melee(m)}
                      id={`inspect-move-${i}`}
                      fullName
                    />
                  </div>
                  <p>
                    {m.preparation === "prolonged"
                      ? "Charges first, then releases at its next opportunity. "
                      : ""}
                    {areaSummary(m) ? `${areaSummary(m)} ` : ""}
                    {squadmatesHit(inspect, m).length
                      ? `Right now it also hits ${listNames(
                          squadmatesHit(inspect, m)
                        )}. `
                      : ""}
                    {m.effects
                      .filter((e) => e.support !== "harm")
                      .map((e) => effectSummary(e, m))
                      .join(" ")}
                  </p>
                </div>
              ))}
            </div>
            {inspect.passives.length > 0 && (
              <ul className="pw-passive-rules">
                {inspect.passives.map((passive) => (
                  <li key={passive.key}>
                    <span
                      className={`pw-passive-name kind-${passive.kind}`}
                    >
                      <PassiveIcon passive={passive} />
                      {passiveHeading(passive)}
                      <small>{passive.name}</small>
                    </span>
                    <span>{passiveRule(inspect, passive)}</span>
                  </li>
                ))}
              </ul>
            )}
            {inspect.enemy && move && active && (
              <p className="pw-breakdown">
                {!harms(move)
                  ? previewText(inspect)
                  : `${basePower(active, move)} base × ${matchup(
                      active,
                      inspect,
                      move
                    )} element${
                      inspect.ward ? " × 0.5 shield" : ""
                    } = ${damagePreview(
                      active,
                      move,
                      inspect
                    )} estimated damage. Current defenses only.`}
              </p>
            )}
            <p>
              Actions resolve in the public speed order. Enemy moves and targets
              are not revealed before execution.
            </p>
          </>
        )}

        {panel === "restart" && (
          <>
            <p>
              This replaces your current run. The same seed gives a repeatable
              starting point.
            </p>
            <div className="pw-outcome-actions">
              <button onClick={() => setPanel(null)}>Keep playing</button>
              <button className="pw-primary" onClick={() => fresh(run.seed)}>
                Restart same seed
              </button>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
