import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
	currentUser: vi.fn(),
	buildAuthState: vi.fn((data) => ({
		userId: data.attributes.sub,
		username: data.username,
		email: data.attributes.email,
		hasVerifiedEmail: data.attributes.email_verified === true,
	})),
	signIn: vi.fn(),
	signUp: vi.fn(),
	confirmSignUp: vi.fn(),
	resendConfirmationCode: vi.fn(),
}));
const db = vi.hoisted(() => ({
	callListXalians: vi.fn(),
	callReleaseXalian: vi.fn(),
}));
const hub = vi.hoisted(() => ({ listen: vi.fn(() => vi.fn()) }));

vi.mock('../../utils/authUtil', () => auth);
vi.mock('../../utils/dbApi', () => db);
vi.mock('aws-amplify/utils', () => ({ Hub: hub }));
vi.mock('../../components/navbar', () => ({ default: () => <nav aria-label="Test navigation" /> }));
vi.mock('../../components/record/RecordTile', () => ({ default: () => null }));
vi.mock('../../components/record/RecordView', () => ({ default: () => null }));

import UserAccountPage from '../userAccountPage';

function renderPage() {
	return render(
		<MemoryRouter>
			<UserAccountPage />
		</MemoryRouter>
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	db.callListXalians.mockResolvedValue({ items: [], nextCursor: undefined });
});

describe('account auth integration', () => {
	it('renders an intentional signed-out state without calling the protected API', async () => {
		auth.currentUser.mockResolvedValue(null);
		const user = userEvent.setup();
		renderPage();

		expect(await screen.findByText('Sign in to see your Xalians')).toBeInTheDocument();
		expect(db.callListXalians).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: 'Sign in' }));
		expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
	});

	it('loads the caller collection after a verified session resolves', async () => {
		auth.currentUser.mockResolvedValue({
			username: 'nick-user',
			attributes: { sub: 'subject-1', email: 'nick@example.com', email_verified: true },
		});
		renderPage();

		await waitFor(() => expect(db.callListXalians).toHaveBeenCalledWith());
		expect(await screen.findByText('No Xalians yet')).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 1, name: 'nick-user' })).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: 'Generate a Xalian' })
			.every((link) => link.getAttribute('href') === '/generator')).toBe(true);
	});

	it('distinguishes a Cognito outage from a signed-out session', async () => {
		auth.currentUser.mockRejectedValue(new Error('service unavailable'));
		renderPage();

		expect(await screen.findByText('Could not check your sign-in status. Please try again later.')).toBeInTheDocument();
		expect(screen.queryByText('Sign in to see your Xalians')).not.toBeInTheDocument();
		expect(db.callListXalians).not.toHaveBeenCalled();
	});

	it('renders a recoverable protected-API error after authentication succeeds', async () => {
		auth.currentUser.mockResolvedValue({
			username: 'nick-user',
			attributes: { sub: 'subject-1', email: 'nick@example.com', email_verified: true },
		});
		db.callListXalians.mockRejectedValue(new Error('API unavailable'));
		renderPage();

		expect(await screen.findByText('Could not load your Xalians. Please try again later.')).toBeInTheDocument();
		expect(screen.queryByText('No Xalians yet')).not.toBeInTheDocument();
	});
});
