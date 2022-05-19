import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux'
import { decrement, increment } from './counterSlice'
import { addAnimationToQueue, popAnimationOffQueue } from './duelAnimationQueueSlice';
import gsap from 'gsap';
import * as duelCalculator from '../gameplay/duel/duelCalculator';

export function AnimationHub(props) {


    const q = useSelector(state => state.duelAnimationQueue.queue);
    const json = JSON.stringify(q);
    const dispatch = useDispatch();
    AddMostRecentMoveToAnimationQueue(q, props,
        // HandleAnimationsOnQueue
        () => { console.log('finished animation'); }
    );


    return (
        <div>
            <button
                aria-label="Increment value"
                onClick={() => dispatch(addAnimationToQueue("hi"))}
            >
                Increment
            </button>
            <span>{json}</span>
            <button
                aria-label="Decrement value"
                onClick={() => dispatch(decrement())}
            >
                Decrement
            </button>
            <p>
            </p>
        </div>
    )
}

function HandleAnimationsOnQueue(q, props) {
	// const dispatch = useDispatch();
	console.log('added now starting')
    let tl = props.tl;
    while (q.length > 0) {
		let next = q[q.length - 1];
		// dispatch(popAnimationOffQueue());

        // this.setState({isAnimating: true, animationQueue: queue}, () => {
        HandleMoveAnimation(tl, next, props, () => {});
        // });

    }
}

function HandleMoveAnimation(tl, log, props, callback) {
			let action = log.action;

			

				console.log(`ANIMATING :: ${JSON.stringify(action, null, 2)}`);
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

					let x = props.G.cells[path.startIndex];
					let x2 = props.G.cells[path.endIndex];
					console.log();

					let elem = document.getElementById(`duel-${x2}-piece`);
					console.log(elem);
					
					let elemCell = document.getElementById(`cell-${path.startIndex}`);
					// gsap.to(elem, { x: elemCell.offsetLeft, y: elemCell.offsetTop, duration: 2 });
					// gsap.to(elem, { x: 1000, y: 1000, duration: 2 });
					// const s = Flip.getState(`#${elem.id}, #${elemCell.id}`);
					// const s = Flip.getState(`#${elem.id}, #${elem.id}>*`);
					// const s = Flip.getState(`#${elem.id}`);
					// Flip.to(s, {
					// 	duration: 1, 
					// 	ease: "power1.inOut"
					// });

					let grid = duelCalculator.buildGrid();

					
					let coords = [];
					let size = determineCellSize();
					var pathEnd = path.path[path.path.length - 1];

					const getDiff = (pathStartCoord, pathNextCoord, currentCoord, size = 50) => {
						let xStartCoordDiff = currentCoord[0] - pathStartCoord[0];
						let yStartCoordDiff = currentCoord[1] - pathStartCoord[1];
						let xEndCoordDiff = currentCoord[0] - pathNextCoord[0];
						let yEndCoordDiff = currentCoord[1] - pathNextCoord[1];

						let xStartDiff = xStartCoordDiff * size;
						let yStartDiff = yStartCoordDiff * size;

						let xEndDiff = xEndCoordDiff * size;
						let yEndDiff = yEndCoordDiff * size;

						let resp = {
							from: [xStartDiff, yStartDiff],
							to: [xEndDiff, yEndDiff]
						};
						return resp;
					} 

					// const translateToTextForm = (diffVal) => {
					// 	return diffVal < 0 ? `-=${Math.abs(diffVal)}px` : `+=${Math.abs(diffVal)}px`; 
					// }
					// let animations = [];
					path.path.slice(0, path.path.length).forEach((pathCoord, index, array) => {
						// if (coord[0] > start[0]) {
						// 	tl.from(elem, {x: '-=' + size});
						// }

						// if (coord[0] < start[0]) {
						// 	tl.from(elem, {x: '+=' + size});
						// }

						// if (coord[1] > start[1]) {
						// 	tl.from(elem, {y: '-=' + size});
						// }

						// if (coord[1] < start[1]) {
						// 	tl.from(elem, {y: '+=' + size});
						// }
						// start = coord;

						if ((index + 1) <= array.length - 1) {

							let pathStart = pathCoord;
							let pathNext = array[index + 1];
	
							let diff = getDiff(pathStart, pathNext, pathEnd, 100);
							
							tl.fromTo(elem, 
								{xPercent: -(diff.from[0]), yPercent: -(diff.from[1])},
								{xPercent: -(diff.to[0]), yPercent: -(diff.to[1])}
							);
							// animations.push(diff);
						}

					})

					
					// let ind = grid.map[coord[0]][coord[1]];



					// gsap.from(elem, {
					// 	motionPath: [{x:100, y:50}, {x:200, y:0}, {x:300, y:100}],
					// 	transformOrigin: "50% 50%",
					// 	duration: 2,
					// 	ease: "power1.inOut"
					// });
					
					// gsap.from(elem, { x: elemCell.offsetLeft, y: elemCell.offsetTop, duration: 2 });
					// gsap.from(elem, {yPercent: 250});

					console.log(`temp :: `);
				} else if (moveName === 'doAttack') {
					// DO ATTACK ANIMATION
					console.log(`doAttack :: `);
					
				} else if (moveName === 'movePieceThenAttack') {
					// DO COMBO ANIMATION
					console.log(`movePieceThenAttack :: `);
					
				}

				// tl.then( () => {
				// 	if (this.state.animationQueue.length > 0) {
				// 		this.handleNextAnimationFromQueue();
				// 	} else {
				// 		this.setState({isAnimating: false});
				// 	}
				// })
				
				tl.then(callback);


	}


function AddMostRecentMoveToAnimationQueue(q, props, callback) {
    const dispatch = useDispatch();
    if (props.log && props.log.length > 0) {
        let logs = props.log.filter(log => log.action && log.action.type && log.action.type === 'MAKE_MOVE');

        let lastLog = logs[logs.length - 1];
        let lastAction = lastLog.action;


        if (lastAction.payload.type !== 'selectPiece' && lastAction.payload.type !== 'setPiece') {
            // console.log(`ANIMATING :: ${JSON.stringify(lastAction, null, 2)}`);

            let moveId = lastLog.metadata.moveId;
            // let animationQueue = this.state.animationQueue;
            let animationQueue = q;
            var isDuplicate = false;
            animationQueue.forEach(log => {
                if (log.metadata.moveId === moveId) {
                    isDuplicate = true;
                }
            });


            // if (!animationQueue.map( log => log.metadata.moveId).includes(moveId)) {
            // 	animationQueue.splice(0, 0, lastLog);
            // 	this.setState({animationQueue: animationQueue});
            // }

            if (!isDuplicate) {
                // animationQueue.splice(0, 0, lastLog);
                
                dispatch(addAnimationToQueue(lastLog));
                // this.setState({animationQueue: animationQueue}, callback(animationQueue));
                callback(animationQueue, props);
            }

        }


    }
}


function determineCellSize() {
    // if (this.state.size) {
    // 	let windowSize = this.state.size.min;
    // 	let initialSize = Math.floor((windowSize) / duelConstants.BOARD_COLUMN_SIZE);
    // 	let cellSize = Math.floor((windowSize - initialSize) / duelConstants.BOARD_COLUMN_SIZE);
    // 	let maxSize = Math.min(cellSize, 75);
    // 	return maxSize;
    // } else {
    return 75;
    // }
}