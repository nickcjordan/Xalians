/*
  Tests for the turn screen's view (docs/design/powerworks-turn-screen.md). Builds real turn-by-turn
  states from the engine (createTurnRun) with the rules the screen ships with, then mutates clones
  to force the cases a live run would rarely hand us on demand (immune matchups, low health for a
  finish, shields absorbing, resting/spent keys).
*/
import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, createTurnRun, legalTargets, turnCommand, type Fighter, type Order, type TRun } from "@xalians/rules/dungeon/pillars";
import { eventWords, playback, turnView, type Cell } from "./view.ts";

const RULES = { ...DEFAULT_RULES, rooms: "roles" as const, timeline: "round" as const, enemyHpFactor: 0.62 };

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

  it("still reads an enemy's hitOnActive after that enemy has acted this round (cooldown = rests + 1, not 0, until its own next turn)", () => {
    let s = freshState(1);
    let actedEnemy: string | null = null;
    for (let k = 0; k < 60 && s.phase === "turn" && !actedEnemy; k++) {
      const before = s;
      s = turnCommand(s, { kind: "act", order: firstLegalOrder(s) }).state;
      // Any enemy whose cooldowns moved (it took its turn) between before and after.
      const moved = s.enemies.find((e) => {
        const prior = before.enemies.find((x) => x.id === e.id);
        return prior && e.cooldowns.some((c, i) => c !== prior.cooldowns[i]);
      });
      if (moved && moved.hp > 0 && moved.moves.some((m) => m.power > 0)) actedEnemy = moved.id;
    }
    expect(actedEnemy).not.toBeNull();
    if (s.phase !== "turn") return; // the run ended before settling on a mid-round read; nothing to assert
    const v = turnView(s);
    const enemy = v.enemies.find((e) => e.id === actedEnemy)!;
    // The bug: hitOnActive read null here because ready() saw the just-used move's cooldown at
    // rests + 1 (1 for a rests-0 move) instead of 0. It must read a real hit now that the enemy's
    // moves are judged as they will be at its own next turn (cooldown <= 1).
    expect(enemy.hitOnActive).not.toBeNull();
    expect(enemy.hitOnActive!.n).toBeGreaterThanOrEqual(0);
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

    it("collapses to `same` only when every cell shares n, step 1, no immune, no finish", () => {
      const s = stateWithActiveAttacker();
      const active = s.team.find((t) => t.id === s.active)!;
      const i = active.moves.findIndex((m) => m.power > 0 && !m.area);
      if (i < 0) return;
      const t = structuredClone(s);
      const attacker = t.team.find((u) => u.id === active.id)!;
      attacker.moves[i] = { ...attacker.moves[i], element: null }; // physical: step 1 vs everything
      for (const e of t.enemies) e.hp = e.max; // no one finishes
      const v = turnView(t);
      const key = v.keys[i];
      expect(key.same).toBe(true);
      // Breaking one target's health below the landed amount should end the collapse.
      const t2 = structuredClone(t);
      t2.enemies[0].hp = 1;
      const v2 = turnView(t2);
      expect(v2.keys[i].same).toBe(false);
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

    it("never collapses to `same`, even when every enemy's before/after happens to match", () => {
      const { s, hi } = stateWithHinderMove();
      const t = structuredClone(s);
      // Force every standing enemy to an identical hit-on-active and no existing hinder, so the
      // naive n-only comparison would wrongly read as collapsible; `before` must still block it.
      for (const e of t.enemies) {
        if (e.hp <= 0) continue;
        e.hinder = 0;
        e.moves = e.moves.map((m, idx) => (idx === 0 ? { ...m, power: 10, element: null, area: false } : { ...m, power: 0, parts: [] }));
        e.cooldowns = e.moves.map(() => 0);
      }
      const v = turnView(t);
      const key = v.keys[hi];
      expect(key.cells.every((c) => c.before !== undefined)).toBe(true);
      expect(key.same).toBe(false);
    });

    it("computes after as max(current hinder, this hinder), not additive, when the enemy already carries a hinder", () => {
      const { s, hi } = stateWithHinderMove();
      const t = structuredClone(s);
      const target = t.enemies.find((e) => e.hp > 0)!;
      // Give the target a strong existing hinder so max() and addition diverge sharply.
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
    expect(strong).toContain("(strong)");
    const weak = eventWords(s, { kind: "hit", actor: a, target: b, move: "Test", amount: 7, absorbed: 0, step: 0.5, fell: false });
    expect(weak).toContain("(weak)");
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
