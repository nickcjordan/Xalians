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
  phase: 'move' | 'charge' | 'flight' | 'impact' | 'settle';
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
type AftermathMark = {
  id: string;
  x: number;
  payload: ArtilleryPayload;
  createdTurn: number;
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
  elementClass: string;
}> = {
  shell: { label: 'Comet shell', shortLabel: 'Comet', detail: 'Volatile core · rolling shockwave · unlimited', purpose: 'A heavy all-purpose blast with a molten wake', rackHint: 'Core blast', elementClass: 'el-fire' },
  barb: { label: 'Razor fan', shortLabel: 'Razor', detail: 'Three splitting flechettes · 2 charges', purpose: 'Carves three diverging impact lines', rackHint: '3 split darts', elementClass: 'el-rock' },
  bore: { label: 'Grav drill', shortLabel: 'Drill', detail: 'Burrows before a subterranean rupture · 2 charges', purpose: 'Punches under ridges and collapses ground', rackHint: 'Buried burst', elementClass: 'el-sand' },
  cluster: { label: 'Starfall canister', shortLabel: 'Starfall', detail: 'Five cascading microbursts · 1 charge', purpose: 'Paints a wide shelf with chained detonations', rackHint: '5 nova drops', elementClass: 'el-chemical' },
  bloom: { label: 'Rampart forge', shortLabel: 'Rampart', detail: 'Raises a hardlight barricade · 1 charge', purpose: 'Rebuilds terrain into instant cover', rackHint: 'Builds cover', elementClass: 'el-plant' },
  lance: { label: 'Sunspike', shortLabel: 'Sunspike', detail: 'Hypervelocity light spear · 1 charge', purpose: 'Punches a precise target with a searing line', rackHint: 'Fast piercer', elementClass: 'el-light' },
};

const BARREL_LENGTH = 4.2;
const ARTILLERY_SKY_TOP = -38;
const ARTILLERY_SCENE_TOP = -190;
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

export function artilleryFlightDurationMs(pathLength: number, gravity: number, payload: ArtilleryPayload): number {
  const payloadPace: Record<ArtilleryPayload, number> = {
    shell: 1,
    barb: 0.96,
    bore: 1.04,
    cluster: 1.06,
    bloom: 1.1,
    lance: 0.82,
  };
  const simulatedTravel = Math.max(2_400, Math.min(5_200, pathLength * 60));
  return Math.round(simulatedTravel * payloadPace[payload] / Math.sqrt(Math.max(0.55, gravity)));
}

export function artilleryTerrainSlopeDegrees(terrain: readonly number[], x: number): number {
  const sample = Math.max(1.5, Math.min(3, terrain.length / 120));
  const left = terrainHeight(terrain, x - sample);
  const right = terrainHeight(terrain, x + sample);
  const angle = Math.atan2(-(right - left), sample * 2) * 180 / Math.PI;
  return Math.max(-52, Math.min(52, angle));
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

export function artilleryImpactRevealProgress(progress: number): number {
  const delayed = Math.max(0, Math.min(1, (progress - 0.16) / 0.54));
  return delayed * delayed * (3 - 2 * delayed);
}

const cinematicEase = (value: number) => {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
};

export function artilleryLaunchVisualState(phase: NonNullable<AnimatedShot>['phase'] | null, progress: number) {
  if (phase === 'charge') {
    return {
      visible: true,
      opacity: cinematicEase(progress / 0.34),
      expansion: cinematicEase(progress),
      recoil: cinematicEase((progress - 0.7) / 0.3),
    };
  }
  if (phase === 'flight' && progress <= 0.14) {
    const release = cinematicEase(progress / 0.14);
    return { visible: true, opacity: 1 - release, expansion: 1 + release * 0.72, recoil: 1 - cinematicEase(progress / 0.1) };
  }
  return { visible: false, opacity: 0, expansion: 0, recoil: 0 };
}

export function artilleryImpactVisualState(phase: NonNullable<AnimatedShot>['phase'] | null, progress: number) {
  if (phase !== 'impact' && phase !== 'settle') {
    return { blastOpacity: 0, smokeAge: 0, smokeOpacity: 0, dustOpacity: 0 };
  }
  if (phase === 'impact') {
    return {
      blastOpacity: 1 - cinematicEase((progress - 0.56) / 0.44),
      smokeAge: Math.max(0, Math.min(0.56, (progress - 0.18) / 1.46)),
      smokeOpacity: cinematicEase((progress - 0.18) / 0.28),
      dustOpacity: cinematicEase((progress - 0.22) / 0.32),
    };
  }
  const settleEase = cinematicEase(progress);
  return {
    blastOpacity: 0,
    smokeAge: 0.56 + progress * 0.44,
    smokeOpacity: 1 - settleEase * 0.84,
    dustOpacity: 1 - settleEase * 0.92,
  };
}

function PayloadGlyph({ payload, className = '' }: { payload: ArtilleryPayload; className?: string }) {
  const art = payload === 'shell' ? <>
    <path d="M3 10 L10 7 M2 7 L9 6 M4 13 L10 9" className="fill-none stroke-el" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="13" cy="7" r="4" className="fill-el stroke-black" strokeWidth="1" />
    <circle cx="14" cy="6" r="1.2" className="fill-ink-2" />
  </> : payload === 'barb' ? <>
    {[3, 8, 13].map((y) => <path key={y} d={`M2 ${y + 2} L16 ${y} l-4 3 1-2 -3-1 3-1 -1-2 Z`} className="fill-el stroke-black" strokeWidth="0.65" />)}
  </> : payload === 'bore' ? <>
    <path d="M2 8 L8 3 L16 8 L8 13 Z" className="fill-el stroke-black" strokeWidth="0.85" />
    <path d="M5 8 L8 5.5 L12 8 L8 10.5 Z M8 3 V13" className="fill-none stroke-ink-2" strokeWidth="0.75" />
  </> : payload === 'cluster' ? <>
    <circle cx="9" cy="8" r="2.7" className="fill-el stroke-black" strokeWidth="0.7" />
    {[0, 72, 144, 216, 288].map((degrees) => { const radians = degrees * Math.PI / 180; return <circle key={degrees} cx={9 + Math.cos(radians) * 6} cy={8 + Math.sin(radians) * 5} r="1.25" className="fill-el stroke-black" strokeWidth="0.55" />; })}
  </> : payload === 'bloom' ? <>
    <path d="M2 13 L5 5 L9 2 L13 5 L16 13 L12 10 L9 13 L6 10 Z" className="fill-el stroke-black" strokeWidth="0.8" />
    <path d="M5 5 L9 8 L13 5 M9 2 V13" className="fill-none stroke-ink-2" strokeWidth="0.7" />
  </> : <>
    <path d="M1 9 L13 3 L10 7 L17 8 L10 10 L13 14 Z" className="fill-el stroke-black" strokeWidth="0.75" />
    <path d="M2 9 H14" className="stroke-ink-2" strokeWidth="0.75" />
  </>;
  return <svg viewBox="0 0 18 16" className={`${PAYLOAD_META[payload].elementClass} ${className}`} aria-hidden>{art}</svg>;
}

function ProjectileArt({ payload, x, y, rotation }: { payload: ArtilleryPayload; x: number; y: number; rotation: number }) {
  return (
    <g className={PAYLOAD_META[payload].elementClass} transform={`translate(${x} ${y}) rotate(${rotation})`} data-testid={`artillery-projectile-${payload}`}>
      {payload === 'shell' && <>
        <path d="M-4 0 C-2.8 -1.2 -1.6 -1.1 -0.3 0 C-1.6 1.1 -2.8 1.2 -4 0 Z" className="fill-el opacity-35" />
        <circle r="1.35" className="fill-el stroke-black" strokeWidth="0.24" />
        <circle cx="0.35" cy="-0.35" r="0.42" className="fill-ink-2 opacity-80" />
      </>}
      {payload === 'barb' && <path d="M-2.2 0 L1.7 -1.05 L0.8 0 L1.7 1.05 Z M-1.1 0 L-2.2 -1.2 M-1.1 0 L-2.2 1.2" className="fill-el stroke-black" strokeWidth="0.24" />}
      {payload === 'bore' && <>
        <path d="M-1.8 0 L0 -1.25 L2 0 L0 1.25 Z" className="fill-el stroke-black" strokeWidth="0.25" />
        <path d="M-0.8 -1.4 L0.2 1.4 M0.4 -1.35 L1.25 0.85" className="stroke-ink-2" strokeWidth="0.28" />
        <circle r="1.7" className="fill-none stroke-el opacity-30" strokeWidth="0.24" strokeDasharray="0.7 0.45" />
      </>}
      {payload === 'cluster' && <>
        <circle r="1" className="fill-el stroke-black" strokeWidth="0.22" />
        {[0, 120, 240].map((degrees) => { const radians = degrees * Math.PI / 180; return <circle key={degrees} cx={Math.cos(radians) * 1.8} cy={Math.sin(radians) * 1.8} r="0.46" className="fill-el" />; })}
      </>}
      {payload === 'bloom' && <>
        <path d="M-1.5 0 L0 -1.4 L1.5 0 L0 1.4 Z" className="fill-el stroke-black" strokeWidth="0.22" />
        <path d="M0 -2 V2 M-2 0 H2" className="stroke-el opacity-55" strokeWidth="0.25" />
      </>}
      {payload === 'lance' && <>
        <path d="M-3.2 0 L1.3 -0.72 L2.5 0 L1.3 0.72 Z" className="fill-el stroke-black" strokeWidth="0.2" />
        <path d="M-4.2 0 H1.4" className="stroke-el opacity-55" strokeWidth="0.4" />
      </>}
    </g>
  );
}

function PersistentPayloadAftermath({ mark, y, slope, age, visibility = 1 }: { mark: AftermathMark; y: number; slope: number; age: number; visibility?: number }) {
  const fade = Math.max(0.2, 0.78 - age * 0.14);
  const common = `${PAYLOAD_META[mark.payload].elementClass} artillery-aftermath`;
  const opacity = fade * Math.max(0, Math.min(1, visibility));
  const surfaceTransform = `rotate(${slope} ${mark.x} ${y})`;
  if (mark.payload === 'bloom') return <g className={common} opacity={opacity} aria-hidden>
    <g transform={surfaceTransform}>
      <path d={`M ${mark.x - 5.5} ${y} L ${mark.x - 4.2} ${y - 8} L ${mark.x} ${y - 12} L ${mark.x + 4.2} ${y - 8} L ${mark.x + 5.5} ${y}`} className="fill-el opacity-15 stroke-el" strokeWidth="0.55" />
      <path d={`M ${mark.x - 4.2} ${y - 8} L ${mark.x} ${y - 4.5} L ${mark.x + 4.2} ${y - 8} M ${mark.x} ${y - 12} V ${y - 4.5}`} className="fill-none stroke-el opacity-65" strokeWidth="0.45" />
    </g>
  </g>;
  if (mark.payload === 'lance') return <g className={common} opacity={opacity} aria-hidden>
    <g transform={surfaceTransform}>
      <ellipse cx={mark.x} cy={y + 0.25} rx="3.6" ry="0.9" className="fill-black opacity-55" />
      <path d={`M ${mark.x} ${y + 0.2} V ${y - 9}`} className="fill-none stroke-el" strokeWidth="0.7" strokeLinecap="round" />
    </g>
    <path d={`M ${mark.x - 1.2} ${y - 1} Q ${mark.x - 2.2} ${y - 5} ${mark.x - 0.4} ${y - 9} M ${mark.x + 1} ${y - 0.5} Q ${mark.x + 2.2} ${y - 4} ${mark.x + 0.7} ${y - 7}`} className="fill-none stroke-el artillery-smoke-wisp" strokeWidth="0.55" strokeLinecap="round" />
  </g>;
  if (mark.payload === 'barb') return <g className={common} opacity={opacity} aria-hidden>
    <g transform={surfaceTransform}>
      <ellipse cx={mark.x} cy={y + 0.35} rx="4.6" ry="0.9" className="fill-black opacity-45" />
      <path d={`M ${mark.x - 2.5} ${y} l -1.1 -5 l 2.3 3 M ${mark.x} ${y} l 0.4 -6 l 1.1 3.3 M ${mark.x + 2.4} ${y} l 1.8 -4.5`} className="fill-none stroke-el opacity-60" strokeWidth="0.55" />
    </g>
  </g>;
  if (mark.payload === 'bore') return <g className={common} opacity={opacity} aria-hidden>
    <ellipse transform={surfaceTransform} cx={mark.x} cy={y + 0.55} rx="6.4" ry="1.5" className="fill-black opacity-65 stroke-el" strokeWidth="0.25" />
    <g className="artillery-smoke-cloud" filter="url(#artillery-smoke-soft)">
      <circle cx={mark.x - 0.8} cy={y - 3.5} r="2.2" className="fill-ink-3 opacity-30" />
      <circle cx={mark.x + 0.9} cy={y - 7} r="2.9" className="fill-el opacity-22" />
      <circle cx={mark.x - 0.5} cy={y - 11} r="3.3" className="fill-ink-3 opacity-20" />
    </g>
  </g>;
  const emberCount = mark.payload === 'cluster' ? 5 : 2;
  return <g className={common} opacity={opacity} aria-hidden>
    <g transform={surfaceTransform}>
      <ellipse cx={mark.x} cy={y + 0.4} rx={mark.payload === 'cluster' ? 6.4 : 6.2} ry="1.15" className="fill-black opacity-55" />
      {Array.from({ length: emberCount }, (_, index) => <circle key={index} cx={mark.x + (index - (emberCount - 1) / 2) * 1.7} cy={y - 0.25 - (index % 2) * 0.5} r="0.38" className="fill-el artillery-ember" />)}
    </g>
    <g className="artillery-smoke-cloud" filter="url(#artillery-smoke-soft)">
      <circle cx={mark.x - 1.2} cy={y - 3.4} r={mark.payload === 'cluster' ? 2.8 : 2.4} className="fill-ink-3 opacity-32" />
      <circle cx={mark.x + 1.2} cy={y - 6.8} r={mark.payload === 'cluster' ? 3.4 : 3} className="fill-el opacity-22" />
      <circle cx={mark.x - 0.4} cy={y - 10.6} r={mark.payload === 'cluster' ? 3.8 : 3.4} className="fill-ink-3 opacity-22" />
      <circle cx={mark.x + 1.8} cy={y - 13.2} r="2.5" className="fill-el opacity-15" />
    </g>
  </g>;
}

function PayloadImpactArt({ payload, x, y, slope, progress, reveal, visual, index }: {
  payload: ArtilleryPayload;
  x: number;
  y: number;
  slope: number;
  progress: number;
  reveal: number;
  visual: ReturnType<typeof artilleryImpactVisualState>;
  index: number;
}) {
  const rules = ARTILLERY_PAYLOAD_RULES[payload];
  const radius = Math.max(rules.craterRadius * 0.18, rules.craterRadius * reveal);
  const grow = cinematicEase(Math.min(1, progress / 0.48));
  const blast = visual.blastOpacity;
  const smoke = visual.smokeAge;
  const surfaceTransform = `rotate(${slope} ${x} ${y})`;
  const star = (length: number, opacity: number) => [0, 45, 90, 135, 180, 225, 270, 315].map((degrees) => {
    const radians = degrees * Math.PI / 180;
    return <line key={degrees} x1={x + Math.cos(radians) * radius * 0.16} y1={y + Math.sin(radians) * radius * 0.16} x2={x + Math.cos(radians) * length} y2={y + Math.sin(radians) * length} className="stroke-el" strokeWidth="0.34" opacity={opacity} />;
  });

  if (payload === 'bloom') return <g className={PAYLOAD_META[payload].elementClass} aria-hidden data-testid="artillery-impact-bloom">
    <g transform={surfaceTransform}>
      <ellipse cx={x} cy={y + 0.5} rx={radius * (0.7 + grow * 0.5)} ry={1 + grow} className="fill-el" opacity={visual.dustOpacity * 0.22} />
      {[[-1, -7], [0, -11], [1, -7]].map(([offset, height], plate) => {
        const center = x + offset * radius * 0.25;
        const raised = grow * Math.abs(height);
        return <path key={plate} d={`M ${center - radius * 0.2} ${y} L ${center - radius * 0.16} ${y - raised} L ${center} ${y - raised - 1.5 * grow} L ${center + radius * 0.16} ${y - raised} L ${center + radius * 0.2} ${y} Z`} className="fill-el stroke-el" opacity={0.12 + grow * 0.42} strokeWidth="0.38" />;
      })}
      <circle cx={x} cy={y - grow * 14} r={1.2 + grow * 1.4} className="fill-none stroke-el" strokeWidth="0.32" opacity={blast * 0.72} />
      {star(radius * 0.9, blast * 0.55)}
    </g>
  </g>;

  if (payload === 'lance') return <g className={PAYLOAD_META[payload].elementClass} aria-hidden data-testid="artillery-impact-lance">
    <g transform={surfaceTransform}>
      <path d={`M ${x} ${y + 3} L ${x - 0.7 * blast} ${y - 26 * grow} L ${x + 0.7 * blast} ${y - 26 * grow} Z`} className="fill-el" opacity={blast * 0.68} />
      <path d={`M ${x} ${y + 2} V ${y - 31 * grow}`} className="stroke-el" strokeWidth="0.5" opacity={blast} />
      {[1, 2, 3].map((ring) => <ellipse key={ring} cx={x} cy={y - ring * 2.2} rx={ring * 2.1 * grow} ry={ring * 0.65 * grow} className="fill-none stroke-el" strokeWidth="0.25" opacity={blast * (0.72 - ring * 0.14)} />)}
    </g>
    <path d={`M ${x - 1.2} ${y} Q ${x - 2.6} ${y - 5 - smoke * 8} ${x - 0.5} ${y - 10 - smoke * 9} M ${x + 1} ${y} Q ${x + 2.5} ${y - 4 - smoke * 7} ${x + 0.8} ${y - 8 - smoke * 8}`} className="fill-none stroke-el" strokeWidth="0.48" opacity={visual.smokeOpacity * 0.35} />
  </g>;

  if (payload === 'bore') return <g className={PAYLOAD_META[payload].elementClass} aria-hidden data-testid="artillery-impact-bore">
    <g transform={surfaceTransform}>
      <path d={`M ${x} ${y + 4} V ${y - ARTILLERY_PAYLOAD_RULES.bore.penetration - 8 * grow}`} className="stroke-el" strokeWidth="0.8" strokeDasharray="0.8 0.45" opacity={blast * 0.85} />
      {[1, 2, 3].map((ring) => <ellipse key={ring} cx={x} cy={y} rx={radius * ring * 0.36} ry={radius * ring * 0.13} className="fill-none stroke-el" strokeWidth="0.3" opacity={blast * (0.8 - ring * 0.16)} />)}
      {[0, 1, 2, 3, 4, 5].map((piece) => { const direction = piece % 2 ? 1 : -1; return <path key={piece} d={`M ${x} ${y - 2} l ${direction * (2 + piece * 0.7) * grow} ${-5 - (piece % 3) * 3 * grow} l ${direction * 1.1} 1.5`} className="fill-none stroke-el" strokeWidth="0.55" opacity={blast * 0.75} />; })}
    </g>
    <ellipse cx={x} cy={y - smoke * 8} rx={2 + smoke * 4.5} ry={2 + smoke * 5.5} className="fill-ink-3" opacity={visual.smokeOpacity * 0.28} filter="url(#artillery-smoke-soft)" />
  </g>;

  if (payload === 'barb') return <g className={PAYLOAD_META[payload].elementClass} aria-hidden data-testid="artillery-impact-barb">
    <g transform={surfaceTransform}>
      {[-1, 0, 1].map((direction) => <path key={direction} d={`M ${x} ${y + 1} Q ${x + direction * radius * 0.55} ${y - radius * 0.4} ${x + direction * radius * (0.85 + grow * 0.4)} ${y - radius * (0.65 + grow * 0.55)} l ${-direction * 1.6} 0.4`} className="fill-none stroke-el" strokeWidth="0.68" opacity={blast * 0.88} />)}
      {[0, 1, 2, 3, 4, 5].map((piece) => { const radians = (-150 + piece * 60) * Math.PI / 180; return <path key={piece} d={`M ${x + Math.cos(radians) * radius * grow} ${y + Math.sin(radians) * radius * grow} l ${Math.cos(radians) * 2} ${Math.sin(radians) * 2} l ${-Math.sin(radians)} ${Math.cos(radians)}`} className="fill-el stroke-el" strokeWidth="0.22" opacity={blast * 0.72} />; })}
      <ellipse cx={x} cy={y} rx={radius * 1.15} ry={1.1 + smoke * 1.6} className="fill-ink-3" opacity={visual.dustOpacity * 0.2} />
    </g>
  </g>;

  if (payload === 'cluster') return <g className={PAYLOAD_META[payload].elementClass} aria-hidden data-testid="artillery-impact-cluster">
    <circle cx={x} cy={y} r={radius * 0.68} className="fill-el" opacity={blast * 0.56} />
    {star(radius * (0.8 + (index % 3) * 0.12), blast * 0.72)}
    {[0, 72, 144, 216, 288].map((degrees) => { const radians = (degrees + index * 19) * Math.PI / 180; return <circle key={degrees} cx={x + Math.cos(radians) * radius * (0.5 + grow * 0.45)} cy={y + Math.sin(radians) * radius * (0.5 + grow * 0.45)} r={0.55 + grow * 0.65} className="fill-el" opacity={blast * 0.7} />; })}
    <circle cx={x - smoke * 2} cy={y - 2 - smoke * 9} r={1.2 + smoke * 3.4} className="fill-el" opacity={visual.smokeOpacity * 0.18} filter="url(#artillery-smoke-soft)" />
  </g>;

  return <g className={PAYLOAD_META[payload].elementClass} aria-hidden data-testid="artillery-impact-shell">
    <g opacity={blast * (progress < 0.16 ? 0.94 : 0.7)}>
      <circle cx={x} cy={y} r={radius * 0.64} className="fill-el" />
      {[0, 52, 111, 173, 231, 298].map((degrees, lobe) => { const radians = degrees * Math.PI / 180; return <circle key={degrees} cx={x + Math.cos(radians) * radius * (0.24 + (lobe % 3) * 0.035)} cy={y + Math.sin(radians) * radius * (0.24 + (lobe % 3) * 0.035)} r={radius * (0.34 + (lobe % 2) * 0.09)} className="fill-el" opacity={0.68 + (lobe % 3) * 0.09} />; })}
      <ellipse cx={x - radius * 0.08} cy={y - radius * 0.12} rx={radius * 0.42} ry={radius * 0.3} className="fill-s0" opacity={0.28 * blast} />
    </g>
    <circle cx={x} cy={y} r={rules.blastRadius * (0.12 + reveal * 0.88)} className="fill-none stroke-el" strokeWidth="0.24" strokeDasharray="0.75 0.48" opacity={blast * 0.56} />
    {star(radius * 0.82, blast * 0.74)}
    <g opacity={visual.smokeOpacity} filter="url(#artillery-smoke-soft)">
      <circle cx={x - 1.4 - smoke * 2.8} cy={y - 1.4 - smoke * 10.5} r={1.3 + smoke * 4.8} className="fill-ink-3 opacity-30" />
      <circle cx={x + 1.7 + smoke * 1.9} cy={y - 2.6 - smoke * 12.5} r={1.1 + smoke * 5.2} className="fill-el opacity-20" />
      <circle cx={x + Math.sin(smoke * Math.PI * 2) * 3.2} cy={y - 4.2 - smoke * 13.5} r={0.9 + smoke * 4.1} className="fill-ink-2 opacity-25" />
    </g>
    <ellipse transform={surfaceTransform} cx={x} cy={y + 0.5} rx={rules.craterRadius * (0.62 + smoke * 0.95)} ry={0.7 + smoke * 1.8} className="fill-el" opacity={visual.dustOpacity * 0.2} />
  </g>;
}

export function artilleryCinematicCamera(
  fieldWidth: number,
  narrow: boolean,
  phase: NonNullable<AnimatedShot>['phase'] | null,
  focusX: number,
  focusY: number,
  progress = 1,
  launchX = focusX,
  launchY = focusY,
): string {
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const ease = (value: number) => {
    const clamped = clamp(value);
    return clamped * clamped * (3 - 2 * clamped);
  };
  const frame = (width: number, height: number, xFocus: number, yFocus: number) => ({
    x: Math.max(0, Math.min(fieldWidth - width, xFocus - width / 2)),
    y: Math.max(ARTILLERY_SCENE_TOP, Math.min(ARTILLERY_HEIGHT - height, yFocus - height * 0.58)),
    width,
    height,
  });
  const homeWidth = narrow ? Math.min(fieldWidth, Math.max(190, fieldWidth * 0.58)) : fieldWidth;
  const home = frame(homeWidth, ARTILLERY_VIEW_HEIGHT, fieldWidth / 2, ARTILLERY_SKY_TOP + ARTILLERY_VIEW_HEIGHT * 0.58);
  home.y = ARTILLERY_SKY_TOP;
  if (!phase || phase === 'move') {
    return `${Math.round(home.x * 100) / 100} ${home.y} ${Math.round(home.width * 100) / 100} ${home.height}`;
  }

  const targetWidth = phase === 'charge'
    ? narrow ? Math.min(fieldWidth, 190) : Math.min(fieldWidth, Math.max(220, fieldWidth * 0.7))
    : phase === 'impact' || phase === 'settle'
      ? narrow ? Math.min(fieldWidth, 175) : Math.min(fieldWidth, 230)
      : narrow ? Math.min(fieldWidth, 190) : Math.min(fieldWidth, 260);
  const targetHeight = phase === 'impact' || phase === 'settle' ? 112 : phase === 'charge' ? 122 : 118;
  const target = frame(targetWidth, targetHeight, focusX, focusY + (phase === 'flight' ? targetHeight * 0.1 : 0));
  const launchFrame = frame(
    narrow ? Math.min(fieldWidth, 190) : Math.min(fieldWidth, Math.max(220, fieldWidth * 0.7)),
    122,
    launchX,
    launchY,
  );
  const from = phase === 'impact' ? frame(narrow ? Math.min(fieldWidth, 190) : Math.min(fieldWidth, 260), 118, focusX, focusY + 11.8) : home;
  const amount = phase === 'charge'
    ? ease(progress / 0.82)
    : phase === 'impact'
      ? ease(progress / 0.2)
      : phase === 'settle'
        ? 1 - ease((progress - 0.3) / 0.7)
        : phase === 'flight'
          ? ease(progress / 0.12)
          : 1;
  const origin = phase === 'settle' ? home : phase === 'flight' ? launchFrame : from;
  const destination = target;
  const mixed = {
    x: origin.x + (destination.x - origin.x) * amount,
    y: origin.y + (destination.y - origin.y) * amount,
    width: origin.width + (destination.width - origin.width) * amount,
    height: origin.height + (destination.height - origin.height) * amount,
  };
  return `${Math.round(mixed.x * 100) / 100} ${Math.round(mixed.y * 100) / 100} ${Math.round(mixed.width * 100) / 100} ${Math.round(mixed.height * 100) / 100}`;
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
  const [aftermath, setAftermath] = React.useState<AftermathMark[]>([]);
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
      if (phase === 'impact' && progress >= 0.62) setShotCallout(result);
    };
    const runPhase = (phase: NonNullable<AnimatedShot>['phase'], durationMs: number, done: () => void) => {
      if (reduced) {
        frameState(phase, 1);
        pendingTimers.current.push(window.setTimeout(done, 1));
        return;
      }
      const delay = 16;
      const frames = Math.max(1, Math.ceil(durationMs / delay));
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
        const impactMarks = applied.outcome.projectiles.flatMap((projectile, index) => projectile.impact ? [{
          id: `${applied.state.turn}-${index}-${projectile.impact.x.toFixed(1)}`,
          x: projectile.impact.x,
          payload: applied.outcome.payload,
          createdTurn: applied.state.turn,
        }] : []);
        if (impactMarks.length) {
          setAftermath((current) => [
            ...current.filter((mark) => applied.state.turn - mark.createdTurn < 4),
            ...impactMarks,
          ].slice(-8));
        }
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
      }, reduced ? 1 : 100));
    };

    const settle = () => {
      onStatus('Impact zone stabilizing.');
      runPhase('settle', 1_500, finish);
    };
    const impact = () => {
      sound.play(applied.outcome.hit ? 'hit' : 'impact', applied.outcome.payload);
      runPhase('impact', 2_600, settle);
    };
    const flight = () => {
      sound.play('launch', resolvedShot.payload);
      onStatus(`${firingRig.name} fires ${payloadName}.`);
      runPhase('flight', artilleryFlightDurationMs(longestPath, environment.gravity, resolvedShot.payload), impact);
    };
    const charge = () => {
      onStatus(`${firingRig.name} charges ${payloadName}.`);
      runPhase('charge', 900, flight);
    };
    if (resolvedShot.move !== 0) runPhase('move', 1_450, charge);
    else charge();
  }, [animated, environment.gravity, mode, movement, onStatus, sound, state]);

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
    () => animated?.phase === 'impact' || animated?.phase === 'settle'
      ? artilleryImpactTerrainFrame(state.terrain, animated.terrainAfter, animated.phase === 'settle' ? 1 : artilleryImpactRevealProgress(animated.progress))
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
    const flightProgress = animated.phase === 'flight' ? animated.progress : animated.phase === 'impact' || animated.phase === 'settle' ? 1 : 0;
    const pointIndex = artilleryFlightFrameIndex(projectile.path.length, longestPath, flightProgress);
    return { point: projectile.path[pointIndex], path: projectile.path.slice(0, pointIndex + 1) };
  }) ?? [], [animated]);
  const resolutionFrames = animated?.phase === 'impact' || animated?.phase === 'settle'
    ? animated.outcome.projectiles.flatMap((projectile) => projectile.impact ? [projectile.impact] : [])
    : [];
  const cameraViewBox = React.useMemo(() => {
    const projectileFocus = animatedProjectiles.length
      ? animatedProjectiles.reduce((total, projectile) => ({
          x: total.x + projectile.point.x / animatedProjectiles.length,
          y: total.y + (ARTILLERY_HEIGHT - projectile.point.y) / animatedProjectiles.length,
        }), { x: 0, y: 0 })
      : null;
    const shooter = animated ? state.tanks[animated.shooter] : null;
    const focusX = projectileFocus?.x ?? shooter?.x ?? (state.tanks.left.x + state.tanks.right.x) / 2;
    const focusY = projectileFocus?.y ?? (shooter ? ARTILLERY_HEIGHT - terrainHeight(displayTerrain, shooter.x) : 52);
    const launchY = shooter ? ARTILLERY_HEIGHT - terrainHeight(displayTerrain, shooter.x) : focusY;
    return artilleryCinematicCamera(fieldWidth, narrowScreen, animated?.phase ?? null, focusX, focusY, animated?.progress ?? 1, shooter?.x ?? focusX, launchY);
  }, [animated, animatedProjectiles, displayTerrain, fieldWidth, narrowScreen, state.tanks]);
  const aimOutcome = React.useMemo(
    () => canFire ? simulateArtilleryShot(state, { angle, power, payload, move: 0, system: 'none' }) : null,
    [angle, canFire, payload, power, state],
  );
  const aimPreviews = aimOutcome?.projectiles.map((projectile) =>
    projectile.path.slice(0, Math.min(14, Math.max(8, projectile.path.length - 7)))
  ) ?? [];
  const activePayload = animated?.outcome.payload ?? payload;
  const activePayloadMeta = PAYLOAD_META[activePayload];
  const launchVisual = artilleryLaunchVisualState(animated?.phase ?? null, animated?.progress ?? 0);
  const impactVisual = artilleryImpactVisualState(animated?.phase ?? null, animated?.progress ?? 0);
  const calloutOpacity = animated?.phase === 'impact'
    ? cinematicEase((animated.progress - 0.6) / 0.14)
    : animated?.phase === 'settle'
      ? 1 - cinematicEase((animated.progress - 0.28) / 0.46)
      : 0;
  const impactMoment = animated?.phase === 'impact';
  const resolutionMoment = impactMoment || animated?.phase === 'settle';
  const impactReveal = animated?.phase === 'settle' ? 1 : impactMoment ? artilleryImpactRevealProgress(animated.progress) : 0;
  const shotShake = impactMoment && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? Math.sin(impactReveal * Math.PI * 10) * (activePayload === 'bore' ? 1.15 : 0.8) * (1 - impactReveal)
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
    if (!resolutionMoment || !animated) return state.tanks[side].integrity;
    const targetSide: ArtillerySide = animated.shooter === 'left' ? 'right' : 'left';
    if (targetSide !== side) return state.tanks[side].integrity;
    return Math.max(0, state.tanks[side].integrity - animated.outcome.damage * impactReveal);
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
    const firing = !!animated && animated.shooter === side && launchVisual.visible;
    const recoiling = firing && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? launchVisual.recoil * (side === 'left' ? -0.72 : 0.72)
      : 0;
    const takingDamage = !!resolutionMoment && impactReveal > 0 && animated?.outcome.hit === side;
    const damageJolt = takingDamage && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? Math.sin((animated?.phase === 'impact' ? animated.progress : 1) * Math.PI * 6) * (1 - (animated?.phase === 'settle' ? animated.progress : impactReveal) * 0.85) * (side === 'left' ? -0.45 : 0.45)
      : 0;
    const damageEffectOpacity = animated?.phase === 'settle' ? Math.max(0, 1 - animated.progress / 0.36) : Math.min(1, impactReveal * 2.4);
    const impactTarget = animated?.shooter === 'left' ? 'right' : 'left';
    const displayedIntegrity = resolutionMoment && impactTarget === side
      ? Math.max(0, value.integrity - (animated?.outcome.damage ?? 0) * impactReveal)
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
          <g className={PAYLOAD_META[animated!.outcome.payload].elementClass} aria-hidden style={{ opacity: launchVisual.opacity }}>
            <circle cx={barrel.x} cy={barrel.y - 0.9} r={1.1 + launchVisual.expansion * 0.8} className="fill-el opacity-30" />
            <circle cx={barrel.x + (side === 'left' ? 0.9 : -0.9)} cy={barrel.y - 0.9} r={0.55 + launchVisual.expansion * 0.35} className="fill-el opacity-60" />
            <path d={`M ${barrel.x} ${barrel.y - 0.9} l ${side === 'left' ? 2.3 + launchVisual.expansion * 2.4 : -2.3 - launchVisual.expansion * 2.4} -0.8 l ${side === 'left' ? -0.8 : 0.8} 1.4 Z`} className="fill-el opacity-30" />
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
          <g className="el-electric" aria-hidden opacity={damageEffectOpacity}>
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
      <section aria-label="Artillery field" className={`artillery-field artillery-viewport relative mx-auto w-full self-start overflow-hidden border-2 border-edge-strong bg-s0 shadow-panel ${animated ? `artillery-cinematic-${animated.phase}` : ''}`}>
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
          <div
            className="pointer-events-none absolute inset-x-0 top-[42%] z-20 text-center"
            style={{ opacity: calloutOpacity, transform: `translateY(${(1 - calloutOpacity) * 6}px)` }}
          >
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
          <defs aria-hidden>
            <filter id="artillery-smoke-soft" x="-45%" y="-45%" width="190%" height="190%">
              <feGaussianBlur stdDeviation="0.58" />
            </filter>
          </defs>
          <rect y={ARTILLERY_SCENE_TOP} width={fieldWidth} height={ARTILLERY_HEIGHT - ARTILLERY_SCENE_TOP} className="fill-s0" />
          <image href={worldMeta.image} x="0" y={ARTILLERY_SCENE_TOP} width={fieldWidth} height={ARTILLERY_HEIGHT - ARTILLERY_SCENE_TOP} preserveAspectRatio="xMidYMid slice" opacity="0.42" aria-hidden />
          <rect y={ARTILLERY_SCENE_TOP} width={fieldWidth} height={ARTILLERY_HEIGHT - ARTILLERY_SCENE_TOP} className="fill-s0 opacity-55" />
          <g aria-hidden className={`${worldMeta.elementClass} opacity-20`}>
            <ellipse cx={fieldWidth * 0.18} cy={ARTILLERY_SCENE_TOP + 46} rx={fieldWidth * 0.26} ry="18" className="fill-el opacity-15" />
            <ellipse cx={fieldWidth * 0.82} cy={ARTILLERY_SCENE_TOP + 112} rx={fieldWidth * 0.34} ry="24" className="fill-el opacity-10" />
          </g>
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
          {animated?.phase === 'flight' && animated.progress < 0.08 && (
            <rect
              x="0"
              y={ARTILLERY_SCENE_TOP}
              width={fieldWidth}
              height={ARTILLERY_HEIGHT - ARTILLERY_SCENE_TOP}
              className={`${activePayloadMeta.elementClass} fill-el pointer-events-none`}
              opacity={Math.max(0, 0.24 * (1 - animated.progress / 0.08))}
              aria-hidden
            />
          )}
          <path d={terrainPath} className="fill-s2 stroke-ink-2" strokeWidth="0.42" />
          <path d={terrainPath} className={`${worldMeta.elementClass} fill-el opacity-15`} />
          {terrainContours.map((contour, index) => <path key={index} d={contour} className="fill-none stroke-ink-4 opacity-40" strokeWidth="0.22" />)}
          {aftermath.map((mark) => {
            const age = Math.max(0, state.turn - mark.createdTurn);
            const y = ARTILLERY_HEIGHT - terrainHeight(displayTerrain, mark.x);
            const slope = artilleryTerrainSlopeDegrees(displayTerrain, mark.x);
            return <PersistentPayloadAftermath key={mark.id} mark={mark} y={y} slope={slope} age={age} />;
          })}
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
          {launchVisual.visible && animated && (() => {
            const shooter = state.tanks[animated.shooter];
            const rigY = ARTILLERY_HEIGHT - terrainHeight(displayTerrain, shooter.x) - 1.5;
            const barrel = artilleryBarrelEndpoint(shooter.x, rigY - 1.8, animated.shooter, animated.shot.angle);
            const x = barrel.x;
            const y = barrel.y - 0.9;
            const pulse = 1.8 + launchVisual.expansion * 5.4;
            return (
              <g className={activePayloadMeta.elementClass} aria-hidden data-testid="artillery-launch-charge" opacity={launchVisual.opacity}>
                <circle cx={x} cy={y} r={pulse} className="fill-none stroke-el opacity-60" strokeWidth="0.35" strokeDasharray="1.1 0.8" />
                <circle cx={x} cy={y} r={Math.max(0.8, pulse * 0.52)} className="fill-el opacity-15" />
                {[0, 90, 180, 270].map((degrees) => {
                  const radians = degrees * Math.PI / 180;
                  return <line key={degrees} x1={x + Math.cos(radians) * (pulse + 1.5)} y1={y + Math.sin(radians) * (pulse + 1.5)} x2={x + Math.cos(radians) * (pulse + 4)} y2={y + Math.sin(radians) * (pulse + 4)} className="stroke-el opacity-70" strokeWidth="0.4" />;
                })}
              </g>
            );
          })()}
          {animatedProjectiles.map((projectile, index) => {
            const priorPoint = projectile.path[Math.max(0, projectile.path.length - 2)] ?? projectile.point;
            const rotation = Math.atan2(-(projectile.point.y - priorPoint.y), projectile.point.x - priorPoint.x) * 180 / Math.PI;
            return <g key={index} className={activePayloadMeta.elementClass} opacity={animated?.phase === 'flight' ? 1 : animated?.phase === 'impact' ? 1 - cinematicEase(animated.progress / 0.08) : 0}>
              {projectile.path.length > 1 && <polyline points={projectile.path.map((point) => `${point.x},${ARTILLERY_HEIGHT - point.y}`).join(' ')} className="fill-none stroke-el opacity-55" strokeWidth={activePayload === 'bore' ? 0.65 : 0.4} strokeDasharray={activePayload === 'barb' ? '0.6 0.8' : '1 0.7'} />}
              {animated?.phase === 'flight' && [1, 2, 3].map((trail) => {
                const prior = projectile.path[Math.max(0, projectile.path.length - 1 - trail * 2)] ?? projectile.point;
                return <circle key={trail} cx={prior.x} cy={ARTILLERY_HEIGHT - prior.y} r={Math.max(0.22, 0.85 - trail * 0.18)} className="fill-el" style={{ opacity: 0.42 - trail * 0.09 }} />;
              })}
              <ProjectileArt payload={activePayload} x={projectile.point.x} y={ARTILLERY_HEIGHT - projectile.point.y} rotation={rotation} />
            </g>;
          })}
          {resolutionFrames.map((impact, index) => {
            const progress = animated?.phase === 'impact' ? animated.progress : 1;
            const surfaceY = ARTILLERY_HEIGHT - terrainHeight(displayTerrain, impact.x);
            const slope = artilleryTerrainSlopeDegrees(displayTerrain, impact.x);
            const transition = cinematicEase((impactReveal - 0.42) / 0.4);
            const liveMark: AftermathMark = {
              id: `active-${index}`,
              x: impact.x,
              payload: activePayload,
              createdTurn: state.turn,
            };
            return <React.Fragment key={index}>
              <PayloadImpactArt payload={activePayload} x={impact.x} y={surfaceY} slope={slope} progress={progress} reveal={impactReveal} visual={impactVisual} index={index} />
              <PersistentPayloadAftermath mark={liveMark} y={surfaceY} slope={slope} age={0} visibility={transition} />
            </React.Fragment>;
          })}
          {resolutionMoment && impactReveal > 0.08 && animated && animated.outcome.damage > 0 && (() => {
            const targetSide: ArtillerySide = animated.shooter === 'left' ? 'right' : 'left';
            const target = state.tanks[targetSide];
            const targetY = ARTILLERY_HEIGHT - terrainHeight(displayTerrain, target.x) - 8;
            const labelOpacity = animated.phase === 'settle' ? Math.max(0, 1 - animated.progress / 0.38) : Math.min(1, impactReveal * 2);
            return (
              <g className={targetSide === 'left' ? 'el-fire' : 'el-water'} aria-hidden>
                <text x={target.x} y={targetY - Math.sin(Math.min(1, impactReveal) * Math.PI) * 5 - (animated.phase === 'settle' ? animated.progress * 2 : 0)} textAnchor="middle" className="fill-el font-mono" fontSize="2.2" fontWeight="700" opacity={labelOpacity}>−{animated.outcome.damage}</text>
                {animated.outcome.guardAbsorbed > 0 && <text x={target.x} y={targetY + 2} textAnchor="middle" className="fill-ink-2 font-mono" fontSize="1" opacity={labelOpacity}>GUARD {animated.outcome.guardAbsorbed}</text>}
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
                      className={`artillery-ordnance-card h-16 min-w-0 flex-col gap-0 border px-1.5 ${selected ? 'border-viable-lo bg-viable-tint text-viable-hi' : 'border-edge bg-s0'}`}
                      onClick={() => {
                        sound.play('select');
                        setPayload(choice);
                        onStatus(`${PAYLOAD_META[choice].label} selected. ${PAYLOAD_META[choice].detail}.`);
                      }}
                    >
                      <PayloadGlyph payload={choice} className="h-6 w-9 overflow-visible" />
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
                  <span className="grid size-12 place-items-center rounded-full border-2 border-viable-lo bg-viable-tint text-viable-hi"><PayloadGlyph payload={payload} className="h-8 w-10 overflow-visible" /></span>
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
