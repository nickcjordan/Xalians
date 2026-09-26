import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import PowerworksPage, { consoleScale } from "./powerworksPage";
import { kindWords } from "./powerworksVisuals";
import {
  COMPANION_KEYS,
  COMPANION_RECORDS,
  LIKELIHOOD_PERCENT,
  SAVE_VERSION,
  asMove,
  command,
  createRun,
  damagePreview,
  draftOffer,
  legalMoves,
  legalTargets,
  moveAt,
  openRun,
  readCompanion,
  resolveRound,
  restoreRun,
  usable,
  type Command,
  type Order,
  type Run,
} from "@xalians/rules/dungeon";
import { CHARGE_TIP } from "./powerworksRadial";

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
  chosen move would do there ("Target Maintenance crawler M1: 8 damage, 17 to 9, strong").
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
/** What a card shows at rest: its text without the tooltips and screen-reader lines. */
function shownText(el: Element) {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll(".pw-mark-tip, .pw-sr").forEach((n) => n.remove());
  return copy.textContent ?? "";
}
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
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
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
  it("plays a round in the planning stage's place: the controls take Commit's place in the bottom bar and the banner names the beat", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    planAll({
      Hippochamp: "Emergency Water Cannon",
      Crystorn: "Gem Radiance",
      Avilily: "Blossoming Ambuscade",
      Graviclaw: "Gravity Pincer",
    });
    const shell = document.querySelector(".pw-battle-shell")!;
    // The stage and the bottom bar, and nothing else: the stage takes whatever the bar leaves.
    const layout = () =>
      [...shell.children].map((el) => `${el.tagName}.${el.classList[0]}`);
    const planningLayout = layout();
    expect(planningLayout).toEqual(["SECTION.pw-theater", "FOOTER.pw-commit"]);
    fireEvent.click(screen.getByRole("button", { name: "Commit round" }));
    // Playback adds nothing under the stage, so the stage keeps its planning size.
    expect(layout()).toEqual(planningLayout);
    expect(document.querySelector(".pw-command")).toBeNull();
    expect(screen.queryByRole("button", { name: "Commit round" })).toBeNull();
    const controls = screen.getByRole("group", { name: "Round playback" });
    expect(controls.closest(".pw-commit")).not.toBeNull();
    for (const name of ["Pause playback", "Next action", "Playback speed 1x", "Show round result"])
      expect(controls).toContainElement(screen.getByRole("button", { name }));
    // The banner on the stage is the one place the beat is named.
    const banner = () => document.querySelector(".pw-theater > .pw-action-banner");
    expect(banner()).not.toBeNull();
    expect(banner()!.querySelector(".pw-action-banner-line")).not.toBeNull();
    expect(document.querySelectorAll(".pw-action-banner")).toHaveLength(1);
    // Pausing, stepping and changing speed keep their names and their place.
    fireEvent.click(screen.getByRole("button", { name: "Pause playback" }));
    expect(screen.getByRole("button", { name: "Resume playback" })).toBeInTheDocument();
    expect(document.querySelector(".pw-commit")).toHaveTextContent(/Paused · Action 1 of \d+/);
    fireEvent.click(screen.getByRole("button", { name: "Next action" }));
    expect(document.querySelector(".pw-commit")).toHaveTextContent(/Action 2 of \d+/);
    expect(banner()).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Playback speed 1x" }));
    expect(screen.getByRole("button", { name: "Playback speed 2x" })).toBeInTheDocument();
    expect(layout()).toEqual(planningLayout);
    // The round result: the bar is Commit's again.
    fireEvent.click(screen.getByRole("button", { name: "Show round result" }));
    expect(layout()).toEqual(planningLayout);
    expect(screen.getByRole("button", { name: "Commit round" })).toBeInTheDocument();
    expect(banner()).toBeNull();
  });
  it("recovers from an invalid save and explains the temporary exhaustion rule", () => {
    localStorage.setItem("xalians.powerworks.v1", "{broken");
    mount();
    expect(
      screen.getByRole("button", { name: /Enter the facility/ })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Field guide" }));
    expect(screen.getByText(/Desperate strike deals 3/)).toBeInTheDocument();
  });
  it("orders on the stage: select, choose by key, target, back out with Escape, reopen from the chip", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
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
        new RegExp(`^Target Maintenance crawler ${id}: [0-9]+ damage, [0-9]+ to [0-9]+, strong$`)
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
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Crystorn" }));
    const menu = screen.getByRole("menu", { name: "Crystorn's moves" });
    const slots = screen.getAllByRole("menuitem");
    expect(slots).toHaveLength(4);
    expect(slots[0]).toHaveAccessibleName(
      /^Crystorn: Gem Radiance, signature, light, power \d+, ready$/
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
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
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
    // Round 3: the card shows marks; its full reading is its accessible description.
    expect(moveCard()).toHaveAccessibleDescription(/^Melee attack that closes in\./);
    expect(shownText(moveCard()!.querySelector(".pw-radial-card-body")!)).not.toMatch(/Melee|power/);
    expect(moveCard()).toHaveTextContent("Choose an enemy");
    vi.unstubAllGlobals();
    Object.defineProperty(window, "PointerEvent", { value: undefined, configurable: true });
  });
  it("sets the order at once for a move that acts only on its user", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
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
  it("draws every move's worth in health, and each machine's next blow with the part the orders stop (move value pass)", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
    // Each legal disc carries a value bar; the cannon takes health, so its bar is red.
    const cannon = screen.getByRole("menuitem", { name: /^Hippochamp: Emergency Water Cannon/ });
    expect(cannon.querySelector(".pw-value .harm")).not.toBeNull();
    expect(cannon).toHaveAccessibleDescription(/Best use this round: takes [0-9]+ health/);
    // Each machine shows its next blow; nothing is stopped before an order that stops it.
    const threats = screen.getAllByRole("img", { name: /^Threat: about [0-9]+ health$/ });
    expect(threats).toHaveLength(2);
    // Avilily's bind would stop part of a crawler's blow: hovering it lays gold on the threat.
    fireEvent.click(screen.getByRole("button", { name: "Select Avilily" }));
    const bind = screen.getByRole("menuitem", { name: /^Avilily: Binding/ });
    expect(bind.querySelector(".pw-value .saved")).not.toBeNull();
    fireEvent.pointerEnter(bind, { pointerType: "mouse" });
    expect(
      screen.getAllByRole("img", { name: /^Threat: about [0-9]+ health, [0-9]+ stopped$/ }).length
    ).toBeGreaterThan(0);
  });
  it("explains visual move stats without repeating power and range text on cards", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
    const attack = screen.getByRole("menuitem", {
      name: /^Hippochamp: Emergency Water Cannon, signature, water, power 5, ready$/,
    });
    // The move value pass adds its best use this round, in health, to the description.
    expect(attack).toHaveAccessibleDescription(
      /^Ranged attack\. 5 base power\. Cools: ends Overheated and Burning\. 1 round cooldown\. Best use this round: takes [0-9]+ health\.$/
    );
    expect(attack.querySelector(".pw-radial-label")).not.toHaveTextContent(
      /power|ranged/
    );
    // Round 2: the power waits for the card, which also says how long the move rests.
    expect(attack.querySelector(".pw-radial-disc")!.textContent).toBe("");
    expect(attack.querySelector(".pw-radial-label")).toHaveTextContent("Emergency Water Cannon");
    expect(attack.querySelector(".pw-radial-power")).toBeNull();
    fireEvent.click(attack);
    // Round 3: no power on the card (each target carries its own outcome); how long it
    // rests is a pip with its tooltip, and once per encounter is the crown's tooltip.
    const body = moveCard()!.querySelector(".pw-radial-card-body")!;
    expect(shownText(body)).not.toMatch(/power|Rests|once per encounter|Ranged/);
    const rest = moveCard()!.querySelector<HTMLElement>(".pw-mark.rest")!;
    expect(rest.querySelectorAll("i")).toHaveLength(1);
    expect(rest).toHaveAccessibleName("Rests 1 round");
    expect(rest).toHaveAccessibleDescription("Unavailable for 1 round after use.");
    expect(moveCard()!.querySelector(".pw-mark.signature")).toHaveAccessibleDescription(
      "Signature: usable once per encounter."
    );
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
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    fireEvent.click(screen.getByRole("button", { name: "View turn order" }));
    const list = document.querySelector<HTMLElement>(".pw-turn-list")!;
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
  it("shows the turn order in the bottom bar, marks set orders, and selects a companion from it (layout pass)", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    const strip = screen.getByRole("list", { name: "Turn order" });
    const turns = Array.from(strip.querySelectorAll("button")).map((b) => b.getAttribute("aria-label"));
    // The same order the turn order panel reads: the fastest companion first, every
    // standing unit once, and every companion still waiting for its order.
    expect(turns[0]).toMatch(/^Turn 1: Avilily, needs an order$/);
    expect(turns).toHaveLength(6);
    expect(turns.filter((t) => /needs an order/.test(t ?? ""))).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: /^Turn \d: Hippochamp/ }));
    expect(screen.getByRole("button", { name: "Select Hippochamp" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });
  it("draws the play screen larger on a large landscape screen and never smaller (layout pass)", () => {
    expect(consoleScale(1280, 720)).toBe(1);
    expect(consoleScale(1920, 1080)).toBe(1.5);
    expect(consoleScale(2560, 1440)).toBe(2);
    // The smaller ratio wins, so the whole composition fits: a tall screen grows by width.
    expect(consoleScale(1920, 1200)).toBe(1.5);
    expect(consoleScale(3440, 1440)).toBe(2);
    expect(consoleScale(1024, 768)).toBe(1);
    expect(consoleScale(390, 844)).toBe(1);
  });
  it("offers squadmates as targets for a helpful move and previews what lands on them (pass 5)", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
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
    // The prompt names only sides with a target the move would do something for (round 3
    // review): every squadmate here is a non-target, so it asks for an enemy.
    expect(moveCard()!.querySelector(".pw-radial-card-target")).toHaveTextContent(/^Choose an enemy$/);
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
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
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

  describe("round 2: what a disc shows, choosing one, and the outcome on the creatures", () => {
    /** The starter run as the page deals it, to read the rules' own preview numbers. */
    const starterRun = () => createRun(1);

    it("rests each disc at its icon, name and signature rim; only an unavailable one carries a reason", () => {
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
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
      // Round 3 review: the signature wears a crown badge on its rim, not only a gold rim.
      expect(cannon.querySelector(".pw-radial-crown svg")).toHaveClass("lucide-crown");
      expect(document.querySelectorAll(".pw-radial-crown")).toHaveLength(1);
      // The signature shows what kind of move it is (a ranged strike); its gold rim alone
      // marks it, and no disc wears a crown or a kind-colored rim.
      expect(cannon.querySelector(".pw-radial-disc svg")).toHaveClass("lucide-crosshair");
      expect(document.querySelector(".pw-radial-disc .lucide-crown")).toBeNull();
      fireEvent.click(cannon);
      expect(moveCard()!.querySelector(".pw-radial-card-head .pw-mark.signature.badge")).toHaveAccessibleDescription(
        "Signature: usable once per encounter."
      );
      fireEvent.keyDown(window, { key: "Escape" });
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
      fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /^Hippochamp: Water Sweep/ }));
      // The wheel is gone from the accessibility tree; the card names the chosen move.
      expect(screen.queryByRole("menu")).toBeNull();
      const card = screen.getByRole("group", { name: "Hippochamp: Water Sweep, chosen" });
      const body = card.querySelector(".pw-radial-card-body")!;
      // Round 3: the card is the name in its element's frame, an icon row, the target line.
      expect(card).toHaveClass("elemental", "el-water");
      expect(shownText(body)).not.toMatch(/Chosen move|power|Reaches|Use every round|Melee/);
      const marks = [...card.querySelectorAll<HTMLElement>(".pw-mark")];
      expect(marks.map((m) => m.textContent)).toEqual(["Water", "Slowed 75%"]);
      // Each mark keeps its full sentence as its tooltip and description.
      expect(marks[1]).toHaveAccessibleDescription("75% chance: Slowed, half speed for 2 opportunities.");
      expect(marks[0]).toHaveAccessibleDescription(/^Water harm to everyone it reaches\./);
      // A move usable every round shows no rest pips; the full reading stays on the card.
      expect(card.querySelector(".pw-mark.rest")).toBeNull();
      expect(card).toHaveAccessibleDescription(/Reaches the target and the next enemy in line\./);
      expect(card).toHaveTextContent("Choose an enemy");
      // The other discs have folded back: hidden, and out of the tab order.
      const folded = document.querySelectorAll(".pw-radial-slot");
      expect([...folded].every((b) => (b as HTMLButtonElement).tabIndex === -1)).toBe(true);
      expect(document.querySelector(".pw-radial-slot.held")).toHaveTextContent("Water Sweep");
      // The back control returns to the wheel; choosing again reopens the card.
      const back = screen.getByRole("button", { name: "Back to moves" });
      expect(back).toHaveTextContent("");
      fireEvent.click(back);
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
      fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
      expect(ringOwner()).toBe("Avilily");
      expect(document.querySelectorAll(".pw-radial-key")).toHaveLength(0);
      fireEvent.keyDown(window, { key: "ArrowRight" });
      const keys = [...document.querySelectorAll(".pw-radial-key")].map((k) => k.textContent);
      expect(keys).toEqual(["1", "2", "3", "4"]);
      // A modifier alone is not keyboard use.
      cleanup();
      localStorage.clear();
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
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
      fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /^Hippochamp: Water Sweep/ }));
      const target = targetButton("Target Maintenance crawler M1");
      expect(target).toHaveAccessibleName(
        `Target Maintenance crawler M1: ${hit} damage, ${m1.hp} to ${m1.hp - hit}, strong, slowed ${slowed}% chance`
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
      fireEvent.pointerEnter(target, { pointerType: "mouse" });
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
        `Crawler 1: ${hit} damage, ${m1.hp} to ${m1.hp - hit}`
      );
      fireEvent.pointerLeave(target, { pointerType: "mouse" });
      expect(moveCard()).toHaveTextContent("Choose an enemy");
    });

    it("reads a heal as a touch, not an attack", () => {
      // The first offer carrying a Sonalloy with a heal (the seed moves whenever the offer's
      // filter or the harm curve does).
      const withHeal = (seed: number) =>
        draftOffer(seed).find(
          (e) =>
            e.species === "sonalloy" &&
            e.unit.moves.some((m) => m.effects.some((x) => x.support === "restore"))
        );
      let seed = 1;
      while (seed < 200 && !withHeal(seed)) seed++;
      const healer = withHeal(seed);
      expect(healer).toBeDefined();
      const heal = healer!.unit.moves.find((m) => m.effects.some((e) => e.support === "restore"))!;
      expect(kindWords(heal)).toMatch(/^(Touch|At range)$/);
    });

    it("marks a pull with an arrow on the target and names it", () => {
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
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
      fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
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

    it("animates when motion is allowed: the wheel folds, the disc grows into the card and collapses into the chip, the stage holds still", async () => {
      vi.stubGlobal("matchMedia", () => ({ matches: false }));
      const animate = vi.fn((_frames: Keyframe[], _options?: KeyframeAnimationOptions) => ({
        cancel() {},
        finished: Promise.resolve(),
      }));
      Element.prototype.animate = animate as unknown as Element["animate"];
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
      const stage = screen.getByRole("region", { name: "Battlefield" });
      expect(stage).toHaveAttribute("data-motion", "full");
      const layer = stage.querySelector<HTMLElement>(".pw-stage-zoom")!;
      // Round 3: planning holds the stage still, whoever is selected.
      expect(layer.style.transform).toBe("");
      expect(layer.dataset.camera).toBe("rest");
      // Moving to Hippochamp: Avilily's wheel stays a moment to fold back into her.
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      expect(layer.style.transform).toBe("");
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

  describe("round 3: element on the move, hover previews, the trimmed card, the guardian's discharge", () => {
    /**
      A save at the guardian's sector: the starter squad plays each room with its hardest
      hitting move on the weakest enemy, reviving and advancing at each camp.
    */
    function guardianSave() {
      let run: Run = openRun(1);
      const history: Command[] = [];
      const act = (c: Command) => {
        run = command(run, c);
        history.push(c);
      };
      act({ kind: "draft", squad: "starter" });
      for (let guard = 0; guard < 200 && run.room < 3; guard++) {
        if (run.phase === "camp") {
          const down = run.team.find((u) => u.hp <= 0);
          if (down && run.revival) act({ kind: "revive", id: down.id });
          act({ kind: "advance" });
          continue;
        }
        const orders: Record<string, Order> = {};
        for (const u of run.team.filter((t) => t.hp > 0)) {
          const moves = legalMoves(u, run);
          if (!moves.length) {
            orders[u.id] = { move: -2, target: "" };
            continue;
          }
          const harm = moves.find((i) =>
            moveAt(u, i).effects.some((e) => e.support === "harm") &&
            legalTargets(run, u, i).some((t) => t.enemy)
          );
          const i = harm ?? moves[0];
          const target = [...legalTargets(run, u, i)].sort((a, b) => a.hp - b.hp)[0];
          orders[u.id] = { move: i, target: target?.id ?? "" };
        }
        run = resolveRound(run, orders).state;
        history.push({ kind: "round", orders });
      }
      expect(run.room).toBe(3);
      expect(run.phase).toBe("planning");
      return JSON.stringify({ version: SAVE_VERSION, seed: 1, history });
    }

    it("dresses an elemental disc in its element and leaves a physical one steel", () => {
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      const slot = (name: string) => screen.getByRole("menuitem", { name: new RegExp(`^Hippochamp: ${name}`) });
      expect(slot("Water Sweep")).toHaveClass("elemental", "el-water");
      expect(slot("Emergency Water Cannon")).toHaveClass("signature", "elemental", "el-water");
      expect(slot("Repelling Slam")).toHaveClass("physical");
      expect(slot("Repelling Slam")).not.toHaveClass("elemental");
      // A charged move carries the charge mark on its disc, and its icon still reads as a strike.
      expect(slot("Crushing Kick").querySelector(".pw-radial-charge")).not.toBeNull();
      expect(slot("Crushing Kick").querySelector(".pw-radial-disc svg")).toHaveClass("lucide-swords");
      // Its rest pips wait on its rim until the disc is lifted; a move usable every round has none.
      expect(slot("Crushing Kick").querySelectorAll(".pw-radial-rest i")).toHaveLength(2);
      expect(slot("Water Sweep").querySelector(".pw-radial-rest")).toBeNull();
    });

    it("previews a hovered disc faintly on its targets, with matchup chevrons, and clears it when the pointer leaves", () => {
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      const cannon = screen.getByRole("menuitem", { name: /^Hippochamp: Emergency Water Cannon/ });
      expect(document.querySelector(".pw-scene-unit.hinted")).toBeNull();
      fireEvent.pointerEnter(cannon);
      for (const id of ["M1", "M2"]) {
        const unit = document.querySelector(`[data-unit="${id}"]`)!;
        expect(unit).toHaveClass("hinted");
        expect(unit.querySelector(".pw-target-ring.faint")).not.toBeNull();
        expect(unit.querySelector(".pw-health.faint .pw-hp-chunk")).not.toBeNull();
        // Water against the sand crawlers: strong, said in words on the mark's tooltip.
        expect(unit.querySelector(".pw-matchup.strong")).toHaveAttribute("title", "Strong: water against sand");
      }
      // The wheel stays open and nothing became a target.
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(document.querySelectorAll(".pw-scene-character.valid-target")).toHaveLength(0);
      fireEvent.pointerLeave(cannon);
      expect(document.querySelector(".pw-scene-unit.hinted, .pw-target-ring.faint, .pw-matchup")).toBeNull();
      // An unavailable disc previews nothing.
      fireEvent.pointerEnter(screen.getByRole("menuitem", { name: /^Hippochamp: Water Sweep/ }));
      expect(document.querySelectorAll(".pw-scene-unit.hinted")).toHaveLength(2);
      fireEvent.pointerLeave(screen.getByRole("menuitem", { name: /^Hippochamp: Water Sweep/ }));
      // The chosen move keeps its chevrons on each target, beside the outcome.
      fireEvent.click(cannon);
      expect(document.querySelector('[data-unit="M1"] .pw-matchup.strong')).not.toBeNull();
      expect(document.querySelector(".pw-scene-unit.hinted")).toBeNull();
    });

    it("trims the card of a charged move that rests two rounds to its marks, its charge line and its pips", () => {
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      fireEvent.click(screen.getByRole("menuitem", { name: /^Hippochamp: Crushing Kick/ }));
      const card = moveCard()!;
      expect(card).toHaveClass("physical");
      expect(card.querySelector(".pw-radial-card-head strong")).toHaveTextContent(/^Crushing Kick$/);
      // What using it costs closes the row: the rest pips.
      expect(card.querySelector(".pw-radial-marks .pw-mark.rest.cost")).not.toBeNull();
      expect(card.querySelector(".pw-mark.harm")).toHaveTextContent("Harm");
      expect(card.querySelector(".pw-mark.harm")).toHaveAccessibleDescription(
        /^Compression harm\. Physical, so it lands the same on every element\./
      );
      const rest = card.querySelector<HTMLElement>(".pw-mark.rest")!;
      expect(rest.querySelectorAll("i")).toHaveLength(2);
      expect(rest).toHaveAccessibleDescription("Unavailable for 2 rounds after use.");
      const charge = card.querySelector<HTMLElement>(".pw-mark.charge")!;
      expect(charge).toHaveTextContent("Lands next round");
      expect(charge).toHaveAccessibleDescription(CHARGE_TIP);
      expect(CHARGE_TIP).toMatch(/pull or a bind/);
      // Every mark takes focus, so its tooltip is reachable from the keyboard.
      for (const mark of card.querySelectorAll<HTMLElement>(".pw-mark")) expect(mark.tabIndex).toBe(0);
      // The removed lines stay reachable in the card's description.
      expect(card).toHaveAccessibleDescription(/Charges first, releases at its next opportunity\. 2 round cooldown\./);
      expect(shownText(card.querySelector(".pw-radial-card-body")!)).not.toMatch(/power|Melee|Rests|Chosen/);
    });

    it("marks the guardian's discharge on a contact strike, with its damage against the companion acting", () => {
      const raw = guardianSave();
      const state = restoreRun(raw).state;
      const hippo = state.team.find((u) => u.id === "H")!;
      const guardian = state.enemies.find((u) => u.species === "guardian")!;
      const discharge = guardian.passives.find((p) => p.trigger === "contact")!;
      const shock = damagePreview(guardian, asMove(discharge), hippo);
      expect(shock).toBeGreaterThan(0);
      localStorage.setItem("xalians.powerworks.v1", raw);
      mount();
      // Three defenders: the room opens a floor band for the move card while planning.
      expect(screen.getByRole("region", { name: "Battlefield" })).toHaveClass("planning", "crowded");
      fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
      const kick = screen.getByRole("menuitem", { name: /^Hippochamp: Crushing Kick/ });
      // Hovering a contact strike already shows what touching the guardian costs.
      fireEvent.pointerEnter(kick);
      const unit = document.querySelector(`[data-unit="${guardian.id}"]`)!;
      expect(unit.querySelector(".pw-shock-mark")).toHaveTextContent(`shocks back−${shock}`);
      fireEvent.pointerLeave(kick);
      fireEvent.click(kick);
      expect(unit.querySelector(".pw-shock-mark")).toHaveTextContent(`shocks back−${shock}`);
      expect(targetButton(`Target ${guardian.name} ${guardian.id}`)).toHaveAccessibleName(
        new RegExp(`shocks back ${shock} damage to Hippochamp$`)
      );
      // Aiming at it puts the discharge on the card's one line.
      fireEvent.pointerEnter(targetButton(`Target ${guardian.name} ${guardian.id}`), { pointerType: "mouse" });
      expect(moveCard()!.querySelector(".pw-radial-card-target")).toHaveTextContent(`; shocks back ${shock}`);
      // A ranged strike does not touch it: no mark.
      fireEvent.keyDown(window, { key: "Escape" });
      fireEvent.click(screen.getByRole("menuitem", { name: /^Hippochamp: Emergency Water Cannon/ }));
      expect(unit.querySelector(".pw-shock-mark")).toBeNull();
    });
  });
});