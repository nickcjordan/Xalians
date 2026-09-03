/*
	Tribute — the greedy bot.

	Per docs/design/tribute-design.md's "The bot" section: public information only, a
	greedy placement scorer, an exact cheapest-winning-plan subset search over the small
	hand, three match states (must-win / can-yield / even), and a deliberate thin-lead
	bluff pass. Must use ONLY publicState + the bot's own hand - never
	state.players[opponent].hand, which getPublicState never exposes anyway.

	The economy in one sentence: a round you can afford to lose is only worth winning if it
	is cheap, and a card you do not have to spend is a card you take into the decisive round.

	chooseAction(publicState, hand, botPlayer, rngState) -> { action, nextRngState }

	action is one of:
		{ type: 'playCreature', cardId, row }
		{ type: 'playDecree', element, row }
		{ type: 'pass', reason }

	reason is one of: 'winning-after-opp-pass' | 'cannot-catch-up' | 'yield-after-opp-pass' |
	'unbeatable' | 'ahead-parity' | 'yield' | 'bluff' | 'no-legal-action'. The rules
	engine's pass(state, player) ignores it; it exists for tests and simulator stats.
*/

import { ROWS, COURT_FAVOR, nextRandom } from './tributeRules.js';
import { decreeContribution } from './decreeCalculator.js';

// --- tunables -----------------------------------------------------------------------

// pass with probability BLUFF_PASS_PROBABILITY when ahead by <= BLUFF_LEAD_THRESHOLD with
// strictly more cards than the opponent (design doc: "readable but not robotic")
export const BLUFF_PASS_PROBABILITY = 0.2;
export const BLUFF_LEAD_THRESHOLD = 3;

// the opponent holding this many round wins makes the current round must-win
export const MUST_WIN_OPPONENT_ROUND_WINS = 1;

// in a round we can afford to lose: once the opponent has passed, only chase the round if
// it costs at most this many cards (1 = card parity is preserved)
export const CHASE_CARD_LIMIT = 1;

// in a round we can afford to lose, while the opponent is still playing: yield rather than
// start a chase that would need this many cards or more
export const CATCH_UP_CARD_LIMIT = 3;

// in a round we can afford to lose: once we have committed this many cards to it and are
// still behind (with the opponent having spent no more than us), stop bidding. This is
// what stops two bots trading one-card overtakes until both hands are empty.
export const YIELD_CARD_BUDGET = 3;

// the largest printed value a card can carry (design doc: 1 to 15 scale); a live decree
// can at most double it (2x is the top of the type chart)
export const MAX_CARD_POWER = 15;
export const MAX_DECREE_MULTIPLIER = 2;

// in a must-win round, a decree is worth spending once it swings at least this much even
// if it does not flip the lead by itself
export const DECREE_MIN_SWING_MUST_WIN = 4;

// --- board arithmetic ------------------------------------------------------------------

function rowTotal(cards, row, decreeElement) {
	let total = 0;
	cards.forEach((card) => {
		const printed = card.powerByRow[row];
		if (typeof printed === 'number') {
			total += decreeContribution(printed, decreeElement, card.element);
		}
	});
	return total;
}

function currentTotalForSeat(publicState, seat) {
	let total = 0;
	ROWS.forEach((row) => {
		const decree = publicState.activeDecrees[row];
		total += rowTotal(publicState.board[row][seat], row, decree ? decree.element : null);
	});
	if (publicState.starter === seat) {
		total += COURT_FAVOR;
	}
	return total;
}

function cardsPlayedThisRound(publicState, seat) {
	return ROWS.reduce((sum, row) => sum + publicState.board[row][seat].length, 0);
}

function anyCardsOnBoard(publicState) {
	return ROWS.some((row) => publicState.board[row].A.length > 0 || publicState.board[row].B.length > 0);
}

function contributionForPlacement(card, row, publicState) {
	const printed = card.powerByRow[row];
	if (typeof printed !== 'number') {
		return null;
	}
	const decree = publicState.activeDecrees[row];
	return decreeContribution(printed, decree ? decree.element : null, card.element);
}

// each card's single best legal placement right now (given live decrees)
function bestPlacementPerCard(publicState, hand) {
	const placements = [];
	hand.forEach((card) => {
		let best = null;
		ROWS.forEach((row) => {
			if (!card.eligibleRows.includes(row)) {
				return;
			}
			const contribution = contributionForPlacement(card, row, publicState);
			if (contribution === null) {
				return;
			}
			if (!best || contribution > best.contribution) {
				best = { card, row, contribution };
			}
		});
		if (best) {
			placements.push(best);
		}
	});
	return placements;
}

/*
	Exact search over the hand (<= 10 cards, so <= 1024 subsets): the plan that beats
	`targetTotal` using the fewest cards, ties broken by the smallest total spent. Returns
	{ count, placements } or null when no subset gets there.
*/
function cheapestWinningPlan(publicState, hand, myCurrentTotal, targetTotal) {
	const candidates = bestPlacementPerCard(publicState, hand);
	const n = candidates.length;
	let best = null;
	for (let mask = 1; mask < (1 << n); mask++) {
		let count = 0;
		let sum = 0;
		for (let i = 0; i < n; i++) {
			if (mask & (1 << i)) {
				count++;
				sum += candidates[i].contribution;
			}
		}
		if (myCurrentTotal + sum <= targetTotal) {
			continue;
		}
		if (!best || count < best.count || (count === best.count && sum < best.sum)) {
			const placements = [];
			for (let i = 0; i < n; i++) {
				if (mask & (1 << i)) {
					placements.push(candidates[i]);
				}
			}
			best = { count, sum, placements };
		}
	}
	return best;
}

// --- decrees -----------------------------------------------------------------------------

function usableDecrees(playerView) {
	if (!playerView || !Array.isArray(playerView.decrees)) {
		return [];
	}
	if (playerView.decreePlayedThisRound) {
		return [];
	}
	const used = playerView.decreesUsed || {};
	return playerView.decrees.filter((el) => !used[el]);
}

// every legal decree play scored by its immediate net swing:
// (my row after - my row before) - (their row after - their row before)
function scoredDecreePlays(publicState, botPlayer, decreesAvailable) {
	const oppSeat = botPlayer === 'A' ? 'B' : 'A';
	const plays = [];
	decreesAvailable.forEach((element) => {
		ROWS.forEach((row) => {
			const current = publicState.activeDecrees[row];
			const currentElement = current ? current.element : null;
			if (currentElement === element) {
				return; // no-op replacement
			}
			const mine = publicState.board[row][botPlayer];
			const theirs = publicState.board[row][oppSeat];
			const swing = (rowTotal(mine, row, element) - rowTotal(mine, row, currentElement))
				- (rowTotal(theirs, row, element) - rowTotal(theirs, row, currentElement));
			if (swing > 0) {
				plays.push({ element, row, swing });
			}
		});
	});
	plays.sort((a, b) => b.swing - a.swing);
	return plays;
}

// --- the decision ------------------------------------------------------------------------

function passAction(reason, rngState) {
	return { action: { type: 'pass', reason }, nextRngState: rngState };
}

function creatureAction(placement, rngState) {
	return { action: { type: 'playCreature', cardId: placement.card.id, row: placement.row }, nextRngState: rngState };
}

function decreeAction(play, rngState) {
	return { action: { type: 'playDecree', element: play.element, row: play.row }, nextRngState: rngState };
}

/*
	Which card to spend, once the bot has decided to spend one.
	- Behind or tied: the smallest card that puts us ahead (least overkill); if no single
	  card does, the largest card (a chase we have already committed to).
	- Ahead: the smallest card (a cheap bid that keeps the lead and keeps the bombs).
*/
function pickCreature(placements, deficit) {
	const bySize = placements.slice().sort((a, b) => a.contribution - b.contribution);
	if (deficit >= 0) {
		const sufficient = bySize.find((p) => p.contribution > deficit);
		return sufficient || bySize[bySize.length - 1];
	}
	return bySize[0];
}

export function chooseAction(publicState, hand, botPlayer, rngState) {
	const oppSeat = botPlayer === 'A' ? 'B' : 'A';
	const me = publicState.players[botPlayer];
	const opp = publicState.players[oppSeat];

	const opponentPassed = !!opp.passed;
	const myTotal = currentTotalForSeat(publicState, botPlayer);
	const opponentTotal = currentTotalForSeat(publicState, oppSeat);
	const deficit = opponentTotal - myTotal; // points needed beyond this to lead
	const myCardsInHand = hand.length;
	const opponentCardsInHand = opp.handCount;
	const mustWin = opp.roundWins >= MUST_WIN_OPPONENT_ROUND_WINS;
	const canYield = !mustWin;

	const placements = bestPlacementPerCard(publicState, hand);
	const decreePlays = scoredDecreePlays(publicState, botPlayer, usableDecrees(me));
	const bestDecree = decreePlays[0];
	// a decree costs no card, so one that flips the round on its own is always the first choice
	const decreeFlipsLead = !!bestDecree && deficit >= 0 && bestDecree.swing > deficit;

	// 1. the opponent has already passed: this is the last word on the round
	if (opponentPassed) {
		if (deficit < 0) {
			return passAction('winning-after-opp-pass', rngState);
		}
		if (decreeFlipsLead) {
			return decreeAction(bestDecree, rngState);
		}
		const plan = cheapestWinningPlan(publicState, hand, myTotal, opponentTotal);
		if (!plan) {
			return passAction('cannot-catch-up', rngState);
		}
		if (canYield && plan.count > CHASE_CARD_LIMIT) {
			return passAction('yield-after-opp-pass', rngState);
		}
		// spend the plan largest-first; it is recomputed every turn so the tail self-corrects
		const largest = plan.placements.slice().sort((a, b) => b.contribution - a.contribution)[0];
		return creatureAction(largest, rngState);
	}

	// 2. the opponent is still in the round

	// 2a. unbeatable lead: even a hand of maximum cards under their best decree cannot reach us
	const oppDecreeFactor = usableDecrees(opp).length > 0 ? MAX_DECREE_MULTIPLIER : 1;
	if (-deficit > opponentCardsInHand * MAX_CARD_POWER * oppDecreeFactor) {
		return passAction('unbeatable', rngState);
	}

	if (placements.length === 0 && !bestDecree) {
		return passAction('no-legal-action', rngState);
	}

	// 2b / 2c reason about an earned lead, so they wait until something is on the board:
	// before that the only gap is the starter's Court Favor, which is bookkeeping, not a lead.
	if (canYield && anyCardsOnBoard(publicState)) {
		if (deficit < 0 && myCardsInHand <= opponentCardsInHand) {
			return passAction('ahead-parity', rngState);
		}
		if (decreeFlipsLead) {
			return decreeAction(bestDecree, rngState);
		}
		if (deficit >= 0) {
			const myPlayed = cardsPlayedThisRound(publicState, botPlayer);
			const oppPlayed = cardsPlayedThisRound(publicState, oppSeat);
			const plan = cheapestWinningPlan(publicState, hand, myTotal, opponentTotal);
			const tooExpensive = !plan || plan.count >= CATCH_UP_CARD_LIMIT;
			const overBudget = myPlayed >= oppPlayed && myPlayed >= YIELD_CARD_BUDGET;
			if (tooExpensive || overBudget) {
				return passAction('yield', rngState);
			}
		}
	}

	// 2d. the thin-lead bluff (never in a must-win round while they still hold cards)
	const bluffAllowed = canYield || opponentCardsInHand === 0;
	if (bluffAllowed && deficit < 0 && -deficit <= BLUFF_LEAD_THRESHOLD && myCardsInHand > opponentCardsInHand) {
		const { value, nextState } = nextRandom(rngState);
		rngState = nextState;
		if (value < BLUFF_PASS_PROBABILITY) {
			return passAction('bluff', rngState);
		}
	}

	// 3. spend something. A decree first when it flips the lead by itself (it costs no
	// card), or in a must-win round once it swings enough to matter.
	if (bestDecree) {
		const worthItNow = mustWin && bestDecree.swing >= DECREE_MIN_SWING_MUST_WIN;
		if (decreeFlipsLead || worthItNow || placements.length === 0) {
			return decreeAction(bestDecree, rngState);
		}
	}
	return creatureAction(pickCreature(placements, deficit), rngState);
}
