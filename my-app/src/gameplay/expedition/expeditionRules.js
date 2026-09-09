/*
	Expedition - the pure rules state machine.

	Framework-free per docs/design/reclamation-design.md step 2 ("Engine: world and site
	model, hold and strain, the four-phase round, the sixteen acts, conduct, judging, the
	match. Pure state machine with tests, as before."). Every action function takes a
	state and returns a NEW state, or null on illegal input - the same contract the first
	design's tributeRules.js used, so the bot/tests/a future UI reducer can use a single
	"did this work" check.

	The engine takes `worlds` as an input to createMatch rather than importing sites.js
	itself, per the task's own guidance: the engine should not know where data lives.

	Since "The Proving" (docs/design/reclamation-design.md, 2026-09-04) a round is a
	FRAME: the Court's simulator loads WORLDS_PER_FRAME worlds side by side, each at one
	of its authored sites, chosen by the seed. A site on the table therefore carries its
	own `world` ({ planet, element, planet facts }), and every hold is computed against
	the site's world, never against a round-wide one. The engine keeps calling the
	contested unit a "site": it is one place on one world, and there are three of them
	in every frame.

	THE BASE REDESIGN (docs/design/reclamation-base-redesign.md, 2026-09-09). The round is
	Deploy, Resolve, Judge. There is no Orders phase and no per-creature order: a
	creature's act is fixed when it is sent (assumption 1), and the target is always
	derived by conduct, never named (assumption 2). Worlds are sealed, so nothing reaches
	past the site a creature stands at (assumption 3). Every creature is a hold and one
	role, strike, area, bolster or shield (assumption 4). Blows SUBTRACT from a mutable
	per-entry `currentHold` and a creature at or below zero is routed; no shrug, stagger
	or rout thresholds remain (assumption 5). "Staggered" survives only as the derived
	word for a creature hit and still standing (assumption 6).

	PHASES AND THE TRANSITION. Only two phases are ever observable from outside:
	'deploy' and 'matchEnd'. Resolve and Judge are not phases a caller sits in; they run
	inside pass(), in one step, the moment the second handler passes, exactly as
	commitOrders used to run them. There is therefore no advance(state) to call: a UI
	sends and passes, and when pass() returns a state whose frameIndex has moved (or
	whose phase is 'matchEnd') the round resolved, and the new events at the tail of
	`resolutionLog` plus `lastJudgeResult` are what it narrates.
*/

import {
	prepare, magnitudeAgainst, holdAtSite, targetMatchupMultiplier, traitKeywordsOf,
	roleOf, round1,
} from './creatureOnTable.js';
import {
	ROSTER_SIZE,
	SENDABLE,
	ROSTER_TRAILING_BONUS,
	RETURNED_SEND_COST,
	WORLDS_PER_MATCH,
	FRAMES_PER_MATCH,
	WORLDS_PER_FRAME,
	SITES_TO_CLINCH,
	HOLD_FLOOR,
	HOLD_CEILING,
	MAGNITUDE_SCALE,
	AREA_DISCOUNT,
	BOLSTER_FLOOR,
	HIDDEN_FIRST,
	ARMORED_REDUCTION,
	SHIELD_CAP,
	SHIELD_CAPS,
	ROLE,
} from './expeditionInterpretation.js';

// ---------------------------------------------------------------------------
// deterministic PRNG - mulberry32, identical implementation to the first design's
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

// the match's rules object, defaulted for any state built before the field existed
function rulesOf(state) {
	return (state && state.rules) || DEFAULT_RULES;
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
		if (!w || !Array.isArray(w.sites) || w.sites.length === 0) {
			throw new ExpeditionRuleError('INVALID_WORLD_SITES', `world[${i}] must have at least one site`);
		}
	});
}

function emptyBoardForFrame(frame) {
	const board = {};
	frame.sites.forEach((site) => {
		board[site.id] = { A: [], B: [] };
	});
	return board;
}

// the world as a site carries it: everything the world entry says except its site list
function worldFacts(world) {
	const { sites, ...facts } = world;
	return facts;
}

/*
	drawFrames(worlds, rngState) -> { frames, nextState }

	Shuffles the input worlds, takes WORLDS_PER_MATCH of them (no world repeats within a
	match), and deals them into FRAMES_PER_MATCH frames of WORLDS_PER_FRAME. For each
	world one of its authored sites is drawn, so the same nine worlds never make the same
	table twice: a frame is { index, sites: [site with .world] }, and a site on the table
	is the authored site plus the facts of the world it belongs to.
*/
function drawFrames(worlds, rngState) {
	let state = rngState;
	const { array: shuffledWorlds, nextState: afterShuffle } = shuffle(worlds, state);
	state = afterShuffle;
	const drawn = shuffledWorlds.slice(0, WORLDS_PER_MATCH);
	const frames = [];
	for (let f = 0; f < FRAMES_PER_MATCH; f++) {
		const sites = [];
		for (let w = 0; w < WORLDS_PER_FRAME; w++) {
			const world = drawn[f * WORLDS_PER_FRAME + w];
			const { value: siteIndex, nextState } = nextInt(state, world.sites.length);
			state = nextState;
			sites.push({ ...world.sites[siteIndex], world: worldFacts(world) });
		}
		frames.push({ index: f, sites });
	}
	return { frames, nextState: state };
}

/*
	createMatch({rosterA, rosterB, worlds, seed}) -> initial match state, phase 'deploy'
	on frame 1.

	Draws the frames (see drawFrames) and picks a random starter; "there is no Court
	Favor", so the only things decided randomly here are which worlds, at which sites, in
	which order, and who starts round 1.
*/
// ---------------------------------------------------------------------------
// the rules object: one ablation switch per lever
// ---------------------------------------------------------------------------

/*
	Every entry here is a rule or a tuning number the designer can move for one batch, so
	the simulator can measure what it is carrying (docs/design/game-validation-principles.md,
	"Ablation"; docs/design/reclamation-base-redesign.md assumption 15, which requires every
	tunable of the interpretation layer to be sweepable from here). DEFAULT_RULES is the
	game exactly as shipped, so a createMatch call that never mentions `rules` plays the
	ratified first settings.

	Ablation switches:
	- hiddenSends: false makes send(..., hidden=true) illegal, the way an illegal
	  recordId is illegal (send returns null).
	- lokiLine: false drops the return-to-roster on a LOST world, so a lost world is
	  withdrawn exactly like a tied one.
	- trailingBonus: the number of extra sends the trailing seat gets next round; 0
	  removes the lever without changing any other code path.
	- initiative: false resolves everything in sent order (sentIndex, the same tiebreak
	  buildResolutionOrder already falls back to) instead of by initiative.
	- hiddenFirst: false drops assumption 9, so a hidden creature's blow waits its turn in
	  initiative order like everyone else's.
	- roles: { area, bolster, shield } - a role switched off degrades every creature that
	  has it. An area becomes a plain strike; a presence becomes a plain holder, present at
	  the world and counted in its hold and nothing more (creatureOnTable.roleOf).

	Tuning numbers, all first settings from the base redesign's interpretation layer table:
	- holdFloor / holdCeiling: the hold compression (assumption 11).
	- magnitudeScale: the global rescale on every blow (assumption 12).
	- areaDiscount: an area's share of a strike's magnitude, per creature (assumption 5).
	- bolsterFloor: hold given to an ally already comfortable (assumption 8).
	- armoredReduction: the fraction taken off a blow against an armored creature.
	- shieldCap: how a cancel is priced, 'none' | 'ownHold' | 'half' (see resolveWorld's
	  shield step for what each does and why the lever exists).
*/
export const DEFAULT_RULES = {
	hiddenSends: true,
	lokiLine: true,
	trailingBonus: ROSTER_TRAILING_BONUS,
	initiative: true,
	hiddenFirst: HIDDEN_FIRST,
	roles: { area: true, bolster: true, shield: true },
	holdFloor: HOLD_FLOOR,
	holdCeiling: HOLD_CEILING,
	magnitudeScale: MAGNITUDE_SCALE,
	areaDiscount: AREA_DISCOUNT,
	bolsterFloor: BOLSTER_FLOOR,
	armoredReduction: ARMORED_REDUCTION,
	shieldCap: SHIELD_CAP,
};

// merges a caller's partial rules over the defaults, so a batch only names what it moves
function normalizeRules(rules) {
	const r = rules || {};
	const roles = (r && r.roles) || {};
	const num = (value, fallback) => (typeof value === 'number' ? value : fallback);
	return {
		hiddenSends: r.hiddenSends !== undefined ? !!r.hiddenSends : DEFAULT_RULES.hiddenSends,
		lokiLine: r.lokiLine !== undefined ? !!r.lokiLine : DEFAULT_RULES.lokiLine,
		trailingBonus: num(r.trailingBonus, DEFAULT_RULES.trailingBonus),
		initiative: r.initiative !== undefined ? !!r.initiative : DEFAULT_RULES.initiative,
		hiddenFirst: r.hiddenFirst !== undefined ? !!r.hiddenFirst : DEFAULT_RULES.hiddenFirst,
		roles: {
			area: roles.area !== undefined ? !!roles.area : true,
			bolster: roles.bolster !== undefined ? !!roles.bolster : true,
			shield: roles.shield !== undefined ? !!roles.shield : true,
		},
		holdFloor: num(r.holdFloor, DEFAULT_RULES.holdFloor),
		holdCeiling: num(r.holdCeiling, DEFAULT_RULES.holdCeiling),
		magnitudeScale: num(r.magnitudeScale, DEFAULT_RULES.magnitudeScale),
		areaDiscount: num(r.areaDiscount, DEFAULT_RULES.areaDiscount),
		bolsterFloor: num(r.bolsterFloor, DEFAULT_RULES.bolsterFloor),
		armoredReduction: num(r.armoredReduction, DEFAULT_RULES.armoredReduction),
		shieldCap: SHIELD_CAPS.includes(r.shieldCap) ? r.shieldCap : DEFAULT_RULES.shieldCap,
	};
}

export function createMatch({ rosterA, rosterB, worlds, seed, rules }) {
	validateRosterInput(rosterA, 'rosterA');
	validateRosterInput(rosterB, 'rosterB');
	validateWorldsInput(worlds);

	let rngState = createRngState(seed);

	const { frames, nextState: afterFrames } = drawFrames(worlds, rngState);
	rngState = afterFrames;

	const { value: starterRoll, nextState: afterStarter } = nextInt(rngState, 2);
	rngState = afterStarter;
	const starter = starterRoll === 0 ? 'A' : 'B';

	const playerState = (roster) => ({
		roster: roster.slice(), // records never sent; shrinks as records are sent
		sentCount: 0,
		holding: [], // record ids currently holding a won site (stay in that world's model)
		routed: [], // record ids routed out of the expedition (returned to owner post-match)
		withdrawn: [], // record ids withdrawn from lost/tied sites (out of the expedition)
		// The Loki line (Pass 2 lever): record ids back in `roster` after being withdrawn
		// from a LOST (not tied) world, whose NEXT send costs RETURNED_SEND_COST against the
		// sendable cap instead of 1. Cleared for a record the moment it is sent again.
		returned: [],
		passed: false,
		firstPasser: false,
		sitesWon: 0,
	});

	return {
		seed,
		rngState,
		rules: normalizeRules(rules),
		frames,
		frameIndex: 0,
		players: { A: playerState(rosterA), B: playerState(rosterB) },
		board: emptyBoardForFrame(frames[0]),
		vanguardRelocated: { A: false, B: false }, // per-frame: has this handler used its one relocate?
		trailingBonus: { A: 0, B: 0 }, // per-frame: extra sends the trailing seat gets this round only (ROSTER_TRAILING_BONUS)
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

function currentFrame(state) {
	return state.frames[state.frameIndex];
}

function siteById(frame, siteId) {
	return frame.sites.find((s) => s.id === siteId) || null;
}

// every creature-on-board entry across all sites for one player
function boardEntriesFor(state, player) {
	const frame = currentFrame(state);
	const entries = [];
	frame.sites.forEach((site) => {
		state.board[site.id][player].forEach((entry) => entries.push(entry));
	});
	return entries;
}

function allBoardEntries(state) {
	return [...boardEntriesFor(state, 'A'), ...boardEntriesFor(state, 'B')];
}

function findEntry(state, recordId) {
	const frame = currentFrame(state);
	for (const site of frame.sites) {
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
// the same side at the same site. A creature still hidden is not company anyone can stand
// with, so it is left out until it reveals at Resolve.
function siteCompanions(state, site, player, excludingRecordId) {
	return state.board[site.id][player].filter(
		(e) => e.recordId !== excludingRecordId && !e.hidden && !e.routed,
	);
}

// the role a board entry actually plays under this match's rules (a role switched off by
// rules.roles degrades, see creatureOnTable.roleOf)
function roleOfEntry(state, entry) {
	return roleOf(entry.record, rulesOf(state));
}

/*
	Bolster (docs/design/reclamation-base-redesign.md assumption 8): while a bolsterer
	stands at a site, every ally there, the bolsterer included, has its hold recomputed
	with one grade less strain, and an ally already comfortable gains rules.bolsterFloor.
	Bolsters never stack: one bolsterer and three bolsterers lift exactly one grade. A
	bolsterer still hidden does not bolster, for the same reason it is not company.
*/
function bolsterAtSite(state, site, player) {
	return state.board[site.id][player].some(
		(e) => !e.hidden && !e.routed && roleOfEntry(state, e) === ROLE.BOLSTER,
	);
}

// the hold options for one entry: pack/solitary company, bolster, and the match rules
function holdOptionsFor(state, entry, site) {
	const companions = siteCompanions(state, site, entry.player, entry.recordId);
	return {
		packBondedKinAtSite: companions.filter((c) => c.record.species === entry.record.species).length,
		solitaryAlliesAtSite: companions.length,
		bolstered: bolsterAtSite(state, site, entry.player),
		rules: rulesOf(state),
	};
}

/*
	recomputeHoldsAtSite(state, site) - mutates the entries at one site in place.

	Assumption 5 makes `currentHold` a real number on the entry, set at arrival and
	reduced by blows. `fullHold` is what the creature would hold if it had taken nothing;
	`damage` is what has been taken off it this round; `currentHold` is the difference.
	Splitting it this way is what lets the site be recomputed whenever its company changes
	(an arrival, a departure, a rout) without either forgetting damage already dealt or
	double-counting it, which assumption 8 requires of bolster.
*/
function recomputeHoldsAtSite(state, site) {
	['A', 'B'].forEach((player) => {
		state.board[site.id][player].forEach((entry) => {
			if (entry.routed) {
				return;
			}
			const { value } = holdAtSite(entry.record, site, site.world, holdOptionsFor(state, entry, site));
			entry.fullHold = round1(value);
			entry.damage = round1(entry.damage || 0);
			entry.currentHold = round1(entry.fullHold - entry.damage);
			entry.role = roleOfEntry(state, entry);
			entry.bolstered = bolsterAtSite(state, site, entry.player);
			// "staggered" is only the word for a creature hit and still standing
			// (assumption 6); it is derived, never stored as a status
			entry.staggered = entry.damage > 0 && entry.currentHold > 0;
		});
	});
}

// every site of the current frame, recomputed. Returns a NEW state with a cloned board,
// so the deploy-phase action functions keep their "return a new state" contract.
function withRecomputedHolds(state) {
	const next = { ...state, board: cloneBoard(state.board) };
	currentFrame(next).sites.forEach((site) => recomputeHoldsAtSite(next, site));
	return next;
}

// ---------------------------------------------------------------------------
// legality: sendable creatures
// ---------------------------------------------------------------------------

// The sendable cap for a round: SENDABLE, plus ROSTER_TRAILING_BONUS for the round
// immediately after a round this player finished trailing on worlds held (Pass 2's
// trailing-seat compensation - see judge()'s trailingBonus computation). state.trailingBonus
// is per-frame and defaults to 0 for both sides on frame 1 and whenever the two sides are
// level, so a match that never trails plays exactly as it did before this lever shipped.
function sendableCapFor(state, player) {
	const bonus = (state.trailingBonus && state.trailingBonus[player]) || 0;
	return SENDABLE + bonus;
}

// the send cost for one record: RETURNED_SEND_COST if it is flagged `returned` (the Loki
// line - a creature back in the roster after its world was lost), 1 otherwise.
function sendCostFor(playerState, recordId) {
	return (playerState.returned || []).includes(recordId) ? RETURNED_SEND_COST : 1;
}

function sendableRoster(playerState, cap) {
	if (playerState.sentCount >= cap) {
		return [];
	}
	const remaining = cap - playerState.sentCount;
	return playerState.roster.filter((r) => sendCostFor(playerState, r.id) <= remaining);
}

export function hasLegalSend(state, player) {
	if (state.phase != 'deploy') {
		return false;
	}
	const p = state.players[player];
	if (p.passed) {
		return false;
	}
	return sendableRoster(p, sendableCapFor(state, player)).length > 0;
}

// ---------------------------------------------------------------------------
// Deploy phase
// ---------------------------------------------------------------------------

function isPlayersDeployTurn(state, player) {
	return state.phase === 'deploy' && state.turn === player;
}

/*
	send(state, handler, recordId, siteId, hidden=false)

	Only in deploy, only on your turn, only if fewer than the round's sendable cap (SENDABLE,
	plus ROSTER_TRAILING_BONUS if this player is compensated as this round's trailing seat)
	sent so far by you, hidden only if the creature is stealthy. Any number of creatures may
	stand at a site.
*/
export function send(state, handler, recordId, siteId, hidden = false) {
	if (!isPlayersDeployTurn(state, handler)) {
		return null;
	}
	const p = state.players[handler];
	if (p.passed) {
		return null;
	}
	const record = p.roster.find((r) => r.id === recordId);
	if (!record) {
		return null;
	}
	// the Loki line: a returned creature's send costs RETURNED_SEND_COST against the cap,
	// not 1 - illegal if there is not enough of the round's cap left for it.
	const cost = sendCostFor(p, recordId);
	if (p.sentCount + cost > sendableCapFor(state, handler)) {
		return null;
	}
	const frame = currentFrame(state);
	const site = siteById(frame, siteId);
	if (!site) {
		return null;
	}
	if (hidden) {
		// the hiddenSends ablation makes every hidden send illegal, the same null-return
		// way a non-stealthy creature's hidden send has always been illegal
		if (!rulesOf(state).hiddenSends) {
			return null;
		}
		if (!traitKeywordsOf(record).includes('stealthy')) {
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
		// filled in by recomputeHoldsAtSite immediately below, and again whenever the
		// company at this site changes
		fullHold: 0,
		currentHold: 0,
		damage: 0,
		role: roleOf(record, rulesOf(state)),
		staggered: false,
		bolstered: false,
	};

	const nextRoster = p.roster.filter((r) => r.id !== recordId);
	const nextReturned = p.returned.filter((id) => id !== recordId);
	const nextPlayers = {
		...state.players,
		[handler]: { ...p, roster: nextRoster, returned: nextReturned, sentCount: p.sentCount + cost },
	};

	const nextBoard = {
		...state.board,
		[siteId]: {
			...state.board[siteId],
			[handler]: [...state.board[siteId][handler], entry],
		},
	};

	let nextState = withRecomputedHolds({ ...state, players: nextPlayers, board: nextBoard });
	return advanceDeployTurn(nextState, handler);
}

/*
	pass(state, handler) - permanent for the round. When both have passed the round
	RESOLVES and is JUDGED in this one call (see the phase note in the file header), so
	the state that comes back is either the next round's deploy or 'matchEnd'.
*/
export function pass(state, handler) {
	if (!isPlayersDeployTurn(state, handler)) {
		return null;
	}
	const p = state.players[handler];
	if (p.passed) {
		return null;
	}
	// the first to pass this world is recorded for the end-of-match tiebreak
	const firstPasser = !state.players[otherPlayer(handler)].passed;
	const nextPlayers = { ...state.players, [handler]: { ...p, passed: true, firstPasser } };
	let nextState = { ...state, players: nextPlayers };

	const bothPassed = nextState.players.A.passed && nextState.players.B.passed;
	if (bothPassed) {
		return runResolveAndJudge(nextState);
	}
	return advanceDeployTurnAfterPass(nextState, handler);
}

// the deploy end: Resolve then Judge, in one step, exactly as commitOrders used to run
// them before the Orders phase was removed (assumption 1).
function runResolveAndJudge(state) {
	return judge(resolve({ ...state, phase: 'resolve', turn: null }));
}

/*
	relocateVanguard(state, handler, siteId)

	"The vanguard falls back": once per world, during Deploy, on their own turn and
	before they have passed, the round's starter may relocate the FIRST creature they
	sent this frame to a different site of the same frame. Does NOT consume the turn  - 
	the handler still sends or passes afterward on that same turn. The creature keeps its
	sentIndex and hidden flag; hold/strain/everything else is recomputed for the new site
	at resolution as usual, since nothing is stored on the entry beyond siteId.

	Illegal if: the handler is not this world's starter, phase is not deploy, it is not
	their turn, they have passed, they have already relocated this world, the first-sent
	creature is no longer on the board (guarded defensively; it cannot actually leave the
	board during deploy), or the target site is the one it already stands on.
*/
export function relocateVanguard(state, handler, siteId) {
	if (state.starter !== handler) {
		return null;
	}
	if (!isPlayersDeployTurn(state, handler)) {
		return null;
	}
	const p = state.players[handler];
	if (p.passed) {
		return null;
	}
	if (state.vanguardRelocated[handler]) {
		return null;
	}
	const frame = currentFrame(state);
	const site = siteById(frame, siteId);
	if (!site) {
		return null;
	}

	// "the first creature they sent this world" - the board only ever holds creatures
	// sent on the CURRENT world (judge() gives every frame a fresh empty board), so this
	// is simply the handler's own board entry with the lowest sentIndex.
	const ownEntries = boardEntriesFor(state, handler);
	if (ownEntries.length === 0) {
		return null; // defensive: cannot happen during deploy (send() puts it there first)
	}
	const vanguard = ownEntries.reduce((earliest, e) => (!earliest || e.sentIndex < earliest.sentIndex ? e : earliest), null);
	if (vanguard.siteId === siteId) {
		return null;
	}

	const relocated = { ...vanguard, siteId };
	// hold is recomputed at both sites below, since the company of each has changed
	const nextBoard = {
		...state.board,
		[vanguard.siteId]: {
			...state.board[vanguard.siteId],
			[handler]: state.board[vanguard.siteId][handler].filter((e) => e.recordId !== vanguard.recordId),
		},
	};
	nextBoard[siteId] = {
		...nextBoard[siteId],
		[handler]: [...nextBoard[siteId][handler], relocated],
	};

	const nextVanguardRelocated = { ...state.vanguardRelocated, [handler]: true };
	const nextResolutionLog = [...state.resolutionLog, {
		type: 'vanguard-relocate',
		recordId: relocated.recordId,
		handler,
		fromSite: vanguard.siteId,
		toSite: siteId,
		hidden: relocated.hidden,
	}];

	// turn is deliberately NOT advanced: the handler still sends or passes on this turn
	return withRecomputedHolds({
		...state,
		board: nextBoard,
		vanguardRelocated: nextVanguardRelocated,
		resolutionLog: nextResolutionLog,
	});
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
				return runResolveAndJudge(s);
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
			return runResolveAndJudge(s);
		}
		s = { ...s, turn: otherPlayer(current) };
	}
	return s;
}

// ---------------------------------------------------------------------------
// conduct target selection (docs/design/reclamation-base-redesign.md assumption 2: the
// player never names a target; conduct picks it from the board as it stands at Resolve)
// ---------------------------------------------------------------------------

function isAlive(entry) {
	return !entry.routed;
}

// Sealed worlds (assumption 3): a blow only ever reaches creatures at its own site. The
// old contact/reach/projection distinction bought nothing once no act reached further
// than the site, so it is gone from targeting entirely.
function enemiesAtSite(entry, entriesSnapshot) {
	const opponent = otherPlayer(entry.player);
	return entriesSnapshot.filter((e) => e.player === opponent && e.siteId === entry.siteId && isAlive(e));
}

/*
	currentHoldOf(state, entry) -> the entry's hold right now, after strain, home ground,
	company and bolster, minus everything blows have taken off it this round
	(assumption 5). Kept as a function, rather than read off the entry everywhere, so a
	caller holding a state built before the round started still gets a number.
*/
function currentHoldOf(state, e) {
	if (typeof e.currentHold === 'number') {
		return e.currentHold;
	}
	const frame = currentFrame(state);
	const site = siteById(frame, e.siteId);
	const { value } = holdAtSite(e.record, site, site.world, holdOptionsFor(state, e, site));
	return round1(value);
}

// "menacing creatures draw attacks aimed at their site's weakest ally to themselves."
// Applied as a final redirect once a candidate target is chosen: if the chosen target is
// the weakest-held creature at its site (by its own side's holds) and a menacing
// companion stands at that same site, the blow redirects to the menacing companion.
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
	if (candidateHold !== weakestHold) {
		return candidate;
	}
	const menacer = withHold.find((c) => c.entry.recordId !== candidate.recordId && c.prepared.menacing);
	return menacer ? menacer.entry : candidate;
}

function pickAttackTarget(state, entry, conduct, entriesSnapshot) {
	const candidates = enemiesAtSite(entry, entriesSnapshot).map((e) => ({
		...e,
		_hold: currentHoldOf(state, e),
		_magnitude: prepareEntry(state, e).blowMagnitude,
		_initiative: prepareEntry(state, e).initiative,
		_staggered: !!e.staggered,
	}));
	if (candidates.length === 0) {
		return null;
	}

	const prepared = prepareEntry(state, entry);
	let chosen = null;
	switch (conduct.attacking) {
		case 'weakestEnemyInReach': {
			// "staggered" is now simply "already hit and still standing" (assumption 6)
			const hurt = candidates.filter((c) => c._staggered);
			const pool = hurt.length > 0 ? hurt : candidates;
			chosen = pool.reduce((best, c) => (!best || c._hold < best._hold ? c : best), null);
			break;
		}
		case 'strongestEnemyInReach':
			chosen = candidates.reduce((best, c) => (!best || c._hold > best._hold ? c : best), null);
			break;
		case 'enemySentEarliest':
			chosen = candidates.reduce((best, c) => (!best || c.sentIndex < best.sentIndex ? c : best), null);
			break;
		case 'enemyThreateningWeakestAlly':
			// sealed worlds (assumption 3) leave only this site's allies to protect, so the
			// old "candidates at the weakest ally's site" filter collapses to "the hardest
			// enemy standing here", which is the enemy threatening every ally at once
			chosen = candidates.reduce((best, c) => (!best || c._hold > best._hold ? c : best), null);
			break;
		case 'enemyWithLowestMagnitude':
			chosen = candidates.reduce((best, c) => (!best || c._magnitude < best._magnitude ? c : best), null);
			break;
		case 'slowerEnemyWeakestFirst': {
			const slower = candidates.filter((c) => c._initiative < prepared.initiative);
			const pool = slower.length > 0 ? slower : candidates;
			chosen = pool.reduce((best, c) => (!best || c._hold < best._hold ? c : best), null);
			break;
		}
		case 'enemyMostVulnerableToElement':
			chosen = pickMostVulnerableToElement(entry, candidates);
			break;
		case 'enemyWithHighestMagnitude':
			chosen = candidates.reduce((best, c) => (!best || c._magnitude > best._magnitude ? c : best), null);
			break;
		case 'enemyRoutableElseWeakest': {
			// subtraction makes "routable" exact: the blow this creature would land on
			// that target is at least the target's whole remaining hold (assumption 5)
			const routable = candidates.filter((c) => blowAmountAgainst(state, entry, prepared, c) >= c._hold);
			const pool = routable.length > 0 ? routable : candidates;
			chosen = pool.reduce((best, c) => (!best || c._hold < best._hold ? c : best), null);
			break;
		}
		default:
			chosen = candidates.reduce((best, c) => (!best || c.sentIndex < best.sentIndex ? c : best), null);
	}

	// temperament: high boldness prefers the stronger of two close candidates, low
	// boldness the weaker, high sociability prefers kin - a tiebreak nudge among
	// candidates that tie the chosen hold.
	const conductView = prepared.conduct;
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
	// the high-curiosity cross-site preference is gone with the sealed worlds
	// (assumption 3): there is no other site to prefer.

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

// ---------------------------------------------------------------------------
// prepared-entry view
// ---------------------------------------------------------------------------

function prepareEntry(state, entry) {
	const frame = currentFrame(state);
	const site = siteById(frame, entry.siteId);
	return prepare(entry.record, site, site.world, entry.sentIndex, holdOptionsFor(state, entry, site));
}

// ---------------------------------------------------------------------------
// Resolve phase
// ---------------------------------------------------------------------------

function logEvent(state, event) {
	state.resolutionLog.push(event);
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

/*
	buildResolutionOrder(state, entries) -> entries in the order their blows land at one
	world.

	Hidden first (assumption 9): a creature sent hidden strikes before everyone else at
	its world, in initiative order among the hidden. Then the rest, by initiative, with
	strained creatures last, ties to the earlier send. The initiative ablation resolves
	purely in sent order, and the hiddenFirst ablation drops the hidden group entirely so
	a hidden creature waits its turn like anyone else.
*/
function buildResolutionOrder(state, entries) {
	const rules = rulesOf(state);
	const withMeta = entries.map((e) => {
		const prepared = prepareEntry(state, e);
		return {
			entry: e,
			initiative: prepared.initiative,
			strained: prepared.strainLevel !== 'none',
			hidden: !!e.wasHidden,
		};
	});

	const useInitiative = rules.initiative;
	function byInitiativeThenSent(x, y) {
		if (!useInitiative) {
			return x.entry.sentIndex - y.entry.sentIndex;
		}
		if (x.strained !== y.strained) {
			return x.strained ? 1 : -1;
		}
		if (y.initiative !== x.initiative) {
			return y.initiative - x.initiative;
		}
		return x.entry.sentIndex - y.entry.sentIndex;
	}

	if (!rules.hiddenFirst) {
		return withMeta.slice().sort(byInitiativeThenSent);
	}
	const hidden = withMeta.filter((m) => m.hidden).sort(byInitiativeThenSent);
	const rest = withMeta.filter((m) => !m.hidden).sort(byInitiativeThenSent);
	return [...hidden, ...rest];
}

/*
	blowAmountAgainst(state, actorEntry, preparedActor, targetEntry) -> number

	One blow's magnitude against one creature: the actor's single blow (its favored
	attacking ability, already scaled by strain and by rules.magnitudeScale in
	creatureOnTable.buildActs), times the element matchup against that target, times
	rules.areaDiscount when the actor is an area, less rules.armoredReduction when the
	target is armored.
*/
function blowAmountAgainst(state, actorEntry, preparedActor, targetEntry) {
	const rules = rulesOf(state);
	const blow = preparedActor.blow;
	if (!blow) {
		return 0;
	}
	let amount = magnitudeAgainst(actorEntry.record, blow, targetEntry.record);
	if (preparedActor.role === ROLE.AREA) {
		amount *= rules.areaDiscount;
	}
	if (traitKeywordsOf(targetEntry.record).includes('armored')) {
		amount *= 1 - rules.armoredReduction;
	}
	return round1(Math.max(0, amount));
}

/*
	resolve(state) -> new state with the resolution log filled in and the board's holds
	moved. Called only from runResolveAndJudge once both handlers have passed.

	Every hidden creature reveals here, before holds are recomputed, so a hidden send
	counts as company and as a bolster from the moment resolution starts. Which creatures
	WERE hidden is kept on `wasHidden` for the ordering and the log.
*/
function resolve(state) {
	const s = {
		...state,
		resolutionLog: [...state.resolutionLog],
		board: cloneBoard(state.board),
	};

	allBoardEntries(s).forEach((e) => {
		e.wasHidden = !!e.hidden;
		e.hidden = false;
	});
	currentFrame(s).sites.forEach((site) => recomputeHoldsAtSite(s, site));

	currentFrame(s).sites.forEach((site) => resolveWorld(s, site));

	return s;
}

/*
	resolveWorld(state, site) - one world's resolution, in three steps.

	1. DECLARE. With every creature present and its hold settled, each blow creature
	   picks its conduct target (or, for an area, its victims) and its amount. Assumption
	   7 requires this: shields cancel a blow that has been DECLARED, so the declaration
	   has to happen before anything lands.
	2. SHIELD. For each side, each shielder standing there cancels the largest blow
	   declared against its own side, one blow per shielder. Against an area it cancels
	   the area's effect on its own side only, so the other side still takes it.
	3. LAND. The blows land in resolution order (hidden first, then initiative, strained
	   last). A blow whose striker has already been routed does not land, which is what
	   keeps initiative meaningful.
*/
function resolveWorld(state, site) {
	const rules = rulesOf(state);
	const present = ['A', 'B'].reduce((all, player) => all.concat(state.board[site.id][player].filter(isAlive)), []);
	if (present.length === 0) {
		return;
	}
	const order = buildResolutionOrder(state, present);

	// ---- 1. declare ----
	const declarations = [];
	order.forEach((item) => {
		const entry = item.entry;
		const prepared = prepareEntry(state, entry);
		if (prepared.role !== ROLE.STRIKE && prepared.role !== ROLE.AREA) {
			return;
		}
		if (prepared.role === ROLE.STRIKE) {
			const target = pickAttackTarget(state, entry, prepared.conduct, present);
			declarations.push({
				entry,
				role: ROLE.STRIKE,
				hidden: item.hidden,
				target: target || null,
				amount: target ? blowAmountAgainst(state, entry, prepared, target) : 0,
				cancelledAgainst: {},
			});
			return;
		}
		// an area removes a reduced magnitude from every OTHER creature at the world,
		// both sides; the actor is the one creature its own cloud does not catch
		const victims = present
			.filter((e) => e.recordId !== entry.recordId)
			.map((victim) => ({ victim, amount: blowAmountAgainst(state, entry, prepared, victim) }));
		declarations.push({
			entry,
			role: ROLE.AREA,
			hidden: item.hidden,
			victims,
			amount: round1(prepared.blowMagnitude * rules.areaDiscount),
			cancelledAgainst: {},
		});
	});

	// ---- 2. shield ----
	/*
		A shielder cancels the largest blow declared against its own side, once per round
		(assumption 7). rules.shieldCap prices that cancel, since a free cancel of any size
		measured as the strongest thing a creature can be (shield keeper win rate 67.7
		percent against the 40 to 60 band, validation 2026-09-09):

		- 'none':    the whole blow is cancelled, whatever its size. The first setting.
		- 'ownHold': the shielder cancels at most its OWN current hold of the blow; the
		             remainder lands on the original target. A small creature can only
		             absorb a small blow.
		- 'half':    the whole blow is cancelled, but the shielder takes half the cancelled
		             amount itself, and can be routed by it.

		Cancellation is stored as a FRACTION per side, so an area caught by an 'ownHold'
		shield is reduced proportionally across that side's victims rather than being all
		or nothing.
	*/
	function amountAgainstSide(declaration, side) {
		if (declaration.cancelledAgainst[side]) {
			return 0;
		}
		if (declaration.role === ROLE.STRIKE) {
			return declaration.target && declaration.target.player === side ? declaration.amount : 0;
		}
		return declaration.victims
			.filter((v) => v.victim.player === side)
			.reduce((sum, v) => sum + v.amount, 0);
	}

	['A', 'B'].forEach((side) => {
		const shielders = order
			.map((item) => item.entry)
			.filter((e) => e.player === side && prepareEntry(state, e).role === ROLE.SHIELD);
		shielders.forEach((shielderEntry) => {
			const shielder = findLiveEntry(state, shielderEntry.recordId);
			if (!shielder || shielder.routed) {
				return; // routed by an earlier shielder's own half-share
			}
			let best = null;
			let bestAmount = 0;
			declarations.forEach((declaration) => {
				const amount = amountAgainstSide(declaration, side);
				if (amount > bestAmount) {
					bestAmount = amount;
					best = declaration;
				}
			});
			if (!best) {
				logEvent(state, {
					type: 'shield', recordId: shielder.recordId, site: site.id, cancelled: null,
					amount: 0, fraction: 0, selfDamage: 0,
				});
				return;
			}

			const cap = rules.shieldCap;
			let fraction = 1;
			if (cap === 'ownHold') {
				fraction = Math.min(1, shielder.currentHold / bestAmount);
			}
			const cancelledAmount = round1(bestAmount * fraction);
			best.cancelledAgainst[side] = { recordId: shielder.recordId, fraction };

			let selfDamage = 0;
			let selfOutcome = null;
			if (cap === 'half' && cancelledAmount > 0) {
				selfDamage = round1(cancelledAmount / 2);
				const result = applyBlow(state, site, shielder, selfDamage);
				selfOutcome = result.outcome;
			}

			logEvent(state, {
				type: 'shield',
				recordId: shielder.recordId,
				site: site.id,
				cancelled: best.entry.recordId,
				amount: cancelledAmount,
				fraction: round1(fraction),
				selfDamage,
				selfOutcome,
			});
		});
	});

	// ---- 3. land ----
	declarations.forEach((declaration) => {
		const striker = findLiveEntry(state, declaration.entry.recordId);
		if (!striker || striker.routed) {
			logEvent(state, {
				type: 'blow',
				recordId: declaration.entry.recordId,
				role: declaration.role,
				site: site.id,
				target: declaration.role === ROLE.STRIKE && declaration.target ? declaration.target.recordId : null,
				amount: 0,
				remaining: null,
				outcome: 'lapsed',
				hidden: declaration.hidden,
				cancelled: false,
			});
			return;
		}
		if (declaration.role === ROLE.STRIKE) {
			landStrike(state, site, declaration);
			return;
		}
		landArea(state, site, declaration);
	});
}

function landStrike(state, site, declaration) {
	const base = {
		type: 'blow',
		recordId: declaration.entry.recordId,
		role: ROLE.STRIKE,
		site: site.id,
		hidden: declaration.hidden,
	};
	if (!declaration.target) {
		logEvent(state, { ...base, target: null, amount: 0, remaining: null, outcome: 'no-target', cancelled: false });
		return;
	}
	const targetSide = declaration.target.player;
	const cut = declaration.cancelledAgainst[targetSide];
	// a partial cancel (rules.shieldCap 'ownHold') leaves a remainder that still lands
	const landing = round1(declaration.amount * (1 - (cut ? cut.fraction : 0)));
	if (cut && landing <= 0) {
		logEvent(state, {
			...base,
			target: declaration.target.recordId,
			amount: declaration.amount,
			remaining: null,
			outcome: 'cancelled',
			cancelled: true,
		});
		return;
	}
	const live = findLiveEntry(state, declaration.target.recordId);
	if (!live || live.routed) {
		logEvent(state, {
			...base, target: declaration.target.recordId, amount: 0, remaining: null, outcome: 'no-target', cancelled: false,
		});
		return;
	}
	const { remaining, outcome } = applyBlow(state, site, live, landing);
	logEvent(state, {
		...base, target: live.recordId, amount: landing, remaining, outcome, cancelled: !!cut,
	});
}

function landArea(state, site, declaration) {
	const cancelledSides = Object.keys(declaration.cancelledAgainst);
	logEvent(state, {
		type: 'area',
		recordId: declaration.entry.recordId,
		role: ROLE.AREA,
		site: site.id,
		amount: declaration.amount,
		hitCount: declaration.victims.length,
		hidden: declaration.hidden,
		cancelled: cancelledSides.length > 0,
		cancelledAgainst: cancelledSides,
	});
	declaration.victims.forEach(({ victim, amount }) => {
		const base = {
			type: 'blow',
			recordId: declaration.entry.recordId,
			role: ROLE.AREA,
			site: site.id,
			target: victim.recordId,
			hidden: declaration.hidden,
		};
		const cut = declaration.cancelledAgainst[victim.player];
		const landing = round1(amount * (1 - (cut ? cut.fraction : 0)));
		if (cut && landing <= 0) {
			logEvent(state, { ...base, amount, remaining: null, outcome: 'cancelled', cancelled: true });
			return;
		}
		const live = findLiveEntry(state, victim.recordId);
		if (!live || live.routed) {
			logEvent(state, { ...base, amount: 0, remaining: null, outcome: 'no-target', cancelled: false });
			return;
		}
		const { remaining, outcome } = applyBlow(state, site, live, landing);
		logEvent(state, { ...base, amount: landing, remaining, outcome, cancelled: !!cut });
	});
}

/*
	applyBlow(state, site, targetEntry, amount) -> { remaining, outcome }

	Blows subtract (assumption 5). A creature at or below zero is routed: off the world,
	out of the Proving. Anything else that took a hit and is still standing is staggered,
	which is a word for the narration and nothing more (assumption 6).
*/
function applyBlow(state, site, targetEntry, amount) {
	targetEntry.damage = round1((targetEntry.damage || 0) + amount);
	targetEntry.currentHold = round1(targetEntry.fullHold - targetEntry.damage);
	if (targetEntry.currentHold <= 0) {
		routEntry(state, targetEntry);
		// a departure changes the company at the world, so every hold here is recomputed
		recomputeHoldsAtSite(state, site);
		return { remaining: 0, outcome: 'routed' };
	}
	targetEntry.staggered = true;
	return { remaining: targetEntry.currentHold, outcome: 'staggered' };
}

// Marks an entry routed (removed from the site, out of the expedition for the rest of
// the match, returned to its owner's roster only after the match ends - the design doc:
// "Routed creatures are out of the expedition but are yours again after the match").
function routEntry(state, entry) {
	entry.routed = true;
	entry.currentHold = 0;
	state.board[entry.siteId][entry.player] = state.board[entry.siteId][entry.player].filter(
		(e) => e.recordId !== entry.recordId,
	);
	const p = state.players[entry.player];
	state.players[entry.player] = { ...p, routed: [...p.routed, entry.recordId] };
}

// ---------------------------------------------------------------------------
// Judge phase
// ---------------------------------------------------------------------------

function judge(state) {
	const frame = currentFrame(state);
	let s = { ...state, players: { ...state.players }, board: cloneBoard(state.board) };

	// The Court reads one number per side: the total hold still standing at the world
	// (assumption 5 makes that number the whole outcome model). `resilient` recovered a
	// creature from the stagger STATUS, and there is no such status any more, so the
	// trait is no longer read here; see the base redesign's "Traits that remain".
	const siteResults = {};
	frame.sites.forEach((site) => {
		const entryView = (e) => ({
			recordId: e.recordId,
			hold: currentHoldOf(s, e),
			fullHold: e.fullHold,
			damage: e.damage || 0,
			role: e.role,
			staggered: !!e.staggered,
		});
		const entriesA = s.board[site.id].A.map(entryView);
		const entriesB = s.board[site.id].B.map(entryView);
		const holdA = entriesA.reduce((sum, e) => sum + e.hold, 0);
		const holdB = entriesB.reduce((sum, e) => sum + e.hold, 0);
		let winner = null;
		if (holdA > holdB) {
			winner = 'A';
		} else if (holdB > holdA) {
			winner = 'B';
		}
		siteResults[site.id] = { holdA, holdB, winner, entries: { A: entriesA, B: entriesB } };
	});

	['A', 'B'].forEach((player) => {
		const opponent = otherPlayer(player);
		frame.sites.forEach((site) => {
			const result = siteResults[site.id];
			const entries = s.board[site.id][player];
			if (result.winner === player) {
				s.players[player] = { ...s.players[player], holding: [...s.players[player].holding, ...entries.map((e) => e.recordId)], sitesWon: s.players[player].sitesWon + 1 };
			} else if (result.winner === opponent && rulesOf(s).lokiLine) {
				// LOST (not tied): the Loki line returns these creatures to the roster,
				// flagged so their next send costs RETURNED_SEND_COST (see send()). With
				// the lokiLine ablation off, a lost world falls through to the tied path
				// below and simply withdraws, with no return.
				const recordIds = entries.map((e) => e.recordId);
				const records = entries.map((e) => e.record);
				s.players[player] = {
					...s.players[player],
					withdrawn: [...s.players[player].withdrawn, ...recordIds],
					roster: [...s.players[player].roster, ...records],
					returned: [...s.players[player].returned, ...recordIds],
				};
			} else {
				// tied (reverts to the Court): withdraw, no Loki return
				s.players[player] = { ...s.players[player], withdrawn: [...s.players[player].withdrawn, ...entries.map((e) => e.recordId)] };
			}
		});
	});

	const bannerLog = { round: state.frameIndex, siteResults };
	s.resolutionLog = [...s.resolutionLog, { type: 'judge', ...bannerLog }];

	const sitesWonA = s.players.A.sitesWon;
	const sitesWonB = s.players.B.sitesWon;

	const clinched = sitesWonA >= SITES_TO_CLINCH || sitesWonB >= SITES_TO_CLINCH;
	const framesExhausted = s.frameIndex >= FRAMES_PER_MATCH - 1;

	if (clinched || framesExhausted) {
		const winner = decideMatchWinner(s);
		return { ...s, phase: 'matchEnd', winner, turn: null, matchEndReason: clinched ? 'clinched' : 'frames-exhausted' };
	}

	const nextFrameIndex = s.frameIndex + 1;
	const nextFrame = s.frames[nextFrameIndex];
	// Trailing-seat compensation (docs/design/reclamation-play-enhancements.md "Pass 2
	// levers"): the side holding fewer worlds after this round gets ROSTER_TRAILING_BONUS
	// extra sends for the next round only (see sendableCapFor in board helpers), rather
	// than the earlier rule of moving first. Starter simply alternates every round now;
	// equal sites also alternates, same as before.
	const nextStarter = otherPlayer(s.starter);
	// the trailingBonus lever is a number, not a switch: rules.trailingBonus replaces the
	// ROSTER_TRAILING_BONUS constant, so 0 removes the compensation entirely.
	const trailingBonus = { A: 0, B: 0 };
	if (sitesWonA !== sitesWonB) {
		trailingBonus[sitesWonA < sitesWonB ? 'A' : 'B'] = rulesOf(s).trailingBonus;
	}

	return {
		...s,
		frameIndex: nextFrameIndex,
		board: emptyBoardForFrame(nextFrame),
		vanguardRelocated: { A: false, B: false },
		players: {
			A: { ...s.players.A, passed: false, firstPasser: false },
			B: { ...s.players.B, passed: false, firstPasser: false },
		},
		trailingBonus,
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
	getPublicState(state, handler) - hides the opponent's unsent roster contents (count
	only) and hidden creatures' identity and site
	(shows that a hidden send happened this round and how many). Never exposes the seed.
*/
export function getPublicState(state, handler) {
	const opponent = otherPlayer(handler);
	const frame = currentFrame(state);

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
					// the base redesign's readable board (assumption 14): the hold this
					// creature has right now, the hold it would have untouched, the role
					// glyph beside the bulb, and whether it has been hit and is still
					// standing
					currentHold: e.currentHold,
					fullHold: e.fullHold,
					damage: e.damage || 0,
					role: e.role,
					staggered: !!e.staggered,
					bolstered: !!e.bolstered,
				});
			});
		});
		return view;
	}

	const board = {};
	frame.sites.forEach((site) => {
		board[site.id] = sanitizeBoardSite(site.id);
	});

	const hiddenCountThisRound = (player) => {
		let count = 0;
		Object.values(state.board).forEach((siteBoard) => {
			count += siteBoard[player].filter((e) => e.hidden).length;
		});
		return count;
	};

	// canRelocateVanguard: only the world's starter ever has the option, so this is
	// false outright for the non-starter side (per handler, not just "self").
	function canRelocate(who) {
		if (state.starter !== who) {
			return false;
		}
		if (state.phase !== 'deploy') {
			return false;
		}
		if (state.vanguardRelocated[who]) {
			return false;
		}
		return !state.players[who].passed;
	}

	// the handler's own vanguard (first-sent creature this world), own side only - the
	// opponent's identity stays hidden even when it happens to be a hidden send, since
	// "which creature is their vanguard" is exactly the kind of identity getPublicState
	// otherwise withholds for the opponent.
	function ownVanguardRecordId(who) {
		const entries = boardEntriesFor(state, who);
		if (entries.length === 0) {
			return null;
		}
		const earliest = entries.reduce((e1, e2) => (!e1 || e2.sentIndex < e1.sentIndex ? e2 : e1), null);
		return earliest ? earliest.recordId : null;
	}

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
			canRelocateVanguard: canRelocate(who),
			// SENDABLE plus this round's trailing-seat bonus, if any (Pass 2's roster-economy
			// lever); sitesWon is already public, so this reveals nothing the opponent
			// couldn't derive themselves.
			sendableCap: sendableCapFor(state, who),
		};
		if (isSelf) {
			return {
				...base,
				roster: p.roster,
				vanguardRecordId: ownVanguardRecordId(who),
				// the Loki line: which of THIS handler's own roster record ids are flagged
				// "returned" (withdrawn from a lost world, sendable again at
				// RETURNED_SEND_COST) - own-side only, same as the roster itself, since the
				// opponent's roster contents stay hidden.
				returned: p.returned,
			};
		}
		return base;
	}

	return {
		frameIndex: state.frameIndex,
		// the match's rules object travels to the view: the bot must never propose a
		// hidden send the engine would reject under an ablation, and the preview needs
		// the same magnitude scale and role toggles the engine is playing under.
		rules: rulesOf(state),
		// the whole frame travels to the view: three sites, each carrying its world's
		// facts (planet, element, terrain, band, hazards) so the table can show the real
		// worlds side by side
		frame: { ...frame },
		// the next frame is revealed as its worlds and sites, so passing early is informed
		nextFrame: state.frameIndex + 1 < state.frames.length
			? state.frames[state.frameIndex + 1].sites.map((site) => ({ planet: site.world.planet, element: site.world.element, siteId: site.id, siteName: site.name }))
			: null,
		phase: state.phase,
		turn: state.turn,
		starter: state.starter,
		board,
		// the whole log travels: with Orders gone there is nothing in it a handler is not
		// allowed to have seen, and the table narrates from its tail
		resolutionLog: state.resolutionLog,
		lastJudgeResult: state.lastJudgeResult || null,
		winner: state.winner,
		you: handler,
		opponent,
		players: {
			[handler]: viewOf(handler, true),
			[opponent]: viewOf(opponent, false),
		},
	};
}

/*
	blowAmountAgainst is exported alongside the board helpers so the table's send preview
	can read the engine's own arithmetic rather than keeping a second copy of it in the
	UI (docs/design/reclamation-base-redesign.md, "Interface consequences": the preview
	shows "the likely target and the number it would lose").
*/
export {
	prepareEntry, currentFrame, siteById, allBoardEntries, boardEntriesFor, findEntry,
	currentHoldOf, blowAmountAgainst,
};
