// Tier: immersive. Crater Command is active artillery play inside the Arcade shell.
import * as React from 'react';
import {
  ARTILLERY_HEIGHT,
  ARTILLERY_CONDITIONS,
  ARTILLERY_MAP_WIDTHS,
  ARTILLERY_MAX_INTEGRITY,
  ARTILLERY_PAYLOADS,
  ARTILLERY_PAYLOAD_RULES,
  ARTILLERY_SPECIAL_PAYLOADS,
  applyArtilleryMove,
  applyArtilleryShot,
  artilleryMovedX,
  chooseArtilleryBotShot,
  createArtilleryState,
  simulateArtilleryShot,
  terrainHeight,
  type ArtilleryAction,
  type ArtilleryDifficulty,
  type ArtilleryMapSize,
  type ArtilleryMode,
  type ArtilleryMobility,
  type ArtilleryMove,
  type ArtilleryOutcome,
  type ArtilleryPayload,
  type ArtillerySide,
  type ArtilleryShot,
  type ArtilleryState,
  type ArtilleryWorld,
} from '@xalians/rules/arcade';

import { arcadeGame } from '@/arcade/catalog';
import { createArtillerySound } from '@/arcade/artillerySound';
import { arcadeSessionId, completeArcadeGame, dailyArcadeSeed, practiceArcadeSeed } from '@/arcade/progress';
import { ArcadeGameShell } from '@/components/arcade/ArcadeGameShell';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

const GAME = arcadeGame('artillery')!;

type AnimatedShot = {
  outcome: ArtilleryOutcome;
  progress: number;
  phase: 'move' | 'charge' | 'flight' | 'impact';
  shooter: ArtillerySide;
  shot: Required<ArtilleryShot>;
  terrainAfter: number[];
} | null;
type ActiveThrust = {
  side: ArtillerySide;
  direction: Exclude<ArtilleryMove, 0>;
  mobility: ArtilleryMobility;
  pulse: number;
  phase: 'thrust' | 'landing';
  launchX: number;
  launchY: number;
  startFuel: number;
  flightY: number;
  landingProgress: number;
} | null;
type CombatStats = {
  shots: number;
  hits: number;
  damage: number;
  directHits: number;
  terrainShift: number;
  payloads: ArtilleryPayload[];
};

const RANGE_RIGS = {
  left: { name: 'Range Rig A', shortName: 'Rig A' },
  right: { name: 'Range Rig B', shortName: 'Rig B' },
} as const;

const CONDITION_SHORT = {
  standard: 'Standard gravity',
  'heavy-gravity': 'Heavy gravity',
  'thin-air': 'Low gravity',
  'dust-gust': 'Dust gusts',
} as const;

const WORLD_META: Record<ArtilleryWorld, {
  name: string;
  terrain: string;
  quirk: string;
  image: string;
  elementClass: string;
}> = {
  stonera: { name: 'Stonera', terrain: 'Cratered ridges', quirk: 'Low gravity lengthens every arc.', image: '/assets/img/planets/landscape/rock_landscape_planet.jpg', elementClass: 'el-rock' },
  magmuth: { name: 'Magmuth', terrain: 'Obsidian crags', quirk: 'Heavy gravity demands more power.', image: '/assets/img/planets/landscape/fire_landscape_planet.jpg', elementClass: 'el-fire' },
  krystos: { name: 'Krystos', terrain: 'Frozen peaks', quirk: 'Sharp ice shelves constrain driving.', image: '/assets/img/planets/landscape/ice_landscape_planet.jpg', elementClass: 'el-ice' },
  endessa: { name: 'Endessa', terrain: 'Rolling glass dunes', quirk: 'Dust gusts amplify the wind.', image: '/assets/img/planets/landscape/sand_landscape_planet.jpg', elementClass: 'el-sand' },
};

const MAP_META: Record<ArtilleryMapSize, { label: string; detail: string }> = {
  compact: { label: 'Compact', detail: '300 units · quicker duels' },
  standard: { label: 'Standard', detail: '360 units · balanced range' },
  wide: { label: 'Wide', detail: '440 units · longest shots' },
};

const PAYLOAD_META: Record<ArtilleryPayload, {
  label: string;
  shortLabel: string;
  detail: string;
  purpose: string;
  rackHint: string;
  glyph: string;
  elementClass: string;
}> = {
  shell: { label: 'Impact round', shortLabel: 'Impact', detail: 'Balanced blast · unlimited', purpose: 'Reliable ranging and steady damage', rackHint: 'Balanced blast', glyph: '●', elementClass: 'el-metal' },
  barb: { label: 'Scatter volley', shortLabel: 'Scatter', detail: 'Three diverging rounds · 2 charges', purpose: 'Covers uncertain ranges', rackHint: '3-way spread', glyph: '⋰', elementClass: 'el-rock' },
  bore: { label: 'Breach charge', shortLabel: 'Breach', detail: 'Penetrates before detonation · 2 charges', purpose: 'Collapses ground beneath cover', rackHint: 'Digs deep', glyph: '◆', elementClass: 'el-sand' },
  cluster: { label: 'Fragment burst', shortLabel: 'Fragment', detail: 'Five submunitions · 1 charge', purpose: 'Saturates a wide shelf', rackHint: '5-shot burst', glyph: '✣', elementClass: 'el-chemical' },
  bloom: { label: 'Barrier projector', shortLabel: 'Barrier', detail: 'Constructs protective terrain · 1 charge', purpose: 'Builds cover and changes the field', rackHint: 'Builds cover', glyph: '✦', elementClass: 'el-plant' },
  lance: { label: 'Kinetic lance', shortLabel: 'Lance', detail: 'Fast, narrow, heavy hit · 1 charge', purpose: 'Rewards a precise low arc', rackHint: 'Fast direct hit', glyph: '➤', elementClass: 'el-light' },
};

const BARREL_LENGTH = 4.2;
const ARTILLERY_SKY_TOP = -38;
const ARTILLERY_VIEW_HEIGHT = ARTILLERY_HEIGHT - ARTILLERY_SKY_TOP;
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

export function artilleryAimFromDrag(
  startX: number,
  startY: number,
  side: ArtillerySide,
  endX: number,
  endY: number,
  fieldWidth: number,
): { angle: number; power: number } | null {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance < 12 || fieldWidth <= 0) return null;

  const direction = side === 'left' ? 1 : -1;
  const directedForward = deltaX * direction;
  const directedRise = -deltaY;
  // Give small finger wobble some grace, but never turn a backwards/downwards
  // swipe into a surprising minimum-power shot.
  if (directedForward < -8 || directedRise < -8) return null;

  const forward = Math.max(1, directedForward);
  const rise = Math.max(0, directedRise);
  const angle = Math.max(10, Math.min(80, Math.round(Math.atan2(rise, forward) * 180 / Math.PI)));
  const fullPowerDistance = Math.max(120, fieldWidth * 0.48);
  const powerProgress = Math.max(0, Math.min(1, (Math.hypot(forward, rise) - 12) / (fullPowerDistance - 12)));
  const power = Math.round(15 + powerProgress * 85);
  return { angle, power };
}

export function artilleryImpactTerrainFrame(
  before: readonly number[],
  after: readonly number[],
  progress: number,
): number[] {
  const clamped = Math.max(0, Math.min(1, progress));
  const eased = 1 - Math.pow(1 - clamped, 3);
  return before.map((height, index) => height + ((after[index] ?? height) - height) * eased);
}

export function artilleryFlightFrameIndex(pathLength: number, longestPath: number, progress: number) {
  if (pathLength <= 1 || longestPath <= 1) return 0;
  return Math.min(pathLength - 1, Math.floor(Math.max(0, Math.min(1, progress)) * (longestPath - 1)));
}

export function artilleryMoveAnimationProgress(
  phase: NonNullable<AnimatedShot>['phase'] | null,
  progress: number,
  move: ArtilleryMove,
) {
  if (move === 0 || phase === null) return 0;
  if (phase !== 'move') return 1;
  const clamped = Math.max(0, Math.min(1, progress));
  return clamped * clamped * (3 - 2 * clamped);
}

export function artilleryJetFlightY(launchY: number, landingY: number, fuelSpent: number, startFuel: number): number {
  const progress = Math.max(0, Math.min(1, fuelSpent / Math.max(1, startFuel)));
  return launchY + (landingY - launchY) * progress - Math.sin(progress * Math.PI) * 42;
}

export function CommandMeter({ label, value, suffix = '', min, max, disabled, guidance, decreaseKey, increaseKey, compact = false, kind = 'power', side = 'left', onChange }: {
  label: string;
  value: number;
  suffix?: string;
  min: number;
  max: number;
  disabled: boolean;
  guidance: string;
  decreaseKey: string;
  increaseKey: string;
  compact?: boolean;
  kind?: 'angle' | 'power';
  side?: ArtillerySide;
  onChange: (value: number) => void;
}) {
  const adjust = (amount: number) => onChange(Math.max(min, Math.min(max, value + amount)));
  const leftDelta = kind === 'angle' ? (side === 'left' ? 1 : -1) : -1;
  const rightDelta = kind === 'angle' ? -leftDelta : 1;
  const leftLabel = kind === 'angle' ? 'Aim barrel left' : `Decrease ${label.toLowerCase()} by 1`;
  const rightLabel = kind === 'angle' ? 'Aim barrel right' : `Increase ${label.toLowerCase()} by 1`;
  return (
    <div className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2 border border-edge bg-s0 p-2">
      <Button
        type="button"
        variant="secondary"
        className={`${compact ? 'h-9' : 'h-12'} w-11 shrink-0 border border-edge-strong p-0 text-heading`}
        disabled={disabled || value + leftDelta < min || value + leftDelta > max}
        aria-label={leftLabel}
        onClick={() => adjust(leftDelta)}
      >
        <span aria-hidden>{kind === 'angle' ? '←' : '−'}</span><kbd className="sr-only">{decreaseKey}</kbd>
      </Button>
      <label className="grid min-w-0 grid-cols-[1fr_auto] items-center gap-x-2 leading-none">
        <span className="type-micro text-ink-3">{label}</span>
        <output className="font-mono text-body text-ink sm:text-heading" aria-live="polite">{value}{suffix}</output>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          aria-label={`${label} ${value}${suffix}`}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          className="col-span-2 mt-1 h-5 w-full cursor-pointer accent-[var(--color-viable-hi)] disabled:cursor-not-allowed disabled:opacity-40"
          style={kind === 'angle' && side === 'left' ? { direction: 'rtl' } : undefined}
        />
        <span className="hidden max-w-full truncate font-body text-small text-ink-3 min-[380px]:block">{guidance}</span>
      </label>
      <Button
        type="button"
        variant="secondary"
        className={`${compact ? 'h-9' : 'h-12'} w-11 shrink-0 border border-edge-strong p-0 text-heading`}
        disabled={disabled || value + rightDelta < min || value + rightDelta > max}
        aria-label={rightLabel}
        onClick={() => adjust(rightDelta)}
      >
        <span aria-hidden>{kind === 'angle' ? '→' : '+'}</span><kbd className="sr-only">{increaseKey}</kbd>
      </Button>
    </div>
  );
}

export function ArtilleryBoard({ seed, mode, difficulty, mapSize, world, onStatus, onComplete, onRematch }: {
  seed: string;
  mode: ArtilleryMode;
  difficulty: ArtilleryDifficulty;
  mapSize: ArtilleryMapSize;
  world: ArtilleryWorld;
  onStatus: (status: string) => void;
  onComplete: (result: { score: number; actions: ArtilleryAction[] }) => void;
  onRematch: () => void;
}) {
  const [state, setState] = React.useState<ArtilleryState>(() => createArtilleryState(seed, mode, difficulty, { mapSize, world }));
  const [angle, setAngle] = React.useState(45);
  const [power, setPower] = React.useState(70);
  const [payload, setPayload] = React.useState<ArtilleryPayload>('shell');
  const [settledAim, setSettledAim] = React.useState<Record<'left' | 'right', number>>({ left: 45, right: 45 });
  const [animated, setAnimated] = React.useState<AnimatedShot>(null);
  const [movement, setMovement] = React.useState<ActiveThrust>(null);
  const [shotCallout, setShotCallout] = React.useState<string | null>(null);
  const [handoffPending, setHandoffPending] = React.useState(false);
  const [coachVisible, setCoachVisible] = React.useState(true);
  const [narrowScreen, setNarrowScreen] = React.useState(false);
  const [stats, setStats] = React.useState<Record<ArtillerySide, CombatStats>>({
    left: { shots: 0, hits: 0, damage: 0, directHits: 0, terrainShift: 0, payloads: [] },
    right: { shots: 0, hits: 0, damage: 0, directHits: 0, terrainShift: 0, payloads: [] },
  });
  const [rangeBest, setRangeBest] = React.useState(() => {
    try { return Number(globalThis.localStorage?.getItem('xalians.arcade.artillery.rangeBest')) || 0; } catch { return 0; }
  });
  const sound = React.useMemo(() => createArtillerySound(), []);
  const [soundOn, setSoundOn] = React.useState(() => sound.enabled());
  const pendingTimers = React.useRef<number[]>([]);
  const completed = React.useRef(false);
  const actions = React.useRef<ArtilleryAction[]>([]);
  const botScheduled = React.useRef(false);
  const stateRef = React.useRef(state);
  const thrustTimer = React.useRef<number | null>(null);
  const movementRef = React.useRef<ActiveThrust>(null);
  const fieldRef = React.useRef<SVGSVGElement>(null);
  const activePointer = React.useRef<number | null>(null);
  const dragOrigin = React.useRef<{ x: number; y: number } | null>(null);
  const [dragGuide, setDragGuide] = React.useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [shortLandscape, setShortLandscape] = React.useState(false);
  const fieldWidth = state.terrain.length - 1;
  const worldMeta = WORLD_META[state.world];
  const environment = ARTILLERY_CONDITIONS[state.condition];

  React.useEffect(() => { stateRef.current = state; }, [state]);
  React.useEffect(() => { movementRef.current = movement; }, [movement]);

  React.useEffect(() => () => {
    pendingTimers.current.forEach(window.clearTimeout);
    if (thrustTimer.current !== null) window.clearInterval(thrustTimer.current);
    sound.dispose();
  }, [sound]);

  React.useEffect(() => {
    const query = window.matchMedia('(min-width: 700px) and (max-height: 500px)');
    const narrow = window.matchMedia('(max-width: 600px)');
    const update = () => setShortLandscape(query.matches);
    const updateNarrow = () => setNarrowScreen(narrow.matches);
    update();
    updateNarrow();
    query.addEventListener?.('change', update);
    narrow.addEventListener?.('change', updateNarrow);
    return () => {
      query.removeEventListener?.('change', update);
      narrow.removeEventListener?.('change', updateNarrow);
    };
  }, []);

  const animateShot = React.useCallback((shot: ArtilleryShot) => {
    if (animated || movement || state.phase !== 'aiming') return;
    fieldRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    const resolvedShot: Required<ArtilleryShot> = {
      angle: Math.round(shot.angle),
      power: Math.round(shot.power),
      payload: shot.payload ?? 'shell',
      move: shot.move ?? 0,
      system: shot.system ?? 'none',
    };
    setSettledAim((current) => ({ ...current, [state.current]: shot.angle }));
    if (mode === 'bot' && state.current === 'left') actions.current.push(resolvedShot);
    const applied = applyArtilleryShot(state, resolvedShot);
    const longestPath = Math.max(...applied.outcome.projectiles.map((projectile) => projectile.path.length));
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const firingRig = RANGE_RIGS[state.current];
    const targetSide: ArtillerySide = state.current === 'left' ? 'right' : 'left';
    const target = state.tanks[targetSide];
    const payloadName = PAYLOAD_META[applied.outcome.payload].label;
    let result = `${payloadName} left the range.`;
    if (applied.outcome.hit) {
      const impactKind = applied.outcome.directHit ? 'DIRECT HIT' : 'BLAST HIT';
      const fall = applied.outcome.fallDamage ? ` · ${applied.outcome.fallDamage} collapse` : '';
      const guard = applied.outcome.guardAbsorbed ? ` · ${applied.outcome.guardAbsorbed} guarded` : '';
      result = `${impactKind} · ${applied.outcome.damage} DAMAGE${fall}${guard}`;
    } else if (applied.outcome.impact) {
      result = `${payloadName.toUpperCase()} · TERRAIN IMPACT`;
    }

    const frameState = (phase: NonNullable<AnimatedShot>['phase'], progress: number) => {
      setAnimated({ outcome: applied.outcome, progress, phase, shooter: state.current, shot: resolvedShot, terrainAfter: applied.state.terrain });
      if (phase === 'impact' && progress >= 0.72) setShotCallout(result);
    };
    const runPhase = (phase: NonNullable<AnimatedShot>['phase'], frames: number, delay: number, done: () => void) => {
      if (reduced) {
        frameState(phase, 1);
        pendingTimers.current.push(window.setTimeout(done, 1));
        return;
      }
      let frame = 0;
      frameState(phase, 0);
      const tick = () => {
        frame += 1;
        frameState(phase, Math.min(1, frame / frames));
        if (frame < frames) pendingTimers.current.push(window.setTimeout(tick, delay));
        else done();
      };
      pendingTimers.current.push(window.setTimeout(tick, delay));
    };

    const finish = () => {
      pendingTimers.current.push(window.setTimeout(() => {
        setAnimated(null);
        setShotCallout(null);
        setStats((current) => {
          const side = current[state.current];
          return {
            ...current,
            [state.current]: {
              shots: side.shots + 1,
              hits: side.hits + Number(applied.outcome.damage > 0),
              damage: side.damage + (mode === 'range' ? applied.outcome.damage : Math.min(applied.outcome.damage, target.integrity)),
              directHits: side.directHits + Number(applied.outcome.directHit),
              terrainShift: side.terrainShift + Math.abs(applied.outcome.terrainShift),
              payloads: side.payloads.includes(applied.outcome.payload) ? side.payloads : [...side.payloads, applied.outcome.payload],
            },
          };
        });
        setState(applied.state);
        if (mode === 'local' && !applied.state.winner) setHandoffPending(true);
        const windLabel = applied.state.wind === 0 ? 'still' : `${Math.abs(applied.state.wind)} ${applied.state.wind > 0 ? 'right' : 'left'}`;
        const nextRig = RANGE_RIGS[applied.state.current].name;
        onStatus(applied.state.winner
          ? result
          : mode === 'bot' && state.current === 'left'
            ? `${nextRig} is taking aim.`
            : `${nextRig} has command. Wind ${windLabel}.`);
      }, reduced ? 1 : 260));
    };

    const impact = () => {
      sound.play(applied.outcome.hit ? 'hit' : 'impact', applied.outcome.payload);
      runPhase('impact', 26, 24, finish);
    };
    const flight = () => {
      sound.play('launch', resolvedShot.payload);
      onStatus(`${firingRig.name} fires ${payloadName}.`);
      runPhase('flight', Math.max(58, Math.min(96, longestPath)), 20, impact);
    };
    const charge = () => {
      onStatus(`${firingRig.name} charges ${payloadName}.`);
      runPhase('charge', 14, 24, flight);
    };
    if (resolvedShot.move !== 0) runPhase('move', 72, 20, charge);
    else charge();
  }, [animated, mode, movement, onStatus, sound, state]);

  React.useEffect(() => {
    if (state.phase === 'finished' && state.winner && !completed.current) {
      completed.current = true;
      if (state.winner === 'left' && mode === 'bot') {
        sound.play('win');
        onComplete({ score: Math.max(0, 1000 - state.turn * 40), actions: actions.current });
      } else if (mode === 'bot') {
        sound.play('loss');
        onStatus('The rival range rig disabled your launcher. Start a new match to retake the range.');
      } else if (mode === 'range') {
        onStatus(`Calibration complete: ${stats.left.damage} damage across ${state.turn} shots.`);
      } else if (mode === 'challenge') {
        onStatus(state.winner === 'left' ? 'Limited-ordnance trial cleared.' : 'The trial target survived the five-round magazine.');
      } else {
        onStatus(`${RANGE_RIGS[state.winner].name} holds the range after ${state.turn} shots.`);
      }
      return;
    }
    if (mode === 'bot' && state.current === 'right' && state.phase === 'aiming' && !animated) {
      if (botScheduled.current) return;
      botScheduled.current = true;
      onStatus('Rival rig is calculating its shot.');
      pendingTimers.current.push(window.setTimeout(() => {
        botScheduled.current = false;
        animateShot(chooseArtilleryBotShot(state));
      }, 550));
    }
  }, [animateShot, animated, mode, onComplete, onStatus, sound, state, stats.left.damage]);

  React.useEffect(() => {
    if (mode !== 'range' || state.phase !== 'finished') return;
    const score = stats.left.damage;
    if (score <= rangeBest) return;
    setRangeBest(score);
    try { globalThis.localStorage?.setItem('xalians.arcade.artillery.rangeBest', String(score)); } catch { /* local mastery is optional */ }
  }, [mode, rangeBest, state.phase, stats.left.damage]);

  React.useEffect(() => {
    if (payload !== 'shell' && state.payloads[state.current][payload] <= 0) setPayload('shell');
    if (payload === 'shell' && state.coreAmmo[state.current] === 0) {
      const next = ARTILLERY_SPECIAL_PAYLOADS.find((choice) => state.payloads[state.current][choice] > 0);
      if (next) setPayload(next);
    }
  }, [payload, state.coreAmmo, state.current, state.payloads]);

  const displayTerrain = React.useMemo(
    () => animated?.phase === 'impact'
      ? artilleryImpactTerrainFrame(state.terrain, animated.terrainAfter, animated.progress)
      : state.terrain,
    [animated, state.terrain],
  );
  const terrainPath = React.useMemo(() => {
    const points = displayTerrain.map((height, x) => `L ${x} ${ARTILLERY_HEIGHT - height}`).join(' ');
    return `M 0 ${ARTILLERY_HEIGHT} ${points} L ${fieldWidth} ${ARTILLERY_HEIGHT} Z`;
  }, [displayTerrain, fieldWidth]);
  const terrainContours = React.useMemo(() => [4, 8].map((offset) =>
    displayTerrain.filter((_, x) => x % 2 === 0).map((height, index) => {
      const x = index * 2;
      return `${index === 0 ? 'M' : 'L'} ${x} ${Math.min(ARTILLERY_HEIGHT, ARTILLERY_HEIGHT - height + offset)}`;
    }).join(' ')
  ), [displayTerrain]);
  const canOperate = !animated && !handoffPending && state.phase === 'aiming' && (mode !== 'bot' || state.current === 'left');
  const canFire = canOperate && !movement;
  const animatedProjectiles = React.useMemo(() => animated?.outcome.projectiles.map((projectile) => {
    const longestPath = Math.max(...animated.outcome.projectiles.map((candidate) => candidate.path.length));
    const flightProgress = animated.phase === 'flight' ? animated.progress : animated.phase === 'impact' ? 1 : 0;
    const pointIndex = artilleryFlightFrameIndex(projectile.path.length, longestPath, flightProgress);
    return { point: projectile.path[pointIndex], path: projectile.path.slice(0, pointIndex + 1) };
  }) ?? [], [animated]);
  const impactFrames = animated?.phase === 'impact'
    ? animated.outcome.projectiles.flatMap((projectile) => projectile.impact ? [projectile.impact] : [])
    : [];
  const cameraViewBox = React.useMemo(() => {
    if (!narrowScreen) return `0 ${ARTILLERY_SKY_TOP} ${fieldWidth} ${ARTILLERY_VIEW_HEIGHT}`;
    const focusX = animatedProjectiles.length
      ? animatedProjectiles[Math.floor(animatedProjectiles.length / 2)].point.x
      : (state.tanks.left.x + state.tanks.right.x) / 2;
    const width = Math.min(fieldWidth, Math.max(190, fieldWidth * 0.58));
    const x = Math.max(0, Math.min(fieldWidth - width, focusX - width / 2));
    return `${x} ${ARTILLERY_SKY_TOP} ${width} ${ARTILLERY_VIEW_HEIGHT}`;
  }, [animatedProjectiles, fieldWidth, narrowScreen, state.tanks.left.x, state.tanks.right.x]);
  const aimOutcome = React.useMemo(
    () => canFire ? simulateArtilleryShot(state, { angle, power, payload, move: 0, system: 'none' }) : null,
    [angle, canFire, payload, power, state],
  );
  const aimPreviews = aimOutcome?.projectiles.map((projectile) =>
    projectile.path.slice(0, Math.min(14, Math.max(8, projectile.path.length - 7)))
  ) ?? [];
  const activePayload = animated?.outcome.payload ?? payload;
  const activePayloadMeta = PAYLOAD_META[activePayload];
  const impactMoment = animated?.phase === 'impact';
  const shotShake = impactMoment && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? Math.sin((animated?.progress ?? 0) * Math.PI * 8) * (activePayload === 'bore' ? 0.7 : 0.45) * (1 - (animated?.progress ?? 0))
    : 0;

  const payloadRemaining = (side: ArtillerySide, choice: ArtilleryPayload) =>
    choice === 'shell' ? (state.coreAmmo[side] < 0 ? Number.POSITIVE_INFINITY : state.coreAmmo[side]) : state.payloads[side][choice];

  const botThreatened = !!state.lastImpact && Math.abs(state.lastImpact.x - state.tanks.right.x) <= 14 && state.traction.right > 0;
  const botFortifying = botThreatened && state.tanks.right.integrity <= 60 && state.payloads.right.bloom > 0;
  const botIntent = botFortifying ? 'Growing crater cover' : botThreatened ? 'Evasive reposition' : state.botPrevious ? 'Correcting range' : 'Measuring range';
  const resultSide = mode === 'bot' || mode === 'range' || mode === 'challenge' ? 'left' : state.winner ?? 'left';
  const resultStats = stats[resultSide];
  const resultAccuracy = resultStats.shots ? Math.round(resultStats.hits / resultStats.shots * 100) : 0;
  const resultGrade = mode === 'range'
    ? resultStats.damage >= 100 ? 'S' : resultStats.damage >= 72 ? 'A' : resultStats.damage >= 45 ? 'B' : resultStats.damage > 0 ? 'C' : 'D'
    : mode === 'challenge'
      ? state.winner === 'left' ? state.turn <= 4 ? 'S' : 'A' : resultStats.damage >= 70 ? 'C' : 'D'
      : mode === 'local' || state.winner === 'left'
        ? state.turn <= 7 && resultAccuracy >= 50 ? 'S' : state.turn <= 11 ? 'A' : 'B'
        : state.turn >= 10 ? 'C' : 'D';
  const resultSpecialsSpent = (mode === 'challenge' ? 4 : 7) - Object.values(state.payloads[resultSide]).reduce((total, remaining) => total + remaining, 0);
  const angleGuidance = angle < 35 ? 'Low, flatter arc' : angle < 60 ? 'Balanced arc' : 'High arc for ridges';
  const powerGuidance = power < 45 ? 'Shorter range' : power < 75 ? 'Medium range' : 'Longer range';
  const windAssists = state.wind !== 0 && (state.current === 'left' ? state.wind > 0 : state.wind < 0);
  const windLabel = state.wind === 0
    ? 'Still air'
    : `${state.wind > 0 ? '→' : '←'} ${Math.abs(state.wind)} · ${windAssists ? 'helps shot' : 'fights shot'}`;
  const crewAt = (side: ArtillerySide) => RANGE_RIGS[side];
  const displayedHull = (side: ArtillerySide) => {
    if (!impactMoment || !animated) return state.tanks[side].integrity;
    const targetSide: ArtillerySide = animated.shooter === 'left' ? 'right' : 'left';
    if (targetSide !== side) return state.tanks[side].integrity;
    return Math.max(0, state.tanks[side].integrity - animated.outcome.damage * animated.progress);
  };

  const aimAtPointer = React.useCallback((clientX: number, clientY: number) => {
    const field = fieldRef.current;
    if (!field || !canFire || !dragOrigin.current) return;
    const rect = field.getBoundingClientRect();
    const next = artilleryAimFromDrag(
      dragOrigin.current.x,
      dragOrigin.current.y,
      state.current,
      clientX,
      clientY,
      rect.width,
    );
    const toFieldPoint = (x: number, y: number) => ({
      x: ((x - rect.left) / rect.width) * fieldWidth,
      y: ARTILLERY_SKY_TOP + ((y - rect.top) / rect.height) * ARTILLERY_VIEW_HEIGHT,
    });
    setDragGuide({
      start: toFieldPoint(dragOrigin.current.x, dragOrigin.current.y),
      end: toFieldPoint(clientX, clientY),
    });
    if (!next) return;
    setAngle(next.angle);
    setPower(next.power);
  }, [canFire, fieldWidth, state.current]);

  const beginDirectAim = React.useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!canFire || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    activePointer.current = event.pointerId;
    const field = fieldRef.current;
    if (!field) {
      activePointer.current = null;
      return;
    }
    dragOrigin.current = { x: event.clientX, y: event.clientY };
    setDragGuide(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [canFire]);

  const continueDirectAim = React.useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== event.pointerId) return;
    event.preventDefault();
    aimAtPointer(event.clientX, event.clientY);
  }, [aimAtPointer]);

  const finishDirectAim = React.useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== event.pointerId) return;
    aimAtPointer(event.clientX, event.clientY);
    activePointer.current = null;
    dragOrigin.current = null;
    setDragGuide(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, [aimAtPointer]);

  const cancelDirectAim = React.useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    dragOrigin.current = null;
    setDragGuide(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const moveRig = React.useCallback((direction: Exclude<ArtilleryMove, 0>, mobility: ArtilleryMobility, thrust: number) => {
    const current = stateRef.current;
    const available = mobility === 'jet' ? current.jetCharges[current.current] : current.traction[current.current];
    if (current.phase !== 'aiming' || available <= 0 || (mode === 'bot' && current.current !== 'left')) return;
    const applied = applyArtilleryMove(current, direction, mobility, thrust);
    if (applied.fuelSpent <= 0) return;
    if (mode === 'bot' && current.current === 'left') actions.current.push({ type: 'move', direction, mobility, thrust: applied.fuelSpent });
    stateRef.current = applied.state;
    setState(applied.state);
  }, [mode]);

  const stopThrust = React.useCallback(() => {
    if (thrustTimer.current !== null) window.clearInterval(thrustTimer.current);
    thrustTimer.current = null;
    const active = movementRef.current;
    if (!active || active.phase === 'landing') return;
    const current = stateRef.current;
    const remaining = active.mobility === 'jet' ? current.jetCharges[active.side] : current.traction[active.side];
    if (active.mobility === 'drive') {
      movementRef.current = null;
      setMovement(null);
      onStatus(`Drive idle · ${Math.round(remaining)}% fuel remains.`);
      return;
    }

    const landingX = current.tanks[active.side].x;
    const landingY = ARTILLERY_HEIGHT - terrainHeight(current.terrain, landingX) - 1.5;
    const landingStart = active.flightY;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const frames = reducedMotion ? 1 : 24;
    let frame = 0;
    const landing = { ...active, phase: 'landing' as const, landingProgress: 0 };
    movementRef.current = landing;
    setMovement(landing);
    onStatus(`Jet thrust cut · coasting to landing with ${Math.round(remaining)}% fuel.`);
    const tick = () => {
      frame += 1;
      const progress = Math.min(1, frame / frames);
      const eased = progress * progress * (3 - 2 * progress);
      const next: NonNullable<ActiveThrust> = {
        ...landing,
        landingProgress: progress,
        flightY: landingStart + (landingY - landingStart) * eased,
      };
      if (progress >= 1) {
        movementRef.current = null;
        setMovement(null);
        onStatus(`Jump jet landed · ${Math.round(remaining)}% fuel remains.`);
        return;
      }
      movementRef.current = next;
      setMovement(next);
      pendingTimers.current.push(window.setTimeout(tick, 18));
    };
    pendingTimers.current.push(window.setTimeout(tick, 18));
  }, [onStatus]);

  const beginThrust = React.useCallback((event: React.PointerEvent<HTMLButtonElement>, direction: Exclude<ArtilleryMove, 0>, mobility: ArtilleryMobility) => {
    if (!canOperate || movement || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const current = stateRef.current;
    const available = mobility === 'jet' ? current.jetCharges[current.current] : current.traction[current.current];
    if (available <= 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const startedAt = performance.now();
    const launchX = current.tanks[current.current].x;
    const launchY = ARTILLERY_HEIGHT - terrainHeight(current.terrain, launchX) - 1.5;
    const active: NonNullable<ActiveThrust> = {
      side: current.current,
      direction,
      mobility,
      pulse: 0,
      phase: 'thrust',
      launchX,
      launchY,
      startFuel: available,
      flightY: launchY,
      landingProgress: 0,
    };
    movementRef.current = active;
    setMovement(active);
    moveRig(direction, mobility, Math.min(0.6, available));
    sound.play('select');
    fieldRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    onStatus(mobility === 'jet'
      ? 'Jump jet engaged · hold for a longer high arc, release to land.'
      : 'Drive engaged · hold for distance, release to stop.');
    thrustTimer.current = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const fuelPerSecond = 8 + 32 * Math.min(1, elapsed / 1800);
      const pulseFuel = Math.min(3.2, fuelPerSecond * 0.08);
      const latest = stateRef.current;
      const fuel = mobility === 'jet' ? latest.jetCharges[active.side] : latest.traction[active.side];
      if (fuel <= 0) {
        stopThrust();
        return;
      }
      moveRig(direction, mobility, Math.min(pulseFuel, fuel));
      const afterMove = stateRef.current;
      setMovement((value) => {
        if (!value || value.phase !== 'thrust') return value;
        const fuelAfterMove = mobility === 'jet' ? afterMove.jetCharges[active.side] : afterMove.traction[active.side];
        const landingX = afterMove.tanks[active.side].x;
        const landingY = ARTILLERY_HEIGHT - terrainHeight(afterMove.terrain, landingX) - 1.5;
        const next = {
          ...value,
          pulse: value.pulse + 1,
          flightY: mobility === 'jet'
            ? artilleryJetFlightY(value.launchY, landingY, value.startFuel - fuelAfterMove, value.startFuel)
            : value.flightY,
        };
        movementRef.current = next;
        return next;
      });
    }, 80);
  }, [canOperate, moveRig, movement, onStatus, sound, stopThrust]);

  React.useEffect(() => {
    const stop = () => stopThrust();
    window.addEventListener('blur', stop);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('blur', stop);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [stopThrust]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, button, [contenteditable="true"]') || !canFire) return;
      const key = event.key.toLowerCase();
      if (['a', 'd', 'w', 's', 'q', 'e', 'arrowup', 'arrowdown', '1', '2', '3', '4', '5', '6', ' '].includes(key)) event.preventDefault();
      if (key === 'a') moveRig(-1, 'drive', 1);
      else if (key === 'd') moveRig(1, 'drive', 1);
      else if (key === 'w' || key === 'arrowup') setAngle((current) => Math.min(80, current + 1));
      else if (key === 's' || key === 'arrowdown') setAngle((current) => Math.max(10, current - 1));
      else if (key === 'q') setPower((current) => Math.max(15, current - 1));
      else if (key === 'e') setPower((current) => Math.min(100, current + 1));
      else if (/^[1-6]$/.test(key)) {
        const choice = ARTILLERY_PAYLOADS[Number(key) - 1];
        if (choice === 'shell' || state.payloads[state.current][choice] > 0) setPayload(choice);
      }
      else if (key === ' ' && !event.repeat) animateShot({ angle, power, payload, move: 0, system: 'none' });
      else return;
      if (key !== ' ' && !event.repeat) sound.play('select');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [angle, animateShot, canFire, moveRig, payload, power, sound, state.current, state.payloads]);

  const tank = (side: 'left' | 'right') => {
    const value = state.tanks[side];
    const animatedMove = animated?.shooter === side ? animated.shot.move : 0;
    const movementTargetX = artilleryMovedX(state, side, animatedMove);
    const animatedMoveEase = artilleryMoveAnimationProgress(animated?.phase ?? null, animated?.progress ?? 0, animatedMove);
    const displayX = animatedMove !== 0
        ? value.x + (movementTargetX - value.x) * animatedMoveEase
        : value.x;
    const driving = movement?.side === side && movement.mobility === 'drive';
    const strideProgress = driving ? movement.pulse / 5 : animated?.phase === 'move' && animatedMove !== 0 ? animated.progress : 0;
    const stride = Math.sin(strideProgress * Math.PI * 10) * 0.65;
    const bodyLift = driving ? -Math.abs(Math.sin(strideProgress * Math.PI * 5)) * 0.32 : 0;
    const jetting = movement?.side === side && movement.mobility === 'jet';
    const jetProgress = jetting
      ? movement.phase === 'thrust' ? Math.min(1, 0.3 + movement.pulse / 18) : Math.max(0, 1 - movement.landingProgress)
      : 0;
    const terrainY = ARTILLERY_HEIGHT - terrainHeight(displayTerrain, displayX) - 1.5;
    const y = jetting ? movement.flightY : terrainY + bodyLift;
    const displayAngle = canOperate && state.current === side ? angle : settledAim[side];
    const barrel = artilleryBarrelEndpoint(displayX, y - 1.8, side, displayAngle);
    const crew = RANGE_RIGS[side];
    const movementLabel = movement?.side === side || displayX !== value.x ? ', moving' : '';
    const firingProgress = animated?.phase === 'charge' ? animated.progress : animated?.phase === 'flight' ? Math.min(1, animated.progress * 8) : 1;
    const firing = !!animated && animated.shooter === side && (animated.phase === 'charge' || (animated.phase === 'flight' && animated.progress < 0.125));
    const recoiling = firing && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? Math.sin(firingProgress * Math.PI) * (side === 'left' ? -0.7 : 0.7)
      : 0;
    const takingDamage = !!impactMoment && animated?.outcome.hit === side;
    const damageJolt = takingDamage && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? (side === 'left' ? -0.45 : 0.45)
      : 0;
    const impactTarget = animated?.shooter === 'left' ? 'right' : 'left';
    const displayedIntegrity = impactMoment && impactTarget === side
      ? Math.max(0, value.integrity - (animated?.outcome.damage ?? 0) * (animated?.progress ?? 0))
      : value.integrity;
    return (
      <g
        className={side === 'left' ? 'el-fire' : 'el-water'}
        aria-label={`${crew.name} mobile launcher, ${value.integrity} integrity${movementLabel}`}
        transform={`translate(${recoiling + damageJolt} 0)`}
      >
        <rect x={displayX - 3.2} y={y - 7.2} width="6.4" height="0.85" className="fill-s0 stroke-ink-4" strokeWidth="0.18" />
        <rect x={displayX - 3.1} y={y - 7.1} width={6.2 * displayedIntegrity / ARTILLERY_MAX_INTEGRITY} height="0.65" className="fill-el" />
        {state.current === side && state.phase === 'aiming' && (
          <g aria-hidden>
            <path d={`M ${displayX} ${y - 8.4} l 0.8 0.8 -0.8 0.8 -0.8 -0.8 Z`} className="fill-viable-hi" />
            <line x1={displayX} y1={y - 6.8} x2={displayX} y2={y - 5.5} className="stroke-viable-hi opacity-70" strokeWidth="0.2" />
          </g>
        )}
        <path d={`M ${displayX - 2.4} ${y + 0.2} L ${displayX - 3.5 - stride} ${y + 2.6} M ${displayX - 0.8} ${y + 0.5} L ${displayX - 1.8 + stride} ${y + 2.8} M ${displayX + 0.8} ${y + 0.5} L ${displayX + 1.8 - stride} ${y + 2.8} M ${displayX + 2.4} ${y + 0.2} L ${displayX + 3.5 + stride} ${y + 2.6}`} className="fill-none stroke-black" strokeWidth="0.8" strokeLinecap="round" />
        <path d={`M ${displayX - 2.4} ${y + 0.2} L ${displayX - 3.5 - stride} ${y + 2.6} M ${displayX - 0.8} ${y + 0.5} L ${displayX - 1.8 + stride} ${y + 2.8} M ${displayX + 0.8} ${y + 0.5} L ${displayX + 1.8 - stride} ${y + 2.8} M ${displayX + 2.4} ${y + 0.2} L ${displayX + 3.5 + stride} ${y + 2.6}`} className="fill-none stroke-el" strokeWidth="0.34" strokeLinecap="round" />
        <path
          d={`M ${displayX - 3} ${y + 0.1} L ${displayX - 2.2} ${y - 2.1} L ${displayX + 2.2} ${y - 2.1} L ${displayX + 3} ${y + 0.1} L ${displayX + 1.6} ${y + 1} L ${displayX - 1.6} ${y + 1} Z`}
          className="fill-el stroke-black"
          strokeWidth="0.38"
        />
        {value.integrity <= 50 && (
          <g aria-hidden className={value.integrity <= 25 ? 'el-fire' : 'el-metal'}>
            <circle cx={displayX - 1.2} cy={y - 4.4} r="0.55" className="fill-el opacity-50" />
            <circle cx={displayX - 0.6} cy={y - 5.6} r="0.8" className="fill-el opacity-30" />
            <circle cx={displayX - 1.5} cy={y - 6.8} r="1.05" className="fill-el opacity-15" />
          </g>
        )}
        <path d={`M ${displayX - 1.8} ${y - 1.9} L ${displayX - 1.1} ${y - 3.2} L ${displayX + 1.1} ${y - 3.2} L ${displayX + 1.8} ${y - 1.9}`} className="fill-el stroke-black" strokeWidth="0.35" />
        <circle cx={displayX} cy={y - 2.8} r="1.08" className="fill-s0 stroke-el" strokeWidth="0.4" />
        <circle cx={displayX} cy={y - 2.8} r="0.32" className="fill-el" />
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
        {driving && (
          <g className="el-sand" aria-hidden>
            <circle cx={displayX - 3.8} cy={y + 2.7} r={0.35 + Math.abs(stride) * 0.2} className="fill-el opacity-30" />
            <circle cx={displayX - 5.1} cy={y + 2.2} r="0.28" className="fill-el opacity-18" />
            <circle cx={displayX + 3.8} cy={y + 2.7} r={0.3 + Math.abs(stride) * 0.16} className="fill-el opacity-25" />
          </g>
        )}
        {jetProgress > 0 && movement?.phase === 'thrust' && (
          <g className="el-fire" aria-hidden>
            <path d={`M ${displayX - 1.7} ${y + 1} l -0.75 ${2.4 + Math.sin(jetProgress * Math.PI * 8) * 0.5} 1.35 -0.6 Z M ${displayX + 1.7} ${y + 1} l 0.75 ${2.4 - Math.sin(jetProgress * Math.PI * 8) * 0.5} -1.35 -0.6 Z`} className="fill-el opacity-75" />
            <circle cx={displayX - 2.25} cy={y + 4.1} r="0.7" className="fill-el opacity-25" />
            <circle cx={displayX + 2.25} cy={y + 4.1} r="0.7" className="fill-el opacity-25" />
          </g>
        )}
        {takingDamage && (
          <g className="el-electric" aria-hidden>
            <path d={`M ${displayX} ${y - 4.5} l -1.2 -2.2 1.5 0.7 0.4 -2 1 2.4 1.6 -0.6 -1.1 2.2`} className="fill-none stroke-el" strokeWidth="0.45" />
          </g>
        )}
        {value.integrity < ARTILLERY_MAX_INTEGRITY && (
          <g aria-hidden>
            <circle cx={displayX + (side === 'left' ? -1.4 : 1.4)} cy={y - 4.1} r="0.7" className="fill-ink-3 opacity-30" />
            <circle cx={displayX + (side === 'left' ? -2 : 2)} cy={y - 5.6} r="0.95" className="fill-ink-3 opacity-20" />
            {value.integrity <= 34 && <circle cx={displayX + (side === 'left' ? -2.5 : 2.5)} cy={y - 7.4} r="1.25" className="fill-ink-3 opacity-15" />}
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="artillery-layout grid w-full min-w-0 gap-2 overflow-x-clip">
      <section aria-label="Artillery field" className="artillery-field artillery-viewport relative mx-auto w-full self-start overflow-hidden border-2 border-edge-strong bg-s0 shadow-panel">
        <div className="pointer-events-none absolute inset-x-2 top-2 z-10 grid grid-cols-[minmax(0,1fr)_7.25rem_minmax(0,1fr)] items-start gap-1 sm:grid-cols-[minmax(0,1fr)_9.5rem_minmax(0,1fr)] sm:gap-2">
          <div className="min-w-0 border border-edge-strong bg-s0/90 p-1.5">
            <div className="flex items-center justify-between gap-1 font-legend text-small uppercase tracking-legend"><span><i className="not-italic sm:hidden">A</i><i className="hidden not-italic sm:inline">{crewAt('left').name}</i></span><span>{Math.round(displayedHull('left'))}</span></div>
            <div className="mt-1 h-1.5 bg-s2"><div className="h-full bg-viable-hi transition-[width] duration-300" style={{ width: `${displayedHull('left')}%` }} /></div>
          </div>
          <div className="border border-edge-strong bg-s0/90 px-2 py-1 text-center">
            <span className="block type-micro">{state.phase === 'finished'
              ? mode === 'range' ? 'Range complete' : mode === 'challenge' ? state.winner === 'left' ? 'Trial clear' : 'Trial failed' : `${crewAt(state.winner!).name} wins`
              : `${crewAt(state.current).shortName} · V${Math.floor(state.turn / 2) + 1}`}</span>
            <span className="block font-mono text-[11px] text-ink-2">{windLabel}</span>
            <span className="hidden font-body text-[11px] text-ink-3 sm:block">{worldMeta.name} · {CONDITION_SHORT[state.condition]}</span>
            <span className="mt-0.5 block font-mono text-[10px] uppercase text-ink-2"><i className="not-italic sm:hidden">G {environment.gravity.toFixed(2)}× · W {environment.wind.toFixed(1)}×</i><i className="hidden not-italic sm:inline">Gravity {environment.gravity.toFixed(2)}× · wind {environment.wind.toFixed(1)}×</i></span>
            {state.turn >= 10 && <span className="block font-mono text-[10px] uppercase text-plague">Damage pressure {Math.min(1.6, 1 + Math.max(0, state.turn - 9) * 0.12).toFixed(2)}×</span>}
          </div>
          <div className="min-w-0 border border-edge-strong bg-s0/90 p-1.5">
            <div className="flex items-center justify-between gap-1 font-legend text-small uppercase tracking-legend"><span><i className="not-italic sm:hidden">B</i><i className="hidden not-italic sm:inline">{crewAt('right').name}</i></span><span>{Math.round(displayedHull('right'))}</span></div>
            <div className="mt-1 h-1.5 bg-s2"><div className="h-full bg-plague transition-[width] duration-300" style={{ width: `${displayedHull('right')}%` }} /></div>
          </div>
        </div>
        {coachVisible && <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 px-8 text-center">
          <span className="inline-block border border-edge-strong bg-s0/90 px-3 py-1.5 font-body text-small text-ink-2">
            {canFire
              ? state.turn === 0 && angle === 45 && power === 70
                ? '1 · Drag up and outward: direction sets arc · distance sets power'
                : state.turn === 0
                  ? '2 · Choose a weapon · then Fire'
                  : 'Drag the field or use the aim sliders'
              : movement ? 'Range rig relocating' : animated ? animated.phase === 'move' ? 'Range rig relocating' : animated.phase === 'charge' ? 'Weapon charging' : animated.phase === 'flight' ? 'Projectile in flight' : 'Impact' : mode === 'bot' && state.current === 'right' ? `${crewAt('right').name}: ${botIntent}` : ''}
          </span>
        </div>}
        {shotCallout && (
          <div className="pointer-events-none absolute inset-x-0 top-[42%] z-20 text-center">
            <span className="inline-block border-2 border-ink-2 bg-s0/90 px-4 py-2 font-legend text-body tracking-legend text-ink shadow-panel min-[500px]:text-heading">
              {shotCallout}
            </span>
          </div>
        )}
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="absolute right-1 bottom-1 z-20 h-7 w-7 border border-edge-strong bg-s0/90 p-0"
          aria-label={coachVisible ? 'Hide aiming tips' : 'Show aiming tips'}
          aria-pressed={coachVisible}
          onClick={() => setCoachVisible((visible) => !visible)}
        >?</Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="absolute bottom-1 left-1 z-20 border border-edge-strong bg-s0/90"
          aria-label={soundOn ? 'Mute artillery audio' : 'Enable artillery audio'}
          aria-pressed={soundOn}
          title={soundOn ? 'Mute cockpit audio' : 'Enable cockpit audio'}
          onClick={() => {
            const next = !soundOn;
            sound.setEnabled(next);
            setSoundOn(next);
            onStatus(`Artillery sound ${next ? 'enabled' : 'muted'}.`);
          }}
        >{soundOn ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}</Button>
        {handoffPending && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-s0/90 p-4 text-center">
            <div className="max-w-xs border border-edge-strong bg-s1 p-1.5 shadow-panel min-[390px]:p-4">
              <span className="type-micro text-ink-3">Pass the command</span>
              <p className="mt-1 mb-2 font-legend text-body uppercase tracking-legend min-[390px]:mb-3 min-[390px]:text-heading">{crewAt(state.current).name}</p>
              <p className="mb-3 hidden font-body text-small text-ink-2 min-[390px]:block">The field is ready. Hand over the device before revealing the next firing choice.</p>
              <Button type="button" className="w-full" onClick={() => {
                setHandoffPending(false);
                onStatus(`${crewAt(state.current).name} has command. Drag the range to aim.`);
              }}>Take command</Button>
            </div>
          </div>
        )}
        <svg
          ref={fieldRef}
          viewBox={cameraViewBox}
          className={`block h-auto w-full touch-none ${canFire ? 'cursor-crosshair' : ''}`}
          role="img"
          aria-label={`Two mobile range rigs on ${worldMeta.name}. Drag up and outward anywhere on the battlefield; direction sets angle and distance sets power.`}
          onPointerDown={beginDirectAim}
          onPointerMove={continueDirectAim}
          onPointerUp={finishDirectAim}
          onPointerCancel={cancelDirectAim}
          onLostPointerCapture={cancelDirectAim}
        >
          <rect y={ARTILLERY_SKY_TOP} width={fieldWidth} height={ARTILLERY_VIEW_HEIGHT} className="fill-s0" />
          <image href={worldMeta.image} x="0" y={ARTILLERY_SKY_TOP} width={fieldWidth} height={ARTILLERY_VIEW_HEIGHT} preserveAspectRatio="xMidYMid slice" opacity="0.42" aria-hidden />
          <rect y={ARTILLERY_SKY_TOP} width={fieldWidth} height={ARTILLERY_VIEW_HEIGHT} className="fill-s0 opacity-55" />
          {RANGE_STARS.map(([x, y, radius], index) => <circle key={index} cx={x * (fieldWidth / 100)} cy={ARTILLERY_SKY_TOP + y * 1.8} r={radius} className="fill-ink-2 opacity-60" />)}
          {[0.25, 0.5, 0.75].map((ratio) => {
            const x = fieldWidth * ratio;
            return (
            <g key={x} aria-hidden>
              <line x1={x} y1="30" x2={x} y2="105" className="stroke-ink-4 opacity-40" strokeWidth="0.18" strokeDasharray="0.7 1.2" />
              <path d={`M ${x - 1.1} 28 L ${x} 26.5 L ${x + 1.1} 28`} className="fill-none stroke-ink-4 opacity-50" strokeWidth="0.25" />
              <text x={x} y="27" textAnchor="middle" className="fill-ink-4 font-mono" fontSize="1.25">{x}</text>
            </g>
          )})}
          <g transform={`translate(${shotShake} 0)`}>
          <path d={terrainPath} className="fill-s2 stroke-ink-2" strokeWidth="0.42" />
          <path d={terrainPath} className={`${worldMeta.elementClass} fill-el opacity-15`} />
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
          {dragGuide && (
            <g aria-hidden className="pointer-events-none">
              <line
                x1={dragGuide.start.x}
                y1={dragGuide.start.y}
                x2={dragGuide.end.x}
                y2={dragGuide.end.y}
                className="stroke-viable-hi opacity-70"
                strokeWidth="0.5"
                strokeDasharray="1 0.7"
              />
              <circle cx={dragGuide.start.x} cy={dragGuide.start.y} r="0.8" className="fill-s0 stroke-viable-hi" strokeWidth="0.35" />
              <circle cx={dragGuide.end.x} cy={dragGuide.end.y} r="1.1" className="fill-viable-hi opacity-90" />
            </g>
          )}
          {movement?.mobility === 'jet' && (
            <g className="el-electric" aria-hidden data-testid="artillery-jet-trajectory">
              <path
                d={`M ${movement.launchX} ${movement.launchY} Q ${(movement.launchX + state.tanks[movement.side].x) / 2} ${Math.min(movement.launchY, movement.flightY) - 7} ${state.tanks[movement.side].x} ${movement.flightY}`}
                className="fill-none stroke-el opacity-45"
                strokeWidth="0.36"
                strokeDasharray="0.8 0.7"
              />
              <circle cx={state.tanks[movement.side].x} cy={movement.flightY + 3.2} r="1.7" className="fill-none stroke-el opacity-25" strokeWidth="0.25" />
            </g>
          )}
          {tank('left')}{tank('right')}
          {animatedProjectiles.map((projectile, index) => (
            <g key={index} className={activePayloadMeta.elementClass}>
              {projectile.path.length > 1 && <polyline points={projectile.path.map((point) => `${point.x},${ARTILLERY_HEIGHT - point.y}`).join(' ')} className="fill-none stroke-el opacity-50" strokeWidth={activePayload === 'bore' ? 0.45 : 0.28} strokeDasharray={activePayload === 'barb' ? '0.6 0.8' : '1 0.7'} />}
              {activePayload === 'barb' || activePayload === 'cluster' ? (
                <g>
                  <circle cx={projectile.point.x} cy={ARTILLERY_HEIGHT - projectile.point.y} r="1.65" className="fill-none stroke-el opacity-25" strokeWidth="0.24" />
                  <path d={`M ${projectile.point.x} ${ARTILLERY_HEIGHT - projectile.point.y - 1} l 0.75 1 -0.75 1 -0.75 -1 Z`} className="fill-el stroke-black" strokeWidth="0.18" />
                </g>
              ) : activePayload === 'bore' ? (
                <g>
                  <path d={`M ${projectile.point.x - 0.85} ${ARTILLERY_HEIGHT - projectile.point.y} l 0.85 -0.62 0.85 0.62 -0.85 0.62 Z`} className="fill-el stroke-black" strokeWidth="0.2" />
                  <circle cx={projectile.point.x} cy={ARTILLERY_HEIGHT - projectile.point.y} r="1.05" className="fill-none stroke-el opacity-40" strokeWidth="0.22" />
                </g>
              ) : activePayload === 'bloom' ? (
                <g>
                  <circle cx={projectile.point.x} cy={ARTILLERY_HEIGHT - projectile.point.y} r="0.72" className="fill-el stroke-black" strokeWidth="0.18" />
                  <path d={`M ${projectile.point.x} ${ARTILLERY_HEIGHT - projectile.point.y - 0.7} l -0.8 -0.65 M ${projectile.point.x} ${ARTILLERY_HEIGHT - projectile.point.y - 0.7} l 0.8 -0.65`} className="stroke-el" strokeWidth="0.22" />
                </g>
              ) : activePayload === 'lance' ? (
                <path d={`M ${projectile.point.x - 1.2} ${ARTILLERY_HEIGHT - projectile.point.y + 0.3} L ${projectile.point.x + 0.8} ${ARTILLERY_HEIGHT - projectile.point.y} L ${projectile.point.x - 1.2} ${ARTILLERY_HEIGHT - projectile.point.y - 0.3}`} className="fill-el stroke-el" strokeWidth="0.25" />
              ) : (
                <g>
                  <circle cx={projectile.point.x} cy={ARTILLERY_HEIGHT - projectile.point.y} r="1.8" className="fill-none stroke-el opacity-25" strokeWidth="0.24" />
                  <circle cx={projectile.point.x} cy={ARTILLERY_HEIGHT - projectile.point.y} r="1" className="fill-el stroke-black" strokeWidth="0.2" />
                </g>
              )}
            </g>
          ))}
          {impactFrames.map((impact, index) => {
            const rules = ARTILLERY_PAYLOAD_RULES[activePayload];
            const progress = animated?.progress ?? 0;
            const shockwaveRadius = rules.blastRadius * (0.22 + progress * 0.78);
            const terrainRadius = rules.craterRadius * Math.min(1, progress * 1.35);
            const flashOpacity = Math.max(0.04, 0.34 * (1 - progress));
            const rayOpacity = Math.max(0, 0.75 * (1 - progress * 1.4));
            return (
              <g key={index} className={activePayloadMeta.elementClass} aria-hidden>
                {activePayload === 'bore' && <line x1={impact.x} y1={ARTILLERY_HEIGHT - impact.y - ARTILLERY_PAYLOAD_RULES.bore.penetration} x2={impact.x} y2={ARTILLERY_HEIGHT - impact.y} className="stroke-el opacity-80" strokeWidth="0.65" strokeDasharray="0.5 0.35" />}
                <circle
                  data-testid="artillery-impact-core"
                  cx={impact.x}
                  cy={ARTILLERY_HEIGHT - impact.y}
                  r={terrainRadius}
                  className="fill-el stroke-el"
                  strokeWidth="0.34"
                  style={{ opacity: flashOpacity }}
                />
                <circle
                  data-testid="artillery-impact-shockwave"
                  cx={impact.x}
                  cy={ARTILLERY_HEIGHT - impact.y}
                  r={shockwaveRadius}
                  className="fill-none stroke-el"
                  strokeWidth="0.24"
                  strokeDasharray="0.75 0.48"
                  style={{ opacity: Math.max(0.04, 0.38 * (1 - progress)) }}
                />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((degrees) => {
                  const radians = degrees * Math.PI / 180;
                  const inner = rules.craterRadius * 0.18;
                  const outer = rules.craterRadius * (index % 2 ? 0.82 : 0.68);
                  return <line key={degrees} x1={impact.x + Math.cos(radians) * inner} y1={ARTILLERY_HEIGHT - impact.y + Math.sin(radians) * inner} x2={impact.x + Math.cos(radians) * outer} y2={ARTILLERY_HEIGHT - impact.y + Math.sin(radians) * outer} className="stroke-el" strokeWidth="0.34" style={{ opacity: rayOpacity }} />;
                })}
              </g>
            );
          })}
          {impactMoment && animated && animated.outcome.damage > 0 && (() => {
            const targetSide: ArtillerySide = animated.shooter === 'left' ? 'right' : 'left';
            const target = state.tanks[targetSide];
            const targetY = ARTILLERY_HEIGHT - terrainHeight(displayTerrain, target.x) - 8;
            return (
              <g className={targetSide === 'left' ? 'el-fire' : 'el-water'} aria-hidden>
                <text x={target.x} y={targetY} textAnchor="middle" className="fill-el font-mono" fontSize="2.2" fontWeight="700">−{animated.outcome.damage}</text>
                {animated.outcome.guardAbsorbed > 0 && <text x={target.x} y={targetY + 2} textAnchor="middle" className="fill-ink-2 font-mono" fontSize="1">GUARD {animated.outcome.guardAbsorbed}</text>}
              </g>
            );
          })()}
          </g>
        </svg>
      </section>

      <section aria-label="Command deck" className={`artillery-command cockpit-console mx-auto grid w-full min-w-0 border-2 border-edge-strong bg-s1 lg:grid-cols-[minmax(0,1fr)_auto] ${shortLandscape ? 'gap-1 p-1' : 'gap-1.5 p-1.5'}`}>
        {state.phase === 'finished' ? (
          <div className={`border p-4 lg:col-span-2 ${mode === 'bot' && state.winner === 'right' ? 'border-plague-lo bg-plague-tint' : 'border-viable-lo bg-viable-tint'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="type-legend m-0">{mode === 'range' ? 'Calibration complete' : mode === 'challenge' ? state.winner === 'left' ? 'Trial cleared' : 'Trial failed' : mode === 'local' ? 'Range secured' : state.winner === 'left' ? 'Contract cleared' : 'Battery disabled'}</p>
                <p className="mt-2 mb-0 font-body text-body">{mode === 'range' ? `Range record: ${resultStats.damage} damage in ${state.turn} shots.` : mode === 'challenge' ? `${ARTILLERY_MAX_INTEGRITY - state.tanks.right.integrity} damage dealt with the five-round field magazine.` : `${crewAt(state.winner!).name} holds Crater Sector after ${state.turn} shots.`}</p>
              </div>
              <div className="border border-current px-3 py-2 text-center">
                <span className="block type-micro">Grade</span>
                <span className="type-heading">{resultGrade}</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 border-y border-current/30 py-2 text-center">
              <span><b className="block type-data">{resultStats.damage}</b><small className="type-micro">damage</small></span>
              <span><b className="block type-data">{resultAccuracy}%</b><small className="type-micro">accuracy</small></span>
              <span><b className="block type-data">{state.tanks[resultSide].integrity}</b><small className="type-micro">hull</small></span>
              <span><b className="block type-data">{resultStats.payloads.length}</b><small className="type-micro">weapons</small></span>
            </div>
            <p className="mt-3 mb-3 font-body text-small text-ink-2">{mode === 'range' ? 'Practice records no Arcade Credits. Use it to learn wind, atmosphere, and every weapon system.' : mode === 'challenge' ? 'The trial records no Arcade Credits. Clear it by choosing five complementary weapons instead of repeating one solution.' : `${crewAt(state.winner!).name} held the crater range with disciplined ranging and field control.`}</p>
            <p className="mb-3 font-body text-tiny text-ink-3">{resultStats.directHits} direct · {resultSpecialsSpent} special rounds · {resultStats.terrainShift.toFixed(1)} terrain shift{mode === 'range' ? ` · best ${Math.max(rangeBest, resultStats.damage)}` : ''}</p>
            <Button type="button" className="w-full" onClick={onRematch}>Run a fresh sector</Button>
          </div>
        ) : (
          <>
            <div className={`artillery-command-top grid min-w-0 gap-1.5 lg:col-span-2 ${shortLandscape ? '' : 'md:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.45fr)]'}`}>
              <div className="cockpit-instrument grid min-w-0 border border-edge-strong p-1.5" aria-label="Aim the cannon">
                <div className="grid min-w-0 gap-1.5 sm:grid-cols-2">
                  <CommandMeter label="Barrel" value={angle} suffix="°" min={10} max={80} disabled={!canFire} guidance={angleGuidance} decreaseKey="S" increaseKey="W" compact={shortLandscape} kind="angle" side={state.current} onChange={setAngle} />
                  <CommandMeter label="Power" value={power} min={15} max={100} disabled={!canFire} guidance={powerGuidance} decreaseKey="Q" increaseKey="E" compact={shortLandscape} kind="power" side={state.current} onChange={setPower} />
                </div>
              </div>

              <div className="cockpit-instrument cockpit-mobility grid min-w-0 content-start gap-1.5 border border-edge-strong p-2" role="group" aria-label="Mobility thrusters">
                <span className="flex items-center justify-between gap-2 type-legend">
                  <span>Thrust</span>
                  <span className="font-body text-[11px] normal-case tracking-normal text-ink-3">Drive crawls · jet leaps</span>
                </span>
                {(['drive', 'jet'] as const).map((choice) => {
                  const fuel = choice === 'drive' ? state.traction[state.current] : state.jetCharges[state.current];
                  return (
                    <div key={choice} className="grid grid-cols-[2.7rem_minmax(0,1fr)_2.7rem] items-center gap-1">
                      {([-1, 1] as const).map((direction, index) => {
                        const screenDirection = state.current === 'left' ? direction : -direction;
                        const label = `${choice === 'drive' ? 'Drive' : 'Jet'} ${direction === -1 ? 'backward' : 'forward'}`;
                        const active = movement?.mobility === choice && movement.direction === direction;
                        const button = (
                          <Button
                            key={direction}
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`Hold to ${label.toLowerCase()}`}
                            aria-pressed={active}
                            disabled={!canOperate || fuel <= 0}
                            className={`cockpit-thrust h-9 touch-none border p-0 text-heading ${active ? 'is-active border-viable-hi text-viable-hi' : 'border-edge bg-s0'}`}
                            onPointerDown={(event) => beginThrust(event, direction, choice)}
                            onPointerUp={stopThrust}
                            onPointerCancel={stopThrust}
                          >
                            <span aria-hidden>{choice === 'jet' ? screenDirection < 0 ? '↖' : '↗' : screenDirection < 0 ? '◀' : '▶'}</span>
                          </Button>
                        );
                        if (index === 0) return button;
                        return (
                          <React.Fragment key={direction}>
                            <div className="min-w-0">
                              <span className="flex justify-between font-mono text-[10px] uppercase text-ink-2"><b>{choice === 'drive' ? 'Drive' : 'Jump jet · arc'}</b><b>{Math.round(fuel)}%</b></span>
                              <span className="mt-1 block h-1.5 overflow-hidden border border-edge bg-s0"><span className={`block h-full ${choice === 'drive' ? 'bg-viable-hi' : 'bg-el-electric'}`} style={{ width: `${fuel}%` }} /></span>
                            </div>
                            {button}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="cockpit-instrument grid min-w-0 gap-1.5 border border-edge-strong p-2 lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_15rem]" role="group" aria-label="Choose a weapon">
              <div className="grid min-w-0 gap-1.5">
                <span className="flex items-center justify-between gap-2 type-legend">
                  <span>Ordnance</span>
                  <span className="truncate font-body text-small normal-case tracking-normal text-ink-2">{PAYLOAD_META[payload].purpose}</span>
                </span>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
                {ARTILLERY_PAYLOADS.map((choice, index) => {
                  const remaining = payloadRemaining(state.current, choice);
                  const unavailable = remaining <= 0;
                  const selected = payload === choice;
                  return (
                    <Button
                      key={choice}
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!canFire || unavailable}
                      aria-pressed={selected}
                      className={`h-14 min-w-0 flex-col gap-0 border px-1.5 ${selected ? 'border-viable-lo bg-viable-tint text-viable-hi' : 'border-edge bg-s0'}`}
                      onClick={() => {
                        sound.play('select');
                        setPayload(choice);
                        onStatus(`${PAYLOAD_META[choice].label} selected. ${PAYLOAD_META[choice].detail}.`);
                      }}
                    >
                      <span className={`text-[11px] text-el ${PAYLOAD_META[choice].elementClass}`} aria-hidden>{PAYLOAD_META[choice].glyph}</span>
                      <span className="max-w-full truncate text-[11px]">{PAYLOAD_META[choice].shortLabel} {Number.isFinite(remaining) ? remaining : '∞'}</span>
                      <span className="max-w-full truncate font-body text-[11px] normal-case tracking-normal opacity-70">{PAYLOAD_META[choice].rackHint}</span>
                      <kbd className="sr-only">{index + 1}</kbd>
                    </Button>
                  );
                })}
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border border-edge bg-s0 px-2 py-1.5">
                  <strong className="font-legend text-small uppercase tracking-legend text-ink">{PAYLOAD_META[payload].label}</strong>
                  <span className="font-body text-small text-ink-3">{PAYLOAD_META[payload].detail}</span>
                  <span className="ml-auto flex flex-wrap gap-1 font-mono text-[10px] uppercase text-ink-3">
                    <span>Arc {payload === 'lance' ? 'flat' : payload === 'bore' ? 'heavy' : 'ballistic'}</span>
                    <span>· {ARTILLERY_PAYLOAD_RULES[payload].projectileCount}×</span>
                    <span>· Terrain {payload === 'bloom' ? 'build' : payload === 'bore' ? 'deep' : 'blast'}</span>
                  </span>
                </div>
              </div>
              <Button
                type="button"
                size="lg"
                variant="ghost"
                className="order-first min-h-20 min-w-0 overflow-hidden border-2 border-edge-strong bg-s0 p-2 shadow-panel lg:order-last lg:h-full"
                disabled={!canFire}
                aria-label={`Fire ${PAYLOAD_META[payload].shortLabel}, angle ${angle} degrees, power ${power}`}
                onClick={() => animateShot({ angle, power, payload, move: 0, system: 'none' })}
              >
                <span className="grid w-full grid-cols-[3rem_minmax(0,1fr)] items-center gap-2" aria-hidden>
                  <span className="grid size-12 place-items-center rounded-full border-2 border-viable-lo bg-viable-tint font-mono text-[28px] leading-none text-viable-hi">◎</span>
                  <span className="min-w-0 text-left">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">Weapon armed</span>
                    <span className="block truncate font-legend text-heading uppercase tracking-legend text-viable-hi">Fire {PAYLOAD_META[payload].shortLabel}</span>
                    <span className="block font-mono text-[11px] text-ink-2">A{angle}° · P{power}</span>
                  </span>
                </span>
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export function ArtillerySetup({ mode, difficulty, mapSize, world, onMode, onDifficulty, onMapSize, onWorld, onStart }: {
  mode: ArtilleryMode;
  difficulty: ArtilleryDifficulty;
  mapSize: ArtilleryMapSize;
  world: ArtilleryWorld;
  onMode: (mode: ArtilleryMode) => void;
  onDifficulty: (difficulty: ArtilleryDifficulty) => void;
  onMapSize: (size: ArtilleryMapSize) => void;
  onWorld: (world: ArtilleryWorld) => void;
  onStart: () => void;
}) {
  const modeMeta: Array<{ value: ArtilleryMode; label: string; detail: string }> = [
    { value: 'bot', label: 'Versus bot', detail: 'A full rewarded duel' },
    { value: 'local', label: 'Two players', detail: 'Pass-and-play locally' },
    { value: 'range', label: 'Practice range', detail: 'Six shots, highest damage' },
    { value: 'challenge', label: 'Ordnance trial', detail: 'Five limited rounds' },
  ];
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-3 border border-edge-strong bg-s1 p-4" aria-labelledby="crater-setup-title">
      <div>
        <p className="type-micro m-0 text-ink-3">New match</p>
        <h2 id="crater-setup-title" className="type-heading mt-1 mb-2">Configure Crater Command</h2>
        <p className="m-0 max-w-3xl font-body text-body text-ink-2">Choose a world and range. Each planet changes the terrain profile and projectile physics; the controls and weapon rack stay consistent.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <fieldset className="grid gap-2 border border-edge p-3">
          <legend className="type-legend px-1">Match type</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {modeMeta.map((choice) => (
              <Button key={choice.value} type="button" variant="ghost" aria-pressed={mode === choice.value} className={`min-h-14 flex-col items-start gap-0.5 whitespace-normal border px-3 text-left ${mode === choice.value ? 'border-viable-lo bg-viable-tint text-viable-hi' : 'border-edge bg-s0'}`} onClick={() => onMode(choice.value)}>
                <span className="text-small">{choice.label}</span>
                <span className="font-body text-small normal-case tracking-normal opacity-75">{choice.detail}</span>
              </Button>
            ))}
          </div>
          {mode === 'bot' && (
            <div className="mt-1 grid grid-cols-3 gap-2" role="group" aria-label="Bot difficulty">
              {(['rookie', 'standard', 'expert'] as const).map((choice) => (
                <Button key={choice} type="button" size="sm" variant={difficulty === choice ? 'outline' : 'ghost'} aria-pressed={difficulty === choice} onClick={() => onDifficulty(choice)}>{choice}</Button>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className="grid gap-2 border border-edge p-3">
          <legend className="type-legend px-1">Map size</legend>
          {(['compact', 'standard', 'wide'] as const).map((choice) => (
            <Button key={choice} type="button" variant="ghost" aria-pressed={mapSize === choice} className={`min-h-12 justify-between border px-3 text-left ${mapSize === choice ? 'border-viable-lo bg-viable-tint text-viable-hi' : 'border-edge bg-s0'}`} onClick={() => onMapSize(choice)}>
              <span>{MAP_META[choice].label}</span>
              <span className="font-body text-small normal-case tracking-normal opacity-75">{MAP_META[choice].detail}</span>
            </Button>
          ))}
        </fieldset>
      </div>

      <fieldset className="grid gap-3 border border-edge p-3">
        <legend className="type-legend px-1">Planet</legend>
        <div className="grid gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(WORLD_META) as ArtilleryWorld[]).map((choice) => {
            const meta = WORLD_META[choice];
            return (
              <button key={choice} type="button" aria-pressed={world === choice} className={`${meta.elementClass} overflow-hidden whitespace-normal border text-left transition-colors ${world === choice ? 'border-viable-lo bg-viable-tint' : 'border-edge bg-s0 hover:border-edge-strong'}`} onClick={() => onWorld(choice)}>
                <img src={meta.image} alt="" loading="lazy" className="h-16 w-full object-cover opacity-75" />
                <span className="block p-2.5">
                  <strong className="block font-legend text-body uppercase tracking-legend text-ink">{meta.name}</strong>
                  <span className="mt-1 block font-body text-small text-ink-2">{meta.terrain}</span>
                  <span className="mt-1 block font-body text-small text-ink-3">{meta.quirk}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid items-center gap-3 border-t border-edge pt-4 sm:grid-cols-[1fr_auto]">
        <p className="m-0 font-body text-body text-ink-2"><strong className="text-ink">{WORLD_META[world].name}</strong> · {MAP_META[mapSize].label} · {modeMeta.find((choice) => choice.value === mode)?.label}{mode === 'bot' ? ` · ${difficulty}` : ''}</p>
        <Button type="button" size="lg" className="min-h-14 px-8 text-heading" onClick={onStart}>Start match</Button>
      </div>
    </section>
  );
}

export default function ArtilleryGamePage() {
  const [mode, setMode] = React.useState<ArtilleryMode>('bot');
  const [difficulty, setDifficulty] = React.useState<ArtilleryDifficulty>('standard');
  const [mapSize, setMapSize] = React.useState<ArtilleryMapSize>('standard');
  const [world, setWorld] = React.useState<ArtilleryWorld>('stonera');
  const [setupOpen, setSetupOpen] = React.useState(true);
  const [seed, setSeed] = React.useState(() => dailyArcadeSeed('artillery'));
  const [status, setStatus] = React.useState('Choose a planet, map size, and match type.');
  const startedAt = React.useRef(performance.now());
  const sessionId = React.useRef(arcadeSessionId());

  const startGame = React.useCallback(() => {
    setSeed(practiceArcadeSeed('artillery'));
    setSetupOpen(false);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    const briefing = mode === 'challenge'
      ? 'Five-round trial: disable the target with the limited field magazine.'
      : mode === 'range'
        ? 'Six-shot range: score as much damage as possible.'
        : mode === 'bot'
          ? `${difficulty} rival range rig.`
          : 'Two-player local duel.';
    setStatus(`${WORLD_META[world].name} · ${MAP_META[mapSize].label}. ${briefing} Drag the battlefield to aim.`);
    startedAt.current = performance.now();
    sessionId.current = arcadeSessionId();
  }, [difficulty, mapSize, mode, world]);

  const openSetup = React.useCallback(() => {
    setSetupOpen(true);
    setStatus('Choose a planet, map size, and match type.');
  }, []);

  const complete = React.useCallback(async ({ score, actions }: { score: number; actions: ArtilleryAction[] }) => {
    setStatus('Match won. Verifying the firing record…');
    const reward = await completeArcadeGame('artillery', { gameId: 'artillery', sessionId: sessionId.current, seed, difficulty, mapSize, world, actions }, { score, timeMs: performance.now() - startedAt.current });
    setStatus(`Match won. ${reward.message}`);
  }, [difficulty, mapSize, seed, world]);

  return (
    <ArcadeGameShell game={GAME} status={status} onNewGame={openSetup} aside={!setupOpen ? <span className="font-mono text-small text-ink-2">{WORLD_META[world].name} · {MAP_META[mapSize].label}</span> : undefined}>
      {setupOpen ? (
        <ArtillerySetup mode={mode} difficulty={difficulty} mapSize={mapSize} world={world} onMode={setMode} onDifficulty={setDifficulty} onMapSize={setMapSize} onWorld={setWorld} onStart={startGame} />
      ) : (
        <ArtilleryBoard
          key={`${seed}:${mode}:${difficulty}:${mapSize}:${world}`}
          seed={seed}
          mode={mode}
          difficulty={difficulty}
          mapSize={mapSize}
          world={world}
          onStatus={setStatus}
          onComplete={complete}
          onRematch={openSetup}
        />
      )}
    </ArcadeGameShell>
  );
}
