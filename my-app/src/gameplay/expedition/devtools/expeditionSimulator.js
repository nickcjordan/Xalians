#!/usr/bin/env node
/*
	*** DEVTOOLS - not part of the shipped app ***

	Bot-vs-bot batch simulator for Expedition. Run via the esbuild runner (this package
	uses static ESM/JSON imports, so plain `node` cannot load it directly):

		node my-app/src/gameplay/expedition/devtools/runNode.cjs \
			my-app/src/gameplay/expedition/devtools/expeditionSimulator.js --matches=300 --seed=7

	Rolls a pool of provisional creatures (rollExpeditionXalians.js), builds random
	12-record rosters per side each match, plays N bot-vs-bot matches to completion using
	expeditionBot, and prints: starter win rate, sites won per match per side,
	ties-to-Court rate, average creatures sent per match, rout rate, stagger rate, act
	usage histogram, hidden-send rate, pass reasons, average deploy actions per round,
	stack-versus-spread, match length, errors. Deterministic under --seed.
*/

import { createMatch, send, pass, order, commitOrders, getPublicState, createRngState, nextRandom } from '../expeditionRules.js';
import { ROSTER_SIZE, SITES_PER_WORLD } from '../expeditionInterpretation.js';
import { chooseSend, chooseOrders } from '../expeditionBot.js';
import { rollExpeditionXalians } from './rollExpeditionXalians.js';
import { getWorlds } from '../sites.js';

function parseArgs(argv) {
	const args = { matches: 300, seed: 7 };
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
		shuffle(array) {
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

function buildRandomRoster(pool, rng) {
	const shuffled = rng.shuffle(pool);
	return shuffled.slice(0, ROSTER_SIZE);
}

function average(array) {
	if (array.length === 0) {
		return 0;
	}
	return array.reduce((a, b) => a + b, 0) / array.length;
}

// runs one full match to completion using the greedy bot on both sides, collecting stats
function runOneMatch(matchSeed, pool, rng) {
	const rosterA = buildRandomRoster(pool, rng);
	const rosterB = buildRandomRoster(pool, rng);

	let state = createMatch({ rosterA, rosterB, worlds: getWorlds(), seed: matchSeed });
	const roundOneStarter = state.starter;

	let botRngState = createRngState(`${matchSeed}-bot`);
	const botRng = () => {
		const { value, nextState } = nextRandom(botRngState);
		botRngState = nextState;
		return value;
	};

	const stats = {
		sentCount: { A: 0, B: 0 },
		routCount: 0,
		staggerCount: 0,
		actUsage: {},
		hiddenSends: 0,
		totalSends: 0,
		passReasons: {},
		deployActionsPerRound: [],
		maxStackPerSiteRoundAvg: [],
		tieToCourtRounds: 0,
		roundsPlayed: 0,
		error: null,
		round1Winner: null,
	};

	let guard = 0;
	const GUARD_LIMIT = 20000;

	while (state.phase !== 'matchEnd' && guard < GUARD_LIMIT) {
		guard++;

		if (state.phase === 'deploy') {
			let deployActionsThisRound = 0;
			while (state.phase === 'deploy' && guard < GUARD_LIMIT) {
				guard++;
				const handler = state.turn;
				if (handler === null) {
					break;
				}
				const publicState = getPublicState(state, handler);
				const ownRoster = state.players[handler].roster;
				const rngLike = { float: botRng };
				const action = chooseSend(publicState, ownRoster, handler, rngLike);
				let nextState = null;
				if (action.type === 'send') {
					nextState = send(state, handler, action.recordId, action.siteId, action.hidden);
					if (nextState) {
						stats.totalSends++;
						stats.sentCount[handler]++;
						if (action.hidden) {
							stats.hiddenSends++;
						}
					}
				} else {
					nextState = pass(state, handler);
					if (nextState) {
						stats.passReasons[action.reason] = (stats.passReasons[action.reason] || 0) + 1;
					}
				}
				if (!nextState) {
					stats.error = `illegal deploy action: ${JSON.stringify(action)} for ${handler}`;
					return { finalState: state, stats, roundOneStarter };
				}
				deployActionsThisRound++;
				state = nextState;
			}
			stats.deployActionsPerRound.push(deployActionsThisRound);

			// stack-vs-spread snapshot at end of deploy for this round
			const maxStack = maxStackAtDeployEnd(state);
			stats.maxStackPerSiteRoundAvg.push(maxStack);
		}

		if (state.phase === 'orders') {
			['A', 'B'].forEach((handler) => {
				const publicState = getPublicState(state, handler);
				const orders = chooseOrders(publicState, handler);
				Object.keys(orders).forEach((creatureId) => {
					const next = order(state, handler, creatureId, orders[creatureId]);
					if (next) {
						state = next;
						stats.actUsage[orders[creatureId]] = (stats.actUsage[orders[creatureId]] || 0) + 1;
					}
				});
			});
			const roundNumberBefore = state.worldIndex;
			let next = commitOrders(state, 'A');
			if (!next) {
				stats.error = 'commitOrders(A) failed';
				return { finalState: state, stats, roundOneStarter };
			}
			state = next;
			next = commitOrders(state, 'B');
			if (!next) {
				stats.error = 'commitOrders(B) failed';
				return { finalState: state, stats, roundOneStarter };
			}
			state = next;

			stats.roundsPlayed++;
			if (roundNumberBefore === 0 && state.worldIndex !== 0) {
				// round 1 just resolved; capture who is ahead in sites at this point as a proxy
				stats.round1Winner = state.players.A.sitesWon > state.players.B.sitesWon ? 'A'
					: state.players.B.sitesWon > state.players.A.sitesWon ? 'B' : null;
			}
		}
	}

	if (guard >= GUARD_LIMIT) {
		stats.error = 'guard limit reached - possible infinite loop';
	}

	// derive rout/stagger/tie counts and ties-to-court from the full resolution log
	state.resolutionLog.forEach((ev) => {
		if (ev.outcome === 'routed') {
			stats.routCount++;
		}
		if (ev.outcome === 'staggered') {
			stats.staggerCount++;
		}
		if (ev.type === 'judge' && ev.siteResults) {
			Object.values(ev.siteResults).forEach((r) => {
				if (r.winner === null) {
					stats.tieToCourtRounds++;
				}
			});
		}
	});

	return { finalState: state, stats, roundOneStarter };
}

function maxStackAtDeployEnd(state) {
	let maxA = 0;
	let maxB = 0;
	Object.values(state.board).forEach((siteBoard) => {
		maxA = Math.max(maxA, siteBoard.A.length);
		maxB = Math.max(maxB, siteBoard.B.length);
	});
	return { A: maxA, B: maxB };
}

export function runSimulation({ matches = 300, seed = 7 } = {}) {
	const rng = makeRng(seed);
	const pool = rollExpeditionXalians(80, seed);

	const results = {
		totalMatches: 0,
		starterWins: 0,
		sitesWonA: [],
		sitesWonB: [],
		tieToCourtRounds: 0,
		totalRoundsPlayed: 0,
		sentCounts: [],
		routCounts: [],
		staggerCounts: [],
		actUsage: {},
		hiddenSends: 0,
		totalSends: 0,
		passReasons: {},
		deployActionsPerRound: [],
		maxStackA: [],
		maxStackB: [],
		matchLengthCounts: {},
		errors: [],
	};

	for (let i = 0; i < matches; i++) {
		const matchSeed = `${seed}-match-${i}`;
		const { finalState, stats, roundOneStarter } = runOneMatch(matchSeed, pool, rng);

		results.totalMatches++;
		if (stats.error) {
			results.errors.push({ matchIndex: i, error: stats.error });
			continue;
		}

		results.sitesWonA.push(finalState.players.A.sitesWon);
		results.sitesWonB.push(finalState.players.B.sitesWon);
		results.tieToCourtRounds += stats.tieToCourtRounds;
		results.totalRoundsPlayed += stats.roundsPlayed;
		results.sentCounts.push(stats.sentCount.A, stats.sentCount.B);
		results.routCounts.push(stats.routCount);
		results.staggerCounts.push(stats.staggerCount);
		results.hiddenSends += stats.hiddenSends;
		results.totalSends += stats.totalSends;
		results.deployActionsPerRound.push(...stats.deployActionsPerRound);
		stats.maxStackPerSiteRoundAvg.forEach((m) => {
			results.maxStackA.push(m.A);
			results.maxStackB.push(m.B);
		});

		Object.keys(stats.actUsage).forEach((action) => {
			results.actUsage[action] = (results.actUsage[action] || 0) + stats.actUsage[action];
		});
		Object.keys(stats.passReasons).forEach((reason) => {
			results.passReasons[reason] = (results.passReasons[reason] || 0) + stats.passReasons[reason];
		});

		if (finalState.winner === roundOneStarter) {
			results.starterWins++;
		}
		results.matchLengthCounts[finalState.worldIndex + 1] = (results.matchLengthCounts[finalState.worldIndex + 1] || 0) + 1;
	}

	return results;
}

function printReport(results, args) {
	const completed = results.totalMatches - results.errors.length;
	console.log('=== Expedition bot-vs-bot simulation ===');
	console.log(`matches: ${results.totalMatches}  seed: ${args.seed}`);
	console.log(`starter win rate: ${(results.starterWins / completed * 100).toFixed(1)}%`);
	console.log(`average sites won per match — A: ${average(results.sitesWonA).toFixed(2)}, B: ${average(results.sitesWonB).toFixed(2)}`);
	console.log(`ties-to-Court rate: ${(results.tieToCourtRounds / Math.max(1, results.totalRoundsPlayed * SITES_PER_WORLD) * 100).toFixed(1)}%`);
	console.log(`average creatures sent per match: ${average(results.sentCounts).toFixed(2)} per side`);
	console.log(`rout rate (routs per match): ${average(results.routCounts).toFixed(2)}`);
	console.log(`stagger rate (staggers per match): ${average(results.staggerCounts).toFixed(2)}`);
	console.log(`hidden-send rate: ${(results.hiddenSends / Math.max(1, results.totalSends) * 100).toFixed(1)}%`);
	console.log(`average deploy actions per round: ${average(results.deployActionsPerRound).toFixed(2)}`);
	console.log(`stack-vs-spread (avg max creatures at one site per round) — A: ${average(results.maxStackA).toFixed(2)}, B: ${average(results.maxStackB).toFixed(2)}`);

	console.log('--- act usage ---');
	Object.keys(results.actUsage).sort().forEach((action) => {
		console.log(`  ${action}: ${results.actUsage[action]}`);
	});

	console.log('--- pass reasons ---');
	const passReasons = Object.keys(results.passReasons).sort();
	if (passReasons.length === 0) {
		console.log('  (no passes recorded)');
	} else {
		passReasons.forEach((reason) => {
			console.log(`  ${reason}: ${results.passReasons[reason]}`);
		});
	}

	console.log('--- match length (worlds played) ---');
	Object.keys(results.matchLengthCounts).sort().forEach((length) => {
		console.log(`  ${length} world(s): ${results.matchLengthCounts[length]}`);
	});

	console.log(`errors: ${results.errors.length}`);
	if (results.errors.length > 0) {
		results.errors.slice(0, 10).forEach((e) => {
			console.log(`  match ${e.matchIndex}: ${e.error}`);
		});
	}
}

const isMainModule = typeof process !== 'undefined' && !process.env.JEST_WORKER_ID && !process.env.VITEST_WORKER_ID;

if (isMainModule) {
	const args = parseArgs(process.argv.slice(2));
	const results = runSimulation(args);
	printReport(results, args);
	if (results.errors.length > 0) {
		process.exitCode = 1;
	}
}
