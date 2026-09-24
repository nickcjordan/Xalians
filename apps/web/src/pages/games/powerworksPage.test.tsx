import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import PowerworksPage from "./powerworksPage";
import { PowerworksDraft } from "./powerworksDraft";
import { kindWords } from "./powerworksVisuals";
import {
  COMPANION_KEYS,
  COMPANION_RECORDS,
  LIKELIHOOD_PERCENT,
  createRun,
  damagePreview,
  draftOffer,
  readCompanion,
  usable,
} from "@xalians/rules/dungeon";

/*
  The generator's naming guardrail no longer produces compositional names such as
  "Impact Touch (Contact Range; Targeted; ...)", so the one test about them gives
  Hippochamp such a name itself. Every other test sees the real release untouched.
*/
const LONG_NAME =
  "Piercing Shot (Medium Range; Targeted; Brief Preparation; Repeatable Recovery; Discrete)";
const naming = vi.hoisted(() => ({ long: false }));
vi.mock("@xalians/rules/dungeon", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@xalians/rules/dungeon")>();
  return {
    ...mod,
    // Since pass 6 a run's squad arrives through the draft command (contract decision 48).
    command: (run: import("@xalians/rules/dungeon").Run, action: import("@xalians/rules/dungeon").Command) => {
      const next = mod.command(run, action);
      if (naming.long && action.kind === "draft") {
        const h = next.team.find((u) => u.species === "hippochamp")!;
        const move = h.moves.find((m) => !m.signature)!;
        move.name = LONG_NAME;
      }
      return next;
    },
  };
});

beforeEach(() => {
  cleanup();
  naming.long = false;
  localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
const mount = () =>
  render(
    <MemoryRouter>
      <PowerworksPage />
    </MemoryRouter>
  );
/** The open ring's companion, from its menu's name ("Avilily's moves"). */
const ringOwner = () =>
  screen.queryByRole("menu")?.getAttribute("aria-label")?.replace(/'s moves$/, "") ?? null;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/**
  A target button by the start of its name: since round 2 the name goes on to say what the
  chosen move would do there ("Target Maintenance crawler M1: 8 damage, 22 to 14, strong").
*/
const targetButton = (name: string) =>
  screen.getByRole("button", { name: new RegExp(`^${escape(name)}(:|$)`) });
/** Choose a move from the open ring by its slot's name, then a target when one is asked for. */
function order(move: string, target: string | null = "Target Maintenance crawler M1") {
  const who = ringOwner();
  fireEvent.click(
    screen.getByRole("menuitem", { name: new RegExp(`^${who}: ${move}`) })
  );
  if (target) fireEvent.click(targetButton(target));
}
/** The chosen move's card, once its disc has expanded (round 2). */
const moveCard = () => document.querySelector<HTMLElement>(".pw-radial-card.open");
/**
  Plan the whole squad as the rings open in speed order (radial orders decision 6): each
  companion's move is named, with an optional target (null for a move on its user).
*/
function planAll(moves: Record<string, [string, string | null] | string>) {
  for (let guard = 0; guard < 6 && ringOwner(); guard++) {
    const plan = moves[ringOwner()!];
    const [move, target] =
      typeof plan === "string" ? [plan, "Target Maintenance crawler M1"] : plan;
    order(move, target);
  }
}
describe("Powerworks player flow", () => {
  it("requires the whole squad, resolves a round, and restores it after remount", () => {
    const ui = mount();
    fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
    expect(screen.getByRole("button", { name: "Commit round" })).toBeDisabled();
    // Seed 1 deals Hippochamp, Crystorn, Avilily, Graviclaw. The rings open in speed order,
    // fastest first, and each order moves on to the next companion without one.
    const opened: string[] = [];
    for (const move of [
      "Blossoming Ambuscade",
      "Emergency Water Cannon",
      "Gravity Pincer",
      "Gem Radiance",
    ]) {
      opened.push(ringOwner()!);
      order(move);
    }
    expect(opened).toEqual(["Avilily", "Hippochamp", "Graviclaw", "Crystorn"]);
    // With every order set, nothing is selected and the commit bar reads ready.
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByText("Squad ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Commit round" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Commit round" }));
    fireEvent.click(screen.getByRole("button", { name: "Show round result" }));
    expect(screen.getByText("Round 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Combat record" }));
    expect(screen.getByRole("log")).toHaveTextContent("paralyzed");
    ui.unmount();
    mount();
    expect(screen.getByText("Round 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Combat record" }));
    expect(screen.getByRole("log")).toHaveTextContent("Emergency Water Cannon");
  });
  it("recovers from an invalid save and explains the temporary exhaustion rule", () => {
    localStorage.setItem("xalians.powerworks.v1", "{broken");
    mount();
    expect(
      screen.getByRole("button", { name: /Draft a squad/ })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Field guide" }));
    expect(screen.getByText(/Desperate strike deals 3/)).toBeInTheDocument();
  });
  it("orders on the stage: select, choose by key, target, back out with Escape, reopen from the chip", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
    // The move tray and the squad row are gone: the stage is the only place orders are given.
    expect(document.querySelector(".pw-moves, .pw-squad, .pw-command-head")).toBeNull();
    expect(screen.queryByRole("region", { name: "Your squad" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Move selection" })).toBeNull();
    // The round opens on the fastest companion; Escape closes its ring and selects nothing.
    expect(ringOwner()).toBe("Avilily");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    const hippo = screen.getByRole("button", { name: "Select Hippochamp" });
    expect(hippo).toHaveAttribute("aria-haspopup", "menu");
    expect(hippo).toHaveAttribute("aria-expanded", "false");
    expect(hippo).toHaveAccessibleDescription("No order");
    // Selecting a companion opens its ring over it.
    fireEvent.click(hippo);
    expect(hippo).toHaveAttribute("aria-expanded", "true");
    expect(ringOwner()).toBe("Hippochamp");
    // Key 1 chooses the first slot, Emergency Water Cannon: its disc becomes the move card,
    // and each target says in its name what the cannon would do there.
    fireEvent.keyDown(window, { key: "1" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(
      screen.getByRole("group", { name: "Hippochamp: Emergency Water Cannon, chosen" })
    ).toBeInTheDocument();
    for (const id of ["M1", "M2"])
      expect(targetButton(`Target Maintenance crawler ${id}`)).toHaveAccessibleName(
        `Target Maintenance crawler ${id}: 8 damage, 22 to 14, strong`
      );
    // Escape backs out one step, to the ring.
    fireEvent.keyDown(window, { key: "Escape" });
    expect(ringOwner()).toBe("Hippochamp");
    expect(moveCard()).toBeNull();
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.click(targetButton("Target Maintenance crawler M2"));
    expect(hippo).toHaveAccessibleDescription(
      "Emergency Water Cannon → Crawler 2"
    );
    // The chip on its plaque says so, and the next companion in speed order opens.
    const chip = screen.getByRole("button", {
      name: "Change Hippochamp's order: Emergency Water Cannon → Crawler 2",
    });
    expect(chip).toHaveTextContent("Emergency Water Cannon");
    expect(chip).toHaveTextContent("Crawler 2");
    expect(ringOwner()).toBe("Avilily");
    // The chip reopens Hippochamp's ring with its order marked.
    fireEvent.click(chip);
    expect(ringOwner()).toBe("Hippochamp");
    expect(
      screen.getByRole("menuitem", { name: /^Hippochamp: Emergency Water Cannon/ })
    ).toHaveAttribute("aria-current", "true");
    // From the keyboard, Enter on the open companion keeps its ring (focus moves into it);
    // a click on the same companion closes its menu, and so does a click on empty stage.
    fireEvent.click(hippo);
    expect(ringOwner()).toBe("Hippochamp");
    fireEvent.click(hippo, { detail: 1 });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Select Crystorn" }));
    expect(ringOwner()).toBe("Crystorn");
    fireEvent.click(screen.getByRole("region", { name: "Battlefield" }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "Commit round" })).toBeDisabled();
  });
  it("names the ring as a menu of slots and moves between companions with Tab", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Crystorn" }));
    const menu = screen.getByRole("menu", { name: "Crystorn's moves" });
    const slots = screen.getAllByRole("menuitem");
    expect(slots).toHaveLength(4);
    expect(slots[0]).toHaveAccessibleName(
      /^Crystorn: Gem Radiance, signature, power \d+, ready$/
    );
    expect(slots[3]).toHaveAccessibleName(/^Crystorn: Heavy Ram, power \d+, ready$/);
    // One slot takes Tab focus at a time; the arrows move between them.
    expect(slots.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    fireEvent.keyDown(slots[0], { key: "ArrowRight" });
    expect(slots[1]).toHaveAttribute("tabindex", "0");
    // Tab and Shift+Tab move to the next and previous companion.
    fireEvent.keyDown(menu, { key: "Tab" });
    expect(ringOwner()).toBe("Avilily");
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Tab", shiftKey: true });
    expect(ringOwner()).toBe("Crystorn");
  });
  it("arms a slot on the first tap and chooses it on the second (touch)", () => {
    // jsdom has no PointerEvent, so a pointer's type would be lost; give it the one field read.
    class TouchPointer extends MouseEvent {
      pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerType = init.pointerType ?? "mouse";
      }
    }
    vi.stubGlobal("PointerEvent", TouchPointer);
    Object.defineProperty(window, "PointerEvent", { value: TouchPointer, configurable: true });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Crystorn" }));
    const ram = screen.getByRole("menuitem", { name: /^Crystorn: Heavy Ram/ });
    fireEvent.pointerDown(ram, { pointerType: "touch" });
    fireEvent.click(ram, { detail: 1 });
    // The first tap lifts the disc and arms it (round 2: no card yet); it asks for a second.
    expect(ringOwner()).toBe("Crystorn");
    expect(ram).toHaveClass("armed");
    expect(ram.querySelector(".pw-radial-label")).toHaveTextContent("Tap again");
    expect(moveCard()).toBeNull();
    // The second tap chooses it: the disc expands into its card, with the full reading.
    fireEvent.pointerDown(ram, { pointerType: "touch" });
    fireEvent.click(ram, { detail: 1 });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(moveCard()).toHaveTextContent("Heavy Ram");
    expect(moveCard()).toHaveTextContent("Melee attack that closes in.");
    expect(moveCard()).toHaveTextContent("Choose an enemy");
    vi.unstubAllGlobals();
    Object.defineProperty(window, "PointerEvent", { value: undefined, configurable: true });
  });
  it("sets the order at once for a move that acts only on its user", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Graviclaw" }));
    // A guard on itself has no power; its name says what it does instead.
    const anchor = screen.getByRole("menuitem", { name: /^Graviclaw: Ground Anchor/ });
    expect(anchor).toHaveAccessibleName(/protected on itself/);
    // Every disc carries its name underneath.
    expect(
      screen.getAllByRole("menuitem").map((m) => m.querySelector(".pw-radial-label")!.textContent)
    ).toEqual(["Gravity Pincer", "Gravity Draw", "Ground Anchor", "Slashing Pinch"]);
    // A mouse click chooses a slot at once (only touch arms first).
    fireEvent.click(
      screen.getByRole("menuitem", { name: /^Graviclaw: Ground Anchor/ }),
      { detail: 1 }
    );
    expect(
      screen.getByRole("button", { name: "Select Graviclaw" })
    ).toHaveAccessibleDescription("Ground Anchor → itself");
    expect(document.querySelector('[data-intent="G"]')).toBeNull();
    // Auto-advance went on to the fastest companion still without an order.
    expect(ringOwner()).toBe("Avilily");
  });
  it("explains visual move stats without repeating power and range text on cards", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
    const attack = screen.getByRole("menuitem", {
      name: /^Hippochamp: Emergency Water Cannon, signature, power 5, ready$/,
    });
    expect(attack).toHaveAccessibleDescription(
      "Ranged attack. 5 base power. Cools: ends Overheated and Burning. 1 round cooldown."
    );
    expect(attack.querySelector(".pw-radial-label")).not.toHaveTextContent(
      /power|ranged/
    );
    // Round 2: the power waits for the card, which also says how long the move rests.
    expect(attack.querySelector(".pw-radial-disc")!.textContent).toBe("");
    expect(attack.querySelector(".pw-radial-label")).toHaveTextContent("Emergency Water Cannon");
    expect(attack.querySelector(".pw-radial-power")).toBeNull();
    fireEvent.click(attack);
    expect(moveCard()).toHaveTextContent(/5\s*power/);
    expect(moveCard()).toHaveTextContent("Rests 1 round after use · once per encounter");
    fireEvent.click(screen.getByRole("button", { name: "Field guide" }));
    expect(screen.getByLabelText("Move symbol key")).toHaveTextContent(
      "Base power"
    );
    expect(screen.getByLabelText("Move symbol key")).toHaveTextContent(
      "Melee attack"
    );
  });
  it("lists each condition on a companion with its plain-language rule in the inspector", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
    // Graviclaw's Ground Anchor is the squad's one guarding status; playing it puts a
    // real condition on a real companion, which the inspector must then explain. It acts
    // on its user, so it takes no target.
    planAll({
      Hippochamp: "Emergency Water Cannon",
      Crystorn: "Gem Radiance",
      Avilily: "Blossoming Ambuscade",
      Graviclaw: ["Ground Anchor", null],
    });
    fireEvent.click(screen.getByRole("button", { name: "Commit round" }));
    fireEvent.click(screen.getByRole("button", { name: "Show round result" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect Graviclaw on battlefield" })
    );
    const rules = document.querySelector(".pw-condition-rules")!;
    expect(rules).toHaveTextContent("protected");
    expect(rules).toHaveTextContent(/Immune to being moved/);
    expect(rules.querySelector(".group-guarding")).toBeTruthy();
  });
  it("separates public initiative from hidden decisions and makes the route discoverable", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
    fireEvent.click(screen.getByRole("button", { name: "View turn order" }));
    const list = screen.getByRole("list");
    // The fastest companion leads the public order, with the speed its record reads.
    const avilily = readCompanion(COMPANION_RECORDS.avilily, "A");
    expect(list).toHaveTextContent(
      new RegExp(`1AvililyYour squad${avilily.speed}speed`)
    );
    expect(list).not.toHaveTextContent(/Tool strike|target/i);
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Service entrance: current sector" })
    );
    expect(
      screen.getByRole("heading", { name: "Expedition route" })
    ).toBeInTheDocument();
    expect(screen.getByText("You are here")).toBeInTheDocument();
  });
  it("offers squadmates as targets for a helpful move and previews what lands on them (pass 5)", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
    // The cannon carries a cooling removal, so it may name a squadmate as well as an
    // enemy; Water Sweep only harms, so it names enemies only.
    fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
    order("Emergency Water Cannon", null);
    for (const mate of ["Crystorn", "Avilily", "Graviclaw"])
      expect(targetButton(`Target ${mate} (squadmate)`)).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Target Hippochamp (squadmate)" })
    ).toBeNull();
    // Nothing on a squadmate answers to cooling yet: each is drawn dimmed like a non-target,
    // with no label, and its target name says why (round 2 review).
    expect(screen.queryByText("nothing to clear")).toBeNull();
    for (const [mate, id] of [["Crystorn", "C"], ["Avilily", "A"], ["Graviclaw", "G"]]) {
      expect(document.querySelector(`[data-unit="${id}"]`)).toHaveClass("ineligible");
      expect(document.querySelector(`[data-unit="${id}"] .pw-target-ring`)).toBeNull();
      expect(targetButton(`Target ${mate} (squadmate)`)).toHaveAccessibleName(
        `Target ${mate} (squadmate): nothing to clear`
      );
    }
    expect(
      screen.getByText("Choose an enemy or a squadmate")
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    order("Water Sweep", null);
    expect(
      screen.queryByRole("button", { name: /^Target Crystorn \(squadmate\)/ })
    ).toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    order("Emergency Water Cannon", "Target Crystorn (squadmate)");
    const hippo = screen.getByRole("button", { name: "Select Hippochamp" });
    expect(hippo).toHaveAccessibleDescription(/Emergency Water Cannon.*Crystorn/);
    // Plan the rest of the squad and commit: the record says the cannon found nothing on
    // Crystorn, and it dealt her no damage.
    planAll({
      Crystorn: "Gem Radiance",
      Avilily: "Blossoming Ambuscade",
      Graviclaw: "Gravity Pincer",
    });
    fireEvent.click(screen.getByRole("button", { name: "Commit round" }));
    fireEvent.click(screen.getByRole("button", { name: "Show round result" }));
    fireEvent.click(screen.getByRole("button", { name: "Combat record" }));
    expect(screen.getByRole("log")).toHaveTextContent(
      "Hippochamp uses Emergency Water Cannon: nothing on Crystorn answers to it."
    );
    expect(screen.getByRole("log")).not.toHaveTextContent(
      "Emergency Water Cannon on Crystorn"
    );
  });
  it("shows the base move name on a slot and the plaque chip and keeps the full name reachable", () => {
    naming.long = true;
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
    // A compositional name is the longest a move can carry; the ring slot and the plaque
    // chip must show its base name, not the whole qualifier list.
    fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
    const long = screen.getByRole("menuitem", { name: /^Hippochamp: Piercing Shot \(/ });
    expect(long.getAttribute("aria-label")).toMatch(/;/);
    expect(long.querySelector(".pw-radial-label")).toHaveTextContent("Piercing Shot");
    expect(long.querySelector(".pw-radial-label")!.textContent).not.toContain("(");
    fireEvent.click(long);
    fireEvent.click(targetButton("Target Maintenance crawler M1"));
    const label = document.querySelector('[data-unit="H"] .pw-order-chip-move')!;
    expect(label).toHaveTextContent("Piercing Shot");
    expect(label.textContent).not.toContain("(");
    // The label itself carries no qualifier list, and the full name is reachable.
    expect(label.textContent).not.toMatch(/;/);
    expect(label.closest("button")!.getAttribute("title")).toMatch(/;/);
  });
  it("drafts four of eight generated creatures and plays the run with them (pass 6)", () => {
    const ui = mount();
    fireEvent.click(screen.getByRole("button", { name: /Draft a squad/ }));
    const offer = draftOffer(1);
    expect(screen.getAllByRole("button", { name: /^Pick / })).toHaveLength(8);
    const enter = screen.getByRole("button", { name: /Enter the facility/ });
    expect(enter).toBeDisabled();
    // Four species outside the starter squad, so the game must draw drafted creatures.
    const starter: readonly string[] = COMPANION_KEYS;
    const chosen = offer.filter((e) => !starter.includes(e.species)).slice(0, 4);
    expect(chosen).toHaveLength(4);
    for (const e of chosen)
      fireEvent.click(screen.getByRole("button", { name: `Pick ${e.unit.name}` }));
    expect(enter).toBeEnabled();
    // A fifth pick waits for a swap.
    const other = offer.find((e) => !chosen.includes(e))!;
    const fifth = screen.getByRole("button", { name: `Pick ${other.unit.name}` });
    expect(fifth).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(fifth);
    expect(fifth).toHaveAttribute("aria-pressed", "false");
    expect(enter).toBeEnabled();
    fireEvent.click(enter);
    for (const e of chosen)
      expect(screen.getByRole("button", { name: `Select ${e.unit.name}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Commit round" })).toBeDisabled();
    // The drafted run is saved from its draft command and restored after a remount.
    ui.unmount();
    mount();
    for (const e of chosen)
      expect(screen.getByRole("button", { name: `Select ${e.unit.name}` })).toBeInTheDocument();
    const save = JSON.parse(localStorage.getItem("xalians.powerworks.v1")!);
    expect(save.version).toBe(6);
    expect(save.history[0]).toEqual({
      kind: "draft",
      squad: chosen.map((e) => e.index).sort((a, b) => a - b),
    });
  });
  it("shows each offered creature as the game reads it and marks an unsupported action plainly", () => {
    // Find a seed whose offer carries an action the game cannot resolve (Smokat's Smoke Dispersal).
    let seed = 1;
    while (!draftOffer(seed).some((e) => e.unit.moves.some((m) => !usable(m)))) seed++;
    const offer = draftOffer(seed);
    render(
      <MemoryRouter>
        <PowerworksDraft seed={seed} onBack={() => {}} onEnter={() => {}} />
      </MemoryRouter>
    );
    expect(document.querySelector('[data-tier="chrome"]')).toBeTruthy();
    for (const e of offer) {
      const card = screen.getByRole("heading", { name: e.unit.name }).closest("[data-slot=card]")!;
      expect(card).toHaveTextContent(`HP ${e.unit.max}`);
      expect(card).toHaveTextContent(`Speed ${e.unit.speed}`);
      expect(card).toHaveTextContent(e.unit.element);
      expect(card.querySelectorAll("ul li")).toHaveLength(4);
    }
    expect(screen.getAllByText("No effect here").length).toBeGreaterThan(0);
  });

  describe("round 2: what a disc shows, choosing one, and the outcome on the creatures", () => {
    /** The starter run as the page deals it, to read the rules' own preview numbers. */
    const starterRun = () => createRun(1);

    it("rests each disc at its icon, name and signature rim; only an unavailable one carries a reason", () => {
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      const slots = screen.getAllByRole("menuitem");
      for (const slot of slots) {
        // Icon and name only: no power badge, no bind count, no cooldown pips, no keycap.
        expect(slot.querySelector(".pw-radial-disc svg")).not.toBeNull();
        expect(slot.querySelector(".pw-radial-label")!.textContent).not.toBe("");
        expect(slot.querySelector(".pw-radial-power, .pw-card-charges, .pw-radial-key")).toBeNull();
        expect(slot.querySelector(".pw-radial-tag")).toBeNull();
      }
      const cannon = screen.getByRole("menuitem", { name: /^Hippochamp: Emergency Water Cannon/ });
      expect(cannon).toHaveClass("signature");
      // The signature shows what kind of move it is (a ranged strike); its gold rim alone
      // marks it, and no disc wears a crown or a kind-colored rim.
      expect(cannon.querySelector(".pw-radial-disc svg")).toHaveClass("lucide-crosshair");
      expect(document.querySelector(".pw-radial-disc .lucide-crown")).toBeNull();
      expect(document.querySelector(".pw-radial-slot.control, .pw-radial-slot.ward")).toBeNull();
      expect(
        screen.getByRole("menuitem", { name: /^Hippochamp: Repelling Slam/ }).querySelector(".pw-radial-disc svg")
      ).toHaveClass("lucide-magnet");
      expect(slots.filter((s) => s.classList.contains("signature"))).toHaveLength(1);
      // After a round in which Hippochamp slams, its slam cools: dimmed, with its one reason.
      planAll({
        Avilily: "Blossoming Ambuscade",
        Hippochamp: "Repelling Slam",
        Graviclaw: "Gravity Pincer",
        Crystorn: "Gem Radiance",
      });
      fireEvent.click(screen.getByRole("button", { name: "Commit round" }));
      fireEvent.click(screen.getByRole("button", { name: "Show round result" }));
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      const slam = screen.getByRole("menuitem", { name: /^Hippochamp: Repelling Slam/ });
      expect(slam).toHaveClass("dim");
      expect(slam).toHaveAttribute("aria-disabled", "true");
      expect(slam.querySelector(".pw-radial-tag")).toHaveTextContent("cooling 1");
      expect(
        screen.getByRole("menuitem", { name: /^Hippochamp: Emergency Water Cannon/ })
      ).not.toHaveClass("dim");
    });

    it("expands the chosen disc into its move card, which stays through targeting; Back and Escape return to the wheel", () => {
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /^Hippochamp: Water Sweep/ }));
      // The wheel is gone from the accessibility tree; the card names the chosen move.
      expect(screen.queryByRole("menu")).toBeNull();
      const card = screen.getByRole("group", { name: "Hippochamp: Water Sweep, chosen" });
      expect(card).toHaveTextContent("Chosen move");
      expect(card).toHaveTextContent(/\d+\s*power/);
      expect(card).toHaveTextContent("Reaches the target and the next enemy in line.");
      // The status has its own line, chance first, never clipped.
      expect(
        [...card.querySelectorAll(".pw-radial-card-effect")].map((p) => p.textContent)
      ).toEqual(["75% chance: Slowed, half speed for 2 opportunities."]);
      expect(card).toHaveTextContent("Use every round");
      expect(card).toHaveTextContent("Choose an enemy");
      // The other discs have folded back: hidden, and out of the tab order.
      const folded = document.querySelectorAll(".pw-radial-slot");
      expect([...folded].every((b) => (b as HTMLButtonElement).tabIndex === -1)).toBe(true);
      expect(document.querySelector(".pw-radial-slot.held")).toHaveTextContent("Water Sweep");
      // The back control returns to the wheel; choosing again reopens the card.
      fireEvent.click(screen.getByRole("button", { name: "Back to Hippochamp's moves" }));
      expect(ringOwner()).toBe("Hippochamp");
      expect(moveCard()).toBeNull();
      fireEvent.click(screen.getByRole("menuitem", { name: /^Hippochamp: Water Sweep/ }));
      expect(moveCard()).not.toBeNull();
      // Escape does the same, and a second Escape closes the wheel.
      fireEvent.keyDown(window, { key: "Escape" });
      expect(ringOwner()).toBe("Hippochamp");
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("menu")).toBeNull();
      expect(moveCard()).toBeNull();
    });

    it("shows hotkeys only after the keyboard has been used, and hides them after a touch", () => {
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
      expect(ringOwner()).toBe("Avilily");
      expect(document.querySelectorAll(".pw-radial-key")).toHaveLength(0);
      fireEvent.keyDown(window, { key: "ArrowRight" });
      const keys = [...document.querySelectorAll(".pw-radial-key")].map((k) => k.textContent);
      expect(keys).toEqual(["1", "2", "3", "4"]);
      // A modifier alone is not keyboard use.
      cleanup();
      localStorage.clear();
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
      fireEvent.keyDown(window, { key: "Shift" });
      expect(document.querySelectorAll(".pw-radial-key")).toHaveLength(0);
      fireEvent.keyDown(window, { key: "Tab" });
      expect(document.querySelectorAll(".pw-radial-key")).toHaveLength(4);
      // A touch puts the pointer back in charge.
      const touch = new Event("pointerdown") as Event & { pointerType: string };
      touch.pointerType = "touch";
      act(() => {
        window.dispatchEvent(touch);
      });
      expect(document.querySelectorAll(".pw-radial-key")).toHaveLength(0);
    });

    it("draws the move's outcome on the creatures, says it in each target's name, and adds the aimed target's line to the card", () => {
      const run = starterRun();
      const hippo = run.team.find((u) => u.id === "H")!;
      const sweep = hippo.moves.find((m) => m.name === "Water Sweep")!;
      const [m1] = run.enemies;
      const hit = damagePreview(hippo, sweep, m1);
      const slowed = LIKELIHOOD_PERCENT[sweep.effects.find((e) => e.status === "slowed")!.likelihood];
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /^Hippochamp: Water Sweep/ }));
      const target = targetButton("Target Maintenance crawler M1");
      expect(target).toHaveAccessibleName(
        `Target Maintenance crawler M1: ${hit} damage, 22 to ${22 - hit}, strong, slowed ${slowed}% chance`
      );
      // On the creature: a target ring, the chunk and its number on the health bar, the
      // status ghost with its chance. The squad, which the sweep cannot name, is dimmed.
      const unit = document.querySelector('[data-unit="M1"]')!;
      expect(unit).toHaveClass("targetable");
      expect(unit.querySelector(".pw-target-ring")).not.toBeNull();
      expect(unit.querySelector(".pw-hp-chunk")).not.toBeNull();
      expect(unit.querySelector(".pw-hp-delta")).toHaveTextContent(`−${hit}`);
      expect(unit.querySelector(".pw-status-badge.ghost")).toHaveTextContent(`slowed${slowed}%`);
      for (const id of ["C", "A", "G"])
        expect(document.querySelector(`[data-unit="${id}"]`)).toHaveClass("ineligible");
      expect(document.querySelector('[data-unit="H"]')).not.toHaveClass("ineligible");
      // Aiming at Crawler 1: it rises, the intent line runs to it, the sweep's area marks
      // Crawler 2 with its own chunk, and the card gains the one line for Crawler 1.
      fireEvent.mouseEnter(target);
      expect(unit).toHaveClass("aimed");
      expect(document.querySelector('.pw-aim-path[data-aim="M1"]')).not.toBeNull();
      const m2 = document.querySelector('[data-unit="M2"]')!;
      expect(m2).toHaveClass("reached");
      expect(m2.querySelector(".pw-target-ring.area")).not.toBeNull();
      expect(m2.querySelector(".pw-hp-delta")).not.toBeNull();
      expect(targetButton("Target Maintenance crawler M1")).toHaveAccessibleName(
        /, also reaches Crawler 2$/
      );
      expect(moveCard()!.querySelector(".pw-radial-card-target")).toHaveTextContent(
        `Crawler 1: ${hit} damage, 22 to ${22 - hit}`
      );
      fireEvent.mouseLeave(target);
      expect(moveCard()).toHaveTextContent("Choose an enemy");
    });

    it("reads a heal as a touch, not an attack", () => {
      const seed = 3;
      const offer = draftOffer(seed);
      const healer = offer.find((e) => e.species === "sonalloy");
      expect(healer).toBeDefined();
      const heal = healer!.unit.moves.find((m) => m.effects.some((e) => e.support === "restore"))!;
      expect(kindWords(heal)).toMatch(/^(Touch|At range)$/);
    });

    it("marks a pull with an arrow on the target and names it", () => {
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
      fireEvent.click(screen.getByRole("button", { name: "Select Graviclaw" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /^Graviclaw: Gravity Draw/ }));
      expect(document.querySelectorAll(".pw-pull-arrow")).toHaveLength(2);
      expect(targetButton("Target Maintenance crawler M1")).toHaveAccessibleName(
        /pulled off its footing/
      );
    });

    it("is instant under reduced motion: no leaving wheel, no animations, no camera transition", () => {
      const animate = vi.fn();
      Element.prototype.animate = animate as unknown as Element["animate"];
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
      const stage = screen.getByRole("region", { name: "Battlefield" });
      expect(stage).toHaveAttribute("data-motion", "reduced");
      const layer = stage.querySelector<HTMLElement>(".pw-stage-zoom")!;
      expect(layer.style.transition).toBe("none");
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      // The wheel that closed is simply gone; nothing folds.
      expect(document.querySelectorAll("[data-radial]")).toHaveLength(1);
      expect(document.querySelector(".pw-radial.folding")).toBeNull();
      order("Water Sweep");
      expect(document.querySelector(".pw-radial-card")).toBeNull();
      expect(document.querySelector(".pw-target-flash, .pw-order-chip.just-set")).toBeNull();
      expect(animate).not.toHaveBeenCalled();
      delete (Element.prototype as { animate?: unknown }).animate;
    });

    it("animates when motion is allowed: the wheel folds, the disc grows into the card and collapses into the chip, the camera eases", async () => {
      vi.stubGlobal("matchMedia", () => ({ matches: false }));
      const animate = vi.fn((_frames: Keyframe[], _options?: KeyframeAnimationOptions) => ({
        cancel() {},
        finished: Promise.resolve(),
      }));
      Element.prototype.animate = animate as unknown as Element["animate"];
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Take the starter squad" }));
      const stage = screen.getByRole("region", { name: "Battlefield" });
      expect(stage).toHaveAttribute("data-motion", "full");
      expect(stage.querySelector<HTMLElement>(".pw-stage-zoom")!.style.transition).toMatch(
        /^transform 240ms/
      );
      // Moving to Hippochamp: Avilily's wheel stays a moment to fold back into her.
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      expect(document.querySelector('.pw-radial.folding[data-radial="A"]')).not.toBeNull();
      expect(ringOwner()).toBe("Hippochamp");
      // Choosing: the disc grows into the card (its outline and its emblem animate).
      fireEvent.click(screen.getByRole("menuitem", { name: /^Hippochamp: Water Sweep/ }));
      const grow = animate.mock.calls.find(([frames]) =>
        frames.some((f) => typeof f.clipPath === "string")
      );
      expect(grow).toBeDefined();
      // Confirming: the target ring flashes once, the chip lights, the card collapses, and
      // Hippochamp's wheel never comes back: its discs are hidden at once.
      fireEvent.click(targetButton("Target Maintenance crawler M1"));
      expect(document.querySelector('[data-unit="M1"] .pw-target-flash')).not.toBeNull();
      expect(document.querySelector('[data-unit="H"] .pw-order-chip')).toHaveClass("just-set");
      expect(document.querySelector('.pw-radial-card.leaving')).not.toBeNull();
      expect(document.querySelector('.pw-radial.locked[data-radial="H"]')).not.toBeNull();
      // The next companion's wheel waits until the collapse has finished.
      expect(screen.queryByRole("menu")).toBeNull();
      // Every animation the wheel runs is short: about 120 to 250 ms.
      const durations = animate.mock.calls.map(([, o]) => Number(o?.duration));
      expect(durations.length).toBeGreaterThan(0);
      expect(durations.every((d) => d >= 120 && d <= 250)).toBe(true);
      // The leaving wheel removes itself once its exit has run.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 300));
      });
      expect(document.querySelector(".pw-radial-card.leaving")).toBeNull();
      expect(document.querySelectorAll("[data-radial]")).toHaveLength(1);
      expect(ringOwner()).toBe("Avilily");
      delete (Element.prototype as { animate?: unknown }).animate;
    });
  });
});
