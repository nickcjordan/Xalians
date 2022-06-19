

import * as duelConstants from './duelGameConstants';
import * as duelUtil from '../../utils/duelUtil';
import * as playerStateManager from './playerStateManager';
import * as xalianStateManager from './xalianStateManager';

export function buildBoardState(G, ctx) {
    var details = G.currentTurnDetails || currentTurnState(G, ctx);

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

export function currentTurnState(G, ctx) {
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


        // var currentPlayerState = G.playerStates[ctx.currentPlayer];
        // isComplete = (remainingSpacesToMove == 0 && hasAttacked) || !playerStateManager.playerStateHasMoveAvailable(currentPlayerState, G, ctx);
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


export function clearVisualsForAllCells(allCellElems) {
    allCellElems.forEach(cellElem => {
        if (cellElem.childNodes) {
            cellElem.childNodes.forEach(childElem => {
                if (childElem.classList.contains('duel-piece-ghost')) {
                    childElem.style.opacity = 0;
                }
                if (childElem.classList.contains('duel-piece')) {
                    childElem.style.opacity = 1;
                    childElem.childNodes.forEach(grandchildElem => {
                        if (grandchildElem.classList.contains('duel-attack-cell-icon')) {
                                grandchildElem.style.opacity = 0;
                        }
                        if (grandchildElem.classList.contains('duel-attack-icon-wrapper')) {
                                grandchildElem.style.opacity = 0;
                        }
                    });
                }

                // set dot correctly
                if (childElem.classList.contains('duel-board-cell-dot')) {
                    childElem.classList.add('duel-board-cell-dot-dark');
                    childElem.classList.remove('duel-board-cell-dot-light');
                    childElem.classList.remove('duel-piece-draggable-hovering');
                }

                // set attack circle correctly
                if (childElem.classList.contains('attack-pattern-background-selected')) {
                    childElem.style.opacity = 0;
                }
            })
        }
	});
}

export function setVisualsForAllCells(boardState, allCellElems, movableIndicesFromStartingSpot, attackableIndicesFromHoverSpot, draggingXalianId, hoverCellIndex = null) {
	allCellElems.forEach(cellElem => {
					
		if (cellElem.childNodes) {
			let iteratingCellIndex = parseInt(cellElem.id.replace('cell-', ''));
			let xalianIdOfIteratingCell = boardState.cells[iteratingCellIndex];
			
				
				cellElem.childNodes.forEach(childElem => {

					if (childElem.classList.contains('duel-piece')) {
						childElem.childNodes.forEach(nestedChild => {
							if (nestedChild.classList.contains('duel-attack-cell-icon')) {
								if (attackableIndicesFromHoverSpot.includes(iteratingCellIndex)) {
									nestedChild.style.opacity = 1;
								} else {
									nestedChild.style.opacity = 0;
								}
							}
							if (nestedChild.classList.contains('duel-attack-icon-wrapper')) {
								if (!duelUtil.xaliansAreOnSameTeam(draggingXalianId, xalianIdOfIteratingCell, boardState)) {
									nestedChild.style.opacity = 1;
								} else {
									nestedChild.style.opacity = 0;
								}
							}
						});
						// set attack x if needed
					}

				// set dot correctly
				if (childElem.classList.contains('duel-board-cell-dot')) {
                    if (hoverCellIndex && (iteratingCellIndex == hoverCellIndex)) {
                        childElem.classList.remove('duel-board-cell-dot-dark');
						childElem.classList.add('duel-board-cell-dot-light');
						childElem.classList.add('duel-piece-draggable-hovering');
                    } else if (movableIndicesFromStartingSpot.includes(iteratingCellIndex)) {
						childElem.classList.remove('duel-board-cell-dot-dark');
						childElem.classList.add('duel-board-cell-dot-light');
                        childElem.classList.remove('duel-piece-draggable-hovering');
					} else {
						childElem.classList.add('duel-board-cell-dot-dark');
						childElem.classList.remove('duel-board-cell-dot-light');
                        childElem.classList.remove('duel-piece-draggable-hovering');
					}
				}

				// set attack circle correctly
				if (childElem.classList.contains('attack-pattern-background-selected')) {
					if (attackableIndicesFromHoverSpot.includes(iteratingCellIndex)) {
						childElem.style.opacity = 1;
					} else {
						childElem.style.opacity = 0;
					}
				}
				
			})
		}
	});
}