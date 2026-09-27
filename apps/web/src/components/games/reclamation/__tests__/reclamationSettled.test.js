import { describe, it, expect } from 'vitest';
import { settledWorlds, rivalPassedLine, budgetLine, nextRoundLine } from '../reclamationMatch';
import { reasonLines } from '../reclamationReasons';

/*
	PASS 63, SETTLED WORLDS AND THE SEND BUDGET (docs/design/reclamation-audit-2026-09-26.md,
	weaknesses 1 and 2). A blind critic, with the rival passed, sent three creatures into worlds
	already won by 20 or more; spent 8 of 11 sends in round one with the budget only a numeral in
	the top bar; and sat through a last round with no sends after a line that said only "The rival
	sends first".
*/

const sites = [
	{ id: 'a', world: { planet: 'Magmuth' } },
	{ id: 'b', world: { planet: 'Saiphus' } },
	{ id: 'c', world: { planet: 'Grimedes' } },
];
const standings = {
	a: { mine: 8, theirs: 0 },
	b: { mine: 36, theirs: 13 },
	c: { mine: 4, theirs: 10 },
};

describe('settledWorlds', () => {
	it('settles the worlds you lead once the rival has passed with nothing hidden', () => {
		expect(settledWorlds(standings, { rivalDone: true, rivalHidden: false, youDone: false })).toEqual({ a: 'mine', b: 'mine' });
	});

	it('settles nothing while the rival can still answer, or hides a creature', () => {
		expect(settledWorlds(standings, { rivalDone: false, rivalHidden: false, youDone: false })).toEqual({});
		expect(settledWorlds(standings, { rivalDone: true, rivalHidden: true, youDone: false })).toEqual({});
	});

	it('settles the worlds the rival leads once you are done', () => {
		expect(settledWorlds(standings, { rivalDone: false, rivalHidden: false, youDone: true })).toEqual({ c: 'theirs' });
	});

	it('leaves a level world open', () => {
		expect(settledWorlds({ a: { mine: 5, theirs: 5 } }, { rivalDone: true, rivalHidden: false, youDone: true })).toEqual({});
	});
});

describe('the words', () => {
	it('says what the rival\'s pass settles, world by world', () => {
		const settled = settledWorlds(standings, { rivalDone: true, rivalHidden: false, youDone: false });
		expect(rivalPassedLine(sites, standings, settled)).toBe('The rival has passed: Magmuth and Saiphus are yours as they stand; Grimedes is the rival\'s by 6.');
		const all = { a: { mine: 8, theirs: 0 }, b: { mine: 36, theirs: 0 }, c: { mine: 29, theirs: 0 } };
		expect(rivalPassedLine(sites, all, settledWorlds(all, { rivalDone: true, rivalHidden: false, youDone: false }))).toBe('The rival has passed: all 3 worlds are yours as they stand.');
		// when nothing this round can change, what a send would spend
		expect(rivalPassedLine(sites, all, settledWorlds(all, { rivalDone: true, rivalHidden: false, youDone: false }), { left: 5, toCome: 6 })).toBe('The rival has passed: all 3 worlds are yours as they stand. You have 5 sends for the 6 worlds to come.');
		expect(rivalPassedLine(sites, standings, settled, { left: 5, toCome: 6 })).toBe("The rival has passed: Magmuth and Saiphus are yours as they stand; Grimedes is the rival's by 6.");
	});

	it('says the send budget a send leaves, against the worlds still to come', () => {
		expect(budgetLine(8, 6)).toBe('After this send: 7 sends left for the 6 worlds still to come.');
		expect(budgetLine(2, 3)).toBe('After this send: 1 send left for the 3 worlds still to come.');
		expect(budgetLine(1, 3)).toBe('This is your last send: the 3 worlds still to come get none.');
		expect(budgetLine(3, 0)).toBe('After this send: 2 sends left.');
	});

	it('says under a Ruling when the next round has no sends of yours in it', () => {
		const next = [{ planet: 'Zolton' }, { planet: 'Krystos' }, { planet: 'Drainov' }];
		expect(nextRoundLine(next, { sendableCap: 11, sentCount: 11 }, { sitesWon: 4 }, 5, false)).toBe('Next: Zolton, Krystos, Drainov. You have no sends left, so the rival takes any of them it sends to, and it needs 1 to win.');
		expect(nextRoundLine(next, { sendableCap: 11, sentCount: 7 }, { sitesWon: 4 }, 5, true)).toBe('Next: Zolton, Krystos, Drainov. You send first.');
	});

	it('puts "already yours" first under a creature pointed at a settled world', () => {
		const lines = reasonLines({ why: { home: true }, record: { id: 'x', species: 'frackworm' }, site: { id: 'a', world: { planet: 'Endessa' } }, tolerance: {}, settled: { side: 'mine', lead: 25 } });
		expect(lines[0]).toMatchObject({ key: 'settled', effect: 'Already yours this round.', cause: 'The rival has passed and cannot answer here; you lead by 25.' });
		expect(lines[1].key).toBe('home');
	});
});
