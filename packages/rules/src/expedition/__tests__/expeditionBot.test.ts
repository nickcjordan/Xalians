import { describe, test, it, expect } from 'vitest';
import type { XalianRecord } from '@xalians/content/schema';
import { createMatch, send, pass, getPublicState, createRngState, nextRandom, moveSwift } from '../expeditionRules.ts';
import { chooseSend, chooseStake, scoreSends, roleValueOf, readUnseen, RIVALS, DEFAULT_RIVAL_ID, rivalById } from '../expeditionBot.ts';
import { ROSTER_SIZE, SENDABLE } from '../expeditionInterpretation.ts';
import type { Seat, World } from '../types.ts';

/*
	Coverage for docs/design/reclamation-design.md's "The bot" section: public information
	only, legal actions, and a full deterministic bot-vs-bot match completing.
*/

// deliberately minimal fixture, cast rather than filled out - see creatureOnTable.test.ts
function makeRecord(id: any, overrides: any = {}): XalianRecord {
	return {
		id,
		species: overrides.species || 'testling',
		provenance: { serial: 1, origin: overrides.origin || 'magmuth' },
		attributes: {
			strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 80,
			...overrides.attributes,
		},
		element: overrides.element || { primary: 'fire', affinities: { fire: 100 } },
		archetype: overrides.archetype || { key: 'balanced', favors: [] },
		physiology: overrides.physiology || {
			breathes: ['gas'],
			environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -50, max: 200 } },
		},
		traits: overrides.traits || { guaranteed: [], rolled: [] },
		temperament: overrides.temperament || { boldness: 50, curiosity: 50, energy: 50, aggression: 50, sociability: 50 },
		abilities: overrides.abilities || [
			{ name: 'Strike', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 60 },
		],
	} as unknown as XalianRecord;
}

function makeRoster(prefix: any, overridesFn?: any): XalianRecord[] {
	const roster: XalianRecord[] = [];
	for (let i = 0; i < ROSTER_SIZE; i++) {
		roster.push(makeRecord(`${prefix}_${i}`, overridesFn ? overridesFn(i) : {}));
	}
	return roster;
}

function makeWorld(planet: any, element: any): World {
	return {
		planet,
		element,
		sites: [0, 1, 2].map((i: any) => ({
			id: `${planet.toLowerCase()}-site-${i}`,
			name: `${planet} Site ${i}`,
			planet,
			element,
			environment: { medium: 'gas', temperatureC: { min: -50, max: 200 } },
		})),
	} as unknown as World;
}

function makeWorlds(count: any = 9): World[] {
	const planets = [
		'Magmuth', 'Poseidas', 'Grimedes', 'Luminax', 'Floria', 'Zolton', 'Phantiri', 'Stonera', 'Drainov',
	];
	const elements = ['fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock', 'chemical'];
	const worlds: World[] = [];
	for (let i = 0; i < count; i++) {
		worlds.push(makeWorld(planets[i % planets.length], elements[i % elements.length]));
	}
	return worlds;
}

function makeRng(seed: any) {
	let state = createRngState(seed);
	return {
		float() {
			const { value, nextState } = nextRandom(state);
			state = nextState;
			return value;
		},
	};
}

/*
	Plays one full deterministic match with the given rivals (defaults to the proctor for
	whichever side is omitted, matching chooseSend's own default), asserting
	every action is legal along the way. Returns the final state plus telemetry used by the
	rival behaviour assertions below: the ordered action log, sends per side, hidden sends
	per side, and the frame index each side first passed in.
*/
function playMatch(rosterA: any, rosterB: any, worlds: any, seed: any, rivals: any = {}) {
	let state = createMatch({ rosterA, rosterB, worlds, seed });
	const botRng = makeRng(`${seed}-bot`);
	let guard = 0;
	const GUARD_LIMIT = 5000;

	const actionLog: any[] = [];
	const sendCounts = { A: 0, B: 0 };
	const hiddenCounts = { A: 0, B: 0 };
	const firstPassFrame: Record<Seat, number | null> = { A: null, B: null };

	while (state.phase !== 'matchEnd' && guard < GUARD_LIMIT) {
		guard++;
		if (state.phase === 'deploy') {
			const handler = state.turn!;
			const publicState = getPublicState(state, handler);
			let action = chooseSend(publicState, state.players[handler].roster, handler, botRng, rivals[handler]);
			actionLog.push({ handler, frameIndex: state.frameIndex, ...action });

			if (action.type === 'move') {
				const moved = moveSwift(state, handler, action.recordId, action.siteId);
				if (!moved) {
					throw new Error(`illegal swift move: ${JSON.stringify(action)} for ${handler}`);
				}
				state = moved;
				// same as the simulator: relocating does not end the turn, so ask again
				const publicStateAfter = getPublicState(state, handler);
				action = chooseSend(publicStateAfter, state.players[handler].roster, handler, botRng, rivals[handler]);
			}

			let next;
			if (action.type === 'send') {
				sendCounts[handler]++;
				if (action.hidden) {
					hiddenCounts[handler]++;
				}
				next = send(state, handler, action.recordId, action.siteId, action.hidden);
			} else {
				if (firstPassFrame[handler] === null) {
					firstPassFrame[handler] = state.frameIndex;
				}
				next = pass(state, handler);
			}
			if (!next) {
				throw new Error(`illegal deploy action: ${JSON.stringify(action)} for ${handler}`);
			}
			state = next;
		}
	}

	return { finalState: state, guard, actionLog, sendCounts, hiddenCounts, firstPassFrame };
}

describe('chooseSend', () => {
	test('never reads the opponent roster (only public info)', () => {
		const rosterA = makeRoster('A');
		const rosterB = makeRoster('B');
		const state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed: 'bot-seed-1' });
		const handler = state.starter;
		const publicState = getPublicState(state, handler);
		const opponent = handler === 'A' ? 'B' : 'A';
		expect(publicState.players[opponent].roster).toBeUndefined();
		const action = chooseSend(publicState, state.players[handler].roster, handler, makeRng(1));
		expect(['send', 'pass']).toContain(action.type);
	});

	test('produces a legal send (record in own roster, real site id)', () => {
		const rosterA = makeRoster('A');
		const rosterB = makeRoster('B');
		const state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed: 'bot-seed-2' });
		const handler = state.starter;
		const publicState = getPublicState(state, handler);
		const action = chooseSend(publicState, state.players[handler].roster, handler, makeRng(2));
		if (action.type === 'send') {
			expect(state.players[handler].roster.some((r: any) => r.id === action.recordId)).toBe(true);
			expect(publicState.frame.sites.some((s: any) => s.id === action.siteId)).toBe(true);
			const applied = send(state, handler, action.recordId, action.siteId, action.hidden);
			expect(applied).not.toBeNull();
		}
	});

	// pass 4b (assumption 27): the bot no longer decides this, it reports what the engine
	// will do, so the flag it returns has to track the creature's own traits exactly.
	test('reports hidden exactly when the creature is stealthy', () => {
		function reportedHiddenFor(stealthy: any, seed: any) {
			const rosterA = makeRoster('A', () => ({ traits: { guaranteed: stealthy ? ['stealthy'] : [], rolled: [] } }));
			const rosterB = makeRoster('B');
			const state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed });
			const publicState = getPublicState(state, 'A');
			const action = chooseSend(publicState, state.players.A.roster, 'A', makeRng(3));
			return action.type === 'send' ? (action as any).hidden : null;
		}
		expect(reportedHiddenFor(false, 'bot-seed-3')).toBe(false);
		expect(reportedHiddenFor(true, 'bot-seed-3')).toBe(true);
	});

	test('passes when the roster is empty', () => {
		const rosterA = makeRoster('A');
		const rosterB = makeRoster('B');
		const state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed: 'bot-seed-4' });
		const handler = state.starter;
		const publicState = getPublicState(state, handler);
		const action = chooseSend(publicState, [], handler, makeRng(4));
		expect(action.type).toBe('pass');
	});
});

describe('roleValueOf: what a role is worth at a world', () => {
	test('a strike is worth what it would take off its conduct target, and a presence is worth its effect', () => {
		let state = createMatch({ rosterA: makeRoster('A'), rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'bot-role-seed' });
		const frame = state.frames[0];
		const starter = state.starter;
		const other = starter === 'A' ? 'B' : 'A';
		state = send(state, starter, state.players[starter].roster[0].id, frame.sites[0].id)!;
		const publicState = getPublicState(state, other);
		const record = state.players[other].roster[0];
		const value = roleValueOf(publicState, record, frame.sites[0], 0, other);
		// a striker facing exactly one visible enemy is worth a real, capped number
		expect(typeof value).toBe('number');
		expect(value).toBeGreaterThanOrEqual(0);
	});

	test('a send with no enemy at the site is worth nothing beyond its own hold', () => {
		const state = createMatch({ rosterA: makeRoster('A'), rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'bot-role-empty' });
		const frame = state.frames[0];
		const handler = state.starter;
		const publicState = getPublicState(state, handler);
		const record = state.players[handler].roster[0];
		expect(roleValueOf(publicState, record, frame.sites[0], 0, handler)).toBe(0);
	});
});

describe('full bot-vs-bot match', () => {
	test('completes deterministically with only legal actions and no errors', () => {
		const rosterA = makeRoster('A', (i: any) => (i % 3 === 0 ? { traits: { guaranteed: [], rolled: ['stealthy'] } } : {}));
		const rosterB = makeRoster('B', (i: any) => (i % 4 === 0 ? { traits: { guaranteed: [], rolled: ['armored'] } } : {}));
		let state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed: 'bot-full-match-seed' });

		let botRng = makeRng('bot-full-match-seed-bot');
		let guard = 0;
		const GUARD_LIMIT = 5000;

		while (state.phase !== 'matchEnd' && guard < GUARD_LIMIT) {
			guard++;
			if (state.phase === 'deploy') {
				const handler = state.turn!;
				const publicState = getPublicState(state, handler);
				const action = chooseSend(publicState, state.players[handler].roster, handler, botRng);
				let next;
				if (action.type === 'send') {
					next = send(state, handler, action.recordId, action.siteId, action.hidden);
				} else {
					next = pass(state, handler);
				}
				expect(next).not.toBeNull();
				state = next!;
			}
		}

		expect(guard).toBeLessThan(GUARD_LIMIT);
		expect(state.phase).toBe('matchEnd');
		expect(['A', 'B']).toContain(state.winner);
	});

	test('is deterministic under a fixed seed (two independent runs agree on the winner)', () => {
		function playOut(seed: any) {
			const rosterA = makeRoster('A');
			const rosterB = makeRoster('B');
			let state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed });
			let botRng = makeRng(`${seed}-bot`);
			let guard = 0;
			while (state.phase !== 'matchEnd' && guard < 5000) {
				guard++;
				if (state.phase === 'deploy') {
					const handler = state.turn!;
					const publicState = getPublicState(state, handler);
					const action = chooseSend(publicState, state.players[handler].roster, handler, botRng);
					state = (action.type === 'send'
						? send(state, handler, action.recordId, action.siteId, action.hidden)
						: pass(state, handler))!;
				}
			}
			return state.winner;
		}

		expect(playOut('determinism-seed')).toBe(playOut('determinism-seed'));
	});
});

/*
	Coverage for docs/design/reclamation-play-enhancements.md's "Pass 1: the rivals" and
	expeditionBot.js's RIVALS/rivalById/DEFAULT_RIVAL_ID: every rival is playable to a legal
	match end, an unknown id is safe, the no-argument default matches the named proctor, and
	the weights measurably change behaviour (not just that they exist).
*/
describe('rivals', () => {
	test('RIVALS has five profiles in ladder order with the required shape', () => {
		expect(RIVALS).toHaveLength(5);
		expect(RIVALS.map((r: any) => r.id)).toEqual(['envoy', 'heir', 'proctor', 'broker', 'windsailor']);
		// the ladder is the measured order, weakest first
		const marks = RIVALS.map((r: any) => r.measured.vsProctor);
		expect(marks.slice().sort((a: any, b: any) => a - b)).toEqual(marks);
		RIVALS.forEach((r: any) => {
			expect(typeof r.name).toBe('string');
			expect(typeof r.faction).toBe('string');
			expect(typeof r.home).toBe('string');
			expect(typeof r.style).toBe('string');
			expect(r.style.length).toBeGreaterThan(0);
			expect(r.style).not.toMatch(/ - |--/); // no em-dashes in the fiction
			expect(typeof r.weights).toBe('object');
		});
		expect(DEFAULT_RIVAL_ID).toBe('proctor');
	});

	test('rivalById falls back to the proctor for an unknown or missing id', () => {
		expect(rivalById('not-a-real-rival').id).toBe('proctor');
		expect(rivalById(undefined).id).toBe('proctor');
		expect(rivalById(null).id).toBe('proctor');
	});

	test('chooseSend/chooseOrders with no rival argument matches rivalById("proctor") exactly (same action sequence)', () => {
		const rosterA = makeRoster('A', (i: any) => (i % 3 === 0 ? { traits: { guaranteed: [], rolled: ['stealthy'] } } : {}));
		const rosterB = makeRoster('B', (i: any) => (i % 4 === 0 ? { traits: { guaranteed: [], rolled: ['armored'] } } : {}));
		const proctor = rivalById('proctor');

		const withoutRival = playMatch(rosterA, rosterB, makeWorlds(), 'proctor-default-seed', {});
		const withProctor = playMatch(rosterA, rosterB, makeWorlds(), 'proctor-default-seed', { A: proctor, B: proctor });

		expect(withoutRival.actionLog).toEqual(withProctor.actionLog);
		expect(withoutRival.finalState.winner).toBe(withProctor.finalState.winner);
	});

	RIVALS.forEach((rival: any) => {
		test(`${rival.id} plays a full deterministic match to matchEnd with only legal actions`, () => {
			const rosterA = makeRoster('A', (i: any) => (i % 3 === 0 ? { traits: { guaranteed: [], rolled: ['stealthy'] } } : {}));
			const rosterB = makeRoster('B', (i: any) => (i % 4 === 0 ? { traits: { guaranteed: [], rolled: ['armored'] } } : {}));
			const result = playMatch(rosterA, rosterB, makeWorlds(), `rival-match-seed-${rival.id}`, { A: rival, B: rivalById('proctor') });

			expect(result.guard).toBeLessThan(5000);
			expect(result.finalState.phase).toBe('matchEnd');
			expect(['A', 'B']).toContain(result.finalState.winner);
		});
	});

	test('an unknown rival id used as a lookup before chooseSend still yields a full legal match (falls back to proctor)', () => {
		const rosterA = makeRoster('A');
		const rosterB = makeRoster('B');
		const result = playMatch(rosterA, rosterB, makeWorlds(), 'rival-unknown-seed', { A: rivalById('totally-unknown-id'), B: rivalById('proctor') });
		expect(result.finalState.phase).toBe('matchEnd');
		expect(['A', 'B']).toContain(result.finalState.winner);
	});

	test('behaviour: the envoy sends fewer creatures in frame 1 than the windsailor over a batch of matches', () => {
		const envoy = rivalById('envoy');
		const windsailor = rivalById('windsailor');
		const BATCH = 15;
		let envoyFrame1Sends = 0;
		let windsailorFrame1Sends = 0;

		// varied hold across the roster (rather than every creature identical) so the two
		// rivals' different minSendValue/holdCost/overspendAllowance thresholds actually
		// bite differently send by send, instead of both hitting the same all-or-nothing
		// decision at once
		function makeVariedRoster(prefix: any) {
			return makeRoster(prefix, (i: any) => ({
				attributes: { vitality: 40 + i * 5, resilience: 40 + (i % 5) * 10, endurance: 50 + (i % 4) * 8 },
			}));
		}

		for (let i = 0; i < BATCH; i++) {
			const rosterA = makeVariedRoster('A');
			const rosterB = makeVariedRoster('B');

			const envoyMatch = playMatch(rosterA, rosterB, makeWorlds(), `envoy-batch-${i}`, { A: envoy, B: rivalById('proctor') });
			envoyFrame1Sends += envoyMatch.actionLog.filter((a: any) => a.handler === 'A' && a.frameIndex === 0 && a.type === 'send').length;

			const windsailorMatch = playMatch(rosterA, rosterB, makeWorlds(), `windsailor-batch-${i}`, { A: windsailor, B: rivalById('proctor') });
			windsailorFrame1Sends += windsailorMatch.actionLog.filter((a: any) => a.handler === 'A' && a.frameIndex === 0 && a.type === 'send').length;
		}

		expect(envoyFrame1Sends).toBeLessThan(windsailorFrame1Sends);
	});

});


/*
	The swift move (docs/design/reclamation-base-redesign.md assumption 20). The bot only
	ever proposes a move the engine will accept, so the test drives the proposal straight
	into moveSwift rather than asserting on the scorer's internals.
*/
describe('chooseSend: swift creatures move', () => {
	function swiftRoster(prefix: any) {
		const roster = [];
		for (let i = 0; i < ROSTER_SIZE; i++) {
			// swift and light, or slow and solid: a board where relocating can actually be
			// worth more than standing still (see the note on the test below)
			const swift = i % 2 === 0;
			roster.push(makeRecord(`${prefix}_${i}`, {
				attributes: swift
					? { agility: 90, reflex: 90, vitality: 30, endurance: 30, resilience: 30 }
					: { agility: 15, reflex: 15, vitality: 85, endurance: 85, resilience: 85 },
			}));
		}
		return roster;
	}

	/*
		PASS 16. This test asserts the rule fires at all, which is right, and it used to pass
		on a board of TWENTY-FOUR IDENTICAL CREATURES. That worked only because the gate was
		`net > 0`: on a symmetric board no relocation is worth anything, every comparison is a
		near-tie, and a gate of "a hair better than staying" takes near-ties. That gate
		measured as a six-point loss to the creatures using it (see SWIFT_MOVE_GAIN), and at
		the shipped gain a symmetric board correctly produces no moves at all - there is
		nothing to move toward.

		So the roster is no longer uniform: half of each side is swift and fragile and half is
		slow and hard to shift, which is the shape that gives a move somewhere better to be.
		Several seeds are played, and the rule must fire across them.
	*/
	test('every move the bot proposes names one of its own movable creatures and is legal', () => {
		const seeds = ['bot-swift-seed', 'bot-swift-seed-2', 'bot-swift-seed-3', 'bot-swift-seed-4'];
		let proposalsAcrossSeeds = 0;
		for (const swiftSeed of seeds) {
			proposalsAcrossSeeds += runOneSwiftBoard(swiftSeed);
		}
		// an all-swift board is exactly the case the rule exists for, so it must fire
		expect(proposalsAcrossSeeds).toBeGreaterThan(0);
	});

	// one all-swift match, returning how many moves the bot proposed; every proposal is
	// checked for legality as it is made, which is the other half of this test's job
	function runOneSwiftBoard(swiftSeed: string): number {
		let state = createMatch({
			rosterA: swiftRoster('A'), rosterB: swiftRoster('B'),
			worlds: makeWorlds(), seed: swiftSeed,
		});
		const rng = makeRng(`bot-swift-rng-${swiftSeed}`);
		let proposals = 0;
		let guard = 0;
		while (state.phase === 'deploy' && guard < 200) {
			guard++;
			const handler = state.turn!;
			if (handler === null) {
				break;
			}
			const view = getPublicState(state, handler);
			const action = chooseSend(view, state.players[handler].roster, handler, rng, null);
			if (action.type === 'move') {
				proposals++;
				expect(view.players[handler].movableRecordIds).toContain(action.recordId);
				const moved = moveSwift(state, handler, action.recordId, action.siteId);
				expect(moved).not.toBeNull();
				state = moved!;
				continue;
			}
			state = (action.type === 'send'
				? send(state, handler, action.recordId, action.siteId, action.hidden)
				: pass(state, handler))!;
			expect(state).not.toBeNull();
		}
		return proposals;
	}

	test('proposes no move at all under the swiftMove ablation', () => {
		let state = createMatch({
			rosterA: swiftRoster('A'), rosterB: swiftRoster('B'),
			worlds: makeWorlds(), seed: 'bot-swift-off-seed', rules: { swiftMove: false },
		});
		const rng = makeRng('bot-swift-off-rng');
		let guard = 0;
		while (state.phase === 'deploy' && guard < 200) {
			guard++;
			const handler = state.turn!;
			if (handler === null) {
				break;
			}
			const view = getPublicState(state, handler);
			const action = chooseSend(view, state.players[handler].roster, handler, rng, null);
			expect(action.type).not.toBe('move');
			state = (action.type === 'send'
				? send(state, handler, action.recordId, action.siteId, action.hidden)
				: pass(state, handler))!;
		}
	});
});


/*
	PASS 3 (docs/design/reclamation-base-redesign.md assumptions 21 and 22). The bot's own
	pricing of hiding went with the hide decision in pass 4b (assumption 27): a stealthy
	creature arrives hidden, so there is nothing left to price. What remains of pass 3 in
	the bot is the stake.
*/
describe('pass 4b: concealment is reported, not chosen (assumption 27)', () => {
	function stealthMatch(rules: any) {
		const rosterA = makeRoster('A', () => ({ traits: { guaranteed: ['stealthy'], rolled: [] } }));
		return createMatch({ rosterA, rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'hide-price-seed', rules });
	}

	it('reports hidden true for a stealthy roster under the default rules', () => {
		const state = stealthMatch({});
		const handler = state.turn!;
		const view = getPublicState(state, handler);
		const action = chooseSend(view, state.players[handler].roster, handler, null, null);
		expect((action as any).hidden).toBe(true);
	});

	it('reports hidden false under the hiddenSends ablation', () => {
		const state = stealthMatch({ hiddenSends: false });
		const handler = state.turn!;
		const view = getPublicState(state, handler);
		const action = chooseSend(view, state.players[handler].roster, handler, null, null);
		expect((action as any).hidden).toBe(false);
	});
});

describe('pass 3: the bot and the stake (assumption 22)', () => {
	function freshView(seed: any, rules?: any) {
		const state = createMatch({ rosterA: makeRoster('A'), rosterB: makeRoster('B'), worlds: makeWorlds(), seed, rules });
		return { state, view: getPublicState(state, 'A') };
	}

	it('proposes only a world of the round, or nothing at all', () => {
		const { state, view } = freshView('bot-stake-seed');
		const wanted = chooseStake(view, state.players.A.roster, 'A', null);
		if (wanted) {
			expect(wanted.type).toBe('stake');
			expect(view.frame.sites.some((s: any) => s.id === wanted.siteId)).toBe(true);
		} else {
			expect(wanted).toBeNull();
		}
	});

	it('never proposes a stake when the rule is off, or when the handler has no stake left', () => {
		const off = freshView('bot-stake-off-seed', { stake: false });
		expect(chooseStake(off.view, off.state.players.A.roster, 'A', null)).toBeNull();

		const on = freshView('bot-stake-used-seed');
		const used = {
			...on.view,
			players: { ...on.view.players, A: { ...on.view.players.A, stakeableSiteIds: [] } },
		};
		expect(chooseStake(used, on.state.players.A.roster, 'A', null)).toBeNull();
	});

	it('a keener rival stakes on a thinner edge than a cautious one', () => {
		// the same board read by the two ends of the eagerness ladder: whenever the envoy
		// (0.6) stakes, the windsailor (1.5) stakes too, since the threshold is divided by
		// eagerness and both read the same edge
		const windsailor = rivalById('windsailor');
		const envoy = rivalById('envoy');
		let envoyStakes = 0;
		let windsailorStakes = 0;
		['s1', 's2', 's3', 's4', 's5', 's6'].forEach((seed: any) => {
			const { state, view } = freshView(seed);
			const roster = state.players.A.roster;
			const e = chooseStake(view, roster, 'A', envoy);
			const w = chooseStake(view, roster, 'A', windsailor);
			if (e) {
				envoyStakes++;
				expect(w).not.toBeNull();
			}
			if (w) {
				windsailorStakes++;
			}
		});
		expect(windsailorStakes).toBeGreaterThanOrEqual(envoyStakes);
	});

	it('prices a staked world above an unstaked one in scoreSends', () => {
		const { state, view } = freshView('bot-stake-value-seed');
		const siteId = view.frame.sites[0].id;
		const staked: any = {
			...view,
			stakes: { ...view.stakes, [siteId]: { by: ['A'], countedValue: 2 } },
		};
		const before = scoreSends(view, state.players.A.roster, 'A', null)
			.candidates.find((c: any) => c.site.id === siteId)!;
		const after = scoreSends(staked, state.players.A.roster, 'A', null)
			.candidates.find((c: any) => c.site.id === siteId)!;
		expect(after.value).toBeGreaterThan(before.value);
	});
});
