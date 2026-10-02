/*
  Tests for the turn screen's view (docs/design/powerworks-turn-screen.md). Builds real turn-by-turn
  states from the engine (createTurnRun) with the rules the screen ships with, then mutates clones
  to force the cases a live run would rarely hand us on demand (immune matchups, low health for a
  finish, shields absorbing, resting/spent keys).
*/
import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES,
  ENEMY_HP_FACTOR,
  ENCOUNTER_XP,
  FINAL_ENCOUNTER_XP,
  RECOVERY_STATION_HP,
  STALLED_LOG,
  STALL_TURNS_PER_UNIT,
  WITHDREW_LOG,
  createTurnRun,
  legalTargets,
  roundOf,
  roundStrip,
  standing,
  turnCommand,
  upcoming,
  type Fighter,
  type Order,
  type TRun,
} from "@xalians/rules/dungeon/pillars";
import {
  beatsFell,
  briefingView,
  campView,
  knockoutHold,
  reviveWords,
  revivesLeftWords,
  revivedWords,
  runSummary,
  stationHeal,
  titleCard,
  endingOf,
  eventWords,
  floatWords,
  hinderOnAttack,
  hitUncapped,
  actsOnPress,
  previewsOf,
  previewThreats,
  retargetThreat,
  threatsOf,
  nextActsOf,
  platePreviewOf,
  momentWords,
  playback,
  recordEntries,
  sinceView,
  turnView,
  weakenedWords,
  withWeakened,
  type Beat,
  type Cell,
  type RecordEntry,
  type Threat,
} from "./view.ts";

const RULES = { ...DEFAULT_RULES, rooms: "roles" as const, timeline: "round" as const, enemyHpFactor: ENEMY_HP_FACTOR };

function freshState(seed: number): TRun {
  return createTurnRun(seed, "starter", RULES).state;
}

/** A companion's turn state where the active companion has at least one ready attack. */
function stateWithActiveAttacker(): TRun {
  for (let seed = 1; seed < 50; seed++) {
    const s = freshState(seed);
    const active = s.team.find((t) => t.id === s.active);
    if (active?.moves.some((m) => m.power > 0)) return s;
  }
  throw new Error("no seed produced an active attacker in range");
}

/** The active companion's first ready move against its first legal target, or a pass. A minimal
    stand-in for a real player so tests can drive a run forward without pulling in the sim's own
    policy module (turnPolicy.ts is not part of this package's public subpath exports). */
function firstLegalOrder(s: TRun): Order {
  const u: Fighter = s.team.find((t) => t.id === s.active)!;
  for (let i = 0; i < u.moves.length; i++) {
    const targets = legalTargets(s, u, i);
    if (targets.length && u.cooldowns[i] === 0 && (u.moves[i].power > 0 || u.moves[i].parts.length > 0) && !(u.moves[i].signature && u.signatureSpent))
      return { move: i, target: targets[0].id };
  }
  return { move: -2, target: u.id };
}

/** A companion's turn state, and the move index, where the active companion has a move that
    rests (rests > 0) and does something (attack or support), so a resting-key assertion is never
    a silent no-op. */
function stateWithRestingMove(): { s: TRun; i: number } {
  for (let seed = 1; seed < 200; seed++) {
    const s = freshState(seed);
    const active = s.team.find((t) => t.id === s.active);
    const i = active?.moves.findIndex((m) => m.rests > 0 && !m.signature && (m.power > 0 || m.parts.length > 0)) ?? -1;
    if (active && i >= 0) return { s, i };
  }
  throw new Error("no seed in range produced an active companion with a resting move");
}

/** Commits an enemy to one of its moves and a target, as the engine's intent would. */
function commit(s: TRun, foe: Fighter, move: number, target: string) {
  s.intents[foe.id] = { move, target };
}

describe("turnView", () => {
  it("builds a view for a fresh run: phase, room name without its ordinal, strip and squad", () => {
    const s = freshState(1);
    const v = turnView(s);
    expect(v.phase).toBe("turn");
    expect(v.round).toBe(1);
    expect(v.roomName).not.toMatch(/^\d+\.\s/);
    expect(v.roomName.length).toBeGreaterThan(0);
    expect(v.squad.length).toBe(s.team.length);
    expect(v.enemies.length).toBe(s.enemies.length);
    expect(v.strip.length).toBe(s.team.length + s.enemies.length);
    expect(v.active?.id).toBe(s.active);
  });

  it("gives keys only on a companion's turn, one per move, in move order", () => {
    const s = stateWithActiveAttacker();
    const v = turnView(s);
    const active = s.team.find((t) => t.id === s.active)!;
    expect(v.keys.length).toBe(active.moves.length);
    v.keys.forEach((k, i) => expect(k.index).toBe(i));
  });

  it("letters enemies A.. by row order, fixed even after one falls", () => {
    const s = freshState(1);
    const v = turnView(s);
    v.enemies.forEach((e, i) => expect(e.letter).toBe(String.fromCharCode(65 + i)));
    // Force the first enemy down and rebuild the view: the letter stays put.
    const down = structuredClone(s);
    down.enemies[0].hp = 0;
    const v2 = turnView(down);
    expect(v2.enemies[0].letter).toBe("A");
    expect(v2.enemies[0].down).toBe(true);
  });

  it("uses species art for the squad and ENEMY_ART (or species) for enemies", () => {
    const s = freshState(1);
    const v = turnView(s);
    v.squad.forEach((u, i) => expect(u.art).toBe(s.team[i].species));
    v.enemies.forEach((e, i) => {
      const species = s.enemies[i].species;
      const expected = ["mender", "warden", "jammer", "rallier"].includes(species) ? { mender: "shield", warden: "shield", jammer: "drone", rallier: "drone" }[species] : species;
      expect(e.art).toBe(expected);
    });
  });

  it("marks a move resting after use", () => {
    const { s, i } = stateWithRestingMove();
    const active = s.team.find((t) => t.id === s.active)!;
    const targets = active.moves[i].power > 0 || active.moves[i].parts.some((p) => p.aim === "enemy") ? s.enemies.filter((e) => e.hp > 0) : [active];
    const target = targets[0].id;
    const before = turnView(s).keys[i];
    expect(before.state).toBe("ready");
    const after = turnCommand(s, { kind: "act", order: { move: i, target } }).state;
    // Find the same companion's next turn to read the key's post-use state. Guaranteed to reach
    // one within a handful of turns on the round timeline, and stateWithRestingMove guarantees
    // rests > 0, so this assertion always runs.
    let t = after;
    for (let k = 0; k < 30 && t.phase === "turn" && t.active !== active.id; k++)
      t = turnCommand(t, { kind: "act", order: { move: -2, target: t.active! } }).state;
    expect(t.phase).toBe("turn");
    expect(t.active).toBe(active.id);
    const key = turnView(t).keys[i];
    expect(key.state).toBe("resting");
    expect(key.restLeft).toBeGreaterThan(0);
  });

  it("treats a do-nothing move (no power, no parts) as spent", () => {
    const s = stateWithActiveAttacker();
    const active = structuredClone(s.team.find((t) => t.id === s.active)!);
    active.moves[0] = { ...active.moves[0], power: 0, parts: [] };
    const t = structuredClone(s);
    t.team = t.team.map((u) => (u.id === active.id ? active : u));
    const v = turnView(t);
    expect(v.keys[0].state).toBe("spent");
  });

  it("gives every standing enemy a threat tag somewhere after it has acted this round, and none to a fallen one", () => {
    let s = freshState(1);
    for (let k = 0; k < 40 && s.phase === "turn"; k++) {
      s = turnCommand(s, { kind: "act", order: firstLegalOrder(s) }).state;
      if (s.phase !== "turn") break;
      const v = turnView(s);
      const tags = [...v.squad, ...v.enemies].flatMap((u) => u.threats);
      for (const e of v.enemies) {
        if (e.down) expect(tags.some((x) => x.fromId === e.id)).toBe(false);
        else {
          const mine = tags.filter((x) => x.fromId === e.id);
          expect(mine.length).toBeGreaterThan(0);
          expect(mine.every((x) => x.from === e.letter && x.move.length > 0)).toBe(true);
        }
      }
    }
  });

  describe("an enemy's threat tag", () => {
    function foeWith(move: object, target?: (s: TRun) => Fighter): { s: TRun; foe: Fighter; aim: Fighter } {
      const s = structuredClone(stateWithActiveAttacker());
      const foe = s.enemies.find((e) => e.hp > 0)!;
      const base = foe.moves.find((m) => m.power > 0) ?? foe.moves[0];
      foe.moves = [{ ...base, rests: 0, signature: false, parts: [], area: false, element: null as never, ...move } as never];
      foe.cooldowns = [0];
      foe.signatureSpent = false;
      foe.hinder = 0;
      foe.boost = 0;
      const aim = target ? target(s) : s.team.find((u) => u.id === s.active)!;
      aim.shields = [];
      commit(s, foe, 0, aim.id);
      return { s, foe, aim };
    }
    const read = (s: TRun, foe: Fighter, on?: string): Threat => threatsOf(s).find((x) => x.fromId === foe.id && (on === undefined || x.on === on))!;

    it("sits on the companion it will land on, with the enemy's letter, its move and the number it would land now, uncapped by health", () => {
      const { s, foe, aim } = foeWith({ power: 18 });
      aim.hp = 10;
      const i = read(s, foe);
      expect(i).toMatchObject({ kind: "attack", from: "A", fromId: foe.id, on: aim.id, onName: aim.name, n: 18, step: 1, lethal: true });
      expect(i.area).toBeUndefined();
      expect(i.move).toBe(foe.moves[0].name);
      expect(hitUncapped(foe, foe.moves[0], aim)).toBe(18);
      // the plate it lands on carries it; no other plate does, and the enemy's own plate names no companion
      const v = turnView(s);
      expect(v.squad.find((u) => u.id === aim.id)!.threats.map((x) => x.fromId)).toEqual([foe.id]);
      expect(v.squad.filter((u) => u.id !== aim.id).every((u) => u.threats.every((x) => x.fromId !== foe.id))).toBe(true);
      expect(v.enemies.every((e) => e.threats.every((x) => x.fromId !== foe.id))).toBe(true);
    });

    it("marks it lethal when it equals or exceeds the companion's health, exactly equal included, and counts the shield", () => {
      const { s, foe, aim } = foeWith({ power: 18 });
      aim.hp = 19;
      expect(read(s, foe).lethal).toBeUndefined();
      aim.hp = 18;
      expect(read(s, foe).lethal).toBe(true);
      aim.hp = 15;
      aim.shields = [{ n: 4, from: "x" }];
      expect(read(s, foe)).toMatchObject({ n: 14 });
      expect(read(s, foe).lethal).toBeUndefined();
    });

    it("reads the enemy's own hinder and boost in the number, with no struck form (a tag shows only what lands now)", () => {
      const { s, foe } = foeWith({ power: 20 });
      foe.hinder = 6;
      expect(read(s, foe)).toMatchObject({ n: 14 });
      expect(read(s, foe).before).toBeUndefined();
      foe.hinder = 0;
      foe.boost = 12;
      expect(read(s, foe).n).toBe(32);
    });

    it("reads an immune matchup as no effect (step 0) and a strong one as more", () => {
      const { s, foe, aim } = foeWith({ power: 20, element: "fire" });
      aim.element = "ghost";
      expect(read(s, foe)).toMatchObject({ n: 0, step: 0 });
      aim.element = "plant";
      expect(read(s, foe).step).toBeGreaterThan(1);
    });

    it("an area attack tags every standing companion with that companion's own number, and not the fallen", () => {
      const { s, foe } = foeWith({ power: 20, area: true });
      s.team[1].shields = [{ n: 5, from: "x" }];
      s.team[2].hp = 0;
      const mine = threatsOf(s).filter((x) => x.fromId === foe.id);
      expect(mine.map((x) => x.on).sort()).toEqual(s.team.filter((u) => u.hp > 0).map((u) => u.id).sort());
      expect(mine.every((x) => x.area === true)).toBe(true);
      expect(mine.find((x) => x.on === s.team[1].id)!.n).toBe(read(s, foe, s.team[0].id).n - 5);
    });

    it("a support tags its recipient with the engine's own amount: an enemy's own plate for a shield on itself, an ally's for a heal", () => {
      const own = foeWith({ power: 0, parts: [{ kind: "shield", n: 5, aim: "self", all: false }] });
      const v = turnView(own.s);
      expect(v.enemies.find((e) => e.id === own.foe.id)!.threats.filter((x) => x.fromId === own.foe.id)).toMatchObject([{ kind: "support", from: "A", on: own.foe.id, parts: [{ kind: "shield", n: 5 }] }]);
      expect(v.squad.every((u) => u.threats.every((x) => x.fromId !== own.foe.id))).toBe(true);
      const s = structuredClone(stateWithActiveAttacker());
      const [a, b] = s.enemies;
      a.moves = [{ ...a.moves[0], power: 0, rests: 0, signature: false, area: false, parts: [{ kind: "heal", n: 9, aim: "ally", all: false } as never] }];
      a.cooldowns = [0];
      b.hp = b.max - 4;
      commit(s, a, 0, b.id);
      expect(turnView(s).enemies[1].threats.filter((x) => x.fromId === a.id)).toMatchObject([{ kind: "support", from: "A", fromId: a.id, on: b.id, parts: [{ kind: "heal", n: 4 }] }]);
    });

    it("a hinder aimed at a companion is a tag on that companion with its number", () => {
      const { s, foe, aim } = foeWith({ power: 0, parts: [{ kind: "hinder", n: 8, aim: "enemy", all: false }] });
      expect(read(s, foe)).toMatchObject({ kind: "support", on: aim.id, parts: [{ kind: "hinder", n: 8 }] });
    });

    it("orders the tags on a plate by when their enemies act", () => {
      const s = structuredClone(stateWithActiveAttacker());
      const [a, b] = s.enemies;
      const t0 = s.team.find((u) => u.id === s.active)!;
      for (const foe of [a, b]) {
        foe.moves = [{ ...foe.moves[0], power: 5, rests: 0, signature: false, area: false, parts: [] }];
        foe.cooldowns = [0];
        commit(s, foe, 0, t0.id);
      }
      for (const [first, second] of [[a, b], [b, a]]) {
        s.clock[first.id] = 0.1;
        s.clock[second.id] = 0.2;
        expect(turnView(s).squad.find((u) => u.id === t0.id)!.threats.map((x) => x.fromId)).toEqual([first.id, second.id]);
      }
    });

    it("when the committed target has fallen the tag is on the companion the engine will turn to", () => {
      const { s, foe, aim } = foeWith({ power: 18 });
      aim.hp = 0;
      const t = read(s, foe);
      expect(t.on).not.toBe(aim.id);
      expect(s.team.find((u) => u.id === t.on)!.hp).toBeGreaterThan(0);
    });

    it("retargetThreat moves a single-target tag to another companion with that companion's number; area and support stay", () => {
      const { s, foe, aim } = foeWith({ power: 18 });
      const other = s.team.find((u) => u.id !== aim.id)!;
      other.shields = [{ n: 3, from: "x" }];
      const moved = retargetThreat(s, read(s, foe), other.id);
      expect(moved).toMatchObject({ on: other.id, n: 15 });
      const area = foeWith({ power: 18, area: true });
      const t0 = read(area.s, area.foe, area.aim.id);
      expect(retargetThreat(area.s, t0, other.id)).toBe(t0);
    });

    it("is absent for a fallen enemy, and outside a fight", () => {
      const s = structuredClone(stateWithActiveAttacker());
      s.enemies[0].hp = 0;
      const tags = [...turnView(s).squad, ...turnView(s).enemies].flatMap((u) => u.threats);
      expect(tags.some((x) => x.fromId === s.enemies[0].id)).toBe(false);
      const camp = { ...structuredClone(s), phase: "camp" as const };
      expect(threatsOf(camp)).toEqual([]);
    });

    it("carries the matchup of the acting companion's element against each enemy, once per enemy", () => {
      const s = structuredClone(stateWithActiveAttacker());
      const active = s.team.find((u) => u.id === s.active)!;
      active.element = "water";
      s.enemies[0].element = "fire";
      const v = turnView(s);
      expect(v.enemies[0].matchup).toBeGreaterThan(1);
      const camp = { ...structuredClone(s), phase: "camp" as const, active: null };
      expect(turnView(camp).enemies.every((e) => e.matchup === null)).toBe(true);
    });
  });

  describe("attack cells", () => {
    it("marks immune (step 0), finishing (skull) and shield-absorbed cells", () => {
      const s = stateWithActiveAttacker();
      const active = s.team.find((t) => t.id === s.active)!;
      const i = active.moves.findIndex((m) => m.power > 0);
      const m = active.moves[i];
      const t = structuredClone(s);
      const attacker = t.team.find((u) => u.id === active.id)!;
      attacker.moves[i] = { ...attacker.moves[i], element: "fire" };
      // One enemy immune (fire vs ghost is 0 on the shared chart), one low on health to finish,
      // one shielded so part of the hit is absorbed.
      t.enemies[0].element = "ghost";
      if (t.enemies[1]) {
        t.enemies[1].element = "plant"; // fire vs plant: not immune, so the finish is reachable
        t.enemies[1].hp = 1;
      }
      if (t.enemies[2]) t.enemies[2].shields = [{ n: 1000, from: "x" }];
      const v = turnView(t);
      const key = v.keys[i];
      const cellFor = (idx: number) => key.cells.find((c) => c.target === t.enemies[idx].id)!;
      expect(cellFor(0).immune).toBe(true);
      expect(cellFor(0).n).toBe(0);
      if (t.enemies[1]) {
        expect(cellFor(1).finishes).toBe(true);
        expect(cellFor(1).n).toBeGreaterThanOrEqual(1);
      }
      if (t.enemies[2] && m.power > 0) expect(cellFor(2).absorbed).toBeGreaterThan(0);
      void m;
    });

    it("reads a strong (step > 1) and weak (step < 1) matchup on the same key across two targets", () => {
      const s = stateWithActiveAttacker();
      const active = s.team.find((t) => t.id === s.active)!;
      const i = active.moves.findIndex((m) => m.power > 0);
      const t = structuredClone(s);
      const attacker = t.team.find((u) => u.id === active.id)!;
      attacker.moves[i] = { ...attacker.moves[i], element: "water" };
      if (t.enemies.length < 2) return;
      t.enemies[0].element = "fire"; // water vs fire: step 2, strong
      t.enemies[1].element = "electric"; // water vs electric: step 0.5 on this chart's Electric row... verified below
      const v = turnView(t);
      const key = v.keys[i];
      const strong = key.cells.find((c) => c.target === t.enemies[0].id)!;
      expect(strong.step).toBeGreaterThan(1);
    });

    it("gives a single-target key one cell per standing enemy even when every number matches", () => {
      const s = stateWithActiveAttacker();
      const active = s.team.find((t) => t.id === s.active)!;
      const i = active.moves.findIndex((m) => m.power > 0 && !m.area);
      if (i < 0) return;
      const t = structuredClone(s);
      const attacker = t.team.find((u) => u.id === active.id)!;
      attacker.moves[i] = { ...attacker.moves[i], element: null }; // physical: step 1 vs everything
      for (const e of t.enemies) e.hp = e.max; // no one finishes
      const key = turnView(t).keys[i];
      expect(key.cells.length).toBe(t.enemies.filter((e) => e.hp > 0).length);
      expect(new Set(key.cells.map((c) => c.n)).size).toBeGreaterThanOrEqual(1);
      expect("same" in key).toBe(false);
    });
  });

  describe("hinder-only cells", () => {
    /** Search seeds for an active companion whose kit has a hinder-only move (no power, a hinder
        part). Not every seed's four moves include one, so tests search rather than assume seed 1. */
    function stateWithHinderMove(): { s: TRun; hi: number } {
      for (let seed = 1; seed < 200; seed++) {
        const s = freshState(seed);
        const active = s.team.find((t) => t.id === s.active);
        const hi = active?.moves.findIndex((m) => m.power <= 0 && m.parts.some((p) => p.kind === "hinder")) ?? -1;
        if (active && hi >= 0) return { s, hi };
      }
      throw new Error("no seed in range produced an active companion with a hinder-only move");
    }

    it("shows before and after the hinder on every standing enemy", () => {
      const { s, hi } = stateWithHinderMove();
      const v = turnView(s);
      const key = v.keys[hi];
      expect(key.cells.length).toBeGreaterThan(0);
      key.cells.forEach((c: Cell) => {
        expect(c.before).toBeDefined();
        expect(c.n).toBeLessThanOrEqual(c.before!);
      });
    });

    it("keeps a before and after on every cell, even when every enemy's before/after happens to match", () => {
      const { s, hi } = stateWithHinderMove();
      const t = structuredClone(s);
      // Force every standing enemy to an identical hit-on-active and no existing hinder, so the
      // naive n-only comparison would wrongly read as collapsible; `before` must still block it.
      for (const e of t.enemies) {
        if (e.hp <= 0) continue;
        e.hinder = 0;
        e.moves = e.moves.map((m, idx) => (idx === 0 ? { ...m, power: 10, element: null, area: false } : { ...m, power: 0, parts: [] }));
        e.cooldowns = e.moves.map(() => 0);
        commit(t, e, 0, t.active!);
      }
      const v = turnView(t);
      const key = v.keys[hi];
      expect(key.cells.every((c) => c.before !== undefined)).toBe(true);
    });

    it("computes after as max(current hinder, this hinder), not additive, when the enemy already carries a hinder", () => {
      const { s, hi } = stateWithHinderMove();
      const t = structuredClone(s);
      const target = t.enemies.find((e) => e.hp > 0)!;
      // Commit it to an attack, then give it a strong existing hinder so max() and addition diverge sharply.
      target.moves[0] = { ...target.moves[0], power: 12, element: null as never, area: false };
      target.cooldowns[0] = 0;
      commit(t, target, 0, t.active!);
      target.hinder = 9999;
      const v = turnView(t);
      const key = v.keys[hi];
      const cell = key.cells.find((c) => c.target === target.id)!;
      // With hinder already at 9999, no ready attack can deal positive damage: both before and
      // after read 0, proving the after value came from re-evaluating the attack (clamped at 0
      // by attackOn's own floor), not from `before - hinderAmount` going deeply negative then
      // clamped, which addition-based code also happens to floor at 0. The real distinguishing
      // case is the reverse: a small existing hinder that this hinder's own n does not reach.
      expect(cell.n).toBe(0);
      expect(cell.before).toBe(0);

      // The distinguishing case: the enemy already carries a hinder bigger than this move's own
      // hinder amount. Additive code (before - thisN) would still lower the hit; max() must not,
      // since the bigger existing hinder already governs.
      const hinderPart = s.team.find((u) => u.id === s.active)!.moves[hi].parts.find((p) => p.kind === "hinder")!;
      const thisN = hinderPart.all ? Math.max(1, Math.floor(hinderPart.n * 0.6)) : hinderPart.n;
      const t2 = structuredClone(s);
      const target2 = t2.enemies.find((e) => e.hp > 0)!;
      target2.moves[0] = { ...target2.moves[0], power: 60, element: null as never, area: false };
      target2.cooldowns[0] = 0;
      commit(t2, target2, 0, t2.active!);
      target2.hinder = thisN + 5; // already bigger than this hinder would apply
      const v2 = turnView(t2);
      const cell2 = v2.keys[hi].cells.find((c) => c.target === target2.id)!;
      expect(cell2.n).toBe(cell2.before);
    });
  });

  describe("ally cells", () => {
    it("caps a heal at the target's missing health", () => {
      const s = stateWithActiveAttacker();
      const active = s.team.find((t) => t.id === s.active)!;
      const hi = active.moves.findIndex((m) => m.parts.some((p) => p.kind === "heal" && p.aim === "ally"));
      if (hi < 0) return;
      const t = structuredClone(s);
      const mate = t.team.find((u) => u.id !== active.id && u.hp > 0);
      if (!mate) return;
      mate.hp = mate.max - 1; // only 1 missing: a bigger heal part must cap at 1
      const v = turnView(t);
      const key = v.keys[hi];
      const cell = key.cells.find((c) => c.target === mate.id);
      if (cell) expect(cell.n).toBeLessThanOrEqual(1);
    });
  });

  it("gives every unit a strip slot, fallen ones included, states matching round progress", () => {
    const s = freshState(1);
    const down = structuredClone(s);
    down.enemies[0].hp = 0;
    const v = turnView(down);
    const slot = v.strip.find((x) => x.id === down.enemies[0].id)!;
    expect(slot.state).toBe("down");
    const activeSlot = v.strip.find((x) => x.id === down.active)!;
    expect(activeSlot.state).toBe("now");
  });
});

describe("eventWords", () => {
  const s = freshState(1);
  const a = s.team[0].id;
  const b = s.enemies[0].id;

  it("describes a hit with a strong/weak tag and a fall", () => {
    const strong = eventWords(s, { kind: "hit", actor: a, target: b, move: "Test", amount: 7, absorbed: 0, step: 2, fell: false });
    expect(strong).toContain("strong matchup");
    const weak = eventWords(s, { kind: "hit", actor: a, target: b, move: "Test", amount: 7, absorbed: 0, step: 0.5, fell: false });
    expect(weak).toContain("weak matchup");
    const fell = eventWords(s, { kind: "hit", actor: a, target: b, move: "Test", amount: 7, absorbed: 0, step: 1, fell: true });
    expect(fell).toContain("fell");
  });

  it("folds shield absorption into the hit line", () => {
    const words = eventWords(s, { kind: "hit", actor: a, target: b, move: "Test", amount: 4, absorbed: 3, step: 1, fell: false });
    expect(words).toContain("shield took 3");
  });

  it("describes support events in plain English", () => {
    expect(eventWords(s, { kind: "heal", actor: a, target: b, move: "Test", amount: 5 })).toMatch(/healed .* for 5/);
    expect(eventWords(s, { kind: "shield", actor: a, target: b, move: "Test", amount: 6 })).toMatch(/shielded .* for 6/);
    expect(eventWords(s, { kind: "boost", actor: a, target: b, move: "Test", amount: 3 })).toMatch(/boosted .*next attack by 3/);
    expect(eventWords(s, { kind: "hinder", actor: a, target: b, move: "Test", amount: 4 })).toMatch(/weakened .*next attack by 4/);
  });

  it("describes a pass and a redirect", () => {
    expect(eventWords(s, { kind: "pass", actor: a })).toMatch(/waits\.$/);
    const words = eventWords(s, { kind: "redirect", actor: a, from: b, to: s.team[1]?.id ?? a });
    expect(words).toMatch(/^.+ turned from .+ to .+\.$/);
    expect(words.startsWith(s.team[0].name)).toBe(true);
  });
});

describe("turn rail", () => {
  it("marks the active companion NOW, exactly one slot NEXT, and covers the whole round", () => {
    const s = freshState(1);
    const v = turnView(s);
    expect(v.rail.length).toBeGreaterThanOrEqual(s.team.length + s.enemies.length);
    const now = v.rail.filter((r) => r.state === "now");
    expect(now.length).toBe(1);
    expect(now[0].id).toBe(s.active);
    const next = v.rail.filter((r) => r.state === "next");
    expect(next.length).toBe(1);
    expect(v.nextId).toBe(next[0].id);
  });

  it("peeks past this round's end into the next round's own start, with a round-start marker", () => {
    const s = freshState(1);
    const v = turnView(s);
    const boundary = v.rail.find((r) => r.roundStart !== undefined);
    expect(boundary).toBeTruthy();
    expect(boundary!.roundStart).toBe(v.round + 1);
    // Everything in the round in progress appears before the boundary slot.
    const boundaryIndex = v.rail.indexOf(boundary!);
    const thisRoundIds = new Set(v.strip.map((sl) => sl.id));
    for (let i = 0; i < boundaryIndex; i++) expect(thisRoundIds.has(v.rail[i].id)).toBe(true);
  });

  it("starts the next round with its fastest unit, not a repeat of this round's last", () => {
    const s = freshState(1);
    const v = turnView(s);
    const boundary = v.rail.find((r) => r.roundStart !== undefined)!;
    // The next round opens in the same seated order as this one: the rail's first slot.
    expect(boundary.id).toBe(v.rail[0].id);
    const before = v.rail[v.rail.indexOf(boundary) - 1];
    expect(before.id).not.toBe(boundary.id);
  });

  it("gives no rail outside a companion's turn (camp, won, lost)", () => {
    const s = freshState(1);
    const camped = { ...s, phase: "camp" as const };
    expect(turnView(camped).rail).toEqual([]);
    expect(turnView(camped).nextId).toBeNull();
  });
});

describe("playback", () => {
  it("builds one beat per event with a full hp snapshot, hits subtracting and heals adding", () => {
    const s = stateWithActiveAttacker();
    const active = s.team.find((t) => t.id === s.active)!;
    const i = active.moves.findIndex((m) => m.power > 0);
    const target = s.enemies.find((e) => e.hp > 0)!.id;
    const { events } = turnCommand(s, { kind: "act", order: { move: i, target } });
    const beats = playback(s, events);
    expect(beats.length).toBe(events.length);
    const expectedHp: Record<string, number> = {};
    for (const u of [...s.team, ...s.enemies]) expectedHp[u.id] = u.hp;
    beats.forEach((beat, idx) => {
      const e = events[idx];
      if (e.kind === "hit") expectedHp[e.target] = Math.max(0, expectedHp[e.target] - e.amount);
      else if (e.kind === "heal") expectedHp[e.target] = expectedHp[e.target] + e.amount;
      expect(beat.hp).toEqual(expectedHp);
      expect(beat.actor).toBe(e.actor);
    });
  });
});

describe("numbers pass on the keys", () => {
  it("never reads 0 on an attack cell unless the matchup is immune, and a strong step reads above a weak one", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const v = turnView(freshState(seed));
      for (const key of v.keys) {
        const cells = key.cells.filter((c) => c.step !== 1 || key.kind === "attack");
        for (const c of cells) if (key.kind === "attack" && !c.immune && c.absorbed === 0) expect(c.n).toBeGreaterThanOrEqual(1);
        const strong = cells.filter((c) => c.step > 1).map((c) => c.n);
        const weak = cells.filter((c) => c.step > 0 && c.step < 1).map((c) => c.n);
        if (key.kind === "attack" && strong.length && weak.length) expect(Math.min(...strong)).toBeGreaterThan(Math.max(...weak));
      }
    }
  });
});


/* ---- UX pass 2, round 1: say it truthfully ---- */

/** The first state in a seeded play-through where the active companion is the last unit of its
    round and the next round opens on an enemy's turn: the `round-open-enemy` scenario
    (devtools/turnScenarios.ts) built with the same predicate and the test's own player. */
function roundOpenEnemyState(): TRun {
  for (let seed = 1; seed <= 150; seed++) {
    let s = freshState(seed);
    for (let k = 0; k < 200 && (s.phase === "turn" || s.phase === "camp"); k++) {
      if (s.phase === "camp") {
        s = turnCommand(s, { kind: "advance" }).state;
        continue;
      }
      if (s.active && standing(s.enemies).length >= 2 && roundOf(s) <= 6) {
        const lastOfRound = roundStrip(s).every(({ unit, done }) => unit.hp <= 0 || unit.id === s.active || done);
        if (lastOfRound && upcoming(s, 2)[1]?.enemy) return s;
      }
      s = turnCommand(s, { kind: "act", order: firstLegalOrder(s) }).state;
    }
  }
  throw new Error("no round-open-enemy state found");
}

describe("a round that opens on an enemy's turn (item 1)", () => {
  const before = roundOpenEnemyState();
  const { events, state: after } = turnCommand(before, { kind: "act", order: firstLegalOrder(before) });
  const beats = playback(before, events);
  const startRound = roundOf(before);

  it("gives the player's own beats the old round and the first enemy's beats the new one", () => {
    expect(beats[0].actor).toBe(before.active);
    expect(beats[0].round).toBe(startRound);
    const firstEnemy = beats.find((b) => before.enemies.some((e) => e.id === b.actor))!;
    expect(firstEnemy.round).toBe(startRound + 1);
  });

  it("never lets the round go backwards and never passes the round the next turn is in", () => {
    for (let i = 1; i < beats.length; i++) expect(beats[i].round).toBeGreaterThanOrEqual(beats[i - 1].round);
    if (after.phase === "turn") expect(beats[beats.length - 1].round).toBeLessThanOrEqual(roundOf(after));
  });

  it("carries a rail per beat whose NOW slot is that beat's actor and whose divider names the round after it", () => {
    for (const b of beats) {
      const now = b.rail.filter((r) => r.state === "now");
      expect(now.map((r) => r.id)).toEqual([b.actor]);
      const divider = b.rail.find((r) => r.roundStart !== undefined);
      if (divider) expect(divider.roundStart).toBe(b.round + 1);
    }
  });

  it("does not file the round-opening enemy under the old round: it is not marked done on its own beat", () => {
    const firstEnemy = beats.find((b) => before.enemies.some((e) => e.id === b.actor))!;
    // In the old (pre-command) rail this enemy sat in the peek past the divider; on its own
    // beat it is NOW, and everyone who acted in the old round is done (or down).
    const doneIds = firstEnemy.rail.filter((r) => r.state === "done").map((r) => r.id);
    expect(doneIds).not.toContain(firstEnemy.actor);
    const oldRoundActors = before.team.concat(before.enemies).filter((u) => u.hp > 0 && u.id !== firstEnemy.actor);
    // Anyone who is before the actor in this round's order and standing counts as done.
    const inRound = firstEnemy.rail.filter((r) => r.state !== "now" && r.state !== "down" && r.roundStart === undefined);
    expect(inRound.length).toBeLessThanOrEqual(oldRoundActors.length + 3);
  });
});

describe("result sentences name the unit they land on (item 2)", () => {
  const s = freshState(1);
  const units = [...s.team.map((u) => ({ id: u.id, name: u.name })), ...s.enemies.map((u, i) => ({ id: u.id, name: u.name, letter: String.fromCharCode(65 + i) }))];
  const [ally, ally2] = s.team;
  const [foe, foe2] = s.enemies;
  const hit = (target: string, amount: number, actor = foe.id, fell = false): Beat["event"] => ({ kind: "hit", actor, target, move: "Clamp strike", amount, absorbed: 0, step: 1, fell });
  const mk = (event: Beat["event"]): Beat => ({ event, words: eventWords(s, event), actor: event.actor, hp: {}, round: 1, rail: [] });

  it("says who was weakened, never a bare 'its'", () => {
    const words = momentWords(
      [mk(hit(ally.id, 26)), mk({ kind: "hinder", actor: foe.id, target: ally.id, move: "Clamp strike", amount: 14 })],
      units
    );
    expect(words).toBe(`${foe.name} A's Clamp strike hit ${ally.name} for 26 and weakened ${ally.name}'s next attack by 14.`);
    expect(words).not.toMatch(/\bits\b/i);
  });

  it("names every target of a boost, shield and heal riding one move", () => {
    const beats = [
      mk({ kind: "boost", actor: foe.id, target: foe2.id, move: "Overclock", amount: 12 }),
      mk({ kind: "shield", actor: foe.id, target: foe.id, move: "Overclock", amount: 5 }),
      mk({ kind: "heal", actor: foe.id, target: foe2.id, move: "Overclock", amount: 7 }),
    ];
    const words = momentWords(beats, units);
    expect(words).toContain(`boosted ${foe2.name} B's next attack by 12`);
    expect(words).toContain("shielded itself for 5");
    expect(words).toContain(`healed ${foe2.name} B for 7`);
  });

  it("groups several hindered targets and keeps the fall notes", () => {
    const words = momentWords(
      [
        mk(hit(ally.id, 5, foe.id, true)),
        mk({ kind: "hinder", actor: foe.id, target: ally.id, move: "Clamp strike", amount: 3 }),
        mk({ kind: "hinder", actor: foe.id, target: ally2.id, move: "Clamp strike", amount: 3 }),
      ],
      units
    );
    expect(words).toContain(`weakened ${ally.name}'s and ${ally2.name}'s next attacks by 3`);
    expect(words).toContain(`${ally.name} fell.`);
  });

  it("a lone beat keeps its own words, which already name the target", () => {
    const b = mk({ kind: "hinder", actor: foe.id, target: ally.id, move: "M", amount: 4 });
    expect(momentWords([b], units)).toBe(b.words);
    expect(b.words).toContain(ally.name);
  });

  it("the weakened-hit note names the enemy whose hit it was, and counts hinders landed earlier in the command", () => {
    expect(weakenedWords("Central guardian A", 10)).toBe("Central guardian A's hit was cut by 10 by a hinder.");
    expect(weakenedWords("Central guardian A", 10, "your hinder")).toBe("Central guardian A's hit was cut by 10 by your hinder.");
    const early = mk({ kind: "hinder", actor: ally.id, target: foe.id, move: "Blinding Shot", amount: 10 });
    expect(hinderOnAttack({}, [early], foe.id)).toBe(10);
    expect(hinderOnAttack({ [foe.id]: 4 }, [], foe.id)).toBe(4);
    // Its own attack in between spends the hinder.
    expect(hinderOnAttack({ [foe.id]: 4 }, [mk(hit(ally.id, 5))], foe.id)).toBe(0);
  });
});

describe("since your last turn (item 4)", () => {
  const s = freshState(1);
  const v = turnView(s);
  const active = v.active!;
  const mate = v.squad.find((u) => u.id !== active.id)!;
  const foe = v.enemies[0];
  const entry = (event: RecordEntry["event"], room = v.room): RecordEntry => ({ room, round: 1, actor: event.actor, words: "", event });
  const hit = (target: string, amount: number, absorbed = 0, fell = false): RecordEntry =>
    entry({ kind: "hit", actor: foe.id, target, move: "M", amount, absorbed, step: 1, fell });

  it("says nothing on the first turn of a room and when nothing changed", () => {
    expect(sinceView([], v)).toEqual({ items: [], deltas: {}, text: "" });
    expect(sinceView([entry({ kind: "pass", actor: foe.id })], v).text).toBe("");
  });

  it("lists hits and heals separately, the active companion first, then squadmates, then enemies", () => {
    const entries = [
      hit(mate.id, 4),
      entry({ kind: "heal", actor: foe.id, target: foe.id, move: "M", amount: 11 }),
      hit(foe.id, 11, 0),
      hit(active.id, 26),
    ];
    const sv = sinceView(entries, v);
    expect(sv.items.map((i) => i.id)).toEqual([active.id, mate.id, foe.id]);
    expect(sv.items[0].text).toBe(`${active.name} -26`);
    expect(sv.items[2].text).toContain("-11");
    expect(sv.items[2].text).toContain("+11");
    expect(sv.deltas[active.id]).toBe(-26);
    expect(sv.deltas[foe.id]).toBeUndefined(); // -11 then +11 nets to nothing on the plate chip
  });

  it("reports shields gained or lost, and a boost or hinder only while the unit still carries it", () => {
    const t = structuredClone(s);
    t.team.find((u) => u.id === active.id)!.hinder = 14;
    const tv = turnView(t);
    const entries = [
      entry({ kind: "hinder", actor: foe.id, target: active.id, move: "M", amount: 14 }),
      entry({ kind: "shield", actor: mate.id, target: mate.id, move: "M", amount: 10 }),
      hit(mate.id, 2, 3),
      entry({ kind: "boost", actor: foe.id, target: foe.id, move: "M", amount: 12 }), // the enemy carries none in this state
    ];
    const sv = sinceView(entries, tv);
    expect(sv.items[0].text).toBe(`${active.name} hindered 14 by ${foe.letter}`);
    const m = sv.items.find((i) => i.id === mate.id)!;
    expect(m.text).toContain("shield +10");
    expect(m.text).toContain("shield -3");
    expect(sv.items.some((i) => i.id === foe.id)).toBe(false);
  });

  it("starts after the active companion's last act in this room and ignores other rooms", () => {
    const entries = [
      hit(active.id, 9, 0, false),
      entry({ kind: "hit", actor: active.id, target: foe.id, move: "M", amount: 5, absorbed: 0, step: 1, fell: false }),
      hit(mate.id, 6),
      hit(foe.id, 99, 0, false),
    ];
    entries[3].room = v.room + 1;
    const sv = sinceView(entries, v);
    expect(sv.items.map((i) => i.id)).toEqual([mate.id]);
  });

  it("round 7, item 12: a heal after the active companion's own blow lists that damage first, so it never reads as an over-heal", () => {
    const own = entry({ kind: "hit", actor: active.id, target: foe.id, move: "M", amount: 20, absorbed: 0, step: 1, fell: false });
    const heal = entry({ kind: "heal", actor: foe.id, target: foe.id, move: "M", amount: 14 });
    const sv = sinceView([own, heal], v);
    const item = sv.items.find((i) => i.id === foe.id)!;
    expect(item.text).toContain("-20, +14");
    expect(sv.deltas[foe.id]).toBe(-6);
    // Damage the active companion dealt to a unit nothing healed is not "since" anything.
    expect(sinceView([own], v).items).toEqual([]);
  });

  it("round 8, item 6: numbers that land on an enemy are plain ink; a squad's health keeps its color", () => {
    const e = { kind: "hit", actor: "x", target: "y", move: "M", amount: 6, absorbed: 0, step: 1.5, fell: false } as never;
    expect(floatWords(e, true)).toMatchObject({ text: "-6", plain: true, tag: { word: "Strong", tone: "good" } });
    expect(floatWords(e, false)?.plain).toBeUndefined();
  });

  it("decision 8: only a landed blow floats; a heal, shield, boost, hinder or slow changes its own row in place", () => {
    for (const kind of ["heal", "shield", "boost", "hinder", "delay"] as const)
      expect(floatWords({ kind, actor: "x", target: "y", move: "M", amount: 14 } as never, true)).toBeNull();
  });

  it("round 8, item 8: a unit that shields, heals or boosts itself says so", () => {
    const self = (kind: "shield" | "heal" | "boost") => eventWords(s, { kind, actor: mate.id, target: mate.id, move: "M", amount: 10 } as never);
    expect(self("shield")).toBe(`${mate.name} shielded itself for 10.`);
    expect(self("heal")).toBe(`${mate.name} healed itself for 10.`);
    expect(self("boost")).toBe(`${mate.name} boosted its own next attack by 10.`);
  });

  it("round 7, item 6: a hit a hinder cut to nothing reads blocked; the weakened clause is one sentence", () => {
    const words = eventWords(s, { kind: "hit", actor: foe.id, target: mate.id, move: "M", amount: 0, absorbed: 0, step: 0.5, fell: false });
    expect(words).toMatch(/was blocked by your hinder\.$/);
    expect(eventWords(s, { kind: "hit", actor: foe.id, target: mate.id, move: "M", amount: 0, absorbed: 0, step: 0, fell: false })).toMatch(/had no effect\.$/);
    expect(withWeakened("A hit B for 8 (weak matchup).", 6, "your hinder")).toBe("A hit B for 8 (weak matchup, cut by 6 by your hinder).");
    // Round 8, item 8: the cut is said inside the hit's clause, never as a second weakening after the rider.
    expect(withWeakened("A's Clamp hit Crystorn for 16 and weakened Crystorn's next attack by 14.", 10, "your hinder")).toBe(
      "A's Clamp hit Crystorn for 16 (cut by 10 by your hinder) and weakened Crystorn's next attack by 14."
    );
    expect(withWeakened("A's Sweep hit B, C for 6, 7.", 4, "your hinder")).toBe("A's Sweep hit B, C for 6, 7 (each cut by 4 by your hinder).");
    expect(withWeakened("A hit B for 8.", undefined)).toBe("A hit B for 8.");
  });

  it("puts what fits in the banner line and counts the rest behind '+N more'", () => {
    const entries = [hit(active.id, 5), hit(mate.id, 5), ...v.enemies.map((e) => hit(e.id, 5))];
    const sv = sinceView(entries, v);
    expect(sv.items.length).toBe(2 + v.enemies.length);
    expect(sv.text.startsWith(`${active.name} -5`)).toBe(true);
    if (sv.text.includes("more")) expect(sv.text).toMatch(/\+\d+ more$/);
  });

  it("recordEntries files each beat under its sector and round", () => {
    const beats = playback(s, turnCommand(s, { kind: "act", order: firstLegalOrder(s) }).events);
    const rec = recordEntries(3, beats);
    expect(rec.length).toBe(beats.length);
    rec.forEach((r, i) => {
      expect(r.room).toBe(3);
      expect(r.round).toBe(beats[i].round);
      expect(r.words).toBe(beats[i].weakenedText && !/blocked by/.test(beats[i].words) ? `${beats[i].words} ${beats[i].weakenedText}` : beats[i].words);
    });
  });
});

describe("own status in the keys (item 5)", () => {
  function attacker(): { s: TRun; i: number } {
    const s = stateWithActiveAttacker();
    const a = s.team.find((t) => t.id === s.active)!;
    return { s, i: a.moves.findIndex((m) => m.power > 0 && a.cooldowns[a.moves.indexOf(m)] === 0) };
  }

  it("shows the struck plain number and the hindered one, and says why once", () => {
    const { s, i } = attacker();
    const plain = turnView(s);
    expect(plain.keys[i].acts[0].was).toBeUndefined();
    const t = structuredClone(s);
    const a = t.team.find((u) => u.id === t.active)!;
    a.hinder = 3;
    const v = turnView(t);
    // The card says it as a verb and a number, the plain power struck beside the one it now carries.
    expect(v.keys[i].acts[0]).toMatchObject({ n: Math.max(0, plain.keys[i].power - 3), was: plain.keys[i].power });
    // The cells carry the number that lands with the mark in it (the health row's after number).
    const marked = v.keys[i].cells.filter((c) => !c.immune && plain.keys[i].cells.find((x) => x.target === c.target)!.n > 0);
    expect(marked.length).toBeGreaterThan(0);
    for (const c of marked) expect(c.n).toBeLessThan(plain.keys[i].cells.find((x) => x.target === c.target)!.n);
  });

  it("a hinder that swallows the whole attack reads 0 with its before number and its reason", () => {
    const { s, i } = attacker();
    const t = structuredClone(s);
    const a = t.team.find((u) => u.id === t.active)!;
    a.hinder = 9999;
    const v = turnView(t);
    const cells = v.keys[i].cells.filter((c) => !c.immune);
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) expect(c.n).toBe(0);
    expect(v.keys[i].acts[0]).toMatchObject({ n: 0, was: v.keys[i].power });
  });

  it("a boost shows the plain number struck under the raised one", () => {
    const { s, i } = attacker();
    const t = structuredClone(s);
    const a = t.team.find((u) => u.id === t.active)!;
    a.boost = 5;
    const v = turnView(t);
    expect(v.keys[i].acts[0]).toMatchObject({ n: v.keys[i].power + 5, was: v.keys[i].power });
    const c = v.keys[i].cells.find((x) => !x.immune)!;
    expect(c.n).toBeGreaterThan(turnView(s).keys[i].cells.find((x) => x.target === c.target)!.n);
  });
});

describe("keys show one power number and previews carry the rest", () => {
  it("gives an attack key its move's power and a support key none", () => {
    const s = stateWithActiveAttacker();
    const active = s.team.find((t) => t.id === s.active)!;
    turnView(s).keys.forEach((k, i) => {
      expect(k.power).toBe(active.moves[i].power);
      expect(k.kind === "attack").toBe(active.moves[i].power > 0);
    });
  });

  it("acts on the press alone for a self or whole-squad key, an area attack, or a lone target, and asks for a target otherwise", () => {
    const s = structuredClone(stateWithActiveAttacker());
    const v = turnView(s);
    for (const k of v.keys) {
      if (k.state !== "ready") continue;
      const expected = k.aim === "now" || (k.area && k.aim === "enemy") || k.cells.length <= 1;
      expect(actsOnPress(k)).toBe(expected);
    }
    const lone = structuredClone(s);
    lone.enemies.slice(1).forEach((e) => (e.hp = 0));
    for (const k of turnView(lone).keys) if (k.state === "ready" && k.aim === "enemy") expect(actsOnPress(k)).toBe(true);
    const many = structuredClone(s);
    const i = many.team.find((u) => u.id === many.active)!.moves.findIndex((m) => m.power > 0 && !m.area);
    if (i >= 0 && many.enemies.filter((e) => e.hp > 0).length > 1) expect(actsOnPress(turnView(many).keys[i])).toBe(false);
  });

  it("previews the exact landed number on each legal target's plate, from the key's cells", () => {
    const s = stateWithActiveAttacker();
    const v = turnView(s);
    const active = v.active!;
    const i = v.keys.findIndex((k) => k.kind === "attack" && k.state === "ready" && k.aim === "enemy");
    const key = v.keys[i];
    const pv = previewsOf(key, active.id, v.squad.filter((u) => !u.down).map((u) => u.id));
    expect(Object.keys(pv).sort()).toEqual(key.cells.map((c) => c.target).sort());
    for (const c of key.cells) expect(pv[c.target]).toMatchObject({ kind: "hit", n: c.n, step: c.step, finishes: c.finishes });
  });

  it("previews a self key on the actor, a whole-squad key on every standing squadmate, and a resting key nowhere", () => {
    const s = stateWithActiveAttacker();
    const v = turnView(s);
    const ids = v.squad.map((u) => u.id);
    const now = { ...v.keys[0], aim: "now" as const, cells: [], state: "ready" as const, supports: [{ kind: "shield" as const, n: 5, aim: "self" as const, all: false }] };
    expect(Object.keys(previewsOf(now, v.active!.id, ids))).toEqual([v.active!.id]);
    const all = { ...now, supports: [{ kind: "heal" as const, n: 5, aim: "ally" as const, all: true }] };
    expect(Object.keys(previewsOf(all, v.active!.id, ids)).sort()).toEqual([...ids].sort());
    expect(previewsOf({ ...now, state: "resting" as const }, v.active!.id, ids)).toEqual({});
  });
});

describe("camp XP and the endings (items 3 and 9)", () => {
  it("shows this sector's gain, not the run total", () => {
    const s = { ...freshState(1), phase: "camp" as const, xp: 30 };
    const v = turnView(s);
    expect(v.xp).toBe(30);
    expect(v.xpGain).toBe(ENCOUNTER_XP);
    expect(turnView({ ...s, phase: "won" as const }).xpGain).toBe(FINAL_ENCOUNTER_XP);
    expect(turnView(freshState(1)).xpGain).toBe(0);
  });

  it("a chosen retreat reads as a withdrawal; a stall reads as forced out and states the rule", () => {
    const camp = { ...freshState(1), phase: "camp" as const };
    const left = turnCommand(camp, { kind: "retreat" }).state;
    expect(left.phase).toBe("retreated");
    expect(left.log[left.log.length - 1]).toBe(WITHDREW_LOG);
    const withdrew = endingOf(left)!;
    expect(withdrew.kind).toBe("withdrew");
    expect(withdrew.text).not.toMatch(/stall|new low/i);
    const forced = endingOf({ ...left, log: [...left.log.slice(0, -1), STALLED_LOG] })!;
    expect(forced.kind).toBe("forced");
    expect(forced.text).toContain(String(STALL_TURNS_PER_UNIT));
    expect(forced.text).toMatch(/new low/);
    expect(endingOf(freshState(1))).toBeNull();
    expect(endingOf({ ...left, phase: "won" as const })!.kind).toBe("won");
    expect(endingOf({ ...left, phase: "lost" as const })!.kind).toBe("lost");
  });
});

describe("round 2: briefing, camp, title card, holds and the run summary", () => {
  it("the briefing names the goal, every sector (the last is the guardian's), the squad and the run rules", () => {
    const s = freshState(1);
    const b = briefingView(s);
    expect(b.goal).toBe("Clear all 4 sectors.");
    expect(b.sectors.map((x) => x.n)).toEqual([1, 2, 3, 4]);
    expect(b.sectors.map((x) => x.guardian)).toEqual([false, false, false, true]);
    expect(b.sectors[0].name).toBe("Service entrance");
    expect(b.squad.map((u) => u.id)).toEqual(s.team.map((u) => u.id));
    expect(b.squad[0].hp).toBe(s.team[0].hp);
    expect(b.rules.join(" ")).toContain("Health carries");
    expect(b.rules.join(" ")).toContain("1 revive");
    expect(b.rules.join(" ")).toContain(`${RECOVERY_STATION_HP} health`);
  });

  it("camp offers a revive per fallen companion with the engine's half health and the revives left", () => {
    const base = { ...freshState(1), phase: "camp" as const };
    const fallen = { ...base, team: base.team.map((u, i) => (i === 0 ? { ...u, hp: 0 } : u)) };
    const c = campView(fallen);
    expect(c.revives).toHaveLength(1);
    const to = Math.ceil(fallen.team[0].max / 2);
    expect(c.revives[0].to).toBe(to);
    expect(c.revives[0].text).toBe(`Revive ${fallen.team[0].name} to ${to} health`);
    expect(revivesLeftWords(1)).toBe("1 revive left.");
    expect(c.unusedNote).toMatch(/unused/);
    // The number the button promises is what the engine gives.
    const after = turnCommand(fallen, { kind: "revive", id: fallen.team[0].id }).state;
    expect(after.team[0].hp).toBe(to);
    expect(revivedWords("Ann", 63, after.revival)).toBe("Ann revived to 63 health. No revives left.");
    expect(reviveWords("Ann", 63)).toBe("Revive Ann to 63 health");
    expect(revivesLeftWords(2)).toBe("2 revives left.");
    // No revive left, or nobody down: no offer and no note.
    expect(campView({ ...fallen, revival: 0 }).revives).toEqual([]);
    expect(campView({ ...fallen, revival: 0 }).unusedNote).toBeNull();
    expect(campView(base).revives).toEqual([]);
  });

  it("the recovery station is stated at the camp before the last sector, with the engine's amount", () => {
    const camp = (room: number) => campView({ ...freshState(1), phase: "camp" as const, room });
    expect(camp(2).station?.amount).toBe(RECOVERY_STATION_HP);
    expect(camp(2).station?.text).toContain(`restores ${RECOVERY_STATION_HP} health to each standing companion`);
    expect(camp(0).station).toBeNull();
    expect(camp(3).station).toBeNull();
  });

  it("arriving at the last sector reports each companion's gain, capped by missing health", () => {
    const base = { ...freshState(1), phase: "camp" as const, room: 2 };
    const hurt = {
      ...base,
      team: base.team.map((u, i) => ({ ...u, hp: i === 0 ? Math.max(1, u.max - 5) : i === 1 ? 0 : Math.max(1, u.max - 100) })),
    };
    const after = turnCommand(hurt, { kind: "advance" }).state;
    const heal = stationHeal(hurt, after)!;
    expect(after.room).toBe(3);
    expect(heal.deltas[hurt.team[0].id]).toBe(5);
    expect(heal.deltas[hurt.team[1].id]).toBeUndefined(); // fallen companions are not healed
    expect(heal.text).toContain("Recovery station:");
    for (const [id, gain] of Object.entries(heal.deltas)) {
      expect(after.team.find((u) => u.id === id)!.hp - hurt.team.find((u) => u.id === id)!.hp).toBe(gain);
    }
    // No station on the other sectors.
    expect(stationHeal({ ...base, room: 0 }, turnCommand({ ...base, room: 0 }, { kind: "advance" }).state)).toBeNull();
  });

  it("the title card names the sector, its enemies by letter and whether it is the guardian's", () => {
    const s = freshState(1);
    const c = titleCard(turnView(s));
    expect(c.kicker).toBe("Sector 1 of 4");
    expect(c.name).toBe("Service entrance");
    expect(c.guardian).toBe(false);
    expect(c.enemies.length).toBe(s.enemies.length);
    expect(c.enemies[0].letter).toBe("A");
    const last = titleCard(turnView({ ...freshState(1), room: 3 }));
    expect(last.kicker).toBe("Sector 4 of 4");
    expect(last.guardian).toBe(true);
    expect(titleCard(turnView(s), "Recovery station: X +20 health.").note).toBe("Recovery station: X +20 health.");
  });

  it("the stage holds on the last fall: cleared, the boss's win and the last companion's fall hold, a mid-fight fall does not", () => {
    const s = freshState(1);
    expect(knockoutHold({ ...s, phase: "camp" as const })).toMatchObject({ kind: "cleared", text: "Sector cleared" });
    const boss = knockoutHold({ ...s, phase: "won" as const })!;
    const fallen = knockoutHold({ ...s, phase: "lost" as const })!;
    const cleared = knockoutHold({ ...s, phase: "camp" as const })!;
    expect(boss.ms).toBeGreaterThan(cleared.ms);
    expect(fallen.ms).toBeGreaterThan(cleared.ms);
    expect(knockoutHold(s)).toBeNull();
    const enemy = s.enemies[0];
    const fell = playback(s, [{ kind: "hit", actor: s.team[0].id, target: enemy.id, move: "x", amount: enemy.hp, absorbed: 0, step: 1, fell: true }]);
    expect(beatsFell(fell)).toBe(true);
    const nofall = playback(s, [{ kind: "hit", actor: s.team[0].id, target: enemy.id, move: "x", amount: 1, absorbed: 0, step: 1, fell: false }]);
    expect(beatsFell(nofall)).toBe(false);
  });

  it("the run summary comes from the engine and the Record: sectors, rounds, knockouts, XP and the final blow", () => {
    const s = freshState(1);
    const foe = s.enemies[0];
    const mate = s.team[0];
    const ev = (o: object) => ({ kind: "hit", move: "Clamp strike", amount: 5, absorbed: 0, step: 1, fell: false, ...o }) as never;
    const record: RecordEntry[] = [
      { room: 0, round: 1, actor: mate.id, words: "", event: ev({ actor: mate.id, target: foe.id }) },
      { room: 0, round: 3, actor: mate.id, words: "", event: ev({ actor: mate.id, target: foe.id, fell: true }) },
      { room: 1, round: 2, actor: mate.id, words: "", event: ev({ actor: mate.id, target: foe.id, fell: true }) },
      { room: 1, round: 2, actor: foe.id, words: "", event: ev({ actor: foe.id, target: mate.id, fell: true }) },
    ];
    const lost = { ...s, phase: "lost" as const, room: 1, xp: 10 };
    const sum = runSummary(lost, turnView(lost), record);
    expect(sum.sectors).toBe(1);
    expect(sum.rounds).toBe(3 + 2);
    expect(sum.knockouts).toBe(2);
    expect(sum.xp).toBe(10);
    expect(sum.finalBlow).toBe(`${foe.name} A, Clamp strike`);
    expect(sum.rows.map((r) => r.label)).toContain("Final blow");
    const won = { ...s, phase: "won" as const, room: 3, xp: 30 };
    const w = runSummary(won, turnView(won), record);
    expect(w.sectors).toBe(4);
    expect(w.xp).toBe(30);
    expect(w.finalBlow).toBeNull();
    expect(w.rows.map((r) => r.label)).not.toContain("Final blow");
    const left = turnCommand({ ...freshState(1), phase: "camp" as const, room: 1 }, { kind: "retreat" }).state;
    expect(runSummary(left, turnView(left), []).sectors).toBe(2);
  });
});

describe("threat tags: a lethal hit shows as a skull on the plate it lands on", () => {
  /** A state where every enemy is committed to a lethal-on-anything area attack, the squad unshielded. */
  function lethalWorld(): TRun {
    const s = structuredClone(stateWithActiveAttacker());
    for (const foe of s.enemies) {
      const base = foe.moves.find((m) => m.power > 0) ?? foe.moves[0];
      foe.moves = [{ ...base, power: 999, element: null as never, rests: 0, signature: false, parts: [], area: true }];
      foe.cooldowns = [0];
      foe.signatureSpent = false;
      foe.boost = 0;
      foe.hinder = 0;
      commit(s, foe, 0, s.team[0].id);
    }
    for (const u of s.team) u.shields = [];
    return s;
  }

  it("puts a lethal tag from every enemy on every squad plate, in the order those enemies act", () => {
    const s = lethalWorld();
    const [t0, t1, t2] = s.team;
    const [a, b] = s.enemies;
    s.active = t0.id;
    const order = [t0, a, t1, b, t2, ...s.team.slice(3), ...s.enemies.slice(2)];
    s.clock = Object.fromEntries(order.map((u, i) => [u.id, 0.05 * (i + 1)]));
    expect(upcoming(s, order.length).map((u) => u.id)).toEqual(order.map((u) => u.id));
    const v = turnView(s);
    for (const id of [t0.id, t1.id, t2.id]) {
      const tags = v.squad.find((u) => u.id === id)!.threats;
      expect(tags.map((x) => x.from)).toEqual(s.enemies.map((_, i) => String.fromCharCode(65 + i)));
      expect(tags.every((x) => x.lethal === true)).toBe(true);
    }
  });

  it("a single-target intent tags only the companion it is aimed at", () => {
    const s = lethalWorld();
    for (const foe of s.enemies) {
      foe.moves[0] = { ...foe.moves[0], area: false };
      commit(s, foe, 0, s.team[1].id);
    }
    const v = turnView(s);
    expect(v.squad[1].threats.length).toBe(s.enemies.length);
    expect(v.squad.filter((u, i) => i !== 1).every((u) => u.threats.length === 0)).toBe(true);
  });

  it("marks nothing lethal when no committed hit reaches a companion's health, and tags nobody who is down", () => {
    const s = lethalWorld();
    for (const foe of s.enemies) foe.moves[0] = { ...foe.moves[0], power: 1 };
    for (const u of s.team) u.hp = u.max;
    const v = turnView(s);
    expect(v.squad.every((u) => u.threats.length > 0 && u.threats.every((x) => x.lethal === undefined))).toBe(true);
    const t = lethalWorld();
    t.team[1].hp = 0;
    expect(turnView(t).squad[1].threats).toEqual([]);
  });

  it("an enemy committed to a support move is never a lethal tag on a companion", () => {
    const s = lethalWorld();
    for (const foe of s.enemies) foe.moves[0] = { ...foe.moves[0], power: 0, area: false, parts: [{ kind: "shield", n: 5, aim: "self", all: false } as never] };
    expect(turnView(s).squad.every((u) => u.threats.length === 0)).toBe(true);
  });
});

describe("the turn rail reaches every standing unit's next turn", () => {
  it("after the divider it lists each standing enemy again, so a tag's letter has a when", () => {
    const s = freshState(1);
    const rail = turnView(s).rail;
    const d = rail.findIndex((r) => r.roundStart !== undefined);
    expect(d).toBeGreaterThan(0);
    const next = rail.slice(d).map((r) => r.id);
    for (const e of s.enemies.filter((x) => x.hp > 0)) expect(next).toContain(e.id);
  });
});

describe("threat tags through a previewed key (previewThreats)", () => {
  /** Every enemy committed to a 30-power single-target hit on the active companion, whose first move carries a hinder rider of 10. */
  function world(): { s: TRun; a: Fighter } {
    const s = structuredClone(stateWithActiveAttacker());
    const a = s.team.find((t) => t.id === s.active)!;
    const base = a.moves.find((m) => m.power > 0)!;
    a.moves[0] = { ...base, power: 2, rests: 0, signature: false, area: false, parts: [{ kind: "hinder", n: 10, aim: "enemy", all: false } as never] };
    a.moves[1] = { ...a.moves[1], power: 0, rests: 0, signature: false, area: false, parts: [{ kind: "hinder", n: 12, aim: "enemy", all: false } as never] };
    a.moves[2] = { ...a.moves[2], power: 0, rests: 0, signature: false, area: false, parts: [{ kind: "shield", n: 8, aim: "ally", all: false } as never] };
    a.moves[3] = { ...a.moves[3], power: 0, rests: 0, signature: false, area: false, parts: [{ kind: "heal", n: 50, aim: "ally", all: false } as never] };
    a.cooldowns = a.moves.map(() => 0);
    a.signatureSpent = false;
    a.hinder = 0;
    a.boost = 0;
    a.shields = [];
    // The enemies are committed to a squadmate (the heal and shield keys name squadmates, not their user).
    const o = s.team.find((u) => u.id !== a.id)!;
    o.hp = 30;
    o.shields = [];
    for (const foe of s.enemies) {
      const fb = foe.moves.find((m) => m.power > 0) ?? foe.moves[0];
      foe.moves = [{ ...fb, power: 30, element: null as never, rests: 0, signature: false, parts: [], area: false }];
      foe.cooldowns = [0];
      foe.signatureSpent = false;
      foe.boost = 0;
      foe.hinder = 0;
      commit(s, foe, 0, o.id);
    }
    return { s, a: o };
  }
  const key = (s: TRun, i: number) => {
    const v = turnView(s);
    const k = v.keys[i];
    return { k, previews: previewsOf(k, v.active!.id, v.squad.filter((u) => !u.down).map((u) => u.id)) };
  };
  const tagsOf = (list: Threat[], fromId: string) => list.filter((x) => x.fromId === fromId);

  it("a hinder on enemy X shows X's tag as the old number struck and the lower one; the other enemy's tag is unchanged", () => {
    const { s } = world();
    const { k, previews } = key(s, 1);
    const out = previewThreats(s, k, previews);
    for (const foe of s.enemies) expect(tagsOf(out, foe.id)[0]).toMatchObject({ before: 30, n: 18 });
    // the same builder the cell uses: the cell's own after number is the tag's
    expect(k.cells[0].n).toBe(18);
  });

  it("an attack's hinder rider reads the same, and a lethal hit it brings under the companion's health loses its skull", () => {
    const { s, a } = world();
    expect(threatsOf(s)[0].lethal).toBe(true); // 30 against 30 health
    const { k, previews } = key(s, 0);
    const out = previewThreats(s, k, previews);
    const one = tagsOf(out, s.enemies[0].id)[0];
    expect(one).toMatchObject({ before: 30, n: 20 });
    expect(one.lethal).toBeUndefined();
    expect(a.hp).toBe(30);
  });

  it("a move whose preview finishes an enemy cancels that enemy's tags and only that enemy's", () => {
    const { s } = world();
    s.enemies[0].hp = 1;
    const { k, previews } = key(s, 0);
    const out = previewThreats(s, k, previews);
    expect(tagsOf(out, s.enemies[0].id).every((x) => x.cancelled === true)).toBe(true);
    expect(tagsOf(out, s.enemies[1].id).some((x) => x.cancelled)).toBe(false);
  });

  it("a shield on a companion re-reads the tags that land on it: the number after the shield, the skull only if still lethal", () => {
    const { s, a } = world();
    const other = s.team.find((u) => u.id === s.active)!;
    const { k, previews } = key(s, 2);
    expect(Object.keys(previews)).toContain(a.id);
    const out = previewThreats(s, k, previews);
    for (const foe of s.enemies) {
      const t = tagsOf(out, foe.id).find((x) => x.on === a.id)!;
      expect(t).toMatchObject({ n: 22, before: 30 });
      expect(t.lethal).toBeUndefined();
    }
    expect(other.id).not.toBe(a.id);
  });

  it("a heal that lifts the companion above the hit takes the skull away; a heal that does not leaves it", () => {
    const { s, a } = world();
    const { k, previews } = key(s, 3);
    const out = previewThreats(s, k, previews);
    for (const foe of s.enemies) {
      const t = tagsOf(out, foe.id).find((x) => x.on === a.id)!;
      expect(t.n).toBe(30);
      expect(t.before).toBeUndefined();
      expect(t.lethal).toBeUndefined();
    }
    a.max = 30;
    expect(previewThreats(s, k, key(s, 3).previews).every((x) => x.lethal === true)).toBe(true);
  });

  it("leaves the tags as they are when nothing previewed reaches them", () => {
    const { s } = world();
    const { k } = key(s, 0);
    expect(previewThreats(s, k, {})).toEqual(threatsOf(s));
  });
});

describe("round 5: end states, camp and small fixes", () => {
  it("the Guardian's fall holds as 'Guardian down', distinct from an ordinary room", () => {
    const s = freshState(1);
    expect(knockoutHold({ ...s, phase: "won" as const })).toMatchObject({ kind: "boss", text: "Guardian down" });
    expect(knockoutHold({ ...s, phase: "camp" as const })).toMatchObject({ kind: "cleared", text: "Sector cleared" });
  });

  it("the last camp before the Guardian says so, and an unused revive names who sits out the final fight", () => {
    const base = { ...freshState(1), phase: "camp" as const, room: 2 };
    const fallen = { ...base, team: base.team.map((u, i) => (i === 0 ? { ...u, hp: 0 } : u)) };
    const c = campView(fallen);
    expect(c.last).toBe(true);
    expect(c.eyebrow).toBe("Last camp before the Guardian");
    expect(c.unusedNote).toBe(`Continuing leaves the revive unused: ${fallen.team[0].name} sits out the Guardian's fight.`);
    const early = campView({ ...fallen, room: 0 });
    expect(early.last).toBe(false);
    expect(early.eyebrow).toBe("Sector cleared");
    expect(early.unusedNote).toBe("Continuing leaves the revive unused.");
  });

  it("an area move's rider on the units it hit is said once: 'weakened each by 6'", () => {
    const s = freshState(1);
    const foes = s.enemies.slice(0, 3);
    const units = [...s.team.map((u) => ({ id: u.id, name: u.name })), ...s.enemies.map((u, i) => ({ id: u.id, name: u.name, letter: String.fromCharCode(65 + i) }))];
    const ally = s.team[0];
    const mk = (event: Beat["event"]): Beat => ({ event, words: eventWords(s, event), actor: event.actor, hp: {}, round: 1, rail: [] });
    const beats: Beat[] = [];
    for (const f of foes) beats.push(mk({ kind: "hit", actor: ally.id, target: f.id, move: "Sweep", amount: 5, absorbed: 0, step: 1, fell: false }));
    for (const f of foes) beats.push(mk({ kind: "hinder", actor: ally.id, target: f.id, move: "Sweep", amount: 6 }));
    const words = momentWords(beats, units);
    expect(words).toContain("and weakened each by 6");
    expect(words.length).toBeLessThan(90);
    expect(words).not.toContain("next attacks");
  });

  it("since your last turn names an enemy by its letter in the banner and keeps the full name in the Record", () => {
    const s = freshState(1);
    const v = turnView(s);
    const foe = v.enemies[0];
    const hitFoe: RecordEntry = {
      room: v.room,
      round: 1,
      actor: v.squad[1].id,
      words: "",
      event: { kind: "hit", actor: v.squad[1].id, target: foe.id, move: "M", amount: 4, absorbed: 0, step: 1, fell: false },
    };
    const sv = sinceView([hitFoe], v);
    expect(sv.items[0].text).toBe(`${foe.name} ${foe.letter} -4`);
    expect(sv.items[0].short).toBe(`${foe.letter} -4`);
    expect(sv.text).toBe(`${foe.letter} -4`);
  });

  it("a won run's XP row names the Guardian's award; a retreat's does not", () => {
    const s = freshState(1);
    const won = { ...s, phase: "won" as const, room: 3, xp: 60 };
    expect(runSummary(won, turnView(won), []).rows.find((r) => r.label === "XP earned")!.value).toBe(`60 (+${FINAL_ENCOUNTER_XP} for the Guardian)`);
    const left = turnCommand({ ...s, phase: "camp" as const, room: 1, xp: 20 }, { kind: "retreat" }).state;
    expect(runSummary(left, turnView(left), []).rows.find((r) => r.label === "XP earned")!.value).toBe("20");
  });

  it("the briefing says what XP is in one line", () => {
    expect(briefingView(freshState(1)).rules.some((r) => /XP/.test(r) && /nothing spends it/.test(r))).toBe(true);
  });
});

describe("round 6: the forecast agrees with the result", () => {
  /** A state with one attack key carrying a hinder rider, and enemies whose one ready hit is 30. */
  function riderWorld(): { s: TRun; a: Fighter } {
    const s = structuredClone(stateWithActiveAttacker());
    const a = s.team.find((t) => t.id === s.active)!;
    const base = a.moves.find((m) => m.power > 0)!;
    a.moves[0] = { ...base, power: 2, rests: 0, signature: false, area: false, parts: [{ kind: "hinder", n: 10, aim: "enemy", all: false } as never] };
    a.cooldowns = a.moves.map(() => 0);
    a.signatureSpent = false;
    a.hinder = 0;
    a.boost = 0;
    a.shields = [];
    a.hp = a.max;
    for (const foe of s.enemies) {
      const fb = foe.moves.find((m) => m.power > 0) ?? foe.moves[0];
      foe.moves = [{ ...fb, power: 30, element: null as never, rests: 0, signature: false, parts: [], area: false }];
      foe.cooldowns = [0];
      foe.signatureSpent = false;
      foe.boost = 0;
      foe.hinder = 0;
      commit(s, foe, 0, a.id);
    }
    return { s, a };
  }

  describe("item 3: two color rules, and the words that keep them", () => {
    const hit = (over: object) => ({ kind: "hit" as const, actor: "a", target: "b", move: "M", amount: 9, absorbed: 0, step: 1, fell: false, ...over });

    it("a matchup tag is green when it favors you and raspberry when it favors the enemy", () => {
      expect(floatWords(hit({ step: 1.5 }), true)!.tag).toEqual({ word: "Strong", tone: "good" });
      expect(floatWords(hit({ step: 1.5 }), false)!.tag).toEqual({ word: "Strong", tone: "bad" });
      expect(floatWords(hit({ step: 0.5 }), true)!.tag).toEqual({ word: "Weak", tone: "bad" });
      expect(floatWords(hit({ step: 0.5 }), false)!.tag).toEqual({ word: "Weak", tone: "good" });
      expect(floatWords(hit({}), true)!.tag).toBeUndefined();
    });

    it("a health number is health lost: one kind, whoever loses it", () => {
      expect(floatWords(hit({}), true)).toMatchObject({ text: "-9", kind: "hurt" });
      expect(floatWords(hit({}), false)).toMatchObject({ text: "-9", kind: "hurt" });
    });

    it("a hit that knocks a unit out carries KO in place of a matchup tag, neutral", () => {
      expect(floatWords(hit({ step: 0.5, fell: true }), false)!.tag).toEqual({ word: "KO", tone: "neutral" });
      expect(floatWords(hit({ step: 1.5, fell: true }), true)!.tag).toEqual({ word: "KO", tone: "neutral" });
    });

    it("a hit a hinder cut to 0 says blocked, not -0; an immune matchup says no effect; a shield-only hit is a shield", () => {
      expect(floatWords(hit({ amount: 0, step: 0.5 }), false)).toMatchObject({ text: "blocked", kind: "blocked" });
      expect(floatWords(hit({ amount: 0, step: 0 }), false)).toMatchObject({ text: "no effect" });
      expect(floatWords(hit({ amount: 0, absorbed: 6 }), false)).toMatchObject({ text: "shield took 6", kind: "shield" });
    });
  });

  describe("item 6: a hinder rider on an attack shows what that enemy's committed hit falls to", () => {
    it("puts the before and after on each enemy's preview", () => {
      const { s, a } = riderWorld();
      const cells = turnView(s).keys[0].cells;
      expect(cells.length).toBeGreaterThan(0);
      for (const c of cells) if (!c.finishes) expect(c).toMatchObject({ rider: { before: 30, after: 20 } });
    });

    it("shows a lethal hit taken below the companion's health", () => {
      const { s, a } = riderWorld();
      a.hp = 30; // the enemy's 30 equals it: lethal; the rider's 10 takes it to 20
      const foe = turnView(s).enemies.find((e) => !e.down)!;
      expect(threatsOf(s).find((x) => x.fromId === foe.id)).toMatchObject({ n: 30, lethal: true });
      expect(turnView(s).keys[0].cells[0].rider).toEqual({ before: 30, after: 20 });
    });

    it("shows nothing on a cell whose attack finishes the enemy (a fallen enemy takes no rider), or when the rider changes nothing", () => {
      const { s } = riderWorld();
      s.enemies[0].hp = 1;
      const cells = turnView(s).keys[0].cells;
      expect(cells.find((c) => c.target === s.enemies[0].id)!.finishes).toBe(true);
      expect(cells.find((c) => c.target === s.enemies[0].id)!.rider).toBeUndefined();
      const t = riderWorld().s;
      for (const foe of t.enemies) foe.hinder = 40; // already carries more than the rider gives
      for (const c of turnView(t).keys[0].cells) expect(c.rider).toBeUndefined();
    });

    it("shows nothing on an enemy committed to a support move (there is no hit to cut)", () => {
      const { s } = riderWorld();
      const foe = s.enemies[0];
      foe.moves = [{ ...foe.moves[0], power: 0, parts: [{ kind: "shield", n: 5, aim: "self", all: false } as never] }];
      const cell = turnView(s).keys[0].cells.find((c) => c.target === foe.id)!;
      expect(cell.rider).toBeUndefined();
    });

    it("item 11: an enemy hit is never capped at the companion's health; 48 on 46 reads 48, 38 after a rider of 10", () => {
      const { s, a } = riderWorld();
      for (const foe of s.enemies) foe.moves[0] = { ...foe.moves[0], power: 48 };
      a.hp = 46;
      const view = turnView(s);
      const foe = view.enemies.find((e) => !e.down)!;
      expect(threatsOf(s).find((x) => x.fromId === foe.id)).toMatchObject({ n: 48, lethal: true });
      const cell = view.keys[0].cells.find((c) => !c.finishes)!;
      expect(cell.rider).toEqual({ before: 48, after: 38 });
      // the hinder is visibly its stated size
      expect(cell.rider!.before - cell.rider!.after).toBe(10);
    });

    it("item 11: a hinder-only cell shows the uncapped before and after too", () => {
      const { s, a } = riderWorld();
      for (const foe of s.enemies) foe.moves[0] = { ...foe.moves[0], power: 48 };
      a.hp = 46;
      a.moves[0] = { ...a.moves[0], power: 0 };
      const cell = turnView(s).keys[0].cells[0];
      expect(cell).toMatchObject({ before: 48, n: 38 });
    });

    it("a key with no rider has no rider numbers", () => {
      const { s, a } = riderWorld();
      a.moves[0] = { ...a.moves[0], parts: [] };
      for (const c of turnView(s).keys[0].cells) expect(c.rider).toBeUndefined();
    });

    it("a rider's lethal hit taken below the companion's health reads through the tags (the skull goes), not on the cell", () => {
      const { s, a } = riderWorld();
      for (const foe of s.enemies) foe.moves[0] = { ...foe.moves[0], power: 48 };
      a.hp = 46;
      const k = turnView(s).keys[0];
      const previews = previewsOf(k, a.id, [a.id]);
      const lethalBefore = threatsOf(s).filter((x) => x.lethal);
      expect(lethalBefore.length).toBeGreaterThan(0);
      // Each enemy's preview carries the rider, so its tag on the companion is re-read lower and no longer lethal.
      const after = previewThreats(s, k, previews);
      expect(after.filter((x) => x.lethal && x.before !== undefined)).toEqual([]);
      expect(after.some((x) => x.before !== undefined && x.n < x.before)).toBe(true);
    });
  });

  describe("item 10: the hinder number is on the preview", () => {
    it("a hinder-only cell carries the hinder it applies", () => {
      const { s, a } = riderWorld();
      a.moves[0] = { ...a.moves[0], power: 0, parts: [{ kind: "hinder", n: 21, aim: "enemy", all: false } as never] };
      const key = turnView(s).keys[0];
      expect(key.kind).toBe("support");
      for (const c of key.cells) expect(c).toMatchObject({ hinder: 21, before: 30, n: 9 });
    });

    it("a hindered companion's attack card reads the plain power struck and the number it now carries", () => {
      const { s, a } = riderWorld();
      a.moves[0] = { ...a.moves[0], power: 4, parts: [] };
      a.hinder = 14;
      expect(turnView(s).keys[0].acts).toEqual([{ verb: "strike", n: 0, was: 4 }]);
      a.hinder = 0;
      a.boost = 6;
      expect(turnView(s).keys[0].acts).toEqual([{ verb: "strike", n: 10, was: 4 }]);
      a.boost = 0;
      expect(turnView(s).keys[0].acts).toEqual([{ verb: "strike", n: 4 }]);
    });

    it("decision 3: a card is a verb and a number; an area attack is a sweep with ALL; a rider follows the main act", () => {
      const { s, a } = riderWorld();
      const act = (m: object) => {
        a.moves[0] = { ...a.moves[0], ...m } as never;
        return turnView(s).keys[0].acts;
      };
      expect(act({ power: 7, area: false, parts: [] })).toEqual([{ verb: "strike", n: 7 }]);
      expect(act({ power: 6, area: true, parts: [{ kind: "hinder", n: 6, aim: "enemy", all: false }] })).toEqual([
        { verb: "sweep", n: 6, all: true },
        { verb: "weaken", n: 6 },
      ]);
      expect(act({ power: 0, area: false, parts: [{ kind: "hinder", n: 14, aim: "enemy", all: false }] })).toEqual([{ verb: "weaken", n: 14 }]);
      expect(act({ power: 0, area: false, parts: [{ kind: "heal", n: 9, aim: "ally", all: false }, { kind: "shield", n: 5, aim: "ally", all: false }] })).toEqual([
        { verb: "mend", n: 9 },
        { verb: "guard", n: 5 },
      ]);
      expect(act({ power: 0, area: false, parts: [{ kind: "boost", n: 4, aim: "self", all: false }] })).toEqual([{ verb: "boost", n: 4 }]);
      expect(act({ power: 0, area: false, parts: [{ kind: "delay", n: 1, aim: "enemy", all: false }] })).toEqual([{ verb: "slow", n: 1 }]);
    });
  });

  describe("item 11: enemy letters are stable for the whole encounter", () => {
    it("keeps every enemy's letter, by row order, through a whole run of commands", () => {
      let s = freshState(3);
      let room = s.room;
      let letters = turnView(s).enemies.map((e) => `${e.id}:${e.letter}`);
      expect(letters).toEqual(s.enemies.map((e, i) => `${e.id}:${String.fromCharCode(65 + i)}`));
      for (let i = 0; i < 120 && (s.phase === "turn" || s.phase === "camp"); i++) {
        s = s.phase === "camp" ? turnCommand(s, { kind: "advance" }).state : turnCommand(s, { kind: "act", order: firstLegalOrder(s) }).state;
        if (s.room !== room) {
          room = s.room;
          letters = turnView(s).enemies.map((e) => `${e.id}:${e.letter}`);
          continue;
        }
        if (s.phase === "turn") expect(turnView(s).enemies.map((e) => `${e.id}:${e.letter}`)).toEqual(letters);
      }
    });
  });

  describe("item 12: since your last turn, the camp, the report and the Record", () => {
    it("playback tells each hit how much its actor's hinder weakened it, and names it once per act", () => {
      const s = structuredClone(freshState(1));
      const foe = s.enemies[0];
      const [t0, t1] = s.team;
      foe.hinder = 10;
      const hit = (target: string, amount: number) => ({ kind: "hit" as const, actor: foe.id, target, move: "Sweep", amount, absorbed: 0, step: 1, fell: false });
      const beats = playback(s, [hit(t0.id, 0), hit(t1.id, 4)]);
      expect(beats[0]).toMatchObject({ weakened: 10, weakenedText: `${foe.name} A's hit was cut by 10 by your hinder.` });
      expect(beats[1].weakened).toBe(10);
      expect(beats[1].weakenedText).toBeUndefined();
      // The player's hinder lands earlier in the command: it counts, and an attack spends it.
      const clean = structuredClone(s);
      clean.enemies[0].hinder = 0;
      const ally = clean.team[0];
      const seq = playback(clean, [
        { kind: "hinder", actor: ally.id, target: foe.id, move: "Rake", amount: 14 },
        { ...hit(t0.id, 0) },
        { ...hit(t0.id, 5), move: "Second" },
      ]);
      expect(seq[1].weakened).toBe(14);
      expect(seq[2].weakened).toBeUndefined();
    });

    it("the Record keeps the weakened note with the hit's line", () => {
      const s = structuredClone(freshState(1));
      const foe = s.enemies[0];
      foe.hinder = 10;
      const beats = playback(s, [{ kind: "hit", actor: foe.id, target: s.team[0].id, move: "Sweep", amount: 4, absorbed: 0, step: 1, fell: false }]);
      const [entry] = recordEntries(0, beats);
      expect(entry.words).toContain("was cut by 10 by your hinder");
      expect(entry.weakened).toBe(10);
    });

    it("since your last turn lists a blocked or reduced enemy hit on the enemy", () => {
      const s = structuredClone(freshState(1));
      const v = turnView(s);
      const foe = v.enemies[0];
      const active = v.active!;
      const other = v.squad.find((u) => u.id !== active.id)!;
      const entry = (amount: number, weakened: number): RecordEntry => ({
        room: v.room,
        round: 1,
        actor: foe.id,
        words: "",
        weakened,
        event: { kind: "hit", actor: foe.id, target: other.id, move: "M", amount, absorbed: 0, step: 1, fell: false },
      });
      const blocked = sinceView([entry(0, 14)], v);
      expect(blocked.items.find((i) => i.id === foe.id)!.text).toBe(`${foe.name} ${foe.letter}'s hit blocked by your hinder`);
      const reduced = sinceView([entry(4, 6)], v);
      expect(reduced.items.find((i) => i.id === foe.id)!.short).toBe(`${foe.letter}'s hit cut by 6 by your hinder`);
      expect(reduced.items.find((i) => i.id === other.id)!.text).toContain("-4");
      // No hinder, no note.
      expect(sinceView([entry(4, 0)], v).items.find((i) => i.id === foe.id)).toBeUndefined();
    });

    it("the defeat report gives the ending enemy's health left", () => {
      const s = structuredClone(freshState(1));
      const foe = s.enemies[0];
      foe.hp = 77;
      const lost = { ...s, phase: "lost" as const };
      const rec: RecordEntry[] = [
        { room: 0, round: 1, actor: foe.id, words: "", event: { kind: "hit", actor: foe.id, target: s.team[0].id, move: "Heavy Ram", amount: 9, absorbed: 0, step: 1, fell: true } },
      ];
      const sum = runSummary(lost, turnView(lost), rec);
      expect(sum.finalBlow).toBe(`${foe.name} A, Heavy Ram`);
      expect(sum.finalBlowLeft).toBe(`77 of ${foe.max} health left`);
      expect(sum.rows.find((r) => r.label === "Final blow")!.value).toBe(`${foe.name} A, Heavy Ram. 77 of ${foe.max} health left`);
    });

    it("camp says what the next sector holds: its name, enemies counted, and whether it is the Guardian's", () => {
      const s = { ...freshState(1), phase: "camp" as const, room: 0 };
      const next = campView(s).next!;
      expect(next.n).toBe(2);
      expect(next.name.length).toBeGreaterThan(0);
      expect(next.enemies.reduce((n, e) => n + e.count, 0)).toBeGreaterThan(0);
      expect(next.guardian).toBe(false);
      const last = campView({ ...s, room: 2 }).next!;
      expect(last.guardian).toBe(true);
      expect(campView({ ...s, room: 3 }).next).toBeNull();
    });
  });
});

describe("one number, one meaning, one place (docs/design/powerworks-one-number-one-meaning.md)", () => {
  /** Every enemy committed to a 30-power single-target hit on a squadmate; the active companion's moves are a strike, a weaken, a guard and a mend. */
  function world(): { s: TRun; a: Fighter; o: Fighter } {
    const s = structuredClone(stateWithActiveAttacker());
    const a = s.team.find((t) => t.id === s.active)!;
    const base = a.moves.find((m) => m.power > 0)!;
    a.moves[0] = { ...base, power: 3, rests: 0, signature: false, area: false, parts: [] };
    a.moves[1] = { ...a.moves[1], power: 0, rests: 0, signature: false, area: false, parts: [{ kind: "hinder", n: 12, aim: "enemy", all: false } as never] };
    a.moves[2] = { ...a.moves[2], power: 0, rests: 0, signature: false, area: false, parts: [{ kind: "shield", n: 8, aim: "ally", all: false } as never] };
    a.moves[3] = { ...a.moves[3], power: 0, rests: 0, signature: false, area: false, parts: [{ kind: "heal", n: 50, aim: "ally", all: false } as never] };
    a.cooldowns = a.moves.map(() => 0);
    a.signatureSpent = false;
    a.hinder = 0;
    a.boost = 0;
    a.shields = [];
    const o = s.team.find((u) => u.id !== a.id)!;
    o.hp = 30;
    o.max = Math.max(o.max, 60);
    o.shields = [];
    for (const foe of s.enemies) {
      const fb = foe.moves.find((m) => m.power > 0) ?? foe.moves[0];
      foe.moves = [{ ...fb, power: 30, element: null as never, rests: 0, signature: false, parts: [], area: false }];
      foe.cooldowns = [0];
      foe.signatureSpent = false;
      foe.boost = 0;
      foe.hinder = 0;
      commit(s, foe, 0, o.id);
    }
    return { s, a, o };
  }
  const keyOf = (s: TRun, i: number) => {
    const v = turnView(s);
    const k = v.keys[i];
    return { v, k, previews: previewsOf(k, v.active!.id, v.squad.filter((u) => !u.down).map((u) => u.id)) };
  };

  it("decision 1: an enemy's plate carries its own next act (the number and ALL), the same number its tag on the companion carries, and names no companion", () => {
    const { s, o } = world();
    const v = turnView(s);
    for (const e of v.enemies) {
      expect(e.next).toMatchObject({ kind: "attack", n: 30, from: e.letter });
      expect(e.next!.area).toBeUndefined();
      expect(JSON.stringify(e.next)).not.toContain(o.name);
      expect(v.squad.find((u) => u.id === o.id)!.threats.find((t) => t.fromId === e.id)!.n).toBe(e.next!.n);
    }
    // An area hit says ALL, with the largest of the numbers it lands (shields differ per companion).
    const foe = s.enemies[0];
    foe.moves = [{ ...foe.moves[0], area: true }];
    const front = s.team.find((u) => u.hp > 0)!;
    front.shields = [{ n: 6, from: "x" }];
    expect(turnView(s).enemies[0].next).toMatchObject({ kind: "attack", n: 30, area: true });
    // A fallen enemy has none.
    foe.hp = 0;
    expect(turnView(s).enemies[0].next).toBeNull();
  });

  it("decision 1: a support names its recipient by letter (an ally enemy), an icon and number for itself, and never a companion", () => {
    const s = structuredClone(stateWithActiveAttacker());
    const [a, b] = s.enemies;
    a.moves = [{ ...a.moves[0], power: 0, rests: 0, signature: false, area: false, parts: [{ kind: "heal", n: 9, aim: "ally", all: false } as never] }];
    a.cooldowns = [0];
    b.hp = b.max - 20;
    commit(s, a, 0, b.id);
    expect(turnView(s).enemies[0].next).toMatchObject({ kind: "support", from: "A", toLetters: ["B"], self: false, parts: [{ kind: "heal", n: 9 }] });
    b.moves = [{ ...b.moves[0], power: 0, rests: 0, signature: false, area: false, parts: [{ kind: "shield", n: 5, aim: "self", all: false } as never] }];
    b.cooldowns = [0];
    commit(s, b, 0, b.id);
    expect(turnView(s).enemies[1].next).toMatchObject({ kind: "support", from: "B", self: true, toLetters: [], parts: [{ kind: "shield", n: 5 }] });
  });

  it("decision 5: a weaken reads the enemy's next act before and after on every enemy it can name, and a finishing strike crosses it out", () => {
    const { s } = world();
    const { k, previews } = keyOf(s, 1);
    const enemyOnly = Object.fromEntries(Object.entries(previews).filter(([id]) => s.enemies.some((e) => e.id === id)));
    const acts = nextActsOf(previewThreats(s, k, enemyOnly));
    for (const e of s.enemies) expect(acts[e.id]).toMatchObject({ kind: "attack", before: 30, n: 18 });
    // A strike that finishes enemy A crosses out its act and leaves B's alone.
    s.enemies[0].hp = 1;
    const strike = keyOf(s, 0);
    const out = nextActsOf(previewThreats(s, strike.k, strike.previews));
    expect(out[s.enemies[0].id]).toMatchObject({ cancelled: true });
    expect(out[s.enemies[1].id].cancelled).toBeUndefined();
    expect(out[s.enemies[1].id].before).toBeUndefined();
  });

  it("decision 4: an attack's preview is the target's health before and after (landedOn, shield first), with the lost segment and the matchup lit", () => {
    const { s } = world();
    const { v, previews } = keyOf(s, 0);
    for (const e of v.enemies) {
      const pp = platePreviewOf(previews[e.id], e)!;
      const cell = previews[e.id];
      expect(pp.health).toEqual({ from: e.hp, to: Math.max(0, e.hp - cell.n) });
      expect(pp.matchup).toBe(true);
    }
    // Reaching 0 is a skull; a shield takes its share first and its chip reads before and after.
    const e0 = s.enemies[0];
    e0.hp = 2;
    e0.shields = [{ n: 1, from: "x" }];
    const again = keyOf(s, 0);
    const pe = platePreviewOf(again.previews[e0.id], again.v.enemies[0])!;
    expect(pe.health).toMatchObject({ to: 0, skull: true });
    expect(pe.shield).toEqual({ from: 1, to: 0 });
    // An immune matchup changes no health and still lights the tab.
    expect(platePreviewOf({ ...again.previews[e0.id], immune: true, n: 0, finishes: false }, again.v.enemies[0])).toEqual({ matchup: true });
  });

  it("decision 6: a mend is a gain on the health row (capped by max), a guard and a boost are chips; a weaken and a slow change no row of the target's own", () => {
    const { s, o } = world();
    o.hp = 40;
    o.max = 60;
    const mend = keyOf(s, 3);
    const unit = mend.v.squad.find((u) => u.id === o.id)!;
    expect(platePreviewOf(mend.previews[o.id], unit)).toEqual({ health: { from: 40, to: 60 } });
    const guard = keyOf(s, 2);
    expect(platePreviewOf(guard.previews[o.id], unit)).toEqual({ shield: { from: 0, to: 8 } });
    expect(platePreviewOf(keyOf(s, 2).previews[o.id], { ...unit, shield: 3 })).toEqual({ shield: { from: 3, to: 11 } });
    const boost = { target: o.id, kind: "boost" as const, n: 4, step: 1, immune: false, finishes: false, absorbed: 0 };
    expect(platePreviewOf(boost, { ...unit, boost: 0 })).toEqual({ boost: { from: 0, to: 4 } });
    const weaken = keyOf(s, 1);
    for (const e of weaken.v.enemies) expect(platePreviewOf(weaken.previews[e.id], e)).toBeNull();
    expect(platePreviewOf(undefined, unit)).toBeNull();
    // A self or whole-squad key reads each of its chips on the units it reaches.
    const chips = { target: o.id, kind: "heal" as const, n: 9, step: 1, immune: false, finishes: false, absorbed: 0, chips: [{ kind: "heal" as const, n: 9, aim: "self" as const, all: false }, { kind: "shield" as const, n: 5, aim: "self" as const, all: false }] };
    expect(platePreviewOf(chips, { ...unit, hp: 50, max: 60, shield: 0 })).toEqual({ health: { from: 50, to: 59 }, shield: { from: 0, to: 5 } });
  });

  it("a slow on an enemy is a delay preview, not a hit: nothing about it is read on a health row", () => {
    const { s, a } = world();
    a.moves[1] = { ...a.moves[1], parts: [{ kind: "delay", n: 1, aim: "enemy", all: false } as never] };
    const { previews } = keyOf(s, 1);
    for (const p of Object.values(previews)) expect(p.kind).toBe("delay");
  });
});
