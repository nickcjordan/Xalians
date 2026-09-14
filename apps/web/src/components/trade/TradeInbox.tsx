import * as React from 'react';
import type { TradeOffer } from '@xalians/content/schema';
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';

import { SectionHead } from '@/components/system/masthead';
import { EmptyState } from '@/components/system/record';
import { HelixSpinner } from '@/components/system/brand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type TradeInboxProps = {
	username: string;
	trades: TradeOffer[];
	loading: boolean;
	error: string | null;
};

const statusLabel = {
	open: 'Open',
	accepted: 'Completed',
	cancelled: 'Cancelled',
	countered: 'Countered',
} as const;

function TradeSummary({ trade, username }: { trade: TradeOffer; username: string }) {
	const incoming = trade.recipientId === username;
	const otherOwner = incoming ? trade.proposerId : trade.recipientId;
	const giveCount = incoming ? trade.requestedXalianIds.length : trade.offeredXalianIds.length;
	const receiveCount = incoming ? trade.offeredXalianIds.length : trade.requestedXalianIds.length;
	const statusVariant = trade.status === 'accepted' ? 'ok' : trade.status === 'open' ? 'info' : 'warn';

	return (
		<Card variant="glass" className="flex h-full flex-col gap-4 p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2">
					{incoming ? (
						<ArrowDownLeft className="size-5 shrink-0 text-viable-hi" />
					) : (
						<ArrowUpRight className="size-5 shrink-0 text-ink-2" />
					)}
					<div className="min-w-0">
						<p className="type-legend m-0">{incoming ? 'Received from' : 'Sent to'}</p>
						<p className="mt-1 mb-0 truncate font-body text-body text-ink">{otherOwner}</p>
					</div>
				</div>
				<Badge variant={statusVariant}>{statusLabel[trade.status]}</Badge>
			</div>

			<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-y border-edge py-3 text-center">
				<div>
					<span className="type-data block text-lg text-ink">{giveCount}</span>
					<span className="type-legend text-ink-2">You give</span>
				</div>
				<ArrowRightLeft className="size-4 text-ink-3" />
				<div>
					<span className="type-data block text-lg text-ink">{receiveCount}</span>
					<span className="type-legend text-ink-2">You receive</span>
				</div>
			</div>

			<div className="mt-auto flex items-center justify-between gap-3">
				<span className="type-data text-small text-ink-3">{new Date(trade.createdAt).toLocaleDateString()}</span>
				<Button asChild variant={incoming && trade.status === 'open' ? 'default' : 'secondary'} size="sm">
					<Link to={`/trade/${trade.id}`}>{incoming && trade.status === 'open' ? 'Review offer' : 'View trade'}</Link>
				</Button>
			</div>
		</Card>
	);
}

function TradeGroup({ title, trades, username }: { title: string; trades: TradeOffer[]; username: string }) {
	if (trades.length === 0) return null;
	return (
		<section className="mb-8">
			<SectionHead title={title} count={trades.length} />
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{trades.map((trade) => (
					<TradeSummary key={trade.id} trade={trade} username={username} />
				))}
			</div>
		</section>
	);
}

function TradeInbox({ username, trades, loading, error }: TradeInboxProps) {
	if (loading) {
		return (
			<div className="flex justify-center py-16">
				<HelixSpinner />
			</div>
		);
	}

	if (error) {
		return <EmptyState legend="Trades unavailable">{error}</EmptyState>;
	}

	if (trades.length === 0) {
		return (
			<EmptyState legend="No trades yet">
				Open another owner&rsquo;s binder or enter their username to propose a direct creature swap.
				<div className="mt-4">
					<Button asChild>
						<Link to="/trade/new">Propose a trade</Link>
					</Button>
				</div>
			</EmptyState>
		);
	}

	const needsResponse = trades.filter((trade) => trade.status === 'open' && trade.recipientId === username);
	const waiting = trades.filter((trade) => trade.status === 'open' && trade.proposerId === username);
	const completed = trades.filter((trade) => trade.status === 'accepted');
	const closed = trades.filter((trade) => trade.status === 'cancelled' || trade.status === 'countered');

	return (
		<div>
			<TradeGroup title="Needs your response" trades={needsResponse} username={username} />
			<TradeGroup title="Waiting on them" trades={waiting} username={username} />
			<TradeGroup title="Completed" trades={completed} username={username} />
			<TradeGroup title="Closed" trades={closed} username={username} />
		</div>
	);
}

export default TradeInbox;
