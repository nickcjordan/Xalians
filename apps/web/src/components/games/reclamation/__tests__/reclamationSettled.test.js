import { describe, it, expect } from 'vitest';
import { budgetLine, nextRoundLine } from '../reclamationMatch';

/*
	PASS 63, SETTLED WORLDS AND THE SEND BUDGET (docs/design/reclamation-audit-2026-09-26.md,
	weaknesses 1 and 2). A blind critic, with the rival passed, sent three creatures into worlds
	already won by 20 or more; spent 8 of 11 sends in round one with the budget only a numeral in
	the top bar; and sat through a last round with no sends after a line that said only "The rival
	sends first".

	PASS 72 (docs/design/reclamation-placement-stacks.md) took the settled worlds away: "yours
	whatever is sent" was a Clash forecast, and while sends are made the table no longer plays
	the Clash ahead of time. The send budget stays.
*/

describe('the words', () => {
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
});
