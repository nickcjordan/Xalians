import * as duelUtil from './boardUtil.ts';
import type { BoardState, DuelCtx, PlayerState } from './types.ts';

export function currentPlayerHasMoveAvailable(G: BoardState, ctx: DuelCtx): boolean {
	return !playerHasNoMoveAvailable(ctx.currentPlayer, G, ctx);
}

export function playerHasNoMoveAvailable(playerId: string, G: BoardState, ctx: DuelCtx): boolean {
	let id = parseInt(playerId);
	let playerState = G.playerStates[id];
	let playerCanMove = playerStateHasMoveAvailable(playerState, G, ctx);
	let turnState = G.currentTurnDetails;
	return !!(turnState && turnState.isComplete) || !playerCanMove;
}

export function playerStateHasMoveAvailable(playerState: PlayerState, G: BoardState, ctx: DuelCtx): boolean {
	let hasValidActionAvailable = false;
	playerState.activeXalianIds.forEach((id) => {
		if (duelUtil.xalianHasValidActionAvailable(id, G, ctx)) {
			hasValidActionAvailable = true;
		}
	});

	return hasValidActionAvailable;
}
