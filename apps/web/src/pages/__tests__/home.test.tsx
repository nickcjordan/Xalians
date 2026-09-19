import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

/**
 * Issue #432: home page orientation. Covers the lede above the lore
 * paragraph, the two new section headings (with their aria-labels removed
 * in favor of the headings), the full seven-row directory with its "Play"
 * group label, and the hero lockup collapsing to a single accessible name.
 */

vi.mock('../../components/navbar', () => ({ default: () => null }));
vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));
vi.mock('virtual:xalians-home-data', () => ({
	worlds: [{ key: 'magmuth', name: 'Magmuth', element: 'fire', terrain: 'Jagged Molten Cliffs, Lava Pits', image: 'img.png', imageAlt: 'Magmuth' }],
	species: [{ id: '00001', name: 'Graviclaw', type: 'Metal' }],
}));

import Home from '../home';

function renderHome() {
	return render(
		<MemoryRouter>
			<Home />
		</MemoryRouter>
	);
}

describe('Home (#432 orientation)', () => {
	it('leads with the in-world lede above the lore paragraph, and drops the Xalia eyebrow', () => {
		renderHome();

		expect(
			screen.getByText(/Across fourteen worlds, the Nemesis Plague is still spreading\./)
		).toBeInTheDocument();
		expect(screen.getByText(/King Kozrak holds the only machine that still prints a Scrambler Token/)).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 1, name: 'Creatures grown for dying worlds' })).toBeInTheDocument();
		expect(screen.queryByText('Xalia')).not.toBeInTheDocument();
	});

	it('gives the worlds and species sections visible headings and captions', () => {
		renderHome();

		expect(screen.getByRole('heading', { level: 2, name: 'Fourteen worlds' })).toBeInTheDocument();
		expect(screen.getByText('Every Xalian is grown for one of them. Open a world for its history and its native species.')).toBeInTheDocument();
		// The terrain line is the difference between a world tile and a swatch.
		expect(screen.getByText('Jagged Molten Cliffs, Lava Pits')).toBeInTheDocument();

		expect(screen.getByRole('heading', { level: 2, name: 'From the bestiary' })).toBeInTheDocument();
		expect(screen.getByText('Species silhouettes from the record plates. Open one to read its record.')).toBeInTheDocument();
	});

	it('lists all seven nav destinations under a Play group label, in order, with per-row link text', () => {
		renderHome();

		const groupLabels = screen.getAllByText('Play').filter((el) => el.tagName === 'P');
		expect(groupLabels).toHaveLength(1);

		const rows: Array<[string, string, string]> = [
			['Generator', '/generator', 'Generate'],
			['Encyclopedia', '/encyclopedia', 'Read'],
			['Duel', '/duel', 'Play'],
			['Reclamation', '/reclamation', 'Play'],
			['Expedition', '/long-return', 'Play'],
			['Powerworks', '/powerworks', 'Play'],
			['Arcade', '/arcade', 'Play'],
		];

		for (const [name, to, linkText] of rows) {
			const heading = screen.getByText(name);
			const row = heading.closest('a');
			expect(row).not.toBeNull();
			expect(row).toHaveAttribute('href', to);
			expect(row!.textContent).toContain(linkText);
		}

		expect(screen.getByText('Push a crew of your Xalians across hazardous worlds and bring them home.')).toBeInTheDocument();
		expect(screen.getByText('Take a squad of four through four encounters inside a dormant Vallerii facility.')).toBeInTheDocument();
	});

	it('gives the hero lockup a single accessible name, not "Xalians ALIANS"', () => {
		renderHome();

		const lockups = screen.getAllByRole('link', { name: 'Xalians' });
		expect(lockups.length).toBeGreaterThan(0);
		for (const lockup of lockups) {
			expect(lockup).toHaveAccessibleName('Xalians');
		}
		expect(screen.queryByRole('link', { name: /xalians alians/i })).not.toBeInTheDocument();
	});
});
