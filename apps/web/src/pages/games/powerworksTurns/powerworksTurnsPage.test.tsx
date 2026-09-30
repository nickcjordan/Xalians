import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

/** The move keys the active companion can use now. */
const keys = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLButtonElement>(".pwt-keybar button.pwt-key")).filter((b) => !b.disabled);
/** The enemy plates the selected key can be used on. */
const targets = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>(".pwt-row.enemies .pwt-plate.pickable"));
/** Use a key the way a player does: press it, then, when it waits for a target, an enemy plate. */
async function useKey(c: HTMLElement, key: HTMLButtonElement | undefined = keys(c).find((k) => k.classList.contains("attack")) ?? keys(c)[0]) {
  await act(async () => {
    fireEvent.click(key!);
  });
  const plate = targets(c)[0];
  if (plate) {
    await act(async () => {
      fireEvent.click(plate);
    });
  }
}

describe("Powerworks turn by turn", () => {
  it("renders the first turn with four move keys for the active companion", () => {
    const { container } = mount();
    // Four move keys plus Pass.
    expect(container.querySelectorAll(".pwt-keybar button.pwt-key").length).toBe(4);
    expect(screen.getByRole("button", { name: "Pass" })).toBeInTheDocument();
  });

  it("a key shows one power number and no cell per enemy", () => {
    const { container } = mount();
    expect(container.querySelectorAll(".pwt-cell").length).toBe(0);
    const attack = container.querySelector<HTMLElement>(".pwt-keybar button.pwt-key.attack .pwt-key-power")!;
    expect(attack.getAttribute("data-power")).toMatch(/^\d+$/);
  });

  it("each standing enemy shows its intent: the companion it will hit and the number, hidden only while enemies act", () => {
    const { container } = mount();
    const enemies = container.querySelectorAll(".pwt-row.enemies .pwt-plate");
    const chips = container.querySelectorAll(".pwt-row.enemies .pwt-intent");
    expect(chips.length).toBe(enemies.length);
    chips.forEach((chip) => {
      expect(chip.getAttribute("aria-label")).toMatch(/^Next: /);
      expect(chip.classList.contains("off")).toBe(false);
    });
    // The matchup is said once per enemy, against the acting companion.
    expect(container.querySelectorAll(".pwt-row.enemies .pwt-match").length).toBeGreaterThan(0);
  });

  it("acting is a key, then an enemy: it plays a turn and advances the round strip", async () => {
    const { container } = mount();
    await useKey(container as HTMLElement);
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

  it("hovering a key shows what it would land on each enemy's plate; choosing it keeps them and lets a plate be pressed", () => {
    const { container } = mount();
    const c = container as HTMLElement;
    fireEvent.click(screen.getByRole("button", { name: /begin/i }));
    const key = c.querySelector<HTMLButtonElement>(".pwt-keybar button.pwt-key.attack")!;
    fireEvent.pointerMove(window, { clientX: 300, clientY: 300 });
    fireEvent.mouseMove(key);
    const shown = c.querySelectorAll(".pwt-row.enemies [data-preview]");
    expect(shown.length).toBe(c.querySelectorAll(".pwt-row.enemies .pwt-plate").length);
    fireEvent.mouseLeave(key);
    expect(c.querySelectorAll(".pwt-stage [data-preview]").length).toBe(0);
    // Choosing it keeps the numbers and makes the enemy plates pressable.
    fireEvent.click(key);
    expect(key.getAttribute("aria-pressed")).toBe("true");
    expect(c.querySelector(".pwt-banner-line")!.textContent).toBe("Now choose a target.");
    expect(c.querySelectorAll(".pwt-row.enemies [data-preview]").length).toBeGreaterThan(0);
    expect(targets(c).length).toBeGreaterThan(0);
    // The pointer on a plate rings it; a unit the key cannot name steps back.
    const plate = targets(c)[0];
    fireEvent.mouseMove(plate);
    expect(plate.className).toContain("targeted");
    expect(c.querySelectorAll(".pwt-row.squad .pwt-plate.off-target").length).toBeGreaterThan(0);
    // Escape puts the key back.
    fireEvent.keyDown(window, { key: "Escape" });
    expect(key.getAttribute("aria-pressed")).toBe("false");
    expect(c.querySelectorAll(".pwt-stage [data-preview]").length).toBe(0);
  });

  it("the keyboard is a key (1 to 4), then an enemy (A to F)", async () => {
    const { container } = mount();
    const c = container as HTMLElement;
    fireEvent.click(screen.getByRole("button", { name: /begin/i }));
    const index = keys(c).find((k) => k.classList.contains("attack"))!.getAttribute("data-key")!;
    fireEvent.keyDown(window, { key: index });
    expect(c.querySelector(`.pwt-keybar button.pwt-key[data-key="${index}"]`)!.getAttribute("aria-pressed")).toBe("true");
    await act(async () => {
      fireEvent.keyDown(window, { key: "a" });
    });
    expect(c.querySelector("[data-busy]")!.getAttribute("data-busy")).toBe("true");
  });

  it("round 3: while a move plays the key bar shows one playing card and speed is a labeled 1x/2x control", async () => {
    const { container } = mount();
    await useKey(container as HTMLElement);
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
    const { container } = mount();
    await useKey(container as HTMLElement);
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
    // Round 5: Retreat asks once, like Restart: Cancel first and the default, the danger action outlined.
    const dialog = screen.getByRole("dialog", { name: "Retreat" });
    const buttons = Array.from(dialog.querySelectorAll("button"));
    expect(buttons[0].textContent).toBe("Cancel");
    expect(document.activeElement).toBe(buttons[0]);
    expect(buttons[1].className).toContain("pwt-danger");
    expect(dialog.textContent).toMatch(/after sector 1 of 4/);
    expect(dialog.textContent).toMatch(/keep the 0 XP/);
    expect(screen.queryByText("Squad withdrew")).toBeNull();
    await act(async () => {
      fireEvent.click(buttons[1]);
    });
    expect(screen.getByText("Squad withdrew")).toBeInTheDocument();
    expect(screen.queryByText(/new low/i)).toBeNull();
  });

  it("round 5: cancelling the retreat dialog leaves the camp as it was", () => {
    let { state } = createTurnRun(1, "starter", RULES);
    state = { ...state, phase: "camp" as const };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: PILLAR_SAVE_VERSION, state }));
    mount();
    fireEvent.click(screen.getByRole("button", { name: /^retreat$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Retreat" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Camp" })).toBeInTheDocument();
    expect(screen.queryByText("Squad withdrew")).toBeNull();
  });

  it("round 5: camp puts its actions on one row and sets Retreat apart in the danger style", () => {
    let { state } = createTurnRun(1, "starter", RULES);
    state = { ...state, phase: "camp" as const, room: 2, team: state.team.map((u, i) => (i === 0 ? { ...u, hp: 0 } : u)) };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: PILLAR_SAVE_VERSION, state }));
    mount();
    const camp = screen.getByRole("dialog", { name: "Camp" });
    const row = camp.querySelector(".pwt-camp-actions")!;
    expect(Array.from(row.querySelectorAll("button")).map((b) => (b.textContent || "").trim().split(" ")[0])).toEqual(["Revive", "Continue"]);
    const retreat = camp.querySelector(".pwt-camp-leave .pwt-danger")!;
    expect(retreat.textContent).toMatch(/Retreat/);
    expect(row.contains(retreat)).toBe(false);
    expect(camp.querySelector(".eyebrow")!.textContent).toBe("Last camp before the Guardian");
    expect(camp.textContent).toMatch(/sits out the Guardian's fight/);
  });

  it("an area key previews on every enemy at once and acts on the press alone", async () => {
    const { container } = mount();
    const c = container as HTMLElement;
    const area = keys(c).find((k) => k.querySelector(".pwt-shape-all"));
    if (!area) return; // this seed's first companion has no area key
    fireEvent.pointerMove(window, { clientX: 200, clientY: 200 });
    fireEvent.mouseMove(area);
    expect(c.querySelectorAll(".pwt-row.enemies [data-preview]").length).toBe(c.querySelectorAll(".pwt-row.enemies .pwt-plate:not(.down)").length);
    await act(async () => {
      fireEvent.click(area);
    });
    expect(c.querySelector("[data-busy]")!.getAttribute("data-busy")).toBe("true");
  });

  it("round 5: a first-occurrence note shows once, beside a key, and any action ends it for good", async () => {
    const { container, unmount } = mount();
    fireEvent.click(screen.getByRole("button", { name: /begin/i }));
    const note = container.querySelector(".pwt-note");
    expect(note).toBeTruthy();
    // Never on top of the key it explains: it sits on the key bar's top line, not inside a key.
    expect(note!.closest(".pwt-key")).toBeNull();
    const id = note!.getAttribute("data-note")!;
    expect(container.querySelectorAll(".pwt-note").length).toBe(1);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Pass" }));
    });
    expect(JSON.parse(localStorage.getItem("xalians.powerworks.notes.v1")!)).toContain(id);
    unmount();
    // A later visit does not show that note again.
    localStorage.removeItem("xalians.powerworks.turns.v1");
    const again = mount().container;
    fireEvent.click(screen.getByRole("button", { name: /begin/i }));
    expect(again.querySelector(`.pwt-note[data-note="${id}"]`)).toBeNull();
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

  it("never repeats a number per enemy on a key", () => {
    const { container } = mount();
    expect(container.querySelectorAll(".pwt-key .pwt-cell, .pwt-key .pwt-cells").length).toBe(0);
  });

  it("the Record lists every beat under its sector and round after a turn is played", async () => {
    const { container } = mount();
    await useKey(container as HTMLElement);
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
      // The lesson row shows a key's one power number and what it lands on an enemy once chosen.
      expect(document.querySelector("[data-lesson] button.pwt-key .pwt-key-power")).toBeTruthy();
      expect(document.querySelector("[data-lesson] [data-preview]")).toBeTruthy();
      expect(document.querySelector("[data-lesson]")!.textContent).toMatch(/whom it will hit next/);
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
      expect(guide.querySelectorAll(".pwt-legend-row").length).toBeGreaterThanOrEqual(12);
      expect(guide.querySelector("button.pwt-key .pwt-key-power")).toBeTruthy();
      expect(guide.querySelector(".pwt-shape-all")).toBeTruthy();
      expect(guide.querySelector(".pwt-preview.finish")).toBeTruthy();
      expect(guide.querySelector(".pwt-intent")).toBeTruthy();
      expect(guide.querySelector(".pwt-match")).toBeTruthy();
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
      // Round 5: the whole squad, the fallen marked Down, and the Guardian's +30 named beside XP.
      expect(end.querySelectorAll(".pwt-end-unit").length).toBe(4);
      expect(end.querySelectorAll(".pwt-end-unit.down").length).toBe(1);
      expect(end.textContent).toMatch(/Sectors cleared4 of 4/);
      expect(end.textContent).toMatch(/XP earned30 \(\+30 for the Guardian\)/);
      expect(end.querySelector(".eyebrow")!.className).not.toContain("quiet");
      expect(screen.getAllByRole("link", { name: /back to xalians/i }).length).toBeGreaterThan(0);
    });

    it("a lost run shows the fallen squad and no X glyph as a control", () => {
      saveRun((s) => ({ ...s, phase: "lost" as const, room: 1, team: s.team.map((u) => ({ ...u, hp: 0 })) }));
      mount();
      const end = screen.getByRole("dialog", { name: "Expedition report" });
      expect(end.className).toContain("lost");
      // Mint is only for victory: a defeat's eyebrow is neutral.
      expect(end.querySelector(".eyebrow")!.className).toContain("quiet");
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
    expect(screen.getByText(/Tap a key and each enemy shows what that move would take/i)).toBeInTheDocument();
    expect(screen.getByText(/Acting takes two taps: a key, then an enemy/i)).toBeInTheDocument();
    restore();
  });

  it("a tap on a key selects it and shows its numbers on the plates; a tap on an enemy uses it", async () => {
    size(844, 390, true);
    const { container } = mount();
    const c = container as HTMLElement;
    const key = keys(c).find((k) => k.classList.contains("attack"))!;
    fireEvent.click(key);
    expect(c.querySelector("[data-busy]")!.getAttribute("data-busy")).toBe("false");
    expect(c.querySelectorAll(".pwt-keybar button.pwt-key.selected").length).toBe(1);
    expect(c.querySelectorAll(".pwt-row.enemies [data-preview]").length).toBeGreaterThan(0);
    expect(screen.getByText("pick a target")).toBeInTheDocument();
    // Another key moves the selection; nothing has been used yet.
    const other = keys(c).find((k) => k !== key)!;
    fireEvent.click(other);
    expect(c.querySelector("[data-busy]")!.getAttribute("data-busy")).toBe("false");
    fireEvent.click(key);
    await act(async () => {
      fireEvent.click(targets(c)[0]);
    });
    expect(c.querySelector("[data-busy]")!.getAttribute("data-busy")).toBe("true");
    restore();
  });

  it("a key that acts on its own takes a second tap on a touch screen", async () => {
    size(844, 390, true);
    const { container } = mount();
    const c = container as HTMLElement;
    const own = keys(c).find((k) => k.querySelector(".pwt-shape-all") || /on itself|whole squad/.test(k.textContent ?? ""));
    if (!own) {
      restore();
      return; // this seed's first companion has no key that acts on its own
    }
    fireEvent.click(own);
    expect(c.querySelector("[data-busy]")!.getAttribute("data-busy")).toBe("false");
    expect(own.getAttribute("aria-pressed")).toBe("true");
    await act(async () => {
      fireEvent.click(own);
    });
    expect(c.querySelector("[data-busy]")!.getAttribute("data-busy")).toBe("true");
    restore();
  });

  it("with a mouse (a phone-sized window that can hover) a key then an enemy still uses the move", async () => {
    size(844, 390, false);
    const { container } = mount();
    await useKey(container as HTMLElement);
    expect(container.querySelector("[data-busy]")!.getAttribute("data-busy")).toBe("true");
    restore();
  });
});

/** UX pass 2, round 6: the forecast agrees with the result. */
describe("round 6: hand-off, holds and forecast chips", () => {
  type Saved = ReturnType<typeof createTurnRun>["state"];
  const saveRun = (mutate: (state: Saved) => object) => {
    const { state } = createTurnRun(1, "starter", RULES);
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: PILLAR_SAVE_VERSION, state: mutate(state) }));
  };
  /** Every enemy but the first is already down and the first has 1 health: any hit clears the sector. */
  const lastEnemyStanding = (room: number) => (s: Saved) => ({
    ...s,
    room,
    enemies: s.enemies.map((e, i) => (i === 0 ? { ...e, hp: 1 } : { ...e, hp: 0 })),
  });
  /** Every enemy hits for 999 and only the acting companion stands, on 1 health. */
  const lastCompanionStanding = (s: Saved) => ({
    ...s,
    intents: Object.fromEntries(s.enemies.map((e) => [e.id, { move: Math.max(0, e.moves.findIndex((m) => m.power > 0)), target: s.active }])),
    team: s.team.map((u) => (u.id === s.active ? { ...u, hp: 1, shields: [] } : { ...u, hp: 0 })),
    enemies: s.enemies.map((e) => ({
      ...e,
      boost: 0,
      hinder: 0,
      cooldowns: e.moves.map(() => 0),
      moves: e.moves.map((m) => (m.power > 0 ? { ...m, power: 999, rests: 0, parts: [], area: false } : m)),
    })),
  });
  /** Choose keys one at a time until a plate shows a finishing preview (a skull), and use the key on it. */
  const finishOne = async (c: HTMLElement) => {
    for (const key of keys(c).filter((k) => k.classList.contains("attack"))) {
      await act(async () => {
        fireEvent.click(key);
      });
      const finishing = c.querySelector<HTMLElement>(".pwt-row.enemies .pwt-preview.finish");
      const plate = finishing?.closest<HTMLElement>(".pwt-plate.pickable");
      if (plate) {
        await act(async () => {
          fireEvent.click(plate);
        });
        return true;
      }
      if (c.querySelector("[data-busy]")!.getAttribute("data-busy") === "true") return true;
      if (key.getAttribute("aria-pressed") === "true")
        await act(async () => {
          fireEvent.click(key);
        });
    }
    return false;
  };
  const tick = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  };
  const card = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-playing]")?.textContent ?? "";
  const bannerLine = (c: HTMLElement) => c.querySelector(".pwt-banner-line")?.textContent ?? "";
  const hasTools = (c: HTMLElement) => !!c.querySelector(".pwt-keybar-play") || !!screen.queryByRole("button", { name: /skip to your next turn/i });

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("item 1: after the enemies act, the keys are there at once and no card covers them", async () => {
    const { container } = mount();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /begin/i }));
    });
    await useKey(container as HTMLElement);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /skip to your next turn/i }));
    });
    expect(container.querySelector('[data-busy]')!.getAttribute("data-busy")).toBe("false");
    // The hand-off frame: keys live, no card over them, the cue is a class on the bar.
    expect(container.querySelector(".pwt-keybar-wait")).toBeNull();
    expect(container.querySelectorAll(".pwt-keybar .pwt-key").length).toBe(4);
    expect(keys(container as HTMLElement).length).toBeGreaterThan(0);
    expect(container.querySelector(".pwt-keybar")!.className).toContain("handing-off");
    await tick(1000);
    expect(container.querySelector(".pwt-keybar")!.className).not.toContain("handing-off");
    expect(container.querySelector(".pwt-keybar-wait")).toBeNull();
    expect(container.querySelectorAll(".pwt-keybar .pwt-key").length).toBe(4);
  });

  it("item 5: a sector-clearing blow names no next turn, and the hold shows no turn text and no Speed or Skip", async () => {
    saveRun(lastEnemyStanding(0));
    const { container } = mount();
    expect(await finishOne(container as HTMLElement)).toBe(true);
    // The final blow itself.
    await tick(500);
    expect(card(container as HTMLElement)).not.toMatch(/next turn/i);
    expect(card(container as HTMLElement)).not.toMatch(/choose a move/i);
    // The stage holds on "Sector cleared".
    await tick(2200);
    expect(container.querySelector("[data-hold-card]")!.textContent).toBe("Sector cleared");
    const c = container as HTMLElement;
    // Round 8, item 9: the words are on the stage once; the band shows the blow's sentence and the banner keeps the round.
    expect((c.textContent!.match(/Sector cleared/g) ?? []).length).toBe(1);
    expect(card(c)).toMatch(/fell\./);
    expect(card(c)).not.toMatch(/next turn/i);
    expect(c.querySelector("[data-turn-banner]")!.textContent).not.toMatch(/Sector cleared/);
    expect(c.querySelector("[data-turn-banner]")!.textContent).not.toMatch(/choose a move|pick a cell|your turn|next turn/i);
    expect(hasTools(c)).toBe(false);
    expect(screen.queryByRole("group", { name: "Playback speed" })).toBeNull();
    await tick(2000);
    expect(screen.getByRole("dialog", { name: "Camp" })).toBeInTheDocument();
  });

  it("item 5: the Guardian's fall holds as Guardian down with the same quiet", async () => {
    saveRun(lastEnemyStanding(3));
    const { container } = mount();
    const c = container as HTMLElement;
    expect(await finishOne(c)).toBe(true);
    await tick(500);
    expect(card(c)).not.toMatch(/next turn/i);
    await tick(2200);
    expect((c.textContent!.match(/Guardian down/g) ?? []).length).toBe(1);
    expect(card(c)).toMatch(/fell\./);
    expect(c.querySelector("[data-turn-banner]")!.textContent).not.toMatch(/choose a move|pick a cell|your turn|next turn/i);
    expect(hasTools(c)).toBe(false);
  });

  it("item 5: the squad's fall names no next turn while the killing blow lands, and holds quiet", async () => {
    saveRun(lastCompanionStanding);
    const { container } = mount();
    const c = container as HTMLElement;
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Pass" }));
    });
    // Every beat of the command, the pass and the killing blows, then the hold: never a next turn.
    let held = false;
    let sawEnemy = false;
    for (let i = 0; i < 40 && !held; i++) {
      await tick(300);
      held = !!c.querySelector("[data-hold-card]");
      if (/Enemy turn/.test(card(c))) sawEnemy = true;
      expect(card(c)).not.toMatch(/next turn/i);
    }
    expect(sawEnemy).toBe(true);
    expect(held).toBe(true);
    expect((c.textContent!.match(/The squad has fallen/gi) ?? []).length).toBe(1);
    expect(card(c)).toMatch(/fell\./);
    expect(c.querySelector("[data-turn-banner]")!.textContent).not.toMatch(/choose a move|pick a cell|your turn|next turn/i);
    expect(hasTools(c)).toBe(false);
  });

  it("item 2: intent chips are not drawn while enemies act, and come back freshly committed at the settled hand-off", async () => {
    const { container } = mount();
    const c = container as HTMLElement;
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /begin/i }));
    });
    expect(c.querySelectorAll(".pwt-row.enemies .pwt-intent").length).toBeGreaterThan(0);
    expect(c.querySelectorAll(".pwt-row.enemies .pwt-intent.off").length).toBe(0);
    await useKey(c);
    // While beats play, no chip is drawn (the space is kept, so nothing moves).
    await tick(200);
    const chips = c.querySelectorAll(".pwt-row.enemies .pwt-intent");
    expect(chips.length).toBeGreaterThan(0);
    chips.forEach((chip) => expect(chip.classList.contains("off")).toBe(true));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /skip to your next turn/i }));
    });
    expect(c.querySelectorAll(".pwt-row.enemies .pwt-intent").length).toBeGreaterThan(0);
    expect(c.querySelectorAll(".pwt-row.enemies .pwt-intent.off").length).toBe(0);
  });

  it("item 4: the sector card is a line along the stage's top edge and the first-use note sits on the key bar, never over a plate", async () => {
    const { container } = mount();
    const c = container as HTMLElement;
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /begin/i }));
    });
    const stage = c.querySelector(".pwt-stage")!;
    const title = c.querySelector("[data-title-card]")!;
    expect(stage.contains(title)).toBe(true);
    expect(title.className).toContain("pwt-titlecard");
    const note = c.querySelector(".pwt-note")!;
    expect(note).toBeTruthy();
    expect(c.querySelector(".pwt-keybar")!.contains(note)).toBe(true);
    expect(stage.contains(note)).toBe(false);
    // It names its key, and that key is marked.
    expect(note.querySelector("b")!.textContent!.length).toBeGreaterThan(0);
    expect(c.querySelectorAll(".pwt-key.noted").length).toBe(1);
  });

  it("item 12: the chosen speed persists in this browser, and a blocked store does not break the control", async () => {
    const { container, unmount } = mount();
    await useKey(container as HTMLElement);
    const seg = screen.getByRole("group", { name: "Playback speed" });
    fireEvent.click(seg.querySelectorAll("button")[1]);
    expect(localStorage.getItem("xalians.powerworks.speed.v1")).toBe("2");
    unmount();
    cleanup();
    const again = mount().container as HTMLElement;
    await useKey(again);
    expect(screen.getByRole("group", { name: "Playback speed" }).querySelectorAll("button")[1].getAttribute("aria-pressed")).toBe("true");
    // Storage that throws leaves the default, and the control still works.
    cleanup();
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const blocked = mount().container as HTMLElement;
    await useKey(blocked);
    expect(screen.getByRole("group", { name: "Playback speed" }).querySelectorAll("button")[0].getAttribute("aria-pressed")).toBe("true");
    spy.mockRestore();
  });

  it("round 7, item 2: a new active companion arrives with no key hovered or chosen, and a hover waits for the pointer to move", async () => {
    const { container } = mount();
    const c = container as HTMLElement;
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /begin/i }));
    });
    const shown = () => ({
      previews: c.querySelectorAll(".pwt-stage [data-preview]").length,
      selected: c.querySelectorAll(".pwt-keybar button.pwt-key.selected").length,
      rings: c.querySelectorAll(".pwt-plate.targeted").length,
    });
    const attack = () => keys(c).find((k) => k.classList.contains("attack"))!;
    // Idle pointer: a move event with no travel changes nothing.
    fireEvent.mouseMove(attack());
    expect(shown()).toEqual({ previews: 0, selected: 0, rings: 0 });
    expect(c.querySelector("main")!.getAttribute("data-pointer")).toBe("idle");
    // Once it travels, hover applies.
    fireEvent.pointerMove(window, { clientX: 400, clientY: 500 });
    fireEvent.mouseMove(attack());
    expect(c.querySelector("main")!.getAttribute("data-pointer")).toBe("live");
    expect(shown().previews).toBeGreaterThan(0);
    const first = c.querySelector(".pwt-keybar-who")!.textContent;
    // Use the key with the pointer resting on it, then let the enemies finish: the next companion's keys
    // arrive under the same resting pointer.
    await useKey(c);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /skip to your next turn/i }));
    });
    expect(c.querySelector(".pwt-keybar-who")!.textContent).not.toBe(first);
    expect(shown()).toEqual({ previews: 0, selected: 0, rings: 0 });
    expect(c.querySelector("main")!.getAttribute("data-pointer")).toBe("idle");
    // A stray move event under the resting pointer still does nothing.
    fireEvent.mouseMove(attack());
    expect(shown()).toEqual({ previews: 0, selected: 0, rings: 0 });
  });

  it("item 12: camp names the next sector", () => {
    saveRun((s) => ({ ...s, phase: "camp" as const }));
    mount();
    const camp = screen.getByRole("dialog", { name: "Camp" });
    expect(camp.querySelector("[data-next-sector]")!.textContent).toMatch(/^Next: sector 2, /);
  });

  it("item 12: the Guide names Pass, Down, strike lines, the playing card, the Record and both color rules", () => {
    saveRun((s) => s);
    mount();
    fireEvent.click(screen.getByRole("button", { name: /guide/i }));
    const text = screen.getByRole("dialog", { name: "Guide" }).textContent!;
    expect(text).toMatch(/Pass ends a turn/);
    expect(text).toMatch(/Down:/);
    expect(text).toMatch(/the key bar shows whose turn it is and your next one/);
    expect(text).toContain("The Record (top right)");
    expect(text).toContain("Squad health: raspberry is lost, green gained.");
    expect(text).toContain("green favors you, raspberry the enemy");
    expect(text).toContain("committed next move");
    expect(text).not.toMatch(/Green is good for you/);
  });
});
