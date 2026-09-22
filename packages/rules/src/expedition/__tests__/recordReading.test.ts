/*
	Pass 7: the game reads the record's own fields (primary effect, area, range, delivery,
	targeting) instead of projecting each action onto one of sixteen legacy action keys.
	These tests pin the reading itself, so the day the platform-side redesign moves a field
	they fail here, in one place, rather than somewhere in the middle of a Clash.
*/
import { describe, test, expect } from 'vitest';
import { readAction, readRecord, EFFECT_ROLE, governingAttributeFor, REACH_BY_RANGE } from '../recordReading.ts';

/*
	A SCHEMA 5 action, spelled the way the frozen release spells one.

	The differences from schema 4 that this file used to assert on: effects carry `type`
	rather than `kind`, there is no `emphasis` because schema 5 retired primary/secondary
	ordering, `targeting` is a list of permitted selections rather than a scalar relation,
	and intensity lives on the effect rather than on the ability.
*/
function action(overrides: any = {}) {
	const { effect, ...rest } = overrides;
	return {
		key: 'test-act',
		name: 'Test Act',
		instrument: 'fists',
		medium: 'fire',
		activation: { continuity: 'discrete' },
		timing: { preparation: 'immediate', recovery: 'brief' },
		delivery: { mode: 'contact', approach: 'stationary' },
		spatial: { range: 'contact' },
		targeting: ['other'],
		effects: [{
			key: 'outcome', type: 'harm', mechanism: 'impact', recipient: 'target', intensity: 50,
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
			spatial: { range: 'short', area: { shape: 'radial', extent: 'medium', anchor: 'self', persistence: 'resolved' } },
		}));
		expect(wide.role).toBe(EFFECT_ROLE.ATTACK);
		expect(wide.area).toBe(true);
	});

	test('protect is a shield and restore is a mend', () => {
		expect(readAction(action({ effect: { type: 'protect', intensity: 40 } })).role)
			.toBe(EFFECT_ROLE.SHIELD);
		expect(readAction(action({ effect: { type: 'restore', intensity: 40 } })).role)
			.toBe(EFFECT_ROLE.MEND);
	});

	/*
		The four kinds pass 7 brought in from the cold. Before this pass the legacy projection
		turned them into snare/shove/drain/terrorize and the game read those as plain damage
		or as nothing; 431 of 1384 actions in the seed-7 pool carry one of them.
	*/
	test.each([
		['harm', { type: 'harm', mechanism: 'cutting', intensity: 40 }],
		['displace', { type: 'displace', direction: 'away', intensity: 40 }],
	])('%s reads as an attack', (_type, effect) => {
		const reading = readAction(action({ effect }));
		expect(reading.role).toBe(EFFECT_ROLE.ATTACK);
		expect(reading.effectKind).toBe(_type);
	});

	/*
		SCHEMA 5 RETIRED transfer, restrain and suppress AS EFFECT TYPES. The model states
		that restraining is `status: restrained` and draining is harm plus a dependent
		restoration, so the open item that tracked those three reading as plain attacks is
		dissolved rather than implemented. What matters now is that a status is named when
		the table cannot carry it, so a player is told WHICH condition their creature
		applies rather than being told a generic no.
	*/
	/*
		PASS 32 INVERTED THIS TEST. It used to assert that a status was UNSUPPORTED and that
		the reason named it, which was true while the frame carried no conditions. The status
		layer makes the frame carry exactly that, so a status-only act is now an AFFLICT and
		the assertion is that it reads the status rather than refusing it.
	*/
	test('a status-only action is an afflict, and carries what it applies', () => {
		const reading = readAction(action({
			effect: {
				type: 'status', status: 'restrained', removable: ['freeing'],
				persistence: 'lingering', duration: 'brief',
			},
		}));
		expect(reading.role).toBe(EFFECT_ROLE.AFFLICT);
		expect(reading.unsupportedReason).toBeUndefined();
		expect(reading.statusEffects).toEqual([{
			status: 'restrained', concept: 'held', recipient: 'target',
			persistence: 'lingering', duration: 'brief', removable: ['freeing'], rounds: 1,
		}]);
	});

	test('a removal is still unsupported, and says so', () => {
		// the pool has 14 remove-only actions against 267 status-only ones; clearing a
		// condition is the smaller half of the work and is deliberately not guessed at
		const reading = readAction(action({ effect: { type: 'remove', methods: ['cleansing'] } }));
		expect(reading.role).toBe(EFFECT_ROLE.UNSUPPORTED);
		expect(reading.unsupportedReason).toContain('clears a condition');
	});

	test('an action is judged by every effect it carries, not by a privileged one', () => {
		// schema 5 states that effect order carries no execution priority, so an action
		// whose FIRST effect is a status it cannot carry is still an attack when it harms
		const reading = readAction(action({
			effects: [
				{
					key: 'condition', type: 'status', status: 'chilled', removable: ['warming'],
					recipient: 'target', onset: 'instant', persistence: 'lingering',
					duration: 'brief', likelihood: 'consistent',
				},
				{
					key: 'blow', type: 'harm', mechanism: 'elemental', intensity: 40,
					recipient: 'target', onset: 'instant', persistence: 'resolved', likelihood: 'consistent',
				},
			],
		}));
		expect(reading.role).toBe(EFFECT_ROLE.ATTACK);
		expect(reading.harmMechanism).toBe('elemental');
	});

	test('the blow size is read off the effect, where schema 5 states it', () => {
		expect(readAction(action({ effect: { type: 'harm', mechanism: 'impact', intensity: 72 } })).intensity)
			.toBe(72);
		// an authored band reads as its midpoint
		expect(readAction(action({ effect: { type: 'harm', mechanism: 'impact', intensity: { min: 30, max: 50 } } })).intensity)
			.toBe(40);
	});

	test('an effect kind the table has no rule for is unsupported, by name, never a strike', () => {
		const reading = readAction(action({
			effect: { type: 'remove', methods: ['cooling'] },
		}));
		expect(reading.role).toBe(EFFECT_ROLE.UNSUPPORTED);
		expect(reading.role).not.toBe(EFFECT_ROLE.ATTACK);
		expect(reading.unsupportedReason).toBeTruthy();
	});

	test('an attack that can only touch itself decides no world, so it is unsupported', () => {
		const reading = readAction(action({
			targeting: ['self'],
			spatial: {},
		}));
		expect(reading.role).toBe(EFFECT_ROLE.UNSUPPORTED);
	});

	test('range is read, graded, and absent for a body-centered act', () => {
		expect(readAction(action({ spatial: { range: 'medium' } })).reach)
			.toBe(REACH_BY_RANGE.medium);
		expect(readAction(action({ spatial: { range: 'long' } })).reach)
			.toBe(REACH_BY_RANGE.long);
		const centered = readAction(action({
			targeting: ['self'],
			spatial: {},
			effect: { type: 'protect', intensity: 40, recipient: 'self' },
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
		// schema 5 spells it `type`; the seam reads the record's own declaration
		signature: { type: 'action', key: actions[0]?.key || 'none' },
		actions, passives: [],
	} as any);

	test('a creature with one usable action is fieldable', () => {
		const reading = readRecord(recordWith([action()]));
		expect(reading.fieldable).toBe(true);
		expect(reading.hasAttack).toBe(true);
		expect(reading.unsupportedReasons).toEqual([]);
	});

	test('a creature whose every action is unsupported is NOT fieldable, and says why', () => {
		// both actions are removals, since pass 32 made statuses fieldable
		const reading = readRecord(recordWith([
			action({ key: 'a', name: 'Clears Things', effect: { type: 'remove', methods: ['cleansing'] } }),
			action({ key: 'b', name: 'Clears More', effect: { type: 'remove', methods: ['detoxifying'] } }),
		]));
		expect(reading.fieldable).toBe(false);
		expect(reading.usable).toEqual([]);
		expect(reading.unsupportedReasons).toHaveLength(2);
		expect(reading.unsupportedReasons[0]).toContain('Clears Things');
	});

	/*
		PASS 32's headline measurement, as a test. Before the status layer this creature was
		unfieldable: entrancement was its only act and the frame could not carry it. Hypnopet
		was 10 of 10 unfieldable in the seed-7 pool for exactly this reason.
	*/
	test('a creature whose only act applies a status is fieldable', () => {
		const reading = readRecord(recordWith([
			action({ key: 'a', name: 'Rapt Gaze', effect: { type: 'status', status: 'entranced', removable: ['disrupting'], persistence: 'lingering', duration: 'brief' } }),
		]));
		expect(reading.fieldable).toBe(true);
		expect(reading.usable).toHaveLength(1);
		expect(reading.unsupportedReasons).toEqual([]);
	});

	test('an unsupported action is dropped, not counted, while the rest still play', () => {
		const reading = readRecord(recordWith([
			action({ key: 'a', name: 'Real Hit' }),
			action({ key: 'b', name: 'Unreadable', effect: { type: 'remove', methods: ['cleansing'] } }),
		]));
		expect(reading.fieldable).toBe(true);
		expect(reading.usable).toHaveLength(1);
		expect(reading.usable[0].name).toBe('Real Hit');
		expect(reading.unsupportedReasons).toHaveLength(1);
	});

	test('reach is the furthest any usable action reaches', () => {
		const reading = readRecord(recordWith([
			action({ key: 'a', spatial: { range: 'contact' } }),
			action({ key: 'b', spatial: { range: 'medium' } }),
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
			effect: { type: 'protect', intensity: 40 },
			spatial: {
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
