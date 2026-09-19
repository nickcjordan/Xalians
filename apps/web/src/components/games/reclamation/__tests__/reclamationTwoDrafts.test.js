/*
	PASS 23. The two-stage draft in hot-seat.

	Solo play drafts once: the handler keeps twelve from pool A and the rival keeps its own
	twelve from pool B by its habit. Hot-seat has two people, so both keep their own twelve,
	with a cover between them - a squad seen in advance is information the game does not mean
	either handler to have, the same reason the board is covered between turns.

	These tests state the draft's staging as pure functions, which is the shape a later reader
	can check the page against.
*/
import { describe, test, expect } from 'vitest';

// which pool the handler currently keeping is choosing from
const poolFor = (draft) => (draft.side === 'B' ? draft.poolB : draft.poolA);

// what a confirm does: hand over, or start the Proving
function onConfirm({ hotSeat, side }) {
	if (hotSeat && side === 'A') return 'hand-over';
	return 'start';
}

// who fills seat B's roster
function rosterBSource({ hotSeat, side }) {
	return hotSeat && side === 'B' ? 'the second handler' : 'the bot';
}

describe('the draft in hot-seat', () => {
	test('each handler keeps from their own pool', () => {
		const draft = { poolA: ['a1', 'a2'], poolB: ['b1', 'b2'], side: 'A' };
		expect(poolFor(draft)).toEqual(['a1', 'a2']);
		expect(poolFor({ ...draft, side: 'B' })).toEqual(['b1', 'b2']);
	});

	test('the first handler\'s confirm hands over rather than starting the Proving', () => {
		expect(onConfirm({ hotSeat: true, side: 'A' })).toBe('hand-over');
		expect(onConfirm({ hotSeat: true, side: 'B' })).toBe('start');
	});

	test('solo play still drafts once and starts', () => {
		// the regression that matters: nothing about the solo draft may change
		expect(onConfirm({ hotSeat: false, side: 'A' })).toBe('start');
		expect(rosterBSource({ hotSeat: false, side: 'A' })).toBe('the bot');
	});

	test('the second squad comes from the second person, not the bot', () => {
		expect(rosterBSource({ hotSeat: true, side: 'B' })).toBe('the second handler');
	});

	/*
		The first handler's twelve has to survive the second handler's draft. `keepIds` is
		reused for whoever is keeping now, so A's choice is parked in `keptA` at the hand-over
		and read back at the confirm; without that the second handler's keep would be used for
		both rosters.
	*/
	test('the first handler\'s keep survives the second handler\'s draft', () => {
		const handOver = (draft) => ({ ...draft, keptA: draft.keepIds.slice(), keepIds: [], side: 'B' });
		const after = handOver({ side: 'A', keepIds: ['a1', 'a2', 'a3'], keptA: null });
		expect(after.keptA).toEqual(['a1', 'a2', 'a3']);
		// and the second handler starts from an empty keep, not the first handler's
		expect(after.keepIds).toEqual([]);

		const finalA = after.side === 'B' ? after.keptA : after.keepIds;
		expect(finalA).toEqual(['a1', 'a2', 'a3']);
	});
});
