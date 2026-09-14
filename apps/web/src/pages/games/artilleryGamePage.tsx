// Tier: immersive. Crater Command is active artillery play inside the Arcade shell.
import * as React from 'react';
import {
  ARTILLERY_HEIGHT,
  ARTILLERY_MAX_INTEGRITY,
  ARTILLERY_MAX_TRACTION,
  ARTILLERY_MOVE_DISTANCE,
  ARTILLERY_PAYLOADS,
  ARTILLERY_PAYLOAD_RULES,
  ARTILLERY_SPECIAL_PAYLOADS,
  ARTILLERY_WIDTH,
  applyArtilleryShot,
  artilleryMovedX,
  chooseArtilleryBotShot,
  createArtilleryState,
  simulateArtilleryShot,
  terrainHeight,
  type ArtilleryDifficulty,
  type ArtilleryMode,
  type ArtilleryMove,
  type ArtilleryOutcome,
  type ArtilleryPayload,
  type ArtillerySide,
  type ArtilleryShot,
  type ArtilleryState,
  type ArtillerySystem,
} from '@xalians/rules/arcade';

import { arcadeGame } from '@/arcade/catalog';
import { createArtillerySound } from '@/arcade/artillerySound';
import { arcadeSessionId, completeArcadeGame, dailyArcadeSeed, practiceArcadeSeed } from '@/arcade/progress';
import { ArcadeGameShell } from '@/components/arcade/ArcadeGameShell';
import { Button } from '@/components/ui/button';

const GAME = arcadeGame('artillery')!;

type AnimatedShot = { outcome: ArtilleryOutcome; progress: number; shooter: ArtillerySide; shot: Required<ArtilleryShot> } | null;
type LastShot = { outcome: ArtilleryOutcome; shooter: ArtillerySide; shot: Required<ArtilleryShot>; wind: number; targetX: number } | null;
type CombatStats = {
  shots: number;
  hits: number;
  damage: number;
  directHits: number;
  terrainShift: number;
  payloads: ArtilleryPayload[];
};

const CREWS = {
  left: { name: 'Codazzo' },
  right: { name: 'Terragoyle' },
} as const;

const CONDITION_SHORT = {
  standard: 'Standard',
  'heavy-gravity': 'Gravity +',
  'thin-air': 'Thin air',
  'spore-gust': 'Spore gust',
} as const;

const PAYLOAD_META: Record<ArtilleryPayload, {
  label: string;
  shortLabel: string;
  detail: string;
  purpose: string;
  glyph: string;
  elementClass: string;
}> = {
  shell: { label: 'Core shell', shortLabel: 'Core', detail: 'Balanced blast · unlimited', purpose: 'Reliable ranging and steady damage', glyph: '●', elementClass: 'el-metal' },
  barb: { label: 'Barb fan', shortLabel: 'Fan', detail: 'Three spreading barbs · 2 charges', purpose: 'Catches uncertain ranges', glyph: '⋰', elementClass: 'el-rock' },
  bore: { label: 'Frack bore', shortLabel: 'Bore', detail: 'Burrows before detonation · 2 charges', purpose: 'Collapses ground beneath cover', glyph: '◆', elementClass: 'el-sand' },
  cluster: { label: 'Spore cluster', shortLabel: 'Cluster', detail: 'Five small warheads · 1 charge', purpose: 'Saturates a wide shelf', glyph: '✣', elementClass: 'el-chemical' },
  bloom: { label: 'Rampart bloom', shortLabel: 'Bloom', detail: 'Grows a living berm · 1 charge', purpose: 'Builds cover and changes the terrain', glyph: '✦', elementClass: 'el-plant' },
  lance: { label: 'Light lance', shortLabel: 'Lance', detail: 'Fast, narrow, heavy hit · 1 charge', purpose: 'Rewards a precise low arc', glyph: '➤', elementClass: 'el-light' },
};

const BARREL_LENGTH = 4.2;
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

export function CommandMeter({ label, value, suffix = '', min, max, disabled, guidance, decreaseKey, increaseKey, compact = false, onChange }: {
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
  onChange: (value: number) => void;
}) {
  const adjust = (amount: number) => onChange(Math.max(min, Math.min(max, value + amount)));
  return (
    <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-1 border border-edge bg-s0 p-1">
      <Button
        type="button"
        variant="secondary"
        className={`${compact ? 'h-8' : 'h-10'} w-8 shrink-0 border border-edge-strong p-0 text-heading`}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label.toLowerCase()} by 1`}
        onClick={() => adjust(-1)}
      >
        <span aria-hidden>−</span><kbd className="sr-only">{decreaseKey}</kbd>
      </Button>
      <div className="grid min-w-0 place-items-center leading-none">
        <span className="hidden type-micro text-ink-3 min-[360px]:block">{label}</span>
        <output className="font-mono text-body text-ink sm:text-heading" aria-live="polite">{value}{suffix}</output>
        <span className="hidden max-w-full truncate font-body text-[10px] text-ink-3 min-[380px]:block">{guidance}</span>
      </div>
      <Button
        type="button"
        variant="secondary"
        className={`${compact ? 'h-8' : 'h-10'} w-8 shrink-0 border border-edge-strong p-0 text-heading`}
        disabled={disabled || value >= max}
        aria-label={`Increase ${label.toLowerCase()} by 1`}
        onClick={() => adjust(1)}
      >
        <span aria-hidden>+</span><kbd className="sr-only">{increaseKey}</kbd>
      </Button>
    </div>
  );
}

export function ArtilleryBoard({ seed, mode, difficulty, onStatus, onComplete, onRematch }: {
  seed: string;
  mode: ArtilleryMode;
  difficulty: ArtilleryDifficulty;
  onStatus: (status: string) => void;
  onComplete: (result: { score: number; actions: ArtilleryShot[] }) => void;
  onRematch: () => void;
}) {
  const [state, setState] = React.useState<ArtilleryState>(() => createArtilleryState(seed, mode, difficulty));
  const [angle, setAngle] = React.useState(45);
  const [power, setPower] = React.useState(70);
  const [payload, setPayload] = React.useState<ArtilleryPayload>('shell');
  const [move, setMove] = React.useState<ArtilleryMove>(0);
  const [system, setSystem] = React.useState<ArtillerySystem>('none');
  const [settledAim, setSettledAim] = React.useState<Record<'left' | 'right', number>>({ left: 45, right: 45 });
  const [animated, setAnimated] = React.useState<AnimatedShot>(null);
  const [lastShot, setLastShot] = React.useState<LastShot>(null);
  const [lastShotsBySide, setLastShotsBySide] = React.useState<Record<ArtillerySide, LastShot>>({ left: null, right: null });
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
  const actions = React.useRef<ArtilleryShot[]>([]);
  const botScheduled = React.useRef(false);
  const fieldRef = React.useRef<SVGSVGElement>(null);
  const activePointer = React.useRef<number | null>(null);
  const dragOrigin = React.useRef<{ x: number; y: number } | null>(null);
  const [dragGuide, setDragGuide] = React.useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [shortLandscape, setShortLandscape] = React.useState(false);

  React.useEffect(() => () => {
    pendingTimers.current.forEach(window.clearTimeout);
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
    if (animated || state.phase !== 'aiming') return;
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
        setMove(0);
        setSystem('none');
        const payloadName = PAYLOAD_META[applied.outcome.payload].label;
        let result = `${payloadName} left the range.`;
        if (applied.outcome.hit) {
          const impactKind = applied.outcome.directHit ? 'Direct hit' : 'Blast hit';
          const fall = applied.outcome.fallDamage ? ` including ${applied.outcome.fallDamage} fall damage` : '';
          const guard = applied.outcome.guardAbsorbed ? `; guard absorbed ${applied.outcome.guardAbsorbed}` : '';
          const pressure = applied.outcome.pressureMultiplier > 1 ? ' under crater pressure' : '';
          result = `${impactKind}: ${applied.outcome.damage} hull${fall}${pressure}${guard}. ${CREWS[applied.outcome.hit].name} has ${applied.state.tanks[applied.outcome.hit].integrity} hull remaining.`;
        } else if (applied.outcome.impact) {
          const signedMiss = state.current === 'left'
            ? applied.outcome.impact.x - target.x
            : target.x - applied.outcome.impact.x;
          const terrainResult = applied.outcome.terrainShift > 0 ? ' and raised a living berm' : applied.outcome.terrainShift < -2 ? ' and collapsed the shelf' : '';
          result = `${payloadName} landed ${Math.max(1, Math.round(Math.abs(signedMiss)))} ${signedMiss > 0 ? 'long' : 'short'}${terrainResult}.`;
        }
        const windLabel = applied.state.wind === 0 ? 'still' : `${Math.abs(applied.state.wind)} ${applied.state.wind > 0 ? 'right' : 'left'}`;
        const message = `${result} ${mode === 'bot' && state.current === 'left' && !applied.state.winner ? `Wind holds at ${windLabel} through the reply.` : `Next volley wind: ${windLabel}.`}`;
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
      } else if (mode === 'range') {
        onStatus(`Calibration complete: ${stats.left.damage} damage across ${state.turn} shots.`);
      } else if (mode === 'challenge') {
        onStatus(state.winner === 'left' ? 'Limited-ordnance trial cleared.' : 'The trial target survived the five-round magazine.');
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
    if (state.traction[state.current] <= 0 && move !== 0) setMove(0);
    if (state.systemCharges[state.current] <= 0 && system !== 'none') setSystem('none');
  }, [move, payload, state.coreAmmo, state.current, state.payloads, state.systemCharges, state.traction, system]);

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
  const canFire = !animated && !handoffPending && state.phase === 'aiming' && (mode !== 'bot' || state.current === 'left');
  const animatedProjectiles = React.useMemo(() => animated?.outcome.projectiles.map((projectile) => {
    const finalIndex = Math.max(0, projectile.path.length - 1);
    const movementLead = animated.shot.move === 0 ? 0 : 0.22;
    const flightProgress = Math.max(0, Math.min(1, (animated.progress - movementLead) / (1 - movementLead)));
    const pointIndex = Math.min(finalIndex, Math.floor(flightProgress * finalIndex));
    return { point: projectile.path[pointIndex], path: projectile.path.slice(0, pointIndex + 1) };
  }) ?? [], [animated]);
  const impactFrames = animated?.progress === 1
    ? animated.outcome.projectiles.flatMap((projectile) => projectile.impact ? [projectile.impact] : [])
    : [];
  const cameraViewBox = React.useMemo(() => {
    if (!narrowScreen || !animatedProjectiles.length) return `0 10 ${ARTILLERY_WIDTH} ${ARTILLERY_HEIGHT - 10}`;
    const focus = animatedProjectiles[Math.floor(animatedProjectiles.length / 2)].point;
    const width = 76;
    const height = 38;
    const screenY = ARTILLERY_HEIGHT - focus.y;
    const x = Math.max(0, Math.min(ARTILLERY_WIDTH - width, focus.x - width / 2));
    const y = Math.max(10, Math.min(ARTILLERY_HEIGHT - height, screenY - height / 2));
    return `${x} ${y} ${width} ${height}`;
  }, [animatedProjectiles, narrowScreen]);
  const aimOutcome = React.useMemo(
    () => canFire ? simulateArtilleryShot(state, { angle, power, payload, move, system }) : null,
    [angle, canFire, move, payload, power, state, system],
  );
  const aimPreviews = aimOutcome?.projectiles.map((projectile) =>
    projectile.path.slice(0, Math.min(62, Math.max(14, projectile.path.length - 7)))
  ) ?? [];
  const activePayload = animated?.outcome.payload ?? payload;
  const activePayloadMeta = PAYLOAD_META[activePayload];
  const impactMoment = animated?.progress === 1;
  const shotShake = impactMoment && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? (activePayload === 'bore' ? -0.38 : 0.28)
    : 0;

  const payloadRemaining = (side: ArtillerySide, choice: ArtilleryPayload) =>
    choice === 'shell' ? (state.coreAmmo[side] < 0 ? Number.POSITIVE_INFINITY : state.coreAmmo[side]) : state.payloads[side][choice];

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
  const moveDestination = artilleryMovedX(state, state.current, move);
  const moveDistance = Math.round(Math.abs(moveDestination - state.tanks[state.current].x));
  const moveGuidance = move === 0
    ? 'Fire from the current position. No movement charge spent.'
    : moveDistance === 0
      ? 'Broken ground blocks the crawler in that direction.'
      : `${move === 1 ? 'Drive toward' : 'Reverse from'} the rival by ${moveDistance} terrain units, then fire. Spends 1 fuel.`;
  const shotPosition = move === 1 ? 'advance' : move === -1 ? 'retreat' : 'hold';
  const crewSystem: Exclude<ArtillerySystem, 'none'> = state.current === 'left' ? 'anchor' : 'lift';
  const systemLabel = crewSystem === 'anchor' ? 'Root lock' : 'Lift veil';
  const systemDetail = crewSystem === 'anchor' ? '+12 hull · 22 guard · holds position' : '18 guard · fall damage halved';

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
      x: ((x - rect.left) / rect.width) * ARTILLERY_WIDTH,
      y: 10 + ((y - rect.top) / rect.height) * (ARTILLERY_HEIGHT - 10),
    });
    setDragGuide({
      start: toFieldPoint(dragOrigin.current.x, dragOrigin.current.y),
      end: toFieldPoint(clientX, clientY),
    });
    if (!next) return;
    setAngle(next.angle);
    setPower(next.power);
  }, [canFire, state.current]);

  const beginDirectAim = React.useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!canFire || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
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

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, button, [contenteditable="true"]') || !canFire) return;
      const key = event.key.toLowerCase();
      if (['a', 'd', 'x', 'w', 's', 'q', 'e', 'r', 'arrowup', 'arrowdown', '1', '2', '3', '4', '5', '6', ' '].includes(key)) event.preventDefault();
      if (key === 'a' && state.traction[state.current] > 0) setMove(-1);
      else if (key === 'd' && state.traction[state.current] > 0) setMove(1);
      else if (key === 'x') setMove(0);
      else if (key === 'w' || key === 'arrowup') setAngle((current) => Math.min(80, current + 1));
      else if (key === 's' || key === 'arrowdown') setAngle((current) => Math.max(10, current - 1));
      else if (key === 'q') setPower((current) => Math.max(15, current - 1));
      else if (key === 'e') setPower((current) => Math.min(100, current + 1));
      else if (/^[1-6]$/.test(key)) {
        const choice = ARTILLERY_PAYLOADS[Number(key) - 1];
        if (choice === 'shell' || state.payloads[state.current][choice] > 0) setPayload(choice);
      }
      else if (key === 'r' && state.systemCharges[state.current] > 0) {
        setSystem((current) => current === crewSystem ? 'none' : crewSystem);
        if (crewSystem === 'anchor') setMove(0);
      }
      else if (key === ' ' && !event.repeat) animateShot({ angle, power, payload, move, system });
      else return;
      if (key !== ' ' && !event.repeat) sound.play('select');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [angle, animateShot, canFire, crewSystem, move, payload, power, sound, state.current, state.payloads, state.systemCharges, state.traction, system]);

  const tank = (side: 'left' | 'right') => {
    const value = state.tanks[side];
    const animatedMove = animated?.shooter === side ? animated.shot.move : 0;
    const movementTargetX = artilleryMovedX(state, side, animatedMove);
    const movementProgress = animated?.shooter === side && animatedMove !== 0 ? Math.min(1, animated.progress / 0.22) : 1;
    const displayX = animated?.shooter === side
      ? value.x + (movementTargetX - value.x) * movementProgress
      : canFire && state.current === side ? artilleryMovedX(state, side, move) : value.x;
    const y = ARTILLERY_HEIGHT - terrainHeight(state.terrain, displayX) - 1.5;
    const originY = ARTILLERY_HEIGHT - terrainHeight(state.terrain, value.x) - 1.5;
    const displayAngle = canFire && state.current === side ? angle : settledAim[side];
    const barrel = artilleryBarrelEndpoint(displayX, y - 1.8, side, displayAngle);
    const crew = CREWS[side];
    const displayedMove = animated?.shooter === side ? animatedMove : move;
    const movementLabel = displayX === value.x ? '' : displayedMove === 1 ? ', advancing' : ', withdrawing';
    const firingProgress = animated ? Math.max(0, (animated.progress - (animatedMove === 0 ? 0 : 0.22)) / 0.2) : 1;
    const firing = !!animated && state.current === side && firingProgress < 1;
    const recoiling = firing && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? Math.sin(firingProgress * Math.PI) * (side === 'left' ? -0.7 : 0.7)
      : 0;
    const takingDamage = !!impactMoment && animated?.outcome.hit === side;
    const damageJolt = takingDamage && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? (side === 'left' ? -0.45 : 0.45)
      : 0;
    const selectedGuard = canFire && state.current === side && system === (side === 'left' ? 'anchor' : 'lift');
    const firingGuard = animated?.shooter === side && animated.shot.system === (side === 'left' ? 'anchor' : 'lift');
    const guardActive = state.guard[side] > 0 || selectedGuard || firingGuard;
    return (
      <g
        className={side === 'left' ? 'el-fire' : 'el-water'}
        aria-label={`${crew.name} crawler, ${value.integrity} integrity${movementLabel}`}
        transform={`translate(${recoiling + damageJolt} 0)`}
      >
        {guardActive && (
          <g className={side === 'left' ? 'el-plant' : 'el-air'} aria-hidden data-testid={`artillery-guard-${side}`}>
            {side === 'left' ? (
              <>
                <path d={`M ${displayX - 4} ${y + 2.2} q 1.2 -3 3 -3.4 M ${displayX + 4} ${y + 2.2} q -1.2 -3 -3 -3.4 M ${displayX - 3.1} ${y + 1.9} l -1.4 1.8 M ${displayX + 3.1} ${y + 1.9} l 1.4 1.8`} className="fill-none stroke-el opacity-80" strokeWidth="0.5" />
                <circle cx={displayX} cy={y - 1.2} r="4.6" className="fill-el opacity-10" />
              </>
            ) : (
              <>
                <ellipse cx={displayX} cy={y - 1.5} rx="4.8" ry="5.6" className="fill-el opacity-10 stroke-el" strokeWidth="0.35" strokeDasharray="1 0.7" />
                <path d={`M ${displayX - 4.4} ${y - 0.4} q 4.4 -5.8 8.8 0`} className="fill-none stroke-el opacity-70" strokeWidth="0.42" />
              </>
            )}
          </g>
        )}
        {displayX !== value.x && (
          <g aria-hidden data-testid="artillery-move-preview">
            <line x1={value.x} y1={originY} x2={displayX} y2={y} className="stroke-el opacity-80" strokeWidth="0.5" strokeDasharray="0.8 0.65" />
            <rect x={value.x - 1.5} y={originY - 0.7} width="3" height="1.4" className="fill-none stroke-el opacity-30" strokeWidth="0.25" />
            {[0.25, 0.5, 0.75].map((progress) => {
              const markerX = value.x + (displayX - value.x) * progress;
              const markerY = originY + (y - originY) * progress;
              const direction = displayX > value.x ? 1 : -1;
              return <path key={progress} d={`M ${markerX - direction * 0.6} ${markerY - 0.45} L ${markerX} ${markerY} L ${markerX - direction * 0.6} ${markerY + 0.45}`} className="fill-none stroke-el opacity-80" strokeWidth="0.3" />;
            })}
            <rect x={(value.x + displayX) / 2 - 4.5} y={Math.min(originY, y) - 3.2} width="9" height="1.8" className="fill-s0 stroke-el opacity-90" strokeWidth="0.2" />
            <text x={(value.x + displayX) / 2} y={Math.min(originY, y) - 1.9} textAnchor="middle" className="fill-el font-mono" fontSize="1.05">{displayedMove === 1 ? `DRIVE +${Math.round(Math.abs(displayX - value.x))}` : `REVERSE −${Math.round(Math.abs(displayX - value.x))}`}</text>
          </g>
        )}
        <rect x={displayX - 3.2} y={y - 7.2} width="6.4" height="0.85" className="fill-s0 stroke-ink-4" strokeWidth="0.18" />
        <rect x={displayX - 3.1} y={y - 7.1} width={6.2 * value.integrity / ARTILLERY_MAX_INTEGRITY} height="0.65" className="fill-el" />
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
        {value.integrity <= 50 && (
          <g aria-hidden className={value.integrity <= 25 ? 'el-fire' : 'el-metal'}>
            <circle cx={displayX - 1.2} cy={y - 4.4} r="0.55" className="fill-el opacity-50" />
            <circle cx={displayX - 0.6} cy={y - 5.6} r="0.8" className="fill-el opacity-30" />
            <circle cx={displayX - 1.5} cy={y - 6.8} r="1.05" className="fill-el opacity-15" />
          </g>
        )}
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
            {value.integrity <= 34 && <circle cx={displayX + (side === 'left' ? -2.5 : 2.5)} cy={y - 7.4} r="1.25" className="fill-ink-3 opacity-15" />}
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="artillery-layout grid w-full min-w-0 gap-2 overflow-x-clip">
      <section aria-label="Artillery field" className="artillery-field relative mx-auto w-full self-start overflow-hidden border border-edge-strong bg-glass">
        <div className="pointer-events-none absolute inset-x-2 top-2 z-10 grid grid-cols-[minmax(0,1fr)_5.6rem_minmax(0,1fr)] items-start gap-1 min-[390px]:gap-2">
          <div className="min-w-0 border border-edge-strong bg-s0/90 p-1.5">
            <div className="flex items-center justify-between gap-1 type-micro"><span><span className="hidden min-[360px]:inline">Codazzo</span><span className="min-[360px]:hidden">COD</span></span><span>{state.tanks.left.integrity}</span></div>
            <div className="mt-1 h-1.5 bg-s2"><div className="h-full bg-viable-hi transition-[width]" style={{ width: `${state.tanks.left.integrity}%` }} /></div>
          </div>
          <div className="border border-edge-strong bg-s0/90 px-2 py-1 text-center">
            <span className="block type-micro">{state.phase === 'finished'
              ? mode === 'range' ? 'Range complete' : mode === 'challenge' ? state.winner === 'left' ? 'Trial clear' : 'Trial failed' : `${CREWS[state.winner!].name} wins`
              : `${CREWS[state.current].name} · Volley ${Math.floor(state.turn / 2) + 1}`}</span>
            <span className="block font-mono text-[10px] text-ink-2">{windLabel}</span>
            <span className="block font-body text-[8px] text-ink-3 min-[390px]:text-[9px]">{state.turn >= 10 ? `${CONDITION_SHORT[state.condition]} · pressure` : CONDITION_SHORT[state.condition]}</span>
          </div>
          <div className="min-w-0 border border-edge-strong bg-s0/90 p-1.5">
            <div className="flex items-center justify-between gap-1 type-micro"><span><span className="hidden min-[360px]:inline">Terragoyle</span><span className="min-[360px]:hidden">TGY</span></span><span>{state.tanks.right.integrity}</span></div>
            <div className="mt-1 h-1.5 bg-s2"><div className="h-full bg-plague-hi transition-[width]" style={{ width: `${state.tanks.right.integrity}%` }} /></div>
          </div>
        </div>
        {coachVisible && <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 px-8 text-center">
          <span className="inline-block border border-edge-strong bg-s0/90 px-2 py-1 font-body text-[10px] text-ink-2">
            {canFire
              ? state.turn === 0 && angle === 45 && power === 70
                ? '1 · Drag up and outward: direction sets arc · distance sets power'
                : state.turn === 0
                  ? '2 · Choose position and ordnance · then Fire'
                  : 'Drag to revise the shot · use the last marker to correct'
              : animated ? 'Shot in flight' : mode === 'bot' && state.current === 'right' ? `Terragoyle: ${botIntent}` : referenceShotLabel ?? ''}
          </span>
        </div>}
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="absolute right-1 bottom-1 z-20 h-7 w-7 border border-edge-strong bg-s0/90 p-0"
          aria-label={coachVisible ? 'Hide aiming tips' : 'Show aiming tips'}
          aria-pressed={coachVisible}
          onClick={() => setCoachVisible((visible) => !visible)}
        >?</Button>
        {handoffPending && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-s0/90 p-4 text-center">
            <div className="max-w-xs border border-edge-strong bg-s1 p-1.5 shadow-panel min-[390px]:p-4">
              <span className="type-micro text-ink-3">Pass the command</span>
              <p className="mt-1 mb-2 font-legend text-body uppercase tracking-legend min-[390px]:mb-3 min-[390px]:text-heading">{CREWS[state.current].name} crew</p>
              <p className="mb-3 hidden font-body text-small text-ink-2 min-[390px]:block">The field is ready. Hand over the device before revealing the next firing choice.</p>
              <Button type="button" className="w-full" onClick={() => {
                setHandoffPending(false);
                onStatus(`${CREWS[state.current].name} has command. Drag the range to aim.`);
              }}>Take command</Button>
            </div>
          </div>
        )}
        <svg
          ref={fieldRef}
          viewBox={cameraViewBox}
          className={`block h-auto w-full touch-none ${canFire ? 'cursor-crosshair' : ''}`}
          role="img"
          aria-label="Codazzo and Terragoyle crawler batteries on destructible terrain. Drag up and outward anywhere on the battlefield; direction sets angle and distance sets power."
          onPointerDown={beginDirectAim}
          onPointerMove={continueDirectAim}
          onPointerUp={finishDirectAim}
          onPointerCancel={cancelDirectAim}
          onLostPointerCapture={cancelDirectAim}
        >
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
          {referenceShot && !animated && referenceShot.outcome.projectiles.some((projectile) => projectile.impact) && (
            <g className={PAYLOAD_META[referenceShot.outcome.payload].elementClass} data-testid="artillery-impact-marker">
              {referenceShot.outcome.projectiles.map((projectile, index) => projectile.impact && (
                <g key={index}>
                  <circle
                    cx={projectile.impact.x}
                    cy={ARTILLERY_HEIGHT - projectile.impact.y}
                    r={ARTILLERY_PAYLOAD_RULES[referenceShot.outcome.payload].blastRadius}
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
              {activePayload === 'barb' || activePayload === 'cluster' ? (
                <path d={`M ${projectile.point.x} ${ARTILLERY_HEIGHT - projectile.point.y - 0.75} l 0.55 0.75 -0.55 0.75 -0.55 -0.75 Z`} className="fill-el stroke-black" strokeWidth="0.18" />
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
          {impactMoment && animated && animated.outcome.damage > 0 && (() => {
            const targetSide: ArtillerySide = animated.shooter === 'left' ? 'right' : 'left';
            const target = state.tanks[targetSide];
            const targetY = ARTILLERY_HEIGHT - terrainHeight(state.terrain, target.x) - 8;
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

      <section aria-label="Command deck" className={`artillery-command mx-auto grid w-full min-w-0 border border-edge-strong bg-s1 lg:grid-cols-[minmax(0,1fr)_auto] ${shortLandscape ? 'gap-1 p-1' : 'gap-2 p-2'}`}>
        {state.phase === 'finished' ? (
          <div className={`border p-4 lg:col-span-2 ${mode === 'bot' && state.winner === 'right' ? 'border-plague-lo bg-plague-tint' : 'border-viable-lo bg-viable-tint'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="type-legend m-0">{mode === 'range' ? 'Calibration complete' : mode === 'challenge' ? state.winner === 'left' ? 'Trial cleared' : 'Trial failed' : mode === 'local' ? 'Range secured' : state.winner === 'left' ? 'Contract cleared' : 'Battery disabled'}</p>
                <p className="mt-2 mb-0 font-body text-body">{mode === 'range' ? `Range record: ${resultStats.damage} damage in ${state.turn} shots.` : mode === 'challenge' ? `${ARTILLERY_MAX_INTEGRITY - state.tanks.right.integrity} damage dealt with the five-round field magazine.` : `The ${CREWS[state.winner!].name} crew holds Crater Sector after ${state.turn} shots.`}</p>
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
              <span><b className="block type-data">{resultStats.payloads.length}</b><small className="type-micro">payloads</small></span>
            </div>
            <p className="mt-3 mb-3 font-body text-small text-ink-2">{mode === 'range' ? 'Practice records no Arcade Credits. Use it to learn wind, atmosphere, and every living payload.' : mode === 'challenge' ? 'The trial records no Arcade Credits. Clear it by choosing five complementary payloads instead of repeating one solution.' : state.winner === 'left' ? 'Codazzo anchor-spines held while the rival shelf gave way.' : 'Terragoyle lift control escaped the collapsing shelf and returned a clean ranging solution.'}</p>
            <p className="mb-3 font-body text-tiny text-ink-3">{resultStats.directHits} direct · {resultSpecialsSpent} special rounds · {resultStats.terrainShift.toFixed(1)} terrain shift{mode === 'range' ? ` · best ${Math.max(rangeBest, resultStats.damage)}` : ''}</p>
            <Button type="button" className="w-full" onClick={onRematch}>Run a fresh sector</Button>
          </div>
        ) : (
          <>
            <div
              className={`artillery-command-top grid min-w-0 gap-2 lg:col-span-2 ${shortLandscape ? '' : 'md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]'}`}
            >
              <div className="grid min-w-0 gap-1" aria-label="Aim the cannon">
                <span className="flex items-center justify-between gap-2 type-legend">
                  <span>Aim <span className="font-body normal-case tracking-normal text-ink-3">drag the range or fine-tune</span></span>
                  {referenceShot && <span className="truncate text-right text-ink-3">Last {referenceShot.shot.angle}° / {referenceShot.shot.power} · {referenceShotLabel}</span>}
                </span>
                <div className="grid min-w-0 grid-cols-2 gap-1">
                  <CommandMeter label="Angle" value={angle} suffix="°" min={10} max={80} disabled={!canFire} guidance={angleGuidance} decreaseKey="S" increaseKey="W" compact={shortLandscape} onChange={setAngle} />
                  <CommandMeter label="Power" value={power} min={15} max={100} disabled={!canFire} guidance={powerGuidance} decreaseKey="Q" increaseKey="E" compact={shortLandscape} onChange={setPower} />
                </div>
              </div>

              <div className="grid min-w-0 gap-1" role="group" aria-label="Drive before firing">
                <span className="flex items-center justify-between gap-2 type-legend">
                  <span>Position</span>
                  <span className="font-mono text-ink-2">{state.traction[state.current]} fuel · {ARTILLERY_MOVE_DISTANCE} units</span>
                </span>
                <div className="grid grid-cols-3 gap-1">
                {([
                  { value: -1 as const, label: 'Fall back' },
                  { value: 0 as const, label: 'Hold' },
                  { value: 1 as const, label: 'Push' },
                ]).map((choice) => {
                  const destination = artilleryMovedX(state, state.current, choice.value);
                  const distance = Math.round(Math.abs(destination - state.tanks[state.current].x));
                  const arrow = choice.value === 0 ? '●' : (state.current === 'left' ? choice.value < 0 : choice.value > 0) ? '←' : '→';
                  const marker = choice.value === 0 ? arrow : arrow === '←' ? `←${distance}` : `${distance}→`;
                  return (
                  <Button
                    key={choice.value}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={`${shortLandscape ? 'h-9' : 'h-[3.35rem]'} min-w-0 flex-col gap-0 border px-1 ${move === choice.value ? 'border-viable-lo bg-viable-tint text-viable-hi' : 'border-edge bg-s0'}`}
                    disabled={!canFire || (choice.value !== 0 && state.traction[state.current] <= 0)}
                    aria-pressed={move === choice.value}
                    onClick={() => {
                      sound.play('select');
                      setMove(choice.value);
                      if (choice.value !== 0 && system === 'anchor') setSystem('none');
                      onStatus(choice.value === 0 ? 'Crawler will hold position.' : distance === 0 ? 'Broken ground blocks that route.' : `Crawler will ${choice.label.toLowerCase()} ${distance} units before firing. The firing guide has moved with it.`);
                    }}
                  >
                    <span className="text-[11px] sm:text-small">{choice.label}</span>
                    <span className="font-mono text-small normal-case tracking-normal text-ink-3">{marker}</span>
                  </Button>
                  );
                })}
                </div>
                <span className="truncate font-body text-[10px] text-ink-3">{moveGuidance}</span>
              </div>
            </div>

            <div className="grid min-w-0 gap-1" role="group" aria-label="Choose a payload">
              <span className="flex items-center justify-between gap-2 type-legend">
                <span>Living ordnance</span>
                <span className="truncate font-body text-[10px] normal-case tracking-normal text-ink-2">{PAYLOAD_META[payload].purpose}</span>
              </span>
              <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
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
                      className={`${shortLandscape ? 'h-9' : 'h-[3.15rem]'} min-w-0 flex-col gap-0 border px-1 ${selected ? 'border-viable-lo bg-viable-tint text-viable-hi' : 'border-edge bg-s0'}`}
                      onClick={() => {
                        sound.play('select');
                        setPayload(choice);
                        onStatus(`${PAYLOAD_META[choice].label} selected. ${PAYLOAD_META[choice].detail}.`);
                      }}
                    >
                      <span className={`text-small text-el ${PAYLOAD_META[choice].elementClass}`} aria-hidden>{PAYLOAD_META[choice].glyph}</span>
                      <span className="max-w-full truncate text-[10px] sm:text-small">{PAYLOAD_META[choice].shortLabel} {Number.isFinite(remaining) ? remaining : '∞'}</span>
                      <kbd className="sr-only">{index + 1}</kbd>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-[4.5rem_5.5rem_minmax(0,1fr)] gap-1 min-[390px]:grid-cols-[auto_auto_minmax(0,1fr)]">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={`${shortLandscape ? 'h-9' : 'h-12'} min-w-0 border border-edge px-1`}
                aria-label={soundOn ? 'Mute artillery audio' : 'Enable artillery audio'}
                aria-pressed={soundOn}
                onClick={() => {
                  const next = !soundOn;
                  sound.setEnabled(next);
                  setSoundOn(next);
                  onStatus(`Artillery sound ${next ? 'enabled' : 'muted'}.`);
                }}
              >
                {soundOn ? 'Audio on' : 'Audio'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!canFire || state.systemCharges[state.current] <= 0}
                aria-pressed={system === crewSystem}
                className={`${shortLandscape ? 'h-9' : 'h-12'} min-w-0 border px-1 ${system === crewSystem ? 'border-viable-lo bg-viable-tint text-viable-hi' : 'border-edge'}`}
                title={systemDetail}
                onClick={() => {
                  sound.play('select');
                  const next = system === crewSystem ? 'none' : crewSystem;
                  setSystem(next);
                  if (next === 'anchor') setMove(0);
                  onStatus(next === 'none' ? `${systemLabel} disengaged.` : `${systemLabel} armed: ${systemDetail}.`);
                }}
              >
                <span>{crewSystem === 'anchor' ? 'Root' : 'Lift'} ×{state.systemCharges[state.current]}</span>
                <span className="font-body text-[8px] normal-case tracking-normal text-ink-3">{crewSystem === 'anchor' ? 'heal + guard' : 'guard + glide'}</span>
              </Button>
              <Button
                type="button"
                size="lg"
                className={`${shortLandscape ? 'h-9' : 'h-12'} min-w-0 overflow-hidden border-2 border-viable-lo px-2 text-heading`}
                disabled={!canFire}
                onClick={() => animateShot({ angle, power, payload, move, system })}
              >
                <span>Fire <span className="hidden min-[360px]:inline">{PAYLOAD_META[payload].shortLabel}</span></span>
                {!shortLandscape && <span className="hidden font-body text-tiny normal-case tracking-normal opacity-80 sm:inline">{angle}° · {power} · {shotPosition}</span>}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function ArtilleryGamePage() {
  const [mode, setMode] = React.useState<ArtilleryMode>('bot');
  const [difficulty, setDifficulty] = React.useState<ArtilleryDifficulty>('standard');
  const [seed, setSeed] = React.useState(() => dailyArcadeSeed('artillery'));
  const [status, setStatus] = React.useState('Drag up and outward on the battlefield to aim, then fire.');
  const startedAt = React.useRef(performance.now());
  const sessionId = React.useRef(arcadeSessionId());

  const newGame = React.useCallback((nextMode = mode, nextDifficulty = difficulty) => {
    setSeed(practiceArcadeSeed('artillery'));
    setMode(nextMode);
    setDifficulty(nextDifficulty);
    const briefing = nextMode === 'challenge'
      ? 'Five-round trial: disable the target with the limited field magazine.'
      : nextMode === 'range'
        ? 'Six-shot range: score as much damage as possible.'
        : nextMode === 'bot'
          ? `${nextDifficulty} rival battery.`
          : 'Two-creature local duel.';
    setStatus(`${briefing} Drag the battlefield to aim.`);
    startedAt.current = performance.now();
    sessionId.current = arcadeSessionId();
  }, [difficulty, mode]);

  const complete = React.useCallback(async ({ score, actions }: { score: number; actions: ArtilleryShot[] }) => {
    setStatus('Match won. Verifying the firing record…');
    const reward = await completeArcadeGame('artillery', { gameId: 'artillery', sessionId: sessionId.current, seed, difficulty, actions }, { score, timeMs: performance.now() - startedAt.current });
    setStatus(`Match won. ${reward.message}`);
  }, [difficulty, seed]);

  return (
    <ArcadeGameShell game={GAME} status={status} onNewGame={() => newGame()} aside={
      <div className="flex gap-1" role="group" aria-label="Opponent">
        <Button
          size="xs"
          variant={mode === 'bot' ? 'outline' : 'ghost'}
          aria-label={`Bot mode. Difficulty ${difficulty}.`}
          title={mode === 'bot' ? 'Select again to cycle difficulty' : 'Play versus bot'}
          onClick={() => {
            if (mode !== 'bot') newGame('bot');
            else {
              const next: ArtilleryDifficulty = difficulty === 'rookie' ? 'standard' : difficulty === 'standard' ? 'expert' : 'rookie';
              newGame('bot', next);
            }
          }}
        >
          Bot <span className="font-mono text-[9px]">{difficulty === 'rookie' ? 'I' : difficulty === 'standard' ? 'II' : 'III'}↻</span>
        </Button>
        <Button size="xs" variant={mode === 'local' ? 'outline' : 'ghost'} onClick={() => newGame('local')}>Local</Button>
        <Button size="xs" variant={mode === 'range' ? 'outline' : 'ghost'} onClick={() => newGame('range')}>Range</Button>
        <Button size="xs" variant={mode === 'challenge' ? 'outline' : 'ghost'} onClick={() => newGame('challenge')}>Trial</Button>
      </div>
    }>
      <ArtilleryBoard key={`${seed}:${mode}:${difficulty}`} seed={seed} mode={mode} difficulty={difficulty} onStatus={setStatus} onComplete={complete} onRematch={() => newGame()} />
    </ArcadeGameShell>
  );
}
