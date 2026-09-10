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
		                    board. Lets a designer measure how much of the bot's edge is
		                    skill versus structural (seat, starter, roster) advantage.
		--rivalA=<id>       rival handler side A plays (see expeditionBot.js RIVALS);
		                    defaults to the Court proctor. Unknown ids fall back to the
		                    proctor via rivalById.
		--rivalB=<id>       same, for side B. Together these are how a rival's measured
		                    difficulty against the proctor, and its ladder position, gets
		                    set - never asserted.
		--rules=k=v;k=v     rule overrides passed straight to createMatch, so a whole
		                    balance report can be read at a lever setting that is not the
		                    default (e.g. --rules=shieldCap=half;bolsterFloor=1.5).
		                    Numbers are parsed as numbers, true/false as booleans, and
		                    roles.sweep / roles.bolster / roles.shield reach the nested
		                    roles object.

	This is a full designer-facing balance report (see docs/design/reclamation-design.md's
	"Tuning" open item): seat fairness, match shape, site economy, roster economy, combat,
	creature/archetype/element/trait balance, and per-world stats, every rate printed with
	a 95% binomial confidence interval (p ± 1.96*sqrt(p(1-p)/n)) so a designer can tell
	signal from noise at 300 matches. Deterministic under --seed.

	Design of the collection: runOneMatch() plays one full match and pushes RAW per-site,
	per-act, per-send, and per-swift-move records into flat arrays (plus a few whole-match
	scalars) - it does not pre-aggregate anything and does not retain full engine states,
	so memory stays bounded regardless of --matches. summarize() is the single place that
	turns those flat record arrays into every rate and histogram in the report; --json is
	simply that summarized object serialized, so "diff two variants" is a diff of that
	file. Aggregation lives in exactly one place on purpose: every section of the printed
	report and every field of the JSON output come from the same computation.
*/

import {
	createMatch, send, pass, moveSwift, getPublicState,
	createRngState, nextRandom,
} from '../expeditionRules.js';
import {
	ROSTER_SIZE, SITES_PER_WORLD, SENDABLE, FRAMES_PER_MATCH, WORLDS_PER_FRAME,
	RETURNED_SEND_COST, ROLE,
} from '../expeditionInterpretation.js';
import { chooseSend, rivalById, DEFAULT_RIVAL_ID } from '../expeditionBot.js';
import { prepare, baseHold, speedOf, strainLevel, roleOf } from '../creatureOnTable.js';
import { buildExpeditionPool } from '../roster.js';
import { getWorlds } from '../sites.js';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
	const args = {
		matches: 300, seed: 7, json: null, mirror: false, random: null,
		rivalA: DEFAULT_RIVAL_ID, rivalB: DEFAULT_RIVAL_ID, rules: null,
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
			} else if (key === 'rules') {
				args.rules = parseRules(raw);
			} else {
				args[key] = isNaN(Number(raw)) ? raw : Number(raw);
			}
		}
	});
	return args;
}

/*
	parseRules('shieldCap=half;bolsterFloor=1.5;roles.area=false') -> a rules object for
	createMatch. Every lever of the interpretation layer is a rules key (docs/design/
	reclamation-base-redesign.md assumption 15), so the whole balance report can be read at
	any setting without editing a constant.
*/
export function parseRules(raw) {
	const rules = {};
	String(raw).split(';').filter(Boolean).forEach((pair) => {
		const eq = pair.indexOf('=');
		if (eq < 0) {
			return;
		}
		const key = pair.slice(0, eq).trim();
		const text = pair.slice(eq + 1).trim();
		let value = text;
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
	const sendableCap = typeof me.sendableCap === 'number' ? me.sendableCap : SENDABLE;
	const remainingSends = Math.min(sendableCap - me.sentCount, ownRoster.length);
	if (remainingSends <= 0) {
		return { type: 'pass', reason: 'no-sendable-creatures' };
	}
	if (anyOnBoard && rng.float() < RANDOM_PASS_PROBABILITY) {
		return { type: 'pass', reason: 'random-pass' };
	}
	// a returned record (the Loki line) costs RETURNED_SEND_COST against the round's cap,
	// so it is only a legal pick while the cap can still afford it
	const returnedIds = new Set(me.returned || []);
	const capRemaining = sendableCap - me.sentCount;
	const candidates = [];
	ownRoster.forEach((record) => {
		if ((returnedIds.has(record.id) ? RETURNED_SEND_COST : 1) > capRemaining) {
			return;
		}
		frame.sites.forEach((site) => {
			candidates.push({ record, site });
		});
	});
	if (candidates.length === 0) {
		return { type: 'pass', reason: 'no-affordable-candidates' };
	}
	const pick = candidates[Math.floor(rng.float() * candidates.length)];
	const traits = (pick.record.traits && [...(pick.record.traits.guaranteed || []), ...(pick.record.traits.rolled || [])]) || [];
	const canHide = traits.includes('stealthy');
	const hidden = canHide && rng.float() < 0.5;
	return { type: 'send', recordId: pick.record.id, siteId: pick.site.id, hidden };
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
	if (typeof entry.currentHold === 'number') {
		return entry.currentHold;
	}
	const site = frame.sites.find((s) => s.id === siteId);
	return prepare(entry.record, site, site.world, entry.sentIndex, { rules: state.rules }).hold;
}

/*
	Bolster's reading (docs/design/reclamation-base-redesign.md assumption 8): the hold a
	bolsterer actually restores at its world, measured at the end of Deploy as the
	difference between every ally's hold as the engine computed it (already bolstered) and
	the same hold computed with the lift taken away.
*/
function bolsterRestoredAt(state, frame, site, player) {
	const entries = (state.board[site.id][player] || []).filter((e) => !e.downed);
	const bolsterers = entries.filter((e) => !e.hidden && roleOf(e.record, state.rules) === ROLE.BOLSTER);
	if (bolsterers.length === 0) {
		return null;
	}
	let restored = 0;
	entries.forEach((e) => {
		const withoutLift = prepare(e.record, site, site.world, e.sentIndex, { rules: state.rules }).hold;
		restored += Math.max(0, (typeof e.fullHold === 'number' ? e.fullHold : withoutLift) - withoutLift);
	});
	return { bolsterers: bolsterers.length, restored };
}

function deployEndSnapshot(state, frame) {
	// per-site margin (A-hold minus B-hold) and per-side counts, taken right at the
	// moment Deploy ends (before Resolve/Judge) - this is "the leader after Deploy" used
	// for the "resolve mattered" and swift-move flip stats.
	const bySite = { bolster: {} };
	frame.sites.forEach((site) => {
		const a = state.board[site.id].A || [];
		const b = state.board[site.id].B || [];
		bySite[site.id] = {
			countA: a.length,
			countB: b.length,
			marginAfterDeploy: siteMarginRaw(state, frame, site.id),
		};
		['A', 'B'].forEach((player) => {
			const reading = bolsterRestoredAt(state, frame, site, player);
			if (reading) {
				bySite.bolster[`${site.id}:${player}`] = reading;
			}
		});
	});
	return bySite;
}

// ---------------------------------------------------------------------------
// runOneMatch: plays one full match, collecting raw per-site / per-act / per-send /
// per-swift-move records. No full engine state is retained after the match ends.
// ---------------------------------------------------------------------------

function runOneMatch(matchSeed, pool, rng, options) {
	const { mirror, randomSeat, rivals, rules } = options;
	const rivalFor = { A: rivals && rivals.A, B: rivals && rivals.B };

	const rosterA = buildRandomRoster(pool, rng);
	const rosterB = mirror ? rosterA.slice() : buildRandomRoster(pool, rng);

	const worlds = getWorlds();
	let state = createMatch({ rosterA, rosterB, worlds, seed: matchSeed, rules });
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
	const rosterMeanSpeed = { A: average(rosterA.map((r) => speedOf(r))), B: average(rosterB.map((r) => speedOf(r))) };
	// hold rank within the 80-creature pool, for the "top/bottom 5 individual creatures"
	// section - computed once by the caller and passed in via options.poolHoldRank

	const siteRecords = [];
	const attackRecords = []; // one per 'attack' event (assumption 5: every attack is a number)
	const shieldRecords = []; // one per 'shield' event (assumption 7)
	const bolsterRecords = []; // one per site per side where a bolsterer stood (assumption 8)
	// one per 'recover' event: what a bolster gave back at the Ruling (assumption 19). The
	// strain lift in bolsterRecords is read at deploy end and is a different quantity.
	const recoverRecords = [];
	const sendRecords = []; // filled progressively; siteResult/won attached at judge time
	const swiftMoveRecords = [];
	let decisions = 0; // sends + passes + swift moves, as a playtime proxy
	let sitesWonAfterWorld1 = null; // { A, B } snapshot for the comeback-rate stat
	let error = null;
	let swiftMovesThisMatch = 0;

	function bail() {
		return {
			finalState: state, error, roundOneStarter, siteRecords, attackRecords, shieldRecords,
			bolsterRecords, recoverRecords, sendRecords, swiftMoveRecords, decisions, rosterMeanHold,
			rosterMeanSpeed, sitesWonAfterWorld1, swiftMovesThisMatch,
			rosterAIds: rosterA.map((r) => r.id), rosterBIds: rosterB.map((r) => r.id),
		};
	}

	function chooseSendFor(handler, publicState, ownRoster) {
		if (randomSeat === handler) {
			return randomChooseSend(publicState, ownRoster, handler, rngLike);
		}
		return chooseSend(publicState, ownRoster, handler, rngLike, rivalFor[handler]);
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
		const frameStarter = state.starter;
		// records sent this round, keyed by recordId, so the site's judged outcome can be
		// attached to each send once Judge has run
		const sentThisRound = {};
		// Deploy now ends INSIDE pass(): the second pass runs Resolve and Judge in one
		// step (assumption 1), so the deploy-end snapshot and the log watermark are taken
		// fresh before every action and the last pair is the one that describes the round.
		let deployEnd = deployEndSnapshot(state, frame);
		let logLengthBeforeResolve = state.resolutionLog.length;

		while (state.phase === 'deploy' && state.frameIndex === frameIndex && guard < GUARD_LIMIT) {
			guard++;
			const handler = state.turn;
			if (handler === null) {
				break;
			}
			deployEnd = deployEndSnapshot(state, frame);
			logLengthBeforeResolve = state.resolutionLog.length;

			const publicState = getPublicState(state, handler);
			const ownRoster = state.players[handler].roster;
			let action = chooseSendFor(handler, publicState, ownRoster);

			if (action.type === 'move') {
				const fromSiteId = boardSiteOf(state, frame, handler, action.recordId);
				const marginBefore = fromSiteId ? siteMarginRaw(state, frame, fromSiteId) : 0;
				const wasLosingBefore = handler === 'A' ? marginBefore < 0 : marginBefore > 0;

				const moved = moveSwift(state, handler, action.recordId, action.siteId);
				if (!moved) {
					error = `illegal swift move: ${JSON.stringify(action)} for ${handler}`;
					return bail();
				}
				state = moved;
				swiftMovesThisMatch++;
				decisions++;

				const marginAfter = siteMarginRaw(state, frame, action.siteId);
				const isWinningAfter = handler === 'A' ? marginAfter > 0 : marginAfter < 0;
				swiftMoveRecords.push({ handler, wasLosingBefore, isWinningAfter, flippedToWinning: wasLosingBefore && isWinningAfter });

				deployEnd = deployEndSnapshot(state, frame);
				logLengthBeforeResolve = state.resolutionLog.length;
				const publicStateAfter = getPublicState(state, handler);
				action = chooseSendFor(handler, publicStateAfter, state.players[handler].roster);
			}

			let nextState = null;
			if (action.type === 'send') {
				// captured BEFORE send(), which clears the flag on the sent record
				const wasReturned = (state.players[handler].returned || []).includes(action.recordId);
				const record = state.players[handler].roster.find((r) => r.id === action.recordId);
				nextState = send(state, handler, action.recordId, action.siteId, action.hidden);
				if (nextState) {
					const site = frame.sites.find((s) => s.id === action.siteId);
					const prepared = prepare(record, site, site.world, 0, { rules: state.rules });
					sentThisRound[action.recordId] = {
						recordId: action.recordId,
						record,
						side: handler,
						frameIndex,
						site: action.siteId,
						hidden: !!action.hidden,
						role: prepared.role,
						blowFallback: !!prepared.blowIsFallback,
						strainLevel: strainLevel(record, site, site.world),
						homeGround: !!(record.provenance && record.provenance.origin && String(record.provenance.origin).toLowerCase() === String(site.world.planet).toLowerCase()),
						returnedSend: wasReturned,
					};
					// the deploy-end snapshot has to include the send that just landed, in
					// case this was the last action before an auto-pass ended the round.
					// When the send DID end the round (the sender had nothing legal left
					// and was auto-passed into Resolve), nextState already carries the next
					// frame's board, so the arriving creature is folded into the previous
					// snapshot by hand instead.
					if (nextState.phase === 'deploy' && nextState.frameIndex === frameIndex) {
						deployEnd = deployEndSnapshot(nextState, frame);
					} else {
						const arriving = prepared.hold * (handler === 'A' ? 1 : -1);
						const before = deployEnd[action.siteId];
						deployEnd = {
							...deployEnd,
							[action.siteId]: {
								countA: before.countA + (handler === 'A' ? 1 : 0),
								countB: before.countB + (handler === 'B' ? 1 : 0),
								marginAfterDeploy: before.marginAfterDeploy + arriving,
							},
						};
					}
				}
			} else {
				nextState = pass(state, handler);
			}
			if (!nextState) {
				error = `illegal deploy action: ${JSON.stringify(action)} for ${handler}`;
				return bail();
			}
			decisions++;
			state = nextState;
		}

		// bolster's reading is taken from the deploy-end board, where every ally that will
		// be lifted is already standing
		['A', 'B'].forEach((side) => {
			frame.sites.forEach((site) => {
				const reading = deployEnd.bolster && deployEnd.bolster[`${site.id}:${side}`];
				if (reading) {
					bolsterRecords.push({ side, frameIndex, siteId: site.id, ...reading });
				}
			});
		});

		// walk the events this round's resolve+judge produced
		const newEvents = state.resolutionLog.slice(logLengthBeforeResolve);
		newEvents.forEach((ev) => {
			if (ev.type === 'attack') {
				const sentInfo = sentThisRound[ev.recordId];
				attackRecords.push({
					frameIndex,
					role: ev.role,
					side: sentInfo ? sentInfo.side : null,
					archetype: sentInfo && sentInfo.record.archetype ? sentInfo.record.archetype.key : null,
					element: sentInfo && sentInfo.record.element ? sentInfo.record.element.primary : null,
					outcome: ev.outcome,
					power: typeof ev.power === 'number' ? ev.power : null,
					remaining: ev.remaining,
					hidden: !!ev.hidden,
					cancelled: !!ev.cancelled,
				});
				return;
			}
			if (ev.type === 'shield') {
				shieldRecords.push({ frameIndex, recordId: ev.recordId, cancelled: ev.cancelled, amount: ev.amount || 0 });
				return;
			}
			if (ev.type === 'recover') {
				recoverRecords.push({ frameIndex, recordId: ev.recordId, bolster: ev.bolster, amount: ev.amount || 0 });
			}
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
					frameIndex,
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

			Object.values(sentThisRound).forEach((sent) => {
				const result = judgeEvent.siteResults[sent.site];
				if (!result) {
					return;
				}
				sendRecords.push({ ...sent, won: result.winner === sent.side, tie: result.winner === null });
			});

			if (frameIndex === 0) {
				sitesWonAfterWorld1 = { A: state.players.A.sitesWon, B: state.players.B.sitesWon };
			}
		}
	}

		if (guard >= GUARD_LIMIT) {
		error = 'guard limit reached - possible infinite loop';
	}

	return bail();
}

// helper used only inside the move branch above, to find which site one of a handler's
// creatures currently stands at from the raw (non-public) state
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
	const allAttacks = completedMatches.flatMap((m) => m.attackRecords);
	const allShields = completedMatches.flatMap((m) => m.shieldRecords);
	const allBolsters = completedMatches.flatMap((m) => m.bolsterRecords);
	const allRecoveries = completedMatches.flatMap((m) => m.recoverRecords);
	const allSends = completedMatches.flatMap((m) => m.sendRecords);
	const allSwiftMoves = completedMatches.flatMap((m) => m.swiftMoveRecords);

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

	const totalSwiftMoves = allSwiftMoves.length;
	const matchesWithSwiftMove = completedMatches.filter((m) => m.swiftMovesThisMatch > 0);
	const matchesWithoutSwiftMove = completedMatches.filter((m) => m.swiftMovesThisMatch === 0);
	const starterWinsWithSwiftMove = matchesWithSwiftMove.filter((m) => m.finalState.winner === m.roundOneStarter).length;
	const starterWinsWithoutSwiftMove = matchesWithoutSwiftMove.filter((m) => m.finalState.winner === m.roundOneStarter).length;
	const swiftMovesThatFlipped = allSwiftMoves.filter((r) => r.flippedToWinning).length;

	const seatFairness = {
		starterWinRate: rate(starterWins, completedMatches.length),
		perWorldStarterSiteWinRate,
		finalPasserWinRate: rate(finalPasserWins, finalPasserKnown),
		swiftMovesPerMatch: average(completedMatches.map((m) => m.swiftMovesThisMatch)),
		starterWinRateWithSwiftMove: rate(starterWinsWithSwiftMove, matchesWithSwiftMove.length),
		starterWinRateWithoutSwiftMove: rate(starterWinsWithoutSwiftMove, matchesWithoutSwiftMove.length),
		swiftMoveFlipRate: rate(swiftMovesThatFlipped, totalSwiftMoves),
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

	/*
		Hold compression's own gauge (docs/design/reclamation-base-redesign.md assumption
		11): the species mean hold spread across the whole generated pool, before any
		world, strain or company. The base redesign asks for about 2:1; a floor of zero
		leaves it wherever the records put it.
	*/
	const holdBySpecies = {};
	pool.forEach((record) => {
		const key = record.species || 'unknown';
		holdBySpecies[key] = holdBySpecies[key] || [];
		holdBySpecies[key].push(baseHold(record));
	});
	const speciesMeanHolds = Object.keys(holdBySpecies).map((key) => ({
		species: key,
		meanHold: average(holdBySpecies[key]),
	})).sort((a, b) => a.meanHold - b.meanHold);
	const speciesHoldSpread = {
		lowest: speciesMeanHolds[0] || null,
		highest: speciesMeanHolds[speciesMeanHolds.length - 1] || null,
		ratio: speciesMeanHolds.length > 0 && speciesMeanHolds[0].meanHold > 0
			? speciesMeanHolds[speciesMeanHolds.length - 1].meanHold / speciesMeanHolds[0].meanHold
			: null,
		rows: speciesMeanHolds,
	};

	const rosterEconomy = {
		sentPerWorldPositionPerSide,
		unsentAtMatchEnd: unsentAtEnd,
		speciesHoldSpread,
	};

	// -------------------- 5. combat --------------------
	/*
		Per ROLE, not per act: since the base redesign (docs/design/reclamation-base-redesign.md
		assumption 4) a creature has exactly one of four roles and no act is ever chosen, so
		the sixteen-act tables measured nothing a designer could act on. What is left is the
		reading the base redesign's gauges name: sends per role, the keeper win rate of each
		role, the mean power an attack removes, cancels per match, hold restored per bolster
		send, downs per match, and how often resolution changed the leader at a world.
	*/
	const outcomeHistogram = {};
	allAttacks.forEach((b) => {
		outcomeHistogram[b.outcome] = (outcomeHistogram[b.outcome] || 0) + 1;
	});

	const landedAttacks = allAttacks.filter((b) => b.outcome === 'hurt' || b.outcome === 'downed');
	const perRole = {};
	[ROLE.STRIKE, ROLE.SWEEP, ROLE.BOLSTER, ROLE.SHIELD, ROLE.NONE].forEach((role) => {
		const sends = allSends.filter((x) => x.role === role);
		const decided = sends.filter((x) => !x.tie);
		const attacks = landedAttacks.filter((b) => b.role === role);
		perRole[role] = {
			sends: sends.length,
			sendShare: rate(sends.length, allSends.length),
			keeperWinRate: rate(decided.filter((x) => x.won).length, decided.length),
			meanPowerPerAttack: average(attacks.map((b) => b.power).filter((v) => typeof v === 'number')),
			downsDealt: allAttacks.filter((b) => b.role === role && b.outcome === 'downed').length,
		};
	});

	const cancels = allShields.filter((x) => x.cancelled);
	const shieldStats = {
		shieldSendsPerMatch: average(completedMatches.map((m) => m.sendRecords.filter((x) => x.role === ROLE.SHIELD).length)),
		cancelsPerMatch: average(completedMatches.map((m) => m.shieldRecords.filter((x) => x.cancelled).length)),
		cancelRate: rate(cancels.length, allShields.length),
		meanAmountCancelled: average(cancels.map((x) => x.amount)),
	};

	const bolsterStats = {
		bolsterSendsPerMatch: average(completedMatches.map((m) => m.sendRecords.filter((x) => x.role === ROLE.BOLSTER).length)),
		holdRestoredPerBolsterSend: average(allBolsters.map((x) => x.restored / Math.max(1, x.bolsterers))),
		sitesWithABolsterer: allBolsters.length,
		// assumption 19: what the Ruling gave back, per bolster SENT, which is the number
		// the bolsterRecovery lever moves directly
		recoveriesPerMatch: average(completedMatches.map((m) => m.recoverRecords.length)),
		holdRecoveredPerBolsterSend: (() => {
			const sends = completedMatches.reduce((n, m) => n + m.sendRecords.filter((x) => x.role === ROLE.BOLSTER).length, 0);
			const recovered = allRecoveries.reduce((sum, x) => sum + x.amount, 0);
			return sends > 0 ? recovered / sends : 0;
		})(),
	};

	const attackStats = {
		attacksPerMatch: average(completedMatches.map((m) => m.attackRecords.length)),
		downsPerMatch: average(completedMatches.map((m) => m.attackRecords.filter((b) => b.outcome === 'downed').length)),
		meanPower: average(landedAttacks.map((b) => b.power)),
		cancelledShare: rate(allAttacks.filter((b) => b.cancelled).length, allAttacks.length),
		noTargetShare: rate(allAttacks.filter((b) => b.outcome === 'no-target').length, allAttacks.length),
		lapsedShare: rate(allAttacks.filter((b) => b.outcome === 'lapsed').length, allAttacks.length),
		hiddenAttackShare: rate(allAttacks.filter((b) => b.hidden).length, allAttacks.length),
		// an attacking creature with no attacking ability at all strikes at the pool minimum
		// (creatureOnTable.blowActOf); this is how often that fallback fired
		fallbackAttackShare: rate(allSends.filter((x) => x.blowFallback).length, allSends.length),
	};

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

	// The Loki line (Pass 2 lever, docs/design/reclamation-play-enhancements.md): how often
	// a returned creature (withdrawn from a LOST world, sent again at RETURNED_SEND_COST)
	// is actually re-sent, and how it fares versus a normal first send.
	const returnedSends = allSends.filter((s) => s.returnedSend);
	const firstSends = allSends.filter((s) => !s.returnedSend);
	const returnedSendStats = {
		perMatch: average(completedMatches.map((m) => m.sendRecords.filter((s) => s.returnedSend).length)),
		rate: rate(returnedSends.length, allSends.length),
		siteWinRateReturned: rate(returnedSends.filter((s) => s.won).length, returnedSends.filter((s) => !s.tie).length),
		siteWinRateFirstSend: rate(firstSends.filter((s) => s.won).length, firstSends.filter((s) => !s.tie).length),
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
		perRole,
		attackStats,
		shieldStats,
		bolsterStats,
		strainIncidence,
		homeGround,
		hiddenSendStats,
		returnedSendStats,
		stackVsSpread,
	};

	// -------------------- 6. creature balance --------------------
	const byArchetype = {};
	allSends.filter((s) => !s.tie).forEach((s) => {
		const key = s.record.archetype ? s.record.archetype.key : 'unknown';
		byArchetype[key] = byArchetype[key] || { sent: 0, wins: 0, downsDealt: 0, downsSuffered: 0 };
		byArchetype[key].sent++;
		if (s.won) {
			byArchetype[key].wins++;
		}
	});
	allAttacks.forEach((b) => {
		if (!b.archetype) {
			return;
		}
		byArchetype[b.archetype] = byArchetype[b.archetype] || { sent: 0, wins: 0, downsDealt: 0, downsSuffered: 0 };
		if (b.outcome === 'downed') {
			byArchetype[b.archetype].downsDealt++;
		}
	});
	const archetypeReport = {};
	Object.keys(byArchetype).forEach((key) => {
		const b = byArchetype[key];
		archetypeReport[key] = {
			sent: b.sent,
			siteWinRate: rate(b.wins, b.sent),
			downsDealt: b.downsDealt,
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

	// power correlation: per match, which side had the higher mean base hold / speed
	const holdCorrelationEligible = completedMatches.filter((m) => m.rosterMeanHold.A !== m.rosterMeanHold.B);
	const holdCorrelationWins = holdCorrelationEligible.filter((m) => {
		const strongerSide = m.rosterMeanHold.A > m.rosterMeanHold.B ? 'A' : 'B';
		return m.finalState.winner === strongerSide;
	}).length;
	const speedCorrelationEligible = completedMatches.filter((m) => m.rosterMeanSpeed.A !== m.rosterMeanSpeed.B);
	const speedCorrelationWins = speedCorrelationEligible.filter((m) => {
		const strongerSide = m.rosterMeanSpeed.A > m.rosterMeanSpeed.B ? 'A' : 'B';
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
		higherMeanSpeedWinRate: rate(speedCorrelationWins, speedCorrelationEligible.length),
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
	// planet-level tie rate / downs-per-site / home-element presence: siteRecords already
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
			downsPerSite: sites.length > 0 ? (allAttacks.filter((b) => b.outcome === 'downed').length / completedMatches.length) / Math.max(1, byPlanet[planet].drawn / completedMatches.length * SITES_PER_WORLD) : 0,
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
	// (see chooseSendFor in runOneMatch); the rival named here is still
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
	console.log(`swift moves per match: ${sf.swiftMovesPerMatch.toFixed(2)}`);
	console.log(`starter win rate with a swift move: ${fmtRate(sf.starterWinRateWithSwiftMove)}`);
	console.log(`starter win rate without a swift move: ${fmtRate(sf.starterWinRateWithoutSwiftMove)}`);
	console.log(`swift moves that flipped losing->winning at deploy end: ${fmtRate(sf.swiftMoveFlipRate)}`);

	console.log('\n--- 2. match shape ---');
	const ms = report.matchShape;
	console.log('worlds played distribution:');
	printHistogram(ms.worldsPlayedCounts);
	console.log('end reason:');
	printHistogram(ms.endReasonCounts);
	console.log('final site score distribution:');
	printHistogram(ms.finalScoreCounts);
	console.log(`comeback rate (trailing after world 1, won the match): ${fmtRate(ms.comebackWinRate)}`);
	console.log(`decisions per match (sends+passes+swift moves): ${ms.decisionsPerMatch.toFixed(1)}`);

	console.log('\n--- 3. site economy ---');
	const se = report.siteEconomy;
	console.log(`sites won per match - A: ${se.sitesWonPerMatch.A.toFixed(2)}, B: ${se.sitesWonPerMatch.B.toFixed(2)}`);
	console.log(`ties-to-Court rate: ${fmtRate(se.tieToCourtRate)}`);
	console.log(`uncontested sites: ${fmtRate(se.uncontestedRate)}`);
	console.log(`empty sites: ${fmtRate(se.emptyRate)}`);
	console.log(`contested site margin - median ${se.contestedMarginMedian.toFixed(2)}, Q1 ${se.contestedMarginQ1.toFixed(2)}, Q3 ${se.contestedMarginQ3.toFixed(2)}`);
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
	console.log(`creatures unsent at match end - A: ${re.unsentAtMatchEnd.A.toFixed(2)}, B: ${re.unsentAtMatchEnd.B.toFixed(2)}`);
	const hs = re.speciesHoldSpread;
	if (hs && hs.lowest && hs.highest) {
		console.log(`species mean hold spread: ${hs.lowest.meanHold.toFixed(2)} (${hs.lowest.species}) to ${hs.highest.meanHold.toFixed(2)} (${hs.highest.species}) = ${hs.ratio.toFixed(2)}:1`);
	}

	console.log('\n--- 5. combat ---');
	const c = report.combat;
	console.log('attack outcome histogram:');
	printHistogram(c.outcomeHistogram);
	console.log(`attacks per match: ${c.attackStats.attacksPerMatch.toFixed(2)}, downs per match: ${c.attackStats.downsPerMatch.toFixed(2)}`);
	console.log(`mean power per landed attack: ${c.attackStats.meanPower.toFixed(2)}`);
	console.log(`cancelled share ${fmtRate(c.attackStats.cancelledShare)}, no-target ${fmtRate(c.attackStats.noTargetShare)}, lapsed ${fmtRate(c.attackStats.lapsedShare)}`);
	console.log(`hidden attacks: ${fmtRate(c.attackStats.hiddenAttackShare)}; fallback (no attacking ability) sends: ${fmtRate(c.attackStats.fallbackAttackShare)}`);
	console.log('per role (sends, share, keeper win rate, mean power per attack, downs dealt):');
	Object.keys(c.perRole).forEach((role) => {
		const r = c.perRole[role];
		console.log(`  ${role}: sends=${r.sends} (${fmtRate(r.sendShare)}), keeper win rate=${fmtRate(r.keeperWinRate)}, mean power=${r.meanPowerPerAttack.toFixed(2)}, downs dealt=${r.downsDealt}`);
	});
	console.log(`shield: ${c.shieldStats.shieldSendsPerMatch.toFixed(2)} sends per match, ${c.shieldStats.cancelsPerMatch.toFixed(2)} cancels per match, cancel rate ${fmtRate(c.shieldStats.cancelRate)}, mean amount cancelled ${c.shieldStats.meanAmountCancelled.toFixed(2)}`);
	console.log(`bolster: ${c.bolsterStats.bolsterSendsPerMatch.toFixed(2)} sends per match, ${c.bolsterStats.holdRestoredPerBolsterSend.toFixed(2)} hold restored per bolster send, ${c.bolsterStats.holdRecoveredPerBolsterSend.toFixed(2)} hold recovered per bolster send at the Ruling (${c.bolsterStats.recoveriesPerMatch.toFixed(2)} recoveries per match)`);
	console.log('strain incidence:');
	Object.keys(c.strainIncidence).forEach((level) => {
		const s = c.strainIncidence[level];
		console.log(`  ${level}: send share ${fmtRate(s.sendShare)}, site win rate ${fmtRate(s.siteWinRate)}`);
	});
	console.log(`home ground incidence: ${fmtRate(c.homeGround.incidenceRate)}, site win rate: ${fmtRate(c.homeGround.siteWinRate)}`);
	console.log(`hidden send rate: ${fmtRate(c.hiddenSendStats.rate)}`);
	console.log(`  site win rate hidden: ${fmtRate(c.hiddenSendStats.siteWinRateHidden)}, visible: ${fmtRate(c.hiddenSendStats.siteWinRateVisible)}`);
	console.log(`returned (Loki line) send rate: ${fmtRate(c.returnedSendStats.rate)}, ${c.returnedSendStats.perMatch.toFixed(2)} per match`);
	console.log(`  site win rate returned: ${fmtRate(c.returnedSendStats.siteWinRateReturned)}, first send: ${fmtRate(c.returnedSendStats.siteWinRateFirstSend)}`);
	console.log('stack-vs-spread histogram (creatures at one site, A):');
	printHistogram(c.stackVsSpread.histogram.A);
	console.log('stack-vs-spread histogram (creatures at one site, B):');
	printHistogram(c.stackVsSpread.histogram.B);
	console.log(`site win rate at count 1 - A: ${fmtRate(c.stackVsSpread.siteWinRateAt1.A)}, B: ${fmtRate(c.stackVsSpread.siteWinRateAt1.B)}`);
	console.log(`site win rate at count 2 - A: ${fmtRate(c.stackVsSpread.siteWinRateAt2.A)}, B: ${fmtRate(c.stackVsSpread.siteWinRateAt2.B)}`);
	console.log(`site win rate at count 3+ - A: ${fmtRate(c.stackVsSpread.siteWinRateAt3Plus.A)}, B: ${fmtRate(c.stackVsSpread.siteWinRateAt3Plus.B)}`);

	console.log('\n--- 6. creature balance ---');
	console.log('by archetype (sent, site win rate, downs dealt):');
	const cb = report.creatureBalance;
	Object.keys(cb.byArchetype).sort().forEach((key) => {
		const a = cb.byArchetype[key];
		console.log(`  ${key}: sent=${a.sent}, win rate=${fmtRate(a.siteWinRate)}, downs dealt=${a.downsDealt}`);
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
	console.log(`power correlation - higher mean base hold wins: ${fmtRate(cb.higherMeanHoldWinRate)}`);
	console.log(`power correlation - higher mean speed wins: ${fmtRate(cb.higherMeanSpeedWinRate)}`);
	if (cb.higherMeanHoldWinRate && cb.higherMeanHoldWinRate.p > 0.6) {
		console.log('  NOTE: the stronger roster wins far above 60% - this reads as stats deciding the match more than decisions. Worth a design look.');
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
		const result = runOneMatch(matchSeed, pool, rng, { mirror: opts.mirror, randomSeat: opts.random, rivals, rules: opts.rules || null });
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
		matchResults.push(runOneMatch(matchSeed, pool, rng, { mirror: opts.mirror, randomSeat: opts.random, rivals, rules: opts.rules || null }));
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
