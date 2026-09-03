// Planet adapter: builds PlanetView objects (chapters joined with chronicle
// paragraphs, native species, entries that mention the world, the world's own
// encyclopedia entry when one exists).

import { planetsInOrder, planetsByKey, chronicleParagraphsByPlanetIndex, legacySpeciesList, allEntries } from './loaders';
import { getEntry } from './entries';

function findWholeWord(text, title) {
	const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`\\b${escaped}\\b`, 'i');
	return re.test(text);
}

const planetViewCache = new Map();

function buildChapters(planet) {
	return planet.history.map((text, index) => {
		const tag = chronicleParagraphsByPlanetIndex.get(`${planet.key}:${index}`);
		return {
			index,
			text,
			era: tag ? tag.era : 'natural',
			alsoEras: tag ? tag.alsoEras : [],
			events: tag ? tag.events : [],
		};
	});
}

function buildPlanetView(planet) {
	const entry = getEntry(planet.key);
	// Every entry that names this world can be a route from the world page.
	const entries = allEntries.filter(
		(e) => e.key !== planet.key && findWholeWord(e.definition, planet.name)
	);
	// nativeSpecies is filled in by species.js after both modules finish
	// loading (see species.js `_attachNativeSpecies`), which breaks the
	// otherwise-circular worlds<->species dependency at load time.
	return {
		key: planet.key,
		name: planet.name,
		element: planet.element,
		images: planet.images,
		physical: planet.physical,
		report: planet.report,
		chapters: buildChapters(planet),
		nativeSpecies: [],
		entries,
		entry,
	};
}

function getPlanetView(planet) {
	if (!planetViewCache.has(planet.key)) {
		planetViewCache.set(planet.key, buildPlanetView(planet));
	}
	return planetViewCache.get(planet.key);
}

// Force-build every PlanetView once so callers (and _attachNativeSpecies)
// share the same cached objects.
planetsInOrder.forEach(getPlanetView);

export function getWorlds() {
	return planetsInOrder.map(getPlanetView);
}

export function getWorld(key) {
	const planet = planetsByKey.get(key);
	return planet ? getPlanetView(planet) : undefined;
}

// Internal helper used by chronicle.js / entries.js consumers that need the
// raw planet record without the derived view.
export function getRawPlanet(key) {
	return planetsByKey.get(key);
}

// Called once by species.js after it builds the SpeciesView list, to fill in
// PlanetView.nativeSpecies without a circular import at module-load time.
export function _attachNativeSpecies(speciesViews) {
	for (const view of planetViewCache.values()) {
		view.nativeSpecies = speciesViews.filter((s) => s.homePlanet === view.key);
	}
}

export { legacySpeciesList as _legacySpeciesList };
