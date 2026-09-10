/*
	Duel: session-storage-backed board-size cache. Moved from
	gameplay/duel/utils/boardUtil.js (issue #184's duel half): despite the old
	"gameplay" home, this reads/writes window.sessionStorage, so it is UI/browser
	state, not a rule, and stays in apps/web while the pure duel rules moved to
	packages/rules/src/duel.
*/
import LocalDuelStorage from "../store/LocalStorage";

export function buildBoardSizeState(w, h) {
    if (w > 0 && h > 0) {
        let max = Math.max(w, h);
        let min = Math.min(w, h);
        
        let padPercent = 0.05;
        let boardSize = {
            width: w - (w * padPercent),
            height: h - (h * padPercent),
            max: max - (max * padPercent),
            min: min - (min * padPercent),
        };
        
        LocalDuelStorage.setBoardSize(boardSize);
        
        return {
            contentLoaded: true,
            size: boardSize,
        };
    }
}