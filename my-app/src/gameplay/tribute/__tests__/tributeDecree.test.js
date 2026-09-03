import { softened, conditionMultiplier, decreeContribution } from '../decreeCalculator.js';
import { typeEffectivenessMultiplier, TYPE_EFFECTIVENESS_MATRIX } from '../tributeInterpretation.js';

/*
	Court Decree math coverage, per docs/design/tribute-design.md ("Decrees (the weather
	layer)"):

		softened(m) = (m == 0) ? 0.25 : m
		multiplier  = (100 * softened(m_primary) + grade * softened(m_secondary)) / (100 + grade)
		contribution = max(1, round(printed * multiplier))

	Orientation: the CREATURE is the attacker and the DECREE's element is the defender
	("multiplied by its element matchup against the Decree's element"), so
	m = matrix[creature][decree]. The pair-finding helpers below search the live matrix so
	the tests track the data rather than a hand-copied snapshot of it.
*/

const ELEMENTS = Object.keys(TYPE_EFFECTIVENESS_MATRIX);

// first (creature, decree) pair in the live matrix with matrix[creature][decree] === target
function findPair(target) {
	for (const creature of ELEMENTS) {
		for (const decree of ELEMENTS) {
			if (TYPE_EFFECTIVENESS_MATRIX[creature][decree] === target) {
				return { creature, decree };
			}
		}
	}
	return null;
}

// a creature element (other than `exclude`) whose matchup against `decree` is `target`
function findCreatureAgainst(decree, target, exclude) {
	return ELEMENTS.find((creature) => creature !== exclude && TYPE_EFFECTIVENESS_MATRIX[creature][decree] === target) || null;
}

function mono(primary) {
	return { primary, affinities: { [primary]: 100 } };
}

describe('softened()', () => {
	test('softens a full immunity (0x) to one-quarter power', () => {
		expect(softened(0)).toBe(0.25);
	});
	test('passes every non-zero multiplier through unchanged', () => {
		[0.5, 1, 1.5, 2].forEach((m) => expect(softened(m)).toBe(m));
	});
});

describe('orientation: the creature fights through the weather', () => {
	test('a creature whose element is strong against the decree element is boosted', () => {
		// water beats fire in the chart, so a Water creature under a Fire decree is boosted,
		// and a Fire creature under a Water decree is not
		expect(typeEffectivenessMultiplier('water', 'fire')).toBeGreaterThan(1);
		expect(conditionMultiplier('fire', mono('water'))).toBeGreaterThan(1);
		expect(conditionMultiplier('water', mono('fire'))).toBeLessThan(1);
	});

	test('the matrix pair is read as [creature][decree], never [decree][creature]', () => {
		// find an asymmetric pair so the two orientations disagree
		const pair = ELEMENTS.flatMap((a) => ELEMENTS.map((b) => ({ a, b })))
			.find(({ a, b }) => TYPE_EFFECTIVENESS_MATRIX[a][b] !== TYPE_EFFECTIVENESS_MATRIX[b][a]);
		expect(pair).toBeDefined();
		const expected = softened(TYPE_EFFECTIVENESS_MATRIX[pair.a][pair.b]);
		expect(conditionMultiplier(pair.b, mono(pair.a))).toBeCloseTo(expected, 6);
	});
});

describe('conditionMultiplier: mono-typed creatures', () => {
	test('a creature whose element does nothing to the decree element resolves to the softened 0.25, not 0', () => {
		const pair = findPair(0);
		expect(pair).not.toBeNull();
		expect(conditionMultiplier(pair.decree, mono(pair.creature))).toBeCloseTo(0.25, 6);
	});

	test('a neutral (1x) matchup passes through unchanged', () => {
		const pair = findPair(1);
		expect(pair).not.toBeNull();
		expect(conditionMultiplier(pair.decree, mono(pair.creature))).toBeCloseTo(1, 6);
	});

	test('an unknown decree element is neutral rather than an error', () => {
		expect(conditionMultiplier('weather-that-does-not-exist', mono('fire'))).toBeCloseTo(1, 6);
	});
});

describe('conditionMultiplier: graded secondary blend', () => {
	test('blends primary and secondary softened multipliers weighted by grade', () => {
		// primary is immune-class (0 -> 0.25 softened), secondary at grade 40 fights at 0.5x
		const pair = findPair(0);
		const secondary = findCreatureAgainst(pair.decree, 0.5, pair.creature);
		expect(secondary).not.toBeNull();
		const card = { primary: pair.creature, affinities: { [pair.creature]: 100, [secondary]: 40 } };
		const expected = (100 * 0.25 + 40 * 0.5) / 140;
		expect(conditionMultiplier(pair.decree, card)).toBeCloseTo(expected, 6);
	});

	test('grade 0 (no secondary) is identical to the mono-typed multiplier', () => {
		const pair = findPair(1.5);
		expect(pair).not.toBeNull();
		expect(conditionMultiplier(pair.decree, mono(pair.creature))).toBeCloseTo(1.5, 6);
	});

	test('the primary\'s own 100 entry in affinities is never treated as a secondary', () => {
		const pair = findPair(2);
		const withExplicitPrimary = { primary: pair.creature, affinities: { [pair.creature]: 100 } };
		expect(conditionMultiplier(pair.decree, withExplicitPrimary)).toBeCloseTo(2, 6);
	});
});

describe('the never-worse-than-mono-typed invariant', () => {
	test('a secondary that fares no worse than the primary never drags the blend below the mono-typed multiplier', () => {
		// Exhaustive over the live matrix: for every (decree, primary) pair and every possible
		// grade-50 secondary, the blend is at least the mono-typed value whenever the
		// secondary's own matchup is at least the primary's. (A secondary that fares WORSE is
		// allowed to drag the blend down: that is the design doc's deliberate hard counter.)
		const violations = [];
		ELEMENTS.forEach((decree) => {
			ELEMENTS.forEach((primary) => {
				const monoMultiplier = conditionMultiplier(decree, mono(primary));
				ELEMENTS.forEach((secondary) => {
					if (secondary === primary) {
						return;
					}
					const secondaryFaresNoWorse = TYPE_EFFECTIVENESS_MATRIX[secondary][decree] >= TYPE_EFFECTIVENESS_MATRIX[primary][decree];
					const card = { primary, affinities: { [primary]: 100, [secondary]: 50 } };
					const blended = conditionMultiplier(decree, card);
					if (secondaryFaresNoWorse && blended < monoMultiplier - 1e-9) {
						violations.push({ decree, primary, secondary, blended, monoMultiplier });
					}
				});
			});
		});
		expect(violations).toEqual([]);
	});
});

describe('decreeContribution', () => {
	test('no active decree on the row: contribution is just the printed value (rounded, floored at 1)', () => {
		expect(decreeContribution(7, null, mono('fire'))).toBe(7);
		expect(decreeContribution(0.4, undefined, mono('fire'))).toBe(1);
	});

	test('applies the softened multiplier and floors the result at 1', () => {
		const pair = findPair(0);
		// printed 2, multiplier 0.25 -> 0.5 -> rounds to 1 (not 0, thanks to the floor)
		expect(decreeContribution(2, pair.decree, mono(pair.creature))).toBe(1);
	});

	test('a strong matchup (2x) doubles a mid-sized printed value', () => {
		const pair = findPair(2);
		expect(decreeContribution(6, pair.decree, mono(pair.creature))).toBe(12);
	});

	test('a top-scale card under its worst weather still counts for something', () => {
		const pair = findPair(0);
		// printed 15 x 0.25 = 3.75 -> 4: dramatic, never worthless
		expect(decreeContribution(15, pair.decree, mono(pair.creature))).toBe(4);
	});
});
