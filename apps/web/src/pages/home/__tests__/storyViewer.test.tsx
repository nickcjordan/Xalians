import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

	it('tunes the screen in the moment the catch stops the page, and puts the picture in only once the hold lets go', () => {
		vi.useFakeTimers();
		let y = 0;
		vi.stubGlobal('innerHeight', 800);
		vi.stubGlobal('scrollTo', (o: ScrollToOptions) => {
			y = o.top ?? y;
		});
		Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
		const probe: ViewerBeat[] = beats.map((b) => ({ ...b, render: (_l, _s, sc, primed) => <p data-screen={sc} data-primed={String(primed)}>{b.label}</p> }));
		const { container } = render(<StoryViewer id="story" title={<h2 id="story-title">The Story</h2>} beats={probe} />);
		// The section moves with the page: its natural top 900 at scroll 0, so the viewer rests at 504.
		container.querySelector('section')!.getBoundingClientRect = () => rect(900 - y, 1200)();
		const at = () => container.querySelector('[data-screen]')!;
		const turn = () => act(() => { window.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, cancelable: true })); });
		act(() => { window.dispatchEvent(new Event('scroll')); });
		turn();
		expect(y).toBe(504);
		// Caught: the screen tunes in straight away, the wheel still turning.
		expect(at().getAttribute('data-screen')).toBe('tuning');
		expect(at().getAttribute('data-primed')).toBe('false');
		for (let i = 0; i < 5; i++) {
			act(() => { vi.advanceTimersByTime(150); });
			turn();
		}
		expect(at().getAttribute('data-primed')).toBe('false');
		// The wheel stops: the hold lets go, and the picture may go in.
		act(() => { vi.advanceTimersByTime(400); });
		expect(at().getAttribute('data-primed')).toBe('true');
		vi.unstubAllGlobals();
	});

	it('never moves with the scroll', () => {
		const { container } = render(<StoryViewer id="story" title={<h2 id="story-title">The Story</h2>} beats={beats} />);
		fireEvent.scroll(window, { target: { scrollY: 4000 } });
		expect(states(container)).toEqual(['active', 'future', 'future']);
	});
});
