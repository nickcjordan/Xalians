// Tier: chrome. Someone else's Xalians, read the same way as your own on
// userAccountPage.tsx — the same tile grid, no delete control.
import * as React from 'react';
import { Link } from 'react-router-dom';
import XalianNavbar from '../components/navbar';
import XalianImage from '../components/xalianImage';
import { routeFor } from '../lore/routeFor';
import * as dbApi from '../utils/dbApi';

import { Shell, Masthead } from '@/components/system/masthead';
import { HelixSpinner } from '@/components/system/brand';
import { EmptyState } from '@/components/system/record';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type UserDetailsPageProps = {
	id: string;
};

function UserDetailsPage({ id }: UserDetailsPageProps) {
	const [user, setUser] = React.useState<any>(null);
	const [message, setMessage] = React.useState<string | null>(null);
	const [xalians, setXalians] = React.useState<any[]>([]);
	const [isLoading, setIsLoading] = React.useState(false);

	React.useEffect(() => {
		setIsLoading(true);
		dbApi
			.callGetUser(id, true)
			.then((u: any) => {
				setIsLoading(false);
				setUser(u);
				setXalians(u.xalians);
			})
			.catch(() => {
				setMessage("Could not load this user's Xalians. Please try again later.");
				setIsLoading(false);
			});
	}, [id]);

	const renderXalianTile = (xalian: any) => {
		const x = xalian.attributes;
		const primaryType = x.elements.primaryType.toLowerCase();
		const secondaryType = x.elements.secondaryType.toLowerCase();
		return (
			<Card key={xalian.xalianId} variant="link" className={`el-${primaryType} flex flex-col p-0`}>
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
			</Card>
		);
	};

	const title = (user && (user.username || user.userId)) || 'Xalian account';

	return (
		<main className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
			<XalianNavbar />

			<Shell className="pb-16">
				<Masthead kicker="Account" title={title} />

				{isLoading && (
					<div className="flex justify-center py-16">
						<HelixSpinner />
					</div>
				)}

				{!isLoading && message && <EmptyState legend={message} />}

				{!isLoading && !message && xalians.length === 0 && (
					<EmptyState legend="No Xalians yet">This account has not kept any Xalians.</EmptyState>
				)}

				{!isLoading && xalians.length > 0 && (
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
						{xalians.map((x) => renderXalianTile(x))}
					</div>
				)}
			</Shell>
		</main>
	);
}

export default UserDetailsPage;
