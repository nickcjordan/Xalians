// Tier: chrome. The navbar's auth controls: sign in, create account, verify,
// sign out. Never the page's one primary key — the navbar never carries the
// accent-filled forward action (docs/DESIGN_SYSTEM.md section 3.1).
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Auth, Hub } from 'aws-amplify';
import { store } from 'state-pool';

import SignUpModal from './signUpModal';
import VerifyEmailModal from './verifyEmailModal';
import SignInModal from './signInModal';
import * as authUtil from '../../utils/authUtil';
import * as dbApi from '../../utils/dbApi';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

type AuthState = { username: string; hasVerifiedEmail: boolean } | null;

type AuthButtonGroupProps = {
	authAlertCallback: (user: AuthState) => void;
};

function AuthButtonGroup({ authAlertCallback }: AuthButtonGroupProps) {
	const [loggedInUser, setLoggedInUser] = React.useState<AuthState>(null);
	const [signupModalShow, setSignupModalShow] = React.useState(false);
	const [verifyEmailModalShow, setVerifyEmailModalShow] = React.useState(false);
	const [signInModalShow, setSignInModalShow] = React.useState(false);
	const [username, setUsername] = React.useState<string | undefined>();
	const [email, setEmail] = React.useState<string | undefined>();
	const [password, setPassword] = React.useState<string | undefined>();

	const handleSignInEvent = React.useCallback(
		(data: any) => {
			const authState = authUtil.buildAuthState(data);
			setLoggedInUser(authState);
			authAlertCallback(authState);
		},
		[authAlertCallback]
	);

	const handleSignOutEvent = React.useCallback(() => {
		setLoggedInUser(null);
		authAlertCallback(null);
	}, [authAlertCallback]);

	React.useEffect(() => {
		Auth.currentUserInfo().then((data: any) => {
			if (data && data.attributes) {
				setLoggedInUser(authUtil.buildAuthState(data));
			}
		});

		const authListener = (data: any) => {
			switch (data.payload.event) {
				case 'signIn':
					handleSignInEvent(data.payload.data);
					break;
				case 'signOut':
					handleSignOutEvent();
					break;
				case 'signIn_failure':
					if (data.payload.data.code === 'UserNotConfirmedException') {
						setVerifyEmailModalShow(true);
					}
					break;
				default:
					break;
			}
		};
		Hub.listen('auth', authListener);
		return () => Hub.remove('auth', authListener);
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
			.then(() => {
				dbApi.callCreateUser({ userId: username, xalianIds: [] });
			})
			.catch(() => {
				setSignInModalShow(true);
			});
	};

	const handleSignOut = () => {
		store.clear();
		authUtil.signOut();
	};

	return (
		<React.Fragment>
			{loggedInUser ? (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost">{loggedInUser.username}</Button>
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
					<Button variant="ghost" onClick={() => setSignInModalShow(true)}>Sign in</Button>
					<Button variant="secondary" onClick={() => setSignupModalShow(true)}>Create account</Button>
				</React.Fragment>
			)}

			<SignUpModal
				show={signupModalShow}
				callback={signUpCallback}
				onHide={() => setSignupModalShow(false)}
			/>

			<VerifyEmailModal
				show={verifyEmailModalShow}
				callback={emailVerifiedCallback}
				onHide={() => setVerifyEmailModalShow(false)}
				username={username}
				email={email}
			/>

			<SignInModal
				show={signInModalShow}
				callback={() => {}}
				onHide={() => setSignInModalShow(false)}
				mustVerifyEmailCallback={(u) => {
					setUsername(u || username);
					setVerifyEmailModalShow(true);
				}}
				username={username}
				password={password}
			/>
		</React.Fragment>
	);
}

export default AuthButtonGroup;
