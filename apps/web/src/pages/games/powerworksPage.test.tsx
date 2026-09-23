import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import PowerworksPage from "./powerworksPage";
import { COMPANION_RECORDS, readCompanion } from "@xalians/rules/dungeon";

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
    createRun: (seed?: number) => {
      const run = mod.createRun(seed);
      if (naming.long) {
        const h = run.team.find((u) => u.species === "hippochamp")!;
        const move = h.moves.find((m) => !m.signature)!;
        move.name = LONG_NAME;
      }
      return run;
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
describe("Powerworks player flow", () => {
  it("requires the whole squad, resolves a round, and restores it after remount", () => {
    const ui = mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    expect(screen.getByRole("button", { name: "Commit round" })).toBeDisabled();
    // Seed 1 deals the squad as Hippochamp, Crystorn, Avilily, Graviclaw; each signature in turn.
    for (const move of [
      "Emergency Water Cannon",
      "Gem Radiance",
      "Blossoming Ambuscade",
      "Gravity Pincer",
    ]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(move) }));
      fireEvent.click(
        screen.getByRole("button", { name: "Target Maintenance crawler M1" })
      );
    }
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
      screen.getByRole("button", { name: "Enter the facility" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Field guide" }));
    expect(screen.getByText(/Desperate strike deals 3/)).toBeInTheDocument();
  });
  it("lets players review, change and clear a queued order with an unambiguous target", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Emergency Water Cannon, / })
    );
    expect(screen.getAllByText("8 estimated · strong")).toHaveLength(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Target Maintenance crawler M2" })
    );
    const hippo = screen.getByRole("button", { name: "Select Hippochamp" });
    expect(hippo).toHaveAccessibleDescription(
      /Emergency Water Cannon.*Crawler 2/
    );
    fireEvent.click(hippo);
    expect(hippo).toHaveAttribute("title", "Emergency Water Cannon → Crawler 2");
    fireEvent.click(screen.getByRole("button", { name: /Clear/ }));
    expect(hippo).toHaveAccessibleDescription("Choose a move");
    expect(screen.getByRole("button", { name: "Commit round" })).toBeDisabled();
  });
  it("explains visual move stats without repeating power and range text on cards", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    const attack = screen.getByRole("button", {
      name: /Emergency Water Cannon,/,
    });
    expect(attack).toHaveAccessibleDescription(
      "Ranged attack. 5 base power. Ends conditions that answer to cooling, on a squadmate or an enemy. 1 round cooldown."
    );
    expect(attack.querySelector(".pw-card-identity")).not.toHaveTextContent(
      /power|ranged/
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Explain move symbols" })
    );
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
    // real condition on a real companion, which the inspector must then explain.
    // Seed 1 deals the squad Hippochamp, Crystorn, Avilily, Graviclaw.
    for (const move of [
      "Emergency Water Cannon",
      "Gem Radiance",
      "Blossoming Ambuscade",
      "Ground Anchor",
    ]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(move) }));
      fireEvent.click(
        screen.getByRole("button", { name: "Target Maintenance crawler M1" })
      );
    }
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
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    // Seed 1 opens on Hippochamp. The cannon carries a cooling removal, so it may name a
    // squadmate as well as an enemy; Water Sweep only harms, so it names enemies only.
    fireEvent.click(
      screen.getByRole("button", { name: /Emergency Water Cannon, / })
    );
    for (const mate of ["Crystorn", "Avilily", "Graviclaw"])
      expect(
        screen.getByRole("button", { name: `Target ${mate} (squadmate)` })
      ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Target Hippochamp (squadmate)" })
    ).toBeNull();
    // Nothing on Crystorn answers to cooling yet, and the preview says so.
    expect(screen.getAllByText("nothing to clear").length).toBe(3);
    expect(
      screen.getByText("Choose an enemy or a squadmate")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Water Sweep, / }));
    expect(
      screen.queryByRole("button", { name: "Target Crystorn (squadmate)" })
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /Emergency Water Cannon, / })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Target Crystorn (squadmate)" })
    );
    const hippo = screen.getByRole("button", { name: "Select Hippochamp" });
    expect(hippo).toHaveAccessibleDescription(/Emergency Water Cannon.*Crystorn/);
    // Plan the rest of the squad and commit: the record says the cannon found nothing on
    // Crystorn, and it dealt her no damage.
    for (const move of ["Gem Radiance", "Blossoming Ambuscade", "Gravity Pincer"]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(move) }));
      fireEvent.click(
        screen.getByRole("button", { name: "Target Maintenance crawler M1" })
      );
    }
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
  it("shows the base move name in the squad panel and keeps the full name in the title", () => {
    naming.long = true;
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    // A compositional name is the longest a move can carry; the squad panel label must
    // be its base name, not the whole qualifier list.
    fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
    const long = screen
      .getAllByRole("button", { name: /^Piercing Shot \(/ })
      .find((b) => (b.getAttribute("aria-label") || "").includes(";"))!;
    expect(long).toBeTruthy();
    const full = long.getAttribute("aria-label")!.split(",")[0];
    expect(full).toMatch(/;/);
    fireEvent.click(long);
    fireEvent.click(
      screen.getByRole("button", { name: "Target Maintenance crawler M1" })
    );
    const label = document.querySelector(".pw-order-move")!;
    expect(label).toHaveTextContent("Piercing Shot");
    expect(label.textContent).not.toContain("(");
    // The label itself carries no qualifier list, and the full name is reachable.
    expect(label.textContent).not.toMatch(/;/);
    expect(label.getAttribute("title")).toMatch(/;/);
  });
});
