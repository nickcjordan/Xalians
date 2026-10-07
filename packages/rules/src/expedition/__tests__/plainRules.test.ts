/*
	THE PLAIN RULES (docs/design/reclamation-one-number.md). rules.combat === 'plain' makes hold
	the only number: a small whole hold, a three-step world fit, fixed act hits moved one step by
	the element, and simultaneous exchanges. Each test pins one sentence of that design, and the
	last block pins that the graded rules still play exactly as they did on main.
*/
import { v5Record } from './fixtures/v5Fixtures.ts';
import { describe, test, expect } from 'vitest';
import {
	createMatch, send, pass, currentFrame, forecastSendBlows, DEFAULT_RULES, RULES_PLAIN,
} from '../expeditionRules.ts';
import {
	baseHold, holdAtSite, prepare, isSwift, plainElementTier, plainHitAgainst, plainHitOf,
} from '../creatureOnTable.ts';
import { typeEffectivenessMultiplier, HOLD_FLOOR, HOLD_CEILING } from '../expeditionInterpretation.ts';
import { runSimulation } from '../devtools/expeditionSimulator.ts';
import type { MatchState } from '../types.ts';
import baselineGraded from './fixtures/gradedSeed7Matches50.json';

const PLAIN = { combat: 'plain' as const };

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
	const { attributes, abilities, element, ...rest } = overrides;
	const primary = element || 'metal';
	return v5Record({
		id: `p${uid}`,
		species: 'graviclaw',
		provenance: { schemaVersion: '1.0.0', origin: 'nowhere' },
		element: primary,
		attributes: {
			strength: 50, vitality: 0, endurance: 0, agility: 50, reflex: 50,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 0,
			...(attributes || {}),
		},
		physiology: {
			environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -60, max: 90 } },
			breathes: ['gas'], capabilities: {}, senses: {},
		},
		temperament: { boldness: 50, curiosity: 50, energy: 50, aggression: 50, sociability: 50 },
		abilities: abilities || [
			{ name: 'Hit', signature: true, instrument: 'fists', action: 'strike', medium: primary, intensity: 60 },
		],
		...rest,
	});
}

// attributes that make a plain hold of exactly 2 (all zero) or 6 (all full)
const FULL = { vitality: 100, endurance: 100, resilience: 100 };
const striker = (extra: any = {}) => record(extra);
const sweeper = (extra: any = {}) => record({
	abilities: [{ name: 'Burst', signature: true, instrument: 'body', action: 'burst', medium: extra.element || 'metal', intensity: 60 }],
	...extra,
});
const guard = (extra: any = {}) => record({
	abilities: [{ name: 'Ward', signature: true, instrument: 'hide', action: 'ward', medium: 'metal', intensity: 60 }],
	...extra,
});
const mender = (extra: any = {}) => record({
	abilities: [{ name: 'Mend', signature: true, instrument: 'voice', action: 'mend', medium: 'metal', intensity: 60 }],
	...extra,
});

function twelve(seed: string, first: any[]) {
	return Array.from({ length: 12 }, (_, i) => ({ ...(first[i] ? first[i] : striker()), id: `${seed}_${i}` }));
}

// every creature listed goes to the one site, then both pass, which fights and rules the world
function fight(mine: any[], theirs: any[], rules: any = PLAIN, seed = 'plain-seed'): MatchState {
	let state = createMatch({ rosterA: twelve('A', mine), rosterB: twelve('B', theirs), worlds: makeWorlds(), seed, rules });
	state = { ...state, starter: 'A', turn: 'A' } as MatchState;
	const site = currentFrame(state).sites[0].id;
	for (let i = 0; i < Math.max(mine.length, theirs.length); i++) {
		if (i < mine.length) state = send(state, 'A', `A_${i}`, site)!;
		else if (!state.players.A.passed && state.turn === 'A') state = pass(state, 'A')!;
		if (i < theirs.length) state = send(state, 'B', `B_${i}`, site)!;
		else if (!state.players.B.passed) state = pass(state, 'B')!;
	}
	if (!state.players.A.passed) state = pass(state, state.turn!)!;
	if (state.phase === 'deploy' && !state.players[state.turn!].passed) state = pass(state, state.turn!)!;
	return state;
}

const logOf = (state: MatchState) => state.resolutionLog as any[];
const attacks = (state: MatchState) => logOf(state).filter((e) => e.type === 'attack');
const judged = (state: MatchState) => {
	const result = logOf(state).find((e) => e.type === 'judge');
	return Object.values(result.siteResults).find((r: any) => r.entries.A.length > 0 || r.entries.B.length > 0 || r.winner) as any
		|| Object.values(result.siteResults)[0] as any;
};

// the element pairs the chart reads strong, neutral and weak, found rather than assumed
const ELEMENTS = ['fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock', 'chemical', 'air', 'psychic', 'ice', 'metal', 'sand'];
function pairWhere(test: (m: number) => boolean): [string, string] {
	for (const a of ELEMENTS) {
		for (const d of ELEMENTS) {
			if (test(typeEffectivenessMultiplier(a, d))) {
				return [a, d];
			}
		}
	}
	throw new Error('no such pair');
}
const STRONG = pairWhere((m) => m >= 1.5);
const WEAK = pairWhere((m) => m > 0 && m <= 0.5);
const NEUTRAL = pairWhere((m) => m === 1);

describe('plain hold: the graded base over three, held to 2 to 6', () => {
	const withRaw = (raw: number) => record({ attributes: { vitality: raw, endurance: raw, resilience: raw } });
	const graded = (r: any) => baseHold(r);

	test('is clamp(round(graded base / 3), 2, 6) for every raw attribute level', () => {
		for (let raw = 0; raw <= 100; raw += 5) {
			const r = withRaw(raw);
			expect(baseHold(r, PLAIN)).toBe(Math.min(6, Math.max(2, Math.round(graded(r) / 3))));
		}
	});

	test('clamps at the bottom to 2 and the top to 6, and is always a whole number', () => {
		expect(baseHold(withRaw(0), PLAIN)).toBe(2);
		expect(baseHold(withRaw(100), PLAIN)).toBe(6);
		expect(Math.round(HOLD_CEILING / 3)).toBe(6);
		expect(Math.round(HOLD_FLOOR / 3)).toBe(1);
		for (let raw = 0; raw <= 100; raw += 7) {
			expect(Number.isInteger(baseHold(withRaw(raw), PLAIN))).toBe(true);
		}
	});

	test('the divisor and the clamp are rules keys', () => {
		const mid = withRaw(50);
		expect(baseHold(mid, { combat: 'plain', plainHoldDivisor: 2 })).toBe(Math.min(6, Math.round(graded(mid) / 2)));
		expect(baseHold(withRaw(100), { combat: 'plain', plainHoldMax: 4 })).toBe(4);
		expect(baseHold(withRaw(0), { combat: 'plain', plainHoldMin: 3 })).toBe(3);
	});

	test('graded rules are untouched by the plain keys', () => {
		expect(baseHold(withRaw(100))).toBe(18);
		expect(baseHold(withRaw(100), { combat: 'graded' })).toBe(18);
	});
});

describe('plain world fit: suits +1, neutral 0, hostile -1', () => {
	const mid = () => record({ attributes: { vitality: 50, endurance: 50, resilience: 50 } });
	const world = { planet: 'Magmuth', element: 'fire', sites: [] } as any;
	const site = (environment: any) => ({ id: 's', name: 's', planet: 'Magmuth', element: 'fire', environment }) as any;
	const calm = { medium: 'gas', temperatureC: { min: 0, max: 30 } };
	const base = baseHold(mid(), PLAIN);

	test('home world is +1', () => {
		const home = { ...mid(), provenance: { origin: 'magmuth' } };
		const result = holdAtSite(home, site(calm), world, { rules: PLAIN });
		expect(result.value).toBe(base + 1);
		expect(result.fit).toBe(1);
		expect(result.isHome).toBe(true);
	});

	test('any other world is neutral, 0', () => {
		const result = holdAtSite(mid(), site(calm), world, { rules: PLAIN });
		expect(result.value).toBe(base);
		expect(result.fit).toBe(0);
	});

	test('mild strain (a medium it only tolerates, or a temperature slightly off) is neutral, 0', () => {
		const wrongMedium = { ...mid(), physiology: { ...mid().physiology, breathes: ['gas', 'liquid'] } };
		expect(holdAtSite(wrongMedium, site({ medium: 'liquid', temperatureC: { min: 0, max: 30 } }), world, { rules: PLAIN }).fit).toBe(0);
		const slightlyHot = holdAtSite(mid(), site({ medium: 'gas', temperatureC: { min: 60, max: 130 } }), world, { rules: PLAIN });
		expect(slightlyHot.level).toBe('strained');
		expect(slightlyHot.fit).toBe(0);
		expect(slightlyHot.value).toBe(base);
	});

	test('severe strain, a medium it cannot breathe, is -1', () => {
		const result = holdAtSite(mid(), site({ medium: 'vacuum', temperatureC: { min: 0, max: 30 } }), world, { rules: PLAIN });
		expect(result.level).toBe('severe');
		expect(result.fit).toBe(-1);
		expect(result.value).toBe(base - 1);
	});

	test('a hostile world never takes a creature below 1', () => {
		const frail = { ...mid(), attributes: { ...mid().attributes, vitality: 0, endurance: 0, resilience: 0 } };
		const hostile = site({ medium: 'vacuum', temperatureC: { min: 0, max: 30 } });
		expect(holdAtSite(frail, hostile, world, { rules: { combat: 'plain', plainHoldMin: 1, plainHoldMax: 1 } }).value).toBe(1);
	});

	test('no world element penalty, willpower, bolster relief, pack-bonded or solitary', () => {
		// water attacking fire reads strong, so a water world used to dent a fire creature
		const fireWorld = { planet: 'Poseidas', element: 'water', sites: [] } as any;
		const fireCreature = { ...mid(), element: 'fire', attributes: { ...mid().attributes, willpower: 100 } };
		const result = holdAtSite(fireCreature, site(calm), fireWorld, { rules: PLAIN, bolstered: true, bolsterScale: 2, packBondedKinAtSite: 3, solitaryAlliesAtSite: 3 });
		expect(result.value).toBe(base);
		expect(result.matchup).toBe(1);
		expect(result.willful).toBe(false);
		expect(result.bolstered).toBe(false);
	});

	test('prepare reads the same plain hold, and nothing moves swiftly', () => {
		const r = { ...mid(), attributes: { ...mid().attributes, reflex: 100, agility: 100 } };
		const prepared = prepare(r, site(calm), world, 0, { rules: PLAIN });
		expect(prepared.hold).toBe(base);
		expect(prepared.baseHold).toBe(base);
		expect(prepared.swift).toBe(false);
		expect(isSwift(r, PLAIN)).toBe(false);
		expect(isSwift(r, { combat: 'graded' })).toBe(true);
	});
});

describe('plain acts: fixed hits, one element step', () => {
	test('a strike takes 2 off one rival at a neutral matchup', () => {
		const state = fight([striker({ attributes: FULL })], [striker({ attributes: FULL })], { ...PLAIN, plainExchanges: 1 });
		const hits = attacks(state).filter((e) => e.outcome === 'hurt');
		expect(hits.length).toBe(2);
		hits.forEach((e) => expect(e.power).toBe(2));
	});

	test('a sweep takes 1 off every rival, and never its own side', () => {
		const mine = [sweeper({ attributes: FULL }), striker({ attributes: FULL })];
		const theirs = [guard({ attributes: FULL }), guard({ attributes: FULL }), guard({ attributes: FULL })];
		// no guard here cancels a sweep since the guards would; use strikers as the rivals instead
		const rivals = [striker({ attributes: FULL }), striker({ attributes: FULL }), striker({ attributes: FULL })];
		const state = fight(mine, rivals, { ...PLAIN, plainExchanges: 1 });
		const fromSweeper = attacks(state).filter((e) => e.recordId === 'A_0');
		expect(fromSweeper.map((e) => e.target).sort()).toEqual(['B_0', 'B_1', 'B_2']);
		fromSweeper.forEach((e) => expect(e.power).toBe(1));
		expect(fromSweeper.some((e) => String(e.target).startsWith('A_'))).toBe(false);
		expect(theirs.length).toBe(3);
	});

	test('a mend gives 1 back to the most hurt ally, and never more than it has lost', () => {
		// B's single striker hits for 2 in exchange 1; the mender's turn in exchange 2 gives 1 back
		const state = fight(
			[mender({ attributes: FULL }), striker({ attributes: FULL })],
			[striker({ attributes: FULL })],
			{ ...PLAIN, plainExchanges: 2 },
		);
		const mends = logOf(state).filter((e) => e.type === 'recover' && e.mend);
		expect(mends.length).toBe(1);
		expect(mends[0].amount).toBe(1);
	});

	test('the mend is capped at the damage taken, so a big mend gives back only what was lost', () => {
		const state = fight(
			[mender({ attributes: FULL }), striker({ attributes: FULL })],
			[striker({ attributes: FULL })],
			{ ...PLAIN, plainExchanges: 2, plainMend: 5 },
		);
		const mends = logOf(state).filter((e) => e.type === 'recover' && e.mend);
		expect(mends.length).toBe(1);
		expect(mends[0].amount).toBe(2);
	});

	test('nobody hurt means nothing to mend, and no event', () => {
		const state = fight([mender({ attributes: FULL }), striker({ attributes: FULL })], [guard({ attributes: FULL })], { ...PLAIN, plainExchanges: 3 });
		expect(logOf(state).filter((e) => e.type === 'recover')).toHaveLength(0);
	});

	test('a guard cancels the first hit aimed at its side, entirely, and only that one', () => {
		const state = fight([guard({ attributes: FULL })], [striker({ attributes: FULL }), striker({ attributes: FULL })], { ...PLAIN, plainExchanges: 1 });
		const aimed = attacks(state).filter((e) => e.target === 'A_0');
		expect(aimed.map((e) => e.outcome).sort()).toEqual(['cancelled', 'hurt']);
		// the first declared (the earlier send) is the one cancelled
		expect(aimed.find((e) => e.outcome === 'cancelled').recordId).toBe('B_0');
		expect(aimed.find((e) => e.outcome === 'hurt').power).toBe(2);
		expect(logOf(state).filter((e) => e.type === 'shield')[0].cancelled).toBe('B_0');
	});

	test('one cancel per guard: two guards stop two hits', () => {
		const state = fight(
			[guard({ attributes: FULL }), guard({ attributes: FULL })],
			[striker({ attributes: FULL }), striker({ attributes: FULL }), striker({ attributes: FULL })],
			{ ...PLAIN, plainExchanges: 1 },
		);
		const outcomes = attacks(state).map((e) => e.outcome).sort();
		expect(outcomes).toEqual(['cancelled', 'cancelled', 'hurt']);
	});

	test('a guard cancels a sweep on its own side entirely and leaves the other side taking it', () => {
		const state = fight(
			[guard({ attributes: FULL }), striker({ attributes: FULL })],
			[sweeper({ attributes: FULL })],
			{ ...PLAIN, plainExchanges: 1 },
		);
		const sweeps = attacks(state).filter((e) => e.recordId === 'B_0');
		expect(sweeps.map((e) => e.outcome).sort()).toEqual(['cancelled', 'cancelled']);
		// the A side is guarded; A's striker still hits the sweeper
		const back = attacks(state).find((e) => e.recordId === 'A_1');
		expect(back.outcome).toBe('hurt');
	});
});

describe('plain element: one step either way', () => {
	const hitWith = (attackerElement: string, defenderElement: string, role: 'strike' | 'sweep') => {
		const make = role === 'strike' ? striker : sweeper;
		const state = fight(
			[make({ attributes: FULL, element: attackerElement })],
			[striker({ attributes: FULL, element: defenderElement })],
			{ ...PLAIN, plainExchanges: 1 },
		);
		return attacks(state).find((e) => e.recordId === 'A_0');
	};

	test('the tier is read off the existing chart: strong 1.5 or more, weak 0.5 or less', () => {
		expect(plainElementTier(record({ element: STRONG[0] }), record({ element: STRONG[1] }), PLAIN)).toBe(1);
		expect(plainElementTier(record({ element: WEAK[0] }), record({ element: WEAK[1] }), PLAIN)).toBe(-1);
		expect(plainElementTier(record({ element: NEUTRAL[0] }), record({ element: NEUTRAL[1] }), PLAIN)).toBe(0);
	});

	test('strike: strong 3, neutral 2, weak 1', () => {
		expect(hitWith(STRONG[0], STRONG[1], 'strike').power).toBe(3);
		expect(hitWith(NEUTRAL[0], NEUTRAL[1], 'strike').power).toBe(2);
		expect(hitWith(WEAK[0], WEAK[1], 'strike').power).toBe(1);
	});

	test('sweep: strong 2, neutral 1, weak 0 (a glancing sweep takes nothing)', () => {
		expect(hitWith(STRONG[0], STRONG[1], 'sweep').power).toBe(2);
		expect(hitWith(NEUTRAL[0], NEUTRAL[1], 'sweep').power).toBe(1);
		const weak = hitWith(WEAK[0], WEAK[1], 'sweep');
		expect(weak.power).toBe(0);
		expect(weak.outcome).toBe('glanced');
	});

	test('the preview helper gives the same numbers, and the step is a rules key', () => {
		const strong = [record({ element: STRONG[0] }), record({ element: STRONG[1] })];
		expect(plainHitAgainst(strong[0], 'strike', strong[1], PLAIN)).toBe(3);
		expect(plainHitAgainst(strong[0], 'sweep', strong[1], PLAIN)).toBe(2);
		expect(plainHitAgainst(strong[0], 'strike', strong[1], { combat: 'plain', plainElementStep: 2 })).toBe(4);
		expect(plainHitAgainst(strong[0], 'bolster', strong[1], PLAIN)).toBe(0);
		expect(plainHitOf('shield', PLAIN)).toBe(0);
	});
});

describe('plain fight: simultaneous exchanges', () => {
	test('two creatures can down each other in the same exchange', () => {
		const state = fight([striker()], [striker()], { ...PLAIN, plainExchanges: 4 });
		const downs = attacks(state).filter((e) => e.outcome === 'downed');
		expect(downs.map((e) => e.target).sort()).toEqual(['A_0', 'B_0']);
		// both fell to a blow dealt in the first exchange: no exchange was logged after it
		expect(logOf(state).filter((e) => e.type === 'exchange')).toHaveLength(0);
		const result = judged(state);
		expect(result.entries.A).toHaveLength(0);
		expect(result.entries.B).toHaveLength(0);
		expect(result.winner).toBeNull();
	});

	test('runs up to four exchanges and stops at the cap', () => {
		const state = fight([striker({ attributes: FULL })], [striker({ attributes: FULL })], { ...PLAIN, plainStrike: 1 });
		const exchanges = logOf(state).filter((e) => e.type === 'exchange').map((e) => e.exchange);
		expect(exchanges).toEqual([2, 3, 4]);
		// four exchanges of 1 off a hold of 6 leaves each at 2
		expect(judged(state).entries.A[0].hold).toBe(2);
		expect(judged(state).entries.B[0].hold).toBe(2);
	});

	test('the cap is a rules key', () => {
		const state = fight([striker({ attributes: FULL })], [striker({ attributes: FULL })], { ...PLAIN, plainStrike: 1, plainExchanges: 2 });
		expect(logOf(state).filter((e) => e.type === 'exchange').map((e) => e.exchange)).toEqual([2]);
	});

	test('stops early when nobody standing can hit', () => {
		const state = fight([guard({ attributes: FULL })], [guard({ attributes: FULL })]);
		expect(logOf(state).filter((e) => e.type === 'exchange')).toHaveLength(0);
	});

	test('stops early when one side is empty', () => {
		const state = fight([striker({ attributes: FULL })], [striker()], PLAIN);
		expect(logOf(state).filter((e) => e.type === 'exchange')).toHaveLength(0);
		expect(judged(state).winner).toBe('A');
	});

	test('hurt creatures hit no softer: damage taken does not scale a hit', () => {
		const state = fight([striker({ attributes: FULL })], [striker({ attributes: FULL })], { ...PLAIN, plainStrike: 2, plainExchanges: 3 });
		attacks(state).filter((e) => e.outcome === 'hurt').forEach((e) => expect(e.power).toBe(2));
	});

	test('judging is unchanged: the world goes to whoever holds more after the fight, a tie to nobody', () => {
		const state = fight([striker({ attributes: FULL })], [striker({ attributes: FULL })], { ...PLAIN, plainExchanges: 1 });
		const result = judged(state);
		expect(result.holdA).toBe(4);
		expect(result.holdB).toBe(4);
		expect(result.winner).toBeNull();
	});
});

describe('plain strike target: random, drawn from the match seed', () => {
	const targets = (seed: string) => {
		const state = fight([striker({ attributes: FULL })], [striker({ attributes: FULL }), striker({ attributes: FULL }), striker({ attributes: FULL })], { ...PLAIN, plainExchanges: 1 }, seed);
		return attacks(state).filter((e) => e.recordId === 'A_0').map((e) => e.target);
	};

	test('the same seed gives the same target every time', () => {
		expect(targets('repeat-me')).toEqual(targets('repeat-me'));
	});

	test('different seeds spread the strike over every standing rival', () => {
		const seen = new Set<string>();
		for (let i = 0; i < 40; i++) {
			targets(`spread-${i}`).forEach((t) => seen.add(String(t)));
		}
		expect(Array.from(seen).sort()).toEqual(['B_0', 'B_1', 'B_2']);
	});

	test('a replay of a whole plain match is identical', () => {
		const a = runSimulation({ matches: 8, seed: 11, rules: RULES_PLAIN });
		const b = runSimulation({ matches: 8, seed: 11, rules: RULES_PLAIN });
		expect(JSON.parse(JSON.stringify(a))).toEqual(JSON.parse(JSON.stringify(b)));
		expect(a.errors).toEqual([]);
	});
});

describe('plain previews', () => {
	test('forecastSendBlows reads the plain fight', () => {
		let state = createMatch({ rosterA: twelve('A', [striker({ attributes: FULL })]), rosterB: twelve('B', [striker({ attributes: FULL })]), worlds: makeWorlds(), seed: 'forecast', rules: PLAIN });
		state = { ...state, starter: 'A', turn: 'A' } as MatchState;
		const site = currentFrame(state).sites[0].id;
		state = send(state, 'A', 'A_0', site)!;
		const forecast = forecastSendBlows(state, 'B', 'B_0', site);
		expect(forecast).not.toBeNull();
		expect(forecast!.taken.reduce((sum, b) => sum + b.power, 0)).toBeGreaterThan(0);
		forecast!.taken.forEach((b) => expect(b.power % 2).toBe(0));
	});

	test('prepare gives the fixed hit of the act, not the record magnitude', () => {
		const s = { id: 's', name: 's', planet: 'X', element: 'metal', environment: { medium: 'gas', temperatureC: { min: 0, max: 30 } } } as any;
		const w = { planet: 'X', element: 'metal', sites: [] } as any;
		expect(prepare(striker(), s, w, 0, { rules: PLAIN }).blowMagnitude).toBe(2);
		expect(prepare(sweeper(), s, w, 0, { rules: PLAIN }).blowMagnitude).toBe(1);
		expect(prepare(mender(), s, w, 0, { rules: PLAIN }).mendMagnitude).toBe(1);
		expect(prepare(striker(), s, w, 0, { rules: DEFAULT_RULES }).blowMagnitude).not.toBe(2);
	});
});

describe('graded rules are unchanged', () => {
	test('combat defaults to graded, and the plain keys carry the design settings', () => {
		const match = createMatch({ rosterA: twelve('A', []), rosterB: twelve('B', []), worlds: makeWorlds(), seed: 'x' });
		expect(match.rules.combat).toBe('graded');
		expect(DEFAULT_RULES.plainHoldDivisor).toBe(3);
		expect(DEFAULT_RULES.plainHoldMin).toBe(2);
		expect(DEFAULT_RULES.plainHoldMax).toBe(6);
		expect(DEFAULT_RULES.plainStrike).toBe(2);
		expect(DEFAULT_RULES.plainSweep).toBe(1);
		expect(DEFAULT_RULES.plainMend).toBe(1);
		expect(DEFAULT_RULES.plainExchanges).toBe(4);
		expect(DEFAULT_RULES.plainElementStep).toBe(1);
		expect(RULES_PLAIN).toEqual({ combat: 'plain' });
	});

	// the fixture is the simulator's whole summary at seed 7 and 50 matches, taken from origin/main
	// before the plain rules were added; regenerate it only when the graded rules change on purpose
	test('the simulator at seed 7 and 50 matches reproduces origin/main exactly', () => {
		const report = JSON.parse(JSON.stringify(runSimulation({ matches: 50, seed: 7 })));
		expect(report).toEqual(baselineGraded);
	});
});
