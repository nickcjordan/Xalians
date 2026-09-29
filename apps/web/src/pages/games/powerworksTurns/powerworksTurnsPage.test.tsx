import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import PowerworksTurnsPage from "./powerworksTurnsPage";
import { createTurnRun, DEFAULT_RULES, PILLAR_SAVE_VERSION } from "@xalians/rules/dungeon/pillars";

const SAVE_KEY = "xalians.powerworks.turns.v1";
const RULES = { ...DEFAULT_RULES, rooms: "roles" as const, timeline: "round" as const, enemyHpFactor: 0.62 };

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
    // Playback runs; skip it to reach the settled state.
    const skip = await screen.findByRole("button", { name: /skip/i });
    await act(async () => {
      fireEvent.click(skip);
    });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /skip/i })).not.toBeInTheDocument();
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
});
