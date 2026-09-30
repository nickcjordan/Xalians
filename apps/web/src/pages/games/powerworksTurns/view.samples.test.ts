/*
  The turn screen's view against the creature sample set (docs/design/creature-sample-set.md).
  Squads of sample creatures, covering every role, are played with the hardest-hit player; at
  every state turnView must build, and every string it and eventWords render must be free of
  NaN, undefined and null, with every number shown finite.
*/
import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES,
  ENEMY_HP_FACTOR,
  createTurnRunFrom,
  turnCommand,
  turnHardestHit,
  type PEvent,
  type TRun,
} from "@xalians/rules/dungeon/pillars";
import { COMPANION_KEYS, COMPANION_RECORDS } from "@xalians/rules/dungeon";
import { SAMPLE_ROLES, sampleAxes, sampleCreatures, sampleSquads } from "@xalians/rules/samples";
import { eventWords, playback, turnView } from "./view.ts";

const RULES = { ...DEFAULT_RULES, rooms: "roles" as const, timeline: "round" as const, enemyHpFactor: ENEMY_HP_FACTOR };
const BAD = /\b(NaN|undefined|null|Infinity)\b/;

/** Every string and number reachable from a value, so one walk checks everything a view renders. */
function leaves(value: unknown, path: string, out: { path: string; value: string | number }[]) {
  if (typeof value === "string" || typeof value === "number") out.push({ path, value });
  else if (Array.isArray(value)) value.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) leaves(v, `${path}.${k}`, out);
}
function assertClean(value: unknown, where: string) {
  const found: { path: string; value: string | number }[] = [];
  leaves(value, where, found);
  for (const { path, value: v } of found) {
    if (typeof v === "number") expect(Number.isFinite(v), `${path} = ${v}`).toBe(true);
    else expect(BAD.test(v), `${path} = "${v}"`).toBe(false);
  }
}

/** Two creatures of each role (different species) with two starter companions, then some plain sample squads. */
function squads() {
  const axes = sampleAxes();
  const all = sampleCreatures();
  const list: { label: string; roles: Set<string>; records: typeof all[number][] }[] = [];
  for (const role of SAMPLE_ROLES) {
    const ofRole = all.filter((c) => axes.get(c.species)!.role === role);
    const first = ofRole[0];
    const second = ofRole.find((c) => c.species !== first.species)!;
    const starters = [COMPANION_KEYS[list.length % 4], COMPANION_KEYS[(list.length + 1) % 4]].map((k) => COMPANION_RECORDS[k]);
    list.push({ label: role, roles: new Set([role]), records: [...starters, first, second] });
  }
  sampleSquads(6, "page").forEach((records, i) =>
    list.push({ label: `mixed-${i}`, roles: new Set(records.map((c) => axes.get(c.species)!.role)), records })
  );
  return list;
}

describe("turn view over sample squads", () => {
  const list = squads();
  it("covers every one of the 14 roles", () => {
    const seen = new Set(list.flatMap((s) => [...s.roles]));
    for (const role of SAMPLE_ROLES) expect(seen.has(role), role).toBe(true);
  });
  it.each(list.map((s) => [s.label, s] as const))("renders every state and event of %s cleanly", (_label, squad) => {
    let s: TRun = createTurnRunFrom(1, squad.records, RULES).state;
    let stepsSeen = 0;
    let rand = 0.61;
    const next = () => (rand = ((rand * 9301 + 49297) % 233280) / 233280);
    for (let k = 0; k < 400 && (s.phase === "turn" || s.phase === "camp"); k++) {
      assertClean(turnView(s), "view");
      let step: { state: TRun; events: PEvent[] };
      if (s.phase === "camp") step = turnCommand(s, { kind: "advance" });
      else step = turnCommand(s, { kind: "act", order: turnHardestHit(s, next) });
      for (const e of step.events) assertClean(eventWords(s, e), "words");
      for (const beat of playback(s, step.events)) assertClean(beat, "beat");
      s = step.state;
      stepsSeen++;
    }
    assertClean(turnView(s), "final view");
    expect(stepsSeen).toBeGreaterThan(0);
  });
});
