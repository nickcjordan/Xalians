
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

export function isCurrentTurnsXalian(id, G, ctx) {
    return (isPlayersTurn(ctx) && isPlayerPiece(id, G)) || (isOpponentsTurn(ctx) && isOpponentPiece(id, G));
}

export function isPlayersTurn(ctx) {
    return (parseInt(ctx.currentPlayer) == 0);
}

export function isOpponentsTurn(ctx) {
    return (parseInt(ctx.currentPlayer) == 1);
}

export function getStartingIndices(G, ctx) {
    if (isPlayersTurn(ctx)) {
        let indices = [];
        for (var i = (G.cells.length - Math.sqrt(G.cells.length)); i< G.cells.length; i++) {
            indices.push(i);
        }
        return indices;
    } else if (isOpponentsTurn(ctx)) {
        let indices = [];
        for (var i = 0; i< Math.sqrt(G.cells.length); i++) {
            indices.push(i);
        }
        return indices;
    }
}

export function getXalianFromId(id, G) {
    return G.xalians.filter((x) => x.xalianId === id)[0];
};

export function xaliansAreOnSameTeam(id1, id2, G) {
    return (isPlayerPiece(id1, G) && isPlayerPiece(id2, G)) || (isOpponentPiece(id1, G) && isOpponentPiece(id2, G))
}