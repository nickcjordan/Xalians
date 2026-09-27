import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { catchAtRest, HELD_CLASS } from '../storyCatch';

// The page's scroll is a number here: scrollTo sets it, and a scroll event reads it.
let y = 0;
const REST = 2000;
const scrollTo = vi.fn((o: ScrollToOptions) => {
	y = o.top ?? y;
});
const scrollBy = (to: number) => {
	y = to;
	window.dispatchEvent(new Event('scroll'));
};
const wheel = (deltaY: number) => {
	const e = new WheelEvent('wheel', { deltaY, cancelable: true });
	window.dispatchEvent(e);
	return e;
};
const touch = (type: 'touchstart' | 'touchmove' | 'touchend') => {
	const e = new Event(type) as Event & { touches: unknown[] };
	e.touches = type === 'touchend' ? [] : [{}];
	window.dispatchEvent(e);
};
const held = () => document.documentElement.classList.contains(HELD_CLASS);

let stop: () => void = () => {};
beforeEach(() => {
	vi.useFakeTimers();
	y = 0;
	scrollTo.mockClear();
	vi.stubGlobal('scrollTo', scrollTo);
	vi.stubGlobal('innerHeight', 800);
	Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
});
afterEach(() => {
	stop();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('catchAtRest', () => {
	it('stops a wheel turn that would carry the page past the resting place on it, and holds until the wheel is quiet', () => {
		stop = catchAtRest(() => REST);
		scrollBy(1950);
		const e = wheel(120);
		expect(e.defaultPrevented).toBe(true);
		expect(y).toBe(REST);
		// Still turning: held.
		vi.advanceTimersByTime(100);
		expect(wheel(120).defaultPrevented).toBe(true);
		scrollBy(2080); // a smooth turn's tail is pushed back
		expect(y).toBe(REST);
		// Quiet: the next turn goes on.
		vi.advanceTimersByTime(400);
		expect(wheel(120).defaultPrevented).toBe(false);
		scrollBy(2120);
		expect(y).toBe(2120);
	});

	it('catches a fast wheel scroll that is already past it', () => {
		stop = catchAtRest(() => REST);
		scrollBy(1000);
		wheel(600);
		scrollBy(2600);
		expect(y).toBe(REST);
	});

	it('catches a swipe and its glide, and lets go once the finger is up and the glide stopped', () => {
		stop = catchAtRest(() => REST);
		touch('touchstart');
		touch('touchmove');
		scrollBy(1200);
		touch('touchend');
		scrollBy(2300); // the glide
		expect(y).toBe(REST);
		expect(held()).toBe(true);
		vi.advanceTimersByTime(400);
		expect(held()).toBe(false);
		// The next swipe goes on.
		touch('touchstart');
		touch('touchmove');
		scrollBy(2600);
		expect(y).toBe(2600);
	});

	it('holds while the finger stays down, however long', () => {
		stop = catchAtRest(() => REST);
		touch('touchstart');
		touch('touchmove');
		scrollBy(2100);
		vi.advanceTimersByTime(5000);
		expect(held()).toBe(true);
		touch('touchend');
		vi.advanceTimersByTime(400);
		expect(held()).toBe(false);
	});

	it('holds for as long as the wheel keeps turning, however long, and takes the scroll away meanwhile', () => {
		stop = catchAtRest(() => REST);
		scrollBy(1950);
		wheel(120);
		expect(held()).toBe(true);
		for (let i = 0; i < 100; i++) {
			vi.advanceTimersByTime(200);
			wheel(120);
			scrollBy(REST + 120);
			expect(y).toBe(REST);
		}
		expect(held()).toBe(true);
		// A complete stop, then the next turn goes on.
		vi.advanceTimersByTime(400);
		expect(held()).toBe(false);
		wheel(120);
		scrollBy(2120);
		expect(y).toBe(2120);
	});

	it('does not let go when a busy main thread delays its quiet check past turns still queued', () => {
		stop = catchAtRest(() => REST);
		scrollBy(1950);
		wheel(120);
		// The main thread is busy for over a second: the check runs late, before the queued turns are heard.
		vi.setSystemTime(Date.now() + 1200);
		vi.advanceTimersByTime(300);
		expect(held()).toBe(true);
		wheel(120);
		vi.advanceTimersByTime(200);
		expect(held()).toBe(true);
		vi.advanceTimersByTime(400);
		expect(held()).toBe(false);
	});

	it('lets a jump through: no wheel, swipe or key behind it (a link, the scrollbar, find in page)', () => {
		stop = catchAtRest(() => REST);
		scrollBy(4000);
		expect(y).toBe(4000);
		// A tap is not a swipe.
		scrollBy(0);
		touch('touchstart');
		touch('touchend');
		scrollBy(4000);
		expect(y).toBe(4000);
	});

	it('lets End through even right after a wheel turn', () => {
		stop = catchAtRest(() => REST);
		scrollBy(1000);
		window.dispatchEvent(new WheelEvent('wheel', { deltaY: 10 }));
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
		scrollBy(9000);
		expect(y).toBe(9000);
	});

	it('catches once per trip down, never on the way up, and again after the reader goes back above it', () => {
		stop = catchAtRest(() => REST);
		scrollBy(1950);
		wheel(120);
		vi.advanceTimersByTime(400);
		wheel(120);
		scrollBy(3000);
		expect(y).toBe(3000);
		// Up past it: not caught.
		wheel(-120);
		scrollBy(1900);
		expect(y).toBe(1900);
		// Only half a screen above it arms it again.
		wheel(120);
		scrollBy(2200);
		expect(y).toBe(2200);
		wheel(-120);
		scrollBy(1500);
		wheel(120);
		scrollBy(2300);
		expect(y).toBe(REST);
	});

	it('is not armed when the page opens below it', () => {
		y = 5000;
		stop = catchAtRest(() => REST);
		wheel(-120);
		scrollBy(4000);
		expect(y).toBe(4000);
	});

	it('puts the hold back on for a turn made before the let-go but heard after it', () => {
		const onHold = vi.fn();
		stop = catchAtRest(() => REST, onHold);
		scrollBy(1950);
		wheel(120);
		expect(onHold).toHaveBeenLastCalledWith(true);
		vi.advanceTimersByTime(400);
		expect(onHold).toHaveBeenLastCalledWith(false);
		// Queued behind a busy browser: made before the let-go.
		const late = new WheelEvent('wheel', { deltaY: 120 });
		Object.defineProperty(late, 'timeStamp', { value: performance.now() - 300 });
		y = 2120;
		window.dispatchEvent(late);
		expect(held()).toBe(true);
		expect(y).toBe(REST);
		vi.advanceTimersByTime(400);
		// A new turn, made after the let-go, goes on.
		const next = new WheelEvent('wheel', { deltaY: 120 });
		Object.defineProperty(next, 'timeStamp', { value: performance.now() + 10 });
		window.dispatchEvent(next);
		scrollBy(2120);
		expect(y).toBe(2120);
	});

	it('takes everything away when stopped', () => {
		stop = catchAtRest(() => REST);
		touch('touchstart');
		touch('touchmove');
		scrollBy(2100);
		expect(held()).toBe(true);
		stop();
		stop = () => {};
		expect(held()).toBe(false);
		scrollBy(2500);
		expect(y).toBe(2500);
	});
});
