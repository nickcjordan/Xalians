// Tier: immersive. The radial move menu that opens over a selected companion on the Powerworks stage (docs/design/powerworks-radial-orders.md).
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Crown, HeartPulse, Link2, Shield } from "lucide-react";
import { moveAt, type Move, type Unit } from "@xalians/rules/dungeon";
import {
  FigureIcon,
  MoveIcon,
  PowerIcon,
  baseName,
  binds,
  briefReading,
  closes,
  cooldownLimit,
  guards,
  moveDescription,
  moveFigure,
} from "./powerworksVisuals";
import "./powerworksRadial.css";

/** Why a slot cannot be chosen, or its readiness, in the short form a slot prints. */
export function slotState(
  unit: Unit,
  move: Move,
  index: number,
  legal: boolean
): { short: string; long: string; dim: boolean } {
  const cooldown = index < 0 ? null : unit.cooldowns[index];
  const limit = cooldownLimit(move);
  if (!legal) {
    if (move.signature && unit.signatureSpent)
      return { short: "spent", long: "Spent this encounter.", dim: true };
    if (cooldown)
      return {
        short: `cooling ${cooldown}`,
        long: `Cooling: ready in ${cooldown} ${cooldown === 1 ? "round" : "rounds"}.`,
        dim: true,
      };
    if (unit.bound && closes(move))
      return {
        short: "bound",
        long: "Bound: it cannot close in at its next opportunity.",
        dim: true,
      };
    return { short: "no effect", long: "No effect here.", dim: true };
  }
  return cooldown === null || limit === 0
    ? { short: "repeatable", long: "Ready · no cooldown", dim: false }
    : {
        short: "ready",
        long: `Ready · ${limit} round cooldown after use`,
        dim: false,
      };
}

/** The slots of a ring: every move in record order, then the fallback when it is the one choice. */
export const ringIndices = (unit: Unit, available: number[]) => [
  ...unit.moves.map((_, i) => i),
  ...(available.includes(-1) ? [-1] : []),
];

/** The accessible name a slot carries: "Crystorn: Heavy Ram, power 60, ready". */
export function slotName(unit: Unit, move: Move, state: string) {
  return `${unit.name}: ${move.name}${
    move.signature ? ", signature" : ""
  }, ${moveFigure(unit, move).label}, ${state}`;
}

type Point = { x: number; y: number };
type Placement = {
  /** The arc's center: the companion's feet, in stage pixels. */
  x: number;
  y: number;
  radius: number;
  below: boolean;
  /** Each slot's disc center, relative to the arc's center. */
  slots: Point[];
  /** The arc trim's path, relative to the arc's center. */
  arc: string;
  /** The ring's box (discs, tags and labels) in stage pixels. */
  box: { left: number; top: number; right: number; bottom: number };
};

const EDGE = 8;
/** Evenly spread angles over the arc, in degrees. */
const evenAngles = (count: number, spread: number) =>
  count === 1
    ? [0]
    : Array.from({ length: count }, (_, k) => -spread + (k * 2 * spread) / (count - 1));
type Box = { left: number; top: number; right: number; bottom: number };
const area = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

/** The badge's glyph beside its number: the move card's power mark, or what the number counts. */
function BadgeGlyph({ kind }: { kind: string }) {
  return kind === "control" ? (
    <Link2 />
  ) : kind === "heal" ? (
    <HeartPulse />
  ) : kind === "ward" ? (
    <Shield />
  ) : (
    <PowerIcon />
  );
}
const px = (style: CSSStyleDeclaration, name: string, fallback: number) =>
  parseFloat(style.getPropertyValue(name)) || fallback;

/**
  The ring's geometry (decisions 3 and 8): the discs sit on a true circular arc centered on
  the companion's feet, at a radius of about one figure height, so the arc crowns the head.
  The discs spread evenly over the arc; a fifth (the fallback) widens the spread.
*/
function layout(
  angles: number[],
  radius: number,
  below: boolean
): { slots: Point[]; arc: string } {
  const spread = Math.max(...angles.map(Math.abs));
  const sign = below ? 1 : -1;
  const at = (deg: number, r = radius) => {
    const a = (deg * Math.PI) / 180;
    return { x: r * Math.sin(a), y: sign * r * Math.cos(a) };
  };
  const reach = spread + 9;
  const a = at(-reach),
    b = at(reach);
  const arc = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} A${radius} ${radius} 0 0 ${
    below ? 0 : 1
  } ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  return { slots: angles.map((d) => at(d)), arc };
}

export function PowerworksRadial({
  unit,
  available,
  current,
  autoFocus,
  onChoose,
  onStep,
}: {
  unit: Unit;
  /** The legal move indices for this unit this round (`legalMoves`). */
  available: number[];
  /** The move of this unit's standing order, marked on its slot. */
  current: number | null;
  /** Move focus into the ring when it opens (a player opened it). */
  autoFocus: boolean;
  onChoose: (index: number, keyboard: boolean) => void;
  /** Tab and Shift+Tab: move to the next or previous companion. */
  onStep: (direction: 1 | -1) => void;
}) {
  const indices = ringIndices(unit, available);
  const root = useRef<HTMLDivElement>(null),
    detailRef = useRef<HTMLDivElement>(null),
    slots = useRef<Array<HTMLButtonElement | null>>([]),
    pointer = useRef<string>("mouse");
  const [place, setPlace] = useState<Placement | null>(null),
    [detailAt, setDetailAt] = useState<{
      left: number;
      top: number;
      pinned: boolean;
    } | null>(null),
    [hovered, setHovered] = useState<number | null>(null),
    [focused, setFocused] = useState<number | null>(null),
    [armed, setArmed] = useState<number | null>(null),
    [roving, setRoving] = useState(() => {
      const start = indices.findIndex((i) =>
        current !== null ? i === current : available.includes(i)
      );
      return Math.max(0, start);
    });
  const shown = armed ?? hovered ?? focused;
  const detailMove = shown !== null ? moveAt(unit, shown) : null;

  // Place the ring over the companion inside the stage: shift it sideways near an edge, and
  // flip it below the figure when there is no room above (decision 8).
  useLayoutEffect(() => {
    const el = root.current;
    const stage = el?.closest<HTMLElement>(".pw-theater");
    if (!el || !stage) return;
    const measure = () => {
      const style = getComputedStyle(el);
      const disc = px(style, "--disc", 56),
        labelW = px(style, "--label-w", 76),
        under = px(style, "--under", 26),
        reachFactor = px(style, "--reach", 0.95),
        spread = px(style, indices.length > 4 ? "--spread-wide" : "--spread", 38),
        // On a phone the squad stands close together: the discs are pitched evenly and the
        // radius is set so every disc clears every companion's head (review fix 1).
        clearHeads = style.getPropertyValue("--clear-heads").trim() === "1",
        pitch = px(style, "--pitch", 64);
      const anchor = stage.querySelector<HTMLElement>(
        `[data-unit="${unit.id}"] .pw-scene-character`
      );
      // Stage coordinates are the padding box the ring is positioned in.
      const b = stage.getBoundingClientRect();
      const s = {
        left: b.left + stage.clientLeft,
        top: b.top + stage.clientTop,
        width: stage.clientWidth,
        height: stage.clientHeight,
      };
      const a = anchor?.getBoundingClientRect();
      // The painted figure is square and stands on its button's floor.
      const art = a && s.width ? Math.min(a.width, a.height) : 120;
      let radius = Math.round(art * reachFactor + disc / 2),
        angles = evenAngles(indices.length, spread);
      if (clearHeads && a && s.width) {
        // Layout positions, not painted ones: the squad's walk-in animation moves the art
        // while a round opens, and the ring must clear where the heads come to rest.
        const heads = [
          ...stage.querySelectorAll<HTMLElement>(".pw-scene-unit.ally .pw-scene-character"),
        ].map((f) => {
          const art = f.querySelector<HTMLElement>(".pw-actor-art");
          return f.getBoundingClientRect().top - s.top + (art?.offsetTop ?? 0);
        });
        const feet = a.bottom - s.top;
        const lift = feet - (Math.min(...heads) - 6) + disc / 2;
        const xs = indices.map((_, k) => (k - (indices.length - 1) / 2) * pitch);
        const widest = Math.max(...xs.map(Math.abs));
        radius = Math.round(Math.hypot(widest, lift));
        angles = xs.map((x) => (Math.asin(x / radius) * 180) / Math.PI);
      }
      const extent = (below: boolean) => {
        const { slots: points, arc } = layout(angles, radius, below);
        const half = Math.max(disc, labelW) / 2;
        return {
          points,
          arc,
          minX: Math.min(...points.map((p) => p.x)) - half,
          maxX: Math.max(...points.map((p) => p.x)) + half,
          minY: Math.min(...points.map((p) => p.y)) - disc / 2,
          maxY: Math.max(...points.map((p) => p.y)) + disc / 2 + under,
        };
      };
      if (!a || !s.width) {
        const e = extent(false);
        setPlace(
          (p) =>
            p ?? {
              x: 0,
              y: 0,
              radius,
              below: false,
              slots: e.points,
              arc: e.arc,
              box: { left: 0, top: 0, right: 0, bottom: 0 },
            }
        );
        return;
      }
      const feet = a.bottom - s.top;
      let below = false,
        e = extent(false),
        y = feet;
      if (y + e.minY < EDGE) {
        const flipped = extent(true);
        const top = a.bottom - s.top - art;
        if (top + flipped.maxY <= s.height - EDGE) {
          below = true;
          e = flipped;
          y = top;
        } else y = EDGE - e.minY;
      }
      let x = a.left + a.width / 2 - s.left;
      if (x + e.minX < EDGE) x = EDGE - e.minX;
      if (x + e.maxX > s.width - EDGE) x = s.width - EDGE - e.maxX;
      const next: Placement = {
        x: Math.round(x),
        y: Math.round(y),
        radius,
        below,
        slots: e.points,
        arc: e.arc,
        box: {
          left: Math.round(x + e.minX),
          right: Math.round(x + e.maxX),
          top: Math.round(y + e.minY),
          bottom: Math.round(y + e.maxY),
        },
      };
      setPlace((p) =>
        p &&
        p.x === next.x &&
        p.y === next.y &&
        p.radius === next.radius &&
        p.below === next.below
          ? p
          : next
      );
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(stage);
    return () => observer?.disconnect();
  }, [unit.id, indices.length]);

  // The detail card (review fix 4): the spot nearest just above the arc that covers no
  // enemy and no squadmate, never the ring itself, and stays inside the stage.
  useLayoutEffect(() => {
    const card = detailRef.current;
    const stage = card?.closest<HTMLElement>(".pw-theater");
    if (!card || !stage || !place) {
      setDetailAt(null);
      return;
    }
    const W = stage.clientWidth,
      H = stage.clientHeight;
    const w = card.offsetWidth,
      h = card.offsetHeight;
    const b = stage.getBoundingClientRect();
    const ox = b.left + stage.clientLeft,
      oy = b.top + stage.clientTop;
    const boxes = (selector: string) =>
      [...stage.querySelectorAll<HTMLElement>(selector)].map((e) => {
        const r = e.getBoundingClientRect();
        return { left: r.left - ox, top: r.top - oy, right: r.right - ox, bottom: r.bottom - oy };
      });
    const foes = boxes(
      ".pw-scene-unit.defender:not(.fallen) .pw-scene-character, .pw-scene-unit.defender .pw-unit-plaque"
    );
    const mates = boxes(".pw-scene-unit.ally .pw-actor-art, .pw-scene-unit.ally .pw-unit-plaque");
    const ring = place.box;
    const gap = 8;
    const wantX = (ring.left + ring.right) / 2 - w / 2,
      wantY = ring.top - gap - h;
    let best = { left: EDGE, top: EDGE, score: Infinity };
    if (!W || !w) {
      setDetailAt((d) => d ?? { left: 0, top: 0, pinned: false });
      return;
    }
    for (let top = EDGE; top <= H - EDGE - h; top += 4)
      for (let left = EDGE; left <= W - EDGE - w; left += 8) {
        const c = { left, top, right: left + w, bottom: top + h };
        const pad = { left: ring.left - gap, top: ring.top - gap, right: ring.right + gap, bottom: ring.bottom + gap };
        const score =
          area(c, pad) * 50 +
          foes.reduce((n, f) => n + area(c, f), 0) * 20 +
          mates.reduce((n, f) => n + area(c, f), 0) * 4 +
          Math.abs(left - wantX) * 2 +
          Math.abs(top - wantY) * 3;
        if (score < best.score) best = { left, top, score };
      }
    const spot = { left: best.left, top: best.top, pinned: false };
    setDetailAt((d) =>
      d && d.left === spot.left && d.top === spot.top ? d : spot
    );
  }, [place, shown]);

  useEffect(() => {
    if (!autoFocus) return;
    const frame = requestAnimationFrame(() => slots.current[roving]?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, unit.id]);

  function press(i: number, k: number, keyboard: boolean) {
    const legal = available.includes(i);
    // On touch the first tap reads the slot and arms it; the second chooses (decision 4).
    if (!keyboard && pointer.current === "touch" && armed !== i) {
      setArmed(i);
      setRoving(k);
      return;
    }
    if (!legal) return;
    onChoose(i, keyboard);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const last = indices.length - 1;
    const move = (k: number) => {
      e.preventDefault();
      setRoving(k);
      setArmed(null);
      slots.current[k]?.focus();
    };
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      move(roving >= last ? 0 : roving + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      move(roving <= 0 ? last : roving - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(last);
    else if (e.key === "Tab") {
      e.preventDefault();
      onStep(e.shiftKey ? -1 : 1);
    }
  }

  const style = place
    ? ({ left: place.x, top: place.y } as React.CSSProperties)
    : ({ visibility: "hidden" } as React.CSSProperties);
  const detailFigure = detailMove ? moveFigure(unit, detailMove) : null;

  return (
    <>
      <div
        ref={root}
        className={`pw-radial el-${unit.element} ${place?.below ? "below" : ""}`}
        style={style}
        data-radial={unit.id}
      >
        {place && (
          <svg className="pw-radial-arc" aria-hidden="true">
            <path d={place.arc} />
          </svg>
        )}
        <div
          role="menu"
          aria-label={`${unit.name}'s moves`}
          aria-orientation="horizontal"
          className="pw-radial-menu"
          onKeyDown={onKeyDown}
        >
          {indices.map((i, k) => {
            const m = moveAt(unit, i),
              legal = available.includes(i),
              state = slotState(unit, m, i, legal),
              figure = moveFigure(unit, m),
              point = place?.slots[k] ?? { x: 0, y: 0 },
              limit = cooldownLimit(m),
              cooldown = i < 0 ? null : unit.cooldowns[i];
            return (
              <button
                key={i}
                ref={(el) => {
                  slots.current[k] = el;
                }}
                role="menuitem"
                tabIndex={k === roving ? 0 : -1}
                aria-disabled={!legal || undefined}
                aria-label={slotName(unit, m, state.short)}
                aria-describedby={`pw-slot-desc-${unit.id}-${i}`}
                aria-current={current === i ? "true" : undefined}
                data-slot={k + 1}
                className={`pw-radial-slot ${m.signature ? "signature" : ""} ${
                  state.dim ? "dim" : ""
                } ${current === i ? "current" : ""} ${
                  armed === i ? "armed" : ""
                } ${armed === i || focused === i ? "reading" : ""} ${
                  binds(m) ? "control" : guards(m) ? "ward" : ""
                }`}
                style={
                  {
                    "--x": `${point.x.toFixed(1)}px`,
                    "--y": `${point.y.toFixed(1)}px`,
                  } as React.CSSProperties
                }
                onPointerDown={(e) => {
                  pointer.current = e.pointerType || "mouse";
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
                onFocus={(e) => {
                  setRoving(k);
                  // Keyboard focus reads the slot; focus moved in after a click or tap does not.
                  let visible = true;
                  try {
                    visible = e.currentTarget.matches(":focus-visible");
                  } catch {
                    /* An engine without :focus-visible reads every focus. */
                  }
                  if (visible) setFocused(i);
                }}
                onBlur={() => setFocused((f) => (f === i ? null : f))}
                onClick={(e) => press(i, k, e.detail === 0)}
              >
                <span className="pw-radial-disc" aria-hidden="true">
                  <MoveIcon move={m} />
                </span>
                <span
                  className={`pw-radial-power ${figure.value === null ? "icon" : ""}`}
                  aria-hidden="true"
                >
                  {figure.value === null ? (
                    <FigureIcon move={m} />
                  ) : (
                    <>
                      <BadgeGlyph kind={figure.kind} />
                      {figure.value}
                    </>
                  )}
                </span>
                <span className="pw-radial-tag" aria-hidden="true">
                  {state.dim ? (
                    <span className="pw-radial-reason">{state.short}</span>
                  ) : cooldown === null || limit === 0 ? (
                    <span className="pw-radial-reason ready">∞</span>
                  ) : (
                    <span className="pw-card-charges">
                      {Array.from({ length: limit }, (_, n) => (
                        <i key={n} className={n < limit - cooldown ? "full" : ""} />
                      ))}
                    </span>
                  )}
                </span>
                <span className="pw-radial-label" aria-hidden="true">
                  {baseName(m)}
                </span>
                <span className="pw-radial-key" aria-hidden="true">
                  {k + 1}
                </span>
                <span className="pw-sr" id={`pw-slot-desc-${unit.id}-${i}`}>
                  {moveDescription(unit, m)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {detailMove && detailFigure && shown !== null && (
        <div
          ref={detailRef}
          className={`pw-radial-detail el-${unit.element} ${
            detailMove.signature ? "signature" : ""
          } ${detailAt?.pinned ? "pinned" : ""}`}
          style={
            detailAt
              ? { left: detailAt.left, top: detailAt.top }
              : { visibility: "hidden" }
          }
          aria-hidden="true"
          data-detail={shown}
        >
          <div className="pw-radial-detail-head">
            <strong>
              {detailMove.signature && <Crown />}
              {detailMove.name}
            </strong>
            <b>
              {detailFigure.value === null ? (
                <FigureIcon move={detailMove} />
              ) : (
                <>
                  <BadgeGlyph kind={detailFigure.kind} />
                  {detailFigure.value}
                </>
              )}
              {detailFigure.unit && <small>{detailFigure.unit}</small>}
            </b>
          </div>
          <p>{briefReading(unit, detailMove)}</p>
          <p className="pw-radial-detail-state">
            {slotState(unit, detailMove, shown, available.includes(shown)).long}
            {armed === shown && available.includes(shown) && (
              <span className="pw-radial-detail-hint"> · tap again to choose</span>
            )}
          </p>
        </div>
      )}
    </>
  );
}
