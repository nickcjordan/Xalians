import { describe, it, expect } from 'vitest';
import { getSpecies, getSpeciesList } from '../index';
import speciesCatalog from '@xalians/content/canonicalSpeciesCatalog.json';

describe('SpeciesView', () => {
	it('builds a template view for a ratified species', () => {
		const view = getSpecies('graviclaw');
		expect(view).toBeDefined();
		expect(view.source).toBe('template');
		expect(view.key).toBe('graviclaw');
		expect(view.portrait.svgName).toBe('graviclaw');
		expect(view.record).toBeDefined();
		expect(view.nameOrigin).toContain('gravity');
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

	it('carries no retired v4 fields (traits, archetypes, instruments, corporeality)', () => {
		for (const view of getSpeciesList()) {
			expect(view.record.traits, view.key).toBeUndefined();
			expect(view.record.archetypes, view.key).toBeUndefined();
			expect(view.record.instruments, view.key).toBeUndefined();
			expect(view.record.physiology.corporeality, view.key).toBeUndefined();
		}
	});

	it('resolves every registry key to a display row, so no raw key reaches the page', () => {
		for (const view of getSpeciesList()) {
			const { record } = view;
			const resolved = [
				...record.attributes,
				...record.capabilities,
				...record.senses.graded,
				...record.senses.special,
				...record.physiology.traversal,
				...record.physiology.communication,
				...record.physiology.breathes,
				record.physiology.bodyPlan,
				record.physiology.covering,
				record.physiology.diet,
				record.physiology.lifespan,
			];
			for (const item of resolved) {
				expect(item.nature, `${view.key} ${item.key}`).toBeTruthy();
			}
			for (const part of record.anatomy) {
				expect(part.name, `${view.key} ${part.key}`).not.toBe(part.key);
			}
		}
	});

	it('lists the five temperament axes for every species', () => {
		for (const view of getSpeciesList()) {
			expect(view.record.temperament.map((t) => t.key), view.key).toEqual(['boldness', 'curiosity', 'energy', 'aggression', 'sociability']);
		}
	});

	it('shows the signature first, then every other guaranteed action and passive', () => {
		for (const view of getSpeciesList()) {
			const template = speciesCatalog[Object.keys(speciesCatalog).find((k) => speciesCatalog[k].key === view.key)];
			const { abilities } = view.record;
			expect(abilities.length, view.key).toBe(template.actions.length + template.passives.length);
			expect(abilities[0].signature, view.key).toBe(true);
			expect(abilities[0].key).toBe(template.signature.key);
			expect(abilities.filter((a) => a.signature).length).toBe(1);
		}
	});

	it('resolves conduits and channels to instrument names', () => {
		const view = getSpecies('vespersyn');
		expect(view.record.channels.some((c) => c.key === 'swarm' && c.name !== 'swarm')).toBe(true);
	});

	it('getSpeciesList is sorted by name and covers every ratified species', () => {
		const list = getSpeciesList();
		expect(Object.keys(speciesCatalog).length).toBeGreaterThan(0);
		expect(list.length).toBe(Object.keys(speciesCatalog).length);
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
