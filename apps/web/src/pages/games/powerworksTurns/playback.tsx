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

export type BeatPhase = "approach" | "impact" | "settle";

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
  onBeat,
  onDone,
}: {
  beats: Beat[];
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
      onDone();
      return;
    }
    onBeat(index, "approach");
    const toImpact = window.setTimeout(() => onBeat(index, "impact"), impactMs);
    const toNext = window.setTimeout(() => setIndex((i) => i + 1), beatMs);
    return () => {
      window.clearTimeout(toImpact);
      window.clearTimeout(toNext);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, beats.length, beatMs, impactMs, reducedMotion, skip]);

  return null;
}
