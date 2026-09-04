// getWorldLede(worldKey): the narrator's short placing-lede for a world
// page, from narration.json. A missing world (not yet written, or an
// unknown key) returns undefined -- the page simply renders without a lede.
// Contract: docs/design/xalian-encyclopedia-story-pass.md "Data layer
// (agent A1)".

import { narrationData } from './loaders';
import { getWorld } from './worlds';
import { getEntry } from './entries';

function buildLede(lede) {
	return {
		prose: lede.prose,
		sources: (lede.sources || [])
			.map((source) => {
				const world = getWorld(source.planet);
				if (!world) return null;
				return { world, index: source.paragraph };
			})
			.filter(Boolean),
		entries: (lede.entries || []).map((key) => getEntry(key)).filter(Boolean),
	};
}

const ledesByWorldKey = new Map((narrationData.worlds || []).map((lede) => [lede.key, buildLede(lede)]));

export function getWorldLede(worldKey) {
	return ledesByWorldKey.get(worldKey);
}
