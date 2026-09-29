import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { StoryViewer, type ViewerBeat } from '../storyViewer';

// The story as a click-through viewer: one beat shown at a time, moved on by
// the reader, never by the scroll. jsdom has no IntersectionObserver, so the
// viewer counts as off the screen and nothing is ever live here.
const beats: ViewerBeat[] = [
	{ key: 'a', n: '01', label: 'First', render: (live, shown) => <p data-live={String(live)} data-shown={String(shown)}>Beat one</p> },
	{ key: 'b', n: '02', label: 'Piece', minor: true, render: (live, shown) => <p data-live={String(live)} data-shown={String(shown)}>Beat two</p> },
	{ key: 'c', n: '03', label: 'Last', render: (live, shown) => <p data-live={String(live)} data-shown={String(shown)}>Beat three</p> },
];

const states = (c: HTMLElement) => [...c.querySelectorAll('.story-scene')].map((s) => s.getAttribute('data-state'));
const shown = (c: HTMLElement) => [...c.querySelectorAll('[data-shown]')].map((e) => e.getAttribute('data-shown'));

// The figure stage draws on a canvas, and jsdom has none to draw on.
beforeAll(() => {
	HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
});

afterEach(() => {
	vi.useRealTimers();
});

describe('StoryViewer', () => {
	it('shows the first beat, keeps the others waiting ahead, and holds nothing heavy for them', () => {
		const { container } = render(<StoryViewer id="story" title={<h2 id="story-title">The Story</h2>} beats={beats} />);
		expect(states(container)).toEqual(['active', 'future', 'future']);
		expect(shown(container)).toEqual(['true', 'false', 'false']);
		expect(screen.getByRole('button', { name: '01 First' })).toHaveAttribute('aria-current', 'step');
		expect(screen.getByRole('button', { name: /Back/ })).toBeDisabled();
		// Off the screen nothing is live.
		expect([...container.querySelectorAll('[data-live]')].every((e) => e.getAttribute('data-live') === 'false')).toBe(true);
		// A small piece is a numeral on the bar.
		expect(screen.getByRole('button', { name: '02 Piece' }).textContent).toBe('02');
	});

	it('moves on with Next and Back, and lets the beat it left go once its exit is over', () => {
		vi.useFakeTimers();
		const { container } = render(<StoryViewer id="story" title={<h2 id="story-title">The Story</h2>} beats={beats} />);
		fireEvent.click(screen.getByRole('button', { name: /Next/ }));
		expect(states(container)).toEqual(['past', 'active', 'future']);
		expect(shown(container)).toEqual(['true', 'true', 'false']);
		act(() => {
			vi.advanceTimersByTime(800);
		});
		expect(shown(container)).toEqual(['false', 'true', 'false']);
		fireEvent.click(screen.getByRole('button', { name: /Back/ }));
		expect(states(container)).toEqual(['active', 'future', 'future']);
	});

	it('jumps from the chapter bar, and on the last beat reads on into the page', () => {
		const { container } = render(<StoryViewer id="story" title={<h2 id="story-title">The Story</h2>} beats={beats} after="#specimen" />);
		fireEvent.click(screen.getByRole('button', { name: '03 Last' }));
		expect(states(container)).toEqual(['past', 'past', 'active']);
		expect(screen.getByRole('link', { name: /Read on/ })).toHaveAttribute('href', '#specimen');
		expect(screen.queryByRole('button', { name: /Next/ })).toBeNull();
	});

	const withPlay: ViewerBeat[] = beats.map((b) => ({ ...b, render: (_l, _s, _sc, _p, play) => <button onClick={play}>Play {b.n}</button> }));
	const rect = (top: number, height: number) => () => ({ top, bottom: top + height, height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => null });

	it('Play brings the boxed viewer to where it rests, just inside its pause, and changes nothing else', () => {
		const scrollTo = vi.fn();
		vi.stubGlobal('scrollTo', scrollTo);
		vi.stubGlobal('innerHeight', 800); // the viewer (no height in jsdom) rests with its top at 400
		const { container } = render(<StoryViewer id="story" title={<h2 id="story-title">The Story</h2>} beats={withPlay} />);
		const section = container.querySelector('section')!;
		section.getBoundingClientRect = rect(900, 1200);
		screen.getByText('Play 01').focus();
		fireEvent.click(screen.getByText('Play 01'));
		// its natural top at 900 goes to 400, and 4px into the pause, where the sticky holds it
		expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: window.scrollY + 504 }));
		expect(states(container)).toEqual(['active', 'future', 'future']);
		// The key goes away as the screen tunes in: focus moves to the beat, not out to the page.
		expect(document.activeElement).toBe(container.querySelector('.story-scene[data-state="active"]'));
		vi.unstubAllGlobals();
	});

	it('Play centers the picture on a screen too small for the box', () => {
		const scrollTo = vi.fn();
		vi.stubGlobal('scrollTo', scrollTo);
		vi.stubGlobal('innerHeight', 800);
		vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
		const { container } = render(<StoryViewer id="story" title={<h2 id="story-title">The Story</h2>} beats={withPlay} />);
		const frame = document.createElement('div');
		frame.className = 'frame';
		container.querySelector('.story-scene[data-state="active"]')!.appendChild(frame);
		frame.getBoundingClientRect = rect(700, 300);
		fireEvent.click(screen.getByText('Play 01'));
		// centered: 700 - (800 - 300) / 2 = 450 further down
		expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: window.scrollY + 450 }));
		vi.unstubAllGlobals();
	});

	it('tunes the screen in the moment the catch stops the page, puts the picture in once the hold lets go, and opens it only once it is in', () => {
		vi.useFakeTimers();
		let y = 0;
		vi.stubGlobal('innerHeight', 800);
		vi.stubGlobal('scrollTo', (o: ScrollToOptions) => {
			y = o.top ?? y;
		});
		Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
		// The beat's living picture: in the page once it is primed and has arrived.
		let arrived = false;
		const probe: ViewerBeat[] = beats.map((b) => ({
			...b,
			render: (live, _s, sc, primed) => (
				<p data-screen={sc} data-primed={String(primed)} data-live={String(live)}>
					<span data-live-plate={primed && arrived ? 'primed' : 'poster'} />
					{b.label}
				</p>
			),
		}));
		const view = () => <StoryViewer id="story" title={<h2 id="story-title">The Story</h2>} beats={[...probe]} />;
		const { container, rerender } = render(view());
		// The section moves with the page: its natural top 900 at scroll 0, so the viewer rests at 504.
		container.querySelector('section')!.getBoundingClientRect = () => rect(900 - y, 1200)();
		const at = () => container.querySelector('[data-screen]')!;
		const turn = () => act(() => { window.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, cancelable: true })); });
		act(() => { window.dispatchEvent(new Event('scroll')); });
		turn();
		expect(y).toBe(504);
		// Caught: the screen tunes in straight away, the wheel still turning.
		expect(at().getAttribute('data-screen')).toBe('search');
		expect(at().getAttribute('data-primed')).toBe('false');
		for (let i = 0; i < 5; i++) {
			act(() => { vi.advanceTimersByTime(150); });
			turn();
		}
		expect(at().getAttribute('data-primed')).toBe('false');
		// The wheel stops: the hold lets go, and the picture may go in. The static holds until it has.
		act(() => { vi.advanceTimersByTime(400); });
		expect(at().getAttribute('data-primed')).toBe('true');
		act(() => { vi.advanceTimersByTime(300); });
		expect(at().getAttribute('data-screen')).toBe('search');
		arrived = true;
		rerender(view());
		act(() => { vi.advanceTimersByTime(60); });
		// In: the picture opens out of its line already allowed to move, and plays on.
		expect(at().getAttribute('data-screen')).toBe('lock');
		act(() => { vi.advanceTimersByTime(600); });
		expect(at().getAttribute('data-screen')).toBe('on');
		vi.unstubAllGlobals();
	});

	it('phases a playing screen through static into the next recording on Next', () => {
		vi.useFakeTimers();
		let y = 0;
		vi.stubGlobal('innerHeight', 800);
		vi.stubGlobal('scrollTo', (o: ScrollToOptions) => {
			y = o.top ?? y;
		});
		Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
		const probe: ViewerBeat[] = beats.map((b) => ({ ...b, render: (_l, _s, sc) => <p data-screen={sc}>{b.label}</p> }));
		const { container } = render(<StoryViewer id="story" title={<h2 id="story-title">The Story</h2>} beats={probe} />);
		container.querySelector('section')!.getBoundingClientRect = () => rect(900 - y, 1200)();
		const screens = () => [...container.querySelectorAll('[data-screen]')].map((e) => e.getAttribute('data-screen'));
		act(() => { window.dispatchEvent(new Event('scroll')); });
		act(() => { window.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, cancelable: true })); });
		for (let i = 0; i < 20; i++) act(() => { vi.advanceTimersByTime(100); });
		expect(screens()).toEqual(['on', 'standby', 'standby']);
		fireEvent.click(screen.getByRole('button', { name: /Next/ }));
		// Static rises over the picture; the beat has not changed yet.
		expect(screens()).toEqual(['out', 'standby', 'standby']);
		expect(states(container)).toEqual(['active', 'future', 'future']);
		act(() => { vi.advanceTimersByTime(330); });
		// Cut: the rack runs, the leaving screen holding its static as it slides away and the new one
		// searching as it slides in; only once it has seated does it lock on and play.
		expect(states(container)).toEqual(['past', 'active', 'future']);
		expect(screens()).toEqual(['search', 'search', 'standby']);
		for (let i = 0; i < 5; i++) act(() => { vi.advanceTimersByTime(100); });
		expect(screens()[1]).toBe('search');
		for (let i = 0; i < 3; i++) act(() => { vi.advanceTimersByTime(100); });
		expect(screens()[1]).toBe('lock');
		for (let i = 0; i < 6; i++) act(() => { vi.advanceTimersByTime(100); });
		expect(screens()[1]).toBe('on');
		vi.unstubAllGlobals();
	});

	it('morphs through a figure: the screen collapses into it, it runs on into its next beat, and the next screen waits dark for its light', () => {
		vi.useFakeTimers();
		let y = 0;
		vi.stubGlobal('innerHeight', 800);
		vi.stubGlobal('scrollTo', (o: ScrollToOptions) => {
			y = o.top ?? y;
		});
		Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
		const probe: ViewerBeat[] = [
			{ key: 'a', n: '01', label: 'Recording', render: (_l, _s, sc) => <p data-screen={sc}>A</p> },
			{ key: 'b', n: '02', label: 'Figure one', minor: true, figure: { key: 'generators', stage: 0 }, render: (live) => <p data-fig-live={String(live)}>B</p> },
			{ key: 'c', n: '03', label: 'Figure two', minor: true, figure: { key: 'generators', stage: 1 }, render: (live) => <p data-fig-live={String(live)}>C</p> },
			{ key: 'd', n: '04', label: 'Recording two', render: (_l, _s, sc) => <p data-screen={sc}>D</p> },
		];
		const { container } = render(<StoryViewer id="story" title={<h2 id="story-title">The Story</h2>} beats={probe} />);
		container.querySelector('section')!.getBoundingClientRect = () => rect(900 - y, 1200)();
		const box = () => container.querySelector('.story-box')!;
		const screenOf = (k: string) => container.querySelector(`.story-scene[data-beat="${k}"] [data-screen]`)?.getAttribute('data-screen');
		act(() => { window.dispatchEvent(new Event('scroll')); });
		act(() => { window.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, cancelable: true })); });
		for (let i = 0; i < 20; i++) act(() => { vi.advanceTimersByTime(100); });
		expect(screenOf('a')).toBe('on');
		expect(container.querySelector('.figure-stage')).not.toBeNull();
		// Recording to figure: the picture collapses first; the beat has not changed yet.
		fireEvent.click(screen.getByRole('button', { name: /Next/ }));
		expect(screenOf('a')).toBe('collapse');
		expect(states(container)).toEqual(['active', 'future', 'future', 'future']);
		act(() => { vi.advanceTimersByTime(450); });
		// Cut, as a morph: no rack, and the leaving screen stays collapsed as it goes.
		expect(states(container)).toEqual(['past', 'active', 'future', 'future']);
		expect(box().getAttribute('data-change')).toBe('morph');
		expect(screenOf('a')).toBe('collapse');
		// Figure to figure: at once, the same figure running on.
		fireEvent.click(screen.getByRole('button', { name: /Next/ }));
		expect(states(container)).toEqual(['past', 'past', 'active', 'future']);
		expect(box().getAttribute('data-change')).toBe('morph');
		// Figure to recording: the screen waits dark for the light, then tunes in.
		fireEvent.click(screen.getByRole('button', { name: /Next/ }));
		expect(states(container)).toEqual(['past', 'past', 'past', 'active']);
		expect(screenOf('d')).toBe('dark');
		act(() => { vi.advanceTimersByTime(950); });
		expect(screenOf('d')).toBe('search');
		for (let i = 0; i < 12; i++) act(() => { vi.advanceTimersByTime(100); });
		expect(screenOf('d')).toBe('on');
		vi.unstubAllGlobals();
	});

	it('never moves with the scroll', () => {
		const { container } = render(<StoryViewer id="story" title={<h2 id="story-title">The Story</h2>} beats={beats} />);
		fireEvent.scroll(window, { target: { scrollY: 4000 } });
		expect(states(container)).toEqual(['active', 'future', 'future']);
	});
});
