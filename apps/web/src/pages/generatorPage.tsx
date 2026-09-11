import * as React from 'react';
import { Link } from 'react-router-dom';
import { Hub } from 'aws-amplify';
import { toast } from 'sonner';
import type { XalianRecord } from '@xalians/content/schema';

import XalianNavbar from '../components/navbar';
import RecordView from '../components/record/RecordView';
import SignInModal from '../components/auth/signInModal';
import VerifyEmailModal from '../components/auth/verifyEmailModal';
import * as authUtil from '../utils/authUtil';
import * as dbApi from '../utils/dbApi';

import { Shell, Masthead } from '@/components/system/masthead';
import { HelixSpinner } from '@/components/system/brand';
import { EmptyState } from '@/components/system/record';
import { Callout } from '@/components/system/readouts';
import { LiveRegion } from '@/components/system/a11y';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/**
 * Tier: chrome. The Generator: pull the lever, watch a creature that has never
 * existed before come out of it.
 *
 * The two branches are the platform's free lever and its product
 * (docs/design/xalians-platform-vision-and-economy.md section 3). Signed out,
 * GET /xalians/showroom generates a real ratified record that nobody owns and
 * the server never stored: infinite pulls, nothing kept. Signed in,
 * POST /xalians generates one and it is the caller's from the moment it
 * exists, so there is no separate "keep" step to get wrong.
 */

type Mode = 'showroom' | 'owned';
type AuthUser = { username: string; hasVerifiedEmail: boolean } | null;

// issue #197: the generator profile is a real lever now (packages/rules), not just a
// showroom-vs-owned mode. This toggle is exploratory rather than enforcement -- Nick's
// 2026-09-10 direction is a visible control so the two modes can be compared on the live
// site while gating good creatures behind tokens is still parked. It is remembered for
// the session only (sessionStorage), never a persisted account setting.
type GeneratorProfile = 'showroom' | 'full';
const PROFILE_STORAGE_KEY = 'xalians.generatorProfile';

function readStoredProfile(): GeneratorProfile {
	try {
		const stored = window.sessionStorage.getItem(PROFILE_STORAGE_KEY);
		return stored === 'full' ? 'full' : 'showroom';
	} catch {
		return 'showroom';
	}
}

function GeneratorPage() {
	const [record, setRecord] = React.useState<XalianRecord | null>(null);
	const [mode, setMode] = React.useState<Mode>('showroom');
	const [isGenerating, setIsGenerating] = React.useState(true);
	const [loggedInUser, setLoggedInUser] = React.useState<AuthUser>(null);
	const [signInShow, setSignInShow] = React.useState(false);
	const [verifyEmailShow, setVerifyEmailShow] = React.useState(false);
	const [pendingUsername, setPendingUsername] = React.useState<string | undefined>();
	const [profile, setProfile] = React.useState<GeneratorProfile>(() => readStoredProfile());

	const signedIn = !!loggedInUser;

	const generate = React.useCallback((asOwner: boolean, forProfile: GeneratorProfile) => {
		setIsGenerating(true);
		const request = asOwner
			? dbApi.callGenerateXalian(undefined, forProfile)
			: dbApi.callShowroomXalian(forProfile).then((result: any) => result.record);
		return request
			.then((generated: XalianRecord) => {
				setRecord(generated);
				setMode(asOwner ? 'owned' : 'showroom');
				setIsGenerating(false);
			})
			.catch(() => {
				setIsGenerating(false);
				toast.error('The Generator did not answer. Pull the lever again.');
			});
	}, []);

	const handleProfileChange = React.useCallback((value: string) => {
		if (value !== 'showroom' && value !== 'full') return;
		setProfile(value);
		try {
			window.sessionStorage.setItem(PROFILE_STORAGE_KEY, value);
		} catch {
			// sessionStorage unavailable (private mode, blocked site data); the choice
			// just does not survive a reload, which is fine for a session-only control.
		}
	}, []);

	// The session is resolved here rather than waited for from the navbar: the
	// navbar only calls back when the user signs in or out during this visit,
	// so arriving with a session already open would otherwise read as anonymous.
	React.useEffect(() => {
		let cancelled = false;
		authUtil.currentUser()
			.then((data: any) => {
				if (cancelled) return;
				if (data && data.attributes) {
					setLoggedInUser(authUtil.buildAuthState(data));
				}
			})
			.catch(() => {
				// signed out; the showroom is the right branch
			});
		return () => {
			cancelled = true;
		};
	}, []);

	// The first record is always a showroom pull, even for a signed-in visitor:
	// arriving on the page should never spend anything or write to the registry.
	React.useEffect(() => {
		generate(false, profile);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	React.useEffect(() => {
		const authListener = (data: any) => {
			if (data.payload.event === 'signIn') {
				setSignInShow(false);
				setLoggedInUser(authUtil.buildAuthState(data.payload.data));
			}
			if (data.payload.event === 'signOut') {
				setLoggedInUser(null);
			}
		};
		Hub.listen('auth', authListener);
		return () => Hub.remove('auth', authListener);
	}, []);

	return (
		<React.Fragment>
			<XalianNavbar authAlertCallback={setLoggedInUser} />

			<main id="main" className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
				<Shell className="pb-16">
					<Masthead
						kicker="Generator"
						title="Generator"
						subtitle={
							signedIn
								? 'Every creature it prints for you is yours, written into the registry under your name.'
								: 'The showroom prints commoners, and prints them all day. Sign in and what it prints is yours to keep.'
						}
						aside={
							<Button disabled={isGenerating} onClick={() => generate(signedIn, profile)}>
								{record ? 'Generate another' : 'Generate a Xalian'}
							</Button>
						}
					/>

					<Card variant="glass" className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="type-legend m-0">Generator profile</p>
							<p className="mt-1 m-0 font-body text-small text-ink-2">
								Showroom prints commoners: standard finish, no rare traits, a single element. Unrestricted
								is the full generator. This control is temporary while the economy is being explored.
							</p>
						</div>
						<ToggleGroup
							type="single"
							variant="outline"
							value={profile}
							onValueChange={(value) => { if (value) handleProfileChange(value); }}
							aria-label="Generator profile"
							className="shrink-0"
						>
							<ToggleGroupItem value="showroom">Showroom</ToggleGroupItem>
							<ToggleGroupItem value="full">Unrestricted</ToggleGroupItem>
						</ToggleGroup>
					</Card>

					<LiveRegion>
						{isGenerating ? 'Generating a Xalian' : record ? `Generated a ${record.species}` : ''}
					</LiveRegion>

					{isGenerating ? (
						<Card variant="glass" className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
							<HelixSpinner size="lg" />
							<span className="type-legend">Generating</span>
						</Card>
					) : record ? (
						<React.Fragment>
							<Card variant="glass">
								<RecordView record={record} kicker={mode === 'owned' ? 'Yours' : 'Showroom'} />
							</Card>

							{mode === 'owned' ? (
								<Callout variant="viable" title="Kept" className="mt-6">
									<p className="m-0">This one is yours. It is in the registry under your name.</p>
									<div className="mt-3">
										<Button variant="secondary" asChild>
											<Link to="/account">See your Xalians</Link>
										</Button>
									</div>
								</Callout>
							) : (
								<Callout variant="note" title="Showroom creature" className="mt-6">
									<p className="m-0">
										Showroom creatures cannot be kept. This one is real, and it is gone the moment the lever turns
										again. Sign in and the Generator writes what it prints into the registry under your name.
									</p>
									<div className="mt-3">
										<Button variant="secondary" onClick={() => setSignInShow(true)}>
											Sign in to generate
										</Button>
									</div>
								</Callout>
							)}
						</React.Fragment>
					) : (
						<EmptyState legend="No Xalian yet">
							Pull the lever and the Generator prints one.
							<div className="mt-3">
								<Button onClick={() => generate(signedIn, profile)}>Generate a Xalian</Button>
							</div>
						</EmptyState>
					)}
				</Shell>
			</main>

			<SignInModal
				show={signInShow}
				callback={() => {}}
				onHide={() => setSignInShow(false)}
				mustVerifyEmailCallback={(name) => {
					setPendingUsername(name);
					setVerifyEmailShow(true);
				}}
				username={pendingUsername}
			/>

			<VerifyEmailModal
				show={verifyEmailShow}
				callback={() => {
					setVerifyEmailShow(false);
					setSignInShow(true);
				}}
				onHide={() => setVerifyEmailShow(false)}
				username={pendingUsername}
			/>
		</React.Fragment>
	);
}

export default GeneratorPage;
