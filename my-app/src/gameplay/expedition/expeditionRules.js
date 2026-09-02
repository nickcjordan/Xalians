/*
	Expedition — the pure rules state machine.

	Framework-free per docs/design/tribute-design.md step 2 ("Engine: world and site
	model, hold and strain, the four-phase round, the sixteen acts, conduct, judging, the
	match. Pure state machine with tests, as before."). Every action function takes a
	state and returns a NEW state, or null on illegal input — the same contract the first
	design's tributeRules.js used, so the bot/tests/a future UI reducer can use a single
	"did this work" check.

	The engine takes `worlds` as an input to createMatch rather than importing sites.js
	itself, per the task's own guidance: the engine should not know where data lives.
*/

import { prepare, magnitudeAgainst, holdAtSite, targetMatchupMultiplier } from './creatureOnTable.js';
import {
	ROSTER_SIZE,
	SENDABLE,
	WORLDS_PER_MATCH,
	SITES_PER_WORLD,
	SITES_TO_CLINCH,
	STAGGER_FRACTION,
	ROUT_FRACTION,
	ARMORED_STAGGER_FRACTION,
	ARMORED_ROUT_FRACTION,
	ALL_ACTIONS,
	AREA_ACTIONS,
} from './expeditionInterpretation.js';

// ---------------------------------------------------------------------------
// deterministic PRNG — mulberry32, identical implementation to the first design's
// tributeRules.js (createRngState/nextRandom), reproduced here rather than imported so
// this package has no runtime dependency on ../tribute/.
// ---------------------------------------------------------------------------

export function createRngState(seed) {
	let s;
	if (typeof seed === 'number') {
		s = seed >>> 0;
	} else {
		const str = String(seed);
		s = 0;
		for (let i = 0; i < str.length; i++) {
			s = (Math.imul(31, s) + str.charCodeAt(i)) >>> 0;
		}
	}
	return s >>> 0;
}

export function nextRandom(rngState) {
	let a = rngState >>> 0;
	a |= 0;
	a = (a + 0x6d2b79f5) | 0;
	let t = a;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	return { value, nextState: a >>> 0 };
}

function nextInt(rngState, maxExclusive) {
	const { value, nextState } = nextRandom(rngState);
	return { value: Math.floor(value * maxExclusive), nextState };
}

function shuffle(array, rngState) {
	const result = array.slice();
	let state = rngState;
	for (let i = result.length - 1; i > 0; i--) {
		const { value: j, nextState } = nextInt(state, i + 1);
		state = nextState;
		const tmp = result[i];
		result[i] = result[j];
		result[j] = tmp;
	}
	return { array: result, nextState: state };
}

// ---------------------------------------------------------------------------
// errors
// ---------------------------------------------------------------------------

export class ExpeditionRuleError extends Error {
	constructor(code, message) {
		super(message || code);
		this.name = 'ExpeditionRuleError';
		this.code = code;
	}
}

function otherPlayer(player) {
	return player === 'A' ? 'B' : 'A';
}

// ---------------------------------------------------------------------------
// match setup
// ---------------------------------------------------------------------------

function validateRosterInput(roster, label) {
	if (!roster || !Array.isArray(roster)) {
		throw new ExpeditionRuleError('INVALID_ROSTER', `${label}: roster must be an array`);
	}
	if (roster.length !== ROSTER_SIZE) {
		throw new ExpeditionRuleError('INVALID_ROSTER_SIZE', `${label}: roster must contain exactly ${ROSTER_SIZE} records, got ${roster.length}`);
	}
	const ids = new Set(roster.map((r) => r.id));
	if (ids.size !== roster.length) {
		throw new ExpeditionRuleError('DUPLICATE_RECORD_IDS', `${label}: roster contains duplicate record ids`);
	}
}

function validateWorldsInput(worlds) {
	if (!Array.isArray(worlds) || worlds.length < WORLDS_PER_MATCH) {
		throw new ExpeditionRuleError('INVALID_WORLDS', `worlds must be an array of at least ${WORLDS_PER_MATCH} world entries`);
	}
	worlds.forEach((w, i) => {
		if (!w || !Array.isArray(w.sites) || w.sites.length !== SITES_PER_WORLD) {
			throw new ExpeditionRuleError('INVALID_WORLD_SITES', `world[${i}] must have exactly ${SITES_PER_WORLD} sites`);
		}
	});
}

function emptyBoardForWorld(world) {
	const board = {};
	world.sites.forEach((site) => {
		board[site.id] = { A: [], B: [] };
	});
	return board;
}

/*
	createMatch({rosterA, rosterB, worlds, seed}) -> initial match state, phase 'deploy'
	on world 1.

	Draws WORLDS_PER_MATCH distinct worlds (no repeats) from the input `worlds` list,
	picks a random starter, per the design doc's "Each round opens one world, drawn from
	the fourteen with no repeats within a match" and "there is no Court Favor" (so the
	only thing decided randomly here is the world order and who starts round 1 — the
	starter then simply alternates each round).
*/
export function createMatch({ rosterA, rosterB, worlds, seed }) {
	validateRosterInput(rosterA, 'rosterA');
	validateRosterInput(rosterB, 'rosterB');
	validateWorldsInput(worlds);

	let rngState = createRngState(seed);

	const { array: shuffledWorlds, nextState: afterShuffle } = shuffle(worlds, rngState);
	rngState = afterShuffle;
	const matchWorlds = shuffledWorlds.slice(0, WORLDS_PER_MATCH);

	const { value: starterRoll, nextState: afterStarter } = nextInt(rngState, 2);
	rngState = afterStarter;
	const starter = starterRoll === 0 ? 'A' : 'B';

	const playerState = (roster) => ({
		roster: roster.slice(), // records never sent; shrinks as records are sent
		sentCount: 0,
		holding: [], // record ids currently holding a won site (stay on their world)
		routed: [], // record ids routed out of the expedition (returned to owner post-match)
		withdrawn: [], // record ids withdrawn from lost/tied sites (out of the expedition)
		passed: false,
		firstPasser: false,
		sitesWon: 0,
	});

	const world = matchWorlds[0];

	return {
		seed,
		rngState,
		worlds: matchWorlds,
		worldIndex: 0,
		players: { A: playerState(rosterA), B: playerState(rosterB) },
		board: emptyBoardForWorld(world),
		staggered: {}, // record id -> boolean, valid only within the current round
		wardedBy: {}, // record id (target) -> record id (warder), valid only within the current round
		snared: {}, // record id -> boolean, valid only within the current round
		drainBonuses: {}, // record id (drainer) -> hold bonus, valid only within the current round
		hidden: {}, // record id -> boolean, sent hidden this round and not yet revealed
		orders: { A: {}, B: {} }, // record id -> action name or 'hold', private until commit
		committed: { A: false, B: false },
		phase: 'deploy',
		starter,
		turn: starter,
		resolutionLog: [],
		winner: null,
		matchEndReason: null,
	};
}

// ---------------------------------------------------------------------------
// board helpers
// ---------------------------------------------------------------------------

function currentWorld(state) {
	return state.worlds[state.worldIndex];
}

function siteById(world, siteId) {
	return world.sites.find((s) => s.id === siteId) || null;
}

// every creature-on-board entry across all sites for one player
function boardEntriesFor(state, player) {
	const world = currentWorld(state);
	const entries = [];
	world.sites.forEach((site) => {
		state.board[site.id][player].forEach((entry) => entries.push(entry));
	});
	return entries;
}

function allBoardEntries(state) {
	return [...boardEntriesFor(state, 'A'), ...boardEntriesFor(state, 'B')];
}

function findEntry(state, recordId) {
	const world = currentWorld(state);
	for (const site of world.sites) {
		for (const player of ['A', 'B']) {
			const found = state.board[site.id][player].find((e) => e.recordId === recordId);
			if (found) {
				return { entry: found, site, player };
			}
		}
	}
	return null;
}

function recordById(state, player, recordId) {
	return state.players[player].roster.find((r) => r.id === recordId)
		|| allBoardEntries(state).map((e) => e.record).find((r) => r.id === recordId)
		|| null;
}

// pack-bonded/solitary counts at a site: kin = same species, ally = any other creature on
// the same side at the same site
function siteCompanions(state, site, player, excludingRecordId) {
	const entries = state.board[site.id][player].filter((e) => e.recordId !== excludingRecordId && !e.hidden);
	return entries;
}

function computeHoldForEntry(state, entry, site, world) {
	const companions = siteCompanions(state, site, entry.player, entry.recordId);
	const kin = companions.filter((c) => c.record.species === entry.record.species).length;
	const allies = companions.length;
	const { value } = holdAtSite(entry.record, site, world, {
		packBondedKinAtSite: kin,
		solitaryAlliesAtSite: allies,
	});
	const staggerMult = state.staggered[entry.recordId] ? STAGGER_FRACTION : 1;
	const drainBonus = (state.drainBonuses && state.drainBonuses[entry.recordId]) || 0;
	return value * staggerMult + drainBonus;
}

// ---------------------------------------------------------------------------
// legality: sendable creatures
// ---------------------------------------------------------------------------

function sendableRoster(playerState) {
	if (playerState.sentCount >= SENDABLE) {
		return [];
	}
	return playerState.roster;
}

export function hasLegalSend(state, player) {
	if (state.phase != 'deploy') {
		return false;
	}
	const p = state.players[player];
	if (p.passed) {
		return false;
	}
	return sendableRoster(p).length > 0;
}

// ---------------------------------------------------------------------------
// Deploy phase
// ---------------------------------------------------------------------------

function isPlayersDeployTurn(state, player) {
	return state.phase === 'deploy' && state.turn === player;
}

/*
	send(state, handler, recordId, siteId, hidden=false)

	Only in deploy, only on your turn, only if fewer than SENDABLE sent so far by you,
	hidden only if the creature is stealthy. Any number of creatures may stand at a site.
*/
export function send(state, handler, recordId, siteId, hidden = false) {
	if (!isPlayersDeployTurn(state, handler)) {
		return null;
	}
	const p = state.players[handler];
	if (p.passed) {
		return null;
	}
	if (p.sentCount >= SENDABLE) {
		return null;
	}
	const record = p.roster.find((r) => r.id === recordId);
	if (!record) {
		return null;
	}
	const world = currentWorld(state);
	const site = siteById(world, siteId);
	if (!site) {
		return null;
	}
	if (hidden) {
		const traits = (record.traits && [...(record.traits.guaranteed || []), ...(record.traits.rolled || [])]) || [];
		if (!traits.includes('stealthy')) {
			return null;
		}
	}

	const sentIndex = p.sentCount;
	const entry = {
		recordId,
		record,
		player: handler,
		siteId,
		hidden: !!hidden,
		sentIndex,
		routed: false,
	};

	const nextRoster = p.roster.filter((r) => r.id !== recordId);
	const nextPlayers = {
		...state.players,
		[handler]: { ...p, roster: nextRoster, sentCount: p.sentCount + 1 },
	};

	const nextBoard = {
		...state.board,
		[siteId]: {
			...state.board[siteId],
			[handler]: [...state.board[siteId][handler], entry],
		},
	};

	let nextState = { ...state, players: nextPlayers, board: nextBoard };
	return advanceDeployTurn(nextState, handler);
}

/*
	pass(state, handler) — permanent for the round; when both have passed, phase ->
	'orders'.
*/
export function pass(state, handler) {
	if (!isPlayersDeployTurn(state, handler)) {
		return null;
	}
	const p = state.players[handler];
	if (p.passed) {
		return null;
	}
	const nextPlayers = { ...state.players, [handler]: { ...p, passed: true } };
	let nextState = { ...state, players: nextPlayers };

	const bothPassed = nextState.players.A.passed && nextState.players.B.passed;
	if (bothPassed) {
		return { ...nextState, phase: 'orders', turn: null };
	}
	return advanceDeployTurnAfterPass(nextState, handler);
}

function advanceDeployTurn(state, actingPlayer) {
	let next = otherPlayer(actingPlayer);
	let s = { ...state, turn: next };
	return autoPassIfNoLegalSend(s);
}

function advanceDeployTurnAfterPass(state, actingPlayer) {
	const next = otherPlayer(actingPlayer);
	let s = { ...state, turn: next };
	return autoPassIfNoLegalSend(s);
}

// "If a handler has no legal send they are auto-passed."
function autoPassIfNoLegalSend(state) {
	let s = state;
	for (let i = 0; i < 2; i++) {
		if (s.phase !== 'deploy') {
			return s;
		}
		const current = s.turn;
		const p = s.players[current];
		if (p.passed) {
			const other = otherPlayer(current);
			if (s.players[other].passed) {
				return { ...s, phase: 'orders', turn: null };
			}
			s = { ...s, turn: other };
			continue;
		}
		if (hasLegalSend(s, current)) {
			return s;
		}
		const nextPlayers = { ...s.players, [current]: { ...p, passed: true } };
		s = { ...s, players: nextPlayers };
		const bothPassed = s.players.A.passed && s.players.B.passed;
		if (bothPassed) {
			return { ...s, phase: 'orders', turn: null };
		}
		s = { ...s, turn: otherPlayer(current) };
	}
	return s;
}

// ---------------------------------------------------------------------------
// Orders phase
// ---------------------------------------------------------------------------

function legalActionsForEntry(entry) {
	const record = entry.record;
	const abilityActions = (record.abilities || []).map((a) => a.action);
	return ['hold', ...abilityActions];
}

/*
	order(state, handler, creatureId, actName | 'hold') — only in orders; stored privately
	per handler. Committing happens via commitOrders.
*/
export function order(state, handler, creatureId, actName) {
	if (state.phase !== 'orders') {
		return null;
	}
	if (state.committed[handler]) {
		return null;
	}
	const found = findEntry(state, creatureId);
	if (!found || found.player !== handler) {
		return null;
	}
	const legal = legalActionsForEntry(found.entry);
	if (!legal.includes(actName)) {
		return null;
	}

	const nextOrders = {
		...state.orders,
		[handler]: { ...state.orders[handler], [creatureId]: actName },
	};
	return { ...state, orders: nextOrders };
}

/*
	commitOrders(state, handler) — when both have committed, resolve() runs and phase ->
	'judged', then judge() runs and phase -> 'deploy' of the next world or 'matchEnd'.
*/
export function commitOrders(state, handler) {
	if (state.phase !== 'orders') {
		return null;
	}
	if (state.committed[handler]) {
		return null;
	}
	const nextCommitted = { ...state.committed, [handler]: true };
	let nextState = { ...state, committed: nextCommitted };

	if (nextCommitted.A && nextCommitted.B) {
		nextState = resolve(nextState);
		nextState = judge(nextState);
	}
	return nextState;
}

// ---------------------------------------------------------------------------
// conduct target selection
// ---------------------------------------------------------------------------

function isAlive(entry) {
	return !entry.routed;
}

function enemiesInReach(state, entry, actClass, entriesSnapshot) {
	const opponent = otherPlayer(entry.player);
	if (actClass === 'contact' || actClass === 'reach') {
		// contact/reach touch only the actor's own site (ambush/snare/drain are 'reach' but
		// per the doc text these all still act at the creature's own site: "reach: touches
		// the site with a condition" — no wording grants them cross-site range, only
		// projection does)
		return entriesSnapshot.filter((e) => e.player === opponent && e.siteId === entry.siteId && isAlive(e));
	}
	// projection: any site on the world
	return entriesSnapshot.filter((e) => e.player === opponent && isAlive(e));
}

function alliesOf(entry, entriesSnapshot) {
	return entriesSnapshot.filter((e) => e.player === entry.player && e.recordId !== entry.recordId && isAlive(e));
}

function currentHoldOf(state, e) {
	const world = currentWorld(state);
	const site = siteById(world, e.siteId);
	return computeHoldForEntry(state, e, site, world);
}

function magnitudeOfBestAct(state, entry) {
	const prepared = prepareEntry(state, entry);
	if (prepared.acts.length === 0) {
		return 0;
	}
	return Math.max(...prepared.acts.map((a) => a.magnitude));
}

// "menacing creatures draw attacks aimed at their site's weakest ally to themselves."
// Applied as a final redirect once a candidate target is chosen: if the chosen target is
// the weakest-held creature at its site (by the current side's own hold, since menacing
// only redirects attacks on ITS side's weakest member) and a menacing companion stands
// at that same site, the attack redirects to the menacing companion instead.
function applyMenacingRedirect(candidate, state) {
	if (!candidate) {
		return candidate;
	}
	const companions = allBoardEntries(state).filter(
		(e) => e.player === candidate.player && e.siteId === candidate.siteId && isAlive(e),
	);
	const withHold = companions.map((e) => ({ entry: e, hold: currentHoldOf(state, e), prepared: prepareEntry(state, e) }));
	const weakestHold = Math.min(...withHold.map((c) => c.hold));
	const candidateHold = currentHoldOf(state, candidate);
	const isWeakestAlly = candidateHold === weakestHold;
	if (!isWeakestAlly) {
		return candidate;
	}
	const menacer = withHold.find((c) => c.entry.recordId !== candidate.recordId && c.prepared.menacing);
	return menacer ? menacer.entry : candidate;
}

function pickAttackTarget(state, entry, conduct, actClass, entriesSnapshot) {
	const candidates = enemiesInReach(state, entry, actClass, entriesSnapshot).map((e) => ({
		...e,
		_hold: currentHoldOf(state, e),
		_magnitude: magnitudeOfBestAct(state, e),
		_initiative: prepareEntry(state, e).initiative,
		_menacing: prepareEntry(state, e).menacing,
	}));
	if (candidates.length === 0) {
		return null;
	}

	let chosen = null;
	switch (conduct.attacking) {
		case 'weakestEnemyInReach': {
			const staggered = candidates.filter((c) => state.staggered[c.recordId]);
			const pool = staggered.length > 0 ? staggered : candidates;
			chosen = pool.reduce((best, c) => (!best || c._hold < best._hold ? c : best), null);
			break;
		}
		case 'strongestEnemyInReach':
			chosen = candidates.reduce((best, c) => (!best || c._hold > best._hold ? c : best), null);
			break;
		case 'enemySentEarliest':
			chosen = candidates.reduce((best, c) => (!best || c.sentIndex < best.sentIndex ? c : best), null);
			break;
		case 'enemyThreateningWeakestAlly': {
			const allies = alliesOf(entry, entriesSnapshot).map((a) => ({ ...a, _hold: currentHoldOf(state, a) }));
			const weakestAlly = allies.reduce((best, a) => (!best || a._hold < best._hold ? a : best), null);
			const atWeakestAllySite = weakestAlly
				? candidates.filter((c) => c.siteId === weakestAlly.siteId)
				: [];
			const pool = atWeakestAllySite.length > 0 ? atWeakestAllySite : candidates;
			chosen = pool.reduce((best, c) => (!best || c._hold > best._hold ? c : best), null);
			break;
		}
		case 'enemyWithLowestMagnitude':
			chosen = candidates.reduce((best, c) => (!best || c._magnitude < best._magnitude ? c : best), null);
			break;
		case 'slowerEnemyWeakestFirst': {
			const slower = candidates.filter((c) => c._initiative < prepareEntry(state, entry).initiative);
			const pool = slower.length > 0 ? slower : candidates;
			chosen = pool.reduce((best, c) => (!best || c._hold < best._hold ? c : best), null);
			break;
		}
		case 'enemyMostVulnerableToElement': {
			chosen = pickMostVulnerableToElement(entry, candidates);
			break;
		}
		case 'enemyWithHighestMagnitude':
			chosen = candidates.reduce((best, c) => (!best || c._magnitude > best._magnitude ? c : best), null);
			break;
		case 'enemyRoutableElseWeakest': {
			const routable = candidates.filter((c) => magnitudeOfBestAct(state, entry) >= c._hold * ROUT_FRACTION);
			const pool = routable.length > 0 ? routable : candidates;
			chosen = pool.reduce((best, c) => (!best || c._hold < best._hold ? c : best), null);
			break;
		}
		default:
			chosen = candidates.reduce((best, c) => (!best || c.sentIndex < best.sentIndex ? c : best), null);
	}

	// temperament: high boldness prefers the stronger of two close candidates, low
	// boldness the weaker — applied here as a tiebreak nudge among near-equal hold when
	// more than one candidate ties the chosen value.
	const conductView = prepareEntry(state, entry).conduct;
	if (chosen && candidates.length > 1) {
		const tiedByHold = candidates.filter((c) => c._hold === chosen._hold);
		if (tiedByHold.length > 1) {
			if (conductView.isHighBoldness) {
				chosen = tiedByHold.reduce((best, c) => (c._hold > best._hold ? c : best));
			} else if (conductView.isLowBoldness) {
				chosen = tiedByHold.reduce((best, c) => (c._hold < best._hold ? c : best));
			}
		}
		if (conductView.isHighSociability) {
			const kin = tiedByHold.find((c) => c.record.species === entry.record.species);
			if (kin) {
				chosen = kin;
			}
		}
	}

	// high curiosity: for projection acts, prefer targets at a site other than its own
	if (actClass === 'projection' && conductView.isHighCuriosity) {
		const elsewhere = candidates.filter((c) => c.siteId !== entry.siteId);
		if (elsewhere.length > 0 && elsewhere.includes(chosen) === false) {
			chosen = elsewhere.reduce((best, c) => (!best || c._hold > best._hold ? c : best), chosen);
		}
	}

	chosen = applyMenacingRedirect(chosen, state);
	return chosen;
}

function pickMostVulnerableToElement(entry, candidates) {
	return candidates.reduce((best, c) => {
		const eff = targetMatchupMultiplier(entry.record, c.record);
		if (!best || eff > best._eff) {
			return { ...c, _eff: eff };
		}
		return best;
	}, null);
}

function pickSupportTarget(state, entry, conduct, entriesSnapshot) {
	const allies = alliesOf(entry, entriesSnapshot).map((e) => ({
		...e,
		_hold: currentHoldOf(state, e),
		_magnitude: magnitudeOfBestAct(state, e),
		_initiative: prepareEntry(state, e).initiative,
	}));
	if (allies.length === 0) {
		return null; // "a ward with no ally wards the caster" handled by caller
	}
	let chosen = null;
	switch (conduct.supporting) {
		case 'allyWithLeastHold':
			chosen = allies.reduce((best, a) => (!best || a._hold < best._hold ? a : best), null);
			break;
		case 'allyWithMostHold':
			chosen = allies.reduce((best, a) => (!best || a._hold > best._hold ? a : best), null);
			break;
		case 'allySentEarliest':
			chosen = allies.reduce((best, a) => (!best || a.sentIndex < best.sentIndex ? a : best), null);
			break;
		case 'self':
			chosen = null; // caller handles "supporting: self" (survivor) specially
			break;
		case 'fastestAlly':
			chosen = allies.reduce((best, a) => (!best || a._initiative > best._initiative ? a : best), null);
			break;
		case 'allyMostVulnerablePresent': {
			const enemies = entriesSnapshot.filter((e) => e.player === otherPlayer(entry.player) && isAlive(e));
			chosen = allies.reduce((best, a) => {
				const worstVsAny = enemies.length > 0
					? Math.max(...enemies.map((en) => targetMatchupMultiplier(en.record, a.record)))
					: 0;
				const bestWorst = best ? best._vuln : -Infinity;
				return worstVsAny > bestWorst ? { ...a, _vuln: worstVsAny } : best;
			}, null);
			break;
		}
		case 'allyWithHighestMagnitude':
			chosen = allies.reduce((best, a) => (!best || a._magnitude > best._magnitude ? a : best), null);
			break;
		default:
			chosen = allies[0];
	}
	return chosen;
}

// ---------------------------------------------------------------------------
// prepared-entry cache (per resolve() call — the board doesn't change shape mid-act
// except for stagger/rout/shove/withdraw, all applied to `state` directly)
// ---------------------------------------------------------------------------

function prepareEntry(state, entry) {
	const world = currentWorld(state);
	const site = siteById(world, entry.siteId);
	const companions = siteCompanions(state, site, entry.player, entry.recordId);
	const kin = companions.filter((c) => c.record.species === entry.record.species).length;
	const allies = companions.length;
	return prepare(entry.record, site, world, entry.sentIndex, {
		packBondedKinAtSite: kin,
		solitaryAlliesAtSite: allies,
	});
}

// ---------------------------------------------------------------------------
// Resolve phase
// ---------------------------------------------------------------------------

function orderedActionFor(state, handler, entry) {
	const ordered = state.orders[handler] && state.orders[handler][entry.recordId];
	if (ordered) {
		return ordered;
	}
	return prepareEntry(state, entry).favoredAct.action;
}

// initiative order builder: ambush first (initiative order among themselves), then
// wards, then everything else in initiative order with strained creatures last, ties to
// earlier sentIndex.
function buildResolutionOrder(state, entries) {
	const withMeta = entries.map((e) => {
        const action = orderedActionFor(state, e.player, e);
        const prepared = prepareEntry(state, e);
        return { entry: e, action, initiative: prepared.initiative, strained: prepared.strainLevel !== 'none' };
    });

	const ambush = withMeta.filter((m) => m.action === 'ambush');
	const ward = withMeta.filter((m) => m.action === 'ward');
	const rest = withMeta.filter((m) => m.action !== 'ambush' && m.action !== 'ward');

	function byInitiativeThenSent(a, b) {
		if (a.strained !== b.strained) {
			return a.strained ? 1 : -1;
		}
		if (b.initiative !== a.initiative) {
			return b.initiative - a.initiative;
		}
		return a.entry.sentIndex - b.entry.sentIndex;
	}

	ambush.sort(byInitiativeThenSent);
	ward.sort(byInitiativeThenSent);
	rest.sort(byInitiativeThenSent);

	return [...ambush, ...ward, ...rest];
}

function logEvent(state, event) {
	state.resolutionLog.push(event);
}

function moveEntryToSite(state, entry, newSiteId) {
	const world = currentWorld(state);
	state.board[entry.siteId][entry.player] = state.board[entry.siteId][entry.player].filter(
		(e) => e.recordId !== entry.recordId,
	);
	entry.siteId = newSiteId;
	state.board[newSiteId][entry.player].push(entry);
}

// "shove moves the target to a neighboring site... toward the site with fewer of the
// shover's allies, else index+1 wrapping." Sites are ordered 0..2 on the world; for
// SITES_PER_WORLD=3 the two neighbors (index-1, index+1, both wrapping) are always
// distinct from the source site and from each other, so there are always exactly two
// candidates to choose between.
function neighborSiteId(world, fromSiteId, entry, entriesSnapshot) {
	const idx = world.sites.findIndex((s) => s.id === fromSiteId);
	const n = world.sites.length;
	const candidateIds = [world.sites[(idx - 1 + n) % n].id, world.sites[(idx + 1) % n].id];

	// prefer the site with fewer of the shover's own allies present
	const shoverAllies = (siteId) => entriesSnapshot.filter((e) => e.player === entry.player && e.siteId === siteId).length;
	const counts = candidateIds.map((id) => ({ id, count: shoverAllies(id) }));
	if (counts[0].count !== counts[1].count) {
		return counts[0].count < counts[1].count ? counts[0].id : counts[1].id;
	}
	// else index+1 wrapping
	return world.sites[(idx + 1) % n].id;
}

/*
	resolve(state) -> new state with the resolution log filled in and board effects
	applied. Called only from commitOrders once both sides have committed.
*/
function resolve(state) {
	let s = {
		...state,
		staggered: {},
		wardedBy: {},
		snared: {},
		drainBonuses: {},
		resolutionLog: [...state.resolutionLog],
		board: cloneBoard(state.board),
	};

	// reveal all hidden creatures now that orders are locked in, EXCEPT ambushers reveal
	// only as they strike (handled per-act below); non-ambush hidden creatures reveal at
	// the start of resolution since orders are now public knowledge to narrate.
	const allEntries = allBoardEntries(s);
	allEntries.forEach((e) => {
		const action = orderedActionFor(s, e.player, e);
		if (e.hidden && action !== 'ambush') {
			e.hidden = false;
		}
	});

	let order_ = buildResolutionOrder(s, allBoardEntries(s));

	order_.forEach((item) => {
		const entry = findLiveEntry(s, item.entry.recordId);
		if (!entry || entry.routed) {
			return; // routed earlier this resolution, e.g. by an ambush or an earlier strike
		}
		const action = item.action;
		performAct(s, entry, action);
	});

	return s;
}

function cloneBoard(board) {
	const next = {};
	Object.keys(board).forEach((siteId) => {
		next[siteId] = {
			A: board[siteId].A.map((e) => ({ ...e })),
			B: board[siteId].B.map((e) => ({ ...e })),
		};
	});
	return next;
}

function findLiveEntry(state, recordId) {
	const found = findEntry(state, recordId);
	return found ? found.entry : null;
}

function performAct(state, entry, action) {
	const world = currentWorld(state);
	const entriesSnapshot = allBoardEntries(state).filter((e) => !e.routed);
	const prepared = prepareEntry(state, entry);
	const conduct = prepared.conduct;

	if (action === 'hold') {
		logEvent(state, { recordId: entry.recordId, action, outcome: 'held' });
		return;
	}

	// "snare: ... if it has not yet acted this resolution it loses its act." Acts are
	// processed strictly in resolution order, so if this entry is already snared by the
	// time its own turn comes up, an earlier act in the same resolution snared it before
	// it could act — it loses this act entirely.
	if (state.snared[entry.recordId]) {
		logEvent(state, { recordId: entry.recordId, action, outcome: 'lost-act-snared' });
		return;
	}

	const actClass = prepared.acts.find((a) => a.action === action)
		? prepared.acts.find((a) => a.action === action).class
		: null;
	const act = prepared.acts.find((a) => a.action === action) || { action, class: actClass, magnitude: 0, name: action };

	if (action === 'ward') {
		if (entry.hidden) {
			entry.hidden = false;
			logEvent(state, { recordId: entry.recordId, action, outcome: 'revealed' });
		}
		const target = pickSupportTarget(state, entry, conduct, entriesSnapshot);
		const targetId = target ? target.recordId : entry.recordId;
		state.wardedBy[targetId] = entry.recordId;
		logEvent(state, { recordId: entry.recordId, action, target: targetId, outcome: target ? 'warded-ally' : 'warded-self' });
		return;
	}

	if (action === 'mend') {
		const target = pickSupportTarget(state, entry, conduct, entriesSnapshot);
		if (target && state.staggered[target.recordId] && !state.snared[target.recordId]) {
			delete state.staggered[target.recordId];
			logEvent(state, { recordId: entry.recordId, action, target: target.recordId, outcome: 'mended' });
		} else {
			logEvent(state, { recordId: entry.recordId, action, target: target ? target.recordId : null, outcome: 'no-effect' });
		}
		return;
	}

	// survivor's supporting conduct ("itself") only matters for the support acts handled
	// above (ward/mend); an attacking act still uses the attacking conduct line normally.

	if (act.class === 'support' || action === 'terrorize') {
		if (action === 'terrorize') {
			const target = pickAttackTarget(state, entry, conduct, 'contact', entriesSnapshot)
				|| pickAttackTarget(state, entry, conduct, 'projection', entriesSnapshot);
			if (!target) {
				logEvent(state, { recordId: entry.recordId, action, outcome: 'no-target-held' });
				return;
			}
			if (state.wardedBy[target.recordId]) {
				delete state.wardedBy[target.recordId];
				logEvent(state, { recordId: entry.recordId, action, target: target.recordId, outcome: 'warded-absorbed' });
				return;
			}
			const targetPrepared = prepareEntry(state, target);
			if (targetPrepared.anchored) {
				logEvent(state, { recordId: entry.recordId, action, target: target.recordId, outcome: 'anchored-immune' });
				return;
			}
			if (state.snared[target.recordId]) {
				logEvent(state, { recordId: entry.recordId, action, target: target.recordId, outcome: 'snared-immune' });
				return;
			}
			withdrawEntryToRoster(state, target, 'terrorized');
			logEvent(state, { recordId: entry.recordId, action, target: target.recordId, outcome: 'terrorized' });
			return;
		}
	}

	// attacking acts: strike/crush/rake/lash/shove/snare/drain/ambush/beam/hurl/burst/spray/cloud
	if (action === 'snare') {
		const target = pickAttackTarget(state, entry, conduct, act.class, entriesSnapshot);
		if (!target) {
			logEvent(state, { recordId: entry.recordId, action, outcome: 'no-target-held' });
			return;
		}
		state.snared[target.recordId] = true;
		logEvent(state, { recordId: entry.recordId, action, target: target.recordId, outcome: 'snared' });
		return;
	}

	if (action === 'shove') {
		const target = pickAttackTarget(state, entry, conduct, act.class, entriesSnapshot);
		if (!target) {
			logEvent(state, { recordId: entry.recordId, action, outcome: 'no-target-held' });
			return;
		}
		if (state.wardedBy[target.recordId]) {
			delete state.wardedBy[target.recordId];
			logEvent(state, { recordId: entry.recordId, action, target: target.recordId, outcome: 'warded-absorbed' });
			return;
		}
		const targetPrepared = prepareEntry(state, target);
		if (targetPrepared.anchored) {
			logEvent(state, { recordId: entry.recordId, action, target: target.recordId, outcome: 'anchored-immune' });
			return;
		}
		if (state.snared[target.recordId]) {
			logEvent(state, { recordId: entry.recordId, action, target: target.recordId, outcome: 'snared-immune' });
			return;
		}
		const liveTarget = findLiveEntry(state, target.recordId);
		const newSiteId = neighborSiteId(world, liveTarget.siteId, liveTarget, entriesSnapshot);
		moveEntryToSite(state, liveTarget, newSiteId);
		logEvent(state, { recordId: entry.recordId, action, target: target.recordId, outcome: 'shoved', toSite: newSiteId });
		return;
	}

	if (AREA_ACTIONS.includes(action)) {
		const targetSiteId = pickAreaTargetSite(state, entry, act, entriesSnapshot);
		if (!targetSiteId) {
			logEvent(state, { recordId: entry.recordId, action, outcome: 'no-target-held' });
			return;
		}
		const everyone = entriesSnapshot.filter((e) => e.siteId === targetSiteId && e.recordId !== entry.recordId);
		everyone.forEach((victim) => {
			applyStrikeToTarget(state, entry, act, victim);
		});
		logEvent(state, { recordId: entry.recordId, action, site: targetSiteId, outcome: 'area-struck', hitCount: everyone.length });
		return;
	}

	// strike / crush / rake / lash / drain / ambush / beam / hurl — single-target strikes
	const target = pickAttackTarget(state, entry, conduct, act.class, entriesSnapshot);
	if (!target) {
		logEvent(state, { recordId: entry.recordId, action, outcome: 'no-target-held' });
		return;
	}
	if (entry.hidden && action === 'ambush') {
		entry.hidden = false;
	}
	if (state.wardedBy[target.recordId]) {
		delete state.wardedBy[target.recordId];
		logEvent(state, { recordId: entry.recordId, action, target: target.recordId, outcome: 'warded-absorbed' });
		return;
	}
	applyStrikeToTarget(state, entry, act, target, action === 'drain');
	const afterOutcome = state._lastStrikeOutcome;
	logEvent(state, { recordId: entry.recordId, action, target: target.recordId, outcome: afterOutcome });
}

function pickAreaTargetSite(state, entry, act, entriesSnapshot) {
	const opponent = otherPlayer(entry.player);
	const world = currentWorld(state);
	const enemySites = new Set(entriesSnapshot.filter((e) => e.player === opponent).map((e) => e.siteId));
	if (enemySites.size === 0) {
		return null;
	}
	// most creatures present (both sides), i.e. the stacked site the doc frames burst/
	// spray/cloud as answering
	let best = null;
	let bestCount = -1;
	world.sites.forEach((site) => {
		if (!enemySites.has(site.id)) {
			return;
		}
		const count = entriesSnapshot.filter((e) => e.siteId === site.id).length;
		if (count > bestCount) {
			bestCount = count;
			best = site.id;
		}
	});
	return best;
}

function applyStrikeToTarget(state, actorEntry, act, targetEntry, isDrain = false) {
	const liveTarget = findLiveEntry(state, targetEntry.recordId);
	if (!liveTarget || liveTarget.routed) {
		state._lastStrikeOutcome = 'target-already-gone';
		return;
	}
	const targetPrepared = prepareEntry(state, liveTarget);
	const currentHold = currentHoldOf(state, liveTarget);
	const magnitude = magnitudeAgainst(actorEntry.record, act, liveTarget.record);

	const staggerFraction = targetPrepared.armored ? ARMORED_STAGGER_FRACTION : STAGGER_FRACTION;
	const routFraction = targetPrepared.armored ? ARMORED_ROUT_FRACTION : ROUT_FRACTION;

	const alreadyStaggered = !!state.staggered[liveTarget.recordId];

	if (magnitude < currentHold * staggerFraction) {
		state._lastStrikeOutcome = 'shrugged';
		return;
	}

	// "a staggered target hit again at half or more of its current hold is routed" — this
	// is checked before the plain rout threshold so an already-staggered target routs at
	// the (lower) stagger threshold on a second qualifying hit, per the design doc.
	if (alreadyStaggered && magnitude >= currentHold * staggerFraction) {
		if (targetPrepared.anchored) {
			state._lastStrikeOutcome = 'anchored-immune';
			return;
		}
		routEntry(state, liveTarget);
		state._lastStrikeOutcome = 'routed';
		// drain's "half of what the target lost" is the whole remaining hold, since the
		// target is removed entirely.
		if (isDrain) {
			applyDrainBonus(state, actorEntry, currentHold * 0.5);
		}
		return;
	}

	if (magnitude >= currentHold * routFraction) {
		if (targetPrepared.anchored) {
			state._lastStrikeOutcome = 'anchored-immune';
			return;
		}
		routEntry(state, liveTarget);
		state._lastStrikeOutcome = 'routed';
		if (isDrain) {
			applyDrainBonus(state, actorEntry, currentHold * 0.5);
		}
		return;
	}

	// staggered: the target loses half its current hold (STAGGER_FRACTION of it) for the
	// rest of the round
	state.staggered[liveTarget.recordId] = true;
	state._lastStrikeOutcome = 'staggered';
	if (isDrain) {
		applyDrainBonus(state, actorEntry, currentHold * STAGGER_FRACTION * 0.5);
	}
}

// drain: "a strike whose successful stagger also raises the drainer's hold by half of
// what the target lost" — recorded as a per-round hold bonus, folded into
// currentHoldOf() via state.drainBonuses, since hold is otherwise always recomputed
// fresh from the record rather than stored.
function applyDrainBonus(state, actorEntry, bonus) {
	if (!state.drainBonuses) {
		state.drainBonuses = {};
	}
	state.drainBonuses[actorEntry.recordId] = (state.drainBonuses[actorEntry.recordId] || 0) + bonus;
}

// Marks an entry routed (removed from the site, out of the expedition for the rest of
// the match, returned to its owner's roster only after the match ends — the design doc:
// "Routed creatures are out of the expedition but are yours again after the match").
function routEntry(state, entry) {
	entry.routed = true;
	state.board[entry.siteId][entry.player] = state.board[entry.siteId][entry.player].filter(
		(e) => e.recordId !== entry.recordId,
	);
	const p = state.players[entry.player];
	state.players[entry.player] = { ...p, routed: [...p.routed, entry.recordId] };
}

function withdrawEntryToRoster(state, entry, reason) {
	const liveEntry = findLiveEntry(state, entry.recordId);
	if (!liveEntry) {
		return;
	}
	state.board[liveEntry.siteId][liveEntry.player] = state.board[liveEntry.siteId][liveEntry.player].filter(
		(e) => e.recordId !== liveEntry.recordId,
	);
	const p = state.players[liveEntry.player];
	state.players[liveEntry.player] = { ...p, roster: [...p.roster, liveEntry.record] };
}

// ---------------------------------------------------------------------------
// Judge phase
// ---------------------------------------------------------------------------

function judge(state) {
	const world = currentWorld(state);
	let s = { ...state, players: { ...state.players }, board: cloneBoard(state.board) };

	// resilient recovers from stagger at Judge, before hold is counted
	allBoardEntries(s).forEach((e) => {
		const prepared = prepareEntry(s, e);
		if (prepared.resilient && s.staggered[e.recordId]) {
			delete s.staggered[e.recordId];
		}
	});

	const siteResults = {};
	world.sites.forEach((site) => {
		const holdA = s.board[site.id].A.reduce((sum, e) => sum + currentHoldOf(s, e), 0);
		const holdB = s.board[site.id].B.reduce((sum, e) => sum + currentHoldOf(s, e), 0);
		let winner = null;
		if (holdA > holdB) {
			winner = 'A';
		} else if (holdB > holdA) {
			winner = 'B';
		}
		siteResults[site.id] = { holdA, holdB, winner };
	});

	['A', 'B'].forEach((player) => {
		const opponent = otherPlayer(player);
		world.sites.forEach((site) => {
			const result = siteResults[site.id];
			const entries = s.board[site.id][player];
			if (result.winner === player) {
				s.players[player] = { ...s.players[player], holding: [...s.players[player].holding, ...entries.map((e) => e.recordId)], sitesWon: s.players[player].sitesWon + 1 };
			} else {
				// lost or tied (tie reverts to the Court): withdraw
				s.players[player] = { ...s.players[player], withdrawn: [...s.players[player].withdrawn, ...entries.map((e) => e.recordId)] };
			}
		});
	});

	const bannerLog = { round: state.worldIndex, siteResults };
	s.resolutionLog = [...s.resolutionLog, { type: 'judge', ...bannerLog }];

	const sitesWonA = s.players.A.sitesWon;
	const sitesWonB = s.players.B.sitesWon;

	const clinched = sitesWonA >= SITES_TO_CLINCH || sitesWonB >= SITES_TO_CLINCH;
	const worldsExhausted = s.worldIndex >= WORLDS_PER_MATCH - 1;

	if (clinched || worldsExhausted) {
		const winner = decideMatchWinner(s);
		return { ...s, phase: 'matchEnd', winner, turn: null, matchEndReason: clinched ? 'clinched' : 'worlds-exhausted' };
	}

	const nextWorldIndex = s.worldIndex + 1;
	const nextWorld = s.worlds[nextWorldIndex];
	// the side holding fewer sites moves first on the next world (moving first is the
	// weaker seat, since the other side deploys with more information); equal: alternate
	const nextStarter = sitesWonA !== sitesWonB ? (sitesWonA < sitesWonB ? 'A' : 'B') : otherPlayer(s.starter);

	return {
		...s,
		worldIndex: nextWorldIndex,
		board: emptyBoardForWorld(nextWorld),
		staggered: {},
		wardedBy: {},
		snared: {},
		hidden: {},
		orders: { A: {}, B: {} },
		committed: { A: false, B: false },
		players: {
			A: { ...s.players.A, passed: false, firstPasser: false },
			B: { ...s.players.B, passed: false, firstPasser: false },
		},
		phase: 'deploy',
		starter: nextStarter,
		turn: nextStarter,
		lastJudgeResult: bannerLog,
	};
}

/*
	Match end tiebreak, per the design doc: "Equal sites held: the handler with more
	creatures still unsent wins; then the one who passed first in the final round; then
	the non-starter of the final round."
*/
function decideMatchWinner(state) {
	const sitesA = state.players.A.sitesWon;
	const sitesB = state.players.B.sitesWon;
	if (sitesA !== sitesB) {
		return sitesA > sitesB ? 'A' : 'B';
	}
	const rosterA = state.players.A.roster.length;
	const rosterB = state.players.B.roster.length;
	if (rosterA !== rosterB) {
		return rosterA > rosterB ? 'A' : 'B';
	}
	const firstPasserA = state.players.A.firstPasser;
	const firstPasserB = state.players.B.firstPasser;
	if (firstPasserA !== firstPasserB) {
		return firstPasserA ? 'A' : 'B';
	}
	return state.starter === 'A' ? 'B' : 'A';
}

// ---------------------------------------------------------------------------
// public state selector
// ---------------------------------------------------------------------------

/*
	getPublicState(state, handler) — hides the opponent's unsent roster contents (count
	only), the opponent's uncommitted orders, and hidden creatures' identity and site
	(shows that a hidden send happened this round and how many). Never exposes the seed.
*/
export function getPublicState(state, handler) {
	const opponent = otherPlayer(handler);
	const world = currentWorld(state);

	function sanitizeBoardSite(siteId) {
		const view = { A: [], B: [] };
		['A', 'B'].forEach((player) => {
			state.board[siteId][player].forEach((e) => {
				if (e.hidden && player === opponent) {
					return; // identity and site both hidden
				}
				view[player].push({
					recordId: e.recordId,
					record: e.record,
					sentIndex: e.sentIndex,
					hidden: e.hidden,
				});
			});
		});
		return view;
	}

	const board = {};
	world.sites.forEach((site) => {
		board[site.id] = sanitizeBoardSite(site.id);
	});

	const hiddenCountThisRound = (player) => {
		let count = 0;
		Object.values(state.board).forEach((siteBoard) => {
			count += siteBoard[player].filter((e) => e.hidden).length;
		});
		return count;
	};

	function viewOf(who, isSelf) {
		const p = state.players[who];
		const base = {
			rosterCount: p.roster.length,
			sentCount: p.sentCount,
			holding: p.holding,
			withdrawn: p.withdrawn,
			routed: p.routed,
			passed: p.passed,
			sitesWon: p.sitesWon,
			hiddenSentThisRound: hiddenCountThisRound(who),
		};
		if (isSelf) {
			return { ...base, roster: p.roster, orders: state.orders[who], committed: state.committed[who] };
		}
		return { ...base, committed: state.committed[who] };
	}

	return {
		worldIndex: state.worldIndex,
		world: { planet: world.planet, element: world.element, sites: world.sites },
		nextWorld: state.worldIndex + 1 < state.worlds.length ? {
			planet: state.worlds[state.worldIndex + 1].planet,
			element: state.worlds[state.worldIndex + 1].element,
		} : null,
		phase: state.phase,
		turn: state.turn,
		starter: state.starter,
		board,
		staggered: { ...state.staggered },
		wardedBy: { ...state.wardedBy },
		snared: { ...state.snared },
		resolutionLog: state.phase === 'judged' || state.phase === 'deploy' || state.phase === 'matchEnd' ? state.resolutionLog : [],
		winner: state.winner,
		you: handler,
		opponent,
		players: {
			[handler]: viewOf(handler, true),
			[opponent]: viewOf(opponent, false),
		},
	};
}

export { prepareEntry, currentWorld, siteById, allBoardEntries, boardEntriesFor, findEntry, currentHoldOf };
