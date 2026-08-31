import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import XalianImage from '../../../xalianImage';
import * as duelUtil from '../../../../utils/duelUtil';
import * as duelCalculator from '../../../../gameplay/duel/duelCalculator';
import * as boardStateManager from '../../../../gameplay/duel/boardStateManager';
import * as duelConstants from '../../../../gameplay/duel/duelGameConstants';
import { ReactComponent as DuelFlagIcon } from '../../../../svg/games/duel/duel_flag_icon.svg';
import species from '../../../../json/species.json';
import XalianTypeSymbolBadge from './xalianTypeSymbolBadge';
import AttackableMoveBadge from './attackableMoveBadge';


import gsap from 'gsap';
import Draggable from 'gsap/Draggable';
import Flip from 'gsap/Flip';
import XalianPieceStateChart from './xalianPieceStateChart';
gsap.registerPlugin(Draggable, Flip);

class DuelBoardCell extends React.Component {
	state = {
		contentLoaded: false,
	};

	draggableInstances = [];

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

	componentWillUnmount() {
		this.killDraggables();
	}

	killDraggables = () => {
		(this.draggableInstances || []).forEach(d => d.kill());
		this.draggableInstances = [];
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
			this.killDraggables();
			this.draggableInstances = Draggable.create(elemId, {
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

					if (hoverCellIndex != null && hoverCellIndex >= 0) {
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
			this.killDraggables();
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
		let animationProgress = this.props.animationTl ? this.props.animationTl.totalProgress() : 0;
		let animationsAreComplete = animationProgress == 1 || animationProgress == 0;
		let settled = (this.props.isActive && animationsAreComplete);

		let movable = this.props.selectedXalianMovableIndices || [];
		let isMovable = settled && movable.includes(this.props.cellIndex);

		// A square the *referenced* piece (one you are inspecting rather than
		// commanding) could reach. This used to be a second, dimmer copy of the
		// same lamp, which read as "some of these are faded and I cannot tell
		// why". It is now a plain outline: a different mark, not a weaker one.
		let referenced = this.props.referencedXalianMovableIndices || [];
		let isReferenceMovable = settled && !isMovable && referenced.includes(this.props.cellIndex);

		let cellSizeWithUnits = `${this.props.cellSize}px`;
		let sty = { border: 0, position: 'relative', width: cellSizeWithUnits, height: cellSizeWithUnits, lineHeight: cellSizeWithUnits, textAlign: 'center' };
		let grid = duelCalculator.buildGrid();
		let shouldConnectCellLeft = this.shouldConnectToEmptyCellLeft(grid, this.props.cellIndex);
		let shouldConnectCellTop = this.shouldConnectToEmptyCellTop(grid, this.props.cellIndex);

		let isPlayerFlagIndex = duelUtil.getPlayerFlagIndex(this.props.boardState) == this.props.cellIndex;
		let isOpponentFlagIndex = duelUtil.getOpponentFlagIndex(this.props.boardState) == this.props.cellIndex;
		let flagIfPresent = isPlayerFlagIndex && isOpponentFlagIndex ?  <><DuelFlagIcon className="duel-flag" style={{ fill: duelConstants.PLAYER_ONE_COLOR }} /><DuelFlagIcon className="duel-flag" style={{ fill: duelConstants.PLAYER_TWO_COLOR }} /></> :
		isPlayerFlagIndex ? <DuelFlagIcon className="duel-flag" style={{ fill: duelConstants.PLAYER_ONE_COLOR }} /> :
		isOpponentFlagIndex ? <DuelFlagIcon className="duel-flag" style={{ fill: duelConstants.PLAYER_TWO_COLOR }} /> : null;

		return (<React.Fragment>
			{/* BOX FOR CELL CONNECTORS */}
			<div className='' style={{width: cellSizeWithUnits, height: cellSizeWithUnits, lineHeight: cellSizeWithUnits, position: 'absolute'}} >
				{/* the scoring in the floor. Strength lives on the class, so an
				    empty cell's lines match an occupied cell's - overriding the
				    opacity here made the lattice break around every piece. */}
				<div className="duel-board-cell-connector unoccupied-cell-connector" style={{ display: shouldConnectCellLeft ? 'block' : 'none', width: cellSizeWithUnits, height: '2px', top: '50%', left: '0' }} />
				<div className="duel-board-cell-connector unoccupied-cell-connector" style={{ display: shouldConnectCellTop ? 'block' : 'none', width: '2px', height: cellSizeWithUnits, top: '0', left: '50%' }} />
			</div>
			<div className='duel-unoccupied-cell duel-board-cell' id={`cell-${this.props.cellIndex}`} style={sty} onClick={() => this.props.handleEmptyCellSelection(this.props.cellIndex, this.props.boardState)}>
				{process.env.NODE_ENV !== 'production' && <h6 style={{ position: 'absolute', color: '#9e9e9e2c' }} >{this.props.cellIndex}</h6>}

				{/* WHERE YOU MAY GO.
				    Every square used to carry a pip whose only job was to become a
				    lamp later, so the board's resting state was already speckled with
				    sixty-four marks and the lit state had to out-shout its own
				    siblings. Now the floor is bare until a piece is selected, and
				    then the reachable squares light as one region: a warm wash with
				    an edge drawn only where the region actually ends. */}
				{isMovable &&
					<div className={this.buildRegionClasses('duel-move-region', movable)} />
				}
				{isReferenceMovable &&
					<div className={this.buildRegionClasses('duel-move-region duel-move-region--referenced', referenced)} />
				}

				{/* Attack range no longer paints empty floor. You cannot strike an
				    empty square, so hatching one was telling you about a decision you
				    are not being asked to make, on the squares that were already the
				    most crowded. Reach is now shown only on the enemies it can
				    actually reach - see the reticle in buildOccupiedCell. */}

				{flagIfPresent}

			</div>
			</React.Fragment>);
	}

	/**
	 * Edge classes for a cell inside a highlighted region.
	 *
	 * A region reads as one shape only if its border is drawn around the outside
	 * of the whole thing rather than around each square in it, so a cell draws an
	 * edge only on the sides where its neighbour is not also in the set.
	 */
	buildRegionClasses = (base, indices) => {
		let i = this.props.cellIndex;
		let size = duelConstants.BOARD_COLUMN_SIZE;
		let inSet = (n) => indices.includes(n);

		let classes = [base];
		if (i % size === 0 || !inSet(i - 1)) classes.push('duel-region-edge-left');
		if (i % size === size - 1 || !inSet(i + 1)) classes.push('duel-region-edge-right');
		if (i < size || !inSet(i - size)) classes.push('duel-region-edge-top');
		if (i >= size * (size - 1) || !inSet(i + size)) classes.push('duel-region-edge-bottom');
		return classes.join(' ');
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

		let animationProgress = this.props.animationTl ? this.props.animationTl.totalProgress() : 0;
		let animationsAreComplete = animationProgress == 1 || animationProgress == 0;
		let settled = (this.props.isActive && animationsAreComplete);

		let xalianId = this.props.boardState.cells[this.props.cellIndex];
		let cellXalian = duelUtil.getXalianFromIdAndXalians(xalianId, this.props.boardState.xalians);
		let isSelectedXalian = this.props.selectedXalianId && this.props.selectedXalianId === cellXalian.xalianId;
		let isReferencedXalian = this.props.referencedXalianId && this.props.referencedXalianId === cellXalian.xalianId;

		let selectedXalian = duelUtil.getXalianFromIdAndXalians(this.props.selectedXalianId, this.props.G.xalians);
		let teamColor = this.props.boardState.playerStates[0].activeXalianIds.includes(xalianId) ? duelConstants.PLAYER_ONE_COLOR : duelConstants.PLAYER_TWO_COLOR;

		let isEnemy = duelUtil.isPlayersTurn(this.props.ctx) && !duelUtil.isPlayerPiece(xalianId, this.props.boardState)
		|| duelUtil.isOpponentsTurn(this.props.ctx) && !duelUtil.isOpponentPiece(xalianId, this.props.boardState);

		// one attack per team per turn, so once it is spent nothing on the board
		// should still be advertising itself as a target
		let isTargetable = settled
			&& isEnemy
			&& !!selectedXalian
			&& this.props.selectedXalianAttackableIndices
			&& this.props.selectedXalianAttackableIndices.includes(this.props.cellIndex)
			&& !this.props.boardState.currentTurnDetails.hasAttacked;

		let connectors = this.buildConnectorsForOccupiedCell(this.props.cellIndex);

		let isPlayerFlagIndex = duelUtil.getPlayerFlagIndex(this.props.boardState) == this.props.cellIndex;
		let isOpponentFlagIndex = duelUtil.getOpponentFlagIndex(this.props.boardState) == this.props.cellIndex;

		// Carrying a flag is the win condition, so it gets the loudest mark a piece
		// can wear: a pennant on the token and a ring around its base in the flag's
		// colour. The old "guarding" icon is gone - it had been commented out of
		// the render for long enough to count as dead, and three states drawn with
		// one rotated icon was already one too many.
		let isPlayerHoldingFlag = (isPlayerFlagIndex && duelUtil.isPlayerPiece(xalianId, this.props.boardState));
		let isOpponentHoldingFlag = (isOpponentFlagIndex && duelUtil.isOpponentPiece(xalianId, this.props.boardState));
		let isCarrying = isPlayerHoldingFlag || isOpponentHoldingFlag;
		let carriedFlagColor = isPlayerHoldingFlag ? duelConstants.PLAYER_ONE_COLOR : duelConstants.PLAYER_TWO_COLOR;

		let pieceClasses = ['duel-piece', 'duel-' + cellXalian.xalianId + '-piece'];
		if (isSelectedXalian) pieceClasses.push('duel-piece--selected');
		if (isReferencedXalian && !isSelectedXalian) pieceClasses.push('duel-piece--referenced');
		if (isTargetable) pieceClasses.push('duel-piece--targetable');
		if (isCarrying) pieceClasses.push('duel-piece--carrying');

		return (<React.Fragment>
			<div className='' style={{width: `${this.props.cellSize}px`, height: `${this.props.cellSize}px`, lineHeight: `${this.props.cellSize}px`, position: 'absolute'}} >
				{connectors}
			</div>

			<div className='duel-board-cell' id={`cell-${this.props.cellIndex}`} style={{ position: 'relative', width: `${this.props.cellSize}px`, height: `${this.props.cellSize}px`, lineHeight: `${this.props.cellSize}px`, textAlign: 'center' }} onClick={() => this.props.handleActivePieceSelection(cellXalian, this.props.cellIndex, this.props.boardState)}>

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

				<div id={'duel-' + cellXalian.xalianId + '-piece'} className={pieceClasses.join(' ')} style={{ position: 'absolute', height: '100%', width: '100%', zIndex: 200 + parseInt(this.props.cellIndex), '--duel-team': teamColor, '--duel-flag': carriedFlagColor }}>

					{/* XALIAN IMAGE */}
					<XalianImage className='animate-state'
						padding={'0px'}
						speciesName={cellXalian.species.name}
						primaryType={cellXalian.elementType}
						fill={'black'}
						filter={this.buildDropShadowFilter(teamColor)}
						moreClasses="duel-piece-xalian-icon"
					/>

					{/* TOKEN BASE - the creature stands on a machined disc rimmed in its
					    team's colour, so a piece reads as an object on the floor rather
					    than as artwork printed onto the square */}
					<span className="duel-piece-base" />

					{/* WHO IS ACTING is drawn by the piece's own plinth lighting up
					    (see .duel-piece--selected in duel.css) rather than by
					    brackets stamped over the creature. */}

					{/* WHAT YOU MAY STRIKE - a strike zone painted on the floor */}
					<AttackableMoveBadge zIndex={'605'} isTargetable={isTargetable} attacker={selectedXalian} defender={cellXalian} {...this.props} />

					{/* TYPE SYMBOL */}
					<XalianTypeSymbolBadge size={this.props.cellSize/2.5} type={cellXalian.elementType.toLowerCase()} />

					{/* VITALS - these live in the roster rail now, where they have room
					    to be read. On the board they surface only when you point at a
					    piece, so twelve of them are not competing with the board at all
					    times. */}
					<span className="duel-piece-vitals">
						<XalianPieceStateChart xalianState={cellXalian.state} />
					</span>

					{/* CARRYING THE FLAG */}
					{isCarrying &&
						<DuelFlagIcon className="duel-flag-carried" style={{ fill: carriedFlagColor }} />
					}
				</div>

			</div>
			</React.Fragment>
		);
	}

	// A tight rim in the team's colour plus a shadow cast onto the floor. The
	// old three-layer halo bloomed a sixth of a cell in every direction, which
	// washed out the creature it was supposed to identify and lit the arena
	// floor around it.
	buildDropShadowFilter = (teamColor) => {
        return `${this.dropShadow(1, gsap.utils.interpolate(teamColor, "white", 0.25))} ${this.dropShadow(this.props.cellSize / 26, gsap.utils.interpolate(teamColor, "black", 0.25))} ${this.dropShadow(this.props.cellSize / 14, 'rgba(0, 0, 0, 0.85)', 0, this.props.cellSize / 22)}`;
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
				<div key={`connector-${index}-left`} className="duel-board-cell-connector occupied-connector" style={{ width: '100%', height: '2px', top: '50%', left: '0' }} />
			)
		}
		if (topIndex != undefined && !this.cellIsOccupied(topIndex)) {
			cellConnectors.push(
				<div key={`connector-${index}-top`} className="duel-board-cell-connector occupied-connector" style={{ width: '2px', height: '100%', top: '0', left: '50%' }} />
			)
		}

		if (rightIndex != undefined && !this.cellIsOccupied(rightIndex)) {
			cellConnectors.push(
				<div key={`connector-${index}-right`} className="duel-board-cell-connector occupied-connector" style={{ width: '100%', height: '2px', top: '50%', left: '100%' }} />
			)
		}
		if (bottomIndex != undefined && !this.cellIsOccupied(bottomIndex)) {
			cellConnectors.push(
				<div key={`connector-${index}-bottom`} className="duel-board-cell-connector occupied-connector" style={{ width: '2px', height: '100%', top: '100%', left: '50%' }} />
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
