import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';
import * as gameConstants from '../../../../gameplay/duel/duelGameConstants';
import XalianImage from '../../../xalianImage';
import * as duelUtil from '../../../../utils/duelUtil';
import * as duelCalculator from '../../../../gameplay/duel/duelCalculator';
import * as boardStateManager from '../../../../gameplay/duel/boardStateManager';
import * as duelConstants from '../../../../gameplay/duel/duelGameConstants';
import { ReactComponent as DuelFlagIcon } from '../../../../svg/games/duel/duel_flag_icon.svg';
import { ReactComponent as AttackRangePatternSVG } from '../../../../svg/patterns/hideout.svg';
import species from '../../../../json/species.json';
import { Hub } from "aws-amplify";
import XalianTypeSymbolBadge from './xalianTypeSymbolBadge';
import DuelXalianSuggestionDetails from './duelXalianSelectionDetails';
import XalianDuelStatBadge from './xalianDuelStatBadge';
import AttackableMoveBadge from './attackableMoveBadge';
import * as svgUtil from '../../../../utils/svgUtil';
import { ReactComponent as AttackIcon } from '../../../../svg/games/duel/duel_attack_icon.svg';


import gsap from 'gsap';
import Draggable from 'gsap/Draggable';
import Flip from 'gsap/Flip';
import XalianPieceStateChart from './xalianPieceStateChart';
gsap.registerPlugin(Draggable, Flip);

class DuelBoardCell extends React.Component {
	state = {
		contentLoaded: false,
	};

	componentDidMount() {
		// document.addEventListener('DOMContentLoaded', this.setAsDraggable);
		// this.setDraggables();
	}

	componentDidUpdate(prevProps, prevState) {
		this.setDraggables();
		// if (this.props.ctx.turn < 3 && this.props.isActive && (prevProps.ctx.turn < this.props.ctx.turn)) {
		// 	this.doFadesAfterMove();
		// }
	}

	doFadesAfterMove = () => {
		var allCellElems = document.querySelectorAll(".duel-board-cell");
		const cellState = Flip.getState(allCellElems, { props: "background,filter,opacity,backgroundColor" });
		boardStateManager.clearVisualsForAllCells(allCellElems);
		Flip.from(cellState);
	}

	



	setDraggables = () => {
		let xalianId = this.props.boardState.cells[this.props.cellIndex];
		let isCurrentTurnXalian = xalianId ? duelUtil.isCurrentTurnsXalian(xalianId, this.props.boardState, this.props.ctx) : false;
		let cellXalian = xalianId ? duelUtil.getXalianFromIdAndXalians(xalianId, this.props.G.xalians) : null;
		var movablePaths = [];
		var attackablePaths = [];
		var movableCellElems = [];
		if (cellXalian) {
			attackablePaths = duelCalculator.calculateAttackablePaths(this.props.cellIndex, cellXalian, this.props.boardState, this.props.ctx);
			movablePaths = duelCalculator.calculateMovablePaths(this.props.cellIndex, cellXalian, this.props.boardState, this.props.ctx);
			if (movablePaths) {
				movableCellElems = this.getCellElements(movablePaths);
			} else {
				movablePaths = [];
			}
		}
		if (isCurrentTurnXalian) {

			let elemId = '.duel-' + xalianId + '-piece';
			// let elemId = "#ghost-xalian-on-drag-" + xalianId;

			//the overlapThreshold can be a percentage ("50%", for example, would only trigger when 50% or more of the surface area of either element overlaps) or a number of pixels (20 would only trigger when 20 pixels or more overlap), or 0 will trigger when any part of the two elements overlap.
			var overlapThreshold = "50%";

			// var allCellElems = document.querySelectorAll(".duel-unoccupied-cell");
			var allCellElems = document.querySelectorAll(".duel-board-cell");
			var snappablePoints = [];
			let grid = duelCalculator.buildGrid();
			let startCoord = grid.map[this.props.cellIndex];
			snappablePoints.push({ x: 0, y: 0 });
			// if (this.props.selectedXalianMovableIndices) {
			if (movablePaths.length > 0) {
				// this.props.selectedXalianMovableIndices.forEach( i => {
				let indices = movablePaths.map(path => path.endIndex);
				indices.forEach(i => {
					let movableCoord = grid.map[i];
					let diffX = movableCoord[0] - startCoord[0];
					let diffY = movableCoord[1] - startCoord[1];
					let diffPxX = diffX * this.props.cellSize;
					let diffPxY = diffY * this.props.cellSize;
					snappablePoints.push({
						x: diffPxX,
						y: diffPxY
					});
				})
			}
			console.log("DRAGGABLES CREATED");
			Draggable.create(elemId, {
				type: "x,y",
				edgeResistance: 1,
				bounds: ".duel-board-wrapper",
				minimumMovement: 6,
				// dragClickables: true,
				// allowEventDefault: true,
				// inertia: true,
				// liveSnap: true,
				liveSnap: {
					points: snappablePoints,
					radius: 0
				},
				
				// onPressParams: [this.props],
				// onPress: function (props) {
				// 	// let cellElems = getCellElements(movablePaths);
				// 	// const cellState = Flip.getState(movableCellElems, { props: "background,filter" });
				// 	// movableCellElems.forEach(elem => {
				// 	// 	if (elem.childNodes) {
				// 	// 		elem.childNodes.forEach(childElem => {
				// 	// 			if (childElem.classList.contains('duel-board-cell-dot') && !childElem.classList.contains('duel-board-cell-dot-light')) {
				// 	// 				// childElem.classList.toggle('duel-board-cell-dot-light-faded');
				// 	// 				childElem.classList.toggle('duel-board-cell-dot-dark');
				// 	// 				childElem.classList.toggle('duel-board-cell-dot-light');
				// 	// 			}
				// 	// 		})
				// 	// 	}
				// 	// });
				// 	// Flip.from(cellState);

				// 	let target = this.target;
				// 	let draggingXalianId = duelUtil.extractXalianId(target.id);
				// 	let draggingXalian = duelUtil.getXalianFromId(draggingXalianId, props.boardState);
				// 	let draggingXalianStartingCellIndex = duelUtil.getIndexOfXalian(draggingXalianId, props.boardState);
					
				// 	let movablePathsFromStartingSpot = duelCalculator.calculateMovablePaths(draggingXalianStartingCellIndex, draggingXalian, props.boardState, props.ctx);
				// 	let movableIndicesFromStartingSpot = movablePathsFromStartingSpot.map(p => (p.endIndex));
					
				// 	let attackablePathsFromHoverSpot = duelCalculator.calculateAttackablePaths(draggingXalianStartingCellIndex, draggingXalian, props.boardState, props.ctx, false);
				// 	let attackableIndicesFromHoverSpot = attackablePathsFromHoverSpot.map(p => (p.endIndex));


				// 	const cellState = Flip.getState(allCellElems, { props: "background,filter,opacity,backgroundColor" });
				// 	// allCellElems.forEach(cellElem => {
				// 	// 	if (cellElem.childNodes) {
				// 	// 		let cellIndex = parseInt(cellElem.id.replace('cell-', ''));
				// 	// 		let idOfXalianInCell = props.boardState.cells[cellIndex];

							



				// 	// 		cellElem.childNodes.forEach(childElem => {

				// 	// 			// set dot correctly
				// 	// 			if (childElem.classList.contains('duel-board-cell-dot')) {
				// 	// 				if (movableIndicesFromStartingSpot.includes(cellIndex)) {
				// 	// 					childElem.classList.remove('duel-board-cell-dot-dark');
				// 	// 					childElem.classList.add('duel-board-cell-dot-light');
				// 	// 				} else {
				// 	// 					childElem.classList.add('duel-board-cell-dot-dark');
				// 	// 					childElem.classList.remove('duel-board-cell-dot-light');
				// 	// 				}
				// 	// 			}

				// 	// 			// set attack circle correctly
				// 	// 			if (childElem.classList.contains('attack-pattern-background-selected')) {
				// 	// 				if (attackableIndicesFromHoverSpot.includes(cellIndex)) {
				// 	// 					childElem.style.opacity = 1;
				// 	// 				} else {
				// 	// 					childElem.style.opacity = 0;
				// 	// 				}
				// 	// 			}
								


				// 	// 		})
				// 	// 	}
				// 	// });
				// 	boardStateManager.setVisualsForAllCells(props.boardState, allCellElems, movableIndicesFromStartingSpot, attackableIndicesFromHoverSpot, draggingXalianId, draggingXalianStartingCellIndex);
				// 	Flip.from(cellState);
				// },
				onDragStartParams: [this.props],
				onDragStart: function (props) {
					// gsap.to(this.target, { opacity: 0.2, scale: 1.2 });
					
					let elemId = this.target.id;
					let draggingXalianId = duelUtil.extractXalianId(elemId);
					
					let ghostElemId = "ghost-xalian-on-drag-" + draggingXalianId;
					let ghostElem = document.getElementById(ghostElemId);
					
					gsap.to(ghostElem, { opacity: 0.75});
					gsap.to(this.target, { opacity: 0.25, scale: 1.2});

				},
				onDragParams: [this.props],
				onDrag: function (props) {
					const cellState = Flip.getState(allCellElems, { props: "background,filter,opacity,backgroundColor" });
				
					let target = this.target;
					let draggingXalianId = duelUtil.extractXalianId(target.id);
					let draggingXalian = duelUtil.getXalianFromId(draggingXalianId, props.boardState);
					let draggingXalianStartingCellIndex = duelUtil.getIndexOfXalian(draggingXalianId, props.boardState);
					
					let movablePathsFromStartingSpot = duelCalculator.calculateMovablePaths(draggingXalianStartingCellIndex, draggingXalian, props.boardState, props.ctx);
					let movableIndicesFromStartingSpot = movablePathsFromStartingSpot.map(p => (p.endIndex));

					var attackablePathsFromHoverSpot = [];
					let attackableIndicesFromHoverSpot = [];
					
					var hoverCellElem = null;
					var hoverCellIndex = null;
					allCellElems.forEach(cellElem => { 
						if (this.hitTest(cellElem, overlapThreshold)) { // is hovering over cell
							hoverCellElem = cellElem;
							hoverCellIndex = parseInt(hoverCellElem.id.replace('cell-', ''));
							// if (!cellElem.classList.contains('duel-piece-draggable-hovering')) {
								// cellElem.classList.add('duel-piece-draggable-hovering');
							// }
						} else {
							// if (cellElem.classList.contains('duel-piece-draggable-hovering')) {
								// cellElem.classList.remove('duel-piece-draggable-hovering');
							// }
						}
					})

					if (hoverCellIndex) {
						attackablePathsFromHoverSpot = duelCalculator.calculateAttackablePaths(hoverCellIndex, draggingXalian, props.boardState, props.ctx, false);
						attackableIndicesFromHoverSpot = attackablePathsFromHoverSpot.map(p => (p.endIndex));
					}

					boardStateManager.setVisualsForAllCells(props.boardState, allCellElems, movableIndicesFromStartingSpot, attackableIndicesFromHoverSpot, draggingXalianId, hoverCellIndex);
					
					Flip.from(cellState);
				},
				onDragEndParams: [this.props],
				onDragEnd: function (props) {
					let elemId = this.target.id;
					let draggingXalianId = duelUtil.extractXalianId(elemId);
					
					let ghostElemId = "ghost-xalian-on-drag-" + draggingXalianId;
					let ghostElem = document.getElementById(ghostElemId);
					
					gsap.to(ghostElem, { opacity: 0.5});
					gsap.to(this.target, { opacity: 1, scale: 1});

					if (this.endX == 0 && this.endY == 0) { // select or unselect xalian
						document.getElementById(`cell-${props.cellIndex}`).classList.remove("duel-piece-draggable-hovering");
						props.handleActivePieceSelection(cellXalian, props.cellIndex, props.boardState);
					} else { // move xalian
						movableCellElems.forEach(elem => {
							let cellIndex = parseInt(elem.id.replace('cell-', ''));
							if (this.hitTest(elem, overlapThreshold)) { // found cell attempting to drop on
								let path = movablePaths.filter(p => (p.endIndex == cellIndex))[0];
								path.dragged = true;
								props.makeMoveToCell(path, props.boardState);
								// props.moves.movePiece(path);


							}
						})
					}

					const cellState = Flip.getState(allCellElems, { props: "background,filter,opacity,backgroundColor" });
					boardStateManager.clearVisualsForAllCells(allCellElems);
					Flip.from(cellState);

				},
				// onReleaseParams: [this.props],
				// onRelease: function (props) {
				// 	let elemId = this.target.id;
				// 	let draggingXalianId = duelUtil.extractXalianId(elemId);
				// 	let startCellElem = document.getElementById('cell-' + props.cellIndex);
				// 	const cellState = Flip.getState(allCellElems, { props: "background,filter,opacity,backgroundColor" });
				// 	// if (startCellElem) {
				// 	// 	startCellElem.childNodes.forEach(childElem => {
				// 	// 		if (childElem.classList.contains('duel-piece-draggable-hovering')) {
				// 	// 			childElem.classList.add('duel-board-cell-dot-dark');
				// 	// 			childElem.classList.remove('duel-board-cell-dot-light');
				// 	// 			childElem.classList.remove('duel-piece-draggable-hovering');
				// 	// 		}
				// 	// 	})
				// 	// }

				// 	boardStateManager.clearVisualsForAllCells(allCellElems);
				// 	Flip.from(cellState);
				// }


			});
		} else {
			console.log();
		}
	}



	getCellElements = (movablePaths) => {
		let cellElems = [];
		movablePaths.forEach(movePath => {
			let e = document.getElementById(`cell-${movePath.endIndex}`);
			if (e) {
				cellElems.push(e);
			}
		});
		return cellElems;
	}
	

	buildUnoccupiedCell() {
		let isMovableBySelectedXalian = this.props.selectedXalianMovableIndices && this.props.selectedXalianMovableIndices.includes(this.props.cellIndex);
		let isAttackableBySelectedXalian = this.props.selectedXalianId && this.props.selectedXalianAttackableIndices && this.props.selectedXalianAttackableIndices.includes(this.props.cellIndex);
		let isAttackIndicatorVisible = (isAttackableBySelectedXalian && !this.props.boardState.currentTurnDetails.hasAttacked);
		let attackIndicatorVisibilityClass = isAttackIndicatorVisible ? '' : 'invisible-attack-indicator';
		let attackIndicatorVisibility = isAttackIndicatorVisible ? 1 : 0;
		
		let isMovableByReferencedXalian = this.props.referencedXalianMovableIndices && this.props.referencedXalianMovableIndices.includes(this.props.cellIndex);
		// let isMovableByReferencedXalian = isMovableBySelectedXalian && !duelUtil.isCurrentTurnsXalian(this.props.selectedXalianId, this.props.boardState, this.props.ctx);
		let isAttackableByReferencedXalian = this.props.referencedXalianAttackableIndices && this.props.referencedXalianAttackableIndices.includes(this.props.cellIndex);

		let cellSizeWithUnits = `${this.props.cellSize}px`;
		let sty = { border: 0, position: 'relative', width: cellSizeWithUnits, height: cellSizeWithUnits, lineHeight: cellSizeWithUnits, textAlign: 'center' };
		let grid = duelCalculator.buildGrid();
		let shouldConnectCellLeft = this.shouldConnectToEmptyCellLeft(grid, this.props.cellIndex);
		let shouldConnectCellTop = this.shouldConnectToEmptyCellTop(grid, this.props.cellIndex);


		let isPlayerFlagIndex = duelUtil.getPlayerFlagIndex(this.props.boardState) == this.props.cellIndex;
		let isOpponentFlagIndex = duelUtil.getOpponentFlagIndex(this.props.boardState) == this.props.cellIndex;
		let flagIfPresent = isPlayerFlagIndex ? <DuelFlagIcon className="duel-flag" style={{ fill: duelConstants.PLAYER_ONE_COLOR }} /> : isOpponentFlagIndex ? <DuelFlagIcon className="duel-flag" style={{ fill: duelConstants.PLAYER_TWO_COLOR }} /> : null;

		let classForCellDot = 	(!isMovableBySelectedXalian && !isMovableByReferencedXalian) ? "duel-board-cell-dot duel-board-cell-dot-dark" :
								(isMovableByReferencedXalian && !isMovableBySelectedXalian) ? "duel-board-cell-dot duel-board-cell-dot-light-faded fade-out-animation-on-move" :
								isMovableBySelectedXalian ? "duel-board-cell-dot duel-board-cell-dot-light fade-out-animation-on-move" : '';
		return (<React.Fragment>
			{/* BOX FOR CELL CONNECTORS */}
			<div className='' style={{width: cellSizeWithUnits, height: cellSizeWithUnits, lineHeight: cellSizeWithUnits, position: 'absolute'}} >
				<div className="duel-board-cell-connector unoccupied-cell-connector" style={{ opacity: shouldConnectCellLeft ? 0.1 : 0, width: cellSizeWithUnits, height: '5px', top: '50%', left: '0' }} />
				<div className="duel-board-cell-connector unoccupied-cell-connector" style={{ opacity: shouldConnectCellTop ? 0.1 : 0, width: '5px', height: cellSizeWithUnits, top: '0', left: '50%' }} />
			</div>
			<div className='duel-unoccupied-cell duel-board-cell' id={`cell-${this.props.cellIndex}`} style={sty} onClick={() => this.props.handleEmptyCellSelection(this.props.cellIndex, this.props.boardState)}>
				<h6 style={{ position: 'absolute', color: '#9e9e9e2c' }} >{this.props.cellIndex}</h6>

				{/* ATTACK INDICATOR */}
				{/* <div className='duel-cell-style-covered attack-pattern-background attack-pattern-background-selected fade-out-animation-on-move' style={{ visibility: isAttackIndicatorVisible ? 'visible' : 'hidden', backgroundColor: '#9700002c', height: cellSizeWithUnits, width: cellSizeWithUnits, transformOrigin: 'center', transform: 'rotate(90deg)', backgroundImage: svgUtil.getStripedBackgroundImage('#ff0000', 0.5) }} ></div> */}
				{/* {isAttackIndicatorVisible &&  */}
					<div className='duel-cell-style-covered attack-pattern-background attack-pattern-background-selected ' style={{opacity: attackIndicatorVisibility, height: cellSizeWithUnits, width: cellSizeWithUnits, backgroundImage: svgUtil.getStripedBackgroundImage('#ff0000', 0.5) }} ></div>
					{/* <div className={'duel-cell-style-covered attack-pattern-background attack-pattern-background-selected ' + attackIndicatorVisibilityClass} style={{backgroundColor: '#9700002c', height: cellSizeWithUnits, width: cellSizeWithUnits, transformOrigin: 'center', transform: 'rotate(90deg)', backgroundImage: svgUtil.getStripedBackgroundImage('#ff0000', 0.5) }} ></div> */}
				{/* } */}
				
				{/* REFERENCED XALIAN ATTACK INDICATOR */}
				{isAttackableByReferencedXalian &&
					<div className='duel-cell-style-covered attack-pattern-background attack-pattern-background-referenced fade-out-animation-on-move' style={{height: cellSizeWithUnits, width: cellSizeWithUnits, backgroundImage: svgUtil.getStripedBackgroundImage('#c05c5c', 0.25) }} ></div>
				}


				


					<div className={classForCellDot} />

				{flagIfPresent}

				{/* {attackAnimation} */}

			</div>
			</React.Fragment>);
	}

	// getReferencedXalian = () => {
	// 	return this.props.referencedXalianId ? duelUtil.getXalianFromIdAndXalians(this.props.referencedXalianId, this.props.G.xalians) : null;
	// }

	// isReferencedXalianCell = () => {
	// 	let referencedXalian = this.props.referencedXalianId ? duelUtil.getXalianFromIdAndXalians(this.props.referencedXalianId, this.props.G.xalians) : null;
	// 	let referencedXalianIndex = (this.props.referencedXalianId && referencedXalian) ? duelUtil.getIndexOfXalian(this.props.referencedXalianId, this.props.boardState) : null;
	// 	return (referencedXalianIndex != null && referencedXalianIndex == this.props.cellIndex);
	// }

	buildOccupiedCell = () => {

		let xalianId = this.props.boardState.cells[this.props.cellIndex];
		let cellXalian = duelUtil.getXalianFromIdAndXalians(xalianId, this.props.boardState.xalians);
		let isSelectedXalian = this.props.selectedXalianId && this.props.selectedXalianId === cellXalian.xalianId;
		
		let isAttackableBySelectedXalian = this.props.selectedXalianAttackableIndices && this.props.selectedXalianAttackableIndices.includes(this.props.cellIndex);
		let isAttackIndicatorVisible = (isAttackableBySelectedXalian && !this.props.boardState.currentTurnDetails.hasAttacked);

		let selectedXalian = duelUtil.getXalianFromIdAndXalians(this.props.selectedXalianId, this.props.G.xalians);
		let teamColor = this.props.boardState.playerStates[0].activeXalianIds.includes(xalianId) ? duelConstants.PLAYER_ONE_COLOR : duelConstants.PLAYER_TWO_COLOR;

		let isEnemy = duelUtil.isPlayersTurn(this.props.ctx) && !duelUtil.isPlayerPiece(xalianId, this.props.boardState)
		|| duelUtil.isOpponentsTurn(this.props.ctx) && !duelUtil.isOpponentPiece(xalianId, this.props.boardState);

		let attackable = this.props.selectedXalianAttackableIndices && this.props.selectedXalianAttackableIndices.includes(this.props.cellIndex) && !this.props.boardState.currentTurnDetails.hasAttacked;

		
		let connectors = this.buildConnectorsForOccupiedCell(this.props.cellIndex);

		let isPlayerFlagIndex = duelUtil.getPlayerFlagIndex(this.props.boardState) == this.props.cellIndex;
		let isOpponentFlagIndex = duelUtil.getOpponentFlagIndex(this.props.boardState) == this.props.cellIndex;


		/*

				TO DO:

					fix this so that if you are both guarding your flag and carrying target flag, they both show 


		*/


		let flagIfPresent = 
		// p1 piece carrying p1 flag
			(isPlayerFlagIndex && duelUtil.isPlayerPiece(xalianId, this.props.boardState)) ? 
				<DuelFlagIcon className="duel-flag-carried" style={{ fill: duelConstants.PLAYER_ONE_COLOR, transform: 'rotate(60deg)', bottom: '40%', right: '-30%'  }} /> 
		// p2 piece carrying p2 flag
			: (isOpponentFlagIndex && duelUtil.isOpponentPiece(xalianId, this.props.boardState)) ? 
				<DuelFlagIcon className="duel-flag-carried" style={{ fill: duelConstants.PLAYER_TWO_COLOR, transform: 'rotate(60deg)', bottom: '40%', right: '-30%' }} />
		// p1 piece on cell with p2 flag
			: isPlayerFlagIndex ? <DuelFlagIcon className="duel-flag" style={{ fill: duelConstants.PLAYER_ONE_COLOR, transform: 'rotate(-70deg) scaleX(-1)', bottom: '40%', left: '-30%' }} /> 
		// p2 piece on cell with p1 flag
			: isOpponentFlagIndex ? <DuelFlagIcon className="duel-flag" style={{ fill: duelConstants.PLAYER_TWO_COLOR  }} /> 
			: null;


		return (<React.Fragment>
			<div className='' style={{width: `${this.props.cellSize}px`, height: `${this.props.cellSize}px`, lineHeight: `${this.props.cellSize}px`, position: 'absolute'}} >
				{connectors}
			</div>
		
			{/* //  <div id={`cell-${this.props.cellIndex}`} style={{ position: 'relative', width: `${this.props.cellSize}px`, height: `${this.props.cellSize}px`, lineHeight: `${this.props.cellSize}px`, textAlign: 'center' }} >  */}
			<div className='duel-board-cell' id={`cell-${this.props.cellIndex}`} style={{ position: 'relative', width: `${this.props.cellSize}px`, height: `${this.props.cellSize}px`, lineHeight: `${this.props.cellSize}px`, textAlign: 'center' }} onClick={() => this.props.handleActivePieceSelection(cellXalian, this.props.cellIndex, this.props.boardState)}>

				{/* CELL DOT */}
				<div className="duel-board-cell-dot duel-board-cell-dot-dark" />

				{/* ATTACK INDICATOR */}
				{/* {isAttackIndicatorVisible && */}
				{this.props.isActive &&

					<div className='duel-cell-style-covered attack-pattern-background fade-out-animation-on-move' style={{ opacity: isAttackIndicatorVisible ? 1 : 0, backgroundColor: '#9700002c', height: `${this.props.cellSize}px`, width: `${this.props.cellSize}px`, transformOrigin: 'center', transform: 'rotate(90deg)', backgroundImage: svgUtil.getStripedBackgroundImage('#ff0000', 0.5) }} ></div>
				}
				
				{/* GHOST IMAGE WHEN DRAGGING */}

				<div id={"ghost-xalian-on-drag-" + cellXalian.xalianId} className="duel-piece-ghost" style={{ opacity: 0, position: 'absolute', height: '100%', width: '100%' }}>
					<XalianImage className='animate-state' 
							padding={'0px'} 
							speciesName={cellXalian.species.name} 
							primaryType={cellXalian.elementType} 
							fill={'black'} 
							filter={this.buildDropShadowFilter(teamColor)} 
							moreClasses="duel-piece-xalian-icon" 
							/>
				</div>
				<div id={'duel-' + cellXalian.xalianId + '-piece'} className={'duel-' + cellXalian.xalianId + '-piece duel-piece'} style={{ position: 'absolute', height: '100%', width: '100%', zIndex: 200 + parseInt(this.props.cellIndex) }}>

					{/* XALIAN IMAGE */}
						<XalianImage className='animate-state' 
							padding={'0px'} 
							speciesName={cellXalian.species.name} 
							primaryType={cellXalian.elementType} 
							fill={'black'} 
							filter={this.buildDropShadowFilter(teamColor)} 
							moreClasses="duel-piece-xalian-icon" 
						/>
				


					{/* UNDERGLOW */}
					{/* <div style={{ zIndex: '1', background: `radial-gradient(circle, ${teamColor} 0%, ${teamColor + '00'} 100%)`, position: 'absolute', width: '100%', height: '10%', 
						bottom: '20%', left: '0', opacity: 1, pointerEvents: 'none', filter: `drop-shadow(0px 0px 10px ${teamColor})` }} 
					/> */}

						{/* ATTACK BADGE */}
					{/* { (isEnemy && !this.props.boardState.currentTurnDetails.hasAttacked) && */}
					<AttackableMoveBadge zIndex={'605'} isEnemy={isEnemy} attacker={selectedXalian} defender={cellXalian} {...this.props} />
					<AttackIcon className="duel-attack-cell-icon" style={{ fill: 'rgb(255, 0, 0)', pointerEvents: 'none', opacity: attackable ? 1 : 0 }} />
					{/* } */}



					{/* TYPE SYMBOL */}
					<XalianTypeSymbolBadge size={this.props.cellSize/2.5} type={cellXalian.elementType.toLowerCase()} />

					{/* HEALTH AND STAMINA BARS */}
					<XalianPieceStateChart xalianState={cellXalian.state}/>

					{/* FLAGS IF PRESENT AND HOLDING */}
					{flagIfPresent && isPlayerFlagIndex && duelUtil.isPlayerPiece(xalianId, this.props.boardState) ? flagIfPresent : null}
					{flagIfPresent && isOpponentFlagIndex && duelUtil.isOpponentPiece(xalianId, this.props.boardState) ? flagIfPresent : null}
				</div>


				


				{/* FLAGS IF PRESENT AND NOT HOLDING */}
				{flagIfPresent && isPlayerFlagIndex && !duelUtil.isPlayerPiece(xalianId, this.props.boardState) ? flagIfPresent : null}
				{flagIfPresent && isOpponentFlagIndex && !duelUtil.isOpponentPiece(xalianId, this.props.boardState) ? flagIfPresent : null}
			</div>
			</React.Fragment>
		);
	}

	buildDropShadowFilter = (teamColor) => {
        return `${this.dropShadow(this.props.cellSize / 50, gsap.utils.interpolate(teamColor, "white", 0.75))} ${this.dropShadow(this.props.cellSize / 25, gsap.utils.interpolate(teamColor, "white", 0.5))} ${this.dropShadow(this.props.cellSize / 6, teamColor)}`;
    }

    dropShadow = (blur, color, x = 0, y = 0) => {
        return `drop-shadow(${x}px ${y}px ${blur}px ${color})`;
    }

	buildConnectorsForOccupiedCell = (index) => {
		var cellConnectors = [];
		let grid = duelCalculator.buildGrid();
		// let offset = duelConstants.BOARD_COLUMN_SIZE;
		let currentCoord = grid.map[index];

		// build top connector
		let leftIndex = this.getIndexIfValidCell(currentCoord[0] - 1, currentCoord[1], grid);
		let topIndex = this.getIndexIfValidCell(currentCoord[0], currentCoord[1] - 1, grid);
		let rightIndex = this.getIndexIfValidCell(currentCoord[0] + 1, currentCoord[1], grid);
		let bottomIndex = this.getIndexIfValidCell(currentCoord[0], currentCoord[1] + 1, grid);


		if (leftIndex != undefined && !this.cellIsOccupied(leftIndex)) {
			cellConnectors.push(
				<div className="duel-board-cell-connector occupied-connector" style={{ width: '100%', height: '5px', top: '50%', left: '0' }} />
			)
		}
		if (topIndex != undefined && !this.cellIsOccupied(topIndex)) {
			cellConnectors.push(
				<div className="duel-board-cell-connector occupied-connector" style={{ width: '5px', height: '100%', top: '0', left: '50%' }} />
			)
		}

		if (rightIndex != undefined && !this.cellIsOccupied(rightIndex)) {
			cellConnectors.push(
				<div className="duel-board-cell-connector occupied-connector" style={{ width: '100%', height: '5px', top: '50%', left: '100%' }} />
			)
		}
		if (bottomIndex != undefined && !this.cellIsOccupied(bottomIndex)) {
			cellConnectors.push(
				<div className="duel-board-cell-connector occupied-connector" style={{ width: '5px', height: '100%', top: '100%', left: '50%' }} />
			)
		}

		return cellConnectors;

	}

	getIndexIfValidCell(x, y, grid) {
		if (grid.rows[y]) {
			let index = grid.rows[y][x];
			if (index != undefined && index != null) {
				return index;
			}
		}
	}

	cellIsOccupied(index) {
		return this.props.boardState.cells[index];
	}

	shouldConnectToEmptyCellLeft(grid, currentIndex) {
		var connect = true;
		let currentCoord = grid.map[currentIndex];
		if (currentCoord[0] == 0) {
			connect = false;
		} else {
			let leftCellIndex = currentIndex - 1;
			if (this.props.boardState.cells[leftCellIndex]) {
				connect = false;
			}
		}
		return connect;
	}

	shouldConnectToEmptyCellTop(grid, currentIndex) {
		var connect = true;
		let currentCoord = grid.map[currentIndex];
		if (currentCoord[1] == 0) {
			connect = false;
		} else {
			let topCellIndex = currentIndex - duelConstants.BOARD_COLUMN_SIZE;
			if (this.props.boardState.cells[topCellIndex]) {
				connect = false;
			}
		}
		return connect;
	}



	render() {
		let boardState = this.props.boardState;
		let cellIndex = this.props.cellIndex;
		// let attackAnimation = this.buildAttackAnimation();

		// return (boardState && boardState.cells && boardState.cells[cellIndex]) ? this.buildOccupiedCell(attackAnimation) : this.buildUnoccupiedCell(attackAnimation);
		return (boardState && boardState.cells && boardState.cells[cellIndex]) ? this.buildOccupiedCell() : this.buildUnoccupiedCell();
	}


	// buildAttackAnimation = () => {
	// 	let size = this.props.cellSize;
	// 	if (!size) {
	// 		console.log();
	// 	}
	// 	if (this.state.showAttack && (this.state.attackData.defenderIndex == this.props.cellIndex)) {
	// 		return (<React.Fragment>
	// 			{this.state.showAttack && (this.state.attackData.defenderIndex == this.props.cellIndex) &&
	// 				<div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} >
	// 					<XalianTypeSymbolBadge classes={'duel-type-attack-badge'} size={size/ 2} type={this.state.attackData.attackerType.toLowerCase()} />
	// 				</div>
	// 			}
	// 		</React.Fragment>);
	// 	}
	// }

}

function grabMatchingChildElements(elem, classToMatch) {
	let elems = [];
	if (elem.childNodes) {
		elem.childNodes.forEach( child => {
			if (child.classList.contains(classToMatch)) {
				elems.push(child);
			}
		})
	}
	return elems;
}





export default DuelBoardCell;
