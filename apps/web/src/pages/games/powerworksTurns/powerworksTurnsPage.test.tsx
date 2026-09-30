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

  it("round 3: every plate carries its element, and the rail numbers the order after NEXT", () => {
    const { container } = mount();
    const plates = container.querySelectorAll(".pwt-plate");
    expect(plates.length).toBeGreaterThan(0);
    plates.forEach((pl) => expect(pl.querySelector(".pwt-el[data-element]")).toBeTruthy());
    expect(container.querySelector(".pwt-keybar-portrait .pwt-el")).toBeTruthy();
    const laters = Array.from(container.querySelectorAll('[data-slot][data-state="later"] .pwt-rail-order')).map((n) => Number(n.textContent));
    // Counted from NOW (1) and NEXT (2): the first numbered slot is 3, then rising by one.
    if (laters.length) {
      expect(laters[0]).toBe(3);
      laters.forEach((n, i) => expect(n).toBe(3 + i));
    }
  });

  it("round 3: hovering an enemy plate rings it and lights its column in every attack key", () => {
    const { container } = mount();
    const plate = container.querySelector(".pwt-row.enemies .pwt-plate")!;
    fireEvent.mouseEnter(plate);
    expect(plate.className).toContain("targeted");
    const lit = container.querySelectorAll(".pwt-cell.col-lit");
    expect(lit.length).toBeGreaterThan(0);
    fireEvent.mouseLeave(plate);
    expect(container.querySelectorAll(".pwt-cell.col-lit").length).toBe(0);
  });

  it("round 3: while a move plays the key bar shows one playing card and speed is a labeled 1x/2x control", async () => {
    const { container } = mount();
    const cells = screen.getAllByRole("button").filter((b) => / on [A-F], /.test(b.getAttribute("aria-label") || ""));
    await act(async () => {
      fireEvent.click(cells[0]);
    });
    expect(container.querySelector("[data-playing]")).toBeTruthy();
    const seg = screen.getByRole("group", { name: "Playback speed" });
    const buttons = Array.from(seg.querySelectorAll("button"));
    expect(buttons.map((b) => b.textContent)).toEqual(["1x", "2x"]);
    expect(buttons[0].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(buttons[1]);
    expect(buttons[1].getAttribute("aria-pressed")).toBe("true");
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

  it("offers Retreat at camp and ends with its own 'withdrew' text, not the stall text", async () => {
    let { state } = createTurnRun(1, "starter", RULES);
    state = { ...state, phase: "camp" as const };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: PILLAR_SAVE_VERSION, state }));
    mount();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^retreat$/i }));
    });
    expect(screen.getByText("Squad withdrew")).toBeInTheDocument();
    expect(screen.queryByText(/new low/i)).toBeNull();
  });

  it("shows this sector's XP at camp, not the run total", () => {
    let { state } = createTurnRun(1, "starter", RULES);
    state = { ...state, phase: "camp" as const, xp: 30 };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: PILLAR_SAVE_VERSION, state }));
    mount();
    expect(screen.getByText("+10 XP this sector · 30 in all")).toBeInTheDocument();
  });

  it("tells a portrait phone to turn sideways and offers a way back to Xalians", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /begin/i }));
    expect(screen.getByText("Turn your phone sideways to play")).toBeInTheDocument();
    const back = screen.getByRole("link", { name: /back to xalians/i });
    expect(back.getAttribute("href")).toBe("/");
  });

  it("never collapses a key into an 'every enemy' cell", () => {
    mount();
    expect(screen.queryByText(/every enemy/i)).toBeNull();
  });

  it("the Record lists every beat under its sector and round after a turn is played", async () => {
    mount();
    const cells = screen.getAllByRole("button").filter((b) => / on [A-F], /.test(b.getAttribute("aria-label") || ""));
    await act(async () => {
      fireEvent.click(cells[0]);
    });
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /skip to your next turn/i }));
    });
    await waitFor(() => expect(document.querySelector('[data-busy]')!.getAttribute("data-busy")).toBe("false"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /record/i }));
    });
    expect(screen.getAllByLabelText(/^Sector 1, round \d+$/).length).toBeGreaterThan(0);
  });
  describe("round 2: arrive, end and rest", () => {
    const saveRun = (mutate: (state: ReturnType<typeof createTurnRun>["state"]) => object) => {
      const { state } = createTurnRun(1, "starter", RULES);
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: PILLAR_SAVE_VERSION, state: mutate(state) }));
    };

    it("shows the briefing on a new run and Begin dismisses it, showing the sector title card", () => {
      const { container } = mount();
      expect(screen.getByRole("dialog", { name: "Briefing" })).toBeInTheDocument();
      expect(screen.getByText("Clear all 4 sectors.")).toBeInTheDocument();
      expect(screen.getByText("Guardian")).toBeInTheDocument();
      // A run is not saved until it has begun.
      expect(localStorage.getItem(SAVE_KEY)).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: /begin/i }));
      expect(screen.queryByRole("dialog", { name: "Briefing" })).toBeNull();
      expect(container.querySelector("[data-title-card]")).toBeTruthy();
      expect(container.querySelector("[data-title-card]")!.textContent).toMatch(/Sector 1 of 4/);
      expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();
    });

    it("skips the briefing for a saved run in progress", () => {
      saveRun((s) => s);
      mount();
      expect(screen.queryByRole("dialog", { name: "Briefing" })).toBeNull();
    });

    it("Restart's dialog puts Cancel first and default, and Restart in the danger style", async () => {
      saveRun((s) => s);
      const { container } = mount();
      fireEvent.click(screen.getByRole("button", { name: /^restart$/i }));
      const dialog = screen.getByRole("dialog", { name: "Restart" });
      const buttons = Array.from(dialog.querySelectorAll("button"));
      expect(buttons[0].textContent).toBe("Cancel");
      expect(document.activeElement).toBe(buttons[0]);
      const restart = buttons.find((b) => b.textContent === "Restart")!;
      expect(restart.className).toContain("pwt-danger");
      expect(restart.className).not.toContain("pwt-primary");
      fireEvent.click(buttons[0]);
      expect(screen.queryByRole("dialog", { name: "Restart" })).toBeNull();
      expect(container.querySelector("[data-notice]")!.textContent).toMatch(/Restart cancelled/);
      expect(screen.queryByRole("dialog", { name: "Briefing" })).toBeNull();
    });

    it("Restart brings the briefing back", () => {
      saveRun((s) => s);
      mount();
      fireEvent.click(screen.getByRole("button", { name: /^restart$/i }));
      const dialog = screen.getByRole("dialog", { name: "Restart" });
      fireEvent.click(Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "Restart")!);
      expect(screen.getByRole("dialog", { name: "Briefing" })).toBeInTheDocument();
    });

    it("at camp with a fallen companion the revive is the primary action and Continue is secondary with a note", () => {
      saveRun((s) => ({ ...s, phase: "camp" as const, team: s.team.map((u, i) => (i === 0 ? { ...u, hp: 0 } : u)) }));
      mount();
      const camp = screen.getByRole("dialog", { name: "Camp" });
      const revive = Array.from(camp.querySelectorAll("button")).find((b) => /^Revive /.test((b.textContent || "").trim()))!;
      expect(revive.className).toContain("pwt-primary");
      expect(revive.textContent).toMatch(/to \d+ health · 1 revive left/);
      const cont = Array.from(camp.querySelectorAll("button")).find((b) => /^Continue/.test((b.textContent || "").trim()))!;
      expect(cont.className).toContain("pwt-secondary");
      expect(camp.textContent).toMatch(/leaves the revive unused/);
      fireEvent.click(revive);
      expect(screen.getByRole("status", { name: "" })).toBeTruthy();
      expect(camp.textContent).toMatch(/No revives left\./);
      // Nobody is down and no revive is left: Continue is the primary action again.
      const cont2 = Array.from(camp.querySelectorAll("button")).find((b) => /^Continue/.test((b.textContent || "").trim()))!;
      expect(cont2.className).toContain("pwt-primary");
    });

    it("the camp before the last sector states the recovery station's amount", () => {
      saveRun((s) => ({ ...s, phase: "camp" as const, room: 2 }));
      mount();
      expect(screen.getByRole("dialog", { name: "Camp" }).textContent).toMatch(/restores 20 health to each standing companion/);
    });

    it("the Guide is a legend drawn with the real components", () => {
      saveRun((s) => s);
      const { container } = mount();
      fireEvent.click(screen.getByRole("button", { name: /guide/i }));
      const guide = screen.getByRole("dialog", { name: "Guide" });
      expect(guide.querySelectorAll(".pwt-legend-row").length).toBeGreaterThanOrEqual(14);
      expect(guide.querySelector(".pwt-cell.finish")).toBeTruthy();
      expect(guide.querySelector(".pwt-area-band")).toBeTruthy();
      expect(guide.querySelector(".pwt-hit-on-active.coming")).toBeTruthy();
      expect(guide.querySelector("[data-rail]")).toBeTruthy();
      expect(guide.textContent).toMatch(/along the top/);
      expect(guide.textContent).not.toMatch(/along the bottom/);
      expect(container).toBeTruthy();
    });

    it("a won run shows the surviving squad, the summary and a way out", () => {
      saveRun((s) => ({ ...s, phase: "won" as const, room: 3, xp: 30, team: s.team.map((u, i) => (i === 0 ? { ...u, hp: 0 } : u)) }));
      mount();
      const end = screen.getByRole("dialog", { name: "Expedition report" });
      expect(end.className).toContain("won");
      expect(end.querySelectorAll(".pwt-end-unit").length).toBe(3);
      expect(end.textContent).toMatch(/Sectors cleared4 of 4/);
      expect(end.textContent).toMatch(/XP earned30/);
      expect(screen.getAllByRole("link", { name: /back to xalians/i }).length).toBeGreaterThan(0);
    });

    it("a lost run shows the fallen squad and no X glyph as a control", () => {
      saveRun((s) => ({ ...s, phase: "lost" as const, room: 1, team: s.team.map((u) => ({ ...u, hp: 0 })) }));
      mount();
      const end = screen.getByRole("dialog", { name: "Expedition report" });
      expect(end.className).toContain("lost");
      expect(end.querySelectorAll(".pwt-end-unit.down").length).toBe(4);
      expect(end.querySelector(".pwt-end-mark")!.getAttribute("aria-hidden")).toBe("true");
      expect(end.textContent).toMatch(/Sectors cleared1 of 4/);
    });
  });
});

/** UX pass 2, round 4: the phone. jsdom has no layout, so these check the mode and its behavior. */
describe("Powerworks on a landscape phone", () => {
  const size = (w: number, h: number, noHover: boolean) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: w });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: h });
    window.matchMedia = ((q: string) => ({
      matches: noHover && q.includes("hover: none"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
  };
  const restore = () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
    // @ts-expect-error the stub is removed again
    delete window.matchMedia;
  };
  const enemyCells = (c: HTMLElement) =>
    Array.from(c.querySelectorAll<HTMLButtonElement>(".pwt-key .pwt-cell")).filter((b) => / on [A-F], /.test(b.getAttribute("aria-label") || "") && !b.disabled);

  it("composes the console at the screen's own size, and a desktop keeps the scaled console", () => {
    size(844, 390, true);
    const { container, unmount } = mount();
    const phone = container.querySelector(".pwt-console")!;
    expect(phone.className).toContain("phone");
    expect((phone as HTMLElement).style.width).toBe("844px");
    expect((phone as HTMLElement).style.height).toBe("390px");
    expect(phone.getAttribute("style") ?? "").not.toContain("zoom");
    unmount();
    restore();
    const desk = mount().container.querySelector(".pwt-console") as HTMLElement;
    expect(desk.className).not.toContain("phone");
    expect(desk.style.width).toBe("1280px");
    restore();
  });

  it("folds Guide, Record and Restart into one Menu, and the banner line becomes plain text", async () => {
    size(844, 390, true);
    const { container } = mount();
    expect(container.querySelector(".pwt-banner-line.since")).toBeNull();
    const menu = container.querySelector<HTMLButtonElement>(".pwt-menu-btn")!;
    expect(screen.queryByRole("menuitem")).toBeNull();
    fireEvent.click(menu);
    expect(screen.getAllByRole("menuitem").map((n) => n.textContent?.trim())).toEqual(["Guide", "Record", "Restart"]);
    fireEvent.click(screen.getByRole("menuitem", { name: /guide/i }));
    expect(screen.queryByRole("menuitem")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Guide" })).toBeInTheDocument();
    // The Guide says tap, not hover, on a touch screen.
    expect(screen.getByText(/tap it once and the units it affects are ringed/i)).toBeInTheDocument();
    restore();
  });

  it("the first tap on a key cell previews it and rings its enemy, the second uses the move", async () => {
    size(844, 390, true);
    const { container } = mount();
    const cell = enemyCells(container as HTMLElement)[0];
    fireEvent.click(cell);
    expect(container.querySelector("[data-busy]")!.getAttribute("data-busy")).toBe("false");
    expect(container.querySelectorAll(".pwt-cell.previewed").length).toBe(1);
    expect(container.querySelectorAll(".pwt-plate.targeted").length).toBe(1);
    expect(container.querySelector(".pwt-key-foot-words")).toBeTruthy();
    expect(screen.getByText("tap again to use")).toBeInTheDocument();
    // A different cell moves the preview; nothing has been used yet.
    const other = enemyCells(container as HTMLElement).find((c) => c !== cell && c.getAttribute("aria-label") !== cell.getAttribute("aria-label"))!;
    fireEvent.click(other);
    expect(container.querySelectorAll(".pwt-cell.previewed").length).toBe(1);
    expect(container.querySelector("[data-busy]")!.getAttribute("data-busy")).toBe("false");
    await act(async () => {
      fireEvent.click(container.querySelector<HTMLButtonElement>(".pwt-cell.previewed")!);
    });
    expect(container.querySelector("[data-busy]")!.getAttribute("data-busy")).toBe("true");
    restore();
  });

  it("with a mouse (a phone-sized window that can hover) one click still uses the move", async () => {
    size(844, 390, false);
    const { container } = mount();
    await act(async () => {
      fireEvent.click(enemyCells(container as HTMLElement)[0]);
    });
    expect(container.querySelector("[data-busy]")!.getAttribute("data-busy")).toBe("true");
    restore();
  });
});
