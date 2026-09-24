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
import {
  CHARGE_LINE,
  cardMarks,
  elementOf,
  restRounds,
  restTip,
  ringIndices,
  slotName,
  slotState,
} from "./powerworksRadial";
import { CAMERA, IDENTITY, beatZoom } from "./powerworksStage";
import { MatchupMark, StatusBadges } from "./powerworksVisuals";
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
    // An elemental move says its element in its name, as its disc wears it (round 3).
    const crystorn = readCompanion(COMPANION_RECORDS.crystorn, "C");
    const radiance = crystorn.moves.find((m) => m.name === "Gem Radiance")!;
    expect(slotName(crystorn, radiance, "ready")).toMatch(
      /^Crystorn: Gem Radiance, signature, light, power \d+, ready$/
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
    // The number sits on a solid tag whose right edge meets the chunk (round 3 review), so no
    // hatching lies under the text; the health figure stays beside the bar.
    const tag = container.querySelector<HTMLElement>(".pw-health-bar > .pw-hp-delta")!;
    expect(tag).toHaveClass("at-end");
    expect(tag.style.right).toBe(`${100 - (30 / u.max) * 100}%`);
    expect(tag.style.left).toBe("");
    expect(container.querySelector(".pw-hp-label")).toHaveTextContent("40");
    rerender(<Health u={u} preview={{ ...none, heal: 12 }} />);
    const heal = container.querySelector<HTMLElement>(".pw-hp-heal")!;
    expect(heal.style.left).toBe(`${(40 / u.max) * 100}%`);
    expect(container.querySelector(".pw-hp-delta.heal")).toHaveTextContent("+12");
    rerender(<Health u={u} preview={{ ...none, damage: 55, knockout: true }} />);
    expect(container.querySelector<HTMLElement>(".pw-hp-chunk.knockout")!.style.left).toBe("0%");
    // Near the bar's start the tag hangs the other way, over the chunk.
    expect(container.querySelector(".pw-hp-delta")).toHaveClass("at-start");
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
  it("pushes the playback camera in on a beat, panning toward the actor and its target only as far as keeps every box inside", () => {
    const inside = (z: { s: number; tx: number; ty: number }, boxes: { left: number; top: number; right: number; bottom: number }[], margin = 6) =>
      boxes.every(
        (b) =>
          z.tx + z.s * b.left >= margin - 1e-6 &&
          z.ty + z.s * b.top >= margin - 1e-6 &&
          z.tx + z.s * b.right <= 1000 - margin + 1e-6 &&
          z.ty + z.s * b.bottom <= 450 - margin + 1e-6
      );
    // Room to spare: the full push, and the pan brings the pair toward the center.
    const actor = { left: 120, top: 250, right: 220, bottom: 350 };
    const target = { left: 300, top: 60, right: 400, bottom: 160 };
    const roomy = [{ left: 100, top: 60, right: 800, bottom: 400 }];
    const z = beatZoom([actor, target], roomy, 1000, 450, CAMERA.push, 6);
    expect(z.s).toBe(1.06);
    expect(inside(z, [...roomy, actor, target])).toBe(true);
    // The midpoint of the pair (260, 205) moves toward the stage center (500, 225).
    const mid = { x: z.tx + z.s * 260, y: z.ty + z.s * 205 };
    expect(Math.abs(mid.x - 500)).toBeLessThan(Math.abs(260 - 500));
    // Whole pixels: the pushed layer never stands on a half pixel.
    expect(Number.isInteger(z.tx) && Number.isInteger(z.ty)).toBe(true);
    // No room at all: the camera stays put. No focus: the camera stays put.
    expect(beatZoom([actor], [{ left: 0, top: 0, right: 1000, bottom: 20 }], 1000, 450, CAMERA.push, 6)).toEqual(IDENTITY);
    expect(beatZoom([], roomy, 1000, 450, CAMERA.push, 6)).toEqual(IDENTITY);
    // A row that spans the stage leaves the full push no pan: the camera pushes less, and the
    // action still comes toward the centre by its lead (round 3 review).
    const wide = [{ left: 60, top: 60, right: 940, bottom: 400 }];
    const right = { left: 700, top: 250, right: 800, bottom: 350 };
    const far = { left: 760, top: 60, right: 860, bottom: 160 };
    const w = beatZoom([right, far], wide, 1000, 450, CAMERA.push, 6);
    expect(w.s).toBeGreaterThan(1);
    expect(w.s).toBeLessThan(1.06);
    expect(inside(w, [...wide, right, far])).toBe(true);
    const was = (750 + 810) / 2;
    expect(was - (w.tx + w.s * was)).toBeGreaterThanOrEqual(CAMERA.lead - 0.5);
    // A row nearly edge to edge allows no push that brings the action in by its lead: the
    // camera takes a small push that never carries the action away from the centre.
    const full = [{ left: 20, top: 60, right: 980, bottom: 400 }];
    const pan = beatZoom([right, far], full, 1000, 450, CAMERA.push, 6);
    expect(pan.s).toBeLessThan(1.02);
    expect(inside(pan, full)).toBe(true);
    expect(was - (pan.tx + pan.s * was)).toBeGreaterThanOrEqual(0);
    // Edge to edge: no push fits at all, and the camera only pans, toward the centre.
    const edge = [{ left: 6, top: 60, right: 994, bottom: 400 }, { left: 0, top: 60, right: 990, bottom: 400 }];
    const only = beatZoom([right, far], edge, 1000, 450, CAMERA.push, 6);
    expect(only.s).toBe(1);
    expect(only.tx).toBeLessThanOrEqual(0);
    // An action banner holding the floor: every box stays above it.
    const banned = beatZoom([actor, target], roomy, 1000, 450, CAMERA.push, 6, 380);
    expect(roomy.every((b) => banned.ty + banned.s * b.bottom <= 380 - 6 + 1e-6)).toBe(true);
    // The push and the return each last 250 to 350 ms.
    for (const ms of [CAMERA.pushMs, CAMERA.returnMs]) {
      expect(ms).toBeGreaterThanOrEqual(250);
      expect(ms).toBeLessThanOrEqual(350);
    }
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

describe("Powerworks radial orders round 3: element on the move, every mark earns its place", () => {
  const hippo = readCompanion(COMPANION_RECORDS.hippochamp, "H");
  const crystorn = readCompanion(COMPANION_RECORDS.crystorn, "C");
  const named = (u: Unit, name: string) => u.moves.find((m) => m.name === name)!;
  it("knows which moves wear an element and how long each rests", () => {
    expect(elementOf(named(hippo, "Emergency Water Cannon"))).toBe("water");
    expect(elementOf(named(hippo, "Water Sweep"))).toBe("water");
    expect(elementOf(named(hippo, "Repelling Slam"))).toBeNull();
    expect(restRounds(named(hippo, "Crushing Kick"))).toBe(COOLDOWN_ROUNDS.prolonged);
    expect(restRounds(named(hippo, "Water Sweep"))).toBe(0);
    expect(restTip(2)).toBe("Unavailable for 2 rounds after use.");
    expect(restTip(1)).toBe("Unavailable for 1 round after use.");
    expect(CHARGE_LINE).toBe("Lands next round");
  });
  it("draws a charged strike as a strike: the charge is its own mark, not the move's icon", () => {
    const kick = named(hippo, "Crushing Kick");
    const { container } = render(<MoveIcon move={kick} />);
    expect(container.querySelector("svg")).toHaveClass("lucide-swords");
  });
  it("reads a move's effects as a row of short marks, each with its full sentence for a tooltip", () => {
    const words = (u: Unit, name: string) => cardMarks(u, named(u, name)).map((m) => m.text);
    // An elemental strike names its element; its status carries its chance.
    expect(words(crystorn, "Blinding Shot")).toEqual(["Light", "Blinded 40%"]);
    const shot = cardMarks(crystorn, named(crystorn, "Blinding Shot"));
    expect(shot[0].tip).toMatch(/matchup against each target shows as a chevron/);
    expect(shot[1].tip).toBe("40% chance: Blinded, its ranged damage halved for 2 opportunities.");
    // A physical strike says what sets its matchup: its creature's own element.
    const kick = cardMarks(hippo, named(hippo, "Crushing Kick"));
    expect(kick.map((m) => m.text)).toEqual(["Harm"]);
    expect(kick[0].tip).toMatch(/matched by Hippochamp's own water element/);
    // A pull, and the signature's once-per-encounter rule as an icon with its tooltip.
    expect(words(hippo, "Repelling Slam")).toEqual(["Pull"]);
    const cannon = cardMarks(hippo, named(hippo, "Emergency Water Cannon"));
    expect(cannon.map((m) => m.text)).toEqual(["Water", "Cools", ""]);
    expect(cannon[2].tip).toBe("Signature: usable once per encounter.");
    // No power figure, reach or area sentence survives on a mark.
    for (const m of [...shot, ...kick, ...cannon]) expect(m.text).not.toMatch(/power|melee|ranged|reaches/i);
  });
  it("puts a matchup chevron beside the health bar: up when strong, down when weak, none when even", () => {
    const u = readCompanion(COMPANION_RECORDS.crystorn, "C");
    const none = { damage: 5, heal: 0, knockout: false, guarded: false, immune: false, danger: false, muted: false };
    // A filled triangle with no box (round 3 review), its matchup in words on the tooltip.
    const { container, rerender } = render(
      <Health u={u} preview={{ ...none, matchup: 1.5, matchupText: "Strong: water against sand" }} />
    );
    const up = container.querySelector(".pw-matchup.strong")!;
    expect(up.querySelectorAll("polygon")).toHaveLength(1);
    expect(up).toHaveAttribute("title", "Strong: water against sand");
    rerender(<Health u={u} preview={{ ...none, matchup: 2 }} />);
    expect(container.querySelectorAll(".pw-matchup.strong.double polygon")).toHaveLength(2);
    rerender(<Health u={u} preview={{ ...none, matchup: 0.5, matchupText: "Weak: light against sand" }} />);
    expect(container.querySelectorAll(".pw-matchup.weak polygon")).toHaveLength(1);
    expect(container.querySelector(".pw-matchup.weak")).toHaveAttribute("title", "Weak: light against sand");
    rerender(<Health u={u} preview={{ ...none, matchup: 1 }} />);
    expect(container.querySelector(".pw-matchup")).toBeNull();
    // Faint (a hovered disc): the chunk shows, its number does not.
    rerender(<Health u={u} preview={{ ...none, matchup: 1.5, faint: true }} />);
    expect(container.querySelector(".pw-health.faint .pw-hp-chunk")).not.toBeNull();
    expect(container.querySelector(".pw-hp-delta")).toBeNull();
    expect(container.querySelector(".pw-matchup.strong")).not.toBeNull();
    expect(render(<MatchupMark factor={0} />).container.innerHTML).toBe("");
  });
  it("prints a bare count on a stage badge and keeps the words on its tooltip and text", () => {
    const u = readCompanion(COMPANION_RECORDS.crystorn, "C");
    u.conditions = [{ status: "slowed", group: "tempo", intensity: 50, remaining: 2, source: "X", removable: [] }];
    const { container } = render(<StatusBadges u={u} compact />);
    const badge = container.querySelector(".pw-status-badge")!;
    expect(badge.querySelector("small")).toHaveTextContent(/^2$/);
    expect(badge).toHaveTextContent("2 opportunities");
    expect(badge.getAttribute("title")).toMatch(/^2 opportunities left\. /);
  });
});
