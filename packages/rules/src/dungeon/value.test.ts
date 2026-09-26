import { describe, expect, it } from "vitest";
import { createRun, legalMoves, moveAt, type Unit } from "./index.ts";
import { machineThreat, moveValue, valueOn } from "./value.ts";

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
});
