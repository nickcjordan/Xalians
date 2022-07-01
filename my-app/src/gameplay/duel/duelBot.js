import { MCTSBot, Step } from 'boardgame.io/ai';
        
import * as duelUtil from '../../utils/duelUtil';
import * as duelCalculator from './duelCalculator';
import * as actionBuilder from './duelActionBuilder';
import * as duelConstants from './duelGameConstants';
import * as boardStateManager from './boardStateManager';

function actionTypeToMoveNameMap() {
    let map =new Map();
    map[duelConstants.actionTypes.ATTACK] = 'doAttack';
    map[duelConstants.actionTypes.MOVE] = 'movePiece';
    // map[duelConstants.actionTypes.COMBO] = 'movePieceThenAttack';

    /* 
        my theory here is that if the bot knows that moving to the position then attacking is the best combo, 
        then surely moving to the position then allowing the bot to select another action will end in the same result
    */
    map[duelConstants.actionTypes.COMBO] = 'movePiece'; 
    return map;
}

export function buildSetupBotMoves(G, ctx, id) {
    let moves = [];
    let movable = duelUtil.getOpponentStartingIndices(G);
    movable.forEach((i) => {
        if (G.cells[i] == null || G.cells[i] == undefined) {
            moves.push({ move: 'setPiece', args: [i, id] });
        }
    });
    return moves;
}

export function getBestBotActionsForXalianIds(G, ctx, ids) {
    var allActions = [];


    ids.forEach( id => {
        let pieceActions = getBestBotActionsForXalian(G, ctx, id);
        allActions = allActions.concat(pieceActions);
    })

    allActions = allActions.filter( action => action != null && action != undefined);
    sortActions(allActions);

    let best = allActions[0];
    if (best && best.xalian) {
        console.log(`BEST MOVE: [${ctx.turn}:${ctx.numMoves}] ${best.xalian.species.name} ${best.type} {${best.score}} :: ${best.path.startIndex} -> ${best.path.endIndex}  [${JSON.stringify(best.path ? best.path.path : {})}] :: ${best.description}`);
    }

    let botMoves = [];
    allActions.forEach( action => {
        botMoves.push(buildBotMove(action));
    })

    if (botMoves && botMoves.length > 0) {
        let selectedAction = botMoves[0];
        return [selectedAction];
    } else {
        console.error(`NO ACTIONS BUILT FOR ANY BOT :: ${JSON.stringify(ids)}`);
    }
}

export function getBestBotActionsForXalian(G, ctx, id) {
    let attacker = duelUtil.getXalianFromId(id, G);
    let currentIndex = duelUtil.getIndexOfXalian(id, G);

    var allActions = [];

    let details = G.currentTurnDetails || boardStateManager.currentTurnState(G, ctx);

    if (ctx.phase === 'play') {
        // get all paths within move range
        let allPaths = (details.hasMoved && details.remainingSpacesToMove == 0) ? [] 
            : duelCalculator.calculateMovablePaths(currentIndex, attacker, G, ctx, true);

        // score moves based on how advantageous
        let moveActions = (details.hasMoved && details.remainingSpacesToMove == 0) ? [] 
            : actionBuilder.buildMoveActionsWithScore(currentIndex, attacker, allPaths, G, ctx);

        // find moves that allow for attacks in second part of move and score them
        let comboActions = ((details.hasMoved && details.remainingSpacesToMove == 0) || details.hasAttacked) ? [] 
            : actionBuilder.buildComboActionsWithScore(currentIndex, attacker, allPaths, G, ctx);

        // score attack actions
        let attackActions = (details.hasAttacked) ? [] 
            : actionBuilder.buildAttackActionsWithScore(currentIndex, attacker, G, ctx);


        allActions = allActions.concat(moveActions).concat(attackActions).concat(comboActions);

        sortActions(allActions);


        if (allActions.length == 0) {
            // console.error(`NO ACTIONS BUILT FOR BOT :: ${attacker.species.name} : moved ? ${details.hasMoved} : remaining=${details.remainingSpacesToMove}`);
            return [];
        } else {
            // bestAction = allActions[0];
            // let path = bestAction.path;
            // console.log(
            // `\t${attacker.species.name} ${bestAction.type} {${bestAction.score}} :: ${bestAction.description} :: ${bestAction.path.startIndex} -> ${bestAction.path.endIndex}  [${JSON.stringify(path ? path.path : {})}]`
            // );
        }
        // actions.push();
    } else {
        // actions = buildSetupBotMoves(G, ctx, id);
    }

    // return bestAction;
    // return allActions;
    allActions.forEach( action => {
        action.xalian = attacker;
    })
    return allActions.slice(0, Math.min(5, allActions.length));
}

function sortActions(allActions) {
    allActions.sort(function (a, b) {
        if (a.type == duelConstants.actionTypes.COMBO || b.type == duelConstants.actionTypes.COMBO) {
            if (a.type == duelConstants.actionTypes.COMBO) { // 'a' is combo :: determining how to accurately and fairly compare to 'b'
                if (b.type == duelConstants.actionTypes.COMBO) { // both combos :: compare equally
                    return (a.score > b.score) ? -1 : (a.score < b.score) ? 1 : 0;
                } else if (b.type == duelConstants.actionTypes.ATTACK) { // 'b' is attack :: compare against 'a' attack 
                    return (a.attackAction.score > b.score) ? -1 : (a.attackAction.score < b.score) ? 1 : 0;
                }  else { 
                    // although 'b' is move, compare combo 'a' attack score
                    // the thinking here:
                    //      - the attack will still be compared to other attack for the best one, so this will only be picked if it is the best attack
                    //      - if this is the best attack, it will always be worth it unless an edge case:
                    //            -- if the mover is holding the flag and moving towards goal :: still should be accounted for with move action bonuses
                    return (a.attackAction.score > b.score) ? -1 : (a.attackAction.score < b.score) ? 1 : 0;
                }
            } else { // 'b' is combo :: determining how to accurately and fairly compare to 'a'
                if (a.type == duelConstants.actionTypes.ATTACK) { // 'a' is attack :: compare against 'b' attack 
                    return (a.score > b.attackAction.score) ? -1 : (a.score < b.attackAction.score) ? 1 : 0;
                }  else { 
                    // although 'a' is move, compare combo 'b' attack score
                    // the thinking here:
                    //      - the attack will still be compared to other attack for the best one, so this will only be picked if it is the best attack
                    //      - if this is the best attack, it will always be worth it unless an edge case:
                    //            -- if the mover is holding the flag and moving towards goal :: still should be accounted for with move action bonuses
                    return (a.score > b.attackAction.score) ? -1 : (a.score < b.attackAction.score) ? 1 : 0;
                }
            }
        } else { // neither are combos :: compare equally
            return (a.score > b.score) ? -1 : (a.score < b.score) ? 1 : 0;
        }
    });
}

function buildBotMove(action, data = {}) {
    if (action.type == duelConstants.actionTypes.COMBO) {
        return { 
            move: actionTypeToMoveNameMap()[action.type], 
            args: [action.moveAction.path, data] 
        };
    } else {
        return { 
            move: actionTypeToMoveNameMap()[action.type], 
            args: [action.path, data] 
        };

    }
}




/* 
 
    BOT STRATEGY::

        Behaviors:
        
        IMPLEMENTED:
        - attack highest damage
        - attack the weakest opponent piece
        - move towards enemies to prepare for attack
        - move towards flag if not held
        - move towards goal if flag held
        - attack enemy holding flag if possible
        
        TODO:
        - move away from enemies after attacking
        - protect weakest player piece
        - at start of game put some emphasis on advancing pieces
        - add factor for how close an enemy is to their flag
        - add factor for how close an enemy is to their goal with flag


        ATTACKS:
            sort factors:
                - damage dealt
                - remaining opponent health
                - distance away

        MOVES:
            if can't attack, check for moves that allow an attack
         

     */


           



// OBJECTIVES
// interface Objective {
// 	checker: (G: any, ctx: Ctx) => boolean;
// 	weight: number;
//   }

// function buildBotObjectives(G, ctx) {
export function buildBotObjectives() {
	// if (!G.playerStates[0].activeXalianIds) {
	// 	return [];
	// }
	// let initialHealth = duelUtil.getPlayerHealth(G);
	// let objectives = [];
	// let obj = {
	// 	checker: (G, ctx) => {
	// 		let resultHealth = duelUtil.getPlayerHealth(G);
	// 		let better = resultHealth < initialHealth;
	// 		if (better) {
	// 			console.log('ayyy');
	// 		}
	// 		return better;
	// 	},
	// 	weight: 10,
	// };
	// objectives.push(obj);
	// return objectives;

    return (G, ctx) => ({
        'flag-captured': {
            checker: (G, ctx) => {
                // console.log("BOT :: checking for flag captured");
                return duelUtil.getOpponentStartingIndices(G).includes(duelUtil.getOpponentFlagIndex(G));
            },
            weight: 1000,
        },
        'flag-held': {
            checker: (G, ctx) => {
              let flag = duelUtil.getOpponentFlagState(G);
              return flag.holder ? true : false;
            },
            weight: 50,
        },
        'enemy-flag-not-held-by-enemy': {
            checker: (G, ctx) => {
              let flag = duelUtil.getPlayerFlagState(G);
              return flag.holder ?  false : true;
            },
            weight: 100,
        },
        'flag-guarded': {
            checker: (G, ctx) => {
              let flag = duelUtil.getPlayerFlagState(G);
              return flag.holder ? true : false;
            },
            weight: 50,
        },
        'opponents-eliminated': {
            checker: (G, ctx) => {
              return G.playerStates[0].activeXalianIds.length == 0 && G.playerStates[0].unsetXalianIds.length == 0;
            },
            weight: 1000,
        }
      })
}


