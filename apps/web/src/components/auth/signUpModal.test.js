import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ signUp: vi.fn() }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('../../utils/authUtil', () => auth);
vi.mock('sonner', () => ({ toast }));

import SignUpModal from './signUpModal';

function renderModal(overrides = {}) {
	const props = {
		show: true,
		onHide: vi.fn(),
		callback: vi.fn(),
		switchToSignIn: vi.fn(),
		...overrides,
	};
	render(<SignUpModal {...props} />);
	return props;
}

beforeEach(() => vi.clearAllMocks());

describe('SignUpModal', () => {
	it('shows the password helper before submit', () => {
		renderModal();

		expect(screen.getByText('At least 8 characters.')).toBeInTheDocument();
	});

	it('sets the expected autocomplete attributes', () => {
		renderModal();

		expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username');
		expect(screen.getByLabelText('Email address')).toHaveAttribute('autocomplete', 'email');
		expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
		expect(screen.getByLabelText('Confirm password')).toHaveAttribute('autocomplete', 'new-password');
	});

	it('swaps to the sign-in dialog from the cross-link', async () => {
		const user = userEvent.setup();
		const props = renderModal();

		await user.click(screen.getByRole('button', { name: 'Sign in.' }));

		expect(props.onHide).toHaveBeenCalledTimes(1);
		expect(props.switchToSignIn).toHaveBeenCalledTimes(1);
	});
});
