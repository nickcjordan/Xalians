import React from 'react';
import * as gameConstants from './duelGameConstants';
import * as duelUtil from '../../utils/duelUtil';
import * as duelCalculator from './duelCalculator';
import * as duelConstants from './duelGameConstants';
import * as boardStateManager from './boardStateManager';
import gsap from 'gsap';

export function handleMoveAnimation(tl, log, callback) {
    let action = log.action;
    let boardState = log.metadata.startState;

    

        let moveName = action.payload.type;
        if (moveName === 'setPiece') {
            // DO SET PIECE ANIMATION
            console.log(`setPiece :: `);
            
            // get location of original piece
            
            let destIndex = action.payload.args[0];
            let xalianId = action.payload.args[1];

            // get new location
            let elem = document.getElementById(`${xalianId}-piece`);
            console.log(elem);
            // animate from one to the other

        } else if (moveName === 'movePiece') {
            // DO MOVE ANIMATION
            console.log(`movePiece :: `);

            let path = action.payload.args[0];

            let x = boardState.cells[path.startIndex];
            // let x2 = boardState.cells[path.endIndex];

            // let elem = document.getElementById(`duel-${x2}-piece`);
            let elem = document.getElementById(`duel-${x}-piece`);
            
            // let elemCell = document.getElementById(`cell-${path.startIndex}`);
            // gsap.to(elem, { x: elemCell.offsetLeft, y: elemCell.offsetTop, duration: 2 });
            // gsap.to(elem, { x: 1000, y: 1000, duration: 2 });
            // const s = Flip.getState(`#${elem.id}, #${elemCell.id}`);
            // const s = Flip.getState(`#${elem.id}, #${elem.id}>*`);
            // const s = Flip.getState(`#${elem.id}`);
            // Flip.to(s, {
            // 	duration: 1, 
            // 	ease: "power1.inOut"
            // });

            // let grid = duelCalculator.buildGrid();

            
            // let coords = [];
            // let size = this.determineCellSize();

            const getDiff = (pathStartCoord, pathNextCoord, currentCoord) => {
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
            let dots = document.querySelectorAll(".duel-movable-cell-dot");
            if (dots) {
                gsap.to(gsap.utils.toArray(dots), { opacity: 0 });
            }

            path.path.forEach((pathCoord, index, array) => {

                if ((index + 1) < array.length) {

                    let pathNext = array[index + 1];

                    let diff = getDiff(pathCoord, pathNext, path.path[0]);
    
                    tl.to(elem, 
                        // {xPercent: -(diff.from[0]), yPercent: -(diff.from[1])},
                        {xPercent: -(diff.to[0]), yPercent: -(diff.to[1])}
                    );
    
                } else {
                    tl.add(callback, ">");
                }

            })


        } else if (moveName === 'doAttack') {
            // DO ATTACK ANIMATION
            console.log(`doAttack :: `);
            // tl.to(elem, )
            // tl.add(callback);
            callback();
            // tl.add(callback, ">");
            
        } else if (moveName === 'movePieceThenAttack') {
            // DO COMBO ANIMATION
            console.log(`movePieceThenAttack :: `);
            // tl.add(callback, ">");
            // tl.add(callback);
            callback();
        }

        // tl.then( () => {
        // 	if (this.state.animationQueue.length > 0) {
        // 		this.handleNextAnimationFromQueue();
        // 	} else {
        // 		this.setState({isAnimating: false});
        // 	}
        // })
        

        // tl.add(callback);


}