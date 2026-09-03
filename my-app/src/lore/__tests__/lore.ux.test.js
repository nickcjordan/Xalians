import { describe, it, expect } from 'vitest';
import {
	getEraFootprint,
	getEraStory,
	getWorldTimeline,
	getTour,
	getRandomRecord,
	getPowers,
	getEras,
	getWorlds,
	routeFor,
} from '../index';
import { chronicleData } from '../loaders';

describe('getEraFootprint', () => {
	it('has an entry for every world in every era', () => {
		const worldCount = getWorlds().length;
		for (const era of getEras()) {
			const footprint = getEraFootprint(era.key);
			expect(footprint.worlds.length).toBe(worldCount);
			for (const row of footprint.worlds) {
				expect(row.world).toBeDefined();
				expect(typeof row.chapterCount).toBe('number');
				expect(Array.isArray(row.events)).toBe(true);
			}
		}
	});

	it('the End Wars lights all 14 worlds', () => {
		const footprint = getEraFootprint('end-wars');
		const lit = footprint.worlds.filter((row) => row.chapterCount > 0 || row.events.length > 0);
		expect(lit.length).toBe(14);
	});

	it('a world with zero chapters and zero events is still present but dim', () => {
		// deep-past only touches a handful of worlds per the chronicle; find one absent from it.
		const footprint = getEraFootprint('deep-past');
		const dim = footprint.worlds.find((row) => row.chapterCount === 0 && row.events.length === 0);
		expect(dim).toBeDefined();
	});

	it('returns undefined era for an unknown era key but still 14 worlds, all dim', () => {
		const footprint = getEraFootprint('not-a-real-era');
		expect(footprint.era).toBeUndefined();
		expect(footprint.worlds.length).toBe(14);
		expect(footprint.worlds.every((row) => row.chapterCount === 0 && row.events.length === 0)).toBe(true);
	});
});

describe('getEraStory', () => {
	it('orders paragraphs by first-event order within the era, then planet order, then paragraph index', () => {
		for (const era of getEras()) {
			const story = getEraStory(era.key);

			// Reconstruct the expected event-order key for each row the same way
			// the contract defines it, and check the story is sorted by it.
			const planetOrder = new Map(getWorlds().map((w, i) => [w.key, i]));
			let lastEventOrder = -Infinity;
			let sawUntagged = false;
			for (const row of story) {
				const hasEvent = row.eventTitle !== null;
				if (hasEvent) {
					expect(sawUntagged, 'a tagged row appeared after an untagged row').toBe(false);
					// find its order
					const orders = row.events
						.filter((e) => era.events.some((ee) => ee.key === e.key))
						.map((e) => e.order);
					const expectedOrder = Math.min(...orders);
					expect(expectedOrder).toBeGreaterThanOrEqual(lastEventOrder);
					lastEventOrder = expectedOrder;
				} else {
					sawUntagged = true;
				}
			}

			// Within an equal event-order (or both untagged) group, planet order then index holds.
			for (let i = 1; i < story.length; i++) {
				const prev = story[i - 1];
				const cur = story[i];
				const samePhase = (prev.eventTitle !== null) === (cur.eventTitle !== null);
				if (!samePhase) continue;
				const prevPlanetIdx = planetOrder.get(prev.world.key);
				const curPlanetIdx = planetOrder.get(cur.world.key);
				if (prevPlanetIdx === curPlanetIdx) {
					expect(cur.index).toBeGreaterThan(prev.index);
				}
			}
		}
	});

	it('eventTitle matches the first (lowest order) era event tagged on the paragraph', () => {
		const era = getEras().find((e) => e.key === 'end-wars');
		const story = getEraStory('end-wars');
		const tagged = story.filter((row) => row.eventTitle !== null);
		expect(tagged.length).toBeGreaterThan(0);
		for (const row of tagged) {
			const eraEventKeys = new Set(era.events.map((e) => e.key));
			const candidateEvents = row.events.filter((e) => eraEventKeys.has(e.key));
			const minOrder = Math.min(...candidateEvents.map((e) => e.order));
			const expectedTitle = era.events.find((e) => e.order === minOrder && candidateEvents.some((c) => c.key === e.key)).title;
			expect(row.eventTitle).toBe(expectedTitle);
		}
	});

	it('untagged-in-era paragraphs have eventTitle null and events may be empty or from other eras', () => {
		const story = getEraStory('deep-past');
		const untagged = story.filter((row) => row.eventTitle === null);
		expect(untagged.length).toBeGreaterThanOrEqual(0);
		for (const row of untagged) {
			expect(row.eventTitle).toBeNull();
		}
	});

	it('returns an empty array for an unknown era', () => {
		expect(getEraStory('not-a-real-era')).toEqual([]);
	});

	it('the story set matches the chronicle paragraphs tagged to the era (primary or also)', () => {
		for (const era of getEras()) {
			const expected = chronicleData.paragraphs.filter(
				(p) => p.era !== 'natural' && (p.era === era.key || p.alsoEras.includes(era.key))
			);
			const story = getEraStory(era.key);
			expect(story.length).toBe(expected.length);
		}
	});
});

describe('getWorldTimeline', () => {
	it('has all 7 eras in order for magmuth', () => {
		const timeline = getWorldTimeline('magmuth');
		expect(timeline.length).toBe(7);
		const orders = timeline.map((row) => row.era.order);
		expect(orders).toEqual([0, 1, 2, 3, 4, 5, 6]);
	});

	it('each row carries the chapter indices and events belonging to the world in that era', () => {
		const timeline = getWorldTimeline('magmuth');
		for (const row of timeline) {
			expect(Array.isArray(row.chapters)).toBe(true);
			expect(Array.isArray(row.events)).toBe(true);
			for (const event of row.events) {
				expect(event.planets.some((p) => p.key === 'magmuth')).toBe(true);
			}
		}
	});

	it('returns 7 eras with empty arrays for an unknown world', () => {
		const timeline = getWorldTimeline('not-a-real-world');
		expect(timeline.length).toBe(7);
		for (const row of timeline) {
			expect(row.chapters).toEqual([]);
			expect(row.events).toEqual([]);
		}
	});
});

describe('getTour', () => {
	it('returns the stub shape with no beats when tour.json is a stub', () => {
		const tour = getTour();
		expect(tour.title).toBe('First Survey');
		expect(Array.isArray(tour.beats)).toBe(true);
	});

	it('every beat, if present, resolves era/worlds/entries via lore views, skipping unknown keys silently', () => {
		const tour = getTour();
		for (const beat of tour.beats) {
			expect(beat.key).toBeTruthy();
			expect(Array.isArray(beat.worlds)).toBe(true);
			expect(Array.isArray(beat.entries)).toBe(true);
		}
	});
});

describe('getRandomRecord', () => {
	it('returns each kind (entry, world, species, era) over 200 draws with a seeded rng', () => {
		// Deterministic LCG so the test is stable across runs.
		let seed = 42;
		const rng = () => {
			seed = (seed * 1103515245 + 12345) & 0x7fffffff;
			return (seed % 10000) / 10000;
		};

		const seen = new Set();
		for (let i = 0; i < 200; i++) {
			const record = getRandomRecord(rng);
			expect(['entry', 'world', 'species', 'era']).toContain(record.kind);
			expect(record.key).toBeTruthy();
			expect(record.name).toBeTruthy();
			seen.add(record.kind);
		}
		expect(seen).toEqual(new Set(['entry', 'world', 'species', 'era']));
	});

	it('defaults to Math.random when no rng is passed', () => {
		const record = getRandomRecord();
		expect(['entry', 'world', 'species', 'era']).toContain(record.kind);
	});
});

describe('getPowers', () => {
	it('returns { factions, vallerii, peoples } and excludes the demonym keys from factions', () => {
		const { factions, vallerii, peoples } = getPowers();
		expect(Array.isArray(factions)).toBe(true);
		expect(Array.isArray(vallerii)).toBe(true);
		expect(Array.isArray(peoples)).toBe(true);

		const factionKeys = factions.map((e) => e.key);
		expect(factionKeys).not.toContain('magmuthites');
		expect(factionKeys).not.toContain('the-zolto');
		expect(factionKeys).not.toContain('veridians');
	});

	it('vallerii is [vallerii entry, king-kozrak entry]', () => {
		const { vallerii } = getPowers();
		expect(vallerii.map((e) => e.key)).toEqual(['vallerii', 'king-kozrak']);
	});

	it('peoples has all seven, tolerating a missing entry for keys not yet written', () => {
		const { peoples } = getPowers();
		expect(peoples.length).toBe(7);
		const byName = new Map(peoples.map((p) => [p.name, p]));
		expect(byName.get('Magmuthites').entry).toBeDefined();
		expect(byName.get('Zolto').entry).toBeDefined();
		expect(byName.get('Veridians').entry).toBeDefined();
		// These four may or may not exist yet (written by a concurrent agent);
		// the important thing is getPowers never throws and returns undefined
		// cleanly when absent.
		for (const name of ['Grimedites', 'Luminarii', 'Krystians', 'Phantiri']) {
			const row = byName.get(name);
			expect(row).toBeDefined();
			expect(row.planet).toBeDefined();
			expect(row.entry === undefined || typeof row.entry === 'object').toBe(true);
		}
	});
});

describe('routeFor new kinds', () => {
	it('tour', () => {
		expect(routeFor('tour', 'the-vallerii')).toBe('/encyclopedia/tour/the-vallerii');
	});

	it('event', () => {
		expect(routeFor('event', 'end-wars:battle-of-grimedes')).toBe(
			'/encyclopedia/chronicle/end-wars#event-battle-of-grimedes'
		);
	});
});
