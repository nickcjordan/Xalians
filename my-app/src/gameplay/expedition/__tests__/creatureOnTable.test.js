import {
	baseHold, holdAtSite, worldMatchupMultiplier, strainLevel, strainMultiplierFor,
	speedOf, buildActs, magnitudeOf, magnitudeAgainst, favoredAct, conductOf, prepare,
	traitKeywordsOf, roleOf, naturalRoleOf, blowActOf, liftedStrainLevel, isSwift, isWillful,
} from '../creatureOnTable.js';
import {
	HOLD_FLOOR, HOLD_CEILING, RAW_ATTRIBUTE_MIN, RAW_ATTRIBUTE_MAX, ROLE, BOLSTER_FLOOR,
	MAGNITUDE_SCALE, WILLFUL_THRESHOLD, SWIFT_SPEED, KEEN_INSTINCT, DULL_INSTINCT,
	presenceScaleOf, instinctLaneOf, getGoverningAttributeForAction,
} from '../expeditionInterpretation.js';

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

// hold compression (docs/design/reclamation-base-redesign.md assumption 11)
function compressed(raw, floor = HOLD_FLOOR, ceiling = HOLD_CEILING) {
	return floor + ((raw - RAW_ATTRIBUTE_MIN) * (ceiling - floor)) / (RAW_ATTRIBUTE_MAX - RAW_ATTRIBUTE_MIN);
}

describe('baseHold: the hold compression', () => {
	test('maps the raw mean of vitality, resilience and endurance onto [floor, ceiling]', () => {
		// mean(60, 80, 70) = 70
		expect(baseHold(record())).toBeCloseTo(compressed(70), 5);
	});

	test('hits the compression endpoints exactly at the registry attribute range', () => {
		const zero = record({ attributes: { ...record().attributes, vitality: 0, resilience: 0, endurance: 0 } });
		const full = record({ attributes: { ...record().attributes, vitality: 100, resilience: 100, endurance: 100 } });
		expect(baseHold(zero)).toBeCloseTo(HOLD_FLOOR, 5);
		expect(baseHold(full)).toBeCloseTo(HOLD_CEILING, 5);
	});

	test('a rules object moves the floor and ceiling without touching a record', () => {
		const r = record();
		expect(baseHold(r, { holdFloor: 0, holdCeiling: 20 })).toBeCloseTo(compressed(70, 0, 20), 5);
		// raising the floor compresses: two creatures land closer together
		const weak = record({ attributes: { ...record().attributes, vitality: 30, resilience: 30, endurance: 30 } });
		const flat = baseHold(r, { holdFloor: 0, holdCeiling: 20 }) / baseHold(weak, { holdFloor: 0, holdCeiling: 20 });
		const tight = baseHold(r, { holdFloor: 6, holdCeiling: 15 }) / baseHold(weak, { holdFloor: 6, holdCeiling: 15 });
		expect(tight).toBeLessThan(flat);
	});
});

describe('roleOf: every creature is a hold and one role (assumption 4)', () => {
	const strikeAbility = { name: 'Strike', action: 'strike', intensity: 60 };
	const areaAbility = { name: 'Burst', action: 'burst', intensity: 60 };
	const wardAbility = { name: 'Ward', action: 'ward', intensity: 60 };
	const mendAbility = { name: 'Mend', action: 'mend', intensity: 60 };

	test('bulwark and stalwart are shields, survivor and sage are bolsters', () => {
		const both = [wardAbility, mendAbility];
		expect(naturalRoleOf(record({ archetype: { key: 'bulwark' }, abilities: both }))).toBe(ROLE.SHIELD);
		expect(naturalRoleOf(record({ archetype: { key: 'stalwart' }, abilities: both }))).toBe(ROLE.SHIELD);
		expect(naturalRoleOf(record({ archetype: { key: 'survivor' }, abilities: both }))).toBe(ROLE.BOLSTER);
		expect(naturalRoleOf(record({ archetype: { key: 'sage' }, abilities: both }))).toBe(ROLE.BOLSTER);
	});

	test('the abilities override the archetype when they clearly point one way', () => {
		expect(naturalRoleOf(record({ archetype: { key: 'bulwark' }, abilities: [mendAbility] }))).toBe(ROLE.BOLSTER);
		expect(naturalRoleOf(record({ archetype: { key: 'survivor' }, abilities: [wardAbility] }))).toBe(ROLE.SHIELD);
	});

	test('everyone else is a blow: area with an area ability, else strike', () => {
		expect(naturalRoleOf(record({ archetype: { key: 'predator' }, abilities: [strikeAbility] }))).toBe(ROLE.STRIKE);
		expect(naturalRoleOf(record({ archetype: { key: 'predator' }, abilities: [strikeAbility, areaAbility] }))).toBe(ROLE.SWEEP);
	});

	test('a role switched off degrades: sweep to a plain strike, a presence to a plain holder', () => {
		const area = record({ archetype: { key: 'predator' }, abilities: [strikeAbility, areaAbility] });
		const shield = record({ archetype: { key: 'bulwark' }, abilities: [wardAbility] });
		const bolster = record({ archetype: { key: 'sage' }, abilities: [mendAbility] });
		expect(roleOf(area, { roles: { sweep: false, bolster: true, shield: true } })).toBe(ROLE.STRIKE);
		expect(roleOf(shield, { roles: { sweep: true, bolster: true, shield: false } })).toBe(ROLE.NONE);
		expect(roleOf(bolster, { roles: { sweep: true, bolster: false, shield: true } })).toBe(ROLE.NONE);
	});

	test('blowActOf gives an area its area ability and a presence no blow at all', () => {
		const area = record({ archetype: { key: 'predator' }, abilities: [strikeAbility, areaAbility] });
		const acts = buildActs(area, 1, MAGNITUDE_SCALE);
		expect(blowActOf(area, acts, ROLE.SWEEP).action).toBe('burst');
		expect(blowActOf(area, acts, ROLE.SHIELD)).toBe(null);
	});

	test('a blow creature with no attacking ability at all still strikes, at the pool minimum', () => {
		const wardOnly = record({ archetype: { key: 'predator' }, abilities: [wardAbility] });
		const acts = buildActs(wardOnly, 1, MAGNITUDE_SCALE);
		const blow = blowActOf(wardOnly, acts, ROLE.STRIKE);
		expect(blow.fallback).toBe(true);
		expect(blow.magnitude).toBeGreaterThan(0);
	});
});

describe('bolster lifts one grade of strain (assumption 8)', () => {
	test('liftedStrainLevel steps severe to strained and strained to comfortable', () => {
		expect(liftedStrainLevel('severe')).toBe('strained');
		expect(liftedStrainLevel('strained')).toBe('none');
		expect(liftedStrainLevel('none')).toBe('none');
	});

	test('a comfortable creature takes the bolster floor instead of a grade', () => {
		const r = record();
		const w = world();
		const s = site({ environment: { medium: 'gas', temperatureC: { min: -10, max: 40 } } });
		const plain = holdAtSite(r, s, w);
		const lifted = holdAtSite(r, s, w, { bolstered: true });
		expect(plain.level).toBe('none');
		expect(lifted.value).toBeCloseTo(plain.value + BOLSTER_FLOOR, 5);
	});

	test('a strained creature is recomputed at the comfortable multiplier', () => {
		const r = record({ physiology: { breathes: ['gas'], environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: 0, max: 5 } } } });
		const w = world();
		const s = site({ environment: { medium: 'gas', temperatureC: { min: 20, max: 30 } } });
		const plain = holdAtSite(r, s, w);
		const lifted = holdAtSite(r, s, w, { bolstered: true });
		expect(plain.level).toBe('strained');
		expect(lifted.effectiveLevel).toBe('none');
		expect(lifted.value).toBeCloseTo(plain.value / strainMultiplierFor('strained'), 5);
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
		// baseHold * matchup(rock-vs-rock = 1) * home(1.5) * strain(1)
		expect(value).toBeCloseTo(baseHold(r) * 1 * 1.5, 5);
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

describe('speedOf', () => {
	test('mean of reflex and agility', () => {
		const r = record({ attributes: { ...record().attributes, reflex: 60, agility: 40 } });
		expect(speedOf(r)).toBeCloseTo(50, 5);
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
		const r = record({ traits: { guaranteed: ['armored'], rolled: [] } });
		const w = world();
		const s = site();
		const view = prepare(r, s, w, 0);
		expect(view.id).toBe(r.id);
		expect(view.hold).toBeGreaterThan(0);
		expect(view.armored).toBe(true);
		expect(view.acts.length).toBe(r.abilities.length);
		expect(view.favoredAct).toBeTruthy();
		expect(view.conduct).toBeTruthy();
		// the base redesign's four roles travel on the prepared view
		expect([ROLE.STRIKE, ROLE.SWEEP, ROLE.BOLSTER, ROLE.SHIELD, ROLE.NONE]).toContain(view.role);
		expect(typeof view.blowMagnitude).toBe('number');
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

/*
	Pass 2: every attribute a job (docs/design/reclamation-base-redesign.md assumption 17).
	One test per attribute lane that lives in this module: the governing attribute of an
	attack, willpower's strain relief, charisma's presence scale, and speed with its swift
	cut.
*/
describe('every attribute a job (assumption 17)', () => {
	function withAbility(action, attrs) {
		return record({
			attributes: {
				strength: 50, vitality: 60, endurance: 70, agility: 40, reflex: 60,
				intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 80,
				...attrs,
			},
			abilities: [{ name: 'Test', signature: false, instrument: 'fists', action, medium: 'fire', intensity: 60 }],
		});
	}

	test('strength governs every contact attack and intelligence every projected one', () => {
		['strike', 'crush', 'lash', 'rake'].forEach((action) => {
			expect(getGoverningAttributeForAction(action)).toBe('strength');
			// only strength moves a contact attack's power
			const strong = buildActs(withAbility(action, { strength: 90, intelligence: 10 }), 1, 1)[0];
			const weak = buildActs(withAbility(action, { strength: 10, intelligence: 90 }), 1, 1)[0];
			expect(strong.magnitude).toBeGreaterThan(weak.magnitude);
		});
		// hurl rides with the projections: it is classed as one, so it is powered as one
		['beam', 'spray', 'burst', 'cloud', 'hurl'].forEach((action) => {
			expect(getGoverningAttributeForAction(action)).toBe('intelligence');
			const clever = buildActs(withAbility(action, { strength: 10, intelligence: 90 }), 1, 1)[0];
			const dull = buildActs(withAbility(action, { strength: 90, intelligence: 10 }), 1, 1)[0];
			expect(clever.magnitude).toBeGreaterThan(dull.magnitude);
		});
	});

	test('willpower at or above the threshold suffers one grade less strain, before bolster', () => {
		// a narrow tolerance band against the site's band reads as strained
		const strainedPhysiology = {
			breathes: ['gas'],
			environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: 0, max: 5 } },
		};
		const attrs = {
			strength: 50, vitality: 60, endurance: 70, agility: 40, reflex: 60,
			intelligence: 50, instinct: 50, charisma: 50, resilience: 80,
		};
		const stubborn = record({ physiology: strainedPhysiology, attributes: { ...attrs, willpower: WILLFUL_THRESHOLD } });
		const meek = record({ physiology: strainedPhysiology, attributes: { ...attrs, willpower: WILLFUL_THRESHOLD - 1 } });

		const stubbornView = prepare(stubborn, site(), world(), 0);
		const meekView = prepare(meek, site(), world(), 0);
		expect(meekView.strainLevel).toBe('strained');
		// the printed grade is unchanged; what changes is the grade the arithmetic uses
		expect(stubbornView.strainLevel).toBe('strained');
		expect(stubbornView.willful).toBe(true);
		expect(meekView.willful).toBe(false);
		expect(stubbornView.effectiveStrainLevel).toBe('none');
		expect(stubbornView.hold).toBeCloseTo(meekView.hold * 2, 5);

		// bolster does not push a willful creature past comfortable: it gets the floor
		const bolstered = prepare(stubborn, site(), world(), 0, { bolstered: true });
		expect(bolstered.hold).toBeCloseTo(stubbornView.hold + BOLSTER_FLOOR, 5);

		// and the willful ablation puts the grade back
		const off = prepare(stubborn, site(), world(), 0, { rules: { willful: false } });
		expect(off.willful).toBe(false);
		expect(off.hold).toBeCloseTo(meekView.hold, 5);
	});

	test('charisma scales a presence: 1.0 at 50, 1.5 at 100, 0.5 at 0', () => {
		expect(presenceScaleOf(record({ attributes: { charisma: 50 } }))).toBeCloseTo(1, 5);
		expect(presenceScaleOf(record({ attributes: { charisma: 100 } }))).toBeCloseTo(1.5, 5);
		expect(presenceScaleOf(record({ attributes: { charisma: 0 } }))).toBeCloseTo(0.5, 5);
		// the ablation flattens every presence back to charisma 50
		expect(presenceScaleOf(record({ attributes: { charisma: 100 } }), { presenceScale: false })).toBe(1);
	});

	test('a charismatic bolsterer restores more hold than a charmless one', () => {
		const target = record();
		const plain = holdAtSite(target, site(), world(), {}).value;
		const strong = holdAtSite(target, site(), world(), { bolstered: true, bolsterScale: 1.5 }).value;
		const weak = holdAtSite(target, site(), world(), { bolstered: true, bolsterScale: 0.5 }).value;
		// comfortable already, so the whole lift is the scaled floor
		expect(strong - plain).toBeCloseTo(BOLSTER_FLOOR * 1.5, 5);
		expect(weak - plain).toBeCloseTo(BOLSTER_FLOOR * 0.5, 5);
	});

	test('speed is the mean of reflex and agility, and the swift cut is read off it', () => {
		expect(speedOf(record({ attributes: { reflex: 80, agility: 40 } }))).toBe(60);
		expect(isSwift(record({ attributes: { reflex: SWIFT_SPEED, agility: SWIFT_SPEED } }))).toBe(true);
		expect(isSwift(record({ attributes: { reflex: 20, agility: 20 } }))).toBe(false);
		// the swiftMove ablation makes nobody swift
		expect(isSwift(record({ attributes: { reflex: 90, agility: 90 } }), { swiftMove: false })).toBe(false);
		const view = prepare(record({ attributes: { reflex: 90, agility: 90 } }), site(), world(), 0);
		expect(view.speed).toBe(90);
		expect(view.swift).toBe(true);
		// the old name is gone from the prepared view (assumption 17's vocabulary)
		expect(view.initiative).toBeUndefined();
	});

	test('the instinct lane is keen above the cut, dull below it, conduct in between', () => {
		expect(instinctLaneOf(record({ attributes: { instinct: KEEN_INSTINCT } }))).toBe('keen');
		expect(instinctLaneOf(record({ attributes: { instinct: DULL_INSTINCT } }))).toBe('dull');
		expect(instinctLaneOf(record({ attributes: { instinct: 50 } }))).toBe('conduct');
		expect(instinctLaneOf(record({ attributes: { instinct: 99 } }), { instinctLanes: false })).toBe('conduct');
	});
});
