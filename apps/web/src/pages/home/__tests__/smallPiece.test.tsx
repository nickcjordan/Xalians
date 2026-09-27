import * as React from 'react';
import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { SmallPiece } from '../pieces/smallPiece';
import { PIECES } from '../pieces/pieces';
import { frontAt, PAIRS, plagueLook, PLAGUE_LOOP } from '../pieces/plague';

// The small pieces draw on a canvas (jsdom has none to read back), so what they show is checked as data:
// the plague's reach along the helix, and each piece's clock and resting frame.

beforeAll(() => {
	HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
});

const fallen = (t: number) => Array.from({ length: PAIRS }, (_, i) => plagueLook(i, t, t)).filter((L) => L.alpha < 0.05).length;

describe('the plague', () => {
	it('reaches the helix from one end and leaves a short broken length at the other', () => {
		expect(fallen(1)).toBe(0);
		expect(frontAt(0)).toBeLessThan(0);
		expect(fallen(PLAGUE_LOOP - 1)).toBeGreaterThan(PAIRS / 3);
		expect(fallen(PLAGUE_LOOP - 1)).toBeLessThan(PAIRS - 8);
		// The far end is still whole and its own color.
		const last = plagueLook(PAIRS - 1, PLAGUE_LOOP - 1, 0);
		expect(last.alpha).toBe(1);
		expect(last.fell).toBe(0);
	});

	it('keeps what has let go falling after the front stops', () => {
		const early = plagueLook(0, 9, 9).fell ?? 0;
		const later = plagueLook(0, 10, 10).fell ?? 0;
		expect(later - early).toBeCloseTo(1);
	});
});

describe('SmallPiece', () => {
	it('names what it shows and holds its first moment until it is live', () => {
		const { container } = render(<SmallPiece piece="plague" live={false} label="The plague" />);
		expect(container.querySelector('[role="img"]')).toHaveAttribute('aria-label', 'The plague');
		expect(container.querySelector('[data-piece-live]')).toHaveAttribute('data-piece-live', 'false');
	});

	it('rests on its telling moment when it will never play', () => {
		for (const key of ['forms', 'apex', 'plague', 'token'] as const) {
			const def = PIECES[key];
			expect(def.rest).toBeGreaterThan(0);
			expect(def.rest).toBeLessThan(def.loop - 1);
			const { container } = render(<SmallPiece piece={key} live={undefined} label={key} />);
			expect(container.querySelector('[data-piece-live]')).toHaveAttribute('data-piece-live', 'false');
		}
	});
});
