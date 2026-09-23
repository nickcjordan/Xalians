import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LivePlate } from '../livePlate';

const FRAGMENT =
	'<svg class="defs" id="layer-defs" width="0" height="0"><defs/></svg><svg class="layer" id="layer-a" viewBox="0 0 1536 768"><rect width="10" height="10"/></svg><svg class="layer" id="layer-b" viewBox="0 0 1536 768"><rect width="10" height="10"/></svg><div class="surface paper"></div>';

type Cb = (entries: { isIntersecting: boolean }[]) => void;
const observers: { cb: Cb; disconnect: ReturnType<typeof vi.fn> }[] = [];

class FakeIO {
	cb: Cb;
	disconnect = vi.fn();
	observe = vi.fn();
	unobserve = vi.fn();
	constructor(cb: Cb) {
		this.cb = cb;
		observers.push({ cb, disconnect: this.disconnect });
	}
}

const poster = { src: '/p.jpg', small: '/p-768.jpg', alt: 'A warship falls.' };

describe('LivePlate', () => {
	beforeEach(() => {
		observers.length = 0;
		vi.stubGlobal('IntersectionObserver', FakeIO);
		vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve(FRAGMENT) })));
		(SVGSVGElement.prototype as unknown as { pauseAnimations: () => void }).pauseAnimations = vi.fn();
		(SVGSVGElement.prototype as unknown as { unpauseAnimations: () => void }).unpauseAnimations = vi.fn();
		(SVGSVGElement.prototype as unknown as { setCurrentTime: (t: number) => void }).setCurrentTime = vi.fn();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shows the poster and fetches nothing until the plate is near the viewport', () => {
		render(<LivePlate src="/assets/plates/x/plate.html" poster={poster} />);
		expect(screen.getByAltText(poster.alt)).toBeTruthy();
		expect(fetch).not.toHaveBeenCalled();
		expect(observers).toHaveLength(1);
	});

	it('injects the fragment when near, then plays only while visible', async () => {
		const { container } = render(<LivePlate src="/assets/plates/x/plate.html" poster={poster} />);
		observers[0].cb([{ isIntersecting: true }]);
		await waitFor(() => expect(container.querySelector('[data-live-plate="ready"]')).toBeTruthy());
		expect(fetch).toHaveBeenCalledWith('/assets/plates/x/plate.html');
		expect(container.querySelectorAll('svg.layer')).toHaveLength(2);
		// injected paused; the second observer decides when it plays
		const pause = SVGSVGElement.prototype.pauseAnimations as unknown as ReturnType<typeof vi.fn>;
		const play = SVGSVGElement.prototype.unpauseAnimations as unknown as ReturnType<typeof vi.fn>;
		expect(pause).toHaveBeenCalled();
		expect(play).not.toHaveBeenCalled();
		// and seeked to zero, so the still is the plate's composed first frame, not its resting values
		const seek = SVGSVGElement.prototype.setCurrentTime as unknown as ReturnType<typeof vi.fn>;
		expect(seek).toHaveBeenCalledWith(0);
		expect(observers).toHaveLength(2);
		observers[1].cb([{ isIntersecting: true }]);
		// both layers and the defs sheet, whose animated filters keep their own clock
		expect(play).toHaveBeenCalledTimes(3);
		expect(play.mock.instances).toContain(container.querySelector('svg.defs'));
		observers[1].cb([{ isIntersecting: false }]);
		expect(pause.mock.calls.length).toBeGreaterThanOrEqual(6);
	});

	it('keeps the poster when the fetch fails', async () => {
		vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') })));
		const { container } = render(<LivePlate src="/assets/plates/x/plate.html" poster={poster} />);
		observers[0].cb([{ isIntersecting: true }]);
		await new Promise((r) => setTimeout(r, 0));
		expect(container.querySelector('[data-live-plate="poster"]')).toBeTruthy();
		expect(container.querySelectorAll('svg.layer')).toHaveLength(0);
	});
});
