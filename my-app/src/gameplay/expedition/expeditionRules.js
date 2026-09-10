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
	per-entry `currentHold` and a creature at or below zero is downed; no shrug, hurt
	or down thresholds remain (assumption 5). "Hurt" survives only as the derived
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
	roleOf, round1, isSwift, speedOf,
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
	SWEEP_DISCOUNT,
	BOLSTER_FLOOR,
	HIDDEN_FIRST,
	ARMORED_REDUCTION,
	SHIELD_CAP,
	SHIELD_CAPS,
	ROLE,
	WILLFUL_THRESHOLD,
	KEEN_INSTINCT,
	DULL_INSTINCT,
	SWIFT_SPEED,
	instinctLaneOf,
	HURT_ATTACKS_LESS,
	BOLSTER_RECOVERY,
	presenceScaleOf,
	// Pass 3 (assumptions 21 and 22): the price of hiding, and the stake
	HIDDEN_SEND_COST,
	HIDDEN_FIRST_NEEDS_COMPANY,
	HIDDEN_POWER,
	STAKE_ENABLED,
	STAKE_SITE_VALUE,
	STAKE_BOTH_VALUE,
	DRAFT_POOL_SIZE,
	DRAFT_DISTINCT_SPECIES,
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
		// `stakes` is the per-frame record of who staked which world this round
		// (docs/design/reclamation-base-redesign.md assumption 22), keyed by handler; the
		// frame is cloned by stakeWorld rather than mutated, so it stays immutable.
		frames.push({ index: f, sites, stakes: {} });
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
	- speed: false resolves everything in sent order (sentIndex, the same tiebreak
	  buildResolutionOrder already falls back to) instead of by speed.
	- hiddenFirst: false drops assumption 9, so a hidden creature's blow waits its turn in
	  initiative order like everyone else's.
	- roles: { sweep, bolster, shield } - a role switched off degrades every creature that
	  has it. A sweep becomes a plain strike; a presence becomes a plain holder, present at
	  the world and counted in its hold and nothing more (creatureOnTable.roleOf).

	Pass 2's attribute jobs (docs/design/reclamation-base-redesign.md assumptions 17 to 20),
	each a switch so the simulator can show it carries weight:
	- willful: false stops willpower relieving a grade of strain.
	- presenceScale: false makes every presence play at charisma 50 (scale 1).
	- instinctLanes: false drops the keen and dull targeting lanes, leaving every creature
	  on its archetype's conduct line.
	- swiftMove: false removes the swift creature's move during Deploy.
	- hurtAttacksLess: false lands every attack at full power however hurt its attacker.
	- bolsterRecovery: 0 removes the recovery at the Ruling.

	Tuning numbers, all first settings from the base redesign's interpretation layer table:
	- holdFloor / holdCeiling: the hold compression (assumption 11).
	- magnitudeScale: the global rescale on every attack (assumption 12).
	- sweepDiscount: a sweep's share of a strike's power, per creature (assumption 5).
	- bolsterFloor: hold given to an ally already comfortable (assumption 8).
	- armoredReduction: the fraction taken off an attack against an armored creature.
	- shieldCap: how a cancel is priced, 'none' | 'ownHold' | 'half' (see resolveWorld's
	  shield step for what each does and why the lever exists).
	- willfulThreshold / keenInstinct / dullInstinct / swiftSpeed: the attribute cuts.
	- trailingBonus: 0 by default since assumption 20 cut the catch-up send; the key stays
	  so an ablation row can put it back.

	Pass 3's levers (docs/design/reclamation-base-redesign.md assumptions 21 to 23):
	- hiddenSendCost: what a hidden send costs against the round's sendable cap, charged
	  the same way RETURNED_SEND_COST is (assumption 21, variant a).
	- hiddenFirstNeedsCompany: hidden-first only applies while another creature of the
	  hidden creature's side stands at that world (assumption 21, variant b).
	- hiddenPower: the multiplier on an attack thrown from hiding (assumption 21, variant c).
	- stake: false removes the stake entirely (stakeWorld returns null and every world
	  counts one), which is the ablation row the stake has to beat (assumption 22).
	- draftPoolSize / draftDistinctSpecies: the draft's shape (assumption 23). Neither is
	  read by the engine itself; they travel on the rules object so one --rules flag moves
	  the draft the same way it moves every other lever, and draft.js reads them from there.
*/
export const DEFAULT_RULES = {
	hiddenSends: true,
	lokiLine: true,
	trailingBonus: ROSTER_TRAILING_BONUS,
	speed: true,
	hiddenFirst: HIDDEN_FIRST,
	roles: { sweep: true, bolster: true, shield: true },
	holdFloor: HOLD_FLOOR,
	holdCeiling: HOLD_CEILING,
	magnitudeScale: MAGNITUDE_SCALE,
	sweepDiscount: SWEEP_DISCOUNT,
	bolsterFloor: BOLSTER_FLOOR,
	armoredReduction: ARMORED_REDUCTION,
	shieldCap: SHIELD_CAP,
	willful: true,
	willfulThreshold: WILLFUL_THRESHOLD,
	presenceScale: true,
	instinctLanes: true,
	keenInstinct: KEEN_INSTINCT,
	dullInstinct: DULL_INSTINCT,
	swiftMove: true,
	swiftSpeed: SWIFT_SPEED,
	hurtAttacksLess: HURT_ATTACKS_LESS,
	bolsterRecovery: BOLSTER_RECOVERY,
	// Pass 3 (assumptions 21 to 23)
	hiddenSendCost: HIDDEN_SEND_COST,
	hiddenFirstNeedsCompany: HIDDEN_FIRST_NEEDS_COMPANY,
	hiddenPower: HIDDEN_POWER,
	stake: STAKE_ENABLED,
	draftPoolSize: DRAFT_POOL_SIZE,
	draftDistinctSpecies: DRAFT_DISTINCT_SPECIES,
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
		speed: r.speed !== undefined ? !!r.speed : DEFAULT_RULES.speed,
		hiddenFirst: r.hiddenFirst !== undefined ? !!r.hiddenFirst : DEFAULT_RULES.hiddenFirst,
		roles: {
			sweep: roles.sweep !== undefined ? !!roles.sweep : true,
			bolster: roles.bolster !== undefined ? !!roles.bolster : true,
			shield: roles.shield !== undefined ? !!roles.shield : true,
		},
		holdFloor: num(r.holdFloor, DEFAULT_RULES.holdFloor),
		holdCeiling: num(r.holdCeiling, DEFAULT_RULES.holdCeiling),
		magnitudeScale: num(r.magnitudeScale, DEFAULT_RULES.magnitudeScale),
		sweepDiscount: num(r.sweepDiscount, DEFAULT_RULES.sweepDiscount),
		bolsterFloor: num(r.bolsterFloor, DEFAULT_RULES.bolsterFloor),
		armoredReduction: num(r.armoredReduction, DEFAULT_RULES.armoredReduction),
		shieldCap: SHIELD_CAPS.includes(r.shieldCap) ? r.shieldCap : DEFAULT_RULES.shieldCap,
		// Pass 2 (assumptions 17 to 20)
		willful: r.willful !== undefined ? !!r.willful : DEFAULT_RULES.willful,
		willfulThreshold: num(r.willfulThreshold, DEFAULT_RULES.willfulThreshold),
		presenceScale: r.presenceScale !== undefined ? !!r.presenceScale : DEFAULT_RULES.presenceScale,
		instinctLanes: r.instinctLanes !== undefined ? !!r.instinctLanes : DEFAULT_RULES.instinctLanes,
		keenInstinct: num(r.keenInstinct, DEFAULT_RULES.keenInstinct),
		dullInstinct: num(r.dullInstinct, DEFAULT_RULES.dullInstinct),
		swiftMove: r.swiftMove !== undefined ? !!r.swiftMove : DEFAULT_RULES.swiftMove,
		swiftSpeed: num(r.swiftSpeed, DEFAULT_RULES.swiftSpeed),
		hurtAttacksLess: r.hurtAttacksLess !== undefined ? !!r.hurtAttacksLess : DEFAULT_RULES.hurtAttacksLess,
		bolsterRecovery: num(r.bolsterRecovery, DEFAULT_RULES.bolsterRecovery),
		// Pass 3 (assumptions 21 to 23)
		hiddenSendCost: num(r.hiddenSendCost, DEFAULT_RULES.hiddenSendCost),
		hiddenFirstNeedsCompany: r.hiddenFirstNeedsCompany !== undefined
			? !!r.hiddenFirstNeedsCompany : DEFAULT_RULES.hiddenFirstNeedsCompany,
		hiddenPower: num(r.hiddenPower, DEFAULT_RULES.hiddenPower),
		stake: r.stake !== undefined ? !!r.stake : DEFAULT_RULES.stake,
		draftPoolSize: num(r.draftPoolSize, DEFAULT_RULES.draftPoolSize),
		draftDistinctSpecies: r.draftDistinctSpecies !== undefined
			? !!r.draftDistinctSpecies : DEFAULT_RULES.draftDistinctSpecies,
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
		downed: [], // record ids downed out of the expedition (returned to owner post-match)
		withdrawn: [], // record ids withdrawn from lost/tied sites (out of the expedition)
		// The Loki line (Pass 2 lever): record ids back in `roster` after being withdrawn
		// from a LOST (not tied) world, whose NEXT send costs RETURNED_SEND_COST against the
		// sendable cap instead of 1. Cleared for a record the moment it is sent again.
		returned: [],
		passed: false,
		firstPasser: false,
		sitesWon: 0,
		// the stake is once per Proving, not once per round (assumption 22)
		stakeUsed: false,
	});

	return {
		seed,
		rngState,
		rules: normalizeRules(rules),
		frames,
		frameIndex: 0,
		players: { A: playerState(rosterA), B: playerState(rosterB) },
		board: emptyBoardForFrame(frames[0]),
		// per-frame: record ids that have used their one swift move this round (assumption
		// 20 replaced the vanguard fall-back with this)
		swiftMoved: { A: [], B: [] },
		// per-frame send counts, kept apart from players[x].sentCount (which is the whole
		// Proving's sendable cap): the stake is legal only before a handler's FIRST send
		// of the round (assumption 22).
		sentThisFrame: { A: 0, B: 0 },
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
		(e) => e.recordId !== excludingRecordId && !e.hidden && !e.downed,
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
function bolsterersAtSite(state, site, player) {
	return state.board[site.id][player].filter(
		(e) => !e.hidden && !e.downed && roleOfEntry(state, e) === ROLE.BOLSTER,
	);
}

function bolsterAtSite(state, site, player) {
	return bolsterersAtSite(state, site, player).length > 0;
}

/*
	The bolster in force at a site: the strongest presence standing there, since bolsters
	never stack (assumption 8) and charisma prices what one restores (assumption 17). Two
	bolsterers lift exactly one grade, at the better charisma of the two.
*/
function bolsterInForce(state, site, player) {
	const rules = rulesOf(state);
	let best = null;
	bolsterersAtSite(state, site, player).forEach((e) => {
		const scale = presenceScaleOf(e.record, rules);
		if (!best || scale > best.scale) {
			best = { recordId: e.recordId, scale };
		}
	});
	return best;
}

// the hold options for one entry: pack/solitary company, bolster, and the match rules
function holdOptionsFor(state, entry, site) {
	const companions = siteCompanions(state, site, entry.player, entry.recordId);
	const bolster = bolsterInForce(state, site, entry.player);
	return {
		packBondedKinAtSite: companions.filter((c) => c.record.species === entry.record.species).length,
		solitaryAlliesAtSite: companions.length,
		bolstered: !!bolster,
		bolsterScale: bolster ? bolster.scale : 1,
		rules: rulesOf(state),
	};
}

/*
	recomputeHoldsAtSite(state, site) - mutates the entries at one site in place.

	Assumption 5 makes `currentHold` a real number on the entry, set at arrival and
	reduced by blows. `fullHold` is what the creature would hold if it had taken nothing;
	`damage` is what has been taken off it this round; `currentHold` is the difference.
	Splitting it this way is what lets the site be recomputed whenever its company changes
	(an arrival, a departure, a down) without either forgetting damage already dealt or
	double-counting it, which assumption 8 requires of bolster.
*/
function recomputeHoldsAtSite(state, site) {
	['A', 'B'].forEach((player) => {
		state.board[site.id][player].forEach((entry) => {
			if (entry.downed) {
				return;
			}
			const { value } = holdAtSite(entry.record, site, site.world, holdOptionsFor(state, entry, site));
			entry.fullHold = round1(value);
			entry.damage = round1(entry.damage || 0);
			entry.currentHold = round1(entry.fullHold - entry.damage);
			entry.role = roleOfEntry(state, entry);
			entry.bolstered = bolsterAtSite(state, site, entry.player);
			// "hurt" is only the word for a creature hit and still standing
			// (assumption 6); it is derived, never stored as a status
			entry.hurt = entry.damage > 0 && entry.currentHold > 0;
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

/*
	The send cost for one record, against the round's sendable cap: RETURNED_SEND_COST if it
	is flagged `returned` (the Loki line - a creature back in the roster after its world was
	lost), rules.hiddenSendCost when it is sent hidden (the price of hiding, assumption 21),
	1 otherwise. A returned creature sent hidden pays the LARGER of the two rather than
	their sum: each is a price on the same one send, and stacking them could make a send
	illegal that neither price alone forbids.
*/
function sendCostFor(playerState, recordId, hidden = false, rules = DEFAULT_RULES) {
	const returnedCost = (playerState.returned || []).includes(recordId) ? RETURNED_SEND_COST : 1;
	const hiddenCost = hidden && typeof rules.hiddenSendCost === 'number' ? rules.hiddenSendCost : 1;
	return Math.max(returnedCost, hiddenCost);
}

// the records this handler could still send OPENLY. Hiding is always optional, so a
// hidden send's own price (assumption 21) never makes a handler's turn illegal: a creature
// too expensive to hide can still be sent in the open.
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
	// the Loki line and the price of hiding (assumption 21) are both charged against the
	// round's cap - illegal if there is not enough of it left for this send.
	const cost = sendCostFor(p, recordId, hidden, rulesOf(state));
	if (p.sentCount + cost > sendableCapFor(state, handler)) {
		return null;
	}

	const sentIndex = p.sentCount;
	const entry = {
		recordId,
		record,
		player: handler,
		siteId,
		hidden: !!hidden,
		sentIndex,
		downed: false,
		// filled in by recomputeHoldsAtSite immediately below, and again whenever the
		// company at this site changes
		fullHold: 0,
		currentHold: 0,
		damage: 0,
		role: roleOf(record, rulesOf(state)),
		hurt: false,
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

	const nextSentThisFrame = {
		...(state.sentThisFrame || { A: 0, B: 0 }),
		[handler]: ((state.sentThisFrame && state.sentThisFrame[handler]) || 0) + 1,
	};

	let nextState = withRecomputedHolds({
		...state, players: nextPlayers, board: nextBoard, sentThisFrame: nextSentThisFrame,
	});
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
	stakeWorld(state, handler, siteId) -> new state, or null

	THE STAKE (docs/design/reclamation-base-redesign.md assumption 22), the first comeback
	avenue that is a chosen risk rather than a gift. Once per Proving, before that handler's
	first send of the round, a handler may stake one of the round's three worlds: at the
	Ruling that world counts STAKE_SITE_VALUE toward the Charter for whoever holds it, and
	STAKE_BOTH_VALUE when both handlers staked the same one. A tie counts nothing, exactly
	as a tied world always has, and the clinch at SITES_TO_CLINCH is unchanged, so a stake
	can end a Proving early for EITHER side. That symmetry is the whole point: the trailing
	handler doubles a world it thinks it can hold, and doubles the loss if it cannot.

	It does NOT spend the turn and it is not gated on whose turn it is: staking is a
	declaration, not an action of the Deploy alternation, so either handler may stake at any
	point in Deploy before its own first send of that round.

	Illegal if: phase is not deploy, rules.stake is off, this handler has already staked
	this Proving, this frame already carries an entry for this handler, this handler has
	passed, this handler has already sent this round, or the site is not one of this
	frame's three.
*/
export function stakeWorld(state, handler, siteId) {
	if (state.phase !== 'deploy') {
		return null;
	}
	const rules = rulesOf(state);
	if (!rules.stake) {
		return null;
	}
	const p = state.players[handler];
	if (!p || p.passed || p.stakeUsed) {
		return null;
	}
	if (((state.sentThisFrame && state.sentThisFrame[handler]) || 0) > 0) {
		return null;
	}
	const frame = currentFrame(state);
	const stakes = frame.stakes || {};
	if (stakes[handler]) {
		return null;
	}
	if (!siteById(frame, siteId)) {
		return null;
	}

	const nextFrames = state.frames.map((f, i) => (
		i === state.frameIndex ? { ...f, stakes: { ...stakes, [handler]: siteId } } : f
	));
	return {
		...state,
		frames: nextFrames,
		players: { ...state.players, [handler]: { ...p, stakeUsed: true } },
		resolutionLog: [...state.resolutionLog, {
			type: 'stake', handler, site: siteId, round: state.frameIndex,
		}],
	};
}

// the sites this handler may still stake this round: empty once it has staked, sent, or
// passed, or where the rule is off. Own side only in spirit, though a stake is public the
// moment it is made.
export function stakeableSiteIdsFor(state, handler) {
	if (state.phase !== 'deploy' || !rulesOf(state).stake) {
		return [];
	}
	const p = state.players[handler];
	if (!p || p.passed || p.stakeUsed) {
		return [];
	}
	if (((state.sentThisFrame && state.sentThisFrame[handler]) || 0) > 0) {
		return [];
	}
	return currentFrame(state).sites.map((site) => site.id);
}

/*
	moveSwift(state, handler, recordId, siteId)

	"Swift creatures move" (docs/design/reclamation-base-redesign.md assumption 20, which
	replaced the vanguard fall-back: a rule the player could not see a reason for became a
	property of speed). On your own turn during Deploy, before sending or passing, you may
	move one of your creatures that is `swift` (speed at or above rules.swiftSpeed) and has
	not moved this round to another site of the frame. It does NOT consume the turn: the
	handler still sends or passes afterwards. A hidden creature stays hidden and keeps its
	sentIndex; hold, strain and company are recomputed at both sites, since nothing is
	stored on the entry beyond siteId.

	Once per creature per round. Illegal if: phase is not deploy, it is not the handler's
	turn, they have passed, the record is not one of this handler's creatures on the board,
	the creature is not swift (or rules.swiftMove is off), it has already moved this round,
	the target site is not in this frame, or it is the site the creature already stands on.
*/
export function moveSwift(state, handler, recordId, siteId) {
	if (!isPlayersDeployTurn(state, handler)) {
		return null;
	}
	const p = state.players[handler];
	if (p.passed) {
		return null;
	}
	const rules = rulesOf(state);
	if (!rules.swiftMove) {
		return null;
	}
	const moved = (state.swiftMoved && state.swiftMoved[handler]) || [];
	if (moved.includes(recordId)) {
		return null;
	}
	const frame = currentFrame(state);
	const site = siteById(frame, siteId);
	if (!site) {
		return null;
	}
	const mover = boardEntriesFor(state, handler).find((e) => e.recordId === recordId);
	if (!mover) {
		return null;
	}
	if (!isSwift(mover.record, rules)) {
		return null;
	}
	if (mover.siteId === siteId) {
		return null;
	}

	const relocated = { ...mover, siteId };
	const nextBoard = {
		...state.board,
		[mover.siteId]: {
			...state.board[mover.siteId],
			[handler]: state.board[mover.siteId][handler].filter((e) => e.recordId !== mover.recordId),
		},
	};
	nextBoard[siteId] = {
		...nextBoard[siteId],
		[handler]: [...nextBoard[siteId][handler], relocated],
	};

	const nextSwiftMoved = { ...state.swiftMoved, [handler]: [...moved, recordId] };
	const nextResolutionLog = [...state.resolutionLog, {
		type: 'swift-move',
		recordId,
		handler,
		from: mover.siteId,
		to: siteId,
		hidden: relocated.hidden,
	}];

	// turn is deliberately NOT advanced: the handler still sends or passes on this turn
	return withRecomputedHolds({
		...state,
		board: nextBoard,
		swiftMoved: nextSwiftMoved,
		resolutionLog: nextResolutionLog,
	});
}

// the handler's own creatures that may still move this round (assumption 20). Own side
// only: which of the opponent's creatures are swift is not something the board tells you.
export function movableRecordIdsFor(state, handler) {
	if (state.phase !== 'deploy') {
		return [];
	}
	const rules = rulesOf(state);
	if (!rules.swiftMove) {
		return [];
	}
	const moved = (state.swiftMoved && state.swiftMoved[handler]) || [];
	return boardEntriesFor(state, handler)
		.filter((e) => !e.downed && isSwift(e.record, rules) && !moved.includes(e.recordId))
		.map((e) => e.recordId);
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
	return !entry.downed;
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
		_speed: prepareEntry(state, e).speed,
		_hurt: !!e.hurt,
	}));
	if (candidates.length === 0) {
		return null;
	}

	const prepared = prepareEntry(state, entry);

	/*
		Instinct's job (docs/design/reclamation-base-redesign.md assumption 17). Above
		rules.keenInstinct the creature reads the world: it takes the enemy this attack can
		down, and failing that the enemy it takes the most off after matchup. At or below
		rules.dullInstinct it reads nothing and hits whatever was sent earliest. In between
		it follows its archetype's conduct line, exactly as it did before this pass. The
		menacing redirect and the temperament tiebreak still apply on top, at the bottom of
		this function.
	*/
	const lane = instinctLaneOf(entry.record, rulesOf(state));
	if (lane === 'keen') {
		const withPower = candidates.map((c) => ({ c, power: attackPowerAgainst(state, entry, prepared, c) }));
		const downable = withPower.filter((x) => x.power >= x.c._hold);
		const pool = downable.length > 0 ? downable : withPower;
		// among the enemies it can down, the biggest scalp; otherwise the most hold removed
		const key = downable.length > 0 ? (x) => x.c._hold : (x) => Math.min(x.power, x.c._hold);
		const keenPick = pool.reduce((best, x) => {
			if (!best) {
				return x;
			}
			if (key(x) !== key(best)) {
				return key(x) > key(best) ? x : best;
			}
			return x.c.sentIndex < best.c.sentIndex ? x : best;
		}, null);
		return applyMenacingRedirect(keenPick ? keenPick.c : null, state);
	}
	if (lane === 'dull') {
		const dullPick = candidates.reduce((best, c) => (!best || c.sentIndex < best.sentIndex ? c : best), null);
		return applyMenacingRedirect(dullPick, state);
	}

	let chosen = null;
	switch (conduct.attacking) {
		case 'weakestEnemyInReach': {
			// "hurt" is now simply "already hit and still standing" (assumption 6)
			const hurt = candidates.filter((c) => c._hurt);
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
			const slower = candidates.filter((c) => c._speed < prepared.speed);
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
			// subtraction makes "downable" exact: the blow this creature would land on
			// that target is at least the target's whole remaining hold (assumption 5)
			const downable = candidates.filter((c) => attackPowerAgainst(state, entry, prepared, c) >= c._hold);
			const pool = downable.length > 0 ? downable : candidates;
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
	its world, in speed order among the hidden. Then the rest, by speed, with
	strained creatures last, ties to the earlier send. The speed ablation resolves
	purely in sent order, and the hiddenFirst ablation drops the hidden group entirely so
	a hidden creature waits its turn like anyone else.
*/
function buildResolutionOrder(state, entries) {
	const rules = rulesOf(state);
	// the price of hiding, variant b (assumption 21): with hiddenFirstNeedsCompany on, a
	// hidden creature's attack only lands first while another creature of its own side
	// stands at the world. Company is read off the entries present at this world at
	// Resolve, the hidden creature itself excluded, so a lone ambusher waits its turn.
	const needsCompany = !!rules.hiddenFirstNeedsCompany;
	const withMeta = entries.map((e) => {
		const prepared = prepareEntry(state, e);
		const hasCompany = entries.some((other) => other.player === e.player && other.recordId !== e.recordId);
		return {
			entry: e,
			speed: prepared.speed,
			strained: prepared.strainLevel !== 'none',
			hidden: !!e.wasHidden && (!needsCompany || hasCompany),
			wasHidden: !!e.wasHidden,
		};
	});

	const useSpeed = rules.speed;
	function bySpeedThenSent(x, y) {
		if (!useSpeed) {
			return x.entry.sentIndex - y.entry.sentIndex;
		}
		if (x.strained !== y.strained) {
			return x.strained ? 1 : -1;
		}
		if (y.speed !== x.speed) {
			return y.speed - x.speed;
		}
		return x.entry.sentIndex - y.entry.sentIndex;
	}

	if (!rules.hiddenFirst) {
		return withMeta.slice().sort(bySpeedThenSent);
	}
	const hidden = withMeta.filter((m) => m.hidden).sort(bySpeedThenSent);
	const rest = withMeta.filter((m) => !m.hidden).sort(bySpeedThenSent);
	return [...hidden, ...rest];
}

/*
	attackPowerAgainst(state, actorEntry, preparedActor, targetEntry) -> number

	One attack's power against one creature: the actor's single blow (its favored
	attacking ability, already scaled by strain and by rules.magnitudeScale in
	creatureOnTable.buildActs), times the element matchup against that target, times
	rules.sweepDiscount when the actor is a sweep, less rules.armoredReduction when the
	target is armored.
*/
function attackPowerAgainst(state, actorEntry, preparedActor, targetEntry) {
	const rules = rulesOf(state);
	const blow = preparedActor.blow;
	if (!blow) {
		return 0;
	}
	let amount = magnitudeAgainst(actorEntry.record, blow, targetEntry.record);
	if (preparedActor.role === ROLE.SWEEP) {
		amount *= rules.sweepDiscount;
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

	1. DECLARE. With every creature present and its hold settled, each attacking creature
	   picks its conduct target (or, for a sweep, its victims) and its power. Assumption
	   7 requires this: shields cancel an attack that has been DECLARED, so the declaration
	   has to happen before anything lands.
	2. SHIELD. For each side, each shielder standing there cancels the largest attack
	   declared against its own side, one attack per shielder. Against a sweep it cancels
	   the sweep's effect on its own side only, so the other side still takes it.
	3. LAND. The attacks land in resolution order (hidden first, then speed, strained
	   last), each scaled by how much hold its attacker has left (assumption 18). An attack
	   whose attacker has already been downed does not land, which is what makes speed matter.
*/
function resolveWorld(state, site) {
	const rules = rulesOf(state);
	const present = ['A', 'B'].reduce((all, player) => all.concat(state.board[site.id][player].filter(isAlive)), []);
	if (present.length === 0) {
		return;
	}
	const order = buildResolutionOrder(state, present);

	// ---- 1. declare ----
	/*
		The price of hiding, variant c (assumption 21): an attack thrown from hiding lands at
		rules.hiddenPower of its power. It is applied at DECLARATION, not at landing, so a
		shielder reads the attack it will actually have to cancel rather than the one the
		striker would have thrown in the open. It is read off `wasHidden`, not the ordering
		flag: a lone hidden creature that lost hidden-first to variant b was still hiding,
		and still pays for it.
	*/
	const hiddenPower = typeof rules.hiddenPower === 'number' ? rules.hiddenPower : 1;
	const declarations = [];
	order.forEach((item) => {
		const entry = item.entry;
		const prepared = prepareEntry(state, entry);
		if (prepared.role !== ROLE.STRIKE && prepared.role !== ROLE.SWEEP) {
			return;
		}
		const fromHiding = !!item.wasHidden;
		const powerFactor = fromHiding ? hiddenPower : 1;
		if (prepared.role === ROLE.STRIKE) {
			const target = pickAttackTarget(state, entry, prepared.conduct, present);
			declarations.push({
				entry,
				role: ROLE.STRIKE,
				hidden: fromHiding,
				first: item.hidden,
				target: target || null,
				amount: target ? round1(attackPowerAgainst(state, entry, prepared, target) * powerFactor) : 0,
				cancelledAgainst: {},
			});
			return;
		}
		// a sweep removes a reduced power from every OTHER creature at the world, both
		// sides; the actor is the one creature its own cloud does not catch
		const victims = present
			.filter((e) => e.recordId !== entry.recordId)
			.map((victim) => ({ victim, amount: round1(attackPowerAgainst(state, entry, prepared, victim) * powerFactor) }));
		declarations.push({
			entry,
			role: ROLE.SWEEP,
			hidden: fromHiding,
			first: item.hidden,
			victims,
			amount: round1(prepared.blowMagnitude * rules.sweepDiscount * powerFactor),
			cancelledAgainst: {},
		});
	});

	// ---- 2. shield ----
	/*
		A shielder cancels the largest attack declared against its own side, once per round
		(assumption 7). rules.shieldCap prices that cancel, since a free cancel of any size
		measured as the strongest thing a creature can be (shield keeper win rate 67.7
		percent against the 40 to 60 band, validation 2026-09-09):

		- 'none':    the whole attack is cancelled, whatever its size. The first setting.
		- 'ownHold': the shielder cancels at most its OWN current hold of the attack; the
		             remainder lands on the original target. A small creature can only
		             absorb a small attack.
		- 'half':    the whole attack is cancelled, but the shielder takes half the
		             cancelled amount itself, and can be downed by it.

		Charisma prices what the shielder can actually stop (assumption 17): the cancelled
		fraction is multiplied by the shielder's presence scale and clamped at 1, so a
		charismatic shielder cancels the whole attack and a charmless one lets part of it
		through. The 'half' semantics are unchanged: the shielder takes half of what it
		actually cancels, not half of what was declared.

		Cancellation is stored as a FRACTION per side, so a sweep caught by an 'ownHold'
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
			if (!shielder || shielder.downed) {
				return; // downed by an earlier shielder's own half-share
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
			const scale = presenceScaleOf(shielder.record, rules);
			let fraction = 1;
			if (cap === 'ownHold') {
				fraction = Math.min(1, shielder.currentHold / bestAmount);
			}
			// charisma scales the cancel and can never take it past the whole attack
			fraction = Math.min(1, fraction * scale);
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
		if (!striker || striker.downed) {
			logEvent(state, {
				type: 'attack',
				recordId: declaration.entry.recordId,
				role: declaration.role,
				site: site.id,
				target: declaration.role === ROLE.STRIKE && declaration.target ? declaration.target.recordId : null,
				power: 0,
				remaining: null,
				outcome: 'lapsed',
				hidden: declaration.hidden,
				cancelled: false,
			});
			return;
		}
		if (declaration.role === ROLE.STRIKE) {
			landStrike(state, site, declaration, hurtFactorOf(state, striker));
			return;
		}
		landSweep(state, site, declaration, hurtFactorOf(state, striker));
	});
}

/*
	hurtFactorOf(state, attackerEntry) -> the share of its power this attacker still lands.

	A hurt creature attacks for less (docs/design/reclamation-base-redesign.md assumption
	18): an attack lands scaled by its attacker's currentHold over its fullHold AT THE
	MOMENT IT LANDS, which is what makes hitting first shape an exchange rather than only
	deciding who is standing at the end. Declaration is unscaled, so a shield still reads
	the attack the striker meant to throw.
*/
function hurtFactorOf(state, entry) {
	if (!rulesOf(state).hurtAttacksLess) {
		return 1;
	}
	const full = typeof entry.fullHold === 'number' ? entry.fullHold : 0;
	if (!(full > 0)) {
		return 1;
	}
	const current = typeof entry.currentHold === 'number' ? entry.currentHold : full;
	return Math.max(0, Math.min(1, current / full));
}

function landStrike(state, site, declaration, hurtFactor = 1) {
	const base = {
		type: 'attack',
		recordId: declaration.entry.recordId,
		role: ROLE.STRIKE,
		site: site.id,
		hidden: declaration.hidden,
	};
	if (!declaration.target) {
		logEvent(state, { ...base, target: null, power: 0, remaining: null, outcome: 'no-target', cancelled: false });
		return;
	}
	const targetSide = declaration.target.player;
	const cut = declaration.cancelledAgainst[targetSide];
	// a partial cancel (rules.shieldCap 'ownHold', or a charmless shielder) leaves a
	// remainder that still lands; a hurt attacker lands less of it (assumption 18)
	const landing = round1(declaration.amount * (1 - (cut ? cut.fraction : 0)) * hurtFactor);
	if (cut && landing <= 0) {
		logEvent(state, {
			...base,
			target: declaration.target.recordId,
			power: declaration.amount,
			remaining: null,
			outcome: 'cancelled',
			cancelled: true,
		});
		return;
	}
	const live = findLiveEntry(state, declaration.target.recordId);
	if (!live || live.downed) {
		logEvent(state, {
			...base, target: declaration.target.recordId, power: 0, remaining: null, outcome: 'no-target', cancelled: false,
		});
		return;
	}
	const { remaining, outcome } = applyBlow(state, site, live, landing);
	logEvent(state, {
		...base, target: live.recordId, power: landing, remaining, outcome, cancelled: !!cut,
	});
}

function landSweep(state, site, declaration, hurtFactor = 1) {
	const cancelledSides = Object.keys(declaration.cancelledAgainst);
	logEvent(state, {
		type: 'sweep',
		recordId: declaration.entry.recordId,
		role: ROLE.SWEEP,
		site: site.id,
		power: round1(declaration.amount * hurtFactor),
		hitCount: declaration.victims.length,
		hidden: declaration.hidden,
		cancelled: cancelledSides.length > 0,
		cancelledAgainst: cancelledSides,
	});
	declaration.victims.forEach(({ victim, amount }) => {
		const base = {
			type: 'attack',
			recordId: declaration.entry.recordId,
			role: ROLE.SWEEP,
			site: site.id,
			target: victim.recordId,
			hidden: declaration.hidden,
		};
		const cut = declaration.cancelledAgainst[victim.player];
		const landing = round1(amount * (1 - (cut ? cut.fraction : 0)) * hurtFactor);
		if (cut && landing <= 0) {
			logEvent(state, { ...base, power: amount, remaining: null, outcome: 'cancelled', cancelled: true });
			return;
		}
		const live = findLiveEntry(state, victim.recordId);
		if (!live || live.downed) {
			logEvent(state, { ...base, power: 0, remaining: null, outcome: 'no-target', cancelled: false });
			return;
		}
		const { remaining, outcome } = applyBlow(state, site, live, landing);
		logEvent(state, { ...base, power: landing, remaining, outcome, cancelled: !!cut });
	});
}

/*
	applyBlow(state, site, targetEntry, amount) -> { remaining, outcome }

	Blows subtract (assumption 5). A creature at or below zero is downed: off the world,
	out of the Proving. Anything else that took a hit and is still standing is hurt,
	which is a word for the narration and nothing more (assumption 6).
*/
function applyBlow(state, site, targetEntry, amount) {
	targetEntry.damage = round1((targetEntry.damage || 0) + amount);
	targetEntry.currentHold = round1(targetEntry.fullHold - targetEntry.damage);
	if (targetEntry.currentHold <= 0) {
		downEntry(state, targetEntry);
		// a departure changes the company at the world, so every hold here is recomputed
		recomputeHoldsAtSite(state, site);
		return { remaining: 0, outcome: 'downed' };
	}
	targetEntry.hurt = true;
	return { remaining: targetEntry.currentHold, outcome: 'hurt' };
}

// Marks an entry downed (removed from the site, out of the expedition for the rest of
// the match, returned to its owner's roster only after the match ends - the design doc:
// "Downed creatures are out of the expedition but are yours again after the match").
function downEntry(state, entry) {
	entry.downed = true;
	entry.currentHold = 0;
	state.board[entry.siteId][entry.player] = state.board[entry.siteId][entry.player].filter(
		(e) => e.recordId !== entry.recordId,
	);
	const p = state.players[entry.player];
	state.players[entry.player] = { ...p, downed: [...p.downed, entry.recordId] };
}

// ---------------------------------------------------------------------------
// Judge phase
// ---------------------------------------------------------------------------

/*
	applyBolsterRecovery(state) - the Ruling's first step (docs/design/
	reclamation-base-redesign.md assumption 19).

	Bolster measured inert by ablation in the first measurements: lifting a grade of strain
	only ever gave a creature more hold, which is what hold already does. Recovery is the
	one thing hold cannot do. Every ally standing at a world where a bolsterer stands gets
	back rules.bolsterRecovery of the damage it took this round, times the bolsterer's
	presence scale (assumption 17's charisma job), never above its own fullHold. A downed
	creature is off the world and recovers nothing. One `recover` event per creature that
	recovered, logged before the judge event so the table can tell that part of the Ruling
	before the worlds are read.
*/
function applyBolsterRecovery(state) {
	const rules = rulesOf(state);
	const share = typeof rules.bolsterRecovery === 'number' ? rules.bolsterRecovery : 0;
	if (share <= 0) {
		return;
	}
	currentFrame(state).sites.forEach((site) => {
		['A', 'B'].forEach((player) => {
			const bolster = bolsterInForce(state, site, player);
			if (!bolster) {
				return;
			}
			state.board[site.id][player].forEach((entry) => {
				if (entry.downed || !(entry.damage > 0)) {
					return;
				}
				const wanted = round1(entry.damage * share * bolster.scale);
				const amount = round1(Math.min(wanted, entry.damage));
				if (amount <= 0) {
					return;
				}
				entry.damage = round1(entry.damage - amount);
				entry.currentHold = round1(entry.fullHold - entry.damage);
				entry.hurt = entry.damage > 0;
				logEvent(state, {
					type: 'recover',
					recordId: entry.recordId,
					site: site.id,
					bolster: bolster.recordId,
					amount,
					remaining: entry.currentHold,
				});
			});
		});
	});
}

function judge(state) {
	const frame = currentFrame(state);
	let s = { ...state, players: { ...state.players }, board: cloneBoard(state.board), resolutionLog: [...state.resolutionLog] };

	// assumption 19: allies recover under a bolster before the Court reads the world
	applyBolsterRecovery(s);

	// The Court reads one number per side: the total hold still standing at the world
	// (assumption 5 makes that number the whole outcome model). `resilient` recovered a
	// creature from the hurt STATUS, and there is no such status any more, so the
	// trait is no longer read here; see the base redesign's "Traits that remain".
	/*
		The stake (assumption 22): a world staked by one handler counts STAKE_SITE_VALUE
		toward the Charter for whoever HOLDS it, and STAKE_BOTH_VALUE when both staked the
		same world. It is not "worth double to the staker": staking doubles the world for
		either side, which is what makes it a chosen risk. A tie counts nothing, as a tied
		world always has.
	*/
	const stakes = frame.stakes || {};
	const stakedBy = (siteId) => ['A', 'B'].filter((who) => stakes[who] === siteId);
	const countedValueOf = (siteId) => {
		const by = stakedBy(siteId);
		if (by.length >= 2) {
			return STAKE_BOTH_VALUE;
		}
		return by.length === 1 ? STAKE_SITE_VALUE : 1;
	};

	const siteResults = {};
	frame.sites.forEach((site) => {
		const entryView = (e) => ({
			recordId: e.recordId,
			hold: currentHoldOf(s, e),
			fullHold: e.fullHold,
			damage: e.damage || 0,
			role: e.role,
			hurt: !!e.hurt,
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
		siteResults[site.id] = {
			holdA, holdB, winner, entries: { A: entriesA, B: entriesB },
			// the Ruling's own arithmetic, so the report and the table never recompute it
			staked: stakedBy(site.id),
			countedValue: countedValueOf(site.id),
		};
	});

	['A', 'B'].forEach((player) => {
		const opponent = otherPlayer(player);
		frame.sites.forEach((site) => {
			const result = siteResults[site.id];
			const entries = s.board[site.id][player];
			if (result.winner === player) {
				s.players[player] = { ...s.players[player], holding: [...s.players[player].holding, ...entries.map((e) => e.recordId)], sitesWon: s.players[player].sitesWon + result.countedValue };
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

	const bannerLog = { round: state.frameIndex, siteResults, stakes: { ...stakes } };
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
		swiftMoved: { A: [], B: [] },
		// the stake is once per Proving, but "before your first send of the round" is a
		// per-round condition, so this counter resets with the frame (assumption 22)
		sentThisFrame: { A: 0, B: 0 },
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
					// Pass 2 vocabulary (assumption 17): hit and standing is `hurt`, driven
					// to zero is `downed`. Speed rides along so the plinth can print it.
					hurt: !!e.hurt,
					downed: !!e.downed,
					speed: speedOf(e.record),
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

	function viewOf(who, isSelf) {
		const p = state.players[who];
		const base = {
			rosterCount: p.roster.length,
			sentCount: p.sentCount,
			holding: p.holding,
			withdrawn: p.withdrawn,
			downed: p.downed,
			passed: p.passed,
			sitesWon: p.sitesWon,
			hiddenSentThisRound: hiddenCountThisRound(who),
			// the stake is once per Proving and is public the moment it is made
			// (assumption 22), so both seats read it
			stakeUsed: !!p.stakeUsed,
			// SENDABLE plus this round's trailing-seat bonus, if any (Pass 2's roster-economy
			// lever); sitesWon is already public, so this reveals nothing the opponent
			// couldn't derive themselves.
			sendableCap: sendableCapFor(state, who),
		};
		if (isSelf) {
			return {
				...base,
				roster: p.roster,
				// assumption 20: the handler's own creatures that may still move this round.
				// Own side only, like the roster itself: which of the opponent's creatures
				// are swift is not something the board tells you.
				movableRecordIds: movableRecordIdsFor(state, who),
				// the three worlds this handler may still stake this round, empty once it
				// has staked, sent or passed (assumption 22)
				stakeableSiteIds: stakeableSiteIdsFor(state, who),
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
		/*
			The stake, per site (assumption 22): { [siteId]: ['A'] } names who has staked
			this round's worlds, and `countedValue` is what each world is worth toward the
			Charter, so the table can print "this world counts two" without doing the
			arithmetic itself. Both are public: a stake is a declaration, never a hidden one.
		*/
		stakes: (() => {
			const view = {};
			const stakes = (frame && frame.stakes) || {};
			frame.sites.forEach((site) => {
				const by = ['A', 'B'].filter((who) => stakes[who] === site.id);
				view[site.id] = {
					by,
					countedValue: by.length >= 2 ? STAKE_BOTH_VALUE : (by.length === 1 ? STAKE_SITE_VALUE : 1),
				};
			});
			return view;
		})(),
		// what a hidden send costs against the sendable cap this match (assumption 21), so
		// the table can price the pips before the handler commits to hiding
		hiddenSendCost: rulesOf(state).hiddenSendCost,
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
	attackPowerAgainst is exported alongside the board helpers so the table's send preview
	can read the engine's own arithmetic rather than keeping a second copy of it in the
	UI (docs/design/reclamation-base-redesign.md, "Interface consequences": the preview
	shows "the likely target and the number it would lose").
*/
export {
	prepareEntry, currentFrame, siteById, allBoardEntries, boardEntriesFor, findEntry,
	currentHoldOf, attackPowerAgainst, sendCostFor,
};
