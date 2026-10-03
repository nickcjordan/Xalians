import React, { useLayoutEffect, useRef, useState } from "react";
import { KeyCard } from "./keys";
import type { KeyView } from "./view";

/**
  The moves on the stage (docs/design/powerworks-stage-moves.md, desktop): one compact row directly
  above the acting companion, so the pointer travels a short way up to an enemy instead of down to a
  bar. The row is placed from the companion's measured figure (like the strike lines), centered on it
  and clamped inside the stage, sitting above the active pointer and therefore never on the creature's
  feet or body. During enemy turns and playback it is not drawn at all. Nothing here zooms or scales.
  The phone keeps its column of keys (decision 6); this component is the desktop's alone. The row says
  each move as a verb and a number and nothing else: no tip beside it (one-number-one-meaning, rule 5).
*/
export function StageMoves({
  stageRef,
  activeId,
  name,
  keys,
  selectedKey,
  handingOff,
  onPress,
  onPass,
  onHover,
  onFocusKey,
}: {
  stageRef: React.RefObject<HTMLDivElement | null>;
  activeId: string;
  name: string;
  keys: KeyView[];
  selectedKey: number | null;
  handingOff: boolean;
  onPress: (k: KeyView) => void;
  onPass: () => void;
  onHover: (index: number | null) => void;
  onFocusKey: (index: number | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; bottom: number } | null>(null);

  // Measured against the stage box, so it survives the console zoom. Measured again once the plate's own
  // lift (it rises a few pixels when it becomes the active one) has settled.
  useLayoutEffect(() => {
    let timer = 0;
    const place = () => {
      const stage = stageRef.current;
      const menu = box.current;
      if (!stage || !menu) return;
      const body = stage.querySelector<HTMLElement>(`[data-unit="${activeId}"] .pwt-body`);
      if (!body) return;
      const sb = stage.getBoundingClientRect();
      const z = sb.width / stage.offsetWidth || 1;
      const b = body.getBoundingClientRect();
      const cx = (b.left + b.width / 2 - sb.left) / z;
      const top = (b.top - sb.top) / z;
      const w = menu.offsetWidth;
      const W = stage.offsetWidth;
      const H = stage.offsetHeight;
      const left = Math.max(8, Math.min(W - 8 - w, cx - w / 2));
      // The row rests above the active pointer (it hangs 14 px over the body), with a little air.
      const bottom = Math.round(H - (top - 22));
      const next = { left: Math.round(left), bottom };
      setAt((prev) => (prev && prev.left === next.left && prev.bottom === next.bottom ? prev : next));
    };
    place();
    timer = window.setTimeout(place, 200);
    window.addEventListener("resize", place);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", place);
    };
  }, [stageRef, activeId, keys.length]);

  return (
    <div
      ref={box}
      className={`pwt-moves${handingOff ? " handing-off" : ""}`}
      role="group"
      aria-label={`${name}'s moves`}
      data-moves=""
      data-placed={at ? "true" : "false"}
      style={at ? { left: at.left, bottom: at.bottom } : { left: "50%", bottom: "30%" }}
    >
      <div className="pwt-moves-row">
        {keys.map((k) => (
          <KeyCard
            key={`${activeId}-${k.index}`}
            keyView={k}
            menu
            armed={k.state === "ready"}
            selected={selectedKey === k.index}
            onPress={() => onPress(k)}
            onHover={(on) => onHover(on ? k.index : null)}
            onFocusKey={(on) => onFocusKey(on ? k.index : null)}
          />
        ))}
        <button type="button" className="pwt-pass" onClick={onPass}>
          Pass
        </button>
      </div>
    </div>
  );
}
