#!/usr/bin/env node
/*
	*** DEVTOOLS - not part of the shipped app ***

	Decision-quality validation for Reclamation. Where expeditionSimulator.js measures
	whether the game is BALANCED, this measures whether its decisions are INTERESTING, on
	the terms set out in docs/design/game-validation-principles.md section 1. Run via the
	esbuild runner, exactly like the simulator:

		node my-app/src/gameplay/expedition/devtools/runNode.cjs \
			my-app/src/gameplay/expedition/devtools/expeditionValidation.js --matches=200 --seed=7

	Flags:
		--matches=N      matches per configuration (default 200)
		--seed=S         RNG seed, any string or number (default 7)
		--rules=k=v;k=v  rule overrides for the whole run, e.g. --rules=shieldCap=half.
		                 Every lever of the interpretation layer is a rules key, so any
		                 section can be read at a setting that is not the default.
		--md=<path>      also write the whole report as a markdown file
		--json=<path>    also write the summarized report object as JSON
		--only=a,b       run a subset of sections: regret, spread, decided, ablation, draft, lanes, stake, read
		--sweep=<rules>=<values>
		                 rerun the chosen sections once per value and print one row each.
		                 <rules> is one rule name, or several joined by ':'; <values> is a
		                 comma-separated list of matching value tuples, also joined by ':'.
		                 The two sweeps the base redesign asks for:
		                   --sweep=magnitudeScale=0.55,0.8,1.1,1.5
		                   --sweep=holdFloor:holdCeiling=-3.6:23.1,-1.2:21.0,2.8:17.6,6.0:14.9

	Seven sections: five per lever in the principles doc, the per-attribute lanes Pass 2 asks
	for (split per role since Pass 3), and the stake's own numbers.

		1. Naive-policy regret. Six trivial policies play side A against the proctor; if a
		   trivial policy wins nearly as often as the proctor, the deeper decisions are
		   decorative, and if one BEATS the proctor there is a hole in the rules.
		2. Option spread. Every deploy decision the proctor makes is scored with the bot's
		   own scoreSends, and the count of candidates within ten percent of the best is
		   histogrammed by round. One dominant option every turn is a puzzle; a flat field
		   of equals is noise.
		3. Point of no return. Per match, the earliest round after which the eventual
		   winner led and never lost the lead, and the round the result locked at five
		   worlds. Most matches decided in round one means rounds two and three are dead.
		4. Ablation. Each rule switched off in turn (the engine's `rules` object), the same
		   five rivals played against the proctor under the same seeds, and every cell
		   compared against the baseline. A rule whose removal moves nothing measurable is
		   carrying no weight.
		5. Draft dominance. Both sides draft under botDraft; keep rate and keeper win rate
		   per species and per element. Always kept and usually winning is a balance
		   problem; never kept is dead content.
		6. Per-attribute lanes. For each of the ten record attributes, the site win rate of
		   sends whose creature is in the top quartile of that attribute against the bottom
		   quartile. An attribute whose quartiles win alike is an attribute the game does
		   not read (docs/design/reclamation-base-redesign.md assumption 17). Since Pass 3
		   the same gap is also read WITHIN each role, because an attribute that sits on a
		   role which wins worlds less often reads negative for the role, not for itself.
		7. The stake. The stake on against the stake off (assumption 22): how often it is
		   taken, by which side, and whether the staker actually holds the world it doubled.
		   A staker that wins its staked world less often than its unstaked ones is a trap
		   and is flagged as one.

	Aggregation discipline, same as the simulator: every section returns one plain object,
	and both the stdout report and the markdown file are rendered from those objects, so
	the two can never disagree. Every rate carries its 95 percent binomial interval
	(p +/- 1.96*sqrt(p(1-p)/n)) so a designer can tell a signal from noise at the batch
	size actually run. Deterministic under --seed.

	Runtime: the ablation section is nine configurations by five rivals by --matches, so
	it is by far the most expensive part. At the measured ~600 matches/second on this
	laptop the default 200 finishes the whole run in well under a minute, so no reduced
	ablation default is needed.
*/

import {
	createMatch, send, pass, moveSwift, stakeWorld, getPublicState,
	createRngState, nextRandom,
} from '../expeditionRules.ts';
import {
	ROSTER_SIZE, SENDABLE, FRAMES_PER_MATCH, SITES_TO_CLINCH, RETURNED_SEND_COST, ROLE,
} from '../expeditionInterpretation.ts';
import { chooseSend, chooseStake, scoreSends, RIVALS, rivalById, DEFAULT_RIVAL_ID } from '../expeditionBot.ts';
import { buildExpeditionPool } from '../roster.ts';
import { prepare, roleOf } from '../creatureOnTable.ts';
import { buildDraftPools, botDraft, draftOptionsFromRules } from '../draft.ts';
import { getWorlds } from '../sites.ts';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

export const ALL_SECTIONS = ['regret', 'spread', 'decided', 'ablation', 'draft', 'lanes', 'stake', 'read'];

// devtools CLI plumbing: args/rules/report objects are grown dynamically (arbitrary keys
// read off `--flag=value` pairs, or per-lever rules overrides), so they are typed as
// permissive dictionaries rather than exhaustive interfaces - see the file header.
type Dict = Record<string, any>;

export function parseArgs(argv: string[]): Dict {
	const args: Dict = { matches: 200, seed: 7, md: null, json: null, only: null };
	argv.forEach((arg: any) => {
		const m = arg.match(/^--(\w+)=(.+)$/);
		if (!m) {
			return;
		}
		const key = m[1];
		const raw = m[2];
		if (key === 'md' || key === 'json') {
			args[key] = raw;
		} else if (key === 'sweep') {
			args.sweep = parseSweep(raw);
		} else if (key === 'rules') {
			args.rules = parseRules(raw);
		} else if (key === 'only') {
			args.only = raw.split(',').map((s: any) => s.trim()).filter((s: any) => ALL_SECTIONS.includes(s));
		} else {
			args[key] = isNaN(Number(raw)) ? raw : Number(raw);
		}
	});
	return args;
}

/*
	parseSweep('magnitudeScale=0.55,0.8,1.1') -> { rules: ['magnitudeScale'], values: [[0.55],[0.8],[1.1]] }
	parseSweep('holdFloor:holdCeiling=2.8:17.6,6:14.9') -> two rules, two-value tuples

	One flag, because the hold compression is two numbers that only mean anything together
	(docs/design/reclamation-base-redesign.md's Measurement step 2 sweeps a RATIO, and the
	ratio is set by the floor and the ceiling at once).
*/
/*
	parseRules('shieldCap=half;bolsterFloor=1.5;roles.sweep=false') -> a rules object.
	Same grammar as the simulator's --rules, so one habit works in both tools.
*/
export function parseRules(raw: any): Dict {
	const rules: Dict = {};
	String(raw).split(';').filter(Boolean).forEach((pair: any) => {
		const eq = pair.indexOf('=');
		if (eq < 0) {
			return;
		}
		const key = pair.slice(0, eq).trim();
		const text = pair.slice(eq + 1).trim();
		let value: any = text;
		if (text === 'true' || text === 'false') {
			value = text === 'true';
		} else if (text !== '' && !isNaN(Number(text))) {
			value = Number(text);
		}
		if (key.startsWith('roles.')) {
			rules.roles = rules.roles || {};
			rules.roles[key.slice('roles.'.length)] = value;
			return;
		}
		rules[key] = value;
	});
	return rules;
}

export function parseSweep(raw: any) {
	const eq = raw.indexOf('=');
	if (eq < 0) {
		return null;
	}
	const rules = raw.slice(0, eq).split(':').map((x: any) => x.trim()).filter(Boolean);
	const values = raw.slice(eq + 1).split(',').map((tuple: any) => tuple.split(':').map((v: any) => Number(v.trim())));
	if (rules.length === 0 || values.some((tuple: any) => tuple.length !== rules.length || tuple.some((v: any) => Number.isNaN(v)))) {
		return null;
	}
	return { rules, values };
}

// a sweep value tuple as a rules override object
export function sweepRulesOf(sweep: any, tuple: any): Dict {
	const rules: Dict = {};
	sweep.rules.forEach((name: any, i: any) => {
		rules[name] = tuple[i];
	});
	return rules;
}

// ---------------------------------------------------------------------------
// shared numeric helpers - same shapes and formatting the simulator uses, so the two
// reports read as one family of numbers
// ---------------------------------------------------------------------------

function makeRng(seed: any) {
	let state = createRngState(seed);
	return {
		float() {
			const { value, nextState } = nextRandom(state);
			state = nextState;
			return value;
		},
		shuffle(array: any) {
			const result = array.slice();
			for (let i = result.length - 1; i > 0; i--) {
				const j = Math.floor(this.float() * (i + 1));
				const tmp = result[i];
				result[i] = result[j];
				result[j] = tmp;
			}
			return result;
		},
	};
}

function buildRandomRoster(pool: any, rng: any) {
	return rng.shuffle(pool).slice(0, ROSTER_SIZE);
}

function average(array: any) {
	if (!array || array.length === 0) {
		return 0;
	}
	return array.reduce((a: any, b: any) => a + b, 0) / array.length;
}

// rate + 95% binomial CI. Returns null when there are no trials so callers print "n/a"
// rather than a misleading zero.
export function rate(successes: any, trials: any) {
	if (!trials) {
		return null;
	}
	const p = successes / trials;
	const halfWidth = 1.96 * Math.sqrt((p * (1 - p)) / trials);
	return { p, n: trials, lo: Math.max(0, p - halfWidth), hi: Math.min(1, p + halfWidth), halfWidth };
}

function fmtRate(r: any, digits: any = 1) {
	if (!r) {
		return 'n/a';
	}
	const pct = (v: any) => (v * 100).toFixed(digits);
	return `${pct(r.p)}% (95% CI ${pct(r.lo)}-${pct(r.hi)}%, n=${r.n})`;
}

function fmtPct(r: any, digits: any = 1) {
	if (!r) {
		return 'n/a';
	}
	return `${(r.p * 100).toFixed(digits)}%`;
}

function fmtPctCi(r: any, digits: any = 1) {
	if (!r) {
		return 'n/a';
	}
	return `${(r.p * 100).toFixed(digits)}% +/- ${(r.halfWidth * 100).toFixed(1)}`;
}

function otherSeat(seat: any) {
	return seat === 'A' ? 'B' : 'A';
}

// ---------------------------------------------------------------------------
// the policies
//
// Every policy has the shape of expeditionBot's chooseSend, so playMatch can seat any of
// them on either side without special-casing the game loop. They live here rather than in
// the shipped bot on purpose: they are measurement instruments, not opponents anyone will
// ever face. Where a policy is "the proctor but X" it calls chooseSend and then bends the
// answer, so it can never drift from the bot it is being compared against.
// ---------------------------------------------------------------------------

const RANDOM_PASS_PROBABILITY = 0.12;

function traitsOf(record: any) {
	const t = record && record.traits;
	if (Array.isArray(t)) {
		return t;
	}
	if (t && typeof t === 'object') {
		return [...(t.guaranteed || []), ...(t.rolled || [])];
	}
	return [];
}

function remainingSendsOf(publicState: any, ownRoster: any, handler: any) {
	const me = publicState.players[handler];
	const cap = typeof me.sendableCap === 'number' ? me.sendableCap : SENDABLE;
	return Math.min(cap - me.sentCount, ownRoster.length);
}

/*
	Can this policy legally hide this send? Stealthy, hidden sends allowed by the rules, AND
	the round's remaining cap able to afford the hidden send's price (1 since pass 4's
	assumption 24, but rules.hiddenSendCost is still a lever an ablation row can raise, so
	"every send the rules allow to be hidden" keeps its affordability clause; a policy that ignored it would
	name a send the engine rejects).
*/
function canHideUnder(publicState: any, record: any, handler: any) {
	if (publicState.rules && publicState.rules.hiddenSends === false) {
		return false;
	}
	if (!traitsOf(record).includes('stealthy')) {
		return false;
	}
	if (!handler) {
		return true;
	}
	const me = publicState.players[handler];
	const cap = typeof me.sendableCap === 'number' ? me.sendableCap : SENDABLE;
	const capRemaining = cap - me.sentCount;
	const returned = (me.returned || []).includes(record.id) ? RETURNED_SEND_COST : 1;
	const hiddenCost = publicState.rules && typeof publicState.rules.hiddenSendCost === 'number'
		? publicState.rules.hiddenSendCost : 1;
	return Math.max(returned, hiddenCost) <= capRemaining;
}

// random: uniformly random among legal (record, site) pairs, with a small fixed pass
// probability once anything is on the board. Lifted from expeditionSimulator's --random
// policy so both tools measure the same floor; kept here rather than imported because the
// simulator's copy is module-private and exporting it would widen that file's contract for
// no gain to the simulator itself.
function policyRandom(publicState: any, ownRoster: any, handler: any, rng: any) {
	const me = publicState.players[handler];
	if (me.passed) {
		return { type: 'pass', reason: 'already-passed' };
	}
	if (remainingSendsOf(publicState, ownRoster, handler) <= 0) {
		return { type: 'pass', reason: 'no-sendable-creatures' };
	}
	const frame = publicState.frame;
	const anyOnBoard = frame.sites.some((s: any) => (publicState.board[s.id][handler] || []).length > 0);
	if (anyOnBoard && rng.float() < RANDOM_PASS_PROBABILITY) {
		return { type: 'pass', reason: 'random-pass' };
	}
	// the Loki line makes a returned creature's send cost RETURNED_SEND_COST against the
	// round's cap, so a random policy that ignored it could name a send the engine rejects.
	// "Uniformly random among LEGAL actions" has to mean legal, so returned creatures the
	// remaining cap cannot afford are dropped from the candidate list.
	const cap = typeof me.sendableCap === 'number' ? me.sendableCap : SENDABLE;
	const capRemaining = cap - me.sentCount;
	const returnedIds = new Set(me.returned || []);
	const affordable = ownRoster.filter((r: any) => (returnedIds.has(r.id) ? RETURNED_SEND_COST : 1) <= capRemaining);
	if (affordable.length === 0) {
		return { type: 'pass', reason: 'nothing-affordable' };
	}
	const candidates: any[] = [];
	affordable.forEach((record: any) => {
		frame.sites.forEach((site: any) => {
			candidates.push({ record, site });
		});
	});
	const pick = candidates[Math.floor(rng.float() * candidates.length)];
	const hidden = canHideUnder(publicState, pick.record, handler) && rng.float() < 0.5;
	return { type: 'send', recordId: pick.record.id, siteId: pick.site.id, hidden };
}

// greedy: always the single top-scored candidate from the bot's own scoring, never passing
// while a legal send exists. No rationing across worlds at all, which is exactly the
// decision the proctor's pass rules exist to make.
function policyGreedy(publicState: any, ownRoster: any, handler: any) {
	const me = publicState.players[handler];
	if (me.passed) {
		return { type: 'pass', reason: 'already-passed' };
	}
	if (remainingSendsOf(publicState, ownRoster, handler) <= 0) {
		return { type: 'pass', reason: 'no-sendable-creatures' };
	}
	const scored = scoreSends(publicState, ownRoster, handler, null);
	if (!scored.best) {
		return { type: 'pass', reason: 'no-candidates' };
	}
	const pick = scored.best;
	return { type: 'send', recordId: pick.record.id, siteId: pick.site.id, hidden: false };
}

// passEarly: the proctor, but it stops the moment it has anything on the board and has
// spent an even share of what remains across the worlds still to come.
function policyPassEarly(publicState: any, ownRoster: any, handler: any, rng: any) {
	const me = publicState.players[handler];
	if (me.passed) {
		return { type: 'pass', reason: 'already-passed' };
	}
	const frame = publicState.frame;
	const onBoard = frame.sites.reduce((n: any, s: any) => n + (publicState.board[s.id][handler] || []).length, 0);
	const framesLeft = FRAMES_PER_MATCH - publicState.frameIndex;
	const share = Math.floor(remainingSendsOf(publicState, ownRoster, handler) / Math.max(1, framesLeft));
	if (onBoard > 0 && onBoard >= share) {
		return { type: 'pass', reason: 'pass-early' };
	}
	return chooseSend(publicState, ownRoster, handler, rng, null);
}

// alwaysHidden: the proctor, but every send the rules allow to be hidden is hidden. Under
// the hiddenSends ablation this collapses back to the proctor, which is the correct
// reading of "every send the rules allow".
function policyAlwaysHidden(publicState: any, ownRoster: any, handler: any, rng: any) {
	const action = chooseSend(publicState, ownRoster, handler, rng, null);
	if (action.type !== 'send') {
		return action;
	}
	const record = ownRoster.find((r: any) => r.id === action.recordId);
	return { ...action, hidden: canHideUnder(publicState, record, handler) };
}

// alwaysStack: the proctor's scoring, but the site is decided before the creature - always
// whichever site this seat already has the most creatures at, ties broken by the best
// score available there. Never spreads.
function policyAlwaysStack(publicState: any, ownRoster: any, handler: any) {
	const me = publicState.players[handler];
	if (me.passed) {
		return { type: 'pass', reason: 'already-passed' };
	}
	if (remainingSendsOf(publicState, ownRoster, handler) <= 0) {
		return { type: 'pass', reason: 'no-sendable-creatures' };
	}
	const scored = scoreSends(publicState, ownRoster, handler, null);
	if (scored.candidates.length === 0) {
		return { type: 'pass', reason: 'no-candidates' };
	}
	const countAt = (siteId: any) => (publicState.board[siteId][handler] || []).length;
	// candidates are already sorted best value first, so the first candidate at the most
	// stacked site is that site's best score with no second sort needed
	let best: any = null;
	scored.candidates.forEach((c: any) => {
		if (!best) {
			best = c;
			return;
		}
		const cCount = countAt(c.site.id);
		const bCount = countAt(best.site.id);
		if (cCount > bCount) {
			best = c;
		}
	});
	return { type: 'send', recordId: best.record.id, siteId: best.site.id, hidden: false };
}

// neverContest: only ever sends where its margin is already at or above zero (securing,
// never flipping), and passes when no such send exists.
function policyNeverContest(publicState: any, ownRoster: any, handler: any) {
	const me = publicState.players[handler];
	if (me.passed) {
		return { type: 'pass', reason: 'already-passed' };
	}
	if (remainingSendsOf(publicState, ownRoster, handler) <= 0) {
		return { type: 'pass', reason: 'no-sendable-creatures' };
	}
	const scored = scoreSends(publicState, ownRoster, handler, null);
	const safe = scored.candidates.filter((c: any) => c.margin >= 0);
	if (safe.length === 0) {
		return { type: 'pass', reason: 'nothing-safe' };
	}
	const pick = safe[0];
	return { type: 'send', recordId: pick.record.id, siteId: pick.site.id, hidden: false };
}

/*
	alwaysPresenceFirst: the proctor's own scoring, but every bolster and shield in the
	roster goes before any attacking creature does. The base redesign's Measurement step 5 asks
	for it: if leading with the presences beats the proctor, the two presence roles are
	priced too cheaply; if it never comes close, they are priced too dearly.
*/
function policyAlwaysPresenceFirst(publicState: any, ownRoster: any, handler: any, rng: any) {
	const me = publicState.players[handler];
	if (me.passed) {
		return { type: 'pass', reason: 'already-passed' };
	}
	if (remainingSendsOf(publicState, ownRoster, handler) <= 0) {
		return { type: 'pass', reason: 'no-sendable-creatures' };
	}
	const rules = publicState.rules || null;
	const presences = ownRoster.filter((r: any) => {
		const role = roleOf(r, rules);
		return role === ROLE.BOLSTER || role === ROLE.SHIELD;
	});
	if (presences.length === 0) {
		return chooseSend(publicState, ownRoster, handler, rng, null);
	}
	const scored = scoreSends(publicState, presences, handler, null);
	if (!scored.best) {
		return chooseSend(publicState, ownRoster, handler, rng, null);
	}
	return { type: 'send', recordId: scored.best.record.id, siteId: scored.best.site.id, hidden: false };
}

// the proctor itself, wrapped in the same signature
function policyProctor(publicState: any, ownRoster: any, handler: any, rng: any) {
	return chooseSend(publicState, ownRoster, handler, rng, null);
}

/*
	a rival handler, wrapped in the same signature. The rival itself is hung on the returned
	function so playMatch can ask the same handler for its stake (assumption 22) without
	every policy needing a second entry point: a policy with no `.rival` stakes as the
	proctor, which is the reading the regret section wants (the stake is not the decision
	under study there, so both seats should take it by the same rule).
*/
function policyForRival(rival: any) {
	const fn = (publicState: any, ownRoster: any, handler: any, rng: any) => chooseSend(publicState, ownRoster, handler, rng, rival);
	fn.rival = rival;
	return fn;
}

export const NAIVE_POLICIES = [
	{ id: 'greedy', label: 'greedy (top-scored, never rations)', send: policyGreedy },
	{ id: 'random', label: 'random (uniform legal)', send: policyRandom },
	{ id: 'passEarly', label: 'pass early (even share then stop)', send: policyPassEarly },
	{ id: 'alwaysHidden', label: 'always hidden', send: policyAlwaysHidden },
	{ id: 'alwaysStack', label: 'always stack', send: policyAlwaysStack },
	{ id: 'neverContest', label: 'never contest (secure only)', send: policyNeverContest },
	{ id: 'alwaysPresenceFirst', label: 'always presence first (bolster/shield before any attacker)', send: policyAlwaysPresenceFirst },
];

export const PROCTOR_POLICY = { id: 'proctor', label: 'Court proctor (reference)', send: policyProctor };
export const RANDOM_POLICY: any = NAIVE_POLICIES.find((p: any) => p.id === 'random');

// ---------------------------------------------------------------------------
// playMatch: one full match under any pair of policies and any rules object.
//
// Returns only the flat facts every section needs, never a retained engine state, so
// memory stays bounded no matter how many configurations are run.
// ---------------------------------------------------------------------------

/*
	playMatch(options) -> {
		winner, error, sends, hiddenSends, returnedSends, downs,
		scoreByRound: [{ A, B }],   // sitesWon after each judge
		spreadSamples: [...],        // only when options.collectSpread
	}
*/
export function playMatch(options: any) {
	const {
		matchSeed, rosterA, rosterB, policyA, policyB, rules,
		collectSpread = false, spreadSeat = 'A', collectLanes = false,
	} = options;

	let state = createMatch({ rosterA, rosterB, worlds: getWorlds(), seed: matchSeed, rules });

	let botRngState = createRngState(`${matchSeed}-bot`);
	const rngLike = {
		float() {
			const { value, nextState } = nextRandom(botRngState);
			botRngState = nextState;
			return value;
		},
	};

	const policy = { A: policyA, B: policyB };
	const scoreByRound: any[] = [];
	const spreadSamples: any[] = [];
	// one row per send, with the sending creature's attributes and whether its world was
	// won, for the per-attribute lane reading (docs/design/reclamation-base-redesign.md
	// assumption 17: every attribute should carry weight, so every attribute is measured)
	const laneSamples: any[] = [];
	let sendsThisFrame: any[] = [];
	/*
		The stake (assumption 22). One row per stake made: who made it, which world, which
		round, whether that handler was behind on worlds at the moment it staked, and how
		the Ruling read that world. `unstaked` counts the same handler's other worlds that
		round, which is the within-round control for "does the staker win staked worlds more
		often than unstaked ones, or is the stake a trap".
	*/
	const stakeRecords: any[] = [];
	let stakesThisFrame: any[] = [];
	let sends = 0;
	let sendsBySeat = { A: 0, B: 0 };
	let hiddenSends = 0;
	let hiddenSendWins = 0;
	let hiddenSendDecided = 0;
	let returnedSends = 0;
	let downs = 0;
	let error: any = null;

	let worldsResolved = 0;
	let resolveChangedLeader = 0;

	// the per-side hold standing at each site right now, straight off the entries the
	// engine maintains (assumption 5 makes currentHold a real number on the entry)
	function marginsNow(frame: any): Dict {
		const margins: Dict = {};
		frame.sites.forEach((site: any) => {
			const holdA = (state.board[site.id].A || []).reduce((sum: any, e: any) => sum + (e.currentHold || 0), 0);
			const holdB = (state.board[site.id].B || []).reduce((sum: any, e: any) => sum + (e.currentHold || 0), 0);
			margins[site.id] = holdA - holdB;
		});
		return margins;
	}

	let guard = 0;
	const GUARD_LIMIT = 20000;

	while (state.phase !== 'matchEnd' && guard < GUARD_LIMIT) {
		guard++;
		if (state.phase !== 'deploy') {
			break;
		}
		const frameIndex = state.frameIndex;
		const frame = state.frames[frameIndex];
		// Deploy ends inside pass(), which runs Resolve and Judge in one step, so the
		// pre-resolution readings are retaken before every action and the last pair is the
		// one that describes this round.
		let logBefore = state.resolutionLog.length;
		let marginsBefore = marginsNow(frame);

		while (state.phase === 'deploy' && state.frameIndex === frameIndex && guard < GUARD_LIMIT) {
			guard++;
			const handler = state.turn;
			if (handler === null) {
				break;
			}
			logBefore = state.resolutionLog.length;
			marginsBefore = marginsNow(frame);

			let publicState = getPublicState(state, handler);
			const ownRoster = state.players[handler].roster;

			// the stake is offered before the handler's first send of the round and does
			// not spend the turn, so it is asked for here and the public state is retaken
			// (assumption 22)
			if ((publicState.players[handler].stakeableSiteIds || []).length > 0) {
				const rival = (policy[handler] && policy[handler].rival) || null;
				const wanted = chooseStake(publicState, ownRoster, handler, rival);
				if (wanted) {
					const staked = stakeWorld(state, handler, wanted.siteId);
					if (staked) {
						stakesThisFrame.push({
							handler,
							siteId: wanted.siteId,
							frameIndex,
							behind: state.players[handler].sitesWon < state.players[otherSeat(handler)].sitesWon,
						});
						state = staked;
						publicState = getPublicState(state, handler);
					}
				}
			}

			// option spread is sampled from the seat under study, before its action, using
			// the bot's own scoring - the same shortlist chooseSend reads
			if (collectSpread && handler === spreadSeat && !publicState.players[handler].passed) {
				const scored = scoreSends(publicState, ownRoster, handler, null);
				if (scored.candidates.length > 0) {
					spreadSamples.push(summarizeSpread(scored, publicState.frameIndex));
				}
			}

			let action = policy[handler](publicState, ownRoster, handler, rngLike);

			if (action.type === 'move') {
				const moved = moveSwift(state, handler, action.recordId, action.siteId);
				if (!moved) {
					error = `illegal swift move for ${handler}`;
					return finish();
				}
				state = moved;
				logBefore = state.resolutionLog.length;
				marginsBefore = marginsNow(frame);
				action = policy[handler](getPublicState(state, handler), state.players[handler].roster, handler, rngLike);
				if (collectSpread && handler === spreadSeat) {
					// the sample above was taken before the swift move changed the board; drop
					// it rather than record a shortlist the seat never actually chose from
					spreadSamples.pop();
				}
			}

			let nextState = null;
			if (action.type === 'send') {
				const wasReturned = (state.players[handler].returned || []).includes(action.recordId);
				const sentRecord = state.players[handler].roster.find((r: any) => r.id === action.recordId);
				nextState = send(state, handler, action.recordId, action.siteId, action.hidden);
				if (nextState) {
					sends++;
					// every send is recorded lightly (its world, its seat, whether it was
					// hidden) so the hidden-send site win rate can be read without a second
					// batch; the attribute payload is only carried under collectLanes.
					sendsThisFrame.push({
						seat: handler,
						siteId: action.siteId,
						hidden: !!action.hidden,
						attributes: collectLanes && sentRecord ? (sentRecord.attributes || {}) : null,
						role: collectLanes && sentRecord ? roleOf(sentRecord, rules) : null,
					});

					sendsBySeat[handler]++;
					if (action.hidden) {
						hiddenSends++;
					}
					if (wasReturned) {
						returnedSends++;
					}
					if (collectSpread && handler === spreadSeat && spreadSamples.length > 0) {
						spreadSamples[spreadSamples.length - 1].chosePass = false;
					}
					// fold the arriving creature into the pre-resolution margin, in case
					// this send was the last action before an auto-pass resolved the round
					if (nextState.phase !== 'deploy' || nextState.frameIndex !== frameIndex) {
						// site and record are always found here (this arm only runs right after a
						// successful send to this exact site/record pair), but .find()'s return
						// type is optional - non-null since the alternative is a defensive check
						// duplicating what send() already guaranteed.
						const site: any = frame.sites.find((x: any) => x.id === action.siteId);
						const arriving = prepare(
							state.players[handler].roster.find((r: any) => r.id === action.recordId)!,
							site, site.world, 0, { rules: state.rules },
						).hold;
						marginsBefore = {
							...marginsBefore,
							[action.siteId]: marginsBefore[action.siteId] + (handler === 'A' ? arriving : -arriving),
						};
					} else {
						marginsBefore = marginsNow(nextState.frames[frameIndex]);
					}
				}
			} else {
				nextState = pass(state, handler);
				if (nextState && collectSpread && handler === spreadSeat && spreadSamples.length > 0) {
					spreadSamples[spreadSamples.length - 1].chosePass = true;
				}
			}
			if (!nextState) {
				error = `illegal deploy action ${JSON.stringify({ type: action.type })} for ${handler}`;
				return finish();
			}
			state = nextState;
		}

		const newEvents = state.resolutionLog.slice(logBefore);
		newEvents.forEach((ev: any) => {
			if (ev.outcome === 'downed') {
				downs++;
			}
		});
		// cast: judgeEvent's siteResults payload is read structurally throughout this
		// function (per-site winner/countedValue), which the log's own permissive
		// ResolutionEvent type (see types.ts) does not narrow - devtools reads its own
		// event shape by convention with the engine, not by declared contract.
		const judgeEvent: any = newEvents.find((ev: any) => ev.type === 'judge');
		if (judgeEvent && judgeEvent.siteResults) {
			sendsThisFrame.forEach((row: any) => {
				const result = judgeEvent.siteResults[row.siteId];
				if (!result || !result.winner) {
					return; // a tie reverts to the Court and decides nothing about the send
				}
				// the price of hiding (assumption 21) is read partly off this: does a world
				// a hidden creature was sent to actually go to the side that hid?
				if (row.hidden) {
					hiddenSendDecided++;
					if (result.winner === row.seat) {
						hiddenSendWins++;
					}
				}
				// the per-role lane split (pass 3, measurement refinement): intelligence and
				// charisma read negative overall because they are high on the roles that win
				// worlds less, so every lane is also read within its own role
				if (collectLanes && row.attributes) {
					laneSamples.push({ attributes: row.attributes, role: row.role, won: result.winner === row.seat });
				}
			});
		}
		sendsThisFrame = [];
		if (judgeEvent && judgeEvent.siteResults) {
			stakesThisFrame.forEach((row: any) => {
				const result = judgeEvent.siteResults[row.siteId];
				const others = Object.keys(judgeEvent.siteResults).filter((id: any) => id !== row.siteId);
				stakeRecords.push({
					...row,
					won: !!result && result.winner === row.handler,
					tie: !!result && result.winner === null,
					countedValue: result ? result.countedValue : 1,
					unstakedWon: others.filter((id: any) => judgeEvent.siteResults[id].winner === row.handler).length,
					unstakedDecided: others.filter((id: any) => judgeEvent.siteResults[id].winner !== null).length,
				});
			});
		}
		stakesThisFrame = [];
		if (judgeEvent && judgeEvent.siteResults) {
			Object.keys(judgeEvent.siteResults).forEach((siteId: any) => {
				const result = judgeEvent.siteResults[siteId];
				const before = marginsBefore[siteId] || 0;
				const leaderAfterDeploy = before > 0 ? 'A' : (before < 0 ? 'B' : null);
				if (leaderAfterDeploy && result.winner) {
					worldsResolved++;
					if (leaderAfterDeploy !== result.winner) {
						resolveChangedLeader++;
					}
				}
			});
			scoreByRound.push({ A: state.players.A.sitesWon, B: state.players.B.sitesWon });
		}
	}

	if (guard >= GUARD_LIMIT) {
		error = 'guard limit reached';
	}
	return finish();

	function finish() {
		return {
			winner: state.winner,
			matchEndReason: state.matchEndReason,
			error,
			sends,
			sendsBySeat,
			hiddenSends,
			hiddenSendWins,
			hiddenSendDecided,
			returnedSends,
			downs,
			worldsResolved,
			resolveChangedLeader,
			stakeRecords,
			scoreByRound,
			spreadSamples,
			laneSamples,
		};
	}
}

// one deploy decision's shortlist, reduced to the numbers section 2 aggregates
function summarizeSpread(scored: any, frameIndex: any) {
	const candidates = scored.candidates;
	const best = candidates[0];
	// "within ten percent of the best" is a RELATIVE band on the value, so it reads the
	// same whether the board is worth a lot or a little. A value can be negative (a send
	// that costs more than it gains), in which case the band is taken on the magnitude so
	// the comparison stays meaningful rather than inverting.
	const scale = Math.abs(best.value) || 1;
	const band = 0.1 * scale;
	const nearBest = candidates.filter((c: any) => c.value >= best.value - band).length;
	const second = candidates.length > 1 ? candidates[1] : null;
	return {
		frameIndex,
		nearBest,
		bestValue: best.value,
		gapToSecond: second ? best.value - second.value : null,
		candidateCount: candidates.length,
		chosePass: false,
	};
}

// ---------------------------------------------------------------------------
// the batch runner every section builds on
// ---------------------------------------------------------------------------

/*
	runBatch(opts) -> array of playMatch results

	One pool, one roster RNG stream, one match seed per index, so two configurations run
	under the same seed see the same rosters and the same worlds and differ only by the
	thing under study. That is what makes the ablation matrix a controlled comparison
	rather than two independent samples.
*/
export function runBatch(opts: any) {
	const { matches, seed, pool, policyA, policyB, rules, collectSpread, spreadSeat, collectLanes } = opts;
	const rng = makeRng(seed);
	const results = [];
	for (let i = 0; i < matches; i++) {
		const rosterA = buildRandomRoster(pool, rng);
		const rosterB = buildRandomRoster(pool, rng);
		results.push(playMatch({
			matchSeed: `${seed}-match-${i}`,
			rosterA,
			rosterB,
			policyA,
			policyB,
			rules,
			collectSpread,
			spreadSeat,
			collectLanes,
		}));
	}
	return results;
}

function winRateA(results: any) {
	const done = results.filter((r: any) => !r.error);
	return rate(done.filter((r: any) => r.winner === 'A').length, done.length);
}

// ---------------------------------------------------------------------------
// section 1: naive-policy regret
// ---------------------------------------------------------------------------

/*
	sectionRegret({ matches, seed, pool }) -> {
		rows: [{ id, label, vsProctor, vsRandom, sendsPerMatch }],
		baselines: { proctorVsProctor, proctorVsRandom },
		readings: [...],
	}

	Each naive policy plays side A against the proctor as side B, and against the random
	policy as a sanity line (a policy that cannot beat random is not a policy). The proctor
	against itself is the fifty-percent reference the whole table is read against.
*/
export function sectionRegret({ matches, seed, pool, rules }: any) {
	const proctorVsProctor = winRateA(runBatch({ matches, seed, pool, rules, policyA: PROCTOR_POLICY.send, policyB: PROCTOR_POLICY.send }));
	const proctorVsRandom = winRateA(runBatch({ matches, seed, pool, rules, policyA: PROCTOR_POLICY.send, policyB: RANDOM_POLICY.send }));

	const rows = NAIVE_POLICIES.map((policy: any) => {
		const vsProctorResults = runBatch({ matches, seed, pool, rules, policyA: policy.send, policyB: PROCTOR_POLICY.send });
		const vsRandomResults = runBatch({ matches, seed, pool, rules, policyA: policy.send, policyB: RANDOM_POLICY.send });
		const done = vsProctorResults.filter((r: any) => !r.error);
		return {
			id: policy.id,
			label: policy.label,
			vsProctor: winRateA(vsProctorResults),
			vsRandom: winRateA(vsRandomResults),
			sendsPerMatch: average(done.map((r: any) => r.sendsBySeat.A)),
			errors: vsProctorResults.filter((r: any) => r.error).length + vsRandomResults.filter((r: any) => r.error).length,
		};
	});

	// the proctor's own sends per match, for the same column
	const proctorSelf = runBatch({ matches, seed, pool, rules, policyA: PROCTOR_POLICY.send, policyB: PROCTOR_POLICY.send });
	const proctorSends = average(proctorSelf.filter((r: any) => !r.error).map((r: any) => r.sendsBySeat.A));

	// the flags the principles doc asks for: within five points of the proctor's own
	// mirror rate reads as "the deeper decisions may be decorative"; above fifty percent
	// is a hole in the rules, not a weakness in the bot.
	const reference = proctorVsProctor ? proctorVsProctor.p : 0.5;
	const readings = [];
	rows.forEach((row: any) => {
		if (!row.vsProctor) {
			return;
		}
		// since pass 4 (assumption 24) hiding is concealment only, so "the proctor, hiding
		// everything it can" IS the proctor as far as any bot can tell: what it measures
		// is the bot's read of unseen sends, which section 8 reads directly. Reported here,
		// never flagged.
		if (row.id === 'alwaysHidden') {
			row.flag = 'reported only (pass 4)';
			return;
		}
		if (row.vsProctor.p > 0.5) {
			row.flag = 'hole';
			readings.push(`HOLE: ${row.id} beats the proctor at ${fmtPct(row.vsProctor)}. A trivial policy winning outright is a hole in the rules, not a weak bot.`);
		} else if (Math.abs(row.vsProctor.p - reference) <= 0.05) {
			row.flag = 'decorative decisions?';
			readings.push(`DECORATIVE DECISIONS? ${row.id} wins ${fmtPct(row.vsProctor)}, within five points of the proctor mirror (${fmtPct(proctorVsProctor)}). The decisions this policy skips may not be doing work.`);
		} else {
			row.flag = '';
		}
	});
	if (proctorVsRandom && proctorVsRandom.p < 0.8) {
		readings.push(`The proctor beats uniform random only ${fmtPct(proctorVsRandom)} of the time. Random should lose overwhelmingly; below eighty percent the outcome is mostly luck or structure.`);
	}
	if (readings.length === 0) {
		readings.push('No naive policy comes within five points of the proctor and none beats it. The deploy decisions are carrying their weight at this batch size.');
	}

	return { rows, baselines: { proctorVsProctor, proctorVsRandom, proctorSendsPerMatch: proctorSends }, readings };
}

// ---------------------------------------------------------------------------
// section 2: option spread
// ---------------------------------------------------------------------------

/*
	sectionSpread({ matches, seed, pool }) -> {
		byRound: { 0|1|2: { histogram, dominantShare, passShare, meanGap, n } },
		overall: { ... },
		readings: [...],
	}

	Samples every deploy decision the proctor makes as side A against a proctor side B, and
	counts how many candidates sit within ten percent of the best value.
*/
export function sectionSpread({ matches, seed, pool, rules }: any) {
	const results = runBatch({
		matches, seed, pool, rules,
		policyA: PROCTOR_POLICY.send,
		policyB: PROCTOR_POLICY.send,
		collectSpread: true,
		spreadSeat: 'A',
	});
	const samples = results.filter((r: any) => !r.error).flatMap((r: any) => r.spreadSamples);

	function bucketOf(n: any) {
		return n >= 5 ? '5+' : String(n);
	}

	function aggregate(group: any) {
		const histogram: Dict = { 1: 0, 2: 0, 3: 0, 4: 0, '5+': 0 };
		group.forEach((s: any) => {
			histogram[bucketOf(s.nearBest)] = (histogram[bucketOf(s.nearBest)] || 0) + 1;
		});
		const gaps = group.map((s: any) => s.gapToSecond).filter((g: any) => typeof g === 'number');
		return {
			n: group.length,
			histogram,
			dominantShare: rate(group.filter((s: any) => s.nearBest === 1).length, group.length),
			passShare: rate(group.filter((s: any) => s.chosePass).length, group.length),
			meanGap: average(gaps),
			meanNearBest: average(group.map((s: any) => s.nearBest)),
		};
	}

	const byRound: Dict = {};
	[0, 1, 2].forEach((r: any) => {
		byRound[r] = aggregate(samples.filter((s: any) => s.frameIndex === r));
	});
	const overall = aggregate(samples);

	const readings: any[] = [];
	if (overall.dominantShare && overall.dominantShare.p > 0.7) {
		readings.push(`PUZZLE RISK: one option dominates on ${fmtPct(overall.dominantShare)} of deploy decisions. A single clearly-best move most turns is a puzzle with a known answer, not a decision.`);
	} else if (overall.meanNearBest > 6) {
		readings.push(`NOISE RISK: ${overall.meanNearBest.toFixed(1)} candidates sit within ten percent of the best on the average decision. Too many indistinguishable options is noise, not choice.`);
	} else {
		readings.push(`Deploy decisions offer ${overall.meanNearBest.toFixed(1)} near-best options on average, dominant on ${fmtPct(overall.dominantShare)} of turns. That is the "a few close options" band the principles doc asks for.`);
	}
	const firstRound = byRound[0].meanNearBest;
	const lastRound = byRound[2].meanNearBest;
	if (Math.abs(firstRound - lastRound) > 1.5) {
		readings.push(`The opening and the last world differ: ${firstRound.toFixed(1)} near-best options in round 1 against ${lastRound.toFixed(1)} in round 3. That difference is itself a finding about where the game's decisions live.`);
	}

	return { byRound, overall, readings };
}

// ---------------------------------------------------------------------------
// section 3: point of no return
// ---------------------------------------------------------------------------

/*
	decidedRoundOf(scoreByRound, winner) -> 1 | 2 | null

	The earliest round after which the eventual winner led STRICTLY and never fell behind
	or tied again through the end. Null ("only at the end") when the winner only took the
	lead at the final judge, or took the match on the tiebreak with the sites level.
*/
export function decidedRoundOf(scoreByRound: any, winner: any) {
	if (!winner || scoreByRound.length === 0) {
		return null;
	}
	const loser = otherSeat(winner);
	for (let i = 0; i < scoreByRound.length; i++) {
		let heldThrough = true;
		for (let j = i; j < scoreByRound.length; j++) {
			if (!(scoreByRound[j][winner] > scoreByRound[j][loser])) {
				heldThrough = false;
				break;
			}
		}
		if (heldThrough) {
			// the last judge is not a "decided round": leading only at the final judge is
			// exactly the case the doc calls "only at the end"
			return i === scoreByRound.length - 1 ? null : i + 1;
		}
	}
	return null;
}

/*
	lockedRoundOf(scoreByRound, winner) -> 1 | 2 | 3 | null

	The round after which the winner held SITES_TO_CLINCH worlds, so the result was
	mathematically locked. Null when the match reached the end or the tiebreak without
	anyone clinching.
*/
export function lockedRoundOf(scoreByRound: any, winner: any) {
	if (!winner) {
		return null;
	}
	for (let i = 0; i < scoreByRound.length; i++) {
		if (scoreByRound[i][winner] >= SITES_TO_CLINCH) {
			return i + 1;
		}
	}
	return null;
}

// the whole match-shape block, computed from one batch of results. Section 3 prints this
// in full for the proctor mirror and one summary row per rival; section 4 reuses it for
// every ablation cell, which is why it lives in its own function.
export function matchShapeOf(results: any) {
	const done = results.filter((r: any) => !r.error && r.winner);
	const decided: Dict = { 1: 0, 2: 0, end: 0 };
	const locked: Dict = { 1: 0, 2: 0, 3: 0, never: 0 };
	let comebackEligible = 0;
	let comebackWins = 0;
	let tiedAfterTwo = 0;
	let thirdRoundChangedLeader = 0;

	done.forEach((r: any) => {
		const d = decidedRoundOf(r.scoreByRound, r.winner);
		decided[d === null ? 'end' : d]++;
		const l = lockedRoundOf(r.scoreByRound, r.winner);
		locked[l === null ? 'never' : l]++;

		const after1 = r.scoreByRound[0];
		if (after1 && after1.A !== after1.B) {
			comebackEligible++;
			const trailer = after1.A < after1.B ? 'A' : 'B';
			if (r.winner === trailer) {
				comebackWins++;
			}
		}
		const after2 = r.scoreByRound[1];
		if (after2 && after2.A === after2.B) {
			tiedAfterTwo++;
		}
		if (after2 && r.scoreByRound[2]) {
			const leader2 = after2.A > after2.B ? 'A' : (after2.B > after2.A ? 'B' : null);
			const final = r.scoreByRound[2];
			const leader3 = final.A > final.B ? 'A' : (final.B > final.A ? 'B' : null);
			if (leader2 !== leader3) {
				thirdRoundChangedLeader++;
			}
		}
	});

	return {
		n: done.length,
		decidedCounts: decided,
		decidedAfterRound1: rate(decided[1], done.length),
		decidedAfterRound2: rate(decided[2], done.length),
		decidedOnlyAtEnd: rate(decided.end, done.length),
		lockedCounts: locked,
		comebackRate: rate(comebackWins, comebackEligible),
		tiedAfterRound2: rate(tiedAfterTwo, done.length),
		thirdRoundChangedLeader: rate(thirdRoundChangedLeader, done.length),
		downsPerMatch: average(done.map((r: any) => r.downs)),
		// the base redesign's own gauge for the magnitude scale (assumption 12): how often
		// Resolve handed a world to the side that was behind at the end of Deploy
		resolveChangedLeaderRate: rate(
			done.reduce((n: any, r: any) => n + (r.resolveChangedLeader || 0), 0),
			done.reduce((n: any, r: any) => n + (r.worldsResolved || 0), 0),
		),
		hiddenSendRate: rate(done.reduce((n: any, r: any) => n + r.hiddenSends, 0), done.reduce((n: any, r: any) => n + r.sends, 0)),
		// the share of decided worlds a hidden send was made to that went to the side that
		// hid (assumption 21's fourth gauge)
		hiddenSendWinRate: rate(
			done.reduce((n: any, r: any) => n + (r.hiddenSendWins || 0), 0),
			done.reduce((n: any, r: any) => n + (r.hiddenSendDecided || 0), 0),
		),
		returnedSendRate: rate(done.reduce((n: any, r: any) => n + r.returnedSends, 0), done.reduce((n: any, r: any) => n + r.sends, 0)),
		winRateA: rate(done.filter((r: any) => r.winner === 'A').length, done.length),
	};
}

/*
	sectionDecided({ matches, seed, pool }) -> {
		proctor: matchShape, byRival: [{ id, name, shape }], readings,
	}
*/
export function sectionDecided({ matches, seed, pool, rules }: any) {
	const proctorResults = runBatch({ matches, seed, pool, rules, policyA: PROCTOR_POLICY.send, policyB: PROCTOR_POLICY.send });
	const proctor = matchShapeOf(proctorResults);

	const byRival = RIVALS.map((rival: any) => {
		const results = runBatch({ matches, seed, pool, rules, policyA: policyForRival(rival), policyB: PROCTOR_POLICY.send });
		return { id: rival.id, name: rival.name, shape: matchShapeOf(results) };
	});

	const readings = [];
	if (proctor.decidedAfterRound1 && proctor.decidedAfterRound1.p > 0.5) {
		readings.push(`DECIDED EARLY: ${fmtPct(proctor.decidedAfterRound1)} of proctor mirrors are decided after round 1, above the fifty percent bar. Rounds two and three are largely dead time and the catch-up lever needs to move.`);
	} else {
		readings.push(`${fmtPct(proctor.decidedAfterRound1)} of proctor mirrors are decided after round 1, under the fifty percent bar; ${fmtPct(proctor.decidedOnlyAtEnd)} are settled only at the final judge.`);
	}
	if (proctor.comebackRate && proctor.comebackRate.p < 0.2) {
		readings.push(`COMEBACK FLOOR: the comeback rate is ${fmtPct(proctor.comebackRate)}, below the one-in-five floor the principles doc sets. Trailing after round 1 is close to losing.`);
	} else {
		readings.push(`Comeback rate ${fmtPct(proctor.comebackRate)}, above the one-in-five floor; the third round changes the leader in ${fmtPct(proctor.thirdRoundChangedLeader)} of matches.`);
	}

	return { proctor, byRival, readings };
}

// ---------------------------------------------------------------------------
// section 4: ablation
// ---------------------------------------------------------------------------

export const ABLATIONS = [
	{ id: 'baseline', label: 'baseline (all rules on)', rules: {} },
	{ id: 'noHidden', label: 'no hidden sends', rules: { hiddenSends: false } },
	{ id: 'noLoki', label: 'no Loki line', rules: { lokiLine: false } },
	{ id: 'noSpeed', label: 'no speed order (sent order)', rules: { speed: false } },
	// pass 4 (assumption 24) made hiding concealment only; this row puts the pass 2 combat
	// bonus back so it can be seen to matter (or not) against the shipped game
	{ id: 'hiddenFirstBack', label: 'hidden-first restored (pass 2 bonus)', rules: { hiddenFirst: true } },
	// the three role ablations (docs/design/reclamation-base-redesign.md Measurement step
	// 4): a role switched off degrades every creature that has it, so each role has to be
	// shown to carry weight rather than assumed to
	{ id: 'noSweep', label: 'no sweep role (sweeps strike instead)', rules: { roles: { sweep: false } } },
	{ id: 'noBolster', label: 'no bolster role (bolsterers just hold)', rules: { roles: { bolster: false } } },
	{ id: 'noShield', label: 'no shield role (shielders just hold)', rules: { roles: { shield: false } } },
	// Pass 2's own rules (assumptions 17 to 20). Each of these was added because something
	// measured inert or unread, so each has to earn its place the same way the roles do.
	{ id: 'noHurtAttacksLess', label: 'no hurt-attacks-less (assumption 18)', rules: { hurtAttacksLess: false } },
	{ id: 'noBolsterRecovery', label: 'no bolster recovery (assumption 19)', rules: { bolsterRecovery: 0 } },
	{ id: 'noWillful', label: 'no willful strain relief (assumption 17)', rules: { willful: false } },
	{ id: 'noPresenceScale', label: 'no presence scale (every presence at charisma 50)', rules: { presenceScale: false } },
	{ id: 'noInstinctLanes', label: 'no instinct lanes (conduct only)', rules: { instinctLanes: false } },
	{ id: 'noSwiftMove', label: 'no swift move (assumption 20)', rules: { swiftMove: false } },
	// Pass 3's own rules (assumptions 21 and 22), each of which has to be shown to carry
	// weight the same way every earlier lever did
	{ id: 'noStake', label: 'no stake (assumption 22)', rules: { stake: false } },
	{
		id: 'hidingPriced',
		label: 'pass 3 hiding restored (first strike, costs two sends, three quarters power)',
		rules: { hiddenFirst: true, hiddenSendCost: 2, hiddenPower: 0.75 },
	},
	// not an ablation but a comparison: the catch-up send Nick cut, put back
	{ id: 'trailingBonusBack', label: 'catch-up send restored (trailingBonus 1)', rules: { trailingBonus: 1 } },
];

/*
	sectionAblation({ matches, seed, pool }) -> {
		rows: [{ id, label, rivalWinRates: { [rivalId]: rate }, shape, moved: [...] }],
		readings: [...],
	}

	Every ablation runs the same five rivals as side A against the proctor as side B under
	the same seed as the baseline, so a cell that moves moved because the rule moved. "Moved"
	means the difference from the baseline cell exceeds the baseline interval's half width -
	the smallest difference this batch size can actually resolve.
*/
export function sectionAblation({ matches, seed, pool, rules }: any) {
	const rows = ABLATIONS.map((ablation: any) => {
		const rivalWinRates: Dict = {};
		let shapeResults: any[] = [];
		RIVALS.forEach((rival: any) => {
			const results = runBatch({
				matches, seed, pool,
				policyA: policyForRival(rival),
				policyB: PROCTOR_POLICY.send,
				// the ablation's own switch layered over whatever a sweep is holding fixed
				rules: { ...(rules || {}), ...ablation.rules },
			});
			rivalWinRates[rival.id] = winRateA(results);
			if (rival.id === DEFAULT_RIVAL_ID) {
				shapeResults = results;
			}
		});
		return {
			id: ablation.id,
			label: ablation.label,
			rivalWinRates,
			shape: matchShapeOf(shapeResults),
			moved: [],
		};
	});

	const baseline = rows[0];

	// a cell "moved" when it differs from the baseline by more than the baseline
	// interval's half width; anything smaller is inside the noise of this batch size.
	function movedRate(cell: any, base: any) {
		if (!cell || !base) {
			return false;
		}
		return Math.abs(cell.p - base.p) > base.halfWidth;
	}

	rows.slice(1).forEach((row: any) => {
		RIVALS.forEach((rival: any) => {
			if (movedRate(row.rivalWinRates[rival.id], baseline.rivalWinRates[rival.id])) {
				row.moved.push(rival.id);
			}
		});
		[
			['decided-r1', 'decidedAfterRound1'],
			['comeback', 'comebackRate'],
			['hidden-rate', 'hiddenSendRate'],
			['returned-rate', 'returnedSendRate'],
		].forEach(([label, key]: any) => {
			if (movedRate((row.shape as Dict)[key], (baseline.shape as Dict)[key])) {
				row.moved.push(label);
			}
		});
		// downs per match is a mean, not a rate, so it gets its own threshold: a tenth of
		// a down per match is about the smallest difference worth calling at this size
		if (Math.abs(row.shape.downsPerMatch - baseline.shape.downsPerMatch) > 0.1) {
			row.moved.push('downs');
		}
	});

	const readings = rows.slice(1).map((row: any) => (
		row.moved.length > 0
			? `${row.label}: CARRYING WEIGHT - ${row.moved.join(', ')} moved beyond the interval.`
			: `${row.label}: NO MEASURABLE WEIGHT at ${matches} matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.`
	));

	return { rows, readings };
}

// ---------------------------------------------------------------------------
// section 5: draft dominance
// ---------------------------------------------------------------------------

/*
	sectionDraft({ matches, seed }) -> {
		bySpecies: [...], byElement: [...], topKeep, bottomKeep, readings,
	}

	Both sides draft with botDraft, mirroring reclamationPage's confirmDraft: buildDraftPools
	for the match seed, then botDraft over each side's own pool with that side's rival. Side A
	drafts as the proctor and side B as the proctor too, so the keep rates measured are the
	game's, not one rival's habit. Per species and per element: times dealt, keep rate, the
	win rate of the side that kept it, and its mean hold across the nine worlds of that
	Proving.
*/
export function sectionDraft({ matches, seed, rules }: any) {
	const proctor = rivalById(DEFAULT_RIVAL_ID);
	const bySpecies = {};
	const byElement = {};
	// the base redesign's own draft reading (assumption 4 puts every creature in exactly
	// one of four roles, so "is any role always kept, or never" is the question the
	// species table cannot answer)
	const byRole = {};

	function bump(table: any, key: any, field: any, amount: any = 1) {
		table[key] = table[key] || { dealt: 0, kept: 0, keeperWins: 0, keeperDecided: 0, holdSum: 0, holdN: 0 };
		table[key][field] += amount;
	}

	for (let i = 0; i < matches; i++) {
		const matchSeed = `${seed}-draft-${i}`;
		// the draft's shape travels on the rules object (assumption 23), so one --rules flag
		// moves the pool size and the distinct deal the same way it moves every other lever
		const { poolA, poolB, frames } = buildDraftPools(matchSeed, draftOptionsFromRules(rules));
		const keepA = new Set(botDraft(poolA, frames, proctor, { rules }));
		const keepB = new Set(botDraft(poolB, frames, proctor, { rules }));
		const rosterA = [...keepA].map((id: any) => poolA.find((r: any) => r.id === id));
		const rosterB = [...keepB].map((id: any) => poolB.find((r: any) => r.id === id));

		const result = playMatch({
			matchSeed,
			rosterA,
			rosterB,
			rules,
			policyA: PROCTOR_POLICY.send,
			policyB: PROCTOR_POLICY.send,
		});
		if (result.error || !result.winner) {
			continue;
		}

		[['A', poolA, keepA], ['B', poolB, keepB]].forEach(([seat, pool, kept]: any) => {
			pool.forEach((record: any) => {
				const species = record.species || 'unknown';
				const element = (record.element && record.element.primary) || 'unknown';
				const hold = holdAcrossFrames(record, frames);
				const role = roleOf(record, rules);
				[[bySpecies, species], [byElement, element], [byRole, role]].forEach(([table, key]: any) => {
					bump(table, key, 'dealt');
					bump(table, key, 'holdSum', hold);
					bump(table, key, 'holdN');
					if (kept.has(record.id)) {
						bump(table, key, 'kept');
						bump(table, key, 'keeperDecided');
						if (result.winner === seat) {
							bump(table, key, 'keeperWins');
						}
					}
				});
			});
		});
	}

	function toRows(table: any) {
		return Object.keys(table).map((key: any) => {
			const b = table[key];
			return {
				key,
				dealt: b.dealt,
				kept: b.kept,
				keepRate: rate(b.kept, b.dealt),
				keeperWinRate: rate(b.keeperWins, b.keeperDecided),
				meanHold: b.holdN > 0 ? b.holdSum / b.holdN : 0,
				flag: '',
			};
		});
	}

	const roleRows = toRows(byRole);
	const speciesRows = toRows(bySpecies);
	const elementRows = toRows(byElement);

	function flagRows(rows: any) {
		rows.forEach((r: any) => {
			if (r.keepRate && r.keepRate.p > 0.8 && r.keeperWinRate && r.keeperWinRate.p > 0.6) {
				r.flag = 'dominant';
			} else if (r.keepRate && r.keepRate.p < 0.2) {
				r.flag = 'dead';
			}
		});
	}
	flagRows(speciesRows);
	flagRows(elementRows);

	const byKeep = speciesRows.slice().sort((a: any, b: any) => (b.keepRate ? b.keepRate.p : 0) - (a.keepRate ? a.keepRate.p : 0));
	const topKeep = byKeep.slice(0, 10);
	const bottomKeep = byKeep.slice(-10).reverse();

	const readings = [];
	const dominant = speciesRows.filter((r: any) => r.flag === 'dominant');
	const dead = speciesRows.filter((r: any) => r.flag === 'dead');
	if (dominant.length > 0) {
		readings.push(`DOMINANT: ${dominant.map((r: any) => r.key).join(', ')} are kept above eighty percent AND their keeper wins above sixty percent. That is a balance problem the first human will find in one session.`);
	}
	if (dead.length > 0) {
		readings.push(`DEAD CONTENT: ${dead.map((r: any) => r.key).join(', ')} are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.`);
	}
	if (dominant.length === 0 && dead.length === 0) {
		readings.push('No species is both always kept and usually winning, and none is nearly never kept. The draft pool reads as live content at this batch size.');
	}
	const domElements = elementRows.filter((r: any) => r.flag === 'dominant');
	const deadElements = elementRows.filter((r: any) => r.flag === 'dead');
	if (domElements.length > 0 || deadElements.length > 0) {
		readings.push(`By element: dominant ${domElements.map((r: any) => r.key).join(', ') || 'none'}; dead ${deadElements.map((r: any) => r.key).join(', ') || 'none'}.`);
	}

	// how many species sit outside the fairness band the principles doc sets, which is the
	// gauge assumption 11 names for the draft
	const outOfKeepBand = speciesRows.filter((r: any) => r.keepRate && (r.keepRate.p < 0.3 || r.keepRate.p > 0.9));
	readings.push(`${outOfKeepBand.length} of ${speciesRows.length} species sit outside the 30 to 90 percent keep band.`);

	return { bySpecies: speciesRows, byElement: elementRows, byRole: roleRows, outOfKeepBand: outOfKeepBand.length, topKeep, bottomKeep, readings };
}

// mean hold across every site of the Proving's nine worlds, read through prepare() the
// same way draft.js's rateForDraft does - read straight from creatureOnTable rather than
// reusing rateForDraft so this file does not depend on draft.js's return shape.
function holdAcrossFrames(record: any, frames: any) {
	let sum = 0;
	let n = 0;
	frames.forEach((frame: any) => {
		frame.sites.forEach((site: any) => {
			sum += prepare(record, site, null, 0).hold;
			n++;
		});
	});
	return n > 0 ? sum / n : 0;
}


// ---------------------------------------------------------------------------
// section 6: per-attribute lanes
// ---------------------------------------------------------------------------

/*
	The ten attributes of the ratified record (docs/design/xalian-creature-system-redesign.md
	assumption 10). Pass 2 gave each of them a job (reclamation-base-redesign.md assumption
	17), so each of them should now show up in whether a send's world is won.
*/
export const RECORD_ATTRIBUTES = [
	'vitality', 'resilience', 'endurance', 'strength', 'intelligence',
	'agility', 'reflex', 'willpower', 'charisma', 'instinct',
];

function quantileOf(sortedValues: any, q: any) {
	if (sortedValues.length === 0) {
		return 0;
	}
	const index = Math.min(sortedValues.length - 1, Math.max(0, Math.floor(q * (sortedValues.length - 1))));
	return sortedValues[index];
}

/*
	sectionLanes({ matches, seed, pool, rules }) -> {
		rows: [{ attribute, topWinRate, bottomWinRate, gap, topN, bottomN, q1, q3 }],
		readings: [...],
	}

	One proctor mirror batch. Every send is recorded with its creature's attributes and
	whether the Court gave that world to the sending seat. For each attribute the quartile
	cuts are taken over the sends actually made, and the site win rate of the top quartile
	is compared with the bottom quartile. An attribute whose two quartiles win at the same
	rate is an attribute the game does not read: that is exactly what this pass set out to
	fix, so it is measured directly rather than inferred from the ablation matrix.

	Ties are excluded (a tied world reverts to the Court and settles nothing about the
	sends made to it), so the two quartile rates are both read against decided worlds.
*/
/*
	The per-role lane groups (pass 3's measurement refinement). Pass 2 read intelligence at
	-5.2 and charisma at -7.4 points overall, but both are high on the roles that win worlds
	less often (sweeps and presences), so those two lanes were measuring the ROLE, not the
	attribute. Splitting the reading within each role removes that confound; the two
	presences are read together because a bolster and a shield are the same kind of send and
	neither alone gives enough samples at 200 matches.
*/
export const LANE_ROLE_GROUPS = [
	{ id: 'strike', label: 'strikes', roles: [ROLE.STRIKE] },
	{ id: 'sweep', label: 'sweeps', roles: [ROLE.SWEEP] },
	{ id: 'presence', label: 'presences (bolster + shield)', roles: [ROLE.BOLSTER, ROLE.SHIELD] },
];

// the top-minus-bottom quartile site win rate of one attribute over one set of samples.
// Both the overall row and every per-role cell are built from this one function, so the
// two readings can never be computed differently.
function laneReadingOf(samples: any, attribute: any) {
	const withValue = samples.filter((x: any) => typeof x.attributes[attribute] === 'number');
	const sorted = withValue.map((x: any) => x.attributes[attribute]).sort((a: any, b: any) => a - b);
	const q1 = quantileOf(sorted, 0.25);
	const q3 = quantileOf(sorted, 0.75);
	const bottom = withValue.filter((x: any) => x.attributes[attribute] <= q1);
	const top = withValue.filter((x: any) => x.attributes[attribute] >= q3);
	const topWinRate = rate(top.filter((x: any) => x.won).length, top.length);
	const bottomWinRate = rate(bottom.filter((x: any) => x.won).length, bottom.length);
	return {
		q1,
		q3,
		topN: top.length,
		bottomN: bottom.length,
		topWinRate,
		bottomWinRate,
		gap: topWinRate && bottomWinRate ? topWinRate.p - bottomWinRate.p : null,
	};
}

export function sectionLanes({ matches, seed, pool, rules }: any) {
	const results = runBatch({
		matches, seed, pool, rules,
		policyA: PROCTOR_POLICY.send,
		policyB: PROCTOR_POLICY.send,
		collectLanes: true,
	});
	const samples = results.filter((r: any) => !r.error).flatMap((r: any) => r.laneSamples || []);

	const rows = RECORD_ATTRIBUTES.map((attribute: any) => ({
		attribute,
		...laneReadingOf(samples, attribute),
		byRole: LANE_ROLE_GROUPS.map((group: any) => ({
			group: group.id,
			label: group.label,
			...laneReadingOf(samples.filter((x: any) => group.roles.includes(x.role)), attribute),
		})),
	}));

	const readings = [];
	// "carries weight" at this batch size means the gap clears the top quartile's own
	// interval half width, the same test the ablation matrix uses
	const inert = rows.filter((r: any) => r.gap === null || (r.topWinRate && Math.abs(r.gap) <= r.topWinRate.halfWidth));
	const carrying = rows.filter((r: any) => !inert.includes(r));
	if (carrying.length > 0) {
		readings.push(`Carrying weight: ${carrying.map((r: any) => `${r.attribute} ${(r.gap * 100).toFixed(1)} points`).join(', ')}.`);
	}
	if (inert.length > 0) {
		readings.push(`NO MEASURABLE LANE at ${matches} matches: ${inert.map((r: any) => r.attribute).join(', ')}. The job Pass 2 gave each of these does not yet show in whether its world is won.`);
	} else {
		readings.push('Every one of the ten attributes moves the site win rate beyond the interval. Every lane carries weight at this batch size.');
	}

	// the per-role split's own reading: an attribute whose overall sign disagrees with its
	// sign inside every role was reading the role, not the attribute (pass 3)
	const confounded = rows.filter((r: any) => {
		if (r.gap === null) {
			return false;
		}
		const cells = r.byRole.filter((c: any) => c.gap !== null);
		return cells.length > 0 && cells.every((c: any) => Math.sign(c.gap) !== Math.sign(r.gap));
	});
	if (confounded.length > 0) {
		readings.push(`READS THE ROLE, NOT THE ATTRIBUTE: ${confounded.map((r: any) => r.attribute).join(', ')}. The overall lane and every per-role lane disagree in sign, so the overall number is the role composition and not the attribute's own job.`);
	}

	return { rows, groups: LANE_ROLE_GROUPS.map((g: any) => ({ id: g.id, label: g.label })), readings };
}

// ---------------------------------------------------------------------------
// section 7: the stake
// ---------------------------------------------------------------------------

/*
	stakeStatsOf(results) -> the stake's own numbers over one batch (assumption 22).

	usageShare      share of Provings where at least one stake was made (gauge 20 to 60)
	trailingShare   share of stakes made by a handler behind on worlds at the time
	stakedWinRate   the staker's win rate on the world it staked
	unstakedWinRate the same handlers' win rate on the OTHER worlds of the same round,
	                which is the within-round control: if the staked rate is lower, the
	                stake is a trap and is reported as one
	onlyTrailingStakedWinRate  match win rate of the trailing side in Provings where it was
	                the only side to stake
*/
export function stakeStatsOf(results: any) {
	const done = results.filter((r: any) => !r.error && r.winner);
	const all = done.flatMap((r: any) => r.stakeRecords || []);
	const decided = all.filter((r: any) => !r.tie);
	const withStake = done.filter((r: any) => (r.stakeRecords || []).length > 0);

	let onlyTrailingMatches = 0;
	let onlyTrailingWins = 0;
	done.forEach((r: any) => {
		const rows = r.stakeRecords || [];
		if (rows.length === 0) {
			return;
		}
		const sides = new Set(rows.map((x: any) => x.handler));
		if (sides.size !== 1) {
			return;
		}
		const side = [...sides][0];
		if (!rows.every((x: any) => x.behind)) {
			return;
		}
		onlyTrailingMatches++;
		if (r.winner === side) {
			onlyTrailingWins++;
		}
	});

	return {
		n: done.length,
		stakesPerMatch: average(done.map((r: any) => (r.stakeRecords || []).length)),
		usageShare: rate(withStake.length, done.length),
		trailingShare: rate(all.filter((x: any) => x.behind).length, all.length),
		stakedWinRate: rate(decided.filter((x: any) => x.won).length, decided.length),
		unstakedWinRate: rate(
			all.reduce((n: any, x: any) => n + x.unstakedWon, 0),
			all.reduce((n: any, x: any) => n + x.unstakedDecided, 0),
		),
		onlyTrailingStakedWinRate: rate(onlyTrailingWins, onlyTrailingMatches),
	};
}

/*
	sectionStake({ matches, seed, pool, rules }) -> {
		on: { shape, stake }, off: { shape, stake }, byRival: [...], readings,
	}

	The stake measured against itself off (assumption 22's gauge): comeback rate back
	toward 30 to 40 without a gift, the stake used in a healthy share of Provings, and the
	staker winning its staked world at least as often as an unstaked one. The rival ladder
	is run under both settings, so a rival whose habit the stake breaks shows up here rather
	than only in the ablation matrix.
*/
export function sectionStake({ matches, seed, pool, rules }: any) {
	const rulesOn = { ...(rules || {}), stake: true };
	const rulesOff = { ...(rules || {}), stake: false };

	const onResults = runBatch({ matches, seed, pool, rules: rulesOn, policyA: PROCTOR_POLICY.send, policyB: PROCTOR_POLICY.send });
	const offResults = runBatch({ matches, seed, pool, rules: rulesOff, policyA: PROCTOR_POLICY.send, policyB: PROCTOR_POLICY.send });

	const byRival = RIVALS.map((rival: any) => ({
		id: rival.id,
		name: rival.name,
		on: winRateA(runBatch({ matches, seed, pool, rules: rulesOn, policyA: policyForRival(rival), policyB: PROCTOR_POLICY.send })),
		off: winRateA(runBatch({ matches, seed, pool, rules: rulesOff, policyA: policyForRival(rival), policyB: PROCTOR_POLICY.send })),
	}));

	const on = { shape: matchShapeOf(onResults), stake: stakeStatsOf(onResults) };
	const off = { shape: matchShapeOf(offResults), stake: stakeStatsOf(offResults) };

	const readings = [];
	const usage = on.stake.usageShare;
	if (usage && (usage.p < 0.2 || usage.p > 0.6)) {
		readings.push(`STAKE USAGE OUT OF BAND: staked in ${fmtPct(usage)} of Provings against the 20 to 60 percent gauge. ${usage.p < 0.2 ? 'The threshold is too high for the bot to ever take the risk.' : 'The threshold is low enough that staking is automatic, which makes it a habit rather than a decision.'}`);
	} else {
		readings.push(`The stake is taken in ${fmtPct(usage)} of Provings, inside the 20 to 60 percent gauge, ${fmtPct(on.stake.trailingShare)} of them by the side behind on worlds.`);
	}
	if (on.stake.stakedWinRate && on.stake.unstakedWinRate) {
		if (on.stake.stakedWinRate.p < on.stake.unstakedWinRate.p) {
			readings.push(`TRAP: the staker wins its staked world ${fmtPct(on.stake.stakedWinRate)} of the time against ${fmtPct(on.stake.unstakedWinRate)} on the same round's unstaked worlds. Doubling a world it wins less often is a trap; the flag is the safety and the threshold is the thing to move.`);
		} else {
			readings.push(`The staker wins its staked world ${fmtPct(on.stake.stakedWinRate)} of the time against ${fmtPct(on.stake.unstakedWinRate)} on the same round's unstaked worlds, so the stake is picking worlds it can hold.`);
		}
	}
	readings.push(`Comeback rate ${fmtPct(on.shape.comebackRate)} with the stake against ${fmtPct(off.shape.comebackRate)} without; decided after round 1 ${fmtPct(on.shape.decidedAfterRound1)} against ${fmtPct(off.shape.decidedAfterRound1)} (reported, not a gauge since pass 2 dropped it).`);
	if (on.stake.onlyTrailingStakedWinRate) {
		readings.push(`In Provings where only the trailing side staked, that side won ${fmtRate(on.stake.onlyTrailingStakedWinRate)}.`);
	}

	return { on, off, byRival, readings };
}

// ---------------------------------------------------------------------------
// section 8: the read (pass 4, assumption 24)
// ---------------------------------------------------------------------------

/*
	sectionRead({ matches, seed, pool, rules }) -> { rows, mirror, readings }

	Since pass 4 a hidden send is concealment only, worth exactly what it makes the rival
	guess wrong, so the bot guesses (expeditionBot.readUnseen): it spreads every hidden send
	the rival has made this round, plus the sends still to come from a rival who has not
	passed (anticipation), across the round's worlds by where the rival would most want
	them, and values each send as the average of its worth under each guess. This section
	reads the read: the proctor against a proctor that does not anticipate (the pass 3
	bot), against one that ignores unseen creatures altogether, and then hiding itself:
	the proctor hiding everything it can, and never hiding, each against the proctor.

	Gauge: the read must beat the bot without it by more than the mirror's interval, or it
	is decoration. Concealment's own worth is REPORTED, never gauged: against a bot it can
	only be worth whatever the bot's guess is wrong by, and whether it is worth anything
	to a human is the human session's question (docs/design/game-validation-principles.md,
	"what none of these can tell you").
*/
function readPolicy(weights: any, id: any) {
	return policyForRival({ id, name: id, weights });
}

export function sectionRead({ matches, seed, pool, rules }: any) {
	const run = (policyA: any, policyB: any) => winRateA(runBatch({ matches, seed, pool, rules, policyA, policyB }));
	const mirror: any = run(PROCTOR_POLICY.send, PROCTOR_POLICY.send);
	const rows = [
		{ id: 'anticipation', label: 'proctor vs no anticipation (pass 3 bot: hidden sends read, coming sends not)', rate: run(PROCTOR_POLICY.send, readPolicy({ anticipation: 0 }, 'noAnticipation')) },
		{ id: 'blind', label: 'proctor vs blind (ignores hidden and coming sends alike)', rate: run(PROCTOR_POLICY.send, readPolicy({ hiddenHoldGuess: 0 }, 'blind')) },
		{ id: 'sharpRead', label: 'sharp read (sharpness 1, a guess at WHERE) vs proctor (even spread)', rate: run(readPolicy({ readSharpness: 1 }, 'sharp'), PROCTOR_POLICY.send) },
		{ id: 'alwaysHidden', label: 'always hidden vs proctor', rate: run((NAIVE_POLICIES.find((p: any) => p.id === 'alwaysHidden') as any).send, PROCTOR_POLICY.send) },
		{ id: 'neverHides', label: 'never hides vs proctor', rate: run(readPolicy({ hideBias: 0 }, 'neverHides'), PROCTOR_POLICY.send) },
		{ id: 'alwaysHiddenVsBlind', label: 'always hidden vs blind', rate: run((NAIVE_POLICIES.find((p: any) => p.id === 'alwaysHidden') as any).send, readPolicy({ hiddenHoldGuess: 0 }, 'blind')) },
	];
	const half = mirror ? (mirror.hi - mirror.lo) / 2 : 0.05;
	const readings = [];
	const anticipation = rows[0].rate;
	if (anticipation && anticipation.p - mirror.p > half) {
		readings.push(`The read carries weight: the proctor beats the bot without anticipation ${fmtPct(anticipation)} against a mirror of ${fmtPct(mirror)}.`);
	} else if (anticipation) {
		readings.push(`DECORATION? The proctor beats the bot without anticipation only ${fmtPct(anticipation)} against a mirror of ${fmtPct(mirror)}, inside the interval. The read is not doing measurable work at this batch size.`);
	}
	const hidden = rows[3].rate;
	const never = rows[4].rate;
	if (hidden && never) {
		const gap = (hidden.p - never.p) * 100;
		readings.push(`Concealment against the bot: hiding everything reads ${fmtPct(hidden)} and never hiding ${fmtPct(never)} against the proctor (${gap >= 0 ? '+' : ''}${gap.toFixed(1)} points for hiding). Reported, not a gauge: against a bot concealment is worth only what the bot's guess is wrong by, and whether a human values it is the human session's question.`);
	}
	return { rows, mirror, readings };
}

// ---------------------------------------------------------------------------
// runValidation: the public entry point, also used directly by tests
// ---------------------------------------------------------------------------

export function runValidation(args: any = {}) {
	const opts = { matches: 200, seed: 7, only: null, rules: null, ...args };
	const sections = opts.only && opts.only.length > 0 ? opts.only : ALL_SECTIONS;
	const pool = buildExpeditionPool(opts.seed, 87);
	const { matches, seed, rules } = opts;

	const report: Dict = {
		meta: {
			matches,
			seed,
			sections,
			rules: rules || null,
			generatedAt: null as string | null, // filled by the CLI so tests stay deterministic
		},
	};

	if (sections.includes('regret')) {
		report.regret = sectionRegret({ matches, seed, pool, rules });
	}
	if (sections.includes('spread')) {
		report.spread = sectionSpread({ matches, seed, pool, rules });
	}
	if (sections.includes('decided')) {
		report.decided = sectionDecided({ matches, seed, pool, rules });
	}
	if (sections.includes('ablation')) {
		report.ablation = sectionAblation({ matches, seed, pool, rules });
	}
	if (sections.includes('draft')) {
		report.draft = sectionDraft({ matches, seed, rules });
	}
	if (sections.includes('lanes')) {
		report.lanes = sectionLanes({ matches, seed, pool, rules });
	}
	if (sections.includes('stake')) {
		report.stake = sectionStake({ matches, seed, pool, rules });
	}
	if (sections.includes('read')) {
		report.read = sectionRead({ matches, seed, pool, rules });
	}

	return report;
}

/*
	runSweep(args) -> { rules, rows: [{ values, label, readings... }] }

	Measurement steps 2 and 3 of docs/design/reclamation-base-redesign.md: rerun the
	chosen sections once per value of one lever (or one tuple of levers that only mean
	anything together, like the hold floor and ceiling) and print one row each, so the
	first setting that meets the gauges can be read straight off the table. Every row runs
	the same seeds, so a number that moves moved because the lever moved.
*/
export function runSweep(args: any = {}) {
	const { sweep } = args;
	const rows = sweep.values.map((tuple: any) => {
		const rules = { ...(args.rules || {}), ...sweepRulesOf(sweep, tuple) };
		const report = runValidation({ ...args, rules });
		const shape = report.decided ? report.decided.proctor : null;
		const worstNaive = report.regret
			? report.regret.rows.reduce((best: any, r: any) => (r.vsProctor && (!best || r.vsProctor.p > best.vsProctor.p) ? r : best), null)
			: null;
		const speciesRows = report.draft ? report.draft.bySpecies : [];
		const outOfBand = speciesRows.filter((r: any) => r.keepRate && (r.keepRate.p < 0.3 || r.keepRate.p > 0.9)).length;
		return {
			values: tuple,
			label: sweep.rules.map((name: any, i: any) => `${name}=${tuple[i]}`).join(', '),
			downsPerMatch: shape ? shape.downsPerMatch : null,
			resolveChangedLeaderRate: shape ? shape.resolveChangedLeaderRate : null,
			decidedAfterRound1: shape ? shape.decidedAfterRound1 : null,
			comebackRate: shape ? shape.comebackRate : null,
			worstNaive: worstNaive ? { id: worstNaive.id, vsProctor: worstNaive.vsProctor } : null,
			speciesOutOfKeepBand: speciesRows.length > 0 ? { outOfBand, of: speciesRows.length } : null,
			report,
		};
	});
	return { rules: sweep.rules, rows };
}

export function printSweep(sweepReport: any) {
	console.log('\n=== lever sweep ===');
	console.log(`lever(s): ${sweepReport.rules.join(', ')}`);
	const headers = ['setting', 'downs/match', 'resolve changed leader', 'decided after r1', 'comeback', 'worst naive', 'species out of keep band'];
	const rows = sweepReport.rows.map((row: any) => [
		row.label,
		row.downsPerMatch === null ? '-' : row.downsPerMatch.toFixed(2),
		row.resolveChangedLeaderRate ? fmtPctCi(row.resolveChangedLeaderRate) : '-',
		row.decidedAfterRound1 ? fmtPctCi(row.decidedAfterRound1) : '-',
		row.comebackRate ? fmtPctCi(row.comebackRate) : '-',
		row.worstNaive ? `${row.worstNaive.id} ${fmtPct(row.worstNaive.vsProctor)}` : '-',
		row.speciesOutOfKeepBand ? `${row.speciesOutOfKeepBand.outOfBand} of ${row.speciesOutOfKeepBand.of}` : '-',
	]);
	textTable(headers, rows).forEach((line: any) => console.log(line));
}

export function sweepToMarkdown(sweepReport: any) {
	const headers = ['setting', 'downs/match', 'resolve changed leader', 'decided after r1', 'comeback', 'worst naive', 'species out of keep band'];
	const rows = sweepReport.rows.map((row: any) => [
		row.label,
		row.downsPerMatch === null ? '-' : row.downsPerMatch.toFixed(2),
		row.resolveChangedLeaderRate ? fmtPctCi(row.resolveChangedLeaderRate) : '-',
		row.decidedAfterRound1 ? fmtPctCi(row.decidedAfterRound1) : '-',
		row.comebackRate ? fmtPctCi(row.comebackRate) : '-',
		row.worstNaive ? `${row.worstNaive.id} ${fmtPct(row.worstNaive.vsProctor)}` : '-',
		row.speciesOutOfKeepBand ? `${row.speciesOutOfKeepBand.outOfBand} of ${row.speciesOutOfKeepBand.of}` : '-',
	]);
	return [`## Lever sweep: ${sweepReport.rules.join(', ')}`, '', ...mdTable(headers, rows), ''].join('\n');
}

// ---------------------------------------------------------------------------
// rendering: one set of line builders, used by BOTH the stdout report and the markdown
// file. Every table below is built once as rows of strings; printReport prints them and
// toMarkdown pipes them, so the two outputs can never drift apart.
// ---------------------------------------------------------------------------

function mdTable(headers: any, rows: any) {
	const lines = [];
	lines.push(`| ${headers.join(' | ')} |`);
	lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
	rows.forEach((r: any) => {
		lines.push(`| ${r.join(' | ')} |`);
	});
	return lines;
}

function textTable(headers: any, rows: any) {
	const widths = headers.map((h: any, i: any) => Math.max(h.length, ...rows.map((r: any) => String(r[i]).length)));
	const line = (cells: any) => cells.map((c: any, i: any) => String(c).padEnd(widths[i])).join('  ');
	return [line(headers), line(widths.map((w: any) => '-'.repeat(w))), ...rows.map(line)];
}

// each section renders to a list of blocks, where a block is either
// { type: 'lines', lines }, { type: 'table', headers, rows } or { type: 'reading', lines }
function regretBlocks(regret: any) {
	const rows = [];
	rows.push([
		'proctor (reference)',
		fmtPctCi(regret.baselines.proctorVsProctor),
		fmtPctCi(regret.baselines.proctorVsRandom),
		regret.baselines.proctorSendsPerMatch.toFixed(1),
		'',
	]);
	regret.rows.forEach((r: any) => {
		rows.push([r.id, fmtPctCi(r.vsProctor), fmtPctCi(r.vsRandom), r.sendsPerMatch.toFixed(1), r.flag || '']);
	});
	return [
		{ type: 'table', headers: ['policy', 'wins vs proctor', 'wins vs random', 'sends/match', 'flag'], rows },
		{ type: 'reading', lines: regret.readings },
	];
}

function spreadBlocks(spread: any) {
	const rows = [];
	const rowFor = (label: any, a: any) => [
		label,
		a.n,
		a.histogram['1'],
		a.histogram['2'],
		a.histogram['3'],
		a.histogram['4'],
		a.histogram['5+'],
		a.meanNearBest.toFixed(2),
		fmtPct(a.dominantShare),
		fmtPct(a.passShare),
		a.meanGap.toFixed(2),
	];
	[0, 1, 2].forEach((r: any) => {
		rows.push(rowFor(`round ${r + 1}`, spread.byRound[r]));
	});
	rows.push(rowFor('overall', spread.overall));
	return [
		{
			type: 'table',
			headers: ['round', 'decisions', '1', '2', '3', '4', '5+', 'mean near-best', 'one dominant', 'chose pass', 'mean gap 1st-2nd'],
			rows,
		},
		{ type: 'reading', lines: spread.readings },
	];
}

function shapeRow(label: any, s: any) {
	return [
		label,
		s.n,
		fmtPct(s.decidedAfterRound1),
		fmtPct(s.decidedAfterRound2),
		fmtPct(s.decidedOnlyAtEnd),
		fmtPct(s.comebackRate),
		fmtPct(s.tiedAfterRound2),
		fmtPct(s.thirdRoundChangedLeader),
		s.downsPerMatch.toFixed(2),
	];
}

function decidedBlocks(decided: any) {
	const p = decided.proctor;
	const detail = [
		`proctor mirror, ${p.n} matches`,
		`  decided after round 1: ${fmtRate(p.decidedAfterRound1)}`,
		`  decided after round 2: ${fmtRate(p.decidedAfterRound2)}`,
		`  decided only at the end: ${fmtRate(p.decidedOnlyAtEnd)}`,
		`  locked (five worlds) after round 1 / 2 / 3 / never: ${p.lockedCounts[1]} / ${p.lockedCounts[2]} / ${p.lockedCounts[3]} / ${p.lockedCounts.never}`,
		`  comeback rate (trailed after round 1, won): ${fmtRate(p.comebackRate)}`,
		`  tied after round 2: ${fmtRate(p.tiedAfterRound2)}`,
		`  third round changed the leader: ${fmtRate(p.thirdRoundChangedLeader)}`,
		`  downs per match: ${p.downsPerMatch.toFixed(2)}`,
		`  resolution changed the leader at ${fmtRate(p.resolveChangedLeaderRate)} of contested worlds`,
	];
	const rows = [shapeRow('proctor mirror', p)];
	decided.byRival.forEach((r: any) => {
		rows.push(shapeRow(`${r.id} vs proctor`, r.shape));
	});
	return [
		{ type: 'lines', lines: detail },
		{
			type: 'table',
			headers: ['matchup', 'n', 'decided r1', 'decided r2', 'only at end', 'comeback', 'tied after r2', 'r3 changed leader', 'downs/match'],
			rows,
		},
		{ type: 'reading', lines: decided.readings },
	];
}

function ablationBlocks(ablation: any) {
	const rivalIds = RIVALS.map((r: any) => r.id);
	const rows = ablation.rows.map((row: any) => ([
		row.label,
		...rivalIds.map((id: any) => fmtPctCi(row.rivalWinRates[id])),
		fmtPct(row.shape.decidedAfterRound1),
		fmtPct(row.shape.comebackRate),
		row.shape.downsPerMatch.toFixed(2),
		fmtPct(row.shape.hiddenSendRate),
		fmtPct(row.shape.returnedSendRate),
		row.id === 'baseline' ? '(baseline)' : (row.moved.length > 0 ? row.moved.join(', ') : 'nothing'),
	]));
	return [
		{
			type: 'table',
			headers: ['ablation', ...rivalIds, 'decided r1', 'comeback', 'downs/match', 'hidden rate', 'returned rate', 'moved?'],
			rows,
		},
		{ type: 'reading', lines: ablation.readings },
	];
}

function draftRowsOf(rows: any) {
	return rows.map((r: any) => [
		r.key,
		r.dealt,
		fmtPct(r.keepRate),
		fmtPct(r.keeperWinRate),
		r.meanHold.toFixed(2),
		r.flag || '',
	]);
}

function roleDraftRows(rows: any) {
	return rows.map((r: any) => [
		r.key,
		String(r.dealt),
		r.keepRate ? fmtPctCi(r.keepRate) : '-',
		r.keeperWinRate ? fmtPctCi(r.keeperWinRate) : '-',
		r.meanHold.toFixed(2),
	]);
}

function draftBlocks(draft: any) {
	const headers = ['key', 'dealt', 'keep rate', 'keeper win rate', 'mean hold', 'flag'];
	const elementRows = draft.byElement.slice().sort((a: any, b: any) => (b.keepRate ? b.keepRate.p : 0) - (a.keepRate ? a.keepRate.p : 0));
	return [
		{ type: 'lines', lines: ['top 10 species by keep rate'] },
		{ type: 'table', headers, rows: draftRowsOf(draft.topKeep) },
		{ type: 'lines', lines: ['bottom 10 species by keep rate'] },
		{ type: 'table', headers, rows: draftRowsOf(draft.bottomKeep) },
		{ type: 'lines', lines: ['by primary element'] },
		{ type: 'table', headers, rows: draftRowsOf(elementRows) },
		{ type: 'lines', lines: ['by role'] },
		{ type: 'table', headers: ['role', 'dealt', 'keep rate', 'keeper win rate', 'mean hold'], rows: roleDraftRows(draft.byRole || []) },
		{ type: 'reading', lines: draft.readings },
	];
}

function laneBlocks(lanes: any) {
	const rows = lanes.rows.map((r: any) => [
		r.attribute,
		`${r.q1} / ${r.q3}`,
		r.topN,
		r.topWinRate ? fmtPctCi(r.topWinRate) : '-',
		r.bottomN,
		r.bottomWinRate ? fmtPctCi(r.bottomWinRate) : '-',
		r.gap === null ? '-' : `${(r.gap * 100).toFixed(1)}`,
	]);
	// the per-role split (pass 3): the same top-minus-bottom quartile gap, read inside
	// strikes, inside sweeps and inside the two presences together, so an attribute is
	// never credited or blamed for the role it tends to sit on
	const groups = lanes.groups || [];
	const roleRows = lanes.rows.map((r: any) => [
		r.attribute,
		r.gap === null ? '-' : `${(r.gap * 100).toFixed(1)}`,
		...groups.map((g: any) => {
			const cell = (r.byRole || []).find((c: any) => c.group === g.id);
			if (!cell || cell.gap === null) {
				return '-';
			}
			return `${(cell.gap * 100).toFixed(1)} (n=${cell.topN}/${cell.bottomN})`;
		}),
	]);
	return [
		{
			type: 'table',
			headers: ['attribute', 'q1 / q3', 'top n', 'top quartile site win', 'bottom n', 'bottom quartile site win', 'gap (points)'],
			rows,
		},
		{ type: 'lines', lines: ['gap in points, split per role (top quartile minus bottom quartile, within the role)'] },
		{
			type: 'table',
			headers: ['attribute', 'overall', ...groups.map((g: any) => g.label)],
			rows: roleRows,
		},
		{ type: 'reading', lines: lanes.readings },
	];
}

function stakeBlocks(stake: any) {
	const stakeRow = (label: any, block: any) => [
		label,
		block.stake.n,
		block.stake.stakesPerMatch.toFixed(2),
		block.stake.usageShare ? fmtPctCi(block.stake.usageShare) : '-',
		block.stake.trailingShare ? fmtPctCi(block.stake.trailingShare) : '-',
		block.stake.stakedWinRate ? fmtPctCi(block.stake.stakedWinRate) : '-',
		block.stake.unstakedWinRate ? fmtPctCi(block.stake.unstakedWinRate) : '-',
		block.stake.onlyTrailingStakedWinRate ? fmtPctCi(block.stake.onlyTrailingStakedWinRate) : '-',
	];
	const shapeRows = [shapeRow('stake on', stake.on.shape), shapeRow('stake off', stake.off.shape)];
	const rivalRows = stake.byRival.map((r: any) => [
		r.id,
		r.on ? fmtPctCi(r.on) : '-',
		r.off ? fmtPctCi(r.off) : '-',
	]);
	return [
		{
			type: 'table',
			headers: ['setting', 'n', 'stakes/match', 'Provings staked', 'by the trailing side', 'staker wins staked world', 'staker wins unstaked worlds', 'only-trailing-staked match win'],
			rows: [stakeRow('stake on', stake.on), stakeRow('stake off', stake.off)],
		},
		{ type: 'lines', lines: ['match shape, stake on against stake off'] },
		{
			type: 'table',
			headers: ['matchup', 'n', 'decided r1', 'decided r2', 'only at end', 'comeback', 'tied after r2', 'r3 changed leader', 'downs/match'],
			rows: shapeRows,
		},
		{ type: 'lines', lines: ['rival ladder, stake on against stake off'] },
		{ type: 'table', headers: ['rival', 'wins vs proctor (stake on)', 'wins vs proctor (stake off)'], rows: rivalRows },
		{ type: 'reading', lines: stake.readings },
	];
}

function readBlocks(read: any) {
	return [
		{ type: 'lines', lines: [`proctor mirror ${read.mirror ? fmtPctCi(read.mirror) : '-'}`] },
		{
			type: 'table',
			headers: ['matchup', 'side A wins'],
			rows: read.rows.map((r: any) => [r.label, r.rate ? fmtPctCi(r.rate) : '-']),
		},
		{ type: 'reading', lines: read.readings },
	];
}

/*
	buildSections(report) -> [{ id, title, blocks }]

	The single description of what the report contains. printReport walks it for stdout and
	toMarkdown walks the same list for the file, so a section can never appear in one and
	not the other.
*/
export function buildSections(report: any) {
	const sections = [];
	if (report.regret) {
		sections.push({ id: 'regret', title: '1. Naive-policy regret', blocks: regretBlocks(report.regret) });
	}
	if (report.spread) {
		sections.push({ id: 'spread', title: '2. Option spread', blocks: spreadBlocks(report.spread) });
	}
	if (report.decided) {
		sections.push({ id: 'decided', title: '3. Point of no return', blocks: decidedBlocks(report.decided) });
	}
	if (report.ablation) {
		sections.push({ id: 'ablation', title: '4. Ablation', blocks: ablationBlocks(report.ablation) });
	}
	if (report.draft) {
		sections.push({ id: 'draft', title: '5. Draft dominance', blocks: draftBlocks(report.draft) });
	}
	if (report.lanes) {
		sections.push({ id: 'lanes', title: '6. Per-attribute lanes', blocks: laneBlocks(report.lanes) });
	}
	if (report.stake) {
		sections.push({ id: 'stake', title: '7. The stake', blocks: stakeBlocks(report.stake) });
	}
	if (report.read) {
		sections.push({ id: 'read', title: '8. The read', blocks: readBlocks(report.read) });
	}
	return sections;
}

export function printReport(report: any) {
	console.log('=== Reclamation decision-quality validation ===');
	console.log(`matches per configuration: ${report.meta.matches}  seed: ${report.meta.seed}  sections: ${report.meta.sections.join(', ')}`);
	buildSections(report).forEach((section: any) => {
		console.log(`\n--- ${section.title} ---`);
		section.blocks.forEach((block: any) => {
			if (block.type === 'table') {
				textTable(block.headers, block.rows).forEach((line: any) => console.log(`  ${line}`));
			} else if (block.type === 'reading') {
				console.log('  reading:');
				block.lines.forEach((line: any) => console.log(`    ${line}`));
			} else {
				block.lines.forEach((line: any) => console.log(`  ${line}`));
			}
		});
	});
}

export function toMarkdown(report: any) {
	const out = [];
	out.push('# Reclamation decision-quality validation');
	out.push('');
	out.push(`Run of expeditionValidation.js, ${report.meta.matches} matches per configuration, seed ${report.meta.seed}${report.meta.generatedAt ? `, ${report.meta.generatedAt}` : ''}. Sections: ${report.meta.sections.join(', ')}. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.`);
	out.push('');
	buildSections(report).forEach((section: any) => {
		out.push(`## ${section.title}`);
		out.push('');
		section.blocks.forEach((block: any) => {
			if (block.type === 'table') {
				mdTable(block.headers, block.rows).forEach((line: any) => out.push(line));
				out.push('');
			} else if (block.type === 'reading') {
				block.lines.forEach((line: any) => {
					out.push(`**Reading.** ${line}`);
					out.push('');
				});
			} else {
				block.lines.forEach((line: any) => out.push(line.startsWith('  ') ? `- ${line.trim()}` : line));
				out.push('');
			}
		});
	});
	return out.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const isMainModule = typeof process !== 'undefined' && !process.env.JEST_WORKER_ID && !process.env.VITEST_WORKER_ID;

if (isMainModule) {
	const args = parseArgs(process.argv.slice(2));
	const startedAt = Date.now();
	if (args.sweep) {
		const sweepReport = runSweep(args);
		printSweep(sweepReport);
		console.log(`\nelapsed: ${((Date.now() - startedAt) / 1000).toFixed(2)}s`);
		if (args.md) {
			fs.writeFileSync(args.md, `${sweepToMarkdown(sweepReport)}\n`);
			console.log(`wrote ${args.md}`);
		}
		if (args.json) {
			fs.writeFileSync(args.json, JSON.stringify(sweepReport.rows.map((r: any) => ({ ...r, report: undefined })), null, 2));
			console.log(`wrote ${args.json}`);
		}
		process.exit(0);
	}
	const report = runValidation(args);
	const elapsedMs = Date.now() - startedAt;
	report.meta.generatedAt = new Date().toISOString().slice(0, 10);
	report.meta.elapsedSeconds = Number((elapsedMs / 1000).toFixed(2));
	printReport(report);
	console.log(`\nelapsed: ${(elapsedMs / 1000).toFixed(2)}s`);
	if (args.md) {
		fs.writeFileSync(args.md, `${toMarkdown(report)}\n`);
		console.log(`wrote ${args.md}`);
	}
	if (args.json) {
		fs.writeFileSync(args.json, JSON.stringify(report, null, 2));
		console.log(`wrote ${args.json}`);
	}
}
