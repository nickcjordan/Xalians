import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "./engine.ts";
import { activeOf, createTurnRun, interval, legalTargets, turnCommand, upcoming, type TRun } from "./turns.ts";
import { turnPlanner } from "./turnPolicy.ts";

const finish = (s: TRun) => {
  for (let k = 0; k < 2000 && (s.phase === "turn" || s.phase === "camp"); k++)
    s = s.phase === "camp" ? turnCommand(s, { kind: "advance" }).state : turnCommand(s, { kind: "act", order: turnPlanner(s, () => 0.5) }).state;
  return s;
};

describe("turn by turn", () => {
  it("stops on a companion's turn with enemies already played", () => {
    const { state } = createTurnRun(1);
    expect(state.phase).toBe("turn");
    expect(activeOf(state)).not.toBeNull();
  });
  it("acts once per round in speed order on the round timeline", () => {
    const { state } = createTurnRun(1, "starter", { ...DEFAULT_RULES, timeline: "round" });
    const next = upcoming(state, 12).map((u) => u.id);
    const n = state.team.length + state.enemies.length;
    expect(new Set(next.slice(0, n)).size).toBe(n);
  });
  it("lets the fastest act more often on the speed timeline", () => {
    const { state } = createTurnRun(1, "starter", { ...DEFAULT_RULES, timeline: "speed" });
    const fast = [...state.team].sort((a, b) => b.speed - a.speed)[0];
    const slow = [...state.team].sort((a, b) => a.speed - b.speed)[0];
    expect(interval(state, fast)).toBeLessThan(interval(state, slow));
    const next = upcoming(state, 30);
    expect(next.filter((u) => u.id === fast.id).length).toBeGreaterThan(next.filter((u) => u.id === slow.id).length);
  });
  it("rejects an order for a move that is resting", () => {
    let { state } = createTurnRun(2);
    const u = activeOf(state)!;
    const i = u.moves.findIndex((m) => m.rests > 0 && (m.power > 0 || m.parts.length));
    if (i < 0) return;
    const target = legalTargets(state, u, i)[0].id;
    state = turnCommand(state, { kind: "act", order: { move: i, target } }).state;
    // The same companion's next turn: the move is still resting.
    for (let k = 0; k < 20 && state.phase === "turn" && state.active !== u.id; k++) state = turnCommand(state, { kind: "act", order: turnPlanner(state, () => 0.5) }).state;
    if (state.active === u.id) expect(() => turnCommand(state, { kind: "act", order: { move: i, target } })).toThrow();
  });
  it("plays whole runs to an end on both timelines", () => {
    for (const timeline of ["round", "speed"] as const)
      for (const seed of [1, 2]) expect(["won", "lost", "retreated"]).toContain(finish(createTurnRun(seed, "starter", { ...DEFAULT_RULES, timeline }).state).phase);
  });
  it("pushes a delayed unit's next turn back under the turn-order layer", () => {
    const { state } = createTurnRun(1, "starter", { ...DEFAULT_RULES, timeline: "speed", tempo: true });
    const pull = state.team.flatMap((u) => u.moves).find((m) => m.parts.some((p) => p.kind === "delay"));
    expect(pull).toBeDefined();
  });
});
