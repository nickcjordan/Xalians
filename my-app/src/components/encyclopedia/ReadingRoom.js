import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as lore from '../../lore';
import GalaxyMap from './GalaxyMap';
import EraScrubber from './EraScrubber';
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

/**
 * The reading room: the galaxy map (with its era scrubber) as the full-width
 * hero, a "First Survey" call to action above it, and the Story of Xalia
 * beside the archive's entry-point tiles below. `?era=<key>` on the route
 * seeds the selected era for deep links; kept intentionally.
 */
export default function ReadingRoom() {
	const overview = lore.getOverview();
	const tour = lore.getTour();
	const queryEra = useQueryEra();
	const [era, setEra] = useState(() => (queryEra ? queryEra : null));

	useEffect(() => {
		if (queryEra) setEra(queryEra);
	}, [queryEra]);

	const firstBeat = tour.beats.length > 0 ? tour.beats[0] : null;

	return (
		<div>
			<p className="g-body enc-room-preface">
				This archive holds every record the Generator has on the galaxy it serves: the worlds, the fauna printed for them, the powers that ordered the printing, and the sequence of events that left the galaxy as it is. Records are relative in time; no date survives. Begin anywhere.
			</p>

			{tour.beats.length > 0 && (
				<section className="g-panel g-panel--raised enc-room-tour">
					<span className="g-kicker enc-room-tour-kicker">Begin here</span>
					<h2 className="g-h2 enc-room-tour-title">{tour.title}</h2>
					<p className="g-body enc-room-tour-meta">{tour.beats.length} beats through the history of Xalia.</p>
					{firstBeat && (
						<Link to={lore.routeFor('tour', firstBeat.key)} className="g-btn g-btn--primary">
							Start the survey
						</Link>
					)}
				</section>
			)}

			<section className="g-panel g-panel--bolted enc-room-map-panel">
				<header className="g-panel-head">
					<h2 className="g-h2">Galaxy of Xalia</h2>
				</header>
				<GalaxyMap era={era} />
				<EraScrubber era={era} onChange={setEra} />
			</section>

			<div className="enc-room-columns">
				<section className="g-panel enc-room-story">
					<header className="g-panel-head">
						<h2 className="g-h2">The Story of Xalia</h2>
					</header>
					{overview.map(({ era: eraView, blurb }, i) => (
						<div className="g-record" key={eraView.key}>
							<h3 className="g-record-term">
								<span className="enc-room-index g-mono">{i + 1}</span>
								<Link to={lore.routeFor('era', eraView.key)} className="g-link">
									{eraView.name}
								</Link>
							</h3>
							<p className="g-record-body">{blurb}</p>
						</div>
					))}
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
		</div>
	);
}
