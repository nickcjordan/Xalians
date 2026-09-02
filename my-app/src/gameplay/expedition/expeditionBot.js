/*
	Expedition — the bot.

	Per docs/design/reclamation-design.md's "The bot" section: public information only.
	Deploy is an allocation problem across three sites with a roster that has to last
	three worlds, so the bot thinks in two currencies: sites it can flip or secure on this
	world, and sends it must keep for the worlds still to come. Orders pick, per creature,
	the act with the best expected outcome against the visible board.

	Only ever reads publicState + the bot's OWN roster; getPublicState never exposes the
	opponent's roster contents or hidden creatures' identity or site.
*/

import { prepare } from './creatureOnTable.js';
import { getActClass, ACT_CLASS, SENDABLE, SITES_TO_CLINCH, WORLDS_PER_MATCH } from './expeditionInterpretation.js';

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

function otherSeat(seat) {
	return seat === 'A' ? 'B' : 'A';
}

function siteFromPublic(publicState, siteId) {
	return publicState.world.sites.find((s) => s.id === siteId);
}

function visibleEntries(publicState, siteId, seat) {
	return (publicState.board[siteId][seat] || []).filter((e) => e.record);
}

function holdOf(publicState, siteId, entry) {
	return prepare(entry.record, siteFromPublic(publicState, siteId), publicState.world, entry.sentIndex).hold;
}

function siteHoldTotal(publicState, siteId, seat) {
	return visibleEntries(publicState, siteId, seat).reduce((sum, e) => sum + holdOf(publicState, siteId, e), 0);
}

// my visible hold minus theirs, with a haircut for every hidden send they have made
function siteMargin(publicState, siteId, seat) {
	const opp = publicState.players[otherSeat(seat)];
	const unseen = (opp.hiddenSentThisRound || 0) * HIDDEN_HOLD_GUESS;
	return siteHoldTotal(publicState, siteId, seat) - siteHoldTotal(publicState, siteId, otherSeat(seat)) - unseen;
}

function traitsOf(record) {
	if (!record.traits) {
		return [];
	}
	return [...(record.traits.guaranteed || []), ...(record.traits.rolled || [])];
}

/*
	chooseSend(publicState, ownRoster, handler, rng) ->
		{ type: 'send', recordId, siteId, hidden } | { type: 'pass', reason }
*/
export function chooseSend(publicState, ownRoster, handler, rng) {
	const me = publicState.players[handler];
	const opp = publicState.players[otherSeat(handler)];
	if (me.passed) {
		return { type: 'pass', reason: 'already-passed' };
	}
	const remainingSends = Math.min(SENDABLE - me.sentCount, ownRoster.length);
	if (remainingSends <= 0) {
		return { type: 'pass', reason: 'no-sendable-creatures' };
	}

	const world = publicState.world;
	const worldsAfterThis = WORLDS_PER_MATCH - 1 - publicState.worldIndex;
	// the opponent could clinch on this world, or it is the last world: spend freely
	const mustHold = worldsAfterThis === 0 || opp.sitesWon + world.sites.length >= SITES_TO_CLINCH;

	const myOnBoard = world.sites.reduce((n, s) => n + (publicState.board[s.id][handler] || []).length, 0);
	const evenShare = Math.floor((remainingSends + myOnBoard) / (worldsAfterThis + 1));

	const margins = {};
	world.sites.forEach((s) => {
		margins[s.id] = siteMargin(publicState, s.id, handler);
	});
	const sitesWinning = world.sites.filter((s) => margins[s.id] > 0).length;

	// score every (creature, site)
	const candidates = [];
	ownRoster.forEach((record) => {
		world.sites.forEach((site) => {
			const prepared = prepare(record, site, world, me.sentCount);
			const h = prepared.hold;
			const m = margins[site.id];
			const stacked = (publicState.board[site.id][handler] || []).length;
			let value;
			if (m <= 0) {
				value = h > -m ? FLIP_VALUE : (2 * h) / (1 - m);
			} else {
				value = SECURE_VALUE * (h / (m + h));
			}
			value *= Math.pow(STACK_DISCOUNT, stacked);
			value -= HOLD_COST * h;
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

	if (!mustHold) {
		// enough of this world: a majority held, the even share spent, and nobody left to
		// answer (passing while the opponent can still respond hands them the last word)
		if (sitesWinning >= 2 && myOnBoard >= evenShare && opp.passed) {
			return { type: 'pass', reason: 'holding-majority' };
		}
		// over the share for this world unless a flip is on offer
		if (myOnBoard >= evenShare + OVERSPEND_ALLOWANCE || (myOnBoard >= evenShare && !best.flips)) {
			return { type: 'pass', reason: 'saving-the-roster' };
		}
	}
	if (best.value < MIN_SEND_VALUE && !(mustHold && best.flips)) {
		return { type: 'pass', reason: 'nothing-to-gain' };
	}

	// among near-equal candidates, vary the pick so the bot is not perfectly predictable
	const near = candidates.filter((c) => c.value >= best.value - 0.25);
	const pick = near.length > 1 && rng ? near[Math.floor(rng.float() * near.length)] : best;

	const canHide = traitsOf(pick.record).includes('stealthy');
	const hidden = canHide && Math.abs(pick.margin) < pick.prepared.hold;

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
	const world = publicState.world;
	const prepared = prepare(record, site, world, sentIndex);
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
			const projectionThreat = world.sites.some((s) => enemiesAt(s.id).some((e) => (e.record.abilities || []).some((a) => getActClass(a.action) === ACT_CLASS.PROJECTION)));
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
		world.sites.forEach((s) => {
			const gain = enemiesAt(s.id).reduce((sum, e) => sum + strikeValue(act.magnitude, holdOf(publicState, s.id, e)), 0);
			const loss = alliesAt(s.id).reduce((sum, e) => sum + strikeValue(act.magnitude, holdOf(publicState, s.id, e)), 0);
			bestSiteValue = Math.max(bestSiteValue, gain - loss);
		});
		return bestSiteValue > 0 ? bestSiteValue + act.magnitude / 20 : 0;
	}

	// single-target acts: best target in reach
	const reachSites = cls === ACT_CLASS.PROJECTION ? world.sites.map((s) => s.id) : [site.id];
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
export function chooseOrders(publicState, handler) {
	const world = publicState.world;
	const orders = {};
	world.sites.forEach((site) => {
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
