/*
 * Copyright 2017 The boardgame.io Authors.
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

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
import { ReactComponent as AttackIcon } from '../../../../svg/games/duel/duel_attack_icon.svg';
import { ReactComponent as DuelFlagIcon } from '../../../../svg/games/duel/duel_flag_icon.svg';
import species from '../../../../json/species.json';
import { Hub } from "aws-amplify";
import XalianTypeSymbolBadge from './xalianTypeSymbolBadge';
import DuelXalianSuggestionDetails from './duelXalianSelectionDetails';
import XalianDuelStatBadge from './xalianDuelStatBadge';
import DuelBoardCell from './duelBoardCell';
import AttackActionModal from '../attackActionModal';

import gsap from 'gsap';
import Flip from 'gsap/Flip';
import MotionPathPlugin from 'gsap/MotionPathPlugin';
gsap.registerPlugin(Flip);
gsap.registerPlugin(MotionPathPlugin);

const reqSvgs = require.context ( '../../../../svg/species', true, /\.svg$/ );
const svgs = reqSvgs.keys () .map ( path => ({ path, file: reqSvgs ( path ) }) );

class DuelBoard extends React.Component {
	state = {
		speciesSvgMap: {},
		size: { min: 50 },
		contentLoaded: false,
		attackResult: {},

	};

	static propTypes = {
		G: PropTypes.any.isRequired,
		ctx: PropTypes.any.isRequired,
		moves: PropTypes.any.isRequired,
		playerID: PropTypes.string,
		isActive: PropTypes.bool,
		isMultiplayer: PropTypes.bool,
	};


	componentWillUnmount() {
		window.removeEventListener('resize', this.updateSize);
	}

	setSize = (w, h) => {
		let max = Math.max(w, h);
		let min = Math.min(w, h);
		
		let padding = 10;
		
		this.setState({
			contentLoaded: true,
			size: {
				width: w - padding,
				height: h - padding,
				max: max - padding,
				min: min - padding,
			},
		});
	};

	updateSize = () => {
		this.setSize(window.innerWidth, Math.min(window.innerHeight * 0.8, window.innerHeight - 100));
	};
	
	componentDidMount() {
		document.addEventListener('DOMContentLoaded', this.updateSize);
		window.addEventListener('resize', this.updateSize);
		var speciesMap = new Map();
		var svgMap = new Map();

		species.forEach( s => {
			speciesMap[s.name.toLowerCase()] = s;
		})

		svgs.forEach( xalianSvg => {
			let path = xalianSvg.path.toLowerCase();
			let speciesName = path.substring(2, path.length - 4);
			let species = speciesMap[speciesName];
			if (species) {
				svgMap[speciesName] = {
					species: species,
					svg: xalianSvg
				}
			}
		})

		this.setState({ speciesSvgMap: svgMap });


		if (this.props.ctx.gameover) {
			this.setState({ winner: this.props.ctx.gameover.winner !== undefined ? <div id="winner">Winner: {this.props.ctx.gameover.winner}</div> : <div id="winner">Draw!</div> });
		}

		
		this.setupAnimationHub();
		

		
		
		
	}

	componentDidUpdate() {
		this.handleMoveAnimation();
	}
	
	handleMoveAnimation = () => {
		if (this.props.log && this.props.log.length > 0) {
			let logs = this.props.log.filter( log =>   log.action && log.action.type && log.action.type === 'MAKE_MOVE'	);

			let lastAction = logs[logs.length - 1].action;

			if (lastAction.payload.type !== 'selectPiece') {
				console.log(`ANIMATING :: ${JSON.stringify(lastAction, null, 2)}`);
				let moveName = lastAction.payload.type;
				if (moveName === 'setPiece') {
					// DO SET PIECE ANIMATION
					console.log(`setPiece :: `);
					
					// get location of original piece
					
					let destIndex = lastAction.payload.args[0];
					let xalianId = lastAction.payload.args[1];

					// get new location
					let elem = document.getElementById(`${xalianId}-piece`);
					console.log(elem);
					// animate from one to the other

				} else if (moveName === 'movePiece') {
					// DO MOVE ANIMATION
					console.log(`movePiece :: `);

					let path = lastAction.payload.args[0];

					let x = this.props.G.cells[path.startIndex];
					let x2 = this.props.G.cells[path.endIndex];
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

					let tl = gsap.timeline();
					let coords = [];
					let size = this.determineCellSize();
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
			}


		}
	}

	setSelection = (id, index) => {
		if (duelUtil.isPlayersTurn(this.props.ctx)) {
			// this.setState({ selectedId: id, selectedIndex: index }); 
			// disallowed move when not your turn
			this.props.moves.selectPiece(id);
		}
	}

	handleEmptyCellSelection = (destinationIndex) => {
		let game = this.props.G;
		// let selectedId = this.state.selectedId;
		let selectedId = this.props.G.selectedId;
		// let selectedIndex = this.state.selectedIndex;
		// let selectedIndex = this.props.G.selectedIndex;
		let selectedIndex = duelUtil.getIndexOfXalian(selectedId, this.props.G);

		var paths = [];
		if (this.props.ctx.phase === 'play' && selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			paths = duelCalculator.calculateMovablePaths(selectedIndex, duelUtil.getXalianFromId(selectedId, this.props.G), this.props.G, this.props.ctx);
		}
		let moves = paths.map( path => path.endIndex );

		if (selectedId) { // moving a piece
			// if (duelUtil.isPlayerPiece(selectedId, game)) {
				// handle player move
				if (duelUtil.isUnset(selectedId, game)) { // setting piece initially
					if (duelUtil.getStartingIndices(this.props.G, this.props.ctx).includes(destinationIndex)) {
						this.props.moves.setPiece(destinationIndex, selectedId);
						this.setState({ referencedXalianId: null });
					} else {
						console.error("CAN NOT SET INITIAL PIECE HERE");
					}
				} else if (duelUtil.isActive(selectedId, game)) { // moving existing piece
					if (moves.includes(destinationIndex)) { // valid move
						let path = duelCalculator.calculatePathToTarget(selectedIndex, destinationIndex, this.props.G, this.props.ctx);
						this.props.moves.movePiece(path);
					} else {
						console.log("INVALID MOVE");
					}
				} else {
					// do nothing because piece is out ?
				}
			// } else if (duelUtil.isOpponentPiece(selectedId, game)) {
			// 	// handle opponent move
			// 	if (duelUtil.isUnset(selectedId, game)) { // setting piece initially
			// 		if (duelUtil.getStartingIndices(this.props.G, this.props.ctx).includes(destinationIndex)) {
			// 			this.props.moves.setPiece(destinationIndex, selectedId);
			// 			this.setState({ selectedId: null, selectedIndex: null });
			// 		} else {
			// 			console.error("CAN NOT SET INITIAL PIECE HERE");
			// 		}
			// 	} else if (duelUtil.isActive(selectedId, game)) { // moving existing piece
			// 		if (moves.includes(destinationIndex)) { // valid move
			// 			this.props.moves.movePiece(selectedIndex, destinationIndex, selectedId);
			// 			this.setState({ selectedId: null, selectedIndex: null });
			// 		} else {
			// 			console.log("INVALID MOVE");
			// 		}
			// 	} else {
			// 		// do nothing because piece is out ?
			// 	}
			// }
		}
	};


	// called in setup when a piece is selected to be placed
	handleInitialPieceSelection = (xalian) => {

		if (false) { // DEBUG
			let options = [56, 57, 58, 59, 60, 61, 62, 63];
			var ind = -1;
			var isEmpty = false;
			while(ind < 0 && !isEmpty) {
				ind = Math.round(Math.random() * (options.length - 1));
				isEmpty = this.props.G.cells[ind] ? true : false;
			}
			let selection = options[ind];
			this.props.moves.setPiece(selection, xalian.xalianId);
		} else {
			if (this.props.G.selectedId && this.props.G.selectedId === xalian.xalianId) {
				console.log('UNselected xalian ' + xalian.species.name + ' from placing');
				this.setSelection(null, null); 
				this.setState({ referencedXalianId: null });
			} else if (duelUtil.isCurrentTurnsXalian(xalian.xalianId, this.props.G, this.props.ctx)) {
				console.log('selected xalian ' + xalian.species.name + ' to place');
				this.setSelection(xalian.xalianId, null); 
			} else {
				console.log("CAN NOT SELECT OTHER PLAYERS PIECE");
				this.setState({ referencedXalianId: xalian.xalianId });
			}
		}
	};

	handleActivePieceSelection = (xalian, index) => {
		if (this.props.G.selectedId && this.props.G.xalians) {
			let selectedId = this.props.G.selectedId;
			// let selectedIndex = this.props.G.selectedIndex;
			let selectedIndex = duelUtil.getIndexOfXalian(selectedId, this.props.G);
			
			if ((duelUtil.isPlayerPiece(selectedId, this.props.G) && duelUtil.isPlayerPiece(xalian.xalianId, this.props.G)) 
			|| (duelUtil.isOpponentPiece(selectedId, this.props.G) && duelUtil.isOpponentPiece(xalian.xalianId, this.props.G))) {
				this.selectPiece(xalian, index); // switching piece selection from same team
			} else {
				var attackablePaths = [];
				if (selectedId && (selectedIndex != null && selectedIndex != undefined)) {
					attackablePaths = duelCalculator.calculateAttackablePaths(selectedIndex, duelUtil.getXalianFromId(selectedId, this.props.G), this.props.G, this.props.ctx);
				}
				var attackableIndices = attackablePaths.map( p => p.endIndex);
				if (attackableIndices.includes(index) && (!this.props.G.currentTurnDetails.hasAttacked)) {
					// do attack action
					let path = duelCalculator.calculatePathToTarget(selectedIndex, index, this.props.G, this.props.ctx)
					this.props.moves.doAttack(path);
					
	
					// reset selection
					this.setState({ referencedXalianId: null });
				} else {
					console.log("CAN NOT ATTACK SPACE");
				}
				
			}
		} else {
			this.selectPiece(xalian, index);
		}
	};

	selectPiece = (xalian, index) => {
		let selectedId = this.props.G.selectedId;
		let selectedIndex = duelUtil.getIndexOfXalian(selectedId, this.props.G);
		if (selectedIndex === index) { // unselect
			console.log('UNselecting xalian ' + xalian.species.name + ' from square ' + index);
			this.setSelection(null, null);
			this.setState({ referencedXalianId: null });
		} else {
			if (duelUtil.isCurrentTurnsXalian(xalian.xalianId, this.props.G, this.props.ctx)) {
				console.log('selected xalian ' + xalian.species.name + ' from square ' + index);
				this.setSelection(xalian.xalianId, index);
			} else {
				console.log('only referencing xalian ' + xalian.species.name + ' from square ' + index);
				this.setState({ referencedXalianId: xalian.xalianId });
			}
		}
	};


	
	
	buildInitialSpeciesIcon(x, isOut = false) {
		let isSelected = this.props.G.selectedId && this.props.G.selectedId === x.xalianId;
		let opac = isOut ? 0.4 : 1;

		return (
			// <Col md={2} sm={3} xs={6} className="species-col">
			<Col xs={true} className="species-col animate-state">
				<a onClick={() => this.handleInitialPieceSelection(x)}>
					<XalianImage padding='2%' colored bordered selected={isSelected} speciesName={x.species.name} primaryType={x.elements.primaryType} moreClasses="duel-xalian-unselected" style={{ opacity: opac }} />
					<Row style={{ width: '100%', margin: '0px', padding: '0px' }}>
						<Col style={{ padding: '0px', height: '100%', margin: 'auto' }}>
							<h6 className="condensed-row" style={{ textAlign: 'center', margin: 'auto', height: '100%', width: '100%' }}>
								{x.species.name}
							</h6>
						</Col>
					</Row>
				</a>
			</Col>
		);
	}

	render() {
		let size = this.determineCellSizeText();
		let selectedId = this.props.G.selectedId;
		let selectedIndex = duelUtil.getIndexOfXalian(selectedId, this.props.G);
		let xalian = duelUtil.getXalianFromId(selectedId, this.props.G);
		// let selectedIndex = this.props.G.selectedIndex;
		var moves = getMovableIndices(selectedId, selectedIndex, this.props.G, this.props.ctx);
		var attackablePaths = [];
		if (selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			attackablePaths = duelCalculator.calculateAttackablePaths(selectedIndex, xalian, this.props.G, this.props.ctx);
		}
		var attackableIndices = attackablePaths.map(p => p.endIndex);
		let tbody = [];
		for (let i = 0; i < gameConstants.BOARD_COLUMN_SIZE; i++) {
			let cells = [];
			for (let j = 0; j < gameConstants.BOARD_COLUMN_SIZE; j++) {
				const index = gameConstants.BOARD_COLUMN_SIZE * i + j;

				let isPlayerFlagIndex = duelUtil.getPlayerFlagIndex(this.props.G) == index;
				let isOpponentFlagIndex = duelUtil.getOpponentFlagIndex(this.props.G) == index;


				// let border = isPlayerFlagIndex ? 'double 8px #947dfaff' 
					// : isOpponentFlagIndex ? 'double 8px #ff7a7aff': '';

				let flag = isPlayerFlagIndex ? <DuelFlagIcon style={{ zIndex: '110', position: 'absolute', top: 0, left: '20%', opacity: 0.75, height: '60%', width: '60%', fill: '#947dfaff' }} /> :
				isOpponentFlagIndex ? <DuelFlagIcon style={{ zIndex: '110', position: 'absolute', top: 0, left: '20%', opacity: 0.75, height: '60%', width: '60%', fill: '#ff7a7aff' }} /> : null;

				// let size = '75px';
				
				var cell = <DuelBoardCell handleEmptyCellSelection={this.handleEmptyCellSelection} handleActivePieceSelection={this.handleActivePieceSelection} selectedIndex={selectedIndex} selectedId={selectedId} size={size} flag={flag} cellIndex={index} attackableIndices={attackableIndices} movableIndices={moves} G={this.props.G} ctx={this.props.ctx} />;

				cells.push(<td key={index}>{cell}</td>);
			}
			tbody.push(<tr key={i}>{cells}</tr>);
		}

		var cols = [];
		var outCols = [];
		var opponentCols = [];
		var opponentOutCols = [];

		if (this.props.G.unsetXalianIds && this.props.G.unsetXalianIds.length > 0 && this.props.G.xalians) {
			this.props.G.unsetXalianIds.forEach((id) => {
				let x = this.props.G.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					cols.push(this.buildInitialSpeciesIcon(x));
				}
			});
		}

		if (this.props.G.unsetOpponentXalianIds && this.props.G.xalians) {
			this.props.G.unsetOpponentXalianIds.forEach((id) => {
				let x = this.props.G.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					opponentCols.push(this.buildInitialSpeciesIcon(x));
				}
			});
		}

		if (this.props.G.inactiveOpponentXalianIds && this.props.G.xalians) {
			this.props.G.inactiveOpponentXalianIds.forEach((id) => {
				let x = this.props.G.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					opponentOutCols.push(this.buildInitialSpeciesIcon(x, true));
				}
			});
		}

		if (this.props.G.inactiveXalianIds && this.props.G.xalians) {
			this.props.G.inactiveXalianIds.forEach((id) => {
				let x = this.props.G.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					outCols.push(this.buildInitialSpeciesIcon(x, true));
				}
			});
		}

		let isPlayersTurn = parseInt(this.props.ctx.currentPlayer) == 0;
		// let glowIfCurrentTurnPlayer = isPlayersTurn ? 'drop-shadow(0px 0px 5px #ffffff)' : 'none';
		let glowIfCurrentTurnPlayer = isPlayersTurn ? '0px 0px 5px 5px #ffffff' : 'none';
		// let glowIfCurrentTurnOpponent = !isPlayersTurn ? 'drop-shadow(0px 0px 5px #ffffff)' : 'none';
		let glowIfCurrentTurnOpponent = !isPlayersTurn ? '0px 0px 5px 5px #ffffff' : 'none';

		let selectedXalian = duelUtil.getXalianFromId(this.props.G.selectedId || this.state.referencedXalianId, this.props.G);
		// let selectedXalianDescription = JSON.stringify(selectedXalian, null, 2);


		
		
		


		// if (this.props.G.readyAnimations && this.props.G.readyAnimations.length > 0) {
		// 	let animations = this.props.G.readyAnimations;
		// 	animations.forEach( animation => {
		// 		console.log("EXECUTING ANIMATION -> " + JSON.stringify(animation));
		// 	})
		// }

		return (
			<React.Fragment>

				<Container >
					{this.state.winner}
					{/* <Row> */}
						{/* <div className='duel-xalian-bench' style={{ border: isPlayersTurn ? '0px' : 'solid 4px white', filter: glowIfCurrentTurnOpponent  }}> */}
						{/* <div className='duel-xalian-bench' > */}
							<Row style={{ backgroundColor: '#a8222285', boxShadow: glowIfCurrentTurnOpponent }}>{opponentCols}</Row>
							<Row style={{ backgroundColor: '#4b0f0f85' }}>{opponentOutCols}</Row>
						{/* </div> */}
					{/* </Row> */}
					</Container>
					{/* {this.state.contentLoaded &&  */}
					<Container fluid style={{ padding: '0' }}>
						
						<div className='duel-board-wrapper'>
							<div className='duel-board-wrapper-background'/>
							<div className='duel-board-wrapper-background-overlay'/>
							<table id="board" style={{display: 'flex', justifyContent: 'center' }}>
								<tbody >{tbody}</tbody>
							</table>
							{/* <div className='duel-board-wrapper-background-overlay'/> */}

						{/* <Row style={{ paddingTop: '50px' }}> */}
							
						{/* </Row> */}
						</div>
					</Container>
					{/* } */}
					<Container>
					<Row>
						{this.props.G.currentTurnDetails && (this.props.G.currentTurnDetails.hasMoved || this.props.G.currentTurnDetails.hasAttacked) &&
							<Button variant='xalianGray' onClick={this.endPlayerTurn} style={{ width: '200px', maxWidth: '50vw', margin: 'auto', marginBottom: '10px', marginTop: '10px' }} >End turn</Button>
						}
					</Row>
					{/* <Row> */}
						{/* <div className='duel-xalian-bench' style={{ border: isPlayersTurn ? 'solid 4px white' : '0px', filter: glowIfCurrentTurnPlayer }}> */}
						{/* <div className='duel-xalian-bench' > */}
							<Row style={{ backgroundColor: '#3b22a885', boxShadow: glowIfCurrentTurnPlayer }}>{cols}</Row>
							<Row style={{ backgroundColor: '#170d4185' }}>{outCols}</Row>
						{/* </div> */}
					{/* </Row> */}

					{selectedXalian &&
						<DuelXalianSuggestionDetails xalian={selectedXalian} />
					}
					<AttackActionModal 
						show={this.state.showActionModal}
						onHide={this.onActionComplete}
						attackData={this.state.attackData}
					/>

				</Container>


			</React.Fragment>
		);
	}

	finishAnimation = () => {
		console.log('finshed animation');
	}

	onActionComplete = () => {
		this.setState({
			showActionModal: false,
			attackData: null
		});
	}

	endPlayerTurn = () => {
		this.props.moves.endTurn();
	}

	determineCellSizeText = () => {
		return `${this.determineCellSize()}px`;
	}

	determineCellSize = () => {
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

	setupAnimationHub = () => {
		Hub.listen("duel-animation-event", (data) => {
			const type = data.payload.event;
			const d = data.payload.data;
			if (type === "attack") {
				this.setState(
					{
						showActionModal: true,
						showAttack: true,
						attackData: d
					}
					// () => {
						// setTimeout(() => {
						// 	// Hub.dispatch("alert", { event: "hide-alert", data: null, message: null });
						// 	this.setState({
						// 		showActionModal: false,
						// 		showAttack: false,
						// 		attackData: null
						// 	})
						// }, 3000);
					// }
				);
			} else if (type === 'move') {
				let movePath = d.path;
				console.log('MOVE ANIMATION :: ' + JSON.stringify(movePath.path));
			}
		  });
	}

	

	
}



function getMovableIndices(selectedId, selectedIndex, G, ctx) {
	var moves = [];
		if (ctx.phase === 'setup' && selectedId) {
			moves = duelUtil.getStartingIndices(G, ctx);
		} else if (ctx.phase === 'play' && selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			let xalian = duelUtil.getXalianFromId(selectedId, G);
			moves = duelCalculator.calculateMovableIndices(selectedIndex, xalian, G, ctx);
		}
	return moves;
}


export default DuelBoard;
