// Tier: immersive. A shared stage for the squad and the facility defenses.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Check,
  Info,
  Link2,
  Crown,
  ArrowRight,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  Shield,
  Zap,
  CornerUpRight,
  Ban,
  Sparkles,
  Plus,
} from "lucide-react";
import { actionPresentation } from "./powerworksPresentation";
import { PowerworksEnvironment } from "./powerworksEnvironment";
import {
  type BattleEvent,
  type Frame,
  type Move,
  type Order,
  type StatusGroup,
  type Unit,
} from "@xalians/rules/dungeon";
import {
  ElementIcon,
  GroupIcon,
  Health,
  MoveIcon,
  Portrait,
  StatusBadges,
  baseName,
  melee as contact,
  type HealthPreview,
} from "./powerworksVisuals";
import {
  CAMERA,
  IDENTITY,
  StageContext,
  beatZoom,
  stageMap,
  type Box,
  type StageRefs,
} from "./powerworksStage";

/**
  What a companion's plaque chip says (radial orders decision 7): its order's move and
  target, or its playback state, or why it has none. The page reads it from the plans.
*/
export type OrderChip = {
  move: Move | null;
  /** The target's short name; null for a move that acts on its user. */
  target: string | null;
  /** During playback: acting now, acted, waiting. */
  status?: string | null;
  /** When there is no move to show: "No order", "Cannot act", "Knocked out". */
  empty?: string | null;
};

/**
  What the chosen move would do to one unit (radial orders round 2), drawn on the creature
  itself: a target ring or an area mark at its feet, the chunk on its health bar, ghost
  status badges with their chance, a pull arrow. `words` is the same reading in plain
  words, carried by the target button's accessible name and the move card's target line.
*/
export type UnitPreview = HealthPreview & {
  /** A legal target of the chosen move, or a unit only the aimed target's area reaches. */
  role: "target" | "reached";
  /**
    A squadmate the rules let the move name but nothing would land on (full health, nothing
    to clear, no threat to guard): drawn dimmed like a non-target, its reason kept in words.
  */
  idle?: boolean;
  /** The move would pull this unit off its footing. */
  pull: boolean;
  statuses: {
    status: string;
    group: StatusGroup;
    chance: number;
    immune: boolean;
  }[];
  /** A helpful move's reading on a squadmate: guards, clears, or why it does nothing. */
  notes: { kind: "guard" | "clear" | "none"; text: string }[];
  words: string;
  /** The outcome's first clause, for the move card's one target line: "5 damage, 22 to 17". */
  line: string;
  /**
    The unit answers a contact strike automatically (round 3: the guardian's discharge), and
    this move touches it: the damage its reaction would deal the companion acting, from the
    rules' own preview, and the reaction's element.
  */
  shock?: { damage: number; name: string; element?: string } | null;
};
/** The one-shot beat when an order locks: the target ring flashes, the chip lights. */
export type OrderFlash = { actor: string; target: string | null; stamp: number };

export const sectorStory = [
  {
    name: "Service entrance",
    place: "Through the outer gates",
    text: "Your squad slips into the service tunnels. Maintenance claws scrape across the floor ahead.",
    icon: "01",
  },
  {
    name: "Security checkpoint",
    place: "Past the first defenses",
    text: "The passage narrows. A drone rises behind the armored patrol guarding the checkpoint.",
    icon: "02",
  },
  {
    name: "Power chamber",
    place: "Into the turbine hall",
    text: "Dormant turbines begin to turn. A capacitor draws power from the machinery around it.",
    icon: "03",
  },
  {
    name: "Control chamber",
    place: "At the heart of the facility",
    text: "The guardian wakes beneath the reactor. Your squad has reached the source of the defenses.",
    icon: "04",
  },
];

export function ExpeditionTrail({
  room,
  completed = false,
  onInspect,
}: {
  room: number;
  completed?: boolean;
  onInspect?: () => void;
}) {
  return (
    <div className="pw-trail" aria-label="Expedition progress">
      {sectorStory.map((sector, i) => (
        <div
          key={sector.name}
          className={`${i < room || completed ? "passed" : ""} ${
            i === room ? "here" : ""
          }`}
        >
          <span>
            {i < room || completed ? (
              <Check />
            ) : i === 3 ? (
              <Crown />
            ) : (
              sector.icon
            )}
          </span>
          <strong>{sector.name}</strong>
        </div>
      ))}
      {onInspect && (
        <button onClick={onInspect} aria-label="Inspect expedition route">
          <Info />
        </button>
      )}
    </div>
  );
}

/** The one short word the battlefield floats over a unit for each event kind. */
export function floatLabel(event?: BattleEvent): string {
  if (!event) return "";
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  switch (event.kind) {
    case "hit":
      return `−${event.amount}`;
    case "restore":
      return `+${event.amount}`;
    case "tick":
      return event.group === "mending"
        ? `+${event.amount}`
        : `−${event.amount}`;
    case "bind":
      return "Bound";
    case "status":
      return cap(event.status ?? "Condition");
    case "missed":
    case "resisted":
      return "Resisted";
    case "displace":
      return "Charge broken";
    case "ward":
      return "Guarded";
    case "charge":
      return "Charging";
    case "blocked":
      return "Blocked";
    case "expired":
      return event.group === "concealment" ? "Revealed" : "Wears off";
    case "removed":
      return "Cleared";
    case "lost":
      return "Opportunity lost";
    case "hidden":
      return "Concealed";
    case "react":
      return "Reacts";
    case "lapsed":
      return "Lapsed";
    case "outlasted":
      return "Forced out";
    default:
      return "Redirected";
  }
}

/** The chip's words, for its label and the figure's description: "Heavy Ram → Crawler 1". */
export function chipText(chip: OrderChip) {
  if (!chip.move) return chip.empty ?? "No order";
  return `${chip.move.name} → ${chip.status ?? chip.target ?? "itself"}`;
}

export function PowerworksScene({
  team,
  enemies,
  frame,
  frameIndex,
  room,
  active,
  move,
  plans,
  targetId,
  targetIds,
  planning,
  impact,
  paused,
  speed,
  reducedMotion,
  labelFor,
  previews = {},
  onTarget,
  onSelect,
  onInspect,
  onHover,
  onOpen,
  onBack,
  openId = null,
  chips = {},
  ring = null,
  flash = null,
  hints = {},
  beatMs,
}: {
  team: Unit[];
  enemies: Unit[];
  frame?: Frame;
  frameIndex: number;
  room: number;
  active?: Unit;
  move: Move | null;
  plans: Record<string, Order>;
  targetId?: string | null;
  /** Who the pending move may name (contract decision 39). Defaults to every standing enemy, the only targets before pass 5. */
  targetIds?: string[];
  planning: boolean;
  impact: boolean;
  paused: boolean;
  speed: number;
  reducedMotion: boolean;
  labelFor: (u: Unit) => string;
  /** What the chosen move would do to each unit it reaches, drawn on the creatures (round 2). */
  previews?: Record<string, UnitPreview>;
  onTarget: (id: string, keyboard: boolean) => void;
  onSelect: (u: Unit, keyboard: boolean) => void;
  onInspect: (id: string) => void;
  onHover: (id: string | null) => void;
  /** Open a companion's ring from its order chip or a target's order link. */
  onOpen?: (u: Unit, keyboard: boolean) => void;
  /** A click on empty stage backs out one step (radial orders decision 5). */
  onBack?: () => void;
  /** The companion whose radial menu is open. */
  openId?: string | null;
  chips?: Record<string, OrderChip>;
  /** The radial menu, drawn over the stage. */
  ring?: React.ReactNode;
  /** The order that just locked, for its one-shot beat. */
  flash?: OrderFlash | null;
  /**
    What a hovered or focused disc would do (round 3), drawn faintly before the click: each
    target's ring and chunk, its matchup chevron, and a contact reaction's mark.
  */
  hints?: Record<string, UnitPreview>;
  /** How long this playback beat lasts as the page runs it, in milliseconds. */
  beatMs?: number;
}) {
  const open = onOpen ?? onSelect;
  const [arriving, setArriving] = useState(true);
  useEffect(() => {
    setArriving(true);
    const timer = setTimeout(
      () => setArriving(false),
      reducedMotion ? 0 : 1800
    );
    return () => clearTimeout(timer);
  }, [room, reducedMotion]);
  const all = [...team, ...enemies],
    event = frame?.event;
  const actor = all.find((u) => u.id === event?.actorId);
  const recipient = all.find((u) => u.id === event?.targetId);
  const action = actor?.moves.find((m) => m.name === event?.moveName);
  const melee =
    (action ? contact(action) : false) || event?.moveName === "Desperate strike";
  const presentation = actionPresentation(frame);
  const { signature, knockout, bossDefeat } = presentation;
  const laneShift = (u: Unit) => {
    const row = u.enemy ? enemies : team;
    return (row.length - 1 - row.indexOf(u)) * (u.enemy ? 3 : 1);
  };
  const point = (u: Unit) => ({
    x:
      (u.enemy ? (enemies.length === 2 ? 30 : 20) : 14) +
      ((u.enemy ? enemies : team).indexOf(u) *
        (u.enemy ? (enemies.length === 2 ? 40 : 60) : 72)) /
        Math.max(1, (u.enemy ? enemies : team).length - 1),
    y: (u.enemy ? 30 : 72) + laneShift(u),
  });
  // Center a lone defender rather than leaving it in the first slot.
  const position = (u: Unit) =>
    u.enemy && enemies.length === 1 ? { x: 50, y: 30 } : point(u);
  const source = actor
    ? position(actor)
    : active
    ? position(team.find((u) => u.id === active.id) || team[0])
    : null;
  const destination = recipient ? position(recipient) : null;
  // Legal targets for the pending move: enemies and, for a helpful move, squadmates.
  const targets = new Set(
    move
      ? targetIds ?? enemies.filter((u) => u.hp > 0).map((u) => u.id)
      : []
  );
  const targeting = planning && !!move;
  const targetable = (u: Unit) => targeting && u.hp > 0 && targets.has(u.id);
  const aiming =
    targeting && targetId
      ? all.find((u) => u.id === targetId && targetable(u))
      : null;
  const aimPoint = aiming ? position(aiming) : null;
  // The intent line from every companion with an order to its target, while planning
  // (decision 7). A move that acts on its user names a foe only nominally, so it has none.
  const intents = planning
    ? team.flatMap((u) => {
        const order = plans[u.id];
        if (!order || u.hp <= 0 || (move && active?.id === u.id)) return [];
        if (chips[u.id] && chips[u.id].move && chips[u.id].target === null) return [];
        const target = all.find((t) => t.id === order.target && t.hp > 0);
        return target ? [{ id: u.id, from: position(u), to: position(target) }] : [];
      })
    : [];
  const aimedIds = new Set(
    intents.filter((i) => i.id === active?.id).map((i) => plans[i.id].target)
  );
  const phase = event?.kind || "idle";
  const style = {
    "--action-time": `${presentation.impactDelay / 0.28 / speed}ms`,
    "--impact-delay": `${presentation.impactDelay / speed}ms`,
  } as React.CSSProperties;

  // The camera (round 3): planning holds still. While a round plays, the camera pushes in
  // on each acting unit and its target for that beat, and returns before the next one.
  // Under reduced motion it holds still throughout (no push at all).
  const stageRef = useRef<HTMLElement>(null),
    layerRef = useRef<HTMLDivElement>(null);
  const stage: StageRefs = { stage: stageRef, layer: layerRef };
  const [size, setSize] = useState("");
  // The unit whose who-targets-it chips are showing: only the one hovered or focused.
  const [peek, setPeek] = useState<string | null>(null);
  const beatActor = !planning && !reducedMotion && frame && actor ? actor.id : null;
  const beatTarget =
    beatActor && recipient && recipient.id !== beatActor ? recipient.id : null;
  const beatKey = beatActor ? `${frameIndex}:${beatActor}` : null;
  // The beat whose camera has already returned.
  const [rested, setRested] = useState<string | null>(null);
  useEffect(() => {
    if (!beatKey || paused) return;
    const length = beatMs ?? presentation.duration / speed;
    const timer = setTimeout(
      () => setRested(beatKey),
      Math.max(0, length - CAMERA.returnMs)
    );
    return () => clearTimeout(timer);
  }, [beatKey, paused, beatMs, speed]);
  const pushed = !!beatKey && rested !== beatKey;
  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    let z = IDENTITY;
    const map = pushed ? stageMap(stage, layer) : null;
    if (map && map.width > 0) {
      const box = (id: string | null) => {
        const el = id ? layer.querySelector(`[data-unit="${id}"] .pw-scene-character`) : null;
        return el ? map.flat(el) : null;
      };
      const focus = [box(beatActor), box(beatTarget)].filter((b): b is Box => !!b);
      const boxes = [
        ...layer.querySelectorAll(
          ".pw-unit-plaque, .pw-scene-unit:not(.fallen) .pw-scene-character, .pw-scene-status"
        ),
      ]
        .map(map.flat)
        .filter((b) => b.right - b.left > 0 && b.bottom - b.top > 0);
      // The action banner stands outside the camera layer, on the stage's floor: pushed
      // plaques and order chips stay above it (round 3 review).
      const banner = stageRef.current?.querySelector(":scope > .pw-action-banner");
      const bannerTop = banner ? map.flat(banner).top : Infinity;
      z = beatZoom(
        focus,
        boxes,
        map.width,
        map.height,
        CAMERA.push,
        map.width <= 600 ? CAMERA.margin.phone : CAMERA.margin.wide,
        bannerTop > map.height / 2 ? bannerTop - 2 : map.height
      );
    }
    const moved = z.s > 1 || z.tx !== 0 || z.ty !== 0;
    layer.style.transition = reducedMotion
      ? "none"
      : `transform ${moved ? CAMERA.pushMs : CAMERA.returnMs}ms cubic-bezier(0.2, 0.7, 0.2, 1)`;
    // At rest the layer carries no transform at all, so nothing on the stage is rasterized
    // through a scale while the player plans (round 3).
    layer.style.transform = moved ? `translate(${z.tx}px, ${z.ty}px) scale(${z.s})` : "";
    layer.dataset.camera = moved ? "push" : "rest";
    layer.dataset.beat = beatActor ? `${beatActor}>${beatTarget ?? ""}` : "";
    layer.dataset.zoom = z.s.toFixed(3);
  }, [pushed, beatActor, beatTarget, frameIndex, size, reducedMotion, team.length, enemies.length]);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() =>
      setSize(`${el.clientWidth}x${el.clientHeight}`)
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <StageContext.Provider value={stage}>
      <section
        ref={stageRef}
        onClick={(e) => {
          if (!planning || !onBack) return;
          if (
            (e.target as Element).closest(
              "button, .pw-radial, .pw-radial-card, .pw-unit-plaque"
            )
          )
            return;
          onBack();
        }}
        className={`pw-theater sector-${room} ${frame ? "playing" : "planning"} ${
          enemies.length >= 3 ? "crowded" : ""
        } ${
          paused ? "paused" : ""
        } ${arriving ? "arriving" : ""} ${signature ? "signature-action" : ""} ${
          knockout && impact ? "knockout-action" : ""
        } ${bossDefeat && impact ? "boss-defeat" : ""} ${
          targeting ? "targeting" : ""
        } ${aiming ? "aiming" : ""}`}
        aria-label="Battlefield"
        style={style}
        data-impact={impact}
        data-action={phase}
        data-motion={reducedMotion ? "reduced" : "full"}
      >
        <div className="pw-stage-zoom" ref={layerRef}>
          <PowerworksEnvironment room={room} />
          <svg
            className={`pw-action-path ${actor ? `el-${actor.element}` : ""}`}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            key={`path-${frameIndex}`}
          >
            {intents.map(({ id, from, to }) => (
              <path
                key={id}
                className={`pw-queued-path ${active?.id === id ? "active" : ""}`}
                data-intent={id}
                d={`M${from.x} ${from.y} Q${(from.x + to.x) / 2} ${
                  Math.min(from.y, to.y) - 12
                } ${to.x} ${to.y}`}
              />
            ))}
            {aimPoint && source && (
              <path
                key={`aim-${aiming?.id}`}
                className="pw-aim-path"
                data-aim={aiming?.id}
                d={`M${source.x} ${source.y} Q${(source.x + aimPoint.x) / 2} ${
                  Math.min(source.y, aimPoint.y) - 14
                } ${aimPoint.x} ${aimPoint.y}`}
              />
            )}
            {actor &&
              recipient &&
              source &&
              destination &&
              event &&
              actor.id !== recipient.id &&
              ["hit", "bind", "status", "redirect", "restore", "ward", "removed"].includes(
                event.kind
              ) && (
                <>
                  <path
                    className={`pw-flight ${
                      melee && event.kind !== "redirect" ? "contact" : "projectile"
                    } ${event.kind}`}
                    pathLength="1"
                    d={`M${source.x} ${source.y} Q${
                      (source.x + destination.x) / 2
                    } ${(source.y + destination.y) / 2 - 12} ${destination.x} ${
                      destination.y
                    }`}
                  />
                  <ellipse
                    className={`pw-impact-ring ${event.kind}`}
                    cx={destination.x}
                    cy={destination.y}
                    rx="5"
                    ry="8"
                  />
                  {impact && event.kind !== "redirect" && (
                    <g
                      className={`pw-contact-mark ${event.kind}`}
                      transform={`translate(${destination.x} ${destination.y})`}
                    >
                      <circle r="3.3" />
                      <path d="M-9 0h-4M9 0h4M0-9v-4M0 9v4M-6-6l-3-3M6-6l3-3M-6 6l-3 3M6 6l3 3" />
                    </g>
                  )}
                </>
              )}
          </svg>
          {all.map((u) => {
            const pos = position(u),
              acting = actor?.id === u.id,
              receiving = recipient?.id === u.id;
            const selected = planning && active?.id === u.id;
            const queued = Object.entries(plans)
              .filter(
                ([id, q]) =>
                  q.target === u.id &&
                  !(chips[id] && chips[id].move && chips[id].target === null)
              )
              .map(([id]) => team.find((p) => p.id === id)!)
              .filter(Boolean);
            const chip = !u.enemy ? chips[u.id] : undefined;
            const ringOpen = openId === u.id;
            const target = targetable(u);
            const armedReading = targeting && u.hp > 0 ? previews[u.id] : undefined;
            // A hovered disc previews faintly (round 3): no unit becomes a target, nothing dims.
            const hint =
              !targeting && planning && u.hp > 0 && !armedReading ? hints[u.id] : undefined;
            const faint = !!hint && !hint.idle;
            const reading = armedReading ?? hint;
            // A squadmate the move would do nothing for reads as a non-target (round 2 review).
            const idle = !!reading?.idle;
            const preview = idle ? undefined : reading;
            // The figure and its plaque are one selection control (decision 2).
            const act = (keyboard: boolean) =>
              target
                ? onTarget(u.id, keyboard)
                : u.enemy
                ? onInspect(u.id)
                : onSelect(u, keyboard);
            const pressable =
              planning && u.hp > 0 && !(u.enemy && !!move && !target);
            // Dimmed while a move is armed: every unit it cannot name or reach, but never
            // the companion choosing it.
            const ineligible =
              targeting && ((!target && !preview) || idle) && active?.id !== u.id;
            // The rest of the squad steps back a little while a companion is selected (round 3).
            const resting =
              planning && !targeting && !!active && !u.enemy && active.id !== u.id && u.hp > 0;
            const recoil =
              acting &&
              phase === "hit" &&
              event?.moveName === "Desperate strike" &&
              impact;
            const beforeKnockout = receiving && !impact;
            const flashing = !!flash && !reducedMotion && flash.target === u.id;
            // A pull draws its arrow toward the companion pulling.
            const from = active ? position(active) : pos;
            const Pull =
              pos.x - from.x > 8 ? ArrowDownLeft : from.x - pos.x > 8 ? ArrowDownRight : ArrowDown;
            // A contact reaction's mark (round 3): the guardian shocks back whoever touches it.
            const shock = preview?.shock ? (
              <span
                className={`pw-shock-mark ${preview.shock.element ? `el-${preview.shock.element}` : ""} ${
                  faint ? "faint" : ""
                }`}
                title={`${preview.shock.name}: striking it in contact triggers its reaction, ${preview.shock.damage} damage back.`}
                aria-hidden="true"
              >
                <Zap />
                shocks back
                <b>−{preview.shock.damage}</b>
              </span>
            ) : null;
            const marks = preview && !faint ? (
              <>
                {preview.statuses.map((s) => (
                  <span
                    key={`ghost-${s.status}`}
                    className={`pw-status-badge condition group-${s.group} ghost ${
                      s.immune ? "immune" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <GroupIcon group={s.group} />
                    {s.status}
                    <small>{s.immune ? "immune" : `${s.chance}%`}</small>
                  </span>
                ))}
                {preview.notes.map((n) => (
                  <span
                    key={`note-${n.text}`}
                    className={`pw-status-badge ghost note-${n.kind} ${
                      n.kind === "guard"
                        ? "group-guarding"
                        : n.kind === "clear"
                        ? "group-mending"
                        : ""
                    }`}
                    aria-hidden="true"
                  >
                    {n.kind === "guard" ? <Shield /> : n.kind === "clear" ? <Sparkles /> : null}
                    {n.text}
                  </span>
                ))}
              </>
            ) : null;
            return (
              <div
                key={u.id}
                className={`pw-scene-unit el-${u.element} ${
                  u.enemy ? "defender" : "ally"
                } ${u.species === "guardian" ? "guardian" : ""} ${
                  selected ? "selected" : ""
                } ${acting ? `performing ${melee ? "melee" : "ranged"}` : ""} ${
                  receiving && impact ? "receiving" : ""
                } ${u.hp <= 0 && !beforeKnockout ? "fallen" : ""} ${
                  u.hp > 0 && u.charge ? "charged" : ""
                } ${u.hp > 0 && u.bound ? "restrained" : ""} ${
                  u.hp > 0 && u.ward ? "protected" : ""
                } ${aiming?.id === u.id || aimedIds.has(u.id) ? "aimed" : ""} ${
                  receiving && knockout && impact ? "just-fallen" : ""
                } ${target ? "targetable" : ""} ${
                  preview?.role === "reached" ? "reached" : ""
                } ${preview?.danger ? "danger" : ""} ${preview?.muted ? "muted" : ""} ${
                  ineligible ? "ineligible" : ""
                } ${faint ? "hinted" : ""} ${resting ? "resting" : ""}`}
                data-unit={u.id}
                onMouseEnter={() => setPeek(u.id)}
                onMouseLeave={() => setPeek((p) => (p === u.id ? null : p))}
                onFocus={() => setPeek(u.id)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                    setPeek((p) => (p === u.id ? null : p));
                }}
                style={
                  {
                    left: `${pos.x}%`,
                    "--lane-shift": `${laneShift(u)}%`,

                    "--travel-x": `${
                      source && destination ? destination.x - source.x : 0
                    }cqw`,
                    "--travel-y": `${
                      source && destination ? (destination.y - source.y) * 0.95 : 0
                    }cqh`,
                  } as React.CSSProperties
                }
              >
                <button
                  className={`pw-scene-character ${
                    u.enemy || target ? "pw-target" : ""
                  } ${target ? "valid-target" : ""} ${
                    target && !u.enemy ? "squadmate-target" : ""
                  }`}
                  aria-label={
                    target
                      ? `Target ${u.enemy ? `${u.name} ${u.id}` : `${u.name} (squadmate)`}${
                          reading?.words ? `: ${reading.words}` : ""
                        }`
                      : u.enemy
                      ? `Target ${u.name} ${u.id}`
                      : `Select ${u.name}`
                  }
                  aria-haspopup={!u.enemy && !target ? "menu" : undefined}
                  aria-expanded={!u.enemy && !target ? ringOpen : undefined}
                  aria-describedby={!u.enemy && chip ? `order-${u.id}` : undefined}
                  disabled={!planning || u.hp <= 0 || (u.enemy && !!move && !target)}
                  onClick={(e) => act(e.detail === 0)}
                  onMouseEnter={() => (u.enemy || target) && onHover(u.id)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => (u.enemy || target) && onHover(u.id)}
                  onBlur={() => onHover(null)}
                >
                  <span className="pw-ground" />
                  {selected && <span className="pw-ground-ring" aria-hidden="true" />}
                  {((target && !idle) || preview?.role === "reached" || (faint && preview)) && (
                    <span
                      className={`pw-target-ring ${
                        preview?.role === "reached" ? "area" : ""
                      } ${preview?.danger ? "danger" : ""} ${faint ? "faint" : ""}`}
                      aria-hidden="true"
                    />
                  )}
                  {flashing && (
                    <span
                      key={`flash-${flash!.stamp}`}
                      className="pw-target-flash"
                      aria-hidden="true"
                    />
                  )}
                  <span className="pw-actor-art" key={`${u.id}-${frameIndex}`}>
                    <Portrait u={u} />
                  </span>
                  {u.hp > 0 && u.bound > 0 && (
                    <span className="pw-binding" aria-hidden="true">
                      <Link2 />
                    </span>
                  )}
                  {u.hp > 0 && u.ward && (
                    <span className="pw-barrier" aria-hidden="true">
                      <Shield />
                    </span>
                  )}
                  {u.hp > 0 && u.charge && (
                    <span className="pw-charge-aura" aria-hidden="true">
                      <Zap />
                    </span>
                  )}
                  {preview?.pull && !faint && (
                    <span className="pw-pull-arrow" aria-hidden="true">
                      <Pull />
                    </span>
                  )}
                  {(recoil ||
                    (receiving && impact && phase !== "redirect") ||
                    (acting &&
                      ["charge", "blocked", "lost", "expired", "react"].includes(
                        phase
                      ))) && (
                    <span
                      key={`float-${frameIndex}`}
                      className={`pw-scene-float ${phase} ${
                        event?.group === "mending" ? "mending" : ""
                      }`}
                    >
                      {phase === "blocked" && <Ban aria-hidden="true" />}
                      {phase === "redirect" && <CornerUpRight aria-hidden="true" />}
                      {recoil ? "−2" : floatLabel(event)}
                      {recoil && <small>Recoil</small>}
                      {phase === "hit" && u.hp === 0 && <small>Knocked out</small>}
                    </span>
                  )}
                </button>
                <div
                  className="pw-unit-plaque"
                  onClick={(e) => {
                    if ((e.target as Element).closest("button") || !pressable) return;
                    act(false);
                  }}
                >
                  <div>
                    {u.enemy && <ElementIcon element={u.element} />}
                    <strong>{labelFor(u)}</strong>
                    <button
                      aria-label={`Inspect ${u.name}${
                        u.enemy ? ` ${u.id}` : " on battlefield"
                      }`}
                      onClick={() => onInspect(u.id)}
                    >
                      <Info />
                    </button>
                  </div>
                  <Health u={u} preview={preview && faint ? { ...preview, faint } : preview} />
                  {chip && (
                    <button
                      className={`pw-order-chip ${chip.move ? "" : "empty"} ${
                        chip.status === "Acted" ? "done" : ""
                      } ${
                        flash && !reducedMotion && flash.actor === u.id ? "just-set" : ""
                      }`}
                      key={flash && flash.actor === u.id ? `chip-${flash.stamp}` : "chip"}
                      disabled={!planning || u.hp <= 0}
                      tabIndex={-1}
                      title={chip.move ? chip.move.name : undefined}
                      aria-label={
                        !planning || u.hp <= 0
                          ? `${u.name}'s order: ${chipText(chip)}`
                          : chip.move
                          ? `Change ${u.name}'s order: ${chipText(chip)}`
                          : `Give ${u.name} an order`
                      }
                      onClick={(e) => open(u, e.detail === 0)}
                    >
                      {chip.move ? (
                        <>
                          <span
                            className={`pw-order-chip-icon ${
                              chip.move.element && !chip.move.fallback
                                ? `elemental el-${chip.move.element}`
                                : "physical"
                            }`}
                            aria-hidden="true"
                          >
                            <MoveIcon move={chip.move} />
                          </span>
                          <span className="pw-order-chip-move">
                            {baseName(chip.move)}
                          </span>
                          <span className="pw-order-chip-target">
                            {chip.status ? (
                              chip.status
                            ) : (
                              <>
                                <ArrowRight />
                                {chip.target ?? "Self"}
                              </>
                            )}
                          </span>
                        </>
                      ) : chip.empty === "No order" ? (
                        // An empty slot waiting for an order (round 3): the dashed chip and a
                        // quiet plus say it; the words stay in its name and description.
                        <Plus className="pw-order-chip-open" aria-hidden="true" />
                      ) : (
                        <span className="pw-order-chip-move">{chip.empty}</span>
                      )}
                      <span className="pw-sr" id={`order-${u.id}`}>
                        {chipText(chip)}
                      </span>
                    </button>
                  )}
                  {!u.enemy &&
                    preview &&
                    (preview.statuses.length > 0 || preview.notes.length > 0) && (
                      // A squadmate stands low on the stage, so its marks sit just above
                      // its plaque, where they stay on the stage whatever it carries.
                      <span className="pw-preview-marks">{marks}</span>
                    )}
                  {!u.enemy && shock && <span className="pw-preview-marks">{shock}</span>}
                </div>
                <div className="pw-scene-status">
                  <StatusBadges u={u} compact />
                  {u.enemy && marks}
                  {u.enemy && shock}
                </div>
                {planning && !move && queued.length > 0 && peek === u.id && (
                  // Who already aims here, shown only while this unit is hovered or
                  // focused, and named (round 2 review). While a move is armed the
                  // target's own preview speaks instead.
                  <div
                    className="pw-target-orders"
                    role="group"
                    aria-label={`Targeted by ${queued.map((p) => p.name).join(" and ")}`}
                  >
                    <span className="pw-target-orders-label">
                      Targeted by {queued.map((p) => p.name).join(" and ")}
                    </span>
                    {queued.map((p) => (
                      <button
                        key={p.id}
                        className={`pw-order-link ${active?.id === p.id ? "active" : ""}`}
                        aria-label={`Edit ${p.name}'s order targeting ${labelFor(u)}`}
                        onClick={(e) => open(p, e.detail === 0)}
                      >
                        <Portrait u={p} small />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {frame &&
          (signature ||
            phase === "blocked" ||
            phase === "redirect" ||
            (bossDefeat && impact)) && (
            <div className={`pw-action-banner ${phase}`} key={`banner-${frameIndex}`}>
              {bossDefeat && impact ? (
                <Crown />
              ) : phase === "blocked" ? (
                <Ban />
              ) : phase === "redirect" ? (
                <CornerUpRight />
              ) : (
                <Crown />
              )}
              <div>
                <small>
                  {bossDefeat && impact
                    ? "Defense disabled"
                    : phase === "blocked"
                    ? "Stopped by binding"
                    : phase === "redirect"
                    ? "Target changed"
                    : `${actor?.name} · Signature`}
                </small>
                <strong>
                  {bossDefeat && impact
                    ? "The guardian falls"
                    : phase === "redirect"
                    ? `Now targeting ${recipient ? labelFor(recipient) : ""}`
                    : event?.moveName || "Cannot act"}
                </strong>
              </div>
            </div>
          )}
        <div className="pw-scene-heading">
          <span>{sectorStory[room].place}</span>
          {room === 3 && (
            <strong>
              <Crown /> Central guardian
            </strong>
          )}
        </div>
        {arriving && (
          <div className="pw-arrival" aria-hidden="true">
            <span>Sector {room + 1} / 4</span>
            <strong>{sectorStory[room].name}</strong>
          </div>
        )}
        {ring}
      </section>
    </StageContext.Provider>
  );
}
