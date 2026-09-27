import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Starfield } from '../starfield';

// The sky behind the hero fades out as the page scrolls; once it is gone its drift must stop, not just hide.
let y = 0;
const scrollTo = (to: number) => {
	y = to;
	act(() => {
		window.dispatchEvent(new Event('scroll'));
		vi.runAllTimers();
	});
};

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('Starfield', () => {
	it('is idle (hidden, its drift paused) once scrolled away, and drifts again when the hero is back', () => {
		vi.useFakeTimers();
		vi.stubGlobal('innerHeight', 800);
		vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0) as unknown as number);
		Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
		const { container } = render(<Starfield />);
		const sky = container.querySelector<HTMLElement>('.starfield')!;
		expect(sky.dataset.idle).toBeUndefined();
		scrollTo(240);
		expect(Number(sky.style.opacity)).toBe(0.5);
		expect(sky.dataset.idle).toBeUndefined();
		scrollTo(2000);
		expect(sky.style.visibility).toBe('hidden');
		expect(sky.dataset.idle).toBe('');
		scrollTo(0);
		expect(sky.style.visibility).toBe('');
		expect(sky.dataset.idle).toBeUndefined();
	});
});
