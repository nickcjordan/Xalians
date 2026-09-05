import { describe, it, expect } from 'vitest';
import { createMatch, send, pass, order, commitOrders, getPublicState, createRngState, nextRandom } from '../../../../gameplay/expedition/expeditionRules';
import { chooseSend, chooseOrders } from '../../../../gameplay/expedition/expeditionBot';
import { ROSTER_SIZE } from '../../../../gameplay/expedition/expeditionInterpretation';
import { buildMatchReport } from '../reclamationReport';

/*
	Coverage for buildMatchReport, per docs/design/reclamation-play-enhancements.md Pass 1
	item 3. The helpers below (makeRecord/makeRoster/makeWorld/makeWorlds/makeRng) and the
	bot-vs-bot driving loop are copied from expeditionBot.test.js's
	"full bot-vs-bot match" coverage, since the report has to be built from a real played
	match rather than a hand-authored one.
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

// plays a full bot-vs-bot match to phase 'matchEnd' and returns the final state, exactly
// as expeditionBot.test.js's "full bot-vs-bot match" test does
function playToMatchEnd(seed) {
	const rosterA = makeRoster('A', (i) => (i % 3 === 0 ? { traits: { guaranteed: [], rolled: ['stealthy'] } } : {}));
	const rosterB = makeRoster('B', (i) => (i % 4 === 0 ? { traits: { guaranteed: [], rolled: ['armored'] } } : {}));
	let state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed });

	let botRng = makeRng(`${seed}-bot`);
	let guard = 0;
	const GUARD_LIMIT = 5000;

	while (state.phase !== 'matchEnd' && guard < GUARD_LIMIT) {
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
	if (guard >= GUARD_LIMIT) {
		throw new Error('match did not reach matchEnd within the guard limit');
	}
	return { rosterA, rosterB, state };
}

// a recordsById map built from the original rosters, as the UI (which still holds the
// full squads) would build one for buildMatchReport's optional third argument
function recordsByIdFrom(rosterA, rosterB) {
	const map = {};
	[...rosterA, ...rosterB].forEach((r) => { map[r.id] = r; });
	return map;
}

describe('buildMatchReport', () => {
	it('reports a full played match: worlds, who fields, sends, and a non-empty decisive sentence', () => {
		const { rosterA, rosterB, state } = playToMatchEnd('report-seed-1');
		const you = 'A';
		const recordsById = recordsByIdFrom(rosterA, rosterB);
		const report = buildMatchReport(state, you, recordsById);

		expect(report.won).toBe(state.winner === you);
		expect(report.sitesYou).toBe(state.players.A.sitesWon);
		expect(report.sitesRival).toBe(state.players.B.sitesWon);
		expect(Array.isArray(report.worlds)).toBe(true);
		expect(report.worlds.length).toBeGreaterThan(0);
		expect(report.worlds.length).toBeLessThanOrEqual(9);

		// who fields agree with the tallies the engine itself kept (sitesWon)
		const wonByYou = report.worlds.filter((w) => w.who === 'you').length;
		const wonByRival = report.worlds.filter((w) => w.who === 'rival').length;
		const wonByCourt = report.worlds.filter((w) => w.who === 'court').length;
		expect(wonByYou).toBe(state.players.A.sitesWon);
		expect(wonByRival).toBe(state.players.B.sitesWon);
		expect(wonByYou + wonByRival + wonByCourt).toBe(report.worlds.length);

		// worlds are in frame order then site order
		for (let i = 1; i < report.worlds.length; i++) {
			expect(report.worlds[i].frameIndex).toBeGreaterThanOrEqual(report.worlds[i - 1].frameIndex);
		}

		// every world names a planet, a site and an element, and carries creature rows
		report.worlds.forEach((w) => {
			expect(typeof w.planet).toBe('string');
			expect(typeof w.siteName).toBe('string');
			expect(Array.isArray(w.yours)).toBe(true);
			expect(Array.isArray(w.theirs)).toBe(true);
			w.yours.concat(w.theirs).forEach((entry) => {
				expect(entry).toHaveProperty('recordId');
				expect(entry).toHaveProperty('hold');
				expect(entry).toHaveProperty('staggered');
				expect(['held', 'withdrew', 'routed']).toContain(entry.fate);
				// with a recordsById map supplied, records resolve rather than staying null
				expect(entry.record).not.toBeNull();
			});
		});

		expect(report.sends.you).toBe(state.players.A.sentCount);
		expect(report.sends.rival).toBe(state.players.B.sentCount);

		expect(typeof report.decisive).toBe('string');
		expect(report.decisive.length).toBeGreaterThan(0);

		expect(['clinched', 'frames-exhausted', 'tiebreak']).toContain(report.reason);
	});

	it('routs and staggers reported are consistent with the resolution log', () => {
		const { rosterA, rosterB, state } = playToMatchEnd('report-seed-2');
		const recordsById = recordsByIdFrom(rosterA, rosterB);
		const report = buildMatchReport(state, 'A', recordsById);

		const acts = state.resolutionLog.filter((e) => e && !e.type && Object.prototype.hasOwnProperty.call(e, 'outcome'));
		const routedCount = acts.filter((e) => e.outcome === 'routed').length;
		const staggeredCount = acts.filter((e) => e.outcome === 'staggered').length;

		expect(report.routs.dealt + report.routs.taken).toBeLessThanOrEqual(routedCount);
		expect(report.staggers.dealt + report.staggers.taken).toBeLessThanOrEqual(staggeredCount);
		expect(report.routs.dealt).toBeGreaterThanOrEqual(0);
		expect(report.routs.taken).toBeGreaterThanOrEqual(0);
	});

	it('champion, when present, is on a world the player won and carries the highest counted hold there', () => {
		const { rosterA, rosterB, state } = playToMatchEnd('report-seed-3');
		const recordsById = recordsByIdFrom(rosterA, rosterB);
		const report = buildMatchReport(state, 'A', recordsById);

		if (report.champion) {
			const wonWorlds = report.worlds.filter((w) => w.who === 'you');
			const allYourHolds = wonWorlds.flatMap((w) => w.yours.map((e) => e.hold));
			expect(report.champion.hold).toBe(Math.max(...allYourHolds));
			expect(report.champion.record).not.toBeNull();
		}
	});

	it('works without a recordsById map, falling back to null records rather than throwing', () => {
		const { state } = playToMatchEnd('report-seed-4');
		expect(() => buildMatchReport(state, 'A')).not.toThrow();
		const report = buildMatchReport(state, 'A');
		expect(report.worlds.length).toBeGreaterThan(0);
		report.worlds.forEach((w) => {
			w.yours.concat(w.theirs).forEach((entry) => {
				expect(entry.record).toBeNull();
			});
		});
	});

	it('handles an empty resolutionLog (partial data) without throwing and reports zero worlds', () => {
		const emptyMatch = {
			frames: [],
			resolutionLog: [],
			players: {
				A: { roster: [], sentCount: 0, holding: [], withdrawn: [], routed: [], sitesWon: 0, firstPasser: false },
				B: { roster: [], sentCount: 0, holding: [], withdrawn: [], routed: [], sitesWon: 0, firstPasser: false },
			},
			winner: null,
			matchEndReason: null,
		};
		expect(() => buildMatchReport(emptyMatch, 'A')).not.toThrow();
		const report = buildMatchReport(emptyMatch, 'A');
		expect(report.worlds).toEqual([]);
		expect(report.sitesYou).toBe(0);
		expect(report.sitesRival).toBe(0);
		expect(report.champion).toBeNull();
		expect(typeof report.decisive).toBe('string');
	});

	it('does not throw on a completely empty match object', () => {
		expect(() => buildMatchReport({}, 'A')).not.toThrow();
		expect(() => buildMatchReport(null, 'A')).not.toThrow();
		expect(() => buildMatchReport(undefined, 'A')).not.toThrow();
	});
});
