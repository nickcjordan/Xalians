// Tier: immersive. Crater Command is active artillery play inside the Arcade shell.
import * as React from 'react';
import {
  ARTILLERY_HEIGHT,
  ARTILLERY_MAX_INTEGRITY,
  ARTILLERY_WIDTH,
  applyArtilleryShot,
  chooseArtilleryBotShot,
  createArtilleryState,
  terrainHeight,
  type ArtilleryMode,
  type ArtilleryOutcome,
  type ArtilleryShot,
  type ArtilleryState,
} from '@xalians/rules/arcade';

import { arcadeGame } from '@/arcade/catalog';
import { arcadeSessionId, completeArcadeGame, dailyArcadeSeed, practiceArcadeSeed } from '@/arcade/progress';
import { ArcadeGameShell } from '@/components/arcade/ArcadeGameShell';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

const GAME = arcadeGame('artillery')!;

type AnimatedShot = { outcome: ArtilleryOutcome; pointIndex: number } | null;

function ArtilleryBoard({ seed, mode, onStatus, onComplete }: {
  seed: string;
  mode: ArtilleryMode;
  onStatus: (status: string) => void;
  onComplete: (result: { score: number; actions: ArtilleryShot[] }) => void;
}) {
  const [state, setState] = React.useState<ArtilleryState>(() => createArtilleryState(seed, mode));
  const [angle, setAngle] = React.useState(45);
  const [power, setPower] = React.useState(70);
  const [animated, setAnimated] = React.useState<AnimatedShot>(null);
  const pendingTimers = React.useRef<number[]>([]);
  const completed = React.useRef(false);
  const actions = React.useRef<ArtilleryShot[]>([]);
  const botScheduled = React.useRef(false);

  React.useEffect(() => () => pendingTimers.current.forEach(window.clearTimeout), []);

  const animateShot = React.useCallback((shot: ArtilleryShot) => {
    if (animated || state.phase !== 'aiming') return;
    if (mode === 'bot' && state.current === 'left') actions.current.push({ angle: Math.round(shot.angle), power: Math.round(shot.power) });
    const applied = applyArtilleryShot(state, shot);
    const path = applied.outcome.path;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const frames = reduced ? 1 : Math.min(36, path.length);
    const step = Math.max(1, Math.floor(path.length / frames));
    let frame = 0;
    setAnimated({ outcome: applied.outcome, pointIndex: 0 });
    onStatus(`${state.current === 'left' ? 'Left' : 'Right'} crawler fired.`);
    const tick = () => {
      frame += 1;
      const pointIndex = Math.min(path.length - 1, frame * step);
      setAnimated({ outcome: applied.outcome, pointIndex });
      if (pointIndex < path.length - 1) {
        pendingTimers.current.push(window.setTimeout(tick, reduced ? 1 : 18));
        return;
      }
      pendingTimers.current.push(window.setTimeout(() => {
        setAnimated(null);
        setState(applied.state);
        const message = applied.outcome.hit
          ? `${applied.outcome.hit === 'left' ? 'Left' : 'Right'} crawler hit. ${applied.state.tanks[applied.outcome.hit].integrity} integrity remains.`
          : 'Shot missed. Read the impact and adjust.';
        onStatus(message);
      }, reduced ? 1 : 220));
    };
    tick();
  }, [animated, mode, onStatus, state]);

  React.useEffect(() => {
    if (state.phase === 'finished' && state.winner && !completed.current) {
      completed.current = true;
      if (state.winner === 'left' && mode === 'bot') onComplete({ score: Math.max(0, 1000 - state.turn * 40), actions: actions.current });
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

  const terrainPath = React.useMemo(() => {
    const points = state.terrain.map((height, x) => `L ${x} ${ARTILLERY_HEIGHT - height}`).join(' ');
    return `M 0 ${ARTILLERY_HEIGHT} ${points} L ${ARTILLERY_WIDTH} ${ARTILLERY_HEIGHT} Z`;
  }, [state.terrain]);
  const projectile = animated?.outcome.path[animated.pointIndex];
  const visiblePath = animated?.outcome.path.slice(0, animated.pointIndex + 1) ?? [];
  const canFire = !animated && state.phase === 'aiming' && (mode === 'local' || state.current === 'left');

  const tank = (side: 'left' | 'right') => {
    const value = state.tanks[side];
    const y = ARTILLERY_HEIGHT - terrainHeight(state.terrain, value.x) - 1.5;
    return (
      <g className={side === 'left' ? 'el-fire' : 'el-water'} aria-label={`${side} crawler, ${value.integrity} integrity`}>
        <rect x={value.x - 2.5} y={y - 1.1} width="5" height="2.2" className="fill-el stroke-black" strokeWidth="0.35" />
        <circle cx={value.x} cy={y - 1.1} r="1.25" className="fill-el stroke-black" strokeWidth="0.35" />
        <line x1={value.x} y1={y - 1.8} x2={value.x + (side === 'left' ? 3 : -3)} y2={y - 3.7} className="stroke-ink" strokeWidth="0.55" />
      </g>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section aria-label="Artillery field" className="border border-edge bg-glass">
        <svg viewBox={`0 0 ${ARTILLERY_WIDTH} ${ARTILLERY_HEIGHT}`} className="block aspect-[5/3] w-full" role="img" aria-label="Two crawler tanks on destructible terrain">
          <rect width={ARTILLERY_WIDTH} height={ARTILLERY_HEIGHT} className="fill-s0" />
          <path d={terrainPath} className="fill-s2 stroke-ink-3" strokeWidth="0.3" />
          {tank('left')}{tank('right')}
          {visiblePath.length > 1 && <polyline points={visiblePath.map((point) => `${point.x},${ARTILLERY_HEIGHT - point.y}`).join(' ')} className="fill-none stroke-ink-2" strokeWidth="0.25" strokeDasharray="1 1" />}
          {projectile && <circle cx={projectile.x} cy={ARTILLERY_HEIGHT - projectile.y} r="0.7" className="fill-viable-hi" />}
        </svg>
      </section>

      <aside className="flex flex-col gap-4 border border-edge bg-s1 p-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant={state.current === 'left' ? 'warn' : 'info'}>{state.current === 'left' ? 'Left turn' : 'Right turn'}</Badge>
          <span className="type-data">Wind {state.wind > 0 ? `→ ${state.wind}` : state.wind < 0 ? `← ${Math.abs(state.wind)}` : 'still'}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['left', 'right'] as const).map((side) => (
            <div key={side} className="border border-edge bg-s0 p-3">
              <p className="type-legend m-0">{side}</p>
              <span className="mt-2 flex gap-1" aria-label={`${state.tanks[side].integrity} of ${ARTILLERY_MAX_INTEGRITY} integrity`}>
                {Array.from({ length: ARTILLERY_MAX_INTEGRITY }, (_, index) => <span key={index} className={`size-2 border border-edge-strong ${index < state.tanks[side].integrity ? 'bg-viable-hi' : 'bg-s2'}`} />)}
              </span>
            </div>
          ))}
        </div>
        {state.phase === 'finished' ? (
          <div className="border border-viable-lo bg-viable-tint p-4">
            <p className="type-legend m-0">Match won</p>
            <p className="mt-2 mb-0 font-body text-body">The {state.winner} crawler holds the field after {state.turn} shots.</p>
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
            <Button type="button" disabled={!canFire} onClick={() => animateShot({ angle, power })}>Fire</Button>
          </React.Fragment>
        )}
        <p className="m-0 mt-auto font-body text-small text-ink-2">Shots arc with gravity and wind. Near impacts cause the same damage as a direct hit.</p>
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
