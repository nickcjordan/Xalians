/*
  Powerworks, turn by turn: the screen's reading of a run (docs/design/powerworks-turn-screen.md).
  React-free and tested (view.test.ts). The page renders only what this module returns; it never
  computes a number itself.

  CONTRACT FILE: the types below are fixed by the orchestrator. The implementer fills in the
  function bodies and may add private helpers, but must not change an exported type or
  signature without the orchestrator's sign-off.
*/
import {
  allShare,
  attackOn,
  landedOn,
  legalTargets,
  roomsFor,
  roundOf,
  roundStrip,
  standing,
  step,
  upcoming,
  type Fighter,
  type PEvent,
  type PMove,
  type Part,
  type TRun,
  type SupportKind,
  type Aim,
} from "@xalians/rules/dungeon/pillars";

export type Letter = "A" | "B" | "C" | "D" | "E" | "F";

/** Condition chips every plate can carry, each one number in health. 0 means absent. */
export type Marks = {
  /** Sum of the shields on the unit. */
  shield: number;
  /** Added to the unit's next attack. */
  boost: number;
  /** Taken from the unit's next attack. */
  hinder: number;
};

export type SquadView = Marks & {
  id: string;
  name: string;
  species: string;
  /** The painted-art key for the portrait (species itself for the squad). */
  art: string;
  element: string;
  hp: number;
  max: number;
  down: boolean;
  active: boolean;
};

export type EnemyView = Marks & {
  id: string;
  letter: Letter;
  name: string;
  species: string;
  /** The painted-art key for the portrait: the species, or a borrowed painting for a role enemy (ENEMY_ART). */
  art: string;
  element: string;
  hp: number;
  max: number;
  down: boolean;
  /**
    Its strongest ready attack on the active companion: health it would take after the
    companion's shields, and the element step (0, 0.5, 1, 1.5, 2). null when no companion is
    active or it has no ready attack.
  */
  hitOnActive: { n: number; step: number; before?: number } | null;
};

/** One target cell on a key: what this key does to that one target. */
export type Cell = {
  target: string;
  /** The enemy's letter, or undefined for a squadmate cell. */
  letter?: Letter;
  /**
    Attack: health the target would lose (landedOn). Heal: health it would gain (capped by
    missing health). Shield or boost on an ally: the key's number. Hinder only: the enemy's
    hit on the active companion after the hinder (see `before`).
  */
  n: number;
  /** Hinder-only cells: the enemy's hit on the active companion before the hinder. */
  before?: number;
  /** Attack cells: the element step against this target. 1 otherwise. */
  step: number;
  /** Attack cells: the chart gives 0, so the attack does nothing here. */
  immune: boolean;
  /** Attack cells: the landed number is at least the target's health. */
  finishes: boolean;
  /** Attack cells: health the target's shields would absorb first. */
  absorbed: number;
};

export type SupportChip = { kind: SupportKind; n: number; aim: Aim; all: boolean };

export type KeyView = {
  /** Index into the active companion's moves; the order's `move`. */
  index: number;
  name: string;
  signature: boolean;
  /** Own turns the move rests after use (0: every turn). */
  rests: number;
  state: "ready" | "resting" | "spent";
  /** While resting: own turns until it is ready again. */
  restLeft: number;
  /** "attack" when the move deals damage (it may also carry supports). */
  kind: "attack" | "support";
  area: boolean;
  /**
    How the player aims it. "enemy": a cell per standing enemy, click one. "ally": a cell per
    standing squadmate (not the user, unless alone), click one. "now": the key acts on press
    (self-only, or aimed at everyone). An area attack is "enemy" with every cell showing its hit;
    clicking any of them acts.
  */
  aim: "enemy" | "ally" | "now";
  /** One per legal target in row order; empty for "now". */
  cells: Cell[];
  /** Every cell shows the same n, step 1, not immune, no finish: the key can show one number. */
  same: boolean;
  /** The move's supports, n already reduced for "all" (allShare). */
  supports: SupportChip[];
};

export type StripSlot = {
  id: string;
  enemy: boolean;
  letter?: Letter;
  name: string;
  art: string;
  element: string;
  /** done: acted this round; now: the active companion; next: yet to act this round; down: fallen. */
  state: "done" | "now" | "next" | "down";
};

/**
  One slot on the turn rail (UX pass, 2026-09-29): the whole-round strip plus a peek into
  the start of the next round, so the rail can show "the rest of this round and the start
  of the next" per the storyboard. `roundStart` marks the first slot of a new round (a
  divider plus "Round n+1" renders before it); undefined everywhere else.
*/
export type RailSlot = {
  id: string;
  enemy: boolean;
  letter?: Letter;
  name: string;
  art: string;
  element: string;
  /** now: the active companion; next: the very next to act; done: acted this round; down:
      fallen; later: standing and yet to act, beyond "next". */
  state: "now" | "next" | "done" | "down" | "later";
  roundStart?: number;
};

export type TurnView = {
  phase: TRun["phase"];
  /** 1-based round within the encounter. */
  round: number;
  /** 0-based room index and its display name without the "1. " prefix. */
  room: number;
  roomName: string;
  roomCount: number;
  active: SquadView | null;
  squad: SquadView[];
  enemies: EnemyView[];
  /** The active companion's four keys, in move order; empty outside its turn. */
  keys: KeyView[];
  /** This round in timeline order (every unit, fallen ones as "down"). */
  strip: StripSlot[];
  /** The turn rail (UX pass, 2026-09-29): this round plus a peek at the next one's start. */
  rail: RailSlot[];
  /** The id of the unit that acts right after the current one (null with no standing units
      left to act, i.e. the encounter is over). */
  nextId: string | null;
  revivalLeft: number;
  xp: number;
};

/** One step of the playback after a command: the event, its words, and every unit's health once it lands. */
export type Beat = {
  event: PEvent;
  words: string;
  /** Whose action this is, for the highlight. */
  actor: string;
  hp: Record<string, number>;
};

/** Painted art borrowed by the role enemies (roles.json has no paintings of its own). */
export const ENEMY_ART: Record<string, string> = {
  mender: "shield",
  warden: "shield",
  jammer: "drone",
  rallier: "drone",
};

const LETTERS: Letter[] = ["A", "B", "C", "D", "E", "F"];
/** Enemy letters by row order (s.enemies order, fixed for the encounter); fallen ones keep theirs. */
function letterFor(s: TRun, id: string): Letter | undefined {
  const i = s.enemies.findIndex((e) => e.id === id);
  return i >= 0 ? LETTERS[i] : undefined;
}
const shieldSum = (u: Fighter) => u.shields.reduce((a, b) => a + b.n, 0);
const marksOf = (u: Fighter): Marks => ({ shield: shieldSum(u), boost: u.boost, hinder: u.hinder });

function squadView(s: TRun, u: Fighter): SquadView {
  return { ...marksOf(u), id: u.id, name: u.name, species: u.species, art: u.species, element: u.element, hp: Math.max(0, u.hp), max: u.max, down: u.hp <= 0, active: s.active === u.id };
}

/**
  Will this enemy move be usable at the enemy's own next turn? `ready()` reads cooldown === 0,
  which is right for the active companion (its cooldowns were already decremented at the start of
  its turn), but wrong for an enemy mid-round: an enemy that has already acted this round carries
  cooldown = rests + 1 (1 for a rests-0 move) until its own next turn's start decrements it, so
  `ready()` reads false for every one of its moves right after it acts. The enemy chip is judging
  "what will this enemy do to me next", so the right test is cooldown <= 1 (it will be 0 or less
  by the time its turn comes), not cooldown === 0 right now.
*/
function willBeReady(e: Fighter, i: number): boolean {
  const m = e.moves[i];
  return e.hp > 0 && e.cooldowns[i] <= 1 && !(m.signature && e.signatureSpent) && (m.power > 0 || m.parts.length > 0);
}

/** An enemy's strongest attack on the active companion, judged as it will be at the enemy's own
    next turn (see willBeReady): health it would take after the companion's own shields, and the
    matchup step. null with no active companion or no such attack.
    `withHinder` lets a hinder-only cell ask "what would this be with the hinder applied", since
    the engine's hinder is max(current, n), not additive (support() in engine.ts). */
function hitOnActive(s: TRun, e: Fighter, withHinder?: number): { n: number; step: number } | null {
  const active = s.team.find((t) => t.id === s.active);
  if (!active || e.hp <= 0) return null;
  const attacker = withHinder === undefined ? e : { ...e, hinder: Math.max(e.hinder, withHinder) };
  let best: { n: number; step: number } | null = null;
  e.moves.forEach((m, i) => {
    if (m.power <= 0 || !willBeReady(e, i)) return;
    const n = landedOn(attacker, m, active);
    const st = step(m.element, active.element);
    if (!best || n > best.n) best = { n, step: st };
  });
  return best;
}

/** The hit on the active companion, and, when a hinder lowers it, the hit without the hinder. */
function withBefore(s: TRun, u: Fighter): EnemyView["hitOnActive"] {
  const hit = hitOnActive(s, u);
  if (!hit || u.hinder <= 0) return hit;
  const clean = hitOnActive(s, { ...u, hinder: 0 });
  return clean && clean.n > hit.n ? { ...hit, before: clean.n } : hit;
}

function enemyView(s: TRun, u: Fighter): EnemyView {
  return {
    ...marksOf(u),
    id: u.id,
    letter: letterFor(s, u.id)!,
    name: u.name,
    species: u.species,
    art: ENEMY_ART[u.species] ?? u.species,
    element: u.element,
    hp: Math.max(0, u.hp),
    max: u.max,
    down: u.hp <= 0,
    hitOnActive: withBefore(s, u),
  };
}

/** A move that does nothing at all (no attack, no supports): treated as inert, shown as "spent". */
const inert = (m: PMove) => m.power <= 0 && m.parts.length === 0;

function keyState(u: Fighter, i: number): { state: KeyView["state"]; restLeft: number } {
  const m = u.moves[i];
  if (m.signature && u.signatureSpent) return { state: "spent", restLeft: 0 };
  if (inert(m)) return { state: "spent", restLeft: 0 };
  if (u.cooldowns[i] > 0) return { state: "resting", restLeft: u.cooldowns[i] };
  return { state: "ready", restLeft: 0 };
}

/** One support part's chip, its n already reduced for "all" the way engine.support() reduces it. */
function supportChip(p: Part): SupportChip {
  const n = p.all ? allShare(p.n) : p.n;
  return { kind: p.kind, n, aim: p.aim, all: p.all };
}

/** Cells for an attacking key: one per standing enemy (or, for hinder-only keys with no attack,
    one per standing enemy showing the before/after of the hinder alone). */
function enemyCells(s: TRun, u: Fighter, m: PMove, targets: Fighter[]): Cell[] {
  const hinderPart = m.parts.find((p) => p.kind === "hinder");
  return targets.map((t) => {
    const letter = letterFor(s, t.id);
    if (m.power > 0) {
      const n = landedOn(u, m, t);
      const st = step(m.element, t.element);
      const shieldAbsorbed = Math.min(shieldSum(t), attackOn(u, m, t));
      return { target: t.id, letter, n, step: st, immune: st === 0, finishes: n >= t.hp && n > 0, absorbed: shieldAbsorbed };
    }
    // Hinder-only: before is the enemy's current hit on the active companion; after applies this
    // hinder on top of whatever it already carries (engine's hinder is max(current, n), not additive).
    const before = hitOnActive(s, t)?.n ?? 0;
    const hinderN = hinderPart ? (hinderPart.all ? allShare(hinderPart.n) : hinderPart.n) : 0;
    const n = hitOnActive(s, t, hinderN)?.n ?? 0;
    return { target: t.id, letter, n, before, step: 1, immune: false, finishes: false, absorbed: 0 };
  });
}

/** Cells for an ally-aimed key: one per legal squadmate target, heal/shield/boost's n. */
function allyCells(u: Fighter, m: PMove, targets: Fighter[]): Cell[] {
  const p = m.parts.find((x) => x.aim === "ally");
  return targets.map((t) => {
    let n = 0;
    if (p) {
      if (p.kind === "heal") n = Math.min(p.n, t.max - t.hp);
      else n = p.n;
    }
    return { target: t.id, n, step: 1, immune: false, finishes: false, absorbed: 0 };
  });
}

function sameAcross(cells: Cell[]): boolean {
  if (!cells.length) return false;
  // Hinder-only cells carry `before`: the point is comparing before/after per enemy, so they
  // never collapse to one number even when every enemy's after-hinder hit happens to match.
  if (cells.some((c) => c.before !== undefined)) return false;
  const n = cells[0].n;
  return cells.every((c) => c.n === n && c.step === 1 && !c.immune && !c.finishes);
}

function keyView(s: TRun, u: Fighter, i: number): KeyView {
  const m = u.moves[i];
  const { state, restLeft } = keyState(u, i);
  const kind: KeyView["kind"] = m.power > 0 ? "attack" : "support";
  const targets = legalTargets(s, u, i);
  const aimsEnemy = m.power > 0 || m.parts.some((p) => p.aim === "enemy");
  const aimsAlly = !aimsEnemy && m.parts.some((p) => p.aim === "ally");
  const aim: KeyView["aim"] = aimsEnemy ? "enemy" : aimsAlly ? "ally" : "now";
  const cells = aim === "enemy" ? enemyCells(s, u, m, targets) : aim === "ally" ? allyCells(u, m, targets) : [];
  return {
    index: i,
    name: m.name,
    signature: m.signature,
    rests: m.rests,
    state,
    restLeft,
    kind,
    area: m.area,
    aim,
    cells,
    same: sameAcross(cells),
    supports: m.parts.map(supportChip),
  };
}

/** Strips the "1. " style ordinal prefix a room's display name carries. */
function bareRoomName(name: string): string {
  return name.replace(/^\d+\.\s*/, "");
}

function stripState(s: TRun, unit: Fighter, done: boolean): StripSlot["state"] {
  if (unit.hp <= 0) return "down";
  if (unit.id === s.active) return "now";
  return done ? "done" : "next";
}

function stripSlot(s: TRun, unit: Fighter, done: boolean): StripSlot {
  return {
    id: unit.id,
    enemy: unit.enemy,
    letter: unit.enemy ? letterFor(s, unit.id) : undefined,
    name: unit.name,
    art: unit.enemy ? ENEMY_ART[unit.species] ?? unit.species : unit.species,
    element: unit.element,
    state: stripState(s, unit, done),
  };
}

function railBase(s: TRun, unit: Fighter, state: RailSlot["state"]): RailSlot {
  return {
    id: unit.id,
    enemy: unit.enemy,
    letter: unit.enemy ? letterFor(s, unit.id) : undefined,
    name: unit.name,
    art: unit.enemy ? ENEMY_ART[unit.species] ?? unit.species : unit.species,
    element: unit.element,
    state,
  };
}

/**
  The turn rail (UX pass, 2026-09-29, storyboard item "what happens next"): this round in
  timeline order, then a peek at the next round's own start, so the rail always shows a
  little of what is coming after the round in progress finishes. Built from `roundStrip`
  (this round) plus `upcoming` (the timeline as it actually stands) rather than a new engine
  helper, so it stays entirely on this side of the view boundary. Only the very first slot
  after "now" is labeled NEXT; everything further out (later in this round, or into the
  next) is "later" so the rail has exactly one NEXT at a time.
*/
function railFor(s: TRun): RailSlot[] {
  const round = roundStrip(s);
  let labeledNext = false;
  const slots: RailSlot[] = round.map(({ unit, done }) => {
    let state: RailSlot["state"] = unit.hp <= 0 ? "down" : unit.id === s.active ? "now" : done ? "done" : "later";
    if (state === "later" && !labeledNext) {
      state = "next";
      labeledNext = true;
    }
    return railBase(s, unit, state);
  });
  if (s.rules.timeline === "speed") return slots; // roundStrip already fell back to `upcoming`.
  // Peek past this round's end: `upcoming` walks the timeline as it actually stands, so
  // skipping past however many standing units are still to act in this round lands exactly
  // on the next round's own order.
  // The unit acting now has not finished its turn either, so it counts as still to act.
  const stillToAct = slots.filter((r) => r.state === "now" || r.state === "next" || r.state === "later").length;
  const peek = upcoming(s, stillToAct + 3).slice(stillToAct);
  peek.forEach((unit, i) => {
    let state: RailSlot["state"] = "later";
    if (!labeledNext) {
      state = "next";
      labeledNext = true;
    }
    const slot = railBase(s, unit, state);
    if (i === 0) slot.roundStart = roundOf(s) + 1;
    slots.push(slot);
  });
  return slots;
}

/** Who acts right after the current one, from the rail's one NEXT slot. Null once nobody is
    left to peek at (the encounter has just ended). */
function nextIdFrom(rail: RailSlot[]): string | null {
  return rail.find((r) => r.state === "next")?.id ?? null;
}

export function turnView(s: TRun): TurnView {
  const active = s.team.find((t) => t.id === s.active) ?? null;
  const activeReady = s.phase === "turn" && !!active;
  const rail = s.phase === "turn" ? railFor(s) : [];
  return {
    phase: s.phase,
    round: roundOf(s),
    room: s.room,
    roomName: bareRoomName(roomsFor(s.rules)[s.room].name),
    roomCount: roomsFor(s.rules).length,
    active: active ? squadView(s, active) : null,
    squad: s.team.map((u) => squadView(s, u)),
    enemies: s.enemies.map((u) => enemyView(s, u)),
    keys: activeReady ? active!.moves.map((_, i) => keyView(s, active!, i)) : [],
    strip: roundStrip(s).map(({ unit, done }) => stripSlot(s, unit, done)),
    rail,
    nextId: nextIdFrom(rail),
    revivalLeft: s.revival,
    xp: s.xp,
  };
}

/** Display name for the words: an enemy carries its letter, since two can share a name. */
const nameOf = (s: TRun, id: string): string => {
  const mate = s.team.find((u) => u.id === id);
  if (mate) return mate.name;
  const foe = s.enemies.find((u) => u.id === id);
  return foe ? `${foe.name} ${letterFor(s, id) ?? ""}`.trim() : id;
};

/** Words for one event, with display names: "Security drone hit Graviclaw for 7." */
export function eventWords(s: TRun, e: PEvent): string {
  const actor = nameOf(s, e.actor);
  if (e.kind === "pass") return `${actor} waits.`;
  if (e.kind === "lapsed") return `${actor}'s ${e.move} finds no target.`;
  if (e.kind === "redirect") return `${actor} turned from ${nameOf(s, e.from)} to ${nameOf(s, e.to)}.`;
  const target = nameOf(s, e.target);
  if (e.kind === "hit") {
    const tag = e.step > 1 ? " (strong matchup)" : e.step < 1 && e.step > 0 ? " (weak matchup)" : "";
    let words = `${actor} hit ${target} for ${e.amount}${tag}.`;
    if (e.absorbed > 0) words += ` ${target}'s shield took ${e.absorbed}.`;
    if (e.fell) words += ` ${target} fell.`;
    return words;
  }
  if (e.kind === "heal") return `${actor} healed ${target} for ${e.amount}.`;
  if (e.kind === "shield") return `${actor} shielded ${target} for ${e.amount}.`;
  if (e.kind === "boost") return `${actor} boosted ${target}'s next attack by ${e.amount}.`;
  if (e.kind === "hinder") return `${actor} weakened ${target}'s next attack by ${e.amount}.`;
  // delay: the turn-order layer, described the same way as a hinder on timing rather than damage.
  return `${actor} slowed ${target}'s next turn.`;
}

/** The beats of a command's events, health replayed from the state before it. */
export function playback(before: TRun, events: PEvent[]): Beat[] {
  const hp: Record<string, number> = {};
  for (const u of [...before.team, ...before.enemies]) hp[u.id] = u.hp;
  const beats: Beat[] = [];
  for (const e of events) {
    if (e.kind === "hit") hp[e.target] = Math.max(0, (hp[e.target] ?? 0) - e.amount);
    else if (e.kind === "heal") hp[e.target] = (hp[e.target] ?? 0) + e.amount;
    beats.push({ event: e, words: eventWords(before, e), actor: e.actor, hp: { ...hp } });
  }
  return beats;
}

/**
  "What happened since your last turn" (UX pass, 2026-09-29, storyboard item "what just
  happened"): per-unit health deltas since the health snapshot the page took at the player's
  previous hand-off, plus a short list of lines from the beats played since. Pure over its
  inputs so the page's snapshot (taken once per hand-off, cleared once the player acts) is
  the only state involved; view.ts still computes every number.
*/
export type SinceLastTurn = {
  /** Health change per unit id since the snapshot: negative for damage, positive for healing.
      Absent (or 0) units carry no chip. */
  deltas: Record<string, number>;
  /** 2 to 4 short lines, oldest first, of what happened since. */
  lines: string[];
};

const MAX_SINCE_LINES = 4;

export function turnDeltas(snapshot: Record<string, number>, beatsSince: Beat[]): SinceLastTurn {
  const deltas: Record<string, number> = {};
  for (const [id, before] of Object.entries(snapshot)) {
    const beat = [...beatsSince].reverse().find((b) => id in b.hp);
    if (!beat) continue;
    const after = beat.hp[id];
    const delta = after - before;
    if (delta !== 0) deltas[id] = delta;
  }
  const lines = beatsSince
    .filter((b) => b.event.kind !== "pass" && b.event.kind !== "lapsed")
    .map((b) => b.words)
    .slice(-MAX_SINCE_LINES);
  return { deltas, lines };
}

/** A snapshot of every unit's current health, for the page to hold across a hand-off. */
export function hpSnapshot(s: TRun): Record<string, number> {
  const snap: Record<string, number> = {};
  for (const u of [...s.team, ...s.enemies]) snap[u.id] = Math.max(0, u.hp);
  return snap;
}
