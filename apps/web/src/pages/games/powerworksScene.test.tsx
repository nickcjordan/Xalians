import React from "react";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRun, type Frame } from "@xalians/rules/dungeon";
import {
  PowerworksScene,
  chipText,
  type OrderChip,
  type UnitPreview,
} from "./powerworksScene";

/** A preview as the page builds it, with only the fields a test cares about set. */
const preview = (over: Partial<UnitPreview>): UnitPreview => ({
  role: "target",
  damage: 0,
  heal: 0,
  knockout: false,
  guarded: false,
  immune: false,
  danger: false,
  muted: false,
  pull: false,
  statuses: [],
  notes: [],
  words: "",
  line: "",
  ...over,
});

afterEach(cleanup);

function scene(
  frame?: Frame,
  overrides: Partial<React.ComponentProps<typeof PowerworksScene>> = {}
) {
  const run = createRun(1);
  const onInspect = vi.fn();
  const props = {
    team: frame?.team || run.team,
    enemies: frame?.enemies || run.enemies,
    frame,
    frameIndex: 1,
    room: 0,
    active: run.team[0],
    move: null,
    plans: {},
    planning: !frame,
    impact: true,
    paused: true,
    speed: 1,
    reducedMotion: true,
    labelFor: (u: { name: string }) => u.name,
    onTarget: vi.fn(),
    onSelect: vi.fn(),
    onInspect,
    onHover: vi.fn(),
  };
  const view = render(<PowerworksScene {...props} {...overrides} />);
  return { run, onInspect, container: view.container };
}

describe("shared battlefield", () => {
  it("links each queued attacker to its target and lets that order be edited", () => {
    const run = createRun(1);
    const onOpen = vi.fn();
    const unit = run.team[0];
    const target = run.enemies[0];
    const { container } = scene(undefined, {
      plans: { [unit.id]: { move: 0, target: target.id } },
      onOpen,
    });
    // Round 2 review: who aims at a unit shows only while that unit is hovered, named.
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
    fireEvent.mouseEnter(container.querySelector(`[data-unit="${target.id}"]`)!);
    expect(screen.getByRole("group", { name: `Targeted by ${unit.name}` })).toHaveTextContent(
      `Targeted by ${unit.name}`
    );
    const edit = screen.getByRole("button", {
      name: `Edit ${unit.name}'s order targeting ${target.name}`,
    });
    expect(edit.closest(".pw-scene-unit")).toHaveClass("defender");
    fireEvent.click(edit);
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: unit.id }),
      true
    );
  });

  it("carries each companion's order on a chip under its health, and the chip reopens its ring", () => {
    const run = createRun(1);
    const [performer, other] = run.team;
    const target = run.enemies[1];
    const onOpen = vi.fn();
    const chips: Record<string, OrderChip> = {
      [performer.id]: { move: performer.moves[0], target: "Crawler 2" },
      [other.id]: { move: null, target: null, empty: "No order" },
    };
    const { container } = scene(undefined, {
      plans: { [performer.id]: { move: 0, target: target.id } },
      chips,
      onOpen,
    });
    const plaque = container.querySelector(`[data-unit="${performer.id}"] .pw-unit-plaque`)!;
    const chip = plaque.querySelector(".pw-order-chip")!;
    // The chip sits under the health bar and names the move and the target.
    expect(plaque.querySelector(".pw-health")!.nextElementSibling).toBe(chip);
    expect(chip).toHaveTextContent(performer.moves[0].name.split(" (")[0]);
    expect(chip).toHaveTextContent("Crawler 2");
    expect(
      screen.getByRole("button", { name: `Select ${performer.name}` })
    ).toHaveAccessibleDescription(chipText(chips[performer.id]));
    fireEvent.click(chip);
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: performer.id }),
      true
    );
    // No order reads quietly.
    expect(
      container.querySelector(`[data-unit="${other.id}"] .pw-order-chip`)
    ).toHaveClass("empty");
    // The intent line runs from the companion to its target while planning.
    expect(container.querySelector(`[data-intent="${performer.id}"]`)).not.toBeNull();
    expect(container.querySelectorAll(".pw-queued-path")).toHaveLength(1);
  });

  it("makes the figure and its plaque one selection control, marks the open companion, and backs out on empty stage", () => {
    const run = createRun(1);
    const [first, second] = run.team;
    const onSelect = vi.fn();
    const onBack = vi.fn();
    const { container } = scene(undefined, {
      active: first,
      openId: first.id,
      onSelect,
      onBack,
      ring: <div className="pw-radial" data-testid="ring" />,
    });
    const figure = screen.getByRole("button", { name: `Select ${first.name}` });
    expect(figure).toHaveAttribute("aria-haspopup", "menu");
    expect(figure).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: `Select ${second.name}` })
    ).toHaveAttribute("aria-expanded", "false");
    // The selected companion stands on a ground ring; the ring the page passes is drawn on stage.
    expect(container.querySelector(`[data-unit="${first.id}"] .pw-ground-ring`)).not.toBeNull();
    expect(container.querySelector(`[data-unit="${second.id}"] .pw-ground-ring`)).toBeNull();
    expect(screen.getByTestId("ring").closest(".pw-theater")).not.toBeNull();
    // A click on the plaque selects, as the figure does; the plaque's info button inspects.
    fireEvent.click(
      container.querySelector(`[data-unit="${second.id}"] .pw-unit-plaque strong`)!
    );
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: second.id }),
      false
    );
    fireEvent.click(screen.getByRole("region", { name: "Battlefield" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("makes a legal squadmate a target with its own label and preview, and leaves the rest selectable", () => {
    const run = createRun(1);
    const [performer, mate, other] = run.team;
    const onTarget = vi.fn();
    mate.hp -= 20;
    scene(undefined, {
      team: run.team,
      enemies: run.enemies,
      active: performer,
      move: performer.moves[0],
      targetIds: [run.enemies[0].id, mate.id],
      previews: {
        [run.enemies[0].id]: preview({ damage: 7, words: "7 damage, 22 to 15" }),
        [mate.id]: preview({ heal: 9, words: `heals 9, ${mate.hp} to ${mate.hp + 9}` }),
      },
      onTarget,
    });
    // The target's name carries the preview in words (round 2).
    const target = screen.getByRole("button", {
      name: `Target ${mate.name} (squadmate): heals 9, ${mate.hp} to ${mate.hp + 9}`,
    });
    expect(target).toHaveClass("valid-target");
    // On the creature: the heal extends the health bar, and its number rides the bar.
    const plaque = document.querySelector(`[data-unit="${mate.id}"] .pw-unit-plaque`)!;
    expect(plaque.querySelector(".pw-hp-heal")).not.toBeNull();
    expect(plaque.querySelector(".pw-hp-delta")).toHaveTextContent("+9");
    fireEvent.click(target);
    expect(onTarget).toHaveBeenCalledWith(mate.id, true);
    // A squadmate the move cannot name stays a selection button, and an enemy the move
    // cannot name is not pressable.
    expect(
      screen.getByRole("button", { name: `Select ${other.name}` })
    ).toBeEnabled();
    expect(
      screen.getByRole("button", {
        name: `Target ${run.enemies[1].name} ${run.enemies[1].id}`,
      })
    ).toBeDisabled();
    // Units the move can neither name nor reach fade down; the companion choosing never does.
    expect(document.querySelector(`[data-unit="${other.id}"]`)).toHaveClass("ineligible");
    expect(document.querySelector(`[data-unit="${run.enemies[1].id}"]`)).toHaveClass("ineligible");
    expect(document.querySelector(`[data-unit="${performer.id}"]`)).not.toHaveClass("ineligible");
    // The text-label previews of round 1 are gone.
    expect(document.querySelector(".pw-scene-preview, .pw-scene-reticle")).toBeNull();
  });

  it("draws each preview on the creature: rings, chunks, a knockout skull, guards, status ghosts, pulls, the area in the danger color", () => {
    const run = createRun(1);
    const [performer, mate] = run.team;
    const [first, second] = run.enemies;
    const { container } = scene(undefined, {
      active: performer,
      move: performer.moves[0],
      targetIds: [first.id, second.id],
      targetId: first.id,
      previews: {
        [first.id]: preview({
          damage: first.hp + 5,
          knockout: true,
          pull: true,
          statuses: [{ status: "slowed", group: "tempo", chance: 75, immune: false }],
          words: "27 damage, 22 to 0, knocks out",
        }),
        [second.id]: preview({
          role: "reached",
          damage: 3,
          guarded: true,
          muted: true,
          statuses: [{ status: "frightened", group: "attention", chance: 40, immune: true }],
          words: "3 damage, 22 to 19, guarded",
        }),
        [mate.id]: preview({ role: "reached", damage: 4, danger: true, words: "4 damage" }),
      },
    });
    const one = container.querySelector(`[data-unit="${first.id}"]`)!;
    // The aimed target rises on a bright ring; a knockout fills the rest of its bar and
    // shows a skull beside the move's own damage.
    expect(one).toHaveClass("targetable", "aimed");
    expect(one.querySelector(".pw-target-ring:not(.area)")).not.toBeNull();
    const chunk = one.querySelector<HTMLElement>(".pw-hp-chunk")!;
    expect(chunk).toHaveClass("knockout");
    expect(chunk.style.left).toBe("0%");
    expect(chunk.style.width).toBe("100%");
    expect(one.querySelector(".pw-hp-delta.knockout")).toHaveTextContent(`−${first.hp + 5}`);
    expect(one.querySelector(".pw-hp-delta svg")).not.toBeNull();
    expect(one.querySelector(".pw-pull-arrow")).not.toBeNull();
    expect(one.querySelector(".pw-status-badge.ghost.group-tempo")).toHaveTextContent("slowed75%");
    // A unit only the area reaches: a dashed ring, its own chunk, a guard's shield; a status
    // it is immune to says so; and while another target is aimed it steps back.
    const two = container.querySelector(`[data-unit="${second.id}"]`)!;
    expect(two).toHaveClass("reached", "muted");
    expect(two.querySelector(".pw-target-ring.area")).not.toBeNull();
    expect(two.querySelector(".pw-hp-delta")).toHaveTextContent("−3");
    expect(two.querySelector(".pw-status-badge.ghost.immune")).toHaveTextContent("frightenedimmune");
    // A squadmate the area reaches is marked in the danger color, not dimmed.
    const ally = container.querySelector(`[data-unit="${mate.id}"]`)!;
    expect(ally).toHaveClass("reached", "danger");
    expect(ally).not.toHaveClass("ineligible");
    expect(ally.querySelector(".pw-target-ring.area.danger")).not.toBeNull();
    expect(ally.querySelector(".pw-health.danger .pw-hp-chunk")).not.toBeNull();
    // The intent line runs from the companion to the aimed target.
    expect(container.querySelector(`.pw-aim-path[data-aim="${first.id}"]`)).not.toBeNull();
    // The number floats over its chunk on the bar, not in a box after it.
    expect(one.querySelector(".pw-health-bar > .pw-hp-delta")).not.toBeNull();
    expect(one.querySelector(".pw-hp-label")).toHaveTextContent(String(first.hp));
    // A move that harms but gets nothing through says "no effect" on the bar.
    cleanup();
    scene(undefined, {
      active: performer,
      move: performer.moves[0],
      targetIds: [first.id],
      previews: { [first.id]: preview({ immune: true, words: "no effect" }) },
    });
    expect(document.querySelector(`[data-unit="${first.id}"] .pw-hp-delta.immune`)).toHaveTextContent("no effect");
    expect(document.querySelector(`[data-unit="${first.id}"] .pw-hp-chunk`)).toBeNull();
  });

  it("dims a squadmate the move can do nothing for, like a non-target, and keeps its reason in words", () => {
    const run = createRun(1);
    const [performer, mate] = run.team;
    scene(undefined, {
      team: run.team,
      enemies: run.enemies,
      active: performer,
      move: performer.moves[0],
      targetIds: [run.enemies[0].id, mate.id],
      previews: {
        [run.enemies[0].id]: preview({ damage: 5, words: "5 damage, 22 to 17" }),
        [mate.id]: preview({ idle: true, words: "nothing to clear" }),
      },
    });
    const unit = document.querySelector(`[data-unit="${mate.id}"]`)!;
    expect(unit).toHaveClass("ineligible");
    expect(unit.querySelector(".pw-target-ring, .pw-status-badge.ghost, .pw-hp-delta")).toBeNull();
    expect(
      screen.getByRole("button", { name: `Target ${mate.name} (squadmate): nothing to clear` })
    ).toBeEnabled();
  });

  it("stands the room and the units in the camera layer and leaves the wheel outside it; reduced motion sets no transition", () => {
    const run = createRun(1);
    const { container } = scene(undefined, {
      active: run.team[0],
      reducedMotion: false,
      ring: <div className="pw-radial" data-testid="ring" />,
    });
    const layer = container.querySelector<HTMLElement>(".pw-stage-zoom")!;
    expect(layer.querySelectorAll("[data-unit]")).toHaveLength(run.team.length + run.enemies.length);
    expect(layer.querySelector(".pw-environment")).not.toBeNull();
    expect(layer.contains(screen.getByTestId("ring"))).toBe(false);
    expect(layer.style.transition).toMatch(/^transform 240ms/);
    expect(layer.style.transform).toMatch(/scale\(/);
    expect(container.querySelector(".pw-theater")).toHaveAttribute("data-motion", "full");
    cleanup();
    const reduced = scene(undefined, { active: run.team[0], reducedMotion: true });
    expect(reduced.container.querySelector<HTMLElement>(".pw-stage-zoom")!.style.transition).toBe("none");
    expect(reduced.container.querySelector(".pw-theater")).toHaveAttribute("data-motion", "reduced");
  });

  it("flashes the target ring once and lights the chip when an order locks, never under reduced motion", () => {
    const run = createRun(1);
    const [performer] = run.team;
    const target = run.enemies[0];
    const chips: Record<string, OrderChip> = {
      [performer.id]: { move: performer.moves[0], target: "Crawler 1" },
    };
    const flash = { actor: performer.id, target: target.id, stamp: 1 };
    const { container } = scene(undefined, { chips, flash, reducedMotion: false });
    expect(container.querySelector(`[data-unit="${target.id}"] .pw-target-flash`)).not.toBeNull();
    expect(container.querySelector(`[data-unit="${performer.id}"] .pw-order-chip`)).toHaveClass("just-set");
    cleanup();
    const quiet = scene(undefined, { chips, flash, reducedMotion: true });
    expect(quiet.container.querySelector(".pw-target-flash")).toBeNull();
    expect(quiet.container.querySelector(".pw-order-chip.just-set")).toBeNull();
  });
  it("calls out a redirected melee attack without playing it as another signature", () => {
    const run = createRun(1);
    const actor = run.team.find((u) => u.id === "A")!;
    scene({
      team: run.team,
      enemies: run.enemies,
      text: "Target changed.",
      event: {
        kind: "redirect",
        actorId: actor.id,
        targetId: run.enemies[1].id,
        moveName: actor.moves.find((m) => m.signature)!.name,
      },
    });
    expect(screen.getByText("Target changed")).toBeInTheDocument();
    expect(
      screen.getByText(`Now targeting ${run.enemies[1].name}`)
    ).toBeInTheDocument();
    expect(document.querySelector(".pw-flight.redirect")).not.toHaveClass(
      "contact"
    );
    expect(document.querySelector(".pw-theater")).not.toHaveClass(
      "signature-action"
    );
  });
  it("shows exhaustion recoil on the attacker as well as damage on the target", () => {
    const run = createRun(1);
    const actor = run.team.find((u) => u.id === "H")!;
    actor.hp -= 2;
    actor.cooldowns = [1, 1, 1, 1];
    run.enemies[0].hp -= 3;
    scene({
      team: run.team,
      enemies: run.enemies,
      text: "Desperate strike.",
      event: {
        kind: "hit",
        actorId: "H",
        targetId: run.enemies[0].id,
        moveName: "Desperate strike",
        amount: 3,
      },
    });
    expect(
      screen.getByRole("button", { name: "Select Hippochamp" })
    ).toHaveTextContent("Recoil");
    expect(
      screen.getByRole("button", {
        name: `Target ${run.enemies[0].name} ${run.enemies[0].id}`,
      })
    ).toHaveTextContent("−3");
  });

  it("lets players inspect a companion separately from selecting it", () => {
    const { run, onInspect } = scene();
    const unit = run.team[0];
    expect(
      screen.getByRole("button", { name: `Select ${unit.name}` })
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole("button", {
        name: `Inspect ${unit.name} on battlefield`,
      })
    );
    expect(onInspect).toHaveBeenCalledWith(unit.id);
  });

  it("attaches knockout feedback and health to the affected enemy", () => {
    const run = createRun(1);
    run.enemies[0].hp = 0;
    scene({
      team: run.team,
      enemies: run.enemies,
      text: "The crawler falls.",
      event: {
        kind: "hit",
        actorId: "H",
        targetId: run.enemies[0].id,
        moveName: "Emergency Water Cannon",
        amount: 12,
      },
    });
    const enemy = screen.getByRole("button", {
      name: `Target ${run.enemies[0].name} ${run.enemies[0].id}`,
    });
    expect(enemy).toBeDisabled();
    expect(enemy).toHaveTextContent("Knocked out");
    expect(enemy.closest(".pw-scene-unit")).toHaveClass("fallen", "receiving");
  });

  it("names every condition on a unit with its group icon and remaining opportunities", () => {
    const run = createRun(1);
    const victim = run.team[0];
    victim.conditions = [
      {
        status: "paralyzed",
        group: "binding",
        intensity: 50,
        remaining: 1,
        source: "B4",
        removable: ["stabilizing"],
      },
      {
        status: "corroding",
        group: "degrading",
        intensity: 60,
        element: "chemical",
        remaining: 3,
        source: "B4",
        removable: ["cleansing"],
      },
    ];
    victim.bound = 1;
    scene(undefined, { team: run.team, enemies: run.enemies });
    const badge = screen.getByText("paralyzed").closest(".pw-status-badge")!;
    expect(badge).toHaveClass("group-binding");
    expect(badge).toHaveTextContent("1 opportunity");
    expect(badge).toHaveAttribute("title", expect.stringContaining("close in"));
    const rot = screen.getByText("corroding").closest(".pw-status-badge")!;
    expect(rot).toHaveClass("group-degrading");
    expect(rot).toHaveTextContent("3 opportunities");
    expect(rot).toHaveAttribute(
      "title",
      expect.stringContaining("Shields do not reduce it")
    );
  });

  it("floats a caption for every new event kind", () => {
    const run = createRun(1);
    const victim = run.team[0];
    const kinds = [
      { kind: "tick" as const, group: "degrading" as const, amount: 3, text: "−3" },
      { kind: "tick" as const, group: "mending" as const, amount: 4, text: "+4" },
      { kind: "status" as const, status: "corroding", text: "Corroding" },
      { kind: "resisted" as const, text: "Resisted" },
      { kind: "removed" as const, text: "Cleared" },
      { kind: "expired" as const, text: "Wears off" },
      { kind: "hidden" as const, text: "Concealed" },
    ];
    for (const { text, ...event } of kinds) {
      cleanup();
      scene({
        team: run.team,
        enemies: run.enemies,
        text: "Something happens.",
        event: { ...event, targetId: victim.id, actorId: "B4" },
      });
      expect(
        document.querySelector(".pw-scene-float")!.textContent,
        `${event.kind} ${event.group ?? ""}`
      ).toContain(text);
    }
    // A lost opportunity floats over the unit that lost it, not a target.
    cleanup();
    scene({
      team: run.team,
      enemies: run.enemies,
      text: "Entranced.",
      event: { kind: "lost", actorId: victim.id, status: "entranced", group: "attention" },
    });
    expect(document.querySelector(".pw-scene-float")).toHaveTextContent(
      "Opportunity lost"
    );
  });

  it("shows a charge without revealing its hidden target", () => {
    const run = createRun(1);
    run.enemies[0].charge = run.team[0].id;
    const { container } = render(
      <PowerworksScene
        team={run.team}
        enemies={run.enemies}
        frame={{
          team: run.team,
          enemies: run.enemies,
          text: "Charging.",
          event: { kind: "charge", actorId: run.enemies[0].id },
        }}
        frameIndex={1}
        room={0}
        move={null}
        plans={{}}
        planning={false}
        impact
        paused
        speed={1}
        reducedMotion
        labelFor={(u) => u.name}
        onTarget={() => {}}
        onSelect={() => {}}
        onInspect={() => {}}
        onHover={() => {}}
      />
    );
    expect(screen.getByText("Charged")).toBeInTheDocument();
    expect(container.querySelector(".pw-flight")).toBeNull();
    expect(container.querySelector(".receiving")).toBeNull();
  });
  it("floats a Reacts caption on the reacting unit for a react event", () => {
    const run = createRun(1);
    const { container } = scene({
      team: run.team,
      enemies: run.enemies,
      text: "Central guardian reacts: Core discharge answers Crystorn.",
      event: {
        kind: "react",
        actorId: run.enemies[0].id,
        targetId: run.team[0].id,
        moveName: "Core discharge",
      },
    });
    const float = container.querySelector(".pw-scene-float.react");
    expect(float).not.toBeNull();
    expect(float!.textContent).toContain("Reacts");
  });
});
