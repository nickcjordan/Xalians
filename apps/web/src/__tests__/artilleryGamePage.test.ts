import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ArtilleryBoard, CommandMeter, artilleryAimFromDrag, artilleryBarrelEndpoint } from '../pages/games/artilleryGamePage';

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

  it('mirrors the barrel direction for the right crawler', () => {
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

  it('offers explicit one-step corrections with a readable value and guidance', async () => {
    const onChange = vi.fn();
    render(createElement(CommandMeter, {
      label: 'Angle', value: 45, suffix: '°', min: 10, max: 80,
      disabled: false, guidance: 'Balanced arc', decreaseKey: 'S', increaseKey: 'W', onChange,
    }));

    expect(screen.getByText('45°')).toBeInTheDocument();
    expect(screen.getByText('Balanced arc')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Decrease angle by 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Increase angle by 1' }));
    expect(onChange).toHaveBeenNthCalledWith(1, 44);
    expect(onChange).toHaveBeenNthCalledWith(2, 46);
  });

  it('keeps every tactical action in the game surface instead of a detached form', () => {
    render(createElement(ArtilleryBoard, {
      seed: 'component-actions',
      mode: 'bot',
      difficulty: 'standard',
      onStatus: vi.fn(),
      onComplete: vi.fn(),
      onRematch: vi.fn(),
    }));

    expect(screen.getByRole('img', { name: /drag up and outward/i })).toBeInTheDocument();
    for (const payload of ['Core', 'Fan', 'Bore', 'Cluster', 'Bloom', 'Lance']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${payload}\\b`, 'i') })).toBeEnabled();
    }
    expect(screen.getByRole('button', { name: /Fire Core/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Root.*2/i })).toBeEnabled();
  });

  it('previews movement and crew defense before committing a shot', async () => {
    render(createElement(ArtilleryBoard, {
      seed: 'component-preview',
      mode: 'bot',
      difficulty: 'standard',
      onStatus: vi.fn(),
      onComplete: vi.fn(),
      onRematch: vi.fn(),
    }));

    await userEvent.click(screen.getByRole('button', { name: /Push/i }));
    expect(screen.getByTestId('artillery-move-preview')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Root.*2/i }));
    expect(screen.queryByTestId('artillery-move-preview')).not.toBeInTheDocument();
    expect(screen.getByTestId('artillery-guard-left')).toBeInTheDocument();
  });
});
