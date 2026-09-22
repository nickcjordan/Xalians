import { describe, expect, it } from "vitest";
import {
  formatSurvey,
  formatTable,
  simulate,
  surveyPassives,
} from "./powerworksSim.ts";

// Measurement, not a rule: prints the pass 1, 2 and 3 tables for 200 seeded greedy runs,
// plus the seam-only passive survey over the wider roster (contract pass 3 "Measurement").
describe("Powerworks greedy measurement", () => {
  it("plays 200 seeded runs and prints the table", () => {
    const stats = simulate(200, 1);
    const table = formatTable(stats);
    console.log(`\nPowerworks greedy sim (200 runs, seeds 1-200)\n${table}\n`);
    expect(stats.wins + stats.losses).toBe(200);
    expect(stats.rounds).toBeGreaterThan(0);
  }, 60000);
  it("surveys 20 seeds per species at the seam and prints the table", () => {
    const survey = surveyPassives(20);
    console.log(
      `
Powerworks passive seam survey (20 seeds x ${
        survey.records / 20
      } species)
${formatSurvey(survey)}
`
    );
    expect(survey.records).toBeGreaterThan(0);
    expect(survey.supported + survey.unsupported).toBe(
      survey.ongoing + survey.triggered
    );
  }, 120000);
});
