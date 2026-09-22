import { describe, expect, it } from "vitest";
import {
  COMPANION_KEYS,
  COMPANION_RECORDS,
  command,
  createRun,
  damagePreview,
  damaging,
  initiative,
  legalMoves,
  moveAt,
  readCompanion,
  resolveRound,
  restoreRun,
  statusGroup,
  tickAmount,
  type Order,
  type Run,
  type Unit,
} from "./index.ts";
import {
  ATTENTION_OPPORTUNITIES,
  BINDING_OPPORTUNITIES,
  COOLDOWN_ROUNDS,
  DEGRADE_FACTOR,
  ENTRANCE_IMMUNITY_OPPORTUNITIES,
  FRIGHTENED_OUTPUT_FACTOR,
  LIKELIHOOD_PERCENT,
  LINGERING_OPPORTUNITIES,
  REINFORCED_FACTOR,
  SHIELDED_FACTOR,
  WARD_FACTOR,
} from "./levers.ts";
import cards from "./cards.json";
import {
  innateConditions,
  readEffect,
  type Card,
  type CardEffect,
  type Move,
  type MoveEffect,
} from "./reading.ts";

function orders(s: Run): Record<string, Order> {
  return Object.fromEntries(
    s.team
      .filter((u) => u.hp > 0)
      .map((u) => [
        u.id,
        {
          move: legalMoves(u)[0] ?? -2,
          target: s.enemies.find((e) => e.hp > 0)!.id,
        },
      ])
  );
}
const unit = (s: Run, id: string) =>
  [...s.team, ...s.enemies].find((u) => u.id === id)!;
function boss() {
  let s = createRun(1);
  for (let i = 0; i < 3; i++) {
    s.phase = "camp";
    s = command(s, { kind: "advance" });
  }
  return s;
}
/** The guardian alone, with the health to outlast a few rounds of testing. */
function lone() {
  const s = boss();
  s.enemies.filter((u) => u.id !== "B4").forEach((u) => (u.hp = 0));
  unit(s, "B4").hp = 500;
  s.team.forEach((u) => (u.hp = u.max = 500));
  return s;
}
/** Orders with Avilily on her repeatable Piercing Touch, so her paralysis does not bind the guardian mid-test. */
const quiet = (s: Run): Record<string, Order> => ({
  ...orders(s),
  A: { move: 2, target: "B4" },
});
const clone = <T,>(v: T): T => structuredClone(v);
const hasEvent = (r: { frames: { event?: { kind: string } }[] }, kind: string) =>
  r.frames.some((f) => f.event?.kind === kind);

describe("Powerworks reads the four companions", () => {
  it("reads four moves each from the frozen release with exactly one signature", () => {
    for (const key of COMPANION_KEYS) {
      const u = readCompanion(COMPANION_RECORDS[key], key.toUpperCase());
      expect(u.species).toBe(key);
      expect(u.moves).toHaveLength(4);
      expect(u.moves.filter((m) => m.signature)).toHaveLength(1);
      expect(u.hp).toBeGreaterThan(0);
      expect(u.hp).toBe(u.max);
      expect(u.speed).toBeGreaterThan(0);
      expect(u.attrs.strength).toBeGreaterThan(0);
      expect(u.cooldowns).toEqual([0, 0, 0, 0]);
      for (const m of u.moves) {
        expect(["closing", "stationary", "self"]).toContain(m.approach);
        expect(m.effects.length).toBeGreaterThan(0);
        for (const e of m.effects)
          if (e.support === "unsupported") expect(e.reason).toBeTruthy();
      }
    }
  });
  it("every companion can deal damage and the fastest one outspeeds every charger", () => {
    // The intro lesson (stop the charge) needs a companion who acts before the release.
    const s = createRun(1);
    for (const u of s.team)
      expect(u.moves.filter((m) => damaging(m)).length, u.name).toBeGreaterThan(0);
    const fastest = Math.max(...s.team.map((u) => u.speed));
    const chargers = Object.entries(cards.templates).filter(([, t]) =>
      (t as Card).moves.some((m) => m.preparation === "prolonged")
    );
    expect(chargers.length).toBeGreaterThan(0);
    for (const [key, t] of chargers)
      expect(fastest, `${key} charges at speed ${t.speed}`).toBeGreaterThan(t.speed);
  });
  it("names unsupported effects and keeps a move usable only when some effect is supported", () => {
    const s = createRun(1);
    // Pass 2 reads Ground Anchor: protected with a declared displacement immunity.
    const g = unit(s, "G");
    const anchor = g.moves.find((m) => m.effects[0].type === "status")!;
    expect(anchor.effects[0].support).toBe("status");
    expect(anchor.effects[0].group).toBe("guarding");
    expect(anchor.effects[0].protection).toEqual({
      type: "displace",
      degree: "immune",
    });
    expect(legalMoves(g)).toContain(g.moves.indexOf(anchor));
    // Pass 2 reads Hippochamp's cannon as harm plus a real removal (cooling).
    const h = unit(s, "H");
    const cannon = h.moves.find((m) => m.signature)!;
    expect(cannon.effects.map((e) => e.support)).toEqual(["harm", "remove"]);
    expect(cannon.effects[1].methods).toEqual(["cooling"]);
    expect(legalMoves(h)).toContain(0);
    // Every effect the four companions carry is now supported, so the "no effect here"
    // path is exercised at the seam instead: traversal statuses stay unsupported.
    for (const status of ["dispersed", "phased", "marked"]) {
      const read = readEffect({
        key: "outcome",
        type: "status",
        recipient: "target",
        likelihood: "consistent",
        status,
        persistence: "lingering",
        duration: "brief",
        removable: ["disrupting"],
      });
      expect(read.support).toBe("unsupported");
      expect(read.reason).toContain(status);
    }
    // Avilily reads two paralysis touches as binds and two touches as harm, so no Desperate strike.
    const a = unit(s, "A");
    expect(a.moves.filter((m) => m.effects[0].support === "bind").length).toBe(2);
    expect(legalMoves(a)).not.toContain(-1);
  });
});

describe("Powerworks battle rules", () => {
  it("rejects incomplete or cooling orders without consuming state or changing hidden plans", () => {
    const s = createRun(9),
      before = structuredClone(s);
    expect(() => resolveRound(s, {})).toThrow();
    expect(s).toEqual(before);
    const q = orders(s);
    const u = s.team[0];
    u.cooldowns[q[u.id].move] = 1;
    expect(() => resolveRound(s, q)).toThrow();
  });
  it("binding blocks closing moves before execution without cooling them, but not stationary contact", () => {
    const s = createRun();
    const e = s.enemies[0];
    e.bound = 1;
    const r = resolveRound(s, orders(s));
    expect(r.state.log.some((l) => l.includes("stopped by binding"))).toBe(true);
    expect(unit(r.state, e.id).cooldowns).toEqual([0]);
    const h = unit(s, "H");
    h.bound = 1;
    const legal = legalMoves(h);
    expect(legal).not.toContain(-1);
    expect(legal.every((i) => h.moves[i].approach === "stationary")).toBe(true);
    expect(legal.length).toBeGreaterThan(0);
    expect(h.moves.some((m) => m.approach === "closing")).toBe(true);
    const a = unit(s, "A");
    a.bound = 1;
    expect(legalMoves(a)).toEqual([0, 1, 2, 3]);
  });
  it("retargets the same signature and spends it exactly once", () => {
    const s = createRun();
    s.enemies[0].hp = 1;
    s.enemies[1].hp = 200;
    const q = orders(s);
    q.C = { move: 0, target: s.enemies[0].id };
    const r = resolveRound(s, q).state;
    expect(r.log.some((l) => l.includes("Crystorn redirects Gem Radiance"))).toBe(true);
    const c = unit(r, "C");
    expect(c.signatureSpent).toBe(true);
    expect(c.cooldowns[0]).toBe(COOLDOWN_ROUNDS.brief);
  });
  it("ends immediately after the final knockout and preserves unexecuted orders", () => {
    const s = createRun();
    s.enemies[0].hp = 1;
    s.enemies[1].hp = 0;
    const r = resolveRound(s, orders(s)).state;
    expect(r.phase).toBe("camp");
    expect(r.xp).toBe(10);
    const c = unit(r, "C");
    expect(c.cooldowns).toEqual([0, 0, 0, 0]);
    expect(c.signatureSpent).toBe(false);
  });
  it("cooldown gates a move for its recovery rounds and then returns it", () => {
    let s = lone();
    const q = orders(s);
    q.C = { move: 3, target: "B4" };
    s = resolveRound(s, q).state;
    let c = unit(s, "C");
    expect(c.moves[3].recovery).toBe("brief");
    expect(c.cooldowns[3]).toBe(1);
    expect(legalMoves(c)).not.toContain(3);
    expect(legalMoves(c)).toContain(1);
    s = resolveRound(s, orders(s)).state;
    c = unit(s, "C");
    expect(c.cooldowns[3]).toBe(0);
    expect(legalMoves(c)).toContain(3);
  });
  it("the signature is usable once per encounter, beyond its cooldown, and refreshes at the next one", () => {
    let s = lone();
    const q = orders(s);
    q.C = { move: 0, target: "B4" };
    s = resolveRound(s, q).state;
    expect(unit(s, "C").signatureSpent).toBe(true);
    s = resolveRound(s, orders(s)).state;
    s = resolveRound(s, orders(s)).state;
    const c = unit(s, "C");
    expect(c.cooldowns[0]).toBe(0);
    expect(legalMoves(c)).not.toContain(0);
    expect(() => resolveRound(s, { ...orders(s), C: { move: 0, target: "B4" } })).toThrow();
    let next = createRun(1);
    next.team.forEach((u) => (u.signatureSpent = true));
    next.phase = "camp";
    next = command(next, { kind: "advance" });
    expect(next.team.every((u) => !u.signatureSpent)).toBe(true);
  });
  it("a boss bound on release may charge again at its next opportunity (interrupted recovery lever 0)", () => {
    let s = lone();
    s = resolveRound(s, quiet(s)).state;
    expect(unit(s, "B4").charge).toBeTruthy();
    // The bind must land before the release: Avilily reads slower than the guardian now.
    unit(s, "A").speed = 100;
    const q = orders(s);
    q.A = { move: 0, target: "B4" };
    const r = resolveRound(s, q);
    expect(hasEvent(r, "bind")).toBe(true);
    s = r.state;
    const b = unit(s, "B4");
    expect(b.charge).toBeNull();
    expect(b.recovery).toBe(0);
    expect(moveAt(b, s.orders.B4.move).preparation).toBe("prolonged");
  });
  it("displace breaks a charge, deals its share of harm, and blocks only the stale release", () => {
    let s = lone();
    // Keep Avilily's paralysis out of it: the guardian must be free when the pull lands.
    s = resolveRound(s, quiet(s)).state;
    expect(unit(s, "B4").charge).toBeTruthy();
    unit(s, "G").speed = 100;
    const q = quiet(s);
    q.G = { move: 1, target: "B4" };
    const r = resolveRound(s, q);
    expect(unit(s, "G").moves[1].effects[0].support).toBe("displace");
    const hit = r.frames.find((f) => f.event?.kind === "hit" && f.event.actorId === "G")!;
    expect(hit.event?.amount).toBeGreaterThan(0);
    expect(hasEvent(r, "displace")).toBe(true);
    expect(r.state.log.some((l) => l.includes("charge was broken"))).toBe(true);
    s = r.state;
    expect(unit(s, "B4").charge).toBeNull();
    // The pull landed before the guardian acted, so it passed only that stale opportunity.
    expect(unit(s, "B4").recovery).toBe(0);
    expect(moveAt(unit(s, "B4"), s.orders.B4.move).preparation).toBe("prolonged");
  });
  it("a companion with prolonged preparation charges, releases, then recovers", () => {
    let s = lone();
    const h = unit(s, "H");
    h.moves[2].preparation = "prolonged";
    let q = orders(s);
    q.H = { move: 2, target: "B4" };
    let r = resolveRound(s, q);
    expect(r.frames.some((f) => f.event?.kind === "charge" && f.event.actorId === "H")).toBe(true);
    s = r.state;
    expect(unit(s, "H").charge).toBe("B4");
    expect(legalMoves(unit(s, "H"))).toEqual([2]);
    q = orders(s);
    r = resolveRound(s, q);
    expect(r.frames.some((f) => f.event?.kind === "hit" && f.event.actorId === "H")).toBe(true);
    s = r.state;
    expect(unit(s, "H").charge).toBeNull();
    expect(unit(s, "H").recovery).toBe(1);
    expect(legalMoves(unit(s, "H"))).not.toContain(2);
    s = resolveRound(s, orders(s)).state;
    expect(legalMoves(unit(s, "H"))).toContain(2);
  });
  it("rolls status likelihood from the seeded rng so runs replay and differ by seed", () => {
    const play = (seed: number) => {
      const s = createRun(seed);
      const q = orders(s);
      q.A = { move: 3, target: s.enemies[0].id };
      return resolveRound(s, q);
    };
    expect(unit(createRun(1), "A").moves[3].effects[0].likelihood).toBe("likely");
    expect(LIKELIHOOD_PERCENT.occasional).toBeLessThan(100);
    let landed = 0,
      missed = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const first = play(seed),
        again = play(seed);
      expect(again.state).toEqual(first.state);
      if (hasEvent(first, "bind")) landed++;
      if (hasEvent(first, "missed")) missed++;
    }
    expect(landed).toBeGreaterThan(0);
    expect(missed).toBeGreaterThan(0);
    expect(landed + missed).toBe(40);
  });
  it("immediate preparation wins initiative at equal speed", () => {
    const first = (move: number) => {
      const s = createRun(1);
      const h = unit(s, "H");
      const m1 = unit(s, "M1");
      h.speed = m1.speed - 1;
      const q = orders(s);
      q.H = { move, target: "M1" };
      return resolveRound(s, q)
        .frames.filter((f) => f.event?.actorId && f.event.kind !== "redirect")
        .map((f) => f.event!.actorId);
    };
    const h = unit(createRun(1), "H");
    expect(h.moves[3].preparation).toBe("immediate");
    expect(h.moves[2].preparation).toBe("brief");
    expect(first(3).indexOf("H")).toBeLessThan(first(3).indexOf("M1"));
    expect(first(2).indexOf("H")).toBeGreaterThan(first(2).indexOf("M1"));
  });
  it("preserves knockouts and health, clears cooldowns, permits one partial revival", () => {
    let s = createRun();
    s.phase = "camp";
    s.team[0].hp = 0;
    s.team[1].hp = 8;
    s.team[1].cooldowns = [2, 2, 2, 2];
    s = command(s, { kind: "revive", id: s.team[0].id });
    expect(s.team[0].hp).toBe(Math.ceil(s.team[0].max / 2));
    expect(s.revival).toBe(0);
    expect(() => command(s, { kind: "revive", id: s.team[0].id })).toThrow();
    const woundedId = s.team[1].id;
    s = command(s, { kind: "advance" });
    expect(unit(s, woundedId).hp).toBe(8);
    expect(unit(s, woundedId).cooldowns).toEqual([0, 0, 0, 0]);
  });
  it("offers recoil fallback only while nothing damaging is legal, never when bound", () => {
    const s = createRun();
    const c = unit(s, "C");
    expect(legalMoves(c)).not.toContain(-1);
    c.cooldowns = [1, 1, 1, 1];
    expect(legalMoves(c)).toEqual([-1]);
    const q = orders(s);
    q.C = { move: -1, target: s.enemies[0].id };
    const r = resolveRound(s, q);
    expect(r.frames.some((f) => f.text.includes("2 recoil"))).toBe(true);
    c.bound = 1;
    expect(legalMoves(c)).toEqual([]);
  });
  it("a full wipe loses without spending a revival or granting encounter XP", () => {
    const s = createRun();
    s.team.forEach((u) => {
      u.hp = 1;
      u.speed = 1;
    });
    s.enemies.forEach((u, i) => {
      u.moves[0].effects[0].intensity = 5000;
      s.orders[u.id].target = s.team[i].id;
    });
    s.team[2].hp = 0;
    s.team[3].hp = 0;
    const r = resolveRound(s, orders(s)).state;
    expect(r.phase).toBe("lost");
    expect(r.revival).toBe(1);
    expect(r.xp).toBe(0);
  });
  it("replays a version 2 command history deterministically and rejects version 1", () => {
    const s = createRun(41);
    const q = orders(s);
    const action = { kind: "round" as const, orders: q };
    const restored = restoreRun(
      JSON.stringify({ version: 2, seed: 41, history: [action] })
    );
    expect(restored.state).toEqual(command(s, action));
    expect(() => restoreRun('{"version":1,"seed":41,"history":[]}')).toThrow(
      "Unsupported save."
    );
  });
  it("completes a seed range without negative HP or cooldowns", () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = createRun(seed);
      let rounds = 0;
      while ((s.phase === "planning" || s.phase === "camp") && rounds < 100) {
        if (s.phase === "camp") s = command(s, { kind: "advance" });
        else {
          s = resolveRound(s, orders(s)).state;
          rounds++;
        }
        for (const u of s.team as Unit[]) {
          expect(u.hp).toBeGreaterThanOrEqual(0);
          expect(u.cooldowns.every((n) => n >= 0)).toBe(true);
        }
      }
      expect(["won", "lost"]).toContain(s.phase);
    }
  });
  it("exposes public initiative and damage events without revealing a charging target", () => {
    const s = boss();
    const order = initiative(s.team, s.enemies, s.round);
    expect(order.map((u) => u.speed)).toEqual(
      order.map((u) => u.speed).sort((a, b) => b - a)
    );
    const result = resolveRound(s, orders(s));
    const hit = result.frames.find((f) => f.event?.kind === "hit")!;
    expect(hit.event?.actorId).toBeTruthy();
    expect(hit.event?.targetId).toBeTruthy();
    expect(hit.event?.amount).toBeGreaterThan(0);
    const charge = result.frames.find((f) => f.event?.kind === "charge")!;
    expect(charge.event?.actorId).toBe("B4");
    expect(charge.event).not.toHaveProperty("targetId");
  });
  it("enemy cards keep parity with the frozen numbers", () => {
    const s = boss();
    const target = unit(s, "H");
    const b = unit(s, "B4");
    target.ward = false;
    const neutral = { ...target, element: "fire" } as Unit;
    expect(b.moves[0].name).toBe("Clamp strike");
    expect(b.hp).toBe(110);
    expect(b.speed).toBe(65);
    // Neutral matchup: 7 for the strike, 18 for the surge, both at attr 50.
    expect(damagePreview(b, b.moves[0], neutral)).toBe(7);
    expect(damagePreview(b, b.moves[1], neutral)).toBe(18);
  });
});

/*
  Pass 2: the status layer. Every test below builds its condition through the seam
  (readEffect) so a test can never assert a rule the table does not actually read.
*/
/** One authored move carrying exactly these effects, read through the seam. */
function fitted(name: string, effects: CardEffect[], over: Partial<Move> = {}): Move {
  return {
    key: name.toLowerCase().replace(/\W+/g, "-"),
    name,
    signature: false,
    approach: "stationary",
    range: "short",
    preparation: "immediate",
    recovery: "repeatable",
    effects: effects.map(readEffect),
    ...over,
  };
}
const statusEffect = (
  status: string,
  over: Partial<CardEffect> = {}
): CardEffect => ({
  key: "outcome",
  type: "status",
  recipient: "target",
  likelihood: "consistent",
  status,
  persistence: "lingering",
  duration: "brief",
  removable: ["cleansing"],
  ...over,
});
/** Give a companion one fitted move at index 0 and nothing else legal, so orders are unambiguous. */
function fitOnly(u: Unit, move: Move) {
  u.moves = [move];
  u.cooldowns = [0];
  u.signatureSpent = false;
}
const conditionOn = (u: Unit, status: string) =>
  u.conditions.find((c) => c.status === status);
/**
  Orders that change nothing but health: no displacement (it breaks charges), no bind
  and no status. Graviclaw's first legal move is Gravity Draw, so a status test that
  used `orders()` would be measuring the pull instead of the condition.
*/
function plain(s: Run, over: Record<string, Order> = {}): Record<string, Order> {
  const quietMove = (u: Unit) => {
    const safe = legalMoves(u).find((i) => {
      const m = moveAt(u, i);
      return (
        i >= 0 &&
        m.preparation !== "prolonged" &&
        m.effects.every((e) => e.support === "harm")
      );
    });
    return safe ?? legalMoves(u)[0] ?? -2;
  };
  return {
    ...Object.fromEntries(
      s.team
        .filter((u) => u.hp > 0)
        .map((u) => [
          u.id,
          { move: quietMove(u), target: selectable(s)[0].id },
        ])
    ),
    ...over,
  };
}
const selectable = (s: Run) => s.enemies.filter((e) => e.hp > 0);

describe("Powerworks status layer", () => {
  it("groups the fourteen statuses into five table groups and names the rest", () => {
    expect(statusGroup("paralyzed")).toBe("binding");
    expect(statusGroup("corroding")).toBe("degrading");
    expect(statusGroup("poisoned")).toBe("degrading");
    expect(statusGroup("shielded")).toBe("guarding");
    expect(statusGroup("protected")).toBe("guarding");
    expect(statusGroup("reinforced")).toBe("guarding");
    expect(statusGroup("entranced")).toBe("attention");
    expect(statusGroup("frightened")).toBe("attention");
    expect(statusGroup("concealed")).toBe("concealment");
    expect(statusGroup("mending")).toBe("mending");
    for (const outside of ["dispersed", "phased", "revealed", "stimulated"])
      expect(statusGroup(outside)).toBeNull();
  });
  it("applies a status on its likelihood roll, refreshes rather than stacks, and lasts the victim's opportunities", () => {
    // A fresh run per seed so the roll is the run rng, and the same seed twice must agree.
    const play = (seed: number, likelihood: CardEffect["likelihood"]) => {
      const s = createRun(seed);
      fitOnly(
        unit(s, "C"),
        fitted("Rot Wash", [statusEffect("corroding", { likelihood })])
      );
      s.enemies.forEach((e) => (e.hp = e.max = 400));
      return resolveRound(s, {
        ...orders(s),
        C: { move: 0, target: s.enemies[0].id },
      });
    };
    // consistent lands every time; occasional does not, and the roll comes from the run rng.
    for (let seed = 1; seed <= 5; seed++) {
      expect(hasEvent(play(seed, "consistent"), "status")).toBe(true);
      expect(play(seed, "occasional").state).toEqual(
        play(seed, "occasional").state
      );
    }
    let landed = 0;
    for (let seed = 1; seed <= 60; seed++)
      if (hasEvent(play(seed, "occasional"), "status")) landed++;
    expect(landed).toBeGreaterThan(0);
    expect(landed).toBeLessThan(60);
    expect(LIKELIHOOD_PERCENT.occasional).toBeLessThan(100);

    // Refresh, not stack: two applications leave one condition at the longer duration.
    let s = lone();
    fitOnly(
      unit(s, "C"),
      fitted("Rot Wash", [statusEffect("corroding", { intensity: 40 })])
    );
    fitOnly(
      unit(s, "A"),
      fitted("Deep Rot", [
        statusEffect("corroding", { intensity: 90, duration: "prolonged" }),
      ])
    );
    s = resolveRound(s, {
      C: { move: 0, target: "B4" },
      A: { move: 0, target: "B4" },
      G: { move: legalMoves(unit(s, "G"))[0], target: "B4" },
      H: { move: legalMoves(unit(s, "H"))[0], target: "B4" },
    }).state;
    const rotting = unit(s, "B4").conditions.filter(
      (c) => c.status === "corroding"
    );
    expect(rotting).toHaveLength(1);
    expect(rotting[0].intensity).toBe(90);
    // The boss has not had its own opportunity yet in this reading, so the longer
    // duration stands whole minus whatever opportunities it already spent.
    expect(rotting[0].remaining).toBeGreaterThan(0);
    expect(rotting[0].remaining).toBeLessThanOrEqual(
      LINGERING_OPPORTUNITIES.prolonged
    );
    expect(LINGERING_OPPORTUNITIES.prolonged).toBeGreaterThan(
      LINGERING_OPPORTUNITIES.brief
    );
    expect(BINDING_OPPORTUNITIES.brief).toBe(1);
    expect(ATTENTION_OPPORTUNITIES.brief).toBe(1);
  });
  it("counts a duration down by the victim's opportunities and expires it", () => {
    let s = lone();
    // Crystorn is slower than the guardian, so the condition lands after the
    // guardian's own opportunity this round and the full duration stands.
    fitOnly(
      unit(s, "C"),
      fitted("Rot Wash", [
        statusEffect("corroding", { intensity: 40, duration: "prolonged" }),
      ])
    );
    unit(s, "C").speed = 1;
    s = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } })).state;
    const first = conditionOn(unit(s, "B4"), "corroding")!.remaining;
    expect(first).toBe(LINGERING_OPPORTUNITIES.prolonged);
    // One application only from here on: its own opportunity, not the round, spends
    // the duration.
    unit(s, "C").moves = [
      unit(s, "C").moves[0],
      fitted("Quiet Tap", [
        {
          key: "outcome",
          type: "harm",
          recipient: "target",
          likelihood: "consistent",
          intensity: 10,
          mechanism: "impact",
        },
      ]),
    ];
    unit(s, "C").cooldowns = [0, 0];
    s = resolveRound(s, plain(s, { C: { move: 1, target: "B4" } })).state;
    expect(conditionOn(unit(s, "B4"), "corroding")!.remaining).toBe(first - 1);
    let guard = 0;
    while (conditionOn(unit(s, "B4"), "corroding") && guard++ < 10)
      s = resolveRound(s, plain(s, { C: { move: 1, target: "B4" } })).state;
    expect(conditionOn(unit(s, "B4"), "corroding")).toBeUndefined();
    expect(guard).toBe(first - 1);
  });
  it("degrading ticks at the victim's opportunity on the element matchup and is never reduced by ward", () => {
    let s = lone();
    fitOnly(
      unit(s, "C"),
      fitted("Rot Wash", [
        statusEffect("corroding", { intensity: 80, duration: "prolonged" }),
      ])
    );
    s = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } })).state;
    const boss = unit(s, "B4");
    const rot = conditionOn(boss, "corroding")!;
    expect(rot.element).toBe("chemical");
    const neutral = Math.floor((80 / 10) * DEGRADE_FACTOR);
    // Chemical is neutral against the guardian's electric and strong against plant,
    // so the tick reads the matchup and not a flat number.
    expect(tickAmount(rot, boss)).toBe(neutral);
    expect(tickAmount(rot, unit(s, "A"))).toBeGreaterThan(neutral);
    expect(unit(s, "A").element).toBe("plant");
    const before = unit(s, "B4").hp;
    const warded = clone(s);
    unit(warded, "B4").ward = true;
    const open = resolveRound(s, plain(s));
    const openWarded = resolveRound(warded, plain(warded));
    const tick = (r: { frames: { event?: { kind: string; amount?: number; targetId?: string } }[] }) =>
      r.frames.find(
        (f) => f.event?.kind === "tick" && f.event.targetId === "B4"
      )!.event!.amount;
    expect(tick(open)).toBeGreaterThan(0);
    expect(tick(openWarded)).toBe(tick(open));
    expect(before).toBeGreaterThan(0);
  });
  it("shielded halves incoming harm and does not multiply with ward; reinforced takes its quarter", () => {
    const s = lone();
    const attacker = unit(s, "B4");
    const target = unit(s, "H");
    const move = attacker.moves[0];
    const plain = damagePreview(attacker, move, target);
    const warded = { ...target, ward: true } as Unit;
    const shielded = {
      ...target,
      conditions: [
        {
          status: "shielded",
          group: "guarding" as const,
          intensity: 50,
          remaining: 2,
          source: "X",
          removable: [],
        },
      ],
    } as Unit;
    const both = { ...shielded, ward: true } as Unit;
    expect(damagePreview(attacker, move, shielded)).toBe(
      Math.floor(plain * SHIELDED_FACTOR)
    );
    expect(damagePreview(attacker, move, warded)).toBe(
      Math.floor(plain * WARD_FACTOR)
    );
    // The better one wins; they do not compound into a quarter.
    expect(damagePreview(attacker, move, both)).toBe(
      damagePreview(attacker, move, shielded)
    );
    const reinforced = {
      ...target,
      conditions: [
        {
          status: "reinforced",
          group: "guarding" as const,
          intensity: 50,
          remaining: 2,
          source: "X",
          removable: [],
        },
      ],
    } as Unit;
    expect(damagePreview(attacker, move, reinforced)).toBe(
      Math.floor(plain * REINFORCED_FACTOR)
    );
  });
  it("a protected unit immune to displacement takes neither the impact harm nor the charge break", () => {
    // Graviclaw's Ground Anchor declares exactly that immunity; its own pull is the test.
    let s = lone();
    const anchor = unit(s, "G").moves.findIndex((m) =>
      m.effects.some((e) => e.protection?.type === "displace")
    );
    expect(anchor).toBeGreaterThanOrEqual(0);
    const pull = unit(s, "G").moves.findIndex((m) =>
      m.effects.some((e) => e.support === "displace")
    );
    // Give the boss the same declared immunity and put it on a charge.
    s = resolveRound(s, quiet(s)).state;
    expect(unit(s, "B4").charge).toBeTruthy();
    const open = clone(s);
    const immune = clone(s);
    unit(immune, "B4").conditions = innateConditions([
      { type: "displace", degree: "immune" },
    ]);
    unit(open, "G").speed = 100;
    unit(immune, "G").speed = 100;
    const pullAt = (run: Run) =>
      resolveRound(run, plain(run, { G: { move: pull, target: "B4" } }));
    const hurt = pullAt(open);
    const blocked = pullAt(immune);
    // The frame right after Graviclaw's pull resolved, however the rest of the
    // squad is ordered.
    const chargeAfterPull = (
      r: { frames: { enemies: Unit[]; event?: { kind: string; actorId?: string } }[] }
    ) => {
      const pulls = r.frames.filter((f) => f.event?.actorId === "G");
      const last = pulls[pulls.length - 1];
      return last?.enemies.find((e) => e.id === "B4")?.charge ?? null;
    };
    const pullDamage = (r: { frames: { event?: { kind: string; actorId?: string; amount?: number } }[] }) =>
      r.frames
        .filter((f) => f.event?.kind === "hit" && f.event.actorId === "G")
        .reduce((sum, f) => sum + (f.event!.amount ?? 0), 0);
    expect(hasEvent(hurt, "displace")).toBe(true);
    expect(pullDamage(hurt)).toBeGreaterThan(0);
    expect(hurt.state.enemies.find((e) => e.id === "B4")!.charge).toBeNull();
    // Both the harm and the charge break are blocked; the charge survives.
    expect(hasEvent(blocked, "displace")).toBe(false);
    expect(hasEvent(blocked, "resisted")).toBe(true);
    expect(pullDamage(blocked)).toBe(0);
    // Read the frame right after the pull: the charge is still standing there, while
    // in the open run it is already broken.
    expect(chargeAfterPull(blocked)).toBeTruthy();
    expect(chargeAfterPull(hurt)).toBeNull();
    expect(anchor).toBeGreaterThanOrEqual(0);
  });
  it("entranced loses the opportunity without breaking a charge and cannot be reapplied within two opportunities", () => {
    let s = lone();
    // The boss begins a charge first; the lure arrives before its release.
    s = resolveRound(s, plain(s)).state;
    expect(unit(s, "B4").charge).toBeTruthy();
    fitOnly(
      unit(s, "C"),
      fitted("Lure Light", [
        statusEffect("entranced", { removable: ["disrupting"] }),
      ])
    );
    unit(s, "C").speed = 200;
    const lure = (run: Run) =>
      resolveRound(run, plain(run, { C: { move: 0, target: "B4" } }));
    let r = lure(s);
    expect(hasEvent(r, "status")).toBe(true);
    expect(hasEvent(r, "lost")).toBe(true);
    s = r.state;
    // The charge survives the lost opportunity: only the order was dropped.
    expect(unit(s, "B4").charge).toBeTruthy();
    expect(conditionOn(unit(s, "B4"), "entranced")).toBeUndefined();
    // Within the guard window the same lure is refused.
    r = lure(s);
    expect(hasEvent(r, "status")).toBe(false);
    expect(hasEvent(r, "resisted")).toBe(true);
    expect(ENTRANCE_IMMUNITY_OPPORTUNITIES).toBe(2);
    // focused blocks attention outright, whatever the window says.
    const focused = clone(r.state);
    unit(focused, "B4").conditions.push({
      status: "focused",
      group: "guarding",
      intensity: 50,
      remaining: 5,
      source: "X",
      removable: [],
    });
    unit(focused, "B4").sinceEntranced = Infinity;
    const steady = lure(focused);
    expect(hasEvent(steady, "status")).toBe(false);
    expect(
      steady.state.log.some((l) => l.includes("focused"))
    ).toBe(true);
  });
  it("frightened halves the victim's harm output through its next opportunity", () => {
    const s = lone();
    const attacker = unit(s, "B4");
    const target = unit(s, "H");
    const plain = damagePreview(attacker, attacker.moves[0], target);
    const scared = {
      ...attacker,
      conditions: [
        {
          status: "frightened",
          group: "attention" as const,
          intensity: 50,
          remaining: 1,
          source: "X",
          removable: [],
        },
      ],
    } as Unit;
    expect(damagePreview(scared, attacker.moves[0], target)).toBe(
      Math.floor(plain * FRIGHTENED_OUTPUT_FACTOR)
    );
    expect(FRIGHTENED_OUTPUT_FACTOR).toBeLessThan(1);
  });
  it("a concealed unit is skipped in targeting while another stands and reveals itself by attacking", () => {
    let s = lone();
    // Two machines: one concealed, one open. Orders may not name the concealed one.
    const extra = clone(s);
    const open = extra.enemies.find((e) => e.id !== "B4")!;
    open.hp = 200;
    unit(extra, "B4").conditions.push({
      status: "concealed",
      group: "concealment",
      intensity: 50,
      remaining: 4,
      source: "X",
      removable: ["disrupting"],
    });
    const q = orders(extra);
    expect(() =>
      resolveRound(extra, {
        ...q,
        C: { move: legalMoves(unit(extra, "C"))[0], target: "B4" },
      })
    ).toThrow();
    // A stale order aimed at it is retargeted with a hidden event.
    const stale = clone(extra);
    stale.team.forEach((u) => (u.speed = 200));
    const aimed = Object.fromEntries(
      stale.team
        .filter((u) => u.hp > 0)
        .map((u) => [u.id, { move: legalMoves(u)[0], target: open.id }])
    );
    const r = resolveRound(stale, aimed);
    expect(r.state.phase).not.toBe("lost");
    // The concealed machine ends its own concealment when it executes harm.
    const striking = clone(extra);
    striking.orders.B4 = { move: 0, target: striking.team[0].id };
    const broken = resolveRound(striking, orders(striking));
    expect(
      broken.frames.some(
        (f) => f.event?.kind === "expired" && f.event.actorId === "B4"
      )
    ).toBe(true);
    expect(
      conditionOn(unit(broken.state, "B4"), "concealed")
    ).toBeUndefined();
  });
  it("remove ends exactly the conditions whose methods intersect, and nothing else", () => {
    let s = lone();
    // Hippochamp's cannon carries cooling. A chilled condition answers to it; a
    // paralysis removable only by detoxifying does not.
    const cannon = unit(s, "H").moves.findIndex((m) =>
      m.effects.some((e) => e.support === "remove")
    );
    expect(cannon).toBeGreaterThanOrEqual(0);
    const boss = unit(s, "B4");
    boss.conditions.push(
      {
        status: "chilled",
        group: "degrading",
        intensity: 20,
        element: "ice",
        remaining: 4,
        source: "X",
        removable: ["cooling", "warming"],
      },
      {
        status: "paralyzed",
        group: "binding",
        intensity: 50,
        remaining: 2,
        source: "X",
        removable: ["detoxifying"],
      }
    );
    const r = resolveRound(s, plain(s, { H: { move: cannon, target: "B4" } }));
    expect(hasEvent(r, "removed")).toBe(true);
    s = r.state;
    expect(conditionOn(unit(s, "B4"), "chilled")).toBeUndefined();
    expect(conditionOn(unit(s, "B4"), "paralyzed")).toBeTruthy();
  });
  it("the guardian's Clamp strike paralyzes a companion, and the discharge unit shocks less often", () => {
    const clamp = (cards.templates.guardian as Card).moves.find(
      (m) => m.key === "clamp-strike"
    )!;
    const contact = (cards.templates.discharge as Card).moves.find(
      (m) => m.key === "contact-strike"
    )!;
    const shockOf = (move: { effects: CardEffect[] }) =>
      move.effects.find((e) => e.type === "status")!;
    expect(shockOf(clamp as unknown as { effects: CardEffect[] }).status).toBe(
      "paralyzed"
    );
    expect(
      shockOf(clamp as unknown as { effects: CardEffect[] }).likelihood
    ).toBe("likely");
    expect(
      shockOf(contact as unknown as { effects: CardEffect[] }).likelihood
    ).toBe("occasional");
    // It lands on a real companion in a real round. Take Core surge away so the
    // guardian clamps every round rather than charging.
    const clamping = () => {
      const run = lone();
      unit(run, "B4").moves = [unit(run, "B4").moves[0]];
      unit(run, "B4").cooldowns = [0];
      return run;
    };
    let s = clamping();
    let landed = false;
    for (let round = 0; round < 12 && !landed; round++) {
      s.orders.B4 = { move: 0, target: unit(s, "H").id };
      const r = resolveRound(s, plain(s));
      s = r.state;
      const applied = r.frames.find(
        (f) => f.event?.kind === "bind" && f.event.actorId === "B4"
      );
      if (!applied) continue;
      landed = true;
      expect(applied.event!.status).toBe("paralyzed");
      const inFrame = applied.team.find((u) => u.id === applied.event!.targetId)!;
      const condition = inFrame.conditions.find(
        (c) => c.status === "paralyzed"
      )!;
      expect(condition.group).toBe("binding");
      expect(condition.removable).toEqual(["stabilizing"]);
      expect(inFrame.bound).toBe(BINDING_OPPORTUNITIES.brief);
    }
    expect(landed, "Clamp strike never paralyzed a companion").toBe(true);
    // A brief binding is spent at the victim's own opportunity, so it is still on the
    // unit in the next planning phase only when the applier is slower than the victim.
    let slow = clamping();
    unit(slow, "B4").speed = 1;
    let visible: Unit | undefined;
    for (let round = 0; round < 12 && !visible; round++) {
      slow.orders.B4 = { move: 0, target: unit(slow, "H").id };
      slow = resolveRound(slow, plain(slow)).state;
      visible = slow.team.find((u) => u.bound > 0);
    }
    expect(visible, "no paralysis survived into planning").toBeTruthy();
    expect(
      visible!.conditions.find((c) => c.status === "paralyzed")!.remaining
    ).toBe(BINDING_OPPORTUNITIES.brief);
  });
  it("a degrading tick that lands the killing blow clears the encounter", () => {
    const s = createRun(1);
    s.enemies[1].hp = 0;
    s.enemies[0].hp = 1;
    s.enemies[0].conditions.push({
      status: "corroding",
      group: "degrading",
      intensity: 200,
      element: "chemical",
      remaining: 3,
      source: "C",
      removable: ["cleansing"],
    });
    // The crawler must reach its own opportunity for the tick to land before the squad
    // finishes it off.
    s.enemies[0].speed = 300;
    const r = resolveRound(s, plain(s));
    expect(hasEvent(r, "tick")).toBe(true);
    expect(r.state.log.some((l) => /from corroding\. Knocked out\./.test(l))).toBe(
      true
    );
    expect(r.state.phase).toBe("camp");
    expect(r.state.xp).toBe(10);
  });
  it("replays a version 2 save deterministically with conditions in play", () => {
    const s = createRun(7);
    const first = orders(s);
    const after = command(s, { kind: "round", orders: first });
    const second = orders(after);
    const history = [
      { kind: "round" as const, orders: first },
      { kind: "round" as const, orders: second },
    ];
    const restored = restoreRun(
      JSON.stringify({ version: 2, seed: 7, history })
    );
    expect(restored.state).toEqual(command(after, history[1]));
  });
});
