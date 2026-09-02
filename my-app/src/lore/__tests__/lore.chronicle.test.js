import { describe, it, expect } from 'vitest';
import { getEras, getEra } from '../index';
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
