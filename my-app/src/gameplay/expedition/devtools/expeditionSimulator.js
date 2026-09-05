#!/usr/bin/env node
/*
	*** DEVTOOLS - not part of the shipped app ***

	Bot-vs-bot batch simulator for Expedition. Run via the esbuild runner (this package
	uses static ESM/JSON imports, so plain `node` cannot load it directly):

		node my-app/src/gameplay/expedition/devtools/runNode.cjs \
			my-app/src/gameplay/expedition/devtools/expeditionSimulator.js --matches=300 --seed=7

	Flags:
		--matches=N        number of matches to simulate (default 300)
		--seed=S            RNG seed, any string or number (default 7)
		--json=<path>       also write the full summarized results object as JSON to this
		                    path, so two rule/tuning variants can be diffed
		--mirror            both sides draw the IDENTICAL roster (same record ids, same
		                    order), removing roster luck so any seat/starter bias measured
		                    is pure rules/positional bias, not "who got the better pool"
		--random=A|B        the named side plays a uniformly random legal policy instead
		                    of the bot: random send among legal (record, site) pairs, a
		                    small fixed pass probability once >=1 creature is on the
		                    board, random legal act (or hold) per creature in Orders. Lets
		                    a designer measure how much of the bot's edge is skill versus
		                    structural (seat, starter, roster) advantage.
		--rivalA=<id>       rival handler side A plays (see expeditionBot.js RIVALS);
		                    defaults to the Court proctor. Unknown ids fall back to the
		                    proctor via rivalById.
		--rivalB=<id>       same, for side B. Together these are how a rival's measured
		                    difficulty against the proctor, and its ladder position, gets
		                    set - never asserted.

	This is a full designer-facing balance report (see docs/design/reclamation-design.md's
	"Tuning" open item): seat fairness, match shape, site economy, roster economy, combat,
	creature/archetype/element/trait balance, and per-world stats, every rate printed with
	a 95% binomial confidence interval (p ± 1.96*sqrt(p(1-p)/n)) so a designer can tell
	signal from noise at 300 matches. Deterministic under --seed.

	Design of the collection: runOneMatch() plays one full match and pushes RAW per-site,
	per-act, per-send, and per-relocation records into flat arrays (plus a few whole-match
	scalars) - it does not pre-aggregate anything and does not retain full engine states,
	so memory stays bounded regardless of --matches. summarize() is the single place that
	turns those flat record arrays into every rate and histogram in the report; --json is
	simply that summarized object serialized, so "diff two variants" is a diff of that
	file. Aggregation lives in exactly one place on purpose: every section of the printed
	report and every field of the JSON output come from the same computation.
*/

import {
	createMatch, send, pass, order, commitOrders, relocateVanguard, getPublicState,
	createRngState, nextRandom,
} from '../expeditionRules.js';
import {
	ROSTER_SIZE, SITES_PER_WORLD, ACT_CLASS_BY_ACTION, SENDABLE, FRAMES_PER_MATCH, WORLDS_PER_FRAME,
} from '../expeditionInterpretation.js';
import { chooseSend, chooseOrders, rivalById, DEFAULT_RIVAL_ID } from '../expeditionBot.js';
import { prepare, magnitudeAgainst, baseHold, initiativeOf, strainLevel } from '../creatureOnTable.js';
import { buildExpeditionPool } from '../roster.js';
import { getWorlds } from '../sites.js';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
	const args = {
		matches: 300, seed: 7, json: null, mirror: false, random: null,
		rivalA: DEFAULT_RIVAL_ID, rivalB: DEFAULT_RIVAL_ID,
	};
	argv.forEach((arg) => {
		if (arg === '--mirror') {
			args.mirror = true;
			return;
		}
		const m = arg.match(/^--(\w+)=(.+)$/);
		if (m) {
			const key = m[1];
			const raw = m[2];
			if (key === 'json') {
				args.json = raw;
			} else if (key === 'random') {
				args.random = raw === 'A' || raw === 'B' ? raw : null;
			} else if (key === 'rivalA' || key === 'rivalB') {
				args[key] = raw;
			} else {
				args[key] = isNaN(Number(raw)) ? raw : Number(raw);
			}
		}
	});
	return args;
}

// ---------------------------------------------------------------------------
// RNG / roster helpers
// ---------------------------------------------------------------------------

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
	if (!array || array.length === 0) {
		return 0;
	}
	return array.reduce((a, b) => a + b, 0) / array.length;
}

function quantile(sortedArray, q) {
	if (sortedArray.length === 0) {
		return 0;
	}
	const pos = (sortedArray.length - 1) * q;
	const base = Math.floor(pos);
	const rest = pos - base;
	if (sortedArray[base + 1] !== undefined) {
		return sortedArray[base] + rest * (sortedArray[base + 1] - sortedArray[base]);
	}
	return sortedArray[base];
}

// rate + 95% binomial CI, per (successes, trials). Returns null if trials is 0 so
// callers can print "n/a" rather than a misleading 0%.
function rate(successes, trials) {
	if (!trials) {
		return null;
	}
	const p = successes / trials;
	const halfWidth = 1.96 * Math.sqrt((p * (1 - p)) / trials);
	return { p, n: trials, lo: Math.max(0, p - halfWidth), hi: Math.min(1, p + halfWidth) };
}

function fmtRate(r, digits = 1) {
	if (!r) {
		return 'n/a';
	}
	const pct = (v) => (v * 100).toFixed(digits);
	return `${pct(r.p)}% (95% CI ${pct(r.lo)}-${pct(r.hi)}%, n=${r.n})`;
}

function otherSeat(seat) {
	return seat === 'A' ? 'B' : 'A';
}

// ---------------------------------------------------------------------------
// random policy (--random=A|B): uniformly random among LEGAL actions, public info only,
// same call shape as expeditionBot's chooseSend/chooseOrders so runOneMatch can swap
// either side's policy in without special-casing the game loop.
// ---------------------------------------------------------------------------

const RANDOM_PASS_PROBABILITY = 0.12;

function randomChooseSend(publicState, ownRoster, handler, rng) {
	const me = publicState.players[handler];
	if (me.passed) {
		return { type: 'pass', reason: 'already-passed' };
	}
	const frame = publicState.frame;
	const anyOnBoard = frame.sites.some((s) => (publicState.board[s.id][handler] || []).length > 0);
	const remainingSends = Math.min(SENDABLE - me.sentCount, ownRoster.length);
	if (remainingSends <= 0) {
		return { type: 'pass', reason: 'no-sendable-creatures' };
	}
	if (anyOnBoard && rng.float() < RANDOM_PASS_PROBABILITY) {
		return { type: 'pass', reason: 'random-pass' };
	}
	const candidates = [];
	ownRoster.forEach((record) => {
		frame.sites.forEach((site) => {
			candidates.push({ record, site });
		});
	});
	const pick = candidates[Math.floor(rng.float() * candidates.length)];
	const traits = (pick.record.traits && [...(pick.record.traits.guaranteed || []), ...(pick.record.traits.rolled || [])]) || [];
	const canHide = traits.includes('stealthy');
	const hidden = canHide && rng.float() < 0.5;
	return { type: 'send', recordId: pick.record.id, siteId: pick.site.id, hidden };
}

function randomChooseOrders(publicState, handler, rng) {
	const frame = publicState.frame;
	const orders = {};
	frame.sites.forEach((site) => {
		(publicState.board[site.id][handler] || []).forEach((entry) => {
			if (!entry.record) {
				return;
			}
			const actions = ['hold', ...(entry.record.abilities || []).map((a) => a.action)];
			orders[entry.recordId] = actions[Math.floor(rng.float() * actions.length)];
		});
	});
	return orders;
}

// ---------------------------------------------------------------------------
// per-match board helpers (these read the RAW engine state, not getPublicState, since
// the simulator plays both sides and is allowed full information for measurement)
// ---------------------------------------------------------------------------

function siteMarginRaw(state, frame, siteId) {
	const holdA = (state.board[siteId].A || []).reduce((sum, e) => sum + entryHold(state, frame, siteId, e), 0);
	const holdB = (state.board[siteId].B || []).reduce((sum, e) => sum + entryHold(state, frame, siteId, e), 0);
	return holdA - holdB;
}

function entryHold(state, frame, siteId, entry) {
	const site = frame.sites.find((s) => s.id === siteId);
	return prepare(entry.record, site, site.world, entry.sentIndex).hold;
}

function deployEndSnapshot(state, frame) {
	// per-site margin (A-hold minus B-hold) and per-side counts, taken right at the
	// moment Deploy ends (before Resolve/Judge) - this is "the leader after Deploy" used
	// for the "resolve mattered" and relocation-flip stats.
	const bySite = {};
	frame.sites.forEach((site) => {
		const a = state.board[site.id].A || [];
		const b = state.board[site.id].B || [];
		bySite[site.id] = {
			countA: a.length,
			countB: b.length,
			marginAfterDeploy: siteMarginRaw(state, frame, site.id),
		};
	});
	return bySite;
}

// ---------------------------------------------------------------------------
// runOneMatch: plays one full match, collecting raw per-site / per-act / per-send /
// per-relocation records. No full engine state is retained after the match ends.
// ---------------------------------------------------------------------------

function runOneMatch(matchSeed, pool, rng, options) {
	const { mirror, randomSeat, rivals } = options;
	const rivalFor = { A: rivals && rivals.A, B: rivals && rivals.B };

	const rosterA = buildRandomRoster(pool, rng);
	const rosterB = mirror ? rosterA.slice() : buildRandomRoster(pool, rng);

	const worlds = getWorlds();
	let state = createMatch({ rosterA, rosterB, worlds, seed: matchSeed });
	const roundOneStarter = state.starter;

	let botRngState = createRngState(`${matchSeed}-bot`);
	const botRng = () => {
		const { value, nextState } = nextRandom(botRngState);
		botRngState = nextState;
		return value;
	};
	const rngLike = { float: botRng };

	// per-roster power snapshot, taken once at match start (records never mutate)
	const rosterMeanHold = { A: average(rosterA.map((r) => baseHold(r))), B: average(rosterB.map((r) => baseHold(r))) };
	const rosterMeanInitiative = { A: average(rosterA.map((r) => initiativeOf(r))), B: average(rosterB.map((r) => initiativeOf(r))) };
	// hold rank within the 80-creature pool, for the "top/bottom 5 individual creatures"
	// section - computed once by the caller and passed in via options.poolHoldRank

	const siteRecords = [];
	const actRecords = [];
	const sendRecords = []; // filled progressively; siteResult/won attached at judge time
	const relocationRecords = [];
	let decisions = 0; // sends + passes + relocations + orders, as a playtime proxy
	let sitesWonAfterWorld1 = null; // { A, B } snapshot for the comeback-rate stat
	let error = null;
	let vanguardRelocationsThisMatch = 0;

	function chooseSendFor(handler, publicState, ownRoster) {
		if (randomSeat === handler) {
			return randomChooseSend(publicState, ownRoster, handler, rngLike);
		}
		return chooseSend(publicState, ownRoster, handler, rngLike, rivalFor[handler]);
	}
	function chooseOrdersFor(handler, publicState) {
		if (randomSeat === handler) {
			return randomChooseOrders(publicState, handler, rngLike);
		}
		return chooseOrders(publicState, handler, rivalFor[handler]);
	}

	let guard = 0;
	const GUARD_LIMIT = 20000;

	while (state.phase !== 'matchEnd' && guard < GUARD_LIMIT) {
		guard++;

		if (state.phase === 'deploy') {
			const frameIndex = state.frameIndex;
			const frame = state.frames[frameIndex];
			const frameStarter = state.starter;
			// records sent this round, keyed by recordId, so we can attach the site's
			// judged outcome to each send once Judge runs
			const sentThisRound = {};
			let lastHandlerToPass = null;

			while (state.phase === 'deploy' && guard < GUARD_LIMIT) {
				guard++;
				const handler = state.turn;
				if (handler === null) {
					break;
				}
				const publicState = getPublicState(state, handler);
				const ownRoster = state.players[handler].roster;
				let action = chooseSendFor(handler, publicState, ownRoster);

				if (action.type === 'relocate') {
					const fromSiteId = boardSiteOf(state, frame, handler, publicState.players[handler].vanguardRecordId);
					const marginBefore = fromSiteId ? siteMarginRaw(state, frame, fromSiteId) : 0;
					const wasLosingBefore = handler === 'A' ? marginBefore < 0 : marginBefore > 0;

					const relocated = relocateVanguard(state, handler, action.siteId);
					if (!relocated) {
						error = `illegal relocate action: ${JSON.stringify(action)} for ${handler}`;
						return { finalState: state, error, roundOneStarter, siteRecords, actRecords, sendRecords, relocationRecords, decisions, rosterMeanHold, rosterMeanInitiative, sitesWonAfterWorld1, vanguardRelocationsThisMatch };
					}
					state = relocated;
					vanguardRelocationsThisMatch++;
					decisions++;

					const marginAfter = siteMarginRaw(state, frame, action.siteId);
					const isWinningAfter = handler === 'A' ? marginAfter > 0 : marginAfter < 0;
					relocationRecords.push({ handler, wasLosingBefore, isWinningAfter, flippedToWinning: wasLosingBefore && isWinningAfter });

					const publicStateAfter = getPublicState(state, handler);
					action = chooseSendFor(handler, publicStateAfter, state.players[handler].roster);
				}

				let nextState = null;
				if (action.type === 'send') {
					nextState = send(state, handler, action.recordId, action.siteId, action.hidden);
					if (nextState) {
						const record = state.players[handler].roster.find((r) => r.id === action.recordId);
						const site = frame.sites.find((s) => s.id === action.siteId);
						sentThisRound[action.recordId] = {
							recordId: action.recordId,
							record,
							side: handler,
							frameIndex,
							site: action.siteId,
							hidden: !!action.hidden,
							strainLevel: strainLevel(record, site, site.world),
							homeGround: !!(record.provenance && record.provenance.origin && String(record.provenance.origin).toLowerCase() === String(site.world.planet).toLowerCase()),
						};
					}
				} else {
					nextState = pass(state, handler);
					if (nextState) {
						lastHandlerToPass = handler;
					}
				}
				if (!nextState) {
					error = `illegal deploy action: ${JSON.stringify(action)} for ${handler}`;
					return { finalState: state, error, roundOneStarter, siteRecords, actRecords, sendRecords, relocationRecords, decisions, rosterMeanHold, rosterMeanInitiative, sitesWonAfterWorld1, vanguardRelocationsThisMatch };
				}
				decisions++;
				state = nextState;
			}

			// deploy-end snapshot: per-site counts/margin BEFORE resolve/judge, used for
			// "resolve mattered" and the stack-vs-spread section
			const deployEnd = deployEndSnapshot(state, frame);

			if (state.phase === 'orders') {
				['A', 'B'].forEach((handler) => {
					const publicState = getPublicState(state, handler);
					const orders = chooseOrdersFor(handler, publicState);
					Object.keys(orders).forEach((creatureId) => {
						const next = order(state, handler, creatureId, orders[creatureId]);
						if (next) {
							state = next;
							decisions++;
						}
					});
				});

				const frameIndexBeforeCommit = state.frameIndex;
				const resolutionLogLengthBefore = state.resolutionLog.length;

				let next = commitOrders(state, 'A');
				if (!next) {
					error = 'commitOrders(A) failed';
					return { finalState: state, error, roundOneStarter, siteRecords, actRecords, sendRecords, relocationRecords, decisions, rosterMeanHold, rosterMeanInitiative, sitesWonAfterWorld1, vanguardRelocationsThisMatch };
				}
				state = next;
				next = commitOrders(state, 'B');
				if (!next) {
					error = 'commitOrders(B) failed';
					return { finalState: state, error, roundOneStarter, siteRecords, actRecords, sendRecords, relocationRecords, decisions, rosterMeanHold, rosterMeanInitiative, sitesWonAfterWorld1, vanguardRelocationsThisMatch };
				}
				state = next;

				// walk the new resolutionLog entries produced by this round's resolve+judge
				const newEvents = state.resolutionLog.slice(resolutionLogLengthBefore);
				const actedRecordIds = new Set();
				newEvents.forEach((ev) => {
					if (ev.type === 'judge') {
						return; // handled below via siteResults
					}
					const sentInfo = sentThisRound[ev.recordId];
					const actorRecord = sentInfo ? sentInfo.record : null;
					const actorSide = sentInfo ? sentInfo.side : null;
					if (ev.action && ev.action !== 'hold') {
						actedRecordIds.add(ev.recordId);
					}
					let magnitude = null;
					if (actorRecord && ev.target) {
						const targetInfo = sentThisRound[ev.target];
						const targetRecord = targetInfo ? targetInfo.record : null;
						if (targetRecord) {
							const actorSite = sentInfo.site;
							const site = frame.sites.find((s) => s.id === actorSite);
							const prepared = prepare(actorRecord, site, site.world, 0);
							const act = prepared.acts.find((a) => a.action === ev.action);
							if (act) {
								magnitude = magnitudeAgainst(actorRecord, act, targetRecord);
							}
						}
					}
					actRecords.push({
						frameIndex: frameIndexBeforeCommit,
						action: ev.action || null,
						class: ev.action ? (ACT_CLASS_BY_ACTION[ev.action] || null) : null,
						side: actorSide,
						archetype: actorRecord && actorRecord.archetype ? actorRecord.archetype.key : null,
						element: actorRecord && actorRecord.element ? actorRecord.element.primary : null,
						outcome: ev.outcome,
						magnitude,
						areaHit: !!ev.areaHit,
						hadTarget: !!ev.target || ev.outcome === 'area-struck',
					});
				});

				const judgeEvent = newEvents.find((ev) => ev.type === 'judge');
				if (judgeEvent && judgeEvent.siteResults) {
					Object.keys(judgeEvent.siteResults).forEach((siteId) => {
						const result = judgeEvent.siteResults[siteId];
						const before = deployEnd[siteId] || { countA: 0, countB: 0, marginAfterDeploy: 0 };
						const leaderAfterDeploy = before.marginAfterDeploy > 0 ? 'A' : (before.marginAfterDeploy < 0 ? 'B' : null);
						const uncontested = (before.countA > 0) !== (before.countB > 0) && (before.countA > 0 || before.countB > 0);
						const empty = before.countA === 0 && before.countB === 0;
						const margin = Math.abs(result.holdA - result.holdB);
						const site = frame.sites.find((s) => s.id === siteId);
						siteRecords.push({
							frameIndex: frameIndexBeforeCommit,
							frameStarter,
							siteId,
							planet: site ? site.world.planet : null,
							winner: result.winner,
							tie: result.winner === null,
							countA: before.countA,
							countB: before.countB,
							uncontested,
							empty,
							margin,
							leaderAfterDeploy,
							resolveMattered: !!leaderAfterDeploy && !!result.winner && leaderAfterDeploy !== result.winner,
						});
					});

					// attach each send's outcome (its side's win/loss at its own site) now
					// that Judge has run
					Object.values(sentThisRound).forEach((s) => {
						const result = judgeEvent.siteResults[s.site];
						if (!result) {
							return;
						}
						sendRecords.push({
							...s,
							won: result.winner === s.side,
							tie: result.winner === null,
							actedThisRound: actedRecordIds.has(s.recordId),
						});
					});

					if (frameIndexBeforeCommit === 0) {
						sitesWonAfterWorld1 = { A: state.players.A.sitesWon, B: state.players.B.sitesWon };
					}
				}
			}
		}
	}

	if (guard >= GUARD_LIMIT) {
		error = 'guard limit reached - possible infinite loop';
	}

	return {
		finalState: state,
		error,
		roundOneStarter,
		siteRecords,
		actRecords,
		sendRecords,
		relocationRecords,
		decisions,
		rosterMeanHold,
		rosterMeanInitiative,
		sitesWonAfterWorld1,
		vanguardRelocationsThisMatch,
		rosterAIds: rosterA.map((r) => r.id),
		rosterBIds: rosterB.map((r) => r.id),
	};
}

// helper used only inside the relocate branch above, to find which site a handler's
// vanguard currently stands at from the raw (non-public) state
function boardSiteOf(state, frame, handler, recordId) {
	if (!recordId) {
		return null;
	}
	for (const site of frame.sites) {
		if ((state.board[site.id][handler] || []).some((e) => e.recordId === recordId)) {
			return site.id;
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// summarize(): the ONE place flat per-match records become the report object.
// ---------------------------------------------------------------------------

function summarize(matchResults, args, pool, rivals) {
	const completedMatches = matchResults.filter((m) => !m.error);
	const errors = matchResults.filter((m) => m.error).map((m, i) => ({ matchIndex: i, error: m.error }));

	const allSites = completedMatches.flatMap((m) => m.siteRecords);
	const allActs = completedMatches.flatMap((m) => m.actRecords);
	const allSends = completedMatches.flatMap((m) => m.sendRecords);
	const allRelocations = completedMatches.flatMap((m) => m.relocationRecords);

	// side A's raw win rate, independent of who started - this is the number that answers
	// "how does rivalA do against rivalB" (--rivalA/--rivalB), unlike starterWinRate below
	// which is about the round-one-starter advantage regardless of which rival is seated
	// where.
	const aWins = completedMatches.filter((m) => m.finalState.winner === 'A').length;
	const sideAWinRate = rate(aWins, completedMatches.length);

	// -------------------- 1. seat fairness --------------------
	const starterWins = completedMatches.filter((m) => m.finalState.winner === m.roundOneStarter).length;
	const perFrameStarterSiteWins = {};
	const perFrameStarterSiteTotals = {};
	allSites.forEach((s) => {
		perFrameStarterSiteTotals[s.frameIndex] = (perFrameStarterSiteTotals[s.frameIndex] || 0) + 1;
		if (s.winner === s.frameStarter) {
			perFrameStarterSiteWins[s.frameIndex] = (perFrameStarterSiteWins[s.frameIndex] || 0) + 1;
		}
	});
	const perWorldStarterSiteWinRate = {};
	Object.keys(perFrameStarterSiteTotals).forEach((w) => {
		perWorldStarterSiteWinRate[w] = rate(perFrameStarterSiteWins[w] || 0, perFrameStarterSiteTotals[w]);
	});

	// "whoever deployed last (final pass) in the final world" wins the match how often
	let finalPasserWins = 0;
	let finalPasserKnown = 0;
	completedMatches.forEach((m) => {
		const p = m.finalState.players;
		const firstPasserSide = p.A.firstPasser ? 'A' : (p.B.firstPasser ? 'B' : null);
		if (!firstPasserSide) {
			return;
		}
		const lastPasserSide = otherSeat(firstPasserSide);
		finalPasserKnown++;
		if (m.finalState.winner === lastPasserSide) {
			finalPasserWins++;
		}
	});

	const totalRelocations = allRelocations.length;
	const matchesWithRelocation = completedMatches.filter((m) => m.vanguardRelocationsThisMatch > 0);
	const matchesWithoutRelocation = completedMatches.filter((m) => m.vanguardRelocationsThisMatch === 0);
	const starterWinsWithRelocation = matchesWithRelocation.filter((m) => m.finalState.winner === m.roundOneStarter).length;
	const starterWinsWithoutRelocation = matchesWithoutRelocation.filter((m) => m.finalState.winner === m.roundOneStarter).length;
	const relocationsThatFlipped = allRelocations.filter((r) => r.flippedToWinning).length;

	const seatFairness = {
		starterWinRate: rate(starterWins, completedMatches.length),
		perWorldStarterSiteWinRate,
		finalPasserWinRate: rate(finalPasserWins, finalPasserKnown),
		relocationsPerMatch: average(completedMatches.map((m) => m.vanguardRelocationsThisMatch)),
		starterWinRateWithRelocation: rate(starterWinsWithRelocation, matchesWithRelocation.length),
		starterWinRateWithoutRelocation: rate(starterWinsWithoutRelocation, matchesWithoutRelocation.length),
		relocationFlipRate: rate(relocationsThatFlipped, totalRelocations),
		mirrorMode: !!args.mirror,
	};

	// -------------------- 2. match shape --------------------
	const worldsPlayedCounts = {};
	const endReasonCounts = {};
	completedMatches.forEach((m) => {
		const n = m.finalState.frameIndex + 1;
		worldsPlayedCounts[n] = (worldsPlayedCounts[n] || 0) + 1;
		const reason = m.finalState.matchEndReason || 'unknown';
		endReasonCounts[reason] = (endReasonCounts[reason] || 0) + 1;
	});
	const finalScoreCounts = {};
	completedMatches.forEach((m) => {
		const a = m.finalState.players.A.sitesWon;
		const b = m.finalState.players.B.sitesWon;
		const key = a >= b ? `${a}-${b}` : `${b}-${a}`;
		finalScoreCounts[key] = (finalScoreCounts[key] || 0) + 1;
	});
	const comebackEligible = completedMatches.filter((m) => m.sitesWonAfterWorld1 && m.sitesWonAfterWorld1.A !== m.sitesWonAfterWorld1.B);
	const comebackWins = comebackEligible.filter((m) => {
		const trailer = m.sitesWonAfterWorld1.A < m.sitesWonAfterWorld1.B ? 'A' : 'B';
		return m.finalState.winner === trailer;
	}).length;

	const matchShape = {
		worldsPlayedCounts,
		endReasonCounts,
		finalScoreCounts,
		comebackWinRate: rate(comebackWins, comebackEligible.length),
		decisionsPerMatch: average(completedMatches.map((m) => m.decisions)),
	};

	// -------------------- 3. site economy --------------------
	const totalSites = allSites.length;
	const tiedSites = allSites.filter((s) => s.tie).length;
	const uncontestedSites = allSites.filter((s) => s.uncontested).length;
	const emptySites = allSites.filter((s) => s.empty).length;
	const contestedSites = allSites.filter((s) => !s.uncontested && !s.empty && !s.tie);
	const contestedMargins = contestedSites.map((s) => s.margin).sort((a, b) => a - b);
	const resolveMatteredCount = allSites.filter((s) => s.resolveMattered).length;
	const resolveMatteredEligible = allSites.filter((s) => s.leaderAfterDeploy && s.winner).length;

	const perWorldPosition = {};
	[0, 1, 2].forEach((w) => {
		const sitesAtW = allSites.filter((s) => s.frameIndex === w);
		const sendsAtW = allSends.filter((s) => s.frameIndex === w);
		perWorldPosition[w] = {
			sends: sendsAtW.length,
			tieRate: rate(sitesAtW.filter((s) => s.tie).length, sitesAtW.length),
			contestedRate: rate(sitesAtW.filter((s) => !s.uncontested && !s.empty).length, sitesAtW.length),
		};
	});

	const siteEconomy = {
		sitesWonPerMatch: {
			A: average(completedMatches.map((m) => m.finalState.players.A.sitesWon)),
			B: average(completedMatches.map((m) => m.finalState.players.B.sitesWon)),
		},
		tieToCourtRate: rate(tiedSites, totalSites),
		uncontestedRate: rate(uncontestedSites, totalSites),
		emptyRate: rate(emptySites, totalSites),
		contestedMarginMedian: quantile(contestedMargins, 0.5),
		contestedMarginQ1: quantile(contestedMargins, 0.25),
		contestedMarginQ3: quantile(contestedMargins, 0.75),
		resolveMatteredRate: rate(resolveMatteredCount, resolveMatteredEligible),
		perWorldPosition,
	};

	// -------------------- 4. roster economy --------------------
	const sentPerWorldPositionPerSide = {};
	[0, 1, 2].forEach((w) => {
		sentPerWorldPositionPerSide[w] = {
			A: allSends.filter((s) => s.frameIndex === w && s.side === 'A').length,
			B: allSends.filter((s) => s.frameIndex === w && s.side === 'B').length,
		};
	});
	const unsentAtEnd = {
		A: average(completedMatches.map((m) => m.finalState.players.A.roster.length)),
		B: average(completedMatches.map((m) => m.finalState.players.B.roster.length)),
	};

	const rosterEconomy = {
		sentPerWorldPositionPerSide,
		unsentAtMatchEnd: unsentAtEnd,
	};

	// -------------------- 5. combat --------------------
	const outcomeHistogram = {};
	allActs.forEach((a) => {
		outcomeHistogram[a.outcome] = (outcomeHistogram[a.outcome] || 0) + 1;
	});
	const perAct = {};
	const actionNames = [...new Set(allActs.map((a) => a.action).filter(Boolean))];
	actionNames.forEach((action) => {
		const all = allActs.filter((a) => a.action === action);
		// an area act logs one summary event (the order) plus one event per creature it
		// caught; orders are counted from the former, hits from the latter
		const orders = all.filter((a) => !a.areaHit);
		const hits = all.filter((a) => a.areaHit || a.outcome !== 'area-struck');
		const magnitudes = hits.map((r) => r.magnitude).filter((v) => typeof v === 'number');
		perAct[action] = {
			timesOrdered: orders.length,
			averageMagnitude: average(magnitudes),
			staggerRate: rate(hits.filter((r) => r.outcome === 'staggered').length, hits.length),
			routRate: rate(hits.filter((r) => r.outcome === 'routed').length, hits.length),
			noTargetRate: rate(orders.filter((r) => r.outcome === 'no-target-held').length, orders.length),
		};
	});
	const holdOrders = allActs.filter((a) => a.action === null || a.outcome === 'held');
	const actClassUsage = {};
	allActs.forEach((a) => {
		if (a.class) {
			actClassUsage[a.class] = (actClassUsage[a.class] || 0) + 1;
		}
	});

	const routs = allActs.filter((a) => a.outcome === 'routed');
	// "initiative alpha-strike": share of routs where the ROUTED creature had not yet
	// acted this round. We can only tell this from the send record's actedThisRound flag
	// on the target side, matched by looking up whether that recordId shows up as an
	// actor anywhere in the SAME round before this event. Approximated here via the
	// per-send actedThisRound flag captured for every sent creature.
	const sendByRecordId = {};
	allSends.forEach((s) => {
		sendByRecordId[`${s.frameIndex}:${s.recordId}`] = s;
	});

	const strainBuckets = { none: [], strained: [], severe: [] };
	allSends.forEach((s) => {
		strainBuckets[s.strainLevel] = strainBuckets[s.strainLevel] || [];
		strainBuckets[s.strainLevel].push(s);
	});
	const strainIncidence = {};
	Object.keys(strainBuckets).forEach((level) => {
		const group = strainBuckets[level];
		strainIncidence[level] = {
			sendShare: rate(group.length, allSends.length),
			siteWinRate: rate(group.filter((s) => s.won).length, group.filter((s) => !s.tie).length),
		};
	});

	const homeGroundSends = allSends.filter((s) => s.homeGround);
	const homeGround = {
		incidenceRate: rate(homeGroundSends.length, allSends.length),
		siteWinRate: rate(homeGroundSends.filter((s) => s.won).length, homeGroundSends.filter((s) => !s.tie).length),
	};

	const hiddenSends = allSends.filter((s) => s.hidden);
	const visibleSends = allSends.filter((s) => !s.hidden);
	const hiddenSendStats = {
		rate: rate(hiddenSends.length, allSends.length),
		siteWinRateHidden: rate(hiddenSends.filter((s) => s.won).length, hiddenSends.filter((s) => !s.tie).length),
		siteWinRateVisible: rate(visibleSends.filter((s) => s.won).length, visibleSends.filter((s) => !s.tie).length),
	};

	// stack-vs-spread: creatures per side per site (from send counts already grouped by
	// site via siteRecords' countA/countB, which reflect deploy-end stacking)
	const stackHistogram = { A: {}, B: {} };
	allSites.forEach((s) => {
		stackHistogram.A[s.countA] = (stackHistogram.A[s.countA] || 0) + 1;
		stackHistogram.B[s.countB] = (stackHistogram.B[s.countB] || 0) + 1;
	});
	function stackWinRate(countField, n) {
		const atN = allSites.filter((s) => s[countField] === n && !s.tie);
		const wins = atN.filter((s) => s.winner === countField.replace('count', ''));
		return rate(wins.length, atN.length);
	}
	const stackVsSpread = {
		histogram: stackHistogram,
		siteWinRateAt1: { A: stackWinRate('countA', 1), B: stackWinRate('countB', 1) },
		siteWinRateAt2: { A: stackWinRate('countA', 2), B: stackWinRate('countB', 2) },
		siteWinRateAt3Plus: {
			A: rate(allSites.filter((s) => s.countA >= 3 && !s.tie && s.winner === 'A').length, allSites.filter((s) => s.countA >= 3 && !s.tie).length),
			B: rate(allSites.filter((s) => s.countB >= 3 && !s.tie && s.winner === 'B').length, allSites.filter((s) => s.countB >= 3 && !s.tie).length),
		},
	};

	const combat = {
		outcomeHistogram,
		perAct,
		holdOrderCount: holdOrders.length,
		actClassUsage,
		strainIncidence,
		homeGround,
		hiddenSendStats,
		stackVsSpread,
	};

	// -------------------- 6. creature balance --------------------
	const byArchetype = {};
	allSends.filter((s) => !s.tie).forEach((s) => {
		const key = s.record.archetype ? s.record.archetype.key : 'unknown';
		byArchetype[key] = byArchetype[key] || { sent: 0, wins: 0, routsDealt: 0, routsSuffered: 0 };
		byArchetype[key].sent++;
		if (s.won) {
			byArchetype[key].wins++;
		}
	});
	allActs.forEach((a) => {
		if (!a.archetype) {
			return;
		}
		byArchetype[a.archetype] = byArchetype[a.archetype] || { sent: 0, wins: 0, routsDealt: 0, routsSuffered: 0 };
		if (a.outcome === 'routed') {
			byArchetype[a.archetype].routsDealt++;
		}
	});
	const archetypeReport = {};
	Object.keys(byArchetype).forEach((key) => {
		const b = byArchetype[key];
		archetypeReport[key] = {
			sent: b.sent,
			siteWinRate: rate(b.wins, b.sent),
			routsDealt: b.routsDealt,
		};
	});

	const byElement = {};
	allSends.forEach((s) => {
		const el = s.record.element ? s.record.element.primary : 'unknown';
		byElement[el] = byElement[el] || { sent: 0, wins: 0, nonTie: 0, strainedCount: 0 };
		byElement[el].sent++;
		if (!s.tie) {
			byElement[el].nonTie++;
			if (s.won) {
				byElement[el].wins++;
			}
		}
		if (s.strainLevel !== 'none') {
			byElement[el].strainedCount++;
		}
	});
	const elementReport = {};
	Object.keys(byElement).forEach((el) => {
		const b = byElement[el];
		elementReport[el] = {
			sent: b.sent,
			siteWinRate: rate(b.wins, b.nonTie),
			strainedShare: rate(b.strainedCount, b.sent),
		};
	});

	// per-element strain-by-world table: strainLevel() is purely a physiology fact (breathes
	// / ambientMedia / temperature tolerance) with NO dependency on element - a fire
	// creature and a water creature with identical physiology are equally strained
	// anywhere. So "element x world strain" cannot be read off strainLevel() with a
	// synthetic per-element probe (an earlier version of this table tried that and just
	// reproduced the physiology of whatever probe body it invented, which is not a
	// finding about elements at all - it is worth flagging in case this shows up as a
	// balance question again: strain and element are independent axes by design here).
	// What this table CAN honestly show is the real pool's strain incidence per world,
	// split by element, using every creature actually rolled into the pool (deterministic
	// under --seed, since the pool itself is fixed) rather than an invented body.
	const worlds = getWorlds();
	const ALL_ELEMENTS = ['fire', 'water', 'air', 'electric', 'rock', 'plant', 'chemical', 'light', 'dark', 'psychic', 'ghost', 'metal', 'ice', 'sand'];
	const elementWorldStrainTable = {};
	ALL_ELEMENTS.forEach((el) => {
		elementWorldStrainTable[el] = {};
		const creaturesOfElement = pool.filter((r) => r.element && r.element.primary === el);
		worlds.forEach((w) => {
			if (creaturesOfElement.length === 0) {
				elementWorldStrainTable[el][w.planet] = null; // no creature of this element in the pool to test
				return;
			}
			const strainedCount = creaturesOfElement.filter((r) => w.sites.some((site) => strainLevel(r, site, w) !== 'none')).length;
			elementWorldStrainTable[el][w.planet] = strainedCount / creaturesOfElement.length;
		});
	});

	const byTrait = {};
	allSends.forEach((s) => {
		const traits = s.record.traits ? [...(s.record.traits.guaranteed || []), ...(s.record.traits.rolled || [])] : [];
		traits.forEach((t) => {
			byTrait[t] = byTrait[t] || { present: 0, wins: 0, nonTie: 0 };
			byTrait[t].present++;
			if (!s.tie) {
				byTrait[t].nonTie++;
				if (s.won) {
					byTrait[t].wins++;
				}
			}
		});
	});
	const traitReport = {};
	Object.keys(byTrait).forEach((t) => {
		const b = byTrait[t];
		traitReport[t] = { present: b.present, siteWinRate: rate(b.wins, b.nonTie) };
	});

	// per-individual-creature (by record id) win rate, min 10 sends
	const byRecord = {};
	allSends.forEach((s) => {
		byRecord[s.recordId] = byRecord[s.recordId] || { record: s.record, sent: 0, wins: 0, nonTie: 0 };
		byRecord[s.recordId].sent++;
		if (!s.tie) {
			byRecord[s.recordId].nonTie++;
			if (s.won) {
				byRecord[s.recordId].wins++;
			}
		}
	});
	const poolWithHold = Object.values(byRecord).map((b) => ({ ...b, hold: baseHold(b.record) }));
	poolWithHold.sort((a, b) => b.hold - a.hold);
	poolWithHold.forEach((b, i) => {
		b.holdRank = i + 1;
	});
	const eligible = poolWithHold.filter((b) => b.sent >= 10 && b.nonTie > 0)
		.map((b) => ({
			recordId: b.record.id,
			species: b.record.species,
			archetype: b.record.archetype ? b.record.archetype.key : null,
			element: b.record.element ? b.record.element.primary : null,
			hold: b.hold,
			holdRank: b.holdRank,
			poolSize: poolWithHold.length,
			sent: b.sent,
			siteWinRate: b.wins / b.nonTie,
		}));
	eligible.sort((a, b) => b.siteWinRate - a.siteWinRate);
	const top5 = eligible.slice(0, 5);
	const bottom5 = eligible.slice(-5).reverse();

	// power correlation: per match, which side had the higher mean base hold / initiative
	const holdCorrelationEligible = completedMatches.filter((m) => m.rosterMeanHold.A !== m.rosterMeanHold.B);
	const holdCorrelationWins = holdCorrelationEligible.filter((m) => {
		const strongerSide = m.rosterMeanHold.A > m.rosterMeanHold.B ? 'A' : 'B';
		return m.finalState.winner === strongerSide;
	}).length;
	const initCorrelationEligible = completedMatches.filter((m) => m.rosterMeanInitiative.A !== m.rosterMeanInitiative.B);
	const initCorrelationWins = initCorrelationEligible.filter((m) => {
		const strongerSide = m.rosterMeanInitiative.A > m.rosterMeanInitiative.B ? 'A' : 'B';
		return m.finalState.winner === strongerSide;
	}).length;

	const creatureBalance = {
		byArchetype: archetypeReport,
		byElement: elementReport,
		elementWorldStrainTable,
		byTrait: traitReport,
		top5ByWinRate: top5,
		bottom5ByWinRate: bottom5,
		higherMeanHoldWinRate: rate(holdCorrelationWins, holdCorrelationEligible.length),
		higherMeanInitiativeWinRate: rate(initCorrelationWins, initCorrelationEligible.length),
	};

	// -------------------- 7. worlds --------------------
	// a match draws 9 distinct worlds, one per site on the table across its 3 frames; every
	// site on m.finalState.frames carries its own world (site.world), so "which worlds this
	// match drew" is read straight off the frames rather than a flat worlds list.
	const byPlanet = {};
	completedMatches.forEach((m) => {
		m.finalState.frames.forEach((frame) => {
			frame.sites.forEach((site) => {
				const planet = site.world.planet;
				byPlanet[planet] = byPlanet[planet] || { drawn: 0 };
				byPlanet[planet].drawn++;
			});
		});
	});
	// planet-level tie rate / routs-per-site / home-element presence: siteRecords already
	// carry the planet each site's world was (attached in runOneMatch), so no need to
	// cross-reference finalState.frames again here.
	const planetSiteRecords = {};
	completedMatches.forEach((m) => {
		m.siteRecords.forEach((s) => {
			if (!s.planet) {
				return;
			}
			planetSiteRecords[s.planet] = planetSiteRecords[s.planet] || [];
			planetSiteRecords[s.planet].push(s);
		});
	});
	const planetSendRecords = {};
	completedMatches.forEach((m) => {
		m.sendRecords.forEach((s) => {
			const site = m.finalState.frames[s.frameIndex] && m.finalState.frames[s.frameIndex].sites.find((st) => st.id === s.site);
			const planet = site ? site.world.planet : null;
			if (!planet) {
				return;
			}
			planetSendRecords[planet] = planetSendRecords[planet] || [];
			planetSendRecords[planet].push(s);
		});
	});
	const worldsReport = {};
	Object.keys(byPlanet).forEach((planet) => {
		const sites = planetSiteRecords[planet] || [];
		const sends = planetSendRecords[planet] || [];
		const world = worlds.find((w) => w.planet === planet);
		const homeElementSends = world ? sends.filter((s) => s.record.element && s.record.element.primary === world.element) : [];
		worldsReport[planet] = {
			timesDrawn: byPlanet[planet].drawn,
			tieRate: rate(sites.filter((s) => s.tie).length, sites.length),
			routsPerSite: sites.length > 0 ? (allActs.filter((a) => a.outcome === 'routed').length / completedMatches.length) / Math.max(1, byPlanet[planet].drawn / completedMatches.length * SITES_PER_WORLD) : 0,
			homeElementPresent: homeElementSends.length > 0,
			homeElementSiteWinRate: rate(homeElementSends.filter((s) => s.won).length, homeElementSends.filter((s) => !s.tie).length),
		};
	});

	return {
		meta: {
			matches: matchResults.length,
			completedMatches: completedMatches.length,
			seed: args.seed,
			mirror: !!args.mirror,
			random: args.random || null,
		},
		rivals: {
			A: { id: rivals && rivals.A ? rivals.A.id : DEFAULT_RIVAL_ID, name: rivals && rivals.A ? rivals.A.name : null },
			B: { id: rivals && rivals.B ? rivals.B.id : DEFAULT_RIVAL_ID, name: rivals && rivals.B ? rivals.B.name : null },
			sideAWinRate,
		},
		seatFairness,
		matchShape,
		siteEconomy,
		rosterEconomy,
		combat,
		creatureBalance,
		worlds: worldsReport,
		errors,
	};
}

// ---------------------------------------------------------------------------
// printReport: renders the summarized object as a designer-facing text report
// ---------------------------------------------------------------------------

function printHistogram(obj, indent = '  ') {
	Object.keys(obj).sort().forEach((k) => {
		console.log(`${indent}${k}: ${obj[k]}`);
	});
}

function printReport(report) {
	const { meta, rivals } = report;
	console.log('=== Reclamation bot-vs-bot simulation ===');
	console.log(`matches: ${meta.matches} (completed: ${meta.completedMatches})  seed: ${meta.seed}${meta.mirror ? '  [mirror]' : ''}${meta.random ? `  [random=${meta.random}]` : ''}`);
	// note --random overrides a side's rival with the uniform random policy at match time
	// (see chooseSendFor/chooseOrdersFor in runOneMatch); the rival named here is still
	// whatever --rivalA/--rivalB asked for, since a rival choice and --random are
	// independent flags and a random side simply never consults its weights
	const nameFor = (side, rival) => (meta.random === side ? `${rival.name || rival.id} (${rival.id}, overridden by --random)` : `${rival.name || rival.id} (${rival.id})`);
	console.log(`rivals: A=${nameFor('A', rivals.A)} vs B=${nameFor('B', rivals.B)} - A win rate ${fmtRate(rivals.sideAWinRate)}`);

	console.log('\n--- 1. seat fairness ---');
	const sf = report.seatFairness;
	console.log(`round-one starter win rate: ${fmtRate(sf.starterWinRate)}`);
	console.log('per-world starter site win rate:');
	Object.keys(sf.perWorldStarterSiteWinRate).sort().forEach((w) => {
		console.log(`  world ${Number(w) + 1}: ${fmtRate(sf.perWorldStarterSiteWinRate[w])}`);
	});
	console.log(`final-world last-to-pass win rate: ${fmtRate(sf.finalPasserWinRate)}`);
	console.log(`vanguard relocations per match: ${sf.relocationsPerMatch.toFixed(2)}`);
	console.log(`starter win rate with a relocation: ${fmtRate(sf.starterWinRateWithRelocation)}`);
	console.log(`starter win rate without a relocation: ${fmtRate(sf.starterWinRateWithoutRelocation)}`);
	console.log(`relocations that flipped losing->winning at deploy end: ${fmtRate(sf.relocationFlipRate)}`);

	console.log('\n--- 2. match shape ---');
	const ms = report.matchShape;
	console.log('worlds played distribution:');
	printHistogram(ms.worldsPlayedCounts);
	console.log('end reason:');
	printHistogram(ms.endReasonCounts);
	console.log('final site score distribution:');
	printHistogram(ms.finalScoreCounts);
	console.log(`comeback rate (trailing after world 1, won the match): ${fmtRate(ms.comebackWinRate)}`);
	console.log(`decisions per match (sends+passes+relocations+orders): ${ms.decisionsPerMatch.toFixed(1)}`);

	console.log('\n--- 3. site economy ---');
	const se = report.siteEconomy;
	console.log(`sites won per match — A: ${se.sitesWonPerMatch.A.toFixed(2)}, B: ${se.sitesWonPerMatch.B.toFixed(2)}`);
	console.log(`ties-to-Court rate: ${fmtRate(se.tieToCourtRate)}`);
	console.log(`uncontested sites: ${fmtRate(se.uncontestedRate)}`);
	console.log(`empty sites: ${fmtRate(se.emptyRate)}`);
	console.log(`contested site margin — median ${se.contestedMarginMedian.toFixed(2)}, Q1 ${se.contestedMarginQ1.toFixed(2)}, Q3 ${se.contestedMarginQ3.toFixed(2)}`);
	console.log(`resolve mattered (leader after deploy != winner at judge): ${fmtRate(se.resolveMatteredRate)}`);
	console.log('per world position:');
	Object.keys(se.perWorldPosition).forEach((w) => {
		const p = se.perWorldPosition[w];
		console.log(`  world ${Number(w) + 1}: sends=${p.sends}, tie rate=${fmtRate(p.tieRate)}, contested rate=${fmtRate(p.contestedRate)}`);
	});

	console.log('\n--- 4. roster economy ---');
	const re = report.rosterEconomy;
	console.log('creatures sent per world position per side:');
	Object.keys(re.sentPerWorldPositionPerSide).forEach((w) => {
		const p = re.sentPerWorldPositionPerSide[w];
		console.log(`  world ${Number(w) + 1}: A=${p.A}, B=${p.B}`);
	});
	console.log(`creatures unsent at match end — A: ${re.unsentAtMatchEnd.A.toFixed(2)}, B: ${re.unsentAtMatchEnd.B.toFixed(2)}`);

	console.log('\n--- 5. combat ---');
	const c = report.combat;
	console.log('outcome histogram:');
	printHistogram(c.outcomeHistogram);
	console.log('act class usage:');
	printHistogram(c.actClassUsage);
	console.log(`hold orders: ${c.holdOrderCount}`);
	console.log('per act:');
	Object.keys(c.perAct).sort().forEach((action) => {
		const a = c.perAct[action];
		console.log(`  ${action}: ordered=${a.timesOrdered}, avg magnitude=${a.averageMagnitude.toFixed(2)}, stagger=${fmtRate(a.staggerRate)}, rout=${fmtRate(a.routRate)}, no-target=${fmtRate(a.noTargetRate)}`);
	});
	console.log('strain incidence:');
	Object.keys(c.strainIncidence).forEach((level) => {
		const s = c.strainIncidence[level];
		console.log(`  ${level}: send share ${fmtRate(s.sendShare)}, site win rate ${fmtRate(s.siteWinRate)}`);
	});
	console.log(`home ground incidence: ${fmtRate(c.homeGround.incidenceRate)}, site win rate: ${fmtRate(c.homeGround.siteWinRate)}`);
	console.log(`hidden send rate: ${fmtRate(c.hiddenSendStats.rate)}`);
	console.log(`  site win rate hidden: ${fmtRate(c.hiddenSendStats.siteWinRateHidden)}, visible: ${fmtRate(c.hiddenSendStats.siteWinRateVisible)}`);
	console.log('stack-vs-spread histogram (creatures at one site, A):');
	printHistogram(c.stackVsSpread.histogram.A);
	console.log('stack-vs-spread histogram (creatures at one site, B):');
	printHistogram(c.stackVsSpread.histogram.B);
	console.log(`site win rate at count 1 — A: ${fmtRate(c.stackVsSpread.siteWinRateAt1.A)}, B: ${fmtRate(c.stackVsSpread.siteWinRateAt1.B)}`);
	console.log(`site win rate at count 2 — A: ${fmtRate(c.stackVsSpread.siteWinRateAt2.A)}, B: ${fmtRate(c.stackVsSpread.siteWinRateAt2.B)}`);
	console.log(`site win rate at count 3+ — A: ${fmtRate(c.stackVsSpread.siteWinRateAt3Plus.A)}, B: ${fmtRate(c.stackVsSpread.siteWinRateAt3Plus.B)}`);

	console.log('\n--- 6. creature balance ---');
	console.log('by archetype (sent, site win rate, routs dealt):');
	const cb = report.creatureBalance;
	Object.keys(cb.byArchetype).sort().forEach((key) => {
		const a = cb.byArchetype[key];
		console.log(`  ${key}: sent=${a.sent}, win rate=${fmtRate(a.siteWinRate)}, routs dealt=${a.routsDealt}`);
	});
	console.log('by element (sent, site win rate, strained share):');
	Object.keys(cb.byElement).sort().forEach((el) => {
		const e = cb.byElement[el];
		console.log(`  ${el}: sent=${e.sent}, win rate=${fmtRate(e.siteWinRate)}, strained share=${fmtRate(e.strainedShare)}`);
	});
	console.log('element x world strain table (share of that element pool strained at >=1 site on that world; "-" = none of that element in the pool):');
	const planetNames = Object.keys(Object.values(cb.elementWorldStrainTable)[0] || {});
	console.log(`  ${['element', ...planetNames].join(' | ')}`);
	Object.keys(cb.elementWorldStrainTable).sort().forEach((el) => {
		const row = cb.elementWorldStrainTable[el];
		console.log(`  ${el}: ${planetNames.map((p) => (row[p] === null ? '  -' : `${Math.round(row[p] * 100)}%`.padStart(4))).join(' ')}`);
	});
	console.log('by trait keyword (present, site win rate):');
	Object.keys(cb.byTrait).sort().forEach((t) => {
		const tr = cb.byTrait[t];
		console.log(`  ${t}: present=${tr.present}, win rate=${fmtRate(tr.siteWinRate)}`);
	});
	console.log('top 5 creatures by site win rate (min 10 sends):');
	cb.top5ByWinRate.forEach((r) => {
		console.log(`  ${r.species} (${r.archetype}/${r.element}) hold=${r.hold.toFixed(1)} rank ${r.holdRank}/${r.poolSize}: win rate ${(r.siteWinRate * 100).toFixed(1)}% (sent ${r.sent})`);
	});
	console.log('bottom 5 creatures by site win rate (min 10 sends):');
	cb.bottom5ByWinRate.forEach((r) => {
		console.log(`  ${r.species} (${r.archetype}/${r.element}) hold=${r.hold.toFixed(1)} rank ${r.holdRank}/${r.poolSize}: win rate ${(r.siteWinRate * 100).toFixed(1)}% (sent ${r.sent})`);
	});
	console.log(`power correlation — higher mean base hold wins: ${fmtRate(cb.higherMeanHoldWinRate)}`);
	console.log(`power correlation — higher mean initiative wins: ${fmtRate(cb.higherMeanInitiativeWinRate)}`);
	if (cb.higherMeanHoldWinRate && cb.higherMeanHoldWinRate.p > 0.6) {
		console.log('  NOTE: the stronger roster wins far above 60% — this reads as stats deciding the match more than decisions. Worth a design look.');
	}

	console.log('\n--- 7. worlds ---');
	Object.keys(report.worlds).sort().forEach((planet) => {
		const w = report.worlds[planet];
		console.log(`  ${planet}: drawn=${w.timesDrawn}, tie rate=${fmtRate(w.tieRate)}, home-element present=${w.homeElementPresent}, home-element win rate=${fmtRate(w.homeElementSiteWinRate)}`);
	});

	console.log('\n--- 8. determinism & errors ---');
	console.log(`errors: ${report.errors.length}`);
	if (report.errors.length > 0) {
		report.errors.slice(0, 10).forEach((e) => {
			console.log(`  match ${e.matchIndex}: ${e.error}`);
		});
	}
}

// ---------------------------------------------------------------------------
// runSimulation: the public entry point (also used directly by tests)
// ---------------------------------------------------------------------------

export function runSimulation(args = {}) {
	const opts = { matches: 300, seed: 7, mirror: false, random: null, rivalA: DEFAULT_RIVAL_ID, rivalB: DEFAULT_RIVAL_ID, ...args };
	const rng = makeRng(opts.seed);
	const pool = buildExpeditionPool(opts.seed, 87);
	const rivals = { A: rivalById(opts.rivalA), B: rivalById(opts.rivalB) };

	const matchResults = [];
	for (let i = 0; i < opts.matches; i++) {
		const matchSeed = `${opts.seed}-match-${i}`;
		const result = runOneMatch(matchSeed, pool, rng, { mirror: opts.mirror, randomSeat: opts.random, rivals });
		matchResults.push(result);
	}

	return summarize(matchResults, opts, pool, rivals);
}

// exported for the Vitest coverage test ("--mirror gives identical roster ids")
export function runSimulationRaw(args = {}) {
	const opts = { matches: 300, seed: 7, mirror: false, random: null, rivalA: DEFAULT_RIVAL_ID, rivalB: DEFAULT_RIVAL_ID, ...args };
	const rng = makeRng(opts.seed);
	const pool = buildExpeditionPool(opts.seed, 87);
	const rivals = { A: rivalById(opts.rivalA), B: rivalById(opts.rivalB) };
	const matchResults = [];
	for (let i = 0; i < opts.matches; i++) {
		const matchSeed = `${opts.seed}-match-${i}`;
		matchResults.push(runOneMatch(matchSeed, pool, rng, { mirror: opts.mirror, randomSeat: opts.random, rivals }));
	}
	return matchResults;
}

const isMainModule = typeof process !== 'undefined' && !process.env.JEST_WORKER_ID && !process.env.VITEST_WORKER_ID;

if (isMainModule) {
	const args = parseArgs(process.argv.slice(2));
	const startedAt = Date.now();
	const report = runSimulation(args);
	const elapsedMs = Date.now() - startedAt;
	printReport(report);
	console.log(`\nelapsed: ${(elapsedMs / 1000).toFixed(2)}s`);
	if (args.json) {
		fs.writeFileSync(args.json, JSON.stringify(report, null, 2));
		console.log(`wrote ${args.json}`);
	}
	if (report.errors.length > 0) {
		process.exitCode = 1;
	}
}
