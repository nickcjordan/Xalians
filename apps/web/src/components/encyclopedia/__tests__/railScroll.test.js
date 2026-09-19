import React from 'react';
import { render, cleanup } from '@testing-library/react';
import EraScrubber from '../EraScrubber';
import { centerInRail } from '../railScroll';

afterEach(cleanup);

test('mounting EraScrubber never calls scrollIntoView (issue #423: it must not scroll the page)', () => {
	// jsdom does not implement scrollIntoView at all; define a stub so a spy
	// has something to wrap, matching the real DOM shape the effect checks for.
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = () => {};
	}
	const spy = vi.spyOn(Element.prototype, 'scrollIntoView');
	render(<EraScrubber era={null} onChange={() => {}} />);
	expect(spy).not.toHaveBeenCalled();
	spy.mockRestore();
});

describe('centerInRail', () => {
	function makeRail({ scrollWidth, clientWidth }) {
		const rail = document.createElement('div');
		Object.defineProperty(rail, 'scrollWidth', { value: scrollWidth, configurable: true });
		Object.defineProperty(rail, 'clientWidth', { value: clientWidth, configurable: true });
		rail.scrollLeft = 0;
		return rail;
	}

	function makeButton({ offsetLeft, offsetWidth }) {
		const el = document.createElement('button');
		Object.defineProperty(el, 'offsetLeft', { value: offsetLeft, configurable: true });
		Object.defineProperty(el, 'offsetWidth', { value: offsetWidth, configurable: true });
		return el;
	}

	test('does nothing when the rail has no horizontal overflow', () => {
		const rail = makeRail({ scrollWidth: 300, clientWidth: 300 });
		const btn = makeButton({ offsetLeft: 250, offsetWidth: 40 });
		centerInRail(rail, btn);
		expect(rail.scrollLeft).toBe(0);
	});

	test('centers the element within the rail when it overflows', () => {
		const rail = makeRail({ scrollWidth: 800, clientWidth: 300 });
		const btn = makeButton({ offsetLeft: 500, offsetWidth: 40 });
		centerInRail(rail, btn);
		// 500 - (300 - 40) / 2 = 500 - 130 = 370
		expect(rail.scrollLeft).toBe(370);
	});

	test('clamps the result to a non-negative scrollLeft', () => {
		const rail = makeRail({ scrollWidth: 800, clientWidth: 300 });
		const btn = makeButton({ offsetLeft: 10, offsetWidth: 40 });
		centerInRail(rail, btn);
		expect(rail.scrollLeft).toBe(0);
	});

	test('is a no-op when passed a missing rail or element', () => {
		const rail = makeRail({ scrollWidth: 800, clientWidth: 300 });
		expect(() => centerInRail(null, makeButton({ offsetLeft: 10, offsetWidth: 40 }))).not.toThrow();
		expect(() => centerInRail(rail, null)).not.toThrow();
	});
});
