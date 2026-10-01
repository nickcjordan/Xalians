import { describe, expect, it } from "vitest";
import { isPhoneLandscape, keyPressStep } from "./phone";

describe("phone mode", () => {
  it("is on for landscape phones and off for desktops, tablets and portrait", () => {
    for (const [w, h] of [[844, 390], [932, 430], [667, 375], [915, 412]]) expect(isPhoneLandscape(w, h)).toBe(true);
    for (const [w, h] of [[1366, 768], [1920, 1080], [1024, 768], [1280, 720], [390, 844]]) expect(isPhoneLandscape(w, h)).toBe(false);
  });

  it("selects a key that needs a target and unselects it on the next press", () => {
    expect(keyPressStep(false, null, 1, false)).toBe("select");
    expect(keyPressStep(false, 1, 1, false)).toBe("unselect");
    expect(keyPressStep(false, 0, 1, false)).toBe("select");
    expect(keyPressStep(true, null, 1, false)).toBe("select");
  });

  it("acts at once on a mouse or keyboard when the key needs no target", () => {
    expect(keyPressStep(false, null, 2, true)).toBe("act");
    expect(keyPressStep(false, 2, 2, true)).toBe("act");
  });

  it("selects on the first touch tap and acts on the second, on the same key only", () => {
    expect(keyPressStep(true, null, 2, true)).toBe("select");
    expect(keyPressStep(true, 2, 2, true)).toBe("act");
    expect(keyPressStep(true, 1, 2, true)).toBe("select");
  });
});
