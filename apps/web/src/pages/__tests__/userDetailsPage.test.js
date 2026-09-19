import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
	callListPublicXalians: vi.fn(),
}));

vi.mock('../../utils/dbApi', () => db);
vi.mock('../../components/navbar', () => ({ default: () => <nav aria-label="Test navigation" /> }));
vi.mock('../../components/record/RecordTile', () => ({ default: () => null }));
vi.mock('../../components/record/RecordView', () => ({ default: () => null }));

import UserDetailsPage from '../userDetailsPage';

function renderPage(id = 'does-not-exist') {
	return render(
		<MemoryRouter>
			<UserDetailsPage id={id} />
		</MemoryRouter>
	);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('unknown account handling', () => {
	it('renders the shared not-found surface for a 404, with its own heading and the requested name', async () => {
		const error = new Error('Xalians API request failed (404).');
		error.status = 404;
		db.callListPublicXalians.mockRejectedValue(error);

		renderPage('does-not-exist');

		expect(await screen.findByRole('heading', { name: 'No account by that name' })).toBeInTheDocument();
		expect(screen.getByText('Account')).toBeInTheDocument();
		expect(screen.getByText('does-not-exist')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
		expect(screen.queryByRole('link', { name: 'Open the encyclopedia' })).not.toBeInTheDocument();
	});

	it('keeps the generic error state for a non-404 failure', async () => {
		db.callListPublicXalians.mockRejectedValue(new Error('network down'));

		renderPage('some-user');

		expect(await screen.findByText("Could not load this account's Xalians. Please try again later.")).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: 'No account by that name' })).not.toBeInTheDocument();
	});

	it('loads the account collection normally when the lookup succeeds', async () => {
		db.callListPublicXalians.mockResolvedValue({ items: [], nextCursor: undefined });

		renderPage('nick-user');

		await waitFor(() => expect(db.callListPublicXalians).toHaveBeenCalledWith('nick-user'));
		expect(await screen.findByText('No Xalians yet')).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 1, name: 'nick-user' })).toBeInTheDocument();
	});
});
