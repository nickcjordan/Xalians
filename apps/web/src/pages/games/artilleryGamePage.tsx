// Tier: immersive. Crater Command is active artillery play inside the Arcade shell.
import * as React from 'react';
import {
  ARTILLERY_HEIGHT,
  ARTILLERY_MAX_INTEGRITY,
  ARTILLERY_MAX_TRACTION,
  ARTILLERY_PAYLOAD_RULES,
  ARTILLERY_WIDTH,
  applyArtilleryShot,
  artilleryMovedX,
  chooseArtilleryBotShot,
  createArtilleryState,
  simulateArtilleryShot,
  terrainHeight,
  type ArtilleryMode,
  type ArtilleryMove,
  type ArtilleryOutcome,
  type ArtilleryPayload,
  type ArtillerySide,
  type ArtilleryShot,
  type ArtilleryState,
} from '@xalians/rules/arcade';

import { arcadeGame } from '@/arcade/catalog';
import { createArtillerySound } from '@/arcade/artillerySound';
import { arcadeSessionId, completeArcadeGame, dailyArcadeSeed, practiceArcadeSeed } from '@/arcade/progress';
import { ArcadeGameShell } from '@/components/arcade/ArcadeGameShell';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import XalianImage from '@/components/xalianImage';

const GAME = arcadeGame('artillery')!;

type AnimatedShot = { outcome: ArtilleryOutcome; progress: number; shooter: ArtillerySide; shot: Required<ArtilleryShot> } | null;
type LastShot = { outcome: ArtilleryOutcome; shooter: ArtillerySide; shot: Required<ArtilleryShot>; wind: number; targetX: number } | null;

const CREWS = {
  left: { name: 'Codazzo', type: 'Rock', role: 'Regenerative artillery crew' },
  right: { name: 'Terragoyle', type: 'Rock', role: 'Levitational range crew' },
} as const;

const PAYLOAD_META: Record<ArtilleryPayload, {
  label: string;
  shortLabel: string;
  detail: string;
  purpose: string;
  glyph: string;
  elementClass: string;
}> = {
  shell: { label: 'Core shell', shortLabel: 'Core', detail: 'One round · balanced surface blast · unlimited', purpose: 'Precise', glyph: '●', elementClass: 'el-metal' },
  barb: { label: 'Barb fan', shortLabel: 'Fan', detail: 'Three Codazzo barbs · broad coverage · 2', purpose: '3-way spread', glyph: '⋰', elementClass: 'el-rock' },
  bore: { label: 'Bore charge', shortLabel: 'Bore', detail: 'Drilltail penetrator · underground blast · 2', purpose: 'Burrows', glyph: '◆', elementClass: 'el-sand' },
};

const BARREL_LENGTH = 4.2;
const AIM_PREVIEW_POINTS = 14;
const RANGE_STARS = [
  [7, 9, 0.16], [14, 16, 0.1], [22, 7, 0.12], [31, 13, 0.08], [38, 5, 0.14],
  [47, 18, 0.09], [57, 8, 0.15], [65, 15, 0.1], [73, 5, 0.08], [82, 13, 0.14],
  [91, 8, 0.1], [96, 20, 0.08], [4, 25, 0.08], [27, 23, 0.11], [52, 27, 0.07],
] as const;

export function artilleryBarrelEndpoint(
  x: number,
  y: number,
  side: 'left' | 'right',
  angle: number,
) {
  const radians = (angle * Math.PI) / 180;
  const direction = side === 'left' ? 1 : -1;
  return {
    x: x + Math.cos(radians) * BARREL_LENGTH * direction,
    y: y - Math.sin(radians) * BARREL_LENGTH,
  };
}

function FireControl({ label, value, suffix = '', min, max, disabled, onChange }: {
  label: string;
  value: number;
  suffix?: string;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <span className="flex justify-between type-legend"><span>{label}</span><span className="type-data">{value}{suffix}</span></span>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <Button type="button" size="icon-sm" variant="secondary" disabled={disabled || value <= min} aria-label={`Decrease ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, value - 1))}>−</Button>
        <Slider value={[value]} min={min} max={max} step={1} disabled={disabled} onValueChange={([next]: number[]) => onChange(next)} aria-label={`Firing ${label.toLowerCase()}`} />
        <Button type="button" size="icon-sm" variant="secondary" disabled={disabled || value >= max} aria-label={`Increase ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + 1))}>+</Button>
      </div>
    </div>
  );
}

function ArtilleryBoard({ seed, mode, onStatus, onComplete, onRematch }: {
  seed: string;
  mode: ArtilleryMode;
  onStatus: (status: string) => void;
  onComplete: (result: { score: number; actions: ArtilleryShot[] }) => void;
  onRematch: () => void;
}) {
  const [state, setState] = React.useState<ArtilleryState>(() => createArtilleryState(seed, mode));
  const [angle, setAngle] = React.useState(45);
  const [power, setPower] = React.useState(70);
  const [payload, setPayload] = React.useState<ArtilleryPayload>('shell');
  const [move, setMove] = React.useState<ArtilleryMove>(0);
  const [settledAim, setSettledAim] = React.useState<Record<'left' | 'right', number>>({ left: 45, right: 45 });
  const [animated, setAnimated] = React.useState<AnimatedShot>(null);
  const [lastShot, setLastShot] = React.useState<LastShot>(null);
  const [lastShotsBySide, setLastShotsBySide] = React.useState<Record<ArtillerySide, LastShot>>({ left: null, right: null });
  const sound = React.useMemo(() => createArtillerySound(), []);
  const [soundOn, setSoundOn] = React.useState(() => sound.enabled());
  const pendingTimers = React.useRef<number[]>([]);
  const completed = React.useRef(false);
  const actions = React.useRef<ArtilleryShot[]>([]);
  const botScheduled = React.useRef(false);

  React.useEffect(() => () => {
    pendingTimers.current.forEach(window.clearTimeout);
    sound.dispose();
  }, [sound]);

  const animateShot = React.useCallback((shot: ArtilleryShot) => {
    if (animated || state.phase !== 'aiming') return;
    const resolvedShot: Required<ArtilleryShot> = {
      angle: Math.round(shot.angle),
      power: Math.round(shot.power),
      payload: shot.payload ?? 'shell',
      move: shot.move ?? 0,
    };
    setSettledAim((current) => ({ ...current, [state.current]: shot.angle }));
    if (mode === 'bot' && state.current === 'left') actions.current.push(resolvedShot);
    const applied = applyArtilleryShot(state, resolvedShot);
    const longestPath = Math.max(...applied.outcome.projectiles.map((projectile) => projectile.path.length));
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const frames = reduced ? 1 : Math.min(36, longestPath);
    let frame = 0;
    setAnimated({ outcome: applied.outcome, progress: 0, shooter: state.current, shot: resolvedShot });
    sound.play('launch', resolvedShot.payload);
    onStatus(`${state.current === 'left' ? 'Left' : 'Right'} crawler fired.`);
    const tick = () => {
      frame += 1;
      const progress = Math.min(1, frame / frames);
      setAnimated({ outcome: applied.outcome, progress, shooter: state.current, shot: resolvedShot });
      if (progress < 1) {
        pendingTimers.current.push(window.setTimeout(tick, reduced ? 1 : 18));
        return;
      }
      sound.play(applied.outcome.hit ? 'hit' : 'impact', applied.outcome.payload);
      pendingTimers.current.push(window.setTimeout(() => {
        setAnimated(null);
        const targetSide = state.current === 'left' ? 'right' : 'left';
        const target = state.tanks[targetSide];
        const shotRecord = { outcome: applied.outcome, shooter: state.current, shot: resolvedShot, wind: state.wind, targetX: target.x };
        setLastShot(shotRecord);
        setLastShotsBySide((current) => ({ ...current, [state.current]: shotRecord }));
        setState(applied.state);
        setMove(0);
        const payloadName = PAYLOAD_META[applied.outcome.payload].label;
        let result = `${payloadName} left the range.`;
        if (applied.outcome.hit) {
          result = `${payloadName} hit the ${CREWS[applied.outcome.hit].name} battery. ${applied.state.tanks[applied.outcome.hit].integrity} integrity remains.`;
        } else if (applied.outcome.impact) {
          const signedMiss = state.current === 'left'
            ? applied.outcome.impact.x - target.x
            : target.x - applied.outcome.impact.x;
          result = `${payloadName} landed ${Math.max(1, Math.round(Math.abs(signedMiss)))} ${signedMiss > 0 ? 'long' : 'short'}.`;
        }
        const windLabel = applied.state.wind === 0 ? 'still' : `${Math.abs(applied.state.wind)} ${applied.state.wind > 0 ? 'right' : 'left'}`;
        const message = `${result} ${state.current === 'left' && !applied.state.winner ? `Wind holds at ${windLabel} through the reply.` : `Next volley wind: ${windLabel}.`}`;
        onStatus(message);
      }, reduced ? 1 : 220));
    };
    tick();
  }, [animated, mode, onStatus, sound, state]);

  React.useEffect(() => {
    if (state.phase === 'finished' && state.winner && !completed.current) {
      completed.current = true;
      if (state.winner === 'left' && mode === 'bot') {
        sound.play('win');
        onComplete({ score: Math.max(0, 1000 - state.turn * 40), actions: actions.current });
      } else if (mode === 'bot') {
        sound.play('loss');
        onStatus('The Terragoyle battery disabled your crawler. Start a new match to retake the range.');
      } else {
        onStatus(`${CREWS[state.winner].name} holds the range after ${state.turn} shots.`);
      }
      return;
    }
    if (mode === 'bot' && state.current === 'right' && state.phase === 'aiming' && !animated) {
      if (botScheduled.current) return;
      botScheduled.current = true;
      onStatus('Rival crawler is ranging its shot.');
      pendingTimers.current.push(window.setTimeout(() => {
        botScheduled.current = false;
        animateShot(chooseArtilleryBotShot(state));
      }, 550));
    }
  }, [animateShot, animated, mode, onComplete, onStatus, sound, state]);

  React.useEffect(() => {
    if (payload !== 'shell' && state.payloads[state.current][payload] <= 0) setPayload('shell');
    if (state.traction[state.current] <= 0 && move !== 0) setMove(0);
  }, [move, payload, state.current, state.payloads, state.traction]);

  const terrainPath = React.useMemo(() => {
    const points = state.terrain.map((height, x) => `L ${x} ${ARTILLERY_HEIGHT - height}`).join(' ');
    return `M 0 ${ARTILLERY_HEIGHT} ${points} L ${ARTILLERY_WIDTH} ${ARTILLERY_HEIGHT} Z`;
  }, [state.terrain]);
  const terrainContours = React.useMemo(() => [4, 8].map((offset) =>
    state.terrain.filter((_, x) => x % 2 === 0).map((height, index) => {
      const x = index * 2;
      return `${index === 0 ? 'M' : 'L'} ${x} ${Math.min(ARTILLERY_HEIGHT, ARTILLERY_HEIGHT - height + offset)}`;
    }).join(' ')
  ), [state.terrain]);
  const distantTerrainPath = React.useMemo(() => {
    const ridge = state.terrain.filter((_, x) => x % 4 === 0).map((height, index) => {
      const x = index * 4;
      return `L ${x} ${35 - height * 0.22}`;
    }).join(' ');
    return `M 0 ${ARTILLERY_HEIGHT} L 0 32 ${ridge} L ${ARTILLERY_WIDTH} ${ARTILLERY_HEIGHT} Z`;
  }, [state.terrain]);
  const canFire = !animated && state.phase === 'aiming' && (mode === 'local' || state.current === 'left');
  const animatedProjectiles = React.useMemo(() => animated?.outcome.projectiles.map((projectile) => {
    const finalIndex = Math.max(0, projectile.path.length - 1);
    const pointIndex = Math.min(finalIndex, Math.floor(animated.progress * finalIndex));
    return { point: projectile.path[pointIndex], path: projectile.path.slice(0, pointIndex + 1) };
  }) ?? [], [animated]);
  const impactFrames = animated?.progress === 1
    ? animated.outcome.projectiles.flatMap((projectile) => projectile.impact ? [projectile.impact] : [])
    : [];
  const aimOutcome = React.useMemo(
    () => canFire ? simulateArtilleryShot(state, { angle, power, payload, move }) : null,
    [angle, canFire, move, payload, power, state],
  );
  const aimPreviews = aimOutcome?.projectiles.map((projectile) => projectile.path.slice(0, AIM_PREVIEW_POINTS)) ?? [];
  const activePayload = animated?.outcome.payload ?? payload;
  const activePayloadMeta = PAYLOAD_META[activePayload];
  const impactMoment = animated?.progress === 1;
  const shotShake = impactMoment && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? (activePayload === 'bore' ? -0.38 : 0.28)
    : 0;

  const payloadRemaining = (side: ArtillerySide, choice: ArtilleryPayload) =>
    choice === 'shell' ? Number.POSITIVE_INFINITY : state.payloads[side][choice];

  const referenceShot = state.phase === 'finished' ? lastShot : lastShotsBySide[state.current] ?? lastShot;
  const referenceShotLabel = React.useMemo(() => {
    if (!referenceShot) return null;
    const targetSide = referenceShot.shooter === 'left' ? 'right' : 'left';
    if (referenceShot.outcome.hit) return `${PAYLOAD_META[referenceShot.outcome.payload].shortLabel} hit ${CREWS[targetSide].name}`;
    if (!referenceShot.outcome.impact) return `${PAYLOAD_META[referenceShot.outcome.payload].shortLabel} left the range`;
    const signedMiss = referenceShot.shooter === 'left'
      ? referenceShot.outcome.impact.x - referenceShot.targetX
      : referenceShot.targetX - referenceShot.outcome.impact.x;
    return `${PAYLOAD_META[referenceShot.outcome.payload].shortLabel} · ${Math.max(1, Math.round(Math.abs(signedMiss)))} ${signedMiss > 0 ? 'long' : 'short'}`;
  }, [referenceShot]);
  const botThreatened = !!state.lastImpact && Math.abs(state.lastImpact.x - state.tanks.right.x) <= 8 && state.traction.right > 0;
  const botIntent = botThreatened ? 'Evasive reposition' : state.botPrevious ? 'Correcting range' : 'Measuring range';
  const resultSide = mode === 'bot' ? 'left' : state.winner ?? 'left';
  const resultGrade = mode === 'local' || state.winner === 'left'
    ? state.turn <= 5 ? 'S' : state.turn <= 7 ? 'A' : 'B'
    : state.turn >= 8 ? 'C' : 'D';
  const resultSpecialsSpent = 4 - state.payloads[resultSide].barb - state.payloads[resultSide].bore;
  const rangeNote = state.turn === 0
    ? 'Core gives the cleanest first ranging record. The dashed guide shows launch direction, not the hidden landing point.'
    : referenceShot?.shooter === state.current
      ? `Correct from the ${referenceShotLabel?.toLowerCase() ?? 'last impact'} above; the wind changed only after the rival reply.`
      : 'Watch the rival impact, then use movement if its next correction threatens your shelf.';

  const tank = (side: 'left' | 'right') => {
    const value = state.tanks[side];
    const animatedMove = animated?.shooter === side ? animated.shot.move : 0;
    const displayX = animated?.shooter === side
      ? artilleryMovedX(state, side, animatedMove)
      : canFire && state.current === side ? artilleryMovedX(state, side, move) : value.x;
    const y = ARTILLERY_HEIGHT - terrainHeight(state.terrain, displayX) - 1.5;
    const originY = ARTILLERY_HEIGHT - terrainHeight(state.terrain, value.x) - 1.5;
    const displayAngle = canFire && state.current === side ? angle : settledAim[side];
    const barrel = artilleryBarrelEndpoint(displayX, y - 1.8, side, displayAngle);
    const crew = CREWS[side];
    const displayedMove = animated?.shooter === side ? animatedMove : move;
    const movementLabel = displayX === value.x ? '' : displayedMove === 1 ? ', advancing' : ', withdrawing';
    const firing = !!animated && state.current === side && animated.progress < 0.2;
    const recoiling = firing && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? Math.sin((animated!.progress / 0.2) * Math.PI) * (side === 'left' ? -0.7 : 0.7)
      : 0;
    const takingDamage = !!impactMoment && animated?.outcome.hit === side;
    const damageJolt = takingDamage && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? (side === 'left' ? -0.45 : 0.45)
      : 0;
    return (
      <g
        className={side === 'left' ? 'el-fire' : 'el-water'}
        aria-label={`${crew.name} crawler, ${value.integrity} integrity${movementLabel}`}
        transform={`translate(${recoiling + damageJolt} 0)`}
      >
        {displayX !== value.x && (
          <g aria-hidden>
            <line x1={value.x} y1={originY} x2={displayX} y2={y} className="stroke-el opacity-50" strokeWidth="0.3" strokeDasharray="0.8 0.8" />
            <rect x={value.x - 1.5} y={originY - 0.7} width="3" height="1.4" className="fill-none stroke-el opacity-30" strokeWidth="0.25" />
          </g>
        )}
        {Array.from({ length: ARTILLERY_MAX_INTEGRITY }, (_, index) => (
          <rect
            key={index}
            x={displayX - 3 + index * 2.1}
            y={y - 7.1}
            width="1.6"
            height="0.75"
            className={index < value.integrity ? 'fill-el' : 'fill-s0 stroke-ink-4'}
            strokeWidth="0.18"
          />
        ))}
        {state.current === side && state.phase === 'aiming' && (
          <g aria-hidden>
            <path d={`M ${displayX} ${y - 8.4} l 0.8 0.8 -0.8 0.8 -0.8 -0.8 Z`} className="fill-viable-hi" />
            <line x1={displayX} y1={y - 6.8} x2={displayX} y2={y - 5.5} className="stroke-viable-hi opacity-70" strokeWidth="0.2" />
          </g>
        )}
        <rect x={displayX - 3.25} y={y + 0.15} width="6.5" height="1.8" rx="0.75" className="fill-ink-4 stroke-black" strokeWidth="0.35" />
        {[-2.1, 0, 2.1].map((offset) => (
          <circle key={offset} cx={displayX + offset} cy={y + 1.05} r="0.58" className="fill-s0 stroke-el" strokeWidth="0.28" />
        ))}
        <path
          d={`M ${displayX - 3.2} ${y + 0.2} L ${displayX - 2.3} ${y - 1.9} L ${displayX + 2.2} ${y - 2.15} L ${displayX + 3.2} ${y + 0.2} Z`}
          className="fill-el stroke-black"
          strokeWidth="0.38"
        />
        <path d={`M ${displayX - 2.15} ${y - 1.85} L ${displayX - 1.2} ${y - 3.05} L ${displayX + 0.75} ${y - 3.05} L ${displayX + 1.55} ${y - 2}`} className="fill-el stroke-black" strokeWidth="0.35" />
        <circle cx={displayX} cy={y - 2.7} r="1.22" className="fill-s0 stroke-el" strokeWidth="0.45" />
        {side === 'left' ? (
          <g aria-hidden>
            <path d={`M ${displayX - 2.4} ${y - 1.75} l -1.2 -1.5 1.75 0.35 -0.45 -1.8 1.65 1`} className="fill-el stroke-black" strokeWidth="0.25" />
            <circle cx={displayX - 0.25} cy={y - 2.85} r="0.35" className="fill-el" />
          </g>
        ) : (
          <g aria-hidden>
            <path d={`M ${displayX - 2.85} ${y - 0.15} q 2.85 1.4 5.7 0 q -2.85 2.2 -5.7 0 Z`} className="fill-el opacity-50" />
            <circle cx={displayX} cy={y - 2.8} r="0.38" className="fill-el" />
          </g>
        )}
        <line
          x1={displayX}
          y1={y - 2.7}
          x2={barrel.x}
          y2={barrel.y - 0.9}
          className="stroke-black"
          strokeWidth="1.3"
        />
        <line
          x1={displayX}
          y1={y - 2.7}
          x2={barrel.x}
          y2={barrel.y - 0.9}
          className="stroke-el"
          strokeWidth="0.58"
          data-testid={`artillery-barrel-${side}`}
          data-angle={displayAngle}
        />
        {firing && (
          <g className={PAYLOAD_META[animated!.outcome.payload].elementClass} aria-hidden>
            <circle cx={barrel.x} cy={barrel.y - 0.9} r="1.1" className="fill-el opacity-30" />
            <circle cx={barrel.x + (side === 'left' ? 0.9 : -0.9)} cy={barrel.y - 0.9} r="0.55" className="fill-el opacity-60" />
            <path d={`M ${barrel.x} ${barrel.y - 0.9} l ${side === 'left' ? 2.3 : -2.3} -0.8 l ${side === 'left' ? -0.8 : 0.8} 1.4 Z`} className="fill-el opacity-30" />
          </g>
        )}
        <rect x={displayX - 3.5} y={y + 1.9} width="1.2" height="0.45" className="fill-el opacity-60" />
        <rect x={displayX + 2.3} y={y + 1.9} width="1.2" height="0.45" className="fill-el opacity-60" />
        {takingDamage && (
          <g className="el-electric" aria-hidden>
            <path d={`M ${displayX} ${y - 4.5} l -1.2 -2.2 1.5 0.7 0.4 -2 1 2.4 1.6 -0.6 -1.1 2.2`} className="fill-none stroke-el" strokeWidth="0.45" />
          </g>
        )}
        {value.integrity < ARTILLERY_MAX_INTEGRITY && (
          <g aria-hidden>
            <circle cx={displayX + (side === 'left' ? -1.4 : 1.4)} cy={y - 4.1} r="0.7" className="fill-ink-3 opacity-30" />
            <circle cx={displayX + (side === 'left' ? -2 : 2)} cy={y - 5.6} r="0.95" className="fill-ink-3 opacity-20" />
            {value.integrity === 1 && <circle cx={displayX + (side === 'left' ? -2.5 : 2.5)} cy={y - 7.4} r="1.25" className="fill-ink-3 opacity-15" />}
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Artillery field" className="min-w-0 self-start border border-edge bg-glass">
        <svg viewBox={`0 0 ${ARTILLERY_WIDTH} ${ARTILLERY_HEIGHT}`} className="block aspect-[5/3] w-full" role="img" aria-label="Codazzo and Terragoyle crawler batteries on destructible terrain">
          <rect width={ARTILLERY_WIDTH} height={ARTILLERY_HEIGHT} className="fill-s0" />
          <circle cx="77" cy="13" r="8.5" className="fill-s1 stroke-ink-4 opacity-60" strokeWidth="0.25" />
          <circle cx="74.5" cy="11" r="1.3" className="fill-s0 opacity-40" />
          <circle cx="80" cy="15.5" r="2" className="fill-s0 opacity-30" />
          {RANGE_STARS.map(([x, y, radius], index) => <circle key={index} cx={x} cy={y} r={radius} className="fill-ink-3" />)}
          <path d={distantTerrainPath} className="fill-s1 stroke-ink-4 opacity-70" strokeWidth="0.25" />
          {[25, 50, 75].map((x) => (
            <g key={x} aria-hidden>
              <line x1={x} y1="24" x2={x} y2="57" className="stroke-ink-4 opacity-40" strokeWidth="0.18" strokeDasharray="0.7 1.2" />
              <path d={`M ${x - 1.1} 28 L ${x} 26.5 L ${x + 1.1} 28`} className="fill-none stroke-ink-4 opacity-50" strokeWidth="0.25" />
              <text x={x} y="25" textAnchor="middle" className="fill-ink-4 font-mono" fontSize="1.25">{x}</text>
            </g>
          ))}
          <g aria-hidden>
            <path d="M 2 33 l 2 -5 2 5 M 3 30 h 2 M 94 31 l 2 -6 2 6 M 95 28 h 2" className="fill-none stroke-ink-4 opacity-60" strokeWidth="0.3" />
            <circle cx="4" cy="27.4" r="0.45" className="fill-viable-hi opacity-60" />
            <circle cx="96" cy="24.4" r="0.45" className="fill-plague-hi opacity-60" />
          </g>
          <g aria-hidden>
            <rect x="2.3" y="2.2" width="30" height="5.4" className="fill-s1 stroke-ink-4 opacity-90" strokeWidth="0.2" />
            <text x="4" y="4.6" className="fill-ink-2 font-mono" fontSize="1.35">CRATER SECTOR // VOLLEY {Math.floor(state.turn / 2) + 1}</text>
            <text x="4" y="6.3" className="fill-ink-4 font-mono" fontSize="1.05">{state.phase === 'finished' ? `${CREWS[state.winner!].name.toUpperCase()} HOLDS THE RANGE` : `${CREWS[state.current].name.toUpperCase()} FIRE CONTROL`}</text>
            <rect x="77" y="2.2" width="20.7" height="5.4" className="fill-s1 stroke-ink-4 opacity-90" strokeWidth="0.2" />
            <text x="95.8" y="4.7" textAnchor="end" className="fill-ink-2 font-mono" fontSize="1.35">WIND {state.wind > 0 ? `→ ${state.wind}` : state.wind < 0 ? `← ${Math.abs(state.wind)}` : 'STILL'}</text>
            <text x="95.8" y="6.3" textAnchor="end" className="fill-ink-4 font-mono" fontSize="1.05">HOLDS THROUGH REPLY</text>
          </g>
          <g transform={`translate(${shotShake} 0)`}>
          <path d={terrainPath} className="fill-s2 stroke-ink-2" strokeWidth="0.42" />
          {terrainContours.map((contour, index) => <path key={index} d={contour} className="fill-none stroke-ink-4 opacity-40" strokeWidth="0.22" />)}
          {aimPreviews.some((preview) => preview.length > 1) && (
            <g className={activePayloadMeta.elementClass} data-testid="artillery-aim-preview">
              {aimPreviews.map((preview, index) => preview.length > 1 && (
                <polyline
                  key={index}
                  points={preview.map((point) => `${point.x},${ARTILLERY_HEIGHT - point.y}`).join(' ')}
                  className="fill-none stroke-el opacity-60"
                  strokeWidth="0.3"
                  strokeDasharray="1 1.4"
                />
              ))}
            </g>
          )}
          {lastShot && !animated && lastShot.outcome.projectiles.some((projectile) => projectile.impact) && (
            <g className={PAYLOAD_META[lastShot.outcome.payload].elementClass} data-testid="artillery-impact-marker">
              {lastShot.outcome.projectiles.map((projectile, index) => projectile.impact && (
                <g key={index}>
                  <circle
                    cx={projectile.impact.x}
                    cy={ARTILLERY_HEIGHT - projectile.impact.y}
                    r={ARTILLERY_PAYLOAD_RULES[lastShot.outcome.payload].blastRadius}
                    className="fill-none stroke-el opacity-60"
                    strokeWidth="0.25"
                    strokeDasharray="1 1"
                  />
                  <circle cx={projectile.impact.x} cy={ARTILLERY_HEIGHT - projectile.impact.y} r="0.6" className="fill-el" />
                </g>
              ))}
            </g>
          )}
          {tank('left')}{tank('right')}
          {animatedProjectiles.map((projectile, index) => (
            <g key={index} className={activePayloadMeta.elementClass}>
              {projectile.path.length > 1 && <polyline points={projectile.path.map((point) => `${point.x},${ARTILLERY_HEIGHT - point.y}`).join(' ')} className="fill-none stroke-el opacity-50" strokeWidth={activePayload === 'bore' ? 0.45 : 0.28} strokeDasharray={activePayload === 'barb' ? '0.6 0.8' : '1 0.7'} />}
              {activePayload === 'barb' ? (
                <path d={`M ${projectile.point.x} ${ARTILLERY_HEIGHT - projectile.point.y - 0.75} l 0.55 0.75 -0.55 0.75 -0.55 -0.75 Z`} className="fill-el stroke-black" strokeWidth="0.18" />
              ) : activePayload === 'bore' ? (
                <g>
                  <path d={`M ${projectile.point.x - 0.85} ${ARTILLERY_HEIGHT - projectile.point.y} l 0.85 -0.62 0.85 0.62 -0.85 0.62 Z`} className="fill-el stroke-black" strokeWidth="0.2" />
                  <circle cx={projectile.point.x} cy={ARTILLERY_HEIGHT - projectile.point.y} r="1.05" className="fill-none stroke-el opacity-40" strokeWidth="0.22" />
                </g>
              ) : (
                <circle cx={projectile.point.x} cy={ARTILLERY_HEIGHT - projectile.point.y} r="0.7" className="fill-el stroke-black" strokeWidth="0.2" />
              )}
            </g>
          ))}
          {impactFrames.map((impact, index) => (
            <g key={index} className={activePayloadMeta.elementClass} aria-hidden>
              {activePayload === 'bore' && <line x1={impact.x} y1={ARTILLERY_HEIGHT - impact.y - ARTILLERY_PAYLOAD_RULES.bore.penetration} x2={impact.x} y2={ARTILLERY_HEIGHT - impact.y} className="stroke-el opacity-80" strokeWidth="0.65" strokeDasharray="0.5 0.35" />}
              <circle cx={impact.x} cy={ARTILLERY_HEIGHT - impact.y} r={ARTILLERY_PAYLOAD_RULES[activePayload].blastRadius * 1.22} className="fill-el opacity-10" />
              <circle cx={impact.x} cy={ARTILLERY_HEIGHT - impact.y} r={ARTILLERY_PAYLOAD_RULES[activePayload].blastRadius * 0.72} className="fill-el opacity-30" />
              <circle cx={impact.x} cy={ARTILLERY_HEIGHT - impact.y} r={ARTILLERY_PAYLOAD_RULES[activePayload].blastRadius} className="fill-none stroke-el" strokeWidth="0.55" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((degrees) => {
                const radians = degrees * Math.PI / 180;
                const inner = ARTILLERY_PAYLOAD_RULES[activePayload].blastRadius * 0.45;
                const outer = ARTILLERY_PAYLOAD_RULES[activePayload].blastRadius * (index % 2 ? 1.18 : 1.05);
                return <line key={degrees} x1={impact.x + Math.cos(radians) * inner} y1={ARTILLERY_HEIGHT - impact.y + Math.sin(radians) * inner} x2={impact.x + Math.cos(radians) * outer} y2={ARTILLERY_HEIGHT - impact.y + Math.sin(radians) * outer} className="stroke-el" strokeWidth="0.38" />;
              })}
            </g>
          ))}
          </g>
        </svg>
      </section>

      <aside className="flex min-w-0 flex-col gap-4 border border-edge bg-s1 p-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant={state.phase === 'finished' ? 'ok' : state.current === 'left' ? 'warn' : 'info'}>
            {state.phase === 'finished' ? `${CREWS[state.winner!].name} won` : `${CREWS[state.current].name} turn`}
          </Badge>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="xs"
              variant="ghost"
              aria-pressed={soundOn}
              onClick={() => {
                const next = !soundOn;
                sound.setEnabled(next);
                setSoundOn(next);
                onStatus(`Artillery sound ${next ? 'enabled' : 'muted'}.`);
              }}
            >
              Sound {soundOn ? 'on' : 'off'}
            </Button>
            <span className="type-data">Wind {state.wind > 0 ? `→ ${state.wind}` : state.wind < 0 ? `← ${Math.abs(state.wind)}` : 'still'}</span>
          </div>
        </div>
        {state.phase !== 'finished' && (
          <React.Fragment>
            <div className="flex items-center justify-between gap-3 border-y border-edge py-2">
              <p className="m-0 font-body text-small text-ink-2">Disable the rival battery with three hits. Wind holds for both shots in a volley.</p>
              <span className="type-data shrink-0">Volley {Math.floor(state.turn / 2) + 1}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['left', 'right'] as const).map((side) => (
                <div key={side} className="border border-edge bg-s0 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <XalianImage
                      variant="token"
                      speciesName={CREWS[side].name}
                      primaryType={CREWS[side].type}
                      colored
                      moreClasses="size-12 shrink-0"
                    />
                    <p className="type-legend m-0">{CREWS[side].name}{mode === 'bot' && side === 'right' ? ' · Bot' : ''}</p>
                  </div>
                  <p className="mt-1 mb-0 font-body text-small text-ink-2">{CREWS[side].role}</p>
                  <span className="mt-2 flex gap-1" aria-label={`${state.tanks[side].integrity} of ${ARTILLERY_MAX_INTEGRITY} integrity`}>
                    {Array.from({ length: ARTILLERY_MAX_INTEGRITY }, (_, index) => <span key={index} className={`size-2 border border-edge-strong ${index < state.tanks[side].integrity ? 'bg-viable-hi' : 'bg-s2'}`} />)}
                  </span>
                </div>
              ))}
            </div>
          </React.Fragment>
        )}
        {referenceShot && (
          <div className="flex items-center justify-between gap-3 border border-edge bg-s0 p-3" aria-live="polite">
            <div>
              <p className="type-legend m-0">{referenceShot.shooter === state.current ? `${CREWS[state.current].name} ranging record` : 'Last impact'}</p>
              <p className="mt-1 mb-0 font-body text-small text-ink-2">
                {referenceShot.shot.angle}° · power {referenceShot.shot.power} · wind {referenceShot.wind}
                {referenceShot.shot.move === 1 ? ' · advanced' : referenceShot.shot.move === -1 ? ' · withdrew' : ''}
              </p>
            </div>
            <Badge variant={referenceShot.outcome.hit ? 'ok' : 'default'}>{referenceShotLabel}</Badge>
          </div>
        )}
        {mode === 'bot' && state.current === 'right' && state.phase === 'aiming' && (
          <div className="flex items-center justify-between border border-edge bg-s0 px-3 py-2" aria-live="polite">
            <span className="type-legend">Terragoyle intent</span>
            <span className="type-data text-ink-2">{botIntent}</span>
          </div>
        )}
        {state.phase === 'finished' ? (
          <div className={`border p-4 ${mode === 'bot' && state.winner === 'right' ? 'border-plague-lo bg-plague-tint' : 'border-viable-lo bg-viable-tint'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="type-legend m-0">{mode === 'local' ? 'Range secured' : state.winner === 'left' ? 'Contract cleared' : 'Battery disabled'}</p>
                <p className="mt-2 mb-0 font-body text-body">The {CREWS[state.winner!].name} crew holds Crater Sector after {state.turn} shots.</p>
              </div>
              <div className="border border-current px-3 py-2 text-center">
                <span className="block type-micro">Grade</span>
                <span className="type-heading">{resultGrade}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-y border-current/30 py-3 text-center">
              <span><b className="block type-data">{Math.ceil(state.turn / 2)}</b><small className="type-micro">volleys</small></span>
              <span><b className="block type-data">{state.tanks[resultSide].integrity}/{ARTILLERY_MAX_INTEGRITY}</b><small className="type-micro">integrity</small></span>
              <span><b className="block type-data">{resultSpecialsSpent}</b><small className="type-micro">specials</small></span>
            </div>
            <p className="mt-3 mb-4 font-body text-small text-ink-2">{state.winner === 'left' ? 'Codazzo anchor-spines held while the rival shelf gave way.' : 'Terragoyle lift control escaped the collapsing shelf and returned a clean ranging solution.'}</p>
            <Button type="button" className="w-full" onClick={onRematch}>Generate rematch terrain</Button>
          </div>
        ) : (
          <React.Fragment>
            <div className="grid grid-cols-2 gap-3 border border-edge bg-s0 p-3" aria-label="Fire control">
              <FireControl label="Angle" value={angle} suffix="°" min={10} max={80} disabled={!canFire} onChange={setAngle} />
              <FireControl label="Power" value={power} min={15} max={100} disabled={!canFire} onChange={setPower} />
            </div>
            <div className="grid gap-2" role="group" aria-label="Crawler position">
              <span className="flex justify-between type-legend"><span>Track position</span><span className="type-data">{state.traction[state.current]} / {ARTILLERY_MAX_TRACTION} moves</span></span>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: -1 as const, label: 'Withdraw' },
                  { value: 0 as const, label: 'Hold' },
                  { value: 1 as const, label: 'Advance' },
                ]).map((choice) => (
                  <Button
                    key={choice.value}
                    type="button"
                    size="sm"
                    variant={move === choice.value ? 'outline' : 'ghost'}
                    disabled={!canFire || (choice.value !== 0 && state.traction[state.current] <= 0)}
                    aria-pressed={move === choice.value}
                    onClick={() => {
                      sound.play('select');
                      setMove(choice.value);
                      onStatus(choice.value === 0 ? 'Crawler will hold position.' : `Crawler will ${choice.label.toLowerCase()} before firing. The guide has moved with it.`);
                    }}
                  >
                    {choice.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-2" role="group" aria-label="Payload">
              <span className="type-legend">Payload pattern</span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PAYLOAD_META) as ArtilleryPayload[]).map((choice) => {
                  const remaining = payloadRemaining(state.current, choice);
                  const unavailable = remaining <= 0;
                  return (
                    <Button
                      key={choice}
                      type="button"
                      size="sm"
                      variant={payload === choice ? 'outline' : 'ghost'}
                      disabled={!canFire || unavailable}
                      aria-pressed={payload === choice}
                      className="h-auto min-w-0 flex-col gap-0.5 px-1 py-2"
                      onClick={() => {
                        sound.play('select');
                        setPayload(choice);
                        onStatus(`${PAYLOAD_META[choice].label} selected. ${PAYLOAD_META[choice].detail}.`);
                      }}
                    >
                      <span className={`text-body text-el ${PAYLOAD_META[choice].elementClass}`} aria-hidden>{PAYLOAD_META[choice].glyph}</span>
                      <span>{PAYLOAD_META[choice].shortLabel} <span className="type-data text-ink-2">{choice === 'shell' ? '∞' : remaining}</span></span>
                      <span className="font-body text-tiny normal-case tracking-normal text-ink-3">{PAYLOAD_META[choice].purpose}</span>
                    </Button>
                  );
                })}
              </div>
              <p className="m-0 font-body text-small text-ink-2">{PAYLOAD_META[payload].detail}</p>
            </div>
            <Button type="button" disabled={!canFire} onClick={() => animateShot({ angle, power, payload, move })}>Fire {PAYLOAD_META[payload].shortLabel}</Button>
          </React.Fragment>
        )}
        {state.phase !== 'finished' && (
          <div className="mt-auto border-t border-edge pt-3">
            <p className="type-legend m-0">{state.turn === 0 ? 'Opening order' : 'Range note'}</p>
            <p className="mt-1 mb-0 font-body text-small text-ink-2">{rangeNote}</p>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function ArtilleryGamePage() {
  const [mode, setMode] = React.useState<ArtilleryMode>('bot');
  const [seed, setSeed] = React.useState(() => dailyArcadeSeed('artillery'));
  const [status, setStatus] = React.useState('Set an angle and power, then fire.');
  const startedAt = React.useRef(performance.now());
  const sessionId = React.useRef(arcadeSessionId());

  const newGame = React.useCallback((nextMode = mode) => {
    setSeed(practiceArcadeSeed('artillery'));
    setMode(nextMode);
    setStatus('New terrain generated. Set an angle and power.');
    startedAt.current = performance.now();
    sessionId.current = arcadeSessionId();
  }, [mode]);

  const complete = React.useCallback(async ({ score, actions }: { score: number; actions: ArtilleryShot[] }) => {
    setStatus('Match won. Verifying the firing record…');
    const reward = await completeArcadeGame('artillery', { gameId: 'artillery', sessionId: sessionId.current, seed, actions }, { score, timeMs: performance.now() - startedAt.current });
    setStatus(`Match won. ${reward.message}`);
  }, [seed]);

  return (
    <ArcadeGameShell game={GAME} status={status} onNewGame={() => newGame()} aside={
      <div className="flex gap-1" role="group" aria-label="Opponent">
        <Button size="sm" variant={mode === 'bot' ? 'outline' : 'ghost'} onClick={() => newGame('bot')}>Bot</Button>
        <Button size="sm" variant={mode === 'local' ? 'outline' : 'ghost'} onClick={() => newGame('local')}>Local</Button>
      </div>
    }>
      <ArtilleryBoard key={`${seed}:${mode}`} seed={seed} mode={mode} onStatus={setStatus} onComplete={complete} onRematch={() => newGame()} />
    </ArcadeGameShell>
  );
}
