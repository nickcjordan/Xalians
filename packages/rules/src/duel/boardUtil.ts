/*
	Duel: board/team query helpers.

	Moved from apps/web/src/utils/duelUtil.js (issue #184's duel half, following the
	expedition move in PR #199). Despite its old apps/web "utils" home this is pure rules
	logic over G/ctx - team membership, board indices, flag lookups, turn-availability
	checks - with zero React or DOM dependency, so it belongs in the package alongside
	the rest of the duel rules. duelCalculator.ts needs xaliansAreOnSameTeam, which is
	what triggered the move.

	Named boardUtil.ts (not duelUtil.ts) to match the file the issue's move already
	named this module after; the browser-storage helper that used to live at
	apps/web/src/gameplay/duel/utils/boardUtil.js is a different, UI-only concern (it
	reads/writes window.sessionStorage) and now lives at
	apps/web/src/utils/duelBoardSizeStorage.js instead.
*/

import * as duelConstants from './duelGameConstants.ts';
import * as duelCalculator from './duelCalculator.ts';
import * as boardStateManager from './boardStateManager.ts';
import * as playerStateManager from './playerStateManager.ts';
import type { BoardState, DuelCtx, DuelPiece, DuelFlag, XalianTurnStatus } from './types.ts';

export function isBotsTurn(G: BoardState, ctx: DuelCtx): boolean {
	return !!(G.hasBot && ctx.currentPlayer === '1');
}

export function isPlayerPiece(id: string | null | undefined, G: BoardState): boolean {
	return (G.playerStates[0].unsetXalianIds && G.playerStates[0].unsetXalianIds.includes(id as string))
		|| (G.playerStates[0].activeXalianIds && G.playerStates[0].activeXalianIds.includes(id as string))
		|| (G.playerStates[0].inactiveXalianIds && G.playerStates[0].inactiveXalianIds.includes(id as string));
}

export function isOpponentPiece(id: string | null | undefined, G: BoardState): boolean {
	return (G.playerStates[1].unsetXalianIds && G.playerStates[1].unsetXalianIds.includes(id as string))
		|| (G.playerStates[1].activeXalianIds && G.playerStates[1].activeXalianIds.includes(id as string))
		|| (G.playerStates[1].inactiveXalianIds && G.playerStates[1].inactiveXalianIds.includes(id as string));
}

export function isUnset(id: string | null | undefined, G: BoardState): boolean {
	return (G.playerStates[0].unsetXalianIds && G.playerStates[0].unsetXalianIds.includes(id as string))
		|| (G.playerStates[1].unsetXalianIds && G.playerStates[1].unsetXalianIds.includes(id as string));
}

export function isActive(id: string | null | undefined, G: BoardState): boolean {
	return (G.playerStates[0].activeXalianIds && G.playerStates[0].activeXalianIds.includes(id as string))
		|| (G.playerStates[1].activeXalianIds && G.playerStates[1].activeXalianIds.includes(id as string));
}

export function isInactive(id: string | null | undefined, G: BoardState): boolean {
	return (G.playerStates[0].inactiveXalianIds && G.playerStates[0].inactiveXalianIds.includes(id as string))
		|| (G.playerStates[1].inactiveXalianIds && G.playerStates[1].inactiveXalianIds.includes(id as string));
}

export function isCurrentTurnsXalian(id: string, boardState: BoardState, ctx: DuelCtx): boolean {
	return (isPlayersTurn(ctx) && isPlayerPiece(id, boardState)) || (isOpponentsTurn(ctx) && isOpponentPiece(id, boardState));
}

export function isPlayersTurn(ctx: DuelCtx): boolean {
	return parseInt(ctx.currentPlayer) === 0;
}

export function isOpponentsTurn(ctx: DuelCtx): boolean {
	return parseInt(ctx.currentPlayer) === 1;
}

export function getPlayerStartingIndices(boardState: BoardState): number[] {
	let indices: number[] = [];
	for (let i = boardState.cells.length - Math.sqrt(boardState.cells.length); i < boardState.cells.length; i++) {
		indices.push(i);
	}
	return indices;
}

export function getOpponentStartingIndices(boardState: BoardState): number[] {
	let indices: number[] = [];
	for (let i = 0; i < Math.sqrt(boardState.cells.length); i++) {
		indices.push(i);
	}
	return indices;
}

export function getStartingIndicesOfPlayer(playerID: number | string, boardState: BoardState): number[] | undefined {
	if (Number(playerID) === 0) {
		return getPlayerStartingIndices(boardState);
	} else if (Number(playerID) === 1) {
		return getOpponentStartingIndices(boardState);
	}
}

export function getStartingIndices(boardState: BoardState, ctx: DuelCtx): number[] | undefined {
	if (isPlayersTurn(ctx)) {
		return getPlayerStartingIndices(boardState);
	} else if (isOpponentsTurn(ctx)) {
		return getOpponentStartingIndices(boardState);
	}
}

export function getXalianFromId(id: string | null | undefined, boardState: BoardState): DuelPiece | null {
	return getXalianFromIdAndXalians(id, boardState.xalians);
}

export function getXalianFromIdAndXalians(id: string | null | undefined, xalians: DuelPiece[]): DuelPiece | null {
	return id ? xalians.filter((x) => x.xalianId === id)[0] ?? null : null;
}

export function xaliansAreOnSameTeam(id1: string | null | undefined, id2: string | null | undefined, G: BoardState): boolean {
	return (isPlayerPiece(id1, G) && isPlayerPiece(id2, G)) || (isOpponentPiece(id1, G) && isOpponentPiece(id2, G));
}

export function getIndexOfXalian(id: string | null | undefined, boardState: BoardState): number | null {
	let index: number | null = null;
	for (let i = 0; i < boardState.cells.length; i++) {
		if (boardState.cells[i] === id) {
			index = i;
		}
	}
	return index;
}

export function getCurrentTurnActiveXalianIds(G: BoardState, ctx: DuelCtx): string[] | undefined {
	if (isPlayersTurn(ctx)) {
		return G.playerStates[0].activeXalianIds;
	} else if (isOpponentsTurn(ctx)) {
		return G.playerStates[1].activeXalianIds;
	}
}

export function getCurrentTurnXalianIds(G: BoardState, ctx: DuelCtx): string[] | undefined {
	if (isPlayersTurn(ctx)) {
		return getPlayerXalianIds(G);
	} else if (isOpponentsTurn(ctx)) {
		return getOpponentXalianIds(G);
	}
}

export function getPlayerXalianIds(G: BoardState): string[] {
	return G.playerStates[0].activeXalianIds.concat(G.playerStates[0].unsetXalianIds).concat(G.playerStates[0].inactiveXalianIds);
}

export function getOpponentXalianIds(G: BoardState): string[] {
	return G.playerStates[1].activeXalianIds.concat(G.playerStates[1].unsetXalianIds).concat(G.playerStates[1].inactiveXalianIds);
}

export function getOpponentHealth(G: BoardState): number {
	let h = 0;
	getOpponentXalianIds(G).forEach((id) => {
		let xalian = getXalianFromId(id, G);
		if (xalian) {
			h += xalian.state.health;
		}
	});
	return h;
}

export function getPlayerHealth(G: BoardState): number {
	let h = 0;
	getPlayerXalianIds(G).forEach((id) => {
		let xalian = getXalianFromId(id, G);
		if (xalian) {
			h += xalian.state.health;
		}
	});
	return h;
}

export function getCurrentTurnTargetFlagIndex(boardState: BoardState, ctx: DuelCtx): number | null {
	return isPlayersTurn(ctx) ? getPlayerFlagIndex(boardState) : isOpponentsTurn(ctx) ? getOpponentFlagIndex(boardState) : null;
}

export function getOpponentFlagIndex(boardState: BoardState): number | null {
	return getFlagIndex(getFlagState(1, boardState), boardState);
}

export function getPlayerFlagIndex(boardState: BoardState): number | null {
	return getFlagIndex(getFlagState(0, boardState), boardState);
}

export function getOpponentFlagState(boardState: BoardState): DuelFlag | null {
	return getFlagState(1, boardState);
}

export function getPlayerFlagState(boardState: BoardState): DuelFlag | null {
	return getFlagState(0, boardState);
}

export function getFlagState(playerId: number, boardState: BoardState): DuelFlag | null {
	let flag: DuelFlag | null = null;
	boardState.flags.forEach((f) => {
		if (f.player === playerId) {
			flag = f;
		}
	});
	return flag;
}

export function getFlagIndex(flag: DuelFlag | null, boardState: BoardState): number | null {
	if (flag && flag.index != null) {
		return flag.index;
	} else if (flag && flag.holder) {
		return getIndexOfXalian(flag.holder, boardState);
	}
	return null;
}

export function currentTurnHasMoveAvailable(boardState: BoardState, ctx: DuelCtx): boolean {
	return playerStateManager.playerStateHasMoveAvailable(boardState.playerStates[parseInt(ctx.currentPlayer)], boardState, ctx);
}

export function xalianHasValidActionAvailable(id: string, G: BoardState, ctx: DuelCtx): boolean {
	let xalian = getXalianFromId(id, G);
	let ind = getIndexOfXalian(id, G);
	if (xalian && ind != null && ind >= 0) {
		let canAttack = true;
		let canMove = true;

		let xalianStatus = getXalianCurrentTurnStatus(xalian, G, ctx);

		if (xalianStatus.xalianHasAttacked) {
			canAttack = false;
		} else {
			let attackableSpaces = duelCalculator.calculateAttackablePaths(ind, xalian, G, ctx);
			if (!attackableSpaces || attackableSpaces.length === 0) {
				canAttack = false;
			}
		}
		if (xalianStatus.xalianHasMoved && xalianStatus.remainingSpacesXalianCanMove === 0) {
			canMove = false;
		} else {
			let movableSpaces = duelCalculator.calculateValidUnoccupiedPaths(
				G, ctx, ind, xalianStatus.remainingSpacesXalianCanMove, xalian.state.stamina, !!(xalian.traits && xalian.traits.canFly),
			);
			if (!movableSpaces || movableSpaces.length === 0) {
				canMove = false;
			}
		}
		return canAttack || canMove;
	} else {
		return false;
	}
}

export function getXalianCurrentTurnStatus(xalian: DuelPiece, boardState: BoardState, ctx: DuelCtx): XalianTurnStatus {
	let xalianId = xalian.xalianId;
	let currentTurnDetails = boardState.currentTurnDetails || boardStateManager.currentTurnState(boardState, ctx);
	let currentTurnActions = boardState.currentTurnActions || currentTurnDetails.actions || [];
	let remainingSpacesToMoveForTurn = currentTurnDetails.remainingSpacesToMove;
	let xalianHasAttacked = false;
	let xalianHasMoved = false;
	let remainingSpacesXalianCanMove = xalian.stats.distance;

	currentTurnActions.forEach((action) => {
		if (action.type === duelConstants.actionTypes.ATTACK && 'attack' in action && action.attack.attackerId === xalianId) {
			xalianHasAttacked = true;
		}

		if (action.type === duelConstants.actionTypes.MOVE && 'move' in action && action.move.moverId === xalianId) {
			xalianHasMoved = true;
			let spacesMovedInAction = action.move.path.spacesMoved;
			remainingSpacesXalianCanMove -= spacesMovedInAction;
		}
	});
	remainingSpacesXalianCanMove = Math.min(remainingSpacesXalianCanMove, remainingSpacesToMoveForTurn);
	remainingSpacesXalianCanMove = Math.min(remainingSpacesXalianCanMove, xalian.state && Number.isFinite(xalian.state.stamina) ? xalian.state.stamina : remainingSpacesXalianCanMove);
	remainingSpacesXalianCanMove = Math.max(remainingSpacesXalianCanMove, 0);

	return {
		xalianHasAttacked: xalianHasAttacked,
		xalianHasMoved: xalianHasMoved,
		remainingSpacesXalianCanMove: remainingSpacesXalianCanMove,
	};
}

export function getMovableIndices(xalianId: string, boardState: BoardState, ctx: DuelCtx): number[] {
	let moves: number[] = [];
	if (ctx.phase === 'setup' && xalianId) {
		moves = getStartingIndices(boardState, ctx) ?? [];
	} else if (ctx.phase === 'play' && xalianId) {
		let xalian = getXalianFromId(xalianId, boardState);
		let index = getIndexOfXalian(xalianId, boardState);
		if (xalian && index != null) {
			moves = duelCalculator.calculateMovableIndices(index, xalian, boardState, ctx);
		}
	}
	return moves;
}

export function getAttackableIndices(xalianId: string, boardState: BoardState, ctx: DuelCtx, onlyOccupiedCells = true): number[] {
	let attacks: number[] = [];
	if (ctx.phase === 'play' && xalianId) {
		let xalian = getXalianFromId(xalianId, boardState);
		let index = getIndexOfXalian(xalianId, boardState);
		if (xalian && index != null) {
			attacks = duelCalculator.calculateAttackableIndices(index, xalian, boardState, ctx, onlyOccupiedCells);
		}
	}
	return attacks;
}

export function extractXalianId(text: string): string | null {
	const xalianIdRegex = /[0-9]{5}-[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}/g;
	let extraction = text.match(xalianIdRegex);
	if (extraction && extraction.length > 0) {
		return extraction[0];
	} else {
		return null;
	}
}
