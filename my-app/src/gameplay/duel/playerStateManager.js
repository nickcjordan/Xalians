

import * as duelConstants from './duelGameConstants';
import * as duelUtil from '../../utils/duelUtil';


// export function buildCurrentPlayerState(boardState, ctx) {
//     return buildPlayerState(ctx.currentPlayer, boardState, ctx);
// }

// export function buildPlayerState(playerID, boardState, ctx) {
//     let flag = duelUtil.getFlagState(playerID, boardState);
//     let activeXalianIds = boardState.playerStates[playerID].activeXalianIds;
//     let inactiveXalianIds = boardState.playerStates[playerID].inactiveXalianIds;
//     let unsetXalianIds = boardState.playerStates[playerID].unsetXalianIds;
//     let allIds = activeXalianIds.concat(inactiveXalianIds).concat(unsetXalianIds);
//     let xalians = [];
//     allIds.forEach( id => {
//         xalians.push(boardState.xalians.filter( x => (x.xalianId === id))[0]);
//     })

//     // var hasValidActionAvailable = false;
//     // activeXalianIds.forEach(id => {
//     //     if (duelUtil.xalianHasValidActionAvailable(id, boardState, ctx)) {
//     //         hasValidActionAvailable = true;
//     //     }
//     // })
    
//     return {
//         xalians: xalians,
//         flag: flag,
//         activeXalianIds: activeXalianIds,
//         inactiveXalianIds: inactiveXalianIds,
//         unsetXalianIds: boardState.playerStates[playerID].unsetIds,
//     }
//     // hasValidActionAvailable: hasValidActionAvailable
// }

export function playerStateHasMoveAvailable(playerState, G, ctx) {
    var hasValidActionAvailable = false;
    playerState.activeXalianIds.forEach(id => {
        if (duelUtil.xalianHasValidActionAvailable(id, G, ctx)) {
            hasValidActionAvailable = true;
        }
    })

    return hasValidActionAvailable;
}
