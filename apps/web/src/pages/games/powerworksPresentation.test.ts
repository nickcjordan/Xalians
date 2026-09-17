import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Frame } from "@xalians/rules/dungeon";
import { useBattlePresentation } from "./powerworksPresentation";

const hit: Frame = {
  team: [],
  enemies: [],
  text: "The attack lands.",
  event: { kind: "hit", actorId: "H", targetId: "M1", amount: 12 },
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("battle presentation timing", () => {
  it("holds consequences until impact and resets for the next action", () => {
    const { result, rerender } = renderHook(
      ({ frame, index }) => useBattlePresentation(frame, index, 1, false),
      { initialProps: { frame: hit, index: 1 } }
    );
    expect(result.current.impact).toBe(false);
    act(() => vi.advanceTimersByTime(499));
    expect(result.current.impact).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.impact).toBe(true);
    rerender({ frame: { ...hit, text: "A second attack lands." }, index: 2 });
    expect(result.current.impact).toBe(false);
  });

  it("scales impact timing with playback speed", () => {
    const { result } = renderHook(() =>
      useBattlePresentation(hit, 1, 2, false)
    );
    act(() => vi.advanceTimersByTime(249));
    expect(result.current.impact).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.impact).toBe(true);
  });

  it("does not rewind a revealed impact after closing inspection or resuming", () => {
    const { result, rerender } = renderHook(
      ({ paused }) => useBattlePresentation(hit, 1, 1, paused),
      { initialProps: { paused: false } }
    );
    expect(result.current.impact).toBe(false);
    rerender({ paused: true });
    expect(result.current.impact).toBe(true);
    rerender({ paused: false });
    expect(result.current.impact).toBe(true);
  });

  it("shows the complete action immediately when stepping or reducing motion", () => {
    const paused = renderHook(() => useBattlePresentation(hit, 1, 1, true));
    expect(paused.result.current.impact).toBe(true);
    paused.unmount();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const reduced = renderHook(() => useBattlePresentation(hit, 1, 1, false));
    expect(reduced.result.current.impact).toBe(true);
    expect(reduced.result.current.frameDuration).toBe(1200);
    expect(reduced.result.current.sound).toBe(false);
  });
});
