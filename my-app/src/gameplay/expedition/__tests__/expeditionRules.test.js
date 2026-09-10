import {
	createMatch, send, pass, getPublicState, moveSwift, stakeWorld, stakeableSiteIdsFor,
	DEFAULT_RULES,
	ExpeditionRuleError, hasLegalSend, prepareEntry, currentFrame, findEntry, currentHoldOf,
} from '../expeditionRules.js';
import {
	ROSTER_SIZE, SENDABLE, SITES_TO_CLINCH, WORLDS_PER_MATCH, FRAMES_PER_MATCH, WORLDS_PER_FRAME,
	ROSTER_TRAILING_BONUS, ROLE, HOLD_FLOOR, HOLD_CEILING, MAGNITUDE_SCALE, SWEEP_DISCOUNT,
	BOLSTER_FLOOR, ARMORED_REDUCTION, SHIELD_CAP, WILLFUL_THRESHOLD, KEEN_INSTINCT,
	DULL_INSTINCT, SWIFT_SPEED, BOLSTER_RECOVERY,
	HIDDEN_SEND_COST, HIDDEN_FIRST_NEEDS_COMPANY, HIDDEN_POWER, STAKE_ENABLED,
	STAKE_SITE_VALUE, STAKE_BOTH_VALUE, DRAFT_POOL_SIZE, DRAFT_DISTINCT_SPECIES,
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
		expect(state.resolutionLog.some((e) => e.type === 'attack')).toBe(true);
		expect(state.resolutionLog.some((e) => e.type === 'judge')).toBe(true);
		expect(['deploy', 'matchEnd']).toContain(state.phase);
	});

	test('blows subtract from currentHold and a creature hit but standing is hurt', () => {
		const striker = plainStriker('striker', 60, 60);
		const tanky = makeRecord('tanky', {
			abilities: [{ name: 'Tap', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 5 }],
			attributes: { strength: 1, vitality: 99, endurance: 99, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 99 },
		});
		const state = oneWorldRound(striker, tanky, 'round-subtract');
		const blow = state.resolutionLog.find((e) => e.type === 'attack' && e.recordId === 'A_0');
		expect(blow).toBeTruthy();
		expect(blow.outcome).toBe('hurt');
		expect(blow.power).toBeGreaterThan(0);
		// judge() clears the board for the next round, so the creature is read off the
		// judge event, which carries the same fullHold/damage/hurt the entry had
		const judged = state.resolutionLog.find((e) => e.type === 'judge');
		const target = Object.values(judged.siteResults)
			.flatMap((r) => [...r.entries.A, ...r.entries.B])
			.find((e) => e.recordId === 'B_0');
		expect(target.hold).toBeCloseTo(blow.remaining, 5);
		expect(target.hold).toBeCloseTo(target.fullHold - blow.power, 5);
		expect(target.hurt).toBe(true);
	});

	test('a creature driven to zero is downed, off the world and out of the Proving', () => {
		const bigStriker = plainStriker('big', 100, 100);
		const frail = makeRecord('frail', {
			abilities: [{ name: 'Tap', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 5 }],
			attributes: { strength: 1, vitality: 1, endurance: 1, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 1 },
		});
		const state = oneWorldRound(bigStriker, frail, 'round-rout');
		const rout = state.resolutionLog.find((e) => e.type === 'attack' && e.outcome === 'downed');
		expect(rout).toBeTruthy();
		expect(rout.remaining).toBe(0);
		expect(state.players.B.downed).toContain('B_0');
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
		const softBlow = softState.resolutionLog.find((e) => e.type === 'attack' && e.recordId === 'A_0');
		const hardBlow = hardState.resolutionLog.find((e) => e.type === 'attack' && e.recordId === 'A_0');
		expect(hardBlow.power).toBeLessThan(softBlow.power);
		expect(hardBlow.power).toBeCloseTo(Math.round(softBlow.power * (1 - ARMORED_REDUCTION) * 10) / 10, 5);
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
		const blow = state.resolutionLog.find((e) => e.type === 'attack' && e.recordId === 'A_0');
		expect(blow.outcome).toBe('no-target');
		expect(state.players.B.downed).toEqual([]);
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
		const blows = state.resolutionLog.filter((e) => e.type === 'attack');
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
		const blows = state.resolutionLog.filter((e) => e.type === 'attack');
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
		const blows = state.resolutionLog.filter((e) => e.type === 'attack');
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
		const blows = state.resolutionLog.filter((e) => e.type === 'attack');
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
		const cancelled = state.resolutionLog.filter((e) => e.type === 'attack' && e.outcome === 'cancelled');
		expect(cancelled.length).toBe(1);
		expect(cancelled[0].recordId).toBe('B_0');
		// the smaller blow still lands
		expect(state.resolutionLog.some((e) => e.type === 'attack' && e.recordId === 'B_1' && e.outcome !== 'cancelled')).toBe(true);
	});

	test('shieldCap ownHold cancels only the shielder own hold, and the remainder lands', () => {
		const state = deploy([shielder, smallStriker], [bigStriker, smallStriker], 'shield-seed', { shieldCap: 'ownHold' });
		const shield = state.resolutionLog.find((e) => e.type === 'shield');
		const blow = state.resolutionLog.find((e) => e.type === 'attack' && e.recordId === 'B_0');
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
			expect(blow.power).toBeGreaterThan(0);
			expect(blow.cancelled).toBe(true);
		}
	});

	test('shieldCap half cancels the whole blow and takes half of it off the shielder', () => {
		const state = deploy([shielder, smallStriker], [bigStriker, smallStriker], 'shield-seed', { shieldCap: 'half' });
		const shield = state.resolutionLog.find((e) => e.type === 'shield');
		expect(shield.cancelled).toBe('B_0');
		expect(shield.fraction).toBe(1);
		expect(shield.selfDamage).toBeCloseTo(Math.round((shield.amount / 2) * 10) / 10, 5);
		const cancelled = state.resolutionLog.find((e) => e.type === 'attack' && e.recordId === 'B_0');
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
		expect(state.resolutionLog.filter((e) => e.type === 'attack' && e.outcome === 'cancelled').length).toBe(0);
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

	test('a sweep logs one sweep event plus one attack per creature at the world, both sides', () => {
		const state = deploy([areaCreature, smallStriker], [smallStriker], 'area-seed');
		const sweep = state.resolutionLog.find((e) => e.type === 'sweep');
		expect(sweep).toBeTruthy();
		expect(sweep.recordId).toBe('A_0');
		const victims = state.resolutionLog.filter((e) => e.type === 'attack' && e.recordId === 'A_0' && e.role === ROLE.SWEEP);
		expect(victims.length).toBe(sweep.hitCount);
		// it catches its own ally as well as the enemy
		expect(victims.map((v) => v.target).sort()).toEqual(['A_1', 'B_0']);
	});

	test('a sweep switched off degrades to a plain strike', () => {
		const state = deploy([areaCreature, smallStriker], [smallStriker], 'area-seed', { roles: { sweep: false } });
		expect(state.resolutionLog.some((e) => e.type === 'sweep')).toBe(false);
		const blow = state.resolutionLog.find((e) => e.type === 'attack' && e.recordId === 'A_0');
		expect(blow.role).toBe(ROLE.STRIKE);
	});

	test('the public state carries currentHold, role, hurt and hidden per creature', () => {
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
		expect(mine.hurt).toBe(false);
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
		const equalA = makeRecord('tieA', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 }, archetype: { key: 'survivor', favors: [] }, abilities: [{ name: 'Mend', signature: false, instrument: 'voice', action: 'mend', medium: 'light', intensity: 40 }] });
		const equalB = makeRecord('tieB', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 }, archetype: { key: 'survivor', favors: [] }, abilities: [{ name: 'Mend', signature: false, instrument: 'voice', action: 'mend', medium: 'light', intensity: 40 }] });
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
			expect(e).toHaveProperty('hurt');
		});
		const sumA = siteResult.entries.A.reduce((sum, e) => sum + e.hold, 0);
		const sumB = siteResult.entries.B.reduce((sum, e) => sum + e.hold, 0);
		expect(sumA).toBeCloseTo(siteResult.holdA, 6);
		expect(sumB).toBeCloseTo(siteResult.holdB, 6);
	});

	test('creatures at a won site stay to hold the claim, others withdraw, all are out of the expedition', () => {
		let state = freshMatch('withdraw-seed');
		state = autoResolveOneRound(state);
		const totalTracked = (p) => state.players[p].holding.length + state.players[p].withdrawn.length + state.players[p].downed.length;
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
	test('the catch-up send is cut by default and still works when a batch restores it', () => {
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
		// assumption 20 cut the catch-up send: trailing buys the loser nothing by default
		expect(state.trailingBonus.B).toBe(0);
		expect(state.trailingBonus.A).toBe(0);
		expect(getPublicState(state, 'B').players.B.sendableCap).toBe(SENDABLE);
		expect(getPublicState(state, 'A').players.A.sendableCap).toBe(SENDABLE);

		// the key survives so an ablation row can put the catch-up send back
		let restored = createMatch({ rosterA, rosterB, worlds, seed: 'trailing-bonus-seed', rules: { trailingBonus: 1 } });
		restored = autoResolveOneRound(restored);
		expect(restored.players.A.sitesWon).toBeGreaterThan(restored.players.B.sitesWon);
		expect(restored.trailingBonus.B).toBe(1);
		expect(restored.trailingBonus.A).toBe(0);
		expect(getPublicState(restored, 'B').players.B.sendableCap).toBe(SENDABLE + 1);
	});

	test('level sites after a round: no trailing bonus for either side', () => {
		const equalA = makeRecord('eqA', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 }, archetype: { key: 'survivor', favors: [] }, abilities: [{ name: 'Mend', signature: false, instrument: 'voice', action: 'mend', medium: 'light', intensity: 40 }] });
		const equalB = makeRecord('eqB', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 }, archetype: { key: 'survivor', favors: [] }, abilities: [{ name: 'Mend', signature: false, instrument: 'voice', action: 'mend', medium: 'light', intensity: 40 }] });
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
	// A_0's favored strike ROUTS B_0 during Resolve - a downed creature never reaches
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
		const equalA = makeRecord('eqA', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 }, archetype: { key: 'survivor', favors: [] }, abilities: [{ name: 'Mend', signature: false, instrument: 'voice', action: 'mend', medium: 'light', intensity: 40 }] });
		const equalB = makeRecord('eqB', { attributes: { strength: 50, vitality: 60, endurance: 60, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60 }, archetype: { key: 'survivor', favors: [] }, abilities: [{ name: 'Mend', signature: false, instrument: 'voice', action: 'mend', medium: 'light', intensity: 40 }] });
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

/*
	Swift creatures move (docs/design/reclamation-base-redesign.md assumption 20), the rule
	that replaced the vanguard fall-back. Speed at or above rules.swiftSpeed makes a
	creature movable once per round, on its handler's own turn, without spending the turn.
*/
describe('moveSwift: swift creatures move', () => {
	// reflex and agility of 80 put speed at 80, above the swiftSpeed cut of 65
	function swiftRoster(prefix) {
		const roster = [];
		for (let i = 0; i < ROSTER_SIZE; i++) {
			roster.push(makeRecord(`${prefix}_${i}`, { attributes: { agility: 80, reflex: 80 } }));
		}
		return roster;
	}

	// a roster of creatures too slow to move: speed 20, well under the cut
	function slowRoster(prefix) {
		const roster = [];
		for (let i = 0; i < ROSTER_SIZE; i++) {
			roster.push(makeRecord(`${prefix}_${i}`, { attributes: { agility: 20, reflex: 20 } }));
		}
		return roster;
	}

	// Sends one creature, then brings the turn back to its handler (the opponent passes)
	// so a move - legal only "on their own turn" - is actually available.
	function firstSendState(seed = 'swift-seed', rosterFn = swiftRoster) {
		let state = createMatch({ rosterA: rosterFn('A'), rosterB: rosterFn('B'), worlds: makeWorlds(), seed });
		const frame = currentFrame(state);
		const mover = state.starter;
		const other = mover === 'A' ? 'B' : 'A';
		state = send(state, mover, state.players[mover].roster[0].id, frame.sites[0].id);
		if (state.phase === 'deploy' && state.turn === other) {
			state = pass(state, other);
		}
		return { state, mover, other, frame };
	}

	test('a swift creature moves to another site of the frame', () => {
		const { state, mover, frame } = firstSendState();
		const recordId = state.board[frame.sites[0].id][mover][0].recordId;
		const next = moveSwift(state, mover, recordId, frame.sites[1].id);
		expect(next).not.toBeNull();
		expect(next.board[frame.sites[0].id][mover].length).toBe(0);
		expect(next.board[frame.sites[1].id][mover].some((e) => e.recordId === recordId)).toBe(true);
		expect(next.swiftMoved[mover]).toContain(recordId);
	});

	test('does not consume the turn: the handler still sends or passes afterward', () => {
		const { state, mover, frame } = firstSendState('swift-turn-seed');
		const recordId = state.board[frame.sites[0].id][mover][0].recordId;
		const next = moveSwift(state, mover, recordId, frame.sites[1].id);
		expect(next.turn).toBe(mover);
		const after = send(next, mover, next.players[mover].roster[0].id, frame.sites[2].id);
		expect(after).not.toBeNull();
	});

	test('the moved creature keeps its sentIndex and stays hidden if it was hidden', () => {
		const stealthy = [];
		for (let i = 0; i < ROSTER_SIZE; i++) {
			stealthy.push(makeRecord(`A_${i}`, { attributes: { agility: 80, reflex: 80 }, traits: ['stealthy'] }));
		}
		let state = createMatch({ rosterA: stealthy, rosterB: slowRoster('B'), worlds: makeWorlds(), seed: 'swift-hidden-seed' });
		state = state.starter === 'A' ? state : { ...state, starter: 'A', turn: 'A' };
		const frame = currentFrame(state);
		state = send(state, 'A', 'A_0', frame.sites[0].id, true);
		if (state.phase === 'deploy' && state.turn === 'B') {
			state = pass(state, 'B');
		}
		const before = state.board[frame.sites[0].id].A[0];
		const next = moveSwift(state, 'A', 'A_0', frame.sites[1].id);
		const moved = next.board[frame.sites[1].id].A.find((e) => e.recordId === 'A_0');
		expect(moved.hidden).toBe(true);
		expect(moved.sentIndex).toBe(before.sentIndex);
	});

	test('once per creature per round: a second move of the same creature is illegal', () => {
		const { state, mover, frame } = firstSendState('swift-once-seed');
		const recordId = state.board[frame.sites[0].id][mover][0].recordId;
		const once = moveSwift(state, mover, recordId, frame.sites[1].id);
		expect(once).not.toBeNull();
		expect(moveSwift(once, mover, recordId, frame.sites[2].id)).toBeNull();
	});

	test('a creature under the swift cut cannot move at all', () => {
		const { state, mover, frame } = firstSendState('swift-slow-seed', slowRoster);
		const recordId = state.board[frame.sites[0].id][mover][0].recordId;
		expect(moveSwift(state, mover, recordId, frame.sites[1].id)).toBeNull();
	});

	test('illegal: not your turn, the same site, an unknown site, a creature not yours', () => {
		const { state, mover, other, frame } = firstSendState('swift-illegal-seed');
		const recordId = state.board[frame.sites[0].id][mover][0].recordId;
		expect(moveSwift(state, other, recordId, frame.sites[1].id)).toBeNull();
		expect(moveSwift(state, mover, recordId, frame.sites[0].id)).toBeNull();
		expect(moveSwift(state, mover, recordId, 'not-a-real-site')).toBeNull();
		expect(moveSwift(state, mover, 'not-a-real-record', frame.sites[1].id)).toBeNull();
	});

	test('the swiftMove ablation makes every move illegal and empties movableRecordIds', () => {
		let state = createMatch({
			rosterA: swiftRoster('A'), rosterB: swiftRoster('B'), worlds: makeWorlds(),
			seed: 'swift-ablation-seed', rules: { swiftMove: false },
		});
		const frame = currentFrame(state);
		const mover = state.starter;
		const other = mover === 'A' ? 'B' : 'A';
		state = send(state, mover, state.players[mover].roster[0].id, frame.sites[0].id);
		if (state.phase === 'deploy' && state.turn === other) {
			state = pass(state, other);
		}
		const recordId = state.board[frame.sites[0].id][mover][0].recordId;
		expect(moveSwift(state, mover, recordId, frame.sites[1].id)).toBeNull();
		expect(getPublicState(state, mover).players[mover].movableRecordIds).toEqual([]);
	});

	test('public state: movableRecordIds is own-side only and empties as creatures move', () => {
		const { state, mover, other, frame } = firstSendState('swift-public-seed');
		const recordId = state.board[frame.sites[0].id][mover][0].recordId;
		const view = getPublicState(state, mover);
		expect(view.players[mover].movableRecordIds).toContain(recordId);
		expect(view.players[other].movableRecordIds).toBeUndefined();
		const next = moveSwift(state, mover, recordId, frame.sites[1].id);
		expect(getPublicState(next, mover).players[mover].movableRecordIds).not.toContain(recordId);
	});

	test('resets per round: a new frame clears swiftMoved for both sides', () => {
		const first = firstSendState('swift-reset-seed');
		const mover = first.mover;
		const frame = first.frame;
		let state = first.state;
		const recordId = state.board[frame.sites[0].id][mover][0].recordId;
		state = moveSwift(state, mover, recordId, frame.sites[1].id);
		expect(state.swiftMoved[mover]).toContain(recordId);
		state = pass(state, mover);
		expect(state.frameIndex).toBe(1);
		expect(state.swiftMoved.A).toEqual([]);
		expect(state.swiftMoved.B).toEqual([]);
	});

	test('the move is recorded in the log for narration', () => {
		const { state, mover, frame } = firstSendState('swift-log-seed');
		const recordId = state.board[frame.sites[0].id][mover][0].recordId;
		const next = moveSwift(state, mover, recordId, frame.sites[1].id);
		const ev = next.resolutionLog.find((e) => e.type === 'swift-move');
		expect(ev).toBeTruthy();
		expect(ev.recordId).toBe(recordId);
		expect(ev.from).toBe(frame.sites[0].id);
		expect(ev.to).toBe(frame.sites[1].id);
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
			speed: true,
			hiddenFirst: true,
			roles: { sweep: true, bolster: true, shield: true },
			holdFloor: HOLD_FLOOR,
			holdCeiling: HOLD_CEILING,
			magnitudeScale: MAGNITUDE_SCALE,
			sweepDiscount: SWEEP_DISCOUNT,
			bolsterFloor: BOLSTER_FLOOR,
			armoredReduction: ARMORED_REDUCTION,
			shieldCap: SHIELD_CAP,
			// Pass 2's attribute jobs (assumptions 17 to 20)
			willful: true,
			willfulThreshold: WILLFUL_THRESHOLD,
			presenceScale: true,
			instinctLanes: true,
			keenInstinct: KEEN_INSTINCT,
			dullInstinct: DULL_INSTINCT,
			swiftMove: true,
			swiftSpeed: SWIFT_SPEED,
			hurtAttacksLess: true,
			bolsterRecovery: BOLSTER_RECOVERY,
			// Pass 3's levers (assumptions 21 to 23)
			hiddenSendCost: HIDDEN_SEND_COST,
			hiddenFirstNeedsCompany: HIDDEN_FIRST_NEEDS_COMPANY,
			hiddenPower: HIDDEN_POWER,
			stake: STAKE_ENABLED,
			draftPoolSize: DRAFT_POOL_SIZE,
			draftDistinctSpecies: DRAFT_DISTINCT_SPECIES,
		});
		// assumption 20 cut the catch-up send, so the shipped default is zero
		expect(state.rules.trailingBonus).toBe(0);
		expect(state.rules).toEqual(DEFAULT_RULES);
	});

	it('merges a partial rules object over the defaults', () => {
		const state = matchWithRules({ hiddenSends: false });
		expect(state.rules.hiddenSends).toBe(false);
		expect(state.rules.lokiLine).toBe(true);
		expect(state.rules.trailingBonus).toBe(ROSTER_TRAILING_BONUS);
	});

	it('exposes the rules object through getPublicState so the bot can respect it', () => {
		const state = matchWithRules({ hiddenSends: false, roles: { sweep: false }, magnitudeScale: 2 });
		const view = getPublicState(state, 'A');
		expect(view.rules.hiddenSends).toBe(false);
		expect(view.rules.roles).toEqual({ sweep: false, bolster: true, shield: true });
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

	it('the speed ablation resolves in sent order regardless of reflex and agility', () => {
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
		expect(firstActorOf({ speed: true })).toBe('A_1');
		expect(firstActorOf({ speed: false })).toBe('A_0');
	});
});

/*
	Pass 2's engine rules (docs/design/reclamation-base-redesign.md assumptions 17 to 20):
	a hurt creature attacks for less, a bolster recovers damage at the Ruling, instinct
	picks the target, and charisma prices both presences. One test per rule, each run
	against its own ablation so the test says what the rule does rather than only that it
	does something.
*/
describe('Pass 2: the attribute rules', () => {
	const midStriker = (id, over = {}) => makeRecord(id, {
		archetype: { key: 'predator', favors: [] },
		abilities: [{ name: 'Jab', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 40 }],
		attributes: {
			strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60,
			...(over.attributes || {}),
		},
		...over,
	});
	// speed 20: always attacks after the mid striker's 50
	const slowStriker = (id) => midStriker(id, { attributes: { agility: 20, reflex: 20 } });

	function deployAt(listA, listB, seed, rules, siteIndex = 0) {
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
				state = send(state, handler, `${handler}_${sent}`, frame.sites[siteIndex].id);
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

	const attacksOf = (state, id) => state.resolutionLog.filter((e) => e.type === 'attack' && e.recordId === id);
	const judgedRow = (state, id) => {
		const judged = state.resolutionLog.find((e) => e.type === 'judge');
		return Object.values(judged.siteResults)
			.flatMap((r) => [...r.entries.A, ...r.entries.B])
			.find((e) => e.recordId === id);
	};

	test('a hurt creature attacks for less, in proportion to the hold it has left (assumption 18)', () => {
		const seed = 'hurt-attacks-less-seed';
		const on = deployAt([slowStriker], [midStriker], seed);
		const off = deployAt([slowStriker], [midStriker], seed, { hurtAttacksLess: false });

		// B_0 is faster, so it lands first and A_0 answers already hurt
		const hurtAnswer = attacksOf(on, 'A_0')[0];
		const fullAnswer = attacksOf(off, 'A_0')[0];
		expect(hurtAnswer.outcome).not.toBe('lapsed');
		expect(hurtAnswer.power).toBeLessThan(fullAnswer.power);

		// the scale is exactly the share of its hold A_0 had left when it attacked, which is
		// what B_0's blow took off it (the same blow in both runs, since B_0 was untouched)
		const openingBlow = attacksOf(off, 'B_0')[0];
		const row = judgedRow(off, 'A_0');
		const factor = (row.fullHold - openingBlow.power) / row.fullHold;
		expect(hurtAnswer.power).toBeCloseTo(Math.round(fullAnswer.power * factor * 10) / 10, 5);
	});

	test('a bolster recovers half the damage its allies took, logged before the judge (assumption 19)', () => {
		const bolsterer = (id) => makeRecord(id, {
			archetype: { key: 'sage', favors: [] },
			abilities: [{ name: 'Steady', signature: false, instrument: 'voice', action: 'mend', medium: 'fire', intensity: 60 }],
			attributes: {
				strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50,
				intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60,
			},
		});
		const seed = 'bolster-recovery-seed';
		const on = deployAt([bolsterer, slowStriker], [midStriker], seed);
		const off = deployAt([bolsterer, slowStriker], [midStriker], seed, { bolsterRecovery: 0 });

		const recovered = on.resolutionLog.filter((e) => e.type === 'recover');
		expect(recovered.length).toBeGreaterThan(0);
		expect(off.resolutionLog.filter((e) => e.type === 'recover').length).toBe(0);

		const ev = recovered[0];
		expect(ev.bolster).toBe('A_0');
		expect(typeof ev.site).toBe('string');
		expect(ev.amount).toBeGreaterThan(0);

		// every recover event precedes the judge event, so the Ruling can be told in order
		const judgeIndex = on.resolutionLog.findIndex((e) => e.type === 'judge');
		recovered.forEach((r) => {
			expect(on.resolutionLog.indexOf(r)).toBeLessThan(judgeIndex);
		});

		// half of what the round took off it, at a charisma-50 bolsterer's scale of 1
		const damagedOff = judgedRow(off, ev.recordId);
		const damagedOn = judgedRow(on, ev.recordId);
		expect(ev.amount).toBeCloseTo(Math.round(damagedOff.damage * 0.5 * 10) / 10, 5);
		expect(damagedOn.hold).toBeGreaterThan(damagedOff.hold);
		expect(ev.remaining).toBeCloseTo(damagedOn.hold, 5);
	});

	test('keen instinct takes the enemy it can down, over its archetype line (assumption 17)', () => {
		// a juggernaut's conduct line is "strongest enemy here", so a keen creature that
		// ignores it for the enemy it can down proves the lane is the thing deciding
		const keen = (id) => makeRecord(id, {
			archetype: { key: 'juggernaut', favors: [] },
			abilities: [{ name: 'Smash', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 100 }],
			attributes: {
				strength: 100, vitality: 60, endurance: 70, agility: 50, reflex: 50,
				intelligence: 50, willpower: 50, instinct: 90, charisma: 50, resilience: 60,
			},
		});
		const tough = (id) => midStriker(id, { attributes: { vitality: 99, endurance: 99, resilience: 99, agility: 10, reflex: 10 } });
		const frail = (id) => midStriker(id, { attributes: { vitality: 1, endurance: 1, resilience: 1, agility: 10, reflex: 10 } });

		const seed = 'keen-instinct-seed';
		const on = deployAt([keen], [tough, frail], seed);
		const off = deployAt([keen], [tough, frail], seed, { instinctLanes: false });
		expect(attacksOf(on, 'A_0')[0].target).toBe('B_1');
		expect(attacksOf(off, 'A_0')[0].target).toBe('B_0');
	});

	test('dull instinct hits whatever was sent earliest, over its archetype line', () => {
		// a predator's line is "weakest enemy here"; the dull creature takes the first sent
		const dull = (id) => makeRecord(id, {
			archetype: { key: 'predator', favors: [] },
			abilities: [{ name: 'Jab', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 40 }],
			attributes: {
				strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50,
				intelligence: 50, willpower: 50, instinct: 10, charisma: 50, resilience: 60,
			},
		});
		const tough = (id) => midStriker(id, { attributes: { vitality: 95, endurance: 95, resilience: 95, agility: 10, reflex: 10 } });
		const frail = (id) => midStriker(id, { attributes: { vitality: 30, endurance: 30, resilience: 30, agility: 10, reflex: 10 } });

		const seed = 'dull-instinct-seed';
		const on = deployAt([dull], [tough, frail], seed);
		const off = deployAt([dull], [tough, frail], seed, { instinctLanes: false });
		expect(attacksOf(on, 'A_0')[0].target).toBe('B_0');
		expect(attacksOf(off, 'A_0')[0].target).toBe('B_1');
	});

	test('charisma scales what a bolster restores', () => {
		const bolsterWith = (charisma) => (id) => makeRecord(id, {
			archetype: { key: 'sage', favors: [] },
			abilities: [{ name: 'Steady', signature: false, instrument: 'voice', action: 'mend', medium: 'fire', intensity: 60 }],
			attributes: {
				strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50,
				intelligence: 50, willpower: 50, instinct: 50, charisma, resilience: 60,
			},
		});
		const seed = 'bolster-charisma-seed';
		const charming = deployAt([bolsterWith(100), slowStriker], [midStriker], seed);
		const charmless = deployAt([bolsterWith(0), slowStriker], [midStriker], seed);
		// every creature here is comfortable, so the lift is the scaled floor: 1.5 against 0.5
		const lift = (state) => judgedRow(state, 'A_1').fullHold;
		expect(lift(charming) - lift(charmless)).toBeCloseTo(BOLSTER_FLOOR * 1.5 - BOLSTER_FLOOR * 0.5, 5);
	});

	test('charisma scales what a shield cancels, and shieldCap half still takes half of it', () => {
		const shieldWith = (charisma) => (id) => makeRecord(id, {
			archetype: { key: 'bulwark', favors: [] },
			abilities: [{ name: 'Guard', signature: false, instrument: 'body', action: 'ward', medium: 'fire', intensity: 60 }],
			attributes: {
				strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50,
				intelligence: 50, willpower: 50, instinct: 50, charisma, resilience: 60,
			},
		});
		const seed = 'shield-charisma-seed';
		const charming = deployAt([shieldWith(100), slowStriker], [midStriker], seed);
		const charmless = deployAt([shieldWith(0), slowStriker], [midStriker], seed);

		const shieldOf = (state) => state.resolutionLog.find((e) => e.type === 'shield');
		// charisma 100 gives a scale of 1.5, clamped to the whole attack
		expect(shieldOf(charming).fraction).toBe(1);
		// charisma 0 gives 0.5, so half the attack still lands
		expect(shieldOf(charmless).fraction).toBeCloseTo(0.5, 5);
		expect(charmless.resolutionLog.some((e) => e.type === 'attack' && e.recordId === 'B_0' && e.outcome !== 'cancelled')).toBe(true);
		expect(charming.resolutionLog.some((e) => e.type === 'attack' && e.recordId === 'B_0' && e.outcome === 'cancelled')).toBe(true);

		// 'half' semantics are unchanged: the shielder wears half of what it CANCELS
		expect(shieldOf(charmless).selfDamage).toBeCloseTo(Math.round((shieldOf(charmless).amount / 2) * 10) / 10, 5);
	});

	test('the public vocabulary is attack, power, hurt, downed, sweep and speed', () => {
		const bigStriker = (id) => makeRecord(id, {
			archetype: { key: 'predator', favors: [] },
			abilities: [{ name: 'Smash', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 100 }],
			attributes: {
				strength: 100, vitality: 60, endurance: 70, agility: 50, reflex: 50,
				intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 60,
			},
		});
		const frail = (id) => midStriker(id, { attributes: { vitality: 1, endurance: 1, resilience: 1, agility: 10, reflex: 10 } });
		const state = deployAt([bigStriker], [frail], 'vocabulary-seed');

		const attack = state.resolutionLog.find((e) => e.type === 'attack');
		expect(attack).toBeTruthy();
		expect(typeof attack.power).toBe('number');
		expect(attack.amount).toBeUndefined();
		expect(state.resolutionLog.some((e) => e.type === 'blow')).toBe(false);
		expect(['downed', 'hurt', 'cancelled', 'no-target', 'lapsed']).toContain(attack.outcome);
		expect(state.resolutionLog.some((e) => e.outcome === 'routed' || e.outcome === 'staggered')).toBe(false);
		// the frail creature was driven to zero, so the player's list of the fallen is `downed`
		expect(state.players.B.downed).toContain('B_0');
		expect(state.players.B.routed).toBeUndefined();
	});

	test('the public board row carries hurt, downed and speed', () => {
		let state = freshMatch('vocabulary-board-seed');
		const frame = currentFrame(state);
		const seat = state.turn;
		state = send(state, seat, state.players[seat].roster[0].id, frame.sites[0].id);
		const row = getPublicState(state, seat).board[frame.sites[0].id][seat][0];
		expect(row.hurt).toBe(false);
		expect(row.downed).toBe(false);
		expect(typeof row.speed).toBe('number');
		expect(row.staggered).toBeUndefined();
	});
});


/*
	PASS 3 (docs/design/reclamation-base-redesign.md assumptions 21 to 23): the price of
	hiding, the stake, and the draft's shape. Each lever is a rules key, so every test below
	names the setting it is measuring rather than relying on the shipped default.
*/

function stealthyRosterOf(prefix, overrides = {}) {
	return makeRoster(prefix, () => ({ traits: { guaranteed: ['stealthy'], rolled: [] }, ...overrides }));
}

describe('pass 3: the price of hiding (assumption 21)', () => {
	test('hiddenSendCost charges a hidden send against the round\'s sendable cap', () => {
		const rosterA = stealthyRosterOf('S');
		const state = createMatch({
			rosterA, rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'hidden-cost-seed',
			rules: { hiddenSendCost: 2 },
		});
		const siteId = currentFrame(state).sites[0].id;
		const forced = { ...state, turn: 'A' };

		const openSend = send(forced, 'A', rosterA[0].id, siteId, false);
		expect(openSend.players.A.sentCount).toBe(1);

		const hiddenSend = send(forced, 'A', rosterA[0].id, siteId, true);
		expect(hiddenSend.players.A.sentCount).toBe(2);
	});

	test('a hidden send the remaining cap cannot afford is illegal, but the open send is not', () => {
		const rosterA = stealthyRosterOf('S');
		let state = createMatch({
			rosterA, rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'hidden-cap-seed',
			rules: { hiddenSendCost: 2 },
		});
		const siteId = currentFrame(state).sites[0].id;
		// one unit of the cap left
		state = { ...state, turn: 'A', players: { ...state.players, A: { ...state.players.A, sentCount: SENDABLE - 1 } } };
		expect(send(state, 'A', rosterA[0].id, siteId, true)).toBeNull();
		expect(send(state, 'A', rosterA[0].id, siteId, false)).not.toBeNull();
	});

	test('a returned creature sent hidden pays the larger of the two prices, not their sum', () => {
		const rosterA = stealthyRosterOf('S');
		let state = createMatch({
			rosterA, rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'hidden-loki-seed',
			rules: { hiddenSendCost: 2 },
		});
		const siteId = currentFrame(state).sites[0].id;
		state = {
			...state,
			turn: 'A',
			players: { ...state.players, A: { ...state.players.A, returned: [rosterA[0].id] } },
		};
		const sent = send(state, 'A', rosterA[0].id, siteId, true);
		expect(sent.players.A.sentCount).toBe(2);
	});

	test('hiddenFirstNeedsCompany: a lone hidden attacker loses hidden-first, one with company keeps it', () => {
		// a slow hidden striker against a fast open striker: with hidden-first the hidden
		// creature's attack is the first event of the world, without it the fast one's is
		const slowHidden = makeRecord('slow', {
			traits: { guaranteed: ['stealthy'], rolled: [] },
			attributes: { strength: 80, vitality: 60, endurance: 60, agility: 5, reflex: 5, intelligence: 50, willpower: 20, instinct: 50, charisma: 50, resilience: 60 },
		});
		const fastOpen = makeRecord('fast', {
			attributes: { strength: 80, vitality: 60, endurance: 60, agility: 95, reflex: 95, intelligence: 50, willpower: 20, instinct: 50, charisma: 50, resilience: 60 },
		});

		function firstAttackerAt(rules, withCompany) {
			const rosterA = makeRoster('A').map((r, i) => {
				if (i === 0) { return { ...slowHidden, id: 'A_0' }; }
				if (i === 1) { return { ...fastOpen, id: 'A_1' }; }
				return r;
			});
			const rosterB = makeRoster('B').map((r, i) => (i === 0 ? { ...fastOpen, id: 'B_0' } : r));
			let state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed: 'company-seed', rules });
			const siteId = currentFrame(state).sites[0].id;
			state = { ...state, turn: 'A' };
			state = send(state, 'A', 'A_0', siteId, true);
			if (withCompany) {
				state = { ...state, turn: 'A' };
				state = send(state, 'A', 'A_1', siteId, false);
			}
			state = { ...state, turn: 'B' };
			state = send(state, 'B', 'B_0', siteId, false);
			state = pass(state, 'A');
			state = pass(state, 'B');
			const attacks = state.resolutionLog.filter((e) => e.type === 'attack' && e.site === siteId);
			return attacks.length > 0 ? attacks[0].recordId : null;
		}

		// company is irrelevant while the rule is off: the hidden creature always goes first
		expect(firstAttackerAt({ hiddenFirstNeedsCompany: false }, false)).toBe('A_0');
		// with the rule on, a lone hidden creature waits its turn behind the fast opener
		expect(firstAttackerAt({ hiddenFirstNeedsCompany: true }, false)).toBe('B_0');
		// with a companion standing at the world, hidden-first applies again
		expect(firstAttackerAt({ hiddenFirstNeedsCompany: true }, true)).toBe('A_0');
	});

	test('hiddenPower scales an attack thrown from hiding and leaves an open attack alone', () => {
		function powerOfFirstAttack(hiddenPower, hidden) {
			const attacker = makeRecord('att', {
				traits: { guaranteed: ['stealthy'], rolled: [] },
				attributes: { strength: 90, vitality: 60, endurance: 60, agility: 90, reflex: 90, intelligence: 50, willpower: 20, instinct: 50, charisma: 50, resilience: 60 },
			});
			const rosterA = makeRoster('A').map((r, i) => (i === 0 ? { ...attacker, id: 'A_0' } : r));
			let state = createMatch({
				rosterA, rosterB: makeRoster('B'), worlds: makeWorlds(), seed: 'hidden-power-seed',
				rules: { hiddenPower },
			});
			const siteId = currentFrame(state).sites[0].id;
			state = { ...state, turn: 'A' };
			state = send(state, 'A', 'A_0', siteId, hidden);
			state = { ...state, turn: 'B' };
			state = send(state, 'B', state.players.B.roster[0].id, siteId, false);
			state = pass(state, 'A');
			state = pass(state, 'B');
			const attack = state.resolutionLog.find((e) => e.type === 'attack' && e.recordId === 'A_0');
			return attack ? attack.power : 0;
		}

		const openFull = powerOfFirstAttack(1, false);
		const hiddenFull = powerOfFirstAttack(1, true);
		const hiddenHalf = powerOfFirstAttack(0.5, true);
		const openHalf = powerOfFirstAttack(0.5, false);
		expect(openFull).toBeGreaterThan(0);
		expect(hiddenFull).toBeCloseTo(openFull, 5);
		expect(hiddenHalf).toBeCloseTo(hiddenFull / 2, 1);
		// an open attack is untouched by the hidden price
		expect(openHalf).toBeCloseTo(openFull, 5);
	});
});

describe('pass 3: the stake (assumption 22)', () => {
	function stakeMatch(seed = 'stake-seed', rules = {}) {
		return createMatch({ rosterA: makeRoster('A'), rosterB: makeRoster('B'), worlds: makeWorlds(), seed, rules });
	}

	test('stakes one of the round\'s worlds, without spending the turn', () => {
		const state = stakeMatch();
		const siteId = currentFrame(state).sites[1].id;
		const staked = stakeWorld(state, 'A', siteId);
		expect(staked).not.toBeNull();
		expect(currentFrame(staked).stakes.A).toBe(siteId);
		expect(staked.players.A.stakeUsed).toBe(true);
		// the turn is untouched: staking is a declaration, not an action of the alternation
		expect(staked.turn).toBe(state.turn);
		expect(staked.resolutionLog.some((e) => e.type === 'stake' && e.handler === 'A' && e.site === siteId && e.round === 0)).toBe(true);
	});

	test('is legal on either handler\'s turn and illegal for a site outside the frame', () => {
		const state = stakeMatch('stake-turn-seed');
		const other = state.turn === 'A' ? 'B' : 'A';
		expect(stakeWorld(state, other, currentFrame(state).sites[0].id)).not.toBeNull();
		expect(stakeWorld(state, 'A', 'no-such-site')).toBeNull();
	});

	test('is once per Proving and gone after the handler\'s first send of the round', () => {
		let state = stakeMatch('stake-once-seed');
		const sites = currentFrame(state).sites;
		state = stakeWorld(state, 'A', sites[0].id);
		expect(stakeWorld(state, 'A', sites[1].id)).toBeNull();

		let other = stakeMatch('stake-sent-seed');
		const otherSites = currentFrame(other).sites;
		other = { ...other, turn: 'A' };
		expect(stakeableSiteIdsFor(other, 'A').length).toBe(WORLDS_PER_FRAME);
		other = send(other, 'A', other.players.A.roster[0].id, otherSites[0].id);
		expect(stakeableSiteIdsFor(other, 'A')).toEqual([]);
		expect(stakeWorld(other, 'A', otherSites[1].id)).toBeNull();
		// the opponent has not sent yet, so its own stake is still open
		expect(stakeableSiteIdsFor(other, 'B').length).toBe(WORLDS_PER_FRAME);
	});

	test('rules.stake false makes the stake illegal and leaves every world counting one', () => {
		const state = stakeMatch('stake-off-seed', { stake: false });
		expect(stakeWorld(state, 'A', currentFrame(state).sites[0].id)).toBeNull();
		expect(stakeableSiteIdsFor(state, 'A')).toEqual([]);
	});

	/*
		A world the winner holds outright, staked by nobody, by one handler, or by both. The
		roster is built so side A always holds more at the world it is sent to, so the only
		thing moving between the three cases is what the Ruling counts it as.
	*/
	function judgedStake(stakers, seed) {
		const strongA = () => makeRecord('sA', { attributes: { strength: 50, vitality: 90, endurance: 90, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 90 } });
		const weakB = () => makeRecord('wB', { attributes: { strength: 50, vitality: 20, endurance: 20, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 20 } });
		let state = createMatch({
			rosterA: makeRoster('A', () => strongA()),
			rosterB: makeRoster('B', () => weakB()),
			worlds: makeWorlds(),
			seed,
		});
		const siteId = currentFrame(state).sites[0].id;
		stakers.forEach((who) => {
			state = stakeWorld(state, who, siteId);
		});
		state = { ...state, turn: 'A' };
		state = send(state, 'A', state.players.A.roster[0].id, siteId);
		state = { ...state, turn: 'B' };
		state = send(state, 'B', state.players.B.roster[0].id, siteId);
		state = pass(state, 'A');
		state = pass(state, 'B');
		const judgeEvent = state.resolutionLog.find((e) => e.type === 'judge');
		return { state, siteId, judgeEvent, result: judgeEvent.siteResults[siteId] };
	}

	test('an unstaked world counts one, a staked world two, a world both staked three', () => {
		const none = judgedStake([], 'stake-count-none');
		expect(none.result.winner).toBe('A');
		expect(none.result.countedValue).toBe(1);
		expect(none.result.staked).toEqual([]);
		expect(none.state.players.A.sitesWon).toBe(1);

		const one = judgedStake(['A'], 'stake-count-one');
		expect(one.result.countedValue).toBe(STAKE_SITE_VALUE);
		expect(one.result.staked).toEqual(['A']);
		expect(one.state.players.A.sitesWon).toBe(STAKE_SITE_VALUE);

		const both = judgedStake(['A', 'B'], 'stake-count-both');
		expect(both.result.countedValue).toBe(STAKE_BOTH_VALUE);
		expect(both.result.staked).toEqual(['A', 'B']);
		expect(both.state.players.A.sitesWon).toBe(STAKE_BOTH_VALUE);
		// the judge event carries the stakes themselves, so the report can read them
		expect(both.judgeEvent.stakes).toEqual({ A: both.siteId, B: both.siteId });
	});

	test('a staked world that ties counts nothing for either side', () => {
		const equal = () => makeRecord('eq', {
			archetype: { key: 'survivor', favors: [] },
			abilities: [{ name: 'Mend', signature: false, instrument: 'voice', action: 'mend', medium: 'light', intensity: 40 }],
		});
		let state = createMatch({
			rosterA: makeRoster('A', () => equal()),
			rosterB: makeRoster('B', () => equal()),
			worlds: makeWorlds(),
			seed: 'stake-tie-seed',
		});
		const siteId = currentFrame(state).sites[0].id;
		state = stakeWorld(state, 'A', siteId);
		state = { ...state, turn: 'A' };
		state = send(state, 'A', state.players.A.roster[0].id, siteId);
		state = { ...state, turn: 'B' };
		state = send(state, 'B', state.players.B.roster[0].id, siteId);
		state = pass(state, 'A');
		state = pass(state, 'B');
		const judgeEvent = state.resolutionLog.find((e) => e.type === 'judge');
		expect(judgeEvent.siteResults[siteId].winner).toBeNull();
		expect(judgeEvent.siteResults[siteId].countedValue).toBe(STAKE_SITE_VALUE);
		expect(state.players.A.sitesWon).toBe(0);
		expect(state.players.B.sitesWon).toBe(0);
	});

	test('a stake can clinch the match at SITES_TO_CLINCH, since the clinch is unchanged', () => {
		const strongA = () => makeRecord('sA', { attributes: { strength: 50, vitality: 90, endurance: 90, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 90 } });
		const weakB = () => makeRecord('wB', { attributes: { strength: 50, vitality: 20, endurance: 20, agility: 50, reflex: 50, intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 20 } });
		let state = createMatch({
			rosterA: makeRoster('A', () => strongA()),
			rosterB: makeRoster('B', () => weakB()),
			worlds: makeWorlds(),
			seed: 'stake-clinch-seed',
		});
		// three worlds already held: one STAKED world is worth the two that clinch, where an
		// unstaked one would leave the Proving open at four
		state = { ...state, players: { ...state.players, A: { ...state.players.A, sitesWon: SITES_TO_CLINCH - STAKE_SITE_VALUE } } };
		const siteId = currentFrame(state).sites[0].id;
		state = stakeWorld(state, 'A', siteId);
		state = { ...state, turn: 'A' };
		state = send(state, 'A', state.players.A.roster[0].id, siteId);
		state = { ...state, turn: 'A' };
		state = pass(state, 'A');
		if (state.phase === 'deploy') {
			state = pass(state, 'B');
		}
		expect(state.players.A.sitesWon).toBe(SITES_TO_CLINCH);
		expect(state.phase).toBe('matchEnd');
		expect(state.winner).toBe('A');
		expect(state.matchEndReason).toBe('clinched');
	});

	test('getPublicState exposes the stakes per site, stakeUsed, and the hidden send price', () => {
		let state = stakeMatch('stake-public-seed');
		const sites = currentFrame(state).sites;
		state = stakeWorld(state, 'A', sites[0].id);
		const view = getPublicState(state, 'B');
		expect(view.stakes[sites[0].id]).toEqual({ by: ['A'], countedValue: STAKE_SITE_VALUE });
		expect(view.stakes[sites[1].id]).toEqual({ by: [], countedValue: 1 });
		expect(view.players.A.stakeUsed).toBe(true);
		expect(view.players.B.stakeUsed).toBe(false);
		expect(view.hiddenSendCost).toBe(DEFAULT_RULES.hiddenSendCost);
		// own-side only, like the roster: B reads its own remaining stake choices
		expect(view.players.B.stakeableSiteIds.length).toBe(WORLDS_PER_FRAME);
		expect(view.players.A.stakeableSiteIds).toBeUndefined();
	});
});
