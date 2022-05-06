import { MCTSBot, Step } from 'boardgame.io/ai';
import * as duelUtil from '../../../../utils/duelUtil';
import * as duelCalculator from '../../../../gameplay/duel/duelCalculator';
class DuelBotInstance extends MCTSBot {
	constructor(opts) {
        super({ ...opts, ...opts.game.ai });
      }
}

export default DuelBotInstance;