import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { buildDraftPools, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import {
	createMatch, send, forecastClash, forecastSend, DEFAULT_RULES,
} from '@xalians/rules/expedition/expeditionRules';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { ROSTER_SIZE } from '@xalians/rules/expedition/expeditionInterpretation';
import { roleOf } from '@xalians/rules/expedition/creatureOnTable';
import { fitTable, forecastTotalsAt, standingScale, STANDING_FLOOR, roundTrack, FIT_SCALE, fitScale, fitTakesAny, FIT_RIVAL_ROOM } from '../reclamationFit';
import { Standing, FitStrip, ScorePips, HoldBar, Crest, WhyMarks, whyWords, fitSentence, factorText } from '../reclamationInstruments';

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
				expect(cell.homeFactor).toBe(cell.home ? 1.5 : 1);
				if (cell.climate) expect(cell.climate.factor).toBe(cell.climate.level === 'severe' ? 0.25 : 0.5);
				// the card's arithmetic closes: a whole normal hold times the printed factor, rounded once, is the number
				expect(Number.isInteger(cell.body)).toBe(true);
				if (!cell.selfLift) {
					expect(cell.own).toBe(Math.round(cell.body * cell.homeFactor * (cell.climate ? cell.climate.factor : 1)));
				}
			}));
		});
		expect(selfLifts).toBeGreaterThan(0);
	});

	it('is null outside Deploy', () => {
		expect(fitTable({ phase: 'matchEnd' }, 'A', [])).toBe(null);
	});

	// pass 57: a column is stacked from what makes it, so its parts must add up to the engine's swing
	it('breaks every swing into own, allies and taken, with the toll and the reasons beside them', () => {
		let match = makeMatch();
		const rival = match.turn;
		const seat = other(rival);
		const sites = match.frames[match.frameIndex].sites;
		// a rival striker, so the Clash there is a fight (a lone shield cancels every blow and nothing is taken)
		const striker = match.players[rival].roster.find((r) => roleOf(r, match.rules) === 'strike');
		match = send(match, rival, striker.id, sites[0].id);
		const table = fitTable(match, seat, match.players[seat].roster);
		let fights = 0;
		let reasons = 0;
		Object.values(table.fits).forEach((row) => Object.entries(row).forEach(([siteId, cell]) => {
			expect(cell.own + cell.allies + cell.taken).toBeCloseTo(cell.swing, 6);
			// pass 58: the number a card prints is your side alone, and each side's part is its own total's change
			expect(cell.gain).toBeCloseTo(cell.own + cell.allies, 6);
			expect(cell.gain).toBeCloseTo(cell.after.mine - table.base[siteId].mine, 6);
			expect(cell.taken).toBeCloseTo(Math.max(0, table.base[siteId].theirs - cell.after.theirs), 6);
			// the pointer: the column passes it exactly when the send would put you ahead
			expect(cell.clear).toBeCloseTo(Math.max(0, cell.after.theirs - table.base[siteId].mine), 6);
			if (cell.clear > 0.05) expect(cell.gain > cell.clear + 0.05).toBe(cell.after.mine - cell.after.theirs > 0.05);
			if (cell.downs > 0) expect(cell.taken).toBeGreaterThan(0);
			expect(cell.toll).toBeGreaterThanOrEqual(0);
			expect(cell.going).toBeCloseTo(cell.own + cell.toll, 6);
			expect(cell.body).toBeGreaterThan(0);
			if (cell.falls) expect(cell.own).toBe(0);
			// only a world with a rival on it can take anything off the rival
			if (siteId !== sites[0].id) expect(cell.taken).toBe(0);
			if (cell.taken > 0) fights += 1;
			if (cell.home) expect(cell.isHome).toBe(true);
			if (cell.climate) {
				expect(['strained', 'severe']).toContain(cell.climate.level);
				expect(['hot', 'cold', 'breath', 'medium', 'strained']).toContain(cell.climate.cause);
			}
			if (cell.home || cell.climate) reasons += 1;
		}));
		expect(fights).toBeGreaterThan(0);
		expect(reasons).toBeGreaterThan(0);
		expect(fitTakesAny(table)).toBe(true);
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

	it('prints your side alone on each column, the rival loss on a brass tag, and ticks the lead still to pass', () => {
		const sites = [
			{ id: 's1', world: { planet: 'One', element: 'fire' } },
			{ id: 's2', world: { planet: 'Two', element: 'air' } },
			{ id: 's3', world: { planet: 'Three', element: 'ice' } },
		];
		// s1: holds 6.2 after losing 2, downs the rival's 12 there; s2: home, holds 9.6, the rival still 14 ahead; s3: falls
		const row = {
			s1: { swing: 18.2, gain: 6.2, clear: 0, downs: 1, rivalBefore: 12, deficit: 12, takes: true, after: { mine: 6.2, theirs: 0 }, own: 6.2, toll: 2, allies: 0, taken: 12, body: 8, home: false, climate: null },
			s2: { swing: 9.6, gain: 9.6, clear: 14, downs: 0, rivalBefore: 14, deficit: 14, takes: false, after: { mine: 9.6, theirs: 14 }, own: 9.6, toll: 0, allies: 0, taken: 0, body: 8, home: true, climate: null },
			s3: { swing: -1.2, gain: -1.2, clear: 0, downs: 0, deficit: 0, takes: false, after: { mine: 0, theirs: 0 }, own: 0, toll: 3, allies: -1.2, taken: 0, body: 8, home: false, climate: { level: 'strained', cause: 'cold' }, falls: true },
		};
		const room = FIT_RIVAL_ROOM;
		const { container } = render(<FitStrip sites={sites} row={row} scale={24} room={room} />);
		const cols = [...container.querySelectorAll('[data-fit-site]')];
		// the number is your side's gain alone: 6, not the 18 that added the rival's 12
		expect(cols.map((c) => c.querySelector('.rec-fit-num').textContent)).toEqual(['6', '10', '−1']);
		expect(cols[0].className).toContain('rec-fit-col--takes');
		expect(cols[1].className).toContain('rec-fit-col--short');
		expect(cols[2].className).toContain('rec-fit-col--hurts');
		// the pointer is what the rival would still lead by: nothing once the send downs its 12
		expect(cols[0].querySelector('.rec-fit-tick')).toBeNull();
		expect(cols[1].querySelector('.rec-fit-tick')).not.toBeNull();
		expect(Number(cols[1].style.getPropertyValue('--fit-tick'))).toBeCloseTo((14 / 24) * room, 3);
		// what it does to the rival is the rival's own brass tag, its total there now and after, never part of the column
		const tag = cols[0].querySelector('[data-fit-rival]');
		expect(tag.textContent).toBe('12\u21920');
		expect(tag.getAttribute('data-fit-downs')).toBe('1');
		expect(cols[1].querySelector('[data-fit-rival]')).toBeNull();
		expect(cols[0].querySelector('.rec-fit-part--taken')).toBeNull();
		// own at the bottom, then allies, then what the Clash takes off it hatched on top, inside the room left under the tags
		expect(Number(cols[0].style.getPropertyValue('--p-own'))).toBeCloseTo((6.2 / 24) * room, 3);
		expect(Number(cols[0].style.getPropertyValue('--p-lost-at'))).toBeCloseTo((6.2 / 24) * room, 3);
		expect(Number(cols[0].style.getPropertyValue('--p-lost'))).toBeCloseTo((2 / 24) * room, 3);
		expect(cols[0].style.getPropertyValue('--p-taken')).toBe('');
		expect(cols[0].className).toContain('rec-fit-col--fights');
		// the body line across the strip, and the reasons under each column
		expect(Number(container.querySelector('[data-fit]').style.getPropertyValue('--fit-body'))).toBeCloseTo((8 / 24) * room, 3);
		expect(cols[0].querySelector('[data-why]')).toBeNull();
		expect(cols[1].querySelector('[data-why="home"]')).not.toBeNull();
		expect(cols[2].querySelector('[data-why="cold"]')).not.toBeNull();
		expect(cols[2].querySelector('[data-why="falls"]')).not.toBeNull();
	});

	// pass 59: each mark carries the factor it applies, so the card shows how its number was made
	it('prints each mark with its factor, and leaves a creature that falls to its cross', () => {
		expect(factorText(1.5)).toBe('\u00d71\u00bd');
		expect(factorText(0.5)).toBe('\u00d7\u00bd');
		expect(factorText(0.25)).toBe('\u00d7\u00bc');
		const home = render(<WhyMarks reasons={{ home: true, homeFactor: 1.5 }} factors />);
		expect(home.container.querySelector('.rec-why-x').textContent).toBe('\u00d71\u00bd');
		const cold = render(<WhyMarks reasons={{ climate: { level: 'severe', cause: 'cold', factor: 0.25 } }} factors />);
		expect(cold.container.querySelector('.rec-why-x').textContent).toBe('\u00d7\u00bc');
		const self = render(<WhyMarks reasons={{ selfLift: 1.2 }} factors />);
		expect(self.container.querySelector('[data-why="self"]')).not.toBeNull();
		expect(self.container.querySelector('.rec-why-x').textContent).toBe('+1');
		// two marks in one column: only the first carries its factor; a fall carries none
		const two = render(<WhyMarks reasons={{ climate: { level: 'strained', cause: 'hot', factor: 0.5 }, company: 2 }} factors />);
		expect(two.container.querySelectorAll('.rec-why-x').length).toBe(1);
		const falls = render(<WhyMarks reasons={{ climate: { level: 'strained', cause: 'hot', factor: 0.5 }, falls: true }} factors />);
		expect(falls.container.querySelectorAll('.rec-why-x').length).toBe(0);
		expect(falls.container.querySelector('[data-why="falls"]')).not.toBeNull();
		// without `factors` (a creature standing on a world) the marks stay bare
		const bare = render(<WhyMarks reasons={{ home: true, homeFactor: 1.5 }} />);
		expect(bare.container.querySelector('.rec-why-x')).toBeNull();
	});

	it('names each reason in words for the title, and draws nothing for a creature with none', () => {
		expect(whyWords({ home: true })).toEqual(['its home world: it holds half again as much here']);
		expect(whyWords({ climate: { level: 'severe', cause: 'hot' } })[0]).toBe('too hot for it here: it holds a quarter of what it would');
		const none = render(<WhyMarks reasons={{ home: false, climate: null, company: 0, falls: false }} />);
		expect(none.container.querySelector('[data-why]')).toBeNull();
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
		expect(Number(col.style.getPropertyValue('--p-own'))).toBeCloseTo(9.4 / FIT_SCALE, 3);
		expect(Number(col.style.getPropertyValue('--p-lost'))).toBeCloseTo((14 - 9.4) / FIT_SCALE, 3);
		expect(col.querySelector('.rec-fit-part--lost')).not.toBeNull();
		const falls = render(<FitStrip sites={sites} row={null} sentSiteId="s1" sentCell={{ hold: 0, downed: true, before: 8 }} />);
		const fallen = falls.container.querySelector('[data-fit-site="s1"]');
		expect(fallen.getAttribute('data-fit-sent')).toBe('falls');
		expect(fallen.className).toContain('rec-fit-col--falls');
		expect(fallen.querySelector('.rec-fit-falls')).not.toBeNull();
	});

	it('draws what a swift creature would do by moving, in the columns of the worlds it could step to', () => {
		const sites = [{ id: 's1', world: { planet: 'One', element: 'fire' } }, { id: 's2', world: { planet: 'Two', element: 'air' } }, { id: 's3', world: { planet: 'Three', element: 'ice' } }];
		// pass 58: a move reads like a send at the world it would join, your side and the rival's apart
		const moveRow = {
			s2: { swing: 14.2, gain: 6.2, own: 6.2, allies: 0, toll: 1, taken: 8, rivalBefore: 11, downs: 0, clear: 0, takes: true },
			s3: { swing: -12, gain: -1, own: 0, allies: -1, toll: 4, taken: 0, downs: 0, clear: 0, takes: false, falls: true },
		};
		const { container } = render(<FitStrip sites={sites} row={null} sentSiteId="s1" sentCell={{ hold: 9, downed: false, before: 9 }} moveRow={moveRow} />);
		const cols = [...container.querySelectorAll('[data-fit-site]')];
		expect(cols[1].className).toContain('rec-fit-col--move');
		expect(cols[1].querySelector('.rec-fit-num').textContent).toBe('6');
		expect(cols[1].querySelector('[data-fit-rival]').textContent).toBe('11\u21923');
		expect(cols[2].className).toContain('rec-fit-col--hurts');
		expect(cols[2].querySelector('.rec-fit-num').textContent).toBe('\u22121');
	});

	it('says each side apart in the card title, and who would lead', () => {
		const sites = [{ id: 's1', world: { planet: 'Endessa', element: 'sand' } }];
		const row = { s1: { gain: 20, own: 20, allies: 0, toll: 0, taken: 14, downs: 1, falls: false, after: { mine: 20, theirs: 0 }, home: true } };
		const text = fitSentence(sites, row);
		expect(text).toContain('it would hold 20');
		expect(text).toContain('the rival would lose 14 there (one creature downed)');
		expect(text).toContain('you would lead 20 to 0');
		expect(text).not.toMatch(/34/);
	});

	// pass 58: a side one world from winning shows it, on its next pennant
	it('lights the pennant that would win the game for a side one world away', () => {
		const { container } = render(<ScorePips mine={2} theirs={4} toClinch={5} mySends={7} theirSends={4} myCap={11} theirCap={11} turn="mine" />);
		const points = [...container.querySelectorAll('[data-match-point]')];
		expect(points.map((p) => p.getAttribute('data-match-point'))).toEqual(['theirs']);
		expect(container.querySelector('.rec-score-row--theirs').getAttribute('aria-label')).toContain('The rival is one world from winning.');
		const none = render(<ScorePips mine={1} theirs={3} toClinch={5} turn="mine" />);
		expect(none.container.querySelector('[data-match-point]')).toBeNull();
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
