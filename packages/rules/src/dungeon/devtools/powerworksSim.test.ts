import { describe, expect, it } from "vitest";
import { formatTable, simulate } from "./powerworksSim.ts";

// Measurement, not a rule: prints the pass 1 and pass 2 tables for 200 seeded greedy runs.
describe("Powerworks greedy measurement", () => {
  it("plays 200 seeded runs and prints the table", () => {
    const stats = simulate(200, 1);
    const table = formatTable(stats);
    console.log(`\nPowerworks greedy sim (200 runs, seeds 1-200)\n${table}\n`);
    expect(stats.wins + stats.losses).toBe(200);
    expect(stats.rounds).toBeGreaterThan(0);
  }, 60000);
});
