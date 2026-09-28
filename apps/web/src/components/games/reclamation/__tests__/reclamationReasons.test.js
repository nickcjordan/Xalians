import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { buildDraftPools, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import { createMatch, send, forecastSendBlows, DEFAULT_RULES } from '@xalians/rules/expedition/expeditionRules';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { ROSTER_SIZE } from '@xalians/rules/expedition/expeditionInterpretation';
import { fitTable } from '../reclamationFit';
import { formatHoldShown } from '../reclamationNarration';
import { reasonLines, ReasonLines, nameBlows } from '../reclamationReasons';

/*
	PASS 61, SAY WHY (docs/design/reclamation-say-why.md). Each thing that moves a creature's number
	at a world gets a line on that world saying what it does and why, from the engine's own facts.
	These pin the words for each cause, and hold them to a real game: every world that changes a
	number says so, and the Clash's line lands on the toll the chain prints.
*/

const frackworm = { id: 'f', species: 'frackworm', traits: [] };
const zolton = { id: 'z', world: { planet: 'Zolton' }, environment: { medium: 'gas', temperatureC: { min: -40, max: 20 } } };
const warm = { temperatureC: { min: 5, max: 55 }, ambientMedia: ['gas'], breathes: ['gas'] };
const text = (lines) => lines.map((l) => `${l.effect}${l.cause ? ` ${l.cause}` : ''}`);

describe('reasonLines', () => {
	it('says a world too cold for it, what that costs, and how the two bands miss', () => {
		const lines = reasonLines({ why: { climate: { level: 'strained', cause: 'cold', factor: 0.9 } }, record: frackworm, site: zolton, tolerance: warm });
		expect(text(lines)).toEqual(['Too cold for it: it holds nine tenths. Zolton runs −40 to 20°C, mostly colder than the 5 to 55°C Frackworm is comfortable at.']);
	});

	it('says far too cold, three quarters, when the bands are far apart (pass 68: a temperature costs a tenth or a quarter)', () => {
		const hot = { ...warm, temperatureC: { min: 60, max: 90 } };
		const lines = reasonLines({ why: { climate: { level: 'severe', cause: 'cold', factor: 0.75 } }, record: frackworm, site: zolton, tolerance: hot });
		expect(lines[0].effect).toBe('Far too cold for it: it holds three quarters.');
		expect(lines[0].cause).toContain('far colder than the 60 to 90°C');
	});

	it('says what a willful creature shrugs off', () => {
		const hot = { ...warm, temperatureC: { min: 60, max: 90 } };
		const lines = reasonLines({ why: { climate: { level: 'strained', cause: 'cold', factor: 0.9 }, shrugged: true }, record: frackworm, site: zolton, tolerance: hot });
		expect(lines[0].effect).toBe('Far too cold for it, but it is willful: it holds nine tenths, not three quarters.');
	});

	it('says its home world and where it comes from', () => {
		const lines = reasonLines({ why: { home: true }, record: frackworm, site: { ...zolton, world: { planet: 'Endessa' } }, tolerance: warm });
		expect(text(lines)).toEqual(['Its home world: it holds half again. Frackworm comes from Endessa.']);
	});

	it('says air it cannot breathe, and what it breathes', () => {
		const gill = { temperatureC: { min: -60, max: 60 }, ambientMedia: ['liquid'], breathes: ['liquid'] };
		const lines = reasonLines({ why: { climate: { level: 'severe', cause: 'breath', medium: 'gas', factor: 0.25 } }, record: frackworm, site: zolton, tolerance: gill });
		expect(text(lines)).toEqual(['It cannot breathe here: it holds a quarter. Zolton here is open air; Frackworm breathes water.']);
		expect(lines[0].mark).toBe('breath');
	});

	it('names the fight behind the Clash toll, in the chain\'s own numbers', () => {
		const blows = { taken: [{ by: 'v', name: 'Venemist', power: 3, roles: ['strike'], mine: false }], downs: [{ name: 'Hippochamp', mine: false }], recovered: 0, unlifted: 0, alliesDowned: [], falls: false };
		const lines = reasonLines({ why: { going: 7, own: 4 }, record: frackworm, site: zolton, tolerance: warm, blows });
		expect(text(lines)).toEqual(['The Clash takes 3. Venemist strikes it for 3.', 'It downs Hippochamp.']);
	});

	it('says the order of the fight: who acts first, a hurt attacker, a creature downed before it acts', () => {
		const blows = { taken: [{ by: 'h', name: 'Hippochamp', power: 5, roles: ['sweep'], mine: false, hurt: true }], downs: [{ name: 'Hippochamp', mine: false, early: false }, { name: 'Kosanos', mine: false, early: true }], recovered: 0, unlifted: 0, alliesDowned: [], falls: false, first: true };
		const lines = reasonLines({ why: { going: 20, own: 15 }, record: frackworm, site: zolton, tolerance: warm, blows });
		expect(text(lines)).toEqual(['The Clash takes 5. It acts first; Hippochamp, hurt by then and so weaker, catches it in a sweep for 5.', 'It downs Hippochamp, and Kosanos before it can act.']);
	});

	it('says what it lands on a creature it does not down', () => {
		const blows = { taken: [{ by: 'h', name: 'Hippochamp', power: 11, count: 3, roles: ['sweep'], mine: false, hurt: true }], dealt: [{ to: 'h', name: 'Hippochamp', power: 5, count: 1, downs: false, mine: false }], downs: [], recovered: 0, unlifted: 0, alliesDowned: [], falls: true, first: true };
		expect(text(reasonLines({ why: { going: 9, own: 0, falls: true }, record: frackworm, site: zolton, blows }))).toEqual(['It falls in the Clash (it goes in with 9). It acts first and hits Hippochamp for 5; Hippochamp, hurt by then and so weaker, catches it in three sweeps for 11 in all.']);
		const untouched = { taken: [], dealt: [{ to: 'v', name: 'Venemist', power: 4, count: 1, downs: false, mine: false }], downs: [], recovered: 0, unlifted: 0, alliesDowned: [], falls: false, first: true };
		expect(text(reasonLines({ why: { going: 9, own: 9 }, record: frackworm, site: zolton, blows: untouched }))).toEqual(['It hits Venemist for 4.']);
	});

	it('says when a fallen ally takes its lift with it, and when it falls', () => {
		const twice = { taken: [{ by: 'h', name: 'Hippochamp', power: 11, count: 2, roles: ['sweep'], mine: false }], downs: [], recovered: 0, unlifted: 0, alliesDowned: [], falls: false };
		expect(reasonLines({ why: { going: 20, own: 9 }, record: frackworm, site: zolton, blows: twice })[0].cause).toBe('Hippochamp catches it in two sweeps for 11 in all.');
		const lifted = { taken: [], downs: [], recovered: 0, unlifted: 6, alliesDowned: ['Figzy'], falls: false };
		expect(text(reasonLines({ why: { going: 13, own: 7 }, record: frackworm, site: zolton, blows: lifted }))).toEqual(['The Clash takes 6. Your Figzy falls beside it, and the lift goes with it (6).']);
		const falls = { taken: [{ by: 'v', name: 'Venemist', power: 14, roles: ['strike'], mine: false }], downs: [], recovered: 0, unlifted: 0, alliesDowned: [], falls: true };
		expect(text(reasonLines({ why: { going: 12, own: 0, falls: true }, record: frackworm, site: zolton, blows: falls }))).toEqual(['It falls in the Clash (it goes in with 12). Venemist strikes it for 14.']);
	});

	/*
		PASS 67. Nick, on Sonalloy forecast to fall to Kosanos and Tizzie forecast to beat it: "How
		does one of them decide that my creature would win the fight and the other one decides that
		my creature would lose?" Both now say who goes first, and the forecast says what it rests on.
	*/
	it('says who goes first when the rival lands before it, and that a bolster never strikes', () => {
		const quicker = { taken: [{ by: 'k', name: 'Kosanos', power: 16, roles: ['strike'], mine: false, before: true }], dealt: [], downs: [], recovered: 0, unlifted: 0, alliesDowned: [], falls: true, first: false, strikes: true, fallsBeforeActing: true };
		expect(text(reasonLines({ why: { going: 13, own: 0, falls: true }, record: frackworm, site: zolton, blows: quicker }))).toEqual(['It falls before it can act (it goes in with 13). Kosanos is quicker and strikes it first for 16.']);
		const bolster = { taken: [{ by: 'k', name: 'Kosanos', power: 16, roles: ['strike'], mine: false, before: true }], dealt: [], downs: [], recovered: 0, unlifted: 0, alliesDowned: [], falls: true, first: false, strikes: false, fallsBeforeActing: false };
		expect(text(reasonLines({ why: { going: 13, own: 0, falls: true }, record: frackworm, site: zolton, blows: bolster, role: 'bolster' }))).toEqual(['It falls in the Clash (it goes in with 13). Kosanos strikes it for 16; a bolster mends and never strikes, so nothing weakens Kosanos first.']);
	});

	// pass 69: what a support creature of yours does for it, each in its own number
	it('says what your support creature guards, steadies and mends', () => {
		const covered = { taken: [{ by: 'n', name: 'Neph', power: 9, roles: ['strike'], mine: false }], dealt: [], downs: [], recovered: 4, unlifted: 0, alliesDowned: [], falls: false, first: false, strikes: true, guardedOff: 3, guardByName: 'Kosanos', shrugged: ['restrained'], steadiedByName: 'Kosanos' };
		expect(reasonLines({ why: { going: 14, own: 9 }, record: frackworm, site: zolton, blows: covered })[0].cause)
			.toBe("Neph strikes it for 9; your Kosanos's guard takes 3 off; your Kosanos keeps it clear: no restrained; your Kosanos mends 4.");
		const itself = { ...covered, guardByName: 'itself', steadiedByName: 'itself' };
		expect(reasonLines({ why: { going: 14, own: 9 }, record: frackworm, site: zolton, blows: itself })[0].cause)
			.toBe('Neph strikes it for 9; its own guard takes 3 off; it keeps itself clear: no restrained; it mends 4.');
	});

	it("says a quicker rival's blow before what the creature lands back", () => {
		const blows = { taken: [{ by: 'h', name: 'Hippochamp', power: 11, count: 2, roles: ['sweep'], mine: false, before: true }], dealt: [{ to: 'h', name: 'Hippochamp', power: 1, count: 1, downs: false, mine: false }], downs: [], recovered: 0, unlifted: 0, alliesDowned: [], falls: true, first: false, strikes: true, fallsBeforeActing: false };
		expect(reasonLines({ why: { going: 7, own: 0, falls: true }, record: frackworm, site: zolton, blows })[0].cause).toBe('Hippochamp is quicker and catches it first in two sweeps for 11 in all; then it hits Hippochamp for 1.');
	});

	it('says the forecast holds only if nothing else arrives while the rival can still answer', () => {
		const blows = { taken: [{ by: 'k', name: 'Kosanos', power: 4, roles: ['strike'], mine: false, hurt: true }], dealt: [], downs: [{ name: 'Kosanos', mine: false, early: false }], recovered: 0, unlifted: 0, alliesDowned: [], falls: false, first: true, strikes: true };
		expect(text(reasonLines({ why: { going: 7, own: 3 }, record: frackworm, site: zolton, blows, open: true }))).toEqual(['The Clash takes 4 if nothing else arrives. It acts first; Kosanos, hurt by then and so weaker, strikes it for 4.', 'It downs Kosanos.']);
		expect(text(reasonLines({ why: { going: 7, own: 3 }, record: frackworm, site: zolton, blows, open: false }))[0]).toMatch(/^The Clash takes 4\. /);
	});

	// pass 62: "It steadies itself: +6" at one world and "+1" at the next, with nothing to tell them apart
	it('says whether a bolster eased the world a grade or added the flat 1', () => {
		const hot = reasonLines({ why: { climate: { level: 'strained', cause: 'hot', factor: 0.9 }, selfLift: 6 }, record: frackworm, site: zolton, tolerance: warm });
		expect(hot.find((l) => l.key === 'self').cause).toBe('A bolster eases the heat one grade for it. Its lift reaches every creature of yours at its world, itself included.');
		const easy = reasonLines({ why: { selfLift: 1 }, record: frackworm, site: zolton, tolerance: warm });
		expect(easy.find((l) => l.key === 'self').cause).toBe('A bolster adds 1 where the world does not strain it. Its lift reaches every creature of yours at its world, itself included.');
		const steadied = reasonLines({ why: { climate: { level: 'severe', cause: 'cold', factor: 0.75 }, company: 3 }, record: frackworm, site: zolton, tolerance: warm });
		expect(steadied.find((l) => l.key === 'company').cause).toBe('A bolster of yours here eases the cold one grade for it.');
	});

	it('says nothing for a creature nothing moves', () => {
		expect(reasonLines({ why: { going: 9, own: 9 }, record: frackworm, site: zolton, tolerance: warm, blows: { taken: [], downs: [], recovered: 0, unlifted: 0, alliesDowned: [], falls: false } })).toEqual([]);
	});

	it('draws each line with its mark, what it does and why', () => {
		const lines = reasonLines({ why: { climate: { level: 'strained', cause: 'cold', factor: 0.9 } }, record: frackworm, site: zolton, tolerance: warm });
		const { container } = render(<ReasonLines lines={lines} />);
		expect(container.querySelector('[data-reason="climate"] .rec-reason-effect').textContent).toBe('Too cold for it: it holds nine tenths.');
		expect(container.querySelector('[data-reason="climate"] .rec-reason-mark svg')).not.toBeNull();
		expect(render(<ReasonLines lines={[]} />).container.innerHTML).toBe('');
	});
});

describe('reasonLines on a real game', () => {
	it('gives every world that moves a number its line, and the Clash line lands on the chain\'s toll', () => {
		let checked = 0;
		let clash = 0;
		[7, 11, 13].forEach((seed) => {
			const { poolA, poolB } = buildDraftPools(seed, draftOptionsFromRules(DEFAULT_RULES));
			let match = createMatch({ rosterA: poolA.slice(0, ROSTER_SIZE), rosterB: poolB.slice(0, ROSTER_SIZE), worlds: getWorlds(), seed });
			// a few sends each way so the worlds have rivals on them
			for (let i = 0; i < 4; i += 1) {
				const seat = match.turn;
				const record = match.players[seat].roster[i];
				const site = match.frames[match.frameIndex].sites[i % 3];
				match = send(match, seat, record.id, site.id, false, null) || match;
			}
			const seat = match.turn;
			const table = fitTable(match, seat, match.players[seat].roster);
			match.players[seat].roster.forEach((record) => {
				match.frames[match.frameIndex].sites.forEach((site) => {
					const why = table.fits[record.id] && table.fits[record.id][site.id];
					if (!why) return;
					const tolerance = { ...(record.physiology.environmentalTolerance || {}), breathes: record.physiology.breathes || [] };
					const blows = nameBlows(forecastSendBlows(match, seat, record.id, site.id), match, seat);
					const lines = reasonLines({ why, record, site, tolerance, blows });
					const keys = lines.map((l) => l.key);
					if (why.home) expect(keys).toContain('home');
					if (why.climate) expect(keys).toContain('climate');
					const toll = Number(formatHoldShown(why.going)) - Number(formatHoldShown(Math.max(0, why.own)));
					if (!why.falls && toll > 0) {
						const line = lines.find((l) => l.key === 'clash');
						expect(line.effect).toBe(`The Clash takes ${toll}.`);
						expect(line.cause.length).toBeGreaterThan(0);
						clash += 1;
					}
					if (why.falls) expect(keys).toContain('falls');
					lines.forEach((l) => expect(`${l.effect} ${l.cause}`).not.toMatch(/undefined|NaN|a creature/));
					checked += 1;
				});
			});
		});
		expect(checked).toBeGreaterThan(50);
		expect(clash).toBeGreaterThan(0);
	});
});
