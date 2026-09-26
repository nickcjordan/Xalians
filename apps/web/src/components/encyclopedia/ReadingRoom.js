import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import * as lore from '../../lore';
import GalaxyMap from './GalaxyMap';
import EraScrubber from './EraScrubber';
import { useResume } from './trail';
import { SectionHead } from '@/components/system/masthead';
import { usePageTitle } from '@/components/system/head';
import { IndexRow, IndexList } from '@/components/system/index-row';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SECTIONS = [
	{
		label: 'Worlds',
		to: '/encyclopedia/worlds',
		copy: 'Every world, with its history, terrain and native species.',
		count: () => `${lore.getWorlds().length} worlds surveyed`,
	},
	{
		label: 'Bestiary',
		to: '/encyclopedia/species',
		copy: 'Every species, with appearance, habitat, behavior and signature ability.',
		count: () => `${lore.getSpeciesList().length} species printed`,
	},
	{
		label: 'Powers',
		to: '/encyclopedia/powers',
		copy: 'The Vallerii, the factions, and the peoples of each world.',
		count: () => {
			const powers = lore.getPowers();
			return `${powers.factions.length + powers.vallerii.length + powers.peoples.length} records`;
		},
	},
	{
		label: 'Index',
		to: '/encyclopedia/index',
		copy: 'Every named thing in the archive, alphabetized.',
		count: () => `${lore.getEntries().length} entries`,
	},
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
				<div className="flex shrink-0 flex-col items-end gap-2 max-sm:w-full max-sm:items-stretch">
					<Button asChild className="max-sm:w-full">
						<Link to={lore.routeFor('era', resumedPart.era.key)}>
							Resume Part {resumedPart.order}, {resumedPart.era.name}
						</Link>
					</Button>
					<Link to="/encyclopedia/story" className="text-small text-ink-2 underline decoration-ink-3 underline-offset-4 hover:decoration-ink max-sm:text-center">
						Or open the contents
					</Link>
				</div>
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
			<div className="flex shrink-0 flex-col items-end gap-2 max-sm:w-full max-sm:items-stretch">
				<Button asChild className="max-sm:w-full">
					<Link to={lore.routeFor('era', firstPart.era.key)}>
						Begin Part 1, {firstPart.era.name}
					</Link>
				</Button>
				<Link to="/encyclopedia/story" className="text-small text-ink-2 underline decoration-ink-3 underline-offset-4 hover:decoration-ink max-sm:text-center">
					Or open the contents
				</Link>
			</div>
		</Card>
	);
}

/**
 * The reading room: the front matter for the archive. Intro paragraph, the
 * Begin or Resume card, the galaxy map with its era scrubber, then one row
 * per reference section (Worlds, Bestiary, Powers, Index). The Story's own
 * table of contents lives on /encyclopedia/story, linked from the Begin or
 * Resume card rather than duplicated here. `?era=<key>` on the route seeds
 * the selected era for deep links; kept intentionally. Contract:
 * docs/design/xalian-encyclopedia-story-pass.md "The shape after the pass".
 */
export default function ReadingRoom() {
	usePageTitle('Reading Room');
	const story = lore.getStory();
	const queryEra = useQueryEra();
	const [era, setEra] = useState(() => (queryEra ? queryEra : null));

	useEffect(() => {
		if (queryEra) setEra(queryEra);
	}, [queryEra]);

	return (
		<div>
			<p className="mb-6 max-w-[62ch] font-body text-lead text-ink-2">
				Every record the Generator holds on the galaxy it serves is here: the worlds, the fauna printed for
				them, the powers that ordered the printing, and the sequence of events that left Xalia as it is.
				Nothing is dated. The archive knows only what came before what. Read it as one story from the first
				part, or open any record and follow it back into the story.
			</p>

			<BeginOrResumeCard story={story} />

			<section className="mb-8">
				<SectionHead title="Galaxy of Xalia" />
				<div className="mx-auto max-w-[1000px]">
					<GalaxyMap era={era} />
					<div className="border border-t-0 border-edge bg-s1 p-4">
						<EraScrubber era={era} onChange={setEra} />
					</div>
				</div>
			</section>

			{/* One row per reference section: name, copy, live count, chevron. */}
			<IndexList>
				{SECTIONS.map((section) => (
					<IndexRow
						key={section.to}
						to={section.to}
						title={section.label}
						copy={section.copy}
						meta={section.count()}
					/>
				))}
			</IndexList>
		</div>
	);
}
