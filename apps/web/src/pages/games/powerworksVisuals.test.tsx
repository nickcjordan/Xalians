import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  COMPANION_RECORDS,
  COOLDOWN_ROUNDS,
  createRun,
  command,
  readCompanion,
  type Unit,
} from "@xalians/rules/dungeon";
import {
  PassiveIcon,
  passiveHeading,
  passiveRule,
} from "./powerworksVisuals";

afterEach(cleanup);

/** The guardian, reached by advancing through the three earlier sectors. */
function guardian(): Unit {
  let s = createRun(1);
  for (let i = 0; i < 3; i++) {
    s.phase = "camp";
    s = command(s, { kind: "advance" });
  }
  return s.enemies.find((u) => u.species === "guardian")!;
}

describe("powerworks passive presentation", () => {
  it("files a triggered passive under Reacts and names its trigger, damage and cadence", () => {
    const b = guardian();
    const core = b.passives.find((p) => p.key === "core-discharge")!;
    expect(passiveHeading(core)).toBe("Reacts");
    const rule = passiveRule(b, core);
    expect(rule).toContain("strikes it in contact range");
    expect(rule).toMatch(/\d+ base power/);
    // Core discharge is authored at brief recovery (Nick's lever, 2026-09-21).
    expect(core.cooldown).toBe(COOLDOWN_ROUNDS.brief);
    expect(rule).toContain("Answers once per round");
    // It never reveals an order, only the automatic rule.
    expect(rule).not.toMatch(/target|order/i);
  });
  it("reads the cadence off the recovery, one phrase per value", () => {
    const b = guardian();
    const core = b.passives.find((p) => p.key === "core-discharge")!;
    const at = (cooldown: number) =>
      passiveRule(b, { ...core, cooldown });
    expect(at(COOLDOWN_ROUNDS.repeatable)).toContain("Answers every time");
    expect(at(COOLDOWN_ROUNDS.brief)).toContain("Answers once per round");
    expect(at(COOLDOWN_ROUNDS.prolonged)).toContain(
      "Answers every other round"
    );
  });
  it("files an ongoing passive under Always and states the condition it keeps", () => {
    // Graviclaw carries no passive, so the ongoing case is read from a real record that
    // does: the seam turns Bioflim's ongoing restore into a permanent mending condition.
    const record = COMPANION_RECORDS.graviclaw;
    const u = readCompanion(record, "G");
    const ongoing = {
      key: "regrow",
      name: "Everforming Carapace",
      signature: false,
      kind: "ongoing" as const,
      effects: [],
      cooldown: 0,
      conditions: [
        {
          status: "mending",
          group: "mending" as const,
          intensity: 45,
          remaining: Infinity,
          source: "G",
          removable: [],
        },
      ],
      support: "supported" as const,
    };
    expect(passiveHeading(ongoing)).toBe("Always");
    const rule = passiveRule(u, ongoing);
    expect(rule).toContain("Always active");
    expect(rule).toMatch(/Recovers \d+ HP/);
  });
  it("says so plainly when a passive is unsupported", () => {
    const u = readCompanion(COMPANION_RECORDS.graviclaw, "G");
    expect(
      passiveRule(u, {
        key: "x",
        name: "Nothing",
        signature: false,
        kind: "ongoing",
        effects: [],
        cooldown: 0,
        conditions: [],
        support: "unsupported",
        reason: "nothing here reads harm as a lasting state",
      })
    ).toBe("No effect here (nothing here reads harm as a lasting state).");
  });
  it("draws one icon per passive kind", () => {
    const b = guardian();
    const { container } = render(
      <PassiveIcon passive={b.passives[0]} />
    );
    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
