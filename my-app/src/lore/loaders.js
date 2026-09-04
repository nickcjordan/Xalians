// Loads the lore JSON bundle once and builds the lookup maps every other
// module in src/lore/ works from. No React; plain ES modules.

import encyclopediaData from '../json/encyclopedia.json';
import chronicleData from '../json/chronicle.json';
import planetRecordsData from '../json/planetRecords.json';
import speciesData from '../json/species.json';
import speciesRecordsData from '../json/speciesRecords.json';
import registriesData from '../json/registries.json';
import tourData from '../json/tour.json';

// ---- entries -------------------------------------------------------------

// encyclopedia.json is the single source for every entry, species included
// (category 'xalians'); speciesRecords.json carries only the mechanical
// species template records, not encyclopedia entries.
const allEntries = encyclopediaData.entries;

const entriesByKey = new Map(allEntries.map((e) => [e.key, e]));

// ---- aliases ---------------------------------------------------------------
// An entry may carry an optional `aliases: string[]` -- alternate proper names
// that unambiguously refer to it (e.g. "Kozrak" for the "King Kozrak" entry).
// aliasToKey maps every alias, lowercased, to the entry key it resolves to.
// Built here (not lazily) so a bad data file fails fast at import time rather
// than surfacing as a silent mis-link somewhere downstream.
function buildAliasMap(entries) {
	const map = new Map();
	for (const entry of entries) {
		for (const alias of entry.aliases || []) {
			map.set(alias.toLowerCase(), entry.key);
		}
	}
	return map;
}

// Asserts that no alias collides with any entry title, any other alias, or
// any world/species/era name. A collision means an alias is ambiguous -- it
// could plausibly resolve to more than one record -- which is exactly what
// aliases must never be. Throws with a clear, actionable message rather than
// silently mis-linking prose. Exported so a fixture-driven test can exercise
// it without depending on the shape of the real data.
function assertNoAliasCollisions({ entries, planets, species, eras }) {
	// name (lowercased) -> a human-readable label for the first place it was seen
	const seen = new Map();
	const addName = (name, label) => {
		if (name == null) return;
		const lower = name.toLowerCase();
		if (!seen.has(lower)) seen.set(lower, label);
	};

	for (const entry of entries) addName(entry.title, `entry "${entry.title}" (${entry.key}) title`);
	for (const planet of planets || []) addName(planet.name, `world "${planet.name}"`);
	for (const item of species || []) addName(item.name, `species "${item.name}"`);
	for (const era of eras || []) addName(era.name, `era "${era.name}"`);

	for (const entry of entries) {
		for (const alias of entry.aliases || []) {
			const lower = alias.toLowerCase();
			const existing = seen.get(lower);
			if (existing) {
				throw new Error(
					`Encyclopedia alias collision: "${alias}" on entry "${entry.title}" (${entry.key}) ` +
						`is already claimed by ${existing}. Aliases must unambiguously name a single record -- ` +
						`remove or rename the alias in docs/encyclopedia/encyclopedia.json.`
				);
			}
			seen.set(lower, `entry "${entry.title}" (${entry.key}) alias "${alias}"`);
		}
	}
}

// ---- planets ---------------------------------------------------------------

// planetRecords.json keys are already lowercase planet names; keep file order.
const planetsInOrder = planetRecordsData;
const planetsByKey = new Map(planetsInOrder.map((p) => [p.key, p]));

// ---- species: normalize legacy species.json (capitalized planet/type) -----

function normalizeLegacySpecies(raw) {
	return {
		key: raw.name.toLowerCase(),
		name: raw.name,
		element: raw.type.toLowerCase(),
		homePlanet: raw.planet.toLowerCase(),
		raw,
	};
}

const legacySpeciesList = speciesData.map(normalizeLegacySpecies);
const legacySpeciesByKey = new Map(legacySpeciesList.map((s) => [s.key, s]));

// Template species records, keyed the same way (record.key is already lowercase).
const templateRecordsByKey = new Map(speciesRecordsData.records.map((r) => [r.key, r]));

// ---- registries -------------------------------------------------------------

// Each registry vocabulary is an array of { key, name, nature[, ...] }.
// Build a Map per vocabulary for O(1) lookup by key.
function toMap(list) {
	return new Map((list || []).map((item) => [item.key, item]));
}

const registries = {
	attributes: toMap(registriesData.attributes),
	archetypes: toMap(registriesData.archetypes),
	traits: toMap(registriesData.traits),
	elements: toMap(registriesData.elements),
	capabilities: toMap(registriesData.capabilities),
	senses: toMap(registriesData.senses),
	anatomy: toMap(registriesData.anatomy),
	channels: toMap(registriesData.channels),
	actions: toMap(registriesData.actions),
	physiology: Object.fromEntries(
		Object.entries(registriesData.physiology || {}).map(([k, v]) => [k, toMap(v)])
	),
	instrumentActions: registriesData.instrumentActions || {},
};

// "Instruments" (anatomy or channel used as a signature-ability instrument)
// resolve against anatomy first, then channels (§ ambiguity: instrumentActions
// keys span both vocabularies; see README notes below).
function lookupInstrument(key) {
	return registries.anatomy.get(key) || registries.channels.get(key);
}

// ---- chronicle --------------------------------------------------------------

const erasInOrder = [...chronicleData.eras].sort((a, b) => a.order - b.order);
const erasByKey = new Map(erasInOrder.map((e) => [e.key, e]));

const eventsByKey = new Map(chronicleData.events.map((e) => [e.key, e]));
const eventsInOrder = [...chronicleData.events].sort((a, b) => a.order - b.order);

// paragraphs keyed by `${planet}:${index}`
const chronicleParagraphsByPlanetIndex = new Map(
	chronicleData.paragraphs.map((p) => [`${p.planet}:${p.index}`, p])
);

// Validate aliases against the full name surface now that every source list
// (entries, worlds, species, eras) is loaded, then build the lookup map.
assertNoAliasCollisions({
	entries: allEntries,
	planets: planetsInOrder,
	species: legacySpeciesList,
	eras: erasInOrder,
});
const aliasToKey = buildAliasMap(allEntries);

export {
	encyclopediaData,
	chronicleData,
	planetRecordsData,
	speciesData,
	speciesRecordsData,
	registriesData,
	tourData,
	allEntries,
	entriesByKey,
	aliasToKey,
	assertNoAliasCollisions,
	planetsInOrder,
	planetsByKey,
	legacySpeciesList,
	legacySpeciesByKey,
	templateRecordsByKey,
	registries,
	lookupInstrument,
	erasInOrder,
	erasByKey,
	eventsByKey,
	eventsInOrder,
	chronicleParagraphsByPlanetIndex,
};
