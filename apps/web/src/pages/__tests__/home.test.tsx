import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

/**
 * The story front door (docs/design/home-story-page-brief.md): Nick's 2022
 * copy in his order, a slim title band, the galaxy of fourteen worlds after
 * the story (no single creature carries the page, Nick 2026-10-06), and the
 * close with the Generator and the five games.
 */

vi.mock('../../components/navbar', () => ({ default: () => null }));
vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));

import Home from '../home';

function renderHome() {
	return render(
		<MemoryRouter>
			<Home />
		</MemoryRouter>
	);
}

describe('Home (the story front door)', () => {
	it('opens with the lockup, the 2022 line and the Generator, and no creature', () => {
		renderHome();
		expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
		expect(screen.getByText(/Xalia is home to a wide range of powerful, bioengineered creatures/)).toBeInTheDocument();
		const keys = screen.getAllByRole('link', { name: 'Try the Generator' });
		expect(keys).toHaveLength(2);
		expect(keys[0]).toHaveAttribute('href', '/generator');
		expect(keys[0].getAttribute('data-variant')).toBe('default');
		// The close is screens away from the band, so it carries the forward key too.
		expect(keys[1].getAttribute('data-variant')).toBe('default');
		expect(screen.queryByText(/Yetimoth/)).toBeNull();
	});

	it('tells the story in the beats of the content plan under the 2022 headings', () => {
		renderHome();
		for (const name of ['The Story', 'The Galaxy of Xalia', 'The Tournament & Tokens']) {
			expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
		}
		const text = document.body.textContent || '';
		// docs/design/home-story-content-plan.md: the token paragraph is its own
		// beat, after the plague and before the king's Valleron. The king's
		// tournament is told in the last beat, under the arena's picture (so
		// ahead of that beat's reading column), inside the viewer.
		const order = [
			'For thousands of years, the ancient race known as the Vallerii',
			'But the high technology of the Vallerii',
			'The wars have long since ended',
			'By scrambling and encrypting the genome',
			'Recently, the king has announced plans',
			'With the plague burning through the galaxy',
			'Start generating now',
		];
		let last = -1;
		for (const phrase of order) {
			const at = text.indexOf(phrase);
			expect(at, phrase).toBeGreaterThan(last);
			last = at;
		}
		// Told once: the token paragraph left the tournament section for its beat.
		expect(text.split('By scrambling and encrypting the genome').length).toBe(2);
		expect(text.split('Recently, the king has announced plans').length).toBe(2);
		// Every headline is a phrase of the 2022 page.
		for (const headline of ['They birthed the first Xalians', 'Turned the Xalians against their masters', 'Designed by APEX to target the genome', 'The only way to safely generate new Xalians', 'Only the strongest factions will survive…']) {
			// Beats not shown in the viewer are hidden from assistive tech until they are.
			expect(screen.getByRole('heading', { level: 3, name: headline, hidden: true })).toBeInTheDocument();
		}
		// No dashes of any kind in the copy.
		expect(text).not.toMatch(/[–—]/);
	});

	it('follows the story with the galaxy, and the story hands on to it', () => {
		renderHome();
		const section = document.getElementById('worlds');
		expect(section).not.toBeNull();
		expect(screen.getByRole('link', { name: 'All fourteen worlds' })).toHaveAttribute('href', '/encyclopedia/worlds');
	});

	it('lists the five games with their routes', () => {
		renderHome();
		const games: Array<[string, string]> = [
			['Duel', '/duel'],
			['Reclamation', '/reclamation'],
			['Expedition', '/long-return'],
			['Powerworks', '/powerworks'],
			['Arcade', '/arcade'],
		];
		for (const [name, to] of games) {
			const row = screen.getByText(name).closest('a');
			expect(row).toHaveAttribute('href', to);
		}
	});
});
