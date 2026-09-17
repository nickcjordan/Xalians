import { createElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ARTILLERY_HEIGHT, createArtilleryState, simulateArtilleryShot, terrainHeight } from '@xalians/rules/arcade';

import { ArtilleryBoard, ArtillerySetup, CommandMeter, artilleryAimFromDrag, artilleryBarrelEndpoint, artilleryCinematicCamera, artilleryFlightDurationMs, artilleryFlightSample, artilleryFlightTrail, artilleryImpactRevealProgress, artilleryImpactVisualState, artilleryJetFlightY, artilleryLaunchVisualState, artilleryMoveAnimationProgress, artilleryNextSortieTip, artilleryProjectileImpactState, artilleryShotVerdict, artilleryTerrainSlopeDegrees } from '../pages/games/artilleryGamePage';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
});
afterAll(() => vi.unstubAllGlobals());

describe('Crater Command aim feedback', () => {
  it('recommends a next sortie from the actual match result', () => {
    expect(artilleryNextSortieTip({ mode: 'bot', difficulty: 'standard', won: false, accuracy: 25, specialRounds: 1 })).toMatch(/air range/i);
    expect(artilleryNextSortieTip({ mode: 'bot', difficulty: 'standard', won: false, accuracy: 75, specialRounds: 0 })).toMatch(/Drill.*Rampart/i);
    expect(artilleryNextSortieTip({ mode: 'bot', difficulty: 'rookie', won: true, accuracy: 75, specialRounds: 2 })).toMatch(/Standard/i);
    expect(artilleryNextSortieTip({ mode: 'range', difficulty: 'standard', won: true, accuracy: 80, specialRounds: 2 })).toMatch(/damage record/i);
  });
  it('draws the barrel tip at the physics projectile origin', () => {
    const state = createArtilleryState('muzzle-visual');
    const x = state.tanks.left.x;
    const angle = 52;
    const rigY = ARTILLERY_HEIGHT - terrainHeight(state.terrain, x) - 1.5;
    const tip = artilleryBarrelEndpoint(x, rigY - 1.8, 'left', angle);
    const origin = simulateArtilleryShot(state, { angle, power: 77 }).path[0];
    expect(origin.x).toBeCloseTo(tip.x);
    expect(origin.y).toBeCloseTo(ARTILLERY_HEIGHT - (tip.y - 0.9));
  });
  it('raises and lowers the left barrel with the selected angle', () => {
    const low = artilleryBarrelEndpoint(10, 40, 'left', 10);
    const high = artilleryBarrelEndpoint(10, 40, 'left', 80);

    expect(high.y).toBeLessThan(low.y);
    expect(low.x).toBeGreaterThan(high.x);
  });

  it('mirrors the barrel direction for the right rig', () => {
    const left = artilleryBarrelEndpoint(10, 40, 'left', 45);
    const right = artilleryBarrelEndpoint(90, 40, 'right', 45);

    expect(left.x).toBeGreaterThan(10);
    expect(right.x).toBeLessThan(90);
    expect(left.y).toBeCloseTo(right.y);
  });

  it('maps direct battlefield gestures consistently for either side and field size', () => {
    const shallow = artilleryAimFromDrag(100, 300, 'left', 300, 250, 600);
    const steep = artilleryAimFromDrag(100, 300, 'left', 200, 150, 600);
    const mirrored = artilleryAimFromDrag(500, 300, 'right', 300, 250, 600);
    const halfSize = artilleryAimFromDrag(50, 150, 'left', 150, 125, 300);

    expect(shallow).not.toBeNull();
    expect(steep).not.toBeNull();
    expect(mirrored).not.toBeNull();
    expect(halfSize).not.toBeNull();
    if (!shallow || !steep || !mirrored || !halfSize) return;
    expect(steep.angle).toBeGreaterThan(shallow.angle);
    expect(shallow.power).toBeGreaterThan(15);
    expect(mirrored).toEqual(shallow);
    expect(halfSize.angle).toBe(shallow.angle);
    expect(Math.abs(halfSize.power - shallow.power)).toBeLessThanOrEqual(1);
  });

  it('ignores taps, micro-drags, and swipes away from the playable direction', () => {
    expect(artilleryAimFromDrag(100, 300, 'left', 100, 300, 600)).toBeNull();
    expect(artilleryAimFromDrag(100, 300, 'left', 106, 295, 600)).toBeNull();
    expect(artilleryAimFromDrag(100, 300, 'left', 60, 250, 600)).toBeNull();
    expect(artilleryAimFromDrag(500, 300, 'right', 540, 250, 600)).toBeNull();
    expect(artilleryAimFromDrag(100, 300, 'left', 200, 340, 600)).toBeNull();
  });

  it('interpolates between simulation samples instead of snapping on redraws', () => {
    const path = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }];
    expect(artilleryFlightSample(path, 3, 0.25).point).toEqual({ x: 5, y: 5 });
    expect(artilleryFlightSample(path, 3, 0.5).point).toEqual({ x: 10, y: 10 });
    expect(artilleryFlightSample(path, 3, 0.75).point).toEqual({ x: 15, y: 5 });
    expect(artilleryFlightSample(path, 3, 1).arrived).toBe(true);
  });

  it('shows only a short projectile tail instead of tracing the whole ballistic arc', () => {
    const path = Array.from({ length: 50 }, (_, x) => ({ x, y: x }));
    expect(artilleryFlightTrail(path)).toHaveLength(12);
    expect(artilleryFlightTrail(path)[0]).toEqual({ x: 38, y: 38 });
  });

  it('starts the first detonation during flight while later projectiles remain airborne', () => {
    const duration = 3_600;
    expect(artilleryProjectileImpactState(23, 54, duration, 'flight', 0.4)).toBeNull();
    const early = artilleryProjectileImpactState(23, 54, duration, 'flight', 0.5);
    expect(early?.phase).toBe('impact');
    expect(early?.progress).toBeGreaterThan(0);
    expect(artilleryProjectileImpactState(54, 54, duration, 'flight', 0.5)).toBeNull();
    expect(artilleryProjectileImpactState(54, 54, duration, 'impact', 0)?.phase).toBe('impact');
  });

  it('makes low-gravity flights visibly floatier than heavy-gravity flights', () => {
    expect(artilleryFlightDurationMs(50, 0.86, 'shell')).toBeGreaterThan(artilleryFlightDurationMs(50, 1.16, 'shell'));
    expect(artilleryFlightDurationMs(50, 0.86, 'shell')).toBeGreaterThan(3_000);
    expect(artilleryFlightDurationMs(50, 1.16, 'lance')).toBeLessThan(artilleryFlightDurationMs(50, 1.16, 'bloom'));
  });

  it('aligns aftermath art to the terrain tangent while clamping extreme cliffs', () => {
    expect(artilleryTerrainSlopeDegrees([10, 10, 10, 10, 10], 2)).toBeCloseTo(0);
    expect(artilleryTerrainSlopeDegrees([4, 7, 10, 13, 16], 2)).toBeLessThan(0);
    expect(Math.abs(artilleryTerrainSlopeDegrees([0, 100, 0], 1))).toBeLessThanOrEqual(52);
  });

  it('keeps a moved rig at its committed launch position after movement ends', () => {
    expect(artilleryMoveAnimationProgress('move', 0, 1)).toBe(0);
    expect(artilleryMoveAnimationProgress('move', 0.5, 1)).toBe(0.5);
    expect(artilleryMoveAnimationProgress('charge', 0, 1)).toBe(1);
    expect(artilleryMoveAnimationProgress('flight', 0.4, 1)).toBe(1);
    expect(artilleryMoveAnimationProgress('impact', 0.9, 1)).toBe(1);
  });

  it('keeps the jet airborne throughout held thrust, including at empty fuel', () => {
    expect(artilleryJetFlightY(80, 0, 100)).toBe(80);
    const halfway = artilleryJetFlightY(80, 50, 100);
    expect(halfway).toBeLessThan(45);
    expect(artilleryJetFlightY(80, 100, 100)).toBeLessThan(halfway);
    expect(artilleryJetFlightY(80, 150, 100)).toBe(artilleryJetFlightY(80, 100, 100));
  });

  it('holds the battlefield intact for the impact freeze before revealing damage', () => {
    expect(artilleryImpactRevealProgress(0)).toBe(0);
    expect(artilleryImpactRevealProgress(0.16)).toBe(0);
    expect(artilleryImpactRevealProgress(0.18)).toBeLessThan(0.01);
    expect(artilleryImpactRevealProgress(0.45)).toBeGreaterThan(0.5);
    expect(artilleryImpactRevealProgress(0.7)).toBe(1);
  });

  it('carries launch energy and recoil continuously into the opening flight frames', () => {
    const charged = artilleryLaunchVisualState('charge', 1);
    const released = artilleryLaunchVisualState('flight', 0);
    expect(released.opacity).toBe(charged.opacity);
    expect(released.expansion).toBe(charged.expansion);
    expect(released.recoil).toBe(charged.recoil);
    expect(artilleryLaunchVisualState('flight', 0.14).opacity).toBe(0);
  });

  it('grows impact smoke before the blast ends and preserves it across the settle boundary', () => {
    const impactEnd = artilleryImpactVisualState('impact', 1);
    const settleStart = artilleryImpactVisualState('settle', 0);
    expect(impactEnd.blastOpacity).toBe(0);
    expect(settleStart.smokeAge).toBeCloseTo(impactEnd.smokeAge, 2);
    expect(settleStart.smokeOpacity).toBe(impactEnd.smokeOpacity);
    expect(settleStart.dustOpacity).toBe(impactEnd.dustOpacity);
    expect(artilleryImpactVisualState('settle', 1).smokeOpacity).toBeGreaterThan(0);
  });

  it('tracks cinematic shots vertically and returns to the full battlefield at rest', () => {
    expect(artilleryCinematicCamera(360, false, null, 180, 52)).toBe('0 -38 360 148');
    expect(artilleryCinematicCamera(360, false, 'charge', 90, 72, 0)).toBe('0 -38 360 148');
    expect(artilleryCinematicCamera(360, false, 'charge', 90, 72, 0.45)).not.toBe('0 -38 360 148');
    const chargeEnd = artilleryCinematicCamera(360, false, 'charge', 90, 72, 1, 90, 72);
    const flightStart = artilleryCinematicCamera(360, false, 'flight', 90, 72, 0, 90, 72);
    expect(flightStart).toBe(chargeEnd);
    const flight = artilleryCinematicCamera(360, false, 'flight', 220, -90).split(' ').map(Number);
    expect(flight[0]).toBeGreaterThan(0);
    expect(flight[1]).toBeLessThan(-38);
    expect(flight[2]).toBeLessThan(360);
    const impact = artilleryCinematicCamera(360, false, 'impact', 300, 82).split(' ').map(Number);
    expect(impact[2]).toBe(230);
    expect(impact[3]).toBe(112);
    expect(artilleryCinematicCamera(360, false, 'settle', 300, 82, 0.2)).toBe(artilleryCinematicCamera(360, false, 'impact', 300, 82));
    expect(artilleryCinematicCamera(360, false, 'settle', 300, 82, 1)).toBe('0 -38 360 148');
  });

  it('gives a phone a readable local battlefield and tracks either rig', () => {
    const left = artilleryCinematicCamera(440, true, null, 60, 55, 1, 60, 55, 0.8).split(' ').map(Number);
    const right = artilleryCinematicCamera(440, true, null, 380, 55, 1, 380, 55, 0.8).split(' ').map(Number);
    expect(left[2]).toBeLessThan(140);
    expect(left[2] / left[3]).toBeCloseTo(0.8);
    expect(right[0]).toBeGreaterThan(left[0] + 200);
  });

  it('names a shot result while it resolves instead of leaving an unexplained marker', () => {
    const state = createArtilleryState('shot-verdict');
    const baseline = simulateArtilleryShot(state, { angle: 45, power: 70 });
    expect(artilleryShotVerdict({ ...baseline, damage: 18, guardAbsorbed: 6, directHit: true }, 50, 310)).toEqual({
      title: '18 hull damage',
      detail: 'Direct hit · 6 absorbed by cover',
    });
    expect(artilleryShotVerdict({ ...baseline, coverGranted: 24 }, 50, 310)).toEqual({
      title: 'Cover forged',
      detail: '24 guard until you move or take a hit',
    });
    expect(artilleryShotVerdict({ ...baseline, damage: 0, guardAbsorbed: 17 }, 50, 310).title).toBe('Cover held');
    expect(artilleryShotVerdict({ ...baseline, impact: { x: 54, y: 25 } }, 50, 310)).toEqual({
      title: 'Muzzle blocked', detail: 'Nearby ridge intercepted the shot · raise the barrel or jump-jet clear',
    });
    expect(artilleryShotVerdict({ ...baseline, damage: 69, directHit: true }, 50, 310, 46)).toEqual({
      title: '46 hull damage', detail: 'Direct hit · Rig disabled',
    });
    expect(artilleryShotVerdict({ ...baseline, impact: { x: 240, y: 25 } }, 50, 310)).toEqual({
      title: 'Landed short', detail: 'About 70 units short · clear the ridge or add power',
    });
    expect(artilleryShotVerdict({ ...baseline, impact: { x: 350, y: 25 } }, 50, 310)).toEqual({
      title: 'Landed long', detail: 'About 40 units long · ease power or lower the arc',
    });
  });

  it('offers explicit one-step corrections with a readable value and guidance', async () => {
    const onChange = vi.fn();
    render(createElement(CommandMeter, {
      label: 'Angle', value: 45, suffix: '°', min: 10, max: 80,
      disabled: false, guidance: 'Balanced arc', decreaseKey: 'S', increaseKey: 'W', kind: 'angle', side: 'left', onChange,
    }));

    expect(screen.getByText('45°')).toBeInTheDocument();
    expect(screen.getByText('Balanced arc')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Angle 45°' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aim barrel left' }));
    await userEvent.click(screen.getByRole('button', { name: 'Aim barrel right' }));
    expect(onChange).toHaveBeenNthCalledWith(1, 46);
    expect(onChange).toHaveBeenNthCalledWith(2, 44);
  });

  it('makes world, range, mode, and difficulty explicit setup choices', async () => {
    const onWorld = vi.fn();
    const onMapSize = vi.fn();
    const onStart = vi.fn();
    render(createElement(ArtillerySetup, {
      mode: 'bot', difficulty: 'standard', mapSize: 'standard', world: 'stonera',
      onMode: vi.fn(), onDifficulty: vi.fn(), onMapSize, onWorld, onStart,
    }));

    expect(screen.getByRole('heading', { name: /Choose your battlefield/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stonera.*Cratered ridges/i })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: /Endessa.*Rolling glass dunes/i }));
    await userEvent.click(screen.getByRole('button', { name: /Wide.*440 units/i }));
    await userEvent.click(screen.getByRole('button', { name: /Start match/i }));
    expect(onWorld).toHaveBeenCalledWith('endessa');
    expect(onMapSize).toHaveBeenCalledWith('wide');
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('mirrors barrel arrow adjustments for the right-side rig', async () => {
    const onChange = vi.fn();
    render(createElement(CommandMeter, {
      label: 'Barrel', value: 45, suffix: '°', min: 10, max: 80,
      disabled: false, guidance: 'Balanced arc', decreaseKey: 'S', increaseKey: 'W', kind: 'angle', side: 'right', onChange,
    }));

    await userEvent.click(screen.getByRole('button', { name: 'Aim barrel left' }));
    await userEvent.click(screen.getByRole('button', { name: 'Aim barrel right' }));
    expect(onChange).toHaveBeenNthCalledWith(1, 44);
    expect(onChange).toHaveBeenNthCalledWith(2, 46);
  });

  it('keeps every tactical action in the game surface instead of a detached form', () => {
    render(createElement(ArtilleryBoard, {
      seed: 'component-actions',
      mode: 'bot',
      difficulty: 'standard',
      mapSize: 'standard',
      world: 'stonera',
      onStatus: vi.fn(),
      onComplete: vi.fn(),
      onRematch: vi.fn(),
    }));

    expect(screen.getByRole('img', { name: /drag up and outward/i })).toBeInTheDocument();
    for (const payload of ['Comet', 'Razor', 'Drill', 'Starfall', 'Rampart', 'Sunspike']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${payload}\\b`, 'i') })).toBeEnabled();
    }
    expect(screen.getByRole('button', { name: /Fire Comet/i })).toBeEnabled();
    expect(screen.getByText(/Gravity 0\.86× · wind 1\.0×/i)).toBeInTheDocument();
    expect(screen.getByText(/Drive goes farther · jet clears walls/i)).toBeInTheDocument();
    expect(screen.getByText('Comet shell')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Two mobile range rigs on Stonera/i })).toHaveAttribute('viewBox', '0 -38 360 148');
    expect(screen.getByRole('button', { name: /Enable artillery audio/i })).toBeInTheDocument();
    expect(screen.queryByText(/Codazzo|Terragoyle|creature ability/i)).not.toBeInTheDocument();
  });

  it('keeps fire, weapon selection, and mobility reachable below a phone battlefield', async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width: 600px'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    try {
      render(createElement(ArtilleryBoard, {
        seed: 'mobile-command', mode: 'bot', difficulty: 'standard', mapSize: 'wide', world: 'stonera',
        onStatus: vi.fn(), onComplete: vi.fn(), onRematch: vi.fn(),
      }));
      expect(screen.getByTestId('artillery-mobile-actions')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Artillery field' }).parentElement).toHaveAttribute('data-artillery-seed', 'mobile-command');
      expect(screen.getByRole('button', { name: /Launch selected Comet/i })).toBeEnabled();
      expect(screen.getByTestId('artillery-mobile-overview')).toBeInTheDocument();
      expect(screen.getByTestId('artillery-rangefinder')).toHaveTextContent('Rival ~250u');
      expect(screen.getByTestId('artillery-nominal-reach-marker')).toBeInTheDocument();
      expect(screen.getByTestId('artillery-mobile-overview')).toHaveAttribute('viewBox', '0 0 440 78');
      expect(screen.getByRole('img', { name: /Two mobile range rigs/i }).getAttribute('viewBox')?.split(' ')[2]).not.toBe('440');
      await userEvent.click(screen.getByRole('button', { name: 'View Rig B' }));
      expect(screen.getByRole('button', { name: 'View Rig B' })).toHaveAttribute('aria-pressed', 'true');
      await userEvent.click(screen.getByRole('button', { name: 'Choose weapon' }));
      expect(screen.getByRole('group', { name: 'Choose a weapon' })).toHaveClass('grid');
      await userEvent.click(screen.getByRole('button', { name: /^Razor 2/i }));
      expect(screen.getByRole('button', { name: /Launch selected Razor/i })).toBeEnabled();
      await userEvent.click(screen.getByRole('button', { name: 'Show mobility controls' }));
      expect(screen.getByRole('group', { name: 'Mobility thrusters' })).toHaveClass('grid');
    } finally {
      window.matchMedia = original;
    }
  });

  it('commits movement immediately instead of previewing a firing position', async () => {
    const onStatus = vi.fn();
    render(createElement(ArtilleryBoard, {
      seed: 'component-preview',
      mode: 'bot',
      difficulty: 'standard',
      mapSize: 'standard',
      world: 'stonera',
      onStatus,
      onComplete: vi.fn(),
      onRematch: vi.fn(),
    }));

    const drive = screen.getByRole('button', { name: /Hold to drive forward/i });
    fireEvent.pointerDown(drive, { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 });
    fireEvent.pointerUp(drive, { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 });
    expect(screen.getByText('99%')).toBeInTheDocument();
    expect(screen.queryByTestId('artillery-move-preview')).not.toBeInTheDocument();
    expect(onStatus).toHaveBeenCalledWith(expect.stringMatching(/Drive engaged/i));
  });

  it('spends progressively more mobility fuel while thrust is held', () => {
    vi.useFakeTimers();
    try {
      render(createElement(ArtilleryBoard, {
        seed: 'component-held-thrust',
        mode: 'bot',
        difficulty: 'standard',
        mapSize: 'standard',
        world: 'stonera',
        onStatus: vi.fn(),
        onComplete: vi.fn(),
        onRematch: vi.fn(),
      }));
      const drive = screen.getByRole('button', { name: /Hold to drive forward/i });
      fireEvent.pointerDown(drive, { pointerId: 2, pointerType: 'mouse', isPrimary: true, button: 0 });
      act(() => vi.advanceTimersByTime(960));
      fireEvent.pointerUp(drive, { pointerId: 2, pointerType: 'mouse', isPrimary: true, button: 0 });
      const remaining = Number(screen.getAllByText(/%$/)[0].textContent?.replace('%', ''));
      expect(remaining).toBeLessThan(88);
      expect(remaining).toBeGreaterThan(70);
      expect(screen.getByRole('button', { name: /Fire Comet/i })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the rig airborne after jet release until its landing animation finishes', () => {
    vi.useFakeTimers();
    try {
      render(createElement(ArtilleryBoard, {
        seed: 'component-jet-arc',
        mode: 'bot',
        difficulty: 'standard',
        mapSize: 'standard',
        world: 'stonera',
        onStatus: vi.fn(),
        onComplete: vi.fn(),
        onRematch: vi.fn(),
      }));
      const jet = screen.getByRole('button', { name: /Hold to jet forward/i });
      fireEvent.pointerDown(jet, { pointerId: 3, pointerType: 'mouse', isPrimary: true, button: 0 });
      act(() => vi.advanceTimersByTime(800));
      expect(screen.getByTestId('artillery-jet-trajectory')).toBeInTheDocument();
      fireEvent.pointerUp(jet, { pointerId: 3, pointerType: 'mouse', isPrimary: true, button: 0 });
      expect(screen.getByRole('button', { name: /Fire Comet/i })).toBeDisabled();
      act(() => vi.advanceTimersByTime(500));
      expect(screen.queryByTestId('artillery-jet-trajectory')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Fire Comet/i })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('moves from launch lock through impact into persistent battlefield aftermath', () => {
    vi.useFakeTimers();
    try {
      render(createElement(ArtilleryBoard, {
        seed: 'component-cinematic-impact',
        mode: 'range',
        difficulty: 'standard',
        mapSize: 'standard',
        world: 'stonera',
        onStatus: vi.fn(),
        onComplete: vi.fn(),
        onRematch: vi.fn(),
      }));
      fireEvent.click(screen.getByRole('button', { name: /Fire Comet/i }));
      expect(screen.getByTestId('artillery-launch-charge')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /Two mobile range rigs/i })).toHaveAttribute('viewBox', '0 -38 360 148');
      act(() => vi.advanceTimersByTime(500));
      expect(screen.getByRole('img', { name: /Two mobile range rigs/i }).getAttribute('viewBox')).not.toBe('0 -38 360 148');
      act(() => vi.advanceTimersByTime(5_000));
      expect(screen.getByRole('button', { name: /Fire Comet/i })).toBeDisabled();
      act(() => vi.advanceTimersByTime(4_000));
      expect(document.querySelector('.artillery-aftermath')).toBeInTheDocument();
      expect(document.querySelector('.artillery-aftermath .artillery-ember')).toBeNull();
      expect(document.querySelector('.artillery-aftermath .artillery-smoke-cloud, .artillery-aftermath .artillery-smoke-wisp')).toBeNull();
      expect(screen.getByRole('img', { name: /Two mobile range rigs/i })).toHaveAttribute('viewBox', '0 -38 360 148');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps Comet impact art grounded instead of drawing orbital rings', () => {
    vi.useFakeTimers();
    try {
      const seed = 'component-grounded-comet';
      const state = createArtilleryState(seed, 'range', 'standard', { mapSize: 'standard', world: 'stonera' });
      const shot = simulateArtilleryShot(state, { angle: 45, power: 70, payload: 'shell' });
      const duration = artilleryFlightDurationMs(shot.projectiles[0].path.length, 0.86, 'shell');
      render(createElement(ArtilleryBoard, {
        seed,
        mode: 'range',
        difficulty: 'standard',
        mapSize: 'standard',
        world: 'stonera',
        onStatus: vi.fn(),
        onComplete: vi.fn(),
        onRematch: vi.fn(),
      }));
      fireEvent.click(screen.getByRole('button', { name: /Fire Comet/i }));
      act(() => vi.advanceTimersByTime(900 + duration + 320));
      const impact = screen.getByTestId('artillery-impact-shell');
      expect(impact.querySelector('[data-testid="artillery-impact-ground-shock"]')).toBeInTheDocument();
      expect(impact.querySelector('ellipse, circle[stroke-dasharray]')).toBeNull();
      expect(impact.querySelectorAll('path').length).toBeGreaterThan(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('detonates and reshapes terrain for an early Starfall round while later rounds still fly', () => {
    vi.useFakeTimers();
    try {
      const seed = 'component-staggered-impacts';
      const state = createArtilleryState(seed, 'range', 'standard', { mapSize: 'standard', world: 'stonera' });
      const shot = simulateArtilleryShot(state, { angle: 42, power: 62, payload: 'cluster' });
      const longest = Math.max(...shot.projectiles.map((projectile) => projectile.path.length));
      const first = Math.min(...shot.projectiles.map((projectile) => projectile.path.length));
      const duration = artilleryFlightDurationMs(longest, 0.86, 'cluster');
      render(createElement(ArtilleryBoard, {
        seed,
        mode: 'range',
        difficulty: 'standard',
        mapSize: 'standard',
        world: 'stonera',
        onStatus: vi.fn(),
        onComplete: vi.fn(),
        onRematch: vi.fn(),
      }));
      fireEvent.change(screen.getByRole('slider', { name: /Barrel/i }), { target: { value: '42' } });
      fireEvent.change(screen.getByRole('slider', { name: /Power/i }), { target: { value: '62' } });
      fireEvent.click(screen.getByRole('button', { name: /^Starfall/i }));
      const ground = screen.getByRole('img', { name: /Two mobile range rigs/i }).querySelector('path.fill-s2');
      const before = ground?.getAttribute('d');
      fireEvent.click(screen.getByRole('button', { name: /Fire Starfall/i }));
      act(() => vi.advanceTimersByTime(900 + Math.ceil(duration * (first - 1) / (longest - 1)) + 480));
      expect(screen.getAllByTestId('artillery-impact-cluster').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('artillery-impact-cluster').length).toBeLessThan(shot.projectiles.length);
      const impact = screen.getAllByTestId('artillery-impact-cluster')[0];
      expect(impact.querySelector('g[transform^="rotate("]')).toBeInTheDocument();
      expect(impact.querySelectorAll('circle')).toHaveLength(1);
      expect(impact.querySelectorAll('path').length).toBeGreaterThan(5);
      expect(screen.getAllByTestId('artillery-projectile-cluster').length).toBeGreaterThan(0);
      expect(ground?.getAttribute('d')).not.toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });
});
