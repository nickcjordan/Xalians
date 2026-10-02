import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { buildDraftPools, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import { createMatch, send, getPublicState, DEFAULT_RULES } from '@xalians/rules/expedition/expeditionRules';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { ROSTER_SIZE, SWEEP_DISCOUNT } from '@xalians/rules/expedition/expeditionInterpretation';
import { prepare, targetMatchupMultiplier, flippableRolesOf } from '@xalians/rules/expedition/creatureOnTable';
import { blowsAt } from '../reclamationPreview';
import { rolePower } from '../reclamationNarration';
import { reasonLines } from '../reclamationReasons';
import ReclamationFigure from '../reclamationFigure';

/*
	PASS 73, THE BLOW ON EACH TARGET (docs/design/reclamation-blow-on-target.md). While a creature
	of yours is pointed at or lifted, each creature it could hit carries one blow at full
	strength; the card carries the number that blow starts from. These hold the blow to the
	engine's arithmetic, the card's number to the blow, and the chip to its drawing.
*/

const other = (seat) => (seat === 'A' ? 'B' : 'A');

// a round-one board with a few creatures on every world, from a real draft
function boardFor(seed) {
	const { poolA, poolB } = buildDraftPools(seed, draftOptionsFromRules(DEFAULT_RULES));
	let match = createMatch({ rosterA: poolA.slice(0, ROSTER_SIZE), rosterB: poolB.slice(0, ROSTER_SIZE), worlds: getWorlds(), seed });
	for (let i = 0; i < 6; i += 1) {
		const seat = match.turn;
		const record = match.players[seat].roster[i];
		const site = match.frames[match.frameIndex].sites[i % 3];
		match = send(match, seat, record.id, site.id, false, null) || match;
	}
	return match;
}

describe('rolePower', () => {
	it('is a blow for a strike, a sweep\'s share on each creature, a mend for a bolster, and nothing for a shield', () => {
		expect(rolePower({ role: 'strike', blowMagnitude: 10 })).toBe(10);
		expect(rolePower({ role: 'sweep', blowMagnitude: 10 })).toBeCloseTo(10 * SWEEP_DISCOUNT, 9);
		expect(rolePower({ role: 'sweep', blowMagnitude: 10 }, { sweepDiscount: 0.5 })).toBe(5);
		expect(rolePower({ role: 'bolster', blowMagnitude: 10, mendMagnitude: 4 })).toBe(4);
		expect(rolePower({ role: 'shield', blowMagnitude: 10 })).toBeUndefined();
	});
});

describe('blowsAt', () => {
	it('lands a strike on each rival there, a sweep on every other creature, and nothing from support', () => {
		const seen = { strike: 0, sweep: 0, quiet: 0, charted: 0 };
		[7, 11, 13].forEach((seed) => {
			const match = boardFor(seed);
			const seat = match.turn;
			const view = getPublicState(match, seat);
			match.players[seat].roster.forEach((record) => {
				view.frame.sites.forEach((site) => {
					const out = blowsAt(view, record, site, seat, view.players[seat].sentCount);
					const here = ['A', 'B'].flatMap((s) => (view.board[site.id][s] || []).filter((e) => e.record && !(e.hidden && s !== seat)).map((e) => ({ ...e, seat: s })));
					const ids = Object.keys(out.lands).sort();
					if (out.role === 'strike') {
						expect(ids).toEqual(here.filter((e) => e.seat !== seat).map((e) => e.recordId).sort());
						seen.strike += ids.length;
					} else if (out.role === 'sweep') {
						expect(ids).toEqual(here.map((e) => e.recordId).sort());
						seen.sweep += ids.length;
					} else {
						expect(ids).toEqual([]);
						seen.quiet += 1;
					}
					// the blow is the card's number times the chart, less an armored target's quarter
					here.filter((e) => out.lands[e.recordId]).forEach((e) => {
						const land = out.lands[e.recordId];
						expect(land.mine).toBe(e.seat === seat);
						expect(land.chart).toBe(targetMatchupMultiplier(record, e.record, view.rules));
						expect(land.power).toBeCloseTo(out.power * land.chart * (land.armored ? 0.75 : 1), 0);
						if (land.chart !== 1) seen.charted += 1;
					});
				});
			});
		});
		expect(seen.strike).toBeGreaterThan(0);
		expect(seen.sweep).toBeGreaterThan(0);
		expect(seen.quiet).toBeGreaterThan(0);
		expect(seen.charted).toBeGreaterThan(0);
	});

	it('plays the act chosen under the act flip, and the natural act without it', () => {
		const match = boardFor(7);
		const seat = match.turn;
		const plain = getPublicState(match, seat);
		// the act flip is a lever, off as shipped
		const view = { ...plain, rules: { ...plain.rules, actFlip: true } };
		const record = match.players[seat].roster.find((r) => flippableRolesOf(r, view.rules).length > 1);
		expect(record).toBeDefined();
		const natural = prepare(record, view.frame.sites[0], null, 0, { rules: view.rules }).role;
		const flipped = flippableRolesOf(record, view.rules).find((role) => role !== natural);
		expect(blowsAt(view, record, view.frame.sites[0], seat, 0, flipped).role).toBe(flipped);
		expect(blowsAt(view, record, view.frame.sites[0], seat, 0, null).role).toBe(natural);
		expect(blowsAt(plain, record, view.frame.sites[0], seat, 0, flipped).role).toBe(natural);
	});

	it('leaves out a rival hidden from the handler', () => {
		const match = boardFor(11);
		const seat = match.turn;
		const view = getPublicState(match, seat);
		const site = view.frame.sites.find((s) => view.board[s.id][other(seat)].some((e) => e.record));
		const board = { ...view.board, [site.id]: { ...view.board[site.id], [other(seat)]: view.board[site.id][other(seat)].map((e) => ({ ...e, hidden: true })) } };
		const striker = match.players[seat].roster.find((r) => prepare(r, site, null, 0, { rules: view.rules }).role === 'strike');
		expect(Object.keys(blowsAt({ ...view, board }, striker, site, seat, 0).lands)).toEqual([]);
	});
});

describe('the blow on a target', () => {
	const record = { id: 'g', species: 'graviclaw', traits: [] };

	it('draws the landed blow, colored by its change against the attacker own power, dashed in the stage corner, the plates where it is armored', () => {
		const { container } = render(<ReclamationFigure record={record} seat="B" you="A" facing="down" hold={13} blowIn={{ power: 9, chart: 2, armored: true, mine: false, by: 'Tizzie', role: 'strike', base: 6, byElement: 'psychic', toElement: 'dark' }} />);
		const chip = container.querySelector('[data-blow-in]');
		// round 13: the chip prints the blow it lands (a signed change on a rival read as damage); the change against 6 colors it
		expect(chip.getAttribute('data-blow-in')).toBe('9');
		expect(chip.getAttribute('data-blow-adjust')).toBe('3');
		expect(chip.querySelector('b').textContent).toBe('−9');
		expect(chip.className).toContain('rec-figure-blow--up');
		expect(chip.style.getPropertyValue('--sq-tint')).toBe('35%');
		// the factor text is gone from the chip, kept in the title
		expect(chip.querySelector('.rec-figure-blow-x')).toBeNull();
		expect(chip.querySelector('.rec-glyph--armor')).not.toBeNull();
		// pass 79: no act mark (the target's own plate wears its act glyph just above); the minus says the blow is taken off it
		expect(chip.querySelector('.rec-glyph--role-strike')).toBeNull();
		expect(chip.className).not.toContain('--on-mine');
		expect(chip.getAttribute('title')).toBe('Each Tizzie strike lands 9 on Graviclaw at full strength (6, psychic on dark ×2, armored ×0.75). Its own attack is 6, so this lands +3 against it. A creature already hurt lands less, and a guard takes a quarter off.');
		// it sits on the stage, not in the plate's hold
		expect(chip.closest('.rec-piece-stage')).not.toBeNull();
	});

	it('colors a weaker blow red in depth by size, and leaves an even blow quiet', () => {
		const at = (power, base) => render(<ReclamationFigure record={record} seat="B" you="A" facing="down" hold={13} blowIn={{ power, chart: 1, armored: false, mine: false, by: 'Tizzie', role: 'strike', base }} />).container.querySelector('[data-blow-in]');
		const down = at(5, 6);
		expect(down.getAttribute('data-blow-adjust')).toBe('-1');
		expect(down.querySelector('b').textContent).toBe('−5');
		expect(down.className).toContain('rec-figure-blow--down');
		expect(down.style.getPropertyValue('--sq-tint')).toBe('15%');
		expect(at(4, 6).style.getPropertyValue('--sq-tint')).toBe('25%');
		expect(at(2, 6).style.getPropertyValue('--sq-tint')).toBe('35%');
		const even = at(6.2, 6);
		expect(even.getAttribute('data-blow-adjust')).toBe('0');
		expect(even.querySelector('b').textContent).toBe('−6');
		expect(even.className).toContain('rec-figure-blow--zero');
	});

	it('marks a sweep\'s blow on your own creature, leaves an even chart bare, and gives way to the Clash\'s own number', () => {
		const mine = render(<ReclamationFigure record={record} seat="A" you="A" facing="up" hold={13} blowIn={{ power: 4, chart: 1, armored: false, mine: true, by: 'Kosanos', role: 'sweep', base: 4 }} />);
		const chip = mine.container.querySelector('[data-blow-in]');
		expect(chip.className).toContain('rec-figure-blow--on-mine');
		expect(chip.querySelector('b').textContent).toBe('−4');
		expect(chip.querySelector('.rec-figure-blow-x')).toBeNull();
		expect(chip.getAttribute('title')).toBe('Each Kosanos sweep lands 4 on your Graviclaw at full strength. A creature already hurt lands less, and a guard takes a quarter off.');
		const clash = render(<ReclamationFigure record={record} seat="B" you="A" facing="down" hold={13} hit flash={{ kind: 'stagger', text: '-5' }} beat={2} blowIn={{ power: 9, chart: 2, mine: false }} />);
		expect(clash.container.querySelector('[data-blow-in]')).toBeNull();
		expect(render(<ReclamationFigure record={record} seat="B" you="A" facing="down" hold={13} />).container.querySelector('[data-blow-in]')).toBeNull();
	});

	it('says why an armored creature takes a quarter less, in the words under the creature pointed at', () => {
		const lines = reasonLines({ why: {}, record: { id: 't', species: 'tizzie', element: 'psychic' }, site: { world: { planet: 'Endessa' } }, matchups: [{ recordId: 'g', name: 'Graviclaw', element: 'dark', dealt: 0.5, taken: null, armored: true }] });
		expect(lines.map((l) => `${l.effect} ${l.cause}`)).toEqual(['Psychic on dark ×½. Its blows land half as hard on Graviclaw.', 'Graviclaw is armored. Every blow lands on it at three quarters.']);
		expect(lines[1].mark).toBe('armored');
	});
});
