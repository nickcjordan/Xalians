/*
  Powerworks on the pillars (docs/design/powerworks-pillars.md): one resolver for both sides.

    - Element both ways: an attack's damage on a target is floor(power x step), the step read
      from the shared chart (typeEffectivenessMatrix.json); physical attacks are x1.
    - Supports in health: Heal N now; Shield N absorbs the next N damage and holds until used
      or until its caster's next turn; Boost +N on the ally's next attack; Hinder -N on the
      enemy's next attack, next round if it has already struck.
    - Speed is turn order and nothing else: fastest first, ties to the squad, then row order.
    - Enemy orders are hidden (chosen at the start of the round from the run's rng).
    - An attack whose target has already fallen goes to the next standing enemy in the row.
    - Rests and the once-per-fight signature.
  The run structure (four chambers, persistent health, one revival, the recovery station,
  practice XP, the stalemate rule) is the prototype's.
*/
import cards from "../cards.json";
import roles from "./roles.json";
import chart from "@xalians/content/typeEffectivenessMatrix.json";
import { readCard, type Card, type Unit } from "../reading.ts";
import { checkSquad, squadUnits, type Squad } from "../index.ts";
import {
  ALL_SUPPORT_FACTOR,
  ELEMENT_SOURCE,
  ENCOUNTER_XP,
  ENEMY_HP_FACTOR,
  ENEMY_SHIELD_BELOW,
  ENEMY_NOISE,
  FINAL_ENCOUNTER_XP,
  RECOVERY_STATION_HP,
  SIGNATURE_ONCE,
  STALL_ROUNDS,
  TARGET_SIZE_WEIGHT,
  UNIFORM_POWER,
} from "./levers.ts";
import { readMoves, type PMove, type Part, type Rules } from "./read.ts";

export type { PMove, Part, Rules } from "./read.ts";
export const DEFAULT_RULES: Rules = { elementSource: ELEMENT_SOURCE, uniformPower: UNIFORM_POWER, enemyHpFactor: ENEMY_HP_FACTOR };

export type Fighter = {
  id: string;
  name: string;
  species: string;
  element: string;
  enemy: boolean;
  hp: number;
  max: number;
  speed: number;
  moves: PMove[];
  /** Rounds left before each move is ready again (0: ready). */
  cooldowns: number[];
  signatureSpent: boolean;
  /** Shields on this unit: each absorbs damage until used or until its caster's next turn. */
  shields: { n: number; from: string }[];
  /** Added to this unit's next attack. */
  boost: number;
  /** Taken from this unit's next attack. */
  hinder: number;
  /** Turn-by-turn: a pending push of this unit's next turn, as a percent of its interval. */
  delay?: number;
};
export type Order = { move: number; target: string };
export type Phase = "planning" | "camp" | "won" | "lost" | "retreated";
export type PRun = {
  seed: number;
  rng: number;
  rules: Rules;
  squad: Squad;
  room: number;
  round: number;
  team: Fighter[];
  enemies: Fighter[];
  /** The enemies' hidden orders for this round. */
  orders: Record<string, Order>;
  phase: Phase;
  stalled: number;
  revival: number;
  xp: number;
  log: string[];
};
export type PEvent =
  | { kind: "hit"; actor: string; target: string; move: string; amount: number; absorbed: number; step: number; fell: boolean }
  | { kind: "heal" | "shield" | "boost" | "hinder" | "delay"; actor: string; target: string; move: string; amount: number }
  | { kind: "redirect"; actor: string; from: string; to: string }
  | { kind: "pass"; actor: string }
  | { kind: "lapsed"; actor: string; move: string };
export type PCommand = { kind: "round"; orders: Record<string, Order> } | { kind: "advance" } | { kind: "revive"; id: string } | { kind: "retreat" };

const NAMES: Record<string, string> = {
  crawler: "Maintenance crawler",
  drone: "Security drone",
  shield: "Shield unit",
  discharge: "Discharge unit",
  guardian: "Central guardian",
};
export const ROOMS = cards.rooms;
export const roomsFor = (rules: Rules) => (rules.rooms === "roles" ? roles.rooms.roles : cards.rooms);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const standing = (units: Fighter[]) => units.filter((u) => u.hp > 0);
export const clone = <T>(v: T): T => structuredClone(v);

/** The shared chart's step for an attack's element against a unit's element; physical is 1. */
export function step(attack: string | null, defend: string): number {
  if (!attack) return 1;
  return (chart as Record<string, Record<string, number>>)[cap(attack)]?.[cap(defend)] ?? 1;
}
export function random(s: { rng: number }) {
  s.rng = (Math.imul(1664525, s.rng) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
export function fighter(u: Unit, rules: Rules): Fighter {
  const moves = readMoves(u, rules);
  return {
    id: u.id,
    name: u.name,
    species: u.species,
    element: u.element,
    enemy: u.enemy,
    hp: u.hp,
    max: u.max,
    speed: u.speed,
    moves,
    cooldowns: moves.map(() => 0),
    signatureSpent: false,
    shields: [],
    boost: 0,
    hinder: 0,
  };
}
export function enemyFighter(species: string, id: string, hp: number, rules: Rules): Fighter {
  const card = ((cards.templates as Record<string, unknown>)[species] ?? (roles.templates as Record<string, unknown>)[species]) as Card;
  const name = NAMES[species] ?? (roles.names as Record<string, string>)[species] ?? species;
  return fighter(readCard(card, species, id, name, hp), rules);
}

/** Can this move be used now (ready, signature unspent, does something)? */
export function ready(u: Fighter, i: number): boolean {
  const m = u.moves[i];
  return u.hp > 0 && u.cooldowns[i] === 0 && !(SIGNATURE_ONCE && m.signature && u.signatureSpent) && (m.power > 0 || m.parts.length > 0);
}
export function legalMoves(u: Fighter): number[] {
  return u.moves.map((_, i) => i).filter((i) => ready(u, i));
}
export const foesOf = (s: Pick<PRun, "team" | "enemies">, u: Fighter) => (u.enemy ? s.team : s.enemies);
export const matesOf = (s: Pick<PRun, "team" | "enemies">, u: Fighter) => (u.enemy ? s.enemies : s.team);
/** Whom an order for move i may name: a standing foe when the move attacks or hinders, a squadmate for a helping move, the user for a move that only acts on itself. */
export function legalTargets(s: Pick<PRun, "team" | "enemies">, u: Fighter, i: number): Fighter[] {
  const m = u.moves[i];
  if (!m || u.hp <= 0) return [];
  if (m.power > 0 || m.parts.some((p) => p.aim === "enemy")) return standing(foesOf(s, u));
  if (m.parts.some((p) => p.aim === "ally")) {
    const mates = standing(matesOf(s, u)).filter((t) => t.id !== u.id);
    return mates.length ? mates : [u];
  }
  return [u];
}
/** Turn order: speed alone, fastest first, ties to the squad and then row order. Fixed for the fight, because nothing changes speed. */
export function turnOrder(s: PRun): Fighter[] {
  const all = [...s.team.map((u, i) => ({ u, k: i })), ...s.enemies.map((u, i) => ({ u, k: 100 + i }))];
  return all
    .filter((x) => x.u.hp > 0)
    .sort((a, b) => b.u.speed - a.u.speed || a.k - b.k)
    .map((x) => x.u);
}
/** What an attack deals to one target before shields: 0 on an immune matchup, otherwise floor(power x step) plus the user's boost less its hinder. */
export function attackOn(u: Fighter, m: PMove, t: Fighter): number {
  if (m.power <= 0) return 0;
  const x = step(m.element, t.element);
  if (x === 0) return 0;
  return Math.max(0, Math.floor(m.power * x) + u.boost - u.hinder);
}
/** Health the target would lose: the attack less the shields it carries. */
export function landedOn(u: Fighter, m: PMove, t: Fighter): number {
  const shield = t.shields.reduce((a, b) => a + b.n, 0);
  return Math.min(t.hp, Math.max(0, attackOn(u, m, t) - shield));
}
/** Does u act before t this round? */
export function actsBefore(s: PRun, u: Fighter, t: Fighter): boolean {
  const order = turnOrder(s);
  return order.findIndex((x) => x.id === u.id) < order.findIndex((x) => x.id === t.id);
}

export function pickTarget(s: { rng: number }, foes: Fighter[]): Fighter {
  const roll = random(s);
  if (!TARGET_SIZE_WEIGHT) return foes[Math.floor(roll * foes.length)];
  const weights = foes.map((f) => Math.pow(f.max, TARGET_SIZE_WEIGHT));
  let left = roll * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < foes.length; i++) if ((left -= weights[i]) < 0) return foes[i];
  return foes[foes.length - 1];
}
/**
  The enemies' hidden orders. Each standing enemy weighs its ready moves in health, as the
  squad's planner does: an attack by what it deals to the companion it picks (by size); a heal
  by the health its most hurt ally is missing; a shield by the blow it may keep off its most
  hurt ally; a boost by what it adds to its hardest-hitting ally; a hinder by what it takes off
  the hardest-hitting companion. A little noise from the run rng keeps it from being a script.
*/
function prepare(s: PRun) {
  s.orders = {};
  for (const u of standing(s.enemies)) {
    const o = enemyChoice(s, u);
    if (o) s.orders[u.id] = o;
  }
}
/** One enemy's choice for its next action, weighed in health against the board as it stands. */
export function enemyChoice(s: Pick<PRun, "team" | "enemies" | "rng">, u: Fighter): Order | null {
  const team = standing(s.team);
  const allies = standing(s.enemies);
  const hurt = [...allies].sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
  const hitter = [...allies].sort((a, b) => Math.max(...b.moves.map((m) => m.power)) - Math.max(...a.moves.map((m) => m.power)))[0];
  const threat = [...team].sort((a, b) => Math.max(...b.moves.map((m) => m.power)) - Math.max(...a.moves.map((m) => m.power)))[0];
  const pick = team.length ? pickTarget(s, team) : undefined;
  let best: { move: number; target: string; v: number } | null = null;
  for (const i of legalMoves(u)) {
    const m = u.moves[i];
    let v = 0;
    let target = pick?.id ?? u.id;
    if (m.power > 0 && pick) v += Math.floor(m.power * step(m.element, pick.element));
    for (const p of m.parts) {
      if (p.kind === "heal") {
        const t = p.aim === "self" ? u : hurt;
        v += Math.min(p.n, t.max - t.hp);
        if (!m.power && p.aim !== "self") target = t.id;
      } else if (p.kind === "shield") {
        const t = p.aim === "self" ? u : hurt;
        v += t.hp < t.max * ENEMY_SHIELD_BELOW ? p.n : p.n * 0.4;
        if (!m.power && p.aim !== "self") target = t.id;
      } else if (p.kind === "boost") {
        const t = p.aim === "self" ? u : hitter;
        v += t.id === u.id ? p.n * 0.5 : p.n * 0.8;
        if (!m.power && p.aim !== "self") target = t.id;
      } else if ((p.kind === "hinder" || p.kind === "delay") && threat) {
        v += Math.min(p.n, Math.max(...threat.moves.map((x) => x.power))) * 0.8;
        if (!m.power) target = threat.id;
      }
    }
    v *= 1 - ENEMY_NOISE / 2 + ENEMY_NOISE * random(s);
    if (!legalTargets(s, u, i).some((t) => t.id === target)) target = legalTargets(s, u, i)[0]?.id ?? u.id;
    if (!best || v > best.v) best = { move: i, target, v };
  }
  return best ? { move: best.move, target: best.target } : null;
}
function enter(s: PRun) {
  s.round = 1;
  s.stalled = 0;
  s.phase = "planning";
  for (const u of s.team) {
    u.cooldowns = u.moves.map(() => 0);
    u.signatureSpent = false;
    u.shields = [];
    u.boost = 0;
    u.hinder = 0;
  }
  s.enemies = roomsFor(s.rules)[s.room].enemies.map((row) =>
    enemyFighter(String(row[0]), String(row[1]), Math.round(Number(row[2]) * s.rules.enemyHpFactor), s.rules)
  );
  for (const row of [s.team, s.enemies])
    for (let i = row.length - 1; i > 0; i--) {
      const j = Math.floor(random(s) * (i + 1));
      [row[i], row[j]] = [row[j], row[i]];
    }
  s.log.push(`Entered ${roomsFor(s.rules)[s.room].name}.`);
  prepare(s);
}
export function createPillarRun(seed = 1, squad: Squad = "starter", rules: Rules = DEFAULT_RULES): PRun {
  const picked = checkSquad(squad);
  const s: PRun = {
    seed: seed >>> 0,
    rng: seed >>> 0,
    rules,
    squad: picked,
    room: 0,
    round: 1,
    team: squadUnits(seed >>> 0, picked).map((u) => fighter(u, rules)),
    enemies: [],
    orders: {},
    phase: "planning",
    stalled: 0,
    revival: 1,
    xp: 0,
    log: [],
  };
  enter(s);
  return s;
}

/** Give one support part to its recipients. */
export function support(s: Pick<PRun, "team" | "enemies">, u: Fighter, m: PMove, p: Part, target: Fighter, emit: (e: PEvent) => void) {
  const n = p.all ? Math.max(1, Math.floor(p.n * ALL_SUPPORT_FACTOR)) : p.n;
  const pool = p.aim === "enemy" ? standing(foesOf(s, u)) : standing(matesOf(s, u));
  const to = p.aim === "self" ? [u] : p.all ? pool : [p.aim === "enemy" ? target : target.enemy === u.enemy ? target : u];
  for (const t of to) {
    if (t.hp <= 0) continue;
    if (p.kind === "heal") {
      const healed = Math.min(n, t.max - t.hp);
      t.hp += healed;
      emit({ kind: "heal", actor: u.id, target: t.id, move: m.name, amount: healed });
    } else if (p.kind === "shield") {
      t.shields.push({ n, from: u.id });
      emit({ kind: "shield", actor: u.id, target: t.id, move: m.name, amount: n });
    } else if (p.kind === "boost") {
      t.boost = Math.max(t.boost, n);
      emit({ kind: "boost", actor: u.id, target: t.id, move: m.name, amount: n });
    } else if (p.kind === "delay") {
      t.delay = Math.max(t.delay ?? 0, p.n);
      emit({ kind: "delay", actor: u.id, target: t.id, move: m.name, amount: p.n });
    } else {
      t.hinder = Math.max(t.hinder, n);
      emit({ kind: "hinder", actor: u.id, target: t.id, move: m.name, amount: n });
    }
  }
}
/** One attack on one target: shields absorb first, then health. */
export function strike(u: Fighter, m: PMove, t: Fighter, emit: (e: PEvent) => void) {
  let amount = attackOn(u, m, t);
  let absorbed = 0;
  for (const sh of t.shields) {
    const take = Math.min(sh.n, amount - absorbed);
    sh.n -= take;
    absorbed += take;
  }
  t.shields = t.shields.filter((sh) => sh.n > 0);
  const lost = Math.min(t.hp, amount - absorbed);
  t.hp -= lost;
  emit({ kind: "hit", actor: u.id, target: t.id, move: m.name, amount: lost, absorbed, step: step(m.element, t.element), fell: t.hp <= 0 });
}
/** The next standing unit in the row after one that fell, wrapping. */
function nextStanding(row: Fighter[], from: string): Fighter | undefined {
  const i = row.findIndex((u) => u.id === from);
  for (let k = 1; k <= row.length; k++) {
    const u = row[(i + k) % row.length];
    if (u.hp > 0) return u;
  }
  return undefined;
}

export function resolvePillarRound(previous: PRun, orders: Record<string, Order>): { state: PRun; events: PEvent[] } {
  if (previous.phase !== "planning") throw new Error("This encounter is not accepting orders.");
  // Every standing companion needs an order: a ready move and a target it may name, or a pass (-2).
  for (const u of standing(previous.team)) {
    const q = orders[u.id];
    const ok = q && (q.move === -2 || (ready(u, q.move) && legalTargets(previous, u, q.move).some((t) => t.id === q.target)));
    if (!ok) throw new Error(`Choose a legal move and target for ${u.name}.`);
  }
  const s = clone(previous);
  const events: PEvent[] = [];
  const emit = (e: PEvent) => events.push(e);
  const before = [...s.team, ...s.enemies].map((u) => u.hp);
  const all = { ...orders, ...s.orders };
  for (const u of turnOrder(s)) {
    if (u.hp <= 0) continue;
    // A shield holds until used or until its caster's next turn.
    for (const t of [...s.team, ...s.enemies]) t.shields = t.shields.filter((sh) => sh.from !== u.id);
    const q = all[u.id];
    if (!q || q.move < 0) {
      emit({ kind: "pass", actor: u.id });
      continue;
    }
    const m = u.moves[q.move];
    const foes = foesOf(s, u);
    let target = [...s.team, ...s.enemies].find((t) => t.id === q.target)!;
    if (target.hp <= 0) {
      if (target.enemy !== u.enemy) {
        const next = u.enemy ? pickTarget(s, standing(foes)) : nextStanding(foes, target.id);
        if (!next) continue;
        emit({ kind: "redirect", actor: u.id, from: target.id, to: next.id });
        target = next;
      } else {
        emit({ kind: "lapsed", actor: u.id, move: m.name });
        continue;
      }
    }
    if (m.power > 0) {
      for (const t of m.area ? standing(foes) : [target]) strike(u, m, t, emit);
      u.boost = 0;
      u.hinder = 0;
    }
    for (const p of m.parts) support(s, u, m, p, target, emit);
    u.cooldowns[q.move] = m.rests + 1;
    if (m.signature) u.signatureSpent = true;
  }
  for (const u of [...s.team, ...s.enemies]) u.cooldowns = u.cooldowns.map((c) => Math.max(0, c - 1));
  const after = [...s.team, ...s.enemies].map((u) => u.hp);
  const progress = before.some((hp, i) => after[i] < hp);
  if (!standing(s.team).length) {
    s.phase = "lost";
    s.log.push("The squad has fallen.");
  } else if (!standing(s.enemies).length) {
    const last = roomsFor(s.rules).length - 1;
    const xp = s.room === last ? FINAL_ENCOUNTER_XP : ENCOUNTER_XP;
    s.xp += xp;
    s.phase = s.room === last ? "won" : "camp";
    s.log.push(`Encounter cleared. +${xp} practice XP.`);
  } else if ((s.stalled = progress ? 0 : s.stalled + 1) >= STALL_ROUNDS) {
    s.phase = "retreated";
    s.log.push(`${STALL_ROUNDS} rounds without progress: the squad is forced out.`);
  } else {
    s.round++;
    prepare(s);
  }
  return { state: s, events };
}

export function pillarCommand(previous: PRun, c: PCommand): PRun {
  if (c.kind === "round") return resolvePillarRound(previous, c.orders).state;
  const s = clone(previous);
  if (s.phase !== "camp") throw new Error("This action is available between encounters.");
  if (c.kind === "revive") {
    const u = s.team.find((t) => t.id === c.id);
    if (!u || u.hp > 0 || !s.revival) throw new Error("Revival is unavailable.");
    u.hp = Math.ceil(u.max / 2);
    s.revival = 0;
  } else if (c.kind === "retreat") {
    s.phase = "retreated";
  } else {
    s.room++;
    if (s.room === roomsFor(s.rules).length - 1) for (const u of standing(s.team)) u.hp = Math.min(u.max, u.hp + RECOVERY_STATION_HP);
    enter(s);
  }
  return s;
}
