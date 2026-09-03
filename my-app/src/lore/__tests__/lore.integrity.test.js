import { describe, it, expect } from 'vitest';
import { getEntries, getEntry, getWorlds, getSpeciesList } from '../index';
import { chronicleData, registriesData, templateRecordsByKey } from '../loaders';

describe('lore integrity', () => {
	it('every related key resolves', () => {
		const entries = getEntries();
		for (const entry of entries) {
			for (const relatedKey of entry.related || []) {
				expect(getEntry(relatedKey), `${entry.key} -> related ${relatedKey}`).toBeDefined();
			}
		}
	});

	it('every planet entry has an element', () => {
		for (const world of getWorlds()) {
			expect(world.element, world.key).toBeTruthy();
		}
	});

	it('every chronicle paragraph index exists in the planet history', () => {
		const worlds = getWorlds();
		const worldsByKey = new Map(worlds.map((w) => [w.key, w]));
		for (const paragraph of chronicleData.paragraphs) {
			const world = worldsByKey.get(paragraph.planet);
			expect(world, paragraph.planet).toBeDefined();
			expect(
				paragraph.index,
				`${paragraph.planet}:${paragraph.index}`
			).toBeLessThan(world.chapters.length);
		}
	});

	it('every event anchor quote is found verbatim in the planet history', () => {
		const worlds = getWorlds();
		const worldsByKey = new Map(worlds.map((w) => [w.key, w]));
		for (const event of chronicleData.events) {
			for (const anchor of event.anchors) {
				const world = worldsByKey.get(anchor.planet);
				expect(world, `${event.key} anchor planet ${anchor.planet}`).toBeDefined();
				const chapter = world.chapters[anchor.paragraph];
				expect(chapter, `${event.key} anchor paragraph ${anchor.paragraph}`).toBeDefined();
				expect(
					chapter.text.includes(anchor.quote),
					`${event.key}: quote not found verbatim in ${anchor.planet}:${anchor.paragraph}`
				).toBe(true);
			}
		}
	});

	it('every species has a home planet that exists', () => {
		const worlds = new Set(getWorlds().map((w) => w.key));
		for (const species of getSpeciesList()) {
			expect(worlds.has(species.homePlanet), species.key).toBe(true);
		}
	});

	it('every template species key has a legacy species', () => {
		const legacyKeys = new Set(getSpeciesList().map((s) => s.key));
		for (const key of templateRecordsByKey.keys()) {
			expect(legacyKeys.has(key), key).toBe(true);
		}
	});

	it('every registry key referenced by a template exists in registries.json', () => {
		const registryKeySets = {
			attributes: new Set(registriesData.attributes.map((a) => a.key)),
			archetypes: new Set(registriesData.archetypes.map((a) => a.key)),
			traits: new Set(registriesData.traits.map((a) => a.key)),
			capabilities: new Set(registriesData.capabilities.map((a) => a.key)),
			senses: new Set(registriesData.senses.map((a) => a.key)),
		};
		const instrumentKeys = new Set([
			...registriesData.anatomy.map((a) => a.key),
			...registriesData.channels.map((a) => a.key),
		]);
		const physiologyKeySets = Object.fromEntries(
			Object.entries(registriesData.physiology).map(([field, list]) => [
				field,
				new Set(list.map((item) => item.key)),
			])
		);

		for (const record of templateRecordsByKey.values()) {
			for (const key of Object.keys(record.attributes)) {
				expect(registryKeySets.attributes.has(key), `attribute ${key}`).toBe(true);
			}
			for (const key of Object.keys(record.archetypeWeights)) {
				expect(registryKeySets.archetypes.has(key), `archetype ${key}`).toBe(true);
			}
			for (const key of Object.keys(record.traits.pool)) {
				expect(registryKeySets.traits.has(key), `trait ${key}`).toBe(true);
			}
			for (const key of Object.keys(record.physiology.capabilities)) {
				expect(registryKeySets.capabilities.has(key), `capability ${key}`).toBe(true);
			}
			for (const key of Object.keys(record.physiology.senses)) {
				if (key === 'special') continue;
				expect(registryKeySets.senses.has(key), `sense ${key}`).toBe(true);
			}
			for (const key of record.physiology.senses.special || []) {
				expect(registryKeySets.senses.has(key), `special sense ${key}`).toBe(true);
			}
			for (const key of record.instruments) {
				expect(instrumentKeys.has(key), `instrument ${key}`).toBe(true);
			}
			expect(
				instrumentKeys.has(record.signatureAbility.instrument),
				`signature instrument ${record.signatureAbility.instrument}`
			).toBe(true);
			expect(
				registriesData.actions.some((a) => a.key === record.signatureAbility.action),
				`signature action ${record.signatureAbility.action}`
			).toBe(true);

			for (const [field, value] of Object.entries(record.physiology)) {
				if (field === 'composition') {
					expect(physiologyKeySets.composition.has(value.primary), 'composition.primary').toBe(
						true
					);
					if (value.secondary) {
						expect(
							physiologyKeySets.composition.has(value.secondary),
							'composition.secondary'
						).toBe(true);
					}
					continue;
				}
				if (!physiologyKeySets[field]) continue;
				const values = Array.isArray(value) ? value : [value];
				for (const v of values) {
					expect(physiologyKeySets[field].has(v), `physiology.${field} ${v}`).toBe(true);
				}
			}
		}
	});
});

describe('entry index integrity', () => {
	it('has no duplicate entry keys after merging species records', () => {
		const keys = getEntries().map((e) => e.key);
		expect(new Set(keys).size).toBe(keys.length);
	});
	it('every ratified species has a template-backed species view', () => {
		const pending = getSpeciesList().filter((s) => s.source !== 'template').map((s) => s.key);
		expect(pending).toEqual([]);
	});
});
