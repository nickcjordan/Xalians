// Loads the lore JSON bundle once and builds the lookup maps every other
// module in src/lore/ works from. No React; plain ES modules.

import encyclopediaData from '@xalians/content/encyclopedia.json';
import chronicleData from '@xalians/content/chronicle.json';
import planetRecordsData from '@xalians/content/planetRecords.json';
import speciesCatalogData from '@xalians/content/canonicalSpeciesCatalog.json';
import registriesData from '@xalians/content/registries.json';
import tourData from '@xalians/content/tour.json';
import narrationData from '@xalians/content/narration.json';
import platesData from '@xalians/content/plates.json';

// ---- entries -------------------------------------------------------------

// encyclopedia.json is the single source for every entry, species included
// (category 'xalians'); canonicalSpeciesCatalog.json carries only the
// mechanical species templates, not encyclopedia entries.
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

// ---- species: the v5 canonical catalog --------------------------------------
// docs/species-templates/v5/<key>.json, bundled into canonicalSpeciesCatalog.json.
// The roster and every species template come from here; the legacy 2022
// species.json is not read by the encyclopedia.

const templateRecords = Object.values(speciesCatalogData);
const speciesList = templateRecords.map((r) => ({
	key: r.key,
	name: r.name,
	element: r.element,
	homePlanet: r.homePlanet,
}));
const speciesByKey = new Map(speciesList.map((s) => [s.key, s]));
const templateRecordsByKey = new Map(templateRecords.map((r) => [r.key, r]));

// ---- registries -------------------------------------------------------------

// Each registry vocabulary is an array of { key, name, nature[, ...] }.
// Build a Map per vocabulary for O(1) lookup by key.
function toMap(list) {
	return new Map((list || []).map((item) => [item.key, item]));
}

const registries = {
	attributes: toMap(registriesData.attributes),
	elements: toMap(registriesData.elements),
	capabilities: toMap(registriesData.capabilities),
	senses: toMap(registriesData.senses),
	anatomy: toMap(registriesData.anatomy),
	channels: toMap(registriesData.channels),
	physiology: Object.fromEntries(
		Object.entries(registriesData.physiology || {}).map(([k, v]) => [k, toMap(v)])
	),
};

// "Instruments" (anatomy or channel used as an ability instrument) resolve
// against anatomy first, then channels; no key is in both vocabularies.
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
	species: speciesList,
	eras: erasInOrder,
});
const aliasToKey = buildAliasMap(allEntries);

// ---- plates -----------------------------------------------------------------

// One painted era plate per part of The Story, keyed by era. platesData.json
// is the source of truth for file names, alt text and captions.
const platesByEra = new Map((platesData.plates || []).map((p) => [p.era, p]));

export {
	encyclopediaData,
	chronicleData,
	planetRecordsData,
	speciesCatalogData,
	registriesData,
	tourData,
	narrationData,
	platesData,
	platesByEra,
	allEntries,
	entriesByKey,
	aliasToKey,
	assertNoAliasCollisions,
	planetsInOrder,
	planetsByKey,
	speciesList,
	speciesByKey,
	templateRecordsByKey,
	registries,
	lookupInstrument,
	erasInOrder,
	erasByKey,
	eventsByKey,
	eventsInOrder,
	chronicleParagraphsByPlanetIndex,
};
