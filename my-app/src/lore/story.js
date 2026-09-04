// getStory() / getStoryPart() / getEraForBeat(): The Story of Xalia, one
// part per era, composed from chronicle.js (events, era-story paragraphs),
// reader.js (the paragraph-assembler sections) and tour.js (the narrator's
// beats). This module only composes; it does not re-derive era or event
// data of its own. Contract: docs/design/xalian-encyclopedia-story-pass.md
// "Data layer (agent A1)".

import { erasInOrder, planetsInOrder } from './loaders';
import { getEra, getEraStory } from './chronicle';
import { getReaderPart } from './reader';
import { getTour } from './tour';
import { getWorld } from './worlds';

const STORY_TITLE = 'The Story of Xalia';

// beatsByEra: era key -> BeatView[], in tour order (tour.js already sorts
// beats by `order`, so filtering preserves that order).
function buildBeatsByEra() {
	const tour = getTour();
	const map = new Map();
	for (const beat of tour.beats) {
		const eraKey = beat.era ? beat.era.key : undefined;
		if (!eraKey) continue;
		if (!map.has(eraKey)) map.set(eraKey, []);
		map.get(eraKey).push(beat);
	}
	return map;
}

// beatEraByBeatKey: beat key -> era key, for getEraForBeat().
function buildBeatEraIndex(beatsByEra) {
	const map = new Map();
	for (const [eraKey, beats] of beatsByEra) {
		for (const beat of beats) map.set(beat.key, eraKey);
	}
	return map;
}

// First sentence of `prose`: up to and including the first ". "/"! "/"? ",
// or the whole string when no sentence boundary is found.
function firstSentence(prose) {
	const match = /^.*?[.!?](?=\s|$)/.exec(prose.trim());
	return match ? match[0] : prose.trim();
}

// worldsInEra: WorldView[] with at least one chapter tagged into this era
// (primary era or alsoEras), in planet order -- same membership rule as
// EraView's chaptersForEra, applied here through getEraStory's rows so this
// module does not re-implement the era/alsoEras membership test itself.
function worldsInEra(eraKey) {
	const rows = getEraStory(eraKey);
	const present = new Set(rows.map((row) => row.world.key));
	return planetsInOrder.map((p) => getWorld(p.key)).filter((w) => present.has(w.key));
}

// fixedPoints: the era's events, anchors resolved to { world, index, quote }
// -- the same shape EraView's EventCard/ContemporaneousCard render from
// event.anchors (world/planet already a WorldView, index is the paragraph
// number, quote is the anchor's verbatim quote).
function buildFixedPoints(era) {
	return era.events.map((event) => ({
		...event,
		anchors: event.anchors.map((anchor) => ({
			world: anchor.planet,
			index: anchor.paragraph,
			quote: anchor.quote,
		})),
	}));
}

function buildPart(era, order, beatsByEra) {
	const beats = beatsByEra.get(era.key) || [];
	const readerPart = getReaderPart(era.key);
	const sections = readerPart ? readerPart.sections : [];
	const paragraphCount = sections.reduce((sum, section) => sum + section.paragraphs.length, 0);
	const opening = beats.length > 0 ? firstSentence(beats[0].prose) : era.definition;
	return {
		order: order + 1,
		era,
		title: era.name,
		beats,
		opening,
		sections,
		paragraphCount,
		worlds: worldsInEra(era.key),
		fixedPoints: buildFixedPoints(era),
	};
}

const beatsByEra = buildBeatsByEra();
const beatEraByBeatKey = buildBeatEraIndex(beatsByEra);

const partsInOrder = erasInOrder.map((eraStub, index) => buildPart(getEra(eraStub.key), index, beatsByEra));
const partsByEraKey = new Map(partsInOrder.map((part) => [part.era.key, part]));

export function getStory() {
	const totalParagraphs = partsInOrder.reduce((sum, part) => sum + part.paragraphCount, 0);
	return {
		title: STORY_TITLE,
		parts: partsInOrder.map(({ paragraphCount, ...part }) => part),
		totalParagraphs,
	};
}

export function getStoryPart(eraKey) {
	const part = partsByEraKey.get(eraKey);
	if (!part) return undefined;
	const index = partsInOrder.findIndex((p) => p.era.key === eraKey);
	const prev = index > 0 ? partsInOrder[index - 1].era.key : null;
	const next = index < partsInOrder.length - 1 ? partsInOrder[index + 1].era.key : null;
	const { paragraphCount, ...rest } = part;
	return { ...rest, prev, next };
}

export function getEraForBeat(beatKey) {
	return beatEraByBeatKey.get(beatKey);
}
