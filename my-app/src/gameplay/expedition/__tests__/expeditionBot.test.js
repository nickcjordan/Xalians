import { createMatch, send, pass, getPublicState, createRngState, nextRandom, moveSwift } from '../expeditionRules.js';
import { chooseSend, chooseStake, scoreSends, roleValueOf, RIVALS, DEFAULT_RIVAL_ID, rivalById } from '../expeditionBot.js';
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
	whichever side is omitted, matching chooseSend's own default), asserting
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

describe('roleValueOf: what a role is worth at a world', () => {
	test('a strike is worth what it would take off its conduct target, and a presence is worth its effect', () => {
		let state = createMatch({ rosterA: makeRoster('A'), rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'bot-role-seed' });
		const frame = state.frames[0];
		const starter = state.starter;
		const other = starter === 'A' ? 'B' : 'A';
		state = send(state, starter, state.players[starter].roster[0].id, frame.sites[0].id);
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
		expect(RIVALS.map((r) => r.id)).toEqual(['envoy', 'broker', 'proctor', 'windsailor', 'heir']);
		// the ladder is the measured order, weakest first
		const marks = RIVALS.map((r) => r.measured.vsProctor);
		expect(marks.slice().sort((a, b) => a - b)).toEqual(marks);
		RIVALS.forEach((r) => {
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
			hurt: {},
			wardedBy: {},
			snared: {},
			players: {
				A: { rosterCount: 1, sentCount: 1, holding: 0, withdrawn: 0, downed: 0, passed: false, sitesWon: 0, hiddenSentThisRound: 0, roster: ownRoster, movableRecordIds: [] },
				B: { rosterCount: 12, sentCount: 0, holding: 0, withdrawn: 0, downed: 0, passed: false, sitesWon: 0, hiddenSentThisRound: 0 },
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

	/*
		Coverage for docs/design/reclamation-play-enhancements.md's "Pass 2 levers", lever 1
		(the hide rule). The old rule (|margin| < hold) was the flip condition restated: since
		the bot's own scoring always prefers a flip/contest over securing an already-won site
		(flipValue >> secureValue), the picked candidate's pre-send margin is <= 0 for nearly
		every real send, so the old rule read "hide" on almost all of them and hideBias had
		nothing to act on. The new rule judges the site by where the send LEAVES it
		(resultMargin = pre-send margin + this creature's hold): a send that leaves the site
		only just past even, or that the rival can still answer, hides; one that leaves it
		solidly ahead goes openly. This asserts the broker's hideBias (1.8) actually produces
		a higher hidden-send rate than the proctor's (1) over a batch of full matches with a
		mixed stealthy/non-stealthy roster - the behaviour Pass 1 found missing.
	*/
	test('behaviour: hideBias measurably moves the hidden-send rate over a batch (the pass-1 friction, fixed)', () => {
		const broker = rivalById('broker');
		const proctor = rivalById('proctor');
		const BATCH = 20;
		let brokerHidden = 0;
		let brokerSends = 0;
		let proctorHidden = 0;
		let proctorSends = 0;

		function makeStealthyRoster(prefix) {
			return makeRoster(prefix, (i) => ({
				traits: { guaranteed: [], rolled: i % 2 === 0 ? ['stealthy'] : [] },
				attributes: { vitality: 40 + (i % 6) * 10, resilience: 40 + (i % 5) * 10, endurance: 50 + (i % 4) * 8 },
			}));
		}

		for (let i = 0; i < BATCH; i++) {
			const rosterA = makeStealthyRoster('A');
			const rosterB = makeStealthyRoster('B');

			const brokerMatch = playMatch(rosterA, rosterB, makeWorlds(), `hidebias-broker-${i}`, { A: broker, B: proctor });
			const brokerActionsA = brokerMatch.actionLog.filter((a) => a.handler === 'A' && a.type === 'send');
			brokerSends += brokerActionsA.length;
			brokerHidden += brokerActionsA.filter((a) => a.hidden).length;

			const proctorMatch = playMatch(rosterA, rosterB, makeWorlds(), `hidebias-proctor-${i}`, { A: proctor, B: proctor });
			const proctorActionsA = proctorMatch.actionLog.filter((a) => a.handler === 'A' && a.type === 'send');
			proctorSends += proctorActionsA.length;
			proctorHidden += proctorActionsA.filter((a) => a.hidden).length;
		}

		const brokerRate = brokerHidden / brokerSends;
		const proctorRate = proctorHidden / proctorSends;
		expect(brokerRate).toBeGreaterThan(proctorRate);
	});
});

/*
	The swift move (docs/design/reclamation-base-redesign.md assumption 20). The bot only
	ever proposes a move the engine will accept, so the test drives the proposal straight
	into moveSwift rather than asserting on the scorer's internals.
*/
describe('chooseSend: swift creatures move', () => {
	function swiftRoster(prefix) {
		const roster = [];
		for (let i = 0; i < ROSTER_SIZE; i++) {
			roster.push(makeRecord(`${prefix}_${i}`, { attributes: { agility: 90, reflex: 90 } }));
		}
		return roster;
	}

	test('every move the bot proposes names one of its own movable creatures and is legal', () => {
		let state = createMatch({
			rosterA: swiftRoster('A'), rosterB: swiftRoster('B'),
			worlds: makeWorlds(), seed: 'bot-swift-seed',
		});
		const rng = makeRng('bot-swift-rng');
		let proposals = 0;
		let guard = 0;
		while (state.phase === 'deploy' && guard < 200) {
			guard++;
			const handler = state.turn;
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
				state = moved;
				continue;
			}
			state = action.type === 'send'
				? send(state, handler, action.recordId, action.siteId, action.hidden)
				: pass(state, handler);
			expect(state).not.toBeNull();
		}
		// an all-swift board is exactly the case the rule exists for, so it must fire
		expect(proposals).toBeGreaterThan(0);
	});

	test('proposes no move at all under the swiftMove ablation', () => {
		let state = createMatch({
			rosterA: swiftRoster('A'), rosterB: swiftRoster('B'),
			worlds: makeWorlds(), seed: 'bot-swift-off-seed', rules: { swiftMove: false },
		});
		const rng = makeRng('bot-swift-off-rng');
		let guard = 0;
		while (state.phase === 'deploy' && guard < 200) {
			guard++;
			const handler = state.turn;
			if (handler === null) {
				break;
			}
			const view = getPublicState(state, handler);
			const action = chooseSend(view, state.players[handler].roster, handler, rng, null);
			expect(action.type).not.toBe('move');
			state = action.type === 'send'
				? send(state, handler, action.recordId, action.siteId, action.hidden)
				: pass(state, handler);
		}
	});
});


/*
	PASS 3 (docs/design/reclamation-base-redesign.md assumptions 21 and 22). The bot has to
	price hiding against all three hiding levers and has to be able to take the stake, both
	from public information only.
*/
describe('pass 3: the bot prices hiding (assumption 21)', () => {
	function stealthMatch(rules) {
		const rosterA = makeRoster('A', () => ({ traits: { guaranteed: ['stealthy'], rolled: [] } }));
		return createMatch({ rosterA, rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'hide-price-seed', rules });
	}

	function hideValuesOf(rules) {
		const state = stealthMatch(rules);
		const view = getPublicState(state, 'A');
		const scored = scoreSends(view, state.players.A.roster, 'A', null);
		return scored.candidates;
	}

	it('every candidate carries a priced hide value, a hide cost and whether the cap affords it', () => {
		hideValuesOf({}).forEach((c) => {
			expect(typeof c.hideValue).toBe('number');
			expect(typeof c.hideCost).toBe('number');
			expect(typeof c.hideAffordable).toBe('boolean');
		});
	});

	it('a hidden send costs more against the cap under hiddenSendCost, and is worth less', () => {
		const free = hideValuesOf({ hiddenSendCost: 1 });
		const priced = hideValuesOf({ hiddenSendCost: 2 });
		expect(free[0].hideCost).toBe(1);
		expect(priced[0].hideCost).toBe(2);
		expect(priced[0].hideValue).toBeLessThan(free[0].hideValue);
	});

	it('hiddenFirst off leaves hiding worth nothing to gain and never positive', () => {
		hideValuesOf({ hiddenFirst: false }).forEach((c) => {
			expect(c.hideValue).toBeLessThanOrEqual(0);
		});
	});

	it('a creature that cannot hide is priced at zero and marked unaffordable', () => {
		const state = createMatch({ rosterA: makeRoster('A'), rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'no-hide-seed' });
		const view = getPublicState(state, 'A');
		const scored = scoreSends(view, state.players.A.roster, 'A', null);
		scored.candidates.forEach((c) => {
			expect(c.hideValue).toBe(0);
			expect(c.hideAffordable).toBe(false);
		});
	});

	it('never proposes a hidden send under the hiddenSends ablation', () => {
		const state = stealthMatch({ hiddenSends: false });
		const view = getPublicState(state, state.turn);
		const action = chooseSend(view, state.players[state.turn].roster, state.turn, null, null);
		expect(action.hidden).toBeFalsy();
	});
});

describe('pass 3: the bot and the stake (assumption 22)', () => {
	function freshView(seed, rules) {
		const state = createMatch({ rosterA: makeRoster('A'), rosterB: makeRoster('B'), worlds: makeWorlds(), seed, rules });
		return { state, view: getPublicState(state, 'A') };
	}

	it('proposes only a world of the round, or nothing at all', () => {
		const { state, view } = freshView('bot-stake-seed');
		const wanted = chooseStake(view, state.players.A.roster, 'A', null);
		if (wanted) {
			expect(wanted.type).toBe('stake');
			expect(view.frame.sites.some((s) => s.id === wanted.siteId)).toBe(true);
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
		['s1', 's2', 's3', 's4', 's5', 's6'].forEach((seed) => {
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
		const staked = {
			...view,
			stakes: { ...view.stakes, [siteId]: { by: ['A'], countedValue: 2 } },
		};
		const before = scoreSends(view, state.players.A.roster, 'A', null)
			.candidates.find((c) => c.site.id === siteId);
		const after = scoreSends(staked, state.players.A.roster, 'A', null)
			.candidates.find((c) => c.site.id === siteId);
		expect(after.value).toBeGreaterThan(before.value);
	});
});
