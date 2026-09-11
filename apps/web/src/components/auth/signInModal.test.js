import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ signIn: vi.fn() }));
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
});
