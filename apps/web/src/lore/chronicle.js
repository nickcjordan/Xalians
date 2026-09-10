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

// getEraFootprint: every world in planet order, including worlds with zero
// chapters and zero events, so callers can dim them. A world is "in" the
// era when chapterCount > 0 or events.length > 0.
export function getEraFootprint(eraKey) {
	const era = getEra(eraKey);
	const worlds = planetsInOrder.map((planet) => {
		const planetView = getWorld(planet.key);
		const chapterCount = chaptersForEra(planetView, eraKey).length;
		const events = era
			? era.events
					.filter((event) => event.planets.some((p) => p.key === planet.key))
					.map((event) => ({ key: event.key, title: event.title, firmness: event.firmness }))
			: [];
		return { world: planetView, chapterCount, events };
	});
	return { era, worlds };
}

// getEraStory: paragraphs in the era, ordered by the order value of the
// first event of this era they are tagged with, then planet order, then
// paragraph index. Paragraphs with no event in this era trail after,
// ordered by planet order then index. eventTitle is that first event's
// title, or null.
export function getEraStory(eraKey) {
	const era = getEra(eraKey);
	if (!era) return [];

	const eventOrderByKey = new Map(era.events.map((e) => [e.key, e]));

	const rows = [];
	planetsInOrder.forEach((planet, planetIndex) => {
		const planetView = getWorld(planet.key);
		const chapters = chaptersForEra(planetView, eraKey);
		for (const chapter of chapters) {
			// Find the first (lowest-order) event tagged on this chapter that
			// belongs to this era.
			let firstEvent;
			for (const eventKey of chapter.events) {
				const event = eventOrderByKey.get(eventKey);
				if (event && (!firstEvent || event.order < firstEvent.order)) {
					firstEvent = event;
				}
			}
			rows.push({
				world: planetView,
				index: chapter.index,
				text: chapter.text,
				events: chapter.events.map((k) => eventOrderByKey.get(k)).filter(Boolean),
				eventTitle: firstEvent ? firstEvent.title : null,
				_eventOrder: firstEvent ? firstEvent.order : null,
				_planetIndex: planetIndex,
			});
		}
	});

	rows.sort((a, b) => {
		const aHasEvent = a._eventOrder !== null;
		const bHasEvent = b._eventOrder !== null;
		if (aHasEvent && bHasEvent) {
			if (a._eventOrder !== b._eventOrder) return a._eventOrder - b._eventOrder;
		} else if (aHasEvent !== bHasEvent) {
			// Tagged-with-event rows come before untagged rows.
			return aHasEvent ? -1 : 1;
		}
		if (a._planetIndex !== b._planetIndex) return a._planetIndex - b._planetIndex;
		return a.index - b.index;
	});

	return rows.map(({ _eventOrder, _planetIndex, ...row }) => row);
}

// Whole-word, case-insensitive test for `title` inside `text`.
function findWholeWord(text, title) {
	const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`\\b${escaped}\\b`, 'i');
	return re.test(text);
}

// getEventsForEntry: every chronicle event whose `entry` equals entryKey,
// plus (for events with no `entry` of their own) events whose title contains
// the entry's title as a whole word -- those are marked inferred: true.
// Returned in era order then event order. [] for unknown keys.
export function getEventsForEntry(entryKey) {
	const entry = getEntry(entryKey);
	if (!entry) return [];

	const direct = eventsInOrder.filter((e) => e.entry === entryKey);
	const inferred = eventsInOrder.filter((e) => !e.entry && findWholeWord(e.title, entry.title));

	const rows = [
		...direct.map((event) => ({ event: buildEventView(event), inferred: false, _order: event })),
		...inferred.map((event) => ({ event: buildEventView(event), inferred: true, _order: event })),
	];

	const eraOrderByKey = new Map(erasInOrder.map((e) => [e.key, e.order]));
	rows.sort((a, b) => {
		const eraA = eraOrderByKey.get(a._order.era) ?? Infinity;
		const eraB = eraOrderByKey.get(b._order.era) ?? Infinity;
		if (eraA !== eraB) return eraA - eraB;
		return a._order.order - b._order.order;
	});

	return rows.map(({ event, inferred: isInferred, _order }) => ({
		event,
		era: getEra(_order.era),
		inferred: isInferred,
	}));
}

// getEraForEntry: for category 'history' entries, the era of their first
// (lowest era-order then event-order) event. null otherwise / unknown.
export function getEraForEntry(entryKey) {
	const entry = getEntry(entryKey);
	if (!entry || entry.category !== 'history') return null;
	const rows = getEventsForEntry(entryKey);
	if (rows.length === 0) return null;
	return rows[0].era || null;
}

// getEntryStory: the entry's whole reading through the Chronicle, era by
// era in era order -- events from getEventsForEntry filtered to that era,
// and excerpts (the era-story paragraphs, in getEraStory order) that name
// the entry by title or alias, whole word, case-insensitive (the same match
// getAppearances uses for history paragraphs, extended to aliases). Only
// eras with at least one event or excerpt are included. [] for unknown keys.
export function getEntryStory(entryKey) {
	const entry = getEntry(entryKey);
	if (!entry) return [];

	const names = [entry.title, ...(entry.aliases || [])];
	const eventsByEraKey = new Map();
	for (const { event, era, inferred } of getEventsForEntry(entryKey)) {
		if (!era) continue;
		// A title match that states the entry's absence ("never touched by
		// APEX", "not seen ... by APEX") is not part of the entry's story.
		if (inferred && /(never|not|no)/i.test(event.title)) continue;
		if (!eventsByEraKey.has(era.key)) eventsByEraKey.set(era.key, []);
		eventsByEraKey.get(era.key).push({ event, inferred });
	}

	const result = [];
	// A paragraph tagged with a second era (alsoEras) would otherwise read
	// twice on the entry page; it belongs to the first era it appears in.
	const seen = new Set();
	for (const eraStub of erasInOrder) {
		const era = getEra(eraStub.key);
		const events = eventsByEraKey.get(era.key) || [];
		const excerpts = getEraStory(era.key)
			.filter((row) => names.some((name) => findWholeWord(row.text, name)))
			.filter((row) => {
				const id = `${row.world.key}:${row.index}`;
				if (seen.has(id)) return false;
				seen.add(id);
				return true;
			})
			.map((row) => ({ world: row.world, index: row.index, text: row.text }));
		if (events.length === 0 && excerpts.length === 0) continue;
		result.push({ era, events, excerpts });
	}
	return result;
}

// getWorldTimeline: all seven eras in order, with the chapter indices and
// events belonging to the world in each era. Empty arrays where the world
// is absent from that era.
export function getWorldTimeline(worldKey) {
	const planetView = getWorld(worldKey);
	return eraViewsInOrder.map((era) => {
		const chapters = planetView ? chaptersForEra(planetView, era.key) : [];
		const events = planetView ? era.events.filter((event) => event.planets.some((p) => p.key === worldKey)) : [];
		return {
			era,
			chapters: chapters.map((c) => c.index),
			events,
		};
	});
}
