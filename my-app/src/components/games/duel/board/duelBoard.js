
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
import * as boardUtil from '../../../../gameplay/duel/utils/boardUtil';
import * as playerStateManager from '../../../../gameplay/duel/playerStateManager';
import * as moveAnimationManager from '../../../../gameplay/duel/moveAnimationManager';

import fitty from 'fitty';
import LocalDuelStorage from '../../../../store/LocalStorage';

import gsap from 'gsap';
import Flip from 'gsap/Flip';
import Draggable from 'gsap/Draggable';
import MotionPathPlugin from 'gsap/MotionPathPlugin';
import constants from '../../../../constants/constants';
gsap.registerPlugin(Flip, MotionPathPlugin, Draggable);


class DuelBoard extends React.Component {
	state = {
		contentLoaded: false,
		attackResult: {},
		animationQueue: [],
		isAnimating: false,
		animationTl: gsap.timeline(),
		logIndex: 0,
		showXalianDetails: false,
		animationIndex: -1
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

	updateSize = () => {
		if (window && window.innerWidth) {
			this.setState(boardUtil.buildBoardSizeState(window.innerWidth, window.innerHeight * 0.5));
		}
	};
	
	componentDidMount() {
		document.addEventListener('DOMContentLoaded', this.updateSize);
		window.addEventListener('resize', this.updateSize);
		this.updateSize();
		// alert("READ THIS FIRST! (DEBUG MODE: after you tap ok, tap the white-boxed arrow to hide the debug menu) READ THIS NEXT PART THEN TAP OK! =====> GOAL OF GAME ==> grab your blue flag and move it to your side's first row (bottom of board), OR defeat all enemies :::::::: HOW TO PLAY: (you are blue) ==> you can move any of your pieces on your turn, up to 3 spaces per turn :: the 3 spaces do not have to be moved by the same piece :: you are allowed one attack per turn :: you can move and attack in any order :: once a piece's health reaches 0, it is eliminated :: you can move more than once per turn, as long as your total spaces moved and your active pieces' range allows it :: when a piece is selected, the red X's indicate how effective your selected piece's attack would be against the opponent, the red-striped circles indicate attack range, the green dots indicate viable moves :: a piece cannot move through another piece :: bot goes first :: have fun!");
		this.transitionClientViewForActivePlayer();
		
	}

	isAnimationHappening = () => {
		return (this.state.animationTl) && (this.state.animationTl.isActive() || this.state.animationTl.paused());
	} 

	componentDidUpdate(prevProps, prevState) {
		// if (prevProps.)
		let fits = fitty('.fit-xalian-name-text', {
			minSize: 10,
			maxSize: 14,
		});
		// if (!this.isAnimationHappening()) {
		if (this.state.animationIndex == -1 || this.state.animationIndex < this.state.logIndex) {
			let logs = boardStateManager.getAllMoveActionsFromLog(this.props.log);
			if (this.state.logIndex < logs.length) {
					let log = logs[this.state.logIndex];
					let isLastLog = this.state.logIndex == (logs.length - 1);
					let tl = this.state.animationTl;
					let onMoveAnimation = this.onMoveAnimationComplete;
					let onAttackAnimation = this.onAttackAnimationSetStateAttackDetails;
					let boardState = this.props.G;
					if (log.phase === 'setup') {
						// onMoveAnimation();
					} else {
							// setTimeout(function() {
							moveAnimationManager.handleMoveAnimation(tl, log, onMoveAnimation, onAttackAnimation, isLastLog, boardState);

							this.setState({ animationIndex: this.state.animationIndex + 1});
							//   }, 1000);
						}
					// }

			} else {
			}
			
			
		} else {
		}
		if (this.props.ctx.gameover && this.state.winnerText == undefined) {
			this.setState({ winnerText: this.props.ctx.gameover.winner !== undefined && this.props.ctx.gameover.winner == 0 ? 'You Win!' : 'You Lose!' });
		}

		// fixing issue where sometimes the piece would have some weird extra leftovr x and y transform translation
		gsap.set(document.querySelectorAll(".duel-piece"), {transform: 'none'});

		if (prevProps.ctx.turn < this.props.ctx.turn) {
			// new turn :: should be switching client
			//commented out because it was making things kinda slow
			this.transitionClientViewForActivePlayer();
		}

		// if (prevProps.isActive && !this.props.isActive) {// transitioning from active player to not active player
			// let fadingElementsOnMove = document.querySelectorAll(".duel-board-cell-dot-light");
			// let fadingElementsOnMove = document.querySelectorAll(".attack-pattern-background");
			// if (fadingElementsOnMove && fadingElementsOnMove.length > 0) {
				// gsap.to(gsap.utils.toArray(fadingElementsOnMove), { autoAlpha: 0, duration: 0.1 });
			// }

			// gsap.to(gsap.utils.toArray(document.querySelectorAll(".fade-out-animation-on-move")), { autoAlpha: 0 });
		// } else 
		// if (!prevProps.isActive && this.props.isActive) { // transitioning from not active player to active player
		// 	gsap.to(gsap.utils.toArray(document.querySelectorAll(".fade-out-animation-on-move")), { opacity: 1 });
		// } else {
		// 	gsap.to(gsap.utils.toArray(document.querySelectorAll(".fade-out-animation-on-move")), { opacity: 0 });
		// }

		if (this.props.isActive && this.props.ctx.phase === 'setup' && this.props.G.randomizeStartingPositions && !this.state.hasInitialized) {
			this.setState({ hasInitialized: true }, () => {
				this.props.moves.initializeSetup(parseInt(this.props.playerID));
			});
			
		}

		
	}

	transitionClientViewForActivePlayer = () => {
		// fade background from previous player's color to the active player's color 
		let elemid = `duel-page-background-overlay-client-${this.props.playerID}`;
		let clientViewElem = document.getElementById(elemid);
		if (clientViewElem) {
			if (this.shouldShowClientView()) {
				gsap.fromTo(clientViewElem, {autoAlpha: 0}, {autoAlpha: 1, duration: 1, delay: 0.5});
			} 
			else {
				gsap.fromTo(clientViewElem, {autoAlpha: 1}, {autoAlpha: 0, duration: 1, delay: 0.5});
			}
		}
	}

	setSelectedXalianIdFromLastActionOfPlayer = (callback = () => { }) => {
		let lastLogForCurrentPlayer = boardStateManager.getLastActionOfPlayer(this.props.log, this.props.playerID);
		if (lastLogForCurrentPlayer) {
			let payload = lastLogForCurrentPlayer.action.payload;
			// if ((payload.type === 'movePiece' || payload.type === 'doAttack') && payload.args && payload.args[0] && lastLogForCurrentPlayer.metadata && lastLogForCurrentPlayer.metadata.boardStateIndex) {
			if ((payload.type === 'movePiece' || payload.type === 'doAttack') && payload.args && payload.args[0] && lastLogForCurrentPlayer.metadata && lastLogForCurrentPlayer.metadata.startState) {
				// let startState = this.props.G.boardStateHistory[lastLogForCurrentPlayer.metadata.boardStateIndex];
				let startState = lastLogForCurrentPlayer.metadata.startState;
				let moverId = startState.cells[payload.args[0].startIndex];
				if (moverId) {
					this.setXalianIds(moverId, null, callback);
				}
			} else if (payload.type === 'doAttack' && lastLogForCurrentPlayer.metadata && lastLogForCurrentPlayer.metadata.attackActionResult && lastLogForCurrentPlayer.metadata.attackActionResult.attackerId) {
				let attackerId = lastLogForCurrentPlayer.metadata.attackActionResult.attackerId;
				this.setXalianIds(attackerId, null, callback);
			}
		}
	}

	onMoveAnimationComplete = () => {
		this.setState({ logIndex: this.state.logIndex + 1 }, () => {
			// show green dots again once piece is done moving
			// let elems = document.querySelectorAll(".duel-movable-cell-dot");
			// let target = document.querySelectorAll(".fade-out-animation-on-move");
			// if (target && target.length > 0) {
				// gsap.to(gsap.utils.toArray(target), { autoAlpha: 1 });
			// }
			if (this.state.animationTl.totalProgress() == 1) {
				this.endTurnIfNoMovesAvailable();
			}
			// this.endTurnIfNoMovesAvailable();
			// if (!this.props.ctx.gameover) {
				// this.setSelectedXalianIdFromLastActionOfPlayer();
			// }
		});
	}
	
	endTurnIfNoMovesAvailable = () => {
		let moveAvailable = playerStateManager.currentPlayerHasMoveAvailable(this.props.G, this.props.ctx);
		if (this.props.G.hasBot
			&& this.props.G.currentTurnDetails 
			&& (this.props.G.currentTurnDetails.hasMoved || this.props.G.currentTurnDetails.hasAttacked) 
			&& !moveAvailable) {
				if (this.props.G.hasBot && !duelUtil.isBotsTurn(this.props.G, this.props.ctx)) {
					// add delay if ending turn and about to be bots turn
					setTimeout(() => {
						if (!duelUtil.isBotsTurn(this.props.G, this.props.ctx)) {
							if (this && this.props && this.props.moves && this.props.moves.endTurn) {
								this.props.moves.endTurn();
								// this.props.ctx.events.endTurn();
							}
						}
					}, 250);
				}
		} else if (!this.props.ctx.gameover) {
			// this.setSelectedXalianIdFromLastActionOfPlayer();
		}
	}
	
	onAttackAnimationSetStateAttackDetails = (newState) => {
		
		this.setState(newState, () => {
			this.state.animationTl.pause();
		});
	}
	
	onAttackActionComplete = () => {
		this.setState({
			showActionModal: false,
			attackAnimationData: null,
			logIndex: this.state.logIndex + 1
		}, () => {
			if (this.state.animationTl) {

				if (this.state.animationTl.totalProgress() == 1) {
					this.endTurnIfNoMovesAvailable();
				}

				this.state.animationTl.resume();

			} else {
				// if (!this.props.ctx.gameover) {
					// this.setSelectedXalianIdFromLastActionOfPlayer();
				// }
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
				// let startingIndices = duelUtil.getStartingIndices(boardState, this.props.ctx);
				let startingIndices = duelUtil.getStartingIndicesOfPlayer(parseInt(this.props.playerID), boardState);
				if (startingIndices.includes(destinationIndex)) {
					if (this.props.ctx.phase === 'setup') {
						this.setXalianIds(null, null, () => {
							this.props.moves.setPiece(destinationIndex, selectedId);
						});
					}
					
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
			if (!this.state.showXalianDetails && selectedId === this.getReferencedXalianId()) {
				this.setState({ showXalianDetails: true });
			} else {
				this.setReferencedXalianId(selectedId);
			}
		}
	}

	makeMoveToCell = (path, boardState) => {
		// let playerHasMoveAvailable = duelUtil.currentTurnHasMoveAvailable(boardState, this.props.ctx);
		// let shouldResetSelectedXalian = boardState.currentTurnDetails.isComplete || !playerHasMoveAvailable;
		// if (shouldResetSelectedXalian) {
			// this.setXalianIds(null, null, () => {
				this.props.moves.movePiece(path);
			// });
		// } else {
			// this.props.moves.movePiece(path);
		// }
	}

	setReferencedXalianId = (id = null) => {
		if (id && id !== 'null') {
			LocalDuelStorage.setReferencedXalianId(id);
			this.setState({ referencedXalianId: id }); 
		} else {
			LocalDuelStorage.removeReferencedXalianId();
			this.setState({ referencedXalianId: null }); 
		}
	}

	setSelectedXalianId = (id, callback) => {
		// if (duelUtil.isPlayersTurn(this.props.ctx)) {
			if (id) {
				LocalDuelStorage.setSelectedXalianId(id);
				this.setState({ selectedXalianId: id }, callback); 
			} else {
				LocalDuelStorage.removeSelectedXalianId();
				this.setState({ selectedXalianId: null }, callback); 
			}
		// }
	}

	setXalianIds = (selectionId = null, referenceId = null, callback = null) => {
		this.setState({ 
			selectedXalianId: selectionId,
			referencedXalianId: referenceId
		}, callback); 
	}

	getSelectedXalianId = () => {
		// let local = LocalDuelStorage.getSelectedXalianId();
		let s = this.state.selectedXalianId;
		return s;
	}

	getReferencedXalianId = () => {
		// let local = LocalDuelStorage.getReferencedXalianId();
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

	handleActivePieceSelection = (xalian, index, boardState) => {
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

					// this.setXalianIds(null, null, () => {
						this.props.moves.doAttack(path);
					// });
					
	
					// reset selection
					// this.setState({ referencedXalianId: null });
					// LocalDuelStorage.removeReferencedXalianId();
					// this.setReferencedXalianId();
				} else {
					console.log("CAN NOT ATTACK SPACE");
				}
				
			}
		} else {
			this.selectPiece(xalian, index, boardState);
		}
	};

	selectPiece = (xalian, indexClicked, boardState) => {
		let selectedId = this.getSelectedXalianId();
		let referencedId = this.getReferencedXalianId();
		let alreadySelectedIndex = duelUtil.getIndexOfXalian(selectedId, boardState);
		let alreadyReferencedIndex = duelUtil.getIndexOfXalian(referencedId, boardState);
		if (indexClicked === alreadySelectedIndex) { // show details
			if (!this.state.showXalianDetails) {
				this.setState({ showXalianDetails: true });
			} else {
				console.log('UNselecting xalian ' + xalian.species.name + ' from square ' + indexClicked);
				this.setState({ showXalianDetails: false }, this.setXalianIds);
			}
		} else if (indexClicked === alreadyReferencedIndex) { // show details
			if (!this.state.showXalianDetails) {
				this.setState({ showXalianDetails: true });
			} else {
				console.log('UNreferencing opponent xalian ' + xalian.species.name + ' from square ' + indexClicked);
				this.setState({ showXalianDetails: false }, () => {
					this.setReferencedXalianId(null);
				});
			}
		} else {
			if (duelUtil.isCurrentTurnsXalian(xalian.xalianId, boardState, this.props.ctx)) {
				console.log('selected xalian ' + xalian.species.name + ' from square ' + indexClicked);
				this.setSelectedXalianId(xalian.xalianId);
			} else {
				console.log('only referencing xalian ' + xalian.species.name + ' from square ' + indexClicked);
				this.setReferencedXalianId(xalian.xalianId);
			}
		}
	};


	
	
	buildInitialSpeciesIcon(x, boardState, isOut = false) {
		let isSelected = this.getSelectedXalianId() && this.getSelectedXalianId() === x.xalianId;
		let opac = isOut ? 0.25 : 1;
		let cellSizeText = this.determineCellSizeText();

		return (
				<Col style={{ maxWidth: cellSizeText, maxHeight: cellSizeText, opacity: opac }} className='duel-unset-piece-wrapper' onClick={() => this.handleInitialPieceSelection(x, boardState)}>
					<XalianImage padding='2%' colored rounded shadowed selected={isSelected} speciesName={x.species.name} primaryType={x.elementType} moreClasses="duel-xalian-unselected" />
						{/* <div style={{ padding: '0px', height: '100%', width: '100%', margin: 'auto' }}>
							<h6 className="fit-xalian-name-text" style={{ textAlign: 'center', margin: 'auto', height: '100%', width: '100%', color: 'white', opacity: 0.5 }}>
								{x.species.name}
							</h6>
						</div> */}
				</Col>
		);
	}

	

	getStartingBoardState = () => {
		let actionLogs = boardStateManager.getAllMoveActionsFromLog(this.props.log);
		// let s = (actionLogs && actionLogs.length > 0 && actionLogs.length > this.state.logIndex) ? this.props.G.boardStateHistory[actionLogs[this.state.logIndex].metadata.boardStateIndex] : boardStateManager.buildBoardState(this.props.G, this.props.ctx);
		let s = (actionLogs && actionLogs.length > 0 && actionLogs.length > this.state.logIndex) ? 
			// this.props.G.boardStateHistory[actionLogs[this.state.logIndex].metadata.boardStateIndex] : 
			actionLogs[this.state.logIndex].metadata.startState : 
			boardStateManager.buildBoardState(this.props.G, this.props.ctx);
		return s || this.props.G;
	}

	buildUserActionButtons = (boardState) => {
		let showEndTurnButton = this.props.ctx.phase === 'play' && boardState.currentTurnDetails && (boardState.currentTurnDetails.hasMoved || boardState.currentTurnDetails.hasAttacked);
		let userActionButtons = [];

		userActionButtons.push(
			<Col style={{ display: 'flex', justifyContent: 'center' }}>
				<Button variant='xalianGray' onClick={ this.doDebugAction } style={{ margin: 'auto', marginBottom: '10px', marginTop: '10px' }} >DEBUG</Button>
			</Col>
		)

		userActionButtons.push(
			<Col style={{ display: 'flex', justifyContent: 'center' }}>
				<Button variant='xalianGray' disabled={!showEndTurnButton} onClick={this.endPlayerTurn} style={{ margin: 'auto', marginBottom: '10px', marginTop: '10px' }} >End turn</Button>
			</Col>
		)

		
		return userActionButtons;
	}

	doDebugAction = () => {
		if (this.state.debugText) {
			this.setState({ debugText: null});
		} else {
			var message = '';
			message += `\n\nlogIndex: ${this.state.logIndex}`;
			message += `\n\nctx:\n${JSON.stringify(this.props.ctx, null, 2)}`;
			message += `\n\nPlayers:\n${JSON.stringify(this.props.G.playerStates, null, 2)}`;
			message += `\n\nTurn:\n${JSON.stringify(this.props.G.currentTurnDetails, null, 2)}`;
			this.setState({debugText: message});
		}
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

		let logs = boardStateManager.getAllMoveActionsFromLog(this.props.log);
		let isCurrentLogIndex = (this.state.logIndex >= (logs.length - 1));
			

		let tbody = [];
		for (let i = 0; i < gameConstants.BOARD_COLUMN_SIZE; i++) {
			let cells = [];
			for (let j = 0; j < gameConstants.BOARD_COLUMN_SIZE; j++) {
				const index = gameConstants.BOARD_COLUMN_SIZE * i + j;
				let animationTl = this.state.animationTl || { totalProgress: () => { return 1 } };
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
					animationTl={this.state.animationTl}
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
		let referencedXalianId = this.getReferencedXalianId();
		let referencedXalian = duelUtil.getXalianFromId(referencedXalianId, boardState);
		let xalianDetailsToShow = selectedXalian || referencedXalian;
		
		let userActionButtons = this.buildUserActionButtons(boardState);

		let duelPieceBoxStyle = { borderRadius: `${this.determineCellSize() / 2}px`, width: `${this.getBoardSize() * 0.85}px`, height: this.determineCellSize() };
		let p1Opacity = this.props.playerID === '0' && this.props.isActive ? 0.35 : 0.9; 
		let p2Opacity = this.props.playerID === '1' && this.props.isActive ? 0.35 : 0.9; 
		let playerOnePiecesBoxStyle = { boxShadow: `inset 0px 0px ${this.determineCellSize() / 2}px ${gsap.utils.interpolate(duelConstants.PLAYER_TWO_COLOR, duelConstants.PLAYER_TWO_COLOR_NO_ALPHA, p2Opacity)}`, ...duelPieceBoxStyle };
		let playerTwoPiecesBoxStyle = { boxShadow: `inset 0px 0px ${this.determineCellSize() / 2}px ${gsap.utils.interpolate(duelConstants.PLAYER_ONE_COLOR, duelConstants.PLAYER_ONE_COLOR_NO_ALPHA, p1Opacity)}`, ...duelPieceBoxStyle };

		let viewText = this.props.G.hasBot ? (this.props.playerID === '0' ? 'Player View' : 'Bot View') : (this.props.playerID === '0' ? 'First Player' : 'Second Player');
		let turnSummaryText = (this.props.ctx.phase === 'play' && boardState.currentTurnDetails) ? (`Moves: ${boardState.currentTurnDetails.remainingSpacesToMove}` + (boardState.currentTurnDetails.hasAttacked ? '' : ' + Attack')) : '';

		var backGroundClientColor = this.props.playerID === '0' ? duelConstants.PLAYER_ONE_COLOR : duelConstants.PLAYER_TWO_COLOR;
		let backGroundClientColorNoAlpha = this.props.playerID === '0' ? duelConstants.PLAYER_ONE_COLOR_NO_ALPHA : duelConstants.PLAYER_TWO_COLOR_NO_ALPHA;
		backGroundClientColor = gsap.utils.interpolate(backGroundClientColor, backGroundClientColorNoAlpha, 0.75);
		let backgroundClientColorDirection = this.props.playerID === '0' ? 180 : 0;
		let backgroundForClient = `linear-gradient(${backgroundClientColorDirection}deg, ${backGroundClientColorNoAlpha} 20%, ${backGroundClientColor} 100%)` 
		

		
			let clientView =  (
				<div id={`duel-board-client-${this.props.playerID}`}>
					<div id={`duel-page-background-overlay-client-${this.props.playerID}`} className='duel-page-background-overlay'  style={{background: backgroundForClient}}
					onClick={() => {
						this.setXalianIds(null, null);
					}}/>

					{/* <Container fluid style={{ width: '100%', padding: '0px', margin: '0px', position: 'fixed', minHeight: '100vh', width: '100vw', overflowY: 'hidden'}}> */}
					<Container fluid style={{ width: '100%', padding: '0px', margin: '0px', position: 'fixed', minHeight: '90vh', width: '100vw', overflowY: 'hidden'}}>
						{/* <Stack className='' style={{ width: '100%', padding: '0px', margin: 'auto', position: 'relative' }}> */}

							{/* INFO BOX */}

							<Container style={{ display: 'flex', position: 'absolute', top: '10%', left: '50%', height: 'auto', width: '100%', transform: 'translate(-50%, -100%)' }}>
							{/* <Container style={{ height: '100px', display: 'flex'}}> */}
								
								{this.state.winnerText &&
									<h1 style={{ margin: 'auto', textAlign: 'center' }} >{this.state.winnerText}</h1>
								}
								{!this.state.winnerText &&
									<div style={{width: '100%', padding: '0px', margin: '0px', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
										{/* <h4 style={{ margin: 'auto', textAlign: 'center', marginBottom: '25px', color: 'darkgray', opacity: isCurrentLogIndex ? 1 : 0.25 }}>[{this.state.logIndex}] {turnSummaryText}</h4> */}
										<h4 style={{ margin: 'auto', textAlign: 'center' , opacity: isCurrentLogIndex ? 1 : 0.25 }}>{viewText}</h4>
									</div>
								}
								{/* return {
									hasAttacked: hasAttacked,
									hasMoved: hasMoved,
									remainingSpacesToMove: remainingSpacesToMove,
									moves: moves,
									isComplete: isComplete,
									actions: actions
								} */}
							</Container>
							<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'absolute', top: '50%', left: '50%', height: 'auto', width: '100%', transform: 'translate(-50%, -50%)' }}>


								<Container fluid style={{ width: '100%', padding: '0px', margin: '0px' }}>
									
									<Row className='duel-unset-piece-row' style={playerOnePiecesBoxStyle}>{opponentCols}{opponentOutCols}</Row>
									
									<div className='duel-board-wrapper' >
										<div className='duel-board-wrapper-background' />
										<div className='duel-board-wrapper-background-overlay' />
										<table id="board" style={{ display: 'flex', justifyContent: 'center' }}>
											<tbody >{tbody}</tbody>
										</table>
									</div>
									
									<Row className='duel-unset-piece-row' style={playerTwoPiecesBoxStyle}>{cols}{outCols}</Row>
									
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


							</div>

							{(xalianDetailsToShow && this.state.showXalianDetails) &&
							<>
								<div style={{width: '100%', height: '100%'}} onClick={() => {
									this.setState({ showXalianDetails: false });
								 }} />
								<Offcanvas scroll backdrop={true} placement="top" 
									show={xalianDetailsToShow} 
									onHide={this.onHideXalianDetails} 
									style={{backgroundColor: '#00000000', border: '0', maxWidth: '90vw', marginLeft: 'auto', marginRight: 'auto', height: 'fit-content'}} 
									>
									<Offcanvas.Body style={{padding: '0px', margin: '0px'}}>
										<DuelXalianSuggestionDetails xalian={xalianDetailsToShow} />
									</Offcanvas.Body>
								</Offcanvas>
							</>
									// <Container fluid='sm' style={{ maxWidth: '400px', position: }}>
									// 	<DuelXalianSuggestionDetails xalian={xalianDetailsToShow} />
									// </Container>
							}



						{/* </Stack> */}
							<div className="fixed-bottom" style={{ 
								margin: 'auto',
								maxWidth: '400px',
									borderRadius: '10px',
									background: 'linear-gradient(0deg, rgba(0,0,0,1) 15%, rgba(0,0,0,0.8099614845938375) 89%, rgba(0,0,0,0.6138830532212884) 94%, rgba(0,0,0,0) 100%)' 
								}}>
								<h4 style={{ margin: 'auto', textAlign: 'center', paddingTop: '5px', color: 'darkgray', opacity: isCurrentLogIndex ? 1 : 0.25 }}>{!isCurrentLogIndex ? 'NEEDS UPDATE' : null}[{this.state.logIndex}] {turnSummaryText}</h4>
								<Row >
									{userActionButtons}
								</Row>
							</div>
							{this.state.debugText && 
								<div className="fixed-top" style={{ width: '100%', height: '90vh', backgroundColor: '#0000007a' }}>
									<pre style={{ width: '100%', height: '100%', color: 'white' }}>{this.state.debugText}</pre>
								</div>
							}
					</Container>
				</div>
						
			);
		if (this.shouldShowClientView()) {
			return clientView;
		} else {
			// return <div style={{visibility: 'hidden'}}>{clientView}</div>;
			return null;
		}
	}

	shouldShowClientView = () => {
		return (this.props.G.hasBot && this.props.playerID === '0') 
			|| (!this.props.G.hasBot && this.props.isActive);
		// return  this.props.isActive;
	}

	onHideXalianDetails = () => {
		this.setState({ showXalianDetails: false });
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
		this.props.moves.endTurn();
		// this.props.events.endTurn();
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
