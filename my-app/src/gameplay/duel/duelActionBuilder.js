import * as duelUtil from '../../utils/duelUtil';
import * as duelCalculator from './duelCalculator';
import * as duelConstants from './duelGameConstants';

export const BOT_ACTION_SCORE_FOR_GRABBING_FLAG = 200;
export const BOT_ACTION_SCORE_FOR_HAVING_FLAG_AND_MOVING_TOWARDS_GOAL = 200;
export const BOT_ACTION_SCORE_FOR_HAVING_FLAG_AND_MOVING_INTO_GOAL = 999;
export const BOT_ACTION_SCORE_FOR_MOVING_CORRECT_DIRECTION = 25;
export const BOT_ACTION_SCORE_FOR_ALREADY_IN_CORRECT_DIRECTION = 30;
export const BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_WITH_FLAG = 500;
export const BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_GUARDING_FLAG = 400;


function buildAction(type, score, path) {
    return {
        type: type,
        score: score,
        path: path
    }
}


/* 
==================================================
                ATTACK ACTIONS
==================================================
*/
export function buildAttackActionsWithScore(currentIndex, attacker, G, ctx) {
    let attackablePaths = duelCalculator.calculateAttackablePaths(currentIndex, attacker, G, ctx);
    let attackMoves = [];
    attackablePaths.forEach((path) => {
        let attack = buildAttackAction(attacker, path, G, ctx);

        // add closeness factor of attack so it will be better than combos where the combo is moving away from the flag but attacking same target
        let flagIndex = duelUtil.getOpponentFlagIndex(G);
        let pathToTargetFlag = duelCalculator.calculatePathToTarget(path.startIndex, flagIndex, G, ctx); 
        let flagClosenessFactor = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToTargetFlag.spacesMoved;
        attack.description += `:: RESULTING DISTANCE TO TARGET FLAG : +${flagClosenessFactor}`;
        attack.score += flagClosenessFactor;

        attackMoves.push(attack);
    });
    attackMoves.sort(function (a, b) {
        return a.score < b.score ? -1 : a.score > b.score ? 1 : 0;
    });

    if (attackMoves.length > 0) {
        // console.log();
    }
    return attackMoves.slice(0, 10);
}


function buildAttackAction(attacker, path, G, ctx) {
    let action = buildAction(duelConstants.actionTypes.ATTACK, 0, path);
    var score = 0;
    let defender = duelUtil.getXalianFromId(G.cells[path.endIndex], G);
    let pathToFlagFromDefender = duelCalculator.calculatePathToTarget(path.endIndex, duelUtil.getPlayerFlagIndex(G), G, ctx);

    action.attackerId = attacker.xalianId;
    action.defenderId = defender.xalianId;

    // SCORE :: DEFENDER DISTANCE TO GRABBING TARGET FLAG
    let flagClosenessFactor = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToFlagFromDefender.spacesMoved;
    score += flagClosenessFactor;
    action.description += `:: ENEMY FLAG DISTANCE : +${flagClosenessFactor}`;

    // SCORE :: ESTIMATED DAMAGE TO DEFENDER
    let attackResult = duelCalculator.calculateAttackResult(attacker, defender, G, ctx, true);
    let estimatedDamage = attackResult.damage;
    score += estimatedDamage;
    action.description += `:: ESTIMATED DAMAGE : +${estimatedDamage}`;

    // SCORE :: GO AFTER ENEMY IF THEY HAVE THE FLAG
    if (duelUtil.getPlayerFlagIndex(G) == path.endIndex) {
        score += BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_WITH_FLAG; 
        action.description += `:: ATTACKING ENEMY WITH FLAG : +${BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_WITH_FLAG}`;
    }

     // SCORE :: GO AFTER ENEMY IF THEY ARE GUARDING TARGET FLAG
     if (duelUtil.getOpponentFlagIndex(G) == path.endIndex) {
        score += BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_GUARDING_FLAG; 
        action.description += `:: ATTACKING ENEMY THAT IS GUARDING FLAG : +${BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_GUARDING_FLAG}`;
    }

    // SCORE :: HOW CLOSE THE ENEMY IS TO 0 HEALTH
    let defenderHealthScore = 10 - defender.state.health;
    score += defenderHealthScore;
    action.description += `:: DEFENDER HEALTH : +${defenderHealthScore}`;



    action.score = score;
    return action;
}




/* 
==================================================
                MOVE ACTIONS
==================================================
*/

export function buildMoveActionsWithScore(currentIndex, xalian, paths, G, ctx) {
    let flag = duelUtil.getOpponentFlagState(G);
    let flagIndex = duelUtil.getFlagIndex(flag, G);

    var moveActions = [];
    paths.forEach(path => {

        // buld initial action object with score to be passed along
        let action = buildAction(duelConstants.actionTypes.MOVE, 0, path);
        action.moverId = xalian.xalianId;

        if (action.description == null || action.description == undefined) {
            action.description = "";
        }
        // SCORE :: PROMOTE LONGER DISTANCE MOVES
        action.score += (path.spacesMoved);
        action.description += `:: MOVE DISTANCE : +${path.spacesMoved}`;
        

        // SCORE :: CAPTURE THE FLAG
        if (flag.holder == null && path.endIndex == flagIndex) {
            action.score += BOT_ACTION_SCORE_FOR_GRABBING_FLAG; // high points if capturing the flag
            action.description += `:: FLAG GRAB : +${BOT_ACTION_SCORE_FOR_GRABBING_FLAG}`;
        }

        moveActions.push(action);
    })


    if (flag.holder === xalian.xalianId) {
        // if holding the flag, only score paths towards goal
        scorePathsMovingTowardsGoal(currentIndex, moveActions, G, ctx);
    } else {
        // if not holding the flag, only score paths towards flag
        scorePathsMovingTowardsFlag(currentIndex, moveActions, G, ctx);
    }

    // only return top scores
    moveActions.sort(function (a, b) {
        return (a.score > b.score) ? -1 : (a.score < b.score) ? 1 : 0;
    });
    return moveActions.slice(0, 10);
}

function scorePathsMovingTowardsGoal(currentIndex, moveActions, G, ctx) {
    let grid = duelCalculator.buildGrid(G.cells.length);
    let startCoord = grid.map[currentIndex];
    moveActions.forEach(action => {
        if (action.description == null || action.description == undefined) {
            action.description = "";
        }
        let endCoord = grid.map[action.path.endIndex];
        // SCORE :: DISTANCE TO WINNING WITH FLAG
        let yRowDifference = parseInt(endCoord[1]) - parseInt(startCoord[1]);
        let yRowFactor = (duelConstants.BOARD_COLUMN_SIZE * 2) - yRowDifference;
        action.description += `:: Y ROW DISTANCE FACTOR : +${yRowFactor}`;
        action.score += yRowFactor;

        action.description += `:: BONUS POINTS FOR MOVING TOWARDS GOAL WITH FLAG : +${BOT_ACTION_SCORE_FOR_HAVING_FLAG_AND_MOVING_TOWARDS_GOAL}`;
        action.score += BOT_ACTION_SCORE_FOR_HAVING_FLAG_AND_MOVING_TOWARDS_GOAL;
        
        // SCORE :: WIN THE GAME
        if (endCoord[1] == 0) {
            action.description += `:: BONUS POINTS FOR MOVING INTO GOAL WITH FLAG : +${BOT_ACTION_SCORE_FOR_HAVING_FLAG_AND_MOVING_INTO_GOAL}`;
            action.score += BOT_ACTION_SCORE_FOR_HAVING_FLAG_AND_MOVING_INTO_GOAL;
        }
    })
}

function scorePathsMovingTowardsFlag(currentIndex, actions, G, ctx) {
    var bonus = 1;
    if (!duelUtil.getPlayerFlagState(G).holder) {
        bonus = 1.5;
    }

    let flagIndex = duelUtil.getOpponentFlagIndex(G);
    // let grid = duelCalculator.buildGrid(G.cells.length);
    // let startCoord = grid.map[currentIndex];
    // let flagCoord = grid.map[flagIndex];

    // let startX = parseInt(startCoord[0]);
    // let startY = parseInt(startCoord[1]);
    
    // let flagX = parseInt(flagCoord[0]);
    // let flagY = parseInt(flagCoord[1]);

    actions.forEach(action => {
        if (action.description == null || action.description == undefined) {
            action.description = "";
        }
        // let endCoord = grid.map[action.path.endIndex];
        // let endX = parseInt(endCoord[0]);
        // let endY = parseInt(endCoord[1]);
        // if (isInCorrectDirection(startX, endX, flagX)) {
        //     action.score += BOT_ACTION_SCORE_FOR_MOVING_CORRECT_DIRECTION;
        //     action.description += `:: CORRECT X : +${BOT_ACTION_SCORE_FOR_MOVING_CORRECT_DIRECTION}`;
        // }
        // if (isInCorrectDirection(startY, endY, flagY)) {
        //     action.score += BOT_ACTION_SCORE_FOR_MOVING_CORRECT_DIRECTION;
        //     action.description += `:: CORRECT Y : +${BOT_ACTION_SCORE_FOR_MOVING_CORRECT_DIRECTION}`;
        // }

        // if (startY == flagY) {
        //     action.score += BOT_ACTION_SCORE_FOR_ALREADY_IN_CORRECT_DIRECTION;
        //     action.description += `:: ALREADY X : +${BOT_ACTION_SCORE_FOR_ALREADY_IN_CORRECT_DIRECTION}`;
        // }
        // if (startX == flagX) {
        //     action.score += BOT_ACTION_SCORE_FOR_ALREADY_IN_CORRECT_DIRECTION;
        //     action.description += `:: ALREADY Y : +${BOT_ACTION_SCORE_FOR_ALREADY_IN_CORRECT_DIRECTION}`;
        // }
        // if (startY == endY) {
        //     action.score += 1;
        // }
        // if (startX == endX) {
        //     action.score += 1;
        // }

        let pathToTargetFlag = duelCalculator.calculatePathToTarget(action.path.endIndex, flagIndex, G, ctx); 
        let flagClosenessFactor = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToTargetFlag.spacesMoved;
        action.description += `:: TARGET FLAG : +${flagClosenessFactor}`;
        action.score += flagClosenessFactor;
        // console.log(`PATH SCORE: current: ${startCoord}, middle: ${endCoord}, end: ${flagCoord} ==> ${action.score}`);
    })
}

function isInCorrectDirection(start, end, flag) {
    return (end > start && end < flag) || (end < start && end > flag);
}


/* 
==================================================
                COMBO ACTIONS
==================================================
*/

export function buildComboActionsWithScore(attacker, allPaths, G, ctx) {
    let comboActions = [];
    allPaths.forEach(movePath => {
        let moveAction = buildAction(duelConstants.actionTypes.MOVE, 0, movePath);
        let attackablePaths = duelCalculator.calculateAttackablePaths(movePath.endIndex, attacker, G, ctx);
        attackablePaths.forEach(attackPath => {
            let attackAction = buildAttackAction(attacker, attackPath, G, ctx);
            let comboAction = {
                moveAction: moveAction,
                attackAction: attackAction,
                type: duelConstants.actionTypes.COMBO,
                score: moveAction.score + attackAction.score,
                path: movePath,
                description: "COMBO ==> MOVE: " + movePath.description + " :: ATTACK: " + attackPath.description
            }

            comboActions.push(comboAction);
        });

    });
    comboActions.sort(function (a, b) {
        return a.score < b.score ? -1 : a.score > b.score ? 1 : 0;
    });
    return comboActions.slice(0, 10);
}

