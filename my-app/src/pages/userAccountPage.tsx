// Tier: chrome. The signed-in user's own Xalians: a grid of tiles linking
// out to each species' record, with a delete control on each (this is the
// user's own faction, so removal lives here — userDetailsPage.tsx reads
// someone else's holdings and carries no delete control).
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Auth, Hub } from 'aws-amplify';
import { Trash2 } from 'lucide-react';

import XalianNavbar from '../components/navbar';
import VerifyRemoveXalianModal from '../components/verifyRemoveXalianModal';
import SignInModal from '../components/auth/signInModal';
import SignUpModal from '../components/auth/signUpModal';
import VerifyEmailModal from '../components/auth/verifyEmailModal';
import XalianImage from '../components/xalianImage';
import { routeFor } from '../lore/routeFor';
import * as authUtil from '../utils/authUtil';
import * as dbApi from '../utils/dbApi';

import { Shell, Masthead } from '@/components/system/masthead';
import { HelixSpinner } from '@/components/system/brand';
import { EmptyState } from '@/components/system/record';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type AuthUser = { username: string; hasVerifiedEmail: boolean } | null;

function UserAccountPage() {
	const [loggedInUser, setLoggedInUser] = React.useState<AuthUser>(null);
	const [xalians, setXalians] = React.useState<any[]>([]);
	const [isLoading, setIsLoading] = React.useState(false);
	const [signedOut, setSignedOut] = React.useState(false);
	const [message, setMessage] = React.useState<string | null>(null);

	const [signInModalShow, setSignInModalShow] = React.useState(false);
	const [signupModalShow, setSignupModalShow] = React.useState(false);
	const [verifyEmailModalShow, setVerifyEmailModalShow] = React.useState(false);
	const [username, setUsername] = React.useState<string | undefined>();
	const [email, setEmail] = React.useState<string | undefined>();
	const [password, setPassword] = React.useState<string | undefined>();

	const [xalianToDelete, setXalianToDelete] = React.useState<any>(null);
	const [verifyRemoveShow, setVerifyRemoveShow] = React.useState(false);

	const updateXaliansState = React.useCallback((forUsername: string) => {
		dbApi
			.callGetUser(forUsername, true)
			.then((user: any) => {
				setXalians(user.xalians);
				setIsLoading(false);
			})
			.catch(() => {
				setIsLoading(false);
				setMessage('Could not load your Xalians. Please try again later.');
			});
	}, []);

	const refreshUser = React.useCallback(() => {
		setIsLoading(true);
		Auth.currentUserInfo()
			.then((data: any) => {
				if (data) {
					const u = authUtil.buildAuthState(data);
					setLoggedInUser(u);
					setSignedOut(false);
					setMessage(null);
					updateXaliansState(u.username);
				} else {
					setIsLoading(false);
					setSignedOut(true);
				}
			})
			.catch(() => {
				setIsLoading(false);
				setSignedOut(true);
			});
	}, [updateXaliansState]);

	React.useEffect(() => {
		refreshUser();
		const authListener = (data: any) => {
			if (data.payload.event === 'signIn') {
				setSignInModalShow(false);
				refreshUser();
			}
			if (data.payload.event === 'signIn_failure' && data.payload.data.code === 'UserNotConfirmedException') {
				setSignInModalShow(false);
				setVerifyEmailModalShow(true);
			}
		};
		Hub.listen('auth', authListener);
		return () => Hub.remove('auth', authListener);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const signUpCallback = (su: string, se: string, sp: string) => {
		setUsername(su);
		setEmail(se);
		setPassword(sp);
		setVerifyEmailModalShow(true);
	};

	const emailVerifiedCallback = () => {
		setVerifyEmailModalShow(false);
		setSignInModalShow(true);
	};

	const deleteXalianCallback = (xalian: any) => {
		setXalianToDelete(xalian);
		setVerifyRemoveShow(true);
	};

	const verifyRemoveXalianCallback = () => {
		setXalians((prev) => prev.filter((x) => x.xalianId !== xalianToDelete.xalianId));
		setVerifyRemoveShow(false);
		setXalianToDelete(null);
	};

	const closeModalCallback = () => {
		setVerifyRemoveShow(false);
		setXalianToDelete(null);
	};

	const renderXalianTile = (xalian: any) => {
		const x = xalian.attributes;
		const primaryType = x.elements.primaryType.toLowerCase();
		const secondaryType = x.elements.secondaryType.toLowerCase();
		return (
			<Card key={xalian.xalianId} variant="link" className={`el-${primaryType} relative flex flex-col p-0`}>
				<Link to={routeFor('species', x.species.name.toLowerCase())} className="flex flex-1 flex-col no-underline">
					<div className="aspect-square w-full bg-el">
						<XalianImage colored speciesName={x.species.name} primaryType={x.elements.primaryType} secondaryType={x.elements.secondaryType} moreClasses="w-full" />
					</div>
					<div className="flex flex-col gap-2 p-3">
						<span className="type-legend text-ink">{x.species.name}</span>
						<div className="flex flex-wrap gap-2">
							<span className={`el-${primaryType}`}><Badge variant="chip">{x.elements.primaryType}</Badge></span>
							<span className={`el-${secondaryType}`}><Badge variant="chip">{x.elements.secondaryType}</Badge></span>
						</div>
					</div>
				</Link>
				<Button
					variant="ghost"
					size="icon"
					className="absolute top-2 right-2 bg-s0"
					title="Release this Xalian"
					aria-label={`Release ${x.species.name} from your account`}
					onClick={() => deleteXalianCallback(xalian)}
				>
					<Trash2 />
				</Button>
			</Card>
		);
	};

	return (
		<main className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
			<XalianNavbar />

			<Shell className="pb-16">
				<Masthead kicker="Account" title={(loggedInUser && loggedInUser.username) || 'Your account'} />

				{isLoading && (
					<div className="flex justify-center py-16">
						<HelixSpinner />
					</div>
				)}

				{!isLoading && signedOut && (
					<EmptyState legend="Sign in to see your Xalians">
						<div className="mt-1 flex items-center gap-4">
							<Button onClick={() => setSignInModalShow(true)}>Sign in</Button>
							<Button variant="link" onClick={() => setSignupModalShow(true)}>Create account</Button>
						</div>
					</EmptyState>
				)}

				{!isLoading && !signedOut && message && <EmptyState legend={message} />}

				{!isLoading && !signedOut && !message && xalians.length === 0 && (
					<EmptyState legend="No Xalians yet">
						Generate one and keep it to see it here.
						<div className="mt-3">
							<Button asChild>
								<Link to="/generator">Generate a Xalian</Link>
							</Button>
						</div>
					</EmptyState>
				)}

				{!isLoading && !signedOut && xalians.length > 0 && (
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
						{xalians.map((x) => renderXalianTile(x))}
					</div>
				)}
			</Shell>

			{xalianToDelete && loggedInUser && (
				<VerifyRemoveXalianModal
					show={verifyRemoveShow}
					onHide={closeModalCallback}
					onXalianDelete={verifyRemoveXalianCallback}
					xalian={xalianToDelete.attributes}
					username={loggedInUser.username}
				/>
			)}

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
		</main>
	);
}

export default UserAccountPage;
