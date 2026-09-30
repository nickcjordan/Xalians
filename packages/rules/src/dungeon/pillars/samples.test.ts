/*
  Robustness against the creature sample set (docs/design/creature-sample-set.md): every sample
  creature, in a squad with three starter companions, plays a whole turn-by-turn run with the
  hardest-hit player. The engine must not throw, no health may be NaN or negative, every event
  amount must be finite, and the run must end (won, lost or retreated) under a turn cap.
*/
import { describe, expect, it } from "vitest";
import { COMPANION_KEYS, COMPANION_RECORDS } from "../index.ts";
import { sampleCreatures } from "../../samples/index.ts";
import { DEFAULT_RULES, type Fighter, type PEvent } from "./engine.ts";
import { HEALTH_FLOOR, MIN_POWER } from "./levers.ts";
import { createTurnRunFrom, turnCommand, type TRun } from "./turns.ts";
import { turnHardestHit } from "./turnPolicy.ts";

const RULES = { ...DEFAULT_RULES, rooms: "roles" as const, timeline: "round" as const };
const TURN_CAP = 3000;

function checkFighters(units: Fighter[]) {
  for (const u of units) {
    expect(Number.isFinite(u.hp), `${u.id} hp`).toBe(true);
    expect(Number.isFinite(u.max) && u.max > 0, `${u.id} max`).toBe(true);
    expect(u.hp, `${u.id} hp floor`).toBeGreaterThanOrEqual(0);
    expect(u.hp, `${u.id} hp ceiling`).toBeLessThanOrEqual(u.max);
    for (const m of u.moves) {
      expect(Number.isFinite(m.power) && m.power >= 0, `${u.id} ${m.key} power`).toBe(true);
      for (const p of m.parts) expect(Number.isFinite(p.n) && p.n > 0, `${u.id} ${m.key} ${p.kind}`).toBe(true);
    }
  }
}
function checkEvents(events: PEvent[]) {
  for (const e of events) if ("amount" in e) expect(Number.isFinite(e.amount) && e.amount >= 0, `${e.kind} amount`).toBe(true);
}

describe("sample creatures in whole runs", () => {
  const samples = sampleCreatures();
  it("has the whole set", () => expect(samples.length).toBe(168));
  it("plays every sample creature with three starters to an end", () => {
    const outcomes: Record<string, number> = { won: 0, lost: 0, retreated: 0 };
    samples.forEach((record, i) => {
      const skip = i % COMPANION_KEYS.length;
      const starters = COMPANION_KEYS.filter((_, k) => k !== skip).map((k) => COMPANION_RECORDS[k]);
      const seed = i + 1;
      let { state: s, events } = createTurnRunFrom(seed, [...starters, record], RULES) as { state: TRun; events: PEvent[] };
      checkFighters([...s.team, ...s.enemies]);
      checkEvents(events);
      let rand = 0.37;
      const next = () => (rand = (rand * 9301 + 49297) % 233280 / 233280);
      let k = 0;
      for (; k < TURN_CAP && (s.phase === "turn" || s.phase === "camp"); k++) {
        const step = s.phase === "camp"
          ? turnCommand(s, { kind: "advance" })
          : turnCommand(s, { kind: "act", order: turnHardestHit(s, next) });
        s = step.state;
        checkFighters([...s.team, ...s.enemies]);
        checkEvents(step.events);
      }
      expect(k, `${record.species} run length`).toBeLessThan(TURN_CAP);
      expect(["won", "lost", "retreated"], `${record.species} phase`).toContain(s.phase);
      outcomes[s.phase]++;
    });
    expect(outcomes.won + outcomes.lost + outcomes.retreated).toBe(samples.length);
  }, 120_000);
  it("keeps every companion above one enemy blow and every attack's matchup visible", () => {
    for (const record of samples) {
      const u = createTurnRunFrom(1, [record], RULES).state.team[0];
      expect(u.max).toBeGreaterThanOrEqual(HEALTH_FLOOR);
      for (const m of u.moves) if (m.power > 0) expect(m.power).toBeGreaterThanOrEqual(MIN_POWER);
    }
  });
  it("forces a stalled fight out when neither side reaches a new low", () => {
    const s = createTurnRunFrom(1, COMPANION_KEYS.map((k) => COMPANION_RECORDS[k]), RULES).state;
    s.lows = [0, 0];
    s.stalled = 0;
    let t: TRun = s;
    for (let k = 0; k < 400 && t.phase === "turn"; k++) {
      t.lows = [0, 0];
      t = turnCommand(t, { kind: "act", order: { move: -2, target: t.active! } }).state;
    }
    expect(t.phase).toBe("retreated");
  });
});
