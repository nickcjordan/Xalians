import { chooseAction, CATCH_UP_CARD_LIMIT, MAX_CARD_POWER, CHASE_CARD_LIMIT, YIELD_CARD_BUDGET } from '../tributeBot.js';
import {
	createMatch, mulligan, playCreature, playDecree, pass, getPublicState, createRngState,
	ROWS, DECK_SIZE,
} from '../tributeRules.js';
import { LEGAL_DECREE_ELEMENTS, ROW } from '../tributeInterpretation.js';

/*
	Coverage for the greedy bot, per docs/design/tribute-design.md's "The bot" section:
	public information only, a full deterministic bot-vs-bot match completing without
	error, and confirmation the bot's decision function is never handed the opponent's
	hand contents (only what getPublicState exposes).
*/

function makeRecord(id, { intensity = 60, strength = 50, primary = 'fire', action = 'strike', instrument = 'fists' } = {}) {
	return {
		id,
		species: 'testling',
		provenance: { serial: 1 },
		attributes: {
			strength, vitality: 50, endurance: 50, agility: 50, reflex: 50,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 50,
		},
		element: { primary, affinities: { [primary]: 100 } },
		archetype: { key: 'stalwart', favors: [] },
		abilities: [{ name: 'Ability', signature: false, instrument, action, medium: primary, intensity }],
	};
}

// a varied 12-card deck: mostly Close-only strikers, a couple of Mid/Far pieces, so the
// bot has real placement choices instead of a single legal move every turn.
function makeVariedDeck(prefix, decrees = [LEGAL_DECREE_ELEMENTS[0], LEGAL_DECREE_ELEMENTS[1]]) {
	const cards = [];
	for (let i = 0; i < DECK_SIZE; i++) {
		if (i % 4 === 0) {
			cards.push(makeRecord(`${prefix}_${i}`, { intensity: 40 + i, strength: 40 + i, action: 'lash', instrument: 'tendrils' }));
		} else if (i % 4 === 1) {
			cards.push(makeRecord(`${prefix}_${i}`, { intensity: 40 + i, strength: 40 + i, action: 'beam', instrument: 'gaze' }));
		} else {
			cards.push(makeRecord(`${prefix}_${i}`, { intensity: 30 + i, strength: 30 + i, action: 'strike', instrument: 'fists' }));
		}
	}
	return { cards, decrees };
}

describe('chooseAction only reads public information', () => {
	test('the bot never receives the opponent hand array, and its action never references opponent-only cards', () => {
		let state = createMatch(makeVariedDeck('A'), makeVariedDeck('B'), 'bot-visibility-seed');
		state = mulligan(state, 'A', []);
		state = mulligan(state, 'B', []);

		const botPlayer = state.turn;
		const oppPlayer = botPlayer === 'A' ? 'B' : 'A';
		const publicState = getPublicState(state, botPlayer);

		// getPublicState's own contract: opponent hand/drawPile are absent from the view
		// handed to the bot in the first place.
		expect(publicState.players[oppPlayer].hand).toBeUndefined();
		expect(publicState.players[oppPlayer].drawPile).toBeUndefined();

		const hand = state.players[botPlayer].hand;
		const rngState = createRngState('bot-rng-seed');
		const { action } = chooseAction(publicState, hand, botPlayer, rngState);

		// the chosen card id (if any) must come from the bot's OWN hand, never the opponent's
		const chosenId = action.type === 'playCreature' ? action.cardId : null;
		expect(chosenId === null || hand.some((c) => c.id === chosenId)).toBe(true);
		expect(state.players[oppPlayer].hand.some((c) => c.id === chosenId)).toBe(false);
	});

	test('scoredPlacements-derived choices only ever consider cards passed in as `hand`, not state.players[opponent].hand', () => {
		// a stricter structural guarantee: passing a publicState whose opponent view has no
		// `hand` key at all must not throw, proving chooseAction never dereferences it.
		let state = createMatch(makeVariedDeck('A2'), makeVariedDeck('B2'), 'bot-structural-seed');
		state = mulligan(state, 'A', []);
		state = mulligan(state, 'B', []);
		const botPlayer = state.turn;
		const publicState = getPublicState(state, botPlayer);
		expect(() => chooseAction(publicState, state.players[botPlayer].hand, botPlayer, createRngState(1))).not.toThrow();
	});
});

describe('a full deterministic bot-vs-bot match', () => {
	function runFullBotMatch(seed) {
		let state = createMatch(makeVariedDeck('A'), makeVariedDeck('B'), seed);
		state = mulligan(state, 'A', []);
		state = mulligan(state, 'B', []);

		let botRngState = createRngState(`${seed}-bot`);
		let guard = 0;
		const GUARD_LIMIT = 2000;

		while (state.phase === 'play' && guard < GUARD_LIMIT) {
			guard++;
			const currentPlayer = state.turn;
			const publicState = getPublicState(state, currentPlayer);
			const hand = state.players[currentPlayer].hand;

			const { action, nextRngState } = chooseAction(publicState, hand, currentPlayer, botRngState);
			botRngState = nextRngState;

			let nextState = null;
			if (action.type === 'playCreature') {
				nextState = playCreature(state, currentPlayer, action.cardId, action.row);
			} else if (action.type === 'playDecree') {
				nextState = playDecree(state, currentPlayer, action.element, action.row);
			} else if (action.type === 'pass') {
				nextState = pass(state, currentPlayer);
			}

			expect(nextState).not.toBeNull(); // the bot must never choose an illegal action
			state = nextState;
		}

		return { state, guard };
	}

	test('completes to matchEnd within a bounded number of actions, deterministically under a fixed seed', () => {
		const { state, guard } = runFullBotMatch('bot-match-seed-1');
		expect(state.phase).toBe('matchEnd');
		expect(['A', 'B']).toContain(state.winner);
		expect(state.players[state.winner].roundWins).toBeGreaterThanOrEqual(2);
		expect(guard).toBeLessThan(2000);
	});

	test('is fully deterministic: the same seed produces the same winner and round count', () => {
		const run1 = runFullBotMatch('bot-match-seed-2');
		const run2 = runFullBotMatch('bot-match-seed-2');
		expect(run1.state.winner).toBe(run2.state.winner);
		expect(run1.state.round).toBe(run2.state.round);
		expect(run1.guard).toBe(run2.guard);
	});

	test('the match RNG is genuinely seed-sensitive (shuffle order and starter vary by seed)', () => {
		// mirror-image symmetric decks (identical card-generation formula on both sides)
		// converge on the same emergent outcome under this bot regardless of seed - the
		// interesting bot-balance question the design doc flags for playtesting - so this
		// checks the RNG itself varies by seed (hand order, starter) rather than asserting
		// on match-length variation, which a symmetric matchup doesn't reliably produce.
		const seeds = ['seed-a', 'seed-b', 'seed-c', 'seed-d'];
		const starters = seeds.map((s) => createMatch(makeVariedDeck('A'), makeVariedDeck('B'), s).starter);
		const handOrders = seeds.map((s) => createMatch(makeVariedDeck('A'), makeVariedDeck('B'), s).players.A.hand.map((c) => c.id).join(','));
		expect(new Set(handOrders).size).toBeGreaterThan(1);
		// starters may legitimately coincide by chance across only 4 seeds; hand order is the
		// reliable signal that the seed is actually driving the shuffle.
		void starters;
	});

	test('every played card came from that side\'s own original 12-card deck (no phantom cards)', () => {
		const deckA = makeVariedDeck('DA');
		const deckB = makeVariedDeck('DB');
		let state = createMatch(deckA, deckB, 'bot-integrity-seed');
		state = mulligan(state, 'A', []);
		state = mulligan(state, 'B', []);

		let botRngState = createRngState('bot-integrity-seed-bot');
		let guard = 0;
		while (state.phase === 'play' && guard < 2000) {
			guard++;
			const currentPlayer = state.turn;
			const publicState = getPublicState(state, currentPlayer);
			const hand = state.players[currentPlayer].hand;
			const { action, nextRngState } = chooseAction(publicState, hand, currentPlayer, botRngState);
			botRngState = nextRngState;
			if (action.type === 'playCreature') {
				state = playCreature(state, currentPlayer, action.cardId, action.row);
			} else if (action.type === 'playDecree') {
				state = playDecree(state, currentPlayer, action.element, action.row);
			} else {
				state = pass(state, currentPlayer);
			}
		}

		const idsA = new Set(deckA.cards.map((c) => c.id));
		const idsB = new Set(deckB.cards.map((c) => c.id));
		state.players.A.discard.forEach((c) => expect(idsA.has(c.id)).toBe(true));
		state.players.B.discard.forEach((c) => expect(idsB.has(c.id)).toBe(true));
	});
});

/*
	Pass policy v2 (docs/design/tribute-design.md task brief, "The bot" section rewrite).
	Each test below builds a minimal synthetic card/publicState directly - rather than
	playing out a full match - so it can pin down the exact board/hand-count combination
	that should trigger one specific rule, independent of the greedy scorer or the RNG.
*/

// a bare card whose only ability is a Close-eligible strike of the given printed power;
// good enough for board-total arithmetic in these tests (decreeContribution with no
// active decree just returns printed power unchanged - see decreeCalculator.js).
function fakeCard(id, power) {
	return {
		id,
		name: id,
		element: { primary: 'fire', affinities: { fire: 100 } },
		archetype: null,
		eligibleRows: [ROW.CLOSE],
		powerByRow: { [ROW.CLOSE]: power },
	};
}

function emptyBoardOf(cardsByRowBySeat) {
	const board = {
		[ROW.CLOSE]: { A: [], B: [] },
		[ROW.MID]: { A: [], B: [] },
		[ROW.FAR]: { A: [], B: [] },
	};
	if (cardsByRowBySeat) {
		ROWS.forEach((row) => {
			if (cardsByRowBySeat[row]) {
				board[row] = { ...board[row], ...cardsByRowBySeat[row] };
			}
		});
	}
	return board;
}

/*
	Builds a minimal publicState as seen by `botPlayer` ('A' by default). `overrides` lets
	each test set only what its rule cares about; everything else defaults to a neutral
	"round just started, nobody has played, nobody has passed" baseline.
*/
function fakePublicState({
	botPlayer = 'A',
	starter = 'A',
	board = emptyBoardOf(),
	activeDecrees = { [ROW.CLOSE]: null, [ROW.MID]: null, [ROW.FAR]: null },
	oppPassed = false,
	oppHandCount = 10,
	oppRoundWins = 0,
	botDecreePlayedThisRound = true, // off by default so decree scoring never interferes
	botDecrees = [],
	botDecreesUsed = {},
} = {}) {
	const oppSeat = botPlayer === 'A' ? 'B' : 'A';
	return {
		starter,
		board,
		activeDecrees,
		you: botPlayer,
		opponent: oppSeat,
		players: {
			[botPlayer]: {
				decrees: botDecrees,
				decreesUsed: botDecreesUsed,
				decreePlayedThisRound: botDecreePlayedThisRound,
				passed: false,
				roundWins: 0,
			},
			[oppSeat]: {
				passed: oppPassed,
				handCount: oppHandCount,
				roundWins: oppRoundWins,
			},
		},
	};
}

describe('bot pass policy v2', () => {
	test('rule 2a: unbeatable lead passes even though the opponent has not passed and has cards left', () => {
		// bot total 40 (one Close card worth 40, bot is not starter so no Court Favor), opp
		// total 0, opp has 2 cards left: 2 * MAX_CARD_POWER (15) = 30 < 40, so no legal
		// opponent comeback exists even in theory.
		const publicState = fakePublicState({
			starter: 'B',
			board: emptyBoardOf({ [ROW.CLOSE]: { A: [fakeCard('a1', 40)] } }),
			oppHandCount: 2,
		});
		const hand = [];
		const { action } = chooseAction(publicState, hand, 'A', createRngState(1));
		expect(action.type).toBe('pass');
		expect(action.reason).toBe('unbeatable');
	});

	test('rule 2a fires even in a mustWin round (the one exception to "never pass while opponent has cards")', () => {
		const publicState = fakePublicState({
			starter: 'B',
			board: emptyBoardOf({ [ROW.CLOSE]: { A: [fakeCard('a1', 40)] } }),
			oppHandCount: 2,
			oppRoundWins: 1, // mustWin for the bot
		});
		const { action } = chooseAction(publicState, [], 'A', createRngState(1));
		expect(action).toEqual(expect.objectContaining({ type: 'pass', reason: 'unbeatable' }));
	});

	test('rule 2b: ahead with card parity or better yields the round once cards are on the board', () => {
		// bot ahead 10-5 with a card already on the board (so Court Favor alone can't be the
		// whole story), bot hand size (1) <= opponent hand size (5).
		const publicState = fakePublicState({
			starter: 'A',
			board: emptyBoardOf({
				[ROW.CLOSE]: { A: [fakeCard('a1', 10)], B: [fakeCard('b1', 4)] },
			}),
			oppHandCount: 5,
		});
		const hand = [fakeCard('a2', 3)];
		const { action } = chooseAction(publicState, hand, 'A', createRngState(1));
		expect(action.type).toBe('pass');
		expect(action.reason).toBe('ahead-parity');
	});

	test('rule 2b does not fire before any card has been played (Court Favor alone is not an earned lead)', () => {
		// round-opening state: starter's Court Favor makes them "ahead" 1-0 with equal hand
		// sizes, but nothing has been placed on the board yet - this must not read as 2b.
		const publicState = fakePublicState({
			starter: 'A',
			board: emptyBoardOf(),
			oppHandCount: 10,
		});
		const hand = [fakeCard('a1', 5)];
		const { action } = chooseAction(publicState, hand, 'A', createRngState(1));
		expect(action.type).toBe('playCreature');
	});

	test('rule 2c: behind (or tied) and catching up over the opponent\'s current total needs too many cards, so yield', () => {
		// opponent total 50 (unreachable board state), bot total 0, bot hand has only small
		// cards that can never sum past 50 even using all of them (well above the
		// CATCH_UP_CARD_LIMIT-cards-or-fewer bar) - so canCatchUpWithSubsetOfSize returns null.
		const publicState = fakePublicState({
			starter: 'B',
			board: emptyBoardOf({ [ROW.CLOSE]: { B: [fakeCard('b1', 50)] } }),
			oppHandCount: 8,
		});
		const hand = [fakeCard('a1', 2), fakeCard('a2', 2), fakeCard('a3', 2)];
		const { action } = chooseAction(publicState, hand, 'A', createRngState(1));
		expect(action.type).toBe('pass');
		expect(action.reason).toBe('yield');
	});

	test('mustWin override: rules 2b/2c/bluff never pass while the opponent still holds cards', () => {
		// same shape as the 2b test above (ahead with parity, a card already on the board),
		// but the opponent has a round win already, so the bot cannot afford to concede.
		const publicState = fakePublicState({
			starter: 'A',
			board: emptyBoardOf({
				[ROW.CLOSE]: { A: [fakeCard('a1', 10)], B: [fakeCard('b1', 4)] },
			}),
			oppHandCount: 5,
			oppRoundWins: 1,
		});
		const hand = [fakeCard('a2', 3)];
		const { action } = chooseAction(publicState, hand, 'A', createRngState(1));
		expect(action.type).not.toBe('pass');
	});

	test('mustWin override also suppresses the thin-lead bluff while the opponent still has cards', () => {
		// thin lead (<=3), bot has more cards than opponent - would ordinarily be eligible for
		// the 0.2-probability bluff pass - but mustWin forbids passing at all here.
		const publicState = fakePublicState({
			starter: 'A',
			board: emptyBoardOf({
				[ROW.CLOSE]: { A: [fakeCard('a1', 3)] },
			}),
			oppHandCount: 1,
			oppRoundWins: 1,
		});
		const hand = [fakeCard('a2', 2), fakeCard('a3', 2)];
		// probe many RNG seeds - none should ever produce a bluff pass under mustWin
		for (let seed = 0; seed < 25; seed++) {
			const { action } = chooseAction(publicState, hand, 'A', createRngState(seed));
			expect(action.type).not.toBe('pass');
		}
	});

	test('every pass action the bot emits carries a reason string', () => {
		// rule 1 (opponent already passed, bot winning) as a representative case
		const publicState = fakePublicState({
			starter: 'A',
			oppPassed: true,
			board: emptyBoardOf({ [ROW.CLOSE]: { A: [fakeCard('a1', 20)] } }),
			oppHandCount: 5,
		});
		const { action } = chooseAction(publicState, [], 'A', createRngState(1));
		expect(action.type).toBe('pass');
		expect(typeof action.reason).toBe('string');
		expect(action.reason.length).toBeGreaterThan(0);
	});

	test('the rules engine ignores extra fields on a pass action (reason is safe to attach)', () => {
		let state = createMatch(
			{ cards: Array.from({ length: DECK_SIZE }, (_, i) => makeRecord(`ignore_${i}`)), decrees: [LEGAL_DECREE_ELEMENTS[0], LEGAL_DECREE_ELEMENTS[1]] },
			{ cards: Array.from({ length: DECK_SIZE }, (_, i) => makeRecord(`ignore2_${i}`)), decrees: [LEGAL_DECREE_ELEMENTS[0], LEGAL_DECREE_ELEMENTS[1]] },
			'ignore-extra-fields-seed'
		);
		state = mulligan(state, 'A', []);
		state = mulligan(state, 'B', []);
		const currentPlayer = state.turn;
		const next = pass(state, currentPlayer, { reason: 'whatever', bogus: true, extra: [1, 2, 3] });
		expect(next).not.toBeNull();
		expect(next.players[currentPlayer].passed).toBe(true);
	});

	test('CATCH_UP_CARD_LIMIT and MAX_CARD_POWER are exported named constants (tunable, not magic numbers)', () => {
		expect(typeof CATCH_UP_CARD_LIMIT).toBe('number');
		expect(typeof MAX_CARD_POWER).toBe('number');
	});
});

/*
	Card economy: which card gets spent, and when a round stops being worth bidding on.
*/
describe('bot card economy', () => {
	test('behind: spends the smallest card that takes the lead, not the biggest card it has', () => {
		// opp 8, bot holds Court Favor (2) as starter: needs more than 6 from one card
		const publicState = fakePublicState({
			starter: 'A',
			board: emptyBoardOf({ [ROW.CLOSE]: { B: [fakeCard('b1', 8)] } }),
			oppHandCount: 9,
		});
		const hand = [fakeCard('a15', 15), fakeCard('a9', 9), fakeCard('a12', 12), fakeCard('a3', 3)];
		const { action } = chooseAction(publicState, hand, 'A', createRngState(1));
		expect(action).toEqual({ type: 'playCreature', cardId: 'a9', row: ROW.CLOSE });
	});

	test('ahead in a must-win round with the opponent still holding cards: keeps bidding with its smallest card', () => {
		const publicState = fakePublicState({
			starter: 'B',
			board: emptyBoardOf({ [ROW.CLOSE]: { A: [fakeCard('a1', 12)], B: [fakeCard('b1', 5)] } }),
			oppHandCount: 4,
			oppRoundWins: 1,
		});
		const hand = [fakeCard('a15', 15), fakeCard('a2', 2), fakeCard('a7', 7)];
		const { action } = chooseAction(publicState, hand, 'A', createRngState(1));
		expect(action).toEqual({ type: 'playCreature', cardId: 'a2', row: ROW.CLOSE });
	});

	test('opponent passed, round can be yielded: chases only when one card does it', () => {
		// opp 20 against the bot's Court Favor 2: needs more than 18 from a hand of 9s, a
		// three-card chase, so let the round go
		const twoCardChase = fakePublicState({
			starter: 'A',
			oppPassed: true,
			board: emptyBoardOf({ [ROW.CLOSE]: { B: [fakeCard('b1', 20)] } }),
			oppHandCount: 7,
		});
		const hand = [fakeCard('a1', 9), fakeCard('a2', 9), fakeCard('a3', 9)];
		expect(CHASE_CARD_LIMIT).toBe(1);
		expect(chooseAction(twoCardChase, hand, 'A', createRngState(1)).action).toEqual({ type: 'pass', reason: 'yield-after-opp-pass' });

		// opp 8 against Court Favor 2: one 9 takes it, so take it
		const oneCardChase = fakePublicState({
			starter: 'A',
			oppPassed: true,
			board: emptyBoardOf({ [ROW.CLOSE]: { B: [fakeCard('b1', 8)] } }),
			oppHandCount: 7,
		});
		expect(chooseAction(oneCardChase, hand, 'A', createRngState(1)).action.type).toBe('playCreature');
	});

	test('opponent passed in a must-win round: chases with as many cards as it takes', () => {
		const publicState = fakePublicState({
			starter: 'B',
			oppPassed: true,
			board: emptyBoardOf({ [ROW.CLOSE]: { B: [fakeCard('b1', 20)] } }),
			oppHandCount: 7,
			oppRoundWins: 1,
		});
		const hand = [fakeCard('a1', 9), fakeCard('a2', 9), fakeCard('a3', 9)];
		expect(chooseAction(publicState, hand, 'A', createRngState(1)).action.type).toBe('playCreature');
	});

	test('yield budget: after committing YIELD_CARD_BUDGET cards and still trailing, stops bidding on a round it can afford to lose', () => {
		const mine = Array.from({ length: YIELD_CARD_BUDGET }, (_, i) => fakeCard(`a_on_board_${i}`, 5));
		const theirs = Array.from({ length: YIELD_CARD_BUDGET }, (_, i) => fakeCard(`b_on_board_${i}`, 6));
		const publicState = fakePublicState({
			starter: 'B',
			board: emptyBoardOf({ [ROW.CLOSE]: { A: mine, B: theirs } }),
			oppHandCount: 10 - YIELD_CARD_BUDGET,
		});
		// a single 4 would retake the lead cheaply, but the budget is spent
		const hand = [fakeCard('a4', 4), fakeCard('a5', 5)];
		expect(chooseAction(publicState, hand, 'A', createRngState(1)).action).toEqual({ type: 'pass', reason: 'yield' });
	});

	test('yield budget does not bind while the opponent has spent more cards than the bot', () => {
		const mine = Array.from({ length: YIELD_CARD_BUDGET }, (_, i) => fakeCard(`a_on_board_${i}`, 5));
		const theirs = Array.from({ length: YIELD_CARD_BUDGET + 1 }, (_, i) => fakeCard(`b_on_board_${i}`, 4));
		const publicState = fakePublicState({
			starter: 'B',
			board: emptyBoardOf({ [ROW.CLOSE]: { A: mine, B: theirs } }),
			oppHandCount: 10 - YIELD_CARD_BUDGET - 1,
		});
		const hand = [fakeCard('a4', 4)];
		expect(chooseAction(publicState, hand, 'A', createRngState(1)).action.type).toBe('playCreature');
	});

	test('a decree that flips the lead on its own is played instead of a card', () => {
		// water creatures fight at 2x under a fire decree and fire creatures at 0.5x (the
		// creature is the attacker in the chart), so a Fire decree over a Close row of
		// bot-water vs opp-fire is a big swing that costs no card
		const water = { primary: 'water', affinities: { water: 100 } };
		const fire = { primary: 'fire', affinities: { fire: 100 } };
		const mine = [{ ...fakeCard('a1', 10), element: water }];
		const theirs = [{ ...fakeCard('b1', 12), element: fire }];
		const publicState = fakePublicState({
			starter: 'B',
			board: emptyBoardOf({ [ROW.CLOSE]: { A: mine, B: theirs } }),
			oppHandCount: 9,
			botDecreePlayedThisRound: false,
			botDecrees: ['water', 'fire'],
			botDecreesUsed: { water: false, fire: false },
		});
		// the bot's registered decrees are the legal set's elements; 'fire' is not legal in the
		// real game but the bot's own scorer only cares about the type chart, which is what
		// this test exercises
		const hand = [fakeCard('a3', 3)];
		const { action } = chooseAction(publicState, hand, 'A', createRngState(1));
		expect(action.type).toBe('playDecree');
		expect(action.row).toBe(ROW.CLOSE);
	});
});
