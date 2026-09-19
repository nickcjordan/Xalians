/*
	PASS 24. The per-round send cap: built, measured, shipped OFF.

	The engagement question rather than the balance question. Option spread was the only gauge
	below band, and read by round it says the game gets LESS interesting as it goes: 3.9
	near-best options at a round-one decision, 2.8 at round two, 2.05 at round three, where
	HALF of all decisions have one dominant answer. The round that decides the Charter is the
	game's least interesting moment.

	Round three opens with 4.8 creatures in hand and only 3.8 affordable sends, so the obvious
	reading was "the budget runs dry before the roster does" and the obvious fix was a cap on
	what one round may spend. It does not work: it buys decisions by starving the Clash (at cap
	3, downs 1.9 against a band of 3 to 5, and 87 percent of contested worlds one against one),
	and the balance-safe settings make round three worse rather than better.

	The lever stays, off, so the sweep is reproducible and nobody rebuilds it. These tests pin
	that it is a real lever rather than a dead key - the fault pass 15 found in `worldsPerFrame`,
	which sat in DEFAULT_RULES for six passes with nothing reading it.
*/
import { describe, test, expect } from 'vitest';
import { createMatch, send, getPublicState } from '../expeditionRules.ts';
import { ROUND_SEND_CAP, SENDABLE } from '../expeditionInterpretation.ts';
import type { World } from '../types.ts';

function makeWorlds(): World[] {
	const planets = ['Magmuth', 'Poseidas', 'Grimedes', 'Luminax', 'Floria', 'Zolton',
		'Phantiri', 'Stonera', 'Drainov', 'Saiphus', 'Telypso', 'Krystos', 'Veridium', 'Endessa'];
	return planets.map((planet) => ({
		planet, element: 'metal',
		sites: [0, 1, 2].map((k) => ({
			id: planet.toLowerCase() + '-site-' + k,
			name: planet + ' Site ' + k,
			planet, element: 'metal',
			environment: { medium: 'gas', temperatureC: { min: -80, max: 220 } },
		})),
	})) as unknown as World[];
}

let uid = 0;
function record(): any {
	uid += 1;
	return {
		id: 'rc' + uid, species: 'graviclaw',
		provenance: { schemaVersion: '1.0.0', origin: 'nowhere' },
		element: { primary: 'metal', affinities: { metal: 100 } },
		archetype: { key: 'predator', favors: [] },
		attributes: { strength: 50, vitality: 50, endurance: 50, agility: 30, reflex: 30,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 50 },
		physiology: { environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -80, max: 220 } }, breathes: ['gas'], capabilities: {}, senses: {} },
		traits: [],
		temperament: { boldness: 50, curiosity: 50, energy: 50, aggression: 50, sociability: 50 },
		abilities: [{ name: 'Hit', signature: true, instrument: 'fists', action: 'strike', medium: 'metal', intensity: 60 }],
	};
}
const roster = () => Array.from({ length: 12 }, () => record());
const match = (rules: any) => createMatch({ rosterA: roster(), rosterB: roster(), worlds: makeWorlds(), seed: 'round-cap', rules });

// how many sends this seat may still make, as the engine reports it
const capLeft = (state: any, seat: string) => {
	const view: any = getPublicState(state, seat as any);
	return view.players[seat].sendableCap - view.players[seat].sentCount;
};

describe('the per-round send cap', () => {
	test('is shipped off, so the whole-Proving budget is the only limit', () => {
		expect(ROUND_SEND_CAP).toBe(0);
		const state: any = match(null);
		const seat = state.turn;
		expect(capLeft(state, seat)).toBe(SENDABLE);
	});

	test('with a cap set, a round may not spend more than the cap', () => {
		const state: any = match({ roundSendCap: 2 });
		const seat = state.turn;
		// the cap, not the whole budget, is what the seat may still spend this round
		expect(capLeft(state, seat)).toBe(2);
	});

	test('each send inside the round eats into the cap', () => {
		let state: any = match({ roundSendCap: 2 });
		const seat = state.turn;
		const frame = state.frames[0];
		const first = state.players[seat].roster[0].id;
		state = send(state, seat, first, frame.sites[0].id);
		expect(state).not.toBe(null);
		expect(capLeft(state, seat)).toBe(1);
	});

	test('a cap above the whole budget cannot raise it', () => {
		// the cap narrows, it never widens: the Proving's budget is still the ceiling
		const state: any = match({ roundSendCap: 99 });
		const seat = state.turn;
		expect(capLeft(state, seat)).toBe(SENDABLE);
	});

	test('the lever is a real rules key, not a dead one', () => {
		/*
			Pass 15 found `worldsPerFrame` sitting in DEFAULT_RULES for six passes with nothing
			reading it, so four passes cited it as an untried alternative that was never
			testable. This pins that a cap actually changes what the engine allows.
		*/
		const uncapped: any = match(null);
		const capped: any = match({ roundSendCap: 1 });
		expect(capLeft(capped, capped.turn)).toBeLessThan(capLeft(uncapped, uncapped.turn));
	});
});
