
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
import { useSelector, useDispatch } from 'react-redux'
import { addAnimationToQueue } from '../../../../store/duelAnimationQueueSlice';
import { AnimationHub } from '../../../../store/AnimationHub';
import * as boardStateManager from '../../../../gameplay/duel/boardStateManager';
import * as moveAnimationManager from '../../../../gameplay/duel/moveAnimationManager';

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
		animationQueue: [],
		isAnimating: false,
		animationTl: gsap.timeline(),
		logIndex: 0
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
		if (window && window.innerWidth) {
			this.setSize(window.innerWidth, Math.min(window.innerHeight * 0.8, window.innerHeight - 100));
		}
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
		
	}

	componentDidUpdate() {
		let tl = this.state.animationTl;
		if (!tl.isActive()) {
			let logs = boardStateManager.getAllMoveActionsFromLog(this.props.log);
			if (this.state.logIndex < logs.length) {
				let log = logs[this.state.logIndex];
				moveAnimationManager.handleMoveAnimation(tl, log, () => {
					console.log(`incrementing index to ${this.state.logIndex + 1}`);
					this.setState({ logIndex: this.state.logIndex + 1 }, () => {
						// show green dots again once piece is done moving
						let elems = document.querySelectorAll(".duel-movable-cell-dot");
						if (elems) {
							gsap.to(gsap.utils.toArray(elems), { opacity: 1 });
						}
					});
				})
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

	handleEmptyCellSelection = (destinationIndex, boardState) => {
		let selectedId = this.props.G.selectedId;
		let selectedIndex = duelUtil.getIndexOfXalian(selectedId, boardState);

		var paths = [];
		if (this.props.ctx.phase === 'play' && selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			paths = duelCalculator.calculateMovablePaths(selectedIndex, duelUtil.getXalianFromId(selectedId, boardState), boardState, this.props.ctx);
		}
		let movableIndices = paths.map(path => path.endIndex);

		if (selectedId) { // moving a piece
			if (duelUtil.isUnset(selectedId, boardState)) { // setting piece initially
				if (duelUtil.getStartingIndices(boardState, this.props.ctx).includes(destinationIndex)) {
					this.props.moves.setPiece(destinationIndex, selectedId);
					this.setState({ referencedXalianId: null });
				} else {
					console.error("CAN NOT SET INITIAL PIECE HERE");
				}
			} else if (duelUtil.isActive(selectedId, boardState)) { // moving existing piece
				if (movableIndices.includes(destinationIndex)) { // valid move
					let path = duelCalculator.calculatePathToTarget(selectedIndex, destinationIndex, boardState, this.props.ctx);
					this.props.moves.movePiece(path);
				} else {
					this.setSelection(null, null);
					this.setState({ referencedXalianId: null });
					console.log("INVALID MOVE");
				}
			} else {
				// do nothing because piece is out ?
				this.setSelection(null, null);
				this.setState({ referencedXalianId: selectedId });
			}
		} else if (this.state.referencedXalianId) {
			this.setState({ referencedXalianId: null });
		}
	};


	// called in setup when a piece is selected to be placed
	handleInitialPieceSelection = (xalian, boardState) => {

		if (false) { // DEBUG
			let options = [56, 57, 58, 59, 60, 61, 62, 63];
			var ind = -1;
			var isEmpty = false;
			while(ind < 0 && !isEmpty) {
				ind = Math.round(Math.random() * (options.length - 1));
				isEmpty = boardState.cells[ind] ? true : false;
			}
			let selection = options[ind];
			this.props.moves.setPiece(selection, xalian.xalianId);
		} else {
			if (this.props.G.selectedId && this.props.G.selectedId === xalian.xalianId) {
				console.log('UNselected xalian ' + xalian.species.name + ' from placing');
				this.setSelection(null, null); 
				this.setState({ referencedXalianId: null });
			} else if (duelUtil.isCurrentTurnsXalian(xalian.xalianId, boardState, this.props.ctx)) {
				console.log('selected xalian ' + xalian.species.name + ' to place');
				this.setSelection(xalian.xalianId, null); 
			} else {
				console.log("CAN NOT SELECT OTHER PLAYERS PIECE");
				this.setState({ referencedXalianId: xalian.xalianId });
			}
		}
	};

	handleActivePieceSelection = (xalian, index, boardState) => {
		if (this.props.G.selectedId && boardState.xalians) {
			let selectedId = this.props.G.selectedId;
			let selectedIndex = duelUtil.getIndexOfXalian(selectedId, boardState);
			
			if ((duelUtil.isPlayerPiece(selectedId, boardState) && duelUtil.isPlayerPiece(xalian.xalianId, boardState)) 
			|| (duelUtil.isOpponentPiece(selectedId, boardState) && duelUtil.isOpponentPiece(xalian.xalianId, boardState))) {
				this.selectPiece(xalian, index, boardState); // switching piece selection from same team
			} else {
				var attackablePaths = [];
				if (selectedId && (selectedIndex != null && selectedIndex != undefined)) {
					attackablePaths = duelCalculator.calculateAttackablePaths(selectedIndex, duelUtil.getXalianFromId(selectedId, boardState), boardState, this.props.ctx);
				}
				var attackableIndices = attackablePaths.map( p => p.endIndex);
				if (attackableIndices.includes(index) && (!boardState.currentTurnDetails.hasAttacked)) {
					// do attack action
					let path = duelCalculator.calculatePathToTarget(selectedIndex, index, boardState, this.props.ctx)
					this.props.moves.doAttack(path);
					
	
					// reset selection
					this.setState({ referencedXalianId: null });
				} else {
					console.log("CAN NOT ATTACK SPACE");
				}
				
			}
		} else {
			this.selectPiece(xalian, index, boardState);
		}
	};

	selectPiece = (xalian, index, boardState) => {
		let selectedId = this.props.G.selectedId;
		let selectedIndex = duelUtil.getIndexOfXalian(selectedId, boardState);
		if (selectedIndex === index) { // unselect
			console.log('UNselecting xalian ' + xalian.species.name + ' from square ' + index);
			this.setSelection(null, null);
			this.setState({ referencedXalianId: null });
		} else {
			if (duelUtil.isCurrentTurnsXalian(xalian.xalianId, boardState, this.props.ctx)) {
				console.log('selected xalian ' + xalian.species.name + ' from square ' + index);
				this.setSelection(xalian.xalianId, index);
			} else {
				console.log('only referencing xalian ' + xalian.species.name + ' from square ' + index);
				this.setState({ referencedXalianId: xalian.xalianId });
			}
		}
	};


	
	
	buildInitialSpeciesIcon(x, boardState, isOut = false) {
		let isSelected = this.props.G.selectedId && this.props.G.selectedId === x.xalianId;
		let opac = isOut ? 0.4 : 1;

		return (
			// <Col md={2} sm={3} xs={6} className="species-col">
			<Col xs={true} className="species-col animate-state">
				<a onClick={() => this.handleInitialPieceSelection(x, boardState)}>
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

	

	getStartingBoardState = () => {
		let actionLogs = boardStateManager.getAllMoveActionsFromLog(this.props.log);
		return (actionLogs && actionLogs.length > 0 && actionLogs.length > this.state.logIndex) ? actionLogs[this.state.logIndex].metadata.startState : boardStateManager.buildBoardState(this.props.G);
	}

	render() {
		let boardState = this.getStartingBoardState();
		let size = this.determineCellSizeText();
		let selectedId = this.props.G.selectedId;
		let selectedIndex = duelUtil.getIndexOfXalian(selectedId, boardState);
		let xalian = duelUtil.getXalianFromId(selectedId, boardState);
		var moves = getMovableIndices(selectedId, selectedIndex, boardState, this.props.ctx);
		var attackablePaths = [];
		if (selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			attackablePaths = duelCalculator.calculateAttackablePaths(selectedIndex, xalian, boardState, this.props.ctx);
		}
		var attackableIndices = attackablePaths.map(p => p.endIndex);
		let tbody = [];
		for (let i = 0; i < gameConstants.BOARD_COLUMN_SIZE; i++) {
			let cells = [];
			for (let j = 0; j < gameConstants.BOARD_COLUMN_SIZE; j++) {
				const index = gameConstants.BOARD_COLUMN_SIZE * i + j;

				var cell = <DuelBoardCell
					handleEmptyCellSelection={this.handleEmptyCellSelection} 
					handleActivePieceSelection={this.handleActivePieceSelection} 
					selectedIndex={selectedIndex} 
					selectedId={selectedId} 
					size={size} 
					cellIndex={index} 
					attackableIndices={attackableIndices} 
					movableIndices={moves} 
					boardState={boardState} 
					ctx={this.props.ctx} 
				/>;

				cells.push(<td key={index}>{cell}</td>);
			}
			tbody.push(<tr key={i}>{cells}</tr>);
		}

		var cols = [];
		var outCols = [];
		var opponentCols = [];
		var opponentOutCols = [];

		if (boardState.unsetXalianIds && boardState.unsetXalianIds.length > 0 && boardState.xalians) {
			boardState.unsetXalianIds.forEach((id) => {
				let x = boardState.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					cols.push(this.buildInitialSpeciesIcon(x, boardState));
				}
			});
		}

		if (boardState.unsetOpponentXalianIds && boardState.xalians) {
			boardState.unsetOpponentXalianIds.forEach((id) => {
				let x = boardState.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					opponentCols.push(this.buildInitialSpeciesIcon(x, boardState));
				}
			});
		}

		if (boardState.inactiveOpponentXalianIds && boardState.xalians) {
			boardState.inactiveOpponentXalianIds.forEach((id) => {
				let x = boardState.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					opponentOutCols.push(this.buildInitialSpeciesIcon(x, boardState, true));
				}
			});
		}

		if (boardState.inactiveXalianIds && boardState.xalians) {
			boardState.inactiveXalianIds.forEach((id) => {
				let x = boardState.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					outCols.push(this.buildInitialSpeciesIcon(x, boardState, true));
				}
			});
		}

		let isPlayersTurn = parseInt(this.props.ctx.currentPlayer) == 0;
		// let glowIfCurrentTurnPlayer = isPlayersTurn ? 'drop-shadow(0px 0px 5px #ffffff)' : 'none';
		let glowIfCurrentTurnPlayer = isPlayersTurn ? '0px 0px 5px 5px #ffffff' : 'none';
		// let glowIfCurrentTurnOpponent = !isPlayersTurn ? 'drop-shadow(0px 0px 5px #ffffff)' : 'none';
		let glowIfCurrentTurnOpponent = !isPlayersTurn ? '0px 0px 5px 5px #ffffff' : 'none';

		let selectedXalian = duelUtil.getXalianFromId(this.props.G.selectedId || this.state.referencedXalianId, boardState);
		// let selectedXalianDescription = JSON.stringify(selectedXalian, null, 2);


		
		
		



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
						{boardState.currentTurnDetails && (boardState.currentTurnDetails.hasMoved || boardState.currentTurnDetails.hasAttacked) &&
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
					{/* <AnimationHub {...this.props} tl={this.state.animationTl}/> */}

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
		if (this.state.size) {
			let windowSize = this.state.size.min;
			let initialSize = Math.floor((windowSize) / duelConstants.BOARD_COLUMN_SIZE);
			let cellSize = Math.floor((windowSize - initialSize) / duelConstants.BOARD_COLUMN_SIZE);
			let maxSize = Math.max(35, Math.min(cellSize, 75));

			return maxSize;
		} else {
			return 75;
		}
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



function getMovableIndices(selectedId, selectedIndex, boardState, ctx) {
	var moves = [];
		if (ctx.phase === 'setup' && selectedId) {
			moves = duelUtil.getStartingIndices(boardState, ctx);
		} else if (ctx.phase === 'play' && selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			let xalian = duelUtil.getXalianFromId(selectedId, boardState);
			moves = duelCalculator.calculateMovableIndices(selectedIndex, xalian, boardState, ctx);
		}
	return moves;
}


export default DuelBoard;
