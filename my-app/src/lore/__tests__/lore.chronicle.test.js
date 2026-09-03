import { describe, it, expect } from 'vitest';
import { getEras, getEra, getEventsForEntry, getEraForEntry } from '../index';
import { chronicleData } from '../loaders';

describe('EraView', () => {
	it('eras are ordered', () => {
		const eras = getEras();
		const orders = eras.map((e) => e.order);
		const sorted = [...orders].sort((a, b) => a - b);
		expect(orders).toEqual(sorted);
		expect(eras.length).toBe(7);
	});

	it("an era's world groups contain exactly the paragraphs tagged to it (primary or also)", () => {
		for (const era of getEras()) {
			const expected = chronicleData.paragraphs.filter(
				(p) => p.era !== 'natural' && (p.era === era.key || p.alsoEras.includes(era.key))
			);
			const actual = era.worlds.flatMap((group) =>
				group.paragraphs.map((p) => ({ planet: group.planet.key, index: p.index }))
			);
			expect(actual.length).toBe(expected.length);
			const actualSet = new Set(actual.map((a) => `${a.planet}:${a.index}`));
			for (const p of expected) {
				expect(actualSet.has(`${p.planet}:${p.index}`), `${p.planet}:${p.index}`).toBe(true);
			}
		}
	});

	it('does not include natural-tagged paragraphs in any era', () => {
		for (const era of getEras()) {
			for (const group of era.worlds) {
				for (const paragraph of group.paragraphs) {
					expect(paragraph.era).not.toBe('natural');
				}
			}
		}
	});

	it('firm and contemporaneous event ordering is preserved', () => {
		const era = getEra('deep-past') || getEras()[0];
		const orders = era.events.map((e) => e.order);
		const sorted = [...orders].sort((a, b) => a - b);
		expect(orders).toEqual(sorted);
		for (const event of era.events) {
			expect(['firm', 'era-only']).toContain(event.firmness);
		}
	});

	it('event anchors resolve to PlanetView objects', () => {
		const era = getEras().find((e) => e.events.some((ev) => ev.anchors.length > 0));
		const event = era.events.find((ev) => ev.anchors.length > 0);
		for (const anchor of event.anchors) {
			expect(anchor.planet).toBeDefined();
			expect(anchor.planet.key).toBeTruthy();
		}
	});
});

describe('getEventsForEntry', () => {
	it('battle-of-grimedes resolves to a row in the end-wars era', () => {
		const rows = getEventsForEntry('battle-of-grimedes');
		expect(rows.length).toBeGreaterThan(0);
		for (const row of rows) {
			expect(row.era).toBeDefined();
			expect(row.era.key).toBe('end-wars');
			expect(row.event).toBeDefined();
		}
		const direct = rows.find((r) => r.event.key === 'battle-of-grimedes');
		expect(direct).toBeDefined();
		expect(direct.inferred).toBe(false);
	});

	it('returns [] for an unknown entry key', () => {
		expect(getEventsForEntry('not-a-real-entry')).toEqual([]);
	});

	it('rows are ordered by era order then event order', () => {
		const rows = getEventsForEntry('source-code-606');
		expect(rows.length).toBeGreaterThan(0);
		let lastEraOrder = -Infinity;
		let lastEventOrder = -Infinity;
		for (const row of rows) {
			const eraOrder = row.era ? row.era.order : Infinity;
			expect(eraOrder).toBeGreaterThanOrEqual(lastEraOrder);
			if (eraOrder === lastEraOrder) {
				expect(row.event.order).toBeGreaterThanOrEqual(lastEventOrder);
			}
			lastEraOrder = eraOrder;
			lastEventOrder = row.event.order;
		}
	});

	it('marks inferred events (no entry of their own, title contains the entry title as a whole word)', () => {
		const rows = getEventsForEntry('battle-of-grimedes');
		for (const row of rows) {
			if (row.inferred) {
				const raw = chronicleData.events.find((e) => e.key === row.event.key);
				expect(raw.entry).toBeFalsy();
				expect(raw.title.toLowerCase()).toContain('battle of grimedes');
			}
		}
	});
});

describe('getEraForEntry', () => {
	it('battle-of-grimedes resolves to the end-wars era', () => {
		const era = getEraForEntry('battle-of-grimedes');
		expect(era).toBeDefined();
		expect(era.key).toBe('end-wars');
	});

	it('returns null for an unknown entry key', () => {
		expect(getEraForEntry('not-a-real-entry')).toBeNull();
	});

	it('returns null for a non-history entry', () => {
		expect(getEraForEntry('vallerii')).toBeNull();
	});
});
