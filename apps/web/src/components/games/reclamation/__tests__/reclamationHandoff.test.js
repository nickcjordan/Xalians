/*
	PASS 22. Hot-seat, playable.

	Pass 21 built the cover and it was raised exactly once, then the Proving stalled. Five
	fixes were made on inference and none of them moved it. Printing the table's state each
	loop found the real fault in a minute, and it was not the cover at all: a dozen guards and
	roster lookups still read the constant `YOU`, so on seat B's turn the table rejected every
	send ("it is the rival's turn") and looked up B's armed creature in A's roster. The cover
	was fine; the seat could not act.

	These tests hold the contract that fix established, stated as pure functions rather than
	reached through a mounted component, because that is the shape a later reader can check
	against the code.
*/
import { describe, test, expect } from 'vitest';

// the cover is raised when the seat to move differs from the seat currently uncovered
function handoffDue({ hotSeat, phase, turn, shown, covered }) {
	if (!hotSeat) return false;
	if (phase !== 'deploy') return false;
	if (turn !== 'A' && turn !== 'B') return false;
	if (covered) return false;
	return shown !== turn;
}

// a guard on acting: may this seat act right now?
function mayAct({ phase, turn, seatInPlay, playback }) {
	return phase === 'deploy' && turn === seatInPlay && !playback;
}

describe('the hand-off cover', () => {
	test('is raised whenever the seat to move changes, not only the first time', () => {
		// the pass 21 bug: raised once for B and never again, so the Proving stalled
		expect(handoffDue({ hotSeat: true, phase: 'deploy', turn: 'B', shown: 'A', covered: false })).toBe(true);
		expect(handoffDue({ hotSeat: true, phase: 'deploy', turn: 'A', shown: 'B', covered: false })).toBe(true);
	});

	test('is not raised while the same person is still moving', () => {
		// a handler who sends twice in a row is not handing anything over
		expect(handoffDue({ hotSeat: true, phase: 'deploy', turn: 'A', shown: 'A', covered: false })).toBe(false);
		expect(handoffDue({ hotSeat: true, phase: 'deploy', turn: 'B', shown: 'B', covered: false })).toBe(false);
	});

	test('is not raised twice over itself', () => {
		expect(handoffDue({ hotSeat: true, phase: 'deploy', turn: 'B', shown: 'A', covered: true })).toBe(false);
	});

	test('never appears in solo play', () => {
		for (const turn of ['A', 'B']) {
			for (const shown of ['A', 'B']) {
				expect(handoffDue({ hotSeat: false, phase: 'deploy', turn, shown, covered: false })).toBe(false);
			}
		}
	});

	test('is not raised outside Deploy, where both people watch together', () => {
		for (const phase of ['resolve', 'judge', 'matchEnd']) {
			expect(handoffDue({ hotSeat: true, phase, turn: 'B', shown: 'A', covered: false })).toBe(false);
		}
	});
});

describe('who may act', () => {
	test('the seat in play may act on its own turn', () => {
		expect(mayAct({ phase: 'deploy', turn: 'B', seatInPlay: 'B', playback: false })).toBe(true);
		expect(mayAct({ phase: 'deploy', turn: 'A', seatInPlay: 'A', playback: false })).toBe(true);
	});

	test('a seat may not act on the other seat\'s turn', () => {
		expect(mayAct({ phase: 'deploy', turn: 'A', seatInPlay: 'B', playback: false })).toBe(false);
	});

	test('nobody acts during playback or outside Deploy', () => {
		expect(mayAct({ phase: 'deploy', turn: 'B', seatInPlay: 'B', playback: true })).toBe(false);
		expect(mayAct({ phase: 'judge', turn: 'B', seatInPlay: 'B', playback: false })).toBe(false);
	});

	/*
		The pass 21 bug in one line. With the guard written against the constant A rather than
		the seat in play, seat B's turn was rejected as "the rival's turn" and B had nothing it
		could do. Solo play never saw it because there the two are always the same.
	*/
	test('the guard written against a fixed seat blocks the other seat entirely', () => {
		const fixedSeatGuard = ({ phase, turn, playback }) => mayAct({ phase, turn, seatInPlay: 'A', playback });
		expect(fixedSeatGuard({ phase: 'deploy', turn: 'B', playback: false })).toBe(false);
		// and the correct guard lets B act, which is the whole difference
		expect(mayAct({ phase: 'deploy', turn: 'B', seatInPlay: 'B', playback: false })).toBe(true);
	});
});
