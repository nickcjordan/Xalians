import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  COMPANION_RECORDS,
  COOLDOWN_ROUNDS,
  createRun,
  command,
  draftOffer,
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
  moveFigure,
  actsOnSelf,
  cardReading,
  Health,
  kindWords,
  REMOVAL_WORDS,
  remainingLabel,
  restLine,
} from "./powerworksVisuals";
import { ringIndices, slotName, slotState } from "./powerworksRadial";
import { fitZoom } from "./powerworksStage";
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
    expect(moveDescription(u, field)).toContain("40% chance: Slowed, half speed for 2 opportunities.");
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
      "Reinforced on a squadmate, less damage taken."
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

describe("Powerworks radial orders: the numbers and words a slot shows", () => {
  const graviclaw = readCompanion(COMPANION_RECORDS.graviclaw, "G");
  it("reads the one number a card or slot shows, and says what it counts", () => {
    const strike = graviclaw.moves.find((m) => m.name === "Gravity Pincer")!;
    const pincer = moveFigure(graviclaw, strike);
    expect(pincer.kind).toBe("power");
    expect(pincer.label).toBe(`power ${pincer.value}`);
    const bind = move({
      effects: [effect({ type: "status", support: "bind", mechanism: undefined })],
    });
    expect(moveFigure(graviclaw, bind)).toMatchObject({ value: "1", label: "binds 1 action" });
    const shield = move({
      effects: [effect({ type: "protect", support: "protect", mechanism: undefined })],
    });
    expect(moveFigure(graviclaw, shield)).toMatchObject({ value: "½", label: "halves damage" });
  });
  it("knows a move that only acts on its user, which takes no target choice", () => {
    const anchor = graviclaw.moves.find((m) => m.name === "Ground Anchor")!;
    expect(actsOnSelf(anchor)).toBe(true);
    expect(actsOnSelf(graviclaw.moves.find((m) => m.name === "Gravity Pincer")!)).toBe(false);
  });
  it("prints an unavailable slot's reason in short form and names every slot plainly", () => {
    const u = readCompanion(COMPANION_RECORDS.graviclaw, "G");
    const pincer = u.moves.findIndex((m) => m.name === "Gravity Pincer");
    const slash = u.moves.findIndex((m) => m.name === "Slashing Pinch");
    expect(slotState(u, u.moves[pincer], pincer, true)).toMatchObject({ short: "ready", dim: false });
    u.cooldowns[pincer] = 2;
    expect(slotState(u, u.moves[pincer], pincer, false)).toMatchObject({ short: "cooling 2", dim: true });
    u.cooldowns[pincer] = 0;
    u.signatureSpent = true;
    expect(slotState(u, u.moves[pincer], pincer, false).short).toBe("spent");
    u.bound = 1;
    expect(slotState(u, u.moves[slash], slash, false).short).toBe("bound");
    expect(slotName(u, u.moves[slash], "bound")).toMatch(
      /^Graviclaw: Slashing Pinch, power \d+, bound$/
    );
    // The fallback joins the ring only when it is the one choice left.
    expect(ringIndices(u, [0, 1, 2, 3])).toEqual([0, 1, 2, 3]);
    expect(ringIndices(u, [-1])).toEqual([0, 1, 2, 3, -1]);
  });
});

describe("Powerworks radial orders: a move with no power", () => {
  it("shows its own icon and no number on the inspector card", () => {
    const u = readCompanion(COMPANION_RECORDS.graviclaw, "G");
    const anchor = u.moves.find((m) => m.name === "Ground Anchor")!;
    expect(moveFigure(u, anchor)).toMatchObject({ value: null, kind: "none" });
    const { container } = render(
      <MoveCardContent unit={u} move={anchor} cooldown={0} selected={false} blocked={false} id="x" />
    );
    const figure = container.querySelector(".pw-card-effect")!;
    expect(figure.querySelector("b")).toBeNull();
    expect(figure.querySelector("svg")).not.toBeNull();
    expect(figure.textContent).not.toContain("0");
  });
  it("gives the move card one plain line per thing a move does, the removal in plain words", () => {
    const u = readCompanion(COMPANION_RECORDS.hippochamp, "H");
    const cannon = u.moves.find((m) => m.name === "Emergency Water Cannon")!;
    expect(cardReading(u, cannon)).toEqual(["Ranged attack.", "Cools: ends Overheated and Burning."]);
    const sweep = u.moves.find((m) => m.name === "Water Sweep")!;
    expect(cardReading(u, sweep)).toEqual([
      "Melee attack. Reaches the target and the next enemy in line.",
      "75% chance: Slowed, half speed for 2 opportunities.",
    ]);
  });
});

describe("Powerworks radial orders round 2: the card's words, the bar's preview, the camera", () => {
  it("says in words how long a move rests after use", () => {
    const u = readCompanion(COMPANION_RECORDS.hippochamp, "H");
    const sweep = u.moves.find((m) => m.name === "Water Sweep")!;
    const cannon = u.moves.find((m) => m.name === "Emergency Water Cannon")!;
    const kick = u.moves.find((m) => m.name === "Crushing Kick")!;
    expect(restLine(sweep)).toBe("Use every round");
    expect(remainingLabel({ status: "slowed", group: "tempo", intensity: 50, remaining: 1, source: "X", removable: [] })).toBe("1 opportunity");
    expect(remainingLabel({ status: "slowed", group: "tempo", intensity: 50, remaining: 2, source: "X", removable: [] })).toBe("2 opportunities");
    expect(restLine(cannon)).toBe("Rests 1 round after use · once per encounter");
    expect(restLine(kick)).toBe(`Rests ${COOLDOWN_ROUNDS.prolonged} rounds after use`);
  });
  it("draws a preview on the health bar: the chunk, a heal's extension, and the number beside the bar", () => {
    const u = readCompanion(COMPANION_RECORDS.crystorn, "C");
    u.hp = 40;
    const none = {
      damage: 0,
      heal: 0,
      knockout: false,
      guarded: false,
      immune: false,
      danger: false,
      muted: false,
    };
    const { container, rerender } = render(<Health u={u} preview={{ ...none, damage: 10, guarded: true }} />);
    const chunk = container.querySelector<HTMLElement>(".pw-hp-chunk")!;
    expect(chunk.style.left).toBe(`${(30 / u.max) * 100}%`);
    expect(chunk.style.width).toBe(`${(10 / u.max) * 100}%`);
    expect(container.querySelector(".pw-hp-delta")).toHaveTextContent("−10");
    // A guard shrank it: the shield rides with the number.
    expect(container.querySelector(".pw-hp-delta svg")).not.toBeNull();
    // The number floats over its chunk on the bar; the health figure stays beside the bar.
    expect(container.querySelector<HTMLElement>(".pw-health-bar > .pw-hp-delta")!.style.left).toBe(
      `${(30 / u.max) * 100 + (10 / u.max) * 50}%`
    );
    expect(container.querySelector(".pw-hp-label")).toHaveTextContent("40");
    rerender(<Health u={u} preview={{ ...none, heal: 12 }} />);
    const heal = container.querySelector<HTMLElement>(".pw-hp-heal")!;
    expect(heal.style.left).toBe(`${(40 / u.max) * 100}%`);
    expect(container.querySelector(".pw-hp-delta.heal")).toHaveTextContent("+12");
    rerender(<Health u={u} preview={{ ...none, damage: 55, knockout: true }} />);
    expect(container.querySelector<HTMLElement>(".pw-hp-chunk.knockout")!.style.left).toBe("0%");
    expect(container.querySelector(".pw-hp-delta.knockout")).toHaveTextContent("−55");
    rerender(<Health u={u} preview={{ ...none, immune: true }} />);
    expect(container.querySelector(".pw-hp-delta.immune")).toHaveTextContent("no effect");
    // With no preview the bar reads as it always has.
    rerender(<Health u={u} />);
    expect(container.querySelector(".pw-hp-label")).toHaveTextContent(`40 / ${u.max}`);
    expect(container.querySelector(".pw-hp-chunk, .pw-hp-heal, .pw-hp-delta")).toBeNull();
  });
  it("tells a charging companion's other discs why they wait", () => {
    const u = readCompanion(COMPANION_RECORDS.hippochamp, "H");
    const kick = u.moves.findIndex((m) => m.name === "Crushing Kick");
    const sweep = u.moves.findIndex((m) => m.name === "Water Sweep");
    u.charge = "M1";
    u.chargeMove = kick;
    expect(slotState(u, u.moves[sweep], sweep, false)).toMatchObject({ short: "charging", dim: true });
  });
  it("leans the camera in to its full step, panning toward the companion only as far as keeps every box inside", () => {
    const inside = (z: { s: number; tx: number; ty: number }, boxes: { left: number; top: number; right: number; bottom: number }[]) =>
      boxes.every(
        (b) =>
          z.tx + z.s * b.left >= 6 - 1e-6 &&
          z.ty + z.s * b.top >= 6 - 1e-6 &&
          z.tx + z.s * b.right <= 1000 - 6 + 1e-6 &&
          z.ty + z.s * b.bottom <= 450 - 6 + 1e-6
      );
    // Room to spare: the full step, with the companion's feet fixed.
    const middle = { left: 450, top: 250, right: 550, bottom: 350 };
    const roomy = [{ left: 200, top: 60, right: 800, bottom: 400 }, middle];
    const z = fitZoom(middle, roomy, 1000, 450, 1.06, 6);
    expect(z.s).toBe(1.06);
    expect(z.tx + z.s * 500).toBeCloseTo(500, 5);
    expect(z.ty + z.s * 350).toBeCloseTo(350, 5);
    expect(inside(z, roomy)).toBe(true);
    // A companion near the edge: the full step still, and the camera pans instead of
    // pushing the edge plaque out of the frame.
    const edge = { left: 8, top: 250, right: 108, bottom: 350 };
    const tight = [{ left: 8, top: 60, right: 900, bottom: 400 }, edge];
    const e = fitZoom(edge, tight, 1000, 450, 1.06, 6);
    expect(e.s).toBe(1.06);
    expect(inside(e, tight)).toBe(true);
    expect(e.tx + e.s * 58).not.toBeCloseTo(58, 1);
    // Boxes that already fill the stage leave no room: no zoom at all.
    expect(fitZoom(edge, [{ left: 0, top: 0, right: 1000, bottom: 20 }], 1000, 450, 1.06, 6)).toEqual({ s: 1, tx: 0, ty: 0 });
  });
  it("names every removal in plain words, and the words cover every status the records let each method end", () => {
    const seen: Record<string, Set<string>> = {};
    const read = (u: Unit) => {
      for (const m of u.moves)
        for (const e of m.effects)
          for (const r of e.removable ?? []) (seen[r] ??= new Set()).add(e.status ?? "");
    };
    let s = createRun(1);
    for (let i = 0; i < 4; i++) {
      [...s.team, ...s.enemies].forEach(read);
      if (i < 3) {
        s.phase = "camp";
        s = command(s, { kind: "advance" });
      }
    }
    for (let seed = 1; seed <= 20; seed++) draftOffer(seed).forEach((e) => read(e.unit));
    for (const [method, statuses] of Object.entries(seen))
      for (const status of statuses)
        expect(REMOVAL_WORDS[method as keyof typeof REMOVAL_WORDS].ends, `${method} ends ${status}`).toContain(status);
  });
  it("calls a move that only helps a touch or at range, never an attack", () => {
    const touch = move({ range: "contact", effects: [effect({ type: "restore", support: "restore", mechanism: undefined })] });
    const far = move({ range: "medium", effects: [effect({ type: "protect", support: "protect", mechanism: undefined })] });
    expect(kindWords(touch)).toBe("Touch");
    expect(kindWords(far)).toBe("At range");
    expect(kindWords(move({ range: "contact", approach: "closing" }))).toBe("Melee attack that closes in");
  });
});
