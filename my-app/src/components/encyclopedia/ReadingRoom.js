import React from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import GalaxyMap from './GalaxyMap';
import './ReadingRoom.css';

const TILES = [
	{ label: 'Worlds', to: '/encyclopedia/worlds', count: () => `${lore.getWorlds().length} worlds surveyed` },
	{ label: 'Bestiary', to: '/encyclopedia/species', count: () => `${lore.getSpeciesList().length} species printed` },
	{
		label: 'Powers',
		to: '/encyclopedia/powers',
		count: () => {
			const powers = lore.getPowers();
			return `${powers.factions.length + powers.people.length + powers.peoples.length} powers and peoples`;
		},
	},
	{ label: 'Index', to: '/encyclopedia/index', count: () => `${lore.getEntries().length} entries` },
];

/**
 * The reading room: the galaxy map beside the seven-era story, and a strip
 * of entry points into the rest of the archive.
 */
export default function ReadingRoom() {
	const overview = lore.getOverview();

	return (
		<div>
			<p className="g-body enc-room-preface">
				This archive holds every record the Generator has on the galaxy it serves: the worlds, the fauna printed for them, the powers that ordered the printing, and the sequence of events that left the galaxy as it is. Records are relative in time; no date survives. Begin anywhere.
			</p>

			<div className="enc-room-columns">
				<div className="enc-room-left">
					<section className="g-panel g-panel--bolted enc-room-map-panel">
						<header className="g-panel-head">
							<h2 className="g-h2">Galaxy of Xalia</h2>
						</header>
						<GalaxyMap />
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

				<section className="g-panel enc-room-story">
					<header className="g-panel-head">
						<h2 className="g-h2">The Story of Xalia</h2>
					</header>
					{overview.map(({ era, blurb }, i) => (
						<div className="g-record" key={era.key}>
							<h3 className="g-record-term">
								<span className="enc-room-index g-mono">{i + 1}</span>
								<Link to={lore.routeFor('era', era.key)} className="g-link">
									{era.name}
								</Link>
							</h3>
							<p className="g-record-body">{blurb}</p>
						</div>
					))}
				</section>
			</div>
		</div>
	);
}
