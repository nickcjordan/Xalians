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
	implementations. RIVALS is in ladder order (weakest first, by `measured.vsProctor`,
	re-measured 2026-09-10 for the reading bot at 400 to 1000 matches on seeds 7, 13 and
	21: envoy 41, heir 47, proctor 48, broker 48.5, windsailor 50.5). The Court proctor is the bot exactly as it always was: chooseSend
	takes an optional rival argument that defaults to the proctor, so every existing call
	site keeps working unchanged.
*/

import { prepare, traitKeywordsOf, magnitudeAgainst, roleOf, round1 } from './creatureOnTable.js';
import {
	ROLE, SENDABLE, SITES_TO_CLINCH, FRAMES_PER_MATCH, RETURNED_SEND_COST,
	presenceScaleOf, instinctLaneOf,
} from './expeditionInterpretation.js';

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
/*
	THE HIDDEN READ (docs/design/reclamation-base-redesign.md assumption 24). Since pass 4
	hiding is concealment only: a hidden send lands in speed order at full power and costs
	one send, and all it does is keep the rival from knowing which creature went where
	until the Clash. That is worth exactly as much as it makes the rival guess wrong, so
	the bot has to guess. It knows how many hidden sends the rival has made this round
	(publicState.players[x].hiddenSentThisRound, public information), it assumes each is
	worth HIDDEN_HOLD_GUESS of hold and effect, and it spreads that unseen hold across the
	round's worlds by where the rival would most want it (readUnseen below): the worlds
	the rival is losing by less than one creature, then the worlds it is winning
	narrowly, then the rest, priced with the bot's own flip and secure values as though
	the rival scored sends the way it does. READ_SHARPNESS is how hard the guess leans on
	that reading: 0 spreads the unseen hold evenly across the three worlds (a handler who
	knows something is out there but not where), 1 spreads it in proportion to the
	reading, higher values concentrate it on the single likeliest world. A rival can set
	either knob: a handler that does not read at all is hiddenHoldGuess 0.

	Set 2026-09-10 by head-to-head sweeps at 1000 matches on seeds 7, 13 and 21 (each row
	is the variant's win rate against the setting it is compared with):

		guess 8 vs guess 4          66.6 / 65.5 / 62.8
		guess 10 vs guess 4         63.8 / 64.2 / 61.7
		guess 12 vs guess 4         60.7 / 56.2 / 61.6
		guess 6 vs guess 4          53.6 / 55.7 / 54.1
		sharpness 0 vs 1 (guess 8)  55.7 / 56.8 / 56.7
		anticipation 2 vs 1         44.5 / 46.8 / 43.0

	So the guess is 8 (about one creature's hold at the compressed spread) and the spread
	is EVEN: the sharper guess about WHERE the rival would send, priced off the visible
	board, measured worse than no guess at all, on every seed. At the bot's level the read
	is worth having because it stops the handler treating a world as settled while the
	rival can still answer, not because it can tell where the answer will come. The
	sharpness lever stays for a rival that wants a hunch.
*/
export const HIDDEN_HOLD_GUESS = 8;
export const READ_SHARPNESS = 0;
/*
	ANTICIPATION. Measured 2026-09-10 while building the hidden read: a handler that
	always assumed one unseen rival creature was on its way, spread by the read above,
	beat the proctor that did not by 62 to 63 percent on three seeds at 1000 matches (68
	to 72 at the settings above), and the handler that ignored unseen creatures altogether
	by 71 to 72. Nothing about that
	is hiding: a rival who has not passed will send again, and its next send is exactly
	as unknown as a hidden one. So the read counts the rival's sends still to come this
	round along with the ones it has hidden: ANTICIPATION is how many more sends the
	handler expects from a rival who has not passed (0 is the pass 3 bot, which scored
	the board as if the rival would never move again).
*/
export const ANTICIPATION = 1;
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
/*
	What concealment alone is worth, in hold units, apart from landing first. A hidden send
	is unseen at Deploy, and the opponent's own margin reading discounts every world by
	hiddenHoldGuess for each hidden send it knows was made, so hiding distorts what the
	rival thinks it is looking at even when the creature has nothing to attack. Without
	this a presence, or a striker sent to a world with no enemy on it yet, would price
	hiding at exactly zero and never hide, which is not how a bluffer plays.
*/
export const HIDE_CONCEALMENT_VALUE = 1;
// when set, the handler may pass early on frame 1 or 2 while holding a majority even if the
// opponent has not passed yet, to bait overspend. 0 is the bot as it was (it never gives up
// the last word while the opponent can still answer).
export const BAIT_PASS = 0;
/*
	The stake (docs/design/reclamation-base-redesign.md assumption 22). A handler stakes when
	one of the round's worlds suits its remaining roster better than the others by a margin;
	the margin it demands is smaller when it is behind on worlds, because a stake is a
	chosen risk and a trailing handler is the one who needs one. STAKE_EAGERNESS is a
	rival-weighted habit: the threshold is DIVIDED by it, so a keener rival stakes on a
	thinner edge and a cautious one waits for a world it is sure of.
*/
export const STAKE_EAGERNESS = 1;
/*
	The edge, in hold units, a world must have over the round's average before this handler
	stakes it. Set 2026-09-10 by a sweep at 200 matches, seed 7 (thresholds 2.6, 3.6, 4.4,
	4.8, 5.2 against the STAKE_ROSTER_DEPTH reading): Provings staked 78, 49.5, 30, 22 and
	17 percent, and the staker's win rate on its staked world against its own unstaked
	worlds of the same round 47.1/45.6, 43.4/47.5, 53.3/49.0, 47.7/49.3 and 50.0/50.8.
	4.4 is the setting that sits inside the 20 to 60 percent usage gauge AND is the only one
	where the staker holds its staked world more often than the worlds it did not stake, so
	the stake is not a trap at the bot's level of play.
*/
export const STAKE_THRESHOLD_BEHIND = 4.4;
// the edge demanded when level or ahead: "only on a strongly favored world"
export const STAKE_THRESHOLD_AHEAD = 8.0;
// how much of the visible margin at a world counts toward its edge. The stake is declared
// before the handler's first send of the round, so the board is usually near empty and the
// roster's fit for the world is most of what there is to read.
export const STAKE_VISIBLE_WEIGHT = 0.5;
/*
	How many of the handler's remaining creatures the stake reads at a world. A stake is a
	claim about the creatures the handler will actually SEND there, not about its whole
	bench, and the sendable cap means only a handful of them ever stand at any one world -
	so the edge is read off the best few holds rather than the roster mean.
*/
export const STAKE_ROSTER_DEPTH = 5;

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
		readSharpness: w.readSharpness ?? READ_SHARPNESS,
		anticipation: w.anticipation ?? ANTICIPATION,
		minSendValue: w.minSendValue ?? MIN_SEND_VALUE,
		overspendAllowance: w.overspendAllowance ?? OVERSPEND_ALLOWANCE,
		nearWindow: w.nearWindow ?? NEAR_WINDOW,
		hideBias: w.hideBias ?? HIDE_BIAS,
		concealmentValue: w.concealmentValue ?? HIDE_CONCEALMENT_VALUE,
		baitPass: w.baitPass ?? BAIT_PASS,
		stakeEagerness: w.stakeEagerness ?? STAKE_EAGERNESS,
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

// the presence scale of the strongest bolsterer standing here, since charisma prices what
// a bolster restores and bolsters never stack (assumption 17). 1 where none stands, which
// is what holdAtSite treats as "no bolster".
function bolsterScaleAt(publicState, siteId, seat) {
	const rules = rulesOf(publicState);
	let best = null;
	visibleEntries(publicState, siteId, seat).forEach((e) => {
		if (e.hidden || roleOf(e.record, rules) !== ROLE.BOLSTER) {
			return;
		}
		const scale = presenceScaleOf(e.record, rules);
		if (best === null || scale > best) {
			best = scale;
		}
	});
	return best === null ? 1 : best;
}

// what one world counts toward the Charter this round: 1 normally, 2 where one handler
// staked it and 3 where both did (assumption 22). Read off the public state's own `stakes`
// view so the bot and the engine can never price a world differently.
function stakeValueAt(publicState, siteId) {
	const stakes = publicState && publicState.stakes;
	const entry = stakes && stakes[siteId];
	return entry && typeof entry.countedValue === 'number' ? entry.countedValue : 1;
}

function siteHoldTotal(publicState, siteId, seat) {
	return visibleEntries(publicState, siteId, seat).reduce((sum, e) => sum + holdOf(publicState, siteId, e), 0);
}

// my visible hold minus theirs at one site, before any guess about hidden sends
function visibleMargin(publicState, siteId, seat) {
	return siteHoldTotal(publicState, siteId, seat) - siteHoldTotal(publicState, siteId, otherSeat(seat));
}

/*
	readUnseen(publicState, seat, weights) -> { [siteId]: unseenHold }  (+ .shares, .unseen)

	The read (see HIDDEN_HOLD_GUESS and ANTICIPATION above). Every hidden send the rival
	has made this round, plus weights.anticipation sends still to come if it has not
	passed, is assumed to be worth weights.hiddenHoldGuess, and that total is spread
	across the round's worlds in proportion to how much the rival would gain by adding one
	creature there, read with this handler's own flip and secure values off the visible
	board: a flip (the rival is behind by less than the guess) is worth flipValue, a
	partial contest 2h / (1 + deficit), a narrow secure secureValue * h / (lead + h), each
	discounted by stackDiscount for every rival creature already standing there. The
	shares are raised to weights.readSharpness before they are normalized, so 0 is an even
	spread and larger values a sharper guess. Exported for the devtools and the table's
	advice, which show the handler what the bot thinks is where.
*/
export function readUnseen(publicState, seat, weights = weightsFor(null)) {
	const opp = publicState.players[otherSeat(seat)];
	const sites = publicState.frame.sites;
	// a hidden send is one of the sends the handler was already anticipating, not an extra
	// one: the unseen count is the larger of the two while the rival can still send, and
	// only the hidden sends once it has passed. (Adding them instead made the read's
	// weight jump every time the rival hid, which measured as hiding helping or hurting
	// the hider by five points depending only on the anticipation setting.)
	const hiddenOut = opp.hiddenSentThisRound || 0;
	const n = opp.passed ? hiddenOut : Math.max(hiddenOut, Math.max(0, weights.anticipation));
	const h = weights.hiddenHoldGuess;
	const out = {};
	if (n === 0 || !(h > 0)) {
		sites.forEach((s) => { out[s.id] = 0; });
		return Object.defineProperties(out, {
			shares: { value: {}, enumerable: false },
			unseen: { value: 0, enumerable: false },
		});
	}
	const gains = sites.map((site) => {
		// the rival's margin at this world is the negative of mine
		const m = -visibleMargin(publicState, site.id, seat);
		let gain;
		if (m <= 0) {
			gain = h > -m ? weights.flipValue : (2 * h) / (1 - m);
		} else {
			gain = weights.secureValue * (h / (m + h));
		}
		const stacked = (publicState.board[site.id][otherSeat(seat)] || []).length;
		gain *= Math.pow(weights.stackDiscount, stacked);
		return Math.max(0, gain);
	});
	const sharp = Math.max(0, weights.readSharpness);
	const raised = gains.map((g) => (sharp === 0 ? 1 : Math.pow(g, sharp)));
	const total = raised.reduce((a, b) => a + b, 0);
	const shares = {};
	sites.forEach((site, i) => {
		const share = total > 0 ? raised[i] / total : 1 / sites.length;
		shares[site.id] = share;
		out[site.id] = round1(n * h * share);
	});
	// the shares and the unseen total ride along, non-enumerable so the per-site map
	// still reads as a plain { siteId: hold } to anything that iterates it
	return Object.defineProperties(out, {
		shares: { value: shares, enumerable: false },
		unseen: { value: n * h, enumerable: false },
	});
}

/*
	The worth of putting `h` of hold and effect at a world whose margin (mine minus
	theirs) is `m`: a flip is worth flipValue, a partial contest 2h / (1 - m), adding to a
	lead secureValue * h / (m + h). One function so the send, the swift move and the
	hidden read all price a world the same way.
*/
function worthAt(h, m, weights) {
	if (m <= 0) {
		return h > -m ? weights.flipValue : (2 * h) / (1 - m);
	}
	return weights.secureValue * (h / (m + h));
}

/*
	hypothesesOf(publicState, handler, weights, read) -> [{ p, margins }]

	The hidden read as a set of guesses rather than a haircut. Under each hypothesis every
	hidden creature the rival has out this round stands at one world, that world's margin
	is the visible margin less the whole unseen total, and the other two worlds are as
	they look; the hypothesis has the read's share for that world as its weight. A send
	is then valued as the weighted average of its worth under each guess, which is what
	keeps a phantom half-creature at every world from tipping the flip thresholds the
	scoring is built on (measured 2026-09-10: subtracting the spread-out guess from every
	margin made the reading handler WORSE than one that ignored hidden sends entirely,
	one to four points on three seeds, because it stopped seeing flips that were there).
	With no hidden send out there is one hypothesis: the board as it looks.
*/
function hypothesesOf(publicState, handler, weights, read) {
	const sites = publicState.frame.sites;
	const visible = {};
	sites.forEach((s) => { visible[s.id] = visibleMargin(publicState, s.id, handler); });
	if (!read || !(read.unseen > 0)) {
		return [{ p: 1, margins: visible }];
	}
	return sites
		.map((site) => {
			const p = read.shares[site.id] || 0;
			const margins = { ...visible, [site.id]: visible[site.id] - read.unseen };
			return { p, margins };
		})
		.filter((hyp) => hyp.p > 0);
}

// my visible hold minus theirs, less the unseen hold the read puts at this site
function siteMargin(publicState, siteId, seat, weights, read) {
	const unseen = (read || readUnseen(publicState, seat, weights))[siteId] || 0;
	return visibleMargin(publicState, siteId, seat) - unseen;
}

function traitsOf(record) {
	return traitKeywordsOf(record);
}

// --- swift creatures move -------------------------------------------------------------

/*
	"Swift creatures move" (docs/design/reclamation-base-redesign.md assumption 20), which
	replaced the vanguard fall-back. The bot scores a move exactly the way it scores a fresh
	send, but against the DELTA of moving: what the creature's current world loses versus
	what the destination gains, since its hold is already counted in the current world's
	margin (leaving costs exactly what staying was worth there). Every swift creature that
	has not moved this round is considered, and at most one move is proposed per turn.
*/
function evaluateSwiftMoves(publicState, handler, margins, weights) {
	const me = publicState.players[handler];
	const movable = me.movableRecordIds || [];
	if (movable.length === 0) {
		return null;
	}
	const frame = publicState.frame;

	let overall = null;
	movable.forEach((recordId) => {
		let fromSiteId = null;
		let entry = null;
		frame.sites.forEach((site) => {
			const found = (publicState.board[site.id][handler] || []).find((e) => e.recordId === recordId);
			if (found) {
				fromSiteId = site.id;
				entry = found;
			}
		});
		if (!entry || !entry.record) {
			return; // defensive: a handler's own creatures are always visible to it
		}

		const fromHold = prepareAt(publicState, fromSiteId, entry).hold
			+ roleValueOf(publicState, entry.record, siteFromPublic(publicState, fromSiteId), entry.sentIndex, handler);
		const fromMargin = margins[fromSiteId];
		// value of STAYING put, in the same units the send candidates use: a world currently
		// flippable or securable is worth losing if this creature leaves, so "staying" is
		// worth whatever it is currently contributing to that world's margin.
		const stayValue = fromMargin <= 0
			? (fromHold > -fromMargin ? weights.flipValue : (2 * fromHold) / (1 - fromMargin))
			: weights.secureValue * (fromHold / fromMargin);

		frame.sites.forEach((site) => {
			if (site.id === fromSiteId) {
				return;
			}
			const prepared = prepare(entry.record, site, null, entry.sentIndex, {
				rules: rulesOf(publicState),
				bolstered: bolsterPresent(publicState, site.id, handler),
				bolsterScale: bolsterScaleAt(publicState, site.id, handler),
			});
			const h = prepared.hold + roleValueOf(publicState, entry.record, site, entry.sentIndex, handler, prepared);
			const m = margins[site.id];
			// margin at the destination as it would be AFTER arriving (m does not yet include
			// this creature's hold there, since it currently stands elsewhere)
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
			const net = moveValue - stayValue;
			if (!overall || net > overall.net) {
				overall = { recordId, siteId: site.id, net, moveValue };
			}
		});
	});

	return overall;
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
	priceHiding(publicState, weights, candidate) -> { hideValue, hideCost, hideAffordable }

	What hiding this send is worth, in the same hold units every other number in scoreSends
	is in. Since pass 4 (assumption 24) hiding is concealment only, so in the shipped game
	this is weights.concealmentValue and nothing else: the rules levers below are all at
	their off settings and only an ablation row turns them on. They stay priced so the bot
	never proposes a hidden send that is worse than the open one under any lever, and
	never one the engine would reject:

	- rules.hiddenFirst: the pass 2 gain. Going first is worth the creature's role value,
	  because an attack that lands before the reply lands unhurt and may take its target
	  off the world entirely.
	- rules.hiddenPower: the loss. An attack from hiding lands at hiddenPower of its power,
	  whether or not it goes first, so hiding costs (1 - hiddenPower) of the role value.
	- rules.hiddenSendCost: the cap. Extra units against the round's sendable cap are
	  priced the way the Loki line's extra unit already is, and a send the remaining cap
	  cannot afford to hide is marked unaffordable rather than discounted.
*/
function priceHiding(publicState, weights, candidate) {
	const rules = rulesOf(publicState);
	const { record, roleValue = 0, effect = 0, cost = 1, capRemaining = 0 } = candidate;
	const canHide = traitsOf(record).includes('stealthy') && (!rules || rules.hiddenSends !== false);
	if (!canHide) {
		return { hideValue: 0, hideCost: cost, hideAffordable: false };
	}
	const hiddenSendCost = rules && typeof rules.hiddenSendCost === 'number' ? rules.hiddenSendCost : 1;
	const hiddenPower = rules && typeof rules.hiddenPower === 'number' ? rules.hiddenPower : 1;
	const goesFirst = !!(rules && rules.hiddenFirst);
	// concealmentValue is a rival-weighted habit, not a rules discount: the engine charges
	// both seats the same hiddenSendCost, and this is only how much a given handler BELIEVES
	// an unseen send is worth. A bluffer reads it higher than a proctor does.
	const firstGain = (goesFirst ? roleValue * hiddenPower : 0) + weights.concealmentValue;
	const powerLoss = (1 - hiddenPower) * roleValue;
	const hideCost = Math.max(cost, hiddenSendCost);
	// The extra units a hidden send costs against the round's cap, priced the way the Loki
	// line's extra unit already is - and divided by hideBias, because hideBias is exactly
	// "how much this handler likes hiding", so a broker weighs the send it gives up less
	// than a proctor does. Without this the price of hiding flattened every rival's habit
	// onto the same hidden rate (measured 2026-09-10: at hiddenSendCost 2 the broker's rate
	// fell to the proctor's on all three seeds), which would cost the ladder a character.
	const capPenalty = (weights.holdCost * effect * (hideCost - cost)) / Math.max(0.25, weights.hideBias);
	return {
		hideValue: round1(firstGain - powerLoss - capPenalty),
		hideCost,
		hideAffordable: hideCost <= capRemaining,
	};
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

	const read = readUnseen(publicState, handler, weights);
	// the expected margins (visible less the read's haircut) drive the pass rules and are
	// what the candidates report; the candidates' VALUES are averaged over the read's
	// hypotheses instead (hypothesesOf above)
	const margins = {};
	frame.sites.forEach((s) => {
		margins[s.id] = siteMargin(publicState, s.id, handler, weights, read);
	});
	const hypotheses = hypothesesOf(publicState, handler, weights, read);

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
				bolsterScale: bolsterScaleAt(publicState, site.id, handler),
			});
			// what this send moves the world's margin by: its own hold, plus what its role
			// is worth standing here (the base redesign's four roles)
			const roleValue = roleValueOf(publicState, record, site, me.sentCount, handler, prepared);
			const h = prepared.hold + roleValue;
			const m = margins[site.id];
			const stacked = (publicState.board[site.id][handler] || []).length;
			let value = hypotheses.reduce((sum, hyp) => sum + hyp.p * worthAt(h, hyp.margins[site.id], weights), 0);
			// a staked world is worth two toward the Charter, three if both handlers staked
			// it (assumption 22), so it is worth spending proportionally more on. Without
			// this the stake would be a declaration the bot never acted on, and the staker
			// would double a world it then played exactly as it played the other two.
			value *= stakeValueAt(publicState, site.id);
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
				// what hiding this particular send is worth, priced against all three of
				// pass 3's hiding levers (assumption 21). chooseSend reads it rather than
				// recomputing the first-strike bonus itself.
				...priceHiding(publicState, weights, {
					record, site, roleValue, effect: h, cost, capRemaining, handler,
				}),
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
		{ type: 'send', recordId, siteId, hidden } | { type: 'move', recordId, siteId, reason } |
		{ type: 'pass', reason }

	rival is optional and defaults to the Court proctor (the bot as it always was); see
	RIVALS below for the five handlers and rivalById for the lookup with a safe fallback.
	The candidate scoring itself lives in scoreSends above; this function is the policy
	layer over it (the swift move, the pass rules, the near-equal pick, the hide bias).
*/
export function chooseSend(publicState, ownRoster, handler, rng, rival) {
	const weights = weightsFor(rival);
	const me = publicState.players[handler];
	const opp = publicState.players[otherSeat(handler)];
	if (me.passed) {
		return { type: 'pass', reason: 'already-passed' };
	}

	const frame = publicState.frame;
	const read = readUnseen(publicState, handler, weights);
	const moveMargins = {};
	frame.sites.forEach((s) => {
		moveMargins[s.id] = siteMargin(publicState, s.id, handler, weights, read);
	});
	const swiftMove = evaluateSwiftMoves(publicState, handler, moveMargins, weights);
	if (swiftMove && swiftMove.net > 0 && swiftMove.moveValue > weights.minSendValue) {
		return { type: 'move', recordId: swiftMove.recordId, siteId: swiftMove.siteId, reason: 'swift-move' };
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
	// Pass 3 (assumption 21): the worth of hiding THIS send is priced in scoreSends by
	// priceHiding, against all three hiding levers at once, so a lever that makes hiding
	// worthless (or unaffordable) turns the bot off it without any rule here changing.
	const rulesAllowHiding = !publicState.rules || publicState.rules.hiddenSends !== false;
	const hideBonus = Math.max(0, pick.hideValue || 0);
	const effect = pick.prepared.hold + hideBonus;
	const resultMargin = pick.margin + effect;
	// "securing a lead" is unchanged in spirit: the send leaves the site far enough ahead
	// that the rival would have to match this whole creature again just to get back to
	// even. What has changed is that `effect` now counts the role's own worth as well as
	// the hold it puts on the table.
	const securesALead = resultMargin >= pick.prepared.hold;
	const rivalCanStillAnswer = !opp.passed;
	// hiding has to be worth something and has to be affordable against the round's cap
	// before the base rule is even consulted (assumption 21)
	const hidingPays = (pick.hideValue || 0) > 0 && pick.hideAffordable !== false;
	const baseRuleSaysHide = canHide && hidingPays && rivalCanStillAnswer && !securesALead && effect >= pick.margin;
	const wantsHidden = applyHideBias(baseRuleSaysHide, canHide && hidingPays, weights.hideBias, rng);
	const hidden = rulesAllowHiding && wantsHidden;

	return { type: 'send', recordId: pick.record.id, siteId: pick.site.id, hidden };
}

// --- the stake ------------------------------------------------------------------------

/*
	chooseStake(publicState, ownRoster, handler, rival) -> { type: 'stake', siteId, edge } | null

	THE STAKE (docs/design/reclamation-base-redesign.md assumption 22). Before its first
	send of a round, a handler may stake one of the round's three worlds, once per Proving:
	whoever holds it at the Ruling counts it two toward the Charter, three if both staked
	it, and a tie counts nothing. It is a chosen risk, never a gift, so the bot only takes
	it where its own remaining roster reads the world better than the other two.

	The edge of a world is how much better this handler's REMAINING roster holds there than
	at the round's average world, plus a share of whatever margin is already visible on the
	board (usually nothing, since the stake is declared before the first send). The
	threshold that edge must clear is STAKE_THRESHOLD_BEHIND when this handler is behind on
	worlds and STAKE_THRESHOLD_AHEAD when it is level or ahead - "when ahead, only on a
	strongly favored world" - and both are divided by the rival's stakeEagerness, so the
	windsailor stakes sooner than the envoy on the same board.

	Reads public information only, plus this handler's own roster, exactly like chooseSend.
	Consumes no RNG.
*/
export function chooseStake(publicState, ownRoster, handler, rival) {
	const rules = rulesOf(publicState);
	if (rules && rules.stake === false) {
		return null;
	}
	const weights = weightsFor(rival);
	const me = publicState.players[handler];
	const opp = publicState.players[otherSeat(handler)];
	const stakeable = new Set(me.stakeableSiteIds || []);
	if (stakeable.size === 0 || ownRoster.length === 0) {
		return null;
	}

	const frame = publicState.frame;
	const meanHoldAt = {};
	frame.sites.forEach((site) => {
		const holds = ownRoster
			.map((record) => prepare(record, site, null, 0, { rules }).hold)
			.sort((a, b) => b - a)
			.slice(0, STAKE_ROSTER_DEPTH);
		meanHoldAt[site.id] = holds.reduce((a, b) => a + b, 0) / holds.length;
	});
	const across = frame.sites.reduce((sum, site) => sum + meanHoldAt[site.id], 0) / frame.sites.length;

	let best = null;
	frame.sites.forEach((site) => {
		if (!stakeable.has(site.id)) {
			return;
		}
		const visible = siteHoldTotal(publicState, site.id, handler)
			- siteHoldTotal(publicState, site.id, otherSeat(handler));
		const edge = (meanHoldAt[site.id] - across) + STAKE_VISIBLE_WEIGHT * visible;
		if (!best || edge > best.edge) {
			best = { siteId: site.id, edge };
		}
	});
	if (!best) {
		return null;
	}

	const behind = me.sitesWon < opp.sitesWon;
	const eagerness = weights.stakeEagerness > 0 ? weights.stakeEagerness : 1;
	const threshold = (behind ? STAKE_THRESHOLD_BEHIND : STAKE_THRESHOLD_AHEAD) / eagerness;
	if (best.edge < threshold) {
		return null;
	}
	return { type: 'stake', siteId: best.siteId, edge: round1(best.edge) };
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
	- sweep:   the same, summed over every visible enemy at the world, minus the same
	           summed over its own allies there, since a sweep catches both sides
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
	if (prepared.role === ROLE.SWEEP) {
		amount *= rules && typeof rules.sweepDiscount === 'number' ? rules.sweepDiscount : 0.6;
	}
	if (traitsOf(victimEntry.record).includes('armored')) {
		const reduction = rules && typeof rules.armoredReduction === 'number' ? rules.armoredReduction : 0.25;
		amount *= 1 - reduction;
	}
	return round1(Math.max(0, amount));
}

/*
	The enemy the actor is most likely to hit, read from public information.

	Instinct decides which lane it reads (docs/design/reclamation-base-redesign.md
	assumption 17), through the same instinctLaneOf the engine's own pick uses, so the
	preview and the engine can never disagree about the lane:

	- keen: the enemy this attack can down, else the one it takes the most off
	- dull: the enemy sent earliest
	- conduct: the archetype's line, read compactly (the weakest-seeking lines take the
	  lowest hold, the strongest-seeking lines the highest, everything else the earliest
	  send, which is the engine's own default)

	The bot still reads the conduct lane compactly rather than replaying the engine's full
	pick; that is recorded friction from the first measurements and is unchanged here.
*/
function conductTargetGuess(publicState, siteId, prepared, enemies, selfEntry) {
	if (enemies.length === 0) {
		return null;
	}
	const holds = enemies.map((e) => ({ entry: e, hold: holdOf(publicState, siteId, e) }));
	const lane = instinctLaneOf(prepared.record, rulesOf(publicState));
	if (lane === 'dull') {
		return holds.reduce((best, c) => (c.entry.sentIndex < best.entry.sentIndex ? c : best)).entry;
	}
	if (lane === 'keen') {
		const actor = selfEntry || { recordId: prepared.record.id, record: prepared.record, sentIndex: prepared.sentIndex };
		const withPower = holds.map((c) => ({
			...c,
			power: rawBlowAmount(publicState, siteId, actor, c.entry, prepared),
		}));
		const downable = withPower.filter((c) => c.power >= c.hold);
		if (downable.length > 0) {
			return downable.reduce((best, c) => (c.hold > best.hold ? c : best)).entry;
		}
		return withPower.reduce((best, c) => (Math.min(c.power, c.hold) > Math.min(best.power, best.hold) ? c : best)).entry;
	}
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
		const target = conductTargetGuess(publicState, site.id, view, enemies, self);
		if (!target) {
			return 0;
		}
		return Math.min(rawBlowAmount(publicState, site.id, self, target, view), holdOf(publicState, site.id, target));
	}

	if (view.role === ROLE.SWEEP) {
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
		// charisma scales the fraction the shielder actually cancels, clamped at the whole
		// attack, exactly as the engine's shield step does (assumption 17)
		const scale = Math.min(1, presenceScaleOf(record, rules));
		if (cap === 'ownHold') {
			return round1(Math.min(largest, view.hold) * scale);
		}
		if (cap === 'half') {
			// the attack is cancelled but half of it comes off the shielder, so the net
			// worth to the world's margin is half of what it cancels
			return round1((largest * scale) / 2);
		}
		return round1(largest * scale);
	}

	if (view.role === ROLE.BOLSTER) {
		// what arriving restores: every ally here recomputed with the strain lift, plus
		// this creature's own lift, and nothing at all where a bolsterer already stands
		if (bolsterPresent(publicState, site.id, seat)) {
			return 0;
		}
		// charisma prices what this bolsterer restores (assumption 17), so the scale that
		// travels into every recomputation below is the ARRIVING creature's own
		const bolsterScale = presenceScaleOf(record, rulesOf(publicState));
		let restored = 0;
		allies.forEach((ally) => {
			const before = prepareAt(publicState, site.id, ally).hold;
			const after = prepareAt(publicState, site.id, ally, { bolstered: true, bolsterScale }).hold;
			restored += Math.max(0, after - before);
		});
		const selfBefore = prepare(record, site, null, sentIndex, { rules: rulesOf(publicState) }).hold;
		const selfAfter = prepare(record, site, null, sentIndex, { rules: rulesOf(publicState), bolstered: true, bolsterScale }).hold;
		restored += Math.max(0, selfAfter - selfBefore);
		return round1(restored);
	}

	// ROLE.NONE: a role switched off leaves a plain holder, worth exactly its own hold
	return 0;
}

// --- the rivals ------------------------------------------------------------------------

// Five rival handlers, in ladder order: the simulator's measured win rate as side A
// against the proctor (200 matches, seed 11, re-measured 2026-09-10 for the pass 3 game;
// the 95 percent interval is about plus or minus 7 points), printed on each as
// `measured.vsProctor` so the intro can say it. The order moved with that re-measurement:
// pricing hiding cost the broker its place near the top, the heir's stacking gained most
// from the priced game, and the windsailor came back to the middle.
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
		measured: { vsProctor: 0.41 },
		weights: {
			stakeEagerness: 0.6,
			overspendAllowance: 0,
			/*
				Retuned 2026-09-10 for the reading bot (pass 4). The envoy used to ration
				by pricing hold at holdCost 0.4 as well; under the read, which values a
				send by its average worth across the rival's possible answers, that
				doubled price left it at 7 to 9 percent against the proctor. Sweep at 400
				matches on seeds 7, 13 and 21: holdCost 0.4 with minSendValue 3 read
				9.3 / 7.0 / 9.5, 0.3 with 2 read 28 / 29 / 32, 0.2 with 3 read 42.5 /
				40.3 / 40.8, overspend 0 alone 44 / 41.3 / 41.8. The default hold cost
				with the high bar on a send keeps the character (it still refuses to
				spend past its share, and still waits for a send worth three) inside the
				40 to 45 band.
			*/
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
		measured: { vsProctor: 0.47 },
		weights: {
			stakeEagerness: 0.8,
			stackDiscount: 0.95,
			secureValue: 5,
			nearWindow: 0.1,
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
		// the proctor is the module's own tunables exactly, stakeEagerness 1 included
		weights: {},
	},
	{
		id: 'broker',
		tag: 'Hides and baits',
		name: 'Syndicate broker',
		faction: 'the Drainov Syndicate',
		home: 'Drainov',
		style: 'Keeps its creatures hidden until the last moment and bets you cannot tell a bluff from a real threat.',
		measured: { vsProctor: 0.485 },
		weights: {
			stakeEagerness: 1.2,
			/*
				Pass 4 (assumption 24): hiding is concealment only and free, so the broker
				hides every stealthy creature it sends (2 is "always hide a stealthy
				creature" in applyHideBias). The pass 3 retune to 1.3 was for the priced
				game and is superseded; the broker's hidden rate has to sit above the
				proctor's, which is the one thing its habit may not fail to do.
			*/
			hideBias: 2,
			baitPass: 1,
		},
	},
	{
		id: 'windsailor',
		tag: 'Contests every world',
		name: 'Windsailor crew',
		faction: 'the Windsailors',
		home: 'Saiphus',
		style: 'Piles into every world at once and flips a losing site on the thinnest excuse, roster be damned.',
		measured: { vsProctor: 0.505 },
		weights: {
			stakeEagerness: 1.5,
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
