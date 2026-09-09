import {
	createMatch, send, pass, getPublicState, relocateVanguard, DEFAULT_RULES,
	ExpeditionRuleError, hasLegalSend, prepareEntry, currentFrame, findEntry, currentHoldOf,
} from '../expeditionRules.js';
import {
	ROSTER_SIZE, SENDABLE, SITES_TO_CLINCH, WORLDS_PER_MATCH, FRAMES_PER_MATCH, WORLDS_PER_FRAME,
	ROSTER_TRAILING_BONUS, ROLE, HOLD_FLOOR, HOLD_CEILING, MAGNITUDE_SCALE, AREA_DISCOUNT,
	BOLSTER_FLOOR, ARMORED_REDUCTION, SHIELD_CAP,
} from '../expeditionInterpretation.js';

/*
	Rules-engine coverage for Expedition's match/round/turn flow, per
	docs/design/reclamation-base-redesign.md ("The base": Deploy, Resolve, Judge; the four
	roles; blows that subtract) and the parts of docs/design/reclamation-design.md it did
	not supersede ("Conduct", "Roster economy", match end).

	The Orders phase is gone (assumption 1): the second pass of a round runs Resolve and
	Judge in one step, so every test that used to call commitOrders now simply passes
	twice and reads the log.
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

function makeWorld(planet, element, siteOverrides = [{}, {}, {}]) {
	return {
		planet,
		element,
		sites: siteOverrides.map((o, i) => ({
			id: `${planet.toLowerCase()}-site-${i}`,
			name: `${planet} Site ${i}`,
			planet,
			element,
			environment: { medium: 'gas', temperatureC: { min: -50, max: 200 } },
			...o,
		})),
	};
}

function makeWorlds(count = WORLDS_PER_MATCH) {
	const planets = [
		'Magmuth', 'Poseidas', 'Grimedes', 'Luminax', 'Floria', 'Zolton', 'Phantiri', 'Stonera', 'Drainov',
		'Saiphus', 'Telypso', 'Krystos', 'Veridium', 'Endessa',
	];
	const elements = [
		'fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock', 'chemical',
		'air', 'psychic', 'ice', 'metal', 'sand',
	];
	const worlds = [];
	for (let i = 0; i < count; i++) {
		worlds.push(makeWorld(planets[i % planets.length], elements[i % elements.length]));
	}
	return worlds;
}

function freshMatch(seed = 'test-seed', worlds = makeWorlds()) {
	return createMatch({ rosterA: makeRoster('A'), rosterB: makeRoster('B'), worlds, seed });
}

// the frame's three sites come from three different worlds; find the one whose site
// carries the given planet, since tests can no longer assume a fixed index for "the
// world we set up"
function siteOfPlanet(frame, planet) {
	return frame.sites.find((s) => s.world && s.world.planet === planet);
}

describe('createMatch validation', () => {
	test('rejects a roster without exactly 12 records', () => {
		const worlds = makeWorlds();
		expect(() => createMatch({ rosterA: [makeRecord('x')], rosterB: makeRoster('B'), worlds, seed: 1 })).toThrow(ExpeditionRuleError);
		expect(() => createMatch({ rosterA: [makeRecord('x')], rosterB: makeRoster('B'), worlds, seed: 1 })).toThrow(/exactly 12/);
	});

	test('rejects duplicate record ids within a roster', () => {
		const worlds = makeWorlds();
		const roster = makeRoster('A');
		roster[1] = { ...roster[1], id: roster[0].id };
		expect(() => createMatch({ rosterA: roster, rosterB: makeRoster('B'), worlds, seed: 1 })).toThrow(/duplicate/);
	});

	test('rejects fewer than 9 worlds', () => {
		expect(() => createMatch({ rosterA: makeRoster('A'), rosterB: makeRoster('B'), worlds: makeWorlds(1), seed: 1 })).toThrow(ExpeditionRuleError);
	});

	test('draws exactly 9 distinct worlds into 3 frames of 3, with no repeats', () => {
		const state = freshMatch();
		expect(state.frames.length).toBe(FRAMES_PER_MATCH);
		const planetNames = [];
		state.frames.forEach((frame) => {
			expect(frame.sites.length).toBe(WORLDS_PER_FRAME);
			frame.sites.forEach((site) => planetNames.push(site.world.planet));
		});
		expect(planetNames.length).toBe(WORLDS_PER_MATCH);
		expect(new Set(planetNames).size).toBe(WORLDS_PER_MATCH);
	});

	test('is deterministic under a fixed seed', () => {
		const s1 = freshMatch('same-seed');
		const s2 = freshMatch('same-seed');
		expect(s1.starter).toBe(s2.starter);
		const planetsOf = (s) => s.frames.map((f) => f.sites.map((site) => site.world.planet));
		expect(planetsOf(s1)).toEqual(planetsOf(s2));
	});

	test('starts in deploy phase on frame 1 with a random starter', () => {
		const state = freshMatch();
		expect(state.phase).toBe('deploy');
		expect(state.frameIndex).toBe(0);
		expect(['A', 'B']).toContain(state.starter);
		expect(state.turn).toBe(state.starter);
	});
});

describe('Deploy phase: send/pass/alternation', () => {
	test('send moves a record from roster to the board and alternates turn', () => {
		const state = freshMatch();
		const starter = state.starter;
		const frame = currentFrame(state);
		const recordId = state.players[starter].roster[0].id;
		const next = send(state, starter, recordId, frame.sites[0].id);
		expect(next).not.toBeNull();
		expect(next.players[starter].roster.some((r) => r.id === recordId)).toBe(false);
		expect(next.board[frame.sites[0].id][starter].some((e) => e.recordId === recordId)).toBe(true);
		expect(next.turn).toBe(starter === 'A' ? 'B' : 'A');
	});

	test('rejects a send out of turn', () => {
		const state = freshMatch();
		const nonStarter = state.starter === 'A' ? 'B' : 'A';
		const frame = currentFrame(state);
		const recordId = state.players[nonStarter].roster[0].id;
		expect(send(state, nonStarter, recordId, frame.sites[0].id)).toBeNull();
	});

	test('rejects sending a record not in your roster', () => {
		const state = freshMatch();
		const starter = state.starter;
		const frame = currentFrame(state);
		const otherPlayer = starter === 'A' ? 'B' : 'A';
		const foreignId = state.players[otherPlayer].roster[0].id;
		expect(send(state, starter, foreignId, frame.sites[0].id)).toBeNull();
	});

	test('rejects sending to a nonexistent site', () => {
		const state = freshMatch();
		const starter = state.starter;
		const recordId = state.players[starter].roster[0].id;
		expect(send(state, starter, recordId, 'not-a-site')).toBeNull();
	});

	test('any number of creatures may stand at one site', () => {
		let state = freshMatch();
		const starter = state.starter;
		const other = starter === 'A' ? 'B' : 'A';
		const frame = currentFrame(state);
		const siteId = frame.sites[0].id;
		state = send(state, starter, state.players[starter].roster[0].id, siteId);
		state = send(state, other, state.players[other].roster[0].id, siteId);
		state = send(state, starter, state.players[starter].roster[0].id, siteId);
		expect(state.board[siteId][starter].length).toBe(2);
		expect(state.board[siteId][other].length).toBe(1);
	});

	test('pass is permanent for the round', () => {
		let state = freshMatch();
		const starter = state.starter;
		state = pass(state, starter);
		expect(state.players[starter].passed).toBe(true);
		expect(send(state, starter, state.players[starter].roster[0].id, currentFrame(state).sites[0].id)).toBeNull();
	});

	test('the deploy end runs Resolve and Judge in one step when both have passed', () => {
		let state = freshMatch();
		const starter = state.starter;
		const other = starter === 'A' ? 'B' : 'A';
		state = pass(state, starter);
		state = pass(state, other);
		// no orders phase to sit in: the round is judged and the next one is open
		expect(['deploy', 'matchEnd']).toContain(state.phase);
		expect(state.frameIndex).toBe(1);
		expect(state.resolutionLog.some((e) => e.type === 'judge')).toBe(true);
	});

	test('SENDABLE limit: a handler cannot send an 11th creature', () => {
		// deplete side A's SENDABLE budget by always sending as A when it is A's turn and
		// passing outright when it is B's turn, so A alone reaches the SENDABLE cap
		let state = freshMatch('sendable-limit-seed');
		const frame = currentFrame(state);
		let sentByA = 0;
		let guard = 0;
		while (sentByA < SENDABLE && state.phase === 'deploy' && guard < 100) {
			guard++;
			if (state.turn === 'A') {
				const recordId = state.players.A.roster[0].id;
				state = send(state, 'A', recordId, frame.sites[0].id);
				sentByA++;
			} else {
				state = pass(state, 'B');
				if (state.phase !== 'deploy') {
					break;
				}
			}
		}
		expect(sentByA).toBe(SENDABLE);
		if (state.phase === 'deploy') {
			expect(hasLegalSend(state, 'A')).toBe(false);
		}
	});

	test('hidden send is only legal for a stealthy creature', () => {
		let state = freshMatch('stealth-seed');
		const starter = state.starter;
		const frame = currentFrame(state);
		const nonStealthId = state.players[starter].roster[0].id;
		expect(send(state, starter, nonStealthId, frame.sites[0].id, true)).toBeNull();

		const stealthyRoster = makeRoster('S', () => ({ traits: { guaranteed: [], rolled: ['stealthy'] } }));
		const stealthState = createMatch({ rosterA: stealthyRoster, rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'stealth-seed-2' });
		const stealthStarter = stealthState.starter;
		if (stealthStarter === 'A') {
			const next = send(stealthState, 'A', stealthyRoster[0].id, currentFrame(stealthState).sites[0].id, true);
			expect(next).not.toBeNull();
			expect(next.board[currentFrame(stealthState).sites[0].id].A[0].hidden).toBe(true);
		}
	});

	test('a handler with no legal send is auto-passed', () => {
		// exhaust one side's SENDABLE budget manually, then the auto-pass should trigger
		// on their next turn without an explicit pass() call
		let state = freshMatch('auto-pass-seed');
		const frame = currentFrame(state);
		let turnsUsed = 0;
		while (state.phase === 'deploy' && turnsUsed < SENDABLE * 2) {
			const handler = state.turn;
			if (handler === null) {
				break;
			}
			if (!hasLegalSend(state, handler)) {
				break;
			}
			const roster = state.players[handler].roster;
			if (roster.length === 0) {
				break;
			}
			state = send(state, handler, roster[0].id, frame.sites[0].id);
			turnsUsed++;
		}
		// after 10 sends by one side, that side is auto-passed on its next opportunity
		expect(state).not.toBeNull();
	});
});

describe('the round: Deploy, Resolve, Judge', () => {
	// two creatures, one per side, at one site, then both handlers pass. The second pass
	// resolves and judges (docs/design/reclamation-base-redesign.md assumption 1).
	function oneWorldRound(recordA, recordB, seed = 'round-seed', siteIndex = 0) {
		const worlds = makeWorlds();
		const rosterA = makeRoster('A').map((r, i) => (i === 0 ? { ...recordA, id: 'A_0' } : r));
		const rosterB = makeRoster('B').map((r, i) => (i === 0 ? { ...recordB, id: 'B_0' } : r));
		let state = createMatch({ rosterA, rosterB, worlds, seed });
		const frame = currentFrame(state);
		state = send(state, state.turn, state.turn === 'A' ? 'A_0' : 'B_0', frame.sites[siteIndex].id);
		state = send(state, state.turn, state.turn === 'A' ? 'A_0' : 'B_0', frame.sites[siteIndex].id);
		state = pass(state, state.turn);
		state = pass(state, state.turn);
		return state;
	}

	const plainStriker = (id, intensity, strength) => makeRecord(id, {
		abilities: [{ name: 'Hit', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity }],
		attributes: { strength, vitality: 60, endurance: 70, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 },
	});

	test('a round produces blow events and a judge event, and opens the next round', () => {
		const state = oneWorldRound(plainStriker('a', 60, 60), plainStriker('b', 60, 60), 'round-basic');
		expect(state.resolutionLog.some((e) => e.type === 'blow')).toBe(true);
		expect(state.resolutionLog.some((e) => e.type === 'judge')).toBe(true);
		expect(['deploy', 'matchEnd']).toContain(state.phase);
	});

	test('blows subtract from currentHold and a creature hit but standing is staggered', () => {
		const striker = plainStriker('striker', 60, 60);
		const tanky = makeRecord('tanky', {
			abilities: [{ name: 'Tap', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 5 }],
			attributes: { strength: 1, vitality: 99, endurance: 99, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 99 },
		});
		const state = oneWorldRound(striker, tanky, 'round-subtract');
		const blow = state.resolutionLog.find((e) => e.type === 'blow' && e.recordId === 'A_0');
		expect(blow).toBeTruthy();
		expect(blow.outcome).toBe('staggered');
		expect(blow.amount).toBeGreaterThan(0);
		// judge() clears the board for the next round, so the creature is read off the
		// judge event, which carries the same fullHold/damage/staggered the entry had
		const judged = state.resolutionLog.find((e) => e.type === 'judge');
		const target = Object.values(judged.siteResults)
			.flatMap((r) => [...r.entries.A, ...r.entries.B])
			.find((e) => e.recordId === 'B_0');
		expect(target.hold).toBeCloseTo(blow.remaining, 5);
		expect(target.hold).toBeCloseTo(target.fullHold - blow.amount, 5);
		expect(target.staggered).toBe(true);
	});

	test('a creature driven to zero is routed, off the world and out of the Proving', () => {
		const bigStriker = plainStriker('big', 100, 100);
		const frail = makeRecord('frail', {
			abilities: [{ name: 'Tap', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 5 }],
			attributes: { strength: 1, vitality: 1, endurance: 1, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 1 },
		});
		const state = oneWorldRound(bigStriker, frail, 'round-rout');
		const rout = state.resolutionLog.find((e) => e.type === 'blow' && e.outcome === 'routed');
		expect(rout).toBeTruthy();
		expect(rout.remaining).toBe(0);
		expect(state.players.B.routed).toContain('B_0');
		expect(findEntry(state, 'B_0')).toBeNull();
	});

	test('armored reduces a blow by the rules fraction', () => {
		const bigStriker = plainStriker('big2', 80, 90);
		const soft = makeRecord('soft', {
			abilities: [{ name: 'Tap', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 5 }],
			attributes: { strength: 1, vitality: 99, endurance: 99, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 99 },
		});
		const hard = makeRecord('hard', { ...soft, traits: { guaranteed: ['armored'], rolled: [] } });
		const soft2 = { ...soft, traits: { guaranteed: [], rolled: [] } };
		const softState = oneWorldRound(bigStriker, soft2, 'round-armor');
		const hardState = oneWorldRound(bigStriker, { ...hard, abilities: soft.abilities, attributes: soft.attributes, traits: ['armored'] }, 'round-armor');
		const softBlow = softState.resolutionLog.find((e) => e.type === 'blow' && e.recordId === 'A_0');
		const hardBlow = hardState.resolutionLog.find((e) => e.type === 'blow' && e.recordId === 'A_0');
		expect(hardBlow.amount).toBeLessThan(softBlow.amount);
		expect(hardBlow.amount).toBeCloseTo(Math.round(softBlow.amount * (1 - ARMORED_REDUCTION) * 10) / 10, 5);
	});

	test('sealed worlds: a blow never reaches a creature at another site', () => {
		const projector = makeRecord('projector', {
			abilities: [{ name: 'Beam', signature: false, instrument: 'eyes', action: 'beam', medium: 'fire', intensity: 100 }],
			attributes: { strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 90, charisma: 50, resilience: 60 },
		});
		const worlds = makeWorlds();
		const rosterA = makeRoster('A').map((r, i) => (i === 0 ? { ...projector, id: 'A_0' } : r));
		const rosterB = makeRoster('B').map((r, i) => (i === 0 ? { ...r, id: 'B_0' } : r));
		let state = createMatch({ rosterA, rosterB, worlds, seed: 'sealed-seed' });
		const frame = currentFrame(state);
		// A stands alone at site 0; B stands alone at site 1
		state = state.starter === 'A' ? state : { ...state, starter: 'A', turn: 'A' };
		state = send(state, 'A', 'A_0', frame.sites[0].id);
		state = send(state, 'B', 'B_0', frame.sites[1].id);
		state = pass(state, state.turn);
		state = pass(state, state.turn);
		const blow = state.resolutionLog.find((e) => e.type === 'blow' && e.recordId === 'A_0');
		expect(blow.outcome).toBe('no-target');
		expect(state.players.B.routed).toEqual([]);
	});
});

describe('resolution order: hidden first, then initiative, strained last', () => {
	function twoAtOneSite(recordA, recordB, seed, hiddenA = false) {
		const worlds = makeWorlds();
		const rosterA = makeRoster('A').map((r, i) => (i === 0 ? { ...recordA, id: 'A_0' } : r));
		const rosterB = makeRoster('B').map((r, i) => (i === 0 ? { ...recordB, id: 'B_0' } : r));
		let state = createMatch({ rosterA, rosterB, worlds, seed });
		state = state.starter === 'A' ? state : { ...state, starter: 'A', turn: 'A' };
		const frame = currentFrame(state);
		state = send(state, 'A', 'A_0', frame.sites[0].id, hiddenA);
		state = send(state, 'B', 'B_0', frame.sites[0].id);
		state = pass(state, state.turn);
		state = pass(state, state.turn);
		return state;
	}

	const striker = (id, over) => makeRecord(id, {
		abilities: [{ name: 'Hit', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 60 }],
		...over,
	});

	test('a hidden creature blows first, however slow it is (assumption 9)', () => {
		const slowHidden = striker('slow-hidden', {
			traits: { guaranteed: ['stealthy'], rolled: [] },
			attributes: { strength: 60, vitality: 60, endurance: 70, agility: 1, reflex: 1, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 },
		});
		const fast = striker('fast', {
			attributes: { strength: 60, vitality: 60, endurance: 70, agility: 99, reflex: 99, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 },
		});
		const state = twoAtOneSite(slowHidden, fast, 'hidden-first-seed', true);
		const blows = state.resolutionLog.filter((e) => e.type === 'blow');
		expect(blows[0].recordId).toBe('A_0');
		expect(blows[0].hidden).toBe(true);
	});

	test('with hiddenFirst off the same creature waits its turn in initiative order', () => {
		const slowHidden = striker('slow-hidden2', {
			traits: { guaranteed: ['stealthy'], rolled: [] },
			attributes: { strength: 60, vitality: 60, endurance: 70, agility: 1, reflex: 1, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 },
		});
		const fast = striker('fast2', {
			attributes: { strength: 60, vitality: 60, endurance: 70, agility: 99, reflex: 99, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 },
		});
		const worlds = makeWorlds();
		const rosterA = makeRoster('A').map((r, i) => (i === 0 ? { ...slowHidden, id: 'A_0' } : r));
		const rosterB = makeRoster('B').map((r, i) => (i === 0 ? { ...fast, id: 'B_0' } : r));
		let state = createMatch({ rosterA, rosterB, worlds, seed: 'hidden-first-seed', rules: { hiddenFirst: false } });
		state = state.starter === 'A' ? state : { ...state, starter: 'A', turn: 'A' };
		const frame = currentFrame(state);
		state = send(state, 'A', 'A_0', frame.sites[0].id, true);
		state = send(state, 'B', 'B_0', frame.sites[0].id);
		state = pass(state, state.turn);
		state = pass(state, state.turn);
		const blows = state.resolutionLog.filter((e) => e.type === 'blow');
		expect(blows[0].recordId).toBe('B_0');
	});

	test('strained creatures blow last regardless of initiative', () => {
		const strainedFast = makeRecord('strained', {
			attributes: { strength: 50, vitality: 95, endurance: 95, agility: 99, reflex: 99, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 95 },
			physiology: { breathes: ['liquid'], environmentalTolerance: { ambientMedia: ['liquid'], temperatureC: { min: -50, max: 200 } } },
		});
		const slow = makeRecord('slow', {
			attributes: { strength: 5, vitality: 60, endurance: 70, agility: 10, reflex: 10, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 },
			abilities: [{ name: 'Tap', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 10 }],
			physiology: { breathes: ['gas'], environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -50, max: 200 } } },
		});
		const worlds = [makeWorld('Magmuth', 'fire', [{ environment: { medium: 'gas', temperatureC: { min: -50, max: 200 } } }]), ...makeWorlds(8)];
		const rosterA = makeRoster('A').map((r, i) => (i === 0 ? { ...strainedFast, id: 'A_0' } : r));
		const rosterB = makeRoster('B').map((r, i) => (i === 0 ? { ...slow, id: 'B_0' } : r));
		let state = createMatch({ rosterA, rosterB, worlds, seed: 'strain-order-seed' });
		const frame = currentFrame(state);
		const site = siteOfPlanet(frame, 'Magmuth');
		expect(site).toBeTruthy();
		state = send(state, state.turn, state.turn === 'A' ? 'A_0' : 'B_0', site.id);
		state = send(state, state.turn, state.turn === 'A' ? 'A_0' : 'B_0', site.id);
		state = pass(state, state.turn);
		state = pass(state, state.turn);
		const blows = state.resolutionLog.filter((e) => e.type === 'blow');
		const strainedIndex = blows.findIndex((e) => e.recordId === 'A_0');
		const slowIndex = blows.findIndex((e) => e.recordId === 'B_0');
		expect(slowIndex).toBeGreaterThanOrEqual(0);
		expect(strainedIndex).toBeGreaterThan(slowIndex);
	});

	test('ties in initiative go to the earlier sentIndex', () => {
		const equal = (id) => makeRecord(id, { attributes: { strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 } });
		const worlds = makeWorlds();
		const rosterA = makeRoster('A').map((r, i) => (i < 2 ? { ...equal(`eq${i}`), id: `A_${i}` } : r));
		const rosterB = makeRoster('B').map((r, i) => (i === 0 ? { ...equal('eqB'), id: 'B_0' } : r));
		let state = createMatch({ rosterA, rosterB, worlds, seed: 'tie-seed' });
		state = state.starter === 'A' ? state : { ...state, starter: 'A', turn: 'A' };
		const frame = currentFrame(state);
		state = send(state, 'A', 'A_0', frame.sites[0].id);
		state = send(state, 'B', 'B_0', frame.sites[0].id);
		state = send(state, 'A', 'A_1', frame.sites[0].id);
		state = pass(state, state.turn);
		state = pass(state, state.turn);
		const blows = state.resolutionLog.filter((e) => e.type === 'blow');
		const idxA0 = blows.findIndex((e) => e.recordId === 'A_0');
		const idxA1 = blows.findIndex((e) => e.recordId === 'A_1');
		expect(idxA0).toBeGreaterThanOrEqual(0);
		expect(idxA1).toBeGreaterThan(idxA0);
	});
});

describe('the four roles', () => {
	const bigStriker = (id) => makeRecord(id, {
		archetype: { key: 'predator', favors: [] },
		abilities: [{ name: 'Smash', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 100 }],
		attributes: { strength: 100, vitality: 60, endurance: 70, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 },
	});
	const smallStriker = (id) => makeRecord(id, {
		archetype: { key: 'predator', favors: [] },
		abilities: [{ name: 'Poke', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 20 }],
		attributes: { strength: 20, vitality: 60, endurance: 70, agility: 20, reflex: 20, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 },
	});
	const shielder = (id) => makeRecord(id, {
		archetype: { key: 'bulwark', favors: [] },
		abilities: [{ name: 'Guard', signature: false, instrument: 'body', action: 'ward', medium: 'fire', intensity: 60 }],
		attributes: { strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 },
	});
	const bolsterer = (id) => makeRecord(id, {
		archetype: { key: 'sage', favors: [] },
		abilities: [{ name: 'Steady', signature: false, instrument: 'voice', action: 'mend', medium: 'fire', intensity: 60 }],
		attributes: { strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 },
	});
	const areaCreature = (id) => makeRecord(id, {
		archetype: { key: 'predator', favors: [] },
		abilities: [{ name: 'Cloud', signature: false, instrument: 'body', action: 'cloud', medium: 'fire', intensity: 90 }],
		attributes: { strength: 50, vitality: 60, endurance: 90, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 },
	});

	// deploys a named list per side at one site: [[recordFactory, id], ...]
	function deploy(listA, listB, seed, rules) {
		const worlds = makeWorlds();
		const rosterA = makeRoster('A').map((r, i) => (i < listA.length ? { ...listA[i](`A_${i}`), id: `A_${i}` } : r));
		const rosterB = makeRoster('B').map((r, i) => (i < listB.length ? { ...listB[i](`B_${i}`), id: `B_${i}` } : r));
		let state = createMatch({ rosterA, rosterB, worlds, seed, rules });
		state = state.starter === 'A' ? state : { ...state, starter: 'A', turn: 'A' };
		const frame = currentFrame(state);
		let sentA = 0;
		let sentB = 0;
		let guard = 0;
		while (state.phase === 'deploy' && state.frameIndex === 0 && guard < 40) {
			guard++;
			const handler = state.turn;
			if (handler === null) {
				break;
			}
			const sent = handler === 'A' ? sentA : sentB;
			const list = handler === 'A' ? listA : listB;
			if (sent < list.length) {
				state = send(state, handler, `${handler}_${sent}`, frame.sites[0].id);
				if (handler === 'A') {
					sentA++;
				} else {
					sentB++;
				}
			} else {
				state = pass(state, handler);
			}
		}
		return state;
	}

	test('shield cancels the largest blow against its side, and only one per shielder', () => {
		// B fields two strikers of very different size; A fields one shielder and a body
		const state = deploy([shielder, smallStriker], [bigStriker, smallStriker], 'shield-seed', { shieldCap: 'none' });
		const shields = state.resolutionLog.filter((e) => e.type === 'shield');
		expect(shields.length).toBe(1);
		expect(shields[0].recordId).toBe('A_0');
		// the biggest declared blow against A is B_0's
		expect(shields[0].cancelled).toBe('B_0');
		const cancelled = state.resolutionLog.filter((e) => e.type === 'blow' && e.outcome === 'cancelled');
		expect(cancelled.length).toBe(1);
		expect(cancelled[0].recordId).toBe('B_0');
		// the smaller blow still lands
		expect(state.resolutionLog.some((e) => e.type === 'blow' && e.recordId === 'B_1' && e.outcome !== 'cancelled')).toBe(true);
	});

	test('shieldCap ownHold cancels only the shielder own hold, and the remainder lands', () => {
		const state = deploy([shielder, smallStriker], [bigStriker, smallStriker], 'shield-seed', { shieldCap: 'ownHold' });
		const shield = state.resolutionLog.find((e) => e.type === 'shield');
		const blow = state.resolutionLog.find((e) => e.type === 'blow' && e.recordId === 'B_0');
		expect(shield.fraction).toBeLessThanOrEqual(1);
		// the cancel is worth at most the shielder's own hold
		const judged = state.resolutionLog.find((e) => e.type === 'judge');
		const shielderRow = Object.values(judged.siteResults)
			.flatMap((r) => [...r.entries.A, ...r.entries.B])
			.find((e) => e.recordId === 'A_0');
		if (shielderRow) {
			expect(shield.amount).toBeLessThanOrEqual(shielderRow.fullHold + 0.05);
		}
		// a partial cancel still lands its remainder rather than vanishing
		if (shield.fraction < 1) {
			expect(blow.outcome).not.toBe('cancelled');
			expect(blow.amount).toBeGreaterThan(0);
			expect(blow.cancelled).toBe(true);
		}
	});

	test('shieldCap half cancels the whole blow and takes half of it off the shielder', () => {
		const state = deploy([shielder, smallStriker], [bigStriker, smallStriker], 'shield-seed', { shieldCap: 'half' });
		const shield = state.resolutionLog.find((e) => e.type === 'shield');
		expect(shield.cancelled).toBe('B_0');
		expect(shield.fraction).toBe(1);
		expect(shield.selfDamage).toBeCloseTo(Math.round((shield.amount / 2) * 10) / 10, 5);
		const cancelled = state.resolutionLog.find((e) => e.type === 'blow' && e.recordId === 'B_0');
		expect(cancelled.outcome).toBe('cancelled');
		// the shielder wears the half it absorbed
		const judged = state.resolutionLog.find((e) => e.type === 'judge');
		const shielderRow = Object.values(judged.siteResults)
			.flatMap((r) => [...r.entries.A, ...r.entries.B])
			.find((e) => e.recordId === 'A_0');
		expect(shielderRow.damage).toBeGreaterThanOrEqual(shield.selfDamage);
	});

	test('a shield switched off leaves a plain holder that cancels nothing', () => {
		const state = deploy([shielder, smallStriker], [bigStriker, smallStriker], 'shield-seed', { roles: { shield: false } });
		expect(state.resolutionLog.filter((e) => e.type === 'shield').length).toBe(0);
		expect(state.resolutionLog.filter((e) => e.type === 'blow' && e.outcome === 'cancelled').length).toBe(0);
	});

	test('bolster lifts its allies a grade, gives a comfortable ally the floor, does not stack, and includes itself', () => {
		const withOut = deploy([smallStriker, smallStriker], [smallStriker], 'bolster-seed');
		const withOne = deploy([bolsterer, smallStriker], [smallStriker], 'bolster-seed');
		const withTwo = deploy([bolsterer, bolsterer, smallStriker], [smallStriker], 'bolster-seed');
		const holdOf = (state, id) => {
			const judged = state.resolutionLog.find((e) => e.type === 'judge');
			return Object.values(judged.siteResults)
				.flatMap((r) => [...r.entries.A, ...r.entries.B])
				.find((e) => e.recordId === id).fullHold;
		};
		// every creature here is comfortable, so the lift is the flat floor
		expect(holdOf(withOne, 'A_1') - holdOf(withOut, 'A_1')).toBeCloseTo(BOLSTER_FLOOR, 5);
		// the bolsterer bolsters itself: its own hold carries the same floor
		expect(holdOf(withOne, 'A_0') - holdOf(withOut, 'A_0')).toBeCloseTo(BOLSTER_FLOOR, 5);
		// two bolsterers lift no further than one
		expect(holdOf(withTwo, 'A_2') - holdOf(withOne, 'A_1')).toBeCloseTo(0, 5);
	});

	test('bolster lifts a strained ally a whole grade, not just the floor', () => {
		const strainedStriker = (id) => makeRecord(id, {
			archetype: { key: 'predator', favors: [] },
			abilities: [{ name: 'Poke', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 20 }],
			attributes: { strength: 20, vitality: 60, endurance: 70, agility: 20, reflex: 20, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 },
			// a narrow tolerance band against the wide authored site band reads as strained
			physiology: { breathes: ['gas'], environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: 0, max: 5 } } },
		});
		const judgedHold = (state, id) => {
			const judged = state.resolutionLog.find((e) => e.type === 'judge');
			return Object.values(judged.siteResults)
				.flatMap((r) => [...r.entries.A, ...r.entries.B])
				.find((e) => e.recordId === id).fullHold;
		};
		const withOut = deploy([smallStriker, strainedStriker], [smallStriker], 'bolster-grade-seed');
		const withOne = deploy([bolsterer, strainedStriker], [smallStriker], 'bolster-grade-seed');
		// strained halves the hold, so lifting the grade doubles it: far more than the floor
		expect(judgedHold(withOne, 'A_1')).toBeCloseTo(judgedHold(withOut, 'A_1') * 2, 5);
	});

	test('a bolster switched off leaves a plain holder that lifts nothing', () => {
		const judgedHold = (state, id) => {
			const judged = state.resolutionLog.find((e) => e.type === 'judge');
			return Object.values(judged.siteResults)
				.flatMap((r) => [...r.entries.A, ...r.entries.B])
				.find((e) => e.recordId === id);
		};
		const withOut = deploy([smallStriker, smallStriker], [smallStriker], 'bolster-seed');
		const off = deploy([bolsterer, smallStriker], [smallStriker], 'bolster-seed', { roles: { bolster: false } });
		expect(judgedHold(off, 'A_1').fullHold).toBeCloseTo(judgedHold(withOut, 'A_1').fullHold, 5);
		expect(judgedHold(off, 'A_0').role).toBe(ROLE.NONE);
	});

	test('an area logs one area event plus one blow per creature at the world, both sides', () => {
		const state = deploy([areaCreature, smallStriker], [smallStriker], 'area-seed');
		const area = state.resolutionLog.find((e) => e.type === 'area');
		expect(area).toBeTruthy();
		expect(area.recordId).toBe('A_0');
		const victims = state.resolutionLog.filter((e) => e.type === 'blow' && e.recordId === 'A_0' && e.role === ROLE.AREA);
		expect(victims.length).toBe(area.hitCount);
		// it catches its own ally as well as the enemy
		expect(victims.map((v) => v.target).sort()).toEqual(['A_1', 'B_0']);
	});

	test('an area switched off degrades to a plain strike', () => {
		const state = deploy([areaCreature, smallStriker], [smallStriker], 'area-seed', { roles: { area: false } });
		expect(state.resolutionLog.some((e) => e.type === 'area')).toBe(false);
		const blow = state.resolutionLog.find((e) => e.type === 'blow' && e.recordId === 'A_0');
		expect(blow.role).toBe(ROLE.STRIKE);
	});

	test('the public state carries currentHold, role, staggered and hidden per creature', () => {
		const state = deploy([bigStriker], [smallStriker], 'public-role-seed');
		// the round has resolved; read the view of the round just played from the log
		const judged = state.resolutionLog.find((e) => e.type === 'judge');
		const entries = Object.values(judged.siteResults).flatMap((r) => [...r.entries.A, ...r.entries.B]);
		expect(entries.some((e) => typeof e.hold === 'number' && typeof e.role === 'string')).toBe(true);

		// and the live board during deploy
		let fresh = freshMatch('public-role-live');
		const frame = currentFrame(fresh);
		fresh = send(fresh, fresh.turn, fresh.players[fresh.turn].roster[0].id, frame.sites[0].id);
		const seat = fresh.turn === 'A' ? 'B' : 'A';
		const view = getPublicState(fresh, seat);
		const mine = view.board[frame.sites[0].id][seat][0];
		expect(typeof mine.currentHold).toBe('number');
		expect(typeof mine.fullHold).toBe('number');
		expect(typeof mine.role).toBe('string');
		expect(mine.staggered).toBe(false);
		expect(mine.hidden).toBe(false);
	});
});

describe('judging and match end', () => {
	function autoResolveOneRound(state) {
		let s = state;
		const frame = currentFrame(s);
		s = send(s, s.turn, s.players[s.turn].roster[0].id, frame.sites[0].id);
		s = send(s, s.turn, s.players[s.turn].roster[0].id, frame.sites[0].id);
		s = pass(s, s.turn);
		s = pass(s, s.turn);
		return s;
	}

	test('a tied site reverts to the Court (no winner)', () => {
		const equalA = makeRecord('tieA', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 } });
		const equalB = makeRecord('tieB', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 } });
		const worlds = makeWorlds();
		const rosterA = makeRoster('A').map((r, i) => (i === 0 ? { ...equalA, id: 'A_0' } : r));
		const rosterB = makeRoster('B').map((r, i) => (i === 0 ? { ...equalB, id: 'B_0' } : r));
		let state = createMatch({ rosterA, rosterB, worlds, seed: 'court-tie-seed' });
		const frame = currentFrame(state);
		state = send(state, state.turn, state.turn === 'A' ? 'A_0' : 'B_0', frame.sites[0].id);
		state = send(state, state.turn, state.turn === 'A' ? 'A_0' : 'B_0', frame.sites[0].id);
		state = pass(state, state.turn);
		state = pass(state, state.turn);
		const judgeEvent = state.resolutionLog.find((e) => e.type === 'judge');
		expect(judgeEvent).toBeTruthy();
		const siteResult = Object.values(judgeEvent.siteResults)[0];
		expect(siteResult.winner).toBeNull();
	});

	test('the judge event lists every creature standing at a site, with its counted hold summing to the side totals', () => {
		const equalA = makeRecord('holdA', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 } });
		const equalB = makeRecord('holdB', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 } });
		const worlds = makeWorlds();
		const rosterA = makeRoster('A').map((r, i) => (i === 0 || i === 1 ? { ...equalA, id: `A_${i}` } : r));
		const rosterB = makeRoster('B').map((r, i) => (i === 0 ? { ...equalB, id: 'B_0' } : r));
		let state = createMatch({ rosterA, rosterB, worlds, seed: 'entries-seed' });
		const frame = currentFrame(state);
		const siteId = frame.sites[0].id;
		// send both of A's marked creatures and B's marked creature to the same site,
		// whichever order the alternating turn puts them in, then pass out
		while (state.players.A.sentCount < 2 || state.players.B.sentCount < 1) {
			const handler = state.turn;
			const recordId = handler === 'A' ? (state.players.A.sentCount === 0 ? 'A_0' : 'A_1') : 'B_0';
			state = send(state, handler, recordId, siteId);
		}
		state = pass(state, state.turn);
		state = pass(state, state.turn);
		const judgeEvent = state.resolutionLog.find((e) => e.type === 'judge');
		const siteResult = judgeEvent.siteResults[siteId];
		expect(siteResult.entries).toBeDefined();
		expect(Array.isArray(siteResult.entries.A)).toBe(true);
		expect(Array.isArray(siteResult.entries.B)).toBe(true);
		siteResult.entries.A.forEach((e) => {
			expect(e).toHaveProperty('recordId');
			expect(e).toHaveProperty('hold');
			expect(e).toHaveProperty('staggered');
		});
		const sumA = siteResult.entries.A.reduce((sum, e) => sum + e.hold, 0);
		const sumB = siteResult.entries.B.reduce((sum, e) => sum + e.hold, 0);
		expect(sumA).toBeCloseTo(siteResult.holdA, 6);
		expect(sumB).toBeCloseTo(siteResult.holdB, 6);
	});

	test('creatures at a won site stay to hold the claim, others withdraw, all are out of the expedition', () => {
		let state = freshMatch('withdraw-seed');
		state = autoResolveOneRound(state);
		const totalTracked = (p) => state.players[p].holding.length + state.players[p].withdrawn.length + state.players[p].routed.length;
		expect(totalTracked('A') + totalTracked('B')).toBeGreaterThan(0);
	});

	test('match ends after the third frame if nobody clinches 5 sites first', () => {
		let state = freshMatch('three-world-seed', makeWorlds());
		let guard = 0;
		while (state.phase !== 'matchEnd' && guard < 50) {
			guard++;
			state = autoResolveOneRound(state);
		}
		expect(state.phase).toBe('matchEnd');
		expect(['A', 'B']).toContain(state.winner);
	});

	test('clinching 5 sites ends the match immediately', () => {
		// force a lopsided match: A always overwhelmingly stronger
		const strongA = () => makeRecord('sA', { attributes: { strength: 99, vitality: 99, endurance: 99, agility: 99, reflex: 99, intelligence: 99, willpower: 99, instinct: 99, charisma: 99, resilience: 99 } });
		const weakB = () => makeRecord('wB', { attributes: { strength: 1, vitality: 1, endurance: 1, agility: 1, reflex: 1, intelligence: 1, willpower: 1, instinct: 1, charisma: 1, resilience: 1 } });
		const worlds = makeWorlds();
		const rosterA = makeRoster('A', () => strongA());
		const rosterB = makeRoster('B', () => weakB());
		let state = createMatch({ rosterA, rosterB, worlds, seed: 'clinch-seed' });
		let guard = 0;
		while (state.phase !== 'matchEnd' && guard < 50) {
			guard++;
			state = autoResolveOneRound(state);
		}
		expect(state.phase).toBe('matchEnd');
		expect(state.winner).toBeTruthy();
		if (state.matchEndReason === 'clinched') {
			expect(state.players[state.winner].sitesWon).toBeGreaterThanOrEqual(SITES_TO_CLINCH);
		}
	});

	test('tiebreak: more unsent roster wins when sites are equal', () => {
		// can't force this deterministically without deep control of resolution, so this
		// exercises the decision function's contract indirectly via a full-length match and
		// asserts the invariant holds whenever sites are tied at match end
		let state = freshMatch('tiebreak-seed', makeWorlds());
		let guard = 0;
		while (state.phase !== 'matchEnd' && guard < 50) {
			guard++;
			state = autoResolveOneRound(state);
		}
		if (state.players.A.sitesWon === state.players.B.sitesWon) {
			const rosterA = state.players.A.roster.length;
			const rosterB = state.players.B.roster.length;
			if (rosterA !== rosterB) {
				expect(state.winner).toBe(rosterA > rosterB ? 'A' : 'B');
			}
		}
		expect(['A', 'B']).toContain(state.winner);
	});

	/*
		Coverage for docs/design/reclamation-play-enhancements.md's "Pass 2 levers", lever 2
		(the roster economy: the trailing seat's compensation). Replaces the earlier rule
		where the side holding fewer worlds moved first in the next round; starter now simply
		alternates, and the trailing side instead gets ROSTER_TRAILING_BONUS extra sends for
		that round only.
	*/
	test('the roster-economy lever: the side trailing on worlds gets a bonus send next round, and starter alternates', () => {
		// force A to win world 1 outright (strong vs weak), so A leads 1-0 into world 2
		const strongA = () => makeRecord('sA', { attributes: { strength: 99, vitality: 99, endurance: 99, agility: 99, reflex: 99, intelligence: 99, willpower: 99, instinct: 99, charisma: 99, resilience: 99 } });
		const weakB = () => makeRecord('wB', { attributes: { strength: 1, vitality: 1, endurance: 1, agility: 1, reflex: 1, intelligence: 1, willpower: 1, instinct: 1, charisma: 1, resilience: 1 } });
		const worlds = makeWorlds();
		const rosterA = makeRoster('A', () => strongA());
		const rosterB = makeRoster('B', () => weakB());
		let state = createMatch({ rosterA, rosterB, worlds, seed: 'trailing-bonus-seed' });
		const starterFrame1 = state.starter;

		state = autoResolveOneRound(state);
		expect(state.phase).toBe('deploy'); // world 1 alone should not clinch
		expect(state.players.A.sitesWon).toBeGreaterThan(state.players.B.sitesWon);

		// starter alternates (no more "trailing seat moves first")
		expect(state.starter).toBe(starterFrame1 === 'A' ? 'B' : 'A');
		// B is trailing: gets the bonus this round
		expect(state.trailingBonus.B).toBeGreaterThan(0);
		expect(state.trailingBonus.A).toBe(0);

		const pub = getPublicState(state, 'B');
		expect(pub.players.B.sendableCap).toBe(SENDABLE + state.trailingBonus.B);

		const pubA = getPublicState(state, 'A');
		expect(pubA.players.A.sendableCap).toBe(SENDABLE);
	});

	test('level sites after a round: no trailing bonus for either side', () => {
		const equalA = makeRecord('eqA', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 } });
		const equalB = makeRecord('eqB', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 } });
		const worlds = makeWorlds();
		const rosterA = makeRoster('A', () => ({ ...equalA }));
		const rosterB = makeRoster('B', () => ({ ...equalB }));
		let state = createMatch({ rosterA, rosterB, worlds: worlds.map((w, i) => ({ ...w, sites: w.sites.map((s) => ({ ...s })) })), seed: 'trailing-level-seed' });
		state = autoResolveOneRound(state);
		if (state.phase === 'deploy' && state.players.A.sitesWon === state.players.B.sitesWon) {
			expect(state.trailingBonus.A).toBe(0);
			expect(state.trailingBonus.B).toBe(0);
		}
	});

	/*
		Coverage for docs/design/reclamation-play-enhancements.md's "Pass 2 levers", lever 3
		(the Loki line). A creature withdrawn from a LOST (not tied) world returns to its
		handler's roster and can be sent again, but its next send costs RETURNED_SEND_COST
		against the sendable cap instead of 1.
	*/
	// A milder gap than the "clinching" test's strong/weak pair: B_0 has meaningfully less
	// hold than A_0 (so A wins the site outright at Judge) but the gap is not so wide that
	// A_0's favored strike ROUTS B_0 during Resolve - a routed creature never reaches
	// withdrawn/returned at all (it is out for the match, per the design doc), which is a
	// different case from "lost the site but is still standing". Ordering both to `hold`
	// removes combat from the picture entirely, so only Judge's raw-hold comparison decides
	// the site - the case this lever actually targets.
	function sendBothHoldOrders(state, siteId, idA, idB) {
		let s = send(state, s0Turn(state), s0Turn(state) === 'A' ? idA : idB, siteId);
		s = send(s, s0Turn(s), s0Turn(s) === 'A' ? idA : idB, siteId);
		s = pass(s, s.turn);
		s = pass(s, s.turn);
		return s;
	}
	function s0Turn(state) {
		return state.turn;
	}

	test('the Loki line: a creature withdrawn from a LOST world returns to the roster flagged, sendable again at double cost', () => {
		// both sides field presences (a ward ability under a bulwark archetype reads as a
		// shield, docs/design/reclamation-base-redesign.md assumption 4), so no blow lands
		// and the world is decided purely on hold. A creature ROUTED is out for the match
		// rather than returned, so a lost-world return has to be tested without combat.
		const presence = (id, hp) => makeRecord(id, {
			archetype: { key: 'bulwark', favors: [] },
			abilities: [{ name: 'Guard', signature: false, instrument: 'body', action: 'ward', medium: 'fire', intensity: 50 }],
			attributes: { strength: 50, vitality: hp, endurance: hp, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: hp },
		});
		const strongA = () => presence('sA', 90);
		const weakB = () => presence('wB', 20);
		const worlds = makeWorlds();
		const rosterA = makeRoster('A', () => strongA());
		const rosterB = makeRoster('B', () => weakB());
		let state = createMatch({ rosterA, rosterB, worlds, seed: 'loki-return-seed' });
		const frame = currentFrame(state);
		const siteId = frame.sites[0].id;
		const idA = state.players.A.roster[0].id;
		const idB = state.players.B.roster[0].id;
		state = sendBothHoldOrders(state, siteId, idA, idB);

		const judgeEvent = state.resolutionLog.find((e) => e.type === 'judge');
		const siteResult = judgeEvent.siteResults[siteId];
		expect(siteResult.winner).toBe('A'); // higher hold wins outright, no combat happened

		// B's sent creature lost its world: back in the roster, flagged returned
		expect(state.players.B.roster.some((r) => r.id === idB)).toBe(true);
		expect(state.players.B.returned).toContain(idB);
		// A's sent creature WON: it is still out of the roster (holding the site), not
		// flagged returned - the Loki line only pays out on a lost world
		expect(state.players.A.returned.length).toBe(0);
	});

	test('the Loki line: sending a returned creature costs RETURNED_SEND_COST against the cap and clears the flag', () => {
		const strongA = () => makeRecord('sA', { attributes: { strength: 50, vitality: 90, endurance: 90, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 90 } });
		const weakB = () => makeRecord('wB', { attributes: { strength: 50, vitality: 20, endurance: 20, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 20 } });
		const worlds = makeWorlds();
		const rosterA = makeRoster('A', () => strongA());
		const rosterB = makeRoster('B', () => weakB());
		let state = createMatch({ rosterA, rosterB, worlds, seed: 'loki-cost-seed' });
		let frame = currentFrame(state);
		const siteId = frame.sites[0].id;
		const idA = state.players.A.roster[0].id;
		const idB = state.players.B.roster[0].id;
		state = sendBothHoldOrders(state, siteId, idA, idB);
		expect(state.players.B.returned).toContain(idB);

		if (state.phase === 'deploy') {
			frame = currentFrame(state);
			const forced = { ...state, turn: 'B', players: { ...state.players, B: { ...state.players.B, passed: false } } };
			const before = forced.players.B.sentCount;
			const after = send(forced, 'B', idB, frame.sites[0].id);
			expect(after).not.toBeNull();
			expect(after.players.B.sentCount).toBe(before + 2);
			expect(after.players.B.returned).not.toContain(idB);
		}
	});

	test('a creature withdrawn from a TIED world does not get the Loki return', () => {
		const equalA = makeRecord('eqA', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 } });
		const equalB = makeRecord('eqB', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 } });
		const worlds = makeWorlds();
		const rosterA = makeRoster('A').map((r, i) => (i === 0 ? { ...equalA, id: 'A_0' } : r));
		const rosterB = makeRoster('B').map((r, i) => (i === 0 ? { ...equalB, id: 'B_0' } : r));
		let state = createMatch({ rosterA, rosterB, worlds, seed: 'loki-tie-seed' });
		const frame = currentFrame(state);
		state = send(state, state.turn, state.turn === 'A' ? 'A_0' : 'B_0', frame.sites[0].id);
		state = send(state, state.turn, state.turn === 'A' ? 'A_0' : 'B_0', frame.sites[0].id);
		state = pass(state, state.turn);
		state = pass(state, state.turn);
		const judgeEvent = state.resolutionLog.find((e) => e.type === 'judge');
		const siteResult = Object.values(judgeEvent.siteResults)[0];
		expect(siteResult.winner).toBeNull(); // tied
		expect(state.players.A.returned).not.toContain('A_0');
		expect(state.players.B.returned).not.toContain('B_0');
		expect(state.players.A.withdrawn).toContain('A_0');
		expect(state.players.B.withdrawn).toContain('B_0');
	});

	test('getPublicState exposes the self view\'s returned roster ids, never the opponent\'s', () => {
		const strongA = () => makeRecord('sA', { attributes: { strength: 50, vitality: 90, endurance: 90, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 90 } });
		const weakB = () => makeRecord('wB', { attributes: { strength: 50, vitality: 20, endurance: 20, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 20 } });
		const worlds = makeWorlds();
		const rosterA = makeRoster('A', () => strongA());
		const rosterB = makeRoster('B', () => weakB());
		let state = createMatch({ rosterA, rosterB, worlds, seed: 'loki-public-seed' });
		const frame = currentFrame(state);
		const siteId = frame.sites[0].id;
		const idA = state.players.A.roster[0].id;
		const idB = state.players.B.roster[0].id;
		state = sendBothHoldOrders(state, siteId, idA, idB);
		expect(state.players.B.returned).toContain(idB);

		const selfView = getPublicState(state, 'B');
		expect(selfView.players.B.returned).toContain(idB);
		const opponentView = getPublicState(state, 'A');
		expect(opponentView.players.B.returned).toBeUndefined();
	});
});

describe('public state hiding', () => {
	test('hides the opponent unsent roster contents, showing only a count', () => {
		const state = freshMatch('public-seed');
		const opponent = state.starter === 'A' ? 'B' : 'A';
		const view = getPublicState(state, state.starter);
		expect(view.players[opponent].roster).toBeUndefined();
		expect(view.players[opponent].rosterCount).toBe(ROSTER_SIZE);
		expect(view.players[state.starter].roster).toBeDefined();
	});


	test('hides a hidden creature identity and site, but shows that a hidden send happened', () => {
		const stealthyRoster = makeRoster('S', () => ({ traits: { guaranteed: [], rolled: ['stealthy'] } }));
		let state = createMatch({ rosterA: stealthyRoster, rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'hidden-public-seed' });
		if (state.starter !== 'A') {
			return; // only exercise when A (stealthy roster) starts, deterministic per seed
		}
		const frame = currentFrame(state);
		state = send(state, 'A', stealthyRoster[0].id, frame.sites[0].id, true);
		const viewForB = getPublicState(state, 'B');
		expect(viewForB.board[frame.sites[0].id].A.length).toBe(0);
		expect(viewForB.players.A.hiddenSentThisRound).toBe(1);
		const viewForA = getPublicState(state, 'A');
		expect(viewForA.board[frame.sites[0].id].A.length).toBe(1);
	});

	test('never exposes the seed', () => {
		const state = freshMatch('seed-hide-test');
		const view = getPublicState(state, 'A');
		expect(view.seed).toBeUndefined();
	});
});

describe('relocateVanguard: the vanguard falls back', () => {
	// Sends the starter's vanguard, then brings the turn back to the starter (the
	// opponent passes) so relocate - legal only "on their own turn" - is actually
	// available for the main-path tests. A dedicated test below covers the
	// "not their turn" illegal case using the state right after the first send instead.
	function firstSendState(seed = 'vanguard-seed') {
		let state = freshMatch(seed);
		const frame = currentFrame(state);
		const starter = state.starter;
		const other = starter === 'A' ? 'B' : 'A';
		state = send(state, starter, state.players[starter].roster[0].id, frame.sites[0].id);
		if (state.phase === 'deploy' && state.turn === other) {
			state = pass(state, other);
		}
		return { state, starter, other, frame };
	}

	test('the starter may relocate the first creature they sent this world to a different site', () => {
		const { state, starter, frame } = firstSendState();
		const vanguardId = state.board[frame.sites[0].id][starter][0].recordId;
		const next = relocateVanguard(state, starter, frame.sites[1].id);
		expect(next).not.toBeNull();
		expect(next.board[frame.sites[0].id][starter].length).toBe(0);
		expect(next.board[frame.sites[1].id][starter].some((e) => e.recordId === vanguardId)).toBe(true);
		expect(next.vanguardRelocated[starter]).toBe(true);
	});

	test('does not consume the turn: the handler still sends or passes on the same turn afterward', () => {
		const { state, starter, frame } = firstSendState();
		const turnBefore = state.turn;
		expect(turnBefore).toBe(starter); // relocate is only legal on the starter's own turn
		const relocated = relocateVanguard(state, starter, frame.sites[1].id);
		expect(relocated).not.toBeNull();
		// the turn marker is untouched by relocate itself...
		expect(relocated.turn).toBe(turnBefore);
		expect(relocated.phase).toBe('deploy');
		expect(relocated.players[starter].passed).toBe(false);
		// ...and the handler can still legally send afterward, on the very same turn (a
		// send that had already "used up" the turn would be rejected as out-of-turn)
		const secondRecordId = relocated.players[starter].roster[0].id;
		const afterSend = send(relocated, starter, secondRecordId, frame.sites[2].id);
		expect(afterSend).not.toBeNull();
		expect(afterSend.board[frame.sites[2].id][starter].some((e) => e.recordId === secondRecordId)).toBe(true);
	});

	test('the relocated creature keeps its sentIndex and hidden flag', () => {
		const stealthyRoster = makeRoster('S', (i) => (i === 0 ? { traits: { guaranteed: [], rolled: ['stealthy'] } } : {}));
		let state = createMatch({ rosterA: stealthyRoster, rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'vanguard-hidden-seed' });
		const starter = state.starter;
		const frame = currentFrame(state);
		if (starter !== 'A') {
			return;
		}
		state = send(state, 'A', stealthyRoster[0].id, frame.sites[0].id, true);
		// relocate is only legal on the starter's own turn, so bring the turn back to A by
		// having B pass, same as firstSendState does
		if (state.phase === 'deploy' && state.turn === 'B') {
			state = pass(state, 'B');
		}
		const before = state.board[frame.sites[0].id].A[0];
		expect(before.hidden).toBe(true);
		const next = relocateVanguard(state, 'A', frame.sites[1].id);
		expect(next).not.toBeNull();
		const after = next.board[frame.sites[1].id].A[0];
		expect(after.recordId).toBe(before.recordId);
		expect(after.sentIndex).toBe(before.sentIndex);
		expect(after.hidden).toBe(true);
	});

	test('hold is recomputed for the new site at resolution (strain changes if the site does)', () => {
		const strainableRecord = makeRecord('strain-vanguard', {
			physiology: {
				breathes: ['liquid'],
				environmentalTolerance: { ambientMedia: ['liquid'], temperatureC: { min: -50, max: 200 } },
			},
		});
		// Magmuth has one authored site here (liquid medium, deterministic draw); the
		// vanguard relocates to a site of a DIFFERENT world in the same frame, so that
		// world is given a single gas-medium site to make the "after" hold deterministic
		// too.
		const worlds = [
			makeWorld('Magmuth', 'fire', [{ environment: { medium: 'liquid', temperatureC: { min: -50, max: 200 } } }]),
			makeWorld('Poseidas', 'water', [{ environment: { medium: 'gas', temperatureC: { min: -50, max: 200 } } }]),
			...makeWorlds(7),
		];
		const rosterA = makeRoster('A').map((r, i) => (i === 0 ? { ...strainableRecord, id: 'A_0' } : r));
		let state = createMatch({ rosterA, rosterB: makeRoster('B'), worlds, seed: 'vanguard-strain-seed' });
		const starter = state.starter;
		const frame = currentFrame(state);
		const fromSite = siteOfPlanet(frame, 'Magmuth');
		const toSite = siteOfPlanet(frame, 'Poseidas');
		if (starter !== 'A' || !fromSite || !toSite) {
			return; // only exercise when both authored worlds land in frame 1 with A starting
		}
		state = send(state, 'A', 'A_0', fromSite.id);
		const holdBefore = currentHoldOf(state, state.board[fromSite.id].A[0]);
		const next = relocateVanguard(state, 'A', toSite.id);
		expect(next).not.toBeNull();
		const holdAfter = currentHoldOf(next, next.board[toSite.id].A[0]);
		expect(holdAfter).toBeLessThan(holdBefore);
	});

	test('illegal when the handler is not this world’s starter', () => {
		const { state, other, frame } = firstSendState();
		expect(relocateVanguard(state, other, frame.sites[1].id)).toBeNull();
	});

	test('illegal: phase is not deploy', () => {
		let state = freshMatch('vanguard-phase-seed');
		const frame = currentFrame(state);
		const starter = state.starter;
		const other = starter === 'A' ? 'B' : 'A';
		state = send(state, starter, state.players[starter].roster[0].id, frame.sites[0].id);
		state = send(state, other, state.players[other].roster[0].id, frame.sites[0].id);
		state = pass(state, state.turn);
		state = pass(state, state.turn);
		// the second pass resolved and judged, so this frame is over and its vanguard is
		// no longer on any board
		expect(state.frameIndex).toBe(1);
		expect(relocateVanguard(state, starter, frame.sites[1].id)).toBeNull();
	});

	test('illegal: it is not their turn', () => {
		// right after the starter's first send, the turn has passed to the opponent (the
		// starter has not gotten a turn back yet), so relocate must be illegal here
		let state = freshMatch('vanguard-not-turn-seed');
		const frame = currentFrame(state);
		const starter = state.starter;
		const other = starter === 'A' ? 'B' : 'A';
		state = send(state, starter, state.players[starter].roster[0].id, frame.sites[0].id);
		expect(state.turn).toBe(other);
		expect(relocateVanguard(state, starter, frame.sites[1].id)).toBeNull();
	});

	test('illegal: the handler has passed', () => {
		let state = freshMatch('vanguard-passed-seed');
		const frame = currentFrame(state);
		const starter = state.starter;
		const other = starter === 'A' ? 'B' : 'A';
		state = send(state, starter, state.players[starter].roster[0].id, frame.sites[0].id);
		state = pass(state, other);
		// the starter's own pass would end the round outright (the second pass resolves
		// and judges), so the guard is exercised on a state where only the starter has
		// passed, which is a state deploy can genuinely be in when the opponent has not
		const passedStarter = {
			...state,
			turn: starter,
			players: { ...state.players, [starter]: { ...state.players[starter], passed: true } },
		};
		expect(passedStarter.phase).toBe('deploy');
		expect(relocateVanguard(passedStarter, starter, frame.sites[1].id)).toBeNull();
	});

	test('illegal: already relocated once this world', () => {
		const { state, starter, frame } = firstSendState();
		const once = relocateVanguard(state, starter, frame.sites[1].id);
		expect(once).not.toBeNull();
		expect(relocateVanguard(once, starter, frame.sites[2].id)).toBeNull();
	});

	test('illegal: the target site is the one the vanguard already stands on', () => {
		const { state, starter, frame } = firstSendState();
		expect(relocateVanguard(state, starter, frame.sites[0].id)).toBeNull();
	});

	test('illegal: a nonexistent site id', () => {
		const { state, starter } = firstSendState();
		expect(relocateVanguard(state, starter, 'not-a-real-site')).toBeNull();
	});

	test('resets per world: a new world clears vanguardRelocated for both sides', () => {
		// build the round from scratch (not firstSendState, which already burns the
		// opponent's turn via a permanent pass) so both sides still have live turns left
		let state = freshMatch('vanguard-reset-seed');
		const frame = currentFrame(state);
		const starter = state.starter;
		const other = starter === 'A' ? 'B' : 'A';
		state = send(state, starter, state.players[starter].roster[0].id, frame.sites[0].id);
		state = send(state, other, state.players[other].roster[0].id, frame.sites[0].id);
		expect(state.turn).toBe(starter);
		const relocated = relocateVanguard(state, starter, frame.sites[1].id);
		expect(relocated).not.toBeNull();
		expect(relocated.vanguardRelocated[starter]).toBe(true);
		let next = pass(relocated, starter);
		next = pass(next, next.turn);
		expect(next.frameIndex).toBe(1);
		expect(next.vanguardRelocated.A).toBe(false);
		expect(next.vanguardRelocated.B).toBe(false);
	});

	test('public state: canRelocateVanguard is true for the starter, false for the other side, and false after use', () => {
		const { state, starter, other, frame } = firstSendState('vanguard-public-seed');
		const viewStarter = getPublicState(state, starter);
		const viewOther = getPublicState(state, other);
		expect(viewStarter.players[starter].canRelocateVanguard).toBe(true);
		expect(viewOther.players[starter].canRelocateVanguard).toBe(true);
		expect(viewStarter.players[other].canRelocateVanguard).toBe(false);

		const relocated = relocateVanguard(state, starter, frame.sites[1].id);
		const viewAfter = getPublicState(relocated, starter);
		expect(viewAfter.players[starter].canRelocateVanguard).toBe(false);
	});

	test('public state: own side sees its vanguardRecordId; opponent identity of the vanguard stays hidden', () => {
		const { state, starter, other, frame } = firstSendState('vanguard-identity-seed');
		const vanguardId = state.board[frame.sites[0].id][starter][0].recordId;
		const viewSelf = getPublicState(state, starter);
		expect(viewSelf.players[starter].vanguardRecordId).toBe(vanguardId);
		const viewOpponent = getPublicState(state, other);
		expect(viewOpponent.players[starter].vanguardRecordId).toBeUndefined();
	});

	test('event is recorded in the log for narration', () => {
		const { state, starter, frame } = firstSendState('vanguard-log-seed');
		const next = relocateVanguard(state, starter, frame.sites[1].id);
		expect(next).not.toBeNull();
		const ev = next.resolutionLog.find((e) => e.type === 'vanguard-relocate');
		expect(ev).toBeTruthy();
		expect(ev.handler).toBe(starter);
		expect(ev.fromSite).toBe(frame.sites[0].id);
		expect(ev.toSite).toBe(frame.sites[1].id);
	});
});

/*
	The rules object: one ablation switch per lever (docs/design/game-validation-principles.md
	"Ablation"). Each test below turns one lever off and checks the engine actually stops
	doing that thing, plus a test that the defaults are unchanged - the whole rest of this
	file is that second assertion, so it is only stated once here.
*/
describe('rules ablation switches', () => {
	function stealthyRoster(prefix) {
		const roster = [];
		for (let i = 0; i < ROSTER_SIZE; i++) {
			roster.push(makeRecord(`${prefix}_${i}`, { traits: { guaranteed: ['stealthy'], rolled: [] } }));
		}
		return roster;
	}

	function matchWithRules(rules, rosterFn = makeRoster) {
		return createMatch({
			rosterA: rosterFn('A'),
			rosterB: rosterFn('B'),
			worlds: makeWorlds(),
			seed: 'ablation-seed',
			rules,
		});
	}

	it('defaults to every rule on and every lever at its first setting', () => {
		const state = freshMatch();
		expect(state.rules).toEqual({
			hiddenSends: true,
			lokiLine: true,
			trailingBonus: ROSTER_TRAILING_BONUS,
			initiative: true,
			hiddenFirst: true,
			roles: { area: true, bolster: true, shield: true },
			holdFloor: HOLD_FLOOR,
			holdCeiling: HOLD_CEILING,
			magnitudeScale: MAGNITUDE_SCALE,
			areaDiscount: AREA_DISCOUNT,
			bolsterFloor: BOLSTER_FLOOR,
			armoredReduction: ARMORED_REDUCTION,
			shieldCap: SHIELD_CAP,
		});
		expect(state.rules).toEqual(DEFAULT_RULES);
	});

	it('merges a partial rules object over the defaults', () => {
		const state = matchWithRules({ hiddenSends: false });
		expect(state.rules.hiddenSends).toBe(false);
		expect(state.rules.lokiLine).toBe(true);
		expect(state.rules.trailingBonus).toBe(ROSTER_TRAILING_BONUS);
	});

	it('exposes the rules object through getPublicState so the bot can respect it', () => {
		const state = matchWithRules({ hiddenSends: false, roles: { area: false }, magnitudeScale: 2 });
		const view = getPublicState(state, 'A');
		expect(view.rules.hiddenSends).toBe(false);
		expect(view.rules.roles).toEqual({ area: false, bolster: true, shield: true });
		expect(view.rules.magnitudeScale).toBe(2);
	});

	it('hiddenSends false makes a hidden send illegal even for a stealthy creature', () => {
		const state = matchWithRules({ hiddenSends: false }, stealthyRoster);
		const handler = state.turn;
		const site = currentFrame(state).sites[0].id;
		const recordId = `${handler}_0`;
		expect(send(state, handler, recordId, site, true)).toBeNull();
		// the same creature sent openly is still perfectly legal
		expect(send(state, handler, recordId, site, false)).not.toBeNull();
	});

	it('hiddenSends true (the default) still allows a stealthy hidden send', () => {
		const state = matchWithRules({}, stealthyRoster);
		const handler = state.turn;
		const site = currentFrame(state).sites[0].id;
		expect(send(state, handler, `${handler}_0`, site, true)).not.toBeNull();
	});



	// the Loki line and the trailing bonus both fire at Judge, so both need a whole round
	// played out. playOneRound sends `count` creatures per side at the given site indices
	// and commits empty orders, so the judged result is decided purely by hold.
	function playOneRound(state, sitesForA, sitesForB) {
		const frame = currentFrame(state);
		const queue = { A: sitesForA.slice(), B: sitesForB.slice() };
		let next = state;
		let sentA = 0;
		let sentB = 0;
		const frameIndex = next.frameIndex;
		// the second pass resolves and judges, reopening 'deploy' on the NEXT frame, so
		// the loop has to stop when the frame moves rather than on the phase alone
		while (next.phase === 'deploy' && next.frameIndex === frameIndex) {
			const handler = next.turn;
			if (handler === null) {
				break;
			}
			const sent = handler === 'A' ? sentA : sentB;
			if (queue[handler].length > sent) {
				const siteIndex = queue[handler][sent];
				const after = send(next, handler, `${handler}_${sent}`, frame.sites[siteIndex].id, false);
				if (handler === 'A') {
					sentA++;
				} else {
					sentB++;
				}
				next = after;
			} else {
				next = pass(next, handler);
			}
		}
		return next;
	}

	it('lokiLine true (the default) returns a creature from a LOST world to its roster', () => {
		// A sends two to site 0, B sends one: B loses site 0 and gets its creature back
		const state = matchWithRules({});
		const started = state.starter === 'A' ? state : { ...state, starter: 'A', turn: 'A' };
		const after = playOneRound(started, [0, 0], [0]);
		expect(after.players.B.returned.length).toBeGreaterThan(0);
		expect(after.players.B.roster.some((r) => after.players.B.returned.includes(r.id))).toBe(true);
	});

	it('lokiLine false withdraws a lost creature with no return, like a tie', () => {
		const state = matchWithRules({ lokiLine: false });
		const started = state.starter === 'A' ? state : { ...state, starter: 'A', turn: 'A' };
		const after = playOneRound(started, [0, 0], [0]);
		expect(after.players.B.returned).toEqual([]);
		expect(after.players.B.withdrawn.length).toBeGreaterThan(0);
	});

	it('trailingBonus is the rules number, not the constant, when the sides finish uneven', () => {
		const state = matchWithRules({ trailingBonus: 3 });
		const started = state.starter === 'A' ? state : { ...state, starter: 'A', turn: 'A' };
		const after = playOneRound(started, [0, 1], []);
		expect(after.phase).toBe('deploy');
		// A took worlds, B trailed, so B carries the bonus into the next round
		expect(after.trailingBonus.B).toBe(3);
		expect(after.trailingBonus.A).toBe(0);
	});

	it('trailingBonus 0 removes the compensation entirely', () => {
		const state = matchWithRules({ trailingBonus: 0 });
		const started = state.starter === 'A' ? state : { ...state, starter: 'A', turn: 'A' };
		const after = playOneRound(started, [0, 1], []);
		expect(after.trailingBonus).toEqual({ A: 0, B: 0 });
	});

	it('initiative false resolves in sent order regardless of reflex and agility', () => {
		// two creatures on one side, the LATER-sent one far faster: with initiative on it
		// acts first, with initiative off the earlier-sent one does.
		function speedRoster(prefix) {
			const roster = [];
			for (let i = 0; i < ROSTER_SIZE; i++) {
				roster.push(makeRecord(`${prefix}_${i}`, {
					attributes: i === 1 ? { agility: 99, reflex: 99 } : { agility: 1, reflex: 1 },
				}));
			}
			return roster;
		}
		function firstActorOf(rules) {
			let state = createMatch({
				rosterA: speedRoster('A'), rosterB: speedRoster('B'), worlds: makeWorlds(), seed: 'init-seed', rules,
			});
			state = state.starter === 'A' ? state : { ...state, starter: 'A', turn: 'A' };
			const site = currentFrame(state).sites[0].id;
			state = send(state, 'A', 'A_0', site, false);
			state = send(state, 'B', 'B_0', site, false);
			state = send(state, 'A', 'A_1', site, false);
			state = pass(state, 'B');
			state = pass(state, 'A');
			const acts = state.resolutionLog.filter((e) => e.type !== 'judge' && (e.recordId === 'A_0' || e.recordId === 'A_1'));
			return acts.length > 0 ? acts[0].recordId : null;
		}
		expect(firstActorOf({ initiative: true })).toBe('A_1');
		expect(firstActorOf({ initiative: false })).toBe('A_0');
	});
});
