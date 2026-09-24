import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StoryFlow, flowPositions, type FlowBeat } from '../storyFlow';

// The story in the page's own scroll: every beat in the DOM in order, a
// chapter bar that follows the scroll and never holds it.
const beats: FlowBeat[] = [
	{ key: 'a', n: '01', label: 'First', node: <p>Beat one</p> },
	{ key: 'b', n: '02', label: 'Piece', minor: true, node: <p>Beat two</p> },
	{ key: 'c', n: '03', label: 'Last', node: <p>Beat three</p> },
];

describe('StoryFlow', () => {
	it('puts every beat in the page, in order, each with its own anchor', () => {
		const { container } = render(<StoryFlow id="story" title={<h2 id="story-title">The Story</h2>} beats={beats} />);
		expect(container.textContent).toMatch(/Beat one.*Beat two.*Beat three/);
		expect([...container.querySelectorAll('[data-beat]')].map((e) => e.id)).toEqual(['beat-a', 'beat-b', 'beat-c']);
		expect(screen.getByRole('region', { name: 'The Story' })).toBeInTheDocument();
		// Nothing pins the page: no stage height, no sticky scene box.
		expect(container.querySelector('.story-stage')).toBeNull();
	});

	it('marks the chapters on its bar: a small piece by its numeral alone', () => {
		render(<StoryFlow id="story" title={<h2 id="story-title">The Story</h2>} beats={beats} />);
		// Exactly one chapter is the current one.
		expect(screen.getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'step')).toHaveLength(1);
		const minor = screen.getByRole('button', { name: '02 Piece' });
		expect(minor).toHaveAttribute('data-minor');
		expect(minor.textContent).toBe('02');
	});

	it('scrolls to a chapter from its marker', () => {
		const into = vi.fn();
		render(<StoryFlow id="story" title={<h2 id="story-title">The Story</h2>} beats={beats} />);
		(document.getElementById('beat-c') as HTMLElement).scrollIntoView = into;
		fireEvent.click(screen.getByRole('button', { name: '03 Last' }));
		expect(into).toHaveBeenCalledTimes(1);
	});
});

describe('flowPositions', () => {
	it('places the markers where the beats start and the dot at the middle of the screen', () => {
		const at = flowPositions([0, 1000, 1500], 2500, 1250);
		expect(at.markers).toEqual([0, 0.4, 0.6]);
		expect(at.dot).toBe(0.5);
		expect(at.current).toBe(1);
	});

	it('clamps before and after the story', () => {
		expect(flowPositions([0, 1000], 2000, -400)).toEqual({ markers: [0, 0.5], dot: 0, current: 0 });
		expect(flowPositions([0, 1000], 2000, 5000).dot).toBe(1);
		expect(flowPositions([0, 1000], 2000, 5000).current).toBe(1);
	});
});
