import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES,
  attackOn,
  createPillarRun,
  legalMoves,
  legalTargets,
  pillarCommand,
  resolvePillarRound,
  step,
  turnOrder,
  type Fighter,
  type Order,
  type PMove,
  type PRun,
} from "./engine.ts";
import { plannerPolicy } from "./policy.ts";

const attack = (power: number, element: string | null, extra: Partial<PMove> = {}): PMove => ({
  key: "a",
  name: "Test attack",
  signature: false,
  rests: 0,
  power,
  area: false,
  element,
  parts: [],
  ...extra,
});
/** A run whose squad and enemies are replaced by hand-made fighters. */
function arena(team: Partial<Fighter>[], enemies: Partial<Fighter>[]): PRun {
  const s = createPillarRun(1);
  const make = (f: Partial<Fighter>, i: number, enemy: boolean): Fighter => ({
    id: (enemy ? "E" : "T") + i,
    name: (enemy ? "Enemy " : "Ally ") + i,
    species: "x",
    element: "water",
    enemy,
    hp: 30,
    max: 30,
    speed: 50,
    moves: [attack(5, null)],
    cooldowns: [0],
    signatureSpent: false,
    shields: [],
    boost: 0,
    hinder: 0,
    ...f,
    ...(f.moves ? { cooldowns: f.moves.map(() => 0) } : {}),
  });
  s.team = team.map((f, i) => make(f, i, false));
  s.enemies = enemies.map((f, i) => make(f, i, true));
  s.orders = {};
  return s;
}
const round = (s: PRun, orders: Record<string, Order>, enemyOrders: Record<string, Order> = {}) =>
  resolvePillarRound({ ...s, orders: enemyOrders }, orders);

describe("pillar rules", () => {
  it("reads the shared chart, physical is steady", () => {
    expect(step("water", "fire")).toBe(2);
    expect(step("water", "ice")).toBe(0);
    expect(step(null, "ice")).toBe(1);
  });
  it("gives every attack its creature's element under Path 1, and the move's own under the old reading", () => {
    const s = createPillarRun(1);
    const hippo = s.team.find((u) => u.name === "Hippochamp")!;
    const kick = hippo.moves.find((m) => m.name === "Crushing Kick")!;
    expect(kick.element).toBe("water");
    const old = createPillarRun(1, "starter", { ...DEFAULT_RULES, elementSource: "move" });
    expect(old.team.find((u) => u.name === "Hippochamp")!.moves.find((m) => m.name === "Crushing Kick")!.element).toBe(null);
  });
  it("gives every attack the same power under Path 2", () => {
    const s = createPillarRun(1, "starter", { ...DEFAULT_RULES, uniformPower: true });
    for (const u of s.team) {
      const single = u.moves.filter((m) => m.power > 0 && !m.area).map((m) => m.power);
      expect(new Set(single).size).toBeLessThanOrEqual(1);
    }
  });
  it("orders turns by speed alone, ties to the squad", () => {
    const s = arena([{ speed: 40 }, { speed: 60 }], [{ speed: 60 }, { speed: 10 }]);
    expect(turnOrder(s).map((u) => u.id)).toEqual(["T1", "E0", "T0", "E1"]);
  });
  it("multiplies power by the matchup and lets a shield absorb first", () => {
    const s = arena([{ element: "water", moves: [attack(5, "water")] }], [{ element: "fire", shields: [{ n: 4, from: "E0" }], speed: 1 }]);
    expect(attackOn(s.team[0], s.team[0].moves[0], s.enemies[0])).toBe(10);
    const { state } = round(s, { T0: { move: 0, target: "E0" } });
    expect(state.enemies[0].hp).toBe(24);
  });
  it("ends a shield at its caster's next turn", () => {
    const s = arena(
      [{ speed: 90, moves: [attack(0, null, { parts: [{ kind: "shield", n: 9, aim: "self", all: false }] })] }],
      [{ speed: 10, moves: [attack(5, null)] }]
    );
    let { state } = round(s, { T0: { move: 0, target: "T0" } }, { E0: { move: 0, target: "T0" } });
    expect(state.team[0].hp).toBe(30);
    // Next round the shield is gone before the enemy strikes again, and a fresh one replaces it.
    ({ state } = round(state, { T0: { move: -2, target: "T0" } }, { E0: { move: 0, target: "T0" } }));
    expect(state.team[0].hp).toBe(25);
  });
  it("takes a hinder off the enemy's next attack, even next round", () => {
    const s = arena(
      [{ speed: 10, moves: [attack(0, null, { parts: [{ kind: "hinder", n: 3, aim: "enemy", all: false }] })] }],
      [{ speed: 90, moves: [attack(5, null)] }]
    );
    let { state } = round(s, { T0: { move: 0, target: "E0" } }, { E0: { move: 0, target: "T0" } });
    expect(state.team[0].hp).toBe(25);
    ({ state } = round(state, { T0: { move: -2, target: "T0" } }, { E0: { move: 0, target: "T0" } }));
    expect(state.team[0].hp).toBe(23);
  });
  it("adds a boost to the ally's next attack only", () => {
    const s = arena(
      [
        { speed: 90, moves: [attack(0, null, { parts: [{ kind: "boost", n: 4, aim: "ally", all: false }] })] },
        { speed: 50, moves: [attack(5, null)] },
      ],
      [{ speed: 1, hp: 50, max: 50 }]
    );
    const { state } = round(s, { T0: { move: 0, target: "T1" }, T1: { move: 0, target: "E0" } });
    expect(state.enemies[0].hp).toBe(41);
    expect(state.team[1].boost).toBe(0);
  });
  it("sends an attack on a fallen enemy to the next one in the row", () => {
    const s = arena([{ speed: 90, moves: [attack(40, null)] }, { speed: 80, moves: [attack(5, null)] }], [{ speed: 1 }, { speed: 1 }]);
    const { state, events } = round(s, { T0: { move: 0, target: "E0" }, T1: { move: 0, target: "E0" } });
    expect(events.some((e) => e.kind === "redirect")).toBe(true);
    expect(state.enemies[1].hp).toBe(25);
  });
  it("hits every enemy with an area attack", () => {
    const s = arena([{ moves: [attack(3, null, { area: true })] }], [{ speed: 1 }, { speed: 1 }]);
    const { state } = round(s, { T0: { move: 0, target: "E0" } });
    expect(state.enemies.map((e) => e.hp)).toEqual([27, 27]);
  });
  it("rests a move and spends a signature", () => {
    const s = arena([{ moves: [attack(1, null, { rests: 1 }), attack(1, null, { signature: true })] }], [{ speed: 1, hp: 90, max: 90 }]);
    let { state } = round(s, { T0: { move: 0, target: "E0" } });
    expect(legalMoves(state.team[0])).toEqual([1]);
    ({ state } = round(state, { T0: { move: 1, target: "E0" } }));
    expect(legalMoves(state.team[0])).toEqual([0]);
  });
  it("rejects an illegal order", () => {
    const s = arena([{}], [{}]);
    expect(() => round(s, { T0: { move: 3, target: "E0" } })).toThrow();
  });
  it("plays whole runs to an end with the planner", () => {
    for (const seed of [1, 2, 3]) {
      let s = createPillarRun(seed);
      for (let k = 0; k < 400 && (s.phase === "planning" || s.phase === "camp"); k++)
        s = s.phase === "camp" ? pillarCommand(s, { kind: "advance" }) : pillarCommand(s, { kind: "round", orders: plannerPolicy(s, () => 0.5) });
      expect(["won", "lost", "retreated"]).toContain(s.phase);
    }
  });
  it("lets a helping move name a squadmate", () => {
    const s = arena([{ moves: [attack(0, null, { parts: [{ kind: "heal", n: 5, aim: "ally", all: false }] })] }, {}], [{}]);
    expect(legalTargets(s, s.team[0], 0).map((t) => t.id)).toEqual(["T1"]);
  });
});
