

import * as duelConstants from './duelGameConstants';
import * as duelUtil from '../../utils/duelUtil';


export function playerStateHasMoveAvailable(playerState, G, ctx) {
    var hasValidActionAvailable = false;
    playerState.activeXalianIds.forEach(id => {
        if (duelUtil.xalianHasValidActionAvailable(id, G, ctx)) {
            hasValidActionAvailable = true;
        }
    })

    return hasValidActionAvailable;
}
