import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

/**
 * Document-title coverage for issue #430: a mechanical check that home, one
 * world, one species and not-found each land on their own title, and that a
 * route with a dynamic segment falls back correctly when the record does not
 * exist. Uses the real page/section components (not the route-contract
 * mocks in appRoutes.test.js) so the usePageTitle() call inside each one
 * actually runs.
 */

vi.mock('../../components/navbar', () => ({ default: () => null }));
vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));
vi.mock('virtual:xalians-home-data', () => ({
	worlds: [{ key: 'magmuth', name: 'Magmuth', element: 'fire', image: 'img.png', imageAlt: 'Magmuth' }],
	species: [{ id: '00001', name: 'Graviclaw', type: 'Metal' }],
}));

import Home from '../home';
import WorldView from '../../components/encyclopedia/WorldView';
import SpeciesView from '../../components/encyclopedia/SpeciesView';
import NotFoundRoute from '../system/notFoundPage';

function renderAt(entry, element, path = entry) {
	return render(
		<MemoryRouter initialEntries={[entry]}>
			<Routes>
				<Route path={path} element={element} />
			</Routes>
		</MemoryRouter>
	);
}

describe('per-route document titles (#430)', () => {
	it('gives home the plain site name', () => {
		renderAt('/', <Home />, '/');
		expect(document.title).toBe('Xalians');
	});

	it('titles a world record after the world', () => {
		renderAt('/encyclopedia/worlds/magmuth', <WorldView />, '/encyclopedia/worlds/:key');
		expect(document.title).toBe('Magmuth · Xalians');
	});

	it('titles a species record after the species', () => {
		renderAt('/encyclopedia/species/xylum', <SpeciesView />, '/encyclopedia/species/:key');
		expect(document.title).toBe('Xylum · Xalians');
	});

	it('titles an unknown world "Not found" rather than leaving the previous title', () => {
		renderAt('/encyclopedia/worlds/nonexistent', <WorldView />, '/encyclopedia/worlds/:key');
		expect(document.title).toBe('Not found · Xalians');
	});

	it('titles the catch-all not-found route', () => {
		renderAt('/missing/deep/link', <NotFoundRoute />, '*');
		expect(document.title).toBe('Not found · Xalians');
	});

	it('restores the previous title once a titled route unmounts', () => {
		document.title = 'Xalians';
		const { unmount } = renderAt('/encyclopedia/worlds/magmuth', <WorldView />, '/encyclopedia/worlds/:key');
		expect(document.title).toBe('Magmuth · Xalians');
		unmount();
		expect(document.title).toBe('Xalians');
	});
});
