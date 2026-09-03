import { describe, test, expect } from 'vitest';
import { generateXalian, generateBatch, getSpeciesTemplates, speciesDisplayName, GENERATOR_VERSION } from '../index.js';
import registries from '../../../json/registries.json';
import catalog from '../../../json/abilityCatalog.json';
import { ELEMENT_ADJACENCY, CONDUIT_ACTIONS_BY_MEDIUM, TRAIT_EXCLUSIONS } from '../constants.js';

/*
	Contracts from docs/design/xalian-creature-data-structure.md section 3 and the
	generation pipeline in docs/design/xalian-creature-system-redesign.md section 9,
	checked against every ratified species.
*/

const TEMPLATES = getSpeciesTemplates();
const FIXED_TIME = '2026-09-03T00:00:00Z';
const ATTRIBUTES = ['strength', 'vitality', 'endurance', 'agility', 'reflex', 'intelligence', 'willpower', 'instinct', 'charisma', 'resilience'];

function allNames() {
	const names = new Set();
	Object.values(catalog.elements).forEach((cells) => Object.values(cells).forEach((list) => list.forEach((e) => names.add((Array.isArray(e) ? e[0] : e).toLowerCase()))));
	Object.values(catalog.neutral).forEach((list) => list.forEach((e) => names.add((Array.isArray(e) ? e[0] : e).toLowerCase())));
	return names;
}

describe('generator: determinism and provenance', () => {
	test('same seed, same species, same record', () => {
		const a = generateXalian('graviclaw', 'seed-1', { generatedAt: FIXED_TIME });
		const b = generateXalian('graviclaw', 'seed-1', { generatedAt: FIXED_TIME });
		expect(a).toEqual(b);
	});

	test('different seeds differ', () => {
		const a = generateXalian('graviclaw', 'seed-1', { generatedAt: FIXED_TIME });
		const b = generateXalian('graviclaw', 'seed-2', { generatedAt: FIXED_TIME });
		expect(a.id).not.toBe(b.id);
		expect(a.attributes).not.toEqual(b.attributes);
	});

	test('provenance pins the generator version and the origin', () => {
		const r = generateXalian('neph', 'x', { generatedAt: FIXED_TIME, serial: 7 });
		expect(r.provenance.generatorVersion).toBe(GENERATOR_VERSION);
		expect(r.provenance.origin).toBe('saiphus');
		expect(r.provenance.serial).toBe(7);
		expect(r.provenance.seed).toBe('x');
		expect(r.id).toMatch(/^xal_[0-9a-f]{20}$/);
	});

	test('unknown species throws', () => {
		expect(() => generateXalian('nothing', 'x')).toThrow(/unknown species/);
	});

	test('display name comes from the template', () => {
		expect(speciesDisplayName('graviclaw')).toBe('Graviclaw');
		expect(speciesDisplayName('unknown-thing')).toBe('unknown-thing');
	});
});

describe('generator: every ratified species honors the record contract', () => {
	const batch = generateBatch(TEMPLATES.length * 8, 'contract-seed', { generatedAt: FIXED_TIME });
	const templateByKey = new Map(TEMPLATES.map((t) => [t.key, t]));
	const names = allNames();

	test('29 species, each generated', () => {
		expect(TEMPLATES.length).toBe(29);
		expect(new Set(batch.map((r) => r.species)).size).toBe(29);
	});

	test('attributes are all ten, inside the species band', () => {
		batch.forEach((r) => {
			const t = templateByKey.get(r.species);
			ATTRIBUTES.forEach((k) => {
				expect(typeof r.attributes[k]).toBe('number');
				expect(r.attributes[k]).toBeGreaterThanOrEqual(Math.min(...t.attributes[k]));
				expect(r.attributes[k]).toBeLessThanOrEqual(Math.max(...t.attributes[k]));
			});
		});
	});

	test('archetype is one the species weights, with the registry favors', () => {
		batch.forEach((r) => {
			const t = templateByKey.get(r.species);
			expect(Object.keys(t.archetypeWeights)).toContain(r.archetype.key);
			const row = registries.archetypes.find((a) => a.key === r.archetype.key);
			expect(r.archetype.favors).toEqual(row.favors);
		});
	});

	test('element primary at 100; any secondary is on the adjacency graph, graded 1 to 99', () => {
		batch.forEach((r) => {
			const t = templateByKey.get(r.species);
			expect(r.element.primary).toBe(t.element);
			expect(r.element.affinities[t.element]).toBe(100);
			Object.entries(r.element.affinities).forEach(([el, grade]) => {
				if (el === t.element) {
					return;
				}
				expect(ELEMENT_ADJACENCY[t.element]).toContain(el);
				expect(grade).toBeGreaterThanOrEqual(1);
				expect(grade).toBeLessThanOrEqual(99);
			});
			expect(Object.keys(r.element.affinities).length).toBeLessThanOrEqual(2);
		});
	});

	test('traits are a flat array drawn from the species pool; 100s always land; exclusions hold', () => {
		batch.forEach((r) => {
			const t = templateByKey.get(r.species);
			expect(Array.isArray(r.traits)).toBe(true);
			r.traits.forEach((k) => {
				expect(Object.keys(t.traits.pool).concat(['phasing'])).toContain(k);
			});
			Object.entries(t.traits.pool).forEach(([k, pct]) => {
				if (pct >= 100) {
					expect(r.traits).toContain(k);
				}
			});
			TRAIT_EXCLUSIONS.forEach(([a, b]) => {
				expect(r.traits.includes(a) && r.traits.includes(b)).toBe(false);
			});
			expect(new Set(r.traits).size).toBe(r.traits.length);
		});
	});

	test('a non-corporeal body phases', () => {
		batch.filter((r) => r.physiology.corporeality === 'non-corporeal').forEach((r) => {
			expect(r.traits).toContain('phasing');
		});
	});

	test('physiology: universal dimensions present, size inside bands, breathes within ambient media', () => {
		batch.forEach((r) => {
			const t = templateByKey.get(r.species);
			const p = r.physiology;
			['corporeality', 'composition', 'bodyPlan', 'anatomy', 'covering', 'heightCm', 'weightKg', 'lifespan', 'genome', 'diet', 'communication', 'breathes', 'environmentalTolerance', 'capabilities', 'senses'].forEach((k) => {
				expect(p[k]).toBeDefined();
			});
			expect(p.heightCm).toBeGreaterThanOrEqual(t.physiology.size.heightCm[0]);
			expect(p.heightCm).toBeLessThanOrEqual(t.physiology.size.heightCm[1]);
			expect(p.weightKg).toBeGreaterThanOrEqual(t.physiology.size.weightKg[0]);
			expect(p.weightKg).toBeLessThanOrEqual(t.physiology.size.weightKg[1]);
			p.breathes.forEach((m) => expect(p.environmentalTolerance.ambientMedia).toContain(m));
			['flight', 'swim', 'burrow', 'climb', 'sprint', 'leap', 'manipulation'].forEach((k) => {
				expect(p.capabilities[k]).toBeGreaterThanOrEqual(0);
				expect(p.capabilities[k]).toBeLessThanOrEqual(100);
			});
			expect(['levo', 'dextro', 'achiral']).toContain(p.genome.chirality);
			expect(p.environmentalTolerance.temperatureC).toEqual(t.physiology.environmentalTolerance.temperatureC);
		});
	});

	test('abilities: signature first, then 2 or 3 rolled; intensities 1 to 100; names unique per creature', () => {
		batch.forEach((r) => {
			const t = templateByKey.get(r.species);
			expect(r.abilities.length).toBeGreaterThanOrEqual(3);
			expect(r.abilities.length).toBeLessThanOrEqual(4);
			const sig = r.abilities[0];
			expect(sig.signature).toBe(true);
			expect(sig.name).toBe(t.signatureAbility.name);
			expect(sig.instrument).toBe(t.signatureAbility.instrument);
			expect(sig.action).toBe(t.signatureAbility.action);
			expect(sig.medium).toBe(t.signatureAbility.medium);
			expect(sig.description).toBe(t.signatureAbility.description);
			expect(r.abilities.filter((a) => a.signature).length).toBe(1);
			r.abilities.forEach((a) => {
				expect(a.intensity).toBeGreaterThanOrEqual(1);
				expect(a.intensity).toBeLessThanOrEqual(100);
			});
			expect(new Set(r.abilities.map((a) => a.name.toLowerCase())).size).toBe(r.abilities.length);
		});
	});

	test('rolled abilities: instrument from the species, action allowed for that instrument (or its conduit), medium covered, name from the catalog', () => {
		batch.forEach((r) => {
			const t = templateByKey.get(r.species);
			r.abilities.filter((a) => !a.signature).forEach((a) => {
				expect(t.instruments).toContain(a.instrument);
				expect(Object.keys(r.element.affinities)).toContain(a.medium);
				const row = registries.instrumentActions[a.instrument] || [];
				const conduit = t.conduits && t.conduits[a.instrument] === a.medium ? CONDUIT_ACTIONS_BY_MEDIUM[a.medium] : [];
				expect([...row, ...conduit]).toContain(a.action);
				expect(names.has(a.name.toLowerCase())).toBe(true);
			});
		});
	});

	test('tagged catalog names only go to instruments they name', () => {
		// a name is checked against the cell it was drawn from (the medium's cell for the
		// action, else the neutral pool); the same string may carry different tags elsewhere
		const findEntry = (list, name) => (list || []).find((e) => (Array.isArray(e) ? e[0] : e).toLowerCase() === name);
		batch.forEach((r) => {
			r.abilities.filter((a) => !a.signature).forEach((a) => {
				const name = a.name.toLowerCase();
				const owned = findEntry(catalog.elements[a.medium] && catalog.elements[a.medium][a.action], name);
				const neutral = findEntry(catalog.neutral[a.action], name);
				const permits = (e) => e !== undefined && (!Array.isArray(e) || e[1].includes(a.instrument));
				expect(permits(owned) || permits(neutral)).toBe(true);
			});
		});
	});

	test('temperament: five axes 0 to 100', () => {
		batch.forEach((r) => {
			['boldness', 'curiosity', 'energy', 'aggression', 'sociability'].forEach((k) => {
				expect(r.temperament[k]).toBeGreaterThanOrEqual(0);
				expect(r.temperament[k]).toBeLessThanOrEqual(100);
			});
		});
	});

	test('appearance finish is one of the four', () => {
		batch.forEach((r) => {
			expect(['standard', 'gleam', 'prismatic', 'eclipse']).toContain(r.appearance.finish);
		});
	});

	test('a batch cycles species evenly', () => {
		const counts = {};
		batch.forEach((r) => { counts[r.species] = (counts[r.species] || 0) + 1; });
		Object.values(counts).forEach((n) => expect(n).toBe(8));
	});
});

describe('generator: pipeline tilts read the body', () => {
	test('favored attributes land higher on average than unfavored ones with the same band', () => {
		// over many graviclaws, the juggernaut favors strength and resilience
		const rolls = generateBatch(400, 'skew', { templates: [TEMPLATES.find((t) => t.key === 'graviclaw')], generatedAt: FIXED_TIME });
		const juggernauts = rolls.filter((r) => r.archetype.key === 'juggernaut');
		const others = rolls.filter((r) => !r.archetype.favors.includes('strength'));
		const mean = (list, k) => list.reduce((n, r) => n + r.attributes[k], 0) / list.length;
		expect(juggernauts.length).toBeGreaterThan(50);
		expect(mean(juggernauts, 'strength')).toBeGreaterThan(mean(others, 'strength'));
	});

	test('pack-bonded individuals lean sociable; solitary ones lean aloof', () => {
		const rolls = generateBatch(600, 'social', { generatedAt: FIXED_TIME });
		const pack = rolls.filter((r) => r.traits.includes('pack-bonded'));
		const lone = rolls.filter((r) => r.traits.includes('solitary'));
		const mean = (list) => list.reduce((n, r) => n + r.temperament.sociability, 0) / list.length;
		expect(pack.length).toBeGreaterThan(20);
		expect(lone.length).toBeGreaterThan(20);
		expect(mean(pack)).toBeGreaterThan(mean(lone) + 10);
	});

	test('about a quarter of creatures carry a secondary affinity', () => {
		const rolls = generateBatch(1160, 'affinity', { generatedAt: FIXED_TIME });
		const withSecondary = rolls.filter((r) => Object.keys(r.element.affinities).length === 2).length;
		const share = withSecondary / rolls.length;
		expect(share).toBeGreaterThan(0.18);
		expect(share).toBeLessThan(0.32);
	});
});
