// Tier: chrome. The front door, told as a story: the brand, one fixed sample
// creature standing on its world, Nick's own 2022 account of Xalia in four
// spreads, the creature's page, and the tournament that leads to the
// Generator. Brief: docs/design/home-story-page-brief.md. The words are
// Nick's (git 1285604e, my-app/src/pages/home.js) and the 2021 Yetimoth
// entry; nothing on this page is written in the world's voice by an agent.
import * as React from 'react';
import { Link } from 'react-router';
import XalianNavbar from '../components/navbar';
import XaliansLogoDnaAnimated from '../components/animations/xaliansLogoDnaAnimated';
import XalianImage from '../components/xalianImage';
import { Starfield } from '../components/starfield';
import { LivePlate } from '../components/plates/livePlate';
import { usePageTitle } from '@/components/system/head';
import { Shell } from '@/components/system/masthead';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import specimen from './home/specimen.json';
import { startStoryMotion } from './home/motion';

/* ------------------------------------------------------------------ copy */

// Nick's 2022 front page, section by section. Three dash asides became
// commas and one colon, and "capitol" became "capital"; nothing else moved.
const HERO_LINE =
	'Xalia is home to a wide range of powerful, bioengineered creatures originating from extreme worlds all across the galaxy.';

const STORY = [
	'For thousands of years, the ancient race known as the Vallerii dominated the galaxy of Xalia. With their god-like mastery of biotechnology, they birthed the first Xalians, bioengineered organisms designed to thrive in Xalia’s most extreme environments, and forged an empire that would come to span the stars.',
	'But the high technology of the Vallerii would prove to be their downfall when they released APEX, the galaxy’s first artificial intelligence. APEX rapidly infected Xalian Generators across Vallerii space and turned the Xalians against their masters in a centuries-long interplanetary assault that would come to be known as the End Wars.',
	'The wars have long since ended, but the destruction they caused has forever changed the galaxy. The Vallerii are now all but wiped out, having been ravaged by the Nemesis Plague, a virulent bioweapon designed by APEX to target the genome of the Vallerii and their Xalian servants alike.',
	'With the plague burning through the galaxy, few planets are safe. As a result, most life forms have gathered to the capital planet of Valleron, home to their only hope: an ancient Vallerii device known as the Mercurius Machine, which is said to be able to birth a new generation of Xalians immune to APEX’s apocalyptic designs.',
];

const KRYSTOS_TODAY =
	'Today, Krystos remains a snowy wasteland, dotted with the splendorous ruins of ancient and extravagant Vallerii estates.';

// The 2021 species entry, as it stands in species.json.
const YETIMOTH =
	'Hulking, white-furred apes with the heads of mammoths and tusks made of pure ice, the Yetimoths formed the rank and file of Krystos’ prisonguards in ancient times. If their enormous size and strength was not enough to keep prisoners in line, they could also form thick sheets of ice from thin air, covering themselves in a near-impenetrable armor, blocking off escape routes in walls of frost, or encapsulating their opponents until they could lumber over close enough to pummel them into submission with their meaty, ice-gauntleted fists.';

const TOURNAMENT =
	'Recently, the king has announced plans for a galactic tournament, promising the winning faction access to a treasure trove of the miraculous output of the Mercurius Machine: the Scrambler Tokens that serve as the last hope for the continuance of Xalian life in the galaxy.';

const TOKENS =
	'By scrambling and encrypting the genome of a Xalian design, Scrambler Tokens avert the killing gaze of the Nemesis Plague. Thanks to APEX, they are now the only way to safely generate new Xalians.';

// The era plates (packages/content/json/plates.json) and the Krystos
// landscape. Alt text is the plate manifest's. Each era plate is a door to
// its part of The Story; the titles are the chronicle's era titles.
const ERA_TITLE = {
	unbirth: 'The Age of Unbirth',
	accords: 'The Accords',
	'end-wars': 'The End Wars',
	present: 'The Reign of Kozrak',
	generation: 'The Age of Generators',
} as const;

type Art = { src: string; small: string; alt: string; era?: keyof typeof ERA_TITLE; live?: string };

const ART = {
	unbirth: {
		era: 'unbirth',
		src: '/assets/img/lore/eras/unbirth.jpg',
		small: '/assets/img/lore/eras/unbirth-768.jpg',
		alt: 'A long dormitory hall of empty made-up beds leading to a great riveted machine.',
	},
	accords: {
		era: 'accords',
		src: '/assets/img/lore/eras/accords.jpg',
		small: '/assets/img/lore/eras/accords-768.jpg',
		alt: 'A lattice mast on a metal summit reaching up into a crimson storm, lightning striking the peaks around it.',
		// The living version: the QED works on Zolton, a cradle mast above a
		// storm cloud sea where crimson sprites bloom and lightning strikes.
		live: '/assets/plates/accords/plate.html',
	},
	endWars: {
		era: 'end-wars',
		src: '/assets/img/lore/eras/end-wars.jpg',
		small: '/assets/img/lore/eras/end-wars-768.jpg',
		alt: 'A burning warship falling between the towers of a night city under a sky of tracer fire.',
		// The living version of this plate: stacked SVG layers with fire, smoke,
		// weapon fire and water in motion, fetched when the panel comes near.
		live: '/assets/plates/end-wars/plate.html',
	},
	present: {
		era: 'present',
		src: '/assets/img/lore/eras/present.jpg',
		small: '/assets/img/lore/eras/present-768.jpg',
		alt: 'A round bronze platform on the floor of an empty stone arena.',
	},
	generation: {
		era: 'generation',
		src: '/assets/img/lore/eras/generation.jpg',
		small: '/assets/img/lore/eras/generation-768.jpg',
		alt: 'A channel of molten metal running between rows of smoking foundry stacks.',
	},
	krystos: {
		src: '/assets/img/planets/art/krystos-landscape.webp',
		small: '/assets/img/planets/art/krystos-landscape-768.webp',
		alt: 'A snowbound plain under grey peaks, the ruins of a stone estate on a ridge in the foreground.',
	},
} satisfies Record<string, Art>;

const GAMES = [
	{ name: 'Duel', to: '/duel', copy: 'Squad tactics on an 8 by 8 board. Capture the flag or eliminate the team.' },
	{ name: 'Reclamation', to: '/reclamation', copy: 'Send creatures into three worlds a round and hold more of them than your rival.' },
	{ name: 'Expedition', to: '/long-return', copy: 'Push a crew of your Xalians across hazardous worlds and bring them home.' },
	{ name: 'Powerworks', to: '/powerworks', copy: 'Take a squad of four through four encounters inside a dormant facility.' },
	{ name: 'Arcade', to: '/arcade', copy: 'Familiar games that turn a quick win into progress toward another Xalian.' },
];

// The one fixed specimen: a real generator record, never regenerated.
const SPECIES_NAME = 'Yetimoth';
const SPECIES_KEY = specimen.species;
const WORLD_KEY = specimen.provenance.origin;
const ELEMENT = specimen.element.primary;
const SIGNATURE = specimen.actions.find((a) => a.key.endsWith('-defining'))?.name ?? specimen.actions[0].name;

/* ----------------------------------------------------------------- parts */

/**
 * A framed painting: the chamfer at frame scale, a dark mat, the picture cut
 * to the same shape inside it and graded into the room (`.frame` in
 * globals.css). A story panel is a door: it opens its era in The Story, so
 * it stands on a mass and lifts like every pressable thing, and its corner
 * tag carries the spread's numeral and the era it opens. The hero's panel
 * is only a picture; its link is the whole block around it.
 */
function Panel({
	art,
	aspect,
	position,
	className,
	n,
	eager = false,
	still = false,
}: {
	art: Art;
	aspect: string;
	position?: string;
	className?: string;
	/** The spread's numeral, repeated on its plate. */
	n?: string;
	eager?: boolean;
	/** The hero's panel holds still; the story's drift with the scroll. */
	still?: boolean;
}) {
	const figure = (
		<figure className={cn('chamfer frame relative m-0', aspect, className)}>
			<span className="frame-well">
				{art.live ? (
					// A living plate holds still in its frame: its motion is its own.
					<LivePlate src={art.live} poster={art} />
				) : (
					<img
						src={art.src}
						srcSet={`${art.small} 768w, ${art.src} 1536w`}
						sizes="(min-width: 1000px) 1160px, 100vw"
						alt={art.alt}
						width={1536}
						height={768}
						loading={eager ? 'eager' : 'lazy'}
						decoding="async"
						className={cn('h-full w-full object-cover', !still && 'scale-[1.12]', position)}
					/>
				)}
			</span>
			{n && art.era ? (
				<span className="type-data absolute top-2 right-2 z-10 flex items-baseline gap-2.5 border border-edge-strong bg-room/80 px-2 py-1 text-tiny tracking-legend text-ink sm:top-4 sm:right-4 sm:px-2.5 sm:py-1.5">
					<span>{n}</span>
					{/* On a phone the tag would cover a quarter of the painting; the numeral stays, the era name is in the link's label. */}
					<span className="hidden text-ink-3 sm:inline">{ERA_TITLE[art.era]}</span>
				</span>
			) : null}
		</figure>
	);
	if (still || !art.era) return figure;
	return (
		<Link
			to={`/encyclopedia/story/${art.era}`}
			data-panel=""
			aria-label={`${art.alt} Opens ${ERA_TITLE[art.era]} in The Story.`}
			className="mass-frame block no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
		>
			{figure}
		</Link>
	);
}

/**
 * The caption plate: cream, cut with the system's chamfer so the hairline
 * follows the corner, a numeral in the data face, and the float shadow
 * because it sits over its painting rather than on the page.
 */
const PLATE_STYLE = { '--chamfer-fill': 'var(--color-ink)', '--chamfer-edge': 'var(--color-ink-3)' } as React.CSSProperties;

function Plate({ n, from, className, children }: { n: string; from: 'left' | 'right' | 'up'; className?: string; children: React.ReactNode }) {
	return (
		<div data-plate={from} className={cn('chamfer relative z-10 shadow-float', className)} style={PLATE_STYLE}>
			<div className="flex flex-col gap-3 px-7 pt-5 pb-7 text-room sm:px-8">
				<span className="type-data text-tiny tracking-legend text-ink-4">{n}</span>
				<p className="m-0 font-body text-lead">{children}</p>
			</div>
		</div>
	);
}

/** The creature silhouette with a white glow, so it separates from whatever stands behind it (Nick, 2026-09-22). */
const GLOW =
	'drop-shadow(0 0 2px var(--color-white)) drop-shadow(0 0 18px color-mix(in srgb, var(--color-white) 80%, transparent)) drop-shadow(0 0 48px color-mix(in srgb, var(--color-white) 35%, transparent))';

/** A section head at title size: the demo Nick approved sets the three headings large, so the story reads as chapters. */
function StoryHead({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
	return (
		<h2 id={id} className={cn('type-title m-0 mb-8 scroll-mt-24', className)}>
			{children}
		</h2>
	);
}

/* ------------------------------------------------------------------ page */

function Home() {
	usePageTitle();
	const rootRef = React.useRef<HTMLElement>(null);
	React.useEffect(() => {
		const root = rootRef.current;
		return root ? startStoryMotion(root) : undefined;
	}, []);

	return (
		<main id="main" ref={rootRef} className="min-h-screen text-ink font-body" data-tier="chrome">
			<XalianNavbar />
			<Starfield />

			<div className="relative">
				<Shell className="pt-8 pb-12 lg:pt-14 lg:pb-24">
					<div className="mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-x-6 gap-y-10 lg:grid-cols-12">
						{/* The words. The lockup is the page's title. */}
						<div className="flex flex-col items-start gap-4 lg:col-span-7">
							<h1 className="m-0">
								<XaliansLogoDnaAnimated />
							</h1>
							<p className="m-0 max-w-[42ch] font-body text-lead text-ink">{HERO_LINE}</p>
							<div className="mt-2 flex flex-wrap items-center gap-6">
								<Button asChild>
									<Link to="/generator">Try the Generator</Link>
								</Button>
								<Button asChild variant="link">
									<a href="#story">The Story</a>
								</Button>
							</div>
						</div>

						{/* The creature on its world: a portrait panel of Krystos with
						    the Yetimoth standing in front of it, feet over the frame,
						    and a tag cutting across the left edge. The whole block is
						    a link down to its page. */}
						<a
							href="#specimen"
							aria-label="A Yetimoth of Krystos, shown in full below"
							className={`el-${ELEMENT} mass-frame group mx-auto block w-full max-w-[420px] no-underline lg:col-span-5 lg:mx-0 lg:justify-self-end`}
						>
							<Panel art={ART.krystos} aspect="aspect-[4/5]" position="object-[center_35%]" eager still />
							<span
								data-hero-fig
								aria-hidden="true"
								className="absolute -bottom-[4%] left-1/2 z-20 block w-[96%] -translate-x-1/2 transition-transform duration-[320ms] ease-out group-hover:-translate-y-1.5 motion-reduce:transition-none"
							>
								<span className="block" style={{ filter: GLOW }}><XalianImage speciesName={SPECIES_NAME} primaryType={ELEMENT} unPadded moreClasses="w-full" /></span>
							</span>
							<span className="type-legend chamfer-key absolute -left-5 bottom-9 z-30 px-4 py-2.5 text-room lg:-left-10" style={PLATE_STYLE}>
								A Yetimoth of Krystos
							</span>
						</a>
					</div>
				</Shell>
			</div>

			<Shell className="pb-10">
				<div className="mx-auto max-w-[1160px]">
					{/* The Story: four spreads, one paragraph each. Same frame, same
					    plate, a different arrangement every time. */}
					<section aria-labelledby="story" className="pt-8">
						<StoryHead id="story">The Story</StoryHead>

						<div className="mb-16 grid grid-cols-1 gap-x-6 lg:mb-24 lg:grid-cols-12">
							<div className="lg:col-span-12">
								<Panel n="01" art={ART.unbirth} aspect="aspect-[21/9]" position="object-[center_40%]" />
							</div>
							<Plate n="01" from="left" className="-mt-7 mx-4 lg:col-start-1 lg:col-end-8 lg:-mt-22 lg:mr-0 lg:ml-12">
								{STORY[0]}
							</Plate>
						</div>

						<div className="mb-16 grid grid-cols-1 gap-x-6 lg:mb-24 lg:grid-cols-12 lg:items-center">
							<div className="lg:col-start-6 lg:col-end-13 lg:row-start-1">
								<Panel n="02" art={ART.accords} aspect="aspect-[4/5]" position="object-[60%_center]" />
							</div>
							<Plate n="02" from="left" className="-mt-7 mx-4 lg:col-start-1 lg:col-end-8 lg:row-start-1 lg:m-0 lg:-mr-18 lg:self-center">
								{STORY[1]}
							</Plate>
						</div>

						<div className="mb-16 grid grid-cols-1 gap-x-6 lg:mb-32 lg:grid-cols-12">
							{/* The turn of the story is the largest picture on the page:
							    it breaks the column on both sides where there is room. */}
							<div className="lg:col-span-12 lg:-mx-8 xl:-mx-24">
								<Panel n="03" art={ART.endWars} aspect="aspect-[2/1]" />
							</div>
							<Plate n="03" from="right" className="-mt-7 mx-4 lg:col-start-6 lg:col-end-13 lg:-mt-18 lg:mr-12 lg:ml-0">
								{STORY[2]}
							</Plate>
						</div>

						<div className="mb-16 grid grid-cols-1 gap-x-6 lg:mb-24 lg:grid-cols-12 lg:items-center">
							<div className="lg:col-start-1 lg:col-end-8">
								<Panel n="04" art={ART.present} aspect="aspect-[4/3]" position="object-[40%_center]" />
							</div>
							<Plate n="04" from="right" className="-mt-7 mx-4 lg:col-start-8 lg:col-end-13 lg:m-0 lg:-ml-24 lg:self-center">
								{STORY[3]}
							</Plate>
						</div>
					</section>

					{/* The Galaxy of Xalia: the creature's page. */}
					<section
						id="specimen"
						aria-labelledby="galaxy"
						className={`el-${ELEMENT} grid scroll-mt-24 grid-cols-1 gap-x-6 gap-y-8 pt-4 pb-16 lg:grid-cols-12 lg:pb-24`}
					>
						<StoryHead id="galaxy" className="lg:col-span-12">The Galaxy of Xalia</StoryHead>
						<div className="flex flex-col gap-4 lg:col-span-5">
							<p className="m-0 border-l-2 border-edge-strong bg-s1 px-5 py-4 font-body text-body text-ink">{KRYSTOS_TODAY}</p>
							<h3 className="type-display m-0 mt-2 text-white">
								{SPECIES_NAME}
								<span className="type-legend mt-2.5 block">of Krystos &middot; Ice</span>
							</h3>
							<p className="m-0 border-l-2 border-el pl-4 font-body text-body text-ink">{YETIMOTH}</p>
							<p className="m-0 mt-2">
								<span className="type-legend block">Signature ability</span>
								<span className="font-body text-body font-bold text-white">{SIGNATURE}</span>
							</p>
							<p className="m-0 flex flex-wrap gap-x-4 font-body text-small">
								<Button asChild variant="link" className="text-small">
									<Link to={`/encyclopedia/species/${SPECIES_KEY}`}>Its record</Link>
								</Button>
								<Button asChild variant="link" className="text-small">
									<Link to={`/encyclopedia/worlds/${WORLD_KEY}`}>Its world</Link>
								</Button>
							</p>
						</div>
						<div data-figure className="mx-auto w-full max-w-[420px] lg:col-span-7 lg:max-w-[560px] lg:justify-self-center lg:self-center">
							<span className="block" style={{ filter: GLOW }}><XalianImage speciesName={SPECIES_NAME} primaryType={ELEMENT} unPadded moreClasses="w-full" /></span>
						</div>
					</section>

					{/* The Tournament & Tokens: one more spread, then the door. */}
					<section aria-labelledby="tournament" className="pt-4">
						<StoryHead id="tournament">The Tournament &amp; Tokens</StoryHead>

						<div className="mb-12 grid grid-cols-1 gap-x-6 lg:mb-16 lg:grid-cols-12">
							<div className="lg:col-start-1 lg:col-end-9 lg:row-start-1">
								<Panel n="05" art={ART.generation} aspect="aspect-video" position="object-[center_60%]" />
							</div>
							<Plate n="05" from="right" className="-mt-7 mx-4 lg:col-start-8 lg:col-end-13 lg:row-start-1 lg:m-0 lg:-mb-12 lg:-ml-28 lg:self-end">
								{TOURNAMENT}
							</Plate>
						</div>

						<div className="flex max-w-[62ch] flex-col items-start gap-5 pt-6 lg:pt-10">
							<p className="m-0 font-body text-lead text-ink">{TOKENS}</p>
							<p className="type-display m-0 mt-1">Start generating now&hellip;</p>
							<div className="flex flex-wrap items-center gap-6">
								<Button asChild variant="secondary">
									<Link to="/generator">Try the Generator</Link>
								</Button>
								<Button asChild variant="link">
									<Link to="/encyclopedia/story">Read the whole story</Link>
								</Button>
							</div>
							<p className="m-0 font-body text-small text-ink-2">You can look around without an account. Keeping a Xalian needs one.</p>
						</div>

						<ul className="m-0 mt-10 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-5">
							{GAMES.map((g) => (
								<li key={g.name} className="m-0">
									<Link
										to={g.to}
										className="flex h-full flex-col gap-2 border border-edge bg-s1 px-4 pt-4 pb-5 no-underline transition-[background-color,border-color] duration-[120ms] ease-out hover:border-edge-strong hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring"
									>
										<span className="type-legend text-ink">{g.name}</span>
										<span className="font-body text-small text-ink-3">{g.copy}</span>
									</Link>
								</li>
							))}
						</ul>
					</section>
				</div>
			</Shell>
		</main>
	);
}

export default Home;
