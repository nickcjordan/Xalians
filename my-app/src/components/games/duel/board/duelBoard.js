
import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Navbar from 'react-bootstrap/Navbar';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Stack from 'react-bootstrap/Stack';
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
import AttackActionModal from './attackActionModal';
import { useSelector, useDispatch } from 'react-redux'
import { addAnimationToQueue } from '../../../../store/duelAnimationQueueSlice';
import { AnimationHub } from '../../../../store/AnimationHub';
import * as boardStateManager from '../../../../gameplay/duel/boardStateManager';
import * as playerStateManager from '../../../../gameplay/duel/playerStateManager';
import * as moveAnimationManager from '../../../../gameplay/duel/moveAnimationManager';

import fitty from 'fitty';
import LocalDuelStorage from '../../../../store/LocalStorage';

import gsap from 'gsap';
import Flip from 'gsap/Flip';
import Draggable from 'gsap/Draggable';
import MotionPathPlugin from 'gsap/MotionPathPlugin';
gsap.registerPlugin(Flip, MotionPathPlugin, Draggable);


class DuelBoard extends React.Component {
	state = {
		contentLoaded: false,
		attackResult: {},
		animationQueue: [],
		isAnimating: false,
		animationTl: gsap.timeline(),
		logIndex: 0,
		randomlyAssignStartingPositions: true,
		hideXalianDetails: false
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
		if (w > 0 && h > 0) {
			let max = Math.max(w, h);
			let min = Math.min(w, h);
			
			let padding = 10;
			
			let boardSize = {
				width: w - padding,
				height: h - padding,
				max: max - padding,
				min: min - padding,
			};
			
			LocalDuelStorage.setBoardSize(boardSize);
			
			
			this.setState({
				contentLoaded: true,
				size: boardSize,
			});
		}
	};

	updateSize = () => {
		if (window && window.innerWidth) {
			this.setSize(window.innerWidth, window.innerHeight * 0.5);
		}
	};
	
	componentDidMount() {
		document.addEventListener('DOMContentLoaded', this.updateSize);
		window.addEventListener('resize', this.updateSize);

		let fits = fitty('.fit-xalian-name-text', {
			minSize: 10,
			maxSize: 14,
		});

		if (this.props.ctx.phase === 'setup' && this.state.randomlyAssignStartingPositions) {
			this.props.moves.initializeSetup();
		}

		// alert("READ THIS FIRST! (DEBUG MODE: after you tap ok, tap the white-boxed arrow to hide the debug menu) READ THIS NEXT PART THEN TAP OK! =====> GOAL OF GAME ==> grab your blue flag and move it to your side's first row (bottom of board), OR defeat all enemies :::::::: HOW TO PLAY: (you are blue) ==> you can move any of your pieces on your turn, up to 3 spaces per turn :: the 3 spaces do not have to be moved by the same piece :: you are allowed one attack per turn :: you can move and attack in any order :: once a piece's health reaches 0, it is eliminated :: you can move more than once per turn, as long as your total spaces moved and your active pieces' range allows it :: when a piece is selected, the red X's indicate how effective your selected piece's attack would be against the opponent, the red-striped circles indicate attack range, the green dots indicate viable moves :: a piece cannot move through another piece :: bot goes first :: have fun!");
		
	}

	isAnimationHappening = () => {
		return (this.state.animationTl) && (this.state.animationTl.isActive() || this.state.animationTl.paused());
	} 

	componentDidUpdate(prevProps, prevState) {
		if (this.state.selectedXalianId && (this.props.ctx.currentPlayer === '1')) {
			this.setXalianIds();
		}
		if (!this.isAnimationHappening()) {
			// console.log('\n\n' + JSON.stringify(this.props.log, null, 2) + '\n\n');
			let logs = boardStateManager.getAllMoveActionsFromLog(this.props.log);
			if (this.state.logIndex < logs.length) {
				let log = logs[this.state.logIndex];
				let isLastLog = this.state.logIndex == (logs.length - 1);
				moveAnimationManager.handleMoveAnimation(this.state.animationTl, log, this.onMoveAnimationComplete, this.onAttackAnimationSetStateAttackDetails, isLastLog, this.props.G);
			}
			//  else {
				// this.setSelectedXalianIdFromLastActionOfPlayer();
			// }
		}
		if (this.props.ctx.gameover && this.state.winnerText == undefined) {
			this.setState({ winnerText: this.props.ctx.gameover.winner !== undefined && this.props.ctx.gameover.winner == 0 ? 'You Win!' : 'You Lose!' });
		}

		gsap.set(document.querySelectorAll(".duel-piece"), {transform: 'none'});

		
	}

	setSelectedXalianIdFromLastActionOfPlayer = (callback = () => { }) => {
		if (!this.state.selectedXalianId) {
			let logs = boardStateManager.getAllMoveActionsFromLog(this.props.log);
			let lastLog = logs[logs.length - 1];
			if (lastLog.action.payload.playerID === this.props.ctx.currentPlayer) {

				let lastLogForCurrentPlayer = logs.filter(log => (log.action.payload.playerID === this.props.ctx.currentPlayer)).pop();
				if (lastLogForCurrentPlayer) {
					let payload = lastLogForCurrentPlayer.action.payload;
					if (payload.type === 'movePiece') {
						let startState = this.props.G.boardStateHistory[lastLogForCurrentPlayer.metadata.boardStateIndex];
						let moverId = startState.cells[payload.args[0].startIndex];
						if (moverId) {
							this.setXalianIds(moverId, null, callback);
						}
					} else if (payload.type === 'doAttack') {
						console.log(lastLogForCurrentPlayer);
						let attackerId = lastLogForCurrentPlayer.metadata.attackActionResult.attackerId;
						this.setXalianIds(attackerId, null, callback);
					}
				}
			}
		}
	}

	onMoveAnimationComplete = () => {
		this.setState({ logIndex: this.state.logIndex + 1 }, () => {
			// show green dots again once piece is done moving
			// let elems = document.querySelectorAll(".duel-movable-cell-dot");
			let target = document.querySelectorAll(".fade-out-animation-on-move");
			if (target && target.length > 0) {
				// gsap.to(gsap.utils.toArray(target), { autoAlpha: 1 });
			}

			this.setSelectedXalianIdFromLastActionOfPlayer();
		});
	}
	
	onAttackAnimationSetStateAttackDetails = (newState) => {
		this.state.animationTl.pause();
		this.setState(newState);
	}
	
	onAttackActionComplete = () => {
		this.setState({
			showActionModal: false,
			attackAnimationData: null,
			logIndex: this.state.logIndex + 1
		}, () => {
			if (this.state.animationTl) {
				this.state.animationTl.play();
			} else {
				this.setSelectedXalianIdFromLastActionOfPlayer();
			}
		});
	}
	
	handleEmptyCellSelection = (destinationIndex, boardState, dragged = false) => {
		let selectedId = this.getSelectedXalianId();
		let selectedIndex = duelUtil.getIndexOfXalian(selectedId, boardState);
		this.takeActionOnCell(destinationIndex, boardState, selectedId, selectedIndex, dragged);
	};

	takeActionOnCell = (destinationIndex, boardState, selectedId, selectedIndex, dragged) => {
		var paths = [];
		if (this.props.ctx.phase === 'play' && selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			paths = duelCalculator.calculateMovablePaths(selectedIndex, duelUtil.getXalianFromId(selectedId, boardState), boardState, this.props.ctx);
		}
		let movableIndices = paths.map(path => path.endIndex);

		if (selectedId) { // moving a piece
			if (duelUtil.isUnset(selectedId, boardState)) {
				/*
					SET INITIAL PIECE 
				*/
				if (duelUtil.getStartingIndices(boardState, this.props.ctx).includes(destinationIndex)) {
					this.setXalianIds(null, null, () => {
						this.props.moves.setPiece(destinationIndex, selectedId);
					});
				} else {
					console.error("CAN NOT SET INITIAL PIECE HERE");
				}
			} else if (duelUtil.isActive(selectedId, boardState)) {
				/*
					MOVE PIECE 
				*/
				if (movableIndices.includes(destinationIndex)) { // valid move
					let path = paths.filter(p => (p.endIndex == destinationIndex))[0];
					path.dragged = dragged;
					this.makeMoveToCell(path, boardState);
					
				} else {
					this.setXalianIds();
					console.log("INVALID MOVE");
				}
			} else {
				/*
					REFERENCE INVALID PIECE
				*/
				// piece is out, but can still show details for xalian
				this.setReferencedXalianId(selectedId);
			}
		} else if (this.getReferencedXalianId()) {
			/*
				SETTING NEW REFERENCED XALIAN
			*/
			if (selectedId === this.getReferencedXalianId()) {
				this.setReferencedXalianId();
			} else {
				this.setReferencedXalianId(selectedId);
			}
		}
	}

	makeMoveToCell = (path, boardState) => {
		let playerHasMoveAvailable = duelUtil.currentTurnHasMoveAvailable(boardState, this.props.ctx);
		let shouldResetSelectedXalian = boardState.currentTurnDetails.isComplete || !playerHasMoveAvailable;
		// if (shouldResetSelectedXalian) {
			this.setXalianIds(null, null, () => {
				this.props.moves.movePiece(path);
			});
		// } else {
			// this.props.moves.movePiece(path);
		// }
	}

	setReferencedXalianId = (id = null) => {
		if (id && id !== 'null') {
			LocalDuelStorage.setReferencedXalianId(id);
			this.setState({ referencedXalianId: id, hideXalianDetails: false }); 
		} else {
			LocalDuelStorage.removeReferencedXalianId();
			this.setState({ referencedXalianId: null, hideXalianDetails: false }); 
		}
	}

	setSelectedXalianId = (id, callback) => {
		if (duelUtil.isPlayersTurn(this.props.ctx)) {
			if (id) {
				LocalDuelStorage.setSelectedXalianId(id);
				this.setState({ selectedXalianId: id, hideXalianDetails: false }, callback); 
			} else {
				LocalDuelStorage.removeSelectedXalianId();
				this.setState({ selectedXalianId: null, hideXalianDetails: false }, callback); 
			}
		}
	}

	setXalianIds = (selectionId = null, referenceId = null, callback = null) => {
		this.setState({ 
			selectedXalianId: selectionId,
			referencedXalianId: referenceId,
			hideXalianDetails: false
		}, callback); 
	}

	getSelectedXalianId = () => {
		let local = LocalDuelStorage.getSelectedXalianId();
		let s = this.state.selectedXalianId;
		return s;
	}

	getReferencedXalianId = () => {
		let local = LocalDuelStorage.getReferencedXalianId();
		let s = this.state.referencedXalianId;
		return s;
	}



	// called in setup when a piece is selected to be placed
	handleInitialPieceSelection = (xalian, boardState) => {
		if (this.getSelectedXalianId() && this.getSelectedXalianId() === xalian.xalianId) {
			console.log('UNselected xalian ' + xalian.species.name + ' from placing');
			this.setXalianIds()
		} else if (duelUtil.isCurrentTurnsXalian(xalian.xalianId, boardState, this.props.ctx)) {
			console.log('selected xalian ' + xalian.species.name + ' to place');
			this.setSelectedXalianId(xalian.xalianId);
		} else {
			console.log("CAN NOT SELECT OTHER PLAYERS PIECE");
			this.setReferencedXalianId(xalian.xalianId);
		}
	};

	handleActivePieceSelection = (xalian, index, boardState, callback) => {
		if (this.getSelectedXalianId() && this.props.G.xalians) {
			let selectedId = this.getSelectedXalianId();
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
					let path = attackablePaths.filter( p => (p.endIndex == index))[0];
					// let path = duelCalculator.calculatePathToTarget(selectedIndex, index, boardState, this.props.ctx)
					this.props.moves.doAttack(path);
					
	
					// reset selection
					// this.setState({ referencedXalianId: null });
					// LocalDuelStorage.removeReferencedXalianId();
					// this.setReferencedXalianId();
				} else {
					console.log("CAN NOT ATTACK SPACE");
				}
				
			}
		} else {
			this.selectPiece(xalian, index, boardState, callback);
		}
	};

	selectPiece = (xalian, index, boardState, callback) => {
		let selectedId = this.getSelectedXalianId();
		let selectedIndex = duelUtil.getIndexOfXalian(selectedId, boardState);
		if (selectedIndex === index) { // unselect
			console.log('UNselecting xalian ' + xalian.species.name + ' from square ' + index);
			// this.setSelectedXalianId();
			// this.setReferencedXalianId();
			this.setXalianIds();
			// this.setState({ referencedXalianId: null });
			// LocalDuelStorage.removeReferencedXalianId();
		} else {
			if (duelUtil.isCurrentTurnsXalian(xalian.xalianId, boardState, this.props.ctx)) {
				console.log('selected xalian ' + xalian.species.name + ' from square ' + index);
				this.setSelectedXalianId(xalian.xalianId, callback);
			} else {
				console.log('only referencing xalian ' + xalian.species.name + ' from square ' + index);
				// this.setState({ referencedXalianId: xalian.xalianId });
				// LocalDuelStorage.setReferencedXalianId(xalian.xalianId);
				this.setReferencedXalianId(xalian.xalianId);
			}
		}
	};


	
	
	buildInitialSpeciesIcon(x, boardState, isOut = false) {
		let isSelected = this.getSelectedXalianId() && this.getSelectedXalianId() === x.xalianId;
		let opac = isOut ? 0.4 : 1;
		let cellSizeText = this.determineCellSizeText();

		return (
			// <Col md={2} sm={3} xs={6} className="species-col">
			// <div className="">
			
				<Col style={{ maxWidth: cellSizeText }} className='duel-unset-piece-wrapper' onClick={() => this.handleInitialPieceSelection(x, boardState)}>
					<XalianImage padding='2%' colored rounded shadowed selected={isSelected} speciesName={x.species.name} primaryType={x.elementType} moreClasses="duel-xalian-unselected" style={{ opacity: opac }} />
					{/* <Row style={{ width: '100%', margin: '0px', padding: '0px' }}> */}
						<div style={{ padding: '0px', height: '100%', width: '100%', margin: 'auto' }}>
							<h6 className="fit-xalian-name-text" style={{ textAlign: 'center', margin: 'auto', height: '100%', width: '100%', color: 'white', opacity: 0.5 }}>
								{x.species.name}
							</h6>
						</div>
					{/* </Row> */}
				</Col>
			// </div>
		);
	}

	

	getStartingBoardState = () => {
		let actionLogs = boardStateManager.getAllMoveActionsFromLog(this.props.log);
		let s = (actionLogs && actionLogs.length > 0 && actionLogs.length > this.state.logIndex) ? this.props.G.boardStateHistory[actionLogs[this.state.logIndex].metadata.boardStateIndex] : boardStateManager.buildBoardState(this.props.G, this.props.ctx);
		return s;
	}

	buildUserActionButtons = (boardState) => {
		let showEndTurnButton = this.props.ctx.phase === 'play' && boardState.currentTurnDetails && (boardState.currentTurnDetails.hasMoved || boardState.currentTurnDetails.hasAttacked);
		let userActionButtons = [];
		userActionButtons.push(
			<Col style={{ display: 'flex', justifyContent: 'center' }}>
				<Button variant='xalianGray' disabled={!showEndTurnButton} onClick={this.endPlayerTurn} style={{ margin: 'auto', marginBottom: '10px', marginTop: '10px' }} >End turn</Button>
			</Col>
		)
		if (showEndTurnButton) {
			
		}



		userActionButtons.push(
			<Col style={{ display: 'flex', justifyContent: 'center' }}>
				<Button variant='xalianGray' onClick={() => { this.setState({dummy: (this.state.dummy || 0) + 1}) }} style={{ margin: 'auto', marginBottom: '10px', marginTop: '10px' }} >DEBUG</Button>
			</Col>
		)
		return userActionButtons;
	}

	render() {
		let cellSizeText = this.determineCellSizeText();
		let cellSize = this.determineCellSize();
		let boardState = this.getStartingBoardState();
		let selectedId = this.getSelectedXalianId();

		var selectedXalianMovableIndices = duelUtil.getMovableIndices(selectedId, boardState, this.props.ctx);
		var selectedXalianAttackableIndices = duelUtil.getAttackableIndices(selectedId, boardState, this.props.ctx, false);

		let referencedId = this.getReferencedXalianId();
		var referencedXalianMovableIndices = referencedId ? duelUtil.getMovableIndices(referencedId, boardState, this.props.ctx) : [];
		var referencedXalianAttackableIndices = referencedId ? duelUtil.getAttackableIndices(referencedId, boardState, this.props.ctx, false) : [];

		let tbody = [];
		for (let i = 0; i < gameConstants.BOARD_COLUMN_SIZE; i++) {
			let cells = [];
			for (let j = 0; j < gameConstants.BOARD_COLUMN_SIZE; j++) {
				const index = gameConstants.BOARD_COLUMN_SIZE * i + j;

				var cell = <DuelBoardCell
					handleEmptyCellSelection={this.handleEmptyCellSelection} 
					handleActivePieceSelection={this.handleActivePieceSelection} 
					makeMoveToCell={this.makeMoveToCell}
					cellSizeText={cellSizeText} 
					cellSize={cellSize}
					cellIndex={index} 
					boardState={boardState} 
					ctx={this.props.ctx} 
					selectedXalianId={selectedId} 
					selectedXalianMovableIndices={selectedXalianMovableIndices} 
					selectedXalianAttackableIndices={selectedXalianAttackableIndices} 
					referencedXalianId={referencedId}
					referencedXalianMovableIndices={referencedXalianMovableIndices}
					referencedXalianAttackableIndices={referencedXalianAttackableIndices}
					{...this.props}
				/>;

				cells.push(<td key={index}>{cell}</td>);
			}
			tbody.push(<tr key={i}>{cells}</tr>);
		}

		var cols = this.buildTeamList(boardState.playerStates[0].unsetXalianIds, boardState);
		var outCols = this.buildTeamList(boardState.playerStates[0].inactiveXalianIds, boardState);
		var opponentCols = this.buildTeamList(boardState.playerStates[1].unsetXalianIds, boardState);
		var opponentOutCols = this.buildTeamList(boardState.playerStates[1].inactiveXalianIds, boardState);

		let isPlayersTurn = parseInt(this.props.ctx.currentPlayer) == 0;
		let glowIfCurrentTurnPlayer = isPlayersTurn ? '0px 0px 5px 5px #ffffff' : 'none';
		let glowIfCurrentTurnOpponent = !isPlayersTurn ? '0px 0px 5px 5px #ffffff' : 'none';

		let selectedXalian = duelUtil.getXalianFromId(selectedId, boardState);
		// let referencedXalian = duelUtil.getXalianFromId(this.state.referencedXalianId, boardState);
		let referencedXalian = duelUtil.getXalianFromId(this.getReferencedXalianId(), boardState);
		let xalianDetailsToShow = selectedXalian || referencedXalian;
		
		let userActionButtons = this.buildUserActionButtons(boardState);

		return (
			<React.Fragment>
				<div className='duel-page-background-overlay' />

				<Container fluid style={{ width: '100%', padding: '0px', margin: '0px', position: 'relative', height: '100vh', width: '100vw'}}>
					{/* <Stack className='' style={{ width: '100%', padding: '0px', margin: 'auto', position: 'relative' }}> */}

						{/* INFO BOX */}
						<Container style={{ height: '100px', display: 'flex'}} onClick={() => { this.setState({  dummy: (this.state.dummy || 0) + 1 }) }}>
							<h6>{this.state.dummy}</h6>
							{this.state.winnerText &&
								<h1 className='vertically-center-contents' style={{ margin: 'auto', textAlign: 'center' }} >{this.state.winnerText}</h1>
							}
							{!this.state.winnerText &&
								<h1 className='vertically-center-contents' style={{ margin: 'auto', textAlign: 'center' }}>{this.props.ctx.currentPlayer == 0 ? 'Your Turn' : ''}</h1>
							}
						</Container>

						<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'absolute', top: '50%', left: '50%', height: 'auto', width: '100%', transform: 'translate(-50%, -50%)' }}>

							<Container style={{}}>
								<Row className='duel-unset-piece-row' style={{ backgroundColor: '#a8222285', borderRadius: '5px' }}>{opponentCols}{opponentOutCols}</Row>
							</Container>

							<Container fluid style={{ width: '100%', padding: '0px', margin: '0px' }}>
								<div className='duel-board-wrapper'>
									<div className='duel-board-wrapper-background' />
									<div className='duel-board-wrapper-background-overlay' />
									<table id="board" style={{ display: 'flex', justifyContent: 'center' }}>
										<tbody >{tbody}</tbody>
									</table>
								</div>
								{this.state.attackAnimationData &&
									<AttackActionModal
										show={this.state.showActionModal}
										onHide={this.onAttackActionComplete}
										attacker={this.state.attackAnimationData.attacker}
										defender={this.state.attackAnimationData.defender}
										result={this.state.attackAnimationData.result}
										attackerColor={this.state.attackAnimationData.attackerColor}
										defenderColor={this.state.attackAnimationData.defenderColor}
										cellSize={this.determineCellSize()}
										attackerStartRect={this.state.attackAnimationData.attackerStartRect}
										defenderStartRect={this.state.attackAnimationData.defenderStartRect}
										animationTl={this.state.animationTl}
									/>
								}
							</Container>

							<Container style={{}}>
								<Row className='duel-unset-piece-row' style={{ width: '100%', backgroundColor: '#3b22a885', borderRadius: '5px' }}>{cols}{outCols}</Row>
							</Container>

						</div>

						{(xalianDetailsToShow && !this.state.hideXalianDetails) &&
							<Offcanvas scroll backdrop={false} placement="top" show={xalianDetailsToShow} onHide={this.onHideXalianDetails} style={{backgroundColor: '#00000000', border: '0'}} >
								<Offcanvas.Body>
									<DuelXalianSuggestionDetails xalian={xalianDetailsToShow} />
								</Offcanvas.Body>
							</Offcanvas>
								// <Container fluid='sm' style={{ maxWidth: '400px', position: }}>
								// 	<DuelXalianSuggestionDetails xalian={xalianDetailsToShow} />
								// </Container>
						}



					{/* </Stack> */}
						<div className="fixed-bottom" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,1) 15%, rgba(0,0,0,0.8099614845938375) 89%, rgba(0,0,0,0.6138830532212884) 94%, rgba(0,0,0,0) 100%)' }}>
							<Row >
								{userActionButtons}
							</Row>
						</div>
				</Container>
			</React.Fragment>
		);
	}

	onHideXalianDetails = () => {
		this.setState({ hideXalianDetails: true });
	}

	buildTeamList = (list, boardState) => {
		let cols = [];
		if (list && this.props.G) {
			list.forEach((id) => {
				let x = this.props.G.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					cols.push(this.buildInitialSpeciesIcon(x, boardState));
				}
			});
		}
		return cols;
	}


	endPlayerTurn = () => {
		// this.props.moves.endTurn();
		this.props.events.endTurn();
	}

	determineCellSizeText = () => {
		return `${this.determineCellSize()}px`;
	}

	determineCellSize = () => {
		if (this.state.size) {
			return this.buildCellSizeFromBoardSize(this.state.size.min);
		} else {
			let localBoardSize = LocalDuelStorage.getBoardSize();
			if (localBoardSize) {
				return this.buildCellSizeFromBoardSize(localBoardSize.min);
			} else {
				return 35;
			}
		}
	}

	getBoardSize = () => {
		if (this.state.size) {
			return this.state.size.min;
		} else {
			let localBoardSize = LocalDuelStorage.getBoardSize();
			if (localBoardSize) {
				return localBoardSize.min;
			} else {
				return 100;
			}
		}
	}

	buildCellSizeFromBoardSize = (boardSize) => {
		let windowSize = boardSize;
		let initialSize = Math.floor((windowSize) / duelConstants.BOARD_COLUMN_SIZE);
		let cellSize = Math.floor((windowSize - initialSize) / duelConstants.BOARD_COLUMN_SIZE);
		let maxSize = Math.max(35, Math.min(cellSize, 75));

		return maxSize;
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
				// console.log('MOVE ANIMATION :: ' + JSON.stringify(movePath.path));
			}
		  });
	}

	

	
}





export default DuelBoard;
