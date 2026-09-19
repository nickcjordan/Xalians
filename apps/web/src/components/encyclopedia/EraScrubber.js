import React from 'react';
import * as lore from '../../lore';
import { Station, StationRow } from '@/components/system/station-row';

const MAP_LEGEND =
	'Fourteen worlds, colored by element. Cybele is the shattered system that left Stonera alone; Wraithix holds Phantiri and the derelict fleet.';

/**
 * A thin wrapper over `StationRow`: "All" plus the seven eras, and the one
 * caption sentence that changes with the era. Controlled: `era` is the
 * selected era key or null for "All"; `onChange(eraKey|null)` fires on
 * selection.
 */
export default function EraScrubber({ era, onChange }) {
	const eras = lore.getEras();
	const stations = [{ key: null, order: null, name: 'All' }, ...eras];

	// When an era is selected, the caption reads "<Era name>: <n> worlds lit,
	// <n> fixed events" (reusing the era footprint counts); for "All" it
	// stays the map's own legend.
	const footprint = era !== null ? lore.getEraFootprint(era) : null;
	const active = footprint ? eras.find((e) => e.key === era) : null;
	const litCount = footprint
		? footprint.worlds.filter((row) => row.chapterCount > 0 || row.events.length > 0).length
		: 0;
	const eventCount = footprint
		? new Set(
				footprint.worlds.flatMap((row) => row.events.filter((e) => e.firmness === 'firm').map((e) => e.key))
			).size
		: 0;
	const caption = active
		? `${active.name}: ${litCount} world${litCount === 1 ? '' : 's'} lit, ${eventCount} fixed event${eventCount === 1 ? '' : 's'}.`
		: MAP_LEGEND;

	return (
		<div className="mt-4">
			<StationRow value={era} onChange={onChange} aria-label="Filter the map by era">
				{stations.map((s) => (
					<Station key={s.key === null ? 'all' : s.key} active={s.key === era} onClick={() => onChange(s.key)}>
						{s.name}
					</Station>
				))}
			</StationRow>
			<p className="m-0 mt-3 max-w-[62ch] font-body text-small text-ink-2">{caption}</p>
		</div>
	);
}
