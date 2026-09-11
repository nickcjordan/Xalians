import { beforeEach, describe, expect, it, vi } from 'vitest';

const amplifyAuth = vi.hoisted(() => ({
	confirmSignUp: vi.fn(),
	fetchAuthSession: vi.fn(),
	fetchUserAttributes: vi.fn(),
	getCurrentUser: vi.fn(),
	resendSignUpCode: vi.fn(),
	signIn: vi.fn(),
	signOut: vi.fn(),
	signUp: vi.fn(),
}));

vi.mock('aws-amplify/auth', () => amplifyAuth);

import * as authUtil from '../authUtil';

beforeEach(() => vi.clearAllMocks());

describe('Amplify 6 auth boundary', () => {
	it('normalizes the current user and string-valued Cognito attributes', async () => {
		amplifyAuth.getCurrentUser.mockResolvedValue({ username: 'nick', userId: 'subject-1' });
		amplifyAuth.fetchUserAttributes.mockResolvedValue({ email: 'nick@example.com', email_verified: 'true' });

		const user = await authUtil.currentUser();

		expect(user).toMatchObject({
			id: 'subject-1',
			username: 'nick',
			attributes: { sub: 'subject-1', email: 'nick@example.com', email_verified: true },
		});
		expect(authUtil.buildAuthState(user)).toEqual({
			userId: 'subject-1',
			username: 'nick',
			email: 'nick@example.com',
			hasVerifiedEmail: true,
		});
	});

	it('returns null for the signed-out session instead of leaking an exception into page mounts', async () => {
		amplifyAuth.getCurrentUser.mockRejectedValue(Object.assign(new Error('signed out'), {
			name: 'UserUnAuthenticatedException',
		}));

		await expect(authUtil.currentUser()).resolves.toBeNull();
	});

	it('uses the Amplify 6 named input shapes', async () => {
		await authUtil.signUp('nick@example.com', 'nick-user', 'password');
		await authUtil.confirmSignUp('nick-user', '123456');
		await authUtil.resendConfirmationCode('nick-user');
		await authUtil.signIn('nick-user', 'password');

		expect(amplifyAuth.signUp).toHaveBeenCalledWith({
			username: 'nick-user',
			password: 'password',
			options: { userAttributes: { email: 'nick@example.com' } },
		});
		expect(amplifyAuth.confirmSignUp).toHaveBeenCalledWith({ username: 'nick-user', confirmationCode: '123456' });
		expect(amplifyAuth.resendSignUpCode).toHaveBeenCalledWith({ username: 'nick-user' });
		expect(amplifyAuth.signIn).toHaveBeenCalledWith({ username: 'nick-user', password: 'password' });
	});

	it('returns the current ID token for API authorization', async () => {
		amplifyAuth.fetchAuthSession.mockResolvedValue({ tokens: { idToken: { toString: () => 'jwt-token' } } });

		await expect(authUtil.getIdToken()).resolves.toBe('jwt-token');
	});
});
