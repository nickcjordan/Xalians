/*
	Generator public API, bound to the bundled data (speciesRecords.json, registries.json,
	abilityCatalog.json, all read from the @xalians/content workspace package). Games
	import from here; generate.ts itself takes the tables as arguments so it can be
	tested with fixtures and later moved to the Lambda.
*/

import speciesRecordsJson from '@xalians/content/speciesRecords.json';
import registriesJson from '@xalians/content/registries.json';
import catalogJson from '@xalians/content/abilityCatalog.json';
import { SpeciesRecordsBundleSchema } from '@xalians/content/schema';
import { generateXalian as generateWithTables, generateBatch as generateBatchWithTables } from './generate.ts';
import type { AbilityCatalog, GenerateBatchOptions, GenerateOptions, Registries, SpeciesTemplate, XalianRecord } from './types.ts';

export { GENERATOR_VERSION, SCHEMA_VERSION } from './constants.ts';
export type * from './types.ts';

// speciesRecords.json is parsed through the schema (not cast) so a bundle that violates
// the ratified record shape fails loudly at import time rather than producing garbage
// records; measured at ~8ms for the 30-species bundle, well under the cost of skipping
// it. registries.json and abilityCatalog.json stay a cast at the boundary: the ability
// catalog is validated structurally by packages/content's own test suite rather than
// per-entry (see abilityCatalog.ts), and registries.json is internal plumbing the
// generator only reads a few fields of.
const speciesRecords = SpeciesRecordsBundleSchema.parse(speciesRecordsJson);
const registries = registriesJson as unknown as Registries;
const catalog = catalogJson as unknown as AbilityCatalog;

const TEMPLATES: SpeciesTemplate[] = Array.isArray(speciesRecords.records) ? speciesRecords.records : [];
const TEMPLATES_BY_KEY = new Map(TEMPLATES.map((t) => [t.key, t]));

export function getSpeciesTemplates(): SpeciesTemplate[] {
	return TEMPLATES;
}

export function getSpeciesTemplate(key: string): SpeciesTemplate | undefined {
	return TEMPLATES_BY_KEY.get(key);
}

// display name for a species key ("graviclaw" -> "Graviclaw"); falls back to the key
export function speciesDisplayName(key: string): string {
	const t = TEMPLATES_BY_KEY.get(key);
	return t ? t.name : key;
}

/*
	generateXalian(speciesKey, seed, options?) -> record
	options: { origin, serial, generatedAt }
*/
export function generateXalian(speciesKey: string | SpeciesTemplate, seed: string | number, options: GenerateOptions = {}): XalianRecord {
	const template = typeof speciesKey === 'string' ? TEMPLATES_BY_KEY.get(speciesKey) : speciesKey;
	if (!template) {
		throw new Error(`generateXalian: unknown species "${speciesKey}"`);
	}
	return generateWithTables({ template, seed, registries, catalog, ...options });
}

/*
	generateBatch(count, seed, options?) -> records across every ratified species
	options: { templates (subset), generatedAt }
*/
export function generateBatch(count: number, seed: string | number, options: GenerateBatchOptions = {}): XalianRecord[] {
	return generateBatchWithTables({
		templates: options.templates || TEMPLATES,
		seed,
		count,
		registries,
		catalog,
		generatedAt: options.generatedAt,
	});
}
