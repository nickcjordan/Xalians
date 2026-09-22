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
  type Order,
  type Run,
  type Unit,
} from "./index.ts";
import { COOLDOWN_ROUNDS, LIKELIHOOD_PERCENT } from "./levers.ts";
import cards from "./cards.json";
import type { Card } from "./reading.ts";

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
    const g = unit(s, "G");
    const anchor = g.moves.find((m) => m.effects[0].type === "status")!;
    expect(anchor.effects[0].support).toBe("unsupported");
    expect(anchor.effects[0].reason).toMatch(/protected/);
    expect(legalMoves(g)).not.toContain(g.moves.indexOf(anchor));
    const h = unit(s, "H");
    const cannon = h.moves.find((m) => m.signature)!;
    expect(cannon.effects.map((e) => e.support)).toEqual(["harm", "unsupported"]);
    expect(legalMoves(h)).toContain(0);
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
