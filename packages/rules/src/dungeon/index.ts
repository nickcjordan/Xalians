// Isolated Powerworks prototype. No collection mutations or real reward grants.
// Rules per docs/design/powerworks-v5-mechanics.md. Every constant is in levers.ts;
// every record read is in reading.ts. This file is the one resolver for both sides.
import cards from "./cards.json";
import effectiveness from "@xalians/content/typeEffectivenessMatrix.json";
import {
  generateXalian,
  getSpeciesTemplates,
} from "../generator/canonicalCreatureRelease.ts";
import type { CreatureRecord } from "@xalians/content/creature";
import {
  LAST_RESORT,
  damaging,
  harmAttribute,
  readCard,
  readCompanion,
  usable,
  type Card,
  type Move,
  type MoveEffect,
  type Unit,
} from "./reading.ts";
import {
  BIND_OPPORTUNITIES,
  CHARGE_RECOVERY_OPPORTUNITIES,
  INTERRUPTED_CHARGE_RECOVERY_OPPORTUNITIES,
  COMPANION_GENERATED_AT,
  COMPANION_SEEDS,
  COOLDOWN_ROUNDS,
  DESPERATE_STRIKE_DAMAGE,
  DESPERATE_STRIKE_RECOIL,
  DISPLACE_HARM_FACTOR,
  ENCOUNTER_XP,
  FINAL_ENCOUNTER_XP,
  HARM_ATTR_DIVISOR,
  HARM_BASE,
  HARM_DIVISOR,
  IMMEDIATE_INITIATIVE_BONUS,
  LIKELIHOOD_PERCENT,
  RECOVERY_STATION_HP,
  RESTORE_DIVISOR,
  SAVE_HISTORY_LIMIT,
  SAVE_VERSION,
  SIGNATURE_ONCE_PER_ENCOUNTER,
  WARD_FACTOR,
} from "./levers.ts";

export type {
  Approach,
  Move,
  MoveEffect,
  Range,
  Support,
  Unit,
} from "./reading.ts";
export { LAST_RESORT, readCompanion, usable, damaging } from "./reading.ts";
export {
  COOLDOWN_ROUNDS,
  DESPERATE_STRIKE_RECOIL,
  LIKELIHOOD_PERCENT,
  SAVE_VERSION,
} from "./levers.ts";

export type Order = { move: number; target: string };
export type Phase = "planning" | "camp" | "won" | "lost" | "retreated";
export type Run = {
  seed: number;
  rng: number;
  room: number;
  round: number;
  team: Unit[];
  enemies: Unit[];
  orders: Record<string, Order>;
  phase: Phase;
  revival: number;
  xp: number;
  log: string[];
};
export type BattleEvent = {
  kind:
    | "round"
    | "hit"
    | "bind"
    | "missed"
    | "displace"
    | "ward"
    | "restore"
    | "charge"
    | "blocked"
    | "redirect"
    | "result";
  actorId?: string;
  targetId?: string;
  amount?: number;
  moveName?: string;
};
export type Frame = {
  team: Unit[];
  enemies: Unit[];
  text: string;
  event?: BattleEvent;
};
export type Command =
  | { kind: "round"; orders: Record<string, Order> }
  | { kind: "advance" }
  | { kind: "revive"; id: string }
  | { kind: "retreat" };
export const ROOMS = cards.rooms;
export const COMPANION_KEYS = ["graviclaw", "avilily", "crystorn", "hippochamp"] as const;
const COMPANION_IDS = ["G", "A", "C", "H"] as const;

// The four companions are generated once, at module load, from fixed seeds of the
// frozen release, so every run reads the same records and a save replays.
const templates = getSpeciesTemplates();
export const COMPANION_RECORDS: Readonly<Record<string, CreatureRecord>> =
  Object.freeze(
    Object.fromEntries(
      COMPANION_KEYS.map((key) => {
        const species = templates.find((t) => t.key === key);
        if (!species) throw new Error(`Unknown companion species ${key}`);
        return [
          key,
          generateXalian(key, COMPANION_SEEDS[key], {
            origin: species.homePlanet,
            serial: 1,
            profile: "full",
            generatedAt: COMPANION_GENERATED_AT,
          }),
        ];
      })
    )
  );

const names: Record<string, string> = {
  crawler: "Maintenance crawler",
  drone: "Security drone",
  shield: "Shield unit",
  discharge: "Discharge unit",
  guardian: "Central guardian",
};
const clone = <T>(value: T): T => structuredClone(value);
const standing = (units: Unit[]) => units.filter((u) => u.hp > 0);
function random(s: Run) {
  s.rng = (Math.imul(1664525, s.rng) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
const prolonged = (m: Move) => m.preparation === "prolonged";

// Public initiative. Without orders it is the speed order the table shows; with them,
// immediate preparation earns its bonus. It never reads or exposes committed enemy orders.
export function initiative(
  team: Unit[],
  enemies: Unit[],
  round: number,
  orders?: Record<string, Order>
): Unit[] {
  const all = [...team, ...enemies].filter((u) => u.hp > 0);
  const tie = [...all].sort((a, b) => a.id.localeCompare(b.id));
  const shift = (round - 1) % (tie.length || 1);
  const priority = [...tie.slice(shift), ...tie.slice(0, shift)];
  const pace = (u: Unit) => {
    const q = orders?.[u.id];
    const m = q && q.move >= -1 ? moveAt(u, q.move) : null;
    return (
      u.speed +
      (m && m.preparation === "immediate" ? IMMEDIATE_INITIATIVE_BONUS : 0)
    );
  };
  return [...all].sort(
    (a, b) => pace(b) - pace(a) || priority.indexOf(a) - priority.indexOf(b)
  );
}
function enemyUnit(species: string, id: string, hp?: number): Unit {
  const card = cards.templates[species as keyof typeof cards.templates] as Card;
  return readCard(card, species, id, names[species] ?? species, hp);
}
export function moveAt(u: Unit, i: number): Move {
  return i === -1 ? LAST_RESORT : u.moves[i];
}
/*
  Legality per opportunity (contract): not on cooldown; usable; not (bound and closing);
  not (recovering and prolonged); signature not spent. While charging, the only legal
  move is the release. Desperate strike is the exhaustion-only option: it appears when
  nothing damaging is legal and the unit is not bound (it is a closing move).
*/
export function legalMoves(u: Unit): number[] {
  if (u.hp <= 0) return [];
  if (u.charge !== null) return [u.chargeMove];
  const moves = u.moves
    .map((_, i) => i)
    .filter((i) => {
      const m = u.moves[i];
      return (
        u.cooldowns[i] === 0 &&
        usable(m) &&
        !(SIGNATURE_ONCE_PER_ENCOUNTER && m.signature && u.signatureSpent) &&
        !(u.bound && m.approach === "closing") &&
        !(u.recovery && prolonged(m))
      );
    });
  if (!u.enemy && !u.bound && !moves.some((i) => damaging(u.moves[i])))
    moves.push(-1);
  return moves;
}
/** Matchup by the move's element classification when it has one, else the attacker's element, against the target's element. */
export function matchup(attacker: Unit, target: Unit, move?: Move): number {
  if (move?.fallback) return 1;
  const key = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return (effectiveness as Record<string, Record<string, number>>)[
    key(move?.element ?? attacker.element)
  ][key(target.element)];
}
/** Unscaled harm of one effect: intensity/10 * (0.5 + attr/100); displace at its lever share. */
function rawHarm(u: Unit, e: MoveEffect): number {
  if (e.support !== "harm" && e.support !== "displace") return 0;
  const attr = u.attrs[harmAttribute(e.mechanism ?? "impact")];
  const intensity =
    e.support === "displace" ? e.intensity * DISPLACE_HARM_FACTOR : e.intensity;
  return (intensity / HARM_DIVISOR) * (HARM_BASE + attr / HARM_ATTR_DIVISOR);
}
/** Attribute-scaled harm before matchup and ward: the number a move card shows. */
export function basePower(u: Unit, move: Move): number {
  return Math.floor(
    move.fallback
      ? DESPERATE_STRIKE_DAMAGE
      : move.effects.reduce((sum, e) => sum + rawHarm(u, e), 0)
  );
}
export function damagePreview(u: Unit, move: Move, target: Unit): number {
  const base = move.fallback
    ? DESPERATE_STRIKE_DAMAGE
    : move.effects.reduce((sum, e) => sum + rawHarm(u, e), 0);
  return Math.floor(
    base * matchup(u, target, move) * (target.ward ? WARD_FACTOR : 1)
  );
}
export function restorePreview(u: Unit, effect: MoveEffect): number {
  return Math.floor(
    (effect.intensity / RESTORE_DIVISOR) *
      (HARM_BASE + u.attrs.willpower / HARM_ATTR_DIVISOR)
  );
}
function prepare(s: Run) {
  s.orders = {};
  for (const u of standing(s.enemies)) {
    const available = legalMoves(u);
    const charge = available.find((i) => prolonged(u.moves[i]));
    const guard = available.find((i) =>
      u.moves[i].effects.some((e) => e.support === "protect")
    );
    let move = charge ?? available.find((i) => i !== guard) ?? available[0];
    if (guard !== undefined && available.length > 1 && charge === undefined)
      move = random(s) < 1 / 3 ? guard : move;
    const foes = standing(s.team);
    s.orders[u.id] = {
      move: move ?? -2,
      target: u.charge ?? foes[Math.floor(random(s) * foes.length)].id,
    };
  }
}
function enter(s: Run) {
  s.round = 1;
  s.phase = "planning";
  for (const u of s.team) {
    u.cooldowns = u.moves.map(() => 0);
    u.signatureSpent = false;
    u.bound = 0;
    u.ward = false;
    u.charge = null;
    u.chargeMove = -1;
    u.recovery = 0;
  }
  s.enemies = ROOMS[s.room].enemies.map((row) =>
    enemyUnit(String(row[0]), String(row[1]), Number(row[2]))
  );
  for (const row of [s.team, s.enemies])
    for (let i = row.length - 1; i > 0; i--) {
      const j = Math.floor(random(s) * (i + 1));
      [row[i], row[j]] = [row[j], row[i]];
    }
  s.log.push(`Entered ${ROOMS[s.room].name}.`);
  prepare(s);
}
export function createRun(seed = 1): Run {
  const s: Run = {
    seed: seed >>> 0,
    rng: seed >>> 0,
    room: 0,
    round: 1,
    team: COMPANION_KEYS.map((key, i) =>
      readCompanion(COMPANION_RECORDS[key], COMPANION_IDS[i])
    ),
    enemies: [],
    orders: {},
    phase: "planning",
    revival: 1,
    xp: 0,
    log: [],
  };
  enter(s);
  return s;
}
function breakCharge(u: Unit, acted: boolean) {
  u.charge = null;
  u.chargeMove = -1;
  // Recovery counts opportunities. A unit interrupted before its own opportunity this
  // round passes that one (its stale release order is blocked) and the next; one that
  // already acted passes just the next. An interruption costs the lever
  // INTERRUPTED_CHARGE_RECOVERY_OPPORTUNITIES rather than the post-release pause: the
  // first sim (2026-09-21) showed a blind pull on a one-round cooldown locked both
  // chargers out for whole encounters when the two pauses were equal.
  u.recovery = INTERRUPTED_CHARGE_RECOVERY_OPPORTUNITIES + (acted ? 0 : 1);
}
export function resolveRound(
  previous: Run,
  orders: Record<string, Order>
): { state: Run; frames: Frame[] } {
  if (previous.phase !== "planning")
    throw new Error("This encounter is not accepting orders.");
  for (const u of standing(previous.team)) {
    const q = orders[u.id];
    const legal = legalMoves(u);
    if (
      !q ||
      !(legal.length ? legal.includes(q.move) : q.move === -2) ||
      (q.move !== -2 &&
        !standing(previous.enemies).some((t) => t.id === q.target))
    )
      throw new Error(`Choose a legal move and target for ${u.name}.`);
  }
  const s = clone(previous);
  const frames: Frame[] = [];
  const emit = (text: string, event?: BattleEvent) => {
    s.log.push(text);
    frames.push({
      text,
      team: clone(s.team),
      enemies: clone(s.enemies),
      event,
    });
  };
  emit(`Encounter ${s.room + 1} · Round ${s.round}`, { kind: "round" });
  const sequence = initiative(s.team, s.enemies, s.round, {
    ...s.orders,
    ...orders,
  });
  const acted = new Set<string>();
  for (const u of sequence) {
    if (!standing(s.team).length || !standing(s.enemies).length) break;
    if (u.hp <= 0) continue;
    acted.add(u.id);
    const q = (u.enemy ? s.orders : orders)[u.id];
    const wasBound = u.bound > 0;
    u.ward = false;
    // Read before the decrement: a charge broken before this opportunity leaves a stale
    // release order that must still be blocked here, even when the interrupted-charge
    // recovery lever is 0.
    const recovering = u.recovery > 0;
    if (u.recovery) u.recovery--;
    u.cooldowns = u.cooldowns.map((n) => Math.max(0, n - 1));
    if (q.move === -2)
      emit(`${u.name} cannot act while bound.`, {
        kind: "blocked",
        actorId: u.id,
      });
    else {
      const m = moveAt(u, q.move);
      const release = prolonged(m) && u.charge !== null;
      if (wasBound && m.approach === "closing") {
        if (release) breakCharge(u, true);
        emit(
          `${u.name}'s ${m.name} is stopped by binding.${
            release ? " Charge dispersed; recovery begins." : ""
          }`,
          { kind: "blocked", actorId: u.id, moveName: m.name }
        );
      } else if (prolonged(m) && !release && recovering) {
        // A stale release order after the charge was broken this round.
        emit(`${u.name}'s charge was broken; it cannot begin another yet.`, {
          kind: "blocked",
          actorId: u.id,
          moveName: m.name,
        });
      } else {
        const targets = u.enemy ? s.team : s.enemies;
        let target = targets.find((t) => t.id === q.target);
        if (!target || target.hp <= 0) {
          const index = target ? targets.indexOf(target) : -1;
          target = Array.from(
            { length: targets.length },
            (_, i) => targets[(index + i + 1) % targets.length]
          ).find((t) => t.hp > 0);
          if (target)
            emit(
              `${u.name} redirects ${m.name} to ${target.name} (${target.id}).`,
              {
                kind: "redirect",
                actorId: u.id,
                targetId: target.id,
                moveName: m.name,
              }
            );
        }
        if (target) {
          if (prolonged(m) && !release) {
            u.charge = target.id;
            u.chargeMove = q.move;
            emit(
              `${u.name} begins ${m.name}. A powerful release is coming at its next opportunity.`,
              { kind: "charge", actorId: u.id, moveName: m.name }
            );
          } else {
            if (q.move >= 0) {
              u.cooldowns[q.move] = COOLDOWN_ROUNDS[m.recovery];
              if (m.signature) u.signatureSpent = true;
            }
            if (release) {
              u.charge = null;
              u.chargeMove = -1;
              u.recovery = CHARGE_RECOVERY_OPPORTUNITIES;
            }
            apply(s, u, m, target, acted, emit);
          }
        }
      }
    }
    if (wasBound) u.bound = Math.max(0, u.bound - 1);
  }
  if (!standing(s.team).length) {
    s.phase = "lost";
    emit("The squad has fallen. Previously earned practice XP is retained.");
  } else if (!standing(s.enemies).length) {
    const xp = s.room === 3 ? FINAL_ENCOUNTER_XP : ENCOUNTER_XP;
    s.xp += xp;
    s.phase = s.room === 3 ? "won" : "camp";
    emit(`Encounter cleared. +${xp} practice XP per squad member.`);
  } else {
    s.round++;
    prepare(s);
  }
  return { state: s, frames };
}
/** One resolver for every effect on both sides. Harm is deterministic; statuses roll the run rng. */
function apply(
  s: Run,
  u: Unit,
  m: Move,
  target: Unit,
  acted: Set<string>,
  emit: (text: string, event?: BattleEvent) => void
) {
  const supported = m.effects.filter((e) => e.support !== "unsupported");
  if (damaging(m)) {
    const damage = damagePreview(u, m, target);
    target.hp = Math.max(0, target.hp - damage);
    if (m.fallback) u.hp = Math.max(0, u.hp - DESPERATE_STRIKE_RECOIL);
    emit(
      `${u.name} uses ${m.name} on ${target.name} (${target.id}): ${damage} damage.${
        target.hp === 0 ? " Knocked out." : ""
      }${
        m.fallback
          ? ` Attacker takes ${DESPERATE_STRIKE_RECOIL} recoil damage.`
          : ""
      }`,
      {
        kind: "hit",
        actorId: u.id,
        targetId: target.id,
        amount: damage,
        moveName: m.name,
      }
    );
    if (
      target.hp > 0 &&
      target.charge !== null &&
      supported.some((e) => e.support === "displace")
    ) {
      breakCharge(target, acted.has(target.id));
      emit(
        `${target.name} is pulled off its footing: its charge is broken.`,
        {
          kind: "displace",
          actorId: u.id,
          targetId: target.id,
          moveName: m.name,
        }
      );
    }
  }
  for (const e of supported) {
    if (e.support === "bind") {
      if (target.hp <= 0) continue;
      const chance = LIKELIHOOD_PERCENT[e.likelihood];
      const landed = chance >= 100 || random(s) * 100 < chance;
      if (!landed) {
        emit(`${u.name}'s ${m.name} fails to take hold on ${target.name}.`, {
          kind: "missed",
          actorId: u.id,
          targetId: target.id,
          moveName: m.name,
        });
        continue;
      }
      target.bound = BIND_OPPORTUNITIES;
      emit(
        `${u.name} uses ${m.name}: ${target.name} is ${e.status} through its next opportunity.`,
        { kind: "bind", actorId: u.id, targetId: target.id, moveName: m.name }
      );
    } else if (e.support === "protect") {
      u.ward = true;
      emit(
        `${u.name} activates ${m.name}: incoming damage halved until its next opportunity.`,
        { kind: "ward", actorId: u.id, targetId: u.id, moveName: m.name }
      );
    } else if (e.support === "restore") {
      const amount = Math.min(u.max - u.hp, restorePreview(u, e));
      u.hp += amount;
      emit(`${u.name} uses ${m.name}: recovers ${amount} HP.`, {
        kind: "restore",
        actorId: u.id,
        targetId: u.id,
        amount,
        moveName: m.name,
      });
    }
  }
}
export function command(previous: Run, action: Command): Run {
  if (action.kind === "round")
    return resolveRound(previous, action.orders).state;
  const s = clone(previous);
  if (s.phase !== "camp")
    throw new Error("This action is available between encounters.");
  if (action.kind === "revive") {
    const u = s.team.find((t) => t.id === action.id);
    if (!u || u.hp > 0 || !s.revival)
      throw new Error("Revival is unavailable.");
    u.hp = Math.ceil(u.max / 2);
    s.revival = 0;
    s.log.push(`${u.name} revived at ${u.hp} HP.`);
  } else if (action.kind === "retreat") {
    s.phase = "retreated";
    s.log.push("Squad extracted. Earned practice XP retained.");
  } else {
    s.room++;
    if (s.room === 3) {
      for (const u of standing(s.team))
        u.hp = Math.min(u.max, u.hp + RECOVERY_STATION_HP);
      s.log.push(
        `Recovery station: +${RECOVERY_STATION_HP} HP to standing squad members.`
      );
    }
    enter(s);
  }
  return s;
}

// Saves contain commands, not trusted arbitrary combat state. Replay validates each action.
export function restoreRun(raw: string): { state: Run; history: Command[] } {
  const save = JSON.parse(raw);
  if (
    save.version !== SAVE_VERSION ||
    !Number.isInteger(save.seed) ||
    !Array.isArray(save.history) ||
    save.history.length > SAVE_HISTORY_LIMIT
  )
    throw new Error("Unsupported save.");
  let state = createRun(save.seed);
  for (const action of save.history) state = command(state, action);
  return { state, history: save.history };
}
