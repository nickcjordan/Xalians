import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import tourData from '@xalians/content/tour.json';
import { getEraForBeat, routeFor } from '../../lore';

vi.mock('../../components/navbar', () => ({ default: () => null }));
vi.mock('../../components/encyclopedia/EncyclopediaShell', () => ({
	default: ({ children }) => <section>{children}</section>,
}));
vi.mock('../../components/encyclopedia/ReadingRoom', () => ({ default: () => <div>route:reading-room</div> }));
vi.mock('../../components/encyclopedia/Story', () => ({ default: () => <div>route:story</div> }));
vi.mock('../../components/encyclopedia/Worlds', () => ({ default: () => <div>route:worlds</div> }));
vi.mock('../../components/encyclopedia/WorldView', () => ({ default: () => <div>route:world</div> }));
vi.mock('../../components/encyclopedia/Bestiary', () => ({ default: () => <div>route:bestiary</div> }));
vi.mock('../../components/encyclopedia/SpeciesView', () => ({ default: () => <div>route:species</div> }));
vi.mock('../../components/encyclopedia/Powers', () => ({ default: () => <div>route:powers</div> }));
vi.mock('../../components/encyclopedia/Index', () => ({ default: () => <div>route:index</div> }));
vi.mock('../../components/encyclopedia/EntryView', () => ({ default: () => <div>route:entry</div> }));
vi.mock('@/components/system/record', () => ({
	EmptyState: ({ legend, children }) => <div>{legend}: {children}</div>,
}));

import EncyclopediaPage from '../encyclopediaPage';

function LocationProbe() {
	const location = useLocation();
	return <output data-testid="location">{location.pathname}{location.search}{location.hash}</output>;
}

function renderRoute(entry) {
	return render(
		<MemoryRouter initialEntries={[entry]}>
			<Routes>
				<Route path="/encyclopedia/*" element={<EncyclopediaPage />} />
			</Routes>
			<LocationProbe />
		</MemoryRouter>
	);
}

beforeEach(() => {
	vi.stubGlobal('scrollTo', vi.fn());
});

describe('encyclopedia route contract', () => {
	it.each([
		['/encyclopedia', 'route:reading-room'],
		['/encyclopedia/story', 'route:story'],
		['/encyclopedia/story/before-the-speaking-world', 'route:story'],
		['/encyclopedia/worlds', 'route:worlds'],
		['/encyclopedia/worlds/xalia', 'route:world'],
		['/encyclopedia/species', 'route:bestiary'],
		['/encyclopedia/species/xylum', 'route:species'],
		['/encyclopedia/powers', 'route:powers'],
		['/encyclopedia/index', 'route:index'],
		['/encyclopedia/index/the-rift', 'route:entry'],
	])('renders %s through its owning relative route', (entry, marker) => {
		renderRoute(entry);
		expect(screen.getByText(marker)).toBeInTheDocument();
		expect(screen.getByTestId('location')).toHaveTextContent(entry);
	});

	it.each([
		['/encyclopedia/chronicle?world=xalia#event-rift', '/encyclopedia/story?world=xalia#event-rift'],
		['/encyclopedia/chronicle/deep-past?world=xalia#chapter-1', '/encyclopedia/story/deep-past?world=xalia#chapter-1'],
		['/encyclopedia/read?mode=continuous#part-2', '/encyclopedia/story?mode=continuous#part-2'],
		['/encyclopedia/read/deep-past?mode=continuous#part-2', '/encyclopedia/story/deep-past?mode=continuous#part-2'],
		['/encyclopedia/tour?mode=guided#opening', '/encyclopedia/story?mode=guided#opening'],
		['/encyclopedia/tour/unknown?mode=guided#opening', '/encyclopedia/story?mode=guided#opening'],
	])('replaces retired address %s without losing URL state', async (entry, destination) => {
		renderRoute(entry);
		expect(await screen.findByText('route:story')).toBeInTheDocument();
		expect(screen.getByTestId('location')).toHaveTextContent(destination);
	});

	it('maps a retired tour beat to its story era and beat anchor', async () => {
		const beat = tourData.beats[0];
		const destination = routeFor('tour', beat.key);
		const [pathname, hash] = destination.split('#');
		expect(getEraForBeat(beat.key)).toBe(beat.era);

		renderRoute(`/encyclopedia/tour/${beat.key}?mode=guided`);
		expect(await screen.findByText('route:story')).toBeInTheDocument();
		expect(screen.getByTestId('location')).toHaveTextContent(`${pathname}?mode=guided#${hash}`);
	});

	it('renders the local not-found state inside the encyclopedia shell', () => {
		renderRoute('/encyclopedia/missing/deep/link');
		expect(screen.getByText('Not found: No record at this address.')).toBeInTheDocument();
	});
});
