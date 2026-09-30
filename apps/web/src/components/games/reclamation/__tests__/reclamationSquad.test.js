import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { buildDraftPools, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import { createMatch, send, pass, getPublicState, DEFAULT_RULES } from '@xalians/rules/expedition/expeditionRules';
import { chooseSend } from '@xalians/rules/expedition/expeditionBot';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { ROSTER_SIZE } from '@xalians/rules/expedition/expeditionInterpretation';
import { fitTable, fitScale } from '../reclamationFit';
import { blowsAt } from '../reclamationPreview';
import { formatBlow } from '../reclamationNarration';
import ReclamationSquad, { SquadGone, squadOrder, cellFacts, blowAt, columnsFor, readOf, slotStateOf } from '../reclamationSquad';

/*
	PASS 75, THE SQUAD AS A ROSTER (docs/design/reclamation-squad-roster.md). The squad lists only
	the creatures you can still send, a row each with a cell per world under that world's symbol;
	it is ordered by act and attack, or by a world when its symbol is pressed; a cell carries what
	the creature would add, one arrow for what the world did to it and one factor for the chart;
	the used creatures sit small in the head.
*/

function matchFor(seed) {
	const { poolA, poolB } = buildDraftPools(seed, draftOptionsFromRules(DEFAULT_RULES));
	return createMatch({ rosterA: poolA.slice(0, ROSTER_SIZE), rosterB: poolB.slice(0, ROSTER_SIZE), worlds: getWorlds(), seed });
}

// plays bot sends until the seat to move is `you` and at least `rounds` rounds have been ruled
function playTo(seed, you, rounds) {
	let match = matchFor(seed);
	let r = 0.41;
	const rng = { float: () => { r = ((r * 9301 + 49297) % 233280) / 233280; return r; } };
	for (let step = 0; step < 400 && match.phase === 'deploy'; step += 1) {
		if (match.frameIndex >= rounds && match.turn === you) break;
		const seat = match.turn;
		const action = chooseSend(getPublicState(match, seat), match.players[seat].roster, seat, rng, null);
		const next = action.type === 'send' ? send(match, seat, action.recordId, action.siteId) : null;
		match = next || pass(match, seat) || match;
	}
	return match;
}

describe('squadOrder', () => {
	const recs = [
		{ id: 'a', species: 'figzy' }, { id: 'b', species: 'kosanos' }, { id: 'c', species: 'neph' }, { id: 'd', species: 'tizzie' },
	];
	const reads = { a: { role: 'bolster', power: 5 }, b: { role: 'strike', power: 9 }, c: { role: 'strike', power: 14 }, d: { role: 'sweep', power: 6 } };
	it('lists strikers first, strongest first, then sweepers, shields and bolsters', () => {
		expect(squadOrder(recs, reads, null, null).map((r) => r.id)).toEqual(['c', 'b', 'd', 'a']);
	});
	it('orders by what each would add at a world once that world is chosen', () => {
		const fits = { fits: { a: { w: { gain: 20 } }, b: { w: { gain: 3 } }, c: { w: { gain: 8 } }, d: { w: { gain: 8 } } } };
		expect(squadOrder(recs, reads, fits, 'w').map((r) => r.id)).toEqual(['a', 'c', 'd', 'b']);
	});
});

describe('cellFacts', () => {
	it('shows an arrow only for a lift or cut of a tenth of the normal hold and a whole point', () => {
		expect(cellFacts({ gain: 22, own: 22, body: 20 }, [], 'strike').shift).toBe('up');
		expect(cellFacts({ gain: 18, own: 18, body: 20 }, [], 'strike').shift).toBe('down');
		// just under the threshold, and a small hold where a tenth is less than a point
		expect(cellFacts({ gain: 21.9, own: 21.9, body: 20 }, [], 'strike').shift).toBe(null);
		expect(cellFacts({ gain: 19.1, own: 19.1, body: 20 }, [], 'strike').shift).toBe(null);
		expect(cellFacts({ gain: 13.1, own: 13.1, body: 12 }, [], 'strike').shift).toBe(null);
		expect(cellFacts({ gain: 11, own: 11, body: 10 }, [], 'strike').shift).toBe('up');
		expect(cellFacts({ gain: 10.7, own: 10.7, body: 12 }, [], 'strike').shift).toBe('down');
	});
	it('tones the blow against the act column number', () => {
		expect(cellFacts({ gain: 9, own: 9, body: 9 }, [], 'strike', 28, 14).blowTone).toBe('above');
		expect(cellFacts({ gain: 9, own: 9, body: 9 }, [], 'strike', 7, 14).blowTone).toBe('below');
		expect(cellFacts({ gain: 9, own: 9, body: 9 }, [], 'strike', 14.3, 14).blowTone).toBe('even');
		expect(cellFacts({ gain: 9, own: 9, body: 9 }, [], 'strike', null, 14).blow).toBe(null);
	});
	it('carries the chart\'s best factor for a creature that strikes, and none for one that never does', () => {
		const matchups = [{ dealt: 0.5 }, { dealt: 2 }, { dealt: null, taken: 2 }];
		expect(cellFacts({ gain: 9, own: 9, body: 9 }, matchups, 'strike').chart).toBe(2);
		expect(cellFacts({ gain: 9, own: 9, body: 9 }, [{ dealt: 0.5 }], 'sweep').chart).toBe(0.5);
		expect(cellFacts({ gain: 9, own: 9, body: 9 }, matchups, 'bolster').chart).toBe(null);
		expect(cellFacts({ gain: 9, own: 9, body: 9 }, [], 'strike').chart).toBe(null);
	});
});

describe('columnsFor', () => {
	it('takes the fewest columns that keep every row readable, two on a phone', () => {
		expect(columnsFor(1044, 248, 12)).toBe(2);
		expect(columnsFor(970, 128, 12)).toBe(3);
		expect(columnsFor(372, 201, 12)).toBe(2);
		expect(columnsFor(970, 128, 4)).toBe(2);
		expect(columnsFor(0, 0, 12)).toBe(2);
	});
});

describe('the roster on a real game', () => {
	it('lists only the creatures in hand, each with a number in every world\'s cell, and the rest small in the head', () => {
		let match = playTo(7, 'A', 1);
		// sends of A's this round too, so the roster holds sent rows as well as rows in hand
		for (let i = 0; i < 2 && match.phase === 'deploy' && match.turn === 'A'; i += 1) {
			const rec = match.players.A.roster[0];
			match = send(match, 'A', rec.id, match.frames[match.frameIndex].sites[i % 3].id) || match;
			if (match.turn === 'B') {
				const rival = match.players.B.roster[0];
				match = (rival && send(match, 'B', rival.id, match.frames[match.frameIndex].sites[0].id)) || pass(match, 'B') || match;
			}
		}
		const view = getPublicState(match, 'A');
		// the whole squad seat A drafted, as the table keeps it
		const all = buildDraftPools(7, draftOptionsFromRules(DEFAULT_RULES)).poolA.slice(0, ROSTER_SIZE);
		const fits = fitTable(match, 'A', match.players.A.roster);
		const { container } = render(<ReclamationSquad view={view} you="A" squad={all} fits={fits} scale={fitScale(fits)} onArm={() => {}} onHover={() => {}} />);
		const rows = [...container.querySelectorAll('[data-slot]')];
		const states = all.map((r) => slotStateOf(r, view, 'A').state);
		// in hand, and sent this round, whose rows stay until the round is ruled
		expect(rows.length).toBe(states.filter((st) => st === 'hand' || st === 'sent').length);
		rows.forEach((row) => {
			const state = slotStateOf({ id: row.getAttribute('data-slot') }, view, 'A').state;
			expect(row.getAttribute('data-slot-state')).toBe(state === 'sent' ? 'sent' : 'hand');
			const nums = [...row.querySelectorAll('[data-fit-site] .rec-squad-num')].map((n) => n.textContent);
			// a creature in hand has a number at every world; one sent has it only at the world it went to
			expect(nums.length).toBe(state === 'sent' ? 1 : 3);
			nums.forEach((n) => expect(n).toMatch(/^[+−]?\d+$/));
		});
		const gone = render(<SquadGone view={view} you="A" squad={all} />).container;
		expect(gone.querySelectorAll('[data-gone]').length).toBe(states.filter((st) => st !== 'hand' && st !== 'sent').length);
		// a round has been ruled and this one is under way: every kind of row is here
		expect(states).toContain('sent');
		expect(states.filter((st) => st !== 'hand' && st !== 'sent').length).toBeGreaterThan(0);
	});

	it("puts a chart factor in its cell's top line, behind the creature's act glyph", () => {
		let found = null;
		for (const seed of [7, 13, 29, 41, 5, 3]) {
			// a few bot sends first, so there are rivals on the worlds for the chart to read against
			let match = matchFor(seed);
			for (let i = 0; i < 4 && match.phase === 'deploy'; i += 1) {
				const action = chooseSend(getPublicState(match, match.turn), match.players[match.turn].roster, match.turn, { float: () => 0.5 }, null);
				match = (action.type === 'send' ? send(match, match.turn, action.recordId, action.siteId) : null) || match;
			}
			const seat = match.turn;
			const view = getPublicState(match, seat);
			const fits = fitTable(match, seat, match.players[seat].roster);
			const { container } = render(<ReclamationSquad view={view} you={seat} squad={match.players[seat].roster} fits={fits} scale={fitScale(fits)} onArm={() => {}} onHover={() => {}} />);
			found = container.querySelector('[data-chart]');
			if (found) break;
		}
		expect(found).not.toBeNull();
		const read = found.closest('.rec-squad-cell-read');
		expect(read).not.toBeNull();
		expect(read.querySelector('.rec-squad-num')).not.toBeNull();
		const role = found.closest('.rec-squad-row').querySelector('.rec-squad-act').getAttribute('data-role');
		expect(found.parentElement.querySelector(`.rec-glyph--role-${role}`)).not.toBeNull();
		// the bar stands alone in the foot
		expect(found.closest('.rec-squad-cell').querySelector('.rec-squad-cell-foot [data-chart]')).toBeNull();
	});

	it('shows the blow at worlds with a rival, matching the engine, and none for bolsters or empty worlds', () => {
		let withBlow = 0;
		let without = 0;
		for (const seed of [7, 13, 29, 41, 5, 3]) {
			let match = matchFor(seed);
			for (let i = 0; i < 4 && match.phase === 'deploy'; i += 1) {
				const action = chooseSend(getPublicState(match, match.turn), match.players[match.turn].roster, match.turn, { float: () => 0.5 }, null);
				match = (action.type === 'send' ? send(match, match.turn, action.recordId, action.siteId) : null) || match;
			}
			const seat = match.turn;
			const view = getPublicState(match, seat);
			const roster = match.players[seat].roster;
			const fits = fitTable(match, seat, roster);
			const { container } = render(<ReclamationSquad view={view} you={seat} squad={roster} fits={fits} scale={fitScale(fits)} onArm={() => {}} onHover={() => {}} />);
			container.querySelectorAll('[data-slot-state="hand"]').forEach((row) => {
				const record = roster.find((r) => r.id === row.getAttribute('data-slot'));
				const role = row.querySelector('.rec-squad-act').getAttribute('data-role');
				row.querySelectorAll('[data-fit-site]').forEach((cell) => {
					const site = view.frame.sites.find((s) => s.id === cell.getAttribute('data-fit-site'));
					const node = cell.querySelector('[data-blow]');
					const { lands } = blowsAt(view, record, site, seat, view.players[seat].sentCount);
					const theirs = Object.values(lands).filter((l) => !l.mine).map((l) => l.power);
					if ((role === 'strike' || role === 'sweep') && theirs.length) {
						expect(node).not.toBeNull();
						expect(node.getAttribute('data-blow')).toBe(formatBlow(Math.max(...theirs)));
						expect(blowAt(view, record, site, seat, role)).toBe(Math.max(...theirs));
						withBlow += 1;
					} else {
						expect(node).toBeNull();
						without += 1;
					}
				});
			});
		}
		expect(withBlow).toBeGreaterThan(0);
		expect(without).toBeGreaterThan(0);
	});

	it("gives a used creature its badge, and one holding a world its flag in that world's color", () => {
		const match = playTo(7, 'A', 1);
		const all = buildDraftPools(7, draftOptionsFromRules(DEFAULT_RULES)).poolA.slice(0, ROSTER_SIZE);
		const view = getPublicState(match, 'A');
		const target = all.find((r) => slotStateOf(r, view, 'A').state === 'away' || slotStateOf(r, view, 'A').state === 'holding' || slotStateOf(r, view, 'A').state === 'downed');
		expect(target).toBeTruthy();
		// make it a holder of a world the log named
		const fake = { ...view, players: { ...view.players, A: { ...view.players.A, holding: [target.id], downed: [], roster: view.players.A.roster.filter((r) => r.id !== target.id) } } };
		const { container } = render(<SquadGone view={fake} you="A" squad={[target]} heldWorlds={{ [target.id]: { element: 'fire', planet: 'Magmuth' } }} />);
		const token = container.querySelector('[data-gone="holding"]');
		expect(token).not.toBeNull();
		expect(token.querySelector('[data-token-flag]')).not.toBeNull();
		expect(token.querySelector('.rec-squad-token-disc')).not.toBeNull();
		expect(token.className).toContain('g-el-fire');
		const plain = render(<SquadGone view={{ ...fake, players: { ...fake.players, A: { ...fake.players.A, holding: [], downed: [target.id] } } }} you="A" squad={[target]} />).container;
		expect(plain.querySelector('[data-gone="downed"] [data-token-flag]')).toBeNull();
		expect(plain.querySelector('[data-gone="downed"] .rec-squad-token-disc')).not.toBeNull();
	});

	it('sorts by a world when its symbol is pressed, and back again', () => {
		const match = matchFor(13);
		const view = getPublicState(match, match.turn);
		const seat = match.turn;
		const fits = fitTable(match, seat, match.players[seat].roster);
		const { container } = render(<ReclamationSquad view={view} you={seat} squad={match.players[seat].roster} fits={fits} scale={fitScale(fits)} onArm={() => {}} onHover={() => {}} />);
		const order = () => [...container.querySelectorAll('[data-slot]')].map((row) => row.getAttribute('data-slot'));
		const before = order();
		const site = view.frame.sites[1].id;
		fireEvent.click(container.querySelector(`[data-squad-sort="${site}"]`));
		const gains = order().map((id) => fits.fits[id][site].gain);
		// the columns read top to bottom, left to right
		expect(gains).toEqual([...gains].sort((a, b) => b - a));
		fireEvent.click(container.querySelector(`[data-squad-sort="${site}"]`));
		expect(order()).toEqual(before);
		const reads = Object.fromEntries(match.players[seat].roster.map((r) => [r.id, readOf(r, view)]));
		expect(before).toEqual(squadOrder(match.players[seat].roster, reads, fits, null).map((r) => r.id));
	});

	it('lifts a row on a press and keeps a reserve row from being lifted', () => {
		const match = matchFor(7);
		const seat = match.turn;
		const view = getPublicState(match, seat);
		const fits = fitTable(match, seat, match.players[seat].roster);
		const lifted = [];
		const first = match.players[seat].roster[0].id;
		const { container, rerender } = render(<ReclamationSquad view={view} you={seat} squad={match.players[seat].roster} fits={fits} scale={24} onArm={(id) => lifted.push(id)} onHover={() => {}} />);
		fireEvent.click(container.querySelector(`[data-slot="${first}"] [data-arm]`));
		expect(lifted).toEqual([first]);
		rerender(<ReclamationSquad view={view} you={seat} squad={match.players[seat].roster} fits={fits} scale={24} armedRecordId={first} onArm={() => {}} onHover={() => {}} />);
		expect(container.querySelector(`[data-slot="${first}"]`).className).toContain('rec-squad-row--armed');
		rerender(<ReclamationSquad view={view} you={seat} squad={match.players[seat].roster} fits={fits} scale={24} reserve onArm={(id) => lifted.push(id)} onHover={() => {}} />);
		expect(container.querySelectorAll('[data-arm]').length).toBe(0);
		expect(container.querySelector('[data-slot-state="reserve"]')).not.toBeNull();
	});
});
