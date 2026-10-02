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
  RECOVERY_STATION_HP,
  STALLED_LOG,
  STALL_TURNS_PER_UNIT,
  attackOn,
  clone,
  enemyFighter,
  foesOf,
  interval,
  landedOn,
  legalTargets,
  roomsFor,
  roundOf,
  resolveIntent,
  roundStrip,
  standing,
  support as engineSupport,
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
  /** The enemy hits and supports committed against this companion, in the order those enemies act (see Threat). */
  threats: Threat[];
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
    The element step of the acting companion's attacks against this enemy (0, 0.5, 1, 1.5, 2): every
    attack takes its creature's element, so the matchup belongs to the pair and is said once per
    enemy, not once per move. null when no companion is acting.
  */
  matchup: number | null;
  /** The supports committed to this enemy (an ally's heal, its own shield), in the order those enemies act. */
  threats: Threat[];
  /** This enemy's own next act, shown under its health (docs/design/powerworks-one-number-one-meaning.md, decision 1); null when it has none. */
  next: NextAct | null;
};

/**
  An enemy's next act as its own plate says it: the number it would land (an attack), or the support it will give
  and to whom. Read from the same threats the companion plates carry, so the two always agree; the plate never
  names a companion. A previewed key changes `n` (the old number rides in `before`) or cancels it.
*/
export type NextAct = {
  from: Letter;
  kind: "attack" | "support";
  /** Attack: the number it would land now (the largest, when an area hit reaches companions with different shields). */
  n: number;
  /** Previewed: the number before the previewed key (struck beside n). */
  before?: number;
  /** Attack: it reaches every companion. */
  area?: true;
  /** Previewed: the key finishes this enemy (or the ally it was to support), so the act will not come. */
  cancelled?: true;
  /** Support: each amount, in the move's order. */
  parts: { kind: SupportKind; n: number }[];
  /** Support: the letters of the ally enemies it lands on (never a companion's name). */
  toLetters: Letter[];
  /** Support: it lands on this enemy itself. */
  self: boolean;
};

/**
  A threat tag (docs/design/powerworks-threat-tags.md): one enemy's committed move, as it lands on one
  plate. An attack shows on every companion it reaches with that companion's own number (the number
  it would land now: the attack less the target's shields, never capped by health, with the enemy's
  own boost and hinder in it). A support shows on its recipient with the engine's own amounts.
  Built from the intents the engine holds; a previewed key changes `n`, `lethal` and `cancelled`
  through the same builders (previewThreats).
*/
export type Threat = {
  /** The enemy it comes from. */
  from: Letter;
  fromId: string;
  fromName: string;
  /** The plate it lands on (a companion for an attack, a hinder or a slow; an ally enemy or the enemy itself for the rest). */
  on: string;
  onName: string;
  /** The letter of the plate it lands on, when that is an enemy. */
  onLetter?: Letter;
  kind: "attack" | "support";
  move: string;
  /** Attack: the number it lands now on `on` (0 on an immune matchup). Support: 0 (see parts). */
  n: number;
  /** Attack: the element step against `on`. */
  step: number;
  /** Support: each amount the engine would apply to `on`, in the move's order. */
  parts: { kind: SupportKind; n: number }[];
  /** The attack reaches every companion. */
  area?: true;
  /** Attack: the number equals or exceeds the plate's health. */
  lethal?: true;
  /** Previewed: the number before the previewed key (struck beside n). */
  before?: number;
  /** Previewed: the previewed key finishes this enemy (or the enemy it lands on), so the hit will not come. */
  cancelled?: true;
  /** Position in the timeline (0 acts first); the tags on a plate are ordered by it. */
  order: number;
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
  /** Hinder-only cells: the enemy's committed hit before the hinder. */
  before?: number;
  /** Attack cells: the element step against this target. 1 otherwise. */
  step: number;
  /** Attack cells: the chart gives 0, so the attack does nothing here. */
  immune: boolean;
  /** Attack cells: the landed number is at least the target's health. */
  finishes: boolean;
  /** Attack cells: health the target's shields would absorb first. */
  absorbed: number;
  /** Hinder-only cells: how much the hinder takes off that enemy's next hit. */
  hinder?: number;
  /**
    Attack cells whose key carries a hinder rider: that enemy's hit on the acting companion before
    the rider and what it falls to after (the struck form the hinder keys use). Absent when the
    attack finishes the enemy (a fallen enemy takes no rider) or the rider changes nothing.
  */
  rider?: { before: number; after: number };
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
  /** The move's attack power before any matchup (0 for a support). */
  power: number;
  /** What the card says: the main act first, then its riders (docs/design/powerworks-one-number-one-meaning.md, decision 3). */
  acts: ActLine[];
};

/** The words a card is made of: what the player does. */
export type Verb = "strike" | "sweep" | "mend" | "guard" | "boost" | "weaken" | "slow";
export const VERB_OF: Record<SupportKind, Verb> = { heal: "mend", shield: "guard", boost: "boost", hinder: "weaken", delay: "slow" };

/**
  One act on a card: a verb and its number. `was` is the number before the actor's own boost or hinder
  (an attack only), struck beside `n`. `all` says the act reaches everyone it can (every enemy for a sweep, the whole squad for a support).
*/
export type ActLine = { verb: Verb; n: number; was?: number; all?: true };

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
  /** A hit that the actor's hinder weakened: how much it carried into this attack (every hit of the act). */
  weakened?: number;
  /** The sentence for it ("Central guardian A's hit was weakened by 10."), on the act's first hit only. */
  weakenedText?: string;
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

function squadView(s: TRun, u: Fighter, threats: Threat[]): SquadView {
  return {
    ...marksOf(u),
    id: u.id,
    name: u.name,
    species: u.species,
    art: u.species,
    element: u.element,
    hp: Math.max(0, u.hp),
    max: u.max,
    down: u.hp <= 0,
    active: s.active === u.id,
    threats: u.hp > 0 ? threats.filter((x) => x.on === u.id) : [],
  };
}

/**
  What an attack would deal to a target before its health caps it: the attack less the shields, never
  below 0. The engine's `landedOn` stops at the target's health; a forecast of an enemy's hit shows this
  number instead, so a hinder of 10 visibly removes 10 (48 on a companion at 46 reads 48, and 38 after the hinder).
*/
export function hitUncapped(u: Fighter, m: PMove, t: Fighter): number {
  const shield = t.shields.reduce((a, b) => a + b.n, 0);
  return Math.max(0, attackOn(u, m, t) - shield);
}

/** An enemy's committed attack: its move and target as they stand, or null when it has none or the intent is a support. */
function intentHit(s: TRun, e: Fighter, withHinder?: number): { move: PMove; target: Fighter; n: number; step: number } | null {
  const i = s.intents?.[e.id];
  if (!i || e.hp <= 0) return null;
  const move = e.moves[i.move];
  const target = [...s.team, ...s.enemies].find((x) => x.id === i.target);
  if (!move || !target || move.power <= 0) return null;
  const attacker = withHinder === undefined ? e : { ...e, hinder: Math.max(e.hinder, withHinder) };
  return { move, target, n: hitUncapped(attacker, move, target), step: step(move.element, target.element) };
}

/**
  Every standing enemy's committed move, as threats on the plates it lands on, in the order the
  enemies act (the timeline's own order). An attack tags every companion it reaches with that
  companion's number; a support tags its recipient with the amounts the engine would apply (the
  engine's own `support`, run on a copy, so the recipient and the numbers are never a second copy of
  its rules). When the committed target has already fallen the tag is on the companion the enemy
  will turn to (the engine's own redirect).
*/
export function threatsOf(s: TRun): Threat[] {
  if (s.phase !== "turn") return [];
  const order = upcoming(s, standing([...s.team, ...s.enemies]).length * 2 + 2);
  const rank = (id: string) => {
    const i = order.findIndex((o) => o.id === id);
    return i < 0 ? 999 : i;
  };
  const everyone = [...s.team, ...s.enemies];
  const out: Threat[] = [];
  for (const e of s.enemies) {
    if (e.hp <= 0 || !s.intents?.[e.id]) continue;
    const meant = s.intents[e.id];
    const target = everyone.find((x) => x.id === meant.target);
    // The engine's redirect when the committed target has fallen (on a copy: choosing afresh may draw).
    const chosen = target && target.hp > 0 ? meant : resolveIntent({ ...s }, e) ?? meant;
    const move = e.moves[chosen.move];
    const aimed = everyone.find((x) => x.id === chosen.target);
    if (!move || !aimed) continue;
    const base = { from: letterFor(s, e.id)!, fromId: e.id, fromName: e.name, move: move.name, order: rank(e.id) };
    if (move.power > 0) {
      const reach = move.area ? standing(foesOf(s, e)) : [aimed];
      for (const r of reach) {
        const n = hitUncapped(e, move, r);
        out.push({
          ...base,
          on: r.id,
          onName: r.name,
          kind: "attack",
          n,
          step: step(move.element, r.element),
          parts: [],
          ...(move.area ? { area: true as const } : {}),
          ...(n > 0 && n >= r.hp ? { lethal: true as const } : {}),
        });
      }
      continue;
    }
    // A support: the engine's own routing and amounts, run on a copy.
    const copy = clone({ team: s.team, enemies: s.enemies });
    const ce = copy.enemies.find((x) => x.id === e.id)!;
    const ct = [...copy.team, ...copy.enemies].find((x) => x.id === aimed.id)!;
    const byTarget = new Map<string, { kind: SupportKind; n: number }[]>();
    for (const p of move.parts)
      engineSupport(copy, ce, move, p, ct, (ev) => {
        if (ev.kind !== "heal" && ev.kind !== "shield" && ev.kind !== "boost" && ev.kind !== "hinder" && ev.kind !== "delay") return;
        if (ev.amount <= 0) return;
        byTarget.set(ev.target, [...(byTarget.get(ev.target) ?? []), { kind: ev.kind, n: ev.amount }]);
      });
    for (const [id, parts] of byTarget) {
      const r = everyone.find((x) => x.id === id)!;
      out.push({ ...base, on: id, onName: r.name, ...(r.enemy ? { onLetter: letterFor(s, id) } : {}), kind: "support", n: 0, step: 1, parts });
    }
  }
  return out.sort((a, b) => a.order - b.order);
}

/**
  An enemy whose committed target has fallen turns to the next companion when its beat starts: its
  single-target attack tag moves to that companion with that companion's number (read at the state
  the run holds). An area hit and a support stay where they are.
*/
export function retargetThreat(s: TRun, t: Threat, toId: string): Threat {
  if (t.kind !== "attack" || t.area || t.on === toId) return t;
  const e = s.enemies.find((x) => x.id === t.fromId);
  const r = s.team.find((x) => x.id === toId);
  const move = e?.moves.find((m) => m.name === t.move);
  if (!e || !r || !move) return t;
  const n = hitUncapped(e, move, r);
  const { lethal: _was, before: _b, ...plain } = t;
  return { ...plain, on: r.id, onName: r.name, n, step: step(move.element, r.element), ...(n > 0 && n >= r.hp ? { lethal: true as const } : {}) };
}

type Patch = { hinder: Record<string, number>; shield: Record<string, number>; heal: Record<string, number> };

/** The state with a previewed key's marks laid on the units it reaches (a copy; the run is untouched). */
function patchedRun(s: TRun, p: Patch): TRun {
  const fix = (f: Fighter): Fighter => {
    let o = f;
    if (p.hinder[f.id]) o = { ...o, hinder: Math.max(o.hinder, p.hinder[f.id]) };
    if (p.shield[f.id]) o = { ...o, shields: [...o.shields, { n: p.shield[f.id], from: "preview" }] };
    if (p.heal[f.id]) o = { ...o, hp: Math.min(o.max, o.hp + p.heal[f.id]) };
    return o;
  };
  return { ...s, team: s.team.map(fix), enemies: s.enemies.map(fix) };
}

/**
  The threats as the hovered or chosen key would leave them, computed from the same per-target
  forecast the previews carry (`previews` is previewsOf's result): a hinder (or an attack's hinder
  rider) on an enemy re-reads that enemy's hits with the same builders; a key whose preview finishes
  an enemy cancels that enemy's tags; a shield or heal on a companion re-reads the tags that land on
  it. A changed number carries its old one in `before`.
*/
export function previewThreats(s: TRun, key: KeyView, previews: Record<string, Preview>): Threat[] {
  const rest = threatsOf(s);
  if (!rest.length) return rest;
  const patch: Patch = { hinder: {}, shield: {}, heal: {} };
  const fall = new Set<string>();
  const riderN = key.supports.find((x) => x.kind === "hinder" && x.aim === "enemy")?.n ?? 0;
  for (const [id, p] of Object.entries(previews)) {
    if (s.enemies.some((e) => e.id === id)) {
      if (p.finishes) fall.add(id);
      else if (p.hinder) patch.hinder[id] = p.hinder;
      else if (p.rider) patch.hinder[id] = riderN;
      continue;
    }
    const chips: SupportChip[] = p.chips ?? [{ kind: p.kind as SupportKind, n: p.n, aim: "ally", all: false }];
    for (const c of chips) {
      if (c.kind === "shield") patch.shield[id] = (patch.shield[id] ?? 0) + c.n;
      if (c.kind === "heal") patch.heal[id] = (patch.heal[id] ?? 0) + c.n;
    }
  }
  const after = threatsOf(patchedRun(s, patch));
  return rest.map((t) => {
    if (fall.has(t.fromId) || fall.has(t.on)) return { ...t, cancelled: true as const };
    const a = after.find((x) => x.fromId === t.fromId && x.on === t.on && x.kind === t.kind);
    if (!a || t.kind !== "attack") return t;
    const { lethal: _was, ...plain } = t;
    return { ...plain, n: a.n, ...(a.n !== t.n ? { before: t.n } : {}), ...(a.lethal ? { lethal: true as const } : {}) };
  });
}

function enemyView(s: TRun, u: Fighter, threats: Threat[], next: NextAct | null): EnemyView {
  const active = s.phase === "turn" ? s.team.find((t) => t.id === s.active) : undefined;
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
    matchup: active ? step(active.element, u.element) : null,
    threats: u.hp > 0 ? threats.filter((x) => x.on === u.id) : [],
    next: u.hp > 0 ? next : null,
  };
}

/**
  Every standing enemy's next act, from its threats (the tags the companion plates carry, previewed or as the
  beat now showing reads them): one entry per enemy that has one. An attack's number is the largest among the
  companions it reaches; a support names the ally enemies it lands on by letter, or itself.
*/
export function nextActsOf(threats: Threat[]): Record<string, NextAct> {
  const out: Record<string, NextAct> = {};
  for (const t of threats) {
    const seen = out[t.fromId];
    if (t.kind === "attack") {
      if (!seen) out[t.fromId] = { from: t.from, kind: "attack", n: t.n, ...(t.before !== undefined ? { before: t.before } : {}), ...(t.area ? { area: true as const } : {}), ...(t.cancelled ? { cancelled: true as const } : {}), parts: [], toLetters: [], self: false };
      else if (t.n > seen.n) {
        seen.n = t.n;
        if (t.before !== undefined) seen.before = t.before;
        else delete seen.before;
      }
      continue;
    }
    if (!seen) out[t.fromId] = { from: t.from, kind: "support", n: 0, parts: t.parts, toLetters: [], self: false, ...(t.cancelled ? { cancelled: true as const } : {}) };
    const act = out[t.fromId];
    if (t.on === t.fromId) act.self = true;
    else if (t.onLetter && !act.toLetters.includes(t.onLetter)) act.toLetters.push(t.onLetter);
  }
  return out;
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
  const riderPart = m.power > 0 ? m.parts.find((p) => p.kind === "hinder" && p.aim === "enemy") : undefined;
  const riderN = riderPart ? (riderPart.all ? allShare(riderPart.n) : riderPart.n) : 0;
  return targets.map((t) => {
    const letter = letterFor(s, t.id);
    if (m.power > 0) {
      const n = landedOn(u, m, t);
      const st = step(m.element, t.element);
      const shieldAbsorbed = Math.min(shieldSum(t), attackOn(u, m, t));
      const finishes = n >= t.hp && n > 0;
      let rider: Cell["rider"];
      if (riderN > 0 && !finishes) {
        const now = intentHit(s, t);
        const before = now?.n ?? 0;
        const after = intentHit(s, t, riderN)?.n ?? 0;
        if (now && after < before) rider = { before, after };
      }
      return {
        target: t.id,
        letter,
        n,
        step: st,
        immune: st === 0,
        finishes,
        absorbed: shieldAbsorbed,
        ...(rider ? { rider } : {}),
      };
    }
    // Hinder-only: before is the enemy's committed hit as it stands; after applies this hinder on top
    // of whatever it already carries (the engine's hinder is max(current, n), not additive).
    const hinderN = hinderPart ? (hinderPart.all ? allShare(hinderPart.n) : hinderPart.n) : 0;
    const now = intentHit(s, t);
    const before = now?.n ?? 0;
    const n = intentHit(s, t, hinderN)?.n ?? 0;
    return { target: t.id, letter, n, before, hinder: hinderN, step: 1, immune: false, finishes: false, absorbed: 0 };
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
    power: m.power,
    acts: actsOf(u, m),
  };
}

/**
  What the card says, from the move itself: the main act is the attack (a strike on one enemy, a sweep on
  all) or, for a support, its first part; every other part follows as a rider. A hindered or boosted
  companion's attack carries its own number before and after ("strike 3, now 1").
*/
function actsOf(u: Fighter, m: PMove): ActLine[] {
  const parts = m.parts.map(supportChip);
  const support = (c: SupportChip, rider: boolean): ActLine => ({ verb: VERB_OF[c.kind], n: c.n, ...(c.all && !rider && c.aim !== "enemy" ? { all: true as const } : {}) });
  if (m.power > 0) {
    const now = Math.max(0, m.power + u.boost - u.hinder);
    return [
      { verb: m.area ? "sweep" : "strike", n: now, ...(now !== m.power ? { was: m.power } : {}), ...(m.area ? { all: true as const } : {}) },
      ...parts.map((c) => support(c, true)),
    ];
  }
  return parts.map((c, i) => support(c, i > 0));
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
  const peek = upcoming(s, stillToAct + standing([...s.team, ...s.enemies]).length).slice(stillToAct);
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
  const threats = threatsOf(s);
  const nextActs = nextActsOf(threats);
  return {
    phase: s.phase,
    round: roundOf(s),
    room: s.room,
    roomName: bareRoomName(roomsFor(s.rules)[s.room].name),
    roomCount: roomsFor(s.rules).length,
    active: active ? squadView(s, active, threats) : null,
    squad: s.team.map((u) => squadView(s, u, threats)),
    enemies: s.enemies.map((u) => enemyView(s, u, threats, nextActs[u.id] ?? null)),
    keys: activeReady ? active!.moves.map((_, i) => keyView(s, active!, i)) : [],
    strip: roundStrip(s).map(({ unit, done }) => stripSlot(s, unit, done)),
    rail,
    nextId: nextIdFrom(rail),
    revivalLeft: s.revival,
    xp: s.xp,
    xpGain: s.phase === "camp" ? ENCOUNTER_XP : s.phase === "won" ? FINAL_ENCOUNTER_XP : 0,
    ending: endingOf(s),
  };
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
  const self = e.target === e.actor;
  if (e.kind === "hit") {
    // A hit a hinder cut to nothing says "blocked" and whose hinder did it, matching the number that rises over the
    // target (round 7, item 6; round 8, item 8): an enemy's hit was cut by the player's hinder, a companion's by an enemy's.
    if (e.amount === 0 && e.absorbed === 0) {
      if (e.step === 0) return `${actor}'s hit on ${target} had no effect.`;
      const enemyActor = s.enemies.some((x) => x.id === e.actor);
      return `${actor}'s hit on ${target} was blocked by ${enemyActor ? "your hinder" : "an enemy's hinder"}.`;
    }
    const tag = e.step > 1 ? " (strong matchup)" : e.step < 1 && e.step > 0 ? " (weak matchup)" : "";
    let words = `${actor} hit ${target} for ${e.amount}${tag}.`;
    if (e.absorbed > 0) words += ` ${target}'s shield took ${e.absorbed}.`;
    if (e.fell) words += ` ${target} fell.`;
    return words;
  }
  if (e.kind === "heal") return `${actor} healed ${self ? "itself" : target} for ${e.amount}.`;
  if (e.kind === "shield") return `${actor} shielded ${self ? "itself" : target} for ${e.amount}.`;
  if (e.kind === "boost") return `${actor} boosted ${self ? "its own" : `${target}'s`} next attack by ${e.amount}.`;
  if (e.kind === "hinder") return `${actor} weakened ${target}'s next attack by ${e.amount}.`;
  // delay: the turn-order layer, described the same way as a hinder on timing rather than damage.
  return `${actor} slowed ${target}'s next turn.`;
}

/**
  The number that rises over a beat's target (UX pass 2, round 6, item 3). Two color rules, kept
  apart: a health number is raspberry when health is lost and green when it is gained, on either
  side; a matchup tag is green when the matchup favors you and raspberry when it favors the enemy.
  A hit that knocks its target out carries KO in place of a matchup tag (neutral); a hit that a
  hinder cut to 0 says "blocked", not "-0"; an immune matchup says "no effect".
*/
export type FloatItem = {
  text: string;
  kind: string;
  tag?: { word: string; tone: "good" | "bad" | "neutral" };
  /** Round 8, item 6: a number that lands on an enemy is plain ink; only the matchup tag and a squad's health carry color. */
  plain?: true;
};
export function floatWords(e: PEvent, targetIsEnemy = false): FloatItem | null {
  if (e.kind === "hit") {
    if (e.absorbed > 0 && e.amount === 0) return { text: `shield took ${e.absorbed}`, kind: "shield" };
    if (e.amount === 0) return { text: e.step === 0 ? "no effect" : "blocked", kind: "blocked" };
    const tag: FloatItem["tag"] = e.fell
      ? { word: "KO", tone: "neutral" }
      : e.step > 1
      ? { word: "Strong", tone: targetIsEnemy ? "good" : "bad" }
      : e.step > 0 && e.step < 1
      ? { word: "Weak", tone: targetIsEnemy ? "bad" : "good" }
      : undefined;
    return { text: `-${e.amount}`, kind: "hurt", tag, ...(targetIsEnemy ? { plain: true as const } : {}) };
  }
  // Every other event changes a number in its own home (a heal on the health row, a shield, boost or hinder on the marks
  // and the next-act row), so nothing floats for it: only a landed blow does (docs/design/powerworks-one-number-one-meaning.md, decision 8).
  return null;
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
  // The hinder each unit carries as the command plays: a hinder event raises it (max, as the engine
  // does) and an attack spends it, so a hit knows how much it was weakened.
  const hind: Record<string, number> = {};
  for (const u of [...before.team, ...before.enemies]) hind[u.id] = u.hinder;
  let actHinder: number | null = null;
  const unit = (id: string) => [...before.team, ...before.enemies].find((u) => u.id === id)!;
  const beats: Beat[] = [];
  let prev: PEvent | null = null;
  let at: { round: number; rail: RailSlot[] } = { round: roundOf(before), rail: [] };
  for (const e of events) {
    if (opensAct(prev, e)) {
      actHinder = null;
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
    let weakened: number | undefined;
    let weakenedText: string | undefined;
    if (e.kind === "hit") {
      const first = actHinder === null;
      if (first) {
        actHinder = hind[e.actor] ?? 0;
        hind[e.actor] = 0;
      }
      if (actHinder! > 0) {
        weakened = actHinder!;
        if (first) weakenedText = weakenedWords(nameOf(before, e.actor), actHinder!, before.enemies.some((x) => x.id === e.actor) ? "your hinder" : "an enemy's hinder");
      }
    } else if (e.kind === "hinder") hind[e.target] = Math.max(hind[e.target] ?? 0, e.amount);
    beats.push({
      event: e,
      words: eventWords(before, e),
      actor: e.actor,
      hp: { ...hp },
      round: at.round,
      rail: at.rail,
      ...(weakened ? { weakened } : {}),
      ...(weakenedText ? { weakenedText } : {}),
    });
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
  const hitIds = new Set(hits.map((h) => h.target));
  for (const kind of ["heal", "shield", "boost", "hinder", "delay"] as const) {
    const ofKind = events.filter((e): e is Support => e.kind === kind);
    const amounts = [...new Set(ofKind.map((e) => e.amount))];
    for (const n of amounts) {
      const targets = ofKind.filter((e) => e.amount === n).map((e) => e.target);
      const names = targets.map((t) => labelOf(units, t));
      const many = names.length > 1;
      // An area move's rider on the units it just hit is said once: "weakened each by 6".
      const each = many && hits.length > 1 && targets.every((t) => hitIds.has(t));
      const owned = joinWords(names.map((x) => `${x}'s`));
      const itself = targets.length === 1 && targets[0] === first.actor;
      if (kind === "heal") clauses.push(each ? `healed each for ${n}` : `healed ${itself ? "itself" : joinWords(names)} for ${n}`);
      else if (kind === "shield") clauses.push(each ? `shielded each for ${n}` : `shielded ${itself ? "itself" : joinWords(names)} for ${n}`);
      else if (kind === "boost") clauses.push(each ? `boosted each by ${n}` : itself ? `boosted its own next attack by ${n}` : `boosted ${owned} next ${many ? "attacks" : "attack"} by ${n}`);
      else if (kind === "hinder") clauses.push(each ? `weakened each by ${n}` : `weakened ${owned} next ${many ? "attacks" : "attack"} by ${n}`);
      else clauses.push(each ? "slowed each" : `slowed ${owned} next ${many ? "turns" : "turn"}`);
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

/**
  The banner's own short form, the cause said inside the hit's clause (round 8, item 8): "Crawler A hit Hippochamp for 8
  (weak matchup, cut by 6 by your hinder)". One sentence, so the number is never the part a second sentence pushes off the
  line (round 7, item 6), and the amount cannot be read as a second weakening of anyone. A hit that was cut to nothing
  already says "blocked by your hinder", so it needs no clause. `by` names whose hinder it was.
*/
export function withWeakened(words: string, n: number | undefined, by = "a hinder"): string {
  if (!n) return words;
  const hit = /( for \d+(?:(?:, | and )\d+)*)( \(([^)]*)\))?/;
  const m = hit.exec(words);
  if (!m) return words;
  const many = /(?:, | and )\d/.test(m[1]);
  const cut = `${many ? "each " : ""}cut by ${n} by ${by}`;
  const inner = m[3] ? `${m[3]}, ${cut}` : cut;
  return words.replace(hit, `${m[1]} (${inner})`);
}
export const weakenedWords = (name: string, n: number, by = "a hinder"): string => `${name}'s hit was cut by ${n} by ${by}.`;

/** One line of the Record: a beat's sentence, filed under its sector and round. */
export type RecordEntry = { room: number; round: number; actor: string; words: string; event: PEvent; /** How much the actor's hinder weakened this hit; absent on older saves. */ weakened?: number };

export function recordEntries(room: number, beats: Beat[]): RecordEntry[] {
  return beats.map((b) => ({
    room,
    round: b.round,
    actor: b.actor,
    words: b.weakenedText && !/blocked by/.test(b.words) ? `${b.words} ${b.weakenedText}` : b.words,
    event: b.event,
    ...(b.weakened ? { weakened: b.weakened } : {}),
  }));
}

/** What changed for one unit since the active companion's last turn. */
export type SinceItem = { id: string; name: string; enemy: boolean; text: string; /** The same line with an enemy by its letter alone, for the banner. */ short: string };
export type SinceView = {
  /** Squad then enemies, the active companion first; only units something happened to. */
  items: SinceItem[];
  /** Net health change per unit id, for the plates' delta chips. */
  deltas: Record<string, number>;
  /** The banner's line: as many whole items as fit, then "+N more" for the rest. */
  text: string;
};

/**
  How many characters of the summary the banner's two lines hold before "+N more", after the label
  ("Since your last turn") has taken its share of the first line. Enemies are named by their letter
  alone here (the stage shows the letter on each), so more of the summary fits.
*/
const SINCE_BUDGET = 84;

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
  // The blow the active companion itself struck in its last act sits just before the window: a unit that
  // was healed since then would read as an over-heal ("+14" on a full plate) without it, so that damage is
  // counted for such a unit, ahead of the heal (round 7, item 12).
  let ownStart = last;
  while (ownStart > 0 && inRoom[ownStart - 1].actor === v.active.id) ownStart--;
  const ownAct = last >= 0 ? inRoom.slice(ownStart, last + 1) : [];
  type Seen = { lost: number; healed: number; fell: boolean; shieldUp: number; shieldDown: number; boosted: boolean; hindered: boolean; blocked: boolean; weakenedBy: number; boostedBy: string; hinderedBy: string };
  const seen: Record<string, Seen> = {};
  const of = (id: string): Seen => (seen[id] ??= { lost: 0, healed: 0, fell: false, shieldUp: 0, shieldDown: 0, boosted: false, hindered: false, blocked: false, weakenedBy: 0, boostedBy: "", hinderedBy: "" });
  const enemyIds = new Set(v.enemies.map((x) => x.id));
  // Who a mark came from, for the line ("hindered 14 by A", "boosted 12 by itself"): an enemy by its letter.
  const byWhom = (actor: string, target: string) =>
    actor === target ? "itself" : v.enemies.find((x) => x.id === actor)?.letter ?? v.squad.find((x) => x.id === actor)?.name ?? actor;
  for (const { event: e, weakened } of window) {
    if (e.kind === "hit") {
      const u = of(e.target);
      u.lost += e.amount;
      u.shieldDown += e.absorbed;
      if (e.fell) u.fell = true;
      // An enemy's hit that a hinder weakened or blocked outright: said on the enemy, since that is
      // where the player's hinder paid off.
      if (weakened && enemyIds.has(e.actor)) {
        const a = of(e.actor);
        if (e.amount === 0 && e.absorbed === 0) a.blocked = true;
        else a.weakenedBy = weakened;
      }
    } else if (e.kind === "heal") of(e.target).healed += e.amount;
    else if (e.kind === "shield") of(e.target).shieldUp += e.amount;
    else if (e.kind === "boost") {
      const b = of(e.target);
      b.boosted = true;
      b.boostedBy = byWhom(e.actor, e.target);
    } else if (e.kind === "hinder") {
      const h = of(e.target);
      h.hindered = true;
      h.hinderedBy = byWhom(e.actor, e.target);
    }
  }
  for (const [id, c] of Object.entries(seen)) {
    if (!c.healed) continue;
    for (const { event: e } of ownAct) if (e.kind === "hit" && e.target === id) c.lost += e.amount;
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
    if (c.boosted && u.boost > 0) parts.push(`boosted ${u.boost} by ${c.boostedBy}`);
    if (c.hindered && u.hinder > 0) parts.push(`hindered ${u.hinder} by ${c.hinderedBy}`);
    // An enemy's hit the player's hinder cut (round 8, item 8): said as that unit's own hit, with its cause.
    const hit = c.blocked ? "blocked by your hinder" : c.weakenedBy ? `cut by ${c.weakenedBy} by your hinder` : "";
    if (!parts.length && !hit) continue;
    if (c.healed - c.lost) deltas[u.id] = c.healed - c.lost;
    const short = enemy ? (u as EnemyView).letter : name;
    const line = (who: string) => [parts.length ? `${who} ${parts.join(", ")}` : "", hit ? `${who}'s hit ${hit}` : ""].filter(Boolean).join(", ");
    items.push({ id: u.id, name, enemy, text: line(name), short: line(short) });
  }
  let text = "";
  let shown = 0;
  for (const it of items) {
    const next = text ? `${text}; ${it.short}` : it.short;
    if (shown > 0 && next.length > SINCE_BUDGET) break;
    text = next;
    shown++;
  }
  if (shown < items.length) text += ` +${items.length - shown} more`;
  return { items, deltas, text };
}

/* ------------------------------------------------------------------------------------------
   UX pass 2, round 2: arrive, end and rest. Every word and number below comes from the engine
   (the run, its rooms, its levers) or from the Record; nothing is invented.
------------------------------------------------------------------------------------------ */

export type BriefingView = {
  goal: string;
  /** Every sector in order; the last one holds the guardian and the recovery station. */
  sectors: { n: number; name: string; guardian: boolean }[];
  squad: { id: string; name: string; art: string; element: string; hp: number; max: number }[];
  /** The run rules, one plain line each. */
  rules: string[];
};

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** The screen before a new run's first turn: the goal, the sectors, the squad, the run rules. */
export function briefingView(s: TRun): BriefingView {
  const names = roomNamesOf(s);
  const count = names.length;
  return {
    goal: `Clear all ${count} sectors.`,
    sectors: names.map((name, i) => ({ n: i + 1, name, guardian: i === count - 1 })),
    squad: s.team.map((u) => ({ id: u.id, name: u.name, art: u.species, element: u.element, hp: u.hp, max: u.max })),
    rules: [
      "Health carries into the next sector. The run is lost when every companion is down.",
      `You have ${s.revival} ${plural(s.revival, "revive", "revives")} for the run: at camp, a fallen companion returns at half health.`,
      `The last sector has a recovery station: it restores ${RECOVERY_STATION_HP} health to each standing companion when you arrive.`,
      `Each sector cleared adds practice XP (${ENCOUNTER_XP}, and ${FINAL_ENCOUNTER_XP} for the Guardian). It is a running tally; nothing spends it yet.`,
    ],
  };
}

/** What the camp offers, from the engine's own numbers. */
export type CampView = {
  /** One per fallen companion while a revive is left. `to` is the engine's half health. */
  revives: { id: string; name: string; to: number; text: string }[];
  /** Said under Continue when a revive is being left unused; null otherwise. On the last camp it
      names who sits out the Guardian's fight. */
  unusedNote: string | null;
  /** The recovery station ahead, in numbers; null when the next sector has none. */
  station: { amount: number; text: string } | null;
  /** The camp before the Guardian's sector: the last one. */
  last: boolean;
  /** The camp's eyebrow: "Sector cleared", or "Last camp before the Guardian". */
  eyebrow: string;
  /** The sector ahead: its name and its enemies (by name, counted; their letters are dealt on arrival). */
  next: { n: number; name: string; guardian: boolean; enemies: { name: string; count: number; element: string }[] } | null;
};

/** The revive button's words: the effect in numbers and how many revives are left. */
export function reviveWords(name: string, to: number): string {
  return `Revive ${name} to ${to} health`;
}

/** The camp's count of revives, said once above the buttons (every revive shares it). */
export function revivesLeftWords(left: number): string {
  return `${left} ${plural(left, "revive", "revives")} left.`;
}

/** The line after a revive: what happened and that it is spent. */
export function revivedWords(name: string, to: number, left: number): string {
  return `${name} revived to ${to} health. ${left > 0 ? `${left} ${plural(left, "revive", "revives")} left.` : "No revives left."}`;
}

export function campView(s: TRun): CampView {
  const fallen = s.team.filter((u) => u.hp <= 0);
  const revives =
    s.revival > 0
      ? fallen.map((u) => {
          const to = Math.ceil(u.max / 2);
          return { id: u.id, name: u.name, to, text: reviveWords(u.name, to) };
        })
      : [];
  const rooms = roomsFor(s.rules);
  const beforeLast = s.room === rooms.length - 2;
  const sitOut = joinWords(revives.map((r) => r.name));
  const ahead = rooms[s.room + 1];
  const enemies: { name: string; count: number; element: string }[] = [];
  for (const row of ahead?.enemies ?? []) {
    const f = enemyFighter(String(row[0]), String(row[1]), 1, s.rules);
    const seen = enemies.find((e) => e.name === f.name);
    if (seen) seen.count++;
    else enemies.push({ name: f.name, count: 1, element: f.element });
  }
  return {
    next: ahead ? { n: s.room + 2, name: bareRoomName(ahead.name), guardian: s.room + 1 === rooms.length - 1, enemies } : null,
    revives,
    last: beforeLast,
    eyebrow: beforeLast ? "Last camp before the Guardian" : "Sector cleared",
    unusedNote: revives.length
      ? beforeLast
        ? `Continuing leaves the revive unused: ${sitOut} ${revives.length > 1 ? "sit" : "sits"} out the Guardian's fight.`
        : "Continuing leaves the revive unused."
      : null,
    station: beforeLast
      ? {
          amount: RECOVERY_STATION_HP,
          text: `The next sector has a recovery station: it restores ${RECOVERY_STATION_HP} health to each standing companion.`,
        }
      : null,
  };
}

/** Health the recovery station gave on arrival, per companion, and the banner line for it. */
export function stationHeal(before: TRun, after: TRun): { deltas: Record<string, number>; text: string } | null {
  if (after.room === before.room || after.room !== roomsFor(after.rules).length - 1) return null;
  const deltas: Record<string, number> = {};
  const parts: string[] = [];
  for (const u of after.team) {
    const was = before.team.find((b) => b.id === u.id);
    if (!was || was.hp <= 0) continue;
    const gain = u.hp - was.hp;
    if (gain > 0) {
      deltas[u.id] = gain;
      parts.push(`${u.name} +${gain}`);
    }
  }
  return parts.length ? { deltas, text: `Recovery station: ${parts.join(", ")} health.` } : null;
}

/** The card held over the stage on entering a sector. */
export type TitleCard = {
  kicker: string;
  name: string;
  guardian: boolean;
  enemies: { letter: string; name: string }[];
  /** The recovery station's effect on arrival, when it played. */
  note: string | null;
};

export function titleCard(v: TurnView, note: string | null = null): TitleCard {
  return {
    kicker: `Sector ${v.room + 1} of ${v.roomCount}`,
    name: v.roomName,
    guardian: v.room === v.roomCount - 1,
    enemies: v.enemies.map((e) => ({ letter: e.letter, name: e.name })),
    note,
  };
}

/** How long the stage holds after a command's last beat, and what it says over the stage. */
export type Hold = { kind: "cleared" | "boss" | "fallen"; text: string; ms: number };

/**
  A sector's last enemy falling holds the stage on "Sector cleared" before the camp; the boss's fall
  and the last companion's fall hold longer before the report. Null when the fight goes on.
*/
export function knockoutHold(next: TRun): Hold | null {
  if (next.phase === "camp") return { kind: "cleared", text: "Sector cleared", ms: 1500 };
  if (next.phase === "won") return { kind: "boss", text: "Guardian down", ms: 2600 };
  if (next.phase === "lost") return { kind: "fallen", text: "The squad has fallen", ms: 2600 };
  return null;
}

/** Does any beat of this moment knock a unit out? */
export const beatsFell = (beats: Beat[]): boolean => beats.some((b) => b.event.kind === "hit" && b.event.fell);

export type RunSummary = {
  sectors: number;
  rounds: number;
  knockouts: number;
  xp: number;
  /** The enemy (and its move) that dealt the last companion's final blow; null unless the run was lost that way. */
  finalBlow: string | null;
  /** That enemy's health when the run ended ("77 of 168 health left"): how close the run came. */
  finalBlowLeft: string | null;
  rows: { label: string; value: string }[];
};

/**
  The run in numbers. Sectors come from the engine's phase and room; rounds, knockouts and the final
  blow from the Record (rounds are each sector's highest round, added up); XP is the engine's total.
*/
export function runSummary(s: TRun, v: TurnView, record: RecordEntry[]): RunSummary {
  const ending = endingOf(s);
  const count = v.roomCount;
  const sectors = !ending ? v.room : ending.kind === "won" ? count : ending.kind === "withdrew" ? v.room + 1 : v.room;
  const roundsBy: Record<number, number> = {};
  for (const e of record) roundsBy[e.room] = Math.max(roundsBy[e.room] ?? 0, e.round);
  const rounds = Object.values(roundsBy).reduce((a, b) => a + b, 0);
  const squadIds = new Set(s.team.map((u) => u.id));
  let knockouts = 0;
  let blow: RecordEntry | null = null;
  for (const e of record) {
    if (e.event.kind !== "hit" || !e.event.fell) continue;
    if (squadIds.has(e.event.target)) blow = e;
    else knockouts++;
  }
  let finalBlow: string | null = null;
  let finalBlowLeft: string | null = null;
  if (ending?.kind === "lost" && blow) {
    const foe = v.enemies.find((e) => e.id === blow!.actor);
    const move = "move" in blow.event ? (blow.event as { move: string }).move : "";
    if (foe) {
      finalBlow = `${foe.name} ${foe.letter}${move ? `, ${move}` : ""}`;
      finalBlowLeft = `${foe.hp} of ${foe.max} health left`;
    }
  }
  const rows = [
    { label: "Sectors cleared", value: `${sectors} of ${count}` },
    { label: "Rounds played", value: String(rounds) },
    { label: "Enemies knocked out", value: String(knockouts) },
    { label: "XP earned", value: ending?.kind === "won" ? `${s.xp} (+${FINAL_ENCOUNTER_XP} for the Guardian)` : String(s.xp) },
  ];
  if (finalBlow) rows.push({ label: "Final blow", value: `${finalBlow}. ${finalBlowLeft}` });
  return { sectors, rounds, knockouts, xp: s.xp, finalBlow, finalBlowLeft, rows };
}

/* ------------------------------------------------------------------------------------------
   Intents and keys (docs/design/powerworks-intents-and-keys.md). A key shows one power number;
   what it would land on each target is drawn on that target's plate while the key is hovered or
   selected. The numbers are the key's cells (one per legal target), unchanged; only where they
   are drawn moved.
------------------------------------------------------------------------------------------ */

/** What a hovered or selected key would do to one unit, drawn on that unit's plate. */
export type Preview = Cell & {
  /** What lands: an attack's health, a hinder's before and after, or a support's number. */
  kind: "hit" | "hinder" | "heal" | "shield" | "boost" | "delay";
  /** A self or whole-squad key: the key's supports, since it has no cells. */
  chips?: SupportChip[];
};

/**
  Every unit the key would change, by id, with the exact number it would land there. Attack and
  hinder keys read on the enemies they can name (an area key on every enemy at once); a key aimed at
  a squadmate reads on each squadmate it can name; a self or whole-squad key reads on the units it
  reaches (`standingSquad` is every standing companion, the actor included).
*/
export function previewsOf(k: KeyView, activeId: string, standingSquad: string[]): Record<string, Preview> {
  const out: Record<string, Preview> = {};
  if (k.state !== "ready") return out;
  if (k.aim === "now") {
    const ids = k.supports[0]?.all ? standingSquad : [activeId];
    for (const id of ids) out[id] = { target: id, kind: k.supports[0]?.kind ?? "heal", n: k.supports[0]?.n ?? 0, step: 1, immune: false, finishes: false, absorbed: 0, chips: k.supports };
    return out;
  }
  const hinders = k.supports.some((p) => p.kind === "hinder" && p.aim === "enemy");
  for (const c of k.cells) {
    if (k.aim === "ally") out[c.target] = { ...c, kind: k.supports.find((p) => p.aim === "ally")?.kind ?? "heal" };
    else out[c.target] = { ...c, kind: k.kind === "attack" ? "hit" : hinders ? "hinder" : "delay" };
  }
  return out;
}

/**
  How a key is used: "now" (self or whole squad, and an area attack) acts on the key press alone; a
  key with exactly one legal target does too (nothing to choose); otherwise the key arms and the
  target is chosen next.
*/
export function actsOnPress(k: KeyView): boolean {
  return k.aim === "now" || (k.area && k.aim === "enemy") || k.cells.length <= 1;
}

/* ------------------------------------------------------------------------------------------
   One number, one meaning, one place (docs/design/powerworks-one-number-one-meaning.md). A hovered or
   chosen key changes the numbers a plate already carries, before and after, in the row that carries
   them; it never puts a new kind of number somewhere else. These are those changes for one plate.
------------------------------------------------------------------------------------------ */

/** How a previewed key would change one plate's own numbers (the enemy's next-act row is `NextAct`, read through previewThreats). */
export type PlatePreview = {
  /** The health row: `to` below `from` is health lost (the segment between is lit), above is gained; a skull when it reaches 0. */
  health?: { from: number; to: number; skull?: true };
  /** The shield chip in the marks row: a guard on an ally, or what an enemy's shield would absorb first. */
  shield?: { from: number; to: number };
  /** The boost chip in the marks row. */
  boost?: { from: number; to: number };
  /** An attack: the matchup tab on this plate (its multiplier) is what turns the key's number into the lost health. */
  matchup?: true;
};

/**
  What a preview changes on the plate it lands on, from the per-target forecast alone (the cells previewsOf
  carries): an attack takes health (and a shield's share first), a mend gives it, a guard or a boost adds a chip.
  A hinder and a slow change no number on the target's own rows (the hinder is read on the next-act row), so they return null.
*/
export function platePreviewOf(p: Preview | undefined, u: { hp: number; max: number; shield: number; boost: number }): PlatePreview | null {
  if (!p) return null;
  const out: PlatePreview = {};
  if (p.chips) {
    let gain = 0;
    for (const c of p.chips) {
      if (c.kind === "heal") gain += c.n;
      else if (c.kind === "shield") out.shield = { from: u.shield, to: (out.shield?.to ?? u.shield) + c.n };
      else if (c.kind === "boost") out.boost = { from: u.boost, to: (out.boost?.to ?? u.boost) + c.n };
    }
    if (gain > 0 && u.hp < u.max) out.health = { from: u.hp, to: Math.min(u.max, u.hp + gain) };
  } else if (p.kind === "hit") {
    if (p.immune) return { matchup: true };
    if (p.n > 0) out.health = { from: u.hp, to: Math.max(0, u.hp - p.n), ...(p.finishes ? { skull: true as const } : {}) };
    if (p.absorbed > 0) out.shield = { from: u.shield, to: Math.max(0, u.shield - p.absorbed) };
    out.matchup = true;
  } else if (p.kind === "heal") {
    if (p.n > 0) out.health = { from: u.hp, to: Math.min(u.max, u.hp + p.n) };
  } else if (p.kind === "shield") out.shield = { from: u.shield, to: u.shield + p.n };
  else if (p.kind === "boost") out.boost = { from: u.boost, to: u.boost + p.n };
  return Object.keys(out).length ? out : null;
}
