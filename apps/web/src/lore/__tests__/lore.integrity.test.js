import { AbilityTemplateSchema } from '@xalians/content/schema';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEntries, getEntry, getWorlds, getSpeciesList } from '../index';
import {
	chronicleData,
	encyclopediaData,
	planetRecordsData,
	registriesData,
	speciesData,
	templateRecordsByKey,
} from '../loaders';

// Word-boundary, case-SENSITIVE: catches "Earth" the place but leaves ordinary
// lowercase "earth" (soil) and "rare earth metals" alone, per the #443 ruling
// that Earth does not exist in the Xalia canon.
const EARTH_WORD = /\bEarth\b/;

// Content JSON prose fields scanned for punctuation the copy pass (issue
// #431) removed. Any new field added to the lore bundle should be included
// here so a stray em dash or spaced-hyphen dash cannot slip back in.
function collectProseStrings() {
	const strings = [];
	for (const world of getWorlds()) {
		for (const chapter of world.chapters) {
			strings.push({ text: chapter.text, source: `world:${world.key}:${chapter.index}` });
		}
	}
	for (const entry of getEntries()) {
		if (entry.definition) {
			strings.push({ text: entry.definition, source: `entry:${entry.key}` });
		}
	}
	for (const era of chronicleData.eras) {
		strings.push({ text: era.definition, source: `era:${era.key}` });
	}
	for (const species of getSpeciesList()) {
		if (species.description) {
			strings.push({ text: species.description, source: `species:${species.key}` });
		}
	}
	return strings;
}

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
			for (const ability of record.actions) {
				expect(AbilityTemplateSchema.safeParse(ability).success).toBe(true);
				expect(instrumentKeys.has(ability.instrument)).toBe(true);
			}

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

describe('lore copy conventions (issue #431)', () => {
	it('no em dash anywhere in content JSON prose fields', () => {
		for (const { text, source } of collectProseStrings()) {
			expect(text.includes('—'), source).toBe(false);
		}
	});

	it('no spaced hyphen used as a dash in planet histories', () => {
		for (const world of getWorlds()) {
			for (const chapter of world.chapters) {
				expect(chapter.text.includes(' – '), `world:${world.key}:${chapter.index}`).toBe(false);
				expect(chapter.text.includes(' - '), `world:${world.key}:${chapter.index}`).toBe(false);
			}
		}
	});

	// Case-insensitive, and over every string in the content JSON rather than
	// only the prose fields: the Telypso "Flourescent Mist" terrain label
	// survived the first copy pass because the grep was case sensitive and the
	// label is not prose. A typo guard that only reads paragraphs misses the
	// short data labels a reader sees just as plainly.
	it('none of the known typos appear anywhere in the content data, in any case', () => {
		// Raw imported JSON, not the derived views: those carry cycles
		// (a planet links its native species, which link back to the planet).
		const sources = {
			planetRecords: planetRecordsData,
			chronicle: chronicleData,
			encyclopedia: encyclopediaData,
			speciesRecords: templateRecordsByKey,
		};
		for (const [name, data] of Object.entries(sources)) {
			const raw = JSON.stringify(data).toLowerCase();
			for (const typo of ['flourescent', 'rogueish', 'replate']) {
				expect(raw.includes(typo), `${name} contains "${typo}"`).toBe(false);
			}
		}
	});
});

describe('no Earth in universe (issue #443)', () => {
	it('no content JSON string references Earth', () => {
		// Raw imported JSON, not the derived views: those carry cycles (a planet
		// links its native species, which link back to the planet), same as the
		// typo scan above.
		const sources = {
			planetRecords: planetRecordsData,
			chronicle: chronicleData,
			encyclopedia: encyclopediaData,
			species: speciesData,
			speciesRecords: templateRecordsByKey,
		};
		for (const [name, data] of Object.entries(sources)) {
			const raw = JSON.stringify(data);
			expect(EARTH_WORD.test(raw), `${name} contains "Earth"`).toBe(false);
		}
	});

	it('no source file under apps/web/src (outside __tests__) references Earth', () => {
		const here = path.dirname(fileURLToPath(import.meta.url));
		const srcRoot = path.resolve(here, '..', '..');
		const offenders = [];

		function walk(dir) {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				if (entry.name === '__tests__') continue;
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					walk(full);
					continue;
				}
				if (!/\.(js|jsx|ts|tsx)$/.test(entry.name)) continue;
				const text = fs.readFileSync(full, 'utf8');
				if (EARTH_WORD.test(text)) {
					offenders.push(path.relative(srcRoot, full));
				}
			}
		}

		walk(srcRoot);
		expect(offenders, offenders.join(', ')).toEqual([]);
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
