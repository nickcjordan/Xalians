import React, { useLayoutEffect, useRef, useState } from "react";
import { Check, Skull } from "lucide-react";
import { Portrait } from "../powerworksVisuals";
import type { RailSlot } from "./view";

/** How many acted slots stay on the rail before NOW: enough to see who just went. */
const DONE_SHOWN = 8;
const PHONE_DONE_SHOWN = 1;

/**
  The turn rail (UX pass, 2026-09-29, "what happens next"): one time axis, left to right,
  one column per turn. Enemies sit a notch above the track and the squad a notch below it, the
  same sides as the stage, but the two lanes overlap vertically so the row reads as one line in
  time order (UX pass 2, round 3: readers read the upper lane whole before the lower one), and
  the slots still to act carry their place in the order. NOW is the largest slot, NEXT is
  named in the empty half of its column, acted slots are checked and faded, and a divider
  marks where the next round starts. `data-rail`, `data-slot` and `data-state` are the
  harness's hooks.
*/
export function TurnRail({ rail, round, compact = false, width = 0 }: { rail: RailSlot[]; round: number; compact?: boolean; /** The console's width, so a resize measures the rail again. */ width?: number }) {
  if (!rail.length) return null;
  const now = rail.findIndex((r) => r.state === "now");
  // Phone: the rail is short, so only the last slot to have acted stays before NOW.
  const from = now < 0 ? 0 : Math.max(0, now - (compact ? PHONE_DONE_SHOWN : DONE_SHOWN));
  // A fallen unit leaves the order: its plate already says Down.
  const shown = rail.slice(from).filter((r) => r.state !== "down");
  // A new key measures the fit again from every slot whenever the order or the room changes.
  const signature = `${compact ? "c" : "d"}${width}:${round}:${shown.map((r) => `${r.id}.${r.state}.${r.roundStart ?? ""}`).join(",")}`;
  return <RailRow key={signature} shown={shown} round={round} />;
}

/**
  The row itself. After it lays out, any slot that would be cut by the row's right edge is dropped
  (with a divider that would end up last), so no portrait is ever shown half.
*/
function RailRow({ shown, round }: { shown: RailSlot[]; round: number }) {
  const ref = useRef<HTMLOListElement>(null);
  const [limit, setLimit] = useState(shown.length);
  useLayoutEffect(() => {
    const ol = ref.current;
    if (!ol) return;
    const edge = ol.clientWidth;
    const cols = Array.from(ol.querySelectorAll<HTMLElement>("li[data-slot]"));
    // The first column whose far edge passes the row's edge, never dropping NOW or NEXT.
    const keepAtLeast = shown.findIndex((r) => r.state === "next") + 1 || shown.findIndex((r) => r.state === "now") + 1;
    let cut = shown.length;
    cols.forEach((li, i) => {
      if (cut === shown.length && li.offsetLeft + li.offsetWidth > edge + 1 && i + 1 > keepAtLeast) cut = i;
    });
    // A round divider that would be the last thing shown goes with the slot it introduces.
    while (cut > 0 && shown[cut - 1]?.roundStart !== undefined) cut--;
    if (cut !== limit) setLimit(cut);
  }, []);
  const visible = shown.slice(0, limit);
  // The order after NOW, counted on the slots still to act (NOW is 1, NEXT is 2, then 3, 4...).
  const nowAt = visible.findIndex((r) => r.state === "now");
  return (
    <ol className="pwt-rail" data-rail="" aria-label="Turn order" ref={ref}>
      <span className="pwt-rail-track" aria-hidden="true" />
      <li className="pwt-rail-round" aria-label={`Round ${round}`}>
        <span>Round {round}</span>
      </li>
      {visible.map((r, i) => (
        <React.Fragment key={`${r.id}-${i}`}>
          {r.roundStart !== undefined && (
            <li className="pwt-rail-divider" aria-label={`Round ${r.roundStart} starts`}>
              <span>Round {r.roundStart}</span>
            </li>
          )}
          <RailColumn slot={r} order={nowAt >= 0 && i > nowAt ? i - nowAt + 1 : undefined} />
        </React.Fragment>
      ))}
    </ol>
  );
}

function RailColumn({ slot, order }: { slot: RailSlot; order?: number }) {
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
        {slot.state === "later" && order !== undefined && (
          <span className="pwt-rail-order" aria-hidden="true">
            {order}
          </span>
        )}
        {tag && <span className="pwt-rail-tag">{tag}</span>}
      </span>
    </li>
  );
}
