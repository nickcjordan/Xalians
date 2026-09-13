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
import { arcadeSessionId, completeArcadeGame, dailyArcadeSeed, practiceArcadeSeed } from '@/arcade/progress';
import { ArcadeGameShell } from '@/components/arcade/ArcadeGameShell';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import XalianImage from '@/components/xalianImage';

const GAME = arcadeGame('artillery')!;

type AnimatedShot = { outcome: ArtilleryOutcome; progress: number } | null;
type LastShot = { outcome: ArtilleryOutcome; shooter: ArtillerySide; shot: Required<ArtilleryShot>; wind: number } | null;

const CREWS = {
  left: { name: 'Codazzo', type: 'Rock', role: 'Regenerative artillery crew' },
  right: { name: 'Terragoyle', type: 'Rock', role: 'Levitational range crew' },
} as const;

const PAYLOAD_META: Record<ArtilleryPayload, {
  label: string;
  shortLabel: string;
  detail: string;
  elementClass: string;
}> = {
  shell: { label: 'Core shell', shortLabel: 'Core', detail: 'One round · balanced surface blast · unlimited', elementClass: 'el-metal' },
  barb: { label: 'Barb fan', shortLabel: 'Fan', detail: 'Three Codazzo barbs · broad coverage · 2', elementClass: 'el-rock' },
  bore: { label: 'Bore charge', shortLabel: 'Bore', detail: 'Drilltail penetrator · underground blast · 2', elementClass: 'el-sand' },
};

const BARREL_LENGTH = 4.2;
const AIM_PREVIEW_POINTS = 14;

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

function ArtilleryBoard({ seed, mode, onStatus, onComplete }: {
  seed: string;
  mode: ArtilleryMode;
  onStatus: (status: string) => void;
  onComplete: (result: { score: number; actions: ArtilleryShot[] }) => void;
}) {
  const [state, setState] = React.useState<ArtilleryState>(() => createArtilleryState(seed, mode));
  const [angle, setAngle] = React.useState(45);
  const [power, setPower] = React.useState(70);
  const [payload, setPayload] = React.useState<ArtilleryPayload>('shell');
  const [move, setMove] = React.useState<ArtilleryMove>(0);
  const [settledAim, setSettledAim] = React.useState<Record<'left' | 'right', number>>({ left: 45, right: 45 });
  const [animated, setAnimated] = React.useState<AnimatedShot>(null);
  const [lastShot, setLastShot] = React.useState<LastShot>(null);
  const pendingTimers = React.useRef<number[]>([]);
  const completed = React.useRef(false);
  const actions = React.useRef<ArtilleryShot[]>([]);
  const botScheduled = React.useRef(false);

  React.useEffect(() => () => pendingTimers.current.forEach(window.clearTimeout), []);

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
    setAnimated({ outcome: applied.outcome, progress: 0 });
    onStatus(`${state.current === 'left' ? 'Left' : 'Right'} crawler fired.`);
    const tick = () => {
      frame += 1;
      const progress = Math.min(1, frame / frames);
      setAnimated({ outcome: applied.outcome, progress });
      if (progress < 1) {
        pendingTimers.current.push(window.setTimeout(tick, reduced ? 1 : 18));
        return;
      }
      pendingTimers.current.push(window.setTimeout(() => {
        setAnimated(null);
        setLastShot({ outcome: applied.outcome, shooter: state.current, shot: resolvedShot, wind: state.wind });
        setState(applied.state);
        setMove(0);
        const targetSide = state.current === 'left' ? 'right' : 'left';
        const target = state.tanks[targetSide];
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
  }, [animated, mode, onStatus, state]);

  React.useEffect(() => {
    if (state.phase === 'finished' && state.winner && !completed.current) {
      completed.current = true;
      if (state.winner === 'left' && mode === 'bot') {
        onComplete({ score: Math.max(0, 1000 - state.turn * 40), actions: actions.current });
      } else if (mode === 'bot') {
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
  }, [animateShot, animated, mode, onComplete, onStatus, state]);

  React.useEffect(() => {
    if (payload !== 'shell' && state.payloads[state.current][payload] <= 0) setPayload('shell');
    if (state.traction[state.current] <= 0 && move !== 0) setMove(0);
  }, [move, payload, state.current, state.payloads, state.traction]);

  const terrainPath = React.useMemo(() => {
    const points = state.terrain.map((height, x) => `L ${x} ${ARTILLERY_HEIGHT - height}`).join(' ');
    return `M 0 ${ARTILLERY_HEIGHT} ${points} L ${ARTILLERY_WIDTH} ${ARTILLERY_HEIGHT} Z`;
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

  const payloadRemaining = (side: ArtillerySide, choice: ArtilleryPayload) =>
    choice === 'shell' ? Number.POSITIVE_INFINITY : state.payloads[side][choice];

  const lastShotLabel = React.useMemo(() => {
    if (!lastShot) return null;
    const targetSide = lastShot.shooter === 'left' ? 'right' : 'left';
    if (lastShot.outcome.hit) return `${PAYLOAD_META[lastShot.outcome.payload].shortLabel} hit ${CREWS[targetSide].name}`;
    if (!lastShot.outcome.impact) return `${PAYLOAD_META[lastShot.outcome.payload].shortLabel} left the range`;
    const signedMiss = lastShot.shooter === 'left'
      ? lastShot.outcome.impact.x - state.tanks[targetSide].x
      : state.tanks[targetSide].x - lastShot.outcome.impact.x;
    return `${PAYLOAD_META[lastShot.outcome.payload].shortLabel} · ${Math.max(1, Math.round(Math.abs(signedMiss)))} ${signedMiss > 0 ? 'long' : 'short'}`;
  }, [lastShot, state.tanks]);

  const tank = (side: 'left' | 'right') => {
    const value = state.tanks[side];
    const displayX = canFire && state.current === side ? artilleryMovedX(state, side, move) : value.x;
    const y = ARTILLERY_HEIGHT - terrainHeight(state.terrain, displayX) - 1.5;
    const originY = ARTILLERY_HEIGHT - terrainHeight(state.terrain, value.x) - 1.5;
    const displayAngle = canFire && state.current === side ? angle : settledAim[side];
    const barrel = artilleryBarrelEndpoint(displayX, y - 1.8, side, displayAngle);
    const crew = CREWS[side];
    const movementLabel = displayX === value.x ? '' : move === 1 ? ', advance preview' : ', withdraw preview';
    return (
      <g className={side === 'left' ? 'el-fire' : 'el-water'} aria-label={`${crew.name} crawler, ${value.integrity} integrity${movementLabel}`}>
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
            y={y - 6.5}
            width="1.6"
            height="0.75"
            className={index < value.integrity ? 'fill-el' : 'fill-s0 stroke-ink-4'}
            strokeWidth="0.18"
          />
        ))}
        {state.current === side && state.phase === 'aiming' && <circle cx={displayX} cy={y - 8} r="0.45" className="fill-viable-hi" />}
        <rect x={displayX - 2.5} y={y - 1.1} width="5" height="2.2" className="fill-el stroke-black" strokeWidth="0.35" />
        <circle cx={displayX} cy={y - 1.1} r="1.25" className="fill-el stroke-black" strokeWidth="0.35" />
        <line
          x1={displayX}
          y1={y - 1.8}
          x2={barrel.x}
          y2={barrel.y}
          className="stroke-ink"
          strokeWidth="0.65"
          data-testid={`artillery-barrel-${side}`}
          data-angle={displayAngle}
        />
      </g>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Artillery field" className="border border-edge bg-glass">
        <svg viewBox={`0 0 ${ARTILLERY_WIDTH} ${ARTILLERY_HEIGHT}`} className="block aspect-[5/3] w-full" role="img" aria-label="Codazzo and Terragoyle crawler batteries on destructible terrain">
          <rect width={ARTILLERY_WIDTH} height={ARTILLERY_HEIGHT} className="fill-s0" />
          <path d={terrainPath} className="fill-s2 stroke-ink-3" strokeWidth="0.3" />
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
              {projectile.path.length > 1 && <polyline points={projectile.path.map((point) => `${point.x},${ARTILLERY_HEIGHT - point.y}`).join(' ')} className="fill-none stroke-el opacity-70" strokeWidth="0.25" strokeDasharray="1 1" />}
              <circle cx={projectile.point.x} cy={ARTILLERY_HEIGHT - projectile.point.y} r={activePayload === 'barb' ? 0.55 : 0.7} className="fill-el" />
            </g>
          ))}
          {impactFrames.map((impact, index) => (
            <g key={index} className={activePayloadMeta.elementClass} aria-hidden>
              <circle cx={impact.x} cy={ARTILLERY_HEIGHT - impact.y} r={ARTILLERY_PAYLOAD_RULES[activePayload].blastRadius} className="fill-el opacity-20" />
              <circle cx={impact.x} cy={ARTILLERY_HEIGHT - impact.y} r={ARTILLERY_PAYLOAD_RULES[activePayload].blastRadius} className="fill-none stroke-el" strokeWidth="0.45" />
            </g>
          ))}
        </svg>
      </section>

      <aside className="flex flex-col gap-4 border border-edge bg-s1 p-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant={state.phase === 'finished' ? 'ok' : state.current === 'left' ? 'warn' : 'info'}>
            {state.phase === 'finished' ? `${CREWS[state.winner!].name} won` : `${CREWS[state.current].name} turn`}
          </Badge>
          <span className="type-data">Wind {state.wind > 0 ? `→ ${state.wind}` : state.wind < 0 ? `← ${Math.abs(state.wind)}` : 'still'}</span>
        </div>
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
        {lastShot && (
          <div className="flex items-center justify-between gap-3 border border-edge bg-s0 p-3" aria-live="polite">
            <div>
              <p className="type-legend m-0">Last impact</p>
              <p className="mt-1 mb-0 font-body text-small text-ink-2">
                {lastShot.shot.angle}° · power {lastShot.shot.power} · wind {lastShot.wind}
                {lastShot.shot.move === 1 ? ' · advanced' : lastShot.shot.move === -1 ? ' · withdrew' : ''}
              </p>
            </div>
            <Badge variant={lastShot.outcome.hit ? 'ok' : 'default'}>{lastShotLabel}</Badge>
          </div>
        )}
        {state.phase === 'finished' ? (
          <div className={`border p-4 ${mode === 'bot' && state.winner === 'right' ? 'border-plague-lo bg-plague-tint' : 'border-viable-lo bg-viable-tint'}`}>
            <p className="type-legend m-0">{mode === 'local' ? 'Match complete' : state.winner === 'left' ? 'Match won' : 'Match lost'}</p>
            <p className="mt-2 mb-0 font-body text-body">The {CREWS[state.winner!].name} battery holds the range after {state.turn} shots.</p>
          </div>
        ) : (
          <React.Fragment>
            <label className="grid gap-2">
              <span className="flex justify-between type-legend"><span>Angle</span><span className="type-data">{angle}°</span></span>
              <Slider value={[angle]} min={10} max={80} step={1} disabled={!canFire} onValueChange={([value]: number[]) => setAngle(value)} aria-label="Firing angle" />
            </label>
            <label className="grid gap-2">
              <span className="flex justify-between type-legend"><span>Power</span><span className="type-data">{power}</span></span>
              <Slider value={[power]} min={15} max={100} step={1} disabled={!canFire} onValueChange={([value]: number[]) => setPower(value)} aria-label="Firing power" />
            </label>
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
                      className="h-auto justify-between gap-1 py-2"
                      onClick={() => {
                        setPayload(choice);
                        onStatus(`${PAYLOAD_META[choice].label} selected. ${PAYLOAD_META[choice].detail}.`);
                      }}
                    >
                      <span>{PAYLOAD_META[choice].shortLabel}</span>
                      <span className="type-data text-ink-2">{choice === 'shell' ? '∞' : remaining}</span>
                    </Button>
                  );
                })}
              </div>
              <p className="m-0 font-body text-small text-ink-2">{PAYLOAD_META[payload].detail}</p>
            </div>
            <Button type="button" disabled={!canFire} onClick={() => animateShot({ angle, power, payload, move })}>Fire {PAYLOAD_META[payload].shortLabel}</Button>
          </React.Fragment>
        )}
        <p className="m-0 mt-auto border-t border-edge pt-3 font-body text-small text-ink-2">Codazzo fans split into three paths for uncertain ranges. Drilltail bores detonate beneath cover. A track move is committed when you fire; the guide follows the new position.</p>
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
      <ArtilleryBoard key={`${seed}:${mode}`} seed={seed} mode={mode} onStatus={setStatus} onComplete={complete} />
    </ArcadeGameShell>
  );
}
