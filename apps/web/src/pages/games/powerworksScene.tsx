// Tier: immersive. A shared stage for the squad and the facility defenses.
import React, { useEffect, useState } from "react";
import {
  Check,
  Crosshair,
  Info,
  Link2,
  Crown,
  ArrowRight,
  Shield,
  Zap,
  CornerUpRight,
  Ban,
  HeartPulse,
} from "lucide-react";
import { actionPresentation } from "./powerworksPresentation";
import { PowerworksEnvironment } from "./powerworksEnvironment";
import {
  damagePreview,
  matchup,
  type BattleEvent,
  type Frame,
  type Move,
  type Order,
  type Unit,
} from "@xalians/rules/dungeon";
import {
  ElementIcon,
  Health,
  MoveIcon,
  Portrait,
  StatusBadges,
  PowerIcon,
  baseName,
  binds,
  harms,
  melee as contact,
} from "./powerworksVisuals";

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
  previewText,
  onTarget,
  onSelect,
  onInspect,
  onHover,
  onOpen,
  onBack,
  openId = null,
  chips = {},
  ring = null,
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
  previewText: (u: Unit) => string;
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
  const targetable = (u: Unit) =>
    planning && !!move && u.hp > 0 && targets.has(u.id);
  const aiming =
    planning && move && targetId
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
    intents
      .filter((i) => i.id === active?.id)
      .map((i) => plans[i.id].target)
  );
  const phase = event?.kind || "idle";
  const style = {
    "--action-time": `${presentation.impactDelay / 0.28 / speed}ms`,
    "--impact-delay": `${presentation.impactDelay / speed}ms`,
  } as React.CSSProperties;
  return (
    <section
      onClick={(e) => {
        if (!planning || !onBack) return;
        if (
          (e.target as Element).closest(
            "button, .pw-radial, .pw-radial-detail, .pw-unit-plaque"
          )
        )
          return;
        onBack();
      }}
      className={`pw-theater sector-${room} ${frame ? "playing" : "planning"} ${
        paused ? "paused" : ""
      } ${arriving ? "arriving" : ""} ${signature ? "signature-action" : ""} ${
        knockout && impact ? "knockout-action" : ""
      } ${bossDefeat && impact ? "boss-defeat" : ""}`}
      aria-label="Battlefield"
      style={style}
      data-impact={impact}
      data-action={phase}
    >
      <PowerworksEnvironment room={room} />
      <div className="pw-room-prop" aria-hidden="true">
        {room === 1 ? <Shield /> : room >= 2 ? <Zap /> : null}
      </div>
      {frame &&
        (signature ||
          phase === "blocked" ||
          phase === "redirect" ||
          (bossDefeat && impact)) && (
          <div
            className={`pw-action-banner ${phase}`}
            key={`banner-${frameIndex}`}
          >
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
            className="pw-aim-path"
            d={`M${source.x} ${source.y} Q50 45 ${aimPoint.x} ${aimPoint.y}`}
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
        // The figure and its plaque are one selection control (decision 2).
        const act = (keyboard: boolean) =>
          target
            ? onTarget(u.id, keyboard)
            : u.enemy
            ? onInspect(u.id)
            : onSelect(u, keyboard);
        const target = targetable(u);
        const pressable =
          planning && u.hp > 0 && !(u.enemy && !!move && !target);
        const estimate =
          target && active && u.enemy && harms(move!)
            ? damagePreview(active, move!, u)
            : 0;
        const recoil =
          acting &&
          phase === "hit" &&
          event?.moveName === "Desperate strike" &&
          impact;
        const beforeKnockout = receiving && !impact;
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
            } ${
              aiming?.id === u.id || aimedIds.has(u.id) ? "aimed" : ""
            } ${receiving && knockout && impact ? "just-fallen" : ""}`}
            data-unit={u.id}
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
                u.enemy
                  ? `Target ${u.name} ${u.id}`
                  : target
                  ? `Target ${u.name} (squadmate)`
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
              {!u.enemy && (
                <span className="pw-squad-number" aria-hidden="true">
                  {team.indexOf(u) + 1}
                </span>
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
              {target && <Crosshair className="pw-scene-reticle" />}
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
                <ElementIcon element={u.element} />
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
              <Health u={u} estimate={estimate} />
              {chip && (
                <button
                  className={`pw-order-chip ${chip.move ? "" : "empty"} ${
                    chip.status === "Acted" ? "done" : ""
                  }`}
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
                      <MoveIcon move={chip.move} />
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
                  ) : (
                    <span className="pw-order-chip-move">{chip.empty}</span>
                  )}
                  <span className="pw-sr" id={`order-${u.id}`}>
                    {chipText(chip)}
                  </span>
                </button>
              )}
              {target && !u.enemy && (
                // A squadmate stands low on the stage, so its preview sits just above
                // its plaque rather than below its conditions, where it would leave the
                // stage (pass 5 paint check).
                <span className="pw-scene-preview support">
                  <HeartPulse />
                  {previewText(u)}
                </span>
              )}
            </div>
            <div className="pw-scene-status">
              <StatusBadges u={u} />
            </div>
            {planning && queued.length > 0 && (
              <div className="pw-target-orders">
                {queued.map((p) => (
                  <button
                    key={p.id}
                    className={`pw-order-link ${
                      active?.id === p.id ? "active" : ""
                    }`}
                    aria-label={`Edit ${p.name}'s order targeting ${labelFor(
                      u
                    )}`}
                    onClick={(e) => open(p, e.detail === 0)}
                  >
                    <span>{team.indexOf(p) + 1}</span>
                    <Portrait u={p} small />
                  </button>
                ))}
              </div>
            )}
            {target && u.enemy && (
              <span
                className={`pw-scene-preview ${
                  active && matchup(active, u, move!) > 1 ? "strong" : ""
                }`}
              >
                {binds(move!) && !harms(move!) ? <Link2 /> : <PowerIcon />}
                {previewText(u)}
              </span>
            )}
          </div>
        );
      })}
      {ring}
      {planning && (move || enemies.some((u) => u.charge && u.hp > 0)) && (
        <div className="pw-scene-direction targeting">
          {move ? (
            <>
              <Crosshair />
              <strong>{move.name}</strong>
              <ArrowRight />
              <span>
                {team.some((u) => targetable(u))
                  ? "Choose an enemy or a squadmate"
                  : "Choose an enemy"}
              </span>
            </>
          ) : (
            <>
              <Zap />
              <strong>Charged defense</strong>
              <span>A release is coming</span>
            </>
          )}
        </div>
      )}
    </section>
  );
}
