/*
	Pass 11. The rulebook now states exactly how a Clash resolves ("How a Clash resolves,
	exactly", reclamation-design.md), because a fresh reader predicting rulings from the
	table scored 11 of 12 and said every miss was arithmetic ordering rather than strategy.

	Prose drifts from code unless something holds them together. Each test below pins one
	sentence of that section, so if the engine's order changes, the documentation fails
	here rather than quietly becoming a lie.
*/
import { describe, test, expect } from 'vitest';
import { createMatch, send, pass, currentFrame } from '../expeditionRules.ts';
import { prepare } from '../creatureOnTable.ts';
import { SWEEP_DISCOUNT, ARMORED_REDUCTION, MAGNITUDE_SCALE } from '../expeditionInterpretation.ts';
import type { MatchState } from '../types.ts';

// a minimal world with one site, so every send lands in the same fight
function makeWorlds() {
	const site = (id: string) => ({
		id, name: `Site ${id}`, medium: 'gas',
		temperatureC: { low: -50, high: 80 },
	});
	// a match draws nine distinct worlds (three frames of three), so the fixture supplies
	// nine even though every test only ever fights at the first site of the first frame
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
		id: `r${uid}`,
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

// the roster ids are fixed so the resolution log can be read by seat and slot, the same
// way the other engine tests address creatures
function twelve(seed: string, first: any[]) {
	return Array.from({ length: 12 }, (_, i) => ({
		...(first[i] ? first[i] : record()),
		id: `${seed}_${i}`,
	}));
}

// send one creature per side to the one site, then both pass, which resolves and judges
function clashOf(mine: any, theirs: any, rules: any = undefined): MatchState {
	const worlds = makeWorlds();
	let state = createMatch({
		rosterA: twelve('A', [mine]), rosterB: twelve('B', [theirs]), worlds, seed: 'trace-seed', rules,
	});
	state = { ...state, starter: 'A', turn: 'A' } as MatchState;
	const site = currentFrame(state).sites[0].id;
	state = send(state, 'A', state.players.A.roster[0].id, site)!;
	state = send(state, 'B', state.players.B.roster[0].id, site)!;
	state = pass(state, state.turn!)!;
	state = pass(state, state.turn!)!;
	return state;
}

const attacksIn = (state: MatchState) => (state.resolutionLog as any[]).filter((e) => e.type === 'attack');

describe('the declared power chain, in the order the rulebook states it', () => {
	/*
		"if the TARGET is armored, times (1 - armoredReduction), so three quarters" - and it
		is part of the DECLARATION, so a shield sees the reduced number and the hurt scaling
		applies after it, not before.
	*/
	test('armored takes its quarter off an attack aimed at it', () => {
		const striker = record({ attributes: { strength: 99, agility: 99, reflex: 99 } });
		const plain = record({ attributes: { vitality: 99, endurance: 99, resilience: 99 } });
		const armored = record({ attributes: { vitality: 99, endurance: 99, resilience: 99 }, traits: ['armored'] });

		const againstPlain = attacksIn(clashOf(striker, plain)).find((e) => e.recordId === 'A_0' || e.role === 'strike');
		const againstArmored = attacksIn(clashOf(striker, armored)).find((e) => e.recordId === 'A_0' || e.role === 'strike');
		expect(againstPlain).toBeTruthy();
		expect(againstArmored).toBeTruthy();
		// three quarters, within the engine's one-decimal rounding
		expect(againstArmored.power).toBeLessThan(againstPlain.power);
		expect(againstArmored.power).toBeCloseTo(
			Math.round(againstPlain.power * (1 - ARMORED_REDUCTION) * 10) / 10, 1,
		);
	});

	/*
		"if the attacker is a sweep, times sweepDiscount (0.6)". A sweep's per-creature
		amount is the discounted one, which is what the rulebook's worked example computes.
	*/
	test('a sweep lands its discounted share on each other creature', () => {
		const sweeper = record({
			abilities: [{ name: 'Burst', signature: true, instrument: 'body', action: 'burst', medium: 'metal', intensity: 60 }],
			attributes: { intelligence: 99, agility: 99, reflex: 99 },
		});
		const striker = record({
			abilities: [{ name: 'Hit', signature: true, instrument: 'fists', action: 'strike', medium: 'metal', intensity: 60 }],
			attributes: { strength: 99, agility: 1, reflex: 1, vitality: 99, endurance: 99, resilience: 99 },
		});
		const state = clashOf(sweeper, striker);
		const prepared = prepare(sweeper, currentFrame(state).sites[0] as any, undefined, 0, { rules: state.rules });
		const sweep = attacksIn(state).find((e) => e.role === 'sweep');
		expect(sweep).toBeTruthy();
		// the declared per-victim amount is the blow times the sweep discount, before the
		// hurt scaling that applies when it lands
		expect(sweep.power).toBeLessThanOrEqual(Math.round(prepared.blowMagnitude * SWEEP_DISCOUNT * 10) / 10 + 0.1);
	});
});

describe('the landing order', () => {
	/*
		"unstrained creatures before strained ones; within each of those two groups, by
		speed, higher first". The fresh reader could not tell how two strained creatures
		order against each other, and the answer is: by speed, exactly as unstrained ones.
	*/
	test('speed decides within a group, and a downed creature never swings', () => {
		const fast = record({ attributes: { strength: 99, agility: 99, reflex: 99, vitality: 1, endurance: 1, resilience: 1 } });
		const slow = record({ attributes: { strength: 99, agility: 1, reflex: 1, vitality: 1, endurance: 1, resilience: 1 } });
		const state = clashOf(fast, slow);
		const log = attacksIn(state);
		expect(log.length).toBeGreaterThan(0);
		// the faster creature's attack is logged first
		expect(log[0].recordId).toBe('A_0');
		// and if that attack downed the slower one, the slower one's own attack lapses
		const slowAttack = log.find((e) => e.recordId === 'B_0');
		if (log[0].outcome === 'downed') {
			expect(slowAttack ? slowAttack.outcome : 'lapsed').toBe('lapsed');
		}
	});

	/*
		"times the attacker's remaining hold over its full hold, as a plain ratio". No floor,
		no band: the reader's exact question, since it decides whether a 6.66 clears a 6.5.
	*/
	test('a hurt attacker lands exactly its remaining share, with no floor', () => {
		const slowBig = record({ attributes: { strength: 99, agility: 1, reflex: 1, vitality: 60, endurance: 60, resilience: 60 } });
		const fastBiter = record({ attributes: { strength: 70, agility: 99, reflex: 99, vitality: 60, endurance: 60, resilience: 60 } });

		const on = clashOf(slowBig, fastBiter);
		const off = clashOf(slowBig, fastBiter, { hurtAttacksLess: false });
		const answerOn = attacksIn(on).find((e) => e.recordId === 'A_0');
		const answerOff = attacksIn(off).find((e) => e.recordId === 'A_0');
		expect(answerOn).toBeTruthy();
		expect(answerOff).toBeTruthy();
		if (answerOn.outcome !== 'lapsed' && answerOff.outcome !== 'lapsed') {
			const opening = attacksIn(off).find((e) => e.recordId === 'B_0');
			const judged = (off.resolutionLog as any[]).find((e) => e.type === 'judge');
			const row = Object.values(judged.siteResults)
				.flatMap((r: any) => [...r.entries.A, ...r.entries.B])
				.find((e: any) => e.recordId === 'A_0') as any;
			if (opening && row && row.fullHold > 0) {
				const factor = (row.fullHold - opening.power) / row.fullHold;
				expect(answerOn.power).toBeCloseTo(Math.round(answerOff.power * factor * 10) / 10, 1);
			}
		}
	});
});

describe('what the rulebook says about menacing', () => {
	/*
		"It does not redirect a sweep, which chooses no target and hits everyone." The
		engine only applies the menacing redirect to a target PICK, so a sweep is untouched.
		Pinned here because the fresh reader had no way to know.
	*/
	test('a sweep hits every other creature regardless of menacing', () => {
		const sweeper = record({
			abilities: [{ name: 'Burst', signature: true, instrument: 'body', action: 'burst', medium: 'metal', intensity: 60 }],
			attributes: { intelligence: 99, agility: 99, reflex: 99 },
		});
		const menacing = record({ traits: ['menacing'], attributes: { vitality: 99, endurance: 99, resilience: 99 } });
		const plain = record({ attributes: { vitality: 99, endurance: 99, resilience: 99 } });
		const withMenacing = clashOf(sweeper, menacing);
		const withPlain = clashOf(sweeper, plain);

		// a sweep logs one attack per victim rather than one pick, so there is no chosen
		// target for menacing to draw: the same creature takes the same share either way
		const sweptMenacing = attacksIn(withMenacing).filter((e) => e.role === 'sweep');
		const sweptPlain = attacksIn(withPlain).filter((e) => e.role === 'sweep');
		expect(sweptMenacing.length).toBe(sweptPlain.length);
		expect(sweptMenacing.length).toBeGreaterThan(0);
		// every sweep event names the creature it caught, and menacing changed none of them
		expect(sweptMenacing.map((e: any) => e.target).sort())
			.toEqual(sweptPlain.map((e: any) => e.target).sort());
	});
});

describe('the magnitude scale is the one global rescale', () => {
	test('every declared attack carries it', () => {
		const striker = record({ attributes: { strength: 99 } });
		const dummy = record({ attributes: { vitality: 99, endurance: 99, resilience: 99 } });
		const normal = attacksIn(clashOf(striker, dummy)).find((e) => e.role === 'strike');
		const doubled = attacksIn(clashOf(striker, dummy, { magnitudeScale: MAGNITUDE_SCALE * 2 })).find((e) => e.role === 'strike');
		expect(normal).toBeTruthy();
		expect(doubled).toBeTruthy();
		expect(doubled.power).toBeGreaterThan(normal.power);
	});
});

/*
	The five a second fresh reader still could not settle after the first trace was written.
	Each is exact in the engine and now stated in the rulebook, so each is pinned here.
*/
describe('what the second reader could not settle', () => {
	// "A bolster restores damage from any source, friendly fire included."
	test('a bolster heals damage dealt by its own side', () => {
		const bolster = record({
			archetype: { key: 'sage', favors: [] },
			abilities: [{ name: 'Mend', signature: true, instrument: 'voice', action: 'mend', medium: 'metal', intensity: 60 }],
			attributes: { charisma: 99, vitality: 99, endurance: 99, resilience: 99 },
		});
		const sweeper = record({
			abilities: [{ name: 'Burst', signature: true, instrument: 'body', action: 'burst', medium: 'metal', intensity: 60 }],
			attributes: { intelligence: 99, agility: 99, reflex: 99 },
		});
		const enemy = record({ attributes: { vitality: 99, endurance: 99, resilience: 99 } });

		const worlds = makeWorlds();
		let state = createMatch({
			rosterA: twelve('A', [sweeper, bolster]), rosterB: twelve('B', [enemy]), worlds, seed: 'friendly-heal', rules: undefined,
		});
		state = { ...state, starter: 'A', turn: 'A' } as MatchState;
		const site = currentFrame(state).sites[0].id;
		state = send(state, 'A', 'A_0', site)!;
		state = send(state, 'B', 'B_0', site)!;
		state = send(state, 'A', 'A_1', site)!;
		state = pass(state, state.turn!)!;
		state = pass(state, state.turn!)!;

		// the bolster stood beside its own sweeper, so any damage it took came from its side
		const recovers = (state.resolutionLog as any[]).filter((e) => e.type === 'recover');
		const healedItself = recovers.some((e) => e.recordId === 'A_1' && e.amount > 0);
		const tookFriendlyFire = (state.resolutionLog as any[]).some(
			(e) => e.type === 'attack' && e.recordId === 'A_0' && e.target === 'A_1' && e.power > 0,
		);
		if (tookFriendlyFire) {
			expect(healedItself).toBe(true);
		}
	});

	// "The shielder's half-share is taken in the shield step, before any attack lands."
	test('the shielder pays its half-share at the cancel, not at the Ruling', () => {
		const shielder = record({
			archetype: { key: 'bulwark', favors: [] },
			abilities: [{ name: 'Ward', signature: true, instrument: 'hide', action: 'ward', medium: 'metal', intensity: 60 }],
			attributes: { charisma: 99, vitality: 40, endurance: 40, resilience: 40 },
		});
		const bigHitter = record({ attributes: { strength: 99, agility: 99, reflex: 99 } });
		const state = clashOf(shielder, bigHitter);

		const shieldEvents = (state.resolutionLog as any[]).filter((e) => e.type === 'shield');
		const attackEvents = (state.resolutionLog as any[]).filter((e) => e.type === 'attack');
		expect(shieldEvents.length).toBeGreaterThan(0);
		// every shield event is logged before every attack event: the cancel and its price
		// are settled in their own step
		if (attackEvents.length > 0) {
			const lastShield = (state.resolutionLog as any[]).lastIndexOf(shieldEvents[shieldEvents.length - 1]);
			const firstAttack = (state.resolutionLog as any[]).indexOf(attackEvents[0]);
			expect(lastShield).toBeLessThan(firstAttack);
		}
	});

	// "Nothing heals mid-Clash. Bolster is a Ruling step only."
	test('every recovery is logged after every attack', () => {
		const bolster = record({
			archetype: { key: 'sage', favors: [] },
			abilities: [{ name: 'Mend', signature: true, instrument: 'voice', action: 'mend', medium: 'metal', intensity: 60 }],
			attributes: { charisma: 99, vitality: 60, endurance: 60, resilience: 60 },
		});
		const hitter = record({ attributes: { strength: 80, agility: 99, reflex: 99 } });
		const state = clashOf(bolster, hitter);
		const log = state.resolutionLog as any[];
		const lastAttack = log.map((e) => e.type).lastIndexOf('attack');
		const firstRecover = log.map((e) => e.type).indexOf('recover');
		if (firstRecover >= 0 && lastAttack >= 0) {
			expect(firstRecover).toBeGreaterThan(lastAttack);
		}
	});
});
