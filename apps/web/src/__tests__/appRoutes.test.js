import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));
vi.mock('../components/navbar', () => ({ default: () => null }));

vi.mock('../pages/home', () => ({ default: () => <div>route:home</div> }));
vi.mock('../pages/styleGuidePage', () => ({ default: () => <div>route:styleguide</div> }));
vi.mock('../pages/generatorPage', () => ({ default: () => <div>route:generator</div> }));
vi.mock('../pages/userAccountPage', () => ({ default: () => <div>route:account</div> }));
vi.mock('../pages/userDetailsPage', () => ({
	default: ({ id }) => <div>route:user:{id}</div>,
}));
vi.mock('../pages/games/matchCardGamePage', () => ({ default: () => <div>route:match</div> }));
vi.mock('../pages/games/physicsGamePage', () => ({ default: () => <div>route:physics</div> }));
vi.mock('../pages/trainingGroundsPage', () => ({ default: () => <div>route:training</div> }));
vi.mock('../pages/games/duelStartPage', () => ({ default: () => <div>route:duel</div> }));
vi.mock('../pages/games/reclamationPage', () => ({ default: () => <div>route:reclamation</div> }));
vi.mock('../pages/games/duelPlaygroundPage', () => ({ default: () => <div>route:duel-reference</div> }));
vi.mock('../pages/encyclopediaPage', () => ({ default: () => <div>route:encyclopedia</div> }));
vi.mock('../pages/games/longReturnPage', () => ({ default: () => <div>route:long-return</div> }));
vi.mock('../pages/system/notFoundPage', () => ({ default: () => <div>route:not-found</div> }));
vi.mock('../pages/system/devErrorPage', () => ({ default: () => <div>route:dev-error</div> }));

import { AppRoutes } from '../App';

function LocationProbe() {
	const location = useLocation();
	return <output data-testid="location">{location.pathname}{location.search}{location.hash}</output>;
}

function renderRoute(entry) {
	return render(
		<MemoryRouter initialEntries={[entry]}>
			<AppRoutes />
			<LocationProbe />
		</MemoryRouter>
	);
}

describe('application route contract', () => {
	it.each([
		['/', 'route:home'],
		['/generator', 'route:generator'],
		['/account', 'route:account'],
		['/train', 'route:training'],
		['/train/match', 'route:match'],
		['/train/physics', 'route:physics'],
		['/duel', 'route:duel'],
		['/duel/reference', 'route:duel-reference'],
		['/reclamation', 'route:reclamation'],
		['/long-return', 'route:long-return'],
		['/encyclopedia/worlds/xalia', 'route:encyclopedia'],
	])('renders %s through its owning route', async (entry, marker) => {
		renderRoute(entry);
		expect(await screen.findByText(marker)).toBeInTheDocument();
		expect(screen.getByTestId('location')).toHaveTextContent(entry);
	});

	it('passes the dynamic user id to the detail page', async () => {
		renderRoute('/user/test-user');
		expect(await screen.findByText('route:user:test-user')).toBeInTheDocument();
	});

	it.each([
		['/species?view=grid#catalogue', '/encyclopedia/species?view=grid#catalogue'],
		['/species/1?view=record#biology', '/encyclopedia/species/xylum?view=record#biology'],
		['/species/missing?view=grid#catalogue', '/encyclopedia/species?view=grid#catalogue'],
		['/planets?element=fire#ignis', '/encyclopedia/worlds?element=fire#ignis'],
		['/glossary?q=rift#results', '/encyclopedia/index?q=rift#results'],
	])('replaces retired address %s without losing URL state', async (entry, destination) => {
		renderRoute(entry);
		expect(await screen.findByText('route:encyclopedia')).toBeInTheDocument();
		expect(screen.getByTestId('location')).toHaveTextContent(destination);
	});

	it('renders the not-found surface for an unknown address', async () => {
		renderRoute('/missing/deep/link');
		expect(await screen.findByText('route:not-found')).toBeInTheDocument();
	});
});
