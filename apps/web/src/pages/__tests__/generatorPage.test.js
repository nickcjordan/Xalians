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

const currentUserInfo = vi.fn();
vi.mock('aws-amplify', () => ({
	Auth: { currentUserInfo: (...args) => currentUserInfo(...args) },
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
		currentUserInfo.mockResolvedValue(null);
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
});

describe('GeneratorPage, signed in', () => {
	beforeEach(() => {
		currentUserInfo.mockResolvedValue({ username: 'nick', attributes: { email: 'nick@example.com', email_verified: true } });
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
