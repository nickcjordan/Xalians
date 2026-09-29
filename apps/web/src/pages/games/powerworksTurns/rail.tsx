import React from "react";
import { Check, Skull } from "lucide-react";
import { Portrait } from "../powerworksVisuals";
import type { RailSlot } from "./view";

/** How many acted slots stay on the rail before NOW: enough to see who just went. */
const DONE_SHOWN = 8;

/**
  The turn rail (UX pass, 2026-09-29, "what happens next"): one time axis, left to right,
  one column per turn. Enemies sit above the track and the squad hangs below it, the same
  sides as the stage, so a column's side reads at a glance. NOW is the largest slot, NEXT is
  named in the empty half of its column, acted slots are checked and faded, and a divider
  marks where the next round starts. `data-rail`, `data-slot` and `data-state` are the
  harness's hooks.
*/
export function TurnRail({ rail, round }: { rail: RailSlot[]; round: number }) {
  if (!rail.length) return null;
  const now = rail.findIndex((r) => r.state === "now");
  const from = now < 0 ? 0 : Math.max(0, now - DONE_SHOWN);
  // A fallen unit leaves the order: its plate already says Down.
  const shown = rail.slice(from).filter((r) => r.state !== "down");
  return (
    <ol className="pwt-rail" data-rail="" aria-label="Turn order">
      <span className="pwt-rail-track" aria-hidden="true" />
      <li className="pwt-rail-round" aria-label={`Round ${round}`}>
        <span>Round {round}</span>
      </li>
      {shown.map((r, i) => (
        <React.Fragment key={`${r.id}-${i}`}>
          {r.roundStart !== undefined && (
            <li className="pwt-rail-divider" aria-label={`Round ${r.roundStart} starts`}>
              <span>Round {r.roundStart}</span>
            </li>
          )}
          <RailColumn slot={r} />
        </React.Fragment>
      ))}
    </ol>
  );
}

function RailColumn({ slot }: { slot: RailSlot }) {
  const tag = slot.state === "now" ? "Now" : slot.state === "next" ? "Next" : "";
  const title = `${slot.enemy && slot.letter ? `${slot.letter} ` : ""}${slot.name}${
    slot.state === "now" ? ", acting now" : slot.state === "next" ? ", acts next" : slot.state === "done" ? ", has acted" : slot.state === "down" ? ", down" : ""
  }`;
  return (
    <li
      className={`pwt-rail-col ${slot.enemy ? "enemy" : "squad"} ${slot.state}`}
      data-slot={slot.id}
      data-state={slot.state}
      title={title}
      aria-label={title}
    >
      <span className="pwt-rail-slot">
        <span className="pwt-rail-portrait">
          <Portrait u={{ species: slot.art, element: slot.element }} small />
        </span>
        {slot.enemy && slot.letter && <span className="pwt-rail-letter">{slot.letter}</span>}
        {slot.state === "done" && (
          <span className="pwt-rail-mark" aria-hidden="true">
            <Check />
          </span>
        )}
        {slot.state === "down" && (
          <span className="pwt-rail-mark down" aria-hidden="true">
            <Skull />
          </span>
        )}
        {tag && <span className="pwt-rail-tag">{tag}</span>}
      </span>
    </li>
  );
}
