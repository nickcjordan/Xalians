

export function buildBoardState(G) {
    return { 
        moveId: G.moveId,
        cells: G.cells,
        xalians: G.xalians,
        flags: G.flags,
        currentTurnDetails: G.currentTurnDetails,
        activeXalianIds: G.activeXalianIds,
        inactiveXalianIds: G.inactiveXalianIds,
        unsetXalianIds: G.unsetXalianIds,
        activeOpponentXalianIds: G.activeOpponentXalianIds,
        inactiveOpponentXalianIds: G.inactiveOpponentXalianIds,
        unsetOpponentXalianIds: G.unsetOpponentXalianIds
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
            log.action.payload.type !== 'selectPiece' &&
            log.action.payload.type !== 'setPiece')
    : [];
}