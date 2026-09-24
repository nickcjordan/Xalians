import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StoryStage, stageProgress, type StageScene } from '../storyStage';

// The stage shows one scene at a time: the rest wait in the DOM, faded, with
// their plates stilled. jsdom has no layout, so the stage reads as scrolled to
// its top and off the screen: scene one is shown and nothing is live.
const scenes: StageScene[] = ['01', '02', '03', '04'].map((n) => ({
	key: n,
	n,
	label: `Era ${n}`,
	render: (live) => <p data-live={String(live)}>Scene {n}</p>,
}));

afterEach(() => {
	vi.restoreAllMocks();
});

describe('StoryStage', () => {
	it('shows the first scene, keeps the others waiting ahead, and marks it on the timeline', () => {
		const { container } = render(<StoryStage id="story" title={<h2 id="story-title">The Story</h2>} scenes={scenes} />);
		const states = [...container.querySelectorAll('.story-scene')].map((s) => s.getAttribute('data-state'));
		expect(states).toEqual(['active', 'future', 'future', 'future']);
		expect(screen.getByRole('button', { name: '01 Era 01' })).toHaveAttribute('aria-current', 'step');
		expect(screen.getByRole('button', { name: '02 Era 02' })).not.toHaveAttribute('aria-current');
		// Every scene's words stay in the page, in order, for anyone reading it straight through.
		expect(container.textContent).toMatch(/Scene 01.*Scene 02.*Scene 03.*Scene 04/);
		// Off the screen, no scene's plate is live.
		expect([...container.querySelectorAll('[data-live]')].map((e) => e.getAttribute('data-live'))).toEqual(['false', 'false', 'false', 'false']);
		expect(screen.getByRole('region', { name: 'The Story' })).toBeInTheDocument();
	});

	it('gives every scene a full stretch of scroll and starts the dot at the top', () => {
		const { container } = render(<StoryStage id="story" title={<h2 id="story-title">The Story</h2>} scenes={scenes} />);
		const stage = container.querySelector('.story-stage') as HTMLElement;
		expect(stage.style.height).toBe('calc(100svh + 4 * var(--story-step))');
		const line = container.querySelector('.story-line') as HTMLElement;
		expect(line.style.getPropertyValue('--story-progress')).toBe('0');
	});

	it('jumps to a scene from its marker', () => {
		const scrollTo = vi.fn();
		vi.spyOn(window, 'scrollTo').mockImplementation(scrollTo as unknown as typeof window.scrollTo);
		render(<StoryStage id="story" title={<h2 id="story-title">The Story</h2>} scenes={scenes} />);
		fireEvent.click(screen.getByRole('button', { name: '03 Era 03' }));
		expect(scrollTo).toHaveBeenCalledTimes(1);
	});
});

describe('stageProgress', () => {
	const range = 2000;

	it('moves the dot on every scroll, from the first pixel to the last', () => {
		let last = -1;
		for (let y = 0; y <= range; y += 50) {
			const { p } = stageProgress(y, range, 4);
			expect(p).toBeGreaterThan(last);
			last = p;
		}
		expect(stageProgress(0, range, 4).p).toBe(0);
		expect(stageProgress(range, range, 4).p).toBe(1);
	});

	it('changes the scene when the dot reaches the next marker, and not before', () => {
		expect(stageProgress(0, range, 4).index).toBe(0);
		expect(stageProgress(499, range, 4).index).toBe(0);
		expect(stageProgress(500, range, 4).index).toBe(1);
		expect(stageProgress(999, range, 4).index).toBe(1);
		expect(stageProgress(1000, range, 4).index).toBe(2);
		expect(stageProgress(1500, range, 4).index).toBe(3);
		// The last scene holds through its whole stretch to the end of the track.
		expect(stageProgress(range, range, 4).index).toBe(3);
	});

	it('clamps before and after the stage', () => {
		expect(stageProgress(-300, range, 4)).toEqual({ p: 0, index: 0 });
		expect(stageProgress(range + 300, range, 4)).toEqual({ p: 1, index: 3 });
		expect(stageProgress(100, 0, 4)).toEqual({ p: 0, index: 0 });
	});
});

describe('small pieces on the stage', () => {
	const mixed: StageScene[] = [
		{ key: 'a', n: '01', label: 'Full', render: (_live, shown) => <p data-shown={String(shown)}>Full</p> },
		{ key: 'b', n: '02', label: 'Piece', weight: 0.5, minor: true, render: (_live, shown) => <p data-shown={String(shown)}>Piece</p> },
		{ key: 'c', n: '03', label: 'Full again', render: (_live, shown) => <p data-shown={String(shown)}>Full again</p> },
	];

	it('gives a small piece its share of the scroll and a minor tick with its numeral only', () => {
		const { container } = render(<StoryStage id="story" title={<h2 id="story-title">The Story</h2>} scenes={mixed} />);
		const stage = container.querySelector('.story-stage') as HTMLElement;
		expect(stage.style.height).toBe('calc(100svh + 2.5 * var(--story-step))');
		const minor = screen.getByRole('button', { name: '02 Piece' });
		expect(minor).toHaveAttribute('data-minor');
		expect(minor.textContent).toBe('02');
		expect(screen.getByRole('button', { name: '01 Full' })).not.toHaveAttribute('data-minor');
	});

	it('tells only the shown scene that it is shown, so the others can hold nothing', () => {
		const { container } = render(<StoryStage id="story" title={<h2 id="story-title">The Story</h2>} scenes={mixed} />);
		expect([...container.querySelectorAll('[data-shown]')].map((e) => e.getAttribute('data-shown'))).toEqual(['true', 'false', 'false']);
	});

	it('cuts the range by weight', () => {
		const w = [1, 0.5, 1];
		// 2.5 shares over a range of 2500: the piece holds 1000 to 1500.
		expect(stageProgress(999, 2500, w).index).toBe(0);
		expect(stageProgress(1000, 2500, w).index).toBe(1);
		expect(stageProgress(1499, 2500, w).index).toBe(1);
		expect(stageProgress(1500, 2500, w).index).toBe(2);
	});
});
