/*
	Duel: board state derivation.

	This used to also carry two DOM-manipulating helpers (clearVisualsForAllCells,
	setVisualsForAllCells) that directly touched classList/style on live cell elements.
	Those are UI, not rules - they moved to
	apps/web/src/components/games/duel/board/boardCellVisuals.js in the same commit that
	moved this file's pure half into the package (issue #184's duel half, following the
	expedition move in PR #199).
*/

import * as duelConstants from './duelGameConstants.ts';
import type { BoardState, DuelCtx, CurrentTurnDetails, TurnAction, TurnMove } from './types.ts';

export function buildBoardState(G: BoardState, ctx: DuelCtx): BoardState {
	let details = G.currentTurnDetails || currentTurnState(G, ctx);

	return {
		moveId: G.moveId,
		cells: G.cells,
		xalians: G.xalians,
		flags: G.flags,
		currentTurnDetails: details,
		playerStates: G.playerStates,
	};
}

export function getLastActionOfPlayer(fullLog: { action?: { type?: string; payload?: { type?: string; playerID?: string } } }[], playerID: string) {
	let logs = getAllMoveActionsFromLog(fullLog);
	let logsForCurrentPlayer = getAllActionsForPlayer(playerID, logs);
	return logsForCurrentPlayer.pop();
}

export function getAllMoveActionsFromLog(logs: { action?: { type?: string; payload?: { type?: string; playerID?: string } } }[]) {
	if (!logs || logs.length === 0) {
		return [];
	}
	let filtered = logs.filter((log) =>
		log.action
		&& log.action.type
		&& log.action.type === 'MAKE_MOVE'
		&& log.action.payload
		&& log.action.payload.type
		&& (log.action.payload.type === 'movePiece' || log.action.payload.type === 'doAttack'));
	return logs.length > 0 ? filtered : [];
}

export function getAllActionsForPlayer(playerID: string, logs: { action?: { payload?: { playerID?: string } } }[]) {
	return logs.filter((log) => (
		log.action && log.action.payload && log.action.payload.playerID
		&& log.action.payload.playerID === playerID
	));
}

export function currentTurnState(G: BoardState, ctx: DuelCtx): CurrentTurnDetails {
	let hasAttacked = false;
	let hasMoved = false;
	let remainingSpacesToMove = duelConstants.MAX_SPACES_MOVED_PER_TURN;
	let isComplete = false;
	let moveMap = new Map<string, { key: string; value: number }>();
	let actions: TurnAction[] = G.currentTurnActions || [];

	actions.forEach((action) => {
		if (action.type === duelConstants.actionTypes.ATTACK) {
			hasAttacked = true;
		}

		if (action.type === duelConstants.actionTypes.MOVE && 'move' in action) {
			hasMoved = true;
			let spacesMovedInAction = action.move.path.spacesMoved;
			remainingSpacesToMove -= spacesMovedInAction;
			let spacesMovedForXalian = 0;
			let existing = moveMap.get(action.move.moverId);
			if (existing) {
				spacesMovedForXalian = existing.value;
			}
			spacesMovedForXalian += spacesMovedInAction;
			moveMap.set(action.move.moverId, {
				key: action.move.moverId,
				value: spacesMovedForXalian,
			});
		}
	});

	isComplete = remainingSpacesToMove === 0 && hasAttacked;

	let moves: TurnMove[] = [];
	moveMap.forEach((entry) => {
		moves.push({ moverId: entry.key, spacesMoved: entry.value });
	});

	return {
		hasAttacked: hasAttacked,
		hasMoved: hasMoved,
		remainingSpacesToMove: remainingSpacesToMove,
		moves: moves,
		isComplete: isComplete,
		actions: actions,
	};
}
