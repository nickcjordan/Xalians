// Tier: immersive. Powerworks presentation redesign authorized by Nick. The squad draft before the first encounter is chrome and lives in powerworksDraft.tsx (contract decision 49).
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
  Smartphone,
} from "lucide-react";

import {
  openRun,
  squadUnits,
  command,
  resolveRound,
  restoreRun,
  legalMoves,
  legalTargets,
  guardedThreat,
  helpful,
  restorePreview,
  moveAt,
  damagePreview,
  basePower,
  matchup,
  initiative,
  effectiveSpeed,
  sedated,
  areaReach,
  beneficial,
  selfBurst,
  guardFactor,
  protectionDegree,
  asMove,
  contactDelivery,
  LIKELIHOOD_PERCENT,
  ROOMS,
  ENCOUNTER_STALL_ROUNDS,
  SAVE_VERSION,
  type Run,
  type Unit,
  type Order,
  type Command,
  type Frame,
  type Move,
  type Squad,
  type Reach,
} from "@xalians/rules/dungeon";

import {
  Portrait,
  ElementIcon,
  MoveCardContent,
  PowerIcon,
  effectSummary,
  areaSummary,
  actsOnSelf,
  harms,
  helps,
  closes,
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
  type BeatStory,
  type OrderChip,
  type OrderFlash,
  type UnitPreview,
} from "./powerworksScene";
import { PowerworksRadial, ringIndices } from "./powerworksRadial";
import { PowerworksEnvironment } from "./powerworksEnvironment";
import { PowerworksDraft } from "./powerworksDraft";
import { useBattlePresentation } from "./powerworksPresentation";
import "./powerworks.css";
import "./powerworksScene.css";
import "./powerworksHud.css";
import "./powerworksLayout.css";

const SAVE_KEY = "xalians.powerworks.v1";

/**
  The console scale (layout pass, 2026-09-24). The play screen is composed at 1280x720; on a
  larger landscape screen it is drawn larger with CSS zoom so the game fills the screen, and
  the text stays crisp (zoom lays the page out again at the new size, where a transform
  scale would blur it). Never below 1: a smaller screen keeps its own responsive layout.
*/
export const CONSOLE = { width: 1280, height: 720 } as const;
export function consoleScale(width: number, height: number): number {
  if (width <= 600) return 1;
  const z = Math.min(width / CONSOLE.width, height / CONSOLE.height);
  return z > 1 ? Math.floor(z * 1000) / 1000 : 1;
}
/**
  The zoom for the play screen, and `--pw-vw` and `--pw-vh` as one percent of the viewport in
  the zoomed page's own pixels: viewport units inside a zoomed element would be zoomed too.
*/
function useConsoleScale(on: boolean): React.CSSProperties | undefined {
  const [box, setBox] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const read = () => setBox({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  const z = on ? consoleScale(box.w, box.h) : 1;
  if (z === 1) return undefined;
  return {
    zoom: z,
    "--pw-vw": `${box.w / z / 100}px`,
    "--pw-vh": `${box.h / z / 100}px`,
  } as React.CSSProperties;
}

const roomCopy = [
  "Enter the service tunnels. The maintenance network is still awake.",
  "Breach the checkpoint. Ranged drones cover the armored units.",
  "Stored energy hums beneath the floor. Watch for a charging capacitor.",
  "Silence the guardian. Interrupting a charge buys time, but it will rebuild.",
];

/**
  The next standing companion in speed order that still needs an order and can act
  (radial orders decision 6), or undefined when every order is set.
*/
function nextInSpeed(state: Run, orders: Record<string, Order>) {
  const ids = initiative(state.team, state.enemies, state.round)
    .filter((u) => !u.enemy)
    .map((u) => u.id);
  return ids
    .map((id) => state.team.find((u) => u.id === id)!)
    .find(
      (u) => u && u.hp > 0 && !orders[u.id] && legalMoves(u, state).length > 0
    );
}

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
  // A fresh run opens in its draft (contract decision 48): the briefing offers the draft
  // and the starter squad, and the first command of the history is the choice.
  return {
    state: openRun(Number.isFinite(n) ? n : 1),
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
      lapsed: "Lapsed",
      outlasted: "Forced out",
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
    [started, setStarted] = useState(initial.started),
    [drafting, setDrafting] = useState(false);
  // The starter squad as the briefing shows it before a squad is chosen (contract decision 47).
  const starter = useMemo(() => squadUnits(run.seed, "starter"), [run.seed]);

  // The companion whose orders are open on the stage; "" when nothing is selected.
  const [selected, setSelected] = useState(
    () =>
      (initial.started &&
        initial.state.phase === "planning" &&
        nextInSpeed(initial.state, {})?.id) ||
      ""
  );
  // Whether focus should enter the ring when it opens: a player opened it, rather than the
  // round beginning (radial orders decision 9).
  const [ringFocus, setRingFocus] = useState(false);
  // Keyboard modality (round 2): the discs show their hotkeys only once a key has been
  // pressed on this page, and hide them again after a touch.
  const [keyed, setKeyed] = useState(false);
  // The one-shot beat when an order locks: the target ring flashes, the chip lights.
  const [flash, setFlash] = useState<OrderFlash | null>(null);

  const [playbackOrders, setPlaybackOrders] = useState<Record<string, Order>>(
    {}
  );
  const [plans, setPlans] = useState<Record<string, Order>>({}),
    [pending, setPending] = useState<number | null>(null),
    [hoverTarget, setHoverTarget] = useState<string | null>(null),
    // The disc hovered, focused or armed on the open wheel (round 3): previewed faintly.
    [hint, setHint] = useState<number | null>(null);

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
    keys = useRef<(e: KeyboardEvent) => void>(() => {});

  const busy = frames.length > 0,
    frame = frames[frameIndex];
  const { impact, reducedMotion, sound, toggleSound, frameDuration } =
    useBattlePresentation(frame, frameIndex, speed, paused || !!panel);
  const shown =
    busy && !impact && frameIndex > 0 ? frames[frameIndex - 1] : frame;
  const team = shown?.team ?? run.team,
    enemies = shown?.enemies ?? run.enemies;

  const planning = started && run.phase === "planning" && !busy;
  const consoleStyle = useConsoleScale(started);

  const active = run.team.find((u) => u.id === selected && u.hp > 0);

  const move = active && pending !== null ? moveAt(active, pending) : null;

  const living = run.team.filter((u) => u.hp > 0),
    ready = living.filter(
      (u) => plans[u.id] || !legalMoves(u, run).length
    ).length;

  const chosenTarget =
    hoverTarget ?? (active ? plans[active.id]?.target : null);

  // The order the round will resolve in, as the engine reads it: the machines' orders and
  // the squad's plans so far count (an immediate move acts earlier).
  const initiativeUnits = busy
    ? turnOrder
    : initiative(run.team, run.enemies, run.round, { ...run.orders, ...plans });

  const inspect = [...team, ...enemies].find((u) => u.id === inspectId);

  const roomName = ROOMS[run.room].name.replace(/^\d\. /, "");

  const available = active ? legalMoves(active, run) : [];
  // The ring is open over the selected companion until a move is chosen (decisions 3 and 5).
  const ringOpen = planning && !!active && pending === null;
  // Who the pending move may name (contract decision 39): foes, and squadmates when it
  // carries a helpful effect.
  const targetIds =
    active && pending !== null
      ? legalTargets(run, active, pending).map((u) => u.id)
      : [];

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

  // Escape backs out one step; keys 1 to 4 choose a slot of the open ring (decision 9).
  keys.current = (e: KeyboardEvent) => {
    if (!keyed && !["Shift", "Control", "Alt", "Meta"].includes(e.key)) setKeyed(true);
    if (panel || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const field = (e.target as Element | null)?.closest?.("input, textarea, select");
    if (field) return;
    if (e.key === "Escape") {
      if (planning && active) {
        e.preventDefault();
        backOut();
      }
      return;
    }
    if (ringOpen && active && /^[1-9]$/.test(e.key)) {
      const index = ringIndices(active, available)[Number(e.key) - 1];
      if (index === undefined) return;
      e.preventDefault();
      choose(index, true);
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

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

  /** Focus a companion's figure on the stage: where focus returns when its ring closes. */
  function focusFigure(id: string) {
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(
          `[data-unit="${id}"] .pw-scene-character`
        )
        ?.focus({ preventScroll: true })
    );
  }

  function focusCommit() {
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(".pw-commit .pw-primary")?.focus()
    );
  }

  /** Open a companion's ring (decision 2). Its standing order, if any, is marked on its slot. */
  function openRing(u: Unit) {
    if (!planning || u.hp <= 0) return;
    setSelected(u.id);
    setPending(null);
    setHoverTarget(null);
    setHint(null);
    setRingFocus(true);
    setNotice(
      `Planning ${u.name}. ${
        plans[u.id] ? "Its order can be changed." : "Choose a move."
      }`
    );
  }

  /** Close the open ring and select nothing; focus returns to the companion. */
  function closeRing() {
    const id = active?.id;
    setSelected("");
    setPending(null);
    setHoverTarget(null);
    setHint(null);
    setNotice("");
    if (id) focusFigure(id);
  }

  /**
    The figure and plaque: selecting the open companion again closes its ring. From the
    keyboard, Enter or Space on a ring that opened by itself (a round beginning) moves focus
    into it instead; Escape closes it.
  */
  function select(u: Unit, keyboard = false) {
    if (!planning || u.hp <= 0) return;
    if (active?.id === u.id && pending === null) {
      if (keyboard && !document.activeElement?.closest("[role=menu]"))
        requestAnimationFrame(() =>
          document
            .querySelector<HTMLButtonElement>('[role=menu] [tabindex="0"]')
            ?.focus({ preventScroll: true })
        );
      else closeRing();
    } else openRing(u);
  }

  /** Escape or a click on empty stage: target selection back to the ring, the ring to nothing (decision 5). */
  function backOut() {
    if (!planning || !active) return;
    if (pending !== null) {
      setPending(null);
      setHoverTarget(null);
      setHint(null);
      setRingFocus(true);
      setNotice(`Choose a move for ${active.name}.`);
    } else closeRing();
  }

  /** Tab and Shift+Tab from an open ring: the next or previous standing companion (decision 9). */
  function step(direction: 1 | -1) {
    if (!active) return;
    const standing = run.team.filter((u) => u.hp > 0);
    const next =
      standing[standing.findIndex((u) => u.id === active.id) + direction];
    if (next) openRing(next);
    else {
      const id = active.id;
      setSelected("");
      setNotice("");
      if (direction > 0) focusCommit();
      else focusFigure(id);
    }
  }

  /** A slot of the ring was chosen: target selection follows, or the order is set for a move on its user. */
  function choose(i: number, keyboard: boolean) {
    if (!planning || !active || !available.includes(i)) return;
    const m = moveAt(active, i);
    const targets = legalTargets(run, active, i);
    if (!targets.length) return;
    if (actsOnSelf(m)) {
      order(active, i, targets[0].id, keyboard);
      return;
    }
    setPending(i);
    setHoverTarget(null);
    setHint(null);
    const readings = buildPreviews(active, m, i, null);
    const mates = targets.some((t) => !t.enemy && readings[t.id] && !readings[t.id].idle),
      foes = targets.some((t) => t.enemy);
    setNotice(
      `${m.name} selected. ${
        foes && mates ? "Choose an enemy or a squadmate." : mates ? "Choose a squadmate." : "Choose an enemy."
      }`
    );
    if (keyboard)
      // Focus the first target the move would affect: a dimmed squadmate it can do
      // nothing for comes last (round 2 review).
      requestAnimationFrame(() =>
        (
          document.querySelector<HTMLButtonElement>(
            ".pw-scene-unit.targetable:not(.ineligible) .pw-target:not(:disabled)"
          ) ?? document.querySelector<HTMLButtonElement>(".pw-target:not(:disabled)")
        )?.focus({ preventScroll: true })
      );
  }

  /**
    The turn order as a strip in the bottom bar (layout pass): every standing unit in the
    order the round resolves, read left to right. A companion's figure selects it while
    planning and shows whether its order is set; a machine's opens its inspector. While a
    round plays, the unit acting is lit and the ones that have acted fade.
  */
  function turnStrip() {
    const acted = new Set(
      busy
        ? frames
            .slice(0, frameIndex)
            .map((f) => f.event?.actorId)
            .filter((id): id is string => !!id)
        : []
    );
    const actor = busy ? frame?.event?.actorId : undefined;
    return (
      <div className="pw-turn-strip">
        <button
          className="pw-turn-strip-label"
          onClick={() => setPanel("initiative")}
          aria-label="Turn order speeds"
          title="Fastest acts first. Select to see speeds."
        >
          <span className="pw-eyebrow">Turn order</span>
        </button>
        <ol aria-label="Turn order">
          {initiativeUnits.map((u, i) => {
            const standing = (busy ? [...team, ...enemies] : [...run.team, ...run.enemies]).find(
              (t) => t.id === u.id
            );
            const down = !standing || standing.hp <= 0;
            const set = !u.enemy && !!plans[u.id];
            return (
              <li
                key={u.id}
                className={`${u.enemy ? "enemy" : "ally"} ${actor === u.id ? "acting" : ""} ${
                  acted.has(u.id) && actor !== u.id ? "acted" : ""
                } ${down ? "down" : ""} ${!busy && active?.id === u.id ? "selected" : ""} ${
                  set ? "set" : ""
                }`}
              >
                <button
                  onClick={() => (u.enemy ? inspectUnit(u.id) : select(u))}
                  disabled={!u.enemy && (!planning || down)}
                  aria-label={`Turn ${i + 1}: ${labelFor(u)}${
                    u.enemy ? "" : set ? ", order set" : busy ? "" : ", needs an order"
                  }`}
                  title={labelFor(u)}
                >
                  <Portrait u={u} small />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    );
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
    order(active, pending, id, keyboard);
  }

  /** Set an order, then move to the next companion in speed order without one (decision 6). */
  function order(u: Unit, moveIndex: number, target: string, keyboard: boolean) {
    const next = { ...plans, [u.id]: { move: moveIndex, target } };
    lockedOrder.current = { id: u.id, move: moveIndex };
    if (motion)
      setFlash({
        actor: u.id,
        target: actsOnSelf(moveAt(u, moveIndex)) ? null : target,
        stamp: Date.now(),
      });
    setPlans(next);
    setPending(null);
    setHoverTarget(null);
    setHint(null);
    const nextUnit = nextInSpeed(run, next);
    const named = [...run.team, ...run.enemies].find((t) => t.id === target);
    const m = moveAt(u, moveIndex);
    setNotice(
      `${u.name}: ${m.name}${
        actsOnSelf(m)
          ? " on itself"
          : ` on ${named?.name ?? "its target"}${
              named && !named.enemy ? " (squadmate)" : ""
            }`
      }. ${
        nextUnit
          ? `Now planning ${nextUnit.name}.`
          : "All orders ready. Review or commit."
      }`
    );
    if (nextUnit) {
      setSelected(nextUnit.id);
      setRingFocus(true);
    } else {
      setSelected("");
      if (keyboard) focusCommit();
    }
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
        setSelected(nextInSpeed(next, {})?.id ?? "");
        setRingFocus(false);
        revealControls(".pw-theater", "start");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function commit() {
    const orders = { ...plans };
    living.forEach((u) => {
      if (!legalMoves(u, run).length) orders[u.id] = { move: -2, target: "" };
    });
    try {
      const result = resolveRound(run, orders);
      setPlayRound(run.round);
      setTurnOrder(initiative(run.team, run.enemies, run.round, { ...run.orders, ...orders }));
      setRun(result.state);
      setHistory((h) => [...h, { kind: "round", orders }]);
      setPlaybackOrders(orders);
      // The next round opens on its fastest companion once playback ends (decision 6).
      setSelected(nextInSpeed(result.state, {})?.id ?? "");
      setRingFocus(false);
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
      // Commit leaves the bar as the playback controls take its place: focus follows them.
      if (document.activeElement?.closest(".pw-commit"))
        requestAnimationFrame(() =>
          document
            .querySelector<HTMLButtonElement>(".pw-playback-controls button")
            ?.focus({ preventScroll: true })
        );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /** A new run returns to the briefing, where the squad is chosen again (contract decision 48). */
  function fresh(seed: number) {
    const next = openRun(seed);
    setRun(next);
    setHistory([]);
    setStarted(false);
    setDrafting(false);
    setSelected("");
    setPlans({});
    setPending(null);
    setFrames([]);
    setLastFrames([]);
    setPanel(null);
    setError("");
    setNotice("New expedition ready. Choose a squad.");
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* Storage unavailable: nothing to clear. */
    }
  }

  /** The draft command: the first command of every history (contract decision 48). */
  function begin(squad: Squad) {
    try {
      const action: Command = { kind: "draft", squad };
      const next = command(run, action);
      setRun(next);
      setHistory([action]);
      setStarted(true);
      setDrafting(false);
      setSelected(nextInSpeed(next, {})?.id ?? "");
      setRingFocus(false);
      setPlans({});
      setPending(null);
      setError("");
      setNotice(
        `Squad ready: ${next.team.map((u) => u.name).join(", ")}. Choose a move.`
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /**
    What the chosen move would do to one unit (radial orders round 2), from the rules'
    own preview functions: damage and its matchup and guards, a heal, a pull, each status
    with its chance, and what a helpful move does for a squadmate. `reach` says whether the
    unit is the aimed target or only caught by the area; `towardAlly` whether the move is
    aimed at a squadmate, when only its helpful effects land (contract decision 40).
  */
  function previewOf(
    a: Unit,
    m: Move,
    u: Unit,
    reach: Reach,
    towardAlly: boolean
  ): UnitPreview {
    const mate = u.enemy === a.enemy;
    const effects = m.effects.filter(
      (e) =>
        e.support !== "unsupported" &&
        e.recipient !== "self" &&
        (reach === "target" || e.recipient === "area") &&
        (!towardAlly || helpful(e))
    );
    const strikes =
      !towardAlly &&
      (m.fallback === true ||
        effects.some((e) => e.support === "harm" || e.support === "displace"));
    const damage = strikes ? damagePreview(a, m, u, reach) : 0;
    const factor = strikes ? matchup(a, u, m) : 1;
    const immune = strikes && damage === 0;
    const guarded = strikes && damage > 0 && guardFactor(u) < 1;
    const knockout = damage > 0 && damage >= u.hp;
    const pull =
      !towardAlly &&
      effects.some((e) => e.support === "displace") &&
      protectionDegree(u, { kind: "displace" }) !== "immune";
    const heal = mate
      ? effects
          .filter((e) => e.support === "restore")
          .reduce((n, e) => n + restorePreview(a, e), 0)
      : 0;
    // Focus shuts out attention statuses (the rules' FOCUS_STATUS, not re-exported).
    const focused = u.conditions.some((c) => c.status === "focused");
    const statuses = effects
      .filter(
        (e) =>
          (e.support === "status" || e.support === "bind") &&
          !!e.group &&
          (mate || !beneficial(e))
      )
      .map((e) => {
        const status = e.status ?? "condition";
        return {
          status,
          group: e.group!,
          chance: LIKELIHOOD_PERCENT[e.likelihood],
          immune:
            protectionDegree(u, { kind: "status", status }) === "immune" ||
            (e.group === "attention" && focused),
        };
      });
    // A contact strike on a unit with a contact reaction (the guardian's discharge) is
    // answered at the companion acting, if the strike lands anything (round 3). The damage
    // is the rules' own preview of the reaction's harm, read through its Move clothing.
    const lands =
      (strikes && !immune) || statuses.some((st) => !st.immune);
    const reactor =
      !mate && lands && contactDelivery(m) && !sedated(u)
        ? u.passives.find(
            (p, i) =>
              p.kind === "triggered" &&
              p.trigger === "contact" &&
              p.support === "supported" &&
              !(u.passiveCooldowns[i] > 0)
          )
        : undefined;
    const shock = reactor
      ? {
          damage: damagePreview(u, asMove(reactor), a),
          name: reactor.name,
          element: reactor.element,
        }
      : null;
    const notes: UnitPreview["notes"] = [];
    // Why a helpful move would do nothing here: said in words, never drawn as a label.
    const nothing: string[] = [];
    for (const e of effects) {
      if (e.support === "remove") {
        const cleared = u.conditions.filter(
          (c) =>
            c.remaining !== Infinity &&
            c.removable.some((r) => e.methods?.includes(r))
        );
        if (cleared.length)
          notes.push({
            kind: "clear",
            text: `clears ${cleared.map((c) => c.status).join(", ")}`,
          });
        else if (mate) nothing.push("nothing to clear");
      } else if (
        mate &&
        (e.support === "protect" || (e.support === "status" && e.group === "guarding"))
      ) {
        const threat = guardedThreat(run, u, e);
        if (threat) notes.push({ kind: "guard", text: `guards vs ${threat}` });
        else nothing.push("no threat to guard");
      }
    }
    const words: string[] = [];
    if (strikes)
      words.push(
        immune
          ? "no effect"
          : `${damage} damage, ${u.hp} to ${Math.max(0, u.hp - damage)}${
              knockout ? ", knocks out" : ""
            }`
      );
    if (strikes && !immune) {
      if (factor > 1) words.push("strong");
      else if (factor < 1) words.push("resisted");
      if (guarded) words.push("guarded");
    }
    if (pull) words.push("pulled off its footing");
    for (const st of statuses)
      words.push(
        st.immune
          ? `immune to ${st.status}`
          : `${st.status} ${st.chance}% chance${
              st.group === "binding" ? ", blocks closing in" : ""
            }`
      );
    if (heal > 0)
      words.push(
        u.hp >= u.max
          ? "already at full health"
          : `heals ${Math.min(heal, u.max - u.hp)}, ${u.hp} to ${Math.min(
              u.max,
              u.hp + heal
            )}`
      );
    for (const n of notes)
      words.push(
        n.kind === "guard" ? n.text.replace("guards vs", "guards against about") : n.text
      );
    words.push(...nothing);
    if (shock) words.push(`shocks back ${shock.damage} damage to ${a.name}`);
    if (!words.length) words.push("no effect here");
    // A squadmate the move would do nothing for is drawn as a non-target (round 2 review).
    const idle =
      mate &&
      towardAlly &&
      Math.min(heal, u.max - u.hp) <= 0 &&
      !statuses.length &&
      !notes.length;
    // The card's line keeps the clause that matters most: the damage (or the heal, or the
    // status); the rest is drawn on the creature and read in full by the accessible name.
    const line = `${
      strikes && !immune
        ? `${damage} damage, ${u.hp} to ${Math.max(0, u.hp - damage)}${knockout ? ", knocks out" : ""}`
        : words[0]
    }${shock ? `; shocks back ${shock.damage}` : ""}`;
    // The matchup in words for the chevron's tooltip (round 3 review): the move's element, or
    // for a physical move the creature's own, against the target's.
    const matchupText =
      strikes && !immune && factor !== 1
        ? `${factor > 1 ? "Strong" : "Weak"}: ${
            m.element && !m.fallback ? m.element : `${a.name}'s ${a.element}`
          } against ${u.element}`
        : undefined;
    return {
      line,
      idle,
      matchup: strikes && !immune ? factor : 1,
      matchupText,
      shock,
      role: "target",
      damage,
      heal,
      knockout,
      guarded,
      immune,
      danger: false,
      muted: false,
      pull,
      statuses,
      notes,
      words: words.join(", "),
    };
  }

  /**
    The previews for every unit the chosen move names or reaches (round 2). Each legal
    target reads as if it were aimed at; the aimed target (hovered or focused) adds every
    unit its area reaches, squadmates in the danger color, and the other targets step back.
  */
  function buildPreviews(a: Unit, m: Move, index: number, aimedId: string | null) {
    const targets = legalTargets(run, a, index);
    const out: Record<string, UnitPreview> = {};
    for (const t of targets) out[t.id] = previewOf(a, m, t, "target", t.enemy === a.enemy);
    const reach = (from: Unit, only: (u: Unit) => boolean = () => true) => {
      const toward = from.enemy === a.enemy;
      const around = areaReach(run, a, m, from).filter(only);
      for (const r of around)
        out[r.id] = {
          ...previewOf(a, m, r, "area", toward),
          role: "reached",
          danger: !toward && r.enemy === a.enemy,
        };
      return around;
    };
    const focus = targets.find((t) => t.id === aimedId);
    if (focus) {
      const around = reach(focus);
      for (const t of targets)
        if (t.id !== focus.id && !around.includes(t)) out[t.id].muted = true;
      const foes = around.filter((r) => r.enemy !== a.enemy),
        mates = around.filter((r) => r.enemy === a.enemy);
      out[focus.id].words += `${foes.length ? `, also reaches ${listNames(foes)}` : ""}${
        mates.length && focus.enemy !== a.enemy ? `, also hits ${listNames(mates)}` : ""
      }`;
    } else if (selfBurst(m)) {
      // A burst on its user reaches the same squadmates whichever foe it names.
      const foe = targets.find((t) => t.enemy !== a.enemy);
      const mates = foe ? reach(foe, (r) => r.enemy === a.enemy) : [];
      if (mates.length)
        for (const t of targets)
          if (t.enemy !== a.enemy) out[t.id].words += `, also hits ${listNames(mates)}`;
    }
    return out;
  }
  const aimed =
    move && hoverTarget && targetIds.includes(hoverTarget) ? hoverTarget : null;
  const previews: Record<string, UnitPreview> =
    move && active && pending !== null ? buildPreviews(active, move, pending, aimed) : {};
  // Before the click (round 3): the hovered, focused or armed disc's outcome, drawn faintly.
  const hints: Record<string, UnitPreview> =
    ringOpen && active && hint !== null && available.includes(hint)
      ? buildPreviews(active, moveAt(active, hint), hint, null)
      : {};
  const aimedUnit = aimed
    ? [...run.team, ...run.enemies].find((u) => u.id === aimed)
    : null;
  const targetLine =
    aimedUnit && previews[aimedUnit.id]
      ? `${labelFor(aimedUnit)}: ${previews[aimedUnit.id].line}`
      : null;
  // The prompt names only the sides with a target the move would do something for (round 3
  // review): a squadmate the move can name but would do nothing for is drawn as a non-target.
  const prompt = (() => {
    const foes = targetIds.some((id) => run.enemies.some((u) => u.id === id)),
      mates = targetIds.some(
        (id) => run.team.some((u) => u.id === id) && !!previews[id] && !previews[id].idle
      );
    return foes && mates
      ? "Choose an enemy or a squadmate"
      : mates
      ? "Choose a squadmate"
      : "Choose an enemy";
  })();

  // The wheel on the stage, open or expanded into its move card (round 2), and the one
  // leaving it: when the wheel moves to another companion or closes, the old one stays a
  // moment to fold its discs back into the creature, or, when its order just locked, to
  // collapse its card into the plaque chip. The same React key keeps its DOM, so its exit
  // starts from exactly what was on screen. Nothing lingers under reduced motion.
  type RingView = {
    unit: Unit;
    available: number[];
    current: number | null;
    chosen: number | null;
    prompt: string;
    line: string | null;
  };
  const motion = !reducedMotion;
  const ringView: RingView | null =
    planning && active
      ? {
          unit: active,
          available,
          current: plans[active.id]?.move ?? null,
          chosen: pending,
          prompt,
          line: targetLine,
        }
      : null;
  const [leaving, setLeaving] = useState<
    (RingView & { locked: number | null; stamp: number }) | null
  >(null);
  const [ringKey, setRingKey] = useState(ringView?.unit.id ?? "");
  const shownRing = useRef<RingView | null>(null),
    lockedOrder = useRef<{ id: string; move: number } | null>(null);
  const openKey = ringView?.unit.id ?? "";
  if (openKey !== ringKey) {
    setRingKey(openKey);
    const last = shownRing.current;
    setLeaving(
      last && motion && last.unit.id !== openKey
        ? {
            ...last,
            locked:
              lockedOrder.current?.id === last.unit.id ? lockedOrder.current.move : null,
            stamp: Date.now(),
          }
        : null
    );
  }
  // After an order locks, the next wheel waits for the collapse (round 2 review).
  const holdNext = !!leaving && leaving.locked !== null;
  useLayoutEffect(() => {
    // A wheel held back was never on screen, so it has nothing to fold away.
    shownRing.current = holdNext ? null : ringView;
    lockedOrder.current = null;
  });
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(timer);
  }, [flash]);
  useEffect(() => {
    const touch = (e: PointerEvent) => e.pointerType === "touch" && setKeyed(false);
    window.addEventListener("pointerdown", touch);
    return () => window.removeEventListener("pointerdown", touch);
  }, []);

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
      return `${name} cannot close in on a target at its next opportunity.`;
    if (e.kind === "missed") return `${name} shrugs it off.`;
    if (e.kind === "displace")
      return `${name} is pulled off its footing. Its charge is broken.`;
    if (e.kind === "restore")
      return e.actorId && e.actorId !== e.targetId
        ? `${actorName} heals ${name}: ${e.amount} HP back.`
        : `${name} recovers ${e.amount} HP.`;
    if (e.kind === "ward")
      return e.actorId && e.targetId && e.actorId !== e.targetId
        ? `${actorName} shields ${name}: incoming damage is halved until its next opportunity.`
        : "Incoming damage is halved until the next opportunity.";
    if (e.kind === "lapsed")
      return "No squadmate stands to receive it. The order lapses.";
    if (e.kind === "charge")
      return "Preparing a release for the next opportunity.";
    if (e.kind === "blocked")
      return current.text.includes("charge was broken")
        ? "Its charge was broken; it must recover first."
        : "Binding prevented the action.";
    if (e.kind === "redirect")
      return `The original target fell. The move redirects to ${name}${
        target && actor && target.enemy === actor.enemy ? ", a squadmate" : ""
      }.`;
    if (e.kind === "round") return "Orders resolve from fastest to slowest.";
    // The stalemate rule (contract decision 52).
    if (e.kind === "outlasted")
      return `${ENCOUNTER_STALL_ROUNDS} rounds without progress: nobody on either side lost health. The defenses outlasted the squad, which is forced out with its practice XP.`;
    const helping =
      !!actor && !!target && actor.id !== target.id && actor.enemy === target.enemy;
    if (e.kind === "status")
      return `${helping ? `${actorName} helps ${name}: ` : ""}${name} is ${
        e.status
      } for ${e.remaining} ${
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
        ? `${helping ? `${actorName} clears it: ` : ""}${name} is no longer ${
            e.status
          }.`
        : `Nothing on ${name} answered to it.`;
    if (e.kind === "lost")
      return `${actorName} is ${
        e.status === "stunned" ? "stunned" : "entranced"
      } and loses this opportunity.`;
    if (e.kind === "hidden") return `${name} is concealed and cannot be found.`;
    return current.text;
  }

  // Each companion's plaque chip (radial orders decision 7): its order, its playback
  // state, or why it has none.
  const actedBy = (id: string) =>
    frames
      .slice(0, frameIndex)
      .some((f) => f.event?.actorId === id && f.event.kind !== "redirect");
  const chips: Record<string, OrderChip> = Object.fromEntries(
    team.map((u): [string, OrderChip] => {
      const queued = (busy ? playbackOrders : plans)[u.id];
      if (u.hp <= 0)
        return [u.id, { move: null, target: null, empty: "Knocked out" }];
      if (!queued || queued.move === -2)
        return [
          u.id,
          {
            move: null,
            target: null,
            empty:
              queued || (planning && !legalMoves(u, run).length)
                ? "Cannot act"
                : "No order",
          },
        ];
      const m = moveAt(u, queued.move);
      const target = [...enemies, ...team].find((t) => t.id === queued.target);
      return [
        u.id,
        {
          move: m,
          target: actsOnSelf(m) || !target ? null : labelFor(target),
          status: busy
            ? frame?.event?.actorId === u.id
              ? "Acting now"
              : actedBy(u.id)
              ? "Acted"
              : "Waiting"
            : null,
        },
      ];
    })
  );

  // The beat as the on-stage banner names it (overlay pass): the banner is the one place a
  // beat is named, so the playback controls can live in the bottom bar and the stage keeps
  // its planning size while a round plays.
  const beatActor = busy && frame?.event?.actorId
    ? [...team, ...enemies].find((u) => u.id === frame.event?.actorId)
    : undefined;
  const story: BeatStory | null =
    busy && frame
      ? {
          eyebrow: beatActor ? labelFor(beatActor) : `Round ${playRound}`,
          title: frame.event?.moveName || eventLabel(frame),
          caption: impact ? actionCaption(frame) : null,
        }
      : null;

  const phaseTitle =
    run.phase === "camp"
      ? "Sector secured"
      : run.phase === "won"
      ? "Powerworks silenced"
      : run.phase === "lost"
      ? "Expedition ended"
      : run.ended === "outlasted"
      ? "Forced out"
      : "Squad extracted";

  // The draft is setup, so it is the site's chrome rather than this immersive page
  // (contract decision 49). It replaces the page until a squad is chosen.
  if (!started && drafting)
    return (
      <PowerworksDraft
        seed={run.seed}
        onBack={() => setDrafting(false)}
        onEnter={(picks) => begin(picks)}
      />
    );

  return (
    <main
      className={`pw ${started ? "in-run" : ""} room-${run.room} ${
        planning ? "is-planning" : ""
      } ${move ? "is-targeting" : ""}`}
      data-tier="immersive"
      id="main"
      style={consoleStyle}
    >
      <header className="pw-top">
        <Link to="/" className="pw-brand">
          <ArrowLeft size={16} />
          <span>XALIANS</span>
        </Link>
        {/* In play the header is the HUD (layout pass): where the squad is and which
            round it is, beside the tools, so no second bar splits the screen. */}
        {started ? (
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
                  {i < run.room || run.phase === "won" ? <Check /> : <span>{i + 1}</span>}
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
        ) : (
          <div className="pw-game-name">
            THE DORMANT POWERWORKS <span>Prototype</span>
          </div>
        )}
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
              Draft four of eight generated creatures, or take the starter
              squad. Plan their moves together, read the enemy’s behavior, and
              reach the central guardian.
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
            <div className="pw-brief-actions">
              <button className="pw-primary" onClick={() => setDrafting(true)}>
                Draft a squad <ArrowRight />
              </button>
              <button onClick={() => begin("starter")}>
                Take the starter squad
              </button>
            </div>
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
          <div className="pw-brief-roster" aria-label="The starter squad">
            {starter.map((u) => (
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
                  targetIds={targetIds}
                  planning={planning}
                  impact={impact}
                  paused={paused || !!panel}
                  speed={speed}
                  reducedMotion={reducedMotion}
                  labelFor={labelFor}
                  previews={previews}
                  hints={hints}
                  beatMs={frameDuration / speed}
                  story={story}
                  flash={flash}
                  onTarget={assign}
                  onSelect={select}
                  onOpen={(u) => openRing(u)}
                  onBack={backOut}
                  onInspect={inspectUnit}
                  onHover={setHoverTarget}
                  openId={ringOpen ? active?.id : null}
                  chips={chips}
                  ring={[
                    leaving && leaving.unit.id !== ringView?.unit.id ? (
                      <PowerworksRadial
                        key={leaving.unit.id}
                        unit={leaving.unit}
                        available={leaving.available}
                        current={leaving.current}
                        chosen={leaving.chosen}
                        autoFocus={false}
                        onChoose={() => {}}
                        onStep={() => {}}
                        keyed={keyed}
                        motion={motion}
                        closing
                        locked={leaving.locked}
                        prompt={leaving.prompt}
                        targetLine={leaving.line}
                        onClosed={() =>
                          setLeaving((l) =>
                            l && l.stamp === leaving.stamp ? null : l
                          )
                        }
                      />
                    ) : null,
                    // After an order locks, the next companion's wheel opens only once the
                    // card has collapsed into the chip: one thing moves at a time.
                    ringView && active && !holdNext ? (
                      <PowerworksRadial
                        key={active.id}
                        unit={active}
                        available={available}
                        current={plans[active.id]?.move ?? null}
                        autoFocus={ringFocus}
                        onChoose={choose}
                        onStep={step}
                        chosen={pending}
                        keyed={keyed}
                        motion={motion}
                        onBack={backOut}
                        prompt={prompt}
                        targetLine={targetLine}
                        onPreview={setHint}
                      />
                    ) : null,
                  ]}
                />

                {/* The bottom bar holds the one forward control in both phases (overlay
                    pass): Commit while planning, the playback controls while a round plays.
                    Nothing is added under the stage, so the stage never resizes. */}
                <footer className={`pw-commit ${busy ? "playing" : ""}`}>
                  {busy ? (
                    <>
                      <div className="pw-readiness">
                        <span className="pw-order-count" aria-hidden="true">
                          {paused ? <Pause /> : <Play />}
                        </span>
                        <p>
                          Round {playRound}
                          <small>
                            {paused ? "Paused · " : ""}Action {frameIndex + 1} of{" "}
                            {frames.length}
                          </small>
                        </p>
                      </div>
                      {turnStrip()}
                      <div
                        className="pw-playback-controls"
                        role="group"
                        aria-label="Round playback"
                      >
                        <button
                          onClick={() => setPaused((v) => !v)}
                          aria-label={paused ? "Resume playback" : "Pause playback"}
                        >
                          {paused ? <Play /> : <Pause />}
                          <span className="pw-control-label">
                            {paused ? "Resume" : "Pause"}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setPaused(true);
                            nextFrame();
                          }}
                          aria-label="Next action"
                        >
                          <ChevronRight />
                          <span className="pw-control-label">Next</span>
                        </button>
                        <button
                          className="pw-speed"
                          onClick={() =>
                            setSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1))
                          }
                          aria-label={`Playback speed ${speed}x`}
                        >
                          {speed}×
                        </button>
                        <button onClick={finishPlayback} aria-label="Show round result">
                          <span className="pw-control-label">Show round result</span>
                          <SkipForward />
                        </button>
                      </div>
                      <p className="pw-sr" aria-live="polite">
                        {story && story.caption
                          ? `${story.eyebrow}: ${story.title}. ${story.caption}`
                          : ""}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="pw-readiness" aria-live="polite">
                        <span
                          className={`pw-order-count ${
                            ready === living.length ? "complete" : ""
                          }`}
                        >
                          {ready === living.length ? (
                            <Check />
                          ) : (
                            <>
                              {ready}
                              <small>/{living.length}</small>
                            </>
                          )}
                        </span>
                        <p>
                          {ready === living.length ? "Squad ready" : "Plan your squad"}
                          <small>
                            {ready === living.length
                              ? "Review or edit orders."
                              : `${living.length - ready} ${
                                  living.length - ready === 1 ? "order" : "orders"
                                } remaining`}
                          </small>
                        </p>
                      </div>
                      {turnStrip()}
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
                        : run.ended === "outlasted"
                        ? `${ENCOUNTER_STALL_ROUNDS} rounds passed without progress. The facility's defenses outlasted the squad, which leaves with its earned practice XP.`
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

      {started && (
        <div className="pw-rotate">
          <Smartphone />
          <p>Turn your screen upright to play.</p>
        </div>
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
                <Portrait u={run.team[0] ?? starter[0]} small />
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
                Choose a target
              </span>
            </div>
            <p>
              Plan one order for each standing companion, then commit the round.
              Select a creature on the stage to open its moves above it; keys 1
              to 4 choose one. Its order shows on its plaque; select it again to
              change it. Escape steps back.
            </p>
            <div className="pw-guide-grid">
              <section>
                <h3>
                  <Link2 />
                  Binding is not stun
                </h3>
                <p>
                  Moves that close in on a target are blocked through the next
                  opportunity. Moves made from where the creature stands still
                  work, melee or ranged. Blocked moves do not start their cooldown. A
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
                  <Heart />
                  Helping a squadmate
                </h3>
                <p>
                  A move that heals, shields or clears can name a squadmate.
                  Only what helps lands on them; its damage does not. If they
                  fall first, it goes to the next squadmate, never an enemy.
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
                      blocked={!!inspect.bound && closes(m)}
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
            {!inspect.enemy &&
              move &&
              active &&
              targetIds.includes(inspect.id) && (
                <p className="pw-breakdown">
                  {previews[inspect.id]?.words}. Only what helps lands on a
                  squadmate.
                </p>
              )}
            {inspect.enemy && move && active && (
              <p className="pw-breakdown">
                {!harms(move)
                  ? previews[inspect.id]?.words ?? ""
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
              This replaces your current run and returns to the briefing. The
              same seed deals the same draft and the same starting point.
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
