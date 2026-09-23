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
  Portrait,
  StatusBadges,
  PowerIcon,
  binds,
  harms,
  melee as closing,
} from "./powerworksVisuals";

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
    default:
      return "Redirected";
  }
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
}) {
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
    (action ? closing(action) : false) || event?.moveName === "Desperate strike";
  const presentation = actionPresentation(frame);
  const { signature, knockout, bossDefeat } = presentation;
  const point = (u: Unit) => ({
    x:
      (u.enemy ? (enemies.length === 2 ? 30 : 20) : 14) +
      ((u.enemy ? enemies : team).indexOf(u) *
        (u.enemy ? (enemies.length === 2 ? 40 : 60) : 72)) /
        Math.max(1, (u.enemy ? enemies : team).length - 1),
    y: u.enemy ? 29 : 75,
  });
  // Center a lone defender rather than leaving it in the first slot.
  const position = (u: Unit) =>
    u.enemy && enemies.length === 1 ? { x: 50, y: 29 } : point(u);
  const source = actor
    ? position(actor)
    : active
    ? position(team.find((u) => u.id === active.id) || team[0])
    : null;
  const destination = recipient ? position(recipient) : null;
  const aiming =
    planning && move && targetId
      ? enemies.find((u) => u.id === targetId && u.hp > 0)
      : null;
  const aimPoint = aiming ? position(aiming) : null;
  const queuedTarget =
    planning && !move && active && plans[active.id]
      ? enemies.find((u) => u.id === plans[active.id].target && u.hp > 0)
      : null;
  const queuedPoint = queuedTarget ? position(queuedTarget) : null;
  const phase = event?.kind || "idle";
  const style = {
    "--action-time": `${presentation.impactDelay / 0.28 / speed}ms`,
    "--impact-delay": `${presentation.impactDelay / speed}ms`,
  } as React.CSSProperties;
  return (
    <section
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
        {queuedPoint && source && (
          <path
            className="pw-queued-path"
            d={`M${source.x} ${source.y} Q50 45 ${queuedPoint.x} ${queuedPoint.y}`}
          />
        )}
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
          ["hit", "bind", "status", "redirect"].includes(event.kind) && (
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
          .filter(([, q]) => q.target === u.id)
          .map(([id]) => team.find((p) => p.id === id)!);
        const estimate =
          planning &&
          move &&
          active &&
          u.enemy &&
          u.hp > 0 &&
          harms(move)
            ? damagePreview(active, move, u)
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
              aiming?.id === u.id || queuedTarget?.id === u.id ? "aimed" : ""
            } ${receiving && knockout && impact ? "just-fallen" : ""}`}
            style={
              {
                left: `${pos.x}%`,

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
              className={`pw-scene-character ${u.enemy ? "pw-target" : ""} ${
                planning && move && u.enemy && u.hp > 0 ? "valid-target" : ""
              }`}
              aria-label={
                u.enemy
                  ? `Target ${u.name} ${u.id}`
                  : `Plan ${u.name} on battlefield`
              }
              aria-pressed={!u.enemy ? selected : undefined}
              disabled={!planning || u.hp <= 0}
              onClick={(e) =>
                u.enemy
                  ? move
                    ? onTarget(u.id, e.detail === 0)
                    : onInspect(u.id)
                  : onSelect(u, e.detail === 0)
              }
              onMouseEnter={() => u.enemy && onHover(u.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => u.enemy && onHover(u.id)}
              onBlur={() => onHover(null)}
            >
              <span className="pw-ground" />
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
              {u.enemy && planning && move && u.hp > 0 && (
                <Crosshair className="pw-scene-reticle" />
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
            <div className="pw-unit-plaque">
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
                    onClick={(e) => onSelect(p, e.detail === 0)}
                  >
                    <span>{team.indexOf(p) + 1}</span>
                    <Portrait u={p} small />
                  </button>
                ))}
              </div>
            )}
            {planning && !u.enemy && plans[u.id]?.target && (
              <span className="pw-planned-destination">
                <ArrowRight />
                {labelFor(
                  enemies.find((e) => e.id === plans[u.id].target) || u
                )}
              </span>
            )}
            {planning && move && u.enemy && u.hp > 0 && (
              <span
                className={`pw-scene-preview ${
                  active && matchup(active, u, move) > 1 ? "strong" : ""
                }`}
              >
                {binds(move) && !harms(move) ? <Link2 /> : <PowerIcon />}
                {previewText(u)}
              </span>
            )}
          </div>
        );
      })}
      {planning && (move || enemies.some((u) => u.charge && u.hp > 0)) && (
        <div className="pw-scene-direction targeting">
          {move ? (
            <>
              <Crosshair />
              <strong>{move.name}</strong>
              <ArrowRight />
              <span>Choose an enemy</span>
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
