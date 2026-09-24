import { describe, test, expect } from 'vitest';
import type { XalianRecord, } from '@xalians/content/schema';
import { createMatch, send, pass, getPublicState, currentFrame } from '../expeditionRules.ts';
import { ROSTER_SIZE, WORLDS_PER_MATCH } from '../expeditionInterpretation.ts';
import { ATTRITION_BITE, DIMINISHED_FACTOR } from '../statusLayer.ts';
import type { Seat, World } from '../types.ts';

/*
	PASS 32. The status layer as the CLASH sees it, not as statusLayer.ts computes it.

	statusLayer.test.ts proves the arithmetic. This file proves the wiring: that a status
	written on a record actually arrives on a board entry, actually takes a swing away,
	actually bites hold at the top of a round, and actually disappears when the frame turns.
	Those are four different seams and each one could be silently dead - the pinning rule it
	replaces WAS silently dead from the v5 conversion, because it read an effect type schema
	5 had retired and nothing in the suite noticed.
*/

// one effect in schema 5's shape; every field the reader needs, nothing it does not
const statusEffect = (status: string, over: Record<string, unknown> = {}) => ({
	key: 'condition', type: 'status', status,
	recipient: 'target', onset: 'instant', persistence: 'lingering', duration: 'brief',
	likelihood: 'consistent', removable: ['freeing'],
	...over,
});
const harmEffect = (over: Record<string, unknown> = {}) => ({
	key: 'hit', type: 'harm', mechanism: 'impact', recipient: 'target',
	onset: 'instant', persistence: 'resolved', likelihood: 'consistent', intensity: 60,
	...over,
});

const action = (over: Record<string, unknown> = {}) => ({
	key: 'act', name: 'Act', signature: true, instrument: 'fists', element: 'fire',
	targeting: ['other'],
	activation: { continuity: 'discrete' },
	timing: { preparation: 'brief', recovery: 'brief' },
	delivery: { mode: 'contact', approach: 'direct' },
	spatial: {},
	effects: [harmEffect()],
	...over,
});

function makeRecord(id: string, over: any = {}): XalianRecord {
	return {
		id,
		species: over.species || 'testling',
		schemaVersion: '5.0.0',
		provenance: { serial: 1, origin: 'magmuth' },
		attributes: {
			strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 80,
			...over.attributes,
		},
		element: 'fire',
		physiology: {
			breathes: ['gas'],
			environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -50, max: 200 } },
			protections: [],
		},
		temperament: { boldness: 50, curiosity: 50, energy: 50, aggression: 90, sociability: 50 },
		signature: { type: 'action', key: 'act' },
		actions: over.actions || [action()],
		passives: [],
	} as unknown as XalianRecord;
}

const makeRoster = (prefix: string, over?: (i: number) => any): XalianRecord[] =>
	Array.from({ length: ROSTER_SIZE }, (_, i) => makeRecord(`${prefix}_${i}`, over ? over(i) : {}));

function makeWorlds(count = WORLDS_PER_MATCH): World[] {
	const planets = ['Magmuth', 'Poseidas', 'Grimedes', 'Luminax', 'Floria', 'Zolton', 'Phantiri', 'Stonera', 'Drainov'];
	const elements = ['fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock', 'chemical'];
	return Array.from({ length: count }, (_, i) => ({
		planet: planets[i % planets.length],
		element: elements[i % elements.length],
		sites: [0, 1, 2].map((j) => ({
			id: `${planets[i % planets.length].toLowerCase()}-site-${j}`,
			name: `Site ${j}`,
			planet: planets[i % planets.length],
			element: elements[i % elements.length],
			environment: { medium: 'gas', temperatureC: { min: -50, max: 200 } },
		})),
	})) as unknown as World[];
}

/*
	THE FRAME MODEL, measured rather than assumed (apps/web/scripts/probeSends.ts):

	A frame is ONE Deploy in which the seats alternate sends, and the moment both pass the
	engine runs Resolve then Judge then advances the frame, emptying the board. So a world
	sees exactly ONE Clash, with every creature sent to it resolving in speed order, and
	there is no second Clash at the same world for a status to survive into.

	That is why these tests read the resolution LOG for what happened during the Clash and
	read the BOARD only before the double pass. A board read after resolution is a board from
	the next frame, which is empty by design.
*/
function openAtOneWorld(rosterA: XalianRecord[], rosterB: XalianRecord[], seed: string, rules?: any) {
	let state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed, rules });
	const siteId = currentFrame(state).sites[0].id;
	// the starter is drawn from the seed, so both sends follow the turn the engine hands out
	const starter = state.starter;
	const second: Seat = starter === 'A' ? 'B' : 'A';
	const rosterOf = (seat: Seat) => (seat === 'A' ? rosterA : rosterB);
	state = send(state, starter, rosterOf(starter)[0].id, siteId, false)!;
	state = send(state, second, rosterOf(second)[0].id, siteId, false)!;
	return { state, siteId, starter, second };
}

/*
	Every entry on the board, whatever site it stands at. Read this way rather than by a site
	id captured earlier, because a resolved round can turn the frame and rebuild the board
	under a new set of ids - which is the same mechanism that clears statuses between worlds.
*/
function allEntries(view: any) {
	return Object.values(view.board).flatMap((site: any) => [...site.A, ...site.B]);
}

function clashWith(rosterA: XalianRecord[], rosterB: XalianRecord[], seed = 'status-seed', rules?: any) {
	let { state, siteId, starter, second } = openAtOneWorld(rosterA, rosterB, seed, rules);
	state = pass(state, starter)!;
	state = pass(state, second)!;
	return { state, siteId, log: state.resolutionLog };
}

describe('a status written on a record reaches the board', () => {
	test('an afflicting act logs a status event naming what it applied', () => {
		const attacker = makeRoster('A', () => ({
			actions: [action({ effects: [harmEffect(), statusEffect('blinded')] })],
		}));
		const { log } = clashWith(attacker, makeRoster('B'));
		const applied = log.filter((e: any) => e.type === 'status');
		expect(applied.length).toBeGreaterThan(0);
		expect(applied[0]).toMatchObject({ status: 'blinded', concept: 'diminished' });
	});

	/*
		The public view carries the fields, on a board that exists. Read before the double pass
		resolves the frame away, since that is the only moment a handler ever sees a board.
	*/
	test('the public entry carries the status fields the plinth reads', () => {
		const { state } = openAtOneWorld(makeRoster('A'), makeRoster('B'), 'plinth');
		const entries = allEntries(getPublicState(state, 'A'));
		expect(entries.length, 'nothing was sent').toBeGreaterThan(0);
		for (const entry of entries) {
			expect(entry.statuses).toEqual([]);
			expect(entry.held).toBe(false);
			expect(entry.powerFactor).toBe(1);
		}
	});

	/*
		The public view's derived fields, on an entry that actually carries statuses. Written
		against a hand-placed application rather than a Clash, because the board is emptied the
		instant a Clash resolves and this is the only way to read the fields with something on
		them. It covers isHeld() and powerFactor() reaching the view, which the Clash tests
		cannot see.
	*/
	test('a held and diminished entry reports both to the view', () => {
		const { state } = openAtOneWorld(makeRoster('A'), makeRoster('B'), 'derived');
		const entry = Object.values(state.board)
			.flatMap((site: any) => [...site.A, ...site.B])
			.find((e: any) => !e.downed)!;
		entry.statuses = [
			{ status: 'frozen', concept: 'held', sourceId: 'x', rounds: 1, maintained: false, removable: [] },
			{ status: 'blinded', concept: 'diminished', sourceId: 'x', rounds: 1, maintained: false, removable: [] },
		];
		const seen = allEntries(getPublicState(state, entry.player)).find((e: any) => e.recordId === entry.recordId);
		expect(seen!.held).toBe(true);
		expect(seen!.powerFactor).toBe(DIMINISHED_FACTOR);
		expect(seen!.statuses!.map((a: any) => a.status).sort()).toEqual(['blinded', 'frozen']);
	});
});

describe('held takes the swing away', () => {
	/*
		The rule that was dead. A creature whose act applies a HELD status stops its target
		from landing, and the target's attack is logged `pinned` with no power. Before pass 32
		this could not happen at all: the trigger read `effectKind === 'restrain'`, and schema
		5 has no such effect type.
	*/
	test('a holding act stops its target from landing its own blow', () => {
		const holder = makeRoster('A', () => ({
			// fast, so it lands first and the hold matters
			attributes: { agility: 99, reflex: 99 },
			actions: [action({ effects: [harmEffect({ intensity: 10 }), statusEffect('restrained', { persistence: 'sustained', bound: 'source' })] })],
		}));
		const { log } = clashWith(holder, makeRoster('B', () => ({ attributes: { agility: 1, reflex: 1 } })));
		const heldOut = log.filter((e: any) => e.type === 'attack' && e.outcome === 'pinned');
		expect(heldOut.length).toBeGreaterThan(0);
		expect(heldOut[0].power).toBe(0);
	});

	test('a diminishing act does NOT stop its target from landing', () => {
		// the control: same shape, one bucket over. Blinded reduces, it does not hold.
		const blinder = makeRoster('A', () => ({
			attributes: { agility: 99, reflex: 99 },
			actions: [action({ effects: [harmEffect({ intensity: 10 }), statusEffect('blinded')] })],
		}));
		const { log } = clashWith(blinder, makeRoster('B', () => ({ attributes: { agility: 1, reflex: 1 } })));
		expect(log.filter((e: any) => e.type === 'attack' && e.outcome === 'pinned')).toHaveLength(0);
	});
});

describe('attrition bites between the exchanges of a fight', () => {
	/*
		A world sees one Clash, so a burning creature has no LATER round at that world to be
		burned in. What attrition can still do is bite the creatures that are standing when the
		Clash is over, which is what the tick does the next time resolve() runs - and with one
		Clash per frame, that is at the next world, after the board has been rebuilt.

		So the honest state of this bucket is: the arithmetic is built and unit-tested
		(statusLayer.test.ts), the tick is wired into resolve(), and with the frame model as it
		stands there is no second Clash for it to fire at. This test pins the fact rather than
		claiming the feature works, so nobody reads the passing suite as proof that burning
		does damage over time today.

		PASS 56 changed that. A world's Clash is now fought exchange after exchange until one side
		has nobody standing, and statuses tick between exchanges, so burning bites in the fight
		that applied it (Nick: "that would also allow you to implement the concepts like burning
		and other statuses that are multi-turn"). The single exchange is kept as a lever, and
		under it the old fact still holds.
	*/
	test('a burning status bites in the next exchange of the fight', () => {
		const burner = makeRoster('A', () => ({
			actions: [action({ effects: [harmEffect({ intensity: 10 }), statusEffect('burning', { duration: 'prolonged' })] })],
		}));
		const { log } = clashWith(burner, makeRoster('B'));
		expect(log.filter((e: any) => e.type === 'status' && e.status === 'burning').length).toBeGreaterThan(0);
		expect(log.filter((e: any) => e.type === 'exchange').length).toBeGreaterThan(0);
		expect(log.filter((e: any) => e.type === 'attrition').length).toBeGreaterThan(0);
	});

	test('with a single exchange, a burning status is applied and nothing ticks', () => {
		const burner = makeRoster('A', () => ({
			actions: [action({ effects: [harmEffect({ intensity: 10 }), statusEffect('burning', { duration: 'prolonged' })] })],
		}));
		const { log } = clashWith(burner, makeRoster('B'), 'status-seed', { clashExchanges: 1 });
		expect(log.filter((e: any) => e.type === 'status' && e.status === 'burning').length).toBeGreaterThan(0);
		expect(log.filter((e: any) => e.type === 'attrition')).toHaveLength(0);
	});
});

describe('statuses die with the world', () => {
	/*
		Nick's ruling: "once the round is over and we are on a new world, any statuses would be
		gone." This falls out of the board being rebuilt per frame rather than from a clearing
		step, so the test reads the next frame's entries rather than trusting the reasoning.
	*/
	test('no creature carries a status into the next frame', () => {
		const burner = makeRoster('A', () => ({
			actions: [action({ effects: [harmEffect({ intensity: 10 }), statusEffect('burning', { duration: 'prolonged' })] })],
		}));
		const { state, log } = clashWith(burner, makeRoster('B'), 'frame');
		// it really did get applied, so the absence below is clearing and not a no-op
		expect(log.filter((e: any) => e.type === 'status').length).toBeGreaterThan(0);
		const carried = allEntries(getPublicState(state, 'A')).filter((e: any) => (e.statuses || []).length > 0);
		expect(carried, 'a status survived the frame turning').toHaveLength(0);
	});
});

describe('the diminished factor is what the Clash actually uses', () => {
	/*
		The board is gone by the time a test could read a halved factor off it, so this reads
		the effect where it is visible: the power a diminished creature's blow lands for.

		A creature blinded EARLY in the speed order by a faster enemy swings later in the same
		Clash, and that swing is the one the reduction applies to. That is the whole mechanic,
		and it is measurable in the log.
	*/
	test('a creature blinded before it swings lands a weaker blow than an unblinded twin', () => {
		const fastBlinder = makeRoster('A', () => ({
			attributes: { agility: 99, reflex: 99 },
			actions: [action({ effects: [harmEffect({ intensity: 10 }), statusEffect('blinded', { duration: 'prolonged' })] })],
		}));
		const fastHitter = makeRoster('A', () => ({
			attributes: { agility: 99, reflex: 99 },
			actions: [action({ effects: [harmEffect({ intensity: 10 })] })],
		}));
		const slow = () => makeRoster('B', () => ({ attributes: { agility: 1, reflex: 1 } }));

		const powerOfSlowSwing = (rosterA: XalianRecord[]) => {
			const { log } = clashWith(rosterA, slow(), 'diminish');
			const swings = log.filter((e: any) => e.type === 'attack' && String(e.recordId).startsWith('B_') && e.power > 0);
			return swings.length ? Number(swings[0].power) : 0;
		};

		const blinded = powerOfSlowSwing(fastBlinder);
		const clear = powerOfSlowSwing(fastHitter);
		expect(clear, 'the control landed nothing, so there is nothing to compare').toBeGreaterThan(0);
		expect(blinded).toBeLessThan(clear);
		expect(blinded).toBeCloseTo(clear * DIMINISHED_FACTOR, 1);
	});
});

describe('a blow that leaves a harmful status lands harder', () => {
	/*
		PASS 34. The fire or the acid is part of what the blow does, so a corroding strike
		lands for more than the same strike without it. Measured against a control that
		differs ONLY in the status, so the difference cannot come from anything else.

		Both rosters attack the same way and only the attacker's act changes, so the power
		logged for the attacker's own swing is the whole comparison.
	*/
	const powerOfFirstSwing = (rosterA: XalianRecord[], seed: string) => {
		const { log } = clashWith(rosterA, makeRoster('B'), seed);
		const swings = log.filter((e: any) => e.type === 'attack'
			&& String(e.recordId).startsWith('A_') && e.power > 0);
		return swings.length ? Number(swings[0].power) : 0;
	};

	test('lands harder than the same blow without the status', () => {
		const plain = makeRoster('A', () => ({ actions: [action({ effects: [harmEffect()] })] }));
		const corroding = makeRoster('A', () => ({
			actions: [action({ effects: [harmEffect(), statusEffect('corroding', { removable: ['cleansing'] })] })],
		}));
		const clear = powerOfFirstSwing(plain, 'bite');
		const bitten = powerOfFirstSwing(corroding, 'bite');
		expect(clear, 'the control landed nothing, so there is nothing to compare').toBeGreaterThan(0);
		expect(bitten).toBeGreaterThan(clear);
		expect(bitten).toBeCloseTo(clear * (1 + ATTRITION_BITE), 1);
	});

	test('does not land harder for a status that is not harmful', () => {
		const plain = makeRoster('A', () => ({ actions: [action({ effects: [harmEffect()] })] }));
		const blinding = makeRoster('A', () => ({
			actions: [action({ effects: [harmEffect(), statusEffect('blinded')] })],
		}));
		expect(powerOfFirstSwing(blinding, 'bite')).toBeCloseTo(powerOfFirstSwing(plain, 'bite'), 1);
	});
});
