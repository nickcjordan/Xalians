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


import gsap from 'gsap';
import Draggable from 'gsap/Draggable';
import Flip from 'gsap/Flip';
gsap.registerPlugin(Draggable, Flip);

class DuelBoardCell extends React.Component {
	state = {
		contentLoaded: false,
	};

	componentDidMount() {
		// document.addEventListener('DOMContentLoaded', this.setAsDraggable);
		// this.setDraggables();
	}

	componentDidUpdate() {
		this.setDraggables();
	}

	setDraggables = () => {
		let xalianId = this.props.boardState.cells[this.props.cellIndex];
		let isCurrentTurnXalian = xalianId ? duelUtil.isCurrentTurnsXalian(xalianId, this.props.boardState, this.props.ctx) : false;
		let cellXalian = xalianId ? duelUtil.getXalianFromIdAndXalians(xalianId, this.props.boardState.xalians) : null;
		var movablePaths = [];
		var attackablePaths = [];
		var movableCellElems = [];
		if (cellXalian) {
			movablePaths = duelCalculator.calculateMovablePaths(this.props.cellIndex, cellXalian, this.props.boardState, this.props.ctx);
			attackablePaths = duelCalculator.calculateAttackablePaths(this.props.cellIndex, cellXalian, this.props.boardState, this.props.ctx);
			movableCellElems = this.getCellElements(movablePaths);
		}
		if (isCurrentTurnXalian) {

			let elemId = '.duel-' + xalianId + '-piece';

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
				onPressParams: [this.props],
				onPress: function (props) {
					// let cellElems = getCellElements(movablePaths);
					const cellState = Flip.getState(movableCellElems, { props: "background,filter" });
					movableCellElems.forEach(elem => {
						if (elem.childNodes) {
							elem.childNodes.forEach(childElem => {
								if (childElem.classList.contains('duel-board-cell-dot') && !childElem.classList.contains('duel-board-cell-dot-light')) {
									// childElem.classList.toggle('duel-board-cell-dot-light-faded');
									childElem.classList.toggle('duel-board-cell-dot-dark');
									childElem.classList.toggle('duel-board-cell-dot-light');
								}
							})
						}
					});
					Flip.from(cellState);
				},
				onDragStartParams: [this.props],
				onDragStart: function (props) {
					// let elemId = this.target.id;
					// let draggingXalianId = duelUtil.extractXalianId(elemId);
					gsap.to(this.target, { opacity: 0.2, scale: 1.2 });


				},
				onDragParams: [this.props],
				onDrag: function (props) {

					var i = allCellElems.length;
					while (--i > -1) {
						var cellElem = allCellElems[i];
						if (cellElem) {
							const cellState = Flip.getState(cellElem, { props: "backgroundColor,borderRadius,height,width" });

							var shouldAnimate = false;
							if (this.hitTest(cellElem, overlapThreshold) && !cellElem.classList.contains("duel-piece-draggable-hovering")) {
								
								cellElem.classList.add("duel-piece-draggable-hovering");
								shouldAnimate = true;
								
								let cellIndex = parseInt(cellElem.id.replace('cell-', ''));
								let attackablePathsFromCurrentSpot = duelCalculator.calculateAttackablePaths(cellIndex, cellXalian, props.boardState, props.ctx, false);
								let attackableIndicesFromCurrentSpot = attackablePathsFromCurrentSpot.map(p => (p.endIndex));
								props.boardState.cells.forEach((cellContents, index) => {
									let targetCellElem = document.getElementById(`cell-${index}`);
									let attackIndicatorElems = grabMatchingChildElements(targetCellElem, 'attack-pattern-background-selected');
									if (attackIndicatorElems && attackIndicatorElems.length > 0) {
										if (attackableIndicesFromCurrentSpot.includes(index)) {
											attackIndicatorElems[0].style.opacity = 1;
											if (cellContents) {
												// add x to enemy

											} else {
												// add red circle
											}
										} else {
											attackIndicatorElems[0].style.opacity = 0;
										}
									}
								});
								// let path = movablePaths.filter(p => (p.endIndex == destinationIndex))[0];
								// path.dragged = dragged;
								// props.moves.movePiece(path);

							} else if (cellElem.classList.contains("duel-piece-draggable-hovering")) {
								cellElem.classList.remove("duel-piece-draggable-hovering");
								shouldAnimate = true;
							}
							if (shouldAnimate) {
								Flip.from(cellState, { absolute: false });
							}

						}
					}
				},
				onDragEndParams: [this.props],
				onDragEnd: function (props) {
					gsap.to(this.target, { opacity: 1, scale: 1 });
					if (this.endX == 0 && this.endY == 0) { // select or unselect xalian
						document.getElementById(`cell-${props.cellIndex}`).classList.remove("duel-piece-draggable-hovering");
						props.handleActivePieceSelection(cellXalian, props.cellIndex, props.boardState);
					} else { // move xalian
						movableCellElems.forEach(elem => {
							let cellIndex = parseInt(elem.id.replace('cell-', ''));
							if (this.hitTest(elem, overlapThreshold)) { // found cell attempting to drop on
								// props.takeActionOnCell(cellIndex, props.boardState, props.cellIndex, xalianId, true);
								let path = movablePaths.filter(p => (p.endIndex == cellIndex))[0];
								path.dragged = true;
								props.moves.movePiece(path)

								/*
	
	
													do more here, this isnt really working I think

													only makes move if it is selected already

													probs need to make the call to the 'movePiece' move directly
	
	
	
								*/

							}
						})
					}

				}


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
		let isAttackableBySelectedXalian = this.props.selectedXalianAttackableIndices && this.props.selectedXalianAttackableIndices.includes(this.props.cellIndex);
		let isAttackIndicatorVisible = (isAttackableBySelectedXalian && !this.props.boardState.currentTurnDetails.hasAttacked);
		let attackIndicatorVisibility = isAttackIndicatorVisible ? 1 : 0;
		
		let isMovableByReferencedXalian = this.props.referencedXalianMovableIndices && this.props.referencedXalianMovableIndices.includes(this.props.cellIndex);
		let isAttackableByReferencedXalian = this.props.referencedXalianAttackableIndices && this.props.referencedXalianAttackableIndices.includes(this.props.cellIndex);

		let cellSizeWithUnits = `${this.props.cellSize}px`;
		let sty = { border: 0, position: 'relative', width: cellSizeWithUnits, height: cellSizeWithUnits, lineHeight: cellSizeWithUnits, textAlign: 'center' };
		let grid = duelCalculator.buildGrid();
		let shouldConnectCellLeft = this.shouldConnectToEmptyCellLeft(grid, this.props.cellIndex);
		let shouldConnectCellTop = this.shouldConnectToEmptyCellTop(grid, this.props.cellIndex);


		let isPlayerFlagIndex = duelUtil.getPlayerFlagIndex(this.props.boardState) == this.props.cellIndex;
		let isOpponentFlagIndex = duelUtil.getOpponentFlagIndex(this.props.boardState) == this.props.cellIndex;
		let flagIfPresent = isPlayerFlagIndex ? <DuelFlagIcon className="duel-flag" style={{ fill: '#947dfaff' }} /> : isOpponentFlagIndex ? <DuelFlagIcon className="duel-flag" style={{ fill: '#ff7a7aff' }} /> : null;
		return (
			<div className='duel-unoccupied-cell duel-board-cell' id={`cell-${this.props.cellIndex}`} style={sty} onClick={() => this.props.handleEmptyCellSelection(this.props.cellIndex, this.props.boardState)}>
				<div className="duel-board-cell-connector unoccupied-cell-connector" style={{ opacity: shouldConnectCellLeft ? 1 : 0, width: '100%', height: '5px', top: '50%', left: '0' }} />
				<div className="duel-board-cell-connector unoccupied-cell-connector" style={{ opacity: shouldConnectCellTop ? 1 : 0, width: '5px', height: '100%', top: '0', left: '50%' }} />
				<h6 style={{ position: 'absolute', color: '#9e9e9e2c' }} >{this.props.cellIndex}</h6>

				{/* ATTACK INDICATOR */}
				{/* <div className='duel-cell-style-covered attack-pattern-background attack-pattern-background-selected fade-out-animation-on-move' style={{ visibility: isAttackIndicatorVisible ? 'visible' : 'hidden', backgroundColor: '#9700002c', height: cellSizeWithUnits, width: cellSizeWithUnits, transformOrigin: 'center', transform: 'rotate(90deg)', backgroundImage: svgUtil.getStripedBackgroundImage('#ff0000', 0.5) }} ></div> */}
				{/* {isAttackIndicatorVisible &&  */}
					<div className='duel-cell-style-covered attack-pattern-background attack-pattern-background-selected ' style={{opacity: attackIndicatorVisibility, backgroundColor: '#9700002c', height: cellSizeWithUnits, width: cellSizeWithUnits, transformOrigin: 'center', transform: 'rotate(90deg)', backgroundImage: svgUtil.getStripedBackgroundImage('#ff0000', 0.5) }} ></div>
				{/* } */}
				
				{/* REFERENCED XALIAN ATTACK INDICATOR */}
				{isAttackableByReferencedXalian &&
					<div className='duel-cell-style-covered attack-pattern-background attack-pattern-background-referenced fade-out-animation-on-move' style={{ backgroundColor: '#9700002c', height: cellSizeWithUnits, width: cellSizeWithUnits, backgroundImage: svgUtil.getStripedBackgroundImage('#c05c5c', 0.25) }} ></div>
				}


				

				{(!isMovableBySelectedXalian && !isMovableByReferencedXalian) &&
					<div className="duel-board-cell-dot duel-board-cell-dot-dark"/>
				}
				
				{isMovableBySelectedXalian &&
					<div className="duel-board-cell-dot duel-board-cell-dot-light fade-out-animation-on-move" />
				}

				{(isMovableByReferencedXalian && !isMovableBySelectedXalian) &&
					<div className="duel-board-cell-dot duel-board-cell-dot-light-faded fade-out-animation-on-move" />
				}

				{flagIfPresent}

				{/* {attackAnimation} */}

			</div>
		);
	}

	// getReferencedXalian = () => {
	// 	return this.props.referencedXalianId ? duelUtil.getXalianFromIdAndXalians(this.props.referencedXalianId, this.props.boardState.xalians) : null;
	// }

	// isReferencedXalianCell = () => {
	// 	let referencedXalian = this.props.referencedXalianId ? duelUtil.getXalianFromIdAndXalians(this.props.referencedXalianId, this.props.boardState.xalians) : null;
	// 	let referencedXalianIndex = (this.props.referencedXalianId && referencedXalian) ? duelUtil.getIndexOfXalian(this.props.referencedXalianId, this.props.boardState) : null;
	// 	return (referencedXalianIndex != null && referencedXalianIndex == this.props.cellIndex);
	// }

	buildOccupiedCell = () => {

		let xalianId = this.props.boardState.cells[this.props.cellIndex];
		let cellXalian = duelUtil.getXalianFromIdAndXalians(xalianId, this.props.boardState.xalians);
		let isSelectedXalian = this.props.selectedXalianId && this.props.selectedXalianId === cellXalian.xalianId;
		
		let isAttackableBySelectedXalian = this.props.selectedXalianAttackableIndices && this.props.selectedXalianAttackableIndices.includes(this.props.cellIndex);
		let isAttackIndicatorVisible = (isAttackableBySelectedXalian && !this.props.boardState.currentTurnDetails.hasAttacked);

		let selectedXalian = duelUtil.getXalianFromIdAndXalians(this.props.selectedXalianId, this.props.boardState.xalians);
		let teamColor = this.props.boardState.playerStates[0].activeXalianIds.includes(xalianId) ? '#9480eb' : '#e49393';

		let isEnemy = duelUtil.isPlayersTurn(this.props.ctx) && !duelUtil.isPlayerPiece(xalianId, this.props.boardState)
		|| duelUtil.isOpponentsTurn(this.props.ctx) && !duelUtil.isOpponentPiece(xalianId, this.props.boardState);

		let attackable = this.props.selectedXalianAttackableIndices && this.props.selectedXalianAttackableIndices.includes(this.props.cellIndex);

		

		var healthBarPercentage = (cellXalian.stats.health / gameConstants.MAX_HEALTH_POINTS) * 100;
		healthBarPercentage = healthBarPercentage < 5 ? 5 : healthBarPercentage;
		let barColor = healthBarPercentage > 50 ? 'green' : healthBarPercentage > 25 ? 'orange' : 'red';


		let connectors = this.buildConnectorsForOccupiedCell(this.props.cellIndex);

		let isPlayerFlagIndex = duelUtil.getPlayerFlagIndex(this.props.boardState) == this.props.cellIndex;
		let isOpponentFlagIndex = duelUtil.getOpponentFlagIndex(this.props.boardState) == this.props.cellIndex;

		let flagIfPresent = 
		// p1 piece carrying p1 flag
			(isPlayerFlagIndex && duelUtil.isPlayerPiece(xalianId, this.props.boardState)) ? 
				<DuelFlagIcon className="duel-flag-carried" style={{ fill: '#947dfaff', transform: 'rotate(60deg)', bottom: '40%', right: '-30%'  }} /> 
		// p2 piece carrying p2 flag
			: (isOpponentFlagIndex && duelUtil.isOpponentPiece(xalianId, this.props.boardState)) ? 
				<DuelFlagIcon className="duel-flag-carried" style={{ fill: '#ff7a7aff', transform: 'rotate(60deg)', bottom: '40%', right: '-30%' }} />
		// p1 piece on cell with p2 flag
			: isPlayerFlagIndex ? <DuelFlagIcon className="duel-flag" style={{ fill: '#947dfaff', transform: 'rotate(-70deg) scaleX(-1)', bottom: '40%', left: '-30%' }} /> 
		// p2 piece on cell with p1 flag
			: isOpponentFlagIndex ? <DuelFlagIcon className="duel-flag" style={{ fill: '#ff7a7aff'  }} /> 
			: null;


		return (
			//  <div id={`cell-${this.props.cellIndex}`} style={{ position: 'relative', width: `${this.props.cellSize}px`, height: `${this.props.cellSize}px`, lineHeight: `${this.props.cellSize}px`, textAlign: 'center' }} > 
			<div className='duel-board-cell' id={`cell-${this.props.cellIndex}`} style={{ position: 'relative', width: `${this.props.cellSize}px`, height: `${this.props.cellSize}px`, lineHeight: `${this.props.cellSize}px`, textAlign: 'center' }} onClick={() => this.props.handleActivePieceSelection(cellXalian, this.props.cellIndex, this.props.boardState)}>

				{connectors}
				<div className="duel-board-cell-dot" style={{ background: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 5%, rgba(0,0,0,0.25) 20%, rgba(0,0,0,0) 60%)', margin: 'auto' }} />

				{/* ATTACK INDICATOR */}
				{isAttackIndicatorVisible &&
					<div className='duel-cell-style-covered attack-pattern-background fade-out-animation-on-move' style={{ backgroundColor: '#9700002c', height: `${this.props.cellSize}px`, width: `${this.props.cellSize}px`, transformOrigin: 'center', transform: 'rotate(90deg)', backgroundImage: svgUtil.getStripedBackgroundImage('#ff0000', 0.5) }} ></div>
				}

				<div id={'duel-' + cellXalian.xalianId + '-piece'} className={'duel-' + cellXalian.xalianId + '-piece duel-piece'} style={{ position: 'absolute', height: '100%', width: '100%', zIndex: 200 + parseInt(this.props.cellIndex) }}>

					{/* XALIAN IMAGE */}
						<XalianImage className='animate-state' 
							padding={'0px'} 
							speciesName={cellXalian.species.name} 
							primaryType={cellXalian.elements.primaryType} 
							fill={'black'} 
							filter={this.buildDropShadowFilter(teamColor)} 
							moreClasses="duel-piece-xalian-icon" 
						/>
					{/* GHOST IMAGE WHEN DRAGGING */}
					{/* <XalianImage className='animate-state' 
							padding={'0px'} 
							speciesName={cellXalian.species.name} 
							primaryType={cellXalian.elements.primaryType} 
							fill={'black'} 
							filter={this.buildDropShadowFilter(teamColor)} 
							moreClasses="duel-piece-xalian-icon" 
						/> */}


					{/* UNDERGLOW */}
					<div style={{ zIndex: '1', background: `radial-gradient(circle, ${teamColor} 0%, ${teamColor + '00'} 100%)`, position: 'absolute', width: '100%', height: '10%', 
						bottom: '20%', left: '0', opacity: 1, pointerEvents: 'none', filter: `drop-shadow(0px 0px 10px ${teamColor})` }} 
					/>


					{/* HEALTH BAR */}
					<div className='duel-health-bar-wrapper' style={{ zIndex: '605' }}>
						<div style={{ width: `${healthBarPercentage}%`, backgroundColor: barColor, pointerEvents: 'none', boxShadow: `0px 0px 2px 2px ${barColor}` }} className='duel-health-bar' />
					</div>

					{/* ATTACK BADGE */}
					{ (isEnemy && !this.props.boardState.currentTurnDetails.hasAttacked) &&
						<AttackableMoveBadge zIndex={'605'} attackable={attackable} cellSize={this.props.cellSize} attacker={selectedXalian} defender={cellXalian} boardState={this.props.boardState} ctx={this.props.ctx} />
					}

					{/* TYPE SYMBOL */}
					<XalianTypeSymbolBadge size={this.props.cellSize/2.5} type={cellXalian.elements.primaryType.toLowerCase()} />

					{/* FLAGS IF PRESENT AND HOLDING */}
					{flagIfPresent && isPlayerFlagIndex && duelUtil.isPlayerPiece(xalianId, this.props.boardState) ? flagIfPresent : null}
					{flagIfPresent && isOpponentFlagIndex && duelUtil.isOpponentPiece(xalianId, this.props.boardState) ? flagIfPresent : null}
				</div>
				{/* FLAGS IF PRESENT AND NOT HOLDING */}
				{flagIfPresent && isPlayerFlagIndex && !duelUtil.isPlayerPiece(xalianId, this.props.boardState) ? flagIfPresent : null}
				{flagIfPresent && isOpponentFlagIndex && !duelUtil.isOpponentPiece(xalianId, this.props.boardState) ? flagIfPresent : null}
			</div>
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
