/*
	Tribute — the pure rules state machine.

	Framework-free per docs/design/tribute-design.md step 2 ("headless rules engine ...
	the rules above are a state machine, the most testable thing there is"). No
	boardgame.io yet. Every function takes a state and returns a NEW state (state is never
	mutated in place); invalid actions return null (chosen over throwing so callers - the
	bot, tests, and eventually a UI reducer - can use a single "did this work" check
	without try/catch).

	Court Decree math and card derivation live in decreeCalculator.js / tributeCardBuilder.js;
	this file only orchestrates match/round/turn flow and legality.
*/

import { buildCard, isRowEligible } from './tributeCardBuilder.js';
import { decreeContribution } from './decreeCalculator.js';
import { ROW, LEGAL_DECREE_ELEMENTS } from './tributeInterpretation.js';

export const ROWS = [ROW.CLOSE, ROW.MID, ROW.FAR];
export const DECK_SIZE = 12;
export const HAND_SIZE = 10;
export const MAX_MULLIGAN = 2;
export const ROUND_WINS_TO_TAKE_MATCH = 2;
export const COURT_FAVOR = 2; // tuned by simulation 2026-09-01: 1 left the starter at 44-49%, 2 lands 50-53%

// ---------------------------------------------------------------------------
// deterministic PRNG - mulberry32. Takes/returns a plain numeric state so it can live
// inside the (serializable) match state rather than as hidden generator closure state.
// ---------------------------------------------------------------------------

export function createRngState(seed) {
	// fold an arbitrary seed (number or string) down to a uint32
	let s;
	if (typeof seed === 'number') {
		s = seed >>> 0;
	} else {
		const str = String(seed);
		s = 0;
		for (let i = 0; i < str.length; i++) {
			s = (Math.imul(31, s) + str.charCodeAt(i)) >>> 0;
		}
	}
	return s >>> 0;
}

// returns { value, nextState } - value in [0, 1)
export function nextRandom(rngState) {
	let a = rngState >>> 0;
	a |= 0;
	a = (a + 0x6d2b79f5) | 0;
	let t = a;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	return { value, nextState: a >>> 0 };
}

function nextInt(rngState, maxExclusive) {
	const { value, nextState } = nextRandom(rngState);
	return { value: Math.floor(value * maxExclusive), nextState };
}

// Fisher-Yates using the match RNG; returns { array, nextState }
function shuffle(array, rngState) {
	const result = array.slice();
	let state = rngState;
	for (let i = result.length - 1; i > 0; i--) {
		const { value: j, nextState } = nextInt(state, i + 1);
		state = nextState;
		const tmp = result[i];
		result[i] = result[j];
		result[j] = tmp;
	}
	return { array: result, nextState: state };
}

// ---------------------------------------------------------------------------
// errors
// ---------------------------------------------------------------------------

export class TributeRuleError extends Error {
	constructor(code, message) {
		super(message || code);
		this.name = 'TributeRuleError';
		this.code = code;
	}
}

function otherPlayer(player) {
	return player === 'A' ? 'B' : 'A';
}

function emptyBoard() {
	return {
		[ROW.CLOSE]: { A: [], B: [] },
		[ROW.MID]: { A: [], B: [] },
		[ROW.FAR]: { A: [], B: [] },
	};
}

function emptyActiveDecrees() {
	return { [ROW.CLOSE]: null, [ROW.MID]: null, [ROW.FAR]: null };
}

// ---------------------------------------------------------------------------
// match setup
// ---------------------------------------------------------------------------

function validateDeckInput(deck, label) {
	if (!deck || !Array.isArray(deck.cards)) {
		throw new TributeRuleError('INVALID_DECK', `${label}: deck.cards must be an array`);
	}
	if (deck.cards.length !== DECK_SIZE) {
		throw new TributeRuleError('INVALID_DECK_SIZE', `${label}: deck must contain exactly ${DECK_SIZE} cards, got ${deck.cards.length}`);
	}
	if (!Array.isArray(deck.decrees) || deck.decrees.length !== 2) {
		throw new TributeRuleError('INVALID_DECREE_LOADOUT', `${label}: deck must register exactly 2 decrees`);
	}
	deck.decrees.forEach((el) => {
		if (!LEGAL_DECREE_ELEMENTS.includes(el)) {
			throw new TributeRuleError('ILLEGAL_DECREE', `${label}: "${el}" is not a legal decree element`);
		}
	});
}

function buildPlayerState(deck, rngState) {
	const cards = deck.cards.map((record) => buildCard(record));
	const { array: shuffled, nextState } = shuffle(cards, rngState);
	const hand = shuffled.slice(0, HAND_SIZE);
	const drawPile = shuffled.slice(HAND_SIZE);

	const decreesUsed = {};
	deck.decrees.forEach((el) => {
		decreesUsed[el] = false;
	});

	return {
		state: {
			hand,
			drawPile,
			discard: [],
			decrees: deck.decrees.slice(),
			decreesUsed,
			decreePlayedThisRound: false,
			passed: false,
			mulliganUsed: false,
			roundWins: 0,
			firstPasser: false, // tie-break bookkeeping, reset each round
		},
		nextRngState: nextState,
	};
}

/*
	createMatch({A: {cards, decrees}, B: {cards, decrees}}, seed)

	Validates exactly 12 cards per deck, seeds a deterministic PRNG, shuffles, draws 10
	each, picks a random starter. Returns the initial match state (phase 'mulligan').
*/
export function createMatch(deckA, deckB, seed) {
	validateDeckInput(deckA, 'deckA');
	validateDeckInput(deckB, 'deckB');

	let rngState = createRngState(seed);

	const builtA = buildPlayerState(deckA, rngState);
	rngState = builtA.nextRngState;
	const builtB = buildPlayerState(deckB, rngState);
	rngState = builtB.nextRngState;

	const { value: starterRoll, nextState: afterStarter } = nextInt(rngState, 2);
	rngState = afterStarter;
	const starter = starterRoll === 0 ? 'A' : 'B';

	return {
		seed,
		rngState,
		players: { A: builtA.state, B: builtB.state },
		board: emptyBoard(),
		activeDecrees: emptyActiveDecrees(),
		round: 1,
		starter,
		turn: starter,
		phase: 'mulligan',
		mulliganTurn: starter,
		winner: null,
		lastRoundResult: null,
	};
}

// ---------------------------------------------------------------------------
// mulligan
// ---------------------------------------------------------------------------

/*
	mulligan(state, player, cardIds) - up to 2 cards, once, before round 1. Both players
	must mulligan (or explicitly pass with []) before play begins; mulligan(state, player, [])
	still consumes that player's mulligan opportunity and advances the phase.
*/
export function mulligan(state, player, cardIds) {
	if (!state || state.phase !== 'mulligan') {
		return null;
	}
	if (state.round !== 1) {
		return null;
	}
	const p = state.players[player];
	if (!p || p.mulliganUsed) {
		return null;
	}
	const ids = Array.isArray(cardIds) ? cardIds : [];
	if (ids.length > MAX_MULLIGAN) {
		return null;
	}
	const uniqueIds = new Set(ids);
	if (uniqueIds.size !== ids.length) {
		return null;
	}
	const handIds = new Set(p.hand.map((c) => c.id));
	for (const id of uniqueIds) {
		if (!handIds.has(id)) {
			return null;
		}
	}

	let rngState = state.rngState;
	const keep = p.hand.filter((c) => !uniqueIds.has(c.id));
	const setAside = p.hand.filter((c) => uniqueIds.has(c.id));

	let newHand = keep;
	let newDrawPile = p.drawPile;
	if (setAside.length > 0) {
		const { array: shuffledDraw, nextState } = shuffle(newDrawPile.concat([]), rngState);
		rngState = nextState;
		const drawn = shuffledDraw.slice(0, setAside.length);
		const remainingDraw = shuffledDraw.slice(setAside.length);
		newHand = keep.concat(drawn);

		const { array: reshuffledSetAside, nextState: afterReshuffle } = shuffle(setAside, rngState);
		rngState = afterReshuffle;
		newDrawPile = remainingDraw.concat(reshuffledSetAside);
	}

	const nextPlayers = {
		...state.players,
		[player]: {
			...p,
			hand: newHand,
			drawPile: newDrawPile,
			mulliganUsed: true,
		},
	};

	let nextState = { ...state, players: nextPlayers, rngState };

	const bothDone = nextState.players.A.mulliganUsed && nextState.players.B.mulliganUsed;
	if (bothDone) {
		nextState = { ...nextState, phase: 'play', mulliganTurn: null };
		// round 2+'s start gets this same safety net from resolveRound's tail call; round 1's
		// start only happens here, so it needs its own call - otherwise a hand with no legal
		// action at all (e.g. every card row-illegal and no decree left, however unlikely with
		// a 10-card hand) would stall forever with nobody ever having explicitly passed.
		return autoPassIfNoLegalAction(nextState);
	}
	nextState = { ...nextState, mulliganTurn: otherPlayer(player) };

	return nextState;
}

// ---------------------------------------------------------------------------
// legality helpers
// ---------------------------------------------------------------------------

function findCardInHand(playerState, cardId) {
	return playerState.hand.find((c) => c.id === cardId) || null;
}

function isPlayersTurn(state, player) {
	return state.phase === 'play' && state.turn === player;
}

// a legal placement move exists for the row given the card's eligibility
function canPlayCard(card, row) {
	return isRowEligible(card, row);
}

export function hasLegalAction(state, player) {
	if (state.phase !== 'play') {
		return false;
	}
	const p = state.players[player];
	if (p.passed) {
		return false;
	}
	const canPlaceAny = p.hand.some((card) => ROWS.some((row) => canPlayCard(card, row)));
	if (canPlaceAny) {
		return true;
	}
	const canPlayDecree = !p.decreePlayedThisRound && p.decrees.some((el) => !p.decreesUsed[el]);
	if (canPlayDecree) {
		return true;
	}
	return false; // pass is always legal but doesn't count as an "action" that must be taken
}

// ---------------------------------------------------------------------------
// actions
// ---------------------------------------------------------------------------

export function playCreature(state, player, cardId, row) {
	if (!isPlayersTurn(state, player)) {
		return null;
	}
	if (!ROWS.includes(row)) {
		return null;
	}
	const p = state.players[player];
	if (p.passed) {
		return null;
	}
	const card = findCardInHand(p, cardId);
	if (!card) {
		return null;
	}
	if (!canPlayCard(card, row)) {
		return null;
	}

	const nextHand = p.hand.filter((c) => c.id !== cardId);
	const nextBoard = {
		...state.board,
		[row]: {
			...state.board[row],
			[player]: [...state.board[row][player], card],
		},
	};

	const nextPlayers = {
		...state.players,
		[player]: { ...p, hand: nextHand },
	};

	let nextState = { ...state, board: nextBoard, players: nextPlayers };
	return advanceTurn(nextState, player);
}

export function playDecree(state, player, decreeElement, row) {
	if (!isPlayersTurn(state, player)) {
		return null;
	}
	if (!ROWS.includes(row)) {
		return null;
	}
	const p = state.players[player];
	if (p.passed) {
		return null;
	}
	if (p.decreePlayedThisRound) {
		return null;
	}
	if (!p.decrees.includes(decreeElement)) {
		return null;
	}
	if (p.decreesUsed[decreeElement]) {
		return null;
	}

	const nextPlayers = {
		...state.players,
		[player]: {
			...p,
			decreesUsed: { ...p.decreesUsed, [decreeElement]: true },
			decreePlayedThisRound: true,
		},
	};

	const nextActiveDecrees = {
		...state.activeDecrees,
		[row]: { element: decreeElement, playedBy: player },
	};

	let nextState = { ...state, players: nextPlayers, activeDecrees: nextActiveDecrees };
	return advanceTurn(nextState, player);
}

export function pass(state, player) {
	if (!isPlayersTurn(state, player)) {
		return null;
	}
	const p = state.players[player];
	if (p.passed) {
		return null;
	}

	const anyPassedYet = state.players.A.passed || state.players.B.passed;
	const nextPlayers = {
		...state.players,
		[player]: { ...p, passed: true, firstPasser: !anyPassedYet ? true : p.firstPasser },
	};

	let nextState = { ...state, players: nextPlayers };

	const bothPassed = nextState.players.A.passed && nextState.players.B.passed;
	if (bothPassed) {
		return resolveRound(nextState);
	}
	return advanceTurn(nextState, player);
}

// moves the turn marker to the other player, skipping a passed player, and auto-passing a
// player with no legal action. Also handles the both-passed resolution that can cascade
// from an auto-pass.
function advanceTurn(state, actingPlayer) {
	let next = otherPlayer(actingPlayer);
	let s = { ...state, turn: next };

	// if the next player already passed, it's actually still the acting player's turn
	// again UNLESS both have passed (handled by callers of pass()) - so hop over them.
	if (s.players[next].passed) {
		const other = otherPlayer(next);
		if (s.players[other].passed) {
			// both passed - shouldn't normally reach here since pass() resolves directly,
			// but guard for safety when playCreature/playDecree is the second-to-pass action
			return resolveRound(s);
		}
		s = { ...s, turn: other };
	}

	// auto-pass a player with no legal action
	s = autoPassIfNoLegalAction(s);
	return s;
}

function autoPassIfNoLegalAction(state) {
	let s = state;
	// guard against infinite loop: at most 2 players to check
	for (let i = 0; i < 2; i++) {
		if (s.phase !== 'play') {
			return s;
		}
		const current = s.turn;
		const p = s.players[current];
		if (p.passed) {
			return s;
		}
		if (hasLegalAction(s, current)) {
			return s;
		}
		// force-pass without going through pass()'s legality gate (that gate only checks
		// isPlayersTurn/not-already-passed, both satisfied here)
		const anyPassedYet = s.players.A.passed || s.players.B.passed;
		const nextPlayers = {
			...s.players,
			[current]: { ...p, passed: true, firstPasser: !anyPassedYet ? true : p.firstPasser },
		};
		s = { ...s, players: nextPlayers };
		const bothPassed = s.players.A.passed && s.players.B.passed;
		if (bothPassed) {
			return resolveRound(s);
		}
		s = { ...s, turn: otherPlayer(current) };
	}
	return s;
}

// ---------------------------------------------------------------------------
// round resolution
// ---------------------------------------------------------------------------

function rowTotalForPlayer(state, row, player) {
	const decree = state.activeDecrees[row];
	const cards = state.board[row][player];
	let total = 0;
	cards.forEach((card) => {
		const printed = card.powerByRow[row];
		const decreeElement = decree ? decree.element : null;
		total += decreeContribution(printed, decreeElement, card.element);
	});
	return total;
}

function totalScoreForPlayer(state, player) {
	let total = 0;
	ROWS.forEach((row) => {
		total += rowTotalForPlayer(state, row, player);
	});
	if (state.starter === player) {
		total += COURT_FAVOR;
	}
	return total;
}

function cardsRemaining(state, player) {
	return state.players[player].hand.length;
}

/*
	Tie-break order per the design doc: more cards remaining in hand, then first passer,
	then non-starter.
*/
function breakTie(state) {
	const remainingA = cardsRemaining(state, 'A');
	const remainingB = cardsRemaining(state, 'B');
	if (remainingA !== remainingB) {
		return remainingA > remainingB ? 'A' : 'B';
	}

	const firstPasserA = state.players.A.firstPasser;
	const firstPasserB = state.players.B.firstPasser;
	if (firstPasserA !== firstPasserB) {
		return firstPasserA ? 'A' : 'B';
	}

	return state.starter === 'A' ? 'B' : 'A';
}

function resolveRound(state) {
	const scoreA = totalScoreForPlayer(state, 'A');
	const scoreB = totalScoreForPlayer(state, 'B');

	let roundWinner;
	if (scoreA > scoreB) {
		roundWinner = 'A';
	} else if (scoreB > scoreA) {
		roundWinner = 'B';
	} else {
		roundWinner = breakTie(state);
	}

	const lastRoundResult = {
		round: state.round,
		scores: { A: scoreA, B: scoreB },
		winner: roundWinner,
		tie: scoreA === scoreB,
	};

	// discard permanence: played creatures never return this match
	const discardA = state.players.A.discard.concat(ROWS.flatMap((row) => state.board[row].A));
	const discardB = state.players.B.discard.concat(ROWS.flatMap((row) => state.board[row].B));

	const roundWinsA = state.players.A.roundWins + (roundWinner === 'A' ? 1 : 0);
	const roundWinsB = state.players.B.roundWins + (roundWinner === 'B' ? 1 : 0);

	const matchOver = roundWinsA >= ROUND_WINS_TO_TAKE_MATCH || roundWinsB >= ROUND_WINS_TO_TAKE_MATCH;

	const nextStarter = otherPlayer(state.starter);

	const nextPlayers = {
		A: {
			...state.players.A,
			discard: discardA,
			decreePlayedThisRound: false,
			passed: false,
			firstPasser: false,
			roundWins: roundWinsA,
		},
		B: {
			...state.players.B,
			discard: discardB,
			decreePlayedThisRound: false,
			passed: false,
			firstPasser: false,
			roundWins: roundWinsB,
		},
	};

	let nextState = {
		...state,
		players: nextPlayers,
		board: emptyBoard(),
		activeDecrees: emptyActiveDecrees(),
		lastRoundResult,
	};

	if (matchOver) {
		const matchWinner = roundWinsA > roundWinsB ? 'A' : 'B';
		nextState = { ...nextState, phase: 'matchEnd', winner: matchWinner, turn: null };
		return nextState;
	}

	nextState = {
		...nextState,
		round: state.round + 1,
		starter: nextStarter,
		turn: nextStarter,
		phase: 'play',
	};

	return autoPassIfNoLegalAction(nextState);
}

// ---------------------------------------------------------------------------
// public state selector
// ---------------------------------------------------------------------------

/*
	getPublicState(state, player) - hides the opponent's hand and draw pile (shows only
	counts), shows all board state, discards, decree loadouts and usage.
*/
export function getPublicState(state, player) {
	const opponent = otherPlayer(player);

	function viewOf(who, isSelf) {
		const p = state.players[who];
		const base = {
			discard: p.discard,
			decrees: p.decrees,
			decreesUsed: { ...p.decreesUsed },
			decreePlayedThisRound: p.decreePlayedThisRound,
			passed: p.passed,
			mulliganUsed: p.mulliganUsed,
			roundWins: p.roundWins,
			handCount: p.hand.length,
			drawPileCount: p.drawPile.length,
		};
		if (isSelf) {
			return { ...base, hand: p.hand, drawPile: p.drawPile };
		}
		return base;
	}

	return {
		// the seed is deliberately absent: with it a client could replay the shuffle
		round: state.round,
		starter: state.starter,
		turn: state.turn,
		phase: state.phase,
		mulliganTurn: state.mulliganTurn,
		winner: state.winner,
		board: state.board,
		activeDecrees: state.activeDecrees,
		lastRoundResult: state.lastRoundResult,
		you: player,
		opponent,
		players: {
			[player]: viewOf(player, true),
			[opponent]: viewOf(opponent, false),
		},
	};
}
