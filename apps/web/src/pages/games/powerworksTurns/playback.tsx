import React, { useEffect, useState } from "react";
import type { Beat } from "./view";

/**
  Beat choreography timing (UX pass, 2026-09-29, storyboard item 4: "about 1.4s per beat at
  1x"). `IMPACT_AT` is when the blow lands within the beat (the actor's lunge or cast
  reaches its target and the impact flash, number and health drain all start together); the
  rest of the beat is the settle. Mirrors the shape of v5's `actionPresentation`
  (`powerworksPresentation.ts`) without importing it: this page's beat model (one event per
  beat, not a whole frame) does not carry the same fields.
*/
const BEAT_MS = 1700;
const IMPACT_FRACTION = 0.35;

/** settle: the blow has landed and the beat's words stay up (a knockout collapses here); hold:
    every beat is done and the stage waits on a knockout before the panel that follows. */
export type BeatPhase = "approach" | "impact" | "settle" | "hold";

/** The settle phase starts this long after the impact (the target's recoil is done by then). */
const SETTLE_AFTER_IMPACT_MS = 500;
/** A beat that knocks a unit out lasts this much longer, so the fall is seen before anything moves. */
const KNOCKOUT_EXTRA_MS = 800;

export function beatTiming(speed: 1 | 2, reducedMotion: boolean) {
  if (reducedMotion) return { beatMs: 1, impactMs: 0 };
  const beatMs = BEAT_MS / speed;
  return { beatMs, impactMs: Math.round(beatMs * IMPACT_FRACTION) };
}

/**
  Plays the beats of a resolved command one at a time. Reports the current beat index and
  its phase (approach: actor moving toward target; impact: the blow lands, this is when the
  page lights the impact flash, the floating number and the health drain; settle: the
  beat's sentence stays up before the next beat starts) so the page can drive the actor's
  lunge/cast class and the target's impact/recoil class. Renders nothing itself: the
  storyboard's Skip control lives in the turn banner, which jumps to the next hand-off by
  setting `skip`, and Space/Enter are handled globally by the page for the same reason.
*/
export function Playback({
  beats,
  speed,
  reducedMotion,
  skip,
  knockouts,
  holdMs = 0,
  onBeat,
  onDone,
}: {
  beats: Beat[];
  /** Per beat: does it knock a unit out (its beat then runs longer). */
  knockouts?: boolean[];
  /** After the last beat, hold the stage this long (at 1x) before onDone. */
  holdMs?: number;
  speed: 1 | 2;
  reducedMotion: boolean;
  /** True to finish the whole sequence at once (the banner's Skip, or reduced motion). */
  skip: boolean;
  onBeat: (index: number, phase: BeatPhase) => void;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const { beatMs, impactMs } = beatTiming(speed, reducedMotion);

  useEffect(() => {
    if (skip || reducedMotion) {
      // Report every remaining beat's impact (so health, deltas and the record all catch up)
      // before finishing, rather than jumping straight to onDone with the last beat unseen.
      for (let i = index; i < beats.length; i++) onBeat(i, "impact");
      onDone();
      return;
    }
    if (index >= beats.length) {
      if (holdMs > 0 && beats.length > 0) {
        onBeat(beats.length - 1, "hold");
        const toDone = window.setTimeout(onDone, holdMs / speed);
        return () => window.clearTimeout(toDone);
      }
      onDone();
      return;
    }
    const thisMs = beatMs + (knockouts?.[index] ? KNOCKOUT_EXTRA_MS / speed : 0);
    onBeat(index, "approach");
    const toImpact = window.setTimeout(() => onBeat(index, "impact"), impactMs);
    const toSettle = window.setTimeout(() => onBeat(index, "settle"), Math.min(impactMs + SETTLE_AFTER_IMPACT_MS, beatMs - 50));
    const toNext = window.setTimeout(() => setIndex((i) => i + 1), thisMs);
    return () => {
      window.clearTimeout(toImpact);
      window.clearTimeout(toSettle);
      window.clearTimeout(toNext);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, beats.length, beatMs, impactMs, reducedMotion, skip, holdMs, speed]);

  return null;
}
