import * as React from 'react';
import { Link } from 'react-router';
import { Copy, Library } from 'lucide-react';
import { toast } from 'sonner';
import type { XalianRecord } from '@xalians/content/schema';
import { speciesDisplayName } from '@xalians/rules/generator';

import XalianNavbar from '../components/navbar';
import RecordView from '../components/record/RecordView';
import * as dbApi from '../utils/dbApi';

import { Shell, Masthead } from '@/components/system/masthead';
import { HelixSpinner } from '@/components/system/brand';
import { EmptyState } from '@/components/system/record';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function RecordPage({ id }: { id: string }) {
	const [record, setRecord] = React.useState<XalianRecord | null>(null);
	const [isLoading, setIsLoading] = React.useState(true);
	const [message, setMessage] = React.useState<string | null>(null);

	React.useEffect(() => {
		let cancelled = false;
		setIsLoading(true);
		setMessage(null);
		dbApi.callGetPublicXalian(id)
			.then((next: XalianRecord) => {
				if (!cancelled) setRecord(next);
			})
			.catch((error: any) => {
				if (cancelled) return;
				setMessage(error?.status === 404
					? 'This Xalian is not in the registry.'
					: 'The registry could not load this Xalian. Please try again later.');
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});
		return () => { cancelled = true; };
	}, [id]);

	const copyLink = () => {
		navigator.clipboard.writeText(window.location.href)
			.then(() => toast.success('Record link copied'))
			.catch(() => toast.error('Could not copy the record link'));
	};

	return (
		<main id="main" className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
			<XalianNavbar />
			<Shell className="pb-16">
				<Masthead
					kicker="Registry"
					title={record ? speciesDisplayName(record.species) : 'Xalian record'}
					subtitle="A permanent creature record. Its nature is shared; each game decides how to read it."
					aside={record ? (
						<Button onClick={copyLink}><Copy /> Copy link</Button>
					) : undefined}
				/>

				{isLoading ? (
					<div className="flex justify-center py-16"><HelixSpinner /></div>
				) : message ? (
					<EmptyState legend={message}>
						<Button variant="secondary" asChild>
							<Link to="/generator">Visit the Generator</Link>
						</Button>
					</EmptyState>
				) : record ? (
					<Card variant="glass">
						<RecordView record={record} kicker="Registry record" />
					</Card>
				) : null}

				{record ? (
					<div className="mt-6 flex justify-center">
						<Button variant="secondary" asChild>
							<Link to="/generator"><Library /> Generate your own</Link>
						</Button>
					</div>
				) : null}
			</Shell>
		</main>
	);
}

export default RecordPage;
