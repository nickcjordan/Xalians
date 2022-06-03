

import * as duelConstants from './duelGameConstants';
import * as duelUtil from '../../utils/duelUtil';


export function buildCurrentPlayerState(boardState, ctx) {
    return buildPlayerState(ctx.currentPlayer, boardState);
}

export function buildPlayerState(playerID, boardState) {
    let flag = duelUtil.getFlagState(playerID, boardState);
    let activeXalianIds = boardState.playerStates[playerID].activeXalianIds;
    let inactiveXalianIds = boardState.playerStates[playerID].inactiveXalianIds;
    let unsetXalianIds = boardState.playerStates[playerID].unsetXalianIds;
    let allIds = activeXalianIds.concat(inactiveXalianIds).concat(unsetXalianIds);
    let xalians = [];
    allIds.forEach( id => {
        xalians.push(boardState.xalians.filter( x => (x.xalianId === id))[0]);
    })
    
    return {
        xalians: xalians,
        flag: flag,
        activeXalianIds: activeXalianIds,
        inactiveXalianIds: inactiveXalianIds,
        unsetXalianIds: boardState.playerStates[playerID].unsetIds
    }
}

