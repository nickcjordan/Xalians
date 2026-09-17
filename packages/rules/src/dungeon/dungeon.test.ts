import { describe, expect, it } from "vitest";
import {
  command,
  createRun,
  legalMoves,
  moveAt,
  resolveRound,
  restoreRun,
  type Run,
  type Order,
} from "./index.ts";

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
function boss() {
  let s = createRun(1);
  for (let i = 0; i < 3; i++) {
    s.phase = "camp";
    s = command(s, { kind: "advance" });
  }
  return s;
}

describe("Powerworks battle rules", () => {
  it("rejects incomplete or exhausted orders without consuming state or changing hidden plans", () => {
    const s = createRun(9),
      before = structuredClone(s);
    expect(() => resolveRound(s, {})).toThrow();
    expect(s).toEqual(before);
    const q = orders(s);
    const u = s.team[0];
    u.uses[q[u.id].move] = 0;
    expect(() => resolveRound(s, q)).toThrow();
  });
  it("restrains melee before execution without spending its use, but permits ranged actions", () => {
    const s = createRun();
    const a = s.team.find((u) => u.id === "A")!;
    const e = s.enemies[0];
    e.snared = 1;
    const r = resolveRound(s, orders(s));
    expect(r.state.log.some((l) => l.includes("stopped by restraint"))).toBe(
      true
    );
    a.snared = 1;
    expect(legalMoves(a)).toEqual([2]);
  });
  it("retargets the same signature and spends exactly one use", () => {
    const s = createRun();
    s.enemies[0].hp = 1;
    const q = orders(s);
    q.C = { move: 3, target: s.enemies[0].id };
    s.enemies[1].hp = 200;
    const r = resolveRound(s, q).state;
    expect(r.log.some((l) => l.includes("Crystorn redirects Coronet"))).toBe(
      true
    );
    expect(r.team.find((u) => u.id === "C")!.uses[3]).toBe(0);
  });
  it("ends immediately after the final knockout and preserves unexecuted orders", () => {
    const s = createRun();
    s.enemies[0].hp = 1;
    s.enemies[1].hp = 0;
    const r = resolveRound(s, orders(s)).state;
    expect(r.phase).toBe("camp");
    expect(r.xp).toBe(10);
    expect(r.team.find((u) => u.id === "C")!.uses).toEqual([3, 3, 3, 1]);
  });
  it("a boss interrupted on release must recover before starting a new charge", () => {
    let s = boss();
    s.enemies
      .filter((u) => u.id !== "B4")
      .forEach((u) => {
        u.hp = 0;
      });
    s.enemies.find((u) => u.id === "B4")!.hp = 500;
    s = resolveRound(s, orders(s)).state;
    expect(s.enemies.find((u) => u.id === "B4")!.charge).toBeTruthy();
    const q = orders(s);
    q.A = { move: 3, target: "B4" };
    s = resolveRound(s, q).state;
    const b = s.enemies.find((u) => u.id === "B4")!;
    expect(b.charge).toBeNull();
    expect(b.recovery).toBe(1);
    expect(moveAt(b, s.orders.B4.move).kind).toBe("hit");
    s = resolveRound(s, orders(s)).state;
    expect(s.enemies.find((u) => u.id === "B4")!.recovery).toBe(0);
    expect(moveAt(b, s.orders.B4.move).kind).toBe("charge");
  });
  it("preserves knockouts and health, refreshes moves, permits one partial revival", () => {
    let s = createRun();
    s.phase = "camp";
    s.team[0].hp = 0;
    s.team[1].hp = 8;
    s.team[1].uses = [0, 0, 0, 0];
    s = command(s, { kind: "revive", id: s.team[0].id });
    expect(s.team[0].hp).toBe(Math.ceil(s.team[0].max / 2));
    expect(s.revival).toBe(0);
    expect(() => command(s, { kind: "revive", id: s.team[0].id })).toThrow();
    const woundedId = s.team[1].id;
    s = command(s, { kind: "advance" });
    expect(s.team.find((u) => u.id === woundedId)!.hp).toBe(8);
    expect(s.team[0].uses).toEqual([3, 3, 3, 1]);
  });
  it("offers recoil fallback only after all damaging moves are exhausted", () => {
    const s = createRun();
    const a = s.team.find((u) => u.id === "A")!;
    expect(legalMoves(a)).not.toContain(-1);
    a.uses = [0, 0, 0, 1];
    expect(legalMoves(a)).toContain(-1);
    const q = orders(s);
    q.A = { move: -1, target: s.enemies[0].id };
    const r = resolveRound(s, q);
    expect(r.frames.some((f) => f.text.includes("2 recoil"))).toBe(true);
    a.snared = 1;
    expect(legalMoves(a)).not.toContain(-1);
  });
  it("a full wipe loses without spending a revival or granting encounter XP", () => {
    const s = createRun();
    s.team.forEach((u) => {
      u.hp = 1;
      u.speed = 1;
    });
    s.enemies.forEach((u, i) => {
      u.moves[0].damage = 500;
      s.orders[u.id].target = s.team[i].id;
    });
    s.team[2].hp = 0;
    s.team[3].hp = 0;
    const r = resolveRound(s, orders(s)).state;
    expect(r.phase).toBe("lost");
    expect(r.revival).toBe(1);
    expect(r.xp).toBe(0);
  });
  it("replays a saved command history deterministically", () => {
    const s = createRun(41);
    const q = orders(s);
    const action = { kind: "round" as const, orders: q };
    const restored = restoreRun(
      JSON.stringify({ version: 1, seed: 41, history: [action] })
    );
    expect(restored.state).toEqual(command(s, action));
    expect(() => restoreRun('{"version":2}')).toThrow();
  });
  it("completes a seed range without negative HP, move counts or endless player exhaustion", () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = createRun(seed);
      let rounds = 0;
      while ((s.phase === "planning" || s.phase === "camp") && rounds < 100) {
        if (s.phase === "camp") s = command(s, { kind: "advance" });
        else {
          s = resolveRound(s, orders(s)).state;
          rounds++;
        }
        for (const u of s.team) {
          expect(u.hp).toBeGreaterThanOrEqual(0);
          expect(u.uses.every((n) => n >= 0)).toBe(true);
        }
      }
      expect(["won", "lost"]).toContain(s.phase);
    }
  });
});
