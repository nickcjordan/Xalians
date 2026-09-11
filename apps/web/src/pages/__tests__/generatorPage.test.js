import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import sampleGraviclaw from '../../../../../docs/design/sample-record-graviclaw.json';

// The API module and the navbar are the page's two outside edges. The navbar
// drags in Amplify, GSAP and the whole brand lockup, none of which this test is
// about, so it is stubbed to nothing.
vi.mock('../../utils/dbApi', () => ({
	callShowroomXalian: vi.fn(),
	callGenerateXalian: vi.fn(),
}));
vi.mock('../../components/navbar', () => ({ default: () => null }));
vi.mock('../../components/auth/signInModal', () => ({ default: () => null }));
vi.mock('../../components/auth/verifyEmailModal', () => ({ default: () => null }));

const { currentUser } = vi.hoisted(() => ({ currentUser: vi.fn() }));
vi.mock('../../utils/authUtil', () => ({
	currentUser,
	buildAuthState: (data) => ({
		userId: data.attributes.sub,
		username: data.username,
		email: data.attributes.email,
		hasVerifiedEmail: data.attributes.email_verified === true,
	}),
}));
vi.mock('aws-amplify/utils', () => ({
	Hub: { listen: vi.fn(), remove: vi.fn() },
}));

import GeneratorPage from '../generatorPage';
import * as dbApi from '../../utils/dbApi';

function renderPage() {
	return render(
		<MemoryRouter>
			<GeneratorPage />
		</MemoryRouter>
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	dbApi.callShowroomXalian.mockResolvedValue({ record: sampleGraviclaw, keepable: false });
	dbApi.callGenerateXalian.mockResolvedValue(sampleGraviclaw);
});

describe('GeneratorPage, signed out', () => {
	beforeEach(() => {
		currentUser.mockResolvedValue(null);
	});

	it('pulls the free lever and says the creature cannot be kept', async () => {
		renderPage();

		await waitFor(() => expect(dbApi.callShowroomXalian).toHaveBeenCalledTimes(1));
		expect(dbApi.callGenerateXalian).not.toHaveBeenCalled();

		expect(await screen.findByText('Showroom creature')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Sign in to generate' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 2, name: 'Graviclaw' })).toBeInTheDocument();
	});

	it('generates another showroom creature rather than one it would keep', async () => {
		renderPage();
		const button = await screen.findByRole('button', { name: 'Generate another' });

		button.click();

		await waitFor(() => expect(dbApi.callShowroomXalian).toHaveBeenCalledTimes(2));
		expect(dbApi.callGenerateXalian).not.toHaveBeenCalled();
	});

	it('keeps anonymous generation available when the Cognito probe is unavailable', async () => {
		currentUser.mockRejectedValue(new Error('service unavailable'));
		renderPage();

		await waitFor(() => expect(dbApi.callShowroomXalian).toHaveBeenCalledTimes(1));
		expect(dbApi.callGenerateXalian).not.toHaveBeenCalled();
		expect(await screen.findByText('Showroom creature')).toBeInTheDocument();
	});
});

describe('GeneratorPage, signed in', () => {
	beforeEach(() => {
		currentUser.mockResolvedValue({ username: 'nick', attributes: { sub: 'nick', email: 'nick@example.com', email_verified: true } });
	});

	it('still opens on the showroom, so arriving costs nothing', async () => {
		renderPage();

		await waitFor(() => expect(dbApi.callShowroomXalian).toHaveBeenCalledTimes(1));
		expect(dbApi.callGenerateXalian).not.toHaveBeenCalled();
	});

	it('generates into the registry, and the record it shows is already the caller\'s', async () => {
		renderPage();
		await waitFor(() => expect(dbApi.callShowroomXalian).toHaveBeenCalledTimes(1));
		const button = await screen.findByRole('button', { name: 'Generate another' });

		await waitFor(() => expect(screen.queryByText('Showroom creature')).toBeInTheDocument());
		button.click();

		await waitFor(() => expect(dbApi.callGenerateXalian).toHaveBeenCalledTimes(1));
		expect(await screen.findByText('Kept')).toBeInTheDocument();
		expect(screen.queryByText('Showroom creature')).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'See your Xalians' })).toHaveAttribute('href', '/account');
	});
});
