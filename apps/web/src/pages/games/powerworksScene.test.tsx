import React from "react";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRun, type Frame } from "@xalians/rules/dungeon";
import { PowerworksScene } from "./powerworksScene";

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
    previewText: () => "",
    onTarget: vi.fn(),
    onSelect: vi.fn(),
    onInspect,
    onHover: vi.fn(),
  };
  render(<PowerworksScene {...props} {...overrides} />);
  return { run, onInspect };
}

describe("shared battlefield", () => {
  it("links each queued attacker to its target and lets that order be edited", () => {
    const run = createRun(1);
    const onSelect = vi.fn();
    const unit = run.team[0];
    const target = run.enemies[0];
    scene(undefined, {
      plans: { [unit.id]: { move: 0, target: target.id } },
      onSelect,
    });
    const edit = screen.getByRole("button", {
      name: `Edit ${unit.name}'s order targeting ${target.name}`,
    });
    expect(edit.closest(".pw-scene-unit")).toHaveClass("defender");
    fireEvent.click(edit);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: unit.id }),
      true
    );
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
      screen.getByRole("button", { name: "Plan Hippochamp on battlefield" })
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
      screen.getByRole("button", { name: `Plan ${unit.name} on battlefield` })
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
        previewText={() => ""}
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
});
