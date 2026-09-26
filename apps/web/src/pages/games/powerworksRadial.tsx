// Tier: immersive. The radial move menu that opens over a selected companion on the Powerworks stage (docs/design/powerworks-radial-orders.md, rounds 1 to 3).
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Crosshair,
  Crown,
  HeartPulse,
  Magnet,
  RotateCcw,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import {
  DESPERATE_STRIKE_RECOIL,
  LIKELIHOOD_PERCENT,
  moveAt,
  restorePreview,
  selfBurst,
  type Move,
  type MoveEffect,
  type Unit,
} from "@xalians/rules/dungeon";
import {
  ElementIcon,
  GroupIcon,
  MoveIcon,
  PowerIcon,
  baseName,
  charges,
  closes,
  cooldownLimit,
  effectSummary,
  moveDescription,
  moveFigure,
  removalWords,
} from "./powerworksVisuals";
import { useStageMap, type Box } from "./powerworksStage";
import "./powerworksRadial.css";

/** A move that wears its element (round 3): it carries its own element classification. */
export const elementOf = (move: Move): string | null =>
  move.element && !move.fallback ? move.element : null;
/** How many rounds a move rests after use, as pips; none for a move usable every round. */
export const restRounds = (move: Move) => (move.fallback ? 0 : cooldownLimit(move));
/** The rest pips' tooltip: "Unavailable for 2 rounds after use." */
export const restTip = (rounds: number) =>
  `Unavailable for ${rounds} ${rounds === 1 ? "round" : "rounds"} after use.`;
/** The charge mark's line and tooltip (round 3). */
export const CHARGE_LINE = "Lands next round";
export const CHARGE_TIP =
  "Charges this round and lands at its next opportunity. A pull or a bind before then breaks the charge.";

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
type CardMark = { key: string; icon: React.ReactNode; text: string; tip: string; kind: string };
/**
  The move card's icon row (round 3): one mark per thing the move does, each an icon and at
  most a word or a chance, its full sentence on a tooltip. Harm names its element, since
  that is what sets the matchup chevrons on each target; a physical move has no element and
  no matchup (pass 9).
*/
export function cardMarks(unit: Unit, move: Move): CardMark[] {
  const marks: CardMark[] = [];
  const chance = (e: MoveEffect) =>
    e.likelihood === "consistent" ? "" : ` ${LIKELIHOOD_PERCENT[e.likelihood]}%`;
  if (move.fallback)
    marks.push({
      key: "harm",
      icon: <PowerIcon />,
      text: "Harm",
      tip: "Flat harm, with no matchup.",
      kind: "harm",
    });
  move.effects.forEach((e, n) => {
    const key = `${e.support}-${n}`;
    if (e.support === "harm") {
      if (marks.some((m) => m.kind === "harm")) return;
      const element = elementOf(move);
      const reach = e.recipient === "area" ? " to everyone it reaches" : "";
      marks.push(
        element
          ? {
              key,
              icon: <ElementIcon element={element} />,
              text: cap(element),
              tip: `${cap(element)} harm${reach}. Its matchup against each target shows as a chevron by that target's health.`,
              kind: "harm",
            }
          : {
              key,
              icon: <PowerIcon />,
              text: "Harm",
              tip: `${cap(e.mechanism ?? "impact")} harm${reach}. Physical, so it lands the same on every element.`,
              kind: "harm",
            }
      );
    } else if (e.support === "displace")
      marks.push({ key, icon: <Magnet />, text: "Pull", tip: effectSummary(e, move), kind: "pull" });
    else if ((e.support === "bind" || e.support === "status") && e.group)
      marks.push({
        key,
        icon: <GroupIcon group={e.group} />,
        text: `${cap(e.status ?? "bound")}${chance(e)}`,
        tip: effectSummary(e, move),
        kind: e.support === "bind" ? "bind" : `status group-${e.group}`,
      });
    else if (e.support === "restore")
      marks.push({
        key,
        icon: <HeartPulse />,
        text: e.recipient === "self" ? "Recovers" : `Heal ${restorePreview(unit, e)}`,
        tip: effectSummary(e, move),
        kind: "heal",
      });
    else if (e.support === "protect")
      marks.push({ key, icon: <Shield />, text: "Shield", tip: effectSummary(e, move), kind: "guard" });
    else if (e.support === "remove")
      marks.push({
        key,
        icon: <Sparkles />,
        text: removalWords(e.methods).split(":")[0] || "Clears",
        tip: effectSummary(e, move),
        kind: "clear",
      });
    else if (e.support === "unsupported")
      marks.push({ key, icon: <Ban />, text: "No effect", tip: effectSummary(e, move), kind: "none" });
  });
  if (selfBurst(move))
    marks.push({
      key: "burst",
      icon: <Users />,
      text: "Hits squad",
      tip: "Also hits the squadmates standing either side of the user.",
      kind: "danger",
    });
  if (move.fallback)
    marks.push({
      key: "recoil",
      icon: <RotateCcw />,
      text: `−${DESPERATE_STRIKE_RECOIL} HP`,
      tip: `Costs ${DESPERATE_STRIKE_RECOIL} health in recoil.`,
      kind: "danger",
    });
  if (move.signature)
    marks.push({
      key: "signature",
      icon: <Crown />,
      text: "",
      tip: "Signature: usable once per encounter.",
      kind: "signature",
    });
  return marks;
}

/**
  One mark with its tooltip (round 3): the mark takes focus, and its tooltip shows on hover
  or focus (a tap focuses it on touch). The sentence is the mark's accessible description.
*/
function Mark({
  id,
  tip,
  className = "",
  label,
  children,
}: {
  id: string;
  tip: string;
  className?: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <span className="pw-mark-wrap">
      <span
        className={`pw-mark ${className}`}
        tabIndex={0}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-describedby={id}
      >
        {children}
      </span>
      <span role="tooltip" id={id} className="pw-mark-tip">
        {tip}
      </span>
    </span>
  );
}
/** Rest pips: one per round the move rests after use. */
function Pips({ rounds }: { rounds: number }) {
  return (
    <>
      {Array.from({ length: rounds }, (_, n) => (
        <i key={n} />
      ))}
    </>
  );
}

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
    // A charging unit may only release its charge (`legalMoves`); a unit recovering from
    // a release cannot begin another charge.
    if (unit.charge !== null && index !== unit.chargeMove)
      return { short: "charging", long: "Charging: it releases its charged move first.", dim: true };
    if (unit.recovery && move.preparation === "prolonged")
      return { short: "recovering", long: "Recovering: it cannot charge again yet.", dim: true };
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

/**
  The accessible name a slot carries: "Crystorn: Gem Radiance, signature, light, power 12,
  ready". The element the disc wears is said in words (round 3).
*/
export function slotName(unit: Unit, move: Move, state: string) {
  const element = elementOf(move);
  return `${unit.name}: ${move.name}${move.signature ? ", signature" : ""}${
    element ? `, ${element}` : ""
  }, ${moveFigure(unit, move).label}, ${state}`;
}

/**
  Motion (round 2): every duration the wheel runs, in milliseconds, kept between about 120
  and 250 so planning never waits on an animation. Nothing runs under reduced motion.
*/
export const WHEEL_MOTION = {
  /** One disc opening out of the creature, and the step between discs. */
  open: 160,
  openStep: 25,
  /** One disc folding back into the creature, and the step between discs. */
  fold: 140,
  foldStep: 20,
  /** The chosen disc growing into the move card, and the card shrinking back. */
  expand: 220,
  collapse: 190,
  /** The card collapsing into the companion's plaque chip once its order locks. */
  lock: 230,
} as const;
const EASE_OUT = "cubic-bezier(0.2, 0.75, 0.25, 1)";
const EASE_IN = "cubic-bezier(0.5, 0, 0.75, 0.3)";

type Point = { x: number; y: number };
type Placement = {
  /** The arc's center: the companion's feet, in stage pixels. */
  x: number;
  y: number;
  radius: number;
  below: boolean;
  /** Each slot's disc center, relative to the arc's center. */
  slots: Point[];
  /** Where the discs open from and fold back to: the creature's middle, relative to the arc's center. */
  from: Point;
  /** The disc's size in pixels. */
  disc: number;
  /** The arc trim's path, relative to the arc's center. */
  arc: string;
  /** The ring's box (discs and labels) in stage pixels. */
  box: Box;
};

const EDGE = 8;
/** The move card's chamfer, the octagon the disc grows into. */
const CHAMFER = 8;
/** Evenly spread angles over the arc, in degrees. */
const evenAngles = (count: number, spread: number) =>
  count === 1
    ? [0]
    : Array.from({ length: count }, (_, k) => -spread + (k * 2 * spread) / (count - 1));
const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const px = (style: CSSStyleDeclaration, name: string, fallback: number) =>
  parseFloat(style.getPropertyValue(name)) || fallback;
const spot0Width = (best: { width: number } | null, fallback: number) =>
  `${best?.width ?? fallback}px`;
/** An eight-point outline at a box: the disc's octagon, the card's chamfer, a chip's corners. */
const outline = (x: number, y: number, w: number, h: number, c: number) =>
  `polygon(${[
    [x + c, y],
    [x + w - c, y],
    [x + w, y + c],
    [x + w, y + h - c],
    [x + w - c, y + h],
    [x + c, y + h],
    [x, y + h - c],
    [x, y + c],
  ]
    .map(([a, b]) => `${a.toFixed(1)}px ${b.toFixed(1)}px`)
    .join(", ")})`;
/**
  Where a creature is actually drawn in its art box: the painted square (the art is square,
  contained and set on the box's floor), not the box's empty sides.
*/
export const paintedFigure = (b: Box): Box => {
  const side = Math.min(b.right - b.left, b.bottom - b.top);
  const cx = (b.left + b.right) / 2;
  return { left: cx - side / 2, right: cx + side / 2, top: b.bottom - side, bottom: b.bottom };
};
/** Run a Web Animation where the engine has one; jsdom and old engines skip it. */
function play(
  el: Element | null | undefined,
  frames: Keyframe[],
  options: KeyframeAnimationOptions
) {
  const target = el as HTMLElement | null | undefined;
  if (!target || typeof target.animate !== "function") return null;
  return target.animate(frames, options);
}

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
  // Whole pixels (round 3): a disc and the name under it never stand on a half pixel, where
  // their text and rim would be drawn soft.
  const at = (deg: number, r = radius) => {
    const a = (deg * Math.PI) / 180;
    return { x: Math.round(r * Math.sin(a)), y: Math.round(sign * r * Math.cos(a)) };
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
  chosen = null,
  keyed = false,
  motion = false,
  closing = false,
  locked = null,
  onClosed,
  onBack,
  prompt = "Choose a target",
  targetLine = null,
  onPreview,
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
  /** The chosen move while its target is picked: its disc has become the move card (round 2). */
  chosen?: number | null;
  /** The player has used the keyboard this session: the discs show their hotkeys. */
  keyed?: boolean;
  /** Animate: false under reduced motion, when everything is instant. */
  motion?: boolean;
  /** The ring is leaving: the discs fold back, or the card collapses. */
  closing?: boolean;
  /** The move whose order just locked as the ring leaves: it collapses into the plaque chip. */
  locked?: number | null;
  onClosed?: () => void;
  /** The move card's back control: return to the wheel (Escape does the same). */
  onBack?: () => void;
  /** The card's instruction before a target is aimed at. */
  prompt?: string;
  /** The aimed target's one-line outcome ("Crawler 1: 5 damage, 22 to 17"). */
  targetLine?: string | null;
  /**
    A disc is hovered, focused from the keyboard, or armed by a first tap (round 3): the
    stage previews its outcome faintly; null when it is left.
  */
  onPreview?: (index: number | null) => void;
}) {
  const indices = ringIndices(unit, available);
  const map = useStageMap();
  const root = useRef<HTMLDivElement>(null),
    cardRef = useRef<HTMLDivElement>(null),
    emblemRef = useRef<HTMLSpanElement>(null),
    bodyRef = useRef<HTMLDivElement>(null),
    slots = useRef<Array<HTMLButtonElement | null>>([]),
    pointer = useRef<string>("mouse"),
    expandedFor = useRef<number | null>(null),
    placedWith = useRef<Placement | null>(null);
  const [place, setPlace] = useState<Placement | null>(null),
    [cardAt, setCardAt] = useState<{
      left: number;
      top: number;
      width: number | null;
      compact: boolean;
      /** The card stands low on the stage: its tooltips open upward. */
      up?: boolean;
      /** Docked in the floor band between the enemy row and the squad, as one row (round 3 ruling). */
      docked?: boolean;
    } | null>(null),
    [armed, setArmed] = useState<number | null>(null),
    [roving, setRoving] = useState(() => {
      const start = indices.findIndex((i) =>
        current !== null ? i === current : available.includes(i)
      );
      return Math.max(0, start);
    });
  // Back from the card (round 2): the card shrinks into its disc while the wheel reopens.
  const [prevChosen, setPrevChosen] = useState(chosen),
    [returning, setReturning] = useState<number | null>(null);
  if (chosen !== prevChosen) {
    setPrevChosen(chosen);
    setReturning(chosen === null && prevChosen !== null && motion && !closing ? prevChosen : null);
    if (chosen !== null && indices.includes(chosen)) setRoving(indices.indexOf(chosen));
    setArmed(null);
  }
  const cardIndex = chosen ?? returning;
  const cardMove = cardIndex !== null ? moveAt(unit, cardIndex) : null;
  const wheel = chosen === null && !closing;
  const cardSlot = cardIndex !== null ? indices.indexOf(cardIndex) : -1;

  // Place the ring over the companion inside the stage: shift it sideways near an edge, and
  // flip it below the figure when there is no room above (decision 8). Every box is read
  // where it will stand once the stage camera settles (round 2), so the camera's lean
  // never moves the ring.
  useLayoutEffect(() => {
    const el = root.current;
    const m = map(el);
    if (!el) return;
    const measure = () => {
      const m = map(el);
      const style = getComputedStyle(el);
      const disc = px(style, "--disc", 60),
        labelW = px(style, "--label-w", 80),
        under = px(style, "--under", 30),
        reachFactor = px(style, "--reach", 0.95),
        spread = px(style, indices.length > 4 ? "--spread-wide" : "--spread", 38),
        // On a phone the squad stands close together: the discs are pitched evenly and the
        // radius is set so every disc clears every companion's head (review fix 1).
        clearHeads = style.getPropertyValue("--clear-heads").trim() === "1",
        pitch = px(style, "--pitch", 64);
      const stage = el.closest(".pw-theater");
      const anchor = stage?.querySelector(`[data-unit="${unit.id}"] .pw-scene-character`);
      const a = m && anchor ? m.box(anchor) : null;
      const W = m?.width ?? 0,
        H = m?.height ?? 0;
      // The painted figure is square and stands on its button's floor.
      const art = a && W ? Math.min(a.right - a.left, a.bottom - a.top) : 120;
      let radius = Math.round(art * reachFactor + disc / 2),
        angles = evenAngles(indices.length, spread);
      if (clearHeads && a && W && stage && m) {
        // Layout positions, not painted ones: the squad's walk-in animation moves the art
        // while a round opens, and the ring must clear where the heads come to rest.
        const heads = [
          ...stage.querySelectorAll<HTMLElement>(".pw-scene-unit.ally .pw-scene-character"),
        ].map((f) => {
          const artEl = f.querySelector<HTMLElement>(".pw-actor-art");
          return m.box(f).top + (artEl?.offsetTop ?? 0);
        });
        const lift = a.bottom - (Math.min(...heads) - 6) + disc / 2;
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
      if (!a || !W) {
        const e = extent(false);
        setPlace(
          (p) =>
            p ?? {
              x: 0,
              y: 0,
              radius,
              below: false,
              slots: e.points,
              from: { x: 0, y: -art / 2 },
              disc,
              arc: e.arc,
              box: { left: 0, top: 0, right: 0, bottom: 0 },
            }
        );
        return;
      }
      let below = false,
        e = extent(false),
        y = a.bottom;
      if (y + e.minY < EDGE) {
        const flipped = extent(true);
        const top = a.bottom - art;
        if (top + flipped.maxY <= H - EDGE) {
          below = true;
          e = flipped;
          y = top;
        } else y = EDGE - e.minY;
      }
      let x = (a.left + a.right) / 2;
      if (x + e.minX < EDGE) x = EDGE - e.minX;
      if (x + e.maxX > W - EDGE) x = W - EDGE - e.maxX;
      const cx = (a.left + a.right) / 2;
      const next: Placement = {
        x: Math.round(x),
        y: Math.round(y),
        radius,
        below,
        slots: e.points,
        from: {
          x: Math.round(cx - Math.round(x)),
          y: Math.round(a.bottom - art * 0.5 - Math.round(y)),
        },
        disc,
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
        p.below === next.below &&
        p.disc === next.disc
          ? p
          : next
      );
    };
    measure();
    const stage = m ? el.closest(".pw-theater") : null;
    const observer =
      typeof ResizeObserver === "undefined" || !stage ? null : new ResizeObserver(measure);
    if (stage) observer?.observe(stage);
    return () => observer?.disconnect();
  }, [unit.id, indices.length]);

  /** A slot's disc box in stage pixels. */
  const discBox = (k: number): Box | null => {
    if (!place || k < 0 || !place.slots[k]) return null;
    const c = { x: place.x + place.slots[k].x, y: place.y + place.slots[k].y },
      h = place.disc / 2;
    return { left: c.x - h, top: c.y - h, right: c.x + h, bottom: c.y + h };
  };

  // The move card's spot (round 2 review): it covers no unit, neither its painted figure
  // nor its plaque, conditions or marks, and stands in the free place nearest the companion
  // choosing. A desktop card tries narrower widths, then a compact reading, before it
  // accepts any overlap; a phone card spans the stage, so it docks in the floor band
  // between the enemies and the squad.
  useLayoutEffect(() => {
    if (cardIndex === null) {
      setCardAt(null);
      expandedFor.current = null;
      placedWith.current = null;
      return;
    }
    const card = cardRef.current,
      disc = discBox(cardSlot);
    const m = map(card);
    if (!card || !disc || !m || !m.width) {
      setCardAt((c) => c ?? { left: 0, top: 0, width: null, compact: false });
      return;
    }
    if (cardAt && placedWith.current === place) return;
    placedWith.current = place;
    const W = m.width,
      H = m.height;
    const stage = card.closest(".pw-theater");
    const all = (selector: string) =>
      stage ? [...stage.querySelectorAll(selector)].map((el) => m.box(el)) : [];
    // Room for what appears while aiming: an aimed unit rises a little, an enemy's ghost
    // conditions appear under its figure, a squadmate's marks above its plaque.
    const risen = (b: Box): Box => {
      const side = b.right - b.left;
      return { left: b.left - side * 0.05, right: b.right + side * 0.05, top: b.top - side * 0.1 - 4, bottom: b.bottom };
    };
    const bands: Box[] = stage
      ? [...stage.querySelectorAll(".pw-scene-unit:not(.fallen)")].flatMap((u) => {
          const plaque = u.querySelector(".pw-unit-plaque"),
            art = u.querySelector(".pw-actor-art");
          if (!plaque || !art) return [];
          const p = m.box(plaque),
            f = paintedFigure(m.box(art));
          return u.classList.contains("defender")
            ? [{ left: p.left, right: p.right, top: f.bottom, bottom: f.bottom + 26 }]
            : [{ left: p.left, right: p.right, top: p.top - 24, bottom: p.top }];
        })
      : [];
    // Where no spot is free (a crowded room: the guardian's, three defenders), the card
    // gives way by weight (round 3): it may cover the empty edge of an art box before the
    // painted creature, and the creature before any plaque, condition or mark, since those
    // carry the outcome the player is choosing by.
    const weighted = (boxes: Box[], w: number) => boxes.map((b) => ({ ...b, w }));
    const solid = [
      // The whole art box, not only the painted square: its sides carry the aimed rise and
      // the target ring, and the card should read as standing clear of every unit.
      ...weighted(all(".pw-scene-unit:not(.fallen) .pw-actor-art").map(risen), 1),
      ...weighted(all(".pw-scene-unit:not(.fallen) .pw-actor-art").map(paintedFigure), 3),
      ...weighted(
        all(
          ".pw-scene-unit .pw-unit-plaque, .pw-scene-status, .pw-preview-marks, .pw-target-orders"
        ),
        12
      ),
      ...weighted(bands, 12),
    ].filter((b) => b.right - b.left > 0 && b.bottom - b.top > 0);
    const actorEl = stage?.querySelector(`[data-unit="${unit.id}"] .pw-actor-art`);
    const actor = actorEl ? paintedFigure(m.box(actorEl)) : disc;
    const dc = { x: (disc.left + disc.right) / 2, y: (disc.top + disc.bottom) / 2 };
    const phone = W <= 600;
    const widths = phone ? [Math.min(354, W - 16)] : [264, 236, 208];
    const step = phone ? 2 : 4;
    let best: { left: number; top: number; width: number; compact: boolean; hit: number; score: number } | null = null;
    let foundFree = false;
    search: for (const compact of [false, true])
      for (const w of widths) {
        card.style.width = `${w}px`;
        card.classList.toggle("compact", compact);
        const h = card.offsetHeight;
        let free: typeof best = null;
        for (let top = EDGE; top <= H - EDGE - h; top += step)
          for (let left = EDGE; left <= W - EDGE - w; left += step) {
            const c = { left, top, right: left + w, bottom: top + h };
            const hit = solid.reduce((n, f) => n + overlap(c, f) * f.w, 0);
            // Nearest the companion choosing, then nearest the disc it grew from.
            const gap = Math.hypot(
              Math.max(0, actor.left - c.right, c.left - actor.right),
              Math.max(0, actor.top - c.bottom, c.top - actor.bottom)
            );
            const drift = Math.hypot(left + w / 2 - dc.x, top + h / 2 - dc.y);
            const score = hit * 1000 + gap * 4 + drift * 0.5;
            const at = { left, top, width: w, compact, hit, score };
            if (!best || score < best.score) best = at;
            if (hit === 0 && (!free || score < free.score)) free = at;
          }
        if (free) {
          best = free;
          foundFree = true;
          break search;
        }
      }
    // No free spot on a desktop stage (the guardian's crowded room): before the card covers
    // any creature, it docks as one row in the floor band between the enemy row and the
    // squad, as the phone card does (round 3 ruling). The band is read from every standing
    // unit's whole art box, condition row, marks and plaque.
    let docked: { left: number; top: number; width: number } | null = null;
    if (!foundFree && !phone && stage) {
      const side = (enemy: boolean) =>
        [...stage.querySelectorAll(`.pw-scene-unit.${enemy ? "defender" : "ally"}:not(.fallen)`)].flatMap(
          (u) =>
            [...u.querySelectorAll(".pw-actor-art, .pw-unit-plaque, .pw-scene-status, .pw-preview-marks")]
              .map((el) => m.box(el))
              .filter((b) => b.right - b.left > 0 && b.bottom - b.top > 0)
        );
      const foes = side(true),
        mates = side(false);
      if (foes.length && mates.length) {
        const floor = Math.max(...foes.map((b) => b.bottom)),
          // An aimed squadmate rises a little: leave it the room.
          ceiling = Math.min(...mates.map((b) => b.top)) - 4;
        const w = Math.min(W - 2 * EDGE, 900);
        card.style.width = `${w}px`;
        card.classList.add("docked");
        const h = card.offsetHeight;
        card.classList.remove("docked");
        if (ceiling - floor >= h + 4) {
          const cx = (actor.left + actor.right) / 2;
          docked = {
            left: Math.round(Math.min(W - EDGE - w, Math.max(EDGE, cx - w / 2))),
            top: Math.round(floor + (ceiling - floor - h) / 2),
            width: w,
          };
        }
      }
    }
    card.style.width = spot0Width(best, widths[0]);
    card.classList.toggle("compact", !!best?.compact);
    const spotH = card.offsetHeight;
    card.style.width = "";
    card.classList.remove("compact");
    const spot = docked
      ? { ...docked, compact: false }
      : best ?? { left: EDGE, top: EDGE, width: widths[0], compact: false };
    // A tooltip needs about three lines of room: below the card when there is room, else above.
    const up = !docked && spot.top + spotH + 64 > H - EDGE;
    setCardAt((c) =>
      c &&
      c.left === spot.left &&
      c.top === spot.top &&
      c.width === spot.width &&
      c.compact === spot.compact &&
      c.up === up &&
      !!c.docked === !!docked
        ? c
        : { left: spot.left, top: spot.top, width: spot.width, compact: spot.compact, up, docked: !!docked }
    );
  }, [place, cardIndex]);

  // The chosen disc grows into the card: the card's outline opens from the disc's octagon,
  // the emblem travels from the disc to its place in the card, the words fade in after.
  useLayoutEffect(() => {
    if (!cardAt || chosen === null || closing || expandedFor.current === chosen) return;
    expandedFor.current = chosen;
    const disc = discBox(cardSlot),
      card = cardRef.current,
      emblem = emblemRef.current;
    if (!motion || !disc || !card || !emblem) return;
    const w = card.offsetWidth,
      h = card.offsetHeight,
      D = disc.right - disc.left;
    const ox = disc.left - cardAt.left,
      oy = disc.top - cardAt.top;
    const E = emblem.offsetWidth || 1;
    const dx = ox + D / 2 - (emblem.offsetLeft + E / 2),
      dy = oy + D / 2 - (emblem.offsetTop + emblem.offsetHeight / 2);
    const timing = { duration: WHEEL_MOTION.expand, easing: EASE_OUT };
    play(
      card,
      [
        { clipPath: outline(ox, oy, D, D, D * 0.29) },
        { clipPath: outline(0, 0, w, h, CHAMFER) },
      ],
      timing
    );
    play(
      emblem,
      [
        { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${(D / E).toFixed(3)})` },
        { transform: "none" },
      ],
      timing
    );
    play(bodyRef.current, [{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], timing);
  }, [cardAt, chosen, closing]);

  // Back to the wheel: the card shrinks into the disc it came from, then the disc returns.
  useLayoutEffect(() => {
    if (returning === null) return;
    const disc = discBox(cardSlot),
      card = cardRef.current,
      emblem = emblemRef.current;
    const done = () => setReturning((r) => (r === returning ? null : r));
    if (!disc || !card || !emblem || !cardAt) {
      done();
      return;
    }
    const w = card.offsetWidth,
      h = card.offsetHeight,
      D = disc.right - disc.left,
      E = emblem.offsetWidth || 1;
    const ox = disc.left - cardAt.left,
      oy = disc.top - cardAt.top;
    const dx = ox + D / 2 - (emblem.offsetLeft + E / 2),
      dy = oy + D / 2 - (emblem.offsetTop + emblem.offsetHeight / 2);
    const timing = { duration: WHEEL_MOTION.collapse, easing: EASE_IN, fill: "forwards" as const };
    play(
      card,
      [{ clipPath: outline(0, 0, w, h, CHAMFER) }, { clipPath: outline(ox, oy, D, D, D * 0.29) }],
      timing
    );
    play(
      emblem,
      [
        { transform: "none" },
        { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${(D / E).toFixed(3)})` },
      ],
      timing
    );
    play(bodyRef.current, [{ opacity: 1 }, { opacity: 0, offset: 0.45 }, { opacity: 0 }], timing);
    const timer = setTimeout(done, WHEEL_MOTION.collapse);
    return () => clearTimeout(timer);
  }, [returning]);

  // Leaving: the discs fold back into the creature, or the order just locked and its card
  // (or its disc, for a move on its user) collapses into the companion's plaque chip.
  useLayoutEffect(() => {
    if (!closing) return;
    let total = WHEEL_MOTION.fold + WHEEL_MOTION.foldStep * Math.max(0, indices.length - 1);
    const m = map(root.current);
    const stage = root.current?.closest(".pw-theater");
    const chipEl = stage?.querySelector(`[data-unit="${unit.id}"] .pw-order-chip`);
    const chip = chipEl && m ? m.box(chipEl) : null;
    const icon = chipEl?.querySelector("svg");
    const iconBox = icon && m && icon.getBoundingClientRect().width > 0 ? m.box(icon) : null;
    const card = cardRef.current,
      emblem = emblemRef.current;
    if (motion && chosen !== null && card && emblem && cardAt) {
      total = WHEEL_MOTION.lock;
      const w = card.offsetWidth,
        h = card.offsetHeight,
        E = emblem.offsetWidth || 1;
      const timing = { duration: WHEEL_MOTION.lock, easing: EASE_IN, fill: "forwards" as const };
      if (locked === chosen && chip) {
        const cx = chip.left - cardAt.left,
          cy = chip.top - cardAt.top,
          cw = chip.right - chip.left,
          ch = chip.bottom - chip.top;
        const to = iconBox ?? { left: chip.left + 4, top: chip.top + 4, right: chip.left + 14, bottom: chip.top + 14 };
        const k = (to.right - to.left) / E;
        const dx = to.left - cardAt.left - emblem.offsetLeft - (E - (to.right - to.left)) / 2,
          dy = to.top - cardAt.top - emblem.offsetTop - (E - (to.bottom - to.top)) / 2;
        play(
          card,
          [
            { clipPath: outline(0, 0, w, h, CHAMFER), opacity: 1 },
            { clipPath: outline(cx, cy, cw, ch, 1), opacity: 1, offset: 0.8 },
            { clipPath: outline(cx, cy, cw, ch, 1), opacity: 0 },
          ],
          timing
        );
        play(
          emblem,
          [
            { transform: "none" },
            { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${k.toFixed(3)})` },
          ],
          timing
        );
        play(bodyRef.current, [{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 }], timing);
      } else
        play(
          card,
          [
            { opacity: 1, transform: "none" },
            { opacity: 0, transform: "scale(0.94)" },
          ],
          { duration: WHEEL_MOTION.fold, easing: EASE_IN, fill: "forwards" }
        );
    } else if (motion && locked !== null && chip) {
      // A move on its user sets the order straight from its disc: that disc flies to the chip.
      const k = indices.indexOf(locked);
      const d = discBox(k),
        slot = slots.current[k];
      if (d && slot) {
        const to = iconBox ?? chip;
        const dx = (to.left + to.right) / 2 - (d.left + d.right) / 2,
          dy = (to.top + to.bottom) / 2 - (d.top + d.bottom) / 2;
        play(
          slot,
          [
            { transform: "none", opacity: 1 },
            {
              transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(0.25)`,
              opacity: 0,
            },
          ],
          { duration: WHEEL_MOTION.lock, easing: EASE_IN, fill: "forwards" }
        );
        total = Math.max(total, WHEEL_MOTION.lock);
      }
    }
    if (!motion) total = 0;
    const timer = setTimeout(() => onClosed?.(), total);
    return () => clearTimeout(timer);
  }, [closing]);

  // Focus enters the ring when a player opened it, and returns to the chosen slot when
  // the card goes back to the wheel.
  useEffect(() => {
    // A disc still hidden while its card shrinks back into it cannot take focus: wait.
    if (!autoFocus || !wheel || returning !== null) return;
    const frame = requestAnimationFrame(() => slots.current[roving]?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, unit.id, wheel, returning]);

  function press(i: number, k: number, keyboard: boolean) {
    const legal = available.includes(i);
    // On touch the first tap lifts the disc and arms it; the second chooses (decision 4).
    if (!keyboard && pointer.current === "touch" && armed !== i) {
      setArmed(i);
      setRoving(k);
      // The arming tap previews the move's outcome on the stage, as hovering does (round 3).
      onPreview?.(legal ? i : null);
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
      slots.current[k]?.focus({ preventScroll: true });
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
    ? ({
        left: place.x,
        top: place.y,
        "--from-x": `${place.from.x}px`,
        "--from-y": `${place.from.y}px`,
      } as React.CSSProperties)
    : ({ visibility: "hidden" } as React.CSSProperties);
  const cardElement = cardMove ? elementOf(cardMove) : null;
  const cardRest = cardMove ? restRounds(cardMove) : 0;
  const marks = cardMove ? cardMarks(unit, cardMove) : [];
  const cardState = closing ? "leaving" : returning !== null && chosen === null ? "returning" : "open";
  const tipId = (key: string) => `pw-mark-${unit.id}-${cardIndex}-${key}`;
  /** The disc a pointer or the keyboard is on: the stage previews it faintly (round 3). */
  const peek = (i: number | null) => {
    if (wheel) onPreview?.(i);
  };

  return (
    <>
      <div
        ref={root}
        className={`pw-radial el-${unit.element} ${place?.below ? "below" : ""} ${
          wheel
            ? "open"
            : closing && locked !== null
            ? "locked"
            : closing && chosen === null
            ? "folding"
            : "folded"
        } ${keyed ? "keyed" : ""}`}
        style={style}
        data-radial={unit.id}
        data-motion={motion ? "full" : "reduced"}
      >
        {place && (
          <svg className="pw-radial-arc" aria-hidden="true">
            <path d={place.arc} />
          </svg>
        )}
        <div
          role={wheel ? "menu" : undefined}
          aria-label={wheel ? `${unit.name}'s moves` : undefined}
          aria-orientation={wheel ? "horizontal" : undefined}
          aria-hidden={wheel ? undefined : "true"}
          inert={!wheel}
          className="pw-radial-menu"
          onKeyDown={wheel ? onKeyDown : undefined}
        >
          {indices.map((i, k) => {
            const m = moveAt(unit, i),
              legal = available.includes(i),
              state = slotState(unit, m, i, legal),
              point = place?.slots[k] ?? { x: 0, y: 0 },
              element = elementOf(m),
              rest = restRounds(m);
            return (
              <button
                key={i}
                ref={(el) => {
                  slots.current[k] = el;
                }}
                role={wheel ? "menuitem" : undefined}
                tabIndex={wheel && k === roving ? 0 : -1}
                aria-disabled={!legal || undefined}
                aria-label={slotName(unit, m, state.short)}
                aria-describedby={`pw-slot-desc-${unit.id}-${i}`}
                aria-current={current === i ? "true" : undefined}
                data-slot={k + 1}
                className={`pw-radial-slot ${m.signature ? "signature" : ""} ${
                  element ? `elemental el-${element}` : "physical"
                } ${state.dim ? "dim" : ""} ${current === i ? "current" : ""} ${
                  armed === i ? "armed" : ""
                } ${cardIndex === i ? "held" : ""} ${
                  closing && locked === i && chosen === null ? "flying" : ""
                }`}
                style={
                  {
                    "--x": `${point.x}px`,
                    "--y": `${point.y}px`,
                    "--k": k,
                    "--rk": indices.length - 1 - k,
                  } as React.CSSProperties
                }
                onPointerDown={(e) => {
                  pointer.current = e.pointerType || "mouse";
                }}
                // A mouse previews on hover. A touch previews on its arming tap instead: a
                // lifted finger leaves the disc, which must not clear what it armed.
                onPointerEnter={(e) => e.pointerType !== "touch" && legal && peek(i)}
                onPointerLeave={(e) => e.pointerType !== "touch" && peek(null)}
                onFocus={() => {
                  setRoving(k);
                  // Keyboard focus previews; the focus a mouse click leaves behind does not.
                  if (keyed) peek(legal ? i : null);
                }}
                onBlur={() => {
                  if (keyed) peek(null);
                }}
                onClick={(e) => wheel && press(i, k, e.detail === 0)}
              >
                <span className="pw-radial-disc" aria-hidden="true">
                  <span className="pw-radial-core">
                    <MoveIcon move={m} />
                  </span>
                </span>
                {m.signature && (
                  // The signature's crown on the rim (round 3 review): gold is not its only
                  // cue, since the light and electric rims sit close to gold.
                  <span className="pw-radial-crown" aria-hidden="true">
                    <Crown />
                  </span>
                )}
                {charges(m) && (
                  <span className="pw-radial-charge" aria-hidden="true">
                    <Zap />
                  </span>
                )}
                {state.dim ? (
                  <span className="pw-radial-tag" aria-hidden="true">
                    <span className="pw-radial-reason">{state.short}</span>
                  </span>
                ) : (
                  rest > 0 && (
                    // How long it rests after use: shown only while the disc is lifted.
                    <span className="pw-radial-rest" aria-hidden="true">
                      <Pips rounds={rest} />
                    </span>
                  )
                )}
                <span className="pw-radial-label" aria-hidden="true">
                  <span className="pw-radial-name">
                    {baseName(m)}
                    {armed === i && legal && <small>Tap again</small>}
                  </span>
                </span>
                {keyed && (
                  <span className="pw-radial-key" aria-hidden="true">
                    {k + 1}
                  </span>
                )}
                <span className="pw-sr" id={`pw-slot-desc-${unit.id}-${i}`}>
                  {moveDescription(unit, m)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {cardMove && cardIndex !== null && (
        <div
          ref={cardRef}
          className={`pw-radial-card ${cardElement ? `elemental el-${cardElement}` : "physical"} ${
            cardMove.signature ? "signature" : ""
          } ${cardAt?.compact ? "compact" : ""} ${cardAt?.docked ? "docked" : ""} ${
            cardAt?.up ? "tips-up" : ""
          } ${cardState}`}
          style={
            cardAt
              ? { left: cardAt.left, top: cardAt.top, width: cardAt.width ?? undefined }
              : { visibility: "hidden" }
          }
          role="group"
          aria-label={`${unit.name}: ${cardMove.name}, chosen`}
          aria-describedby={`pw-card-desc-${unit.id}-${cardIndex}`}
          aria-hidden={cardState === "open" ? undefined : "true"}
          inert={cardState !== "open"}
          data-card={cardIndex}
        >
          <span ref={emblemRef} className="pw-radial-emblem" aria-hidden="true">
            <span className="pw-radial-core">
              <MoveIcon move={cardMove} />
            </span>
          </span>
          <div ref={bodyRef} className="pw-radial-card-body">
            <div className="pw-radial-card-head">
              <strong title={cardMove.name}>{baseName(cardMove)}</strong>
              {marks
                .filter((m) => m.kind === "signature")
                .map((m) => (
                  <Mark key={m.key} id={tipId(m.key)} tip={m.tip} className="signature badge" label="Signature">
                    {m.icon}
                  </Mark>
                ))}
            </div>
            {/* What it does, then what using it costs (round 3): the rest pips at the row's
                end. The signature's crown (once per encounter) is a badge by the name. */}
            <div className="pw-radial-marks">
              {marks
                .filter((m) => m.kind !== "signature")
                .map((m) => (
                  <Mark
                    key={m.key}
                    id={tipId(m.key)}
                    tip={m.tip}
                    className={m.kind}
                    label={m.text ? undefined : m.tip.split(":")[0]}
                  >
                    {m.icon}
                    {m.text && <span>{m.text}</span>}
                  </Mark>
                ))}
              {cardRest > 0 && (
                <Mark
                  id={tipId("rest")}
                  tip={restTip(cardRest)}
                  className="rest cost first"
                  label={`Rests ${cardRest} ${cardRest === 1 ? "round" : "rounds"}`}
                >
                  <Pips rounds={cardRest} />
                </Mark>
              )}
            </div>
            {charges(cardMove) && (
              <div className="pw-radial-marks pw-radial-card-charge">
                <Mark id={tipId("charge")} tip={CHARGE_TIP} className="charge">
                  <Zap />
                  <span>{CHARGE_LINE}</span>
                </Mark>
              </div>
            )}
            <p className={`pw-radial-card-target ${targetLine ? "aimed" : ""}`}>
              <Crosshair aria-hidden="true" />
              <span title={targetLine ?? prompt}>{targetLine ?? prompt}</span>
            </p>
          </div>
          <span className="pw-sr" id={`pw-card-desc-${unit.id}-${cardIndex}`}>
            {moveDescription(unit, cardMove)}
          </span>
          <button
            type="button"
            className="pw-radial-back"
            aria-label="Back to moves"
            tabIndex={cardState === "open" ? 0 : -1}
            onClick={(e) => {
              e.stopPropagation();
              onBack?.();
            }}
          >
            <ArrowLeft aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
