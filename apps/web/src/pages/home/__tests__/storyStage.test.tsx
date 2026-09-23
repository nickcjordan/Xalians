import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StoryStage, type StageScene } from '../storyStage';

// The stage shows one scene at a time: the rest wait in the DOM, faded, with
// their plates stilled. jsdom has no layout, so the stage reads as scrolled to
// its top and off the screen: scene one is shown and nothing is live.
const scenes: StageScene[] = ['01', '02', '03', '04'].map((n) => ({
	key: n,
	n,
	label: `Era ${n}`,
	render: (live) => <p data-live={String(live)}>Scene {n}</p>,
}));

describe('StoryStage', () => {
	it('shows the first scene, keeps the others waiting ahead, and marks it on the rail', () => {
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
});
