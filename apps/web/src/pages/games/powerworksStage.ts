// Tier: immersive. The Powerworks stage camera (docs/design/powerworks-radial-orders.md, round 3): planning
// holds still, and the camera moves only while a round plays, pushing in on each acting unit
// and its target for that beat. The map from any element to where it stands on the stage
// once the camera settles is what the wheel and the move card place against.
import { createContext, useContext, type RefObject } from "react";

export type Box = { left: number; top: number; right: number; bottom: number };
/** The camera layer's transform: translate(tx, ty) then scale(s), origin at the stage's top left. */
export type Zoom = { s: number; tx: number; ty: number };
export const IDENTITY: Zoom = { s: 1, tx: 0, ty: 0 };

/**
  The playback camera (round 3): how far it pushes in on a beat, how long the push and the
  return take, and the gap every plaque and figure keeps from the stage edge while pushed.
  A phone's squad row spans nearly the whole stage, so its end plaques may come within 3px.
*/
export const CAMERA = {
  push: 1.06,
  pushMs: 320,
  returnMs: 280,
  margin: { wide: 6, phone: 3 },
  /** How far a beat brings the action toward the centre, at most, in pixels (round 3 review). */
  lead: 28,
} as const;

export type StageRefs = {
  stage: RefObject<HTMLElement | null>;
  layer: RefObject<HTMLDivElement | null>;
};
export const StageContext = createContext<StageRefs | null>(null);

/** The camera as painted right now (mid-transition included), read back from the layer. */
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

/**
  The camera on one playback beat (round 3, reworked on review). It brings the midpoint of
  the acting unit and its target toward the stage's centre, by up to `CAMERA.lead` pixels
  (or 30% of the way, if less), and pushes in as far as it can while doing so, up to `max`.
  Every plaque, standing figure and condition row stays inside the stage, and above
  `bottom` when an action banner holds the stage's floor. Where the room allows no push, the
  camera only pans; where it allows no pan either, it stays put.
*/
export function beatZoom(
  focus: Box[],
  boxes: Box[],
  width: number,
  height: number,
  max: number,
  margin: number = CAMERA.margin.wide,
  bottom: number = height
): Zoom {
  if (!focus.length || width <= 0 || height <= 0) return IDENTITY;
  const center = (b: Box) => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 });
  const p = focus.map(center).reduce((a, c) => ({ x: a.x + c.x / focus.length, y: a.y + c.y / focus.length }), { x: 0, y: 0 });
  const all = [...boxes, ...focus];
  const minL = Math.min(...all.map((b) => b.left)),
    maxR = Math.max(...all.map((b) => b.right)),
    minT = Math.min(...all.map((b) => b.top)),
    maxB = Math.max(...all.map((b) => b.bottom));
  const floor = Math.min(height, bottom);
  const cx = width / 2,
    cy = floor / 2;
  const lead = Math.min(CAMERA.lead, Math.abs(cx - p.x) * 0.3);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const at = (s: number): (Zoom & { toward: number }) | null => {
    const lo = margin - s * minL,
      hi = width - margin - s * maxR,
      loY = margin - s * minT,
      hiY = floor - margin - s * maxB;
    if (lo > hi || loY > hiY) return null;
    const tx = Math.round(clamp(cx - s * p.x, Math.ceil(lo), Math.floor(hi))),
      ty = Math.round(clamp(cy - s * p.y, Math.ceil(loY), Math.floor(hiY)));
    // How far the action's midpoint moves toward the centre, in pixels.
    const toward = (p.x - (tx + s * p.x)) * Math.sign(p.x - cx);
    return { s, tx, ty, toward };
  };
  // The largest push that brings the action in by its lead; failing that, the largest that
  // at least never carries it away from the centre (a phone's squad spans the stage);
  // failing that, a pan alone.
  let steady: Zoom | null = null;
  for (let k = Math.round(max * 1000); k > 1000; k -= 5) {
    const z = at(k / 1000);
    if (!z) continue;
    if (z.toward >= lead - 0.5) return { s: z.s, tx: z.tx, ty: z.ty };
    if (!steady && z.toward >= 0) steady = { s: z.s, tx: z.tx, ty: z.ty };
  }
  if (steady) return steady;
  const still = at(1);
  return still && (still.tx || still.ty) ? { s: 1, tx: still.tx, ty: still.ty } : IDENTITY;
}

export type StageMap = {
  width: number;
  height: number;
  /** An element's box in stage pixels once the camera settles at rest (planning never moves it). */
  box: (el: Element) => Box;
  /** An element's box in stage pixels with no camera at all, whatever is painted now. */
  flat: (el: Element) => Box;
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
  if (!stage || !layer) return null;
  const b = stage.getBoundingClientRect();
  const ox = b.left + stage.clientLeft,
    oy = b.top + stage.clientTop;
  const painted = paintedZoom(layer);
  const raw = (el: Element): Box => {
    const r = el.getBoundingClientRect();
    return { left: r.left - ox, top: r.top - oy, right: r.right - ox, bottom: r.bottom - oy };
  };
  // Where an element in the camera layer stands with no camera at all: a playback beat's
  // push may still be easing back out when planning opens.
  const flat = (el: Element): Box => {
    const r = raw(el);
    if (!layer.contains(el)) return r;
    return {
      left: (r.left - painted.tx) / painted.s,
      top: (r.top - painted.ty) / painted.s,
      right: (r.right - painted.tx) / painted.s,
      bottom: (r.bottom - painted.ty) / painted.s,
    };
  };
  return { width: stage.clientWidth, height: stage.clientHeight, box: flat, flat };
}

/** The stage map, built on demand inside a layout effect, from any element on the stage. */
export function useStageMap(): (from?: Element | null) => StageMap | null {
  const refs = useContext(StageContext);
  return (from) => stageMap(refs, from);
}
