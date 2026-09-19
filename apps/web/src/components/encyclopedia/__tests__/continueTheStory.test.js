import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordStoryPosition } from '../trail';

vi.mock('../../navbar', () => ({ default: () => null }));

import WorldView from '../WorldView';
import SpeciesView from '../SpeciesView';

function renderWorld(worldKey) {
	return render(
		<MemoryRouter initialEntries={[`/encyclopedia/worlds/${worldKey}`]}>
			<Routes>
				<Route path="/encyclopedia/worlds/:key" element={<WorldView />} />
			</Routes>
		</MemoryRouter>
	);
}

function renderSpecies(speciesKey) {
	return render(
		<MemoryRouter initialEntries={[`/encyclopedia/species/${speciesKey}`]}>
			<Routes>
				<Route path="/encyclopedia/species/:key" element={<SpeciesView />} />
			</Routes>
		</MemoryRouter>
	);
}

beforeEach(() => {
	window.localStorage.clear();
	vi.stubGlobal('IntersectionObserver', class {
		observe() {}
		disconnect() {}
	});
});

describe('world page: continue the story foot', () => {
	it('with no reading progress, Magmuth links to its first named era, The Age of Unbirth', () => {
		renderWorld('magmuth');
		expect(screen.getByText('This world in the story')).toBeInTheDocument();
		const link = screen.getByRole('link', { name: /Part \d+, The Age of Unbirth/ });
		expect(link).toBeInTheDocument();
	});

	it('with no reading progress, Telypso links to its first named era, The Deep Past', () => {
		renderWorld('telypso');
		expect(screen.getByText('This world in the story')).toBeInTheDocument();
		const link = screen.getByRole('link', { name: /Part \d+, The Deep Past/ });
		expect(link).toBeInTheDocument();
	});

	it('with reading progress in Part 4, both Magmuth and Telypso keep the Continue the story label and point at Part 4', () => {
		recordStoryPosition('generation');

		const { unmount } = renderWorld('magmuth');
		expect(screen.getByText('Continue the story')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Part 4/ })).toBeInTheDocument();
		unmount();

		renderWorld('telypso');
		expect(screen.getByText('Continue the story')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Part 4/ })).toBeInTheDocument();
	});
});

describe('species page: continue the story foot', () => {
	it('with no reading progress, a Magmuth-native species links through its home world to The Age of Unbirth', () => {
		renderSpecies('dromeus');
		expect(screen.getByText('This species in the story')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Part \d+, The Age of Unbirth/ })).toBeInTheDocument();
	});

	it('with no reading progress, a Telypso-native species links through its home world to The Deep Past', () => {
		renderSpecies('hypnopet');
		expect(screen.getByText('This species in the story')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Part \d+, The Deep Past/ })).toBeInTheDocument();
	});

	it('with reading progress in Part 4, a species page keeps the Continue the story label and points at Part 4', () => {
		recordStoryPosition('generation');
		renderSpecies('dromeus');
		expect(screen.getByText('Continue the story')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Part 4/ })).toBeInTheDocument();
	});
});
