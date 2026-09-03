import { buildCard, isRowEligible, printedPower, bareBodyPower } from '../tributeCardBuilder.js';
import { ROW } from '../tributeInterpretation.js';

/*
	Card derivation coverage: printed(ability) = max(1, round((intensity / 10) * (0.5 + governingAttr / 100))),
	the bare-body Close fallback, and row eligibility, per docs/design/tribute-design.md
	("Card derivation: how a creature becomes a card").
*/

function record(overrides = {}) {
	return {
		id: 'xal_test_0001',
		species: 'testling',
		provenance: { serial: 1 },
		attributes: {
			strength: 50, vitality: 50, endurance: 50, agility: 50, reflex: 50,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 50,
		},
		element: { primary: 'fire', affinities: { fire: 100 } },
		archetype: { key: 'stalwart', favors: [] },
		abilities: [],
		...overrides,
	};
}

describe('printedPower / bareBodyPower formulas', () => {
	test('neutral attribute (50) gives the 0.5 + 50/100 = 1.0x baseline', () => {
		// intensity 74, attribute 50 -> (74/10) * 1.0 = 7.4 -> round -> 7
		expect(printedPower(74, 50)).toBe(7);
	});

	test('attribute 100 gives 1.5x', () => {
		// intensity 74, attribute 100 -> (74/10) * 1.5 = 11.1 -> round -> 11
		expect(printedPower(74, 100)).toBe(11);
	});

	test('attribute 0 gives 0.5x', () => {
		// intensity 74, attribute 0 -> (74/10) * 0.5 = 3.7 -> round -> 4
		expect(printedPower(74, 0)).toBe(4);
	});

	test('is floored at 1 even for a very weak ability', () => {
		// intensity 1, attribute 0 -> (1/10) * 0.5 = 0.05 -> round -> 0 -> max(1, 0) -> 1
		expect(printedPower(1, 0)).toBe(1);
	});

	test('missing governing attribute value defaults to neutral 50', () => {
		expect(printedPower(74, undefined)).toBe(printedPower(74, 50));
	});

	test('bare-body fallback: virtual intensity-30 effort governed by strength', () => {
		// strength 74 (graviclaw's own value) -> (30/10) * (0.5 + 74/100) = 3 * 1.24 = 3.72 -> round -> 4
		expect(bareBodyPower(74)).toBe(4);
	});

	test('bare-body fallback lands in the deliberately weak 1-5 band across the attribute range', () => {
		for (let strength = 0; strength <= 100; strength += 5) {
			const power = bareBodyPower(strength);
			expect(power).toBeGreaterThanOrEqual(1);
			expect(power).toBeLessThanOrEqual(5);
		}
	});
});

describe('buildCard: worked numeric examples', () => {
	test('the sample Graviclaw record (docs/design/sample-record-graviclaw.json)', () => {
		// Graviclaw: pincers/crush (Wraith Vise, intensity 48, strength-governed) is its only
		// contact-class ability -> Close uses it, not the bare-body fallback.
		// snare (Point of No Return, signature, intensity 74) and snare (Null Grasp, intensity 33)
		// are both Mid (reach); ward (Event Horizon) grants no row on its own.
		const graviclaw = record({
			attributes: {
				strength: 74, vitality: 61, endurance: 65, agility: 14, reflex: 38,
				intelligence: 42, willpower: 78, instinct: 71, charisma: 19, resilience: 93,
			},
			element: { primary: 'dark', affinities: { dark: 100, ghost: 44 } },
			abilities: [
				{ name: 'Point of No Return', signature: true, instrument: 'pincers', action: 'snare', medium: 'dark', intensity: 74 },
				{ name: 'Wraith Vise', signature: false, instrument: 'pincers', action: 'crush', medium: 'ghost', intensity: 48 },
				{ name: 'Null Grasp', signature: false, instrument: 'mind', action: 'snare', medium: 'dark', intensity: 33 },
				{ name: 'Event Horizon', signature: false, instrument: 'pincers', action: 'ward', medium: 'dark', intensity: 41 },
			],
		});

		const card = buildCard(graviclaw);

		// crush -> strength (74): (48/10) * (0.5 + 74/100) = 4.8 * 1.24 = 5.952 -> round -> 6
		expect(card.powerByRow[ROW.CLOSE]).toBe(6);

		// snare -> reflex (38). Point of No Return: (74/10)*(0.5+0.38)=7.4*0.88=6.512->7
		// Null Grasp: (33/10)*(0.5+0.38)=3.3*0.88=2.904->3. Best of the two Mid abilities is 7.
		expect(card.powerByRow[ROW.MID]).toBe(7);

		// ward grants no row and Graviclaw has no Far-class ability
		expect(card.eligibleRows).toEqual([ROW.CLOSE, ROW.MID]);
		expect(card.powerByRow[ROW.FAR]).toBeUndefined();

		expect(card.element).toEqual({ primary: 'dark', affinities: { dark: 100, ghost: 44 } });
	});

	test('bare-body Close fallback: a creature with no contact-class ability still fields at Close', () => {
		const midOnly = record({
			attributes: { strength: 80, vitality: 50, endurance: 50, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 50 },
			abilities: [
				{ name: 'Lash Out', signature: false, instrument: 'tendrils', action: 'lash', medium: 'plant', intensity: 60 },
			],
		});
		const card = buildCard(midOnly);
		expect(card.eligibleRows).toEqual(expect.arrayContaining([ROW.CLOSE, ROW.MID]));
		// bare body governed by strength 80: 3 * (0.5 + 0.8) = 3 * 1.3 = 3.9 -> round -> 4
		expect(card.powerByRow[ROW.CLOSE]).toBe(4);
	});

	test('support-only creature: still Close-eligible via bare body, and gains no Mid/Far row', () => {
		const supportOnly = record({
			attributes: { strength: 20, vitality: 50, endurance: 50, agility: 50, reflex: 50, intelligence: 50, willpower: 90, instinct: 50, charisma: 50, resilience: 50 },
			abilities: [
				{ name: 'Barrier', signature: false, instrument: 'core', action: 'ward', medium: 'metal', intensity: 90 },
				{ name: 'Patch', signature: false, instrument: 'mind', action: 'mend', medium: 'metal', intensity: 40 },
			],
		});
		const card = buildCard(supportOnly);
		expect(card.eligibleRows).toEqual([ROW.CLOSE]);
		expect(card.powerByRow[ROW.MID]).toBeUndefined();
		expect(card.powerByRow[ROW.FAR]).toBeUndefined();
		// bare body governed by strength 20 (weak): 3 * (0.5 + 0.2) = 2.1 -> round -> 2
		expect(card.powerByRow[ROW.CLOSE]).toBe(2);
	});

	test('a multi-row creature earns Close + Mid + Far from real abilities', () => {
		const versatile = record({
			abilities: [
				{ name: 'Strike', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 50 },
				{ name: 'Lash', signature: false, instrument: 'tail', action: 'lash', medium: 'fire', intensity: 50 },
				{ name: 'Burst', signature: false, instrument: 'vents', action: 'burst', medium: 'fire', intensity: 50 },
			],
		});
		const card = buildCard(versatile);
		expect(card.eligibleRows).toEqual([ROW.CLOSE, ROW.MID, ROW.FAR]);
	});

	test('signature abilities are included in the row/power search', () => {
		const signatureOnly = record({
			abilities: [
				{ name: 'Big Beam', signature: true, instrument: 'gaze', action: 'beam', medium: 'fire', intensity: 100 },
			],
		});
		const card = buildCard(signatureOnly);
		expect(card.eligibleRows).toEqual(expect.arrayContaining([ROW.FAR]));
		expect(card.powerByRow[ROW.FAR]).toBeGreaterThan(0);
	});

	test('isRowEligible reflects eligibleRows', () => {
		const card = buildCard(record());
		expect(isRowEligible(card, ROW.CLOSE)).toBe(true);
		expect(isRowEligible(card, ROW.FAR)).toBe(false);
	});

	test('card values land within the 1-15 range described by the design doc for a single ability', () => {
		const maxed = record({
			attributes: { strength: 100, vitality: 50, endurance: 50, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 50 },
			abilities: [{ name: 'Max', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 100 }],
		});
		const card = buildCard(maxed);
		expect(card.powerByRow[ROW.CLOSE]).toBeLessThanOrEqual(15);
		expect(card.powerByRow[ROW.CLOSE]).toBeGreaterThanOrEqual(1);
	});

	test('throws a TypeError for a non-record input', () => {
		expect(() => buildCard(null)).toThrow(TypeError);
		expect(() => buildCard(undefined)).toThrow(TypeError);
	});
});
