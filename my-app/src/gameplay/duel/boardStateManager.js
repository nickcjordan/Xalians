

import * as duelConstants from './duelGameConstants';

export function buildBoardState(G) {
    var details = G.currentTurnDetails || currentTurnState(G);

    return { 
        moveId: G.moveId,
        cells: G.cells,
        xalians: G.xalians,
        flags: G.flags,
        currentTurnDetails: details,
        playerStates: G.playerStates
       }
}

export function getAllMoveActionsFromLog(logs) {
    return (logs && logs.length > 0) ? 
    logs.filter(log =>
            log.action &&
            log.action.type &&
            log.action.type === 'MAKE_MOVE' &&
            log.action.payload &&
            log.action.payload.type &&
            (log.action.payload.type === 'movePiece' || log.action.payload.type === 'doAttack'))
            : [];
            // log.action.payload.type !== 'selectPiece' &&
            // log.action.payload.type !== 'setPiece')
}

export function currentTurnState(G) {
    // if (G.turnHasEnded) {
    //     return {
    //         ...G,
    //         isComplete: true
    //     }
    // } else {
        var hasAttacked = false;
        var hasMoved = false;
        var remainingSpacesToMove = duelConstants.MAX_SPACES_MOVED_PER_TURN;
        var isComplete = false;
        let moveMap = new Map();
        // let actions = G.currentTurnState && G.currentTurnState.actions ? G.currentTurnState.actions : [];
        let actions = G.currentTurnActions || [];

            actions.forEach(action => {
                if (action.type == duelConstants.actionTypes.ATTACK) {
                    hasAttacked = true;
                }

                if (action.type == duelConstants.actionTypes.MOVE) {
                    hasMoved = true;
                    let spacesMovedInAction = action.move.path.spacesMoved;
                    remainingSpacesToMove -= spacesMovedInAction;
                    var spacesMovedForXalian = 0;
                    if (moveMap[action.move.moverId]) {
                        let entry = moveMap[action.move.moverId];
                        spacesMovedForXalian = entry.value;
                    }
                    spacesMovedForXalian += spacesMovedInAction;
                    moveMap[action.move.moverId] = {
                        key: action.move.moverId,
                        value: spacesMovedForXalian
                    };
                }
            });
        
        isComplete = (remainingSpacesToMove == 0 && hasAttacked);


        var moves = [];
        Object.values(moveMap).forEach((entry) => {
            moves.push({ moverId: entry.key, spacesMoved: entry.value });
        });


        return {
            hasAttacked: hasAttacked,
            hasMoved: hasMoved,
            remainingSpacesToMove: remainingSpacesToMove,
            moves: moves,
            isComplete: isComplete,
            actions: actions
        }
    // }
}