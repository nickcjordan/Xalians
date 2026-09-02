// Loads the lore JSON bundle once and builds the lookup maps every other
// module in src/lore/ works from. No React; plain ES modules.

import encyclopediaData from '../json/encyclopedia.json';
import chronicleData from '../json/chronicle.json';
import planetRecordsData from '../json/planetRecords.json';
import speciesData from '../json/species.json';
import speciesRecordsData from '../json/speciesRecords.json';
import registriesData from '../json/registries.json';

// ---- entries -------------------------------------------------------------

// Species encyclopedia entries (speciesRecords.entries) are merged into the
// index at load time under category 'xalians' per §2 of the contract; they
// are not written back into encyclopedia.json until the flip.
const allEntries = [...encyclopediaData.entries, ...speciesRecordsData.entries];

const entriesByKey = new Map(allEntries.map((e) => [e.key, e]));

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

export {
	encyclopediaData,
	chronicleData,
	planetRecordsData,
	speciesData,
	speciesRecordsData,
	registriesData,
	allEntries,
	entriesByKey,
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
