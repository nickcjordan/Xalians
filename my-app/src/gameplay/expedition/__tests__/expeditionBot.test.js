import { createMatch, send, pass, order, commitOrders, getPublicState, createRngState, nextRandom, relocateVanguard } from '../expeditionRules.js';
import { chooseSend, chooseOrders, RIVALS, DEFAULT_RIVAL_ID, rivalById } from '../expeditionBot.js';
import { ROSTER_SIZE, SENDABLE } from '../expeditionInterpretation.js';

/*
	Coverage for docs/design/reclamation-design.md's "The bot" section: public information
	only, legal actions, and a full deterministic bot-vs-bot match completing.
*/

function makeRecord(id, overrides = {}) {
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
	};
}

function makeRoster(prefix, overridesFn) {
	const roster = [];
	for (let i = 0; i < ROSTER_SIZE; i++) {
		roster.push(makeRecord(`${prefix}_${i}`, overridesFn ? overridesFn(i) : {}));
	}
	return roster;
}

function makeWorld(planet, element) {
	return {
		planet,
		element,
		sites: [0, 1, 2].map((i) => ({
			id: `${planet.toLowerCase()}-site-${i}`,
			name: `${planet} Site ${i}`,
			planet,
			element,
			environment: { medium: 'gas', temperatureC: { min: -50, max: 200 } },
		})),
	};
}

function makeWorlds(count = 9) {
	const planets = [
		'Magmuth', 'Poseidas', 'Grimedes', 'Luminax', 'Floria', 'Zolton', 'Phantiri', 'Stonera', 'Drainov',
	];
	const elements = ['fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock', 'chemical'];
	const worlds = [];
	for (let i = 0; i < count; i++) {
		worlds.push(makeWorld(planets[i % planets.length], elements[i % elements.length]));
	}
	return worlds;
}

function makeRng(seed) {
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
	whichever side is omitted, matching chooseSend/chooseOrders' own default), asserting
	every action is legal along the way. Returns the final state plus telemetry used by the
	rival behaviour assertions below: the ordered action log, sends per side, hidden sends
	per side, and the frame index each side first passed in.
*/
function playMatch(rosterA, rosterB, worlds, seed, rivals = {}) {
	let state = createMatch({ rosterA, rosterB, worlds, seed });
	const botRng = makeRng(`${seed}-bot`);
	let guard = 0;
	const GUARD_LIMIT = 5000;

	const actionLog = [];
	const sendCounts = { A: 0, B: 0 };
	const hiddenCounts = { A: 0, B: 0 };
	const firstPassFrame = { A: null, B: null };

	while (state.phase !== 'matchEnd' && guard < GUARD_LIMIT) {
		guard++;
		if (state.phase === 'deploy') {
			const handler = state.turn;
			const publicState = getPublicState(state, handler);
			let action = chooseSend(publicState, state.players[handler].roster, handler, botRng, rivals[handler]);
			actionLog.push({ handler, frameIndex: state.frameIndex, ...action });

			if (action.type === 'relocate') {
				const relocated = relocateVanguard(state, handler, action.siteId);
				if (!relocated) {
					throw new Error(`illegal relocate action: ${JSON.stringify(action)} for ${handler}`);
				}
				state = relocated;
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
		} else if (state.phase === 'orders') {
			['A', 'B'].forEach((handler) => {
				const publicState = getPublicState(state, handler);
				const orders = chooseOrders(publicState, handler, rivals[handler]);
				Object.keys(orders).forEach((creatureId) => {
					const next = order(state, handler, creatureId, orders[creatureId]);
					if (!next) {
						throw new Error(`illegal order for ${creatureId}: ${orders[creatureId]}`);
					}
					state = next;
				});
			});
			let next = commitOrders(state, 'A');
			if (!next) {
				throw new Error('commitOrders(A) failed');
			}
			state = next;
			next = commitOrders(state, 'B');
			if (!next) {
				throw new Error('commitOrders(B) failed');
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
			expect(state.players[handler].roster.some((r) => r.id === action.recordId)).toBe(true);
			expect(publicState.frame.sites.some((s) => s.id === action.siteId)).toBe(true);
			const applied = send(state, handler, action.recordId, action.siteId, action.hidden);
			expect(applied).not.toBeNull();
		}
	});

	test('never hides a send for a non-stealthy creature', () => {
		const rosterA = makeRoster('A'); // no stealthy traits
		const rosterB = makeRoster('B');
		const state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed: 'bot-seed-3' });
		const handler = state.starter;
		const publicState = getPublicState(state, handler);
		const action = chooseSend(publicState, state.players[handler].roster, handler, makeRng(3));
		if (action.type === 'send') {
			expect(action.hidden).toBe(false);
		}
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

describe('chooseOrders', () => {
	test('only orders the handler\'s own deployed creatures with legal actions', () => {
		let state = createMatch({ rosterA: makeRoster('A'), rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'bot-orders-seed' });
		const frame = state.frames[0];
		const starter = state.starter;
		const other = starter === 'A' ? 'B' : 'A';
		state = send(state, starter, state.players[starter].roster[0].id, frame.sites[0].id);
		state = send(state, other, state.players[other].roster[0].id, frame.sites[0].id);
		state = pass(state, state.turn);
		state = pass(state, state.turn);

		const publicState = getPublicState(state, starter);
		const orders = chooseOrders(publicState, starter);
		const orderedIds = Object.keys(orders);
		orderedIds.forEach((id) => {
			const next = order(state, starter, id, orders[id]);
			expect(next).not.toBeNull();
		});
	});
});

describe('full bot-vs-bot match', () => {
	test('completes deterministically with only legal actions and no errors', () => {
		const rosterA = makeRoster('A', (i) => (i % 3 === 0 ? { traits: { guaranteed: [], rolled: ['stealthy'] } } : {}));
		const rosterB = makeRoster('B', (i) => (i % 4 === 0 ? { traits: { guaranteed: [], rolled: ['armored'] } } : {}));
		let state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed: 'bot-full-match-seed' });

		let botRng = makeRng('bot-full-match-seed-bot');
		let guard = 0;
		const GUARD_LIMIT = 5000;

		while (state.phase !== 'matchEnd' && guard < GUARD_LIMIT) {
			guard++;
			if (state.phase === 'deploy') {
				const handler = state.turn;
				const publicState = getPublicState(state, handler);
				const action = chooseSend(publicState, state.players[handler].roster, handler, botRng);
				let next;
				if (action.type === 'send') {
					next = send(state, handler, action.recordId, action.siteId, action.hidden);
				} else {
					next = pass(state, handler);
				}
				expect(next).not.toBeNull();
				state = next;
			} else if (state.phase === 'orders') {
				['A', 'B'].forEach((handler) => {
					const publicState = getPublicState(state, handler);
					const orders = chooseOrders(publicState, handler);
					Object.keys(orders).forEach((creatureId) => {
						const next = order(state, handler, creatureId, orders[creatureId]);
						expect(next).not.toBeNull();
						state = next;
					});
				});
				let next = commitOrders(state, 'A');
				expect(next).not.toBeNull();
				state = next;
				next = commitOrders(state, 'B');
				expect(next).not.toBeNull();
				state = next;
			}
		}

		expect(guard).toBeLessThan(GUARD_LIMIT);
		expect(state.phase).toBe('matchEnd');
		expect(['A', 'B']).toContain(state.winner);
	});

	test('is deterministic under a fixed seed (two independent runs agree on the winner)', () => {
		function playOut(seed) {
			const rosterA = makeRoster('A');
			const rosterB = makeRoster('B');
			let state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed });
			let botRng = makeRng(`${seed}-bot`);
			let guard = 0;
			while (state.phase !== 'matchEnd' && guard < 5000) {
				guard++;
				if (state.phase === 'deploy') {
					const handler = state.turn;
					const publicState = getPublicState(state, handler);
					const action = chooseSend(publicState, state.players[handler].roster, handler, botRng);
					state = action.type === 'send'
						? send(state, handler, action.recordId, action.siteId, action.hidden)
						: pass(state, handler);
				} else if (state.phase === 'orders') {
					['A', 'B'].forEach((handler) => {
						const publicState = getPublicState(state, handler);
						const orders = chooseOrders(publicState, handler);
						Object.keys(orders).forEach((creatureId) => {
							state = order(state, handler, creatureId, orders[creatureId]);
						});
					});
					state = commitOrders(state, 'A');
					state = commitOrders(state, 'B');
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
		expect(RIVALS.map((r) => r.id)).toEqual(['envoy', 'heir', 'broker', 'proctor', 'windsailor']);
		// the ladder is the measured order, weakest first
		const marks = RIVALS.map((r) => r.measured.vsProctor);
		expect(marks.slice().sort((a, b) => a - b)).toEqual(marks);
		RIVALS.forEach((r) => {
			expect(typeof r.name).toBe('string');
			expect(typeof r.faction).toBe('string');
			expect(typeof r.home).toBe('string');
			expect(typeof r.style).toBe('string');
			expect(r.style.length).toBeGreaterThan(0);
			expect(r.style).not.toMatch(/—|--/); // no em-dashes in the fiction
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
		const rosterA = makeRoster('A', (i) => (i % 3 === 0 ? { traits: { guaranteed: [], rolled: ['stealthy'] } } : {}));
		const rosterB = makeRoster('B', (i) => (i % 4 === 0 ? { traits: { guaranteed: [], rolled: ['armored'] } } : {}));
		const proctor = rivalById('proctor');

		const withoutRival = playMatch(rosterA, rosterB, makeWorlds(), 'proctor-default-seed', {});
		const withProctor = playMatch(rosterA, rosterB, makeWorlds(), 'proctor-default-seed', { A: proctor, B: proctor });

		expect(withoutRival.actionLog).toEqual(withProctor.actionLog);
		expect(withoutRival.finalState.winner).toBe(withProctor.finalState.winner);
	});

	RIVALS.forEach((rival) => {
		test(`${rival.id} plays a full deterministic match to matchEnd with only legal actions`, () => {
			const rosterA = makeRoster('A', (i) => (i % 3 === 0 ? { traits: { guaranteed: [], rolled: ['stealthy'] } } : {}));
			const rosterB = makeRoster('B', (i) => (i % 4 === 0 ? { traits: { guaranteed: [], rolled: ['armored'] } } : {}));
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

	test('behaviour: hideBias hides a send the base rule would send openly, given the same board (the broker\'s weight)', () => {
		// a hand-built publicState isolates the hide decision itself from the surrounding
		// deploy-economy checks (evenShare, overspend, minSendValue, stack discount, hold
		// cost). Those checks are real and, at the proctor's own tunables, a "secure with
		// margin already >= the sender's hold" candidate never clears MIN_SEND_VALUE in the
		// first place (securing an already-decisive site is cheap value against a real hold
		// cost) - so this test holds every OTHER weight at a permissive baseline and varies
		// only hideBias, which is the broker's actual point of difference from the proctor.
		// The candidate's hold and the existing ally's hold are set so the base hiding rule
		// (canHide && the send is not already a safely decisive margin) reads false: margin
		// (from the ally already at the site) is at least as large as the candidate's own
		// hold, so hideBias=1 (the rule exactly as written, which the proctor uses) sends it
		// openly, and the broker's hideBias=1.8 sends the identical candidate hidden.
		function site(id) {
			return { id, name: id, environment: { medium: 'gas', temperatureC: { min: -50, max: 200 } }, world: { planet: 'Magmuth', element: 'fire' } };
		}
		const ally = makeRecord('A_ally', { attributes: { vitality: 100, resilience: 100, endurance: 100 } });
		const candidate = makeRecord('A_stealth', { traits: { guaranteed: [], rolled: ['stealthy'] }, attributes: { vitality: 60, resilience: 60, endurance: 60 } });
		const ownRoster = [candidate];
		const publicState = {
			frameIndex: 2, // last frame: mustHold, so the evenShare/overspend gate (which would otherwise pass first) does not apply
			frame: { sites: [site('s0')] },
			nextFrame: null,
			phase: 'deploy',
			turn: 'A',
			starter: 'A',
			board: { s0: { A: [{ recordId: 'A_ally', record: ally, sentIndex: 0, hidden: false }], B: [] } },
			staggered: {},
			wardedBy: {},
			snared: {},
			players: {
				A: { rosterCount: 1, sentCount: 1, holding: 0, withdrawn: 0, routed: 0, passed: false, sitesWon: 0, hiddenSentThisRound: 0, canRelocateVanguard: false, roster: ownRoster, vanguardRecordId: 'A_ally' },
				B: { rosterCount: 12, sentCount: 0, holding: 0, withdrawn: 0, routed: 0, passed: false, sitesWon: 0, hiddenSentThisRound: 0 },
			},
		};

		const permissive = { weights: { minSendValue: 0.1, stackDiscount: 1, holdCost: 0, overspendAllowance: 5, hideBias: 1 } };
		const brokerHideBias = { weights: { ...permissive.weights, hideBias: rivalById('broker').weights.hideBias } };
		// seed chosen so the hide-bias roll lands well under the broker's 0.8 excess chance
		// (hideBias 1.8 -> excess = 0.8), so the outcome is not a coin-flip on CI
		const seed = 'hide-bias-isolation-1';
		const baseAction = chooseSend(publicState, ownRoster, 'A', makeRng(seed), permissive);
		const brokerAction = chooseSend(publicState, ownRoster, 'A', makeRng(seed), brokerHideBias);

		expect(baseAction.type).toBe('send');
		expect(brokerAction.type).toBe('send');
		expect(baseAction.hidden).toBe(false);
		expect(brokerAction.hidden).toBe(true);
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
		function makeVariedRoster(prefix) {
			return makeRoster(prefix, (i) => ({
				attributes: { vitality: 40 + i * 5, resilience: 40 + (i % 5) * 10, endurance: 50 + (i % 4) * 8 },
			}));
		}

		for (let i = 0; i < BATCH; i++) {
			const rosterA = makeVariedRoster('A');
			const rosterB = makeVariedRoster('B');

			const envoyMatch = playMatch(rosterA, rosterB, makeWorlds(), `envoy-batch-${i}`, { A: envoy, B: rivalById('proctor') });
			envoyFrame1Sends += envoyMatch.actionLog.filter((a) => a.handler === 'A' && a.frameIndex === 0 && a.type === 'send').length;

			const windsailorMatch = playMatch(rosterA, rosterB, makeWorlds(), `windsailor-batch-${i}`, { A: windsailor, B: rivalById('proctor') });
			windsailorFrame1Sends += windsailorMatch.actionLog.filter((a) => a.handler === 'A' && a.frameIndex === 0 && a.type === 'send').length;
		}

		expect(envoyFrame1Sends).toBeLessThan(windsailorFrame1Sends);
	});
});
