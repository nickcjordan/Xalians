import React from "react";
import { Check } from "lucide-react";
import { Portrait } from "../powerworksVisuals";
import type { StripSlot } from "./view";

/**
  Acted-vs-upcoming was unreadable at a glance (blind readers, paint review round 4, item
  5): a "done" slot is now much dimmer with a small check mark, "now" and "next" both read
  fully bright (the point is what is still to come, not a distinction between them), and a
  thin divider sits between the last acted slot and the first upcoming one.
*/
export function TurnStrip({ round, strip }: { round: number; strip: StripSlot[] }) {
  const lastDoneIndex = strip.reduce((last, s, i) => (s.state === "done" ? i : last), -1);
  return (
    <div className="pwt-strip">
      <span className="pwt-strip-round">Round {round}</span>
      <ol className="pwt-strip-slots" aria-label="This round">
        {strip.map((s, i) => (
          <li
            key={s.id}
            className={`pwt-strip-slot ${s.state} ${i === lastDoneIndex ? "divider-after" : ""}`}
            title={`${s.enemy && s.letter ? `${s.letter}: ` : ""}${s.name}${
              s.state === "down" ? " (down)" : s.state === "now" ? " (now)" : s.state === "done" ? " (acted)" : ""
            }`}
          >
            {/* The letter sits outside the dimmed wrapper: it stays legible on a
                done/next slot rather than fading with the portrait (paint review round 3,
                item 4). */}
            {s.enemy && s.letter && <span className="pwt-strip-letter">{s.letter}</span>}
            <span className="pwt-strip-portrait">
              <Portrait u={{ species: s.art, element: s.element }} small />
            </span>
            {s.state === "done" && (
              <span className="pwt-strip-check" aria-hidden="true">
                <Check />
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
