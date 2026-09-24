import * as React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { HelixPiece } from '../helixPiece';
import { SceneTime } from '../storyStage';

// The helix pieces draw straight to the DOM from their stretch of the scroll.
// jsdom has no layout, but it keeps attributes, so a frame can be read back.
const opacities = (c: HTMLElement) => [...c.querySelectorAll('line')].map((l) => Number(l.getAttribute('opacity')));

describe('HelixPiece', () => {
	it('draws the plague reaching the helix as its time moves, and back again', () => {
		const time = new SceneTime();
		const { container } = render(<HelixPiece mode="plague" live={false} time={time} label="The plague" />);
		expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'The plague');
		const whole = opacities(container);
		expect(whole.every((o) => o > 0)).toBe(true);
		act(() => time.set(1));
		// At the end most of it has fallen away: a short length is left.
		const gone = opacities(container).filter((o) => o < 0.02).length;
		expect(gone).toBeGreaterThan(whole.length / 2);
		act(() => time.set(0));
		expect(opacities(container)).toEqual(whole);
	});

	it('seals the token chip only at the end of its stretch', () => {
		const time = new SceneTime();
		const { container } = render(<HelixPiece mode="token" live={false} time={time} label="The token" />);
		const chip = () => Number(container.querySelector('g[opacity]')?.getAttribute('opacity'));
		expect(chip()).toBe(0);
		act(() => time.set(1));
		expect(chip()).toBe(1);
	});

	it('rests on its last frame when it has no stage time (stacked)', () => {
		const { container } = render(<HelixPiece mode="token" live={undefined} label="The token" />);
		expect(Number(container.querySelector('g[opacity]')?.getAttribute('opacity'))).toBe(1);
	});
});
