// Tier: chrome. The navbar's auth controls: sign in, create account, verify,
// sign out. Never the page's one primary key — the navbar never carries the
// accent-filled forward action (docs/DESIGN_SYSTEM.md section 3.1).
import * as React from 'react';
import { Link } from 'react-router';
import { Hub } from 'aws-amplify/utils';

import * as authUtil from '../../utils/authUtil';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const SignUpModal = React.lazy(() => import('./signUpModal'));
const VerifyEmailModal = React.lazy(() => import('./verifyEmailModal'));
const SignInModal = React.lazy(() => import('./signInModal'));

type AuthState = { username: string; hasVerifiedEmail: boolean } | null;

type AuthButtonGroupProps = {
	/** Key size; the desktop navbar passes "sm" so a key's mass clears its hairline. */
	size?: "default" | "sm";
	authAlertCallback: (user: AuthState) => void;
};

function AuthButtonGroup({ authAlertCallback, size = "default" }: AuthButtonGroupProps) {
	const [loggedInUser, setLoggedInUser] = React.useState<AuthState>(null);
	const [signupModalShow, setSignupModalShow] = React.useState(false);
	const [verifyEmailModalShow, setVerifyEmailModalShow] = React.useState(false);
	const [signInModalShow, setSignInModalShow] = React.useState(false);
	const [username, setUsername] = React.useState<string | undefined>();
	const [email, setEmail] = React.useState<string | undefined>();
	const [password, setPassword] = React.useState<string | undefined>();

	const handleSignInEvent = React.useCallback(
		async () => {
			try {
				const data = await authUtil.currentUser();
				if (!data) return;
				const authState = authUtil.buildAuthState(data);
				setLoggedInUser(authState);
				authAlertCallback(authState);
			} catch {
				// A Hub event can race a failed attribute refresh. Leave the last
				// known state in place; the owning page handles service feedback.
			}
		},
		[authAlertCallback]
	);

	const handleSignOutEvent = React.useCallback(() => {
		setLoggedInUser(null);
		authAlertCallback(null);
	}, [authAlertCallback]);

	React.useEffect(() => {
		authUtil.currentUser()
			.then((data: any) => {
				if (data && data.attributes) {
					setLoggedInUser(authUtil.buildAuthState(data));
				}
			})
			.catch(() => {
				// The controls remain usable as signed-out controls. Pages that need
				// to distinguish signed-out from unavailable resolve auth themselves.
			});

		const authListener = (data: any) => {
			switch (data.payload.event) {
				case 'signedIn':
					handleSignInEvent();
					break;
				case 'signedOut':
					handleSignOutEvent();
					break;
				default:
					break;
			}
		};
		const stopListening = Hub.listen('auth', authListener);
		return stopListening;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const signUpCallback = (signedUpUsername: string, signedUpEmail: string, signedUpPassword: string) => {
		setUsername(signedUpUsername);
		setEmail(signedUpEmail);
		setPassword(signedUpPassword);
		setVerifyEmailModalShow(true);
	};

	const emailVerifiedCallback = () => {
		setVerifyEmailModalShow(false);
		authUtil
			.signIn(username as string, password as string)
			.then(() => import('../../utils/dbApi'))
			.then(({ callCreateUser }) => callCreateUser({ userId: username, xalianIds: [] }))
			.catch(() => {
				setSignInModalShow(true);
			});
	};

	const handleSignOut = () => {
		authUtil.signOut();
	};

	return (
		<React.Fragment>
			{loggedInUser ? (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size={size}>{loggedInUser.username}</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem asChild>
							<Link to="/account">Account</Link>
						</DropdownMenuItem>
						{!loggedInUser.hasVerifiedEmail && (
							<DropdownMenuItem onSelect={() => setVerifyEmailModalShow(true)}>Verify email</DropdownMenuItem>
						)}
						<DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			) : (
				<React.Fragment>
					<Button variant="ghost" size={size} onClick={() => setSignInModalShow(true)}>Sign in</Button>
					<Button variant="secondary" size={size} onClick={() => setSignupModalShow(true)}>Create account</Button>
				</React.Fragment>
			)}

			<React.Suspense fallback={null}>
				{signupModalShow && (
					<SignUpModal
						show
						callback={signUpCallback}
						onHide={() => setSignupModalShow(false)}
					/>
				)}

				{verifyEmailModalShow && (
					<VerifyEmailModal
						show
						callback={emailVerifiedCallback}
						onHide={() => setVerifyEmailModalShow(false)}
						username={username}
						email={email}
					/>
				)}

				{signInModalShow && (
					<SignInModal
						show
						callback={() => {}}
						onHide={() => setSignInModalShow(false)}
						mustVerifyEmailCallback={(u) => {
							setUsername(u || username);
							setVerifyEmailModalShow(true);
						}}
						username={username}
						password={password}
					/>
				)}
			</React.Suspense>
		</React.Fragment>
	);
}

export default AuthButtonGroup;
