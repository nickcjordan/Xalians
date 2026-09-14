import * as React from 'react';
import type { XalianRecord } from '@xalians/content/schema';
import { ArrowRightLeft } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import XalianNavbar from '../components/navbar';
import RecordTile from '../components/record/RecordTile';
import * as authUtil from '../utils/authUtil';
import * as dbApi from '../utils/dbApi';

import { Shell, Masthead, SectionHead } from '@/components/system/masthead';
import { HelixSpinner } from '@/components/system/brand';
import { EmptyState } from '@/components/system/record';
import { Callout } from '@/components/system/readouts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function queryIds(value: string | null): string[] {
	return value ? value.split(',').filter((id) => id.startsWith('xal_')).slice(0, 6) : [];
}

function TradeBuilderPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const initialRecipient = (searchParams.get('with') || '').toLowerCase();
	const [username, setUsername] = React.useState<string | null>(null);
	const [authChecked, setAuthChecked] = React.useState(false);
	const [ownRecords, setOwnRecords] = React.useState<XalianRecord[]>([]);
	const [recipientId, setRecipientId] = React.useState(initialRecipient);
	const [loadedRecipient, setLoadedRecipient] = React.useState('');
	const [recipientRecords, setRecipientRecords] = React.useState<XalianRecord[]>([]);
	const [offeredIds, setOfferedIds] = React.useState<string[]>(queryIds(searchParams.get('offer')));
	const [requestedIds, setRequestedIds] = React.useState<string[]>(queryIds(searchParams.get('request')));
	const [loadingRecipient, setLoadingRecipient] = React.useState(false);
	const [submitting, setSubmitting] = React.useState(false);
	const [message, setMessage] = React.useState<string | null>(null);
	const counterTo = searchParams.get('counterTo') || undefined;

	React.useEffect(() => {
		authUtil.currentUser()
			.then((user: any) => {
				const name = user?.username?.toLowerCase() || null;
				setUsername(name);
				setAuthChecked(true);
				if (!name) return;
				return dbApi.callListXalians().then((page: any) => setOwnRecords(page.items));
			})
			.catch(() => {
				setAuthChecked(true);
				setMessage('Could not load your account. Please try again later.');
			});
	}, []);

	const loadRecipient = React.useCallback((owner: string) => {
		const normalized = owner.trim().toLowerCase();
		if (!normalized) return;
		if (normalized === username) {
			setMessage('Choose another owner. A trade needs two different people.');
			return;
		}
		setMessage(null);
		setLoadingRecipient(true);
		dbApi.callListPublicXalians(normalized)
			.then((page: any) => {
				setRecipientRecords(page.items);
				setLoadedRecipient(normalized);
				setRecipientId(normalized);
				setRequestedIds((current) => current.filter((id) => page.items.some((record: XalianRecord) => record.id === id)));
				setLoadingRecipient(false);
			})
			.catch(() => {
				setLoadingRecipient(false);
				setLoadedRecipient('');
				setRecipientRecords([]);
				setMessage(`Could not load ${normalized}'s binder.`);
			});
	}, [username]);

	React.useEffect(() => {
		if (authChecked && username && initialRecipient) loadRecipient(initialRecipient);
	}, [authChecked, initialRecipient, loadRecipient, username]);

	React.useEffect(() => {
		if (ownRecords.length > 0) {
			setOfferedIds((current) => current.filter((id) => ownRecords.some((record) => record.id === id)));
		}
	}, [ownRecords]);

	const toggleId = (id: string, selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
		setSelected(selected.includes(id) ? selected.filter((current) => current !== id) : selected.length < 6 ? [...selected, id] : selected);
	};

	const submit = () => {
		if (!loadedRecipient || offeredIds.length === 0 || requestedIds.length === 0) return;
		setSubmitting(true);
		setMessage(null);
		dbApi.callCreateTrade({
			recipientId: loadedRecipient,
			offeredXalianIds: offeredIds,
			requestedXalianIds: requestedIds,
			counterTo,
		})
			.then((trade: any) => navigate(`/trade/${trade.id}`))
			.catch((error: Error) => {
				setSubmitting(false);
				setMessage(error.message || 'Could not create this trade.');
			});
	};

	return (
		<main id="main" className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
			<XalianNavbar />
			<Shell className="pb-16">
				<Masthead
					kicker={counterTo ? 'Counteroffer' : 'Direct swap'}
					title={counterTo ? 'Shape a counteroffer' : 'Propose a trade'}
					subtitle="Choose creatures from two binders. No prices, listings, or game-specific power values are attached."
				/>

				{!authChecked ? <div className="flex justify-center py-16"><HelixSpinner /></div> : null}
				{authChecked && !username ? (
					<EmptyState legend="Sign in to trade">
						Trade proposals come from a verified owner and can only include creatures in that owner's binder.
						<div className="mt-4"><Button asChild><Link to="/account">Open your account</Link></Button></div>
					</EmptyState>
				) : null}

				{authChecked && username ? (
					<React.Fragment>
						<form
							className="mb-6 flex flex-col gap-3 border border-edge bg-s1 p-4 sm:flex-row sm:items-end"
							onSubmit={(event) => { event.preventDefault(); loadRecipient(recipientId); }}
						>
							<label className="flex min-w-0 flex-1 flex-col gap-2">
								<span className="type-legend">TRADE WITH</span>
								<Input value={recipientId} onChange={(event) => setRecipientId(event.target.value)} placeholder="Owner username" />
							</label>
							<Button type="submit" variant="secondary" disabled={loadingRecipient}>
								{loadingRecipient ? 'Loading binder' : 'View binder'}
							</Button>
						</form>

						{message ? <Callout variant="caution" title="Trade unavailable" className="mb-6">{message}</Callout> : null}

						{loadedRecipient ? (
							<React.Fragment>
								<Callout variant="note" title="Build the exchange" className="mb-6">
									Choose at least one creature on each side, up to six each. The recipient can accept, counter, or leave the offer open.
								</Callout>
								<div className="grid gap-8 lg:grid-cols-2">
									<section>
										<SectionHead title="You offer" count={`${offeredIds.length} selected`} />
										<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
											{ownRecords.map((record) => (
												<RecordTile
													key={record.id}
													record={record}
													onOpen={() => toggleId(record.id, offeredIds, setOfferedIds)}
													comparison={{ selected: offeredIds.includes(record.id), disabled: offeredIds.length >= 6 && !offeredIds.includes(record.id), label: 'trade offer', onToggle: () => toggleId(record.id, offeredIds, setOfferedIds) }}
												/>
											))}
										</div>
									</section>
									<section>
										<SectionHead title={`${loadedRecipient} sends`} count={`${requestedIds.length} selected`} />
										{recipientRecords.length === 0 ? <EmptyState legend="Binder empty">There is nothing here to request.</EmptyState> : (
											<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
												{recipientRecords.map((record) => (
													<RecordTile
														key={record.id}
														record={record}
														onOpen={() => toggleId(record.id, requestedIds, setRequestedIds)}
														comparison={{ selected: requestedIds.includes(record.id), disabled: requestedIds.length >= 6 && !requestedIds.includes(record.id), label: 'trade request', onToggle: () => toggleId(record.id, requestedIds, setRequestedIds) }}
													/>
												))}
											</div>
										)}
									</section>
								</div>
								<div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-edge pt-6">
									<p className="m-0 text-small text-ink-2">Ownership changes only if {loadedRecipient} accepts the complete offer.</p>
									<Button disabled={submitting || offeredIds.length === 0 || requestedIds.length === 0} onClick={submit}>
										<ArrowRightLeft /> {submitting ? 'Creating offer' : counterTo ? 'Send counteroffer' : 'Create trade link'}
									</Button>
								</div>
							</React.Fragment>
						) : null}
					</React.Fragment>
				) : null}
			</Shell>
		</main>
	);
}

export default TradeBuilderPage;
