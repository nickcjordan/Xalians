import {
	baseHold, holdAtSite, worldMatchupMultiplier, strainLevel, strainMultiplierFor,
	initiativeOf, buildActs, magnitudeOf, magnitudeAgainst, favoredAct, conductOf, prepare,
	traitKeywordsOf,
} from '../creatureOnTable.js';

/*
	Coverage for "The creature on the table" section of docs/design/reclamation-design.md:
	hold, world matchup, home ground, strain, initiative, act magnitudes, conduct.
*/

function record(overrides = {}) {
	return {
		id: 'xal_test_0001',
		species: 'testling',
		provenance: { serial: 1, origin: 'stonera' },
		attributes: {
			strength: 50, vitality: 60, endurance: 70, agility: 40, reflex: 60,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 80,
		},
		element: { primary: 'fire', affinities: { fire: 100 } },
		archetype: { key: 'balanced', favors: [] },
		physiology: {
			breathes: ['gas'],
			environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -10, max: 40 } },
		},
		traits: { guaranteed: [], rolled: [] },
		temperament: { boldness: 50, curiosity: 50, energy: 50, aggression: 50, sociability: 50 },
		abilities: [
			{ name: 'Strike', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 60 },
		],
		...overrides,
	};
}

function world(overrides = {}) {
	return { planet: 'Magmuth', element: 'fire', sites: [], ...overrides };
}

function site(overrides = {}) {
	return {
		id: 'site-1', name: 'Test Site', planet: 'Magmuth', element: 'fire',
		environment: { medium: 'gas', temperatureC: { min: 0, max: 30 } },
		...overrides,
	};
}

describe('baseHold', () => {
	test('mean of vitality, resilience, endurance / HOLD_DIVISOR(5)', () => {
		// mean(60, 80, 70) = 70; 70 / 5 = 14
		expect(baseHold(record())).toBeCloseTo(14, 5);
	});

	test('typically lands in the 6-16 band across neutral attributes', () => {
		const r = record({ attributes: { ...record().attributes, vitality: 50, resilience: 50, endurance: 50 } });
		expect(baseHold(r)).toBeCloseTo(10, 5);
	});
});

describe('worldMatchupMultiplier', () => {
	test('a favorable matchup (matrix[creature][world] = 2) doubles hold contribution', () => {
		// fire vs plant world: matrix[Fire][Plant] = 2 per typeEffectivenessMatrix.json
		const r = record({ element: { primary: 'fire', affinities: { fire: 100 } } });
		const w = world({ element: 'plant' });
		expect(worldMatchupMultiplier(r, w.element)).toBeCloseTo(2, 5);
	});

	test('an unfavorable matchup (matrix[creature][world] = 0.5) halves hold contribution', () => {
		// fire vs water world: matrix[Fire][Water] = 0.5
		const r = record({ element: { primary: 'fire', affinities: { fire: 100 } } });
		const w = world({ element: 'water' });
		expect(worldMatchupMultiplier(r, w.element)).toBeCloseTo(0.5, 5);
	});

	test('a hard-zero matchup is softened to 0.25, never a full exclusion', () => {
		// fire vs ghost world: matrix[Fire][Ghost] = 0
		const r = record({ element: { primary: 'fire', affinities: { fire: 100 } } });
		const w = world({ element: 'ghost' });
		expect(worldMatchupMultiplier(r, w.element)).toBeCloseTo(0.25, 5);
	});
});

describe('holdAtSite: home ground and strain composition', () => {
	test('home ground multiplies hold by 1.5 on the creature\'s origin world (lowercase compare)', () => {
		const r = record({ provenance: { serial: 1, origin: 'stonera' }, element: { primary: 'rock', affinities: { rock: 100 } } });
		const w = world({ planet: 'Stonera', element: 'rock' });
		const s = site({ environment: { medium: 'gas', temperatureC: { min: -10, max: 40 } } });
		const { value, isHome } = holdAtSite(r, s, w);
		expect(isHome).toBe(true);
		// base 14 * matchup(rock-vs-rock = 1) * home(1.5) * strain(1) = 21
		expect(value).toBeCloseTo(14 * 1 * 1.5, 5);
	});

	test('no home ground bonus off the origin world', () => {
		const r = record({ provenance: { serial: 1, origin: 'stonera' } });
		const w = world({ planet: 'Magmuth', element: 'fire' });
		const s = site();
		const { isHome } = holdAtSite(r, s, w);
		expect(isHome).toBe(false);
	});
});

describe('strainLevel', () => {
	test('within temperature band and medium: no strain', () => {
		const r = record();
		const w = world();
		const s = site({ environment: { medium: 'gas', temperatureC: { min: 0, max: 30 } } });
		expect(strainLevel(r, s, w)).toBe('none');
	});

	test('outside temperature band: strained', () => {
		const r = record({ physiology: { breathes: ['gas'], environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -10, max: 40 } } } });
		const w = world();
		const s = site({ environment: { medium: 'gas', temperatureC: { min: 50, max: 100 } } });
		expect(strainLevel(r, s, w)).toBe('strained');
	});

	test('cannot breathe the site medium at all: severe strain', () => {
		const r = record({ physiology: { breathes: ['liquid'], environmentalTolerance: { ambientMedia: ['liquid'], temperatureC: { min: -10, max: 40 } } } });
		const w = world();
		const s = site({ environment: { medium: 'gas', temperatureC: { min: 0, max: 30 } } });
		expect(strainLevel(r, s, w)).toBe('severe');
	});

	test('strain multiplier halves hold/magnitude; severe strain quarters it', () => {
		expect(strainMultiplierFor('none')).toBe(1);
		expect(strainMultiplierFor('strained')).toBe(0.5);
		expect(strainMultiplierFor('severe')).toBe(0.25);
	});

	test('nocturnal creatures are never strained on Grimedes', () => {
		const r = record({
			physiology: { breathes: ['gas'], environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -10, max: 10 } } },
			traits: { guaranteed: [], rolled: ['nocturnal'] },
		});
		const w = world({ planet: 'Grimedes', element: 'dark' });
		const s = site({ environment: { medium: 'liquid', temperatureC: { min: 80, max: 90 } } });
		expect(strainLevel(r, s, w)).toBe('none');
	});

	test('luminous creatures are never strained on Luminax', () => {
		const r = record({
			physiology: { breathes: ['gas'], environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -10, max: 10 } } },
			traits: { guaranteed: [], rolled: ['luminous'] },
		});
		const w = world({ planet: 'Luminax', element: 'light' });
		const s = site({ environment: { medium: 'liquid', temperatureC: { min: 80, max: 90 } } });
		expect(strainLevel(r, s, w)).toBe('none');
	});

	test('strain never excludes: a strained body still produces a positive hold', () => {
		const r = record({ physiology: { breathes: ['gas'], environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -10, max: 40 } } } });
		const w = world();
		const s = site({ environment: { medium: 'gas', temperatureC: { min: 90, max: 120 } } });
		const { value } = holdAtSite(r, s, w);
		expect(value).toBeGreaterThan(0);
	});
});

describe('initiativeOf', () => {
	test('mean of reflex and agility', () => {
		const r = record({ attributes: { ...record().attributes, reflex: 60, agility: 40 } });
		expect(initiativeOf(r)).toBeCloseTo(50, 5);
	});
});

describe('act magnitudes', () => {
	test('magnitudeOf formula: max(1, round((intensity/10) * (0.5 + attr/100)))', () => {
		expect(magnitudeOf(60, 50)).toBe(Math.max(1, Math.round((60 / 10) * 1.0)));
		expect(magnitudeOf(60, 100)).toBe(Math.max(1, Math.round((60 / 10) * 1.5)));
		expect(magnitudeOf(1, 0)).toBe(1); // floored at 1
	});

	test('buildActs applies strain multiplier to every act magnitude', () => {
		const r = record();
		const actsFull = buildActs(r, 1);
		const actsStrained = buildActs(r, 0.5);
		expect(actsStrained[0].magnitude).toBeLessThanOrEqual(actsFull[0].magnitude);
	});

	test('magnitudeAgainst scales by the type chart, actor vs target, blended with target secondary', () => {
		const actor = record({ element: { primary: 'fire', affinities: { fire: 100 } } });
		const targetFavorable = record({ id: 'target1', element: { primary: 'plant', affinities: { plant: 100 } } });
		const targetUnfavorable = record({ id: 'target2', element: { primary: 'water', affinities: { water: 100 } } });
		const act = buildActs(actor, 1)[0];
		const magFavorable = magnitudeAgainst(actor, act, targetFavorable);
		const magUnfavorable = magnitudeAgainst(actor, act, targetUnfavorable);
		expect(magFavorable).toBeGreaterThan(magUnfavorable);
	});
});

describe('favoredAct', () => {
	test('bulwark favors ward when it has the ability', () => {
		const r = record({
			archetype: { key: 'bulwark', favors: [] },
			abilities: [
				{ name: 'Guard', signature: false, instrument: 'body', action: 'ward', medium: 'fire', intensity: 50 },
				{ name: 'Strike', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 80 },
			],
		});
		const acts = buildActs(r, 1);
		expect(favoredAct(r, acts).action).toBe('ward');
	});

	test('survivor favors holding', () => {
		const r = record({ archetype: { key: 'survivor', favors: [] } });
		const acts = buildActs(r, 1);
		expect(favoredAct(r, acts).action).toBe('hold');
	});

	test('virtuoso favors its single strongest act overall', () => {
		const r = record({
			archetype: { key: 'virtuoso', favors: [] },
			abilities: [
				{ name: 'Weak', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 20 },
				{ name: 'Strong', signature: false, instrument: 'fists', action: 'beam', medium: 'fire', intensity: 90 },
			],
		});
		const acts = buildActs(r, 1);
		const chosen = favoredAct(r, acts);
		expect(chosen.action).toBe('beam');
	});

	test('falls back to hold when the archetype favors a specific action the creature lacks', () => {
		const r = record({ archetype: { key: 'sage', favors: [] }, abilities: [
			{ name: 'Strike', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 50 },
		] });
		const acts = buildActs(r, 1);
		expect(favoredAct(r, acts).action).toBe('hold');
	});
});

describe('conductOf', () => {
	test('reads archetype conduct spec and temperament thresholds', () => {
		const r = record({ archetype: { key: 'predator', favors: [] }, temperament: { boldness: 80, curiosity: 20, energy: 50, aggression: 50, sociability: 50 } });
		const conduct = conductOf(r);
		expect(conduct.attacking).toBe('weakestEnemyInReach');
		expect(conduct.supporting).toBe('allyWithLeastHold');
		expect(conduct.isHighBoldness).toBe(true);
		expect(conduct.isLowBoldness).toBe(false);
	});
});

describe('traitKeywordsOf', () => {
	test('merges guaranteed and rolled traits, deduplicated', () => {
		const r = record({ traits: { guaranteed: ['armored'], rolled: ['armored', 'stealthy'] } });
		expect(traitKeywordsOf(r).sort()).toEqual(['armored', 'stealthy']);
	});
});

describe('prepare', () => {
	test('produces the full derived view with all expected fields', () => {
		const r = record({ traits: { guaranteed: ['anchored'], rolled: [] } });
		const w = world();
		const s = site();
		const view = prepare(r, s, w, 0);
		expect(view.id).toBe(r.id);
		expect(view.hold).toBeGreaterThan(0);
		expect(view.anchored).toBe(true);
		expect(view.acts.length).toBe(r.abilities.length);
		expect(view.favoredAct).toBeTruthy();
		expect(view.conduct).toBeTruthy();
	});

	test('pack-bonded gains +1 hold per kin at the site', () => {
		const r = record({ traits: { guaranteed: [], rolled: ['pack-bonded'] } });
		const w = world();
		const s = site();
		const withoutKin = holdAtSite(r, s, w, { packBondedKinAtSite: 0 }).value;
		const withKin = holdAtSite(r, s, w, { packBondedKinAtSite: 2 }).value;
		expect(withKin).toBeCloseTo(withoutKin + 2, 5);
	});

	test('solitary loses 1 hold per ally at the site', () => {
		const r = record({ traits: { guaranteed: [], rolled: ['solitary'] } });
		const w = world();
		const s = site();
		const withoutAllies = holdAtSite(r, s, w, { solitaryAlliesAtSite: 0 }).value;
		const withAllies = holdAtSite(r, s, w, { solitaryAlliesAtSite: 3 }).value;
		expect(withAllies).toBeCloseTo(withoutAllies - 3, 5);
	});
});
