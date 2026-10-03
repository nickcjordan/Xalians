// Tier: chrome. The front door, told as a story: the brand, one fixed sample
// creature standing on its world, Nick's own 2022 account of Xalia as a
// sequence of beats (painted scenes and figures), the creature's page, and
// the tournament that leads to the Generator. Brief: docs/design/home-story-
// page-brief.md; the beats: docs/design/home-story-content-plan.md. The
// story's words are Nick's (git 1285604e, my-app/src/pages/home.js) and the
// 2021 Yetimoth entry, and every beat's headline is a phrase of his. The
// agent-written text is each scene's small label (SCENE_LABEL) and each
// figure's label and description for screen readers: plain accounts of what is shown,
// fact-checked against the planet histories with the lore-factcheck skill.
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
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import specimen from './home/specimen.json';
import { startStoryMotion } from './home/motion';
import { StoryViewer, type ViewerBeat } from './home/storyViewer';
import { ArchivePlay, ArchiveScreen, type ScreenState } from './home/archiveScreen';
import type { FigureKey } from './home/pieces/figures';

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

// Beat 2 reads Nick's 2022 draft slide "Creatures of Xalia" (commented out in git 1285604e
// my-app/src/pages/home.js), cut short: the rest repeats beat 1's paragraph and beat 2's headline.
// Beats 3 and 4 share his End Wars paragraph, a sentence each, so neither repeats the other.
const GENERATORS = 'Their mastery of biotechnology led to the invention of Xalian Generators. These machines would be used to create the first generation of Xalians.';
const [APEX_RELEASED, END_WARS] = STORY[1].split(/(?<=intelligence\.) /);

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
} as const;

type Art = {
	src: string;
	small: string;
	alt: string;
	era?: keyof typeof ERA_TITLE;
	/** The living plate's fragment. */
	live?: string;
	/** The living plate's own first frame, shown whenever it is not the page's one live plate. */
	still?: { src: string; small: string };
};

const ART = {
	unbirth: {
		era: 'unbirth',
		src: '/assets/img/lore/eras/unbirth.jpg',
		small: '/assets/img/lore/eras/unbirth-768.jpg',
		alt: 'A heavy industrial machine on flooded rock, ringed by young growth, lets glowing seeds down a chute into the storm flood; the current spreads them across the plain, where some split and larvae swim out and others take root on the rocks; out in the distance the storm whips the water white, and far off a colossal tree rises from an island of young forest grown from earlier seeds.',
		// The living version: the Genesis Prototype on Floria, letting its seeds
		// into the flood that was meant to wash its mistakes away. Baked for the
		// site (scripts/plates/bake-plate.cjs): its still parts are pictures.
		live: '/assets/plates/unbirth/live.html',
		still: { src: '/assets/plates/unbirth/poster.jpg', small: '/assets/plates/unbirth/poster-768.jpg' },
	},
	endWars: {
		era: 'end-wars',
		src: '/assets/img/lore/eras/end-wars.jpg',
		small: '/assets/img/lore/eras/end-wars-768.jpg',
		alt: 'A burning warship falling between the towers of a night city under a sky of tracer fire.',
		// The living version of this plate: stacked SVG layers with fire, smoke,
		// weapon fire and water in motion; live while it is the plate most in view.
		live: '/assets/plates/end-wars/live.html',
		still: { src: '/assets/plates/end-wars/poster.jpg', small: '/assets/plates/end-wars/poster-768.jpg' },
	},
	present: {
		era: 'present',
		src: '/assets/img/lore/eras/present.jpg',
		small: '/assets/img/lore/eras/present-768.jpg',
		alt: 'Night on Valleron. A packed arena glows under floodlights in a crowded city of spires, hung with the banners of many factions, and on its floor a power of lightning and a power of fire trade blows and clash in flashes while the crowd roars. Above the arena, projected from the king’s box, hangs the prize, a Scrambler Token shown in gold light. Beyond it rises King Kozrak’s citadel with the Mercurius Machine glowing gold at its top and searchlights sweeping the city. Ships come down out of a sky where the galaxy still smolders red and settle on the city’s landing decks, and a ship waits on a deck in the foreground with its hatch open.',
		// The living version: Kozrak's arena on Valleron, a fight seen only as light, and the token as the prize.
		live: '/assets/plates/present/live.html',
		still: { src: '/assets/plates/present/poster.jpg', small: '/assets/plates/present/poster-768.jpg' },
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
	eager = false,
	still = false,
	live,
	primed = false,
	staged = false,
	screen,
}: {
	art: Art;
	aspect: string;
	position?: string;
	className?: string;
	eager?: boolean;
	/** The hero's panel holds still. */
	still?: boolean;
	/** In the story's viewer: whether its living plate may be live now. */
	live?: boolean;
	/** In the story's viewer: mount the living plate now, held still, so going live only starts it. */
	primed?: boolean;
	/** In the story's viewer, which moves it itself: no scroll-in and no drift. */
	staged?: boolean;
	/** In the story's viewer: the recording's archive screen, its state and readout. */
	screen?: { state: ScreenState; rec: string; place: string; start: number; onPlay?: () => void };
}) {
	const picture = art.live ? (
		// A living plate holds still in its frame: its motion is its own.
		<LivePlate src={art.live} poster={{ ...(art.still ?? art), alt: art.alt }} active={live} primed={primed} />
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
			className={cn('h-full w-full object-cover', !still && !staged && 'scale-[1.12]', position)}
		/>
	);
	const figure = (
		<figure className={cn('chamfer frame relative m-0', aspect, className)}>
			<span className="frame-well">
				{screen ? (
					<ArchiveScreen state={screen.state} rec={screen.rec} place={screen.place} start={screen.start} still={!art.live}>
						{picture}
					</ArchiveScreen>
				) : (
					picture
				)}
			</span>
		</figure>
	);
	if (still || !art.era) return figure;
	const link = (
		<Link
			to={`/encyclopedia/story/${art.era}`}
			data-panel={staged ? undefined : ''}
			aria-label={`${art.alt} Opens ${ERA_TITLE[art.era]} in The Story.`}
			className="mass-frame block no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
		>
			{figure}
		</Link>
	);
	// In the story's viewer, the screen's Play key lies over the frame beside the link, never inside it.
	if (!screen?.onPlay) return link;
	return (
		<div className="relative">
			{link}
			<ArchivePlay state={screen.state} rec={screen.rec} onPlay={screen.onPlay} />
		</div>
	);
}

/** The hero's tag: cream, cut with the system's chamfer so the hairline follows the corner. */
const PLATE_STYLE = { '--chamfer-fill': 'var(--color-ink)', '--chamfer-edge': 'var(--color-ink-3)' } as React.CSSProperties;

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

/**
 * What each painting shows, as a small label under it: a title and one or two
 * plain sentences, the way a gallery labels a picture. Agent-written and
 * fact-checked (see the file header); the story itself is the reading column.
 */
const SCENE_LABEL = {
	unbirth: {
		title: 'The Genesis Prototype on Floria',
		text: 'The first Xalian Generator runs at full capacity through the storm. The flood meant to wash its mistakes away carries its glowing seeds out over the world, where some let larvae swim free and others take root.',
	},
	'end-wars': {
		title: 'The Fall over Grimedes',
		text: 'A burning warship falls between lit towers under a sky crossed with weapon fire: the Battle of Grimedes, where the remnants of the Vallerii fleets made their final assault on APEX’s forces and the End Wars ended.',
	},
	present: {
		title: 'An Arena on Valleron',
		// The tournament is Nick's 2022 paragraph, told under the arena it is fought in (it sat in its own
		// section below the viewer until 2026-09-27; Nick: the last scene belongs inside the video player).
		text: TOURNAMENT,
		quote: true,
	},
} satisfies Record<string, Label & { quote?: boolean }>;

/**
 * The story's scenes. Every scene has the same three parts: the painting, as
 * large as the viewer's box allows; its label, small, under the frame's foot;
 * and the reading column, the beat's headline and Nick's paragraph, set large.
 * Only the arrangement changes (`.scene-spread` in globals.css): `wide` and
 * `wide-right` run the painting across the box with the label and the reading
 * column in a row beneath it (label left or right); `side` sets the reading
 * column to the right of the painting. On a phone they stack: painting, label,
 * reading column.
 */
type Layout = 'wide' | 'wide-right' | 'side';
type Era = keyof typeof SCENE_LABEL;

type Spread = { kind: 'scene'; art: Art & { era: Era }; headline: string; text: string; layout: Layout; aspect: string; ar: number; position?: string; /** Height kept for a longer label under the frame (the side layouts' default is 7rem). */ labelRoom?: string; /** Cropped to 16:9 on a phone. */ phoneVideo?: boolean };
/** A beat drawn as a figure on the page (docs/design/home-story-figures.md): no screen; `stage` is which of the figure's beats it is. */
type FigureBeat = { kind: 'figure'; key: string; figure: FigureKey; stage: number; name: string; headline: string; text: string; label: { title: string; text: string }; alt: string };

// Each recording's readout on its archive screen: where it was recorded, or what it is.
const RECORDED: Record<string, string> = { unbirth: 'Floria', 'end-wars': 'Grimedes', present: 'Valleron' };
// Each reel's clock starts partway in, so the clip reads as a cut from a longer recording.
const reelStart = (i: number) => 1800 + ((i * 7919) % 5400);

// The story's beats, in order (docs/design/home-story-content-plan.md). A
// headline is a phrase from Nick's 2022 page; the reading text is his
// paragraph. The small beats are figures drawn on the page (pages/home/pieces/,
// docs/design/home-story-figures.md): beats 2 and 3 are one figure, the
// Generators; beats 5 and 6 another, the outbreak.
const BEATS: Array<Spread | FigureBeat> = [
	{ kind: 'scene', art: ART.unbirth, headline: 'They birthed the first Xalians', text: STORY[0], layout: 'wide', aspect: 'aspect-[21/9]', ar: 21 / 9, position: 'object-[center_40%]' },
	{
		kind: 'figure',
		key: 'generators',
		figure: 'generators',
		stage: 0,
		name: 'The Xalian Generators',
		headline: "Designed to thrive in Xalia's most extreme environments",
		text: GENERATORS,
		label: {
			title: 'Generators, world by world',
			text: 'Each Generator made Xalians suited to the world it stood on; the seeds of life in its vat took forms fit for that world.',
		},
		alt: "The same heavy steel Generator, a tall glowing vat at its heart, shown on one world after another: a storm world, a lava world, an ice world and a sea. On each, the sensor ring on its mast reads the world, a pulse of light runs down into the vat, the gel takes the world's light, and new seeds of life form in it, dark against the glow, in shapes suited to that world: finned, armored, spiked, bell-shaped.",
	},
	{
		kind: 'figure',
		key: 'apex',
		figure: 'generators',
		stage: 1,
		name: 'APEX takes the Generators',
		headline: "The galaxy's first artificial intelligence",
		text: APEX_RELEASED,
		label: {
			title: 'The Generators, under APEX',
			text: 'Under the APEX Accords, signed by the Thousand Families, the Generators were placed under the control of APEX.',
		},
		alt: "The machine's lights dip. The view pulls back to show more Generators, each on its own world, with dark space between them. A see-through lattice resolves above them, marked APEX, and dashed links snap from it to the machines. Their vats turn APEX's violet, and the seeds in them line up and pulse together on one steady beat.",
	},
	{ kind: 'scene', art: ART.endWars, headline: 'Turned the Xalians against their masters', text: END_WARS, layout: 'wide-right', aspect: 'aspect-[2/1]', ar: 2 },
	{
		kind: 'figure',
		key: 'plague',
		figure: 'outbreak',
		stage: 0,
		name: 'The Nemesis Plague',
		headline: 'Designed by APEX to target the genome',
		text: STORY[2],
		label: {
			title: 'The plague across Xalia',
			text: 'The plague burns through the galaxy, and few worlds are safe; most life gathers on Valleron.',
		},
		alt: 'A spiral galaxy of warm golden lights. A crimson plague breaks out in several places at once and burns along its arms; each light it reaches flares and goes out, until most of the galaxy smolders dark red and only a few distant lights hold. One light stays brightest as small lights drift in to it from the dark around it.',
	},
	{
		kind: 'figure',
		key: 'token',
		figure: 'outbreak',
		stage: 1,
		name: 'The Scrambler Token',
		headline: 'The only way to safely generate new Xalians',
		text: TOKENS,
		label: {
			title: 'A Scrambler Token brought home',
			text: 'Carried home from Valleron, where the Mercurius Machine prints them, a Scrambler Token lets a Generator make new Xalians immune to the plague.',
		},
		alt: 'The view closes in on one darkened world and comes down through its red air to a plain where a Generator stands idle, its vat empty. A dark printed chip with a scrambled genome on its face is carried in and slid into a slot below the vat. The scrambled pattern on the chip lights up rung by rung, the vat fills with green, the machine’s lights come on, and new seeds of life form in it. Its light spreads over the ground, and the red haze drifts over the new life without touching it; beyond it, the red remains.',
	},
	{ kind: 'scene', art: ART.present, headline: 'Only the strongest factions will survive…', text: STORY[3], labelRoom: '9.5rem', phoneVideo: true, layout: 'side', aspect: 'aspect-video min-[720px]:aspect-[4/3]', ar: 4 / 3, position: 'object-[40%_center]' },
];
const numeral = (i: number) => String(i + 1).padStart(2, '0');

/** The painting's label: what the picture shows, small, outside the frame. */
type Label = { title: string; text: string };

function SceneLabel({ label, className }: { label: Label & { quote?: boolean }; className?: string }) {
	return (
		<div className={cn('scene-label flex flex-col gap-1 border-t border-edge pt-2.5', className)}>
			<p className="m-0 font-body text-small font-bold text-ink-2">{label.title}</p>
			{/* Not through cn(): tailwind-merge takes text-small for a color and would drop it beside text-ink-*. */}
			<p className={`m-0 font-body text-small ${label.quote ? 'text-ink-2' : 'text-ink-3'}`}>{label.text}</p>
		</div>
	);
}

/** The reading column: the beat's numeral and name, its headline, and Nick's paragraph, set to be read. */
function SceneReading({ n, name, headline, text, className }: { n: string; name: string; headline: string; text?: string; className?: string }) {
	return (
		<div className={cn('scene-read flex flex-col', className)}>
			<span className="type-data text-tiny tracking-legend text-ink-3">
				{n} · {name}
			</span>
			<h3 className="type-heading m-0 mt-1.5 text-white lg:mt-2">{headline}</h3>
			{text ? <p className="m-0 mt-2 max-w-[62ch] font-body text-body leading-normal text-ink sm:text-lead sm:leading-normal lg:mt-3 lg:text-subhead lg:leading-normal">{text}</p> : null}
		</div>
	);
}

const STORY_BEATS: ViewerBeat[] = BEATS.map((sp, i): ViewerBeat => {
	const n = numeral(i);
	if (sp.kind === 'figure') {
		// A figure: its place in the spread, where the figure stage draws it (no frame, no screen), its label
		// under it and its words beside it, like any beat.
		return {
			key: sp.key,
			n,
			label: sp.name,
			minor: true,
			figure: { key: sp.figure, stage: sp.stage },
			render: () => (
				<div className="scene-spread" data-layout="side" style={{ '--ar': 16 / 9 } as React.CSSProperties}>
					<div className="scene-art">
						<div className="scene-frame">
							<div data-figure-slot={sp.figure} className="figure-slot relative aspect-video" role="img" aria-label={sp.alt} />
						</div>
						<SceneLabel label={sp.label} />
					</div>
					<SceneReading n={n} name={sp.name} headline={sp.headline} text={sp.text} />
				</div>
			),
		};
	}
	return {
		key: sp.art.era,
		n,
		label: ERA_TITLE[sp.art.era],
		live: sp.art.live,
		render: (live, _shown, screen, primed, play) => (
			<div className="scene-spread" data-layout={sp.layout} data-phone-ar={sp.phoneVideo ? 'video' : undefined} style={{ '--ar': sp.ar, ...(sp.labelRoom ? { '--label': sp.labelRoom } : {}) } as React.CSSProperties}>
				<div className="scene-art">
					<div className="scene-frame">
						<Panel art={sp.art} aspect={sp.aspect} position={sp.position} live={live} primed={primed} staged screen={{ state: screen, rec: n, place: RECORDED[sp.art.era], start: reelStart(i), onPlay: play }} />
					</div>
					<SceneLabel label={SCENE_LABEL[sp.art.era]} />
				</div>
				<SceneReading n={n} name={ERA_TITLE[sp.art.era]} headline={sp.headline} text={sp.text} />
			</div>
		),
	};
});

/* ------------------------------------------------------------------ page */

function Home() {
	usePageTitle();
	const rootRef = React.useRef<HTMLElement>(null);
	React.useEffect(() => {
		const root = rootRef.current;
		return root ? startStoryMotion(root) : undefined;
	}, []);

	return (
		<main id="main" ref={rootRef} className="min-h-screen overflow-x-clip text-ink font-body" data-tier="chrome">
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
					{/* The Story: a click-through viewer, one beat at a time, full
					    scenes (same frame, same plate, a different arrangement every
					    time) and figures between them. Only the shown beat
					    animates, and only once it has settled. */}
					<StoryViewer id="story" title={<StoryHead id="story-title" className="mb-0">The Story</StoryHead>} beats={STORY_BEATS} after="#specimen" />

					{/* The Galaxy of Xalia: the creature's page. */}
					<section
						id="specimen"
						aria-labelledby="galaxy"
						className={`el-${ELEMENT} grid scroll-mt-24 grid-cols-1 gap-x-6 gap-y-8 pt-16 pb-16 lg:grid-cols-12 lg:pt-24 lg:pb-24`}
					>
						<StoryHead id="galaxy" className="mb-0 lg:col-span-12">The Galaxy of Xalia</StoryHead>
						{/* On a phone the creature comes first, at a size that leaves its words in reach; beside them on a wide screen. */}
						<div className="order-last flex flex-col gap-4 lg:order-none lg:col-span-5">
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
							<p className="m-0 flex flex-wrap gap-x-6 font-body text-small">
								<Button asChild variant="link" className="text-small">
									<Link to={`/encyclopedia/species/${SPECIES_KEY}`}>Its record</Link>
								</Button>
								<Button asChild variant="link" className="text-small">
									<Link to={`/encyclopedia/worlds/${WORLD_KEY}`}>Its world</Link>
								</Button>
							</p>
						</div>
						<div data-figure className="mx-auto w-full max-w-[240px] sm:max-w-[320px] lg:col-span-7 lg:max-w-[560px] lg:justify-self-center lg:self-center">
							<span className="block" style={{ filter: GLOW }}><XalianImage speciesName={SPECIES_NAME} primaryType={ELEMENT} unPadded moreClasses="w-full" /></span>
						</div>
					</section>

					{/* The Tournament & Tokens: the door. The tournament itself is the story's last beat. */}
					<section aria-labelledby="tournament" className="pt-4">
						<StoryHead id="tournament">The Tournament &amp; Tokens</StoryHead>

						<div className="flex max-w-[62ch] flex-col items-start gap-5">
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
										className="group flex h-full flex-col gap-2 border border-edge bg-s1 px-4 pt-4 pb-5 no-underline transition-[background-color,border-color] duration-[120ms] ease-out hover:border-edge-strong hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring"
									>
										<span className="flex items-center justify-between gap-2">
											<span className="type-legend text-ink">{g.name}</span>
											<ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-3 transition-transform duration-1 ease-out group-hover:translate-x-0.5 group-hover:text-ink" />
										</span>
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
