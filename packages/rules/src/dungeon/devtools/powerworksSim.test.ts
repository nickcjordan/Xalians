import { describe, expect, it } from "vitest";
import {
  formatActionSurvey,
  formatOfferSurvey,
  formatPass5,
  formatPass6,
  formatSurvey,
  formatTable,
  simulate,
  surveyActions,
  surveyOffer,
  surveyPassives,
  type SimOptions,
} from "./powerworksSim.ts";

// Measurement, not a rule: prints the pass 1 to 5 tables for 200 seeded greedy runs,
// plus the seam-only passive survey over the wider roster (contract pass 3 "Measurement").
const variants: [string, SimOptions][] = [
  ["shipped squad, pass 5 policy", { policy: "pass5", healerFree: "none" }],
  ["healer-free: every helpful move removed (decision 44)", { policy: "pass5", healerFree: "moves" }],
  ["healer-free: moves kept, no order names a squadmate", { policy: "pass5", healerFree: "aim" }],
  ["shipped squad, pass 4 policy", { policy: "pass4", healerFree: "none" }],
];
describe("Powerworks greedy measurement", () => {
  for (const [label, options] of variants)
    it(`plays 200 seeded runs (${label}) and prints the table`, () => {
      const stats = simulate(200, 1, options);
      console.log(
        `\nPowerworks greedy sim (200 runs, seeds 1-200, ${label})\n${formatTable(stats)}\n${formatPass5(stats)}\n`
      );
      expect(stats.wins + stats.losses).toBe(200);
      expect(stats.rounds).toBeGreaterThan(0);
      if (options.healerFree !== "none") expect(stats.ordersAtSquadmates).toBe(0);
    }, 120000);
  // Pass 6 (contract decision 51): the starter baseline at 200, then two drafts at 400 each.
  const drafts: [string, number, SimOptions][] = [
    ["starter squad", 200, { policy: "pass5", healerFree: "none", draft: "starter" }],
    ["random legal draft", 400, { policy: "pass5", healerFree: "none", draft: "random" }],
    ["greedy draft", 400, { policy: "pass5", healerFree: "none", draft: "greedy" }],
  ];
  for (const [label, runs, options] of drafts)
    it(`plays ${runs} seeded runs (${label}) and prints the pass 6 rows`, () => {
      const stats = simulate(runs, 1, options);
      console.log(
        `
Powerworks greedy sim (${runs} runs, seeds 1-${runs}, ${label})
${formatTable(stats)}
${formatPass6(stats)}
`
      );
      expect(stats.wins + stats.losses).toBe(runs);
      expect(Object.values(stats.squadSpecies).reduce((n, v) => n + v.runs, 0)).toBe(runs * 4);
    }, 300000);
  // Contract decision 53: how often each species is offered, and how often its tries pass.
  it("surveys the draft offer over 400 seeds and prints it", () => {
    const survey = surveyOffer(400);
    console.log(`
Powerworks draft offer survey (seeds 1-400)
${formatOfferSurvey(survey)}
`);
    expect(Object.values(survey.offers).reduce((n, v) => n + v, 0)).toBe(400 * 8);
  }, 300000);
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
  it("surveys every action effect at the seam over 20 seeds per species and prints it", () => {
    const survey = surveyActions(20);
    console.log(`
Powerworks action seam survey (20 seeds per species)
${formatActionSurvey(survey)}
`);
    expect(survey.actions).toBe(survey.records * 4);
  }, 120000);
});
