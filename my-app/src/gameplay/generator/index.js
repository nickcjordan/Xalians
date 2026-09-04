/*
	Generator public API, bound to the bundled data (speciesRecords.json, registries.json,
	abilityCatalog.json, all copied from lambda/src/json by copy-json). Games import from
	here; generate.js itself takes the tables as arguments so it can be tested with
	fixtures and later moved to the Lambda.
*/

import speciesRecords from '../../json/speciesRecords.json';
import registries from '../../json/registries.json';
import catalog from '../../json/abilityCatalog.json';
import { generateXalian as generateWithTables, generateBatch as generateBatchWithTables } from './generate.js';

export { GENERATOR_VERSION, SCHEMA_VERSION } from './constants.js';

const TEMPLATES = Array.isArray(speciesRecords.records) ? speciesRecords.records : [];
const TEMPLATES_BY_KEY = new Map(TEMPLATES.map((t) => [t.key, t]));

export function getSpeciesTemplates() {
	return TEMPLATES;
}

export function getSpeciesTemplate(key) {
	return TEMPLATES_BY_KEY.get(key);
}

// display name for a species key ("graviclaw" -> "Graviclaw"); falls back to the key
export function speciesDisplayName(key) {
	const t = TEMPLATES_BY_KEY.get(key);
	return t ? t.name : key;
}

/*
	generateXalian(speciesKey, seed, options?) -> record
	options: { origin, serial, generatedAt }
*/
export function generateXalian(speciesKey, seed, options = {}) {
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
export function generateBatch(count, seed, options = {}) {
	return generateBatchWithTables({
		templates: options.templates || TEMPLATES,
		seed,
		count,
		registries,
		catalog,
		generatedAt: options.generatedAt,
	});
}
