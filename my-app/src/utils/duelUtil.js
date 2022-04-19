
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