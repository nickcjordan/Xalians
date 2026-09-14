// Tier: chrome. Someone else's Xalians, read the same way as your own on
// userAccountPage.tsx: the same tile grid over GET /xalians?ownerId=, opening
// the same record view, with no release control.
import * as React from 'react';
import type { XalianRecord } from '@xalians/content/schema';
import { speciesDisplayName } from '@xalians/rules/generator';
import { ArrowRightLeft, Copy } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import XalianNavbar from '../components/navbar';
import RecordTile from '../components/record/RecordTile';
import RecordView from '../components/record/RecordView';
import * as dbApi from '../utils/dbApi';

import { Shell, Masthead } from '@/components/system/masthead';
import { HelixSpinner } from '@/components/system/brand';
import { EmptyState } from '@/components/system/record';
import { VisuallyHidden } from '@/components/system/a11y';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type UserDetailsPageProps = {
	id: string;
};

function UserDetailsPage({ id }: UserDetailsPageProps) {
	const [records, setRecords] = React.useState<XalianRecord[]>([]);
	const [cursor, setCursor] = React.useState<string | undefined>();
	const [message, setMessage] = React.useState<string | null>(null);
	const [isLoading, setIsLoading] = React.useState(false);
	const [isLoadingMore, setIsLoadingMore] = React.useState(false);
	const [openRecord, setOpenRecord] = React.useState<XalianRecord | null>(null);

	React.useEffect(() => {
		setIsLoading(true);
		dbApi
			.callListPublicXalians(id)
			.then((page: any) => {
				setRecords(page.items);
				setCursor(page.nextCursor);
				setIsLoading(false);
			})
			.catch(() => {
				setMessage("Could not load this account's Xalians. Please try again later.");
				setIsLoading(false);
			});
	}, [id]);

	const loadMore = () => {
		if (!cursor) return;
		setIsLoadingMore(true);
		dbApi
			.callListPublicXalians(id, cursor)
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

	const copyBinderLink = () => {
		navigator.clipboard.writeText(window.location.href)
			.then(() => toast.success('Binder link copied'))
			.catch(() => toast.error('Could not copy the binder link'));
	};

	return (
		<main id="main" className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
			<XalianNavbar />

			<Shell className="pb-16">
				<Masthead
					kicker="Account"
					title={id}
					subtitle={records.length > 0 ? `${records.length} generated` : undefined}
					aside={
						<div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
							<Button variant="secondary" onClick={copyBinderLink}><Copy /> Copy binder link</Button>
							<Button asChild><Link to={`/trade/new?with=${encodeURIComponent(id)}`}><ArrowRightLeft /> Propose a trade</Link></Button>
						</div>
					}
				/>

				{isLoading && (
					<div className="flex justify-center py-16">
						<HelixSpinner />
					</div>
				)}

				{!isLoading && message && <EmptyState legend={message} />}

				{!isLoading && !message && records.length === 0 && (
					<EmptyState legend="No Xalians yet">This account has not generated any Xalians.</EmptyState>
				)}

				{!isLoading && records.length > 0 && (
					<React.Fragment>
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
							{records.map((record) => (
								<RecordTile key={record.id} record={record} onOpen={setOpenRecord} />
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

			<Dialog open={!!openRecord} onOpenChange={(open: boolean) => !open && setOpenRecord(null)}>
				<DialogContent className="sm:max-w-4xl">
					<DialogHeader>
						<VisuallyHidden>
							<DialogTitle>{openRecord ? speciesDisplayName(openRecord.species) : 'Record'}</DialogTitle>
						</VisuallyHidden>
					</DialogHeader>
					<ScrollArea className="max-h-[75vh] pr-4">
						{openRecord && <RecordView record={openRecord} kicker="Record" recordLink={`/xalian/${openRecord.id}`} />}
					</ScrollArea>
				</DialogContent>
			</Dialog>
		</main>
	);
}

export default UserDetailsPage;
