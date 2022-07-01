

import * as duelConstants from './duelGameConstants';
import * as duelUtil from '../../utils/duelUtil';

export function currentPlayerHasMoveAvailable(G, ctx) {
    return !playerHasNoMoveAvailable(ctx.currentPlayer, G, ctx);
}

export function playerHasNoMoveAvailable(playerId, G, ctx) {
    let id = parseInt(playerId);
    let playerState = G.playerStates[id];
    let playerCanMove = playerStateHasMoveAvailable(playerState, G, ctx);
    let turnState = G.currentTurnDetails;
    return (turnState && turnState.isComplete) || !playerCanMove;
}

export function playerStateHasMoveAvailable(playerState, G, ctx) {
    var hasValidActionAvailable = false;
    playerState.activeXalianIds.forEach(id => {
        if (duelUtil.xalianHasValidActionAvailable(id, G, ctx)) {
            hasValidActionAvailable = true;
        }
    })

    return hasValidActionAvailable;
}


