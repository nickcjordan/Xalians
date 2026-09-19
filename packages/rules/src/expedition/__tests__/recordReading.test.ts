/*
	Pass 7: the game reads the record's own fields (primary effect, area, range, delivery,
	targeting) instead of projecting each action onto one of sixteen legacy action keys.
	These tests pin the reading itself, so the day the platform-side redesign moves a field
	they fail here, in one place, rather than somewhere in the middle of a Clash.
*/
import { describe, test, expect } from 'vitest';
import { readAction, readRecord, EFFECT_ROLE, governingAttributeFor, REACH_BY_RANGE } from '../recordReading.ts';

// a schema 4 action, spelled the way a record spells one
function action(overrides: any = {}) {
	const { effect, ...rest } = overrides;
	return {
		key: 'test-act',
		name: 'Test Act',
		instrument: 'fists',
		medium: 'fire',
		intensity: 50,
		activation: { operation: 'discrete' },
		delivery: { mode: 'contact', approach: 'stationary' },
		spatial: { selectivity: 'selective', range: 'contact' },
		targeting: { relation: 'other', subjects: ['creature'] },
		effects: [{
			kind: 'harm', mechanism: 'impact', recipient: 'target', emphasis: 'primary',
			onset: 'instant', persistence: 'resolved', likelihood: 'consistent',
			...(effect || {}),
		}],
		description: 'A test act.',
		...rest,
	};
}

describe('readAction: what an action is at the table', () => {
	test('harm is an attack, and an area footprint makes it a sweep', () => {
		const single = readAction(action());
		expect(single.role).toBe(EFFECT_ROLE.ATTACK);
		expect(single.area).toBe(false);

		const wide = readAction(action({
			spatial: { selectivity: 'indiscriminate', range: 'short', area: { shape: 'radial', extent: 'medium', anchor: 'point' } },
		}));
		expect(wide.role).toBe(EFFECT_ROLE.ATTACK);
		expect(wide.area).toBe(true);
	});

	test('protect is a shield and restore is a mend', () => {
		expect(readAction(action({ effect: { kind: 'protect', method: 'barrier', against: 'harm' } })).role)
			.toBe(EFFECT_ROLE.SHIELD);
		expect(readAction(action({ effect: { kind: 'restore', aspect: 'integrity' } })).role)
			.toBe(EFFECT_ROLE.MEND);
	});

	/*
		The four kinds pass 7 brought in from the cold. Before this pass the legacy projection
		turned them into snare/shove/drain/terrorize and the game read those as plain damage
		or as nothing; 431 of 1384 actions in the seed-7 pool carry one of them.
	*/
	test.each([
		['restrain', { kind: 'restrain', faculty: 'movement' }],
		['displace', { kind: 'displace', direction: 'away' }],
		['transfer', { kind: 'transfer', from: 'target', to: 'self', resource: 'vitality' }],
		['suppress', { kind: 'suppress', aspect: 'reactions' }],
	])('%s reads as an attack rather than as nothing', (_kind, effect) => {
		const reading = readAction(action({ effect }));
		expect(reading.role).toBe(EFFECT_ROLE.ATTACK);
		expect(reading.effectKind).toBe(_kind);
	});

	test('an effect kind the table has no rule for is unsupported, by name, never a strike', () => {
		const reading = readAction(action({
			effect: { kind: 'reveal', aspect: 'location' },
		}));
		expect(reading.role).toBe(EFFECT_ROLE.UNSUPPORTED);
		expect(reading.role).not.toBe(EFFECT_ROLE.ATTACK);
		expect(reading.unsupportedReason).toBeTruthy();
	});

	test('an attack that can only touch itself decides no world, so it is unsupported', () => {
		const reading = readAction(action({
			targeting: { relation: 'self', subjects: ['creature'] },
			spatial: { selectivity: 'selective' },
		}));
		expect(reading.role).toBe(EFFECT_ROLE.UNSUPPORTED);
	});

	test('range is read, graded, and absent for a body-centered act', () => {
		expect(readAction(action({ spatial: { selectivity: 'selective', range: 'medium' } })).reach)
			.toBe(REACH_BY_RANGE.medium);
		expect(readAction(action({ spatial: { selectivity: 'selective', range: 'long' } })).reach)
			.toBe(REACH_BY_RANGE.long);
		const centered = readAction(action({
			targeting: { relation: 'self', subjects: ['creature'] },
			spatial: { selectivity: 'selective' },
			effect: { kind: 'protect', method: 'bracing', against: 'harm', recipient: 'self' },
		}));
		expect(centered.range).toBe(null);
		expect(centered.reach).toBe(0);
	});

	test('delivery decides which attribute powers an attack (pass 2 jobs, read from the record)', () => {
		expect(readAction(action()).governingAttribute).toBe('strength');
		expect(readAction(action({ delivery: { mode: 'projectile', approach: 'stationary' } })).governingAttribute)
			.toBe('intelligence');
		// a presence is powered by charisma elsewhere, so it names no attacking attribute
		expect(governingAttributeFor(EFFECT_ROLE.SHIELD, 'contact')).toBe(null);
	});

	test('a schema 1 record still opens, through its legacy key', () => {
		const legacy = readAction({ name: 'Old Hit', action: 'burst', instrument: 'body', medium: 'fire', intensity: 40 });
		expect(legacy.role).toBe(EFFECT_ROLE.ATTACK);
		expect(legacy.area).toBe(true);
		expect(readAction({ name: 'Old Ward', action: 'ward', intensity: 40 }).role).toBe(EFFECT_ROLE.SHIELD);
	});
});

describe('readRecord: whether the table can field the creature', () => {
	const recordWith = (actions: any[]) => ({
		id: 'x', species: 'test', schemaVersion: '4.0.0',
		signature: { kind: 'action', key: actions[0]?.key || 'none' },
		actions, passives: [],
	} as any);

	test('a creature with one usable action is fieldable', () => {
		const reading = readRecord(recordWith([action()]));
		expect(reading.fieldable).toBe(true);
		expect(reading.hasAttack).toBe(true);
		expect(reading.unsupportedReasons).toEqual([]);
	});

	test('a creature whose every action is unsupported is NOT fieldable, and says why', () => {
		const reading = readRecord(recordWith([
			action({ key: 'a', name: 'Shows Things', effect: { kind: 'reveal', aspect: 'intent' } }),
			action({ key: 'b', name: 'Clears Things', effect: { kind: 'remove', methods: ['cleansing'] } }),
		]));
		expect(reading.fieldable).toBe(false);
		expect(reading.usable).toEqual([]);
		expect(reading.unsupportedReasons).toHaveLength(2);
		expect(reading.unsupportedReasons[0]).toContain('Shows Things');
	});

	test('an unsupported action is dropped, not counted, while the rest still play', () => {
		const reading = readRecord(recordWith([
			action({ key: 'a', name: 'Real Hit' }),
			action({ key: 'b', name: 'Unreadable', effect: { kind: 'status', status: 'burning', removable: ['cooling'] } }),
		]));
		expect(reading.fieldable).toBe(true);
		expect(reading.usable).toHaveLength(1);
		expect(reading.usable[0].name).toBe('Real Hit');
		expect(reading.unsupportedReasons).toHaveLength(1);
	});

	test('reach is the furthest any usable action reaches', () => {
		const reading = readRecord(recordWith([
			action({ key: 'a', spatial: { selectivity: 'selective', range: 'contact' } }),
			action({ key: 'b', spatial: { selectivity: 'selective', range: 'medium' } }),
		]));
		expect(reading.reach).toBe(REACH_BY_RANGE.medium);
	});
});

/*
	Pass 8 regression. Reading `spatial.area` to decide what sweeps is right, but it must be
	applied to ATTACKS only: 104 of the pool's protect actions carry an area footprint (a
	barrier thrown over everyone standing here), and reading area alone picked one of those
	as the creature's one blow. Measured before the fix: 13 of 268 attacking creatures threw
	a shield as their attack.
*/
describe(`pass 8: an area shield is never a creature's attack`, () => {
	test('a protect action with an area footprint is a shield, not a sweep', () => {
		const areaShield = readAction(action({
			effect: { kind: 'protect', method: 'barrier', against: 'harm' },
			spatial: {
				selectivity: 'indiscriminate',
				range: 'short',
				area: { shape: 'radial', extent: 'medium', anchor: 'point' },
			},
		}));
		expect(areaShield.role).toBe(EFFECT_ROLE.SHIELD);
		expect(areaShield.area).toBe(true);
		// it carries an area, so anything choosing a sweep by area alone would pick it
		expect(areaShield.role).not.toBe(EFFECT_ROLE.ATTACK);
	});
});
