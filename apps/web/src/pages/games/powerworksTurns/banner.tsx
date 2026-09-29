import React, { useEffect, useRef, useState } from "react";
import { Gauge, SkipForward } from "lucide-react";
import type { EnemyView, SquadView } from "./view";

/**
  Turn banner (UX pass, 2026-09-29): "Whose turn is it? Is it mine?" in the top bar, in the
  largest type on the screen after the stage. "Your turn" reads in the accent (the one
  forward action), an enemy's turn in neutral ink. It slides on every change of actor and
  the round change shows in the key bar's hand-off card instead. The line under it is the beat being played, or,
  on your turn, what happened since your last turn (it opens the Record). `data-turn-banner`
  and `data-side` are the harness's hooks.
*/
export function TurnBanner({
  actorSide,
  actorName,
  actorLetter,
  line,
  lineIsSince,
  onOpenRecord,
  round,
}: {
  actorSide: "squad" | "enemy";
  actorName: string;
  actorLetter?: string;
  /** The current beat's sentence during playback; the "since your last turn" summary otherwise. */
  line: string;
  lineIsSince: boolean;
  onOpenRecord: () => void;
  round: number;
}) {
  const kicker = actorSide === "squad" ? "Your turn" : "Enemy turn";
  const who = `${actorName}${actorSide === "enemy" && actorLetter ? ` ${actorLetter}` : ""}`;
  const label = `${kicker} ${who}`;
  // The slide plays when the actor changes, never on a beat within the same actor's turn.
  const [slideKey, setSlideKey] = useState(label);
  const prevLabel = useRef(label);
  useEffect(() => {
    if (prevLabel.current === label) return;
    prevLabel.current = label;
    setSlideKey(label);
  }, [label]);

  return (
    <div className={`pwt-banner ${actorSide}`} data-turn-banner="" data-side={actorSide} aria-live="polite">
      <p className="pwt-banner-label" key={slideKey}>
        <span className="pwt-banner-kicker">
          <span className="pwt-banner-round">Round {round}</span> · {kicker}
        </span>
        <span className="pwt-banner-who">{who}</span>
      </p>
      {line ? (
        lineIsSince ? (
          <button type="button" className="pwt-banner-line since" onClick={onOpenRecord} title="Open the full record">
            <span className="pwt-banner-line-label">Since your last turn</span> {line}
          </button>
        ) : (
          <p className="pwt-banner-line">{line}</p>
        )
      ) : (
        <p className="pwt-banner-line empty">{actorSide === "squad" ? "Choose a move, then a target." : ""}</p>
      )}
    </div>
  );
}

/** Playback speed and skip, beside the banner. Skip jumps to your next turn, never past it. */
export function PlaybackTools({
  speed,
  onSpeedToggle,
  onSkip,
  skipDisabled,
}: {
  speed: 1 | 2;
  onSpeedToggle: () => void;
  onSkip: () => void;
  skipDisabled: boolean;
}) {
  return (
    <div className="pwt-playtools">
      <button
        type="button"
        onClick={onSpeedToggle}
        aria-label={speed === 1 ? "Switch to 2x speed" : "Switch to 1x speed"}
        title={speed === 1 ? "Playback at 1x. Click for 2x." : "Playback at 2x. Click for 1x."}
      >
        <Gauge /> {speed}x
      </button>
      <button type="button" onClick={onSkip} disabled={skipDisabled} aria-label="Skip to your next turn" title="Skip to your next turn">
        <SkipForward /> Skip
      </button>
    </div>
  );
}

/** A "-7" or "+5" delta chip on a plate whose health changed since the player's previous
    turn (storyboard item "what just happened"). `data-delta` is the harness's stable hook. */
export function DeltaChip({ n }: { n: number }) {
  if (!n) return null;
  const heal = n > 0;
  return (
    <span className={`pwt-delta ${heal ? "heal" : "hurt"}`} data-delta={n} aria-label={`${heal ? "gained" : "lost"} ${Math.abs(n)} health since your last turn`}>
      {heal ? "+" : "-"}
      {Math.abs(n)}
    </span>
  );
}

/** The floor ring and head pointer that mark the spotlit actor (storyboard item "whose turn
    is it"). Purely decorative (aria-hidden); the plate itself carries the real label. */
export function SpotlightMarks() {
  return (
    <>
      <span className="pwt-spot-ring" aria-hidden="true" />
      <span className="pwt-spot-pointer" aria-hidden="true" />
    </>
  );
}

export type ActorLite = Pick<SquadView, "id" | "name"> | (Pick<EnemyView, "id" | "name" | "letter">);
