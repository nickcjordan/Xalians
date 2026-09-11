import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@aws-amplify/core', () => ({
	Hub: { listen: vi.fn(), remove: vi.fn() },
}));

vi.mock('@aws-amplify/auth', () => ({
	Auth: { currentUserInfo: vi.fn().mockResolvedValue(null) },
}));

vi.mock('../../utils/authUtil', () => ({
	buildAuthState: vi.fn(),
	signIn: vi.fn(),
	signOut: vi.fn().mockResolvedValue(true),
}));

import AuthButtonGroup from './authButtonGroup';

describe('AuthButtonGroup', () => {
	it('loads the sign-in form only after the user asks for it', async () => {
		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<AuthButtonGroup authAlertCallback={vi.fn()} />
			</MemoryRouter>
		);

		expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Sign in' }));

		expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
	});
});
