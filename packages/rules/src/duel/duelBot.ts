/*
	Duel bot: a hand-written heuristic scorer (see duelActionBuilder.ts) wrapped as a
	boardgame.io move list. The original file imported MCTSBot/Step from
	'boardgame.io/ai' but never referenced either binding, so that import (and the
	boardgame.io dependency it would have pulled into this package) is dropped here;
	the actual MCTSBot wiring lives in apps/web's DuelBotInstance component.
*/

import * as duelUtil from './boardUtil.ts';
import * as duelCalculator from './duelCalculator.ts';
import * as actionBuilder from './duelActionBuilder.ts';
import * as duelConstants from './duelGameConstants.ts';
import * as boardStateManager from './boardStateManager.ts';
import type { BoardState, DuelCtx, ScoredAction } from './types.ts';

interface BotMove {
	move: string;
	args: unknown[];
}

function actionTypeToMoveNameMap(): Record<string, string> {
	let map: Record<string, string> = {};
	map[duelConstants.actionTypes.ATTACK] = 'doAttack';
	map[duelConstants.actionTypes.MOVE] = 'movePiece';

	/*
		my theory here is that if the bot knows that moving to the position then attacking is the best combo,
		then surely moving to the position then allowing the bot to select another action will end in the same result
	*/
	map[duelConstants.actionTypes.COMBO] = 'movePiece';
	return map;
}

export function buildSetupBotMoves(G: BoardState, ctx: DuelCtx, id: string): BotMove[] {
	let moves: BotMove[] = [];
	let movable = duelUtil.getOpponentStartingIndices(G);
	movable.forEach((i) => {
		if (G.cells[i] == null) {
			moves.push({ move: 'setPiece', args: [i, id] });
		}
	});
	return moves;
}

export function getBestBotActionsForXalianIds(G: BoardState, ctx: DuelCtx, ids: string[]): BotMove[] | undefined {
	let allActions: ScoredAction[] = [];

	ids.forEach((id) => {
		let pieceActions = getBestBotActionsForXalian(G, ctx, id);
		allActions = allActions.concat(pieceActions);
	});

	allActions = allActions.filter((action) => action != null);
	sortActions(allActions);

	let best = allActions[0];
	if (best && best.xalian) {
		console.log(`BEST MOVE: [${ctx.turn}:${ctx.numMoves}] ${best.xalian.species.name} ${best.type} {${best.score}} :: ${best.path.startIndex} -> ${best.path.endIndex}  [${JSON.stringify(best.path ? best.path.path : {})}] :: ${best.description}`);
	}

	let botMoves: BotMove[] = [];
	allActions.forEach((action) => {
		botMoves.push(buildBotMove(action));
	});

	if (botMoves && botMoves.length > 0) {
		return [botMoves[0]];
	} else {
		console.error(`NO ACTIONS BUILT FOR ANY BOT :: ${JSON.stringify(ids)}`);
	}
}

export function getBestBotActionsForXalian(G: BoardState, ctx: DuelCtx, id: string): ScoredAction[] {
	let attacker = duelUtil.getXalianFromId(id, G);
	let currentIndex = duelUtil.getIndexOfXalian(id, G);

	let allActions: ScoredAction[] = [];

	if (!attacker || currentIndex == null) {
		return [];
	}

	let details = G.currentTurnDetails || boardStateManager.currentTurnState(G, ctx);

	if (ctx.phase === 'play') {
		// get all paths within move range
		let allPaths = (details.hasMoved && details.remainingSpacesToMove === 0) ? []
			: duelCalculator.calculateMovablePaths(currentIndex, attacker, G, ctx, true);

		// score moves based on how advantageous
		let moveActions = (details.hasMoved && details.remainingSpacesToMove === 0) ? []
			: actionBuilder.buildMoveActionsWithScore(currentIndex, attacker, allPaths, G, ctx);

		// find moves that allow for attacks in second part of move and score them
		let comboActions = ((details.hasMoved && details.remainingSpacesToMove === 0) || details.hasAttacked) ? []
			: actionBuilder.buildComboActionsWithScore(currentIndex, attacker, allPaths, G, ctx);

		// score attack actions
		let attackActions = details.hasAttacked ? []
			: actionBuilder.buildAttackActionsWithScore(currentIndex, attacker, G, ctx);

		allActions = allActions.concat(moveActions).concat(attackActions).concat(comboActions);

		sortActions(allActions);

		if (allActions.length === 0) {
			return [];
		}
	}

	allActions.forEach((action) => {
		action.xalian = attacker;
	});
	return allActions.slice(0, Math.min(5, allActions.length));
}

function sortActions(allActions: ScoredAction[]): void {
	allActions.sort((a, b) => {
		if (a.type === duelConstants.actionTypes.COMBO || b.type === duelConstants.actionTypes.COMBO) {
			if (a.type === duelConstants.actionTypes.COMBO) { // 'a' is combo :: determining how to accurately and fairly compare to 'b'
				if (b.type === duelConstants.actionTypes.COMBO) { // both combos :: compare equally
					return a.score > b.score ? -1 : a.score < b.score ? 1 : 0;
				} else { // 'b' is attack or move :: compare 'a' combo's attack score against 'b'
					// although 'b' may be move, compare combo 'a' attack score
					// the thinking here:
					//      - the attack will still be compared to other attack for the best one, so this will only be picked if it is the best attack
					//      - if this is the best attack, it will always be worth it unless an edge case:
					//            -- if the mover is holding the flag and moving towards goal :: still should be accounted for with move action bonuses
					let aAttackScore = a.attackAction ? a.attackAction.score : a.score;
					return aAttackScore > b.score ? -1 : aAttackScore < b.score ? 1 : 0;
				}
			} else { // 'b' is combo :: determining how to accurately and fairly compare to 'a'
				let bAttackScore = b.attackAction ? b.attackAction.score : b.score;
				return a.score > bAttackScore ? -1 : a.score < bAttackScore ? 1 : 0;
			}
		} else { // neither are combos :: compare equally
			return a.score > b.score ? -1 : a.score < b.score ? 1 : 0;
		}
	});
}

function buildBotMove(action: ScoredAction, data: Record<string, unknown> = {}): BotMove {
	if (action.type === duelConstants.actionTypes.COMBO) {
		return {
			move: actionTypeToMoveNameMap()[action.type],
			args: [action.moveAction!.path, data],
		};
	} else if (action.type === duelConstants.actionTypes.ATTACK) {
		let attackData: Record<string, unknown> = { ...data };
		if (Number.isInteger(action.moveIndex)) {
			attackData.moveIndex = action.moveIndex;
		}
		return {
			move: actionTypeToMoveNameMap()[action.type],
			args: [action.path, attackData],
		};
	} else {
		return {
			move: actionTypeToMoveNameMap()[action.type],
			args: [action.path, data],
		};
	}
}

/*

	BOT STRATEGY::

		Behaviors:

		IMPLEMENTED:
		- attack highest damage
		- attack the weakest opponent piece
		- move towards enemies to prepare for attack
		- move towards flag if not held
		- move towards goal if flag held
		- attack enemy holding flag if possible

		TODO:
		- move away from enemies after attacking
		- protect weakest player piece
		- at start of game put some emphasis on advancing pieces
		- add factor for how close an enemy is to their flag
		- add factor for how close an enemy is to their goal with flag


		ATTACKS:
			sort factors:
				- damage dealt
				- remaining opponent health
				- distance away

		MOVES:
			if can't attack, check for moves that allow an attack

	*/

interface BotObjective {
	checker: (G: BoardState, ctx: DuelCtx) => boolean;
	weight: number;
}

export function buildBotObjectives(): (G: BoardState, ctx: DuelCtx) => Record<string, BotObjective> {
	return () => ({
		'flag-captured': {
			checker: (G: BoardState) => {
				return duelUtil.getOpponentStartingIndices(G).includes(duelUtil.getOpponentFlagIndex(G) as number);
			},
			weight: 1000,
		},
		'flag-held': {
			checker: (G: BoardState) => {
				let flag = duelUtil.getOpponentFlagState(G);
				return !!flag?.holder;
			},
			weight: 50,
		},
		'enemy-flag-not-held-by-enemy': {
			checker: (G: BoardState) => {
				let flag = duelUtil.getPlayerFlagState(G);
				return !flag?.holder;
			},
			weight: 100,
		},
		'flag-guarded': {
			// true when the bot has at least one active piece within Manhattan distance 2 of its own (unstolen) flag
			checker: (G: BoardState) => {
				let flag = duelUtil.getPlayerFlagState(G);
				if (!flag || flag.holder || flag.index == null) {
					return false;
				}
				let boardSize = duelConstants.BOARD_COLUMN_SIZE;
				let flagRow = Math.floor(flag.index / boardSize);
				let flagCol = flag.index % boardSize;
				return G.playerStates[1].activeXalianIds.some((id) => {
					let index = duelUtil.getIndexOfXalian(id, G);
					if (index == null) {
						return false;
					}
					let row = Math.floor(index / boardSize);
					let col = index % boardSize;
					let distance = Math.abs(row - flagRow) + Math.abs(col - flagCol);
					return distance <= 2;
				});
			},
			weight: 50,
		},
		'opponents-eliminated': {
			checker: (G: BoardState) => {
				return G.playerStates[0].activeXalianIds.length === 0 && G.playerStates[0].unsetXalianIds.length === 0;
			},
			weight: 1000,
		},
	});
}
