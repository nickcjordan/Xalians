import { createMatch, send, pass, order, commitOrders, getPublicState, createRngState, nextRandom } from '../expeditionRules.js';
import { chooseSend, chooseOrders } from '../expeditionBot.js';
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
