import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { buildDraftPools, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import {
	createMatch, send, forecastStanding, forecastSendStanding, DEFAULT_RULES,
} from '@xalians/rules/expedition/expeditionRules';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { ROSTER_SIZE } from '@xalians/rules/expedition/expeditionInterpretation';
import { roleOf } from '@xalians/rules/expedition/creatureOnTable';
import { fitTable, forecastTotalsAt, standingScale, STANDING_FLOOR, roundTrack, FIT_SCALE, fitScale } from '../reclamationFit';
import { Standing, SideRow, RoundTrack, pennantsFor, HoldBar, Crest, WhyMarks, whyWords, factorText } from '../reclamationInstruments';

/*
	PASS 52, THE GLANCE REDESIGN (docs/design/reclamation-glance-redesign.md).

	The table's instruments print engine numbers without a label beside them, so what each
	one says has to be pinned: the fit strip is the engine's forecast of that exact send,
	the standing (pass 54) draws the forecast totals on one scale, and the marks (the tick,
	the lit column, the cross) appear exactly when the numbers call for them. The match under
	test is the engine's own, built from a real draft pool.

	PASS 72 (docs/design/reclamation-placement-stacks.md): the table reads the board stacked, with
	no Clash run, so nothing on a card or a world says what the fight would take.
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
				const expected = forecastTotalsAt(match, seat, forecastSendStanding(match, seat, record.id, site.id), site.id, record.id);
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

	it('stacks the board as it stands for the standing, with nothing fought ahead of time', () => {
		let match = makeMatch();
		const rival = match.turn;
		const seat = other(rival);
		const site = match.frames[match.frameIndex].sites[1];
		match = send(match, rival, match.players[rival].roster[2].id, site.id);
		const table = fitTable(match, seat, match.players[seat].roster);
		expect(table.base[site.id]).toEqual(forecastTotalsAt(match, seat, forecastStanding(match, seat), site.id));
		// the rival's creature stands at its full hold, and the table does not guess at the Clash
		expect(table.base[site.id].theirs).toBeGreaterThan(0);
		expect(table.base[site.id].theirs).toBe(table.base[site.id].theirsBefore);
	});

	// pass 59: a bolster alone at a world lifts itself (the rules say "itself included"); that is not company
	it('tells a bolster lifting itself apart from company, and carries each factor that makes the number', () => {
		let selfLifts = 0;
		[7, 11, 13, 21].forEach((seed) => {
			const { poolA, poolB } = buildDraftPools(seed, draftOptionsFromRules(DEFAULT_RULES));
			const match = createMatch({ rosterA: poolA.slice(0, ROSTER_SIZE), rosterB: poolB.slice(0, ROSTER_SIZE), worlds: getWorlds(), seed });
			const seat = match.turn;
			const table = fitTable(match, seat, match.players[seat].roster);
			match.players[seat].roster.forEach((record) => Object.values(table.fits[record.id]).forEach((cell) => {
				// round 1: every world is empty, so nothing there is company
				expect(cell.company).toBe(0);
				if (cell.selfLift) {
					expect(roleOf(record, match.rules)).toBe('bolster');
					selfLifts += 1;
				}
				// pass 71: home ground is a quarter more
				expect(cell.homeFactor).toBe(cell.home ? 1.25 : 1);
				if (cell.worldElement) expect(cell.worldElement.factor).toBe(0.9);
				if (cell.climate) expect(cell.climate.factor).toBe((cell.climate.cause === 'cold' || cell.climate.cause === 'hot') ? (cell.climate.level === 'severe' ? 0.75 : 0.9) : (cell.climate.level === 'severe' ? 0.25 : 0.5));
				// the card's arithmetic closes: a whole normal hold times the printed factor, rounded once, is the number
				expect(Number.isInteger(cell.body)).toBe(true);
				if (!cell.selfLift) {
					expect(cell.own).toBe(Math.round(cell.body * cell.homeFactor * (cell.worldElement ? cell.worldElement.factor : 1) * (cell.climate ? cell.climate.factor : 1)));
				}
			}));
		});
		expect(selfLifts).toBeGreaterThan(0);
	});

	it('is null outside Deploy', () => {
		expect(fitTable({ phase: 'matchEnd' }, 'A', [])).toBe(null);
	});

	// pass 57: a column is stacked from what makes it, so its parts must add up to the engine's swing
	it('breaks every swing into own and allies, with the reasons beside them and no fight', () => {
		let match = makeMatch();
		const rival = match.turn;
		const seat = other(rival);
		const sites = match.frames[match.frameIndex].sites;
		const striker = match.players[rival].roster.find((r) => roleOf(r, match.rules) === 'strike');
		match = send(match, rival, striker.id, sites[0].id);
		const table = fitTable(match, seat, match.players[seat].roster);
		let reasons = 0;
		Object.values(table.fits).forEach((row) => Object.entries(row).forEach(([siteId, cell]) => {
			// pass 72: a send never takes anything off the rival ahead of the Clash, and nothing falls
			expect(cell.taken).toBe(0);
			expect(cell.toll).toBe(0);
			expect(cell.falls).toBe(false);
			expect(cell.downs).toBe(0);
			expect(cell.own + cell.allies).toBeCloseTo(cell.swing, 6);
			// pass 58: the number a card prints is your side alone, and each side's part is its own total's change
			expect(cell.gain).toBeCloseTo(cell.own + cell.allies, 6);
			expect(cell.gain).toBeCloseTo(cell.after.mine - table.base[siteId].mine, 6);
			expect(cell.after.theirs).toBeCloseTo(table.base[siteId].theirs, 6);
			// the pointer: the column passes it exactly when the send would give you more there than the rival
			expect(cell.clear).toBeCloseTo(Math.max(0, cell.after.theirs - table.base[siteId].mine), 6);
			if (cell.clear > 0.05) expect(cell.gain > cell.clear + 0.05).toBe(cell.after.mine - cell.after.theirs > 0.05);
			expect(cell.going).toBeCloseTo(cell.own, 6);
			expect(cell.body).toBeGreaterThan(0);
			if (cell.home) expect(cell.isHome).toBe(true);
			if (cell.climate) {
				expect(['strained', 'severe']).toContain(cell.climate.level);
				expect(['hot', 'cold', 'breath', 'medium', 'strained']).toContain(cell.climate.cause);
			}
			if (cell.home || cell.climate) reasons += 1;
		}));
		expect(reasons).toBeGreaterThan(0);
		// the bench's scale holds the tallest column, in steps of six, and never shrinks below FIT_SCALE
		const scale = fitScale(table);
		expect(scale).toBeGreaterThanOrEqual(FIT_SCALE);
		expect(scale % 6).toBe(0);
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
				marks={{ art: <i data-art-probe /> }}
			/>,
		);
		const st = container.querySelector('[data-standing="p"]');
		expect(st.getAttribute('data-standing-lead')).toBe('mine');
		expect(st.className).toContain('rec-standing--preview');
		expect(container.querySelector('[data-standing-ghost]').getAttribute('data-standing-ghost')).toBe('18');
		expect(container.querySelector('[data-standing-side="theirs"] .rec-standing-loss')).not.toBeNull();
		expect(container.querySelector('[data-standing-total="mine"]').textContent).toBe('18');
		// the creature itself rides the run it would add (pass 54); why it holds that stands with its ghost piece (pass 57)
		expect(container.querySelector('[data-standing-total="mine"] [data-art-probe]')).not.toBeNull();
		expect(container.querySelector('[data-standing-total="mine"] [data-why]')).toBeNull();
	});

	// pass 58: a send that takes the rival to nothing prints its 0, so the two totals are read side by side
	it('prints the rival total as 0 when a preview takes it to nothing', () => {
		const { container } = render(
			<Standing siteId="z" now={{ theirs: 14, mine: 0, theirsBefore: 14, mineBefore: 0 }} preview={{ theirs: 0, mine: 20, theirsBefore: 14, mineBefore: 20 }} scale={24} />,
		);
		expect(container.querySelector('[data-standing-total="theirs"]').textContent).toBe('0');
		expect(container.querySelector('[data-standing-total="mine"]').textContent).toBe('20');
		const rest = render(<Standing siteId="e" now={{ theirs: 0, mine: 6, theirsBefore: 0, mineBefore: 6 }} scale={24} />);
		expect(rest.container.querySelector('[data-standing-total="theirs"]')).toBeNull();
	});

	it('puts the pennant at the end of the winner bar once the world is ruled', () => {
		const { container } = render(<Standing siteId="r" now={{ theirs: 7, mine: 10, theirsBefore: 7, mineBefore: 10 }} scale={24} verdict={{ who: 'yours', text: 'yours by 3', margin: 3 }} />);
		expect(container.querySelector('[data-standing-total="mine"] [data-crest]').getAttribute('data-crest')).toBe('mine');
		expect(container.querySelector('[data-standing-total="theirs"] [data-crest]')).toBeNull();
	});

	// pass 59: each mark carries the factor it applies, so the card shows how its number was made
	it('prints each mark with its factor', () => {
		expect(factorText(1.5)).toBe('\u00d71\u00bd');
		expect(factorText(0.5)).toBe('\u00d7\u00bd');
		expect(factorText(0.25)).toBe('\u00d7\u00bc');
		// pass 68: a world's temperature takes a tenth, or a quarter far off
		expect(factorText(0.9)).toBe('\u00d70.9');
		expect(factorText(0.75)).toBe('\u00d70.75');
		const home = render(<WhyMarks reasons={{ home: true, homeFactor: 1.5 }} factors />);
		expect(home.container.querySelector('.rec-why-x').textContent).toBe('\u00d71\u00bd');
		const cold = render(<WhyMarks reasons={{ climate: { level: 'severe', cause: 'cold', factor: 0.75 } }} factors />);
		expect(cold.container.querySelector('.rec-why-x').textContent).toBe('\u00d70.75');
		const self = render(<WhyMarks reasons={{ selfLift: 1.2 }} factors />);
		expect(self.container.querySelector('[data-why="self"]')).not.toBeNull();
		expect(self.container.querySelector('.rec-why-x').textContent).toBe('+1');
		// two marks in one column: only the first carries its factor
		const two = render(<WhyMarks reasons={{ climate: { level: 'strained', cause: 'hot', factor: 0.5 }, company: 2 }} factors />);
		expect(two.container.querySelectorAll('.rec-why-x').length).toBe(1);
		// without `factors` (a creature standing on a world) the marks stay bare
		const bare = render(<WhyMarks reasons={{ home: true, homeFactor: 1.5 }} />);
		expect(bare.container.querySelector('.rec-why-x')).toBeNull();
	});

	it('names each reason in words for the title, and draws nothing for a creature with none', () => {
		expect(whyWords({ home: true })).toEqual(['its home world: it holds a quarter more here']);
		expect(whyWords({ worldElement: { element: 'water', against: 'fire', factor: 0.9 } })).toEqual(['a water world is hard on fire: it holds nine tenths here']);
		expect(whyWords({ climate: { level: 'severe', cause: 'hot' } })[0]).toBe('too hot for it here: it holds three quarters of what it would');
		expect(whyWords({ climate: { level: 'severe', cause: 'breath' } })[0]).toMatch(/it holds a quarter of what it would$/);
		const none = render(<WhyMarks reasons={{ home: false, climate: null, company: 0, falls: false }} />);
		expect(none.container.querySelector('[data-why]')).toBeNull();
	});

	// pass 58: a side one world from winning shows it, on its next pennant
	it('lights the pennant that would win the game for a side one world away', () => {
		const flags = (n) => Array.from({ length: n }).map(() => ({ element: 'fire', planet: 'Magmuth' }));
		const theirs = render(<SideRow side="theirs" pennants={flags(4)} toClinch={5} sends={4} cap={11} turn="mine" />);
		expect([...theirs.container.querySelectorAll('[data-match-point]')].map((p) => p.getAttribute('data-match-point'))).toEqual(['theirs']);
		expect(theirs.container.querySelector('.rec-score-row--theirs').getAttribute('aria-label')).toContain('The rival is one world from winning.');
		const none = render(<SideRow side="mine" pennants={flags(3)} toClinch={5} turn="mine" />);
		expect(none.container.querySelector('[data-match-point]')).toBeNull();
		const over = render(<SideRow side="theirs" pennants={flags(4)} toClinch={5} over />);
		expect(over.container.querySelector('[data-match-point]')).toBeNull();
		// the last round is played out, so a side can finish past the clinch: six pennants and "6", never "6/5"
		const past = render(<SideRow side="theirs" pennants={flags(6)} toClinch={5} over />);
		expect(past.container.querySelectorAll('.rec-flag--lit').length).toBe(6);
		expect(past.container.querySelector('.rec-side-count').textContent).toBe('6');
	});

	/*
		PASS 65. Each side's row stands at its own edge: the rival's in the top bar, yours at the
		foot. A row carries its pointer, its pennants in the colors of the worlds won, and its deck.
	*/
	it('draws a side as its pointer, its pennants in the worlds\' colors, and its meter of sends', () => {
		const pennants = [{ element: 'electric', planet: 'Zolton' }, { element: 'psychic', planet: 'Telypso' }, { element: 'psychic', planet: 'Telypso' }];
		const { container } = render(<SideRow side="theirs" pennants={pennants} toClinch={5} sends={6} cap={11} worldsAhead={6} turn="mine" passed emblem="proctor" />);
		const row = container.querySelector('[data-score="theirs"]');
		expect(row.querySelector('.rec-score-row').getAttribute('data-sites-b')).toBe('3');
		const lit = [...row.querySelectorAll('.rec-flag--lit')];
		expect(lit.map((f) => f.getAttribute('data-flag-world'))).toEqual(['Zolton', 'Telypso', 'Telypso']);
		expect(lit[0].className).toContain('g-el-electric');
		expect(row.querySelectorAll('.rec-flag').length).toBe(5);
		expect(row.querySelector('.rec-score-row').getAttribute('aria-label')).toContain('won 3 worlds of the 5 that win the game (Zolton, Telypso, Telypso)');
		const deck = row.querySelector('[data-sends-side="theirs"]');
		// worlds won stand against the five that win; sends left are counted alone
		expect(deck.textContent).toBe('6');
		expect(row.querySelector('.rec-side-count').textContent).toBe('3/5');
		expect(deck.getAttribute('aria-label')).toContain('6 sends left for the 6 worlds still to play');
		// a piece per send still to make, none for spent ones (pass 76, round 8)
		expect(deck.querySelectorAll('.rec-sendbar-tick').length).toBe(6);
		expect(deck.querySelectorAll('.rec-sendbar-tick--left').length).toBe(6);
		// an empty slot is the same flag in outline (staff and cloth), not a dot
		const dark = [...row.querySelectorAll('.rec-flag:not(.rec-flag--lit):not(.rec-flag--point)')];
		expect(dark.length).toBe(2);
		dark.forEach((f) => expect(f.querySelector('.rec-flag-staff') && f.querySelector('.rec-flag-cloth')).toBeTruthy());
		expect(row.querySelector('[data-rival-passed]')).not.toBeNull();
		expect(row.querySelector('.rec-side-emblem')).not.toBeNull();
		// whose move it is: the pointer rides the row of the side to move
		expect(row.querySelector('[data-turn-lamp="theirs"]').hasAttribute('data-turn-on')).toBe(false);
		const mine = render(<SideRow side="mine" pennants={[]} toClinch={5} sends={0} cap={11} turn="mine" />);
		expect(mine.container.querySelector('[data-turn-lamp="mine"]').hasAttribute('data-turn-on')).toBe(true);
		expect(mine.container.querySelector('[data-sites-a]').getAttribute('data-sites-a')).toBe('0');
		expect(mine.container.querySelector('.rec-sendbar').className).toContain('rec-sendbar--empty');
		// your pieces are the meter's ticks, so your row has no separate piece; the rival keeps its emblem
		expect(mine.container.querySelector('.rec-side-piece')).toBeNull();
		expect(mine.container.querySelectorAll('svg.rec-sendbar-tick').length).toBe(0);
	});

	it('plants a pennant per world won, two for a staked one, fitted to the count the table shows', () => {
		const track = [
			{ index: 0, sites: [{ planet: 'Zolton', element: 'electric', who: 'theirs' }, { planet: 'Stonera', element: 'rock', who: 'mine' }, { planet: 'Telypso', element: 'psychic', who: 'theirs', staked: true }] },
			{ index: 1, sites: [{ planet: 'Endessa', element: 'sand', who: 'tie' }, { planet: 'Saiphus', element: 'air', who: null }, { planet: 'Luminax', element: 'light', who: null }] },
		];
		expect(pennantsFor(track, 'theirs', 3).map((f) => f.planet)).toEqual(['Zolton', 'Telypso', 'Telypso']);
		expect(pennantsFor(track, 'mine', 1).map((f) => f.planet)).toEqual(['Stonera']);
		// the Clash tells the log a step at a time: a count ahead of it gets plain pennants, and never more than the count
		expect(pennantsFor(track, 'mine', 2).map((f) => f.planet)).toEqual(['Stonera', null]);
		expect(pennantsFor(track, 'theirs', 1).map((f) => f.planet)).toEqual(['Zolton']);
	});

	it('draws the track as the worlds themselves, each with its symbol, the table\'s three framed', () => {
		const track = [
			{ index: 0, current: false, sites: [{ siteId: 'a', planet: 'Zolton', element: 'electric', who: 'theirs' }] },
			{ index: 1, current: true, sites: [{ siteId: 'b', planet: 'Endessa', element: 'sand', who: null }] },
		];
		const { container } = render(<RoundTrack track={track} frameIndex={1} />);
		const worlds = [...container.querySelectorAll('[data-track-world]')];
		expect(worlds.map((w) => w.getAttribute('data-track-world'))).toEqual(['Zolton', 'Endessa']);
		expect(worlds.every((w) => w.querySelector('svg'))).toBe(true);
		expect(container.querySelector('.rec-track-round--now [data-track-world]').getAttribute('data-track-world')).toBe('Endessa');
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
