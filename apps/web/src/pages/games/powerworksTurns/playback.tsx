import React, { useEffect } from "react";
import { SkipForward } from "lucide-react";
import type { Beat } from "./view";

const BEAT_MS = 700;

/**
  Plays the beats of a resolved command one at a time (docs contract: "about 700 ms each,
  the actor's plate lights, the target shows a floating number, the caption line reads the
  beat's words"). Space, Enter or Skip finishes at once. `onBeat` reports the current beat
  index up so the page can light the actor's plate and float the number on the target.
*/
export function Playback({
  beats,
  onBeat,
  onDone,
}: {
  beats: Beat[];
  onBeat: (index: number) => void;
  onDone: () => void;
}) {
  const [index, setIndex] = React.useState(0);

  useEffect(() => {
    onBeat(index);
    if (index >= beats.length) {
      onDone();
      return;
    }
    const t = window.setTimeout(() => setIndex((i) => i + 1), BEAT_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, beats.length]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onDone();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beat = beats[Math.min(index, beats.length - 1)];
  if (!beat) return null;
  return (
    <div className="pwt-playback">
      <div className="pwt-caption">
        <p>{beat.words}</p>
        <button type="button" onClick={onDone}>
          <SkipForward /> Skip
        </button>
      </div>
    </div>
  );
}
