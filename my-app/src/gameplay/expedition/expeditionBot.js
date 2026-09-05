/*
	Expedition, the bot.

	Per docs/design/reclamation-design.md's "The bot" section: public information only.
	Deploy is an allocation problem across three sites with a roster that has to last
	three worlds, so the bot thinks in two currencies: sites it can flip or secure on this
	world, and sends it must keep for the worlds still to come. Orders pick, per creature,
	the act with the best expected outcome against the visible board.

	Only ever reads publicState + the bot's OWN roster; getPublicState never exposes the
	opponent's roster contents or hidden creatures' identity or site.

	Five rival handlers (RIVALS, below) are the same bot with its tunables overridden by a
	weights set, so the ladder is one engine playing five styles rather than five separate
	implementations. The Court proctor is the bot exactly as it always was: chooseSend and
	chooseOrders both take an optional rival argument that defaults to the proctor, so every
	existing call site keeps working unchanged.
*/

import { prepare, traitKeywordsOf } from './creatureOnTable.js';
import { getActClass, ACT_CLASS, SENDABLE, SITES_TO_CLINCH, FRAMES_PER_MATCH } from './expeditionInterpretation.js';

// --- tunables ----------------------------------------------------------------------

// worth of turning a site from losing (or tied) to winning, before the cost of the
// creature spent on it
export const FLIP_VALUE = 10;
// worth of adding hold to a site already winning, scaled by how much of the lead it adds
export const SECURE_VALUE = 3;
// every own creature already at a site discounts sending another there (spread bias)
export const STACK_DISCOUNT = 0.6;
// cost per point of hold spent: a cheap flip beats an expensive one
export const HOLD_COST = 0.2;
// an enemy hidden send is treated as this much unseen hold at every site
export const HIDDEN_HOLD_GUESS = 4;
// below this best-candidate value, pass rather than spend
export const MIN_SEND_VALUE = 1.5;
// sends allowed on a world beyond its even share of what remains, when a flip is on offer
export const OVERSPEND_ALLOWANCE = 1;
// the randomizer window in chooseSend: candidates within this much of the best value are
// treated as near-equal and picked among at random. Larger is more random, so easier.
export const NEAR_WINDOW = 0.25;
// scales how often a stealthy creature is sent hidden when the existing rule (canHide &&
// the send is not obviously safe) would allow it. 1 is the rule as written; a value above
// 1 also allows hiding on sends the rule would otherwise send openly, up to "always hide a
// stealthy creature" at 2. See applyHideBias below for the exact math.
export const HIDE_BIAS = 1;
// when set, the handler may pass early on frame 1 or 2 while holding a majority even if the
// opponent has not passed yet, to bait overspend. 0 is the bot as it was (it never gives up
// the last word while the opponent can still answer).
export const BAIT_PASS = 0;

function otherSeat(seat) {
	return seat === 'A' ? 'B' : 'A';
}

// merges a rival's weights over the module's own tunables, so a caller that never passes a
// rival gets the exact constants above, and a rival only needs to name the knobs it changes.
function weightsFor(rival) {
	const w = (rival && rival.weights) || {};
	return {
		flipValue: w.flipValue ?? FLIP_VALUE,
		secureValue: w.secureValue ?? SECURE_VALUE,
		stackDiscount: w.stackDiscount ?? STACK_DISCOUNT,
		holdCost: w.holdCost ?? HOLD_COST,
		hiddenHoldGuess: w.hiddenHoldGuess ?? HIDDEN_HOLD_GUESS,
		minSendValue: w.minSendValue ?? MIN_SEND_VALUE,
		overspendAllowance: w.overspendAllowance ?? OVERSPEND_ALLOWANCE,
		nearWindow: w.nearWindow ?? NEAR_WINDOW,
		hideBias: w.hideBias ?? HIDE_BIAS,
		baitPass: w.baitPass ?? BAIT_PASS,
	};
}

function siteFromPublic(publicState, siteId) {
	return publicState.frame.sites.find((s) => s.id === siteId);
}

function visibleEntries(publicState, siteId, seat) {
	return (publicState.board[siteId][seat] || []).filter((e) => e.record);
}

function holdOf(publicState, siteId, entry) {
	return prepare(entry.record, siteFromPublic(publicState, siteId), null, entry.sentIndex).hold;
}

function siteHoldTotal(publicState, siteId, seat) {
	return visibleEntries(publicState, siteId, seat).reduce((sum, e) => sum + holdOf(publicState, siteId, e), 0);
}

// my visible hold minus theirs, with a haircut for every hidden send they have made
function siteMargin(publicState, siteId, seat, weights) {
	const opp = publicState.players[otherSeat(seat)];
	const unseen = (opp.hiddenSentThisRound || 0) * weights.hiddenHoldGuess;
	return siteHoldTotal(publicState, siteId, seat) - siteHoldTotal(publicState, siteId, otherSeat(seat)) - unseen;
}

function traitsOf(record) {
	return traitKeywordsOf(record);
}

// --- the vanguard falls back ---------------------------------------------------------

// "the vanguard falls back": the round's starter placed their first creature this world
// with no information; once per world, before passing, they may relocate it. Scored the
// same way a fresh send is scored (flip a losing/tied site, or secure a winning one), but
// against the DELTA of moving: what the current site loses versus what the destination
// gains, since the vanguard's hold at its current site is already counted in that site's
// margin above (leaving costs exactly what staying was worth there).
function evaluateVanguardRelocation(publicState, handler, margins, weights) {
	const me = publicState.players[handler];
	if (!me.canRelocateVanguard || !me.vanguardRecordId) {
		return null;
	}
	const frame = publicState.frame;
	let fromSiteId = null;
	let vanguardEntry = null;
	frame.sites.forEach((site) => {
		const found = (publicState.board[site.id][handler] || []).find((e) => e.recordId === me.vanguardRecordId);
		if (found) {
			fromSiteId = site.id;
			vanguardEntry = found;
		}
	});
	if (!vanguardEntry || !vanguardEntry.record) {
		return null; // defensive: should always be visible to its own handler
	}

	const fromHold = prepare(vanguardEntry.record, siteFromPublic(publicState, fromSiteId), null, vanguardEntry.sentIndex).hold;
	const fromMargin = margins[fromSiteId];
	// value of STAYING put, in the same units evaluateSend/candidates use below: a site
	// currently flippable/securable is worth losing if the vanguard leaves, so "staying"
	// is worth whatever the vanguard is currently contributing to that site's margin.
	const stayValue = fromMargin <= 0 ? (fromHold > -fromMargin ? weights.flipValue : (2 * fromHold) / (1 - fromMargin)) : weights.secureValue * (fromHold / fromMargin);

	let best = null;
	frame.sites.forEach((site) => {
		if (site.id === fromSiteId) {
			return;
		}
		const prepared = prepare(vanguardEntry.record, site, null, vanguardEntry.sentIndex);
		const h = prepared.hold;
		const m = margins[site.id];
		// margin at the destination as it would be AFTER arriving (m does not yet include
		// the vanguard's own hold there, since it currently stands elsewhere)
		const afterMargin = m + h;
		let moveValue;
		if (m <= 0) {
			moveValue = afterMargin > 0 ? weights.flipValue : (2 * h) / (1 - m);
		} else {
			moveValue = weights.secureValue * (h / (m + h));
		}
		moveValue -= weights.holdCost * h;
		if (prepared.strainLevel === 'severe') {
			moveValue -= 1;
		}
		// net value of relocating here: what arriving is worth, minus what staying was
		// worth (leaving a site that was flipping the match is a real cost, not free)
		const net = moveValue - stayValue;
		if (!best || net > best.net) {
			best = { siteId: site.id, net, moveValue };
		}
	});

	if (!best) {
		return null;
	}
	return best;
}

// applies hideBias to the base hiding rule (canHide && the send is not already safely
// decisive on visible hold alone). hideBias is a multiplier on top of that rule read as:
// 0 never hides; 1 (default) is the rule exactly as written; between 0 and 1 scales down
// how often a qualifying send is actually hidden (a coin flip weighted by the bias); above
// 1, the excess (hideBias - 1, capped at 1) is the chance of hiding EVEN WHEN the base rule
// would send openly, so a bias of 2 hides every stealthy send regardless of the board.
function applyHideBias(baseRuleSaysHide, canHide, hideBias, rng) {
	if (!canHide) {
		return false;
	}
	// hideBias === 1 is the rule exactly as written, with no randomizer draw at all, so the
	// default proctor (weights all defaults) consumes rng in the exact same sequence the
	// bot always has - this keeps "no rival argument" bit-identical to the old behaviour.
	if (hideBias === 1) {
		return baseRuleSaysHide;
	}
	const roll = rng ? rng.float() : 0;
	if (baseRuleSaysHide) {
		return roll < Math.min(1, hideBias);
	}
	const excess = Math.max(0, hideBias - 1);
	return roll < Math.min(1, excess);
}

/*
	chooseSend(publicState, ownRoster, handler, rng, rival) ->
		{ type: 'send', recordId, siteId, hidden } | { type: 'relocate', siteId, reason } |
		{ type: 'pass', reason }

	rival is optional and defaults to the Court proctor (the bot as it always was); see
	RIVALS below for the five handlers and rivalById for the lookup with a safe fallback.
*/
export function chooseSend(publicState, ownRoster, handler, rng, rival) {
	const weights = weightsFor(rival);
	const me = publicState.players[handler];
	const opp = publicState.players[otherSeat(handler)];
	if (me.passed) {
		return { type: 'pass', reason: 'already-passed' };
	}

	const frame = publicState.frame;
	const relocateMargins = {};
	frame.sites.forEach((s) => {
		relocateMargins[s.id] = siteMargin(publicState, s.id, handler, weights);
	});
	const relocation = evaluateVanguardRelocation(publicState, handler, relocateMargins, weights);
	if (relocation && relocation.net > 0 && relocation.moveValue > weights.minSendValue) {
		return { type: 'relocate', siteId: relocation.siteId, reason: 'vanguard-falls-back' };
	}

	const remainingSends = Math.min(SENDABLE - me.sentCount, ownRoster.length);
	if (remainingSends <= 0) {
		return { type: 'pass', reason: 'no-sendable-creatures' };
	}

	const framesAfterThis = FRAMES_PER_MATCH - 1 - publicState.frameIndex;
	const margins = relocateMargins;
	const sitesWinning = frame.sites.filter((s) => margins[s.id] > 0).length;
	const sitesLosing = frame.sites.filter((s) => margins[s.id] < 0).length;
	// spend freely on the last world, or when the sites the opponent is winning right
	// now would clinch the match for them (their potential to clinch is not enough: after
	// a 2-1 first world almost anyone could, and treating that as an emergency emptied
	// the roster on world two and left world three uncontested)
	const mustHold = framesAfterThis === 0 || opp.sitesWon + sitesLosing >= SITES_TO_CLINCH;

	const myOnBoard = frame.sites.reduce((n, s) => n + (publicState.board[s.id][handler] || []).length, 0);
	const evenShare = Math.floor((remainingSends + myOnBoard) / (framesAfterThis + 1));

	// score every (creature, site)
	const candidates = [];
	ownRoster.forEach((record) => {
		frame.sites.forEach((site) => {
			const prepared = prepare(record, site, null, me.sentCount);
			const h = prepared.hold;
			const m = margins[site.id];
			const stacked = (publicState.board[site.id][handler] || []).length;
			let value;
			if (m <= 0) {
				value = h > -m ? weights.flipValue : (2 * h) / (1 - m);
			} else {
				value = weights.secureValue * (h / (m + h));
			}
			value *= Math.pow(weights.stackDiscount, stacked);
			value -= weights.holdCost * h;
			if (prepared.strainLevel === 'severe') {
				value -= 1;
			}
			candidates.push({ record, site, prepared, margin: m, value, flips: m <= 0 && h > -m });
		});
	});
	if (candidates.length === 0) {
		return { type: 'pass', reason: 'no-candidates' };
	}
	candidates.sort((a, b) => b.value - a.value);
	const best = candidates[0];

	// baitPass: on frame 1 or 2, once a majority is held with the even share spent, pass
	// even if the opponent has not passed yet - normally the bot only gives up the last
	// word once the opponent already has (see holding-majority below). Baiting risks the
	// opponent overspending into an open board; it is a bluffer's habit, not a safe one.
	if (weights.baitPass && !mustHold && framesAfterThis > 0 && sitesWinning >= 2 && myOnBoard >= evenShare) {
		return { type: 'pass', reason: 'baiting-overspend' };
	}

	if (!mustHold) {
		// enough of this world: a majority held, the even share spent, and nobody left to
		// answer (passing while the opponent can still respond hands them the last word)
		if (sitesWinning >= 2 && myOnBoard >= evenShare && opp.passed) {
			return { type: 'pass', reason: 'holding-majority' };
		}
		// over the share for this world unless a flip is on offer
		if (myOnBoard >= evenShare + weights.overspendAllowance || (myOnBoard >= evenShare && !best.flips)) {
			return { type: 'pass', reason: 'saving-the-roster' };
		}
	}
	if (best.value < weights.minSendValue && !(mustHold && best.flips)) {
		return { type: 'pass', reason: 'nothing-to-gain' };
	}

	// among near-equal candidates, vary the pick so the bot is not perfectly predictable
	const near = candidates.filter((c) => c.value >= best.value - weights.nearWindow);
	const pick = near.length > 1 && rng ? near[Math.floor(rng.float() * near.length)] : best;

	const canHide = traitsOf(pick.record).includes('stealthy');
	const baseRuleSaysHide = canHide && Math.abs(pick.margin) < pick.prepared.hold;
	const hidden = applyHideBias(baseRuleSaysHide, canHide, weights.hideBias, rng);

	return { type: 'send', recordId: pick.record.id, siteId: pick.site.id, hidden };
}

// --- orders --------------------------------------------------------------------------

// stagger/rout points a strike of `magnitude` would score against a creature of `hold`
function strikeValue(magnitude, hold) {
	if (hold <= 0) {
		return 0;
	}
	const stagger = magnitude >= hold * 0.5 ? 1 : 0;
	const rout = magnitude >= hold ? 1 : 0;
	return stagger + rout;
}

/*
	Estimates the value of ordering `action` for `record` at `site` against the visible
	board, from public information only.
*/
function estimateActionValue(publicState, record, site, sentIndex, action, handler) {
	const frame = publicState.frame;
	const prepared = prepare(record, site, null, sentIndex);
	const act = prepared.acts.find((a) => a.action === action);
	if (action === 'hold' || !act) {
		return 0;
	}
	const opponentSeat = otherSeat(handler);
	const cls = getActClass(action);

	const enemiesAt = (siteId) => visibleEntries(publicState, siteId, opponentSeat).filter((e) => !e.hidden);
	const alliesAt = (siteId) => visibleEntries(publicState, siteId, handler);

	if (act.class === 'support') {
		if (action === 'ward') {
			const threatHere = enemiesAt(site.id).length;
			const projectionThreat = frame.sites.some((s) => enemiesAt(s.id).some((e) => (e.record.abilities || []).some((a) => getActClass(a.action) === ACT_CLASS.PROJECTION)));
			return threatHere > 0 || projectionThreat ? 1 : 0.25;
		}
		if (action === 'mend') {
			const anyStaggered = alliesAt(site.id).some((e) => publicState.staggered && publicState.staggered[e.recordId]);
			return anyStaggered ? 2 : 0;
		}
		if (action === 'terrorize') {
			return enemiesAt(site.id).length > 0 ? 1 + act.magnitude / 10 : 0;
		}
		return 0;
	}

	// area acts: everything at one site, both sides
	if (action === 'burst' || action === 'spray' || action === 'cloud') {
		let bestSiteValue = 0;
		frame.sites.forEach((s) => {
			const gain = enemiesAt(s.id).reduce((sum, e) => sum + strikeValue(act.magnitude, holdOf(publicState, s.id, e)), 0);
			const loss = alliesAt(s.id).reduce((sum, e) => sum + strikeValue(act.magnitude, holdOf(publicState, s.id, e)), 0);
			bestSiteValue = Math.max(bestSiteValue, gain - loss);
		});
		return bestSiteValue > 0 ? bestSiteValue + act.magnitude / 20 : 0;
	}

	// single-target acts: best target in reach
	const reachSites = cls === ACT_CLASS.PROJECTION ? frame.sites.map((s) => s.id) : [site.id];
	let best = 0;
	reachSites.forEach((siteId) => {
		enemiesAt(siteId).forEach((e) => {
			best = Math.max(best, strikeValue(act.magnitude, holdOf(publicState, siteId, e)));
		});
	});
	return best > 0 ? best + act.magnitude / 20 : 0;
}

/*
	chooseOrders(publicState, handler) -> { [creatureId]: actName }
*/
/*
	chooseOrders(publicState, handler, rival) -> { [creatureId]: actName }

	rival is accepted for symmetry with chooseSend and defaults to the Court proctor, but no
	rival currently retunes Orders - every weight in RIVALS below is a Deploy-time knob. If a
	rival ever needs an Orders habit (a bluffer that prefers projection acts, say), it is a
	new weights key threaded through estimateActionValue the same way chooseSend's are.
*/
export function chooseOrders(publicState, handler, rival) {
	const frame = publicState.frame;
	const orders = {};
	frame.sites.forEach((site) => {
		visibleEntries(publicState, site.id, handler).forEach((entry) => {
			const record = entry.record;
			const actions = ['hold', ...(record.abilities || []).map((a) => a.action)];
			let best = { action: 'hold', value: 0 };
			actions.forEach((action) => {
				const value = estimateActionValue(publicState, record, site, entry.sentIndex, action, handler);
				if (value > best.value) {
					best = { action, value };
				}
			});
			orders[entry.recordId] = best.action;
		});
	});
	return orders;
}

// --- the rivals ------------------------------------------------------------------------

// Five rival handlers, in ladder order: the simulator's measured win rate as side A
// against the proctor (200 matches, seed 11, 2026-09-05; the 95 percent interval is about
// plus or minus 7 points), printed on each as `measured.vsProctor` so the intro can say it.
// The order is re-measured whenever a weight moves; it is never asserted. The proctor is
// the default rival. Each is the bot's own tunables with
// a weights override (see weightsFor above for the keys and defaults) plus fiction. Every
// weight not named here keeps the module's default, so an empty weights object is the
// proctor exactly. Per docs/design/reclamation-play-enhancements.md "Pass 1: the rivals".
export const RIVALS = [
	{
		id: 'envoy',
		name: 'Zolto envoy',
		faction: 'the Zolto',
		home: 'Zolton',
		style: 'Rations the roster and waits, refusing to spend past its even share until the frame forces its hand.',
		measured: { vsProctor: 0.375 },
		weights: {
			overspendAllowance: 0,
			holdCost: 0.4,
			minSendValue: 3,
		},
	},
	{
		id: 'heir',
		name: 'Heir of the Thousand Families',
		faction: 'the Thousand Families',
		home: 'Valleron',
		style: 'Secures a lead and stacks it deeper rather than chase the board, and rarely gambles on the near-equal pick.',
		measured: { vsProctor: 0.39 },
		weights: {
			stackDiscount: 0.95,
			secureValue: 5,
			nearWindow: 0.1,
		},
	},
	{
		id: 'broker',
		name: 'Syndicate broker',
		faction: 'the Drainov Syndicate',
		home: 'Drainov',
		style: 'Keeps its creatures hidden until the last moment and bets you cannot tell a bluff from a real threat.',
		measured: { vsProctor: 0.445 },
		weights: {
			hideBias: 1.8,
			hiddenHoldGuess: 2,
			baitPass: 1,
		},
	},
	{
		id: 'proctor',
		name: 'Court proctor',
		faction: 'the Court of Arbitration',
		home: 'Poseidas',
		style: 'Runs the frame by the book, holding what it has and spending only when a world is worth it.',
		measured: { vsProctor: 0.48 },
		weights: {},
	},
	{
		id: 'windsailor',
		name: 'Windsailor crew',
		faction: 'the Windsailors',
		home: 'Saiphus',
		style: 'Piles into every world at once and flips a losing site on the thinnest excuse, roster be damned.',
		measured: { vsProctor: 0.545 },
		weights: {
			flipValue: 14,
			stackDiscount: 0.4,
			minSendValue: 0.5,
			overspendAllowance: 3,
		},
	},
];

export const DEFAULT_RIVAL_ID = 'proctor';

// looks up a rival by id, falling back to the proctor for an unknown or missing id so a
// caller with a stale or corrupt saved choice always gets a legal, unsurprising opponent.
export function rivalById(id) {
	return RIVALS.find((r) => r.id === id) || RIVALS.find((r) => r.id === DEFAULT_RIVAL_ID);
}
