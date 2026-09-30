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
  ENCOUNTER_XP,
  FINAL_ENCOUNTER_XP,
  STALLED_LOG,
  STALL_TURNS_PER_UNIT,
  attackOn,
  interval,
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
  /**
    A stronger attack on the active companion that is resting now: its health, the element
    step, and how many of the enemy's own turns after its next one it waits (cooldowns
    decrement at the start of a unit's own turn, so a move with cooldown c can act on the
    unit's c-th turn from now; `turns` is c - 1, so the chip reads "46 in 1"). null when no
    resting attack beats the ready one.
  */
  hitComing: { n: number; step: number; turns: number } | null;
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
  /**
    Attack cells of a hindered or boosted companion: the health this attack would land
    without the companion's own mark, struck through beside `n` (the same form the enemy
    chips use). Undefined when the mark changes nothing here.
  */
  ownBefore?: number;
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
  /** Practice XP this sector gave: the camp's headline. 0 outside camp and the final win. */
  xpGain: number;
  /**
    Why the active companion's numbers differ from its moves' plain ones, said once for the
    key bar ("Crystorn is hindered by 14 on its next attack"). null when it carries no mark.
  */
  activeStatus: { sentence: string; parts: string[] } | null;
  /** How the run ended, in words; null while it is still going. */
  ending: Ending | null;
};

export type Ending = { kind: "won" | "lost" | "withdrew" | "forced"; title: string; text: string };

/** One step of the playback after a command: the event, its words, and every unit's health once it lands. */
export type Beat = {
  event: PEvent;
  words: string;
  /** Whose action this is, for the highlight. */
  actor: string;
  hp: Record<string, number>;
  /** The engine's round when this beat's actor acts (roundOf at that moment). */
  round: number;
  /** The turn rail as it stands when this beat's actor acts, its round divider included. */
  rail: RailSlot[];
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
  When can this enemy move next be used, in the enemy's own turns from now (0: at its next
  turn)? Cooldowns decrement at the start of a unit's own turn, so a move with cooldown c can
  act on the unit's c-th turn from now (its next turn is the 1st): c <= 1 means "at its next
  turn". `ready()` reads cooldown === 0, which is right for the active companion (already
  decremented at the start of its turn) but wrong for an enemy that has just acted: it carries
  rests + 1 until its own next turn starts. null when the move cannot be used at all (fallen,
  a spent signature, or inert).
*/
function turnsToReady(e: Fighter, i: number): number | null {
  const m = e.moves[i];
  if (e.hp <= 0 || (m.signature && e.signatureSpent) || !(m.power > 0 || m.parts.length > 0)) return null;
  return Math.max(0, e.cooldowns[i] - 1);
}

/**
  An enemy's attacks on the active companion, judged as they will be at the enemy's own turns:
  `ready` is the strongest it can use at its next turn (health it would take after the
  companion's own shields, and the matchup step); `coming` is the soonest stronger attack that
  is resting now, with the turns it waits after that next turn. Both null with no active
  companion or no such attack.
  `withHinder` lets a hinder-only cell ask "what would this be with the hinder applied", since
  the engine's hinder is max(current, n), not additive (support() in engine.ts).
*/
function threatOnActive(
  s: TRun,
  e: Fighter,
  withHinder?: number
): { ready: { n: number; step: number } | null; coming: { n: number; step: number; turns: number } | null } {
  const active = s.team.find((t) => t.id === s.active);
  if (!active || e.hp <= 0) return { ready: null, coming: null };
  const attacker = withHinder === undefined ? e : { ...e, hinder: Math.max(e.hinder, withHinder) };
  let ready: { n: number; step: number } | null = null;
  const resting: { n: number; step: number; turns: number }[] = [];
  e.moves.forEach((m, i) => {
    const wait = turnsToReady(e, i);
    if (m.power <= 0 || wait === null) return;
    const n = landedOn(wait === 0 ? attacker : { ...e, boost: 0, hinder: 0 }, m, active);
    const st = step(m.element, active.element);
    if (wait === 0) {
      if (!ready || n > ready.n) ready = { n, step: st };
    } else resting.push({ n, step: st, turns: wait });
  });
  // The soonest resting attack that beats the ready one (ties: the strongest).
  const better = resting.filter((r) => !ready || r.n > ready.n).sort((a, b) => a.turns - b.turns || b.n - a.n);
  return { ready, coming: better[0] ?? null };
}

/** The hit on the active companion, and, when a hinder lowers it, the hit without the hinder. */
function withBefore(s: TRun, u: Fighter): EnemyView["hitOnActive"] {
  const hit = threatOnActive(s, u).ready;
  if (!hit || u.hinder <= 0) return hit;
  const clean = threatOnActive(s, { ...u, hinder: 0 }).ready;
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
    hitComing: threatOnActive(s, u).coming,
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
      // The companion's own hinder or boost: what this attack would land without it.
      const clean = u.hinder > 0 || u.boost > 0 ? landedOn({ ...u, boost: 0, hinder: 0 }, m, t) : n;
      return {
        target: t.id,
        letter,
        n,
        ...(clean !== n ? { ownBefore: clean } : {}),
        step: st,
        immune: st === 0,
        finishes: n >= t.hp && n > 0,
        absorbed: shieldAbsorbed,
      };
    }
    // Hinder-only: before is the enemy's current hit on the active companion; after applies this
    // hinder on top of whatever it already carries (engine's hinder is max(current, n), not additive).
    const before = threatOnActive(s, t).ready?.n ?? 0;
    const hinderN = hinderPart ? (hinderPart.all ? allShare(hinderPart.n) : hinderPart.n) : 0;
    const n = threatOnActive(s, t, hinderN).ready?.n ?? 0;
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
    supports: m.parts.map(supportChip),
  };
}

/** Strips the "1. " style ordinal prefix a room's display name carries. */
function bareRoomName(name: string): string {
  return name.replace(/^\d+\.\s*/, "");
}

/** Every sector's display name, in order, for the Record's headings. */
export function roomNamesOf(s: TRun): string[] {
  return roomsFor(s.rules).map((r) => bareRoomName(r.name));
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
    xpGain: s.phase === "camp" ? ENCOUNTER_XP : s.phase === "won" ? FINAL_ENCOUNTER_XP : 0,
    activeStatus: active && activeReady ? statusWords(active) : null,
    ending: endingOf(s),
  };
}

/** Why the active companion's numbers differ from its moves' plain ones (see TurnView.activeStatus). */
function statusWords(u: Fighter): TurnView["activeStatus"] {
  const parts: string[] = [];
  if (u.boost > 0) parts.push(`boosted by ${u.boost}`);
  if (u.hinder > 0) parts.push(`hindered by ${u.hinder}`);
  return parts.length ? { sentence: `${u.name} is ${parts.join(" and ")} on its next attack`, parts } : null;
}

/**
  How a finished run ended, in words. The engine calls both a chosen retreat and a stall's forced
  exit "retreated"; the last log line tells them apart (WITHDREW_LOG / STALLED_LOG).
*/
export function endingOf(s: TRun): Ending | null {
  if (s.phase === "won") return { kind: "won", title: "Powerworks silenced", text: "The defense network falls silent. Your squad made it through." };
  if (s.phase === "lost") return { kind: "lost", title: "Squad fallen", text: "Your squad could not continue. A fresh attempt restores everyone." };
  if (s.phase !== "retreated") return null;
  if (s.log[s.log.length - 1] === STALLED_LOG)
    return {
      kind: "forced",
      title: "Forced out",
      text: `Neither side reached a new low in total health for ${STALL_TURNS_PER_UNIT} turns for each unit still standing, so the squad is forced out.`,
    };
  return { kind: "withdrew", title: "Squad withdrew", text: "You withdrew at camp. A fresh attempt restores everyone." };
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

const moveOf = (e: PEvent): string | null => ("move" in e ? e.move : null);

/** Does this event open a new act (one unit's one action) rather than continue the last one? */
function opensAct(prev: PEvent | null, e: PEvent): boolean {
  if (!prev || prev.actor !== e.actor) return true;
  if (prev.kind === "pass" || prev.kind === "lapsed" || e.kind === "pass" || e.kind === "lapsed") return true;
  const a = moveOf(prev);
  const b = moveOf(e);
  return !!a && !!b && a !== b;
}

/**
  The beats of a command's events, health replayed from the state before it. Each beat also
  carries the engine's round and the turn rail as they stand when its actor acts: the clocks
  are replayed act by act (the actor's own clock rises by its interval after it acts, and a
  delay pushes its target back), so a round that opens on an enemy's turn is already the new
  round for that enemy's beats.
*/
export function playback(before: TRun, events: PEvent[]): Beat[] {
  const hp: Record<string, number> = {};
  for (const u of [...before.team, ...before.enemies]) hp[u.id] = u.hp;
  const clock = { ...before.clock };
  const delays: Record<string, number> = {};
  const unit = (id: string) => [...before.team, ...before.enemies].find((u) => u.id === id)!;
  const beats: Beat[] = [];
  let prev: PEvent | null = null;
  let at: { round: number; rail: RailSlot[] } = { round: roundOf(before), rail: [] };
  for (const e of events) {
    if (opensAct(prev, e)) {
      if (prev) {
        // The previous act ends: its actor's clock rises, then any delay lands on its target.
        clock[prev.actor] += interval(before, unit(prev.actor));
        for (const [id, amount] of Object.entries(delays)) clock[id] += (amount / 100) * interval(before, unit(id));
        for (const id of Object.keys(delays)) delete delays[id];
      }
      const here: TRun = {
        ...before,
        clock: { ...clock },
        active: e.actor,
        team: before.team.map((u) => ({ ...u, hp: hp[u.id] })),
        enemies: before.enemies.map((u) => ({ ...u, hp: hp[u.id] })),
      };
      at = { round: roundOf(here), rail: railFor(here) };
    }
    if (e.kind === "hit") hp[e.target] = Math.max(0, (hp[e.target] ?? 0) - e.amount);
    else if (e.kind === "heal") hp[e.target] = (hp[e.target] ?? 0) + e.amount;
    else if (e.kind === "delay") delays[e.target] = Math.max(delays[e.target] ?? 0, e.amount);
    beats.push({ event: e, words: eventWords(before, e), actor: e.actor, hp: { ...hp }, round: at.round, rail: at.rail });
    prev = e;
  }
  return beats;
}

/** A unit as the words name it: enemies carry their letter. */
export type Named = { id: string; name: string; letter?: string };
const labelOf = (units: Named[], id: string): string => {
  const u = units.find((x) => x.id === id);
  return u ? (u.letter ? `${u.name} ${u.letter}` : u.name) : id;
};
const joinWords = (xs: string[]): string => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0]);

/**
  One line for a moment (one actor's one move, however many units it touches). A lone beat keeps
  its own words; several become "X's Move hit A, B for 6, 7 and weakened Crystorn's next attack
  by 14", every support clause naming the unit it lands on (never a bare "its").
*/
export function momentWords(beats: Beat[], units: Named[]): string {
  if (beats.length === 1) return beats[0].words;
  const events = beats.map((b) => b.event);
  const first = events[0];
  const move = moveOf(first);
  if (!move) return beats.map((b) => b.words).join(" ");
  const actor = labelOf(units, first.actor);
  const short = (id: string) => units.find((x) => x.id === id)?.letter ?? labelOf(units, id);
  const clauses: string[] = [];
  const hits = events.filter((e): e is Extract<PEvent, { kind: "hit" }> => e.kind === "hit");
  if (hits.length) clauses.push(`hit ${joinWords(hits.map((h) => short(h.target)))} for ${joinWords(hits.map((h) => String(h.amount)))}`);
  type Support = Extract<PEvent, { kind: "heal" | "shield" | "boost" | "hinder" | "delay" }>;
  for (const kind of ["heal", "shield", "boost", "hinder", "delay"] as const) {
    const ofKind = events.filter((e): e is Support => e.kind === kind);
    const amounts = [...new Set(ofKind.map((e) => e.amount))];
    for (const n of amounts) {
      const names = ofKind.filter((e) => e.amount === n).map((e) => labelOf(units, e.target));
      const many = names.length > 1;
      const owned = joinWords(names.map((x) => `${x}'s`));
      if (kind === "heal") clauses.push(`healed ${joinWords(names)} for ${n}`);
      else if (kind === "shield") clauses.push(`shielded ${joinWords(names)} for ${n}`);
      else if (kind === "boost") clauses.push(`boosted ${owned} next ${many ? "attacks" : "attack"} by ${n}`);
      else if (kind === "hinder") clauses.push(`weakened ${owned} next ${many ? "attacks" : "attack"} by ${n}`);
      else clauses.push(`slowed ${owned} next ${many ? "turns" : "turn"}`);
    }
  }
  let words = `${actor}'s ${move} ${joinWords(clauses)}.`;
  for (const h of hits) if (h.fell) words += ` ${labelOf(units, h.target)} fell.`;
  return words;
}

/**
  How much an acting enemy's hit was weakened: the hinder it carried at the start of the command
  (`start`, by unit id), raised by every hinder on it in the beats before this one, and spent by
  an attack of its own in between.
*/
export function hinderOnAttack(start: Record<string, number>, priorBeats: Beat[], actor: string): number {
  let hinder = start[actor] ?? 0;
  for (const b of priorBeats) {
    const e = b.event;
    if (e.kind === "hit" && e.actor === actor) hinder = 0;
    else if (e.kind === "hinder" && e.target === actor) hinder = Math.max(hinder, e.amount);
  }
  return hinder;
}

/** "Central guardian A's hit was weakened by 10." Names the unit whose hit it was. */
export const weakenedWords = (name: string, n: number): string => `${name}'s hit was weakened by ${n}.`;

/** One line of the Record: a beat's sentence, filed under its sector and round. */
export type RecordEntry = { room: number; round: number; actor: string; words: string; event: PEvent };

export function recordEntries(room: number, beats: Beat[]): RecordEntry[] {
  return beats.map((b) => ({ room, round: b.round, actor: b.actor, words: b.words, event: b.event }));
}

/** What changed for one unit since the active companion's last turn. */
export type SinceItem = { id: string; name: string; enemy: boolean; text: string };
export type SinceView = {
  /** Squad then enemies, the active companion first; only units something happened to. */
  items: SinceItem[];
  /** Net health change per unit id, for the plates' delta chips. */
  deltas: Record<string, number>;
  /** The banner's line: as many whole items as fit, then "+N more" for the rest. */
  text: string;
};

/** How many characters of the summary the banner's two lines hold before "+N more". */
const SINCE_BUDGET = 92;

/**
  "Since your last turn" (UX pass 2, round 1): every change that matters for the next choice,
  per unit, from the beats since the active companion last acted in this room (every beat of the
  room when it has not acted yet). Health hits and heals are listed separately; a shield gained
  or lost, a boost or a hinder appear only while the unit still carries it; nothing changed
  means nothing is said. The active companion's own line comes first, then its squadmates,
  then the enemies in row order, so the banner drops the least decision-relevant first.
*/
export function sinceView(entries: RecordEntry[], v: TurnView): SinceView {
  const empty: SinceView = { items: [], deltas: {}, text: "" };
  if (!v.active) return empty;
  const inRoom = entries.filter((e) => e.room === v.room);
  let last = -1;
  inRoom.forEach((e, i) => {
    if (e.actor === v.active!.id) last = i;
  });
  const window = inRoom.slice(last + 1);
  type Seen = { lost: number; healed: number; fell: boolean; shieldUp: number; shieldDown: number; boosted: boolean; hindered: boolean };
  const seen: Record<string, Seen> = {};
  const of = (id: string): Seen => (seen[id] ??= { lost: 0, healed: 0, fell: false, shieldUp: 0, shieldDown: 0, boosted: false, hindered: false });
  for (const { event: e } of window) {
    if (e.kind === "hit") {
      const u = of(e.target);
      u.lost += e.amount;
      u.shieldDown += e.absorbed;
      if (e.fell) u.fell = true;
    } else if (e.kind === "heal") of(e.target).healed += e.amount;
    else if (e.kind === "shield") of(e.target).shieldUp += e.amount;
    else if (e.kind === "boost") of(e.target).boosted = true;
    else if (e.kind === "hinder") of(e.target).hindered = true;
  }
  const active = v.active;
  const order = [
    ...v.squad.filter((u) => u.id === active.id).map((u) => ({ u, enemy: false, name: u.name })),
    ...v.squad.filter((u) => u.id !== active.id).map((u) => ({ u, enemy: false, name: u.name })),
    ...v.enemies.map((u) => ({ u, enemy: true, name: `${u.name} ${u.letter}` })),
  ];
  const items: SinceItem[] = [];
  const deltas: Record<string, number> = {};
  for (const { u, enemy, name } of order) {
    const c = seen[u.id];
    if (!c) continue;
    const parts: string[] = [];
    if (c.lost) parts.push(`-${c.lost}`);
    if (c.healed) parts.push(`+${c.healed}`);
    if (c.fell) parts.push("fell");
    if (c.shieldUp) parts.push(`shield +${c.shieldUp}`);
    if (c.shieldDown) parts.push(`shield -${c.shieldDown}`);
    if (c.boosted && u.boost > 0) parts.push(`boosted ${u.boost}`);
    if (c.hindered && u.hinder > 0) parts.push(`hindered ${u.hinder}`);
    if (!parts.length) continue;
    if (c.healed - c.lost) deltas[u.id] = c.healed - c.lost;
    items.push({ id: u.id, name, enemy, text: `${name} ${parts.join(", ")}` });
  }
  let text = "";
  let shown = 0;
  for (const it of items) {
    const next = text ? `${text}; ${it.text}` : it.text;
    if (shown > 0 && next.length > SINCE_BUDGET) break;
    text = next;
    shown++;
  }
  if (shown < items.length) text += ` +${items.length - shown} more`;
  return { items, deltas, text };
}
