import { describe, expect, it } from "vitest";
import { createRun, legalMoves, moveAt, type Unit } from "./index.ts";
import { atHealth, machineThreat, moveValue, pickShare, projectOrders, ticksDue, total, valueOn } from "./value.ts";

// Move value pass (2026-09-26): what the wheel draws under each move and each machine.
describe("move value, in health", () => {
  const s = createRun(1);
  const named = (u: Unit, part: string) => legalMoves(u, s).find((i) => moveAt(u, i).name.includes(part))!;
  const unit = (name: string) => s.team.find((u) => u.name === name)!;

  it("reads a machine's next blow as its most dangerous move, averaged over whom it may pick", () => {
    for (const e of s.enemies) {
      const t = machineThreat(s, e);
      expect(t.amount).toBeGreaterThan(0);
      expect(t.move).not.toBeNull();
      // The crawlers only strike up close, so they close in and nothing they do is ranged.
      expect(t.closing).toBe(true);
      expect(t.ranged).toBe(false);
    }
  });
  it("values a harm by the health it takes, and a bind by the blow it stops", () => {
    const hippo = unit("Hippochamp");
    const cannon = moveValue(s, hippo, named(hippo, "Water Cannon"));
    expect(cannon.harm).toBeGreaterThan(0);
    expect(cannon.saved).toBe(0);
    const avilily = unit("Avilily");
    const bind = moveValue(s, avilily, named(avilily, "Binding"));
    expect(bind.saved).toBeGreaterThan(0);
  });
  it("gives a blinding move nothing to stop against machines that only strike up close", () => {
    const crystorn = unit("Crystorn");
    const i = named(crystorn, "Blinding");
    for (const e of s.enemies) expect(valueOn(s, crystorn, i, e).saved).toBe(0);
  });
  it("says why a status would stop nothing (readout pass)", () => {
    const run = createRun(1);
    const crystorn = run.team.find((u) => u.name === "Crystorn")!;
    const i = legalMoves(crystorn, run).find((k) => moveAt(crystorn, k).name.includes("Blinding"))!;
    // With its damage taken away, the blind alone is worth nothing, and says why.
    run.enemies[0].hp = 30;
    const v = valueOn(run, crystorn, i, { ...run.enemies[0], hp: 30 });
    expect(v.stops).toBe(0);
    const graviclaw = run.team.find((u) => u.name === "Graviclaw")!;
    const anchor = legalMoves(graviclaw, run).find((k) => moveAt(graviclaw, k).name.includes("Anchor"))!;
    // A guard on itself is read on its user, whatever nominal target the order carries.
    const onSelf = valueOn(run, graviclaw, anchor, run.enemies[0]);
    expect(onSelf.target).toBe(graviclaw.id);
    if (total(onSelf) === 0) expect(onSelf.why?.kind).toBe("needless");
  });
  it("reads a machine that already loses its turn as no blow at all", () => {
    const run = createRun(1);
    const m = run.enemies[0];
    m.conditions.push({ status: "stunned", group: "shock", intensity: 0, remaining: 1, source: "x", removable: [] });
    const t = machineThreat(run, m);
    expect(t.amount).toBe(0);
    expect(t.held).toBe("stunned");
  });
  it("names the best target and marks a knockout", () => {
    const run = createRun(1);
    run.enemies[0].hp = 1;
    const hippo = run.team.find((u) => u.name === "Hippochamp")!;
    const i = legalMoves(hippo, run).find((k) => moveAt(hippo, k).name.includes("Water Cannon"))!;
    const v = moveValue(run, hippo, i);
    expect(v.knockout).toBe(true);
    expect(v.target).toBe(run.enemies[0].id);
    // Health taken never exceeds what the machine has left.
    expect(valueOn(run, hippo, i, run.enemies[0]).harm).toBe(1);
  });
  it("projects standing orders in turn order, so a blow on a machine already finished is worth nothing", () => {
    const run = createRun(1);
    const [m1] = run.enemies;
    const hippo = run.team.find((u) => u.name === "Hippochamp")!;
    const cannon = legalMoves(hippo, run).find((k) => moveAt(hippo, k).name.includes("Water Cannon"))!;
    const hit = valueOn(run, hippo, cannon, m1).harm;
    expect(hit).toBeGreaterThan(0);
    m1.hp = hit;
    const plan = projectOrders(run, { [hippo.id]: { move: cannon, target: m1.id } });
    expect(plan.hp[m1.id]).toBe(0);
    expect(plan.dealt[hippo.id]).toBe(hit);
    // Another companion's blow on it now reads as nothing, and says why.
    const graviclaw = run.team.find((u) => u.name === "Graviclaw")!;
    const pincer = legalMoves(graviclaw, run).find((k) => moveAt(graviclaw, k).name.includes("Pincer"))!;
    const after = atHealth(run, plan.hp);
    const v = valueOn(after, graviclaw, pincer, after.enemies[0]);
    expect(total(v)).toBe(0);
    expect(v.why?.kind).toBe("falls");
    // Its best use moves to the other machine.
    expect(moveValue(after, graviclaw, pincer).target).toBe(run.enemies[1].id);
  });
  it("says how often the machines pick each companion, by size (legible effects)", () => {
    const run = createRun(1);
    const shares = run.team.map((u) => pickShare(run, u));
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const avilily = run.team.find((u) => u.name === "Avilily")!;
    const graviclaw = run.team.find((u) => u.name === "Graviclaw")!;
    // The smallest body is picked least, the biggest most.
    expect(pickShare(run, avilily)).toBeLessThan(0.25);
    expect(pickShare(run, graviclaw)).toBeGreaterThan(pickShare(run, avilily));
    graviclaw.hp = 0;
    expect(pickShare(run, graviclaw)).toBe(0);
  });
  it("counts a degrading status's next tick, capped at what the unit has left", () => {
    const run = createRun(1);
    const u = run.team[0];
    expect(ticksDue(u)).toBe(0);
    u.conditions.push({ status: "burning", group: "degrading", intensity: 50, remaining: 2, source: "x", removable: [] });
    expect(ticksDue(u)).toBeGreaterThan(0);
    u.hp = 1;
    expect(ticksDue(u)).toBeLessThanOrEqual(1);
  });
});
