// Tier: immersive. The Powerworks stage camera (docs/design/powerworks-radial-orders.md, round 2): the
// slight zoom toward the selected companion, and the map from any element to where it will
// stand on the stage once the zoom settles, which the wheel and the move card place against.
import { createContext, useContext, type RefObject } from "react";

export type Box = { left: number; top: number; right: number; bottom: number };
/** The zoom layer's transform: translate(tx, ty) then scale(s), origin at the stage's top left. */
export type Zoom = { s: number; tx: number; ty: number };
export const IDENTITY: Zoom = { s: 1, tx: 0, ty: 0 };

/** How far the camera leans in: a visible step that still keeps the whole room in frame. */
export const MAX_ZOOM = { wide: 1.06, phone: 1.06 } as const;
/** The gap every plaque and figure keeps from the stage edge at full zoom, in pixels. */
export const ZOOM_MARGIN = 6;

export type StageRefs = {
  stage: RefObject<HTMLElement | null>;
  layer: RefObject<HTMLDivElement | null>;
  /** The companion the camera leans toward, or null for the whole room. */
  focus: string | null;
};
export const StageContext = createContext<StageRefs | null>(null);

/** The zoom as painted right now (mid-transition included), read back from the layer. */
export function paintedZoom(layer: HTMLElement): Zoom {
  let text = "";
  try {
    text = getComputedStyle(layer).transform;
  } catch {
    return IDENTITY;
  }
  const m = /^matrix\(([^)]+)\)$/.exec(text || "");
  if (!m) return IDENTITY;
  const [a, , , , e, f] = m[1].split(",").map((n) => parseFloat(n));
  return a > 0 && Number.isFinite(e) && Number.isFinite(f) ? { s: a, tx: e, ty: f } : IDENTITY;
}

const apply = (z: Zoom, b: Box): Box => ({
  left: z.tx + z.s * b.left,
  top: z.ty + z.s * b.top,
  right: z.tx + z.s * b.right,
  bottom: z.ty + z.s * b.bottom,
});

/**
  The camera's zoom toward a companion (round 2 review): the largest scale, up to `max`, at
  which every plaque, standing figure and condition row still fits inside the stage, then
  the pan nearest to keeping the companion's feet where they stand that keeps them all
  inside. Where the room allows, the feet stay fixed; near an edge the camera pans instead
  of pushing a plaque out of the frame.
*/
export function fitZoom(
  focus: Box,
  boxes: Box[],
  width: number,
  height: number,
  max: number,
  margin = ZOOM_MARGIN
): Zoom {
  const p = { x: (focus.left + focus.right) / 2, y: focus.bottom };
  const all = [...boxes, focus];
  const minL = Math.min(...all.map((b) => b.left)),
    maxR = Math.max(...all.map((b) => b.right)),
    minT = Math.min(...all.map((b) => b.top)),
    maxB = Math.max(...all.map((b) => b.bottom));
  let s = Math.min(
    max,
    (width - 2 * margin) / Math.max(1, maxR - minL),
    (height - 2 * margin) / Math.max(1, maxB - minT)
  );
  s = Math.floor(s * 1000) / 1000;
  if (s <= 1) return IDENTITY;
  const fit = (want: number, lo: number, hi: number) =>
    lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, want));
  return {
    s,
    tx: fit(p.x * (1 - s), margin - s * minL, width - margin - s * maxR),
    ty: fit(p.y * (1 - s), margin - s * minT, height - margin - s * maxB),
  };
}

export type StageMap = {
  width: number;
  height: number;
  /** The zoom the camera is settling to. */
  zoom: Zoom;
  /** An element's box in stage pixels once the zoom settles. */
  box: (el: Element) => Box;
};

/**
  Build the map from the live DOM. `from` is any element on the stage: on the first mount a
  child's layout effect runs before React attaches the stage's refs, so the stage and its
  layer are found from the element instead. Null when there is no stage.
*/
export function stageMap(refs: StageRefs | null, from?: Element | null): StageMap | null {
  const stage =
    refs?.stage.current ?? (from?.closest(".pw-theater") as HTMLElement | null | undefined);
  const layer =
    refs?.layer.current ??
    (stage?.querySelector(":scope > .pw-stage-zoom") as HTMLDivElement | null | undefined);
  if (!refs || !stage || !layer) return null;
  const b = stage.getBoundingClientRect();
  const ox = b.left + stage.clientLeft,
    oy = b.top + stage.clientTop;
  const width = stage.clientWidth,
    height = stage.clientHeight;
  const painted = paintedZoom(layer);
  const raw = (el: Element): Box => {
    const r = el.getBoundingClientRect();
    return { left: r.left - ox, top: r.top - oy, right: r.right - ox, bottom: r.bottom - oy };
  };
  // Where an element in the zoom layer stands with no zoom at all.
  const flat = (el: Element): Box => {
    const r = raw(el);
    return {
      left: (r.left - painted.tx) / painted.s,
      top: (r.top - painted.ty) / painted.s,
      right: (r.right - painted.tx) / painted.s,
      bottom: (r.bottom - painted.ty) / painted.s,
    };
  };
  let zoom = IDENTITY;
  const figure = refs.focus
    ? layer.querySelector(`[data-unit="${refs.focus}"] .pw-scene-character`)
    : null;
  if (figure && width > 0) {
    const boxes = [
      ...layer.querySelectorAll(
        ".pw-unit-plaque, .pw-scene-unit:not(.fallen) .pw-scene-character, .pw-scene-status"
      ),
    ]
      .map(flat)
      .filter((x) => x.right - x.left > 0 && x.bottom - x.top > 0);
    zoom = fitZoom(
      flat(figure),
      boxes,
      width,
      height,
      width <= 600 ? MAX_ZOOM.phone : MAX_ZOOM.wide,
      // A phone's squad row spans nearly the whole stage: its end plaques may come within
      // 3px of the edge rather than 6, so the camera still leans in visibly.
      width <= 600 ? 3 : ZOOM_MARGIN
    );
  }
  return {
    width,
    height,
    zoom,
    box: (el) => (layer.contains(el) ? apply(zoom, flat(el)) : raw(el)),
  };
}

/** The stage map, built on demand inside a layout effect, from any element on the stage. */
export function useStageMap(): (from?: Element | null) => StageMap | null {
  const refs = useContext(StageContext);
  return (from) => stageMap(refs, from);
}
