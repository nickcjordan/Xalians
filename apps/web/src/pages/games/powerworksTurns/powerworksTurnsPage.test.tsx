import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import PowerworksTurnsPage from "./powerworksTurnsPage";
import { createTurnRun, DEFAULT_RULES, ENEMY_HP_FACTOR, PILLAR_SAVE_VERSION } from "@xalians/rules/dungeon/pillars";

const SAVE_KEY = "xalians.powerworks.turns.v1";
const RULES = { ...DEFAULT_RULES, rooms: "roles" as const, timeline: "round" as const, enemyHpFactor: ENEMY_HP_FACTOR };

beforeEach(() => {
  cleanup();
  localStorage.clear();
  window.history.pushState({}, "", "/powerworks");
});

const mount = () =>
  render(
    <MemoryRouter>
      <PowerworksTurnsPage />
    </MemoryRouter>
  );

describe("Powerworks turn by turn", () => {
  it("renders the first turn with four keys for the active companion", () => {
    mount();
    // Four move keys plus Pass.
    expect(screen.getAllByRole("group").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole("button", { name: "Pass" })).toBeInTheDocument();
  });

  it("acting on an enemy cell plays a turn and advances the round strip", async () => {
    mount();
    // Find an attack key's first enemy cell button (labelled "<key name> on <letter>, <target>: ...").
    const cells = screen
      .getAllByRole("button")
      .filter((b) => / on [A-F], /.test(b.getAttribute("aria-label") || ""));
    expect(cells.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.click(cells[0]);
    });
    // Playback runs; the banner's Skip jumps straight to the next hand-off to the player.
    const skip = await screen.findByRole("button", { name: /skip to your next turn/i });
    await act(async () => {
      fireEvent.click(skip);
    });
    // Skip lives in the key bar only while beats play: back on the player's turn it is gone.
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /skip to your next turn/i })).toBeNull();
    });
  });

  it("shows Continue when a saved state is in camp", () => {
    let { state } = createTurnRun(1, "starter", RULES);
    // Force the run into camp by clearing the enemies' health.
    state = { ...state, phase: "camp" as const };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: PILLAR_SAVE_VERSION, state }));
    mount();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("carries the harness's stable hooks: banner, spotlight, busy and rail slots", () => {
    const { container } = mount();
    const banner = container.querySelector("[data-turn-banner]");
    expect(banner).toBeTruthy();
    expect(banner!.getAttribute("data-side")).toBe("squad");
    const stage = container.querySelector(".pwt-stage");
    expect(stage!.hasAttribute("data-spotlight")).toBe(true);
    expect(stage!.getAttribute("data-spotlight")).not.toBe("");
    const root = container.querySelector('[data-busy]')!;
    expect(root.getAttribute("data-busy")).toBe("false");
    const rail = container.querySelector("[data-rail]");
    expect(rail).toBeTruthy();
    const slots = container.querySelectorAll("[data-slot]");
    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((slot) => {
      expect(["now", "next", "done", "down", "later"]).toContain(slot.getAttribute("data-state"));
    });
  });

  it("sets data-busy=true while a command's beats are playing, and marks the acting enemy's spotlight", async () => {
    mount();
    const cells = screen
      .getAllByRole("button")
      .filter((b) => / on [A-F], /.test(b.getAttribute("aria-label") || ""));
    await act(async () => {
      fireEvent.click(cells[0]);
    });
    const root = document.querySelector('[data-busy]')!;
    expect(root.getAttribute("data-busy")).toBe("true");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /skip to your next turn/i }));
    });
    await waitFor(() => expect(root.getAttribute("data-busy")).toBe("false"));
  });
});
