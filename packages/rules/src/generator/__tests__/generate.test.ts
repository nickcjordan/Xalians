import { describe, test, expect } from 'vitest';
import { generateXalian, generateBatch, getSpeciesTemplates, speciesDisplayName, GENERATOR_VERSION } from '../index.ts';
// test fixtures index the bundled JSON directly by rolled string keys (medium, action,
// instrument), which is looser than the typed AbilityCatalog/Registries shapes the
// generator itself uses; `any` here is the fixture reading its own raw data, not a hole
// in the package's public API.
import registriesJson from '@xalians/content/registries.json';
import catalogJson from '@xalians/content/abilityCatalog.json';
import speciesRecordsJson from '@xalians/content/speciesRecords.json';
import { ELEMENT_ADJACENCY, CONDUIT_ACTIONS_BY_MEDIUM, TRAIT_EXCLUSIONS, HEFT_BANDS, SHOWROOM_RARE_TRAIT_MAX_PERCENT } from '../constants.ts';
import { makeRng } from '../prng.ts';
import type { AttributeKey, ElementKey } from '../types.ts';

const registries = registriesJson as any;
const catalog = catalogJson as any;
const ADJACENCY = ELEMENT_ADJACENCY as any;
const CONDUITS = CONDUIT_ACTIONS_BY_MEDIUM as any;

/*
	Contracts from docs/design/xalian-creature-data-structure.md section 3 and the
	generation pipeline in docs/design/xalian-creature-system-redesign.md section 9,
	checked against every ratified species.
*/

const TEMPLATES = getSpeciesTemplates();
const FIXED_TIME = '2026-09-03T00:00:00Z';
const ATTRIBUTES: AttributeKey[] = ['strength', 'vitality', 'endurance', 'agility', 'reflex', 'intelligence', 'willpower', 'instinct', 'charisma', 'resilience'];

function allNames(): Set<string> {
	const names = new Set<string>();
	Object.values(catalog.elements).forEach((cells: any) => Object.values(cells).forEach((list: any) => list.forEach((e: any) => names.add((Array.isArray(e) ? e[0] : e).toLowerCase()))));
	Object.values(catalog.neutral).forEach((list: any) => list.forEach((e: any) => names.add((Array.isArray(e) ? e[0] : e).toLowerCase())));
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
	const templateByKey = new Map(TEMPLATES.map((t) => [t.key, t] as const));
	const getTemplate = (species: string) => templateByKey.get(species)!;
	const names = allNames();

	test('every ratified species is a template and each is generated', () => {
		const ratified = (speciesRecordsJson as any).records.length;
		expect(ratified).toBeGreaterThan(0);
		expect(TEMPLATES.length).toBe(ratified);
		expect(new Set(batch.map((r) => r.species)).size).toBe(ratified);
	});

	test('attributes are all ten, inside the species band', () => {
		batch.forEach((r) => {
			const t = getTemplate(r.species);
			ATTRIBUTES.forEach((k) => {
				expect(typeof r.attributes[k]).toBe('number');
				expect(r.attributes[k]).toBeGreaterThanOrEqual(Math.min(...t.attributes[k]));
				expect(r.attributes[k]).toBeLessThanOrEqual(Math.max(...t.attributes[k]));
			});
		});
	});

	test('archetype is one the species weights, with the registry favors', () => {
		batch.forEach((r) => {
			const t = getTemplate(r.species);
			expect(Object.keys(t.archetypeWeights)).toContain(r.archetype.key);
			const row = registries.archetypes.find((a: any) => a.key === r.archetype.key);
			expect(r.archetype.favors).toEqual(row.favors);
		});
	});

	test('element primary at 100; any secondary is on the adjacency graph, graded 1 to 99', () => {
		batch.forEach((r) => {
			const t = getTemplate(r.species);
			expect(r.element.primary).toBe(t.element);
			expect(r.element.affinities[t.element]).toBe(100);
			Object.entries(r.element.affinities).forEach(([el, grade]) => {
				if (el === t.element) {
					return;
				}
				expect(ELEMENT_ADJACENCY[t.element as ElementKey]).toContain(el);
				expect(grade).toBeGreaterThanOrEqual(1);
				expect(grade).toBeLessThanOrEqual(99);
			});
			expect(Object.keys(r.element.affinities).length).toBeLessThanOrEqual(2);
		});
	});

	test('traits are a flat array drawn from the species pool; 100s always land; exclusions hold', () => {
		batch.forEach((r) => {
			const t = getTemplate(r.species);
			expect(Array.isArray(r.traits)).toBe(true);
			r.traits.forEach((k) => {
				expect(Object.keys(t.traits.pool).concat(['phasing'])).toContain(k);
			});
			Object.entries(t.traits.pool).forEach(([k, pct]) => {
				if ((pct ?? 0) >= 100) {
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
			const t = getTemplate(r.species);
			// indexed by a loose string list of dimension names for the "always present"
			// check below; a plain object index, not part of the typed record contract
			const p = r.physiology as any;
			['corporeality', 'composition', 'bodyPlan', 'anatomy', 'covering', 'heightCm', 'weightKg', 'lifespan', 'genome', 'diet', 'communication', 'breathes', 'environmentalTolerance', 'capabilities', 'senses'].forEach((k) => {
				expect(p[k]).toBeDefined();
			});
			expect(p.heightCm).toBeGreaterThanOrEqual(t.physiology.size.heightCm[0]);
			expect(p.heightCm).toBeLessThanOrEqual(t.physiology.size.heightCm[1]);
			expect(p.weightKg).toBeGreaterThanOrEqual(t.physiology.size.weightKg[0]);
			expect(p.weightKg).toBeLessThanOrEqual(t.physiology.size.weightKg[1]);
			p.breathes.forEach((m: string) => expect(p.environmentalTolerance.ambientMedia).toContain(m));
			['flight', 'swim', 'burrow', 'climb', 'sprint', 'leap', 'manipulation'].forEach((k) => {
				expect(p.capabilities[k]).toBeGreaterThanOrEqual(0);
				expect(p.capabilities[k]).toBeLessThanOrEqual(100);
			});
			expect(['levo', 'dextro', 'achiral']).toContain(p.genome.chirality);
			expect(p.environmentalTolerance.temperatureC).toEqual(t.physiology.environmentalTolerance!.temperatureC);
		});
	});

	test('abilities: signature first, then 2 or 3 rolled; intensities 1 to 100; names unique per creature', () => {
		batch.forEach((r) => {
			const t = getTemplate(r.species);
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
			const t = getTemplate(r.species);
			r.abilities.filter((a) => !a.signature).forEach((a) => {
				expect(t.instruments).toContain(a.instrument);
				expect(Object.keys(r.element.affinities)).toContain(a.medium);
				const row = registries.instrumentActions[a.instrument] || [];
				const conduit = t.conduits && t.conduits[a.instrument] === a.medium ? (CONDUITS[a.medium] || []) : [];
				expect([...row, ...conduit]).toContain(a.action);
				expect(names.has(a.name.toLowerCase())).toBe(true);
			});
		});
	});

	test('tagged catalog names only go to instruments they name', () => {
		// a name is checked against the cell it was drawn from (the medium's cell for the
		// action, else the neutral pool); the same string may carry different tags elsewhere
		const findEntry = (list: any, name: string) => (list || []).find((e: any) => (Array.isArray(e) ? e[0] : e).toLowerCase() === name);
		batch.forEach((r) => {
			r.abilities.filter((a) => !a.signature).forEach((a) => {
				const name = a.name.toLowerCase();
				const owned = findEntry(catalog.elements[a.medium] && catalog.elements[a.medium][a.action], name);
				const neutral = findEntry(catalog.neutral[a.action], name);
				// [name, tags, heft] entries may carry an empty tag list; empty means untagged
				const permits = (e: any) => e !== undefined && (!Array.isArray(e) || e[1].length === 0 || e[1].includes(a.instrument));
				expect(permits(owned) || permits(neutral)).toBe(true);
			});
		});
	});

	test('temperament: five axes 0 to 100', () => {
		batch.forEach((r) => {
			(['boldness', 'curiosity', 'energy', 'aggression', 'sociability'] as const).forEach((k) => {
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
		const counts: Record<string, number> = {};
		batch.forEach((r) => { counts[r.species] = (counts[r.species] || 0) + 1; });
		Object.values(counts).forEach((n) => expect(n).toBe(8));
	});
});

describe('generator: pipeline tilts read the body', () => {
	test('favored attributes land higher on average than unfavored ones with the same band', () => {
		// over many graviclaws, the juggernaut favors strength and resilience
		const rolls = generateBatch(400, 'skew', { templates: [TEMPLATES.find((t) => t.key === 'graviclaw')!], generatedAt: FIXED_TIME });
		const juggernauts = rolls.filter((r) => r.archetype.key === 'juggernaut');
		const others = rolls.filter((r) => !r.archetype.favors.includes('strength'));
		const mean = (list: any[], k: AttributeKey) => list.reduce((n, r) => n + r.attributes[k], 0) / list.length;
		expect(juggernauts.length).toBeGreaterThan(50);
		expect(mean(juggernauts, 'strength')).toBeGreaterThan(mean(others, 'strength'));
	});

	test('pack-bonded individuals lean sociable; solitary ones lean aloof', () => {
		// after the 2026-09-08 pool-shape pass only one species pool still carries solitary
		// (imprit at 10), so the batch is sized to land a few dozen of them
		const rolls = generateBatch(11600, 'social', { generatedAt: FIXED_TIME });
		const pack = rolls.filter((r) => r.traits.includes('pack-bonded'));
		const lone = rolls.filter((r) => r.traits.includes('solitary'));
		const mean = (list: any[]) => list.reduce((n, r) => n + r.temperament.sociability, 0) / list.length;
		expect(pack.length).toBeGreaterThan(20);
		expect(lone.length).toBeGreaterThan(15);
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

describe('generator: the seed is a 128-bit stream, not a 32-bit fold', () => {
	/*
		Decision 7 of docs/design/xalian-creature-system-hardening.md. Generator 0.1.0
		folded the seed string into one 32-bit word before stepping mulberry32, so two
		Scrambler Tokens collided at birthday scale (about 65,000 mints) and the whole
		128-bit genome the redesign doc mints was thrown away. These tests fail on any
		return to a 32-bit seed.
	*/

	test('seeds that collided under the old 32-bit fold now diverge', () => {
		// "Aa" and "BB" have the same value under the retired h = h * 31 + c fold
		// (65 * 31 + 97 === 66 * 31 + 66), so 0.1.0 expanded them to the same creature
		const a = generateXalian('graviclaw', 'Aa', { generatedAt: FIXED_TIME });
		const b = generateXalian('graviclaw', 'BB', { generatedAt: FIXED_TIME });
		expect(a.id).not.toBe(b.id);
		expect(a.attributes).not.toEqual(b.attributes);
	});

	test('the raw stream separates seeds differing only past 32 bits of hash space', () => {
		const seen = new Set();
		for (let i = 0; i < 4000; i++) {
			const rng = makeRng(`token-${i}`);
			seen.add([rng.hex(8), rng.hex(8), rng.hex(8), rng.hex(8)].join(''));
		}
		expect(seen.size).toBe(4000);
	});

	test('2000 sequential seeds give 2000 distinct ids and attribute vectors', () => {
		const ids = new Set();
		const vectors = new Set();
		for (let i = 0; i < 2000; i++) {
			const r = generateXalian('graviclaw', `mint-${i}`, { generatedAt: FIXED_TIME });
			ids.add(r.id);
			vectors.add(ATTRIBUTES.map((k) => r.attributes[k]).join(','));
		}
		expect(ids.size).toBe(2000);
		expect(vectors.size).toBe(2000);
	});

	test('a numeric seed is the same stream as its decimal spelling', () => {
		const a = generateXalian('graviclaw', 12345, { generatedAt: FIXED_TIME });
		const b = generateXalian('graviclaw', '12345', { generatedAt: FIXED_TIME });
		expect(a).toEqual(b);
	});
});

describe('generator: forks are independent sub-streams', () => {
	const drawFive = (rng: any) => [rng.float(), rng.float(), rng.float(), rng.float(), rng.float()];

	test('consuming one fork does not shift another', () => {
		const before = drawFive(makeRng('root-seed').fork('a'));

		const root = makeRng('root-seed');
		const b = root.fork('b');
		for (let i = 0; i < 17; i++) {
			b.float();
		}
		const after = drawFive(root.fork('a'));

		expect(after).toEqual(before);
	});

	test('drawing from the parent does not shift a fork', () => {
		const plain = makeRng('root-seed');
		const before = drawFive(plain.fork('archetype'));

		const used = makeRng('root-seed');
		used.float();
		used.int(100);
		const after = drawFive(used.fork('archetype'));

		expect(after).toEqual(before);
	});

	test('different labels give different streams', () => {
		const root = makeRng('root-seed');
		expect(drawFive(root.fork('a'))).not.toEqual(drawFive(root.fork('b')));
	});
});

describe('generator: names are drawn toward the rolled intensity', () => {
	/*
		Decision 9: the bundler computes a heft per catalog entry (1 small, 2 ordinary,
		3 grand) and the generator weights the name draw toward the heft matching the
		intensity tercile. The catalog is heavily weighted toward heft 2, so the effect is
		a shift in the mean rather than a clean separation.
	*/
	const heftIndex = (() => {
		const map = new Map<string, number>();
		const add = (e: any) => {
			const name = (Array.isArray(e) ? e[0] : e).toLowerCase();
			const h = Array.isArray(e) && typeof e[2] === 'number' ? e[2] : 2;
			if (!map.has(name)) {
				map.set(name, h);
			}
		};
		Object.values(catalog.elements).forEach((cells: any) => Object.values(cells).forEach((list: any) => list.forEach(add)));
		Object.values(catalog.neutral).forEach((list: any) => list.forEach(add));
		return map;
	})();

	test('the catalog ships a heft on every entry that is not ordinary', () => {
		expect(catalog.counts.heft).toBeDefined();
		expect(catalog.counts.heft['1']).toBeGreaterThan(0);
		expect(catalog.counts.heft['3']).toBeGreaterThan(0);
	});

	test('high-intensity abilities carry heavier names than low-intensity ones', () => {
		const rolls = generateBatch(TEMPLATES.length * 40, 'heft-seed', { generatedAt: FIXED_TIME });
		const heavy: number[] = [];
		const light: number[] = [];
		rolls.forEach((r) => {
			r.abilities.filter((a) => !a.signature).forEach((a) => {
				const h = heftIndex.get(a.name.toLowerCase());
				if (h === undefined) {
					return;
				}
				if (a.intensity > HEFT_BANDS[1]) {
					heavy.push(h);
				} else if (a.intensity < HEFT_BANDS[0]) {
					light.push(h);
				}
			});
		});
		const mean = (list: number[]) => list.reduce((n, h) => n + h, 0) / list.length;
		expect(heavy.length).toBeGreaterThan(200);
		expect(light.length).toBeGreaterThan(200);
		expect(mean(heavy)).toBeGreaterThan(mean(light));
	});
});

// issue #197: the showroom profile is a generator-internal lever, not an entitlement
// check (a visible site toggle drives it while gating is parked, see constants.ts's
// SHOWROOM_PROFILE comment). These tests check the three constraints it applies plus the
// stream-identity claim: the same seed differs between profiles only in the fields the
// profile actually constrains.
describe('generator: showroom profile', () => {
	const templateByKey = new Map(TEMPLATES.map((t) => [t.key, t] as const));

	test('finish is always standard under the showroom profile', () => {
		const batch = generateBatch(TEMPLATES.length * 10, 'showroom-finish-seed', { generatedAt: FIXED_TIME, profile: 'showroom' });
		batch.forEach((r) => expect(r.appearance.finish).toBe('standard'));
	});

	test('no rare trait ever lands under the showroom profile', () => {
		const batch = generateBatch(TEMPLATES.length * 20, 'showroom-trait-seed', { generatedAt: FIXED_TIME, profile: 'showroom' });
		batch.forEach((r) => {
			const template = templateByKey.get(r.species)!;
			const pool = (template.traits && (template.traits as any).pool) || {};
			r.traits.forEach((trait) => {
				const percent = pool[trait];
				if (percent !== undefined) {
					expect(percent).toBeGreaterThanOrEqual(SHOWROOM_RARE_TRAIT_MAX_PERCENT);
				}
			});
		});
	});

	test('no record has a secondary affinity under the showroom profile', () => {
		const batch = generateBatch(TEMPLATES.length * 20, 'showroom-affinity-seed', { generatedAt: FIXED_TIME, profile: 'showroom' });
		batch.forEach((r) => {
			expect(Object.keys(r.element.affinities)).toEqual([r.element.primary]);
		});
	});

	test('provenance carries the profile', () => {
		const full = generateXalian('graviclaw', 'profile-seed', { generatedAt: FIXED_TIME });
		const showroom = generateXalian('graviclaw', 'profile-seed', { generatedAt: FIXED_TIME, profile: 'showroom' });
		expect(full.provenance.profile).toBe('full');
		expect(showroom.provenance.profile).toBe('showroom');
	});

	test('the default profile still produces the current unconstrained distribution', () => {
		const batch = generateBatch(TEMPLATES.length * 40, 'default-distribution-seed', { generatedAt: FIXED_TIME });
		expect(batch.some((r) => r.appearance.finish !== 'standard')).toBe(true);
		expect(batch.some((r) => Object.keys(r.element.affinities).length > 1)).toBe(true);
		const rarePercents = new Set<number>();
		batch.forEach((r) => {
			const template = templateByKey.get(r.species)!;
			const pool = (template.traits && (template.traits as any).pool) || {};
			r.traits.forEach((trait) => {
				const percent = pool[trait];
				if (percent !== undefined && percent < SHOWROOM_RARE_TRAIT_MAX_PERCENT) {
					rarePercents.add(percent);
				}
			});
		});
		expect(rarePercents.size).toBeGreaterThan(0);
	});

	test('same seed under both profiles agrees on every unconstrained field', () => {
		// The showroom constraint on affinity discards a landed secondary rather than
		// suppressing the draw, so abilities (which read the rolled secondary to pick a
		// medium) only line up exactly between profiles when the full profile itself did
		// not land one. Search for such a seed rather than hardcode one.
		let agreementSeed: string | null = null;
		for (let i = 0; i < 300; i++) {
			const candidate = `agree-seed-${i}`;
			const full = generateXalian('graviclaw', candidate, { generatedAt: FIXED_TIME });
			if (Object.keys(full.element.affinities).length === 1) {
				agreementSeed = candidate;
				break;
			}
		}
		expect(agreementSeed).not.toBeNull();
		const full = generateXalian('graviclaw', agreementSeed as string, { generatedAt: FIXED_TIME });
		const showroom = generateXalian('graviclaw', agreementSeed as string, { generatedAt: FIXED_TIME, profile: 'showroom' });
		expect(showroom.species).toBe(full.species);
		expect(showroom.attributes).toEqual(full.attributes);
		expect(showroom.physiology).toEqual(full.physiology);
		expect(showroom.abilities).toEqual(full.abilities);
	});
});
