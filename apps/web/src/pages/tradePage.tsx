import * as React from 'react';
import type { TradeOffer, XalianRecord } from '@xalians/content/schema';
import { speciesDisplayName } from '@xalians/rules/generator';
import { ArrowRightLeft, Copy } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import XalianNavbar from '../components/navbar';
import RecordTile from '../components/record/RecordTile';
import RecordView from '../components/record/RecordView';
import * as authUtil from '../utils/authUtil';
import * as dbApi from '../utils/dbApi';

import { Shell, Masthead, SectionHead } from '@/components/system/masthead';
import { HelixSpinner } from '@/components/system/brand';
import { EmptyState } from '@/components/system/record';
import { Callout } from '@/components/system/readouts';
import { VisuallyHidden } from '@/components/system/a11y';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type TradePageProps = { id: string };

const statusLabel = { open: 'Open', accepted: 'Accepted', cancelled: 'Cancelled', countered: 'Countered' } as const;

function TradePage({ id }: TradePageProps) {
	const [trade, setTrade] = React.useState<TradeOffer | null>(null);
	const [records, setRecords] = React.useState<Record<string, XalianRecord>>({});
	const [username, setUsername] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [message, setMessage] = React.useState<string | null>(null);
	const [openRecord, setOpenRecord] = React.useState<XalianRecord | null>(null);
	const [confirmation, setConfirmation] = React.useState<'accept' | 'cancel' | null>(null);
	const [responding, setResponding] = React.useState(false);

	React.useEffect(() => {
		Promise.all([dbApi.callGetTrade(id), authUtil.currentUser().catch(() => null)])
			.then(async ([loadedTrade, user]: [TradeOffer, any]) => {
				setTrade(loadedTrade);
				setUsername(user?.username?.toLowerCase() || null);
				const ids = [...loadedTrade.offeredXalianIds, ...loadedTrade.requestedXalianIds];
				const loaded = await Promise.all(ids.map((recordId) => dbApi.callGetPublicXalian(recordId).catch(() => null)));
				const available = loaded.filter((record): record is XalianRecord => record !== null);
				setRecords(Object.fromEntries(available.map((record) => [record.id, record])));
				setLoading(false);
			})
			.catch((error: Error) => {
				setLoading(false);
				setMessage(error.message || 'Could not load this trade offer.');
			});
	}, [id]);

	const copyLink = () => {
		navigator.clipboard.writeText(window.location.href)
			.then(() => toast.success('Trade link copied'))
			.catch(() => toast.error('Could not copy the trade link'));
	};

	const respond = () => {
		if (!trade || !confirmation) return;
		setResponding(true);
		const request = confirmation === 'accept' ? dbApi.callAcceptTrade(trade.id) : dbApi.callCancelTrade(trade.id);
		request.then((updated: TradeOffer) => {
			setTrade(updated);
			setConfirmation(null);
			setResponding(false);
			toast.success(confirmation === 'accept' ? 'Trade accepted' : 'Trade cancelled');
		}).catch((error: Error) => {
			setConfirmation(null);
			setResponding(false);
			setMessage(error.message || 'The trade could not be updated.');
		});
	};

	if (loading) {
		return <main className="min-h-screen bg-room text-ink"><XalianNavbar /><div className="flex justify-center py-24"><HelixSpinner /></div></main>;
	}

	if (!trade) {
		return <main className="min-h-screen bg-room text-ink"><XalianNavbar /><Shell><EmptyState legend="Trade unavailable">{message || 'This trade offer was not found.'}</EmptyState></Shell></main>;
	}

	const offeredRecords = trade.offeredXalianIds.map((recordId) => records[recordId]).filter(Boolean);
	const requestedRecords = trade.requestedXalianIds.map((recordId) => records[recordId]).filter(Boolean);
	const isRecipient = username === trade.recipientId;
	const isProposer = username === trade.proposerId;
	const counterParams = new URLSearchParams({
		with: trade.proposerId,
		counterTo: trade.id,
		offer: trade.requestedXalianIds.join(','),
		request: trade.offeredXalianIds.join(','),
	});
	const statusVariant = trade.status === 'accepted' ? 'ok' : trade.status === 'open' ? 'info' : 'warn';

	return (
		<main id="main" className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
			<XalianNavbar />
			<Shell className="pb-16">
				<Masthead
					kicker="Direct swap"
					title={`${trade.proposerId} ↔ ${trade.recipientId}`}
					subtitle={`Proposed ${new Date(trade.createdAt).toLocaleDateString()}. This link is public; only the named recipient can accept it.`}
					beside={<Badge variant={statusVariant}>{statusLabel[trade.status]}</Badge>}
					aside={<Button variant="secondary" onClick={copyLink}><Copy /> Copy trade link</Button>}
				/>

				{message ? <Callout variant="caution" title="Trade update" className="mb-6">{message}</Callout> : null}
				{trade.status === 'open' ? (
					<Callout variant="note" title="One complete exchange" className="mb-6">
						Accepting transfers every creature below at once. If any one changed owners after this offer was made, nothing moves.
					</Callout>
				) : (
					<Callout variant={trade.status === 'accepted' ? 'viable' : 'note'} title={`Offer ${statusLabel[trade.status].toLowerCase()}`} className="mb-6">
						{trade.status === 'accepted' ? 'The complete ownership exchange is recorded.' : 'This offer can no longer be accepted.'}
					</Callout>
				)}

				<div className="grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
					<section>
						<SectionHead title={`${trade.proposerId} offers`} count={`${trade.offeredXalianIds.length}`} />
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
							{offeredRecords.map((record) => <RecordTile key={record.id} record={record} onOpen={setOpenRecord} />)}
						</div>
					</section>
					<div className="hidden pt-12 text-ink-3 lg:block"><ArrowRightLeft /></div>
					<section>
						<SectionHead title={`${trade.recipientId} sends`} count={`${trade.requestedXalianIds.length}`} />
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
							{requestedRecords.map((record) => <RecordTile key={record.id} record={record} onOpen={setOpenRecord} />)}
						</div>
					</section>
				</div>

				{offeredRecords.length !== trade.offeredXalianIds.length || requestedRecords.length !== trade.requestedXalianIds.length ? (
					<Callout variant="caution" title="A record is unavailable" className="mt-6">This offer is stale and cannot complete as written.</Callout>
				) : null}

				{trade.status === 'open' ? (
					<div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-edge pt-6">
						{!username ? <Button asChild variant="secondary"><Link to="/account">Sign in to respond</Link></Button> : null}
						{isRecipient ? <Button asChild variant="secondary"><Link to={`/trade/new?${counterParams.toString()}`}>Shape a counteroffer</Link></Button> : null}
						{isRecipient ? <Button onClick={() => setConfirmation('accept')}>Accept complete trade</Button> : null}
						{isProposer ? <Button variant="destructive" onClick={() => setConfirmation('cancel')}>Cancel offer</Button> : null}
					</div>
				) : null}
			</Shell>

			<Dialog open={!!confirmation} onOpenChange={(open: boolean) => !open && setConfirmation(null)}>
				<DialogContent>
					<DialogHeader><DialogTitle>{confirmation === 'accept' ? 'Accept this complete trade?' : 'Cancel this offer?'}</DialogTitle></DialogHeader>
					<p className="m-0 text-ink-2">
						{confirmation === 'accept'
							? `Every listed Xalian will change owners between ${trade.proposerId} and ${trade.recipientId}. This cannot be partly completed.`
							: 'The recipient will no longer be able to accept this link.'}
					</p>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setConfirmation(null)}>Keep offer open</Button>
						<Button variant={confirmation === 'accept' ? 'default' : 'destructive'} disabled={responding} onClick={respond}>
							{responding ? 'Updating' : confirmation === 'accept' ? 'Confirm ownership swap' : 'Confirm cancellation'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={!!openRecord} onOpenChange={(open: boolean) => !open && setOpenRecord(null)}>
				<DialogContent className="sm:max-w-4xl">
					<DialogHeader><VisuallyHidden><DialogTitle>{openRecord ? speciesDisplayName(openRecord.species) : 'Record'}</DialogTitle></VisuallyHidden></DialogHeader>
					<ScrollArea className="max-h-[75vh] pr-4">{openRecord ? <RecordView record={openRecord} kicker="Trade record" recordLink={`/xalian/${openRecord.id}`} /> : null}</ScrollArea>
				</DialogContent>
			</Dialog>
		</main>
	);
}

export default TradePage;
