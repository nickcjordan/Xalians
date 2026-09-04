import { describe, it, expect } from 'vitest';
import { getStory, getStoryPart, getEraForBeat, getEntryStory, getTour, routeFor } from '../index';
import { erasInOrder } from '../loaders';

describe('getStory', () => {
	const story = getStory();

	it('has seven parts, in era order', () => {
		expect(story.parts.length).toBe(7);
		story.parts.forEach((part, i) => {
			expect(part.era.key, `part ${i} era`).toBe(erasInOrder[i].key);
			expect(part.order, `part ${i} order`).toBe(i + 1);
		});
	});

	it('every part carries title, opening, sections, worlds, and fixedPoints', () => {
		for (const part of story.parts) {
			expect(part.title, `${part.era.key} title`).toBe(part.era.name);
			expect(typeof part.opening, `${part.era.key} opening`).toBe('string');
			expect(part.opening.length, `${part.era.key} opening non-empty`).toBeGreaterThan(0);
			expect(Array.isArray(part.sections), `${part.era.key} sections`).toBe(true);
			expect(Array.isArray(part.worlds), `${part.era.key} worlds`).toBe(true);
			expect(Array.isArray(part.fixedPoints), `${part.era.key} fixedPoints`).toBe(true);
		}
	});

	it('totalParagraphs is the sum of every section paragraph, and a real positive number', () => {
		const summed = story.parts.reduce(
			(sum, part) => sum + part.sections.reduce((s, section) => s + section.paragraphs.length, 0),
			0
		);
		expect(Number.isFinite(story.totalParagraphs)).toBe(true);
		expect(story.totalParagraphs).toBeGreaterThan(0);
		expect(story.totalParagraphs).toBe(summed);
	});

	it('every part opens with at least one narrator beat, and the opening is the first sentence of the first beat', () => {
		for (const part of story.parts) {
			expect(part.beats.length, `${part.era.key} has a beat`).toBeGreaterThanOrEqual(1);
			expect(part.beats[0].prose.startsWith(part.opening.slice(0, 20)), `${part.era.key} opening comes from its first beat`).toBe(true);
		}
	});

	it('fixedPoints anchors resolve to { world, index, quote }', () => {
		for (const part of story.parts) {
			for (const event of part.fixedPoints) {
				for (const anchor of event.anchors) {
					expect(anchor.world, `${event.key} anchor world`).toBeDefined();
					expect(anchor.world.key, `${event.key} anchor world key`).toBeTruthy();
					expect(typeof anchor.index, `${event.key} anchor index`).toBe('number');
					expect(typeof anchor.quote, `${event.key} anchor quote`).toBe('string');
				}
			}
		}
	});

	it('every world in a part has at least one chapter tagged into that era', () => {
		for (const part of story.parts) {
			const rowKeys = new Set();
			for (const section of part.sections) {
				for (const paragraph of section.paragraphs) rowKeys.add(paragraph.world.key);
			}
			for (const world of part.worlds) {
				expect(rowKeys.has(world.key), `${part.era.key}: world ${world.key} has no story rows`).toBe(true);
			}
		}
	});
});

describe('every beat lands in exactly one part, in tour order', () => {
	it('matches', () => {
		const story = getStory();
		const tour = getTour();

		// Every beat must appear in exactly one part.
		const partsByBeatKey = new Map();
		for (const part of story.parts) {
			for (const beat of part.beats) {
				expect(partsByBeatKey.has(beat.key), `beat ${beat.key} appears in more than one part`).toBe(false);
				partsByBeatKey.set(beat.key, part.era.key);
			}
		}
		for (const beat of tour.beats) {
			expect(partsByBeatKey.has(beat.key), `beat ${beat.key} is missing from every part`).toBe(true);
			expect(partsByBeatKey.get(beat.key), `beat ${beat.key} era`).toBe(beat.era.key);
		}

		// Within a part, beats keep tour order (tour.js already sorts by
		// `order`; the part's beats array must preserve that relative order).
		for (const part of story.parts) {
			const tourOrders = part.beats.map((beat) => tour.beats.findIndex((b) => b.key === beat.key));
			const sorted = [...tourOrders].sort((a, b) => a - b);
			expect(tourOrders, `${part.era.key} beats out of tour order`).toEqual(sorted);
		}
	});
});

describe('getStoryPart', () => {
	it('returns the part plus prev/next era keys', () => {
		const part = getStoryPart('unbirth');
		expect(part).toBeDefined();
		expect(part.era.key).toBe('unbirth');
		expect(part.prev).toBe('ascendancy');
		expect(part.next).toBe('generation');
	});

	it('prev/next chain end to end', () => {
		const keys = erasInOrder.map((e) => e.key);
		keys.forEach((key, i) => {
			const part = getStoryPart(key);
			expect(part, key).toBeDefined();
			expect(part.prev, `${key} prev`).toBe(i > 0 ? keys[i - 1] : null);
			expect(part.next, `${key} next`).toBe(i < keys.length - 1 ? keys[i + 1] : null);
		});
	});

	it('returns undefined for an unknown era key', () => {
		expect(getStoryPart('not-a-real-era')).toBeUndefined();
	});
});

describe('getEraForBeat', () => {
	it('round-trips every beat to its era key', () => {
		const tour = getTour();
		for (const beat of tour.beats) {
			expect(getEraForBeat(beat.key), beat.key).toBe(beat.era.key);
		}
	});

	it('returns undefined for an unknown beat key', () => {
		expect(getEraForBeat('not-a-real-beat')).toBeUndefined();
	});
});

describe('getEntryStory', () => {
	it("apex spans at least three eras in order, with events and excerpts", () => {
		const rows = getEntryStory('apex');
		expect(rows.length).toBeGreaterThanOrEqual(3);

		const eraOrders = rows.map((row) => row.era.order);
		const sorted = [...eraOrders].sort((a, b) => a - b);
		expect(eraOrders, 'eras in order').toEqual(sorted);

		const withBoth = rows.filter((row) => row.events.length > 0 && row.excerpts.length > 0);
		expect(withBoth.length).toBeGreaterThanOrEqual(1);
		const anyEvents = rows.some((row) => row.events.length > 0);
		const anyExcerpts = rows.some((row) => row.excerpts.length > 0);
		expect(anyEvents, 'at least one era has events').toBe(true);
		expect(anyExcerpts, 'at least one era has excerpts').toBe(true);
	});

	it('returns [] for an unknown entry key', () => {
		expect(getEntryStory('not-a-real-entry')).toEqual([]);
	});
});

describe('routeFor new shapes', () => {
	it('era', () => {
		expect(routeFor('era', 'end-wars')).toBe('/encyclopedia/story/end-wars');
	});

	it('story', () => {
		expect(routeFor('story')).toBe('/encyclopedia/story');
	});

	it('tour resolves through the beat\'s era', () => {
		expect(routeFor('tour', 'end-wars')).toBe('/encyclopedia/story/end-wars#beat-end-wars');
	});

	it('tour throws on an unknown beat', () => {
		expect(() => routeFor('tour', 'not-a-real-beat')).toThrow();
	});

	it('event', () => {
		expect(routeFor('event', 'end-wars:battle-of-grimedes')).toBe(
			'/encyclopedia/story/end-wars#event-battle-of-grimedes'
		);
	});
});
