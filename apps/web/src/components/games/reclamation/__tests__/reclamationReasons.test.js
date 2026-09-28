import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { buildDraftPools, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import { createMatch, send, getPublicState, DEFAULT_RULES } from '@xalians/rules/expedition/expeditionRules';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { ROSTER_SIZE } from '@xalians/rules/expedition/expeditionInterpretation';
import { fitTable } from '../reclamationFit';
import { reasonLines, ReasonLines } from '../reclamationReasons';
import { matchupsAt } from '../reclamationMatch';

/*
	PASS 61, SAY WHY (docs/design/reclamation-say-why.md). Each thing that moves a creature's number
	at a world gets a line on that world saying what it does and why, from the engine's own facts.
	These pin the words for each cause, and hold them to a real game: every world that changes a
	number says so. Pass 72: and the element chart against each rival there, never the fight.
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
		expect(text(lines)).toEqual(['Its home world: it holds a quarter more. Frackworm comes from Endessa.']);
	});

	// pass 71: a world's element touches a creature only where it is strong against it
	it('says when a world\'s element is hard on the creature', () => {
		const lines = reasonLines({ why: { worldElement: { element: 'water', against: 'fire', factor: 0.9 } }, record: frackworm, site: zolton, tolerance: warm });
		expect(text(lines)).toEqual(['A water world is hard on fire: it holds nine tenths. Water is strong against fire on the element chart.']);
		// pass 72: the pass 71 line read "A electric world"
		expect(reasonLines({ why: { worldElement: { element: 'electric', against: 'water', factor: 0.9 } }, record: frackworm, site: zolton })[0].effect).toBe('An electric world is hard on water: it holds nine tenths.');
	});

	it('says air it cannot breathe, and what it breathes', () => {
		const gill = { temperatureC: { min: -60, max: 60 }, ambientMedia: ['liquid'], breathes: ['liquid'] };
		const lines = reasonLines({ why: { climate: { level: 'severe', cause: 'breath', medium: 'gas', factor: 0.25 } }, record: frackworm, site: zolton, tolerance: gill });
		expect(text(lines)).toEqual(['It cannot breathe here: it holds a quarter. Zolton here is open air; Frackworm breathes water.']);
		expect(lines[0].mark).toBe('breath');
	});

	/*
		PASS 72, PLACEMENT STACKS. Nick, on a forecast that said his creature "acts first" and falls:
		"the details that are shown should not imply that something will play out one way or
		another". The lines no longer play the Clash out; they say the element chart between it and
		each rival creature there, each way, as a fact of the two creatures.
	*/
	it('says the element chart against each rival creature here, both ways, and nothing of the fight', () => {
		const fire = { ...frackworm, element: { primary: 'fire' } };
		const matchups = [
			{ recordId: 'n', name: 'Neph', element: 'water', dealt: 0.5, taken: 2 },
			{ recordId: 'k', name: 'Kosanos', element: 'plant', dealt: 2, taken: null },
		];
		const lines = reasonLines({ why: { going: 9, own: 9 }, record: fire, site: zolton, tolerance: warm, matchups });
		expect(text(lines)).toEqual([
			'Fire on water ×½. Its blows land half as hard on Neph.',
			"Water on fire ×2. Neph's blows land twice as hard on it.",
			'Fire on plant ×2. Its blows land twice as hard on Kosanos.',
		]);
		expect(lines.map((l) => l.mark)).toEqual(['chart', 'chart', 'chart']);
		expect(lines.map((l) => l.element)).toEqual(['fire', 'water', 'fire']);
		lines.forEach((l) => expect(`${l.effect} ${l.cause}`).not.toMatch(/first|falls|downs|Clash/));
	});

	it('says a quarter and half again in words', () => {
		const fire = { ...frackworm, element: 'fire' };
		const lines = reasonLines({ why: {}, record: fire, site: zolton, matchups: [{ recordId: 'v', name: 'Voltish', element: 'rock', dealt: 0.25, taken: 1.5 }] });
		expect(lines.map((l) => l.cause)).toEqual(['Its blows land a quarter as hard on Voltish.', "Voltish's blows land half again as hard on it."]);
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
		expect(reasonLines({ why: { going: 9, own: 9 }, record: frackworm, site: zolton, tolerance: warm, matchups: [] })).toEqual([]);
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
	it('gives every world that moves a number its line, and the chart against every uneven rival there', () => {
		let checked = 0;
		let charts = 0;
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
			const view = getPublicState(match, seat);
			const opponent = seat === 'A' ? 'B' : 'A';
			const table = fitTable(match, seat, match.players[seat].roster);
			match.players[seat].roster.forEach((record) => {
				match.frames[match.frameIndex].sites.forEach((site) => {
					const why = table.fits[record.id] && table.fits[record.id][site.id];
					if (!why) return;
					// pass 72: nothing is fought ahead of time
					expect(why.toll).toBe(0);
					expect(why.falls).toBe(false);
					expect(why.taken).toBe(0);
					const tolerance = { ...(record.physiology.environmentalTolerance || {}), breathes: record.physiology.breathes || [] };
					const matchups = matchupsAt(view, site, record, why.role || null, opponent);
					const lines = reasonLines({ why, record, site, tolerance, matchups });
					const keys = lines.map((l) => l.key);
					if (why.home) expect(keys).toContain('home');
					if (why.climate) expect(keys).toContain('climate');
					expect(lines.filter((l) => l.mark === 'chart').length).toBe(matchups.reduce((n, m) => n + (m.dealt ? 1 : 0) + (m.taken ? 1 : 0), 0));
					charts += matchups.length;
					lines.forEach((l) => expect(`${l.effect} ${l.cause}`).not.toMatch(/undefined|NaN|a creature|null/));
					checked += 1;
				});
			});
		});
		expect(checked).toBeGreaterThan(50);
		expect(charts).toBeGreaterThan(0);
	});
});
