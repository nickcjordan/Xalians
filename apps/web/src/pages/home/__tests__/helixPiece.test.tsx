import * as React from 'react';
import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { HelixPiece, frameAt, loopAt } from '../helixPiece';

// The helix pieces play on their own clock, never the scroll's, and draw on a
// canvas (jsdom has none to read back), so the frames are checked as data and
// the chip, which stays SVG, as attributes.
const chipOpacity = (c: HTMLElement) => Number(c.querySelector('svg g[opacity]')?.getAttribute('opacity'));
const RUNG_COUNT = 26;

// jsdom has no canvas; the piece draws nothing there, quietly.
beforeAll(() => {
	HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
});

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

describe('frameAt', () => {
	it('has the plague take the helix from one end: whole at the start, mostly fallen at the end', () => {
		const start = frameAt('plague', 0);
		const end = frameAt('plague', 1);
		const fallen = (f: ReturnType<typeof frameAt>) => Array.from({ length: RUNG_COUNT }, (_, i) => f.rung(i).fall).filter((v) => v >= 1).length;
		expect(fallen(start)).toBe(0);
		expect(fallen(end)).toBeGreaterThan(RUNG_COUNT / 2);
		expect(fallen(end)).toBeLessThan(RUNG_COUNT);
	});

	it('starts the token where the plague ended, and folds the new helix into the chip only at the end', () => {
		expect(frameAt('token', 0).squeeze).toBe(0);
		expect(frameAt('token', 1).squeeze).toBe(1);
		// Locked rungs carry their new pair, never a stained one.
		const done = frameAt('token', 1);
		expect(Array.from({ length: RUNG_COUNT }, (_, i) => done.rung(i).fall).every((v) => v === 0)).toBe(true);
	});
});

describe('HelixPiece', () => {
	it('holds its first frame until it is live: the token chip not yet sealed', () => {
		const plague = render(<HelixPiece mode="plague" live={false} label="The plague" />);
		expect(plague.container.querySelector('[role="img"]')).toHaveAttribute('aria-label', 'The plague');
		expect(plague.container.querySelector('canvas')).toBeInTheDocument();
		const token = render(<HelixPiece mode="token" live={false} label="The token" />);
		expect(chipOpacity(token.container)).toBe(0);
	});

	it('rests on its last frame when it will never play', () => {
		const { container } = render(<HelixPiece mode="token" live={undefined} label="The token" />);
		expect(chipOpacity(container)).toBe(1);
	});
});
