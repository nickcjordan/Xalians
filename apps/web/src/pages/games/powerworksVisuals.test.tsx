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
  GroupIcon,
  MoveCardContent,
  PassiveIcon,
  areaSummary,
  conditionRule,
  effectSummary,
  moveDescription,
  MoveIcon,
  closes,
  melee,
  passiveHeading,
  passiveRule,
} from "./powerworksVisuals";
import type { Condition, Move, MoveEffect, StatusGroup } from "@xalians/rules/dungeon";

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

/** A condition of a pass 4 group, as the seam would put it on a unit. */
const condition = (status: string, group: StatusGroup): Condition => ({
  status,
  group,
  intensity: 50,
  remaining: 2,
  source: "X",
  removable: [],
});
const effect = (over: Partial<MoveEffect>): MoveEffect => ({
  key: "outcome",
  type: "harm",
  recipient: "target",
  likelihood: "consistent",
  intensity: 60,
  mechanism: "impact",
  support: "harm",
  ...over,
});
const move = (over: Partial<Move>): Move => ({
  key: "test",
  name: "Test Move",
  signature: false,
  approach: "stationary",
  range: "short",
  preparation: "brief",
  recovery: "brief",
  effects: [effect({})],
  ...over,
});

describe("powerworks pass 4 presentation", () => {
  it("gives shock, tempo and senses a plain-language rule and an icon each", () => {
    const u = readCompanion(COMPANION_RECORDS.avilily, "A");
    expect(conditionRule(condition("stunned", "shock"), u)).toContain(
      "Loses its next opportunity"
    );
    expect(conditionRule(condition("stunned", "shock"), u)).toContain("charge");
    const slowed = conditionRule(condition("slowed", "tempo"), u);
    expect(slowed).toContain(`${Math.floor(u.speed / 2)} instead of ${u.speed}`);
    expect(conditionRule(condition("sedated", "tempo"), u)).toContain(
      "after every alert unit"
    );
    expect(conditionRule(condition("blinded", "senses"), u)).toContain(
      "contact attacks are unaffected"
    );
    expect(conditionRule(condition("disoriented", "senses"), u)).toContain(
      "random enemy"
    );
    for (const group of ["shock", "tempo", "senses"] as const) {
      const { container } = render(<GroupIcon group={group} />);
      expect(container.querySelector("svg"), group).toBeTruthy();
      cleanup();
    }
  });
  it("says who an area move reaches, on the card text and in the inspector sentence", () => {
    const u = readCompanion(COMPANION_RECORDS.hippochamp, "H");
    const sweep = move({
      name: "Water Sweep",
      area: { shape: "sweep", extent: "medium", anchor: "self" },
      effects: [effect({ recipient: "area" })],
    });
    expect(areaSummary(sweep)).toBe(
      "Reaches the target and the enemies either side of it. Each takes 60% of the harm."
    );
    expect(moveDescription(u, sweep)).toContain("Reaches the target and the enemies either side of it.");
    const burst = move({
      area: { shape: "radial", extent: "small", anchor: "self" },
      effects: [effect({ recipient: "area" })],
    });
    expect(areaSummary(burst)).toContain("the squadmates standing either side of the user");
    const field = move({
      area: { shape: "radial", extent: "medium", anchor: "location" },
      effects: [
        effect({
          type: "status",
          support: "status",
          status: "slowed",
          group: "tempo",
          recipient: "area",
          likelihood: "occasional",
          opportunities: 2,
          mechanism: undefined,
        }),
      ],
    });
    // A status-only field names its reach and says nothing about a harm share.
    expect(areaSummary(field)).toBe("Reaches the target and the enemies either side of it.");
    expect(moveDescription(u, field)).toContain("Slowed: acts at half speed");
    expect(areaSummary(move({}))).toBe("");
    // The real companion field reads the same way.
    const real = u.moves.find((m) => m.area);
    if (real) expect(moveDescription(u, real)).toContain("Reaches");
  });
  it("describes a helpful effect aimed past its user as landing on a squadmate, and a drain's heal as conditional", () => {
    const lash = move({
      name: "Reinforcing Lash",
      effects: [
        effect({}),
        effect({
          key: "condition",
          type: "status",
          support: "status",
          status: "reinforced",
          group: "guarding",
          mechanism: undefined,
        }),
      ],
    });
    // Pass 5 (decision 39): a guarding status aimed past its user names a squadmate.
    expect(effectSummary(lash.effects[1], lash)).toBe(
      "Reinforced on a squadmate: less damage taken."
    );
    const drain = move({
      effects: [
        effect({ key: "toll" }),
        effect({
          key: "gain",
          type: "restore",
          support: "restore",
          recipient: "self",
          requires: "toll",
          mechanism: undefined,
        }),
      ],
    });
    expect(effectSummary(drain.effects[1], drain)).toBe(
      "Recovers health, only when its harm lands."
    );
  });
  it("puts a squadmate warning on the card of a burst anchored on its user, and only there", () => {
    const u = readCompanion(COMPANION_RECORDS.hippochamp, "H");
    const burst = move({
      name: "Water Burst",
      area: { shape: "radial", extent: "small", anchor: "self" },
      effects: [effect({ recipient: "area" })],
    });
    const sweep = move({
      name: "Water Sweep",
      area: { shape: "sweep", extent: "small", anchor: "self" },
      effects: [effect({ recipient: "area" })],
    });
    const card = (m: Move) =>
      render(
        <MoveCardContent unit={u} move={m} cooldown={0} selected={false} blocked={false} id="x" />
      ).container.textContent;
    expect(card(burst)).toContain("Hits squadmates");
    cleanup();
    expect(card(sweep)).not.toContain("Hits squadmates");
  });
});

describe("Powerworks reach and approach are separate words (pass 6)", () => {
  const u = readCompanion(COMPANION_RECORDS.graviclaw, "G");
  const move = (range: Move["range"], approach: Move["approach"]): Move => ({
    key: "test",
    name: "Test Buffet",
    signature: false,
    approach,
    range,
    preparation: "brief",
    recovery: "repeatable",
    effects: [
      { key: "outcome", type: "harm", recipient: "target", likelihood: "consistent", intensity: 50, mechanism: "impact", support: "harm" },
    ],
  });
  it("names contact reach melee and everything else ranged, and adds closes in for a closing approach", () => {
    expect(moveDescription(u, move("contact", "stationary"))).toMatch(/^Melee attack\./);
    expect(moveDescription(u, move("contact", "closing"))).toMatch(/^Melee attack that closes in\./);
    expect(moveDescription(u, move("medium", "stationary"))).toMatch(/^Ranged attack\./);
    expect(moveDescription(u, move("short", "closing"))).toMatch(/^Ranged attack that closes in\./);
    expect(melee(move("contact", "stationary"))).toBe(true);
    expect(closes(move("contact", "stationary"))).toBe(false);
  });
  it("draws the icon by reach: swords for contact, crosshair otherwise", () => {
    const icon = (m: Move) => render(<MoveIcon move={m} />).container.innerHTML;
    const contact = icon(move("contact", "stationary"));
    cleanup();
    const closing = icon(move("contact", "closing"));
    cleanup();
    const ranged = icon(move("medium", "stationary"));
    expect(contact).toBe(closing);
    expect(contact).not.toBe(ranged);
  });
  it("keeps the binding rule on approach, in plain words", () => {
    const rule = conditionRule(
      { status: "paralyzed", group: "binding", intensity: 50, remaining: 1, source: "B4", removable: [] },
      u
    );
    expect(rule).toMatch(/Moves that close in on a target are blocked/);
  });
});
