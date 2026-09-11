// Tier: chrome. The signed-in user's own Xalians: the registry records
// generated under their name, as tiles that open the full record, each with a
// release key (this is the user's own collection, so removal lives here;
// userDetailsPage.tsx reads someone else's and carries no release control).
//
// Legacy kept Xalians are not shown. The XalianTable rows people kept under the
// old flow still exist and the table is retained, but nothing reads it any
// more; what becomes of those roughly 70 records is Nick's decision (#180).
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Hub } from 'aws-amplify/utils';
import { Trash2 } from 'lucide-react';
import type { XalianRecord } from '@xalians/content/schema';
import { speciesDisplayName } from '@xalians/rules/generator';

import XalianNavbar from '../components/navbar';
import VerifyRemoveXalianModal from '../components/verifyRemoveXalianModal';
import SignInModal from '../components/auth/signInModal';
import SignUpModal from '../components/auth/signUpModal';
import VerifyEmailModal from '../components/auth/verifyEmailModal';
import RecordTile from '../components/record/RecordTile';
import RecordView from '../components/record/RecordView';
import * as authUtil from '../utils/authUtil';
import * as dbApi from '../utils/dbApi';

import { Shell, Masthead } from '@/components/system/masthead';
import { HelixSpinner } from '@/components/system/brand';
import { EmptyState } from '@/components/system/record';
import { VisuallyHidden } from '@/components/system/a11y';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type AuthUser = { username: string; hasVerifiedEmail: boolean } | null;

function UserAccountPage() {
	const [loggedInUser, setLoggedInUser] = React.useState<AuthUser>(null);
	const [records, setRecords] = React.useState<XalianRecord[]>([]);
	const [cursor, setCursor] = React.useState<string | undefined>();
	const [isLoading, setIsLoading] = React.useState(true);
	const [isLoadingMore, setIsLoadingMore] = React.useState(false);
	const [signedOut, setSignedOut] = React.useState(false);
	const [message, setMessage] = React.useState<string | null>(null);

	const [signInModalShow, setSignInModalShow] = React.useState(false);
	const [signupModalShow, setSignupModalShow] = React.useState(false);
	const [verifyEmailModalShow, setVerifyEmailModalShow] = React.useState(false);
	const [username, setUsername] = React.useState<string | undefined>();
	const [email, setEmail] = React.useState<string | undefined>();
	const [password, setPassword] = React.useState<string | undefined>();

	const [openRecord, setOpenRecord] = React.useState<XalianRecord | null>(null);
	const [recordToRelease, setRecordToRelease] = React.useState<XalianRecord | null>(null);
	const [verifyReleaseShow, setVerifyReleaseShow] = React.useState(false);

	const loadFirstPage = React.useCallback(() => {
		dbApi
			.callListXalians()
			.then((page: any) => {
				setRecords(page.items);
				setCursor(page.nextCursor);
				setIsLoading(false);
			})
			.catch(() => {
				setIsLoading(false);
				setMessage('Could not load your Xalians. Please try again later.');
			});
	}, []);

	const loadMore = () => {
		if (!cursor) return;
		setIsLoadingMore(true);
		dbApi
			.callListXalians(undefined, cursor)
			.then((page: any) => {
				setRecords((prev) => [...prev, ...page.items]);
				setCursor(page.nextCursor);
				setIsLoadingMore(false);
			})
			.catch(() => {
				setIsLoadingMore(false);
				setMessage('Could not load more Xalians. Please try again later.');
			});
	};

	const refreshUser = React.useCallback(() => {
		setIsLoading(true);
		authUtil.currentUser()
			.then((data: any) => {
				if (data) {
					setLoggedInUser(authUtil.buildAuthState(data));
					setSignedOut(false);
					setMessage(null);
					loadFirstPage();
				} else {
					setIsLoading(false);
					setLoggedInUser(null);
					setRecords([]);
					setCursor(undefined);
					setMessage(null);
					setSignedOut(true);
				}
			})
			.catch(() => {
				setIsLoading(false);
				setLoggedInUser(null);
				setRecords([]);
				setCursor(undefined);
				setSignedOut(false);
				setMessage('Could not check your sign-in status. Please try again later.');
			});
	}, [loadFirstPage]);

	React.useEffect(() => {
		refreshUser();
		const authListener = (data: any) => {
			if (data.payload.event === 'signedIn') {
				setSignInModalShow(false);
				refreshUser();
			}
			if (data.payload.event === 'signedOut') {
				setLoggedInUser(null);
				setRecords([]);
				setCursor(undefined);
				setMessage(null);
				setSignedOut(true);
			}
		};
		const stopListening = Hub.listen('auth', authListener);
		return stopListening;
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

	const askToRelease = (record: XalianRecord) => {
		setRecordToRelease(record);
		setVerifyReleaseShow(true);
	};

	const onReleased = () => {
		setRecords((prev) => prev.filter((x) => x.id !== (recordToRelease && recordToRelease.id)));
		if (openRecord && recordToRelease && openRecord.id === recordToRelease.id) {
			setOpenRecord(null);
		}
		setVerifyReleaseShow(false);
		setRecordToRelease(null);
	};

	const closeReleaseModal = () => {
		setVerifyReleaseShow(false);
		setRecordToRelease(null);
	};

	return (
		<main id="main" className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
			<XalianNavbar />

			<Shell className="pb-16">
				<Masthead
					kicker="Account"
					title={(loggedInUser && loggedInUser.username) || 'Your account'}
					subtitle={records.length > 0 ? `${records.length} generated` : undefined}
					aside={
						!signedOut ? (
							<Button asChild>
								<Link to="/generator">Generate a Xalian</Link>
							</Button>
						) : undefined
					}
				/>

				{isLoading && (
					<div className="flex justify-center py-16">
						<HelixSpinner />
					</div>
				)}

				{!isLoading && signedOut && (
					<EmptyState legend="Sign in to see your Xalians">
						Anything the Generator prints for you is written into the registry under your name, kept
						at its own record, and drawn on for every game on the site.
						<div className="mt-4 flex items-center gap-4">
							<Button onClick={() => setSignInModalShow(true)}>Sign in</Button>
							<Button variant="link" onClick={() => setSignupModalShow(true)}>Create account</Button>
						</div>
					</EmptyState>
				)}

				{!isLoading && !signedOut && message && <EmptyState legend={message} />}

				{!isLoading && !signedOut && !message && records.length === 0 && (
					<EmptyState legend="No Xalians yet">
						Generate one and it is yours.
						<div className="mt-3">
							<Button asChild>
								<Link to="/generator">Generate a Xalian</Link>
							</Button>
						</div>
					</EmptyState>
				)}

				{!isLoading && !signedOut && !message && records.length > 0 && (
					<React.Fragment>
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
							{records.map((record) => (
								<RecordTile
									key={record.id}
									record={record}
									onOpen={setOpenRecord}
									action={
										<Button
											variant="ghost"
											size="icon"
											className="bg-s0"
											aria-label={`Release ${speciesDisplayName(record.species)}`}
											onClick={() => askToRelease(record)}
										>
											<Trash2 />
										</Button>
									}
								/>
							))}
						</div>

						{cursor && (
							<div className="mt-6 flex justify-center">
								<Button variant="secondary" disabled={isLoadingMore} onClick={loadMore}>
									{isLoadingMore ? 'Loading' : 'Load more'}
								</Button>
							</div>
						)}
					</React.Fragment>
				)}
			</Shell>

			<Dialog open={!!openRecord} onOpenChange={(open) => !open && setOpenRecord(null)}>
				<DialogContent className="sm:max-w-4xl">
					<DialogHeader>
						<VisuallyHidden>
							<DialogTitle>{openRecord ? speciesDisplayName(openRecord.species) : 'Record'}</DialogTitle>
						</VisuallyHidden>
					</DialogHeader>
					<ScrollArea className="max-h-[75vh] pr-4">
						{openRecord && <RecordView record={openRecord} kicker="Yours" />}
					</ScrollArea>
				</DialogContent>
			</Dialog>

			{recordToRelease && (
				<VerifyRemoveXalianModal
					show={verifyReleaseShow}
					onHide={closeReleaseModal}
					onXalianDelete={onReleased}
					record={recordToRelease}
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
