// Tier: chrome. The front door: the splash, the fourteen worlds and a
// species strip as featured components, and the site's five destinations.
import * as React from 'react';
import { Link } from 'react-router';
import XalianNavbar from '../components/navbar';
import XaliansLogoDnaAnimated from '../components/animations/xaliansLogoDnaAnimated';
import XalianImage from '../components/xalianImage';
import * as svgUtil from '../utils/svgUtil';
import { species, worlds } from 'virtual:xalians-home-data';

import { Shell } from '@/components/system/masthead';
import { Tile, TileArt, TileMeta } from '@/components/system/record';
import { usePageTitle } from '@/components/system/head';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Nine: one for the hero plate and a full row of eight in the strip below.
const FEATURED_SPECIES_COUNT = 9;

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

/**
 * The sky belongs to the hero. The starfield is fixed to the viewport so it
 * holds still while the page scrolls over it (anchoring it to the hero made
 * it slide away, which read as the sky moving). Fixed alone would leave it
 * behind the destination list and the footer, so this fades it out over the
 * first screen of scrolling: full strength at the top, gone by the time the
 * hero has left. Written to a CSS variable rather than React state so
 * scrolling never triggers a re-render.
 */
function useStarfieldFade() {
	React.useEffect(() => {
		const root = document.documentElement;
		let frame = 0;
		const apply = () => {
			frame = 0;
			// Fully faded once the hero band is off screen.
			const span = Math.max(1, window.innerHeight * 0.6);
			const fade = 1 - Math.min(1, window.scrollY / span);
			root.style.setProperty('--starfield-fade', fade.toFixed(3));
		};
		const onScroll = () => {
			if (!frame) frame = window.requestAnimationFrame(apply);
		};
		apply();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		return () => {
			if (frame) window.cancelAnimationFrame(frame);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			// The variable is set on <html>, so it has to be cleaned up when the
			// home page unmounts or every other route inherits the last value.
			root.style.removeProperty('--starfield-fade');
		};
	}, []);
}

function Home() {
	const [featuredSpecies] = React.useState(pickRandomSpecies);
	// The hero plate shows the first of the picked pool, so the strip below
	// never repeats it and both come from one draw.
	const heroSpecies = featuredSpecies[0];
	usePageTitle();
	useStarfieldFade();

	// No bg-room on main: the fixed starfield sits behind the page at z-index
	// -1, and an opaque background here would paint straight over it.
	// globals.css already gives body the room colour, so the surface is
	// unchanged for every section that is not the hero.
	return (
		<main id="main" className="min-h-screen text-ink font-body" data-tier="chrome">
			<XalianNavbar />

			{/* The sky is a sibling of the content, not a child of the hero: it is
			    pinned to the viewport so it holds still while the page scrolls
			    over it, and `isolate`/`overflow-hidden` on a wrapper would both
			    break that. Its own mask keeps it to the top band, so the reading
			    sections still sit on the flat hull surface. */}
			<div className="starfield" aria-hidden="true">
				<div className="starfield-far" />
			</div>

			<div className="relative">
				<Shell className="relative pt-8 pb-10">
					{/* Two columns only once there is room for both: the plate is the
					    payoff the copy promises, so on a narrow window the words win
					    and it drops out entirely rather than shrinking. */}
					<div className="grid items-center gap-10 lg:grid-cols-[minmax(0,64ch)_minmax(0,1fr)]">
					<div className="flex max-w-[64ch] flex-col items-start gap-3">
						<div className="max-sm:hidden"><XaliansLogoDnaAnimated /></div>
						<h1 className="type-display m-0">Creatures grown for dying worlds</h1>
						<p className="mt-2 font-body text-lead text-ink">
							Across fourteen worlds, the Nemesis Plague is still spreading. The Vallerii who built this galaxy are almost gone. What is left are the Xalians: creatures their Generators grew to live where nothing else could.
						</p>
						<p className="mt-2 font-body text-lead text-ink-2">
							King Kozrak holds the only machine that still prints a Scrambler Token, the one key to a plague-immune Xalian. He pays them out to the winners of his arena, and a galaxy of creatures fights for the right to repopulate its own homeworld.
						</p>
						<div className="mt-4 flex flex-wrap items-center gap-5">
							<Button asChild>
								<Link to="/generator">Generate a Xalian</Link>
							</Button>
							<Button asChild variant="link" className="px-0">
								<Link to="/encyclopedia/story">Read the story</Link>
							</Button>
						</div>
					</div>

					{/* One specimen, picked per load from the same pool as the
					    bestiary strip. It gives the hero's wide half something to
					    hold, and shows a real creature before the copy has finished
					    describing one. */}
					{heroSpecies && (
						<Link
							to={`/encyclopedia/species/${heroSpecies.name.toLowerCase()}`}
							className={`el-${heroSpecies.type.toLowerCase()} group mx-auto hidden w-full max-w-[340px] flex-col border border-edge bg-s1/80 backdrop-blur-[2px] hover:border-edge-strong focus-visible:outline-2 focus-visible:outline-ring lg:flex`}
						>
							<div className="bg-el/24 p-3">
								<XalianImage
									colored
									speciesName={heroSpecies.name}
									primaryType={heroSpecies.type}
									moreClasses="w-full"
								/>
							</div>
							<div className="flex items-center justify-between gap-2 px-3 py-2.5">
								<span className="type-legend text-[13px] text-ink">{heroSpecies.name}</span>
								<span
									className="flex size-6 shrink-0 items-center justify-center rounded-full bg-el ring-1 ring-edge-strong"
									title={heroSpecies.type}
								>
									{svgUtil.getSpeciesTypeSymbol(heroSpecies.type, false, 14)}
								</span>
							</div>
						</Link>
					)}
					</div>
				</Shell>
			</div>

			<Shell className="pt-2 pb-16">

				{/* The worlds are the best art on the site, so they get the page's
				    full width rather than a seven-column strip inside the hero's
				    narrow column: at a wide viewport that strip squeezed each
				    tile to about 80px and truncated half the names. The column
				    count now steps with the viewport, so tiles grow as the
				    window grows instead of shrinking. */}
				<section className="mb-12" data-tier="featured">
					<h2 className="type-heading m-0">Fourteen worlds</h2>
					<p className="mt-1 mb-4 max-w-[62ch] font-body text-small text-ink-2">
						Every Xalian is grown for one of them. Open a world for its history and its native species.
					</p>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
						{worlds.map((world: any) => (
							<Link
								key={world.key}
								to={`/encyclopedia/worlds/${world.key}`}
								className={`el-${world.element} mass-el group flex flex-col overflow-hidden border border-edge bg-s1 hover:border-edge-strong hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring`}
							>
								<div className="relative aspect-[4/3] w-full overflow-hidden bg-el/24">
									<img
										src={`/${world.image}`}
										alt={world.imageAlt}
										width={384}
										height={256}
										loading="lazy"
										decoding="async"
										className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
									/>
									{/* The element reads as its symbol, not its name: the
									    symbol is the system's own mark for the element and
									    survives at this size, where the word would have to
									    shrink or truncate. The name is still carried for
									    assistive tech by the title below. */}
									<span
										className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full bg-el ring-1 ring-edge-strong"
										title={world.element}
									>
										{svgUtil.getSpeciesTypeSymbol(world.element, false, 14)}
									</span>
								</div>
								<div className="flex min-w-0 flex-col gap-0.5 px-2.5 pt-2 pb-2.5">
									<span className="type-legend text-[12px] text-ink">{world.name}</span>
									{/* Two lines of real terrain, clamped: enough to make the
									    world feel like somewhere without unbalancing the row. */}
									<span className="font-body text-[11px] leading-snug text-ink-3 line-clamp-2">
										{world.terrain}
									</span>
								</div>
							</Link>
						))}
					</div>
				</section>

				<section className="mb-12" data-tier="featured">
					<h2 className="type-heading m-0">From the bestiary</h2>
					<p className="mt-1 mb-4 max-w-[62ch] font-body text-small text-ink-2">
						Species silhouettes from the record plates. Open one to read its record.
					</p>
					<div className="-mx-6 flex snap-x gap-2 overflow-x-auto px-6 [scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)] sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible sm:px-0 md:grid-cols-8">
						{featuredSpecies.slice(1).map((s: any) => (
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
