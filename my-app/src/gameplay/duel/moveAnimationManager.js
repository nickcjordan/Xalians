import React from 'react';
import * as gameConstants from './duelGameConstants';
import * as duelUtil from '../../utils/duelUtil';
import * as duelCalculator from './duelCalculator';
import * as duelConstants from './duelGameConstants';
import * as boardStateManager from './boardStateManager';
import gsap from 'gsap';
import AttackActionModal from '../../components/games/duel/board/attackActionModal';


function getDiff(pathStartCoord, pathNextCoord, currentCoord) {
    let xStartCoordDiff = currentCoord[0] - pathStartCoord[0];
    let yStartCoordDiff = currentCoord[1] - pathStartCoord[1];
    let xEndCoordDiff = currentCoord[0] - pathNextCoord[0];
    let yEndCoordDiff = currentCoord[1] - pathNextCoord[1];

    let xStartDiff = xStartCoordDiff * 100; // for 100%
    let yStartDiff = yStartCoordDiff * 100;

    let xEndDiff = xEndCoordDiff * 100;
    let yEndDiff = yEndCoordDiff * 100;

    let resp = {
        from: [xStartDiff, yStartDiff],
        to: [xEndDiff, yEndDiff]
    };
    return resp;
}

export function handleMoveAnimation(tl, log, callback, setStateCallback, isLastLog = false) {
    if (log.action && log.action.payload && log.action.payload.args && log.action.payload.args[0]) {

        // if (moveName === 'setPiece') {
            //     // DO SET PIECE ANIMATION
            //     console.log(`setPiece :: `);
            
            //     // get location of original piece
            //     let destIndex = action.payload.args[0];
            //     let xalianId = action.payload.args[1];
            
        //     // get new location
        //     let elem = document.getElementById(`${xalianId}-piece`);
        //     console.log(elem);
        //     // animate from one to the other

        // } else 


        let moveName = log.action.payload.type;
        if (moveName === 'movePiece') {
            let moveAction = log.action.payload.args[0];
            let shouldAnimateAction = !isLastLog || (isLastLog && !moveAction.dragged);
            handleMoveAction(moveAction, tl, log.metadata, callback, shouldAnimateAction);
            

        } else if (moveName === 'doAttack') {
            handleAttackAction(log.action.payload.args[0], tl, log.metadata, callback, setStateCallback);
        }

    }


}

function handleMoveAction(movePath, tl, meta, callback, shouldAnimateAction = true) {
    let moveTl = gsap.timeline();
    // DO MOVE ANIMATION
    // console.log(`movePiece :: `);
    let boardState = meta.startState;

    let moverId = boardState.cells[movePath.startIndex];
    let elem = document.getElementById(`duel-${moverId}-piece`);


    // let dots = document.querySelectorAll(".duel-movable-cell-dot");
    let dots = document.querySelectorAll(".fade-out-animation-on-move");
    if (dots && dots.length > 0) {
        gsap.to(gsap.utils.toArray(dots), { autoAlpha: 0 });
    }

    // gsap.to(gsap.utils.toArray(document.querySelectorAll(".fade-out-animation-on-move")), { autoAlpha: 0 });

    if (shouldAnimateAction) {
        movePath.path.forEach((pathCoord, index, array) => {
            if ((index + 1) < array.length) {
                let pathNext = array[index + 1];
                let diff = getDiff(pathCoord, pathNext, movePath.path[0]);
                moveTl.to(elem,
                    // {xPercent: -(diff.from[0]), yPercent: -(diff.from[1])},
                    { xPercent: -(diff.to[0]), yPercent: -(diff.to[1]), duration: 0.25 }
                );
    
            } else {
                // gsap.to(gsap.utils.toArray(document.querySelectorAll(".fade-out-animation-on-move")), { autoAlpha: 1 });
                moveTl.add(callback, ">");
            }
    
        });
    } else {
        moveTl.add(callback, ">");
    }


    tl.add(moveTl);


}

function handleAttackAction(attackPath, tl, meta, callback, setStateCallback) {
    // DO ATTACK ANIMATION
    // console.log(`doAttack :: `);

    let boardState = meta.startState;
    let attackActionResult = meta.attackActionResult;
    
    let attacker = duelUtil.getXalianFromId(attackActionResult.attackerId, boardState);
    let defender = duelUtil.getXalianFromId(attackActionResult.defenderId, boardState);
    
    let attackerElem = document.getElementById(`duel-${attacker.xalianId}-piece`);
    let attackerStartRect = attackerElem ? attackerElem.getBoundingClientRect() : null;
    let defenderElem = document.getElementById(`duel-${defender.xalianId}-piece`);
    let defenderStartRect = defenderElem ? defenderElem.getBoundingClientRect() : null;

    let isOpponentAttacking = duelUtil.isOpponentPiece(attackActionResult.attackerId, boardState);
    let attackerColor = isOpponentAttacking ? duelConstants.PLAYER_TWO_COLOR : duelConstants.PLAYER_ONE_COLOR;
    let defenderColor = isOpponentAttacking ? duelConstants.PLAYER_ONE_COLOR : duelConstants.PLAYER_TWO_COLOR;

    let attackAnimationData = {
        attacker: attacker,
        defender: defender,
        result: attackActionResult.attackResult,
        attackerColor: attackerColor,
        defenderColor: defenderColor,
        attackerStartRect: attackerStartRect,
        defenderStartRect: defenderStartRect,
        attackingPlayerID: (isOpponentAttacking ? 1 : 0)
    };
    
        setStateCallback({
            showActionModal: true,
            attackAnimationData: attackAnimationData
        });
    
}

