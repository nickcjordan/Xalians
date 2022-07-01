import { MCTSBot, Step } from 'boardgame.io/ai';
import * as duelUtil from '../../../../utils/duelUtil';
import * as duelCalculator from '../../../../gameplay/duel/duelCalculator';
import { Hub } from "aws-amplify";

class DuelBotInstance extends MCTSBot {

  constructor(opts) {
    super({ ...opts, ...opts.game.ai });
  }

  // play(state, playerID) {
    // return new Promise((resolve, reject) => {
    // setTimeout(() => {
    //   let p = super.play(state, playerID);
    //   return p;
    // }, 300);
    // p.then((res) => {

    //   let responseClone = { ...res };
    //   let payloadClone = { ...res.action.payload };
    //   let actionClone = { ...res.action };
    //   let argsClone = [ ...res.action.payload.args ];
    //   let argClone = { ...res.action.payload.args[0] } 
    //   argClone.isSelectedBotAction = true;

    //   argsClone[0] = argClone;
    //   payloadClone.args = argsClone;
    //   actionClone.payload = payloadClone;
    //   responseClone.action = actionClone;


    //   if (res.action) {
    //     let action = res.action;
    //     let type = action.type;
    //     console.log("BOT TAKING ACTION " + type);
    //     if (type === 'movePiece') {
    //       let path = action.payload.args[0]
    //       console.log(JSON.stringify(action, null, 2));
    //       Hub.dispatch("duel-animation-event", {
    //         event: "move", data: {
    //           path: path
    //         }, message: null
    //       });
    //     } else if (type === 'doAttack') {
    //       let attackPath = action.payload.args[0];
    //       console.log(JSON.stringify(attackPath, null, 2));

    //       let G = res.metadata.state.G;
    //       let ctx = res.metadata.state.ctx;
    //       let attackerId = G.cells[attackPath.startIndex];
    //       let defenderId = G.cells[attackPath.endIndex];
    //       let attacker = duelUtil.getXalianFromId(attackerId, G);
    //       let defender = duelUtil.getXalianFromId(defenderId, G);
    //       let attackerType = attacker && attacker.elementType;
    //       let defenderType = defender && defender.elementType;

    //       let attackResult = duelCalculator.calculateAttackResult(attacker, defender, G, ctx);

    //       Hub.dispatch("duel-animation-event", {
    //         event: "attack", data: {
    //           attackerIndex: attackPath.startIndex,
    //           attackerId: attackerId,
    //           attackerType: attackerType,
    //           defenderIndex: attackPath.endIndex,
    //           defenderId: defenderId,
    //           defenderType: defenderType,
    //           attackResult: attackResult
    //         }, message: null
    //       });


    //       //  G.isSelectedBotAction = true;


    //       // return new Promise((resolve, reject) => {
    //         // setTimeout(() => {
    //           // resolve(responseClone);
    //           // resolve(res);
    //           // return res;
    //         // }, 300);
    //       // });


    //       // Hub.dispatch("duel-animation-event", { event: "attack", data: { 
    //       //   attackerIndex: attackPath.startIndex,
    //       //   defenderIndex: attackPath.endIndex,
    //       //   playerID: action.payload.playerID 
    //       //  }, message: null });
    //     }
    //   }
    // });
    // return p;

    // });
  // }

  
}

export default DuelBotInstance;