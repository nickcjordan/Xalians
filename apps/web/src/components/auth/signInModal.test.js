import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ signIn: vi.fn(), resetPassword: vi.fn(), confirmResetPassword: vi.fn() }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('../../utils/authUtil', () => auth);
vi.mock('sonner', () => ({ toast }));

import SignInModal from './signInModal';

function renderModal(overrides = {}) {
	const props = {
		show: true,
		onHide: vi.fn(),
		callback: vi.fn(),
		mustVerifyEmailCallback: vi.fn(),
		switchToSignUp: vi.fn(),
		...overrides,
	};
	render(<SignInModal {...props} />);
	return props;
}

async function submitCredentials(user, username = 'nick-user', password = 'password1') {
	await user.type(screen.getByLabelText('Username'), username);
	await user.type(screen.getByLabelText('Password'), password);
	await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

beforeEach(() => vi.clearAllMocks());

describe('SignInModal Cognito boundary', () => {
	it('closes and reports a successful sign-in', async () => {
		auth.signIn.mockResolvedValue({ isSignedIn: true });
		const user = userEvent.setup();
		const props = renderModal();

		await submitCredentials(user);

		await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith('nick-user', 'password1'));
		expect(props.callback).toHaveBeenCalledTimes(1);
		expect(props.onHide).toHaveBeenCalledTimes(1);
	});

	it.each(['NotAuthorizedException', 'UserNotFoundException'])(
		'shows a non-enumerating credential error for %s',
		async (name) => {
			auth.signIn.mockRejectedValue(Object.assign(new Error('raw Cognito message'), { name }));
			const user = userEvent.setup();
			renderModal();

			await submitCredentials(user);

			expect(await screen.findByText('Username or password is incorrect.')).toBeInTheDocument();
			expect(toast.error).not.toHaveBeenCalled();
		}
	);

	it('moves an unconfirmed user into verification', async () => {
		auth.signIn.mockRejectedValue(Object.assign(new Error('confirm first'), { name: 'UserNotConfirmedException' }));
		const user = userEvent.setup();
		const props = renderModal();

		await submitCredentials(user);

		await waitFor(() => expect(props.mustVerifyEmailCallback).toHaveBeenCalledWith('nick-user'));
		expect(props.onHide).toHaveBeenCalledTimes(1);
	});

	it('keeps the form recoverable and reports a generic service error', async () => {
		auth.signIn.mockRejectedValue(new Error('Cognito is unavailable'));
		const user = userEvent.setup();
		const props = renderModal();

		await submitCredentials(user);

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cognito is unavailable'));
		expect(props.onHide).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
	});

	it('shows the password helper before submit', () => {
		renderModal();

		expect(screen.getByText('At least 8 characters.')).toBeInTheDocument();
	});

	it('sets the expected autocomplete attributes', () => {
		renderModal();

		expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username');
		expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
	});

	it('swaps to the create-account dialog from the cross-link', async () => {
		const user = userEvent.setup();
		const props = renderModal();

		await user.click(screen.getByRole('button', { name: 'Create an account.' }));

		expect(props.onHide).toHaveBeenCalledTimes(1);
		expect(props.switchToSignUp).toHaveBeenCalledTimes(1);
	});
});

describe('SignInModal forgot password', () => {
	it('walks from sign in through the reset flow back to sign in', async () => {
		auth.resetPassword.mockResolvedValue({});
		auth.confirmResetPassword.mockResolvedValue({});
		const user = userEvent.setup();
		renderModal();

		await user.click(screen.getByRole('button', { name: 'Forgot password?' }));

		expect(await screen.findByRole('heading', { name: 'Reset password' })).toBeInTheDocument();

		await user.type(screen.getByLabelText('Username'), 'nick-user');
		await user.click(screen.getByRole('button', { name: 'Send reset code' }));

		await waitFor(() => expect(auth.resetPassword).toHaveBeenCalledWith('nick-user'));

		expect(await screen.findByLabelText('Verification code')).toBeInTheDocument();
		expect(screen.getByLabelText('Verification code')).toHaveAttribute('autocomplete', 'one-time-code');
		expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password');
		expect(screen.getByText('At least 8 characters.')).toBeInTheDocument();

		await user.type(screen.getByLabelText('Verification code'), '123456');
		await user.type(screen.getByLabelText('New password'), 'newpassword1');
		await user.click(screen.getByRole('button', { name: 'Reset password' }));

		await waitFor(() => expect(auth.confirmResetPassword).toHaveBeenCalledWith('nick-user', '123456', 'newpassword1'));
		expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
		expect(toast.success).toHaveBeenCalledWith('Password updated. Sign in with the new one.');
	});

	it('surfaces a reset request error in the dialog field-error style', async () => {
		auth.resetPassword.mockRejectedValue(new Error('No account found for that username.'));
		const user = userEvent.setup();
		renderModal();

		await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
		await user.type(await screen.findByLabelText('Username'), 'nick-user');
		await user.click(screen.getByRole('button', { name: 'Send reset code' }));

		expect(await screen.findByText('No account found for that username.')).toBeInTheDocument();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('surfaces a confirm-reset error in the dialog field-error style', async () => {
		auth.resetPassword.mockResolvedValue({});
		auth.confirmResetPassword.mockRejectedValue(new Error('Invalid verification code.'));
		const user = userEvent.setup();
		renderModal();

		await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
		await user.type(await screen.findByLabelText('Username'), 'nick-user');
		await user.click(screen.getByRole('button', { name: 'Send reset code' }));

		await screen.findByLabelText('Verification code');
		await user.type(screen.getByLabelText('Verification code'), 'bad-code');
		await user.type(screen.getByLabelText('New password'), 'newpassword1');
		await user.click(screen.getByRole('button', { name: 'Reset password' }));

		expect(await screen.findByText('Invalid verification code.')).toBeInTheDocument();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('returns to sign in from either reset step via Back to sign in', async () => {
		const user = userEvent.setup();
		renderModal();

		await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
		await user.click(await screen.findByRole('button', { name: 'Back to sign in' }));

		expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
	});
});
