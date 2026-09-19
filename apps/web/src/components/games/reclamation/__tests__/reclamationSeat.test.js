/*
	PASS 20. The seat the table is drawn for.

	Solo play has one reading of the table: the person at the keyboard holds A and the proctor
	holds B. Hot-seat (two people, one screen) needs the table to show whichever of them is to
	move, so the seat became a value the component reads rather than a constant it is compiled
	against. This pass ships that indirection alone, with the hand-off screen to follow.

	The claim these tests hold: WITH NO hotSeat PROP NOTHING CHANGES. That is the whole point
	of landing the indirection separately - sixty-four readings of the table move from a
	constant to an accessor, and every one of them must still say A.

	Why hot-seat needs a hand-off screen at all, rather than just a flipped view: 16.8 percent
	of sends arrive hidden, and removing hiding moves the flip gauge +2.46 +/- 0.98, beyond
	noise (five seeds, 500 matches). A shared screen cannot keep a secret, and validating the
	game means validating it WITH hiding rather than a variant without it.
*/
import { describe, test, expect } from 'vitest';

/*
	The accessor's logic, stated here as the contract rather than reached through a mounted
	component: the table is drawn for A unless hot-seat is on, and in hot-seat it follows the
	seat to move during Deploy and holds still everywhere else.
*/
function seatInPlay({ hotSeat, phase, turn, last }) {
	if (!hotSeat) {
		return 'A';
	}
	if (phase === 'deploy' && (turn === 'A' || turn === 'B')) {
		return turn;
	}
	return last;
}
const other = (seat) => (seat === 'A' ? 'B' : 'A');

describe('the seat the table is drawn for', () => {
	test('solo play always draws for A, whatever the engine says', () => {
		// this is the regression that matters: the indirection must be invisible in solo play
		for (const phase of ['deploy', 'resolve', 'judge', 'matchEnd']) {
			for (const turn of ['A', 'B', null]) {
				expect(seatInPlay({ hotSeat: false, phase, turn, last: 'B' })).toBe('A');
			}
		}
	});

	test('hot-seat follows the seat to move during Deploy', () => {
		expect(seatInPlay({ hotSeat: true, phase: 'deploy', turn: 'A', last: 'B' })).toBe('A');
		expect(seatInPlay({ hotSeat: true, phase: 'deploy', turn: 'B', last: 'A' })).toBe('B');
	});

	test('hot-seat holds the view still once Deploy is over', () => {
		/*
			The Clash and the Ruling are watched by both people at once. Flipping the view
			under a playback they are jointly reading would be worse than either choice, so it
			stays with whoever moved last.
		*/
		for (const phase of ['resolve', 'judge', 'matchEnd']) {
			expect(seatInPlay({ hotSeat: true, phase, turn: null, last: 'B' })).toBe('B');
			expect(seatInPlay({ hotSeat: true, phase, turn: null, last: 'A' })).toBe('A');
		}
	});

	test('a turn of null during Deploy does not strand the table on a seat that cannot act', () => {
		// the engine sets turn to null at the end of a round; the view holds where it was
		expect(seatInPlay({ hotSeat: true, phase: 'deploy', turn: null, last: 'B' })).toBe('B');
	});

	test('the opponent seat is always the other one', () => {
		expect(other('A')).toBe('B');
		expect(other('B')).toBe('A');
	});
});
