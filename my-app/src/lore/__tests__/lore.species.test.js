import { describe, it, expect } from 'vitest';
import { getSpecies, getSpeciesList } from '../index';

describe('SpeciesView', () => {
	it('builds a template view for a ratified species', () => {
		const view = getSpecies('graviclaw');
		expect(view).toBeDefined();
		expect(view.source).toBe('template');
		expect(view.key).toBe('graviclaw');
		expect(view.portrait.svgName).toBe('graviclaw');
		expect(view.record).toBeDefined();
		expect(view.legacy).toBeUndefined();
	});

	it('every species now resolves to its ratified template (no legacy views remain)', () => {
		const view = getSpecies('xylum');
		expect(view).toBeDefined();
		expect(view.source).toBe('template');
		expect(view.portrait.svgName).toBe('xylum');
		expect(view.record).toBeDefined();
		expect(view.legacy).toBeUndefined();
	});

	it('drops zero-percent traits and sorts the rest by percent desc', () => {
		const view = getSpecies('graviclaw');
		const percents = view.record.traits.map((t) => t.percent);
		expect(percents.every((p) => p > 0)).toBe(true);
		const sorted = [...percents].sort((a, b) => b - a);
		expect(percents).toEqual(sorted);
	});

	it('resolves registry display names on traits, archetypes, attributes', () => {
		const view = getSpecies('graviclaw');
		for (const trait of view.record.traits) {
			expect(trait.name).toBeTruthy();
			expect(trait.nature).toBeTruthy();
		}
		for (const archetype of view.record.archetypes) {
			expect(archetype.name).toBeTruthy();
			expect(archetype.nature).toBeTruthy();
		}
		for (const attribute of view.record.attributes) {
			expect(attribute.name).toBeTruthy();
			expect(Array.isArray(attribute.band)).toBe(true);
		}
	});

	it('sorts archetypes by weight desc', () => {
		const view = getSpecies('graviclaw');
		const weights = view.record.archetypes.map((a) => a.weight);
		const sorted = [...weights].sort((a, b) => b - a);
		expect(weights).toEqual(sorted);
	});

	it('resolves instrument names from the anatomy/channel registries', () => {
		const view = getSpecies('tetrahive');
		expect(view.record.instruments.length).toBeGreaterThan(0);
		for (const instrument of view.record.instruments) {
			expect(instrument.name).toBeTruthy();
		}
		// "swarm" is a channel, not anatomy -- confirms the combined lookup.
		expect(view.record.instruments.some((i) => i.key === 'swarm')).toBe(true);
	});

	it('getSpeciesList is sorted by name and covers all 29 species', () => {
		const list = getSpeciesList();
		expect(list.length).toBe(29);
		const names = list.map((s) => s.name);
		const sorted = [...names].sort((a, b) => a.localeCompare(b));
		expect(names).toEqual(sorted);
	});

	it('every species has planet resolving to a PlanetView', () => {
		for (const species of getSpeciesList()) {
			expect(species.planet, species.key).toBeDefined();
			expect(species.planet.key).toBe(species.homePlanet);
		}
	});
});
