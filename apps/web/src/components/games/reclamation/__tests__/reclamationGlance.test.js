import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { buildDraftPools, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import {
	createMatch, send, forecastClash, forecastSend, DEFAULT_RULES,
} from '@xalians/rules/expedition/expeditionRules';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { ROSTER_SIZE } from '@xalians/rules/expedition/expeditionInterpretation';
import { fitTable, forecastTotalsAt, frontFraction, roundTrack, FIT_SCALE } from '../reclamationFit';
import { FrontLine, FitStrip, ScorePips, HoldBar, Crest } from '../reclamationInstruments';

/*
	PASS 52, THE GLANCE REDESIGN (docs/design/reclamation-glance-redesign.md).

	The table's instruments print engine numbers without a label beside them, so what each
	one says has to be pinned: the fit strip is the engine's forecast of that exact send,
	the front line stands where the forecast totals put it, and the marks (the tick, the
	lit column, the cross) appear exactly when the numbers call for them. The match under
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

	it('matches the forecast of the board as it stands for the line', () => {
		let match = makeMatch();
		const rival = match.turn;
		const seat = other(rival);
		const site = match.frames[match.frameIndex].sites[1];
		match = send(match, rival, match.players[rival].roster[2].id, site.id);
		const table = fitTable(match, seat, match.players[seat].roster);
		expect(table.base[site.id]).toEqual(forecastTotalsAt(match, seat, forecastClash(match, seat), site.id));
	});

	it('is null outside Deploy', () => {
		expect(fitTable({ phase: 'matchEnd' }, 'A', [])).toBe(null);
	});
});

describe('frontFraction', () => {
	it('is the rival share of the ground, and nothing on an empty world', () => {
		expect(frontFraction(0, 0)).toBe(null);
		expect(frontFraction(12, 0)).toBe(1);
		expect(frontFraction(0, 3)).toBe(0);
		expect(frontFraction(5, 5)).toBe(0.5);
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
	it('draws a world only the rival stands on as all brass, with both totals on the line', () => {
		const { container } = render(<FrontLine siteId="x" theirs={12} mine={0} />);
		const front = container.querySelector('[data-front="x"]');
		expect(front.getAttribute('data-front-lead')).toBe('theirs');
		expect(front.getAttribute('data-front-at')).toBe('1.000');
		expect(container.querySelector('[data-front-total="theirs"]').textContent).toBe('12');
		expect(container.querySelector('[data-front-total="mine"]').textContent).toBe('0');
	});

	it('draws nothing on an empty world, and a preview as the line moved with the ground it gains', () => {
		const empty = render(<FrontLine siteId="e" theirs={0} mine={0} />);
		expect(empty.container.querySelector('[data-front="e"]').getAttribute('data-front-lead')).toBe('empty');
		const { container } = render(<FrontLine siteId="p" theirs={12} mine={0} preview={{ theirs: 12, mine: 18 }} />);
		const front = container.querySelector('[data-front="p"]');
		expect(front.getAttribute('data-front-lead')).toBe('mine');
		expect(front.className).toContain('rec-front--preview');
		expect(front.className).toContain('rec-front--gain-mine');
		expect(container.querySelector('[data-front-total="mine"]').textContent).toBe('18');
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

	it('puts the rival row above yours, each with its sends, and marks a rival pass', () => {
		const { container } = render(<ScorePips mine={1} theirs={3} toClinch={5} rivalPassed mySends={8} theirSends={6} worldsAhead={6} />);
		const rows = [...container.querySelectorAll('.rec-score-row')];
		expect(rows[0].getAttribute('data-sites-b')).toBe('3');
		expect(rows[1].getAttribute('data-sites-a')).toBe('1');
		expect(rows[0].querySelectorAll('.rec-pip--lit').length).toBe(3);
		expect(container.querySelector('[data-sends-side="mine"]').textContent).toBe('8');
		expect(container.querySelector('[data-sends-side="theirs"]').textContent).toBe('6');
		expect(container.querySelector('[data-rival-passed]')).not.toBeNull();
	});

	it('strikes out what the Clash would take and marks a fall', () => {
		const loses = render(<HoldBar hold={15} after={2} side="mine" />);
		expect(loses.container.firstChild.className).toContain('rec-hbar--loses');
		const falls = render(<HoldBar hold={13} after={0} side="theirs" />);
		expect(falls.container.firstChild.className).toContain('rec-hbar--falls');
	});

	it('crowns a ruled world in the winner color with the printed margin', () => {
		const { container } = render(<Crest verdict={{ who: 'yours', text: 'yours by 10', margin: 9.96, shownMargin: 10, unopposed: false }} />);
		expect(container.querySelector('[data-crest]').getAttribute('data-crest')).toBe('mine');
		expect(container.textContent).toBe('+10');
	});
});
