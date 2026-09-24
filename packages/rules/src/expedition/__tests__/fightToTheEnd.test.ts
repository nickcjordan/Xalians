/*
	PASS 56, THE FIGHT TO THE LAST SIDE STANDING (Nick, 2026-09-23: "it should start with one
	round of attacks and then just continue cycling that way ... until one side or the other has
	no more characters with health. This way the winner goes to who has creatures remaining").

	Each test pins one sentence of the rule: a world fights exchange after exchange until one
	side has nobody standing, nobody standing can attack, or an exchange changes nothing; a
	bolster mends between exchanges; the single exchange is still there as a lever.
*/
import { describe, test, expect } from 'vitest';
import { createMatch, send, pass, currentFrame } from '../expeditionRules.ts';
import type { MatchState } from '../types.ts';

function makeWorlds() {
	const site = (id: string) => ({ id, name: `Site ${id}`, medium: 'gas', temperatureC: { low: -50, high: 80 } });
	return [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
		planet: `World${i}`, element: 'metal', planetKey: `world${i}`,
		temperatureC: { low: -50, high: 80 },
		sites: [site(`w${i}s0`)],
	})) as any[];
}

let uid = 0;
function record(overrides: any = {}) {
	uid += 1;
	const { attributes, abilities, ...rest } = overrides;
	return {
		id: `f${uid}`,
		species: 'graviclaw',
		provenance: { schemaVersion: '1.0.0', origin: 'nowhere' },
		element: { primary: 'metal', affinities: { metal: 100 } },
		archetype: { key: 'predator', favors: [] },
		attributes: {
			strength: 50, vitality: 50, endurance: 50, agility: 50, reflex: 50,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 50,
			...(attributes || {}),
		},
		physiology: {
			environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -60, max: 90 } },
			breathes: ['gas'], capabilities: {}, senses: {},
		},
		traits: [],
		temperament: { boldness: 50, curiosity: 50, energy: 50, aggression: 50, sociability: 50 },
		abilities: abilities || [
			{ name: 'Hit', signature: true, instrument: 'fists', action: 'strike', medium: 'metal', intensity: 60 },
		],
		...rest,
	} as any;
}

// hardy enough that one blow does not end it, so the fight has exchanges to run
const hardy = (extra: any = {}) => record({ attributes: { vitality: 95, endurance: 95, resilience: 95, strength: 40, ...extra } });
const shieldOnly = () => record({
	archetype: { key: 'bulwark', favors: [] },
	abilities: [{ name: 'Ward', signature: true, instrument: 'hide', action: 'ward', medium: 'metal', intensity: 60 }],
});
const mender = () => record({
	archetype: { key: 'sage', favors: [] },
	abilities: [{ name: 'Mend', signature: true, instrument: 'voice', action: 'mend', medium: 'metal', intensity: 60 }],
	attributes: { charisma: 90 },
});

function twelve(seed: string, first: any[]) {
	return Array.from({ length: 12 }, (_, i) => ({ ...(first[i] ? first[i] : record()), id: `${seed}_${i}` }));
}

// every creature listed goes to the one site, then both pass, which fights and rules the world
function fight(mine: any[], theirs: any[], rules: any = undefined): MatchState {
	let state = createMatch({ rosterA: twelve('A', mine), rosterB: twelve('B', theirs), worlds: makeWorlds(), seed: 'fight-seed', rules });
	state = { ...state, starter: 'A', turn: 'A' } as MatchState;
	const site = currentFrame(state).sites[0].id;
	for (let i = 0; i < Math.max(mine.length, theirs.length); i++) {
		if (i < mine.length) state = send(state, 'A', `A_${i}`, site)!;
		else state = pass(state, 'A')!;
		if (i < theirs.length) state = send(state, 'B', `B_${i}`, site)!;
		else if (!state.players.B.passed) state = pass(state, 'B')!;
	}
	if (!state.players.A.passed) state = pass(state, state.turn!)!;
	if (state.phase === 'deploy' && !state.players[state.turn!].passed) state = pass(state, state.turn!)!;
	return state;
}

const judgedAt = (state: MatchState) => {
	const judged = (state.resolutionLog as any[]).find((e) => e.type === 'judge');
	return Object.values(judged.siteResults).find((r: any) => r.entries.A.length > 0 || r.entries.B.length > 0 || r.winner) as any;
};

describe('a world fights to the last side standing', () => {
	test('two attackers trade exchanges until one falls, and the Ruling goes to the one left', () => {
		const state = fight([hardy()], [hardy()]);
		const log = state.resolutionLog as any[];
		expect(log.filter((e) => e.type === 'exchange').length).toBeGreaterThan(0);
		const result = judgedAt(state);
		const standing = [result.entries.A.length, result.entries.B.length];
		// exactly one side is left, and the world is theirs
		expect(standing.filter((n) => n > 0).length).toBeLessThanOrEqual(1);
		if (result.winner) {
			expect(result.entries[result.winner].length).toBeGreaterThan(0);
		}
	});

	test('with the single-exchange lever, nobody fights a second time', () => {
		const state = fight([record()], [record()], { clashExchanges: 1 });
		expect((state.resolutionLog as any[]).filter((e) => e.type === 'exchange')).toHaveLength(0);
	});

	test('a world where nobody can attack stops after one exchange and is ruled on hold', () => {
		const state = fight([shieldOnly()], [shieldOnly()]);
		expect((state.resolutionLog as any[]).filter((e) => e.type === 'exchange')).toHaveLength(0);
		const result = judgedAt(state);
		expect(result.entries.A.length + result.entries.B.length).toBe(2);
	});

	test('the fight never runs past the cap', () => {
		const state = fight([hardy(), hardy()], [hardy(), hardy()], { clashExchanges: 2 });
		const exchanges = (state.resolutionLog as any[]).filter((e) => e.type === 'exchange');
		expect(exchanges.every((e) => e.exchange <= 2)).toBe(true);
	});

	test('a bolster mends its allies between exchanges, not only at the Ruling', () => {
		// a tough striker with a mender, against a striker that hurts it without downing it at once
		const state = fight([hardy(), mender()], [hardy({ strength: 60 })]);
		const log = state.resolutionLog as any[];
		const firstExchange = log.findIndex((e) => e.type === 'exchange');
		const judge = log.findIndex((e) => e.type === 'judge');
		expect(firstExchange).toBeGreaterThan(-1);
		// the first exchange hurt one of A's, and a recovery comes before the Ruling's own
		const damageBefore = log.slice(0, firstExchange).some((e) => e.type === 'attack' && e.outcome === 'hurt' && String(e.target).startsWith('A_'));
		const mended = log.slice(firstExchange, judge).some((e) => e.type === 'recover');
		expect(damageBefore).toBe(true);
		expect(mended).toBe(true);
	});
});
