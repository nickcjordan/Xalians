/*
	PASS 26. The match arc, and a band that was measuring the wrong thing.

	"Matches decided after round 1 under 35 percent" is one of the fairness bands, and it has
	read 47 to 52 percent in EVERY version of the game ever measured: 47 at the base redesign,
	49 in the validation report, 49.3 today. A band no version has ever met is more likely
	mis-specified than a fault that survived twenty-five passes.

	What decidedRoundOf measures is LEAD CONTINUITY - did the winner ever surrender the lead -
	and with 80.6 percent of round-one scores at 2-1, "never fell behind or tied" is satisfied
	about half the time by construction. It says nothing about whether the outcome was in doubt.

	These tests pin the distinction, and pin the statistic that does measure the arc.
*/
import { describe, test, expect } from 'vitest';
import { decidedRoundOf } from '../devtools/expeditionValidation.ts';

describe('what decidedRoundOf actually measures', () => {
	test('a one-world lead held all match counts as decided after round 1', () => {
		/*
			The case that makes the reading about 50 percent: 2-1, 4-2, 6-3. The winner never
			fell behind, so this is "decided after round 1" - and yet the loser was one world
			from the clinch entering the last round, which is not a decided match.
		*/
		const held = [{ A: 2, B: 1 }, { A: 4, B: 2 }, { A: 6, B: 3 }];
		expect(decidedRoundOf(held, 'A')).toBe(1);
	});

	test('the same statistic calls a lead traded once "only at the end"', () => {
		// identical final margin, one tie along the way, and the reading flips entirely
		const traded = [{ A: 2, B: 1 }, { A: 3, B: 3 }, { A: 6, B: 3 }];
		expect(decidedRoundOf(traded, 'A')).toBe(null);
	});

	test('so the reading is about lead continuity, not about the outcome being in doubt', () => {
		// two matches with the SAME final score and the same last-round drama, read differently
		const a = [{ A: 2, B: 1 }, { A: 4, B: 2 }, { A: 5, B: 4 }];
		const b = [{ A: 1, B: 2 }, { A: 3, B: 3 }, { A: 5, B: 4 }];
		expect(decidedRoundOf(a, 'A')).toBe(1);
		expect(decidedRoundOf(b, 'A')).toBe(null);
	});

	test('a lead taken only at the final judge is never "decided" early', () => {
		const late = [{ A: 1, B: 2 }, { A: 2, B: 4 }, { A: 5, B: 4 }];
		expect(decidedRoundOf(late, 'A')).toBe(null);
	});

	test('no winner means no reading', () => {
		expect(decidedRoundOf([{ A: 1, B: 1 }], null)).toBe(null);
	});
});
