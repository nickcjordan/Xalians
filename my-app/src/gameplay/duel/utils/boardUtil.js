import LocalDuelStorage from "../../../store/LocalStorage";

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