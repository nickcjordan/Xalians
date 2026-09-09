/*
	Expedition, the bot.

	Per docs/design/reclamation-design.md's "The bot" section: public information only.
	Deploy is the only decision left (docs/design/reclamation-base-redesign.md assumption
	1), and it is an allocation problem across three sites with a roster that has to last
	three worlds, so the bot thinks in two currencies: sites it can flip or secure on this
	world, and sends it must keep for the worlds still to come.

	Since the base redesign a send is worth its whole expected effect on the world's
	margin, not just the hold it puts on the table: the creature's hold after strain and
	bolster, PLUS what its role is worth there (roleValueOf below). chooseOrders is gone
	with the Orders phase.

	Only ever reads publicState + the bot's OWN roster; getPublicState never exposes the
	opponent's roster contents or hidden creatures' identity or site.

	Five rival handlers (RIVALS, below) are the same bot with its tunables overridden by a
	weights set, so the ladder is one engine playing five styles rather than five separate
	implementations. The Court proctor is the bot exactly as it always was: chooseSend
	takes an optional rival argument that defaults to the proctor, so every existing call
	site keeps working unchanged.
*/

import { prepare, traitKeywordsOf, magnitudeAgainst, roleOf, round1 } from './creatureOnTable.js';
import { ROLE, SENDABLE, SITES_TO_CLINCH, FRAMES_PER_MATCH, RETURNED_SEND_COST } from './expeditionInterpretation.js';

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

// the match's rules travel on the public state (hold compression, magnitude scale, role
// ablations), so every number the bot reads is the number the engine will use
function rulesOf(publicState) {
	return (publicState && publicState.rules) || null;
}

function prepareAt(publicState, siteId, entry, opts = {}) {
	return prepare(entry.record, siteFromPublic(publicState, siteId), null, entry.sentIndex, {
		rules: rulesOf(publicState),
		...opts,
	});
}

function holdOf(publicState, siteId, entry) {
	// the board already carries the engine's own current hold for every visible creature;
	// prepare() is the fallback for a view built before the field existed
	if (typeof entry.currentHold === 'number') {
		return entry.currentHold;
	}
	return prepareAt(publicState, siteId, entry).hold;
}

// does a bolsterer of this seat already stand at this site?
function bolsterPresent(publicState, siteId, seat) {
	return visibleEntries(publicState, siteId, seat).some(
		(e) => !e.hidden && roleOf(e.record, rulesOf(publicState)) === ROLE.BOLSTER,
	);
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

	const fromHold = prepareAt(publicState, fromSiteId, vanguardEntry).hold
		+ roleValueOf(publicState, vanguardEntry.record, siteFromPublic(publicState, fromSiteId), vanguardEntry.sentIndex, handler);
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
		const prepared = prepare(vanguardEntry.record, site, null, vanguardEntry.sentIndex, {
			rules: rulesOf(publicState),
			bolstered: bolsterPresent(publicState, site.id, handler),
		});
		const h = prepared.hold + roleValueOf(publicState, vanguardEntry.record, site, vanguardEntry.sentIndex, handler, prepared);
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
	scoreSends(publicState, ownRoster, handler, rival) -> {
		candidates, best, margins, weights, remainingSends, capRemaining, evenShare,
		framesAfterThis, mustHold, sitesWinning, sitesLosing, myOnBoard, sendableCap,
	}

	The candidate scoring behind chooseSend, exported as a pure function so devtools can
	read the same shortlist the bot reads (docs/design/game-validation-principles.md's
	"option spread") and so naive policies can be written against the bot's own numbers
	rather than a second implementation of them. Consumes no RNG: everything random in
	chooseSend (the near-equal pick, the hide bias) happens after this returns.

	candidates is sorted best value first; each entry is
	{ record, site, prepared, margin, value, flips, cost }.
*/
export function scoreSends(publicState, ownRoster, handler, rival) {
	const weights = weightsFor(rival);
	const me = publicState.players[handler];
	const opp = publicState.players[otherSeat(handler)];
	const frame = publicState.frame;

	const margins = {};
	frame.sites.forEach((s) => {
		margins[s.id] = siteMargin(publicState, s.id, handler, weights);
	});

	// me.sendableCap is SENDABLE plus this round's trailing-seat bonus, if any (Pass 2's
	// roster-economy lever); falls back to the plain SENDABLE constant for any caller that
	// still hands in a publicState from before the field existed.
	const sendableCap = typeof me.sendableCap === 'number' ? me.sendableCap : SENDABLE;
	const remainingSends = Math.min(sendableCap - me.sentCount, ownRoster.length);

	const framesAfterThis = FRAMES_PER_MATCH - 1 - publicState.frameIndex;
	const sitesWinning = frame.sites.filter((s) => margins[s.id] > 0).length;
	const sitesLosing = frame.sites.filter((s) => margins[s.id] < 0).length;
	// spend freely on the last world, or when the sites the opponent is winning right
	// now would clinch the match for them (their potential to clinch is not enough: after
	// a 2-1 first world almost anyone could, and treating that as an emergency emptied
	// the roster on world two and left world three uncontested)
	const mustHold = framesAfterThis === 0 || opp.sitesWon + sitesLosing >= SITES_TO_CLINCH;

	const myOnBoard = frame.sites.reduce((n, s) => n + (publicState.board[s.id][handler] || []).length, 0);
	const evenShare = Math.floor((remainingSends + myOnBoard) / (framesAfterThis + 1));

	// the Loki line: a record flagged `returned` (own-side only, from getPublicState) costs
	// RETURNED_SEND_COST against the round's remaining cap instead of 1 - skip it outright
	// if the remaining cap cannot afford it, and knock its value down by the cost of the
	// extra unit spent (same currency holdCost already prices a send in).
	const returnedIds = new Set(me.returned || []);
	const capRemaining = sendableCap - me.sentCount;

	// score every (creature, site)
	const candidates = [];
	ownRoster.forEach((record) => {
		const cost = returnedIds.has(record.id) ? RETURNED_SEND_COST : 1;
		if (cost > capRemaining) {
			return;
		}
		frame.sites.forEach((site) => {
			const prepared = prepare(record, site, null, me.sentCount, {
				rules: rulesOf(publicState),
				bolstered: bolsterPresent(publicState, site.id, handler),
			});
			// what this send moves the world's margin by: its own hold, plus what its role
			// is worth standing here (the base redesign's four roles)
			const roleValue = roleValueOf(publicState, record, site, me.sentCount, handler, prepared);
			const h = prepared.hold + roleValue;
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
			if (cost > 1) {
				value -= weights.holdCost * h * (cost - 1);
			}
			candidates.push({
				record, site, prepared, margin: m, value, flips: m <= 0 && h > -m, cost,
				roleValue, effect: h, role: prepared.role,
			});
		});
	});
	candidates.sort((a, b) => b.value - a.value);

	return {
		candidates,
		best: candidates.length > 0 ? candidates[0] : null,
		margins,
		weights,
		sendableCap,
		remainingSends,
		capRemaining,
		framesAfterThis,
		sitesWinning,
		sitesLosing,
		mustHold,
		myOnBoard,
		evenShare,
	};
}

/*
	chooseSend(publicState, ownRoster, handler, rng, rival) ->
		{ type: 'send', recordId, siteId, hidden } | { type: 'relocate', siteId, reason } |
		{ type: 'pass', reason }

	rival is optional and defaults to the Court proctor (the bot as it always was); see
	RIVALS below for the five handlers and rivalById for the lookup with a safe fallback.
	The candidate scoring itself lives in scoreSends above; this function is the policy
	layer over it (relocation, the pass rules, the near-equal pick, the hide bias).
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

	const scored = scoreSends(publicState, ownRoster, handler, rival);
	if (scored.remainingSends <= 0) {
		return { type: 'pass', reason: 'no-sendable-creatures' };
	}
	const { candidates, mustHold, sitesWinning, myOnBoard, evenShare, framesAfterThis } = scored;
	if (candidates.length === 0) {
		return { type: 'pass', reason: 'no-candidates' };
	}
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
	// the base hide rule (docs/design/reclamation-play-enhancements.md "Pass 2 levers"):
	// hide when the send flips or contests a world the rival can still answer (the rival
	// has not passed) AND the creature's hold is at least the site's current margin; send
	// openly when securing a lead. Margin here is BEFORE this creature lands (candidates
	// are always scored against the pre-send margin), so almost every real send has
	// margin <= 0 - the old rule (|margin| < hold) read that as "always hide", which was
	// the flip condition restated and gave hideBias nothing to act on (pass-1 friction).
	// The fix judges the site by where the send LEAVES it: resultMargin is this seat's
	// margin after the creature's own hold is added. A flip or a still-contested site
	// (resultMargin not comfortably positive, i.e. the rival's remaining hold could still
	// answer it) hides; a send that leaves the site solidly ahead (resultMargin at least
	// the creature's own hold beyond breakeven - the rival would need to match this send
	// again just to get back to even) is "securing a lead" and goes openly.
	// A rules ablation can turn hidden sends off entirely (publicState.rules.hiddenSends);
	// the bot must never propose a send the engine would reject, so the flag gates hiding
	// before the bias is ever consulted.
	// Hidden first (assumption 9) is what gives hiding its teeth: a hidden creature's blow
	// lands before anyone else's at its world, so the value of hiding rises by the blow
	// the creature would land. A blow that would be worth nothing here (a presence, or a
	// striker with nothing to hit) gains nothing from going first, and is sent openly
	// unless the site is contested on hold alone.
	const rulesAllowHiding = !publicState.rules || publicState.rules.hiddenSends !== false;
	const hiddenFirstOn = !publicState.rules || publicState.rules.hiddenFirst !== false;
	const hideBonus = hiddenFirstOn ? (pick.roleValue || 0) : 0;
	const effect = pick.prepared.hold + hideBonus;
	const resultMargin = pick.margin + effect;
	// "securing a lead" is unchanged in spirit: the send leaves the site far enough ahead
	// that the rival would have to match this whole creature again just to get back to
	// even. What has changed is that `effect` now counts the role's own worth as well as
	// the hold it puts on the table.
	const securesALead = resultMargin >= pick.prepared.hold;
	const rivalCanStillAnswer = !opp.passed;
	const baseRuleSaysHide = canHide && rivalCanStillAnswer && !securesALead && effect >= pick.margin;
	const wantsHidden = applyHideBias(baseRuleSaysHide, canHide, weights.hideBias, rng);
	const hidden = rulesAllowHiding && wantsHidden;

	return { type: 'send', recordId: pick.record.id, siteId: pick.site.id, hidden };
}

// --- what a role is worth at a world -------------------------------------------------

/*
	Since the base redesign (docs/design/reclamation-base-redesign.md), a send is worth
	its whole expected effect on the world's margin, and a creature's role is most of
	that effect. roleValueOf returns that effect in HOLD UNITS, so it adds straight onto
	the creature's own hold in scoreSends and the flip/secure arithmetic above it does
	not have to change:

	- strike:  the amount it would take off its conduct target, capped by that target's
	           remaining hold (removing eight from a creature holding three is worth
	           three, not eight)
	- area:    the same, summed over every visible enemy at the world, minus the same
	           summed over its own allies there, since an area catches both sides
	- shield:  the largest enemy blow at the world it would cancel
	- bolster: the hold it restores to its allies there, itself included

	Everything is read from public information: visible enemies only, and their holds as
	the board prints them. A hidden enemy is unseen and is priced by the margin's own
	hidden-hold haircut, not here.
*/

// the amount `attacker` would take off `victim`, before the cap
function rawBlowAmount(publicState, siteId, attackerEntry, victimEntry, attackerPrepared) {
	const prepared = attackerPrepared || prepareAt(publicState, siteId, attackerEntry);
	if (!prepared.blow) {
		return 0;
	}
	const rules = rulesOf(publicState);
	let amount = magnitudeAgainst(attackerEntry.record, prepared.blow, victimEntry.record);
	if (prepared.role === ROLE.AREA) {
		amount *= rules && typeof rules.areaDiscount === 'number' ? rules.areaDiscount : 0.6;
	}
	if (traitsOf(victimEntry.record).includes('armored')) {
		const reduction = rules && typeof rules.armoredReduction === 'number' ? rules.armoredReduction : 0.25;
		amount *= 1 - reduction;
	}
	return round1(Math.max(0, amount));
}

// the enemy the actor's conduct is most likely to pick, read from public information.
// A compact reading of expeditionInterpretation.CONDUCT_BY_ARCHETYPE's attacking lines:
// the weakest-seeking lines take the lowest hold, the strongest-seeking lines the
// highest, and everything else falls back to the earliest send, which is the engine's
// own default.
function conductTargetGuess(publicState, siteId, prepared, enemies) {
	if (enemies.length === 0) {
		return null;
	}
	const holds = enemies.map((e) => ({ entry: e, hold: holdOf(publicState, siteId, e) }));
	const line = prepared.conduct.attacking;
	const strongest = ['strongestEnemyInReach', 'enemyThreateningWeakestAlly', 'enemyWithHighestMagnitude'];
	const weakest = ['weakestEnemyInReach', 'slowerEnemyWeakestFirst', 'enemyRoutableElseWeakest', 'enemyWithLowestMagnitude'];
	if (strongest.includes(line)) {
		return holds.reduce((best, c) => (c.hold > best.hold ? c : best)).entry;
	}
	if (weakest.includes(line)) {
		return holds.reduce((best, c) => (c.hold < best.hold ? c : best)).entry;
	}
	if (line === 'enemyMostVulnerableToElement') {
		return holds.reduce((best, c) => {
			const eff = magnitudeAgainst(prepared.record, prepared.blow || { magnitude: 1 }, c.entry.record);
			const bestEff = magnitudeAgainst(prepared.record, prepared.blow || { magnitude: 1 }, best.entry.record);
			return eff > bestEff ? c : best;
		}).entry;
	}
	return holds.reduce((best, c) => (c.entry.sentIndex < best.entry.sentIndex ? c : best)).entry;
}

export function roleValueOf(publicState, record, site, sentIndex, handler, prepared) {
	const seat = handler;
	const opponentSeat = otherSeat(handler);
	const view = prepared || prepare(record, site, null, sentIndex, { rules: rulesOf(publicState) });
	const enemies = visibleEntries(publicState, site.id, opponentSeat).filter((e) => !e.hidden);
	const allies = visibleEntries(publicState, site.id, seat);
	// the creature the bot is scoring is not on the board yet, so it stands in as its own
	// board entry wherever the arithmetic needs one
	const self = { recordId: record.id, record, sentIndex, currentHold: view.hold };

	if (view.role === ROLE.STRIKE) {
		const target = conductTargetGuess(publicState, site.id, view, enemies);
		if (!target) {
			return 0;
		}
		return Math.min(rawBlowAmount(publicState, site.id, self, target, view), holdOf(publicState, site.id, target));
	}

	if (view.role === ROLE.AREA) {
		const gain = enemies.reduce(
			(sum, e) => sum + Math.min(rawBlowAmount(publicState, site.id, self, e, view), holdOf(publicState, site.id, e)),
			0,
		);
		const loss = allies.reduce(
			(sum, e) => sum + Math.min(rawBlowAmount(publicState, site.id, self, e, view), holdOf(publicState, site.id, e)),
			0,
		);
		return round1(gain - loss);
	}

	if (view.role === ROLE.SHIELD) {
		// the largest enemy blow standing here, capped by what it could actually take off
		// the ally it would land on (the weakest of my creatures there, this one included)
		const protectees = [...allies, self];
		const weakest = protectees.reduce(
			(best, e) => (holdOf(publicState, site.id, e) < holdOf(publicState, site.id, best) ? e : best),
			protectees[0],
		);
		let largest = 0;
		enemies.forEach((enemy) => {
			const enemyPrepared = prepareAt(publicState, site.id, enemy);
			const amount = Math.min(
				rawBlowAmount(publicState, site.id, enemy, weakest, enemyPrepared),
				holdOf(publicState, site.id, weakest),
			);
			largest = Math.max(largest, amount);
		});
		// rules.shieldCap prices the cancel, so the bot must price it the same way the
		// engine will pay it out (expeditionRules.resolveWorld, the shield step)
		const rules = rulesOf(publicState);
		const cap = (rules && rules.shieldCap) || 'none';
		if (cap === 'ownHold') {
			return round1(Math.min(largest, view.hold));
		}
		if (cap === 'half') {
			// the blow is cancelled but half of it comes off the shielder, so the net worth
			// to the world's margin is half the blow
			return round1(largest / 2);
		}
		return round1(largest);
	}

	if (view.role === ROLE.BOLSTER) {
		// what arriving restores: every ally here recomputed with the strain lift, plus
		// this creature's own lift, and nothing at all where a bolsterer already stands
		if (bolsterPresent(publicState, site.id, seat)) {
			return 0;
		}
		let restored = 0;
		allies.forEach((ally) => {
			const before = prepareAt(publicState, site.id, ally).hold;
			const after = prepareAt(publicState, site.id, ally, { bolstered: true }).hold;
			restored += Math.max(0, after - before);
		});
		const selfBefore = prepare(record, site, null, sentIndex, { rules: rulesOf(publicState) }).hold;
		const selfAfter = prepare(record, site, null, sentIndex, { rules: rulesOf(publicState), bolstered: true }).hold;
		restored += Math.max(0, selfAfter - selfBefore);
		return round1(restored);
	}

	// ROLE.NONE: a role switched off leaves a plain holder, worth exactly its own hold
	return 0;
}

// --- the rivals ------------------------------------------------------------------------

// Five rival handlers, in ladder order: the simulator's measured win rate as side A
// against the proctor (200 matches, seed 11, 2026-09-05; the 95 percent interval is about
// plus or minus 7 points), printed on each as `measured.vsProctor` so the intro can say it.
// The order is re-measured whenever a weight moves; it is never asserted. The proctor is
// the default rival. `tag` is the two-to-four-word habit printed on the intro plate;
// `style` is the full sentence, shown on pointing. Each is the bot's own tunables with
// a weights override (see weightsFor above for the keys and defaults) plus fiction. Every
// weight not named here keeps the module's default, so an empty weights object is the
// proctor exactly. Per docs/design/reclamation-play-enhancements.md "Pass 1: the rivals".
export const RIVALS = [
	{
		id: 'envoy',
		tag: 'Rations the roster',
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
		tag: 'Stacks a lead',
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
		tag: 'Hides and baits',
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
		tag: 'By the book',
		name: 'Court proctor',
		faction: 'the Court of Arbitration',
		home: 'Poseidas',
		style: 'Runs the frame by the book, holding what it has and spending only when a world is worth it.',
		measured: { vsProctor: 0.48 },
		weights: {},
	},
	{
		id: 'windsailor',
		tag: 'Contests every world',
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
