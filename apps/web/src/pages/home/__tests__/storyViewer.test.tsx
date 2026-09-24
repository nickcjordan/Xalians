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

	it('never moves with the scroll', () => {
		const { container } = render(<StoryViewer id="story" title={<h2 id="story-title">The Story</h2>} beats={beats} />);
		fireEvent.scroll(window, { target: { scrollY: 4000 } });
		expect(states(container)).toEqual(['active', 'future', 'future']);
	});
});
