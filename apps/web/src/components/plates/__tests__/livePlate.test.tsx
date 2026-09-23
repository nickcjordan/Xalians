import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { LivePlate } from '../livePlate';
import { resetStage } from '../plateStage';

const FRAGMENT =
	'<svg class="defs" id="layer-defs" width="0" height="0"><defs/></svg><svg class="layer" id="layer-a" viewBox="0 0 1536 768"><rect width="10" height="10"/></svg><svg class="layer" id="layer-b" viewBox="0 0 1536 768"><rect width="10" height="10"/></svg><div class="surface paper"></div>';

type Entry = { isIntersecting: boolean; intersectionRatio: number };
type Cb = (entries: Entry[]) => void;
type Obs = { cb: Cb; el: Element | null; near: boolean };
const observers: Obs[] = [];

class FakeIO {
	o: Obs;
	constructor(cb: Cb, opts?: { rootMargin?: string }) {
		this.o = { cb, el: null, near: Boolean(opts && opts.rootMargin) };
		observers.push(this.o);
	}
	observe(el: Element) {
		this.o.el = el;
	}
	disconnect() {}
	unobserve() {}
}

// Report how much of the plate rendered in `container` is in view.
function show(container: HTMLElement, ratio: number) {
	const host = container.querySelector('.live-plate-host');
	const seen = observers.filter((o) => !o.near && o.el === host);
	act(() => seen.forEach((o) => o.cb([{ isIntersecting: ratio > 0, intersectionRatio: ratio }])));
}

const poster = { src: '/p.jpg', small: '/p-768.jpg', alt: 'A warship falls.' };
const layers = (c: HTMLElement) => c.querySelectorAll('svg.layer').length;

describe('LivePlate', () => {
	beforeEach(() => {
		observers.length = 0;
		resetStage();
		vi.stubGlobal('IntersectionObserver', FakeIO);
		vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve(FRAGMENT) })));
		(SVGSVGElement.prototype as unknown as { pauseAnimations: () => void }).pauseAnimations = vi.fn();
		(SVGSVGElement.prototype as unknown as { unpauseAnimations: () => void }).unpauseAnimations = vi.fn();
		(SVGSVGElement.prototype as unknown as { setCurrentTime: (t: number) => void }).setCurrentTime = vi.fn();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shows the poster and puts no SVG in the page until the plate is in view', () => {
		const { container } = render(<LivePlate src="/assets/plates/x/plate.html" poster={poster} />);
		expect(screen.getByAltText(poster.alt)).toBeTruthy();
		expect(fetch).not.toHaveBeenCalled();
		expect(layers(container)).toBe(0);
	});

	it('goes live in view: injects the fragment, seeks it to its first frame and plays it', async () => {
		const { container } = render(<LivePlate src="/assets/plates/x/plate.html" poster={poster} />);
		show(container, 0.6);
		await waitFor(() => expect(container.querySelector('[data-live-plate="ready"]')).toBeTruthy());
		expect(fetch).toHaveBeenCalledWith('/assets/plates/x/plate.html');
		expect(layers(container)).toBe(2);
		const seek = SVGSVGElement.prototype.setCurrentTime as unknown as ReturnType<typeof vi.fn>;
		expect(seek).toHaveBeenCalledWith(0);
		// both layers and the defs sheet, whose animated filters keep their own clock
		const play = SVGSVGElement.prototype.unpauseAnimations as unknown as ReturnType<typeof vi.fn>;
		expect(play).toHaveBeenCalledTimes(3);
		expect(play.mock.instances).toContain(container.querySelector('svg.defs'));
	});

	it('keeps only one plate live: the one most in view has its SVG, the other none', async () => {
		const a = render(<LivePlate src="/assets/plates/a/plate.html" poster={poster} />);
		const b = render(<LivePlate src="/assets/plates/b/plate.html" poster={poster} />);
		show(a.container, 0.7);
		show(b.container, 0.2);
		await waitFor(() => expect(layers(a.container)).toBe(2));
		expect(layers(b.container)).toBe(0);
		// scrolling on: b becomes the plate most in view, a leaves the DOM
		show(b.container, 0.9);
		show(a.container, 0.1);
		await waitFor(() => expect(layers(b.container)).toBe(2));
		expect(layers(a.container)).toBe(0);
		expect(a.container.querySelector('[data-live-plate="poster"]')).toBeTruthy();
		// scrolling back re-injects a from the cached fragment, with no second request
		show(a.container, 0.95);
		show(b.container, 0);
		await waitFor(() => expect(layers(a.container)).toBe(2));
		expect(layers(b.container)).toBe(0);
		expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.filter((c) => c[0] === '/assets/plates/a/plate.html')).toHaveLength(1);
	});

	it('does not swap between two plates that are nearly equally in view', async () => {
		const a = render(<LivePlate src="/assets/plates/a/plate.html" poster={poster} />);
		const b = render(<LivePlate src="/assets/plates/b/plate.html" poster={poster} />);
		show(a.container, 0.5);
		await waitFor(() => expect(layers(a.container)).toBe(2));
		show(b.container, 0.55);
		await new Promise((r) => setTimeout(r, 0));
		expect(layers(a.container)).toBe(2);
		expect(layers(b.container)).toBe(0);
	});

	it('takes the plate off the page when nothing is in view', async () => {
		const { container } = render(<LivePlate src="/assets/plates/x/plate.html" poster={poster} />);
		show(container, 0.6);
		await waitFor(() => expect(layers(container)).toBe(2));
		show(container, 0);
		await waitFor(() => expect(layers(container)).toBe(0));
	});

	it('keeps the poster when the fetch fails', async () => {
		vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') })));
		const { container } = render(<LivePlate src="/assets/plates/x/plate.html" poster={poster} />);
		show(container, 0.6);
		await new Promise((r) => setTimeout(r, 0));
		expect(container.querySelector('[data-live-plate="poster"]')).toBeTruthy();
		expect(layers(container)).toBe(0);
	});

	it('follows its page when told which plate is live, with no observer of its own', async () => {
		const { container, rerender } = render(<LivePlate src="/assets/plates/x/plate.html" poster={poster} active={false} />);
		expect(observers).toHaveLength(0);
		expect(layers(container)).toBe(0);
		rerender(<LivePlate src="/assets/plates/x/plate.html" poster={poster} active />);
		await waitFor(() => expect(layers(container)).toBe(2));
		rerender(<LivePlate src="/assets/plates/x/plate.html" poster={poster} active={false} />);
		await waitFor(() => expect(layers(container)).toBe(0));
		expect(container.querySelector('[data-live-plate="poster"]')).toBeTruthy();
	});
});
