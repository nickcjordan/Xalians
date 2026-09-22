import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import PowerworksPage from "./powerworksPage";

beforeEach(() => {
  cleanup();
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
      "Ranged attack. 5 base power. Ends conditions that answer to cooling. 1 round cooldown."
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
    expect(list).toHaveTextContent(/1AvililyYour squad82speed/);
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
  it("shows the base move name in the squad panel and keeps the full name in the title", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    // Hippochamp's compositional Impact Touch is the longest generated name on the
    // table; the squad panel label must be its base name, not the whole qualifier list.
    fireEvent.click(screen.getByRole("button", { name: "Select Hippochamp" }));
    const long = screen
      .getAllByRole("button", { name: /^Impact Touch \(/ })
      .find((b) => (b.getAttribute("aria-label") || "").includes(";"))!;
    expect(long).toBeTruthy();
    const full = long.getAttribute("aria-label")!.split(",")[0];
    expect(full).toMatch(/;/);
    fireEvent.click(long);
    fireEvent.click(
      screen.getByRole("button", { name: "Target Maintenance crawler M1" })
    );
    const label = document.querySelector(".pw-order-move")!;
    expect(label).toHaveTextContent("Impact Touch");
    // The label itself carries no qualifier list, and the full name is reachable.
    expect(label.textContent).not.toMatch(/;/);
    expect(label.getAttribute("title")).toMatch(/;/);
  });
});
