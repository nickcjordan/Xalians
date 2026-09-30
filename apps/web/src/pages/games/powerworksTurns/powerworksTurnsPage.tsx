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

import {
  turnView,
  playback,
  momentWords,
  hinderOnAttack,
  weakenedWords,
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
import { BriefingPanel, CampPanel, EndPanel, RecordPanel, RestartPanel, TitleCardView } from "./panels";
import { GuidePanel } from "./guide";
import { PowerworksEnvironment } from "../powerworksEnvironment";
import "./powerworksTurns.css";

/** The number that rises over a beat's target: damage, healing, or the support it received. */
function floatOf(beat: Beat, targetIsEnemy = false): FloatItem | null {
  const e = beat.event;
  if (e.kind === "hit") {
    if (e.absorbed > 0 && e.amount === 0) return { text: `shield took ${e.absorbed}`, kind: "shield" };
    // A STRONG or WEAK tag in the matchup color: color says who it favors (a strong hit on an
    // enemy is good for you, a strong hit on your companion is bad), the word says which way.
    const tag =
      e.step > 1
        ? { word: "Strong", good: targetIsEnemy }
        : e.step > 0 && e.step < 1
        ? { word: "Weak", good: !targetIsEnemy }
        : undefined;
    return { text: `-${e.amount}`, kind: "hurt", tag };
  }
  if (e.kind === "heal") return { text: `+${e.amount}`, kind: "heal" };
  if (e.kind === "shield") return { text: `shield ${e.amount}`, kind: "shield" };
  if (e.kind === "boost") return { text: `next attack +${e.amount}`, kind: "boost" };
  if (e.kind === "hinder") return { text: `next hit -${e.amount}`, kind: "hinder" };
  return null;
}

type FloatItem = { text: string; kind: string; tag?: { word: string; good: boolean } };
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

type Panel = "guide" | "record" | "restart" | null;

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
  const [speed, setSpeed] = useState<1 | 2>(1);
  // Round 2: the briefing before a new run's first turn (a saved run in progress skips it); the
  // sector title card; the knockout hold; the camp's revive line; the recovery station's heal;
  // and the trace a cancelled restart leaves.
  const [briefing, setBriefing] = useState(booted.fresh);
  const [card, setCard] = useState<TitleCard | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [revived, setRevived] = useState<{ id: string; to: number; words: string } | null>(null);
  const [station, setStation] = useState<{ deltas: Record<string, number>; text: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const zoom = useConsoleScale();
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

  function act(index: number, target: string) {
    if (busy) return;
    setArmedAlly(null);
    setHoverTarget(null);
    setHoverUnits([]);
    // A key that only acts on its user has no cell to name a target: the user is the target.
    dispatch({ kind: "act", order: { move: index, target: target || view.active?.id || "" } });
  }

  function pass() {
    if (busy || !view.active) return;
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
  const deltaOf = (id: string) => station?.deltas[id] ?? since.deltas[id] ?? 0;
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

  // The round and the rail during playback come from the beat being played: playback() replays
  // the clocks act by act, so a round that opens on an enemy's turn is the new round (banner,
  // rail divider and the enemy-turn card) from the moment that enemy acts.
  const beatNow = busy && moment ? moment.beats[0] : null;
  const shownRound = beatNow ? beatNow.round : view.round;
  const rail = beatNow ? beatNow.rail : view.rail;
  const roundOpened = !!beatNow && beatNow.round !== view.round;

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
  // An enemy that carried a hinder into its attack: say what it cost, naming the enemy.
  const weakenedNote = useMemo(() => {
    if (!busy || !moment || !actorIsEnemy) return "";
    if (!moment.beats.some((b) => b.event.kind === "hit")) return "";
    const start = Object.fromEntries(view.enemies.map((e) => [e.id, e.hinder]));
    const prior = moments.slice(0, beatIndex).flatMap((m) => m.beats);
    const n = hinderOnAttack(start, prior, moment.actor);
    const foe = view.enemies.find((e) => e.id === moment.actor);
    return n > 0 && foe ? ` ${weakenedWords(`${foe.name} ${foe.letter}`, n)}` : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, moment, actorIsEnemy, beatIndex, moments, view.enemies]);
  const beatWords =
    busy && moment
      ? landed
        ? momentWords(moment.beats, [...view.squad, ...view.enemies]) + weakenedNote
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
      const top = at(t, 0.25);
      const all = moment.beats
        .filter((b) => "target" in b.event && (b.event as { target: string }).target === t)
        .map((b) => floatOf(b, enemyIds.has(t)))
        .filter((f): f is FloatItem => !!f);
      const main = all.filter((f) => f.kind === "hurt" || f.kind === "heal");
      const items = main.length ? main : all;
      if (top && items.length) floats.push({ id: t, x: top.x + 44, y: top.y, items });
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
                line={beatWords || (busy ? "" : notice ?? station?.text ?? since.text)}
                lineIsSince={!beatWords && !busy && !notice && !station && !!since.text}
                onOpenRecord={() => setPanel("record")}
                round={shownRound}
              />
              <TurnRail rail={rail} round={shownRound} />
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
                  u={withHp(e)}
                  lit={busy && actorId === e.id}
                  activeName={view.active?.name}
                  spotlit={spotlightId === e.id}
                  dimmed={!!spotlightId && spotlightId !== e.id}
                  delta={deltaOf(e.id)}
                  targeted={ringed(e.id)}
                  impactTarget={impactTargets.includes(e.id)}
                  struck={struckIds.includes(e.id)}
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
              <span key={`float-${beatIndex}-${f.id}`} className="pwt-float" style={{ left: f.x, top: f.y }} aria-hidden="true">
                {f.items.map((it, i) => (
                  <span key={i} className={`pwt-float-num ${it.kind}`}>
                    {it.text}
                    {it.tag && <span className={`pwt-float-tag ${it.tag.good ? "good" : "bad"}`}>{it.tag.word}</span>}
                  </span>
                ))}
              </span>
            ))}
          {card && !briefing && <TitleCardView card={card} key={`${card.kicker}-${card.name}`} />}
          {holding && hold && (
            <div className={`pwt-hold-card ${hold.kind}`} role="status" aria-live="polite" data-hold-card="">
              {hold.text}
            </div>
          )}
        </div>

        {view.phase === "turn" && view.active && (
          <div className={`pwt-keybar ${busy ? "busy" : ""} ${handoff ? "handing-off" : ""}`}>
            <div className="pwt-keybar-portrait">
              <span className="pwt-keybar-portrait-img">
                <Portrait u={{ species: view.active.art, element: view.active.element }} />
              </span>
              <span className={`pwt-keybar-who el-${view.active.element}`}>{view.active.name}</span>
              <ElementBadge element={view.active.element} className="pwt-el-static" />
              {view.activeStatus && (
                <span className="pwt-keybar-status" title={view.activeStatus.sentence} aria-label={view.activeStatus.sentence}>
                  {view.activeStatus.parts.map((p) => (
                    <span key={p}>{p}</span>
                  ))}
                </span>
              )}
            </div>
            {view.keys.map((k) => (
              <KeyCard
                key={k.index}
                keyView={k}
                squad={view.squad.filter((s) => s.id !== view.active!.id && !s.down)}
                activeId={view.active!.id}
                disabled={busy}
                onAct={(target) => act(k.index, target)}
                onHoverTarget={(id) => setHoverTarget(id)}
                onHoverUnits={(ids) => setHoverUnits(ids ?? [])}
                litTarget={busy ? null : hoverTarget}
              />
            ))}
            <button type="button" className="pwt-pass" disabled={busy} onClick={pass}>
              Pass
            </button>
            {busy && (
              <div className="pwt-keybar-play">
                <PlaybackTools
                  speed={speed}
                  onSpeed={setSpeed}
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
            {busy && (
              <div className={`pwt-keybar-wait playing ${actorIsEnemy ? "enemy" : "squad"}`} aria-live="polite" data-playing="">
                {roundOpened && beatNow && <span className="pwt-keybar-wait-round">Round {beatNow.round}</span>}
                <span className="pwt-keybar-wait-kicker">{actorIsEnemy ? "Enemy turn" : "Playing out"}</span>
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
            onRetreat={() => dispatch({ kind: "retreat" })}
          />
        )}
        {view.ending && !busy && (
          <EndPanel ending={view.ending} summary={runSummary(run, view, record)} squad={view.squad} onPlayAgain={restart} />
        )}

        {panel === "guide" && (
          <GuidePanel
            onClose={() => setPanel(null)}
            squadArt={view.squad[0] ? { art: view.squad[0].art, element: view.squad[0].element } : undefined}
            enemyArt={view.enemies[0] ? { art: view.enemies[0].art, element: view.enemies[0].element } : undefined}
          />
        )}
        {panel === "record" && (
          <RecordPanel entries={record} roomNames={roomNames} since={since.items} onClose={() => setPanel(null)} />
        )}
        {panel === "restart" && (
          <RestartPanel
            onConfirm={restart}
            onClose={() => {
              setPanel(null);
              setNotice("Restart cancelled. Your run continues.");
            }}
          />
        )}
        {briefing && <BriefingPanel briefing={briefingView(run)} onBegin={begin} />}
      </div>
      <div className="pwt-rotate">
        <Smartphone className="pwt-rotate-icon" />
        <p>Turn your phone sideways to play</p>
        <Link to="/" className="pwt-rotate-back">
          <ArrowLeft size={14} />
          <span>Back to Xalians</span>
        </Link>
      </div>
    </main>
  );
}
