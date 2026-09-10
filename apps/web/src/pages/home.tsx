// Tier: chrome. The front door: the splash, the fourteen worlds and a
// species strip as featured components, and the site's five destinations.
import * as React from 'react';
import { Link } from 'react-router-dom';
import XalianNavbar from '../components/navbar';
import XaliansLogoDnaAnimated from '../components/animations/xaliansLogoDnaAnimated';
import XalianImage from '../components/xalianImage';
import { routeFor } from '../lore/routeFor';
import * as lore from '../lore';
import species from '@xalians/content/species.json';

import { Shell } from '@/components/system/masthead';
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
	},
	{
		name: 'Encyclopedia',
		copy: 'Every world, species, power and event on file, read as one story or by entry.',
		to: '/encyclopedia',
	},
	{
		name: 'Duel',
		copy: 'Squad tactics on an 8 by 8 board. Capture the flag or eliminate the team.',
		to: '/duel',
	},
	{
		name: 'Reclamation',
		copy: 'Send creatures into three worlds a round and hold more of them than your rival.',
		to: '/reclamation',
	},
	{
		name: 'Training',
		copy: 'Short games to learn the pieces before the arena.',
		to: '/train',
	},
];

function Home() {
	const [featuredSpecies] = React.useState(pickRandomSpecies);
	const worlds = lore.getWorlds();

	return (
		<main className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
			<XalianNavbar />

			<Shell className="pt-8 pb-16">
				<section className="mb-12 grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-start">
					<div className="flex flex-col items-start gap-3">
						<XaliansLogoDnaAnimated />
						<p className="type-legend mt-2">Xalia</p>
						<h1 className="type-display m-0">Creatures grown for dying worlds</h1>
						<p className="mt-2 max-w-[62ch] font-body text-lead text-ink-2">
							Xalians are bioengineered creatures the Vallerii Generators grow to survive the worst planets in the galaxy, no two genomes alike. King Kozrak&rsquo;s Mercurius Machine prints the Scrambler Tokens that make new ones, and pays them out to the winners of his arena tournaments.
						</p>
						<div className="mt-3 flex flex-wrap items-center gap-5">
							<Button asChild>
								<Link to="/generator">Generate a Xalian</Link>
							</Button>
							<Button asChild variant="link">
								<Link to="/encyclopedia/story">Read the story</Link>
							</Button>
						</div>
					</div>

					<section data-tier="featured" aria-label="The worlds of Xalia">
						<div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-7">
							{worlds.map((world: any) => (
								<Link
									key={world.key}
									to={routeFor('world', world.key)}
									className={`el-${world.element} mass-el group flex flex-col items-start gap-1 overflow-hidden border border-edge bg-s1 pb-2 hover:border-edge-strong hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring`}
								>
									<div className="flex aspect-square w-full items-center justify-center bg-el/24">
										<img
											src={`/${world.images.planet}`}
											alt={`${world.name} globe`}
											className="h-[68%] w-[68%] object-contain sm:h-[76%] sm:w-[76%]"
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

				<section className="mb-12" data-tier="featured" aria-label="Featured Xalians">
					<div className="-mx-6 flex snap-x gap-2 overflow-x-auto px-6 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible sm:px-0 md:grid-cols-8">
						{featuredSpecies.map((s: any) => (
							<Link
								key={s.id || s.name}
								to={routeFor('species', s.name.toLowerCase())}
								className={`el-${s.type.toLowerCase()} mass-el flex w-[140px] shrink-0 snap-start flex-col items-center gap-2 overflow-hidden border border-edge bg-s1 pb-3 hover:border-edge-strong hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring sm:w-auto sm:shrink`}
							>
								<div className="aspect-square w-full bg-el">
									<XalianImage colored speciesName={s.name} primaryType={s.type} moreClasses="w-full" />
								</div>
								<span className="type-legend text-center text-ink">{s.name}</span>
							</Link>
						))}
					</div>
				</section>

				<section className="border-t border-edge">
					{DESTINATIONS.map((d) => (
						<Link
							key={d.name}
							to={d.to}
							className="grid grid-cols-1 items-baseline gap-1 border-b border-edge py-3 md:grid-cols-[200px_1fr_auto] md:gap-4"
						>
							<span className="type-heading text-ink">{d.name}</span>
							<span className="font-body text-small text-ink-2">{d.copy}</span>
							<span className="justify-self-start font-body text-body text-ink underline decoration-ink-3 underline-offset-4 md:justify-self-end">Open</span>
						</Link>
					))}
				</section>
			</Shell>
		</main>
	);
}

export default Home;
