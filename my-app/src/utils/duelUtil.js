import * as constants from '../gameplay/duel/duelGameConstants';
import * as duelCalculator from '../gameplay/duel/duelCalculator';

export function isPlayerPiece(id, G) {
    return  (G.unsetXalianIds && G.unsetXalianIds.includes(id)) 
        || (G.activeXalianIds && G.activeXalianIds.includes(id))
        || (G.inactiveXalianIds && G.inactiveXalianIds.includes(id))
}

export function isOpponentPiece(id, G) {
    return  (G.unsetOpponentXalianIds && G.unsetOpponentXalianIds.includes(id)) 
        || (G.activeOpponentXalianIds && G.activeOpponentXalianIds.includes(id))
        || (G.inactiveOpponentXalianIds && G.inactiveOpponentXalianIds.includes(id))
}

export function isUnset(id, G) {
    return  (G.unsetXalianIds && G.unsetXalianIds.includes(id)) 
    || (G.unsetOpponentXalianIds && G.unsetOpponentXalianIds.includes(id))
}

export function isActive(id, G) {
    return  (G.activeXalianIds && G.activeXalianIds.includes(id)) 
    || (G.activeOpponentXalianIds && G.activeOpponentXalianIds.includes(id))
}

export function isInactive(id, G) {
    return  (G.inactiveXalianIds && G.inactiveXalianIds.includes(id)) 
    || (G.inactiveOpponentXalianIds && G.inactiveOpponentXalianIds.includes(id))
}

export function isCurrentTurnsXalian(id, boardState, ctx) {
    return (isPlayersTurn(ctx) && isPlayerPiece(id, boardState)) || (isOpponentsTurn(ctx) && isOpponentPiece(id, boardState));
}

export function isPlayersTurn(ctx) {
    return (parseInt(ctx.currentPlayer) == 0);
}

export function isOpponentsTurn(ctx) {
    return (parseInt(ctx.currentPlayer) == 1);
}

export function getPlayerStartingIndices(boardState) {
    let indices = [];
    for (var i = (boardState.cells.length - Math.sqrt(boardState.cells.length)); i< boardState.cells.length; i++) {
        indices.push(i);
    }
    return indices;
}

export function getOpponentStartingIndices(boardState) {
    let indices = [];
    for (var i = 0; i< Math.sqrt(boardState.cells.length); i++) {
        indices.push(i);
    }
    return indices;
}

export function getStartingIndices(boardState, ctx) {
    if (isPlayersTurn(ctx)) {
        return getPlayerStartingIndices(boardState);
    } else if (isOpponentsTurn(ctx)) {
        return getOpponentStartingIndices(boardState);
    }
}

export function getXalianFromId(id, boardState) {
    return boardState.xalians.filter((x) => x.xalianId === id)[0];
};

export function getXalianFromIdAndXalians(id, xalians) {
    return xalians.filter((x) => x.xalianId === id)[0];
};

export function xaliansAreOnSameTeam(id1, id2, G) {
    return (isPlayerPiece(id1, G) && isPlayerPiece(id2, G)) || (isOpponentPiece(id1, G) && isOpponentPiece(id2, G))
}

export function getIndexOfXalian(id, boardState) {
    let index = null;
    for (var i = 0; i < boardState.cells.length; i++) {
        if (boardState.cells[i] === id) {
            index = i;
        }
    }
    return index;
}

export function getCurrentTurnActiveXalianIds(G, ctx) {
    if (isPlayersTurn(ctx)) {
        return G.activeXalianIds;
    } else if (isOpponentsTurn(ctx)) {
        return G.activeOpponentXalianIds;
    }
}

export function getCurrentTurnXalianIds(G, ctx) {
    if (isPlayersTurn(ctx)) {
        return getPlayerXalianIds(G)
    } else if (isOpponentsTurn(ctx)) {
        return getOpponentXalianIds(G);
    }
}

export function getPlayerXalianIds(G) {
    return G.activeXalianIds.concat(G.unsetXalianIds).concat(G.inactiveXalianIds);
}

export function getOpponentXalianIds(G) {
    return G.activeOpponentXalianIds.concat(G.unsetOpponentXalianIds).concat(G.inactiveOpponentXalianIds);
}

export function getOpponentHealth(G) {
    let h = 0;
    getOpponentXalianIds(G).forEach(id => {
        let xalian = getXalianFromId(id, G);
        h += xalian.stats.health;
    });
    return h;
}

export function getPlayerHealth(G) {
	let h = 0;
	getPlayerXalianIds(G).forEach((id) => {
		let xalian = getXalianFromId(id, G);
		h += xalian.stats.health;
	});
	return h;
}

export function getCurrentTurnTargetFlagIndex(boardState, ctx) {
    return isPlayersTurn(ctx) ? getPlayerFlagIndex(boardState) : isOpponentsTurn(ctx) ? getOpponentFlagIndex(boardState) : null;
}

export function getOpponentFlagIndex(boardState) {
    return getFlagIndex(getFlagState(1, boardState), boardState);
}

export function getPlayerFlagIndex(boardState) {
    return getFlagIndex(getFlagState(0, boardState), boardState);
}

export function getOpponentFlagState(boardState) {
    return getFlagState(1, boardState);
}

export function getPlayerFlagState(boardState) {
    return getFlagState(0, boardState);
}

export function getFlagState(playerId, boardState) {
    let flag = null
    boardState.flags.forEach( f => {
        if (f.player === playerId) {
            flag = f;
        }
    });
    return flag;
}

export function getFlagIndex(flag, boardState) {
    if (flag && flag.index != null && flag.index != undefined) {
        return flag.index;
    } else if (flag && flag.holder) {
        return getIndexOfXalian(flag.holder, boardState);
    }
}

export function currentTurnState(G, ctx) {
    if (G.turnHasEnded) {
        return {
            hasAttacked: true,
            hasMoved: true,
            remainingSpacesToMove: 0,
            moves: [],
            isComplete: true
        }
    } else {
        var hasAttacked = false;
        var hasMoved = false;
        var remainingSpacesToMove = constants.MAX_SPACES_MOVED_PER_TURN;
        var isComplete = false;
        let moveMap = new Map();
        G.currentTurnState.actions.forEach(action => {
            if (action.type == constants.actionTypes.ATTACK) {
                hasAttacked = true;
            }

            if (action.type == constants.actionTypes.MOVE) {
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
            isComplete: isComplete
        }
    }
}

export function xalianHasValidActionAvailable(id, G, ctx) {
    let xalian = getXalianFromId(id, G);
    let ind = getIndexOfXalian(id, G);
    if (ind) {
        let attackableSpaces = duelCalculator.calculateAttackablePaths(ind, xalian, G, ctx);
        let movableSpaces = duelCalculator.calculateMovablePaths(ind, xalian, G, ctx);
        return (attackableSpaces && attackableSpaces.length > 0) || (movableSpaces && movableSpaces.length > 0);
    } else {
        return false;
    }
}