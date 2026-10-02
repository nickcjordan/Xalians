import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { buildDraftPools, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import { createMatch, send, pass, getPublicState, DEFAULT_RULES } from '@xalians/rules/expedition/expeditionRules';
import { chooseSend } from '@xalians/rules/expedition/expeditionBot';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { ROSTER_SIZE } from '@xalians/rules/expedition/expeditionInterpretation';
import { fitTable } from '../reclamationFit';
import { formatHoldShown } from '../reclamationNarration';
import ReclamationSquad, { SquadGone, squadOrder, adjustOf, tintFor, signedAdjust, healthOf, tilesFor, readOf, slotStateOf } from '../reclamationSquad';

/*
	PASS 78: THE SQUAD AS TILES OF TWO BIG NUMBERS AND A WORLD STRIP. The squad lists only the
	creatures you can still send, a tile each: natural health (with a bar against the largest), the
	attack, and a segment per world with what that world does to its health; it is ordered by act
	and attack; pointing at a world outlines that segment; the used creatures sit small in the head.
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

describe('adjustOf', () => {
	it('is the rounded hold at a world less the rounded natural health, so the figures on a tile add up', () => {
		expect(adjustOf(10, 11)).toBe(-1);
		expect(adjustOf(15, 11)).toBe(4);
		expect(adjustOf(11, 11)).toBe(0);
		// rounded as each is shown: 10.6 reads 11 and 11.4 reads 11
		expect(adjustOf(10.6, 11.4)).toBe(0);
		expect(adjustOf(9.4, 11.4)).toBe(-2);
		expect(adjustOf(0, 11)).toBe(-11);
	});
	it('tints deeper with size, 15 at one, 25 at two, 35 from three, and prints a real minus', () => {
		expect([0, 1, -1, 2, -2, 3, -3, 9].map(tintFor)).toEqual([0, 15, 15, 25, 25, 35, 35, 35]);
		expect([3, -3, 0].map(signedAdjust)).toEqual(['+3', '\u22123', '0']);
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

	it('prints the natural health with a bar against the largest, and a segment per world whose number is its change against it', () => {
		const match = matchFor(13);
		const seat = match.turn;
		const view = getPublicState(match, seat);
		const roster = match.players[seat].roster;
		const fits = fitTable(match, seat, roster);
		const { container } = render(<ReclamationSquad view={view} you={seat} squad={roster} fits={fits} onArm={() => {}} onHover={() => {}} />);
		const tiles = [...container.querySelectorAll('[data-slot-state="hand"]')];
		expect(tiles.length).toBe(roster.length);
		const top = Math.max(...roster.map((r) => healthOf(r, view)));
		const seen = { up: 0, down: 0, zero: 0 };
		tiles.forEach((tile) => {
			const record = roster.find((r) => r.id === tile.getAttribute('data-slot'));
			const health = healthOf(record, view);
			expect(tile.querySelector('[data-tile-health]').textContent).toBe(formatHoldShown(health));
			const fill = tile.querySelector('.rec-squad-hfill');
			expect(parseFloat(fill.style.width)).toBeCloseTo((health / top) * 100, 0);
			const segments = [...tile.querySelectorAll('[data-fit-gain]')];
			expect(segments.length).toBe(3);
			segments.forEach((seg, i) => {
				expect(seg.getAttribute('data-fit-site')).toBe(view.frame.sites[i].id);
				const cell = fits.fits[record.id][seg.getAttribute('data-fit-site')];
				const n = adjustOf(cell.own, health);
				expect(seg.getAttribute('data-adjust')).toBe(String(n));
				expect(seg.querySelector('.rec-squad-num').textContent).toBe(signedAdjust(n));
				expect(seg.className).toContain(n === 0 ? 'rec-squad-cell--zero' : n > 0 ? 'rec-squad-cell--up' : 'rec-squad-cell--down');
				if (n !== 0) expect(seg.style.getPropertyValue('--sq-tint')).toBe(`${tintFor(n)}%`);
				seen[n === 0 ? 'zero' : n > 0 ? 'up' : 'down'] += 1;
				// the ghost's number on the world still reads the same gain
				expect(Number(seg.getAttribute('data-fit-gain'))).toBeCloseTo(cell.gain, 2);
			});
			// nothing of the old tile is left
			expect(tile.querySelector('.rec-squad-tick, .rec-squad-shift, .rec-squad-bar, [data-hover-blow]')).toBeNull();
		});
		expect(seen.down + seen.up).toBeGreaterThan(0);
	});

	it("outlines the pointed world's segment on every active tile and changes nothing else, with no blow added to the attack", () => {
		const match = matchFor(7);
		const seat = match.turn;
		const view = getPublicState(match, seat);
		const roster = match.players[seat].roster;
		const fits = fitTable(match, seat, roster);
		const rest = render(<ReclamationSquad view={view} you={seat} squad={roster} fits={fits} onArm={() => {}} onHover={() => {}} />);
		expect(rest.container.querySelector('.rec-squad-cell--focus')).toBeNull();
		const before = rest.container.querySelector('[data-slot]').textContent;
		rest.unmount();
		view.frame.sites.forEach((site) => {
			const { container, unmount } = render(<ReclamationSquad view={view} you={seat} squad={roster} fits={fits} focusSiteId={site.id} onArm={() => {}} onHover={() => {}} />);
			const focused = [...container.querySelectorAll('.rec-squad-cell--focus')];
			expect(focused.length).toBe(roster.length);
			focused.forEach((f) => expect(f.getAttribute('data-fit-site')).toBe(site.id));
			expect(container.querySelector('[data-slot]').textContent).toBe(before);
			expect(container.querySelector('[data-hover-blow]')).toBeNull();
			unmount();
		});
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
		const sent = tile.querySelector('[data-fit-sent]');
		expect(sent).not.toBeNull();
		// it keeps its two big numbers, and the segment is what it holds there against its health
		const health = healthOf(rec, view);
		expect(tile.querySelector('[data-tile-health]').textContent).toBe(formatHoldShown(health));
		expect(tile.querySelector('[data-plinth-power]')).not.toBeNull();
		expect(sent.getAttribute('data-adjust')).toBe(String(adjustOf(Number(sent.getAttribute('data-fit-sent')), health)));
		expect(tile.querySelectorAll('.rec-squad-cell--none').length).toBe(2);
		expect(tile.querySelector('[data-arm]')).toBeNull();
		// pointing at a world outlines nothing on a tile that has been sent
		const pointed = render(<ReclamationSquad view={view} you="A" squad={all} fits={fits} focusSiteId={site.id} onArm={() => {}} onHover={() => {}} />).container;
		expect(pointed.querySelector(`[data-slot="${rec.id}"] .rec-squad-cell--focus`)).toBeNull();
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
