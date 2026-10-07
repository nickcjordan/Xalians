import type { CreatureRecord } from '@xalians/content/creature';
import { generateXalian, getSpeciesTemplates } from '@xalians/rules/generator/canonicalCreatureRelease';

/**
 * A real v5 creature record for tests and offline rendering: generated from the
 * current species catalog with a fixed seed, so it always matches today's
 * CreatureRecordSchema rather than a checked-in copy that drifts.
 */
export function sampleRecord(species = 'graviclaw', seed = 'sample-record', serial = 1): CreatureRecord {
	const template = getSpeciesTemplates().find((t) => t.key === species);
	if (!template) throw new Error(`Unknown species ${species}`);
	return generateXalian(species, seed, {
		origin: template.homePlanet,
		serial,
		generatedAt: '2026-10-06T00:00:00.000Z',
		profile: 'full',
	});
}
