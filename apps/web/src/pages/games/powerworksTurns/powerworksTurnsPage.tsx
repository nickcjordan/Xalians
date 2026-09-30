// Tier: immersive. Powerworks, turn by turn (docs/design/powerworks-turn-screen.md, "UX pass,
// 2026-09-29"): a timeline decides who acts next; on a companion's turn its four answer keys
// already carry their result on every target. Enemies play back between turns, one beat at a
// time, with a turn banner, a spotlit actor and a turn rail answering "whose turn, is it mine,
// what just happened, what happens next" throughout.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, BookOpen, ScrollText, RotateCcw, Smartphone } from "lucide-react";

import {
  createTurnRun,
  turnCommand,
  legalOrder,
  DEFAULT_RULES,
  ENEMY_HP_FACTOR,
  PILLAR_SAVE_VERSION,
  type TRun,
  type TCommand,
} from "@xalians/rules/dungeon/pillars";

import { turnView, playback, hpSnapshot, turnDeltas, type TurnView, type Beat, type SinceLastTurn } from "./view";
import { Portrait } from "../powerworksVisuals";
import { EnemyPlate, SquadPlate } from "./plate";
import { KeyCard } from "./keys";
import { TurnRail } from "./rail";
import { TurnBanner, PlaybackTools } from "./banner";
import { Playback, beatTiming, type BeatPhase } from "./playback";
import { CampPanel, EndPanel, GuidePanel, RecordPanel, RestartPanel } from "./panels";
import { PowerworksEnvironment } from "../powerworksEnvironment";
import "./powerworksTurns.css";

/** The number that rises over a beat's target: damage, healing, or the support it received. */
function floatOf(beat: Beat): { text: string; kind: string } | null {
  const e = beat.event;
  if (e.kind === "hit") return e.absorbed > 0 && e.amount === 0 ? { text: `shield took ${e.absorbed}`, kind: "shield" } : { text: `-${e.amount}`, kind: "hurt" };
  if (e.kind === "heal") return { text: `+${e.amount}`, kind: "heal" };
  if (e.kind === "shield") return { text: `shield ${e.amount}`, kind: "shield" };
  if (e.kind === "boost") return { text: `next attack +${e.amount}`, kind: "boost" };
  if (e.kind === "hinder") return { text: `next hit -${e.amount}`, kind: "hinder" };
  return null;
}

type Moment = { actor: string; beats: Beat[]; words: string };
type StrikeLine = { id: string; x1: number; y1: number; x2: number; y2: number };
type FloatMark = { id: string; x: number; y: number; items: { text: string; kind: string }[] };

const moveOf = (b: Beat) => ("move" in b.event ? (b.event as { move: string }).move : null);

/** Consecutive beats of one actor's one move become one moment (an area attack and its rider). */
function momentsOf(beats: Beat[]): Moment[] {
  const out: Moment[] = [];
  for (const b of beats) {
    const last = out[out.length - 1];
    if (last && moveOf(b) && last.actor === b.actor && moveOf(last.beats[0]) === moveOf(b)) {
      last.beats.push(b);
      last.words = `${last.words} ${b.words}`;
    } else out.push({ actor: b.actor, beats: [b], words: b.words });
  }
  return out;
}

/** Every unit a moment touches, in order, once each. */
function targetsOf(m: Moment): string[] {
  const ids: string[] = [];
  for (const b of m.beats) {
    const e = b.event as { target?: string; to?: string };
    const t = e.target ?? e.to;
    if (t && !ids.includes(t)) ids.push(t);
  }
  return ids;
}

/** Before the blow lands: who uses which move on whom. */
function approachWords(m: Moment, units: { id: string; name: string; letter?: string }[]): string {
  const name = (id: string) => {
    const u = units.find((x) => x.id === id);
    return u ? (u.letter ? u.name + " " + u.letter : u.name) : id;
  };
  const move = moveOf(m.beats[0]);
  const who = targetsOf(m).filter((t) => t !== m.actor);
  const actor = name(m.actor);
  if (!move) return m.words;
  if (!who.length) return `${actor} uses ${move}.`;
  const list = who.length > 1 ? `${who.length} targets` : name(who[0]);
  return `${actor} uses ${move} on ${list}.`;
}

/** One line for a moment: the beat's own words, or, when one move touches several units, who used what on whom. */
function momentWords(m: Moment, units: { id: string; name: string; letter?: string }[]): string {
  if (m.beats.length === 1) return m.words;
  const name = (id: string) => {
    const u = units.find((x) => x.id === id);
    return u ? (u.letter ? u.name + " " + u.letter : u.name) : id;
  };
  const join = (xs: string[]) => (xs.length > 1 ? xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1] : xs[0]);
  const hits = m.beats.filter((b) => b.event.kind === "hit").map((b) => b.event as { target: string; amount: number });
  const hinders = m.beats.filter((b) => b.event.kind === "hinder").map((b) => b.event as { amount: number });
  const move = moveOf(m.beats[0]) ?? "a move";
  const short = (id: string) => units.find((x) => x.id === id)?.letter ?? name(id);
  let words = hits.length
    ? `${name(m.actor)}'s ${move} hit ${join(hits.map((h) => short(h.target)))} for ${join(hits.map((h) => String(h.amount)))}.`
    : `${name(m.actor)} used ${move} on ${join(targetsOf(m).map(name))}.`;
  if (hinders.length) {
    const n = hinders[0].amount;
    words += hinders.length > 1 ? ` Their next hits are weakened by ${n}.` : ` Its next hit is weakened by ${n}.`;
  }
  return words;
}

const SAVE_KEY = "xalians.powerworks.turns.v1";
const CONSOLE = { width: 1280, height: 720 } as const;
const RULES = { ...DEFAULT_RULES, rooms: "roles" as const, timeline: "round" as const, enemyHpFactor: ENEMY_HP_FACTOR };

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

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media?.matches ?? false);
    media?.addEventListener?.("change", change);
    return () => media?.removeEventListener?.("change", change);
  }, []);
  return reduced;
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
  const [beatPhase, setBeatPhase] = useState<BeatPhase>("approach");
  const [skipPlayback, setSkipPlayback] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [armedAlly, setArmedAlly] = useState<{ index: number } | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const zoom = useConsoleScale();
  const reducedMotion = useReducedMotion();
  // The command's settled state, applied only once playback finishes (finishPlayback):
  // applying it earlier flips view.phase out from under the still-animating keybar/camp
  // block and orphans the Playback component mid-beat (paint review round 2 follow-up).
  const nextRun = useRef<TRun | null>(null);
  // The HP snapshot taken at the start of the player's current turn (item 6, "since your last
  // turn"): held until the player acts again, then replaced by the fresh one after that
  // hand-off completes, so the deltas and the "since your last turn" list stay visible
  // through the whole of the player's turn rather than clearing the instant playback ends.
  const snapshotRef = useRef<Record<string, number>>(hpSnapshot(run));
  const [since, setSince] = useState<SinceLastTurn>({ deltas: {}, lines: [] });

  const view = useMemo(() => turnView(run), [run]);
  const busy = !!pendingBeats;
  // The hand-off moment (storyboard step 1): when the enemies finish and a companion's turn
  // begins, "Your turn" is announced over the stage for a moment, so the change is seen, not
  // only read in the banner.
  const [handoff, setHandoff] = useState<string | null>(null);
  const [handoffRound, setHandoffRound] = useState<number | null>(null);
  const handoffRoundRef = useRef(0);
  const wasBusy = useRef(false);
  useEffect(() => {
    const name = run.phase === "turn" ? run.team.find((t) => t.id === run.active)?.name : undefined;
    if (wasBusy.current && !busy && name) {
      setHandoff(name);
      const r = view.round;
      setHandoffRound(handoffRoundRef.current && r !== handoffRoundRef.current ? r : null);
      handoffRoundRef.current = r;
      const t = window.setTimeout(() => setHandoff(null), 560);
      wasBusy.current = busy;
      return () => window.clearTimeout(t);
    }
    wasBusy.current = busy;
  }, [busy, run]);

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
          setBeatPhase("approach");
          setSkipPlayback(false);
          return;
        }
      }
      setRun(result.state);
    } catch {
      /* An illegal command from a stale key: ignore it, the view will not offer it again. */
    }
  }

  function finishPlayback(beats: Beat[]) {
    // "Since your last turn" (item 6): fold this command's beats into the running deltas and
    // lines, keyed off the snapshot taken at the player's last hand-off, so an enemy phase
    // that follows the player's own action still accumulates onto the same window.
    setSince((prev) => {
      const merged = turnDeltas(snapshotRef.current, beats);
      const lines = [...prev.lines, ...merged.lines].slice(-4);
      return { deltas: { ...prev.deltas, ...merged.deltas }, lines };
    });
    if (nextRun.current) {
      setRun(nextRun.current);
      nextRun.current = null;
    }
    setPendingBeats(null);
    setBeatIndex(0);
    setSkipPlayback(false);
  }

  // The player acting is the moment "since your last turn" clears (item 6): the snapshot
  // advances to right now, and the accumulated deltas/lines reset, so the beats about to play
  // (this action, then the enemy phase that follows) start a fresh window.
  function clearSince() {
    snapshotRef.current = hpSnapshot(run);
    setSince({ deltas: {}, lines: [] });
  }

  function act(index: number, target: string) {
    if (busy) return;
    setArmedAlly(null);
    setHoverTarget(null);
    clearSince();
    // A key that only acts on its user has no cell to name a target: the user is the target.
    dispatch({ kind: "act", order: { move: index, target: target || view.active?.id || "" } });
  }

  function pass() {
    if (busy || !view.active) return;
    clearSince();
    dispatch({ kind: "act", order: { move: -2, target: view.active.id } });
  }

  // Skip (banner item, storyboard "Skip jumps to the next hand-off to you, never past it"):
  // finish the in-flight playback at once. It cannot skip further than the current command's
  // beats, since a hand-off to the player always stops the timeline (run() in turns.ts halts
  // at the next companion's turn), so "finish this playback" and "reach the next hand-off to
  // you" are the same action here.
  function skipToHandoff() {
    if (pendingBeats) setSkipPlayback(true);
  }

  // The snapshot only advances once the player themselves acts (see act()/pass() below),
  // not on every hand-off: the deltas and "since your last turn" list must stay visible
  // through the whole of the player's own turn (item 6: "kept through your turn and cleared
  // when you act"), including a hand-off that lands on a different companion than last time.

  // Space or Enter during playback skips to the next hand-off (storyboard: same action as
  // the banner's Skip button). Kept separate from the main handler below, which returns
  // early while busy.
  useEffect(() => {
    if (!busy) return;
    function onSkipKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        skipToHandoff();
      }
    }
    window.addEventListener("keydown", onSkipKey);
    return () => window.removeEventListener("keydown", onSkipKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

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
    snapshotRef.current = hpSnapshot(next);
    setSince({ deltas: {}, lines: [] });
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* Storage unavailable: nothing to clear. */
    }
  }

  const roomName = view.roomName;
  // Beats are played as moments: one actor's one move, however many targets it touches (an
  // area attack and its rider land together, as one strike), so the playback shows one
  // action per actor rather than a string of separate hits.
  const moments = useMemo(() => (pendingBeats ? momentsOf(pendingBeats) : []), [pendingBeats]);
  const moment = busy ? moments[Math.min(beatIndex, moments.length - 1)] : undefined;
  const actorId = moment?.actor;
  const actorIsEnemy = !!actorId && view.enemies.some((e) => e.id === actorId);
  // The spotlit unit (storyboard item "whose turn"): the current moment's actor during
  // playback, or the active companion on its own turn. Never the unit that just acted once
  // the moment has moved on.
  const spotlightId = busy ? actorId ?? null : view.active?.id ?? null;
  const spotlightSide: "squad" | "enemy" = actorIsEnemy ? "enemy" : "squad";
  const showImpact = busy && beatPhase === "impact";
  const targets = useMemo(() => (moment ? targetsOf(moment) : []), [moment]);
  const impactTargets = showImpact ? targets : [];

  // Health during playback: the settled state is held until playback ends, so each plate
  // shows the health as of the moment being played; it drops when the blow lands.
  const shownHp = useMemo(() => {
    if (!busy) return null;
    const upTo = showImpact ? beatIndex : beatIndex - 1;
    if (upTo < 0) return null;
    const m = moments[Math.min(upTo, moments.length - 1)];
    return m ? m.beats[m.beats.length - 1].hp : null;
  }, [busy, moments, beatIndex, showImpact]);
  const shownMarks = useMemo(() => {
    if (!busy) return null;
    const upTo = showImpact ? beatIndex : beatIndex - 1;
    if (upTo < 0) return null;
    const marksNow: Record<string, { shield: number; boost: number; hinder: number }> = {};
    for (const u of [...view.squad, ...view.enemies]) marksNow[u.id] = { shield: u.shield, boost: u.boost, hinder: u.hinder };
    for (const m of moments.slice(0, upTo + 1)) {
      const attacked = m.beats.some((b) => b.event.kind === "hit");
      if (attacked && marksNow[m.actor]) marksNow[m.actor] = { ...marksNow[m.actor], boost: 0, hinder: 0 };
      for (const b of m.beats) {
        const e = b.event as { kind: string; target?: string; amount?: number; absorbed?: number };
        const t = e.target ? marksNow[e.target] : undefined;
        if (!t) continue;
        if (e.kind === "hinder") t.hinder = Math.max(t.hinder, e.amount ?? 0);
        if (e.kind === "boost") t.boost = Math.max(t.boost, e.amount ?? 0);
        if (e.kind === "shield") t.shield += e.amount ?? 0;
        if (e.kind === "hit") t.shield = Math.max(0, t.shield - (e.absorbed ?? 0));
      }
    }
    return marksNow;
  }, [busy, moments, beatIndex, showImpact, view.squad, view.enemies]);
  const withHp = <T extends { id: string; hp: number; down: boolean; shield: number; boost: number; hinder: number }>(u: T): T => {
    let out = u;
    if (shownHp && shownHp[u.id] !== undefined)
      out = { ...out, hp: shownHp[u.id], down: shownHp[u.id] <= 0 && !(showImpact && targets.includes(u.id)) };
    if (shownMarks && shownMarks[u.id]) out = { ...out, ...shownMarks[u.id] };
    return out;
  };

  // The rail during playback: view.rail describes the moment before this command, so while
  // busy each slot is remapped relative to the current actor: everything before it is done,
  // it is now, the slot after it is next, the rest later.
  const rail = useMemo(() => {
    if (!busy || !spotlightId) return view.rail;
    const spotIndex = view.rail.findIndex((r) => r.id === spotlightId && r.state !== "down");
    if (spotIndex < 0) return view.rail;
    let labeledNext = false;
    return view.rail.map((r, i) => {
      if (r.state === "down") return r;
      if (i < spotIndex) return { ...r, state: "done" as const };
      if (i === spotIndex) return { ...r, state: "now" as const };
      if (!labeledNext) {
        labeledNext = true;
        return { ...r, state: "next" as const };
      }
      return { ...r, state: "later" as const };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, spotlightId, view.rail]);

  // Whose turn is yours next, for the key bar while the enemies act.
  const nextMine = useMemo(() => {
    const now = rail.findIndex((r) => r.state === "now");
    return rail.slice(now + 1).find((r) => !r.enemy && r.state !== "down" && r.state !== "done") ?? null;
  }, [rail]);

  // The banner's actor name/letter and the moment's words.
  const bannerActor = busy
    ? actorIsEnemy
      ? view.enemies.find((e) => e.id === actorId)
      : view.squad.find((s) => s.id === actorId)
    : view.active;
  const bannerName = bannerActor?.name ?? view.active?.name ?? "";
  const bannerLetter = actorIsEnemy && bannerActor && "letter" in bannerActor ? bannerActor.letter : undefined;
  // An enemy that carried a hinder into its attack: say what it cost, in the result line.
  const weakenedNote = useMemo(() => {
    if (!busy || !moment || !actorIsEnemy) return "";
    if (!moment.beats.some((b) => b.event.kind === "hit")) return "";
    const priorIndex = beatIndex - 1;
    let hinder = view.enemies.find((e) => e.id === moment.actor)?.hinder ?? 0;
    for (const m of moments.slice(0, Math.max(0, priorIndex + 1))) {
      if (m.actor === moment.actor && m.beats.some((b) => b.event.kind === "hit")) hinder = 0;
      for (const b of m.beats) {
        const e = b.event as { kind: string; target?: string; amount?: number };
        if (e.kind === "hinder" && e.target === moment.actor) hinder = Math.max(hinder, e.amount ?? 0);
      }
    }
    return hinder > 0 ? ` Its hit was weakened by ${hinder}.` : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, moment, actorIsEnemy, beatIndex, moments, view.enemies]);
  const beatWords =
    busy && moment
      ? showImpact
        ? momentWords(moment, [...view.squad, ...view.enemies]) + weakenedNote
        : approachWords(moment, [...view.squad, ...view.enemies])
      : "";

  // "Since your last turn": what the squad lost or gained, and any enemy that healed, in a
  // few words; the full sentences stay in the Record.
  const sinceText = useMemo(() => {
    if (!since.lines.length) return "";
    const parts: string[] = [];
    const sign = (d: number) => `${d > 0 ? "+" : "-"}${Math.abs(d)}`;
    for (const u of view.squad) {
      const d = since.deltas[u.id];
      if (d) parts.push(`${u.name} ${sign(d)}${u.down ? " (down)" : ""}`);
    }
    for (const e of view.enemies) {
      const d = since.deltas[e.id];
      if (d) parts.push(`${e.name} ${e.letter} ${sign(d)}${e.down ? " (down)" : ""}`);
    }
    return parts.length ? parts.join(", ") : "no health changed";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [since, view.squad, view.enemies]);

  // Where each target's figure sits on the stage, for the strike lines and the rising
  // numbers. Measured against the stage box so it survives the console zoom.
  const stageRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<{ lines: StrikeLine[]; floats: FloatMark[]; lunge?: { x: number; y: number } | null }>({ lines: [], floats: [] });
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!busy || !moment || !stage) {
      setMarks({ lines: [], floats: [] });
      return;
    }
    const stageBox = stage.getBoundingClientRect();
    const z = stageBox.width / stage.offsetWidth || 1;
    const at = (id: string, fy: number) => {
      const el = stage.querySelector<HTMLElement>(`[data-unit="${id}"] .pwt-figure`);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: (b.left + b.width / 2 - stageBox.left) / z, y: (b.top + b.height * fy - stageBox.top) / z };
    };
    const enemyIds = new Set(view.enemies.map((e) => e.id));
    // The point a strike line meets: below an enemy's plaque (the plaque hangs under its
    // figure), or the middle of a companion's body.
    const anchor = (id: string) => {
      if (!enemyIds.has(id)) return at(id, 0.55);
      const el = stage.querySelector<HTMLElement>(`[data-unit="${id}"] .pwt-plaque`);
      if (!el) return at(id, 0.55);
      const b = el.getBoundingClientRect();
      return { x: (b.left + b.width / 2 - stageBox.left) / z, y: (b.bottom + 4 - stageBox.top) / z };
    };
    const from = anchor(moment.actor);
    const lines: StrikeLine[] = [];
    const floats: FloatMark[] = [];
    for (const t of targets) {
      const to = anchor(t);
      if (from && to && t !== moment.actor) {
        const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        const pad = Math.min(enemyIds.has(t) ? 6 : 40, len / 3);
        const ux = (to.x - from.x) / len;
        const uy = (to.y - from.y) / len;
        lines.push({ id: t, x1: from.x + ux * pad, y1: from.y + uy * pad, x2: to.x - ux * pad, y2: to.y - uy * pad });
      }
      const top = at(t, 0.25);
      const all = moment.beats
        .filter((b) => "target" in b.event && (b.event as { target: string }).target === t)
        .map(floatOf)
        .filter((f): f is { text: string; kind: string } => !!f);
      const main = all.filter((f) => f.kind === "hurt" || f.kind === "heal");
      const items = main.length ? main : all;
      if (top && items.length) floats.push({ id: t, x: top.x + 22, y: top.y, items });
    }
    let lunge: { x: number; y: number } | null = null;
    const first = targets.find((t) => t !== moment.actor);
    const to0 = first ? at(first, 0.55) : null;
    if (from && to0) {
      const len = Math.hypot(to0.x - from.x, to0.y - from.y) || 1;
      lunge = { x: ((to0.x - from.x) / len) * 26, y: ((to0.y - from.y) / len) * 26 };
    }
    setMarks({ lines, floats, lunge });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, moment, targets]);

  // Targeting hover (storyboard "choosing" step): hovering a key cell rings its enemy target
  // and draws a faint aim line from the active companion.
  const aimLine = useMemo(() => {
    if (!hoverTarget || !view.active || busy) return null;
    const stage = stageRef.current;
    if (!stage) return null;
    const from = stage.querySelector<HTMLElement>(`[data-unit="${view.active.id}"] .pwt-figure`);
    const to = stage.querySelector<HTMLElement>(`[data-unit="${hoverTarget}"] .pwt-figure`);
    if (!from || !to) return null;
    const stageBox = stage.getBoundingClientRect();
    const zoomFactor = stageBox.width / stage.offsetWidth || 1;
    const fromBox = from.getBoundingClientRect();
    const toBox = to.getBoundingClientRect();
    return {
      x1: (fromBox.left + fromBox.width / 2 - stageBox.left) / zoomFactor,
      y1: (fromBox.top + fromBox.height / 2 - stageBox.top) / zoomFactor,
      x2: (toBox.left + toBox.width / 2 - stageBox.left) / zoomFactor,
      y2: (toBox.top + toBox.height / 2 - stageBox.top) / zoomFactor,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverTarget, view.active?.id, busy]);

  return (
    <main className="pwt" data-tier="immersive" id="main" data-busy={busy ? "true" : "false"}>
      <div
        className="pwt-console"
        style={{ zoom, width: CONSOLE.width, height: CONSOLE.height } as React.CSSProperties}
      >
        <header className="pwt-top">
          <div className="pwt-where">
            <Link to="/" className="pwt-brand">
              <ArrowLeft size={14} />
              <span>XALIANS</span>
            </Link>
            <span className="pwt-sector">
              Sector {view.room + 1}/{view.roomCount}
            </span>
            <h1>{roomName}</h1>
          </div>
          {view.phase === "turn" ? (
            <>
              <TurnBanner
                actorSide={spotlightSide}
                actorName={bannerName}
                actorLetter={bannerLetter}
                line={beatWords || (busy ? "" : sinceText)}
                lineIsSince={!beatWords && !busy && !!sinceText}
                onOpenRecord={() => setPanel("record")}
                round={view.round}
              />
              <TurnRail rail={rail} round={view.round} />
            </>
          ) : (
            <div className="pwt-top-fill" />
          )}
          <div className="pwt-top-right">
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
          </div>
        </header>

        <div className="pwt-stage" ref={stageRef} data-spotlight={spotlightId ?? ""}>
          <PowerworksEnvironment room={view.room} className="pw-environment" />
          {marks.lines.length > 0 && (
            <svg className="pwt-aim-svg" aria-hidden="true">
              <defs>
                <marker id="pwt-strike-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0L10 5L0 10Z" className={`pwt-strike-head ${actorIsEnemy ? "enemy" : "squad"}`} />
                </marker>
              </defs>
              {marks.lines.map((l) => (
                <line
                  key={`${beatIndex}-${l.id}`}
                  className={`pwt-strike-line ${actorIsEnemy ? "enemy" : "squad"}`}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  markerEnd="url(#pwt-strike-head)"
                />
              ))}
            </svg>
          )}
          {aimLine && (
            <svg className="pwt-aim-svg" aria-hidden="true">
              <line className="pwt-aim-line" x1={aimLine.x1} y1={aimLine.y1} x2={aimLine.x2} y2={aimLine.y2} />
            </svg>
          )}
          <div
            className="pwt-rows"
            style={
              marks.lunge
                ? ({ "--lunge-x": `${marks.lunge.x}px`, "--lunge-y": `${marks.lunge.y}px` } as React.CSSProperties)
                : undefined
            }
          >
            <div className="pwt-row enemies">
              {view.enemies.map((e) => (
                <EnemyPlate
                  key={e.id}
                  u={withHp(e)}
                  lit={busy && actorId === e.id}
                  activeName={view.active?.name}
                  activeArt={view.active ? { species: view.active.art, element: view.active.element } : undefined}
                  spotlit={spotlightId === e.id}
                  dimmed={!!spotlightId && spotlightId !== e.id}
                  delta={since.deltas[e.id] ?? 0}
                  targeted={hoverTarget === e.id}
                  impactTarget={impactTargets.includes(e.id)}
                  onHover={(hovering) => setHoverTarget(hovering ? e.id : null)}
                />
              ))}
            </div>
            <div className="pwt-row squad">
              {view.squad.map((u) => (
                <SquadPlate
                  key={u.id}
                  u={busy ? { ...withHp(u), active: false } : u}
                  lit={busy && actorId === u.id}
                  spotlit={spotlightId === u.id}
                  dimmed={!!spotlightId && spotlightId !== u.id}
                  delta={since.deltas[u.id] ?? 0}
                  impactTarget={impactTargets.includes(u.id)}
                />
              ))}
            </div>
          </div>
          {showImpact &&
            marks.floats.map((f) => (
              <span key={`float-${beatIndex}-${f.id}`} className="pwt-float" style={{ left: f.x, top: f.y }} aria-hidden="true">
                {f.items.map((it, i) => (
                  <span key={i} className={`pwt-float-num ${it.kind}`}>
                    {it.text}
                  </span>
                ))}
              </span>
            ))}
        </div>

        {view.phase === "turn" && view.active && (
          <div className={`pwt-keybar ${busy ? "busy" : ""} ${handoff ? "handing-off" : ""}`}>
            <div className="pwt-keybar-portrait">
              <span className="pwt-keybar-portrait-img">
                <Portrait u={{ species: view.active.art, element: view.active.element }} />
              </span>
              <span className={`pwt-keybar-who el-${view.active.element}`}>{view.active.name}</span>
            </div>
            {view.keys.map((k) => (
              <KeyCard
                key={k.index}
                keyView={k}
                squad={view.squad.filter((s) => s.id !== view.active!.id && !s.down)}
                disabled={busy}
                onAct={(target) => act(k.index, target)}
                onHoverTarget={(id) => setHoverTarget(id)}
              />
            ))}
            <button type="button" className="pwt-pass" disabled={busy} onClick={pass}>
              Pass
            </button>
            {busy && (
              <div className="pwt-keybar-play">
                <PlaybackTools
                  speed={speed}
                  onSpeedToggle={() => setSpeed((v) => (v === 1 ? 2 : 1))}
                  onSkip={skipToHandoff}
                  skipDisabled={!busy}
                />
              </div>
            )}
            {!busy && handoff && (
              <div className="pwt-keybar-wait handoff" aria-hidden="true" key={handoff}>
                {handoffRound && <span className="pwt-keybar-wait-round">Round {handoffRound}</span>}
                <span className="pwt-keybar-wait-kicker">Your turn</span>
                <span className="pwt-keybar-wait-who">{handoff}</span>
              </div>
            )}
            {busy && actorIsEnemy && (
              <div className="pwt-keybar-wait" aria-live="polite">
                <span className="pwt-keybar-wait-kicker">Enemy turn</span>
                {nextMine && (
                  <span className="pwt-keybar-wait-next">
                    <span className="pwt-keybar-wait-portrait">
                      <Portrait u={{ species: nextMine.art, element: nextMine.element }} />
                    </span>
                    Your next turn: <b>{nextMine.name}</b>
                  </span>
                )}
              </div>
            )}
            {pendingBeats && (
              <Playback
                beats={moments.map((m) => m.beats[m.beats.length - 1])}
                speed={speed}
                reducedMotion={reducedMotion}
                skip={skipPlayback}
                onBeat={(i, phase) => {
                  setBeatIndex(i);
                  setBeatPhase(phase);
                }}
                onDone={() => finishPlayback(pendingBeats)}
              />
            )}
          </div>
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
