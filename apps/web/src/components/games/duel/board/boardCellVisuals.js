/*
	Duel: DOM visual helpers for board cells.

	Split out of gameplay/duel/boardStateManager.js during the packages/rules move
	(issue #184, the duel half): these two functions mutate live cell DOM nodes
	directly (classList, style.opacity) rather than deriving rules state, so they stay
	in apps/web as UI code while the rest of boardStateManager moved to
	packages/rules/src/duel/boardStateManager.ts.
*/

import * as duelUtil from '@xalians/rules/duel/boardUtil';

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
