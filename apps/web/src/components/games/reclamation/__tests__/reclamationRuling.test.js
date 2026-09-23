import { describe, it, expect } from 'vitest';
import { verdictOf, rulingLine } from '../reclamationNarration';

const r = (winner, holdA, holdB, a = 1, b = 1) => ({
	winner, holdA, holdB, entries: { A: new Array(a).fill({}), B: new Array(b).fill({}) },
});

describe('verdictOf (pass 49: the stamp says why)', () => {
	it('names an unanswered world as unopposed', () => {
		expect(verdictOf(r('B', 0, 13, 0, 1), 'A', 'Saiphus').text).toBe('rival’s, unopposed');
		expect(verdictOf(r('A', 22, 0, 1, 0), 'A', 'Stonera').text).toBe('yours, unopposed');
	});
	it('does not call a world unopposed when its defenders were sent and all fell', () => {
		// the judge's entries leave out the downed; who was there at the start of the Clash decides
		expect(verdictOf(r('A', 37, 0, 4, 0), 'A', 'Endessa', { A: 4, B: 1 }).text).toBe('yours by 37');
		expect(verdictOf(r('A', 37, 0, 4, 0), 'A', 'Endessa', { A: 4, B: 0 }).text).toBe('yours, unopposed');
	});
	it('gives a contested world its margin, and a tie its word', () => {
		expect(verdictOf(r('A', 46.2, 0.4), 'A', 'Endessa').text).toBe('yours by 46');
		expect(verdictOf(r('B', 6, 6.3), 'A', 'Zolton').text).toBe('rival’s by 0.3');
		// pass 50: the margin of the printed numbers (9 to 6 reads "by 3", not the 2.2 underneath)
		expect(verdictOf(r('A', 8.6, 6.4), 'A', 'Krystos').text).toBe('yours by 3');
		expect(verdictOf(r(null, 5, 5), 'A', 'Floria').text).toBe('tied');
	});
});

describe('rulingLine', () => {
	it('says the round world by world, grouping the free ones', () => {
		const v = [
			verdictOf(r('A', 46, 0), 'A', 'Endessa'),
			verdictOf(r('B', 0, 13, 0, 1), 'A', 'Saiphus'),
			verdictOf(r('B', 0, 13, 0, 1), 'A', 'Luminax'),
		];
		expect(rulingLine(1, v)).toBe('Round 2: Endessa yours by 46; Saiphus and Luminax the rival’s, unopposed.');
	});
	it('falls back when nothing was ruled', () => {
		expect(rulingLine(0, [])).toBe('Round 1 is ruled.');
	});
});
