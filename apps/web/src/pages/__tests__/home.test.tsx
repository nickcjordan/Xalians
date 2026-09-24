import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

/**
 * The story front door (docs/design/home-story-page-brief.md): Nick's 2022
 * copy in his order, one fixed specimen from a real generator record, the
 * one primary key, and the five games.
 */

vi.mock('../../components/navbar', () => ({ default: () => null }));
vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));

import Home from '../home';
import specimen from '../home/specimen.json';

function renderHome() {
	return render(
		<MemoryRouter>
			<Home />
		</MemoryRouter>
	);
}

describe('Home (the story front door)', () => {
	it('opens with the lockup, the 2022 line and the one primary key', () => {
		renderHome();
		expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
		expect(screen.getByText(/Xalia is home to a wide range of powerful, bioengineered creatures/)).toBeInTheDocument();
		const keys = screen.getAllByRole('link', { name: 'Try the Generator' });
		expect(keys).toHaveLength(2);
		expect(keys[0]).toHaveAttribute('href', '/generator');
		expect(keys[0].getAttribute('data-variant')).toBe('default');
		expect(keys[1].getAttribute('data-variant')).toBe('secondary');
	});

	it('tells the story in the beats of the content plan under the 2022 headings', () => {
		renderHome();
		for (const name of ['The Story', 'The Galaxy of Xalia', 'The Tournament & Tokens']) {
			expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
		}
		const text = document.body.textContent || '';
		// docs/design/home-story-content-plan.md: the token paragraph is its own
		// beat, after the plague and before the king's Valleron.
		const order = [
			'For thousands of years, the ancient race known as the Vallerii',
			'But the high technology of the Vallerii',
			'The wars have long since ended',
			'By scrambling and encrypting the genome',
			'With the plague burning through the galaxy',
			'Today, Krystos remains a snowy wasteland',
			'Hulking, white-furred apes',
			'Recently, the king has announced plans',
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
		// Every headline is a phrase of the 2022 page.
		for (const headline of ['They birthed the first Xalians', 'Turned the Xalians against their masters', 'Designed by APEX to target the genome', 'The only way to safely generate new Xalians', 'Only the strongest factions will survive…']) {
			expect(screen.getByRole('heading', { level: 3, name: headline })).toBeInTheDocument();
		}
		// No dashes of any kind in the copy.
		expect(text).not.toMatch(/[–—]/);
	});

	it('shows the one fixed specimen from its record and links to its pages', () => {
		renderHome();
		expect(specimen.provenance.seed).toBe('home-sample-2');
		expect(screen.getByRole('heading', { level: 3, name: /Yetimoth/ })).toBeInTheDocument();
		expect(screen.getByText('Mantle of Unyielding Winter')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Its record' })).toHaveAttribute('href', '/encyclopedia/species/yetimoth');
		expect(screen.getByRole('link', { name: 'Its world' })).toHaveAttribute('href', '/encyclopedia/worlds/krystos');
		expect(screen.getByRole('link', { name: 'A Yetimoth of Krystos, shown in full below' })).toHaveAttribute('href', '#specimen');
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
