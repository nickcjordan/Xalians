import { describe, expect, it } from "vitest";
import { cellId, isPhoneLandscape, tapStep } from "./phone";

describe("phone mode", () => {
  it("is on for landscape phones and off for desktops, tablets and portrait", () => {
    for (const [w, h] of [[844, 390], [932, 430], [667, 375], [915, 412]]) expect(isPhoneLandscape(w, h)).toBe(true);
    for (const [w, h] of [[1366, 768], [1920, 1080], [1024, 768], [1280, 720], [390, 844]]) expect(isPhoneLandscape(w, h)).toBe(false);
  });

  it("identifies a cell by key and target", () => {
    expect(cellId(2, "A")).toBe("2:A");
  });

  it("previews on the first touch tap and commits on the second, on the same cell only", () => {
    expect(tapStep(true, null, "1:A")).toBe("preview");
    expect(tapStep(true, "1:A", "1:A")).toBe("commit");
    expect(tapStep(true, "1:A", "1:B")).toBe("preview");
    expect(tapStep(true, "1:A", "2:A")).toBe("preview");
  });

  it("commits at once with a mouse or keyboard", () => {
    expect(tapStep(false, null, "1:A")).toBe("commit");
  });
});
