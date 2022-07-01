import * as duelUtil from '../../utils/duelUtil';
import * as duelCalculator from './duelCalculator';
import * as duelConstants from './duelGameConstants';

// SCORE :: ACHIEVEMENT
export const BOT_ACTION_SCORE_FOR_GRABBING_FLAG = 200;
export const BOT_ACTION_SCORE_FOR_GUARDING_FLAG = 150;
export const BOT_ACTION_SCORE_FOR_HAVING_FLAG_AND_MOVING_INTO_GOAL = 999;
export const BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_WITH_FLAG = 500;
export const BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_GUARDING_FLAG = 400;

// SCORE :: PROGRESS
export const BOT_ACTION_BONUS_FOR_PROGRESSING_TOWARDS_GUARDING_FLAG = 20;
export const BOT_ACTION_BONUS_FOR_HAVING_FLAG_AND_MOVING_TOWARDS_GOAL = 200;
export const BOT_ACTION_BONUS_FOR_MOVING_CORRECT_DIRECTION = 25;
export const BOT_ACTION_BONUS_FOR_ALREADY_IN_CORRECT_DIRECTION = 30;
export const BOT_ACTION_BONUS_FOR_GETTING_OUT_OF_WAY_OF_TEAM_MEMBER_MOVING_TOWARDS_GOAL = 40;



function buildAction(type, score, path) {
    return {
        type: type,
        score: score,
        path: path,
        description: ''
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

    let flagToRetrieve = duelUtil.getOpponentFlagState(G);
    let flagIndexToRetrieve = duelUtil.getFlagIndex(flagToRetrieve, G);
    let flagToGuard = duelUtil.getPlayerFlagState(G);
    let flagIndexToGuard = duelUtil.getFlagIndex(flagToGuard, G);

    let playerState = ctx.currentPlayer === '0' ? G.playerStates[0] : G.playerStates[1];
    let enemyState = ctx.currentPlayer === '0' ? G.playerStates[1] : G.playerStates[0];

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
    if (flagIndexToGuard == path.endIndex) {
        score += BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_WITH_FLAG; 
        action.description += `:: ATTACKING ENEMY WITH FLAG : +${BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_WITH_FLAG}`;
    }

     // SCORE :: GO AFTER ENEMY IF THEY ARE GUARDING TARGET FLAG
     if (flagIndexToRetrieve == path.endIndex) {
        score += BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_GUARDING_FLAG; 
        action.description += `:: ATTACKING ENEMY THAT IS GUARDING FLAG : +${BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_GUARDING_FLAG}`;
    }

    // SCORE :: HOW CLOSE THE ENEMY IS TO 0 HEALTH
    let defenderHealthScore = duelConstants.MAX_HEALTH_POINTS - defender.state.health;
    score += defenderHealthScore;
    action.description += `:: DEFENDER HEALTH : +${defenderHealthScore}`;

    // SET SCORE TO 0 IF ATTACK IS IMMUNE
    if (attackResult.typeEffectiveness == 0) {
        score = 0;
    }

    action.score = score;
    return action;
}




/* 
==================================================
                MOVE ACTIONS
==================================================
*/

export function buildMoveActionsWithScore(currentIndex, xalian, paths, G, ctx) {
    let flagToRetrieve = duelUtil.getOpponentFlagState(G);
    let flagIndexToRetrieve = duelUtil.getFlagIndex(flagToRetrieve, G);
    let flagToGuard = duelUtil.getPlayerFlagState(G);
    let flagIndexToGuard = duelUtil.getFlagIndex(flagToGuard, G);

    let playerState = ctx.currentPlayer === '0' ? G.playerStates[0] : G.playerStates[1];
    let enemyState = ctx.currentPlayer === '0' ? G.playerStates[1] : G.playerStates[0];

    let xalianIdOnTargetFlagIfAny = G.cells[flagIndexToRetrieve];
    let targetFlagIsOpen = xalianIdOnTargetFlagIfAny ? false : true;
    let targetFlagIsGuardedByEnemy = xalianIdOnTargetFlagIfAny ? enemyState.activeXalianIds.includes[xalianIdOnTargetFlagIfAny] : false;
    let targetFlagIsHeldByTeam = flagToRetrieve.holder ? true : false;
    let isHoldingTargetFlag = flagToRetrieve.holder === xalian.xalianId;
    
    let xalianIdOnTeamFlagIfAny = G.cells[flagIndexToGuard];
    let teamFlagIsOpen = xalianIdOnTeamFlagIfAny ? false : true;
    let teamFlagIsGuardedByTeam = xalianIdOnTeamFlagIfAny ? playerState.activeXalianIds.includes[xalianIdOnTeamFlagIfAny] : false;
    let teamFlagIsHeldByEnemy = flagToGuard.holder ? true : false;
    let isGuardingTeamFlag = currentIndex == flagIndexToGuard;

    var moveActions = [];
    paths.forEach(path => {
        // var disregardPath = false;
        // build initial action object with score to be passed along
        let action = buildAction(duelConstants.actionTypes.MOVE, 0, path);
        action.moverId = xalian.xalianId;

        if (action.description == null || action.description == undefined) {
            action.description = "";
        }
        // APPLY BONUSES AND FILTERS BEFORE SCORING MOVE BASED ON COMPLEX FACTORS

        if (currentIndex == flagIndexToGuard) {
            // STAY PUT GUARDING FLAG
            action.score = 0;
            action.description += `:: CLEARING SCORE BECAUSE I AM GUARDING`;
            // disregardPath = true;
        } 

        if (path.endIndex == flagIndexToGuard) {
            // BONUS :: DEFEND YOUR FLAG
            action.score += BOT_ACTION_SCORE_FOR_GUARDING_FLAG;
            action.description += `:: FLAG GUARD : +${BOT_ACTION_SCORE_FOR_GUARDING_FLAG}`;
        }  
        

        if (targetFlagIsOpen && path.endIndex == flagIndexToRetrieve) {
            // BONUS :: CAPTURE TARGET FLAG
            action.score += BOT_ACTION_SCORE_FOR_GRABBING_FLAG; // high points if capturing the flag
            action.description += `:: FLAG GRAB : +${BOT_ACTION_SCORE_FOR_GRABBING_FLAG}`;
        }

        // if (!disregardPath) {
            moveActions.push(action);
        // }

    })

    if (isHoldingTargetFlag) {
        /*  
        *       1) HOLDING TARGET FLAG
        */
        scorePathsWhenHoldingTargetFlag(currentIndex, moveActions, G, ctx);
    } else if (isGuardingTeamFlag) {
        /* 
        *       2) GUARDING TEAM FLAG
        */
       // dont allow piece to move unless it is the last active
       if (playerState.activeXalianIds.length > 1) {
           moveActions = []; 
       }

        // you could try to find moves where the guarder has enough stamina to move off space to attack then move back to guard

    } else if (teamFlagIsHeldByEnemy) {
        /* 
        *       3) ATTACK ENEMY HOLDING TEAM FLAG
        */
        scorePathsTowardsAttackingEnemyFlagHolder(xalian, flagToGuard.holder, flagIndexToGuard, currentIndex, moveActions, G, ctx);
    } else if (targetFlagIsHeldByTeam) {
        /* 
        *       4) MAKE PROGRESS TOWARDS MOST EFFECTIVE ATTACK && STAY OUT OF PATH OF TEAM'S FLAG HOLDER 
        *           - FIND ENEMY WITH HIGHEST ATTACK EFFECTIVENESS
        *           - IF NOT IN THE WAY OF YOUR TEAM, MOVE TOWARDS ATTACKING THAT PIECE
        */
        scorePathsGettingOutOfTheWayOfFlagHolder(xalian, flagIndexToRetrieve, currentIndex, moveActions, G, ctx);
    } else if (teamFlagIsOpen) {
        /* 
        *       5) MAKE PROGRESS TOWARDS PROTECTING TEAM FLAG
        *            - SCORE MOVE BASED ON HOW CLOSE THE PIECE IS TO GUARD FLAG
        *            
        */
        scorePathsMovingTowardsTeamFlag(flagIndexToGuard, moveActions, G, ctx);
    } else {
        /* 
        *       6) MAKE PROGRESS TOWARDS GRABBING TARGET FLAG
        *            - SCORE MOVE BASED ON HOW CLOSE THE PIECE IS TO TARGET FLAG
        *            - IF TARGET IS GUARDED:
        *               -- ADD BONUS POINTS FOR HOW EFFECTIVE THE ATTACKER IS AGAINST DEFENDER
        *               -- MAKE SURE ATTACKER IS NOT IMMUNE TO DEFENDER
        *            
        */
        scorePathsMovingTowardsTargetFlag(flagIndexToRetrieve, moveActions, G, ctx);
    } 

    // only return top scores
    moveActions.sort(function (a, b) {
        return (a.score > b.score) ? -1 : (a.score < b.score) ? 1 : 0;
    });
    // return moveActions.slice(0, 10);
    return moveActions.slice(0, 5);
}

function scorePathsWhenHoldingTargetFlag(currentIndex, moveActions, G, ctx) {
    let grid = duelCalculator.buildGrid(G.cells.length);
    let startCoord = grid.map[currentIndex];
    moveActions.forEach(action => {
        if (action.description == null || action.description == undefined) {
            action.description = "";
        }
        let endCoord = grid.map[action.path.endIndex];
        // SCORE :: DISTANCE TO WINNING WITH FLAG
        let yRowDifference = parseInt(endCoord[1]) - parseInt(startCoord[1]);
        // let yRowFactor = (duelConstants.BOARD_COLUMN_SIZE * 2) - yRowDifference;
        let yRowFactor = yRowDifference;
        action.description += `:: Y ROW DISTANCE FACTOR : +${yRowFactor}`;
        action.score += yRowFactor;

        action.description += `:: BONUS POINTS FOR MOVING TOWARDS GOAL WITH FLAG : +${BOT_ACTION_BONUS_FOR_HAVING_FLAG_AND_MOVING_TOWARDS_GOAL}`;
        action.score += BOT_ACTION_BONUS_FOR_HAVING_FLAG_AND_MOVING_TOWARDS_GOAL;

        duelUtil.getOpponentStartingIndices(G).forEach( i => {
            let startingPathToScoreZone = duelCalculator.calculatePathToTarget(action.path.startIndex, i, G, ctx);
            let endingPathToScoreZone = duelCalculator.calculatePathToTarget(action.path.endIndex, i, G, ctx);
            if (endingPathToScoreZone.spacesMoved < startingPathToScoreZone.spacesMoved) {
                let bonus = (duelConstants.BOARD_COLUMN_SIZE * 2) - endingPathToScoreZone.spacesMoved;
                action.description += `:: BONUS POINTS FOR PATH RESULTING DISTANCE FROM SCORING WITH FLAG : +${bonus}`;
                action.score += bonus;
            }
        });
        
        // SCORE :: WIN THE GAME
        if (endCoord[1] == 0) {
            action.description += `:: BONUS POINTS FOR MOVING INTO GOAL WITH FLAG : +${BOT_ACTION_SCORE_FOR_HAVING_FLAG_AND_MOVING_INTO_GOAL}`;
            action.score += BOT_ACTION_SCORE_FOR_HAVING_FLAG_AND_MOVING_INTO_GOAL;
        }
    })
}

function scorePathsGettingOutOfTheWayOfFlagHolder(turnXalian, flagIndexToRetrieve, currentIndex, moveActions, G, ctx) {
    let grid = duelCalculator.buildGrid(G.cells.length);
    let currentFlagHolderCoord = grid.map[flagIndexToRetrieve];

    moveActions.forEach(action => {
        if (action.description == null || action.description == undefined) {
            action.description = "";
        }
        let currentCoord = grid.map[currentIndex];
        if (currentFlagHolderCoord[1] == currentCoord[1]) {
            // SCORE :: GET OUT OF THE WAY OF FLAG HOLDER
            action.description += `:: BONUS TO HELP GET OUT OF THE WAY OF TEAM MEMBER : +${BOT_ACTION_BONUS_FOR_GETTING_OUT_OF_WAY_OF_TEAM_MEMBER_MOVING_TOWARDS_GOAL}`;
            action.score += BOT_ACTION_BONUS_FOR_GETTING_OUT_OF_WAY_OF_TEAM_MEMBER_MOVING_TOWARDS_GOAL;
        }
        
        let endCoord = grid.map[action.path.endIndex];
        if (currentFlagHolderCoord[1] == endCoord[1]) {
            // SCORE :: DO NOT GET IN WAY OF FLAG HOLDER
            action.description += `:: CLEARING SCORE (would get in the way of team member with flag)`;
            action.score = 0;
        } else {
            // find enemy with best attack effectiveness
            let effectivenessTowardsEnemy = [];
            G.playerStates[0].activeXalianIds.forEach(enemyXalianId => {
                let enemyXalian = duelUtil.getXalianFromId(enemyXalianId, G);
                let attackEffectiveness = duelCalculator.calculateTypeEffectiveness(turnXalian, enemyXalian, false);
                effectivenessTowardsEnemy.push({ enemyXalian: enemyXalian, attackEffectiveness: attackEffectiveness});
            })
            effectivenessTowardsEnemy.sort(function (a, b) {
                return (a.attackEffectiveness > b.attackEffectiveness) ? -1 : (a.attackEffectiveness < b.attackEffectiveness) ? 1 : 0;
            });
            let mostEffectiveEnemyTO = effectivenessTowardsEnemy[0];
            if (mostEffectiveEnemyTO) {
                let enemyXalian = mostEffectiveEnemyTO.enemyXalian;
                let enemyXalianIndex = duelUtil.getIndexOfXalian(enemyXalian.xalianId, G);
                // score piece based on how far away this is
                let pathToEnemy = duelCalculator.calculatePathToTarget(action.path.endIndex, enemyXalianIndex, G, ctx);
                let enemyClosenessFactor = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToEnemy.spacesMoved;
                // SCORE :: DO NOT GET IN WAY OF FLAG HOLDER
                action.description += `:: CLOSENESS FACTOR OF MOVING TOWARDS ENEMY: +${enemyClosenessFactor}`;
                action.score += enemyClosenessFactor;
            }
        }

    })
}

function scorePathsTowardsAttackingEnemyFlagHolder(turnXalian, enemyXalianId, flagIndexToGuard, currentIndex, moveActions, G, ctx) {
    let enemyXalian = duelUtil.getXalianFromId(enemyXalianId, G);
    moveActions.forEach(action => {
        if (action.description == null || action.description == undefined) {
            action.description = "";
        }

        
        let pathToEnemy = duelCalculator.calculatePathToTarget(action.path.endIndex, flagIndexToGuard, G, ctx);
        let enemyClosenessFactor = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToEnemy.spacesMoved;

        // SCORE :: MOVE TOWARDS ENEMY WITH FLAG
        action.description += `:: CLOSENESS FACTOR OF MOVING TOWARDS ENEMY WITH FLAG: +${enemyClosenessFactor}`;
        action.score += enemyClosenessFactor;
        
        let attackEffectiveness = duelCalculator.calculateTypeEffectiveness(turnXalian, enemyXalian, false);
        let attackEffectivenessBonus = attackEffectiveness * 2;
        // SCORE :: BONUS FOR EFFECTIVENESS OF ATTACK
        action.description += `:: BONUS FOR EFFECTIVENESS OF ATTACK ON ENEMY WITH FLAG: +${attackEffectivenessBonus}`;
        action.score += attackEffectivenessBonus;

        // SCORE :: CLEAR SCORE IF DEFENDER IS IMMUNE
        if (attackEffectiveness == 0) {
            action.description += `:: CLEAR SCORE BECAUSE DEFENDER IS IMMUNE! `;
            action.score = 0;
        }

    })
}

function scorePathsMovingTowardsTargetFlag(flagIndex, actions, G, ctx) {
    actions.forEach(action => {
        if (action.description == null || action.description == undefined) {
            action.description = "";
        }

        let pathToTargetFlagFromMoveStart = duelCalculator.calculatePathToTarget(action.path.startIndex, flagIndex, G, ctx); 
        let pathToTargetFlagFromMoveResult = duelCalculator.calculatePathToTarget(action.path.endIndex, flagIndex, G, ctx); 
        let flagClosenessFactorFromStart = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToTargetFlagFromMoveStart.spacesMoved;
        let flagClosenessFactorFromEnd = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToTargetFlagFromMoveResult.spacesMoved;
        let progressTowardsFlag = flagClosenessFactorFromEnd - flagClosenessFactorFromStart;
        if (flagIndex != action.endIndex) {
            action.description += `:: PROGRESS TOWARDS TARGET FLAG : +${progressTowardsFlag}`;
            action.score += progressTowardsFlag;
        }
        // console.log(`PATH SCORE: current: ${startCoord}, middle: ${endCoord}, end: ${flagCoord} ==> ${action.score}`);
    })
}

function scorePathsMovingTowardsTeamFlag(flagIndex, actions, G, ctx) {
    actions.forEach(action => {
        if (action.description == null || action.description == undefined) {
            action.description = "";
        }

        let pathToTargetFlagFromMoveStart = duelCalculator.calculatePathToTarget(action.path.startIndex, flagIndex, G, ctx); 
        let pathToTargetFlagFromMoveResult = duelCalculator.calculatePathToTarget(action.path.endIndex, flagIndex, G, ctx); 
        // let flagClosenessFactorFromStart = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToTargetFlagFromMoveStart.spacesMoved;
        let flagClosenessFactorFromEnd = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToTargetFlagFromMoveResult.spacesMoved;
        // let progressTowardsFlag = flagClosenessFactorFromEnd - flagClosenessFactorFromStart;
        if (flagIndex != action.path.endIndex) {
            action.description += `:: PROGRESS TOWARDS TEAM FLAG : +${flagClosenessFactorFromEnd}`;
            action.score += flagClosenessFactorFromEnd;
        } else {
            let shortestMoveBonus = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToTargetFlagFromMoveStart.spacesMoved;
            action.description += `:: QUICKEST PATH TOWARDS TEAM FLAG : +${shortestMoveBonus}`;
            action.score += shortestMoveBonus;
        }
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

export function buildComboActionsWithScore(currentIndex, attacker, allPaths, G, ctx) {
    let flagToRetrieve = duelUtil.getOpponentFlagState(G);
    let flagIndexToRetrieve = duelUtil.getFlagIndex(flagToRetrieve, G);
    let flagToGuard = duelUtil.getPlayerFlagState(G);
    let flagIndexToGuard = duelUtil.getFlagIndex(flagToGuard, G);

    let comboActions = [];
    // move then attack

    let moveActions = buildMoveActionsWithScore(currentIndex, attacker, allPaths, G, ctx);

    moveActions.forEach(moveAction => {
        let movePath = moveAction.path;
        if (flagIndexToGuard != movePath.startIndex && flagIndexToRetrieve != movePath.startIndex) {


            /* ATTACK THEN MOVE DOEST WORK!!
                 logic is wrong: combo will always be picked if it is double points
                 example:
                    - x1's moves are attack a xalian then make a move => not a good attack, not a good move
                    - x2's moves are attack a xalian => great attack
                        --> how do you compare the value of the 2 moves?? 
                        --> desired outcome: x2 attack and x1 move ???

            */



            // ATTACK then MOVE 
            //      build combo move with attack actions from starting index of move path
            // buildAttackActionsWithScore(movePath.startIndex, attacker, G, ctx).forEach( attackAction => {
            //     comboActions.push({
            //         moveAction: moveAction,
            //         attackAction: attackAction,
            //         firstAction: attackAction,
            //         type: duelConstants.actionTypes.COMBO,
            //         score: moveAction.score + attackAction.score,
            //         path: movePath,
            //         description: "COMBO ==> ATTACK THEN MOVE ==>  ATTACK: " + attackAction.description + " :::: MOVE: " + moveAction.description
            //     });
            // });





            // MOVE then ATTACK 
            //      build combo move with attack actions from ending index of move path
            buildAttackActionsWithScore(movePath.endIndex, attacker, G, ctx).forEach( attackAction => {
                comboActions.push({
                    moveAction: moveAction,
                    attackAction: attackAction,
                    type: duelConstants.actionTypes.COMBO,
                    score: moveAction.score + attackAction.score,
                    path: movePath,
                    description: "COMBO ==> MOVE THEN ATTACK ==> MOVE: " + moveAction.description + " :::: ATTACK: " + attackAction.description
                });
            })


        }

    });

    // attack then move
    // allPaths.forEach(movePath => {
    //     if (flagIndexToGuard != movePath.startIndex && flagIndexToRetrieve != movePath.startIndex) {
    //         let moveAction = buildAction(duelConstants.actionTypes.MOVE, 0, movePath);
    //         let attackablePaths = duelCalculator.calculateAttackablePaths(movePath.startIndex, attacker, G, ctx);
    //         attackablePaths.forEach(attackPath => {
    //             let attackAction = buildAttackAction(attacker, attackPath, G, ctx);
    //             let comboAction = {
    //                 moveAction: moveAction,
    //                 attackAction: attackAction,
    //                 type: duelConstants.actionTypes.COMBO,
    //                 score: moveAction.score + attackAction.score,
    //                 path: movePath,
    //                 description: "COMBO ==> MOVE: " + moveAction.description + " :: ATTACK: " + attackAction.description
    //             }

    //             comboActions.push(comboAction);
    //         });
    //     }

    // });


    
    comboActions.sort(function (a, b) {
        return a.score < b.score ? -1 : a.score > b.score ? 1 : 0;
    });
    return comboActions.slice(0, 10);
}

