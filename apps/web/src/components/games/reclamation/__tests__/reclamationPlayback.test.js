import { describe, it, expect } from 'vitest';
import { playbackEffects, flashFor, stepWeight } from '../reclamationMatch';

/*
	The clash and the Ruling, told over a frozen board (docs/design/
	reclamation-base-redesign.md, Pass 2). The table replays the round event by event, so
	what the bulbs and the balance bar show at step N is exactly what these events say:
	an attack takes hold off, a downing takes the figure off the world, and a bolster's
	`recover` puts hold back before the Court reads the worlds (assumption 19).
*/
function frozenView() {
	return {
		frame: { sites: [{ id: 's1' }, { id: 's2' }] },
		board: {
			s1: {
				A: [{ recordId: 'a1', currentHold: 8, fullHold: 8, damage: 0 }],
				B: [
					{ recordId: 'b1', currentHold: 6, fullHold: 6, damage: 0 },
					{ recordId: 'b2', currentHold: 3, fullHold: 3, damage: 0, revealPending: true },
				],
			},
			s2: { A: [], B: [] },
		},
	};
}

const EVENTS = [
	{ type: 'attack', recordId: 'b2', role: 'strike', site: 's1', target: 'a1', power: 2.5, remaining: 5.5, outcome: 'hurt', hidden: true },
	{ type: 'attack', recordId: 'a1', role: 'strike', site: 's1', target: 'b1', power: 6, remaining: 0, outcome: 'downed' },
	{ type: 'recover', recordId: 'a1', site: 's1', bolster: 'a2', amount: 2.1, remaining: 7.6 },
];

describe('playbackEffects', () => {
	it('shows the board untouched before the first event is told', () => {
		const view = playbackEffects(frozenView(), EVENTS, 0);
		expect(view.board.s1.A[0].currentHold).toBe(8);
		expect(view.board.s1.B.map((e) => e.recordId)).toEqual(['b1']); // the hidden one is not revealed yet
		expect(view.hurt).toEqual({});
	});

	it('takes hold off what an attack hit, and reveals the hidden creature that threw it', () => {
		const view = playbackEffects(frozenView(), EVENTS, 1);
		expect(view.board.s1.A[0].currentHold).toBe(5.5);
		expect(view.board.s1.A[0].damage).toBe(2.5);
		expect(view.hurt.a1).toBe(true);
		expect(view.board.s1.B.map((e) => e.recordId)).toEqual(['b1', 'b2']);
	});

	it('takes a downed creature off the world', () => {
		const view = playbackEffects(frozenView(), EVENTS, 2);
		expect(view.board.s1.B.map((e) => e.recordId)).toEqual(['b2']);
	});

	// assumption 19: the Ruling's first step, told before the Court reads the worlds
	it('puts hold back when a bolster recovers, and drops the damage it gave back', () => {
		const view = playbackEffects(frozenView(), EVENTS, 3);
		expect(view.board.s1.A[0].currentHold).toBe(7.6);
		expect(view.board.s1.A[0].damage).toBeCloseTo(0.4, 6);
	});
});

describe('flashFor', () => {
	it('pops the word Pass 2 uses for each outcome, and the number a recovery gave back', () => {
		expect(flashFor({ type: 'attack', outcome: 'downed', power: 6 })).toEqual({ kind: 'rout', text: 'downed' });
		// pass 28: the flash is punctuation read in under half a second while the figure is
		// still moving, so it rounds. A live Clash measured "-6" and "-1.1" in one round,
		// which is the mixed-precision look a critic named as decimals everywhere.
		expect(flashFor({ type: 'attack', outcome: 'hurt', power: 2.5 })).toEqual({ kind: 'stagger', text: '-3' });
		expect(flashFor({ type: 'recover', amount: 2.1 })).toEqual({ kind: 'recover', text: '+2' });
		expect(flashFor({ type: 'shield', cancelled: 'x' })).toEqual({ kind: 'ward', text: 'cancelled' });
		expect(flashFor({ type: 'judge' })).toBeNull();
	});

	// a blow that landed took something: it must never print as nothing, or the flash
	// says "-0" over a creature whose hold just fell
	it('never rounds a landed blow down to zero', () => {
		expect(flashFor({ type: 'attack', outcome: 'hurt', power: 0.4 })).toEqual({ kind: 'stagger', text: '-1' });
		expect(flashFor({ type: 'attack', outcome: 'hurt', power: 0.04 })).toEqual({ kind: 'stagger', text: '-1' });
	});
});

/*
	pass 28: the Clash's rhythm. Every event used to be held for the same 700ms, which is
	why a round read as a list rather than a fight. These weights are the lever; the test
	is here so a retune is a deliberate edit rather than a drift.
*/
describe('stepWeight', () => {
	it('gives the loudest moments the most time and hurries the empty ones', () => {
		const downed = stepWeight({ type: 'attack', outcome: 'downed' });
		const hurt = stepWeight({ type: 'attack', outcome: 'hurt' });
		const cancelled = stepWeight({ type: 'attack', outcome: 'cancelled' });
		expect(downed).toBeGreaterThan(hurt);
		expect(hurt).toBeGreaterThan(cancelled);
		// the Court reads three verdicts in one event, so it needs longer than one blow
		expect(stepWeight({ type: 'judge' })).toBeGreaterThan(hurt);
		// a sweep lands on several creatures at once
		expect(stepWeight({ type: 'sweep' })).toBeGreaterThan(hurt);
		expect(stepWeight(null)).toBe(1);
	});
});
