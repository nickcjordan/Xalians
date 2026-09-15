import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ArtilleryBoard, ArtillerySetup, CommandMeter, artilleryAimFromDrag, artilleryBarrelEndpoint, artilleryFlightFrameIndex, artilleryImpactTerrainFrame, artilleryMoveAnimationProgress } from '../pages/games/artilleryGamePage';

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

  it('advances every fan projectile on the same physics tick', () => {
    expect(artilleryFlightFrameIndex(5, 10, 0.5)).toBe(4);
    expect(artilleryFlightFrameIndex(10, 10, 0.5)).toBe(4);
    expect(artilleryFlightFrameIndex(5, 10, 1)).toBe(4);
  });

  it('keeps a moved rig at its committed launch position after movement ends', () => {
    expect(artilleryMoveAnimationProgress('move', 0, 1)).toBe(0);
    expect(artilleryMoveAnimationProgress('move', 0.5, 1)).toBe(0.5);
    expect(artilleryMoveAnimationProgress('charge', 0, 1)).toBe(1);
    expect(artilleryMoveAnimationProgress('flight', 0.4, 1)).toBe(1);
    expect(artilleryMoveAnimationProgress('impact', 0.9, 1)).toBe(1);
  });

  it('excavates terrain progressively and lands on the exact resulting crater', () => {
    const before = [12, 12, 12];
    const after = [12, 7, 12];

    expect(artilleryImpactTerrainFrame(before, after, 0)).toEqual(before);
    expect(artilleryImpactTerrainFrame(before, after, 0.5)[1]).toBeLessThan(12);
    expect(artilleryImpactTerrainFrame(before, after, 0.5)[1]).toBeGreaterThan(7);
    expect(artilleryImpactTerrainFrame(before, after, 1)).toEqual(after);
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

    expect(screen.getByRole('heading', { name: /Configure Crater Command/i })).toBeInTheDocument();
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
    for (const payload of ['Impact', 'Scatter', 'Breach', 'Fragment', 'Barrier', 'Lance']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${payload}\\b`, 'i') })).toBeEnabled();
    }
    expect(screen.getByRole('button', { name: /Fire Impact/i })).toBeEnabled();
    expect(screen.getByText(/Selected weapon/i)).toBeInTheDocument();
    expect(screen.queryByText(/Codazzo|Terragoyle|creature ability/i)).not.toBeInTheDocument();
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

    await userEvent.click(screen.getByRole('button', { name: /Advance/i }));
    expect(screen.getByText(/Drive 2 · Jet 1/i)).toBeInTheDocument();
    expect(screen.queryByTestId('artillery-move-preview')).not.toBeInTheDocument();
    expect(onStatus).toHaveBeenCalledWith(expect.stringMatching(/Advancing/i));
  });
});
