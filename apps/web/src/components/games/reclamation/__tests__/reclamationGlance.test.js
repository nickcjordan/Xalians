import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { buildDraftPools, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import {
	createMatch, send, forecastClash, forecastSend, DEFAULT_RULES,
} from '@xalians/rules/expedition/expeditionRules';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { ROSTER_SIZE } from '@xalians/rules/expedition/expeditionInterpretation';
import { fitTable, forecastTotalsAt, standingScale, STANDING_FLOOR, roundTrack, FIT_SCALE } from '../reclamationFit';
import { Standing, FitStrip, ScorePips, HoldBar, Crest } from '../reclamationInstruments';

/*
	PASS 52, THE GLANCE REDESIGN (docs/design/reclamation-glance-redesign.md).

	The table's instruments print engine numbers without a label beside them, so what each
	one says has to be pinned: the fit strip is the engine's forecast of that exact send,
	the standing (pass 54) draws the forecast totals on one scale, and the marks (the tick,
	the lit column, the cross) appear exactly when the numbers call for them. The match under
	test is the engine's own, built from a real draft pool.
*/

const SEED = 7;

function makeMatch() {
	const { poolA, poolB } = buildDraftPools(SEED, draftOptionsFromRules(DEFAULT_RULES));
	return createMatch({
		rosterA: poolA.slice(0, ROSTER_SIZE), rosterB: poolB.slice(0, ROSTER_SIZE), worlds: getWorlds(), seed: SEED,
	});
}

const other = (seat) => (seat === 'A' ? 'B' : 'A');

describe('fitTable', () => {
	it('reads every creature in hand at every world of the round, from the forecast of that send', () => {
		const match = makeMatch();
		const seat = match.turn;
		const table = fitTable(match, seat, match.players[seat].roster);
		const sites = match.frames[match.frameIndex].sites;
		match.players[seat].roster.forEach((record) => {
			sites.forEach((site) => {
				const cell = table.fits[record.id][site.id];
				const expected = forecastTotalsAt(match, seat, forecastSend(match, seat, record.id, site.id), site.id, record.id);
				expect(cell.after).toEqual(expected);
				// nobody stands anywhere yet, so the send is the whole margin and nothing is taken from anyone
				expect(cell.swing).toBeCloseTo(expected.mine - expected.theirs, 6);
				expect(cell.deficit).toBe(0);
				expect(cell.takes).toBe(false);
			});
		});
	});

	it('ticks the rival lead and lights exactly the sends that would overturn it', () => {
		let match = makeMatch();
		const rival = match.turn;
		const seat = other(rival);
		const site = match.frames[match.frameIndex].sites[0];
		match = send(match, rival, match.players[rival].roster[0].id, site.id);
		const table = fitTable(match, seat, match.players[seat].roster);
		const lead = table.base[site.id].theirs - table.base[site.id].mine;
		expect(lead).toBeGreaterThan(0);
		let lit = 0;
		match.players[seat].roster.forEach((record) => {
			const cell = table.fits[record.id][site.id];
			expect(cell.deficit).toBeCloseTo(lead, 6);
			expect(cell.takes).toBe(cell.after.mine - cell.after.theirs > 0.05);
			lit += cell.takes ? 1 : 0;
		});
		expect(lit).toBeGreaterThan(0);
	});

	it('matches the forecast of the board as it stands for the standing, and what goes into the Clash', () => {
		let match = makeMatch();
		const rival = match.turn;
		const seat = other(rival);
		const site = match.frames[match.frameIndex].sites[1];
		match = send(match, rival, match.players[rival].roster[2].id, site.id);
		const table = fitTable(match, seat, match.players[seat].roster);
		expect(table.base[site.id]).toEqual(forecastTotalsAt(match, seat, forecastClash(match, seat), site.id));
		// the rival's creature goes in at its full hold, and the Clash can only take from it
		expect(table.base[site.id].theirsBefore).toBeGreaterThan(0);
		expect(table.base[site.id].theirs).toBeLessThanOrEqual(table.base[site.id].theirsBefore + 1e-9);
	});

	it('is null outside Deploy', () => {
		expect(fitTable({ phase: 'matchEnd' }, 'A', [])).toBe(null);
	});
});

describe('standingScale', () => {
	it('covers every total a send in hand could make, in steps of six, never below the floor', () => {
		expect(standingScale(null, [])).toBe(STANDING_FLOOR);
		expect(standingScale(null, [3, 25.2])).toBe(30);
		const match = makeMatch();
		const seat = match.turn;
		const table = fitTable(match, seat, match.players[seat].roster);
		const scale = standingScale(table);
		Object.values(table.fits).forEach((row) => Object.values(row).forEach((cell) => {
			expect(cell.after.mineBefore).toBeLessThanOrEqual(scale);
			expect(cell.after.mine).toBeLessThanOrEqual(scale);
		}));
		expect(scale % 6).toBe(0);
	});
});

describe('roundTrack', () => {
	it('fills each played world with who won it, a tie as a tie, a staked world marked', () => {
		const frames = [
			{ sites: [{ id: 'a', world: { planet: 'A', element: 'fire' } }, { id: 'b', world: { planet: 'B', element: 'air' } }, { id: 'c', world: { planet: 'C', element: 'ice' } }] },
			{ sites: [{ id: 'd', world: { planet: 'D', element: 'rock' } }] },
		];
		const log = [{ type: 'judge', round: 0, siteResults: { a: { winner: 'A', countedValue: 2 }, b: { winner: 'B', countedValue: 1 }, c: { winner: null, countedValue: 1 } } }];
		const track = roundTrack(frames, log, 'A', 1);
		expect(track[0].sites.map((s) => s.who)).toEqual(['mine', 'theirs', 'tie']);
		expect(track[0].sites[0].staked).toBe(true);
		expect(track[1].sites[0].who).toBe(null);
		expect(track[1].current).toBe(true);
	});
});

describe('the instruments', () => {
	it('draws each side as a bar on the shared scale, the rival above, the number on each', () => {
		const { container } = render(<Standing siteId="x" now={{ theirs: 12, mine: 3, theirsBefore: 12, mineBefore: 3 }} scale={24} />);
		const st = container.querySelector('[data-standing="x"]');
		expect(st.getAttribute('data-standing-lead')).toBe('theirs');
		expect(Number(st.style.getPropertyValue('--st-t'))).toBeCloseTo(0.5, 4);
		expect(Number(st.style.getPropertyValue('--st-m'))).toBeCloseTo(0.125, 4);
		const lanes = [...st.querySelectorAll('[data-standing-side]')].map((l) => l.getAttribute('data-standing-side'));
		expect(lanes).toEqual(['theirs', 'mine']);
		expect(container.querySelector('[data-standing-total="theirs"]').textContent).toBe('12');
		expect(container.querySelector('[data-standing-total="mine"]').textContent).toBe('3');
		// the rival's end is marked down through your lane
		expect(container.querySelector('[data-standing-mark]')).not.toBeNull();
	});

	it('draws nothing but the rails on an empty world, and no numbers', () => {
		const { container } = render(<Standing siteId="e" now={{ theirs: 0, mine: 0, theirsBefore: 0, mineBefore: 0 }} scale={24} />);
		expect(container.querySelector('[data-standing="e"]').getAttribute('data-standing-lead')).toBe('empty');
		expect(container.querySelector('[data-standing-total]')).toBeNull();
		expect(container.querySelector('[data-standing-mark]')).toBeNull();
	});

	it('draws a pointed creature as what it adds to your bar, and what the Clash would take as hatched', () => {
		const { container } = render(
			<Standing
				siteId="p"
				now={{ theirs: 12, mine: 0, theirsBefore: 12, mineBefore: 0 }}
				preview={{ theirs: 4, mine: 18, theirsBefore: 12, mineBefore: 18 }}
				scale={24}
				marks={{ home: true, strain: null, falls: false }}
			/>,
		);
		const st = container.querySelector('[data-standing="p"]');
		expect(st.getAttribute('data-standing-lead')).toBe('mine');
		expect(st.className).toContain('rec-standing--preview');
		expect(container.querySelector('[data-standing-ghost]').getAttribute('data-standing-ghost')).toBe('18');
		expect(container.querySelector('[data-standing-side="theirs"] .rec-standing-loss')).not.toBeNull();
		expect(container.querySelector('[data-standing-total="mine"]').textContent).toBe('18');
		expect(container.querySelector('[data-standing-home]')).not.toBeNull();
	});

	it('puts the pennant at the end of the winner bar once the world is ruled', () => {
		const { container } = render(<Standing siteId="r" now={{ theirs: 7, mine: 10, theirsBefore: 7, mineBefore: 10 }} scale={24} verdict={{ who: 'yours', text: 'yours by 3', margin: 3 }} />);
		expect(container.querySelector('[data-standing-total="mine"] [data-crest]').getAttribute('data-crest')).toBe('mine');
		expect(container.querySelector('[data-standing-total="theirs"] [data-crest]')).toBeNull();
	});

	it('prints each column number, ticks a rival lead and lights a column that clears it', () => {
		const sites = [
			{ id: 's1', world: { planet: 'One', element: 'fire' } },
			{ id: 's2', world: { planet: 'Two', element: 'air' } },
			{ id: 's3', world: { planet: 'Three', element: 'ice' } },
		];
		const row = {
			s1: { swing: 18.2, deficit: 12, takes: true, after: {}, isHome: false, strainLevel: 'none' },
			s2: { swing: 9.6, deficit: 14, takes: false, after: {}, isHome: false, strainLevel: 'none' },
			s3: { swing: -1.2, deficit: 0, takes: false, after: {}, isHome: false, strainLevel: 'none' },
		};
		const { container } = render(<FitStrip sites={sites} row={row} />);
		const cols = [...container.querySelectorAll('[data-fit-site]')];
		expect(cols.map((c) => c.querySelector('.rec-fit-num').textContent)).toEqual(['18', '10', '−1']);
		expect(cols[0].className).toContain('rec-fit-col--takes');
		expect(cols[1].className).toContain('rec-fit-col--short');
		expect(cols[2].className).toContain('rec-fit-col--hurts');
		expect(cols[0].querySelector('.rec-fit-tick')).not.toBeNull();
		expect(cols[2].querySelector('.rec-fit-tick')).toBeNull();
		expect(Number(cols[0].style.getPropertyValue('--fit'))).toBeCloseTo(Math.min(1, 18.2 / FIT_SCALE), 3);
	});

	it('shows a sent creature only at the world it went to', () => {
		const sites = [{ id: 's1', world: { planet: 'One', element: 'fire' } }, { id: 's2', world: { planet: 'Two', element: 'air' } }];
		const { container } = render(<FitStrip sites={sites} row={null} sentSiteId="s2" />);
		const cols = [...container.querySelectorAll('[data-fit-site]')];
		expect(cols[0].className).toContain('rec-fit-col--gone');
		expect(cols[1].className).toContain('rec-fit-col--sent');
	});

	// pass 55: the sent column is the creature's own forecast there, not one bar the same height on every card
	it('draws a sent creature as what the Clash would leave it, and a cross where it would fall', () => {
		const sites = [{ id: 's1', world: { planet: 'One', element: 'fire' } }, { id: 's2', world: { planet: 'Two', element: 'air' } }];
		const kept = render(<FitStrip sites={sites} row={null} sentSiteId="s1" sentCell={{ hold: 9.4, downed: false, before: 14 }} />);
		const col = kept.container.querySelector('[data-fit-site="s1"]');
		expect(col.getAttribute('data-fit-sent')).toBe('9.4');
		expect(col.querySelector('.rec-fit-num').textContent).toBe('9');
		expect(Number(col.style.getPropertyValue('--fit'))).toBeCloseTo(9.4 / FIT_SCALE, 3);
		expect(col.querySelector('.rec-fit-going')).not.toBeNull();
		const falls = render(<FitStrip sites={sites} row={null} sentSiteId="s1" sentCell={{ hold: 0, downed: true, before: 8 }} />);
		const fallen = falls.container.querySelector('[data-fit-site="s1"]');
		expect(fallen.getAttribute('data-fit-sent')).toBe('falls');
		expect(fallen.className).toContain('rec-fit-col--falls');
		expect(fallen.querySelector('.rec-fit-falls')).not.toBeNull();
	});

	it('draws what a swift creature would do by moving, in the columns of the worlds it could step to', () => {
		const sites = [{ id: 's1', world: { planet: 'One', element: 'fire' } }, { id: 's2', world: { planet: 'Two', element: 'air' } }, { id: 's3', world: { planet: 'Three', element: 'ice' } }];
		const { container } = render(<FitStrip sites={sites} row={null} sentSiteId="s1" sentCell={{ hold: 9, downed: false, before: 9 }} moveRow={{ s2: { swing: 6.2 }, s3: { swing: -5.8 } }} />);
		const cols = [...container.querySelectorAll('[data-fit-site]')];
		expect(cols[1].className).toContain('rec-fit-col--move');
		expect(cols[1].querySelector('.rec-fit-num').textContent).toBe('6');
		expect(cols[2].className).toContain('rec-fit-col--hurts');
		expect(cols[2].querySelector('.rec-fit-num').textContent).toBe('\u22126');
	});

	it('puts the rival row above yours, each with its sends and its turn lamp, and marks a rival pass', () => {
		const { container } = render(<ScorePips mine={1} theirs={3} toClinch={5} rivalPassed mySends={8} theirSends={6} myCap={11} theirCap={11} worldsAhead={6} turn="mine" />);
		const rows = [...container.querySelectorAll('.rec-score-row')];
		expect(rows[0].getAttribute('data-sites-b')).toBe('3');
		expect(rows[1].getAttribute('data-sites-a')).toBe('1');
		expect(rows[0].querySelectorAll('.rec-pip--lit').length).toBe(3);
		expect(container.querySelector('[data-sends-side="mine"]').textContent).toBe('8');
		expect(container.querySelector('[data-sends-side="theirs"]').textContent).toBe('6');
		expect(container.querySelector('[data-rival-passed]')).not.toBeNull();
		// a tick per send the game allows, lit while unspent
		expect(container.querySelectorAll('[data-sends-side="mine"] .rec-send-tick').length).toBe(11);
		expect(container.querySelectorAll('[data-sends-side="mine"] .rec-send-tick--left').length).toBe(8);
		// whose move it is: the lamp on that side's row, and only there
		expect(container.querySelector('[data-turn-lamp="mine"]').hasAttribute('data-turn-on')).toBe(true);
		expect(container.querySelector('[data-turn-lamp="theirs"]').hasAttribute('data-turn-on')).toBe(false);
	});

	it('strikes out what the Clash would take and marks a fall', () => {
		const loses = render(<HoldBar hold={15} after={2} side="mine" />);
		expect(loses.container.firstChild.className).toContain('rec-hbar--loses');
		const falls = render(<HoldBar hold={13} after={0} side="theirs" />);
		expect(falls.container.firstChild.className).toContain('rec-hbar--falls');
	});

	it('crowns a ruled world in the winner color, the margin left to the bars', () => {
		const { container } = render(<Crest verdict={{ who: 'yours', text: 'yours by 10', margin: 9.96, shownMargin: 10, unopposed: false }} />);
		expect(container.querySelector('[data-crest]').getAttribute('data-crest')).toBe('mine');
		expect(container.textContent).toBe('');
	});
});
