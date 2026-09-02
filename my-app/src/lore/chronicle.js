// EraView: events (ordered, firm vs contemporaneous preserved) and
// world-by-world paragraphs grouped by era membership (era or alsoEras).

import { erasInOrder, erasByKey, eventsInOrder, planetsInOrder } from './loaders';
import { getEntry } from './entries';
import { getWorld } from './worlds';

function buildEventView(event) {
	return {
		key: event.key,
		title: event.title,
		firmness: event.firmness,
		order: event.order,
		anchors: event.anchors.map((a) => ({
			planet: getWorld(a.planet),
			paragraph: a.paragraph,
			quote: a.quote,
		})),
		planets: event.planets.map((p) => getWorld(p)).filter(Boolean),
		entry: event.entry ? getEntry(event.entry) : undefined,
	};
}

// A chapter (planet history paragraph) belongs to an era view when the era
// is its primary era or is listed in alsoEras. 'natural' paragraphs (no
// chronicle tag) are skipped -- 'natural' is not an era.
function chaptersForEra(planetView, eraKey) {
	return planetView.chapters.filter(
		(chapter) => chapter.era !== 'natural' && (chapter.era === eraKey || chapter.alsoEras.includes(eraKey))
	);
}

function buildWorldGroups(eraKey) {
	const groups = [];
	// Order worlds as in planetRecords.json (planetsInOrder), per contract.
	for (const planet of planetsInOrder) {
		const planetView = getWorld(planet.key);
		const paragraphs = chaptersForEra(planetView, eraKey);
		if (paragraphs.length > 0) {
			groups.push({ planet: planetView, paragraphs });
		}
	}
	return groups;
}

function buildEraView(era) {
	const events = eventsInOrder.filter((e) => e.era === era.key).map(buildEventView);
	return {
		key: era.key,
		name: era.name,
		order: era.order,
		definition: era.definition,
		events,
		worlds: buildWorldGroups(era.key),
	};
}

const eraViewsInOrder = erasInOrder.map(buildEraView);
const eraViewsByKey = new Map(eraViewsInOrder.map((e) => [e.key, e]));

export function getEras() {
	return eraViewsInOrder;
}

export function getEra(key) {
	return eraViewsByKey.get(key);
}

export function getOverview() {
	return eraViewsInOrder.map((era) => ({ era, blurb: era.definition }));
}
