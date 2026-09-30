// Tier: immersive. Powerworks, turn by turn (docs/design/powerworks-turn-screen.md, "UX pass,
// 2026-09-29"): a timeline decides who acts next; on a companion's turn its four answer keys
// already carry their result on every target. Enemies play back between turns, one beat at a
// time, with a turn banner, a spotlit actor and a turn rail answering "whose turn, is it mine,
// what just happened, what happens next" throughout.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, BookOpen, Menu, ScrollText, RotateCcw, RotateCw, Smartphone, X } from "lucide-react";

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

import {
  turnView,
  playback,
  momentWords,
  floatWords,
  recordEntries,
  roomNamesOf,
  sinceView,
  briefingView,
  campView,
  runSummary,
  stationHeal,
  titleCard,
  knockoutHold,
  beatsFell,
  revivedWords,
  hitDuring,
  withWeakened,
  keyNote,
  type FloatItem,
  type Hold,
  type TitleCard,
  type Beat,
  type RecordEntry,
} from "./view";
import { Portrait } from "../powerworksVisuals";
import { ElementBadge, EnemyPlate, SquadPlate } from "./plate";
import { KeyCard } from "./keys";
import { TurnRail } from "./rail";
import { TurnBanner, PlaybackTools } from "./banner";
import { Playback, beatTiming, type BeatPhase } from "./playback";
import { BriefingPanel, CampPanel, EndPanel, RecordPanel, RestartPanel, RetreatPanel, TitleCardView } from "./panels";
import { GuidePanel } from "./guide";
import { cellId, isPhoneLandscape, tapStep } from "./phone";
import { PowerworksEnvironment } from "../powerworksEnvironment";
import "./powerworksTurns.css";
import "./powerworksPhone.css";

type Moment = { actor: string; beats: Beat[]; words: string };
type StrikeLine = { id: string; x1: number; y1: number; x2: number; y2: number };
type FloatMark = { id: string; x: number; y: number; items: FloatItem[] };

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

/**
  The console's size. On a desktop it is the fixed 1280x720 scaled with zoom. On a landscape phone
  (phone.ts) it is composed again at the screen's own size at zoom 1, so type stays real size.
*/
function useConsoleBox() {
  const [box, setBox] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const read = () => setBox({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  const phone = isPhoneLandscape(box.w, box.h);
  return { phone, w: box.w, h: box.h, zoom: phone ? 1 : consoleScale(box.w, box.h) };
}

/** True on a screen with no hover (a touch screen): hover-only help needs a tap equivalent. */
function useNoHover() {
  const query = "(hover: none)";
  const [none, setNone] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    const change = () => setNone(media?.matches ?? false);
    media?.addEventListener?.("change", change);
    return () => media?.removeEventListener?.("change", change);
  }, []);
  return none;
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

/** The saved run and its Record (a save without one starts the Record empty). */
function boot(): { state: TRun; record: RecordEntry[]; fresh: boolean } {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("seed")) {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.version === PILLAR_SAVE_VERSION && saved.state)
          return { state: saved.state as TRun, record: Array.isArray(saved.record) ? (saved.record as RecordEntry[]) : [], fresh: false };
      }
    }
  } catch {
    /* A bad or unavailable save starts fresh. */
  }
  return { state: createTurnRun(readSeed(), "starter", RULES).state, record: [], fresh: true };
}

/** The Record keeps this many of the newest lines. */
const RECORD_CAP = 800;

function save(state: TRun, record: RecordEntry[]) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: PILLAR_SAVE_VERSION, state, record }));
  } catch {
    /* Storage unavailable: play continues without a save. */
  }
}

type Panel = "guide" | "record" | "restart" | "retreat" | null;

/** First-occurrence notes already shown in this browser (view.ts keyNote), kept in localStorage. */
const NOTES_KEY = "xalians.powerworks.notes.v1";
function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeSeen(ids: string[]) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(ids));
  } catch {
    /* Storage unavailable: the note may show again; play is unaffected. */
  }
}

/** The chosen playback speed persists per browser (round 6, item 12). */
const SPEED_KEY = "xalians.powerworks.speed.v1";
function readSpeed(): 1 | 2 {
  try {
    return localStorage.getItem(SPEED_KEY) === "2" ? 2 : 1;
  } catch {
    return 1;
  }
}
function writeSpeed(v: 1 | 2) {
  try {
    localStorage.setItem(SPEED_KEY, String(v));
  } catch {
    /* Storage unavailable: the speed lasts for this visit only. */
  }
}

export default function PowerworksTurnsPage() {
  const [booted] = useState(boot);
  const [run, setRun] = useState<TRun>(booted.state);
  const [record, setRecord] = useState<RecordEntry[]>(booted.record);
  const [pendingBeats, setPendingBeats] = useState<Beat[] | null>(null);
  const [beatIndex, setBeatIndex] = useState(0);
  const [beatPhase, setBeatPhase] = useState<BeatPhase>("approach");
  const [skipPlayback, setSkipPlayback] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [armedAlly, setArmedAlly] = useState<{ index: number } | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  // Units a hovered key lands on (a self-only key, an ally cell): the stage rings them.
  const [hoverUnits, setHoverUnits] = useState<string[]>([]);
  const ringed = (id: string) => !busy && (hoverTarget === id || hoverUnits.includes(id));
  const [speed, setSpeed] = useState<1 | 2>(readSpeed);
  const chooseSpeed = (v: 1 | 2) => {
    setSpeed(v);
    writeSpeed(v);
  };
  // Round 2: the briefing before a new run's first turn (a saved run in progress skips it); the
  // sector title card; the knockout hold; the camp's revive line; the recovery station's heal;
  // and the trace a cancelled restart leaves.
  const [briefing, setBriefing] = useState(booted.fresh);
  const [card, setCard] = useState<TitleCard | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [revived, setRevived] = useState<{ id: string; to: number; words: string } | null>(null);
  const [station, setStation] = useState<{ deltas: Record<string, number>; text: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { phone, w: boxW, h: boxH, zoom } = useConsoleBox();
  const noHover = useNoHover();
  // Phone mode on a touch screen: a first tap on a key cell previews it (rings who it lands on),
  // the second tap on the same cell uses it. `previewed` is that cell's id (phone.ts).
  const twoTap = phone && noHover;
  const [previewed, setPreviewed] = useState<string | null>(null);
  // Round 7, item 2: a hover applies only after the pointer moves. When the active companion changes
  // (or a panel opens) the pointer is idle until it travels a few pixels, so keys that appear under a
  // resting pointer arrive with no frame and no ring. `pointerAt` follows every move; `idleAt` is where
  // it was when the state was cleared.
  const [pointerLive, setPointerLive] = useState(false);
  const liveRef = useRef(false);
  const pointerAt = useRef<{ x: number; y: number } | null>(null);
  const idleAt = useRef<{ x: number; y: number } | null>(null);
  const [seenNotes, setSeenNotes] = useState<string[]>(readSeen);
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  // The command's settled state, applied only once playback finishes (finishPlayback):
  // applying it earlier flips view.phase out from under the still-animating keybar/camp
  // block and orphans the Playback component mid-beat (paint review round 2 follow-up).
  const nextRun = useRef<TRun | null>(null);
  const view = useMemo(() => turnView(run), [run]);
  // "Since your last turn": every change since the active companion last acted in this room,
  // read from the Record's beats (view.ts owns the words and numbers).
  const since = useMemo(() => sinceView(record, view), [record, view]);
  const busy = !!pendingBeats;
  // The hand-off moment (storyboard step 1): when the enemies finish and a companion's turn
  // begins, "Your turn" is announced over the stage for a moment, so the change is seen, not
  // only read in the banner.
  // The hand-off is signaled in the banner, the rail and the active companion's glow, with a brief
  // edge cue on the key bar; the keys themselves are there at once, never covered (round 6, item 1).
  const [handoff, setHandoff] = useState<string | null>(null);
  const wasBusy = useRef(false);
  useEffect(() => {
    const name = run.phase === "turn" ? run.team.find((t) => t.id === run.active)?.name : undefined;
    if (wasBusy.current && !busy && name) {
      setHandoff(name);
      const t = window.setTimeout(() => setHandoff(null), 560);
      wasBusy.current = busy;
      return () => window.clearTimeout(t);
    }
    wasBusy.current = busy;
  }, [busy, run]);

  useEffect(() => {
    if (briefing) return; // a run is saved once it has begun
    save(run, record);
  }, [run, record, briefing]);

  // The sector title card: held briefly on entering each sector, then gone.
  const cardTimer = useRef<number | null>(null);
  function showCard(next: TitleCard) {
    if (cardTimer.current) window.clearTimeout(cardTimer.current);
    setCard(next);
    cardTimer.current = window.setTimeout(() => setCard(null), 2400);
  }
  useEffect(() => () => {
    if (cardTimer.current) window.clearTimeout(cardTimer.current);
  }, []);
  const lastRoom = useRef(booted.state.room);
  useEffect(() => {
    if (run.room === lastRoom.current) return;
    lastRoom.current = run.room;
    if (run.phase === "turn") showCard(titleCard(view, station?.text ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.room]);

  // A preview belongs to the moment it was made in: acting, a new active companion or a panel ends it.
  useEffect(() => {
    setPreviewed(null);
  }, [busy, view.active?.id, panel]);
  // A new active companion arrives with nothing hovered, armed or previewed, whatever the pointer rests on.
  useEffect(() => {
    setHoverTarget(null);
    setHoverUnits([]);
    setArmedAlly(null);
    setPreviewed(null);
    liveRef.current = false;
    idleAt.current = pointerAt.current;
    setPointerLive(false);
  }, [view.active?.id, view.room]);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const at = { x: e.clientX, y: e.clientY };
      pointerAt.current = at;
      if (liveRef.current) return;
      const from = idleAt.current;
      if (from && Math.hypot(at.x - from.x, at.y - from.y) < 4) return;
      liveRef.current = true;
      setPointerLive(true);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  // Touch has no hover: a tap anywhere but a cell or a plate clears the preview and its ring.
  useEffect(() => {
    if (!twoTap) return;
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.(".pwt-cell, .pwt-plate")) return;
      setPreviewed(null);
      setHoverTarget(null);
      setHoverUnits([]);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [twoTap]);

  // A cancelled restart says so for a moment, so it cannot be mistaken for a restart.
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [notice]);

  function begin() {
    setBriefing(false);
    if (run.phase === "turn") showCard(titleCard(view));
  }

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
      if (command.kind === "advance") {
        // The recovery station's heal plays on arrival: green deltas on the plates and a line.
        setStation(stationHeal(before, result.state));
        setRevived(null);
      } else if (command.kind === "revive") {
        const u = result.state.team.find((t) => t.id === command.id);
        if (u) setRevived({ id: u.id, to: u.hp, words: revivedWords(u.name, u.hp, result.state.revival) });
      } else if (command.kind === "act") {
        setStation(null);
      }
      if (command.kind === "act") {
        const beats = playback(before, result.events);
        if (beats.length) {
          // Hold the settled state until playback actually finishes (see nextRun above):
          // view.phase (and so the keybar/camp switch) must not change mid-animation.
          nextRun.current = result.state;
          setHold(knockoutHold(result.state));
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
    // Every beat's sentence joins the Record, filed under the sector it was played in.
    setRecord((prev) => [...prev, ...recordEntries(run.room, beats)].slice(-RECORD_CAP));
    if (nextRun.current) {
      setRun(nextRun.current);
      nextRun.current = null;
    }
    setPendingBeats(null);
    setHold(null);
    setBeatIndex(0);
    setSkipPlayback(false);
  }

  /** Any action dismisses the first-occurrence note on screen, for good in this browser. */
  function dismissNote() {
    if (!shownNote) return;
    const next = [...seenNotes, shownNote.id];
    setSeenNotes(next);
    writeSeen(next);
  }

  function act(index: number, target: string) {
    if (busy) return;
    dismissNote();
    setArmedAlly(null);
    setHoverTarget(null);
    setHoverUnits([]);
    setPreviewed(null);
    // A key that only acts on its user has no cell to name a target: the user is the target.
    dispatch({ kind: "act", order: { move: index, target: target || view.active?.id || "" } });
  }

  function pass() {
    if (busy || !view.active) return;
    dismissNote();
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
      if (busy || panel || briefing || e.altKey || e.ctrlKey || e.metaKey) return;
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
  }, [view, busy, panel, briefing, armedAlly]);

  function restart() {
    const next = createTurnRun((run.seed + 1) >>> 0, "starter", RULES).state;
    setRun(next);
    setPendingBeats(null);
    setPanel(null);
    setRecord([]);
    setBriefing(true);
    setCard(null);
    setHold(null);
    setRevived(null);
    setStation(null);
    setNotice(null);
    lastRoom.current = next.room;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* Storage unavailable: nothing to clear. */
    }
  }

  const roomName = view.roomName;
  const roomNames = useMemo(() => roomNamesOf(run), [run]);
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
  const holding = busy && beatPhase === "hold";
  // First-occurrence teaching notes: one at a time, never over a panel or while beats play.
  // It stays while a dialog is open, so nothing behind the dialog changes (round 8, item 10).
  const shownNote = !busy && !briefing && view.phase === "turn" ? keyNote(view, seenNotes) : null;
  const spotlightId = holding ? null : busy ? actorId ?? null : view.active?.id ?? null;
  const spotlightSide: "squad" | "enemy" = actorIsEnemy ? "enemy" : "squad";
  const showImpact = busy && beatPhase === "impact";
  // The blow has landed (impact, settle or hold): health, marks and the rising numbers show it.
  const landed = busy && beatPhase !== "approach";
  const targets = useMemo(() => (moment ? targetsOf(moment) : []), [moment]);
  const impactTargets = showImpact ? targets : [];
  // The units a hit (not a heal, shield or mark) lands on: they flash and are knocked back.
  const struckIds = useMemo(
    () => (showImpact && moment ? moment.beats.filter((b) => b.event.kind === "hit").map((b) => (b.event as { target: string }).target) : []),
    [showImpact, moment]
  );
  // Health changes shown with a green delta: the recovery station's arrival heal, until you act.
  // Once beats play, the plates describe the present: the recovery station's and "since your last
  // turn" deltas go, and a plate shows only the change the beat now landing made to it.
  const momentDeltas = useMemo(() => {
    const out: Record<string, number> = {};
    if (!busy || !moment || !landed) return out;
    for (const b of moment.beats) {
      const e = b.event;
      if (e.kind === "hit") out[e.target] = (out[e.target] ?? 0) - e.amount;
      else if (e.kind === "heal") out[e.target] = (out[e.target] ?? 0) + e.amount;
    }
    return out;
  }, [busy, moment, landed]);
  const deltaOf = (id: string) => (busy ? momentDeltas[id] ?? 0 : station?.deltas[id] ?? since.deltas[id] ?? 0);
  const knockouts = useMemo(() => moments.map((m) => beatsFell(m.beats)), [moments]);

  // Health during playback: the settled state is held until playback ends, so each plate
  // shows the health as of the moment being played; it drops when the blow lands.
  const shownHp = useMemo(() => {
    if (!busy) return null;
    const upTo = landed ? beatIndex : beatIndex - 1;
    if (upTo < 0) return null;
    const m = moments[Math.min(upTo, moments.length - 1)];
    return m ? m.beats[m.beats.length - 1].hp : null;
  }, [busy, moments, beatIndex, landed]);
  const shownMarks = useMemo(() => {
    if (!busy) return null;
    const upTo = landed ? beatIndex : beatIndex - 1;
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
  }, [busy, moments, beatIndex, landed, view.squad, view.enemies]);
  const withHp = <T extends { id: string; hp: number; down: boolean; shield: number; boost: number; hinder: number }>(u: T): T => {
    let out = u;
    if (shownHp && shownHp[u.id] !== undefined)
      out = { ...out, hp: shownHp[u.id], down: shownHp[u.id] <= 0 && !(showImpact && targets.includes(u.id)) };
    if (shownMarks && shownMarks[u.id]) out = { ...out, ...shownMarks[u.id] };
    return out;
  };

  // An enemy's hit chip keeps showing while beats play, re-read with the boost and hinder the
  // enemy carries at this point of the playback and the health the companion has then: a hinder
  // that lands shows as the struck number on the chip.
  // While an enemy acts they are hidden: the chip is a forecast for the companion who has just acted,
  // and it would disagree with the beat beside it (round 6, item 2). The settled state brings the
  // chips back, recomputed for the companion whose turn it is.
  const enemyShown = (e: (typeof view.enemies)[number]) => {
    const u = withHp(e);
    if (!busy || !u.hitOnActive || !view.active) return u;
    const hp = shownHp?.[view.active.id] ?? view.active.hp;
    return { ...u, hitOnActive: hitDuring(u.hitOnActive, { boost: u.boost, hinder: u.hinder, hp }) };
  };

  // The round and the rail during playback come from the beat being played: playback() replays
  // the clocks act by act, so a round that opens on an enemy's turn is the new round (banner,
  // rail divider and the enemy-turn card) from the moment that enemy acts.
  const beatNow = busy && moment ? moment.beats[0] : null;
  const shownRound = beatNow ? beatNow.round : view.round;
  const rail = beatNow ? beatNow.rail : view.rail;
  const roundOpened = !!beatNow && beatNow.round !== view.round;
  // While the stage holds on a fall there is no live turn: the banner, the rail and the key bar say
  // what happened instead of whose turn it is or who acts next.
  const ended = holding && hold ? { kicker: hold.text, who: view.roomName } : null;

  // Whose turn is yours next, for the key bar while the enemies act.
  // A command that ends the sector or the run has no next turn to name (round 6, item 5).
  const nextMine = useMemo(() => {
    if (hold) return null;
    const now = rail.findIndex((r) => r.state === "now");
    return rail.slice(now + 1).find((r) => !r.enemy && r.state !== "down" && r.state !== "done") ?? null;
  }, [rail, hold]);

  // The banner's actor name/letter and the moment's words.
  const bannerActor = busy
    ? actorIsEnemy
      ? view.enemies.find((e) => e.id === actorId)
      : view.squad.find((s) => s.id === actorId)
    : view.active;
  const bannerName = bannerActor?.name ?? view.active?.name ?? "";
  const bannerLetter = actorIsEnemy && bannerActor && "letter" in bannerActor ? bannerActor.letter : undefined;
  // A hit its actor's hinder weakened: one clause on the hit's own sentence ("..., weakened by 6."). Nothing
  // when every hit was cut to nothing; those say "blocked" themselves.
  const weakenedBy = useMemo(() => {
    if (!busy || !moment) return undefined;
    const b = moment.beats.find((x) => x.weakenedText);
    const dealt = moment.beats.some((x) => x.event.kind === "hit" && (x.event as { amount: number }).amount > 0);
    return b && dealt ? b.weakened : undefined;
  }, [busy, moment]);
  const beatWords =
    busy && moment
      ? landed
        ? withWeakened(momentWords(moment.beats, [...view.squad, ...view.enemies]), weakenedBy, actorIsEnemy ? "your hinder" : "an enemy's hinder")
        : approachWords(moment, [...view.squad, ...view.enemies])
      : "";

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
      // Beside the plate it changed, low on the figure: clear of the letter tag at an enemy's top
      // corner and of the strike arrow, which ends above a companion's body.
      const top = at(t, enemyIds.has(t) ? 0.72 : 0.85);
      const all = moment.beats
        .filter((b) => "target" in b.event && (b.event as { target: string }).target === t)
        .map((b) => floatWords(b.event, enemyIds.has(t)))
        .filter((f): f is FloatItem => !!f);
      const main = all.filter((f) => f.kind === "hurt" || f.kind === "heal");
      const items = main.length ? main : all;
      if (top && items.length) floats.push({ id: t, x: top.x, y: top.y, items });
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

  // A landing number stays inside the stage and off every tag and plaque (round 7, item 5). It is
  // measured where it comes to rest (the rise ends at translate(-50%, -95%)), in the stage's own
  // units, so the animation's first frame cannot fool the check: pushed in from either edge, then up
  // until it clears any element tag, letter tag, plaque or knockout mark it would sit on.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const place = () => {
    const box = stage.getBoundingClientRect();
    const z = box.width / stage.offsetWidth || 1;
    const W = stage.offsetWidth;
    const avoid = [...stage.querySelectorAll<HTMLElement>(".pwt-plaque, .pwt-el, .pwt-letter, .pwt-guardian-tag, .pwt-ko, .pwt-plate-name")].map((a) => {
      const r = a.getBoundingClientRect();
      const pad = stage.offsetHeight < 300 ? 2 : 5; // a figure is knocked back a little as the number lands; keep clear of where its tags settle (less room on the shortest stage)
      return { l: (r.left - box.left) / z - pad, r: (r.right - box.left) / z + pad, t: (r.top - box.top) / z - pad, b: (r.bottom - box.top) / z + pad };
    });
    stage.querySelectorAll<HTMLElement>(".pwt-float").forEach((el) => {
      el.style.marginLeft = "0px";
      el.style.marginTop = "0px";
      // Round 8, item 2: the number's center stays inside its target's own column (the plate's span), so on a
      // crowded stage it is never read as landing on the neighbor.
      const plate = stage.querySelector<HTMLElement>(`[data-unit="${el.dataset.target}"]`);
      const pr = plate?.getBoundingClientRect();
      const colL = pr ? (pr.left - box.left) / z + 4 : -Infinity;
      const colR = pr ? (pr.right - box.left) / z - 4 : Infinity;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const left = parseFloat(el.style.left) || 0;
      const top = parseFloat(el.style.top) || 0;
      const x0 = left - w / 2;
      const y0 = top - h * 0.95;
      const H = stage.offsetHeight;
      // How much of the tags and plaques a position would cover (0 is clear); off the stage is out.
      const covered = (dx: number, dy: number) => {
        const cx = x0 + dx + w / 2;
        if (cx < colL || cx > colR) return Infinity;
        const l = x0 + dx;
        const t = y0 + dy;
        if (l < 4 || l + w > W - 4 || t < 2 || t + h > H - 2) return Infinity;
        let sum = 0;
        for (const a of avoid) {
          const ow = Math.min(l + w, a.r) - Math.max(l, a.l);
          const oh = Math.min(t + h, a.b) - Math.max(t, a.t);
          if (ow > 0 && oh > 0) sum += ow * oh;
        }
        return sum;
      };
      // The nearest place that covers nothing (or, when the stage is that crowded, the least): offsets in
      // growing distance, up before sideways, down only as a last resort.
      let dx = 0;
      let dy = 0;
      let best = Infinity;
      for (let ddy = -140; ddy <= 70; ddy += 6) {
        for (let ddx = -320; ddx <= 320; ddx += 6) {
          const c = covered(ddx, ddy);
          if (c === Infinity) continue;
          const cost = c * 50 + Math.abs(ddx) * 1.4 + (ddy > 0 ? ddy * 3 : -ddy);
          if (cost < best) {
            best = cost;
            dx = ddx;
            dy = ddy;
          }
        }
      }
      if (best === Infinity) {
        // No clear place inside the column: stay centered on it and only nudge back inside the stage.
        const mid = pr ? ((colL + colR) / 2) : x0 + w / 2;
        dx = Math.max(4 - x0, Math.min(W - 4 - w - x0, mid - w / 2 - x0));
        dy = Math.max(2 - y0, 0);
      }
      if (dx) el.style.marginLeft = `${dx}px`;
      if (dy) el.style.marginTop = `${dy}px`;
    });
    };
    place();
    // The struck figure is knocked back and settles a beat later: place again once its tags are at rest.
    const timer = window.setTimeout(place, 650);
    return () => window.clearTimeout(timer);
  }, [marks.floats, beatIndex, landed, holding]);

  // Round 8, item 9: the one plaque of an end hold covers no plate. It is placed, in the stage's own units, where it
  // touches no plaque, tag, letter or painted figure (the art's own bounds, not its box), nearest the gap between
  // the rows; on a stage too crowded for that it sits beside the rows and takes its compact size before it covers a unit.
  const [holdAt, setHoldAt] = useState<{ left: number; top: number } | null>(null);
  const [holdCompact, setHoldCompact] = useState(false);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!holding || !hold || !stage) {
      setHoldAt(null);
      setHoldCompact(false);
      return;
    }
    const card = stage.querySelector<HTMLElement>("[data-hold-card]");
    if (!card) return;
    const box = stage.getBoundingClientRect();
    const z = box.width / stage.offsetWidth || 1;
    const W = stage.offsetWidth;
    const H = stage.offsetHeight;
    const rel = (r: DOMRect) => ({ l: (r.left - box.left) / z, r: (r.right - box.left) / z, t: (r.top - box.top) / z, b: (r.bottom - box.top) / z });
    const obstacles: { l: number; r: number; t: number; b: number }[] = [];
    stage.querySelectorAll<HTMLElement>(".pwt-plaque, .pwt-letter, .pwt-el, .pwt-guardian-tag, .pwt-ko").forEach((e) => obstacles.push(rel(e.getBoundingClientRect())));
    // A painted figure sits bottom-centered in its box at its natural proportions: its own bounds are the obstacle.
    stage.querySelectorAll<HTMLElement>(".pwt-figure").forEach((f) => {
      const fr = f.getBoundingClientRect();
      const img = f.querySelector("img");
      if (img && img.naturalWidth && img.naturalHeight) {
        const k = Math.min(fr.width / img.naturalWidth, fr.height / img.naturalHeight);
        const w = img.naturalWidth * k;
        const h = img.naturalHeight * k;
        obstacles.push(rel(new DOMRect(fr.left + (fr.width - w) / 2, fr.bottom - h, w, h)));
      } else obstacles.push(rel(fr));
    });
    let above = 0;
    stage.querySelectorAll<HTMLElement>(".pwt-row.enemies .pwt-plaque").forEach((e) => (above = Math.max(above, rel(e.getBoundingClientRect()).b)));
    let below = H;
    stage.querySelectorAll<HTMLElement>(".pwt-row.squad .pwt-figure").forEach((e) => (below = Math.min(below, rel(e.getBoundingClientRect()).t)));
    const prefY = below > above ? (above + below) / 2 : above + 20;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    let best = { cost: Infinity, left: W / 2, top: prefY, overlap: Infinity };
    for (let top = 6 + h / 2; top <= H - 6 - h / 2; top += 4) {
      for (let dx = 0; Math.abs(dx) <= W / 2 - w / 2 - 8; dx = dx <= 0 ? -dx + 12 : -dx) {
        const l = W / 2 + dx - w / 2;
        const t = top - h / 2;
        let overlap = 0;
        for (const o of obstacles) {
          const ow = Math.min(l + w, o.r) - Math.max(l, o.l);
          const oh = Math.min(t + h, o.b) - Math.max(t, o.t);
          if (ow > 0 && oh > 0) overlap += ow * oh;
        }
        const cost = overlap * 1000 + Math.abs(dx) * 3 + Math.abs(top - prefY);
        if (cost < best.cost) best = { cost, left: W / 2 + dx, top, overlap };
      }
    }
    if (best.overlap > 0 && !holdCompact) {
      setHoldCompact(true);
      return;
    }
    setHoldAt({ left: Math.round(best.left), top: Math.round(best.top) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding, hold?.kind, holdCompact]);

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
    <main className="pwt" data-tier="immersive" id="main" data-busy={busy ? "true" : "false"} data-pointer={pointerLive ? "live" : "idle"}>
      <div
        className={`pwt-console${phone ? " phone" : ""}`}
        style={
          (phone ? { width: boxW, height: boxH } : { zoom, width: CONSOLE.width, height: CONSOLE.height }) as React.CSSProperties
        }
      >
        <header className="pwt-top">
          <div className="pwt-where">
            <Link to="/" className="pwt-brand" title="Back to Xalians">
              <ArrowLeft size={14} />
              <span>XALIANS</span>
            </Link>
            <span className="pwt-sector">
              Sector {view.room + 1}/{view.roomCount}
            </span>
            <h1>{roomName}</h1>
            {view.phase === "turn" && (
              <span className={`pwt-revives${view.revivalLeft > 0 ? "" : " none"}`} data-revives={view.revivalLeft} title="A fallen companion can be revived at camp while a revive is left.">
                <span className="pwt-revives-full">{view.revivalLeft > 0 ? `Revives left: ${view.revivalLeft}` : "No revives left"}</span>
                <span className="pwt-revives-short">{view.revivalLeft > 0 ? `Revives ${view.revivalLeft}` : "No revives"}</span>
              </span>
            )}
          </div>
          {view.phase === "turn" ? (
            <>
              <TurnBanner
                actorSide={spotlightSide}
                actorName={bannerName}
                actorLetter={bannerLetter}
                line={ended ? "" : beatWords || (busy || phone ? "" : station?.text ?? since.text)}
                lineIsSince={!ended && !beatWords && !busy && !station && !!since.text && !phone}
                note={phone && shownNote ? shownNote.short : null}
                noteId={phone && shownNote ? shownNote.id : undefined}
                onOpenRecord={() => setPanel("record")}
                round={shownRound}
                readOnly={phone}
                ended={ended}
              />
              {ended ? <div className="pwt-rail pwt-rail-quiet" aria-hidden="true" /> : <TurnRail rail={rail} round={shownRound} compact={phone} width={boxW} />}
            </>
          ) : (
            <div className="pwt-top-fill" />
          )}
          <div className="pwt-top-right">
            {notice && (
              <p className="pwt-notice" role="status" data-notice="">
                {notice}
              </p>
            )}
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
            {/* Phone: the three tools fold into one menu button. */}
            <div className="pwt-menu">
              <button
                type="button"
                className="pwt-menu-btn"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                {menuOpen ? <X /> : <Menu />} Menu
              </button>
              {menuOpen && (
                <>
                  <button type="button" className="pwt-menu-scrim" aria-label="Close the menu" onClick={() => setMenuOpen(false)} />
                  <div className="pwt-menu-list" role="menu" aria-label="Tools">
                    {(
                      [
                        ["guide", BookOpen, "Guide"],
                        ["record", ScrollText, "Record"],
                        ["restart", RotateCcw, "Restart"],
                      ] as const
                    ).map(([id, Icon, label]) => (
                      <button
                        key={id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          setPanel(id);
                        }}
                      >
                        <Icon /> {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="pwt-stage" ref={stageRef} data-spotlight={spotlightId ?? ""} data-hold={holding && hold ? hold.kind : ""}>
          <PowerworksEnvironment room={view.room} className="pw-environment" />
          {marks.lines.length > 0 && !holding && (
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
                  u={enemyShown(e)}
                  forecastOff={busy && actorIsEnemy}
                  lit={busy && actorId === e.id}
                  activeName={view.active?.name}
                  spotlit={spotlightId === e.id}
                  dimmed={!!spotlightId && spotlightId !== e.id}
                  delta={deltaOf(e.id)}
                  targeted={ringed(e.id)}
                  impactTarget={impactTargets.includes(e.id)}
                  struck={struckIds.includes(e.id)}
                  onHover={(hovering) => {
                    if (!hovering || liveRef.current || twoTap) setHoverTarget(hovering ? e.id : null);
                  }}
                  onTap={
                    twoTap
                      ? () => {
                          // A tap on an enemy previews that enemy and drops any cell that was waiting for its second tap.
                          setPreviewed(null);
                          setHoverUnits([]);
                          setHoverTarget(e.id);
                        }
                      : undefined
                  }
                />
              ))}
            </div>
            <div className="pwt-row squad">
              {view.squad.map((u) => (
                <SquadPlate
                  key={u.id}
                  u={busy ? { ...withHp(u), active: false, koFrom: undefined } : u}
                  lit={busy && actorId === u.id}
                  spotlit={spotlightId === u.id}
                  dimmed={!!spotlightId && spotlightId !== u.id}
                  delta={deltaOf(u.id)}
                  targeted={ringed(u.id)}
                  impactTarget={impactTargets.includes(u.id)}
                  struck={struckIds.includes(u.id)}
                />
              ))}
            </div>
          </div>
          {landed && !holding &&
            marks.floats.map((f) => (
              <span key={`float-${beatIndex}-${f.id}`} className="pwt-float" data-target={f.id} style={{ left: f.x, top: f.y }} aria-hidden="true">
                {f.items.map((it, i) => (
                  <span key={i} className={`pwt-float-num ${it.kind}${it.plain ? " plain" : ""}`}>
                    {it.text}
                    {it.tag && <span className={`pwt-float-tag ${it.tag.tone}`}>{it.tag.word}</span>}
                  </span>
                ))}
              </span>
            ))}
          {card && !briefing && <TitleCardView card={card} key={`${card.kicker}-${card.name}`} />}
          {holding && hold && (
            <div className={`pwt-hold-card ${hold.kind}${holdCompact ? " compact" : ""}`} role="status" aria-live="polite" data-hold-card="" style={holdAt ? { left: holdAt.left, top: holdAt.top } : undefined}>
              {hold.text}
            </div>
          )}
        </div>

        {view.phase === "turn" && view.active && (
          <div className={`pwt-keybar ${busy ? "busy" : ""} ${handoff ? "handing-off" : ""} ${view.activeStatus || (shownNote && !phone) ? "has-status" : ""}`}>
            {(view.activeStatus || (shownNote && !phone)) && !busy && (
              <p className="pwt-keybar-statusline" data-status={view.activeStatus ? "" : undefined} title={view.activeStatus?.sentence}>
                {view.activeStatus && <span className="pwt-status-text">{view.activeStatus.sentence}</span>}
                {shownNote && !phone && (
                  <span className="pwt-note" role="note" data-note={shownNote.id}>
                    <b>{shownNote.keyName}</b> {shownNote.text}
                  </span>
                )}
              </p>
            )}
            <div className="pwt-keybar-portrait">
              <span className="pwt-keybar-portrait-img">
                <Portrait u={{ species: view.active.art, element: view.active.element }} />
              </span>
              <span className={`pwt-keybar-who el-${view.active.element}`}>{view.active.name}</span>
              <ElementBadge element={view.active.element} className="pwt-el-static" />
              {/* On a phone the column's first line is the portrait row, so the short reason sits there;
                  on a desktop the full sentence runs along the key bar's top line above the keys. */}
              {(view.activeStatus || (phone && !busy && (station?.text ?? since.text))) && (
                <span className="pwt-keybar-lines">
                  {view.activeStatus && (
                    <span className="pwt-keybar-status" aria-hidden="true">
                      {view.activeStatus.parts.map((p) => (
                        <span key={p}>{p}</span>
                      ))}
                    </span>
                  )}
                  {phone && !busy && (station?.text ?? since.text) && (
                    <span className="pwt-keybar-since" data-since="">
                      {station?.text ? null : <b>Since your last turn </b>}
                      {station?.text ?? since.text}
                    </span>
                  )}
                </span>
              )}
            </div>
            {view.keys.map((k) => (
              <KeyCard
                key={`${view.active!.id}-${k.index}`}
                pointerLive={pointerLive}
                keyView={k}
                squad={view.squad.filter((s) => s.id !== view.active!.id && !s.down)}
                activeId={view.active!.id}
                disabled={busy}
                onAct={(target) => act(k.index, target)}
                twoTap={twoTap}
                previewed={previewed}
                onPreview={setPreviewed}
                onHoverTarget={(id) => {
                  if (id === null || liveRef.current || twoTap) setHoverTarget(id);
                }}
                onHoverUnits={(ids) => {
                  if (ids === null || liveRef.current || twoTap) setHoverUnits(ids ?? []);
                }}
                litTargets={busy || !hoverTarget ? [] : [hoverTarget]}
                noted={!!shownNote && shownNote.keyIndex === k.index}
                activeName={view.active!.name}
              />
            ))}
            <button type="button" className="pwt-pass" disabled={busy} onClick={pass}>
              Pass
            </button>
            {busy && !holding && (
              <div className="pwt-keybar-play">
                <PlaybackTools
                  speed={speed}
                  onSpeed={chooseSpeed}
                  onSkip={skipToHandoff}
                  skipDisabled={!busy}
                />
              </div>
            )}
            {busy && (
              <div
                className={`pwt-keybar-wait playing ${ended ? "hold" : actorIsEnemy ? "enemy" : "squad"}`}
                aria-live="polite"
                data-playing=""
              >
                {!ended && roundOpened && beatNow && <span className="pwt-keybar-wait-round">Round {beatNow.round}</span>}
                {!ended && <span className="pwt-keybar-wait-kicker">{actorIsEnemy ? "Enemy turn" : "Playing out"}</span>}
                {/* The band is where the eye rests while beats play: it says what just happened (round 8, item 9). */}
                {beatWords && (
                  <p className="pwt-keybar-wait-words" data-beat-words="">
                    {beatWords}
                  </p>
                )}
                {!ended && nextMine && (
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
                knockouts={knockouts}
                holdMs={hold?.ms ?? 0}
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
            camp={campView(run)}
            revived={revived}
            onRevive={(id) => dispatch({ kind: "revive", id })}
            onContinue={() => dispatch({ kind: "advance" })}
            onRetreat={() => setPanel("retreat")}
          />
        )}
        {view.ending && !busy && (
          <EndPanel ending={view.ending} summary={runSummary(run, view, record)} squad={view.squad} onPlayAgain={restart} />
        )}

        {panel === "guide" && (
          <GuidePanel
            onClose={() => setPanel(null)}
            touch={twoTap}
            squadArt={view.squad[0] ? { art: view.squad[0].art, element: view.squad[0].element } : undefined}
            enemyArt={view.enemies[0] ? { art: view.enemies[0].art, element: view.enemies[0].element } : undefined}
          />
        )}
        {panel === "record" && (
          <RecordPanel
            entries={record}
            roomNames={roomNames}
            since={since.items}
            squadIds={run.team.map((u) => u.id)}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "restart" && (
          <RestartPanel
            lost={briefing ? null : `sector ${view.room + 1} of ${view.roomCount}, ${view.xp} XP`}
            onConfirm={restart}
            onClose={() => {
              setPanel(null);
              setNotice("Restart cancelled. Your run continues.");
            }}
          />
        )}
        {panel === "retreat" && (
          <RetreatPanel
            sectorText={`sector ${view.room + 1} of ${view.roomCount}`}
            xp={view.xp}
            onConfirm={() => {
              setPanel(null);
              dispatch({ kind: "retreat" });
            }}
            onClose={() => setPanel(null)}
          />
        )}
        {briefing && <BriefingPanel briefing={briefingView(run)} onBegin={begin} />}
      </div>
      <div className="pwt-rotate">
        <span className="pwt-rotate-art" aria-hidden="true">
          <Smartphone className="pwt-rotate-icon" />
          <RotateCw className="pwt-rotate-cue" />
        </span>
        <p>Turn your phone sideways to play</p>
        <Link to="/" className="pwt-rotate-back">
          <ArrowLeft size={14} />
          <span>Back to Xalians</span>
        </Link>
      </div>
    </main>
  );
}
