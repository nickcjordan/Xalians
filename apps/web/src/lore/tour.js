// getTour(): the guided-tour beats (First Survey) resolved from tour.json.
// Unknown era/world/entry keys are skipped silently -- the beat itself is
// always kept even if some of its references cannot be resolved.

import { tourData } from './loaders';
import { getEra } from './chronicle';
import { getWorld } from './worlds';
import { getEntry } from './entries';

function buildBeat(beat) {
	return {
		key: beat.key,
		order: beat.order,
		title: beat.title,
		era: getEra(beat.era),
		worlds: (beat.worlds || []).map((key) => getWorld(key)).filter(Boolean),
		entries: (beat.entries || []).map((key) => getEntry(key)).filter(Boolean),
		prose: beat.prose,
	};
}

const beats = [...(tourData.beats || [])].sort((a, b) => a.order - b.order).map(buildBeat);

export function getTour() {
	return {
		title: tourData.title,
		note: tourData.note,
		beats,
	};
}
