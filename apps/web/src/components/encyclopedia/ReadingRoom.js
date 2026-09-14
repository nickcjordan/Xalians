import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import * as lore from '../../lore';
import GalaxyMap from './GalaxyMap';
import EraScrubber from './EraScrubber';
import StoryContents from './StoryContents';
import { useResume } from './trail';
import { SectionHead } from '@/components/system/masthead';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TILES = [
	{ label: 'Worlds', to: '/encyclopedia/worlds', count: () => `${lore.getWorlds().length} worlds surveyed` },
	{ label: 'Bestiary', to: '/encyclopedia/species', count: () => `${lore.getSpeciesList().length} species printed` },
	{
		label: 'Powers',
		to: '/encyclopedia/powers',
		count: () => {
			const powers = lore.getPowers();
			return `${powers.factions.length + powers.vallerii.length + powers.peoples.length} powers and peoples`;
		},
	},
	{ label: 'Index', to: '/encyclopedia/index', count: () => `${lore.getEntries().length} entries` },
];

function useQueryEra() {
	const location = useLocation();
	const params = new URLSearchParams(location.search);
	return params.get('era');
}

/** Begin or Resume: opens Part 1, or the reader's furthest-along part when one is remembered. */
function BeginOrResumeCard({ story }) {
	const resume = useResume();
	const resumedPart = resume ? lore.getStoryPart(resume.eraKey) : null;

	if (resumedPart) {
		return (
			<Card variant="panel" className="mb-6 flex flex-row flex-wrap items-center justify-between gap-4">
				<div className="min-w-0 flex-[1_1_22rem]">
					<span className="type-legend mb-1 block">Continue reading</span>
					<h2 className="type-heading m-0 mb-1">{story.title}</h2>
					<p className="m-0 font-body text-body text-ink-2">
						Part {resumedPart.order} of {story.parts.length}, {resumedPart.era.name}
					</p>
				</div>
				{/* The one forward action on this screen: the primary key. */}
				<Button asChild className="shrink-0 max-sm:w-full">
					<Link to={lore.routeFor('era', resumedPart.era.key)}>
						Resume Part {resumedPart.order}, {resumedPart.era.name}
					</Link>
				</Button>
			</Card>
		);
	}

	const firstPart = story.parts[0];
	return (
		<Card variant="panel" className="mb-6 flex flex-row flex-wrap items-center justify-between gap-4">
			<div className="min-w-0 flex-[1_1_22rem]">
				<span className="type-legend mb-1 block">Begin here</span>
				<h2 className="type-heading m-0 mb-1">{story.title}</h2>
				<p className="m-0 font-body text-body text-ink-2">{story.parts.length} parts, one per era.</p>
			</div>
			<Button asChild className="shrink-0 max-sm:w-full">
				<Link to={lore.routeFor('era', firstPart.era.key)}>
					Begin Part 1, {firstPart.era.name}
				</Link>
			</Button>
		</Card>
	);
}

/**
 * The reading room: the front matter for the archive. Intro paragraph, the
 * Begin or Resume card, the galaxy map with its era scrubber, Contents (the
 * seven parts of The Story), then the reference shelf. `?era=<key>` on the
 * route seeds the selected era for deep links; kept intentionally.
 * Contract: docs/design/xalian-encyclopedia-story-pass.md "The shape after
 * the pass".
 */
export default function ReadingRoom() {
	const story = lore.getStory();
	const queryEra = useQueryEra();
	const [era, setEra] = useState(() => (queryEra ? queryEra : null));

	useEffect(() => {
		if (queryEra) setEra(queryEra);
	}, [queryEra]);

	return (
		<div>
			<p className="mb-6 max-w-[62ch] font-body text-body text-ink-2">
				Every record the Generator holds on the galaxy it serves is here: the worlds, the fauna printed for
				them, the powers that ordered the printing, and the sequence of events that left Xalia as it is.
				Nothing is dated. The archive knows only what came before what. Read it as one story from the first
				part, or open any record and follow it back into the story.
			</p>

			<BeginOrResumeCard story={story} />

			<section className="mb-8">
				<SectionHead title="Galaxy of Xalia" />
				<GalaxyMap era={era} />
				<EraScrubber era={era} onChange={setEra} />
			</section>

			<section className="mb-8">
				<h2 className="type-heading m-0 mb-3">Contents</h2>
				<StoryContents story={story} />
			</section>

			{/* One shelf line per section, on a single panel rather than a tile grid --
			    it duplicates the section nav, so it stays quiet. */}
			<Card variant="panel" className="flex flex-wrap p-0">
				{TILES.map((tile) => (
					<Link
						key={tile.to}
						to={tile.to}
						className="flex flex-1 basis-48 items-baseline justify-between gap-2 border-l border-dotted border-edge px-4 py-2 no-underline first:border-l-0 first:pl-0 max-sm:basis-full max-sm:border-l-0 max-sm:border-t max-sm:border-dotted max-sm:border-edge max-sm:pl-0 max-sm:first:border-t-0"
					>
						<span className="type-legend text-[13px] hover:underline">{tile.label}</span>
						<span className="whitespace-nowrap font-body text-small text-ink-2">{tile.count()}</span>
					</Link>
				))}
			</Card>
		</div>
	);
}
