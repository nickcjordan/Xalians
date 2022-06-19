import * as duelConstants from '../gameplay/duel/duelGameConstants';
import * as duelCalculator from '../gameplay/duel/duelCalculator';
import * as boardStateManager from '../gameplay/duel/boardStateManager';
import * as playerStateManager from '../gameplay/duel/playerStateManager';

export function isPlayerPiece(id, G) {
    return  (G.playerStates[0].unsetXalianIds && G.playerStates[0].unsetXalianIds.includes(id)) 
        || (G.playerStates[0].activeXalianIds && G.playerStates[0].activeXalianIds.includes(id))
        || (G.playerStates[0].inactiveXalianIds && G.playerStates[0].inactiveXalianIds.includes(id))
}

export function isOpponentPiece(id, G) {
    return  (G.playerStates[1].unsetXalianIds && G.playerStates[1].unsetXalianIds.includes(id)) 
        || (G.playerStates[1].activeXalianIds && G.playerStates[1].activeXalianIds.includes(id))
        || (G.playerStates[1].inactiveXalianIds && G.playerStates[1].inactiveXalianIds.includes(id))
}

export function isUnset(id, G) {
    return  (G.playerStates[0].unsetXalianIds && G.playerStates[0].unsetXalianIds.includes(id)) 
    || (G.playerStates[1].unsetXalianIds && G.playerStates[1].unsetXalianIds.includes(id))
}

export function isActive(id, G) {
    return  (G.playerStates[0].activeXalianIds && G.playerStates[0].activeXalianIds.includes(id)) 
    || (G.playerStates[1].activeXalianIds && G.playerStates[1].activeXalianIds.includes(id))
}

export function isInactive(id, G) {
    return  (G.playerStates[0].inactiveXalianIds && G.playerStates[0].inactiveXalianIds.includes(id)) 
    || (G.playerStates[1].inactiveXalianIds && G.playerStates[1].inactiveXalianIds.includes(id))
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

export function getStartingIndicesOfPlayer(playerID, boardState) {
    if (playerID == 0) {
        return getPlayerStartingIndices(boardState);
    } else if (playerID == 1) {
        return getOpponentStartingIndices(boardState);
    }
}

export function getStartingIndices(boardState, ctx) {
    if (isPlayersTurn(ctx)) {
        return getPlayerStartingIndices(boardState);
    } else if (isOpponentsTurn(ctx)) {
        return getOpponentStartingIndices(boardState);
    }
}

export function getXalianFromId(id, boardState) {
    return getXalianFromIdAndXalians(id, boardState.xalians);
};

export function getXalianFromIdAndXalians(id, xalians) {
    return id ? xalians.filter((x) => x.xalianId === id)[0] : null;
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
        return G.playerStates[0].activeXalianIds;
    } else if (isOpponentsTurn(ctx)) {
        return G.playerStates[1].activeXalianIds;
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
    return G.playerStates[0].activeXalianIds.concat(G.playerStates[0].unsetXalianIds).concat(G.playerStates[0].inactiveXalianIds);
}

export function getOpponentXalianIds(G) {
    return G.playerStates[1].activeXalianIds.concat(G.playerStates[1].unsetXalianIds).concat(G.playerStates[1].inactiveXalianIds);
}

export function getOpponentHealth(G) {
    let h = 0;
    getOpponentXalianIds(G).forEach(id => {
        let xalian = getXalianFromId(id, G);
        h += xalian.state.health;
    });
    return h;
}

export function getPlayerHealth(G) {
	let h = 0;
	getPlayerXalianIds(G).forEach((id) => {
		let xalian = getXalianFromId(id, G);
		h += xalian.state.health;
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

export function currentTurnHasMoveAvailable(boardState, ctx) {
    return playerStateManager.playerStateHasMoveAvailable(boardState.playerStates[parseInt(ctx.currentPlayer)], boardState, ctx);
}


export function xalianHasValidActionAvailable(id, G, ctx) {
    let xalian = getXalianFromId(id, G);
    let ind = getIndexOfXalian(id, G);
    if (ind) {
        var canAttack = true;
        var canMove = true;

        let xalianStatus = getXalianCurrentTurnStatus(xalian, G, ctx);

        if (xalianStatus.xalianHasAttacked) {
            canAttack = false;
        } else {
            let attackableSpaces = duelCalculator.calculateAttackablePaths(ind, xalian, G, ctx);
            if (!attackableSpaces || attackableSpaces.length == 0) {
                canAttack = false;
            }
        }
        if (xalianStatus.xalianHasMoved && xalianStatus.remainingSpacesXalianCanMove == 0) {
            canMove = false;
        } else {
            // let movableSpaces = duelCalculator.calculateMovablePaths(ind, xalian, G, ctx);
            let movableSpaces = duelCalculator.calculateValidUnoccupiedPaths(G, ctx, ind, xalianStatus.remainingSpacesXalianCanMove, xalian.state.stamina)
            if (!movableSpaces || movableSpaces.length == 0) {
                canMove = false;
            }
        }
        let hasMoveAvailable =  canAttack || canMove;
        return hasMoveAvailable;
    } else {
        return false;
    }
}

export function getXalianCurrentTurnStatus(xalian, boardState, ctx) {
    let xalianId = xalian.xalianId;
    let currentTurnDetails = boardState.currentTurnDetails || boardStateManager.currentTurnState(boardState, ctx);
    let currentTurnActions = boardState.currentTurnActions || currentTurnDetails.actions || [];
    let remainingSpacesToMoveForTurn = currentTurnDetails.remainingSpacesToMove;
    var xalianHasAttacked = false;
    var xalianHasMoved = false;
    // var remainingSpacesXalianCanMove = Math.min(currentTurnDetails.remainingSpacesToMove, xalian.stats.distance);
    var remainingSpacesXalianCanMove = xalian.stats.distance;

    currentTurnActions.forEach(action => {
        if (action.type == duelConstants.actionTypes.ATTACK && action.attack.attackerId === xalianId) {
            xalianHasAttacked = true;
        }

        if (action.type == duelConstants.actionTypes.MOVE && action.move.moverId === xalianId) {
            xalianHasMoved = true;
            let spacesMovedInAction = action.move.path.spacesMoved;
            remainingSpacesXalianCanMove -= spacesMovedInAction;
            // var spacesMovedForXalian = 0;
            // if (moveMap[action.move.moverId]) {
            //     let entry = moveMap[action.move.moverId];
            //     spacesMovedForXalian = entry.value;
            // }
            // spacesMovedForXalian += spacesMovedInAction;
            // moveMap[action.move.moverId] = {
            //     key: action.move.moverId,
            //     value: spacesMovedForXalian
            // };
        }
    });
    remainingSpacesXalianCanMove = Math.min(remainingSpacesXalianCanMove, remainingSpacesToMoveForTurn);
    remainingSpacesXalianCanMove = Math.max(remainingSpacesXalianCanMove, 0);

    return {
        xalianHasAttacked: xalianHasAttacked,
        xalianHasMoved: xalianHasMoved,
        remainingSpacesXalianCanMove: remainingSpacesXalianCanMove
    }
}


export function getMovableIndices(xalianId, boardState, ctx) {
	var moves = [];
		if (ctx.phase === 'setup' && xalianId) {
			moves = getStartingIndices(boardState, ctx);
		} else if (ctx.phase === 'play' && xalianId) {
			let xalian = getXalianFromId(xalianId, boardState);
			let index = getIndexOfXalian(xalianId, boardState);
			moves = duelCalculator.calculateMovableIndices(index, xalian, boardState, ctx);
		}
	return moves;
}

export function getAttackableIndices(xalianId, boardState, ctx, onlyOccupiedCells = true) {
	var attacks = [];
		if (ctx.phase === 'play' && xalianId) {
			let xalian = getXalianFromId(xalianId, boardState);
			let index = getIndexOfXalian(xalianId, boardState);
			attacks = duelCalculator.calculateAttackableIndices(index, xalian, boardState, ctx, onlyOccupiedCells);
		}
	return attacks;
}

export function extractXalianId(text) {
    // const xalianIdRegex = '[0-9]{5}-[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}';
    const xalianIdRegex = /[0-9]{5}-[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}/g;
    let extraction = text.match(xalianIdRegex);
    if (extraction && extraction.length > 0) {
        return extraction[0];
    } else {
        return null;
    }
}