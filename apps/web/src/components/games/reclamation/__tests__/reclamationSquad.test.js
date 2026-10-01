import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { buildDraftPools, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import { createMatch, send, pass, getPublicState, DEFAULT_RULES } from '@xalians/rules/expedition/expeditionRules';
import { chooseSend } from '@xalians/rules/expedition/expeditionBot';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { ROSTER_SIZE } from '@xalians/rules/expedition/expeditionInterpretation';
import { fitTable } from '../reclamationFit';
import { blowsAt } from '../reclamationPreview';
import { formatBlow } from '../reclamationNarration';
import ReclamationSquad, { SquadGone, squadOrder, cellFacts, blowAt, blowTargetAt, tilesFor, squadScale, readOf, slotStateOf } from '../reclamationSquad';

/*
	PASS 77: THE SQUAD AS HEALTH-FIRST TILES. The squad lists only the creatures you can still send,
	a tile each with a block per world (the "+N" it would add, its bar and its natural-health tick on
	one scale for the squad); it is ordered by act and attack; pointing at a world adds the creature's
	blow there to its attack line; the used creatures sit small in the head.
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
		expect(squadOrder(recs, reads).map((r) => r.id)).toEqual(['c', 'b', 'd', 'a']);
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
});

describe('tilesFor', () => {
	it('takes the fewest rows that leave every tile about 200 by 70, three columns on a phone', () => {
		expect(tilesFor(1394, 247, 12)).toEqual({ cols: 6, rows: 2 });
		expect(tilesFor(1320, 181, 8)).toEqual({ cols: 4, rows: 2 });
		expect(tilesFor(1394, 100, 4)).toEqual({ cols: 4, rows: 1 });
		expect(tilesFor(370, 246, 12)).toEqual({ cols: 3, rows: 4 });
		expect(tilesFor(0, 0, 12)).toEqual({ cols: 3, rows: 4 });
		// never more than three rows, even when nothing is tall enough
		expect(tilesFor(1394, 120, 12).rows).toBeLessThanOrEqual(3);
	});
});

describe('squadScale', () => {
	it('is the largest gain or natural health across every listed creature and world', () => {
		const recs = [{ id: 'a' }, { id: 'b' }];
		const fits = { fits: { a: { w: { gain: 14, body: 12 }, x: { gain: 9, body: 25 } }, b: { w: { gain: 18, body: 7 } } } };
		expect(squadScale(fits, recs)).toBe(25);
		expect(squadScale(fits, [recs[1]])).toBe(18);
		expect(squadScale({ fits: {} }, recs)).toBe(24);
		expect(squadScale({ fits: fits.fits, forecast: { b: { hold: 30 } } }, recs)).toBe(30);
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
		const { container } = render(<ReclamationSquad view={view} you="A" squad={all} fits={fits} onArm={() => {}} onHover={() => {}} />);
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

	it('draws a bar and a natural-health tick in every block, on the squad scale', () => {
		const match = matchFor(13);
		const seat = match.turn;
		const view = getPublicState(match, seat);
		const roster = match.players[seat].roster;
		const fits = fitTable(match, seat, roster);
		const scale = squadScale(fits, roster);
		const { container } = render(<ReclamationSquad view={view} you={seat} squad={roster} fits={fits} onArm={() => {}} onHover={() => {}} />);
		const blocks = [...container.querySelectorAll('[data-slot-state="hand"] [data-fit-gain]')];
		expect(blocks.length).toBe(roster.length * 3);
		blocks.forEach((block) => {
			const id = block.closest('[data-slot]').getAttribute('data-slot');
			const cell = fits.fits[id][block.getAttribute('data-fit-site')];
			expect(Number(block.style.getPropertyValue('--sq-fill'))).toBeCloseTo(Math.min(1, Math.max(0, cell.gain) / scale), 3);
			expect(Number(block.style.getPropertyValue('--sq-tick'))).toBeCloseTo(Math.min(1, cell.body / scale), 3);
			expect(Number(block.style.getPropertyValue('--sq-fill'))).toBeLessThanOrEqual(1);
			expect(block.querySelector('.rec-squad-tick')).not.toBeNull();
		});
	});

	it('adds the blow to the attack line only for the pointed world, and not for a mender or an empty world', () => {
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
			// nothing pointed at: no blow anywhere
			const rest = render(<ReclamationSquad view={view} you={seat} squad={roster} fits={fits} onArm={() => {}} onHover={() => {}} />);
			expect(rest.container.querySelector('[data-hover-blow]')).toBeNull();
			rest.unmount();
			view.frame.sites.forEach((site) => {
				const { container, unmount } = render(<ReclamationSquad view={view} you={seat} squad={roster} fits={fits} focusSiteId={site.id} onArm={() => {}} onHover={() => {}} />);
				container.querySelectorAll('[data-slot-state="hand"]').forEach((tile) => {
					const record = roster.find((r) => r.id === tile.getAttribute('data-slot'));
					const role = tile.querySelector('.rec-squad-act').getAttribute('data-role');
					const node = tile.querySelector('[data-hover-blow]');
					const { lands } = blowsAt(view, record, site, seat, view.players[seat].sentCount);
					const theirs = Object.values(lands).filter((l) => !l.mine).map((l) => l.power);
					if ((role === 'strike' || role === 'sweep') && theirs.length) {
						expect(node).not.toBeNull();
						expect(node.getAttribute('data-hover-blow')).toBe(formatBlow(Math.max(...theirs)));
						expect(blowAt(view, record, site, seat, role)).toBe(Math.max(...theirs));
						// it rides on the attack line, in the pointed world's color
						expect(tile.querySelector('.rec-squad-act').contains(node)).toBe(true);
						expect(node.closest('.rec-squad-hover').className).toContain(`g-el-${site.world.element}`);
						withBlow += 1;
					} else {
						expect(node).toBeNull();
						without += 1;
					}
				});
				unmount();
			});
		}
		expect(withBlow).toBeGreaterThan(0);
		expect(without).toBeGreaterThan(0);
	});

	it('shows a sent tile only at the world it went to, and keeps it in place', () => {
		let match = playTo(7, 'A', 1);
		const rec = match.players.A.roster[0];
		const site = match.frames[match.frameIndex].sites[1];
		match = send(match, 'A', rec.id, site.id) || match;
		const view = getPublicState(match, 'A');
		const all = buildDraftPools(7, draftOptionsFromRules(DEFAULT_RULES)).poolA.slice(0, ROSTER_SIZE);
		const fits = fitTable(match, 'A', match.players.A.roster);
		const { container } = render(<ReclamationSquad view={view} you="A" squad={all} fits={fits} onArm={() => {}} onHover={() => {}} />);
		const tile = container.querySelector(`[data-slot="${rec.id}"]`);
		expect(tile.getAttribute('data-slot-state')).toBe('sent');
		const shown = [...tile.querySelectorAll('[data-fit-site] .rec-squad-num')];
		expect(shown.length).toBe(1);
		expect(shown[0].closest('[data-fit-site]').getAttribute('data-fit-site')).toBe(site.id);
		expect(tile.querySelector('[data-fit-sent]')).not.toBeNull();
		expect(tile.querySelector('[data-arm]')).toBeNull();
		// pointing at a world adds no blow to a tile that has been sent
		const pointed = render(<ReclamationSquad view={view} you="A" squad={all} fits={fits} focusSiteId={site.id} onArm={() => {}} onHover={() => {}} />).container;
		expect(pointed.querySelector(`[data-slot="${rec.id}"] [data-hover-blow]`)).toBeNull();
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

	it('lifts a row on a press and keeps a reserve row from being lifted', () => {
		const match = matchFor(7);
		const seat = match.turn;
		const view = getPublicState(match, seat);
		const fits = fitTable(match, seat, match.players[seat].roster);
		const lifted = [];
		const first = match.players[seat].roster[0].id;
		const { container, rerender } = render(<ReclamationSquad view={view} you={seat} squad={match.players[seat].roster} fits={fits} onArm={(id) => lifted.push(id)} onHover={() => {}} />);
		fireEvent.click(container.querySelector(`[data-slot="${first}"] [data-arm]`));
		expect(lifted).toEqual([first]);
		rerender(<ReclamationSquad view={view} you={seat} squad={match.players[seat].roster} fits={fits} armedRecordId={first} onArm={() => {}} onHover={() => {}} />);
		expect(container.querySelector(`[data-slot="${first}"]`).className).toContain('rec-squad-row--armed');
		rerender(<ReclamationSquad view={view} you={seat} squad={match.players[seat].roster} fits={fits} reserve onArm={(id) => lifted.push(id)} onHover={() => {}} />);
		expect(container.querySelectorAll('[data-arm]').length).toBe(0);
		expect(container.querySelector('[data-slot-state="reserve"]')).not.toBeNull();
	});
});
