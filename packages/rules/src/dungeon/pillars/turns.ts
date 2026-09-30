/*
  Turn by turn (Nick, 2026-09-29): no whole-squad plan. A timeline decides who acts next; on a
  companion's turn the player chooses that one action against the board as it stands, it
  resolves, and the timeline moves on, enemies acting on their own turns. It replaces the
  workshop's whole-squad planning (2026-09-14) and makes hidden enemy orders moot: an enemy
  chooses when its turn comes.

    - timeline "round": every unit acts once per round, fastest first (ties to the squad, then
      row order). "speed": a unit's next turn comes TIMELINE_SCALE / (SPEED_BASE + speed) after its last, so a
      faster unit acts more often and can act twice before a slow one acts once.
    - Rests count the unit's own turns; a shield ends at its caster's next turn; boost and hinder
      are used by the unit's next attack; the turn-order layer (rules.tempo) lets tempo statuses
      and pulls push the target's next turn back.
  Everything else is the pillar engine's (engine.ts): the same reading, matchups, supports.
*/
import type { CreatureRecord } from "@xalians/content/creature";
import { checkSquad, squadUnits, unitIds, type Squad } from "../index.ts";
import { readCompanion, type Unit } from "../reading.ts";
import {
  DEFAULT_RULES,
  clone,
  enemyChoice,
  enemyFighter,
  fighter,
  foesOf,
  legalMoves,
  legalTargets,
  random,
  ready,
  roomsFor,
  standing,
  strike,
  support,
  type Fighter,
  type Order,
  type PEvent,
  type Rules,
} from "./engine.ts";
import { ENCOUNTER_XP, FINAL_ENCOUNTER_XP, RECOVERY_STATION_HP, SPEED_BASE, STALL_TURNS_PER_UNIT, TIMELINE_SCALE } from "./levers.ts";

export type TPhase = "turn" | "camp" | "won" | "lost" | "retreated";
export type TRun = {
  seed: number;
  rng: number;
  rules: Rules;
  squad: Squad;
  room: number;
  team: Fighter[];
  enemies: Fighter[];
  /** When each unit acts next, on the timeline. */
  clock: Record<string, number>;
  /** The companion whose turn it is; null outside a fight. */
  active: string | null;
  phase: TPhase;
  turns: number;
  stalled: number;
  revival: number;
  xp: number;
  log: string[];
};
export type TCommand = { kind: "act"; order: Order } | { kind: "advance" } | { kind: "revive"; id: string } | { kind: "retreat" };

const all = (s: TRun) => [...s.team, ...s.enemies];
/** How far a unit's next turn is from its last. */
export function interval(s: Pick<TRun, "rules">, u: Fighter): number {
  return s.rules.timeline === "speed" ? TIMELINE_SCALE / (SPEED_BASE + Math.max(1, u.speed)) : 1;
}
/** Timeline order key: earlier first, then the squad, then row order. */
function key(s: TRun, u: Fighter): [number, number, number] {
  const row = u.enemy ? s.enemies : s.team;
  return [s.clock[u.id], u.enemy ? 1 : 0, row.indexOf(u)];
}
function earlier(a: [number, number, number], b: [number, number, number]) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}
/** Who acts next. */
function nextActor(s: TRun): Fighter | undefined {
  return standing(all(s)).sort((a, b) => earlier(key(s, a), key(s, b)))[0];
}
/** The next n turns as the timeline stands (the screen's strip; the sim's "before my next turn"). */
export function upcoming(s: TRun, n: number): Fighter[] {
  const clock = { ...s.clock };
  const out: Fighter[] = [];
  const units = standing(all(s));
  for (let k = 0; k < n && units.length; k++) {
    const u = units.sort((a, b) => earlier([clock[a.id], a.enemy ? 1 : 0, 0], [clock[b.id], b.enemy ? 1 : 0, 0]))[0];
    out.push(u);
    clock[u.id] += interval(s, u);
  }
  return out;
}
/** Does t act before u's next turn after this one? */
export function actsBeforeMyNext(s: TRun, u: Fighter, t: Fighter): boolean {
  return s.clock[t.id] < s.clock[u.id] + interval(s, u);
}

function seatClocks(s: TRun) {
  s.clock = {};
  if (s.rules.timeline === "speed") {
    for (const u of all(s)) s.clock[u.id] = interval(s, u);
    return;
  }
  // Round timeline: once per round, fastest first.
  const order = standing(all(s)).sort((a, b) => b.speed - a.speed || (a.enemy ? 1 : 0) - (b.enemy ? 1 : 0));
  order.forEach((u, k) => (s.clock[u.id] = (k + 1) / (order.length + 1)));
}
function enter(s: TRun) {
  s.phase = "turn";
  s.turns = 0;
  s.stalled = 0;
  for (const u of s.team) {
    u.cooldowns = u.moves.map(() => 0);
    u.signatureSpent = false;
    u.shields = [];
    u.boost = 0;
    u.hinder = 0;
    u.delay = 0;
  }
  s.enemies = roomsFor(s.rules)[s.room].enemies.map((row) =>
    enemyFighter(String(row[0]), String(row[1]), Math.round(Number(row[2]) * s.rules.enemyHpFactor), s.rules)
  );
  for (const row of [s.team, s.enemies])
    for (let i = row.length - 1; i > 0; i--) {
      const j = Math.floor(random(s) * (i + 1));
      [row[i], row[j]] = [row[j], row[i]];
    }
  seatClocks(s);
  s.log.push(`Entered ${roomsFor(s.rules)[s.room].name}.`);
}
function startRun(seed: number, squad: Squad, units: Unit[], rules: Rules): { state: TRun; events: PEvent[] } {
  const s: TRun = {
    seed: seed >>> 0,
    rng: seed >>> 0,
    rules,
    squad,
    room: 0,
    team: units.map((u) => fighter(u, rules)),
    enemies: [],
    clock: {},
    active: null,
    phase: "turn",
    turns: 0,
    stalled: 0,
    revival: 1,
    xp: 0,
    log: [],
  };
  enter(s);
  const events: PEvent[] = [];
  run(s, events);
  return { state: s, events };
}
export function createTurnRun(seed = 1, squad: Squad = "starter", rules: Rules = { ...DEFAULT_RULES, timeline: "round" }): { state: TRun; events: PEvent[] } {
  const picked = checkSquad(squad);
  return startRun(seed, picked, squadUnits(seed >>> 0, picked), rules);
}
/**
  A run for an explicit list of creature records (the measuring tools: sample creatures, mixed
  squads). Same reading, same rules; only the source of the squad differs. Its `squad` field is
  the "starter" placeholder, so such a run is a measuring run, never a saved one.
*/
export function createTurnRunFrom(seed: number, records: readonly CreatureRecord[], rules: Rules = { ...DEFAULT_RULES, timeline: "round" }): { state: TRun; events: PEvent[] } {
  const ids = unitIds(records.map((r) => r.species));
  return startRun(seed, "starter", records.map((r, i) => readCompanion(r, ids[i])), rules);
}

/** One unit's action: the order resolves, then its next turn is placed on the timeline. */
function act(s: TRun, u: Fighter, q: Order | null, emit: (e: PEvent) => void) {
  const before = all(s).map((x) => x.hp);
  for (const t of all(s)) t.shields = t.shields.filter((sh) => sh.from !== u.id);
  if (!q || q.move < 0) emit({ kind: "pass", actor: u.id });
  else {
    const m = u.moves[q.move];
    const target = all(s).find((t) => t.id === q.target)!;
    if (m.power > 0) {
      for (const t of m.area ? standing(foesOf(s, u)) : [target]) strike(u, m, t, emit);
      u.boost = 0;
      u.hinder = 0;
    }
    for (const p of m.parts) support(s, u, m, p, target, emit);
    u.cooldowns[q.move] = m.rests + 1;
    if (m.signature) u.signatureSpent = true;
  }
  s.clock[u.id] += interval(s, u);
  for (const t of all(s))
    if (t.delay) {
      s.clock[t.id] += (t.delay / 100) * interval(s, t);
      t.delay = 0;
    }
  s.turns++;
  s.stalled = all(s).some((x, k) => x.hp < before[k]) ? 0 : s.stalled + 1;
}
/** Play enemy turns until a companion's turn or the encounter's end. */
function run(s: TRun, events: PEvent[]) {
  const emit = (e: PEvent) => events.push(e);
  s.active = null;
  for (let guard = 0; guard < 500; guard++) {
    if (!standing(s.team).length) {
      s.phase = "lost";
      s.log.push("The squad has fallen.");
      return;
    }
    if (!standing(s.enemies).length) {
      const last = roomsFor(s.rules).length - 1;
      const xp = s.room === last ? FINAL_ENCOUNTER_XP : ENCOUNTER_XP;
      s.xp += xp;
      s.phase = s.room === last ? "won" : "camp";
      s.log.push(`Encounter cleared. +${xp} practice XP.`);
      return;
    }
    if (s.stalled >= STALL_TURNS_PER_UNIT * standing(all(s)).length) {
      s.phase = "retreated";
      s.log.push("The fight stalled: the squad is forced out.");
      return;
    }
    const u = nextActor(s)!;
    // Rests count the unit's own turns.
    u.cooldowns = u.cooldowns.map((c) => Math.max(0, c - 1));
    if (!u.enemy) {
      s.active = u.id;
      return;
    }
    act(s, u, enemyChoice(s, u), emit);
  }
}
/** Is this order legal for the companion whose turn it is? */
export function legalOrder(s: TRun, q: Order): boolean {
  const u = s.team.find((t) => t.id === s.active);
  if (!u) return false;
  return q.move === -2 || (ready(u, q.move) && legalTargets(s, u, q.move).some((t) => t.id === q.target));
}
export function turnCommand(previous: TRun, c: TCommand): { state: TRun; events: PEvent[] } {
  const s = clone(previous);
  const events: PEvent[] = [];
  if (c.kind === "act") {
    if (s.phase !== "turn" || !s.active) throw new Error("It is not a companion's turn.");
    if (!legalOrder(s, c.order)) throw new Error("Choose a legal move and target.");
    act(s, s.team.find((t) => t.id === s.active)!, c.order, (e) => events.push(e));
    run(s, events);
    return { state: s, events };
  }
  if (s.phase !== "camp") throw new Error("This action is available between encounters.");
  if (c.kind === "revive") {
    const u = s.team.find((t) => t.id === c.id);
    if (!u || u.hp > 0 || !s.revival) throw new Error("Revival is unavailable.");
    u.hp = Math.ceil(u.max / 2);
    s.revival = 0;
  } else if (c.kind === "retreat") s.phase = "retreated";
  else {
    s.room++;
    if (s.room === roomsFor(s.rules).length - 1) for (const u of standing(s.team)) u.hp = Math.min(u.max, u.hp + RECOVERY_STATION_HP);
    enter(s);
    run(s, events);
  }
  return { state: s, events };
}
/** The active companion, for players and the screen. */
export const activeOf = (s: TRun) => s.team.find((t) => t.id === s.active) ?? null;
export { legalMoves, legalTargets };

/**
  1-based round of the encounter. Clocks are seated at k/(n+1) at encounter start (seatClocks)
  and each unit's clock rises by its own interval per own turn (1 on the round timeline), so the
  round is floor(the smallest clock among standing units) + 1. On the speed timeline a "round" is
  not a seated concept (units act at different rates), so this is a turns-based best effort: the
  fewest turns any standing unit has taken, plus 1.
*/
export function roundOf(s: TRun): number {
  const units = standing(all(s));
  if (!units.length) return 1;
  if (s.rules.timeline === "speed") return Math.floor(Math.min(...units.map((u) => s.clock[u.id] / interval(s, u))) - 1) + 1;
  return Math.floor(Math.min(...units.map((u) => s.clock[u.id]))) + 1;
}
/**
  Every unit of this round (team and enemies, fallen included) in timeline order: the fractional
  part of its seated clock, which is the seated speed order and fixed for the fight (see
  seatClocks). done: it has acted this round already (its clock has risen past the round). Fallen
  units keep their slot so the strip does not reshuffle when someone falls.

  On the speed timeline there is no shared round to slot into, so this falls back to the next few
  turns as the timeline actually stands (`upcoming`), none of them marked done.
*/
export function roundStrip(s: TRun): { unit: Fighter; done: boolean }[] {
  if (s.rules.timeline === "speed") return upcoming(s, 8).map((unit) => ({ unit, done: false }));
  const round = roundOf(s);
  return all(s)
    .sort((a, b) => (s.clock[a.id] % 1) - (s.clock[b.id] % 1))
    .map((unit) => ({ unit, done: unit.hp <= 0 ? false : s.clock[unit.id] >= round }));
}
