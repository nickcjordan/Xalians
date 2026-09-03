#!/usr/bin/env node
/*
	*** DEVTOOLS - not part of the shipped app ***

	Bot-vs-bot batch simulator for Tribute. Run directly with node:

		node my-app/src/gameplay/tribute/devtools/tributeSimulator.js [--matches=500] [--seed=1]

	Rolls a pool of provisional creatures (devtools/rollProvisionalXalians.js), builds
	random 12-card decks + 2 random decrees per side each match, plays N bot-vs-bot
	matches to completion using tributeBot.chooseAction, and prints the stat block called
	for by the Tribute prototype task: starter win rate, average rounds per match, average
	actions per round, average round-winning score, pass rate after each side has played
	>= 1 card, decree play rate, and any errors. Deterministic under --seed.
*/

import { createMatch, mulligan, playCreature, playDecree, pass, getPublicState, createRngState, nextRandom } from '../tributeRules.js';
import { chooseAction } from '../tributeBot.js';
import { rollXalians } from './rollProvisionalXalians.js';
import { LEGAL_DECREE_ELEMENTS } from '../tributeInterpretation.js';

function parseArgs(argv) {
	const args = { matches: 500, seed: 1 };
	argv.forEach((arg) => {
		const m = arg.match(/^--(\w+)=(.+)$/);
		if (m) {
			args[m[1]] = isNaN(Number(m[2])) ? m[2] : Number(m[2]);
		}
	});
	return args;
}

function makeRng(seed) {
	let state = createRngState(seed);
	return {
		float() {
			const { value, nextState } = nextRandom(state);
			state = nextState;
			return value;
		},
		int(maxExclusive) {
			return Math.floor(this.float() * maxExclusive);
		},
		shuffle(array) {
			const result = array.slice();
			for (let i = result.length - 1; i > 0; i--) {
				const j = this.int(i + 1);
				const tmp = result[i];
				result[i] = result[j];
				result[j] = tmp;
			}
			return result;
		},
	};
}

function buildRandomDeck(pool, rng) {
	const shuffled = rng.shuffle(pool);
	const cards = shuffled.slice(0, 12);
	const decreeChoices = rng.shuffle(LEGAL_DECREE_ELEMENTS).slice(0, 2);
	return { cards, decrees: decreeChoices };
}

// runs one full match to completion using the greedy bot on both sides, collecting stats
function runOneMatch(matchSeed, pool, rng) {
	const deckA = buildRandomDeck(pool, rng);
	const deckB = buildRandomDeck(pool, rng);

	let state = createMatch(deckA, deckB, matchSeed);
	const roundOneStarter = state.starter;

	// both bots mulligan nothing for simplicity/determinism of this smoke pass
	state = mulligan(state, 'A', []);
	state = mulligan(state, 'B', []);

	let botRngState = createRngState(`${matchSeed}-bot`);

	const stats = {
		rounds: 0,
		roundActionCounts: [],
		roundWinningScores: [],
		passesAfterFirstCard: 0,
		opportunitiesAfterFirstCard: 0,
		decreePlaysThisMatch: 0,
		actionOpportunitiesThisMatch: 0,
		error: null,
		// per-round-number (1, 2, 3) breakdowns
		byRound: {},
		// voluntary pass reason counts (any pass action the bot deliberately chose, i.e.
		// action.type === 'pass' with a reason string - excludes nothing, since every pass
		// the bot emits now carries a reason)
		passReasonCounts: {},
		round1Winner: null,
	};

	function ensureRoundBucket(roundNumber) {
		if (!stats.byRound[roundNumber]) {
			stats.byRound[roundNumber] = {
				actionCounts: [],
				starterCardsLeft: [],
				nonStarterCardsLeft: [],
				tieBreaks: 0,
				roundsPlayed: 0,
				winningScores: [],
			};
		}
		return stats.byRound[roundNumber];
	}

	let actionsThisRound = 0;
	let anyCardPlayedThisRound = false;
	let guard = 0;
	const GUARD_LIMIT = 5000;

	while (state.phase === 'play' && guard < GUARD_LIMIT) {
		guard++;
		const currentPlayer = state.turn;
		const publicState = getPublicState(state, currentPlayer);
		const hand = state.players[currentPlayer].hand;
		const roundNumberBeforeAction = state.round;
		const starterBeforeAction = state.starter;

		const { action, nextRngState } = chooseAction(publicState, hand, currentPlayer, botRngState);
		botRngState = nextRngState;

		stats.actionOpportunitiesThisMatch++;
		if (anyCardPlayedThisRound) {
			stats.opportunitiesAfterFirstCard++;
		}

		let nextState = null;
		if (action.type === 'playCreature') {
			nextState = playCreature(state, currentPlayer, action.cardId, action.row);
			if (nextState) {
				anyCardPlayedThisRound = true;
			}
		} else if (action.type === 'playDecree') {
			nextState = playDecree(state, currentPlayer, action.element, action.row);
			if (nextState) {
				stats.decreePlaysThisMatch++;
			}
		} else if (action.type === 'pass') {
			nextState = pass(state, currentPlayer);
			if (nextState) {
				const reason = action.reason || 'unknown';
				stats.passReasonCounts[reason] = (stats.passReasonCounts[reason] || 0) + 1;
			}
			if (anyCardPlayedThisRound) {
				stats.passesAfterFirstCard++;
			}
		}

		if (!nextState) {
			stats.error = `illegal bot action: ${JSON.stringify(action)} for player ${currentPlayer} in round ${state.round}`;
			return { finalState: state, stats };
		}

		actionsThisRound++;

		const roundAdvanced = nextState.round !== state.round || nextState.phase === 'matchEnd';
		if (roundAdvanced) {
			stats.rounds++;
			stats.roundActionCounts.push(actionsThisRound);

			const bucket = ensureRoundBucket(roundNumberBeforeAction);
			bucket.roundsPlayed++;
			bucket.actionCounts.push(actionsThisRound);

			if (state.lastRoundResult !== nextState.lastRoundResult && nextState.lastRoundResult) {
				const result = nextState.lastRoundResult;
				const winner = result.winner;
				stats.roundWinningScores.push(result.scores[winner]);
				bucket.winningScores.push(result.scores[winner]);
				if (result.tie) {
					bucket.tieBreaks++;
				}
				if (roundNumberBeforeAction === 1) {
					stats.round1Winner = winner;
				}

				// cards left in each hand at round end, split by starter/non-starter for
				// THIS round (not round 1) - nextState still has the just-finished round's
				// hand-size result since resolveRound only clears board/decree flags, not hand.
				const nonStarterBeforeAction = starterBeforeAction === 'A' ? 'B' : 'A';
				bucket.starterCardsLeft.push(nextState.players[starterBeforeAction].hand.length);
				bucket.nonStarterCardsLeft.push(nextState.players[nonStarterBeforeAction].hand.length);
			}

			actionsThisRound = 0;
			anyCardPlayedThisRound = false;
		}

		state = nextState;
	}

	if (guard >= GUARD_LIMIT) {
		stats.error = 'guard limit reached - possible infinite loop';
	}

	return { finalState: state, stats, roundOneStarter };
}

export function runSimulation({ matches = 500, seed = 1 } = {}) {
	const rng = makeRng(seed);
	const pool = rollXalians(60, seed);

	const results = {
		totalMatches: 0,
		starterWins: 0,
		totalRounds: 0,
		roundActionCounts: [],
		roundWinningScores: [],
		totalPassesAfterFirstCard: 0,
		totalOpportunitiesAfterFirstCard: 0,
		totalDecreePlays: 0,
		totalActionOpportunities: 0,
		errors: [],
		byRound: {},
		passReasonCounts: {},
		matchLengthCounts: {},
		round1WinnerWonMatch: 0,
		round1WinnerKnown: 0,
	};

	function ensureRoundBucket(roundNumber) {
		if (!results.byRound[roundNumber]) {
			results.byRound[roundNumber] = {
				actionCounts: [],
				starterCardsLeft: [],
				nonStarterCardsLeft: [],
				tieBreaks: 0,
				roundsPlayed: 0,
				winningScores: [],
			};
		}
		return results.byRound[roundNumber];
	}

	for (let i = 0; i < matches; i++) {
		const matchSeed = `${seed}-match-${i}`;
		const { finalState, stats, roundOneStarter } = runOneMatch(matchSeed, pool, rng);

		results.totalMatches++;
		results.totalRounds += stats.rounds;
		results.roundActionCounts.push(...stats.roundActionCounts);
		results.roundWinningScores.push(...stats.roundWinningScores);
		results.totalPassesAfterFirstCard += stats.passesAfterFirstCard;
		results.totalOpportunitiesAfterFirstCard += stats.opportunitiesAfterFirstCard;
		results.totalDecreePlays += stats.decreePlaysThisMatch;
		results.totalActionOpportunities += stats.actionOpportunitiesThisMatch;

		Object.keys(stats.passReasonCounts).forEach((reason) => {
			results.passReasonCounts[reason] = (results.passReasonCounts[reason] || 0) + stats.passReasonCounts[reason];
		});

		Object.keys(stats.byRound).forEach((roundNumber) => {
			const src = stats.byRound[roundNumber];
			const dst = ensureRoundBucket(roundNumber);
			dst.actionCounts.push(...src.actionCounts);
			dst.starterCardsLeft.push(...src.starterCardsLeft);
			dst.nonStarterCardsLeft.push(...src.nonStarterCardsLeft);
			dst.tieBreaks += src.tieBreaks;
			dst.roundsPlayed += src.roundsPlayed;
			dst.winningScores.push(...src.winningScores);
		});

		if (stats.error) {
			results.errors.push({ matchIndex: i, error: stats.error });
			continue;
		}

		if (finalState.phase === 'matchEnd') {
			results.matchLengthCounts[stats.rounds] = (results.matchLengthCounts[stats.rounds] || 0) + 1;

			// "starter" means the ROUND ONE starter (state.starter alternates every round, and at
			// matchEnd it still points at the final round's starter, which is biased by construction)
			if (finalState.winner === roundOneStarter) {
				results.starterWins++;
			}

			if (stats.round1Winner) {
				results.round1WinnerKnown++;
				if (finalState.winner === stats.round1Winner) {
					results.round1WinnerWonMatch++;
				}
			}
		}
	}

	return results;
}

function average(array) {
	if (array.length === 0) {
		return 0;
	}
	return array.reduce((a, b) => a + b, 0) / array.length;
}

function printReport(results, args) {
	const completedMatches = results.totalMatches - results.errors.length;
	console.log('=== Tribute bot-vs-bot simulation ===');
	console.log(`matches: ${results.totalMatches}  seed: ${args.seed}`);
	console.log(`starter win rate: ${(results.starterWins / completedMatches * 100).toFixed(1)}%`);
	console.log(`average rounds per match: ${(results.totalRounds / completedMatches).toFixed(2)}`);
	console.log(`average actions per round: ${average(results.roundActionCounts).toFixed(2)}`);
	console.log(`average round-winning score: ${average(results.roundWinningScores).toFixed(2)}`);
	const passRateAfterFirstCard = results.totalOpportunitiesAfterFirstCard > 0
		? (results.totalPassesAfterFirstCard / results.totalOpportunitiesAfterFirstCard * 100)
		: 0;
	console.log(`pass rate after each side has played >=1 card: ${passRateAfterFirstCard.toFixed(1)}%`);
	const decreePlayRate = results.totalActionOpportunities > 0
		? (results.totalDecreePlays / results.totalActionOpportunities * 100)
		: 0;
	console.log(`decree play rate (of all action opportunities): ${decreePlayRate.toFixed(1)}%`);

	console.log('--- per round ---');
	const roundNumbers = Object.keys(results.byRound).map(Number).sort((a, b) => a - b);
	roundNumbers.forEach((roundNumber) => {
		const bucket = results.byRound[roundNumber];
		const tieRate = bucket.roundsPlayed > 0 ? (bucket.tieBreaks / bucket.roundsPlayed * 100) : 0;
		console.log(
			`round ${roundNumber}: avg actions ${average(bucket.actionCounts).toFixed(2)}` +
			`, avg cards left (starter) ${average(bucket.starterCardsLeft).toFixed(2)}` +
			`, avg cards left (non-starter) ${average(bucket.nonStarterCardsLeft).toFixed(2)}` +
			`, tie-break rate ${tieRate.toFixed(1)}%` +
			`, avg round-winning score ${average(bucket.winningScores).toFixed(2)}`
		);
	});

	console.log('--- match length distribution ---');
	const totalWithLength = Object.values(results.matchLengthCounts).reduce((a, b) => a + b, 0);
	[2, 3].forEach((length) => {
		const count = results.matchLengthCounts[length] || 0;
		const pct = totalWithLength > 0 ? (count / totalWithLength * 100) : 0;
		console.log(`  ${length} rounds: ${pct.toFixed(1)}% (${count})`);
	});

	const round1CarryRate = results.round1WinnerKnown > 0
		? (results.round1WinnerWonMatch / results.round1WinnerKnown * 100)
		: 0;
	console.log(`round 1 winner goes on to win the match: ${round1CarryRate.toFixed(1)}%`);

	console.log('--- voluntary pass reasons ---');
	const passReasons = Object.keys(results.passReasonCounts).sort();
	if (passReasons.length === 0) {
		console.log('  (no passes recorded)');
	} else {
		passReasons.forEach((reason) => {
			console.log(`  ${reason}: ${results.passReasonCounts[reason]}`);
		});
	}

	console.log(`errors: ${results.errors.length}`);
	if (results.errors.length > 0) {
		results.errors.slice(0, 10).forEach((e) => {
			console.log(`  match ${e.matchIndex}: ${e.error}`);
		});
	}
}

// Only run as a CLI when executed directly, not when imported by tests. Under plain
// `node`, this file is loaded through devtools/runNode.cjs (see that file's header
// comment for why), so `require.main` is runNode.cjs, not this module - that CJS-only
// idiom doesn't apply here. Instead: run whenever this module is NOT being required from
// inside a Jest worker (Jest always defines `process.env.JEST_WORKER_ID`), which covers
// both invocation paths (`node runNode.cjs tributeSimulator.js` and any other plain-node
// entry point) while never firing during `yarn test`.
const isMainModule = typeof process !== 'undefined' && !process.env.JEST_WORKER_ID;

if (isMainModule) {
	const args = parseArgs(process.argv.slice(2));
	const results = runSimulation(args);
	printReport(results, args);
	if (results.errors.length > 0) {
		process.exitCode = 1;
	}
}
