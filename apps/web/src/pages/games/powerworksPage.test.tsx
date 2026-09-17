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
    for (const move of [
      "Hydrostatic Lance",
      "Coronet of the Twin Suns",
      "Blossoming Ambuscade",
      "Claw compression",
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
    expect(screen.getByRole("log")).toHaveTextContent("redirects");
    ui.unmount();
    mount();
    expect(screen.getByText("Round 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Combat record" }));
    expect(screen.getByRole("log")).toHaveTextContent("Hydrostatic Lance");
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
    fireEvent.click(screen.getByRole("button", { name: /Water stream, / }));
    expect(screen.getAllByText("12 est. damage · strong")).toHaveLength(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Target Maintenance crawler M2" })
    );
    const hippo = screen.getByRole("button", { name: "Select Hippochamp" });
    expect(hippo).toHaveAccessibleDescription(/Crawler 2.*Water stream/);
    fireEvent.click(hippo);
    expect(screen.getByText("Water stream → Crawler 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Clear/ }));
    expect(hippo).toHaveAccessibleDescription("Choose a move");
    expect(screen.getByRole("button", { name: "Commit round" })).toBeDisabled();
  });
  it("explains visual move stats without repeating power and range text on cards", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Enter the facility" }));
    const attack = screen.getByRole("button", { name: /Water stream,/ });
    expect(attack).toHaveAccessibleDescription("Ranged attack. 8 base power.");
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
});
