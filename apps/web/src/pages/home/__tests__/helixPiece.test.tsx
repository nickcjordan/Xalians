import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HelixDrawing, HelixPiece, loopAt } from '../helixPiece';

// The helix pieces play on their own clock, never the scroll's. jsdom has no
// animation frames worth trusting, so the clock is checked through loopAt and
// the drawing through the first and last frames.
// The chip is the group inside the whole piece's group.
const chipOpacity = (c: HTMLElement) => Number(c.querySelector('g[opacity] g[opacity]')?.getAttribute('opacity'));

describe('loopAt', () => {
	it('fades in at the first frame, plays, holds the last, and fades out before it repeats', () => {
		expect(loopAt('plague', 0)).toEqual({ t: 0, fade: 0 });
		expect(loopAt('plague', 0.6).fade).toBeCloseTo(1);
		expect(loopAt('plague', 1.5)).toEqual({ t: 0, fade: 1 });
		const mid = loopAt('plague', 0.6 + 1.2 + 3.2);
		expect(mid.t).toBeCloseTo(0.5);
		expect(loopAt('plague', 0.6 + 1.2 + 6.4 + 1)).toEqual({ t: 1, fade: 1 });
		const out = loopAt('plague', 0.6 + 1.2 + 6.4 + 1.8 + 0.35);
		expect(out.t).toBe(1);
		expect(out.fade).toBeCloseTo(0.5);
		// One period later it is back where it began.
		expect(loopAt('plague', 10.7)).toEqual(loopAt('plague', 0));
	});
});

describe('HelixDrawing', () => {
	it('holds its first frame until it is live: the plague piece whole, the token chip not yet sealed', () => {
		const plague = render(<HelixDrawing mode="plague" live={false} label="The plague" />);
		expect(plague.container.querySelector('svg')).toHaveAttribute('aria-label', 'The plague');
		const lines = [...plague.container.querySelectorAll('line')].map((l) => Number(l.getAttribute('opacity')));
		expect(lines.every((o) => o > 0)).toBe(true);
		const token = render(<HelixDrawing mode="token" live={false} label="The token" />);
		expect(chipOpacity(token.container)).toBe(0);
	});

	it('rests on its last frame when it will never play', () => {
		const { container } = render(<HelixDrawing mode="token" live={undefined} label="The token" />);
		expect(chipOpacity(container)).toBe(1);
	});
});

describe('HelixPiece', () => {
	it('keeps its box and, near the screen, a drawing that holds still until it holds the stage', () => {
		// jsdom has no IntersectionObserver: the piece counts as near and never live.
		const { container } = render(<HelixPiece mode="plague" label="The plague" />);
		const box = container.querySelector('[data-piece="plague"]') as HTMLElement;
		expect(box).toHaveClass('aspect-video');
		expect(box).not.toHaveAttribute('data-live');
		expect(box.querySelector('svg')).toHaveAttribute('aria-label', 'The plague');
	});
});
