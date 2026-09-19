// Tier: chrome. The front door: the splash, the fourteen worlds and a
// species strip as featured components, and the site's five destinations.
import * as React from 'react';
import { Link } from 'react-router';
import XalianNavbar from '../components/navbar';
import XaliansLogoDnaAnimated from '../components/animations/xaliansLogoDnaAnimated';
import XalianImage from '../components/xalianImage';
import { species, worlds } from 'virtual:xalians-home-data';

import { Shell } from '@/components/system/masthead';
import { Tile, TileArt, TileMeta } from '@/components/system/record';
import { usePageTitle } from '@/components/system/head';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FEATURED_SPECIES_COUNT = 8;

function pickRandomSpecies() {
	const pool = [...species];
	const picked: typeof species = [];
	while (pool.length && picked.length < FEATURED_SPECIES_COUNT) {
		const index = Math.floor(Math.random() * pool.length);
		picked.push(pool.splice(index, 1)[0]);
	}
	return picked;
}

const DESTINATIONS = [
	{
		name: 'Generator',
		copy: 'Print a new Xalian from a Scrambler Token and keep it to your account.',
		to: '/generator',
		linkText: 'Generate',
	},
	{
		name: 'Encyclopedia',
		copy: 'Every world, species, power and event on file, read as one story or by entry.',
		to: '/encyclopedia',
		linkText: 'Read',
	},
	{ groupLabel: 'Play' },
	{
		name: 'Duel',
		copy: 'Squad tactics on an 8 by 8 board. Capture the flag or eliminate the team.',
		to: '/duel',
		linkText: 'Play',
	},
	{
		name: 'Reclamation',
		copy: 'Send creatures into three worlds a round and hold more of them than your rival.',
		to: '/reclamation',
		linkText: 'Play',
	},
	{
		name: 'Expedition',
		copy: 'Push a crew of your Xalians across hazardous worlds and bring them home.',
		to: '/long-return',
		linkText: 'Play',
	},
	{
		name: 'Powerworks',
		copy: 'Take a squad of four through four encounters inside a dormant Vallerii facility.',
		to: '/powerworks',
		linkText: 'Play',
	},
	{
		name: 'Arcade',
		copy: 'Familiar games that turn a quick win into progress toward another Xalian.',
		to: '/arcade',
		linkText: 'Play',
	},
];

function Home() {
	const [featuredSpecies] = React.useState(pickRandomSpecies);
	usePageTitle();

	return (
		<main id="main" className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
			<XalianNavbar />

			<Shell className="pt-8 pb-16">
				<section className="mb-12 grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
					<div className="flex flex-col items-start gap-3">
						<div className="max-sm:hidden"><XaliansLogoDnaAnimated /></div>
						<h1 className="type-display m-0">Creatures grown for dying worlds</h1>
						<p className="mt-2 max-w-[62ch] font-body text-lead text-ink">
							Xalians is a world of generated creatures. Generate one, read the world it comes from, and play it in the games.
						</p>
						<p className="mt-2 max-w-[62ch] font-body text-lead text-ink-2">
							Xalians are bioengineered creatures the Vallerii Generators grow to survive the worst planets in the galaxy, no two genomes alike. King Kozrak&rsquo;s Mercurius Machine prints the Scrambler Tokens that make new ones, and pays them out to the winners of his arena tournaments.
						</p>
						<div className="mt-3 flex flex-wrap items-center gap-5">
							<Button asChild>
								<Link to="/generator">Generate a Xalian</Link>
							</Button>
							<Button asChild variant="link" className="px-0">
								<Link to="/encyclopedia/story">Read the story</Link>
							</Button>
						</div>
					</div>

					<section data-tier="featured">
						<h2 className="type-heading m-0">Fourteen worlds</h2>
						<p className="mt-1 mb-4 max-w-[62ch] font-body text-small text-ink-2">
							Every Xalian is grown for one of them. Open a world for its history and its native species.
						</p>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
							{worlds.map((world: any) => (
								<Link
									key={world.key}
									to={`/encyclopedia/worlds/${world.key}`}
									className={`el-${world.element} mass-el group flex flex-col items-start gap-1 overflow-hidden border border-edge bg-s1 pb-2 hover:border-edge-strong hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring`}
								>
									<div className="flex aspect-square w-full items-center justify-center bg-el/24">
										<img
											src={`/${world.image}`}
											alt={world.imageAlt}
											width={384}
											height={256}
											decoding="async"
											className="h-full w-full object-cover"
										/>
									</div>
									<span className="type-legend mt-2 max-w-full overflow-hidden px-2 text-[10px] whitespace-nowrap text-ellipsis text-ink sm:text-[11.5px]">
										{world.name}
									</span>
									<Badge variant="chip" className="mx-2 hidden max-w-[calc(100%-1rem)] overflow-hidden text-[10px] text-ellipsis whitespace-nowrap sm:inline-flex">
										{world.element}
									</Badge>
								</Link>
							))}
						</div>
					</section>
				</section>

				<section className="mb-12" data-tier="featured">
					<h2 className="type-heading m-0">From the bestiary</h2>
					<p className="mt-1 mb-4 max-w-[62ch] font-body text-small text-ink-2">
						Species silhouettes from the record plates. Open one to read its record.
					</p>
					<div className="-mx-6 flex snap-x gap-2 overflow-x-auto px-6 [scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)] sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible sm:px-0 md:grid-cols-8">
						{featuredSpecies.map((s: any) => (
							<Tile
								as={Link}
								key={s.id || s.name}
								to={`/encyclopedia/species/${s.name.toLowerCase()}`}
								className={`el-${s.type.toLowerCase()} w-[140px] shrink-0 snap-start sm:w-auto sm:shrink`}
							>
								<TileArt>
									<XalianImage colored speciesName={s.name} primaryType={s.type} moreClasses="w-full" />
								</TileArt>
								<TileMeta>
									<span className="type-legend block text-center text-ink">{s.name}</span>
								</TileMeta>
							</Tile>
						))}
					</div>
				</section>

				<section className="border-t border-edge">
					{DESTINATIONS.map((d) =>
						'groupLabel' in d ? (
							<p key={d.groupLabel} className="type-legend mt-4 mb-1">
								{d.groupLabel}
							</p>
						) : (
							<Link
								key={d.name}
								to={d.to}
								className="grid grid-cols-1 items-baseline gap-1 border-b border-edge py-3 md:grid-cols-[200px_1fr_auto] md:gap-4"
							>
								<span className="type-heading text-ink">{d.name}</span>
								<span className="font-body text-small text-ink-2">{d.copy}</span>
								<span className="justify-self-start font-body text-body text-ink underline decoration-ink-3 underline-offset-4 md:justify-self-end">{d.linkText}</span>
							</Link>
						)
					)}
				</section>
			</Shell>
		</main>
	);
}

export default Home;
