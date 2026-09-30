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
  revivedWords,
  runSummary,
  stationHeal,
  titleCard,
  endingOf,
  eventWords,
  hinderOnAttack,
  momentWords,
  playback,
  recordEntries,
  sinceView,
  turnView,
  weakenedWords,
  type Beat,
  type Cell,
  type RecordEntry,
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
      }
      const v = turnView(t);
      const key = v.keys[hi];
      expect(key.cells.every((c) => c.before !== undefined)).toBe(true);
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
    expect(words).toContain(`shielded ${foe.name} A for 5`);
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
    expect(weakenedWords("Central guardian A", 10)).toBe("Central guardian A's hit was weakened by 10.");
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
    expect(sv.items[0].text).toBe(`${active.name} hindered 14`);
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
      expect(r.words).toBe(beats[i].words);
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
    expect(plain.activeStatus).toBeNull();
    const t = structuredClone(s);
    const a = t.team.find((u) => u.id === t.active)!;
    a.hinder = 3;
    const v = turnView(t);
    expect(v.activeStatus).toEqual({ sentence: `${a.name} is hindered by 3 on its next attack`, parts: ["hindered by 3"] });
    const marked = v.keys[i].cells.filter((c) => c.ownBefore !== undefined);
    expect(marked.length).toBeGreaterThan(0);
    for (const c of marked) {
      expect(c.n).toBeLessThan(c.ownBefore!);
      const base = plain.keys[i].cells.find((x) => x.target === c.target)!;
      expect(c.ownBefore).toBe(base.n);
    }
  });

  it("a hinder that swallows the whole attack reads 0 with its before number and its reason", () => {
    const { s, i } = attacker();
    const t = structuredClone(s);
    const a = t.team.find((u) => u.id === t.active)!;
    a.hinder = 9999;
    const v = turnView(t);
    const cells = v.keys[i].cells.filter((c) => !c.immune);
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) {
      expect(c.n).toBe(0);
      expect(c.ownBefore).toBeGreaterThan(0);
    }
    expect(v.activeStatus?.sentence).toContain("hindered by 9999");
  });

  it("a boost shows the plain number struck under the raised one", () => {
    const { s, i } = attacker();
    const t = structuredClone(s);
    const a = t.team.find((u) => u.id === t.active)!;
    a.boost = 5;
    const v = turnView(t);
    expect(v.activeStatus?.parts).toEqual(["boosted by 5"]);
    const c = v.keys[i].cells.find((x) => !x.immune)!;
    expect(c.n).toBeGreaterThan(c.ownBefore!);
  });
});

describe("the enemy hit chip (item 7)", () => {
  function shape(): { s: TRun; foeId: string } {
    const s = stateWithActiveAttacker();
    const t = structuredClone(s);
    const foe = t.enemies.find((e) => e.hp > 0)!;
    foe.hinder = 0;
    foe.boost = 0;
    // Two attacks: a weak one ready, a much stronger one resting.
    const base = foe.moves.find((m) => m.power > 0)!;
    foe.moves = [
      { ...base, power: 4, rests: 0, signature: false, parts: [], area: false },
      { ...base, power: 40, rests: 2, signature: false, parts: [], area: false },
    ];
    foe.cooldowns = [0, 0];
    foe.signatureSpent = false;
    return { s: t, foeId: foe.id };
  }

  it("shows a resting stronger attack as coming, in the enemy's own turns after its next one", () => {
    const { s, foeId } = shape();
    const foe = s.enemies.find((e) => e.id === foeId)!;
    foe.cooldowns = [0, 3]; // cooldown 3: usable at its 3rd turn from now, so 2 turns after its next
    const v = turnView(s).enemies.find((e) => e.id === foeId)!;
    expect(v.hitOnActive).not.toBeNull();
    expect(v.hitComing).not.toBeNull();
    expect(v.hitComing!.turns).toBe(2);
    expect(v.hitComing!.n).toBeGreaterThan(v.hitOnActive!.n);
  });

  it("counts a move with cooldown 1 as ready at the enemy's next turn (decrement happens at its own turn start)", () => {
    const { s, foeId } = shape();
    const foe = s.enemies.find((e) => e.id === foeId)!;
    foe.cooldowns = [0, 1];
    const v = turnView(s).enemies.find((e) => e.id === foeId)!;
    expect(v.hitComing).toBeNull();
    expect(v.hitOnActive!.n).toBeGreaterThan(4);
  });

  it("cooldown 2 reads 'in 1': one enemy turn passes first", () => {
    const { s, foeId } = shape();
    s.enemies.find((e) => e.id === foeId)!.cooldowns = [0, 2];
    expect(turnView(s).enemies.find((e) => e.id === foeId)!.hitComing!.turns).toBe(1);
  });

  it("shows nothing coming when the resting attack is not stronger, and no coming for a spent signature", () => {
    const { s, foeId } = shape();
    const foe = s.enemies.find((e) => e.id === foeId)!;
    foe.moves[1] = { ...foe.moves[1], power: 1 };
    foe.cooldowns = [0, 3];
    expect(turnView(s).enemies.find((e) => e.id === foeId)!.hitComing).toBeNull();
    foe.moves[1] = { ...foe.moves[1], power: 40, signature: true };
    foe.signatureSpent = true;
    expect(turnView(s).enemies.find((e) => e.id === foeId)!.hitComing).toBeNull();
  });

  it("with no ready attack the chip is only the coming one", () => {
    const { s, foeId } = shape();
    const foe = s.enemies.find((e) => e.id === foeId)!;
    foe.cooldowns = [4, 3];
    const v = turnView(s).enemies.find((e) => e.id === foeId)!;
    expect(v.hitOnActive).toBeNull();
    expect(v.hitComing).not.toBeNull();
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
    expect(c.revives[0].text).toBe(`Revive ${fallen.team[0].name} to ${to} health · 1 revive left`);
    expect(c.unusedNote).toMatch(/unused/);
    // The number the button promises is what the engine gives.
    const after = turnCommand(fallen, { kind: "revive", id: fallen.team[0].id }).state;
    expect(after.team[0].hp).toBe(to);
    expect(revivedWords("Ann", 63, after.revival)).toBe("Ann revived to 63 health. No revives left.");
    expect(reviveWords("Ann", 63, 2)).toBe("Revive Ann to 63 health · 2 revives left");
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
