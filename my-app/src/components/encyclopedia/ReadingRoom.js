import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as lore from '../../lore';
import GalaxyMap from './GalaxyMap';
import EraScrubber from './EraScrubber';
import StoryContents from './StoryContents';
import { useResume } from './trail';
import './ReadingRoom.css';

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
			<section className="g-panel g-panel--raised enc-room-begin">
				<span className="g-kicker enc-room-begin-kicker">Continue reading</span>
				<h2 className="g-h2 enc-room-begin-title">{story.title}</h2>
				<p className="g-body enc-room-begin-meta">
					Part {resumedPart.order} of {story.parts.length}, {resumedPart.era.name}
				</p>
				<Link to={lore.routeFor('era', resumedPart.era.key)} className="g-btn g-btn--primary">
					Resume Part {resumedPart.order}, {resumedPart.era.name}
				</Link>
			</section>
		);
	}

	const firstPart = story.parts[0];
	return (
		<section className="g-panel g-panel--raised enc-room-begin">
			<span className="g-kicker enc-room-begin-kicker">Begin here</span>
			<h2 className="g-h2 enc-room-begin-title">{story.title}</h2>
			<p className="g-body enc-room-begin-meta">{story.parts.length} parts, one per era.</p>
			<Link to={lore.routeFor('era', firstPart.era.key)} className="g-btn g-btn--primary">
				Begin Part 1, {firstPart.era.name}
			</Link>
		</section>
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
			<p className="g-body enc-room-preface">
				Every record the Generator holds on the galaxy it serves is here: the worlds, the fauna printed for
				them, the powers that ordered the printing, and the sequence of events that left Xalia as it is.
				Nothing is dated. The archive knows only what came before what. Read it as one story from the first
				part, or open any record and follow it back into the story.
			</p>

			<BeginOrResumeCard story={story} />

			<section className="g-panel g-panel--bolted enc-room-map-panel">
				<header className="g-panel-head">
					<h2 className="g-h2">Galaxy of Xalia</h2>
				</header>
				<GalaxyMap era={era} />
				<EraScrubber era={era} onChange={setEra} />
			</section>

			<section className="g-panel enc-room-contents">
				<header className="g-panel-head">
					<h2 className="g-h2">Contents</h2>
				</header>
				<StoryContents story={story} />
			</section>

			<div className="enc-grid enc-room-strip">
				{TILES.map((tile) => (
					<Link key={tile.to} to={tile.to} className="g-tile">
						<span className="g-tile-name">{tile.label}</span>
						<p className="g-tile-meta">{tile.count()}</p>
					</Link>
				))}
			</div>
		</div>
	);
}
