import { MCTSBot, Step } from 'boardgame.io/ai';
        
import * as duelUtil from '../../utils/duelUtil';
import * as duelCalculator from './duelCalculator';
import * as actionBuilder from './duelActionBuilder';
import * as duelConstants from './duelGameConstants';

function actionTypeToMoveNameMap() {
    let map =new Map();
    map[duelConstants.actionTypes.ATTACK] = 'doAttack';
    map[duelConstants.actionTypes.MOVE] = 'movePiece';
    map[duelConstants.actionTypes.COMBO] = 'movePieceThenAttack';
    return map;
}

export function buildSetupBotMoves(G, ctx, id) {
    let moves = [];
    let movable = duelUtil.getOpponentStartingIndices(G);
    movable.forEach((i) => {
        if (G.cells[i] == null) {
            moves.push({ move: 'setPiece', args: [i, id] });
        }
    });
    return moves;
}

export function getBestBotActionForXalianIds(G, ctx, ids) {
    var allActions = [];


    ids.forEach( id => {
        allActions.push(getBestBotActionForXalian(G, ctx, id));
    })

    allActions = allActions.filter( action => action != null && action != undefined);
    allActions.sort(function (a, b) {
        return (a.score > b.score) ? -1 : (a.score < b.score) ? 1 : 0;
    });

    let selectedAction = allActions[0];
    if (selectedAction) {

        let selectedMove = buildBotMove(selectedAction);
        let path = selectedAction.path;
        let xalian = duelUtil.getXalianFromId(G.cells[path.startIndex], G);
        // console.log('selected best action:\n' + JSON.stringify(selectedAction, null, 2));
        console.log(
            // 'selected best action:\n' + JSON.stringify(bestAction) + 
            `CHOSEN: ${xalian.species.name} ${selectedAction.type} {${selectedAction.score}} :: ${selectedAction.path.startIndex} -> ${selectedAction.path.endIndex}  [${JSON.stringify(path ? path.path : {})}]`
            );
            return selectedMove;
    }
}

export function getBestBotActionForXalian(G, ctx, id) {
    let attacker = duelUtil.getXalianFromId(id, G);
    let currentIndex = duelUtil.getIndexOfXalian(id, G);

    // let actions = [];

    var bestAction = null;

    let details = G.currentTurnDetails || duelUtil.currentTurnState(G, ctx);

    if (ctx.phase === 'play') {
        // get all paths within move range
        let allPaths = (details.hasMoved && details.remainingSpacesToMove == 0) ? [] 
            : duelCalculator.calculateMovablePaths(currentIndex, attacker, G, ctx, true);

        // score moves based on how advantageous
        let moveActions = (details.hasMoved && details.remainingSpacesToMove == 0) ? [] 
            : actionBuilder.buildMoveActionsWithScore(currentIndex, attacker, allPaths, G, ctx);

        // find moves that allow for attacks in second part of move and score them
        let comboActions = ((details.hasMoved && details.remainingSpacesToMove == 0) || details.hasAttacked) ? [] 
            : actionBuilder.buildComboActionsWithScore(attacker, allPaths, G, ctx);

        // score attack actions
        let attackActions = (details.hasAttacked) ? [] 
            : actionBuilder.buildAttackActionsWithScore(currentIndex, attacker, G, ctx);

        // let comboActions = [];

        var allActions = [].concat(moveActions).concat(attackActions).concat(comboActions);

        allActions.sort(function (a, b) {
            return (a.score > b.score) ? -1 : (a.score < b.score) ? 1 : 0;
        });

        if (comboActions && comboActions.length > 0) {
            // console.log();
        }


        if (allActions.length == 0) {
            console.error(`NO ACTIONS BUILT FOR BOT :: ${attacker.species.name} : moved ? ${details.hasMoved} : remaining=${details.remainingSpacesToMove}`);
        } else {
            bestAction = allActions[0];
            let path = bestAction.path;
            console.log(
            `\t${attacker.species.name} ${bestAction.type} {${bestAction.score}} :: ${bestAction.description} :: ${bestAction.path.startIndex} -> ${bestAction.path.endIndex}  [${JSON.stringify(path ? path.path : {})}]`
            );
        }
        // actions.push();
    } else {
        // actions = buildSetupBotMoves(G, ctx, id);
    }

    return bestAction;
}

function buildBotMove(action, data = {}) {
    if (action.type == duelConstants.actionTypes.COMBO) {
        return { 
            move: actionTypeToMoveNameMap()[action.type], 
            args: [action.moveAction.path, action.attackAction.path, data] 
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
// export function buildBotObjectives(initialG, initialCtx) {
// 	if (!initialG.activeXalianIds) {
// 		return [];
// 	}
// 	let initialHealth = duelUtil.getPlayerHealth(initialG);
// 	let objectives = [];
// 	let obj = {
// 		checker: (G, ctx) => {
// 			let resultHealth = duelUtil.getPlayerHealth(G);
// 			let better = resultHealth < initialHealth;
// 			if (better) {
// 				console.log('ayyy');
// 			}
// 			return better;
// 		},
// 		weight: 10,
// 	};
// 	objectives.push(obj);
// 	return objectives;
// }
