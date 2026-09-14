import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';

vi.mock('aws-amplify/utils', () => ({
	Hub: { listen: vi.fn(), remove: vi.fn() },
}));

vi.mock('../../utils/authUtil', () => ({
	currentUser: vi.fn().mockResolvedValue(null),
	buildAuthState: vi.fn(),
	confirmSignUp: vi.fn(),
	resendConfirmationCode: vi.fn(),
	signIn: vi.fn(),
	signOut: vi.fn().mockResolvedValue(true),
	signUp: vi.fn(),
}));

import AuthButtonGroup from './authButtonGroup';
import * as authUtil from '../../utils/authUtil';

beforeEach(() => {
	vi.clearAllMocks();
	authUtil.currentUser.mockResolvedValue(null);
	authUtil.buildAuthState.mockImplementation((data) => ({
		username: data.username,
		hasVerifiedEmail: data.attributes.email_verified === true,
	}));
	authUtil.signUp.mockResolvedValue({ isSignUpComplete: false });
});

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

	it('restores keyboard focus to the opener when a dialog closes', async () => {
		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<AuthButtonGroup authAlertCallback={vi.fn()} />
			</MemoryRouter>
		);

		const trigger = await screen.findByRole('button', { name: 'Sign in' });
		await user.click(trigger);
		expect(await screen.findByLabelText('Username')).toHaveFocus();

		await user.keyboard('{Escape}');
		expect(trigger).toHaveFocus();
	});

	it('keeps signed-out controls usable when the initial Cognito probe fails', async () => {
		authUtil.currentUser.mockRejectedValue(new Error('service unavailable'));
		render(
			<MemoryRouter>
				<AuthButtonGroup authAlertCallback={vi.fn()} />
			</MemoryRouter>
		);

		expect(await screen.findByRole('button', { name: 'Sign in' })).toBeEnabled();
		expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
	});

	it('renders the unverified session as its signed-in identity', async () => {
		authUtil.currentUser.mockResolvedValue({
			username: 'nick-user',
			attributes: { email_verified: false },
		});
		render(
			<MemoryRouter>
				<AuthButtonGroup authAlertCallback={vi.fn()} />
			</MemoryRouter>
		);

		expect(await screen.findByRole('button', { name: 'nick-user' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
	});

	it('moves an unconfirmed sign-in into the verification dialog', async () => {
		authUtil.signIn.mockRejectedValue(Object.assign(new Error('confirm first'), {
			name: 'UserNotConfirmedException',
		}));
		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<AuthButtonGroup authAlertCallback={vi.fn()} />
			</MemoryRouter>
		);

		await user.click(screen.getByRole('button', { name: 'Sign in' }));
		const signInDialog = await screen.findByRole('dialog');
		await user.type(within(signInDialog).getByLabelText('Username'), 'nick-user');
		await user.type(within(signInDialog).getByLabelText('Password'), 'password1');
		await user.click(within(signInDialog).getByRole('button', { name: 'Sign in' }));

		expect(await screen.findByRole('heading', { name: 'Verify email address' })).toBeInTheDocument();
		expect(screen.getByLabelText('Username')).toHaveValue('nick-user');
	});

	it('moves a successful sign-up into the prefilled verification dialog', async () => {
		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<AuthButtonGroup authAlertCallback={vi.fn()} />
			</MemoryRouter>
		);

		await user.click(screen.getByRole('button', { name: 'Create account' }));
		const signUpDialog = await screen.findByRole('dialog');
		await user.type(within(signUpDialog).getByLabelText('Username'), 'nick-user');
		await user.type(within(signUpDialog).getByLabelText('Email address'), 'nick@example.com');
		await user.type(within(signUpDialog).getByLabelText('Password'), 'password1');
		await user.type(within(signUpDialog).getByLabelText('Confirm password'), 'password1');
		await user.click(within(signUpDialog).getByRole('button', { name: 'Create account' }));

		expect(await screen.findByRole('heading', { name: 'Verify email address' })).toBeInTheDocument();
		expect(screen.getByLabelText('Username')).toHaveValue('nick-user');
		expect(screen.getByLabelText('Email address')).toHaveValue('nick@example.com');
	});
});
