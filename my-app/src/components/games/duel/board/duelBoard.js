
import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Navbar from 'react-bootstrap/Navbar';
import Stack from 'react-bootstrap/Stack';
import PropTypes from 'prop-types';
import * as gameConstants from '../../../../gameplay/duel/duelGameConstants';
import * as duelUtil from '../../../../utils/duelUtil';
import * as duelCalculator from '../../../../gameplay/duel/duelCalculator';
import * as duelConstants from '../../../../gameplay/duel/duelGameConstants';
import species from '../../../../json/species.json';
import { Hub } from "aws-amplify";
import DuelBoardCell from './duelBoardCell';
import DuelRosterRail from './duelRosterRail';
import { verdictFor } from './attackableMoveBadge';
import AttackActionModal from './attackActionModal';
import AttackMoveChooserModal from './attackMoveChooserModal';
import HowToPlayModal from '../howToPlayModal';
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
import * as alertUtil from '../../../../utils/alertUtil';
import FadeAlert from '../../../fadeAlert';
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
		animationIndex: -1,
		showHowToPlay: false
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

	// A rail on each side is real furniture, so the board is sized against what
	// is actually left over. Below the breakpoint the rails lie down above and
	// below the board instead and give their width back.
	static RAIL_WIDTH = 270;
	static RAIL_BREAKPOINT = 1100;

	hasSideRails = () => {
		return typeof window !== 'undefined' && window.innerWidth >= DuelBoard.RAIL_BREAKPOINT;
	}

	updateSize = () => {
		if (window && window.innerWidth) {
			let railAllowance = this.hasSideRails() ? (2 * DuelBoard.RAIL_WIDTH) : 0;
			let w = Math.max(240, window.innerWidth - railAllowance - 48);
			// the status strip and the header legend are the only other things
			// competing for vertical space now that the benches are gone
			let h = Math.max(240, window.innerHeight - (this.hasSideRails() ? 300 : 400));
			this.setState(boardUtil.buildBoardSizeState(w, h));
		}
	};
	
	componentDidMount() {
		document.addEventListener('DOMContentLoaded', this.updateSize);
		window.addEventListener('resize', this.updateSize);
		this.updateSize();
		this.showHowToPlayOnFirstVisit();
		this.transitionClientViewForActivePlayer();
		
	}

	showHowToPlayOnFirstVisit = () => {
		if (!LocalDuelStorage.hasSeenHowToPlay()) {
			this.setState({ showHowToPlay: true });
		}
	}

	onHideHowToPlay = () => {
		LocalDuelStorage.setHowToPlaySeen();
		this.setState({ showHowToPlay: false });
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
			let myPlayerId = this.props.playerID != null ? this.props.playerID : '0';
			this.setState({ winnerText: this.props.ctx.gameover.winner !== undefined && this.props.ctx.gameover.winner == myPlayerId ? 'You Win!' : 'You Lose!' });
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
			// movement is validated against live G by the rules layer, so derive it from live state
			let live = this.getLiveBoardState();
			let liveSelectedIndex = duelUtil.getIndexOfXalian(selectedId, live);
			if (liveSelectedIndex != null && liveSelectedIndex >= 0) {
				paths = duelCalculator.calculateMovablePaths(liveSelectedIndex, duelUtil.getXalianFromId(selectedId, live), live, this.props.ctx);
			}
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
					if (this.isReplayingAnimations()) {
						alertUtil.sendAlert('Hold on', 'The board is still catching up — try that again in a moment.');
					}
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



	/**
	 * Pressing a slot in a roster rail.
	 *
	 * The rail is the setup tray as well as the status readout, so this has to
	 * cover both: an unplaced piece is picked up for placing, a standing piece
	 * is selected exactly as if it had been pressed on the board, and anything
	 * else is merely inspected.
	 */
	handleRosterSelection = (xalian, meta) => {
		let boardState = this.getStartingBoardState();
		if (meta.isUnset) {
			this.handleInitialPieceSelection(xalian, boardState);
			return;
		}
		if (meta.isDown) {
			this.setReferencedXalianId(xalian.xalianId);
			return;
		}
		let index = duelUtil.getIndexOfXalian(xalian.xalianId, boardState);
		if (index != null && index >= 0) {
			this.selectPiece(xalian, index, boardState);
		} else {
			this.setReferencedXalianId(xalian.xalianId);
		}
	};

	/** every piece a side owns, in G's declaration order so slots never move */
	buildRoster = (playerIndex, boardState) => {
		let playerState = boardState.playerStates[playerIndex];
		if (!playerState || !this.props.G.xalians) return [];
		let owned = new Set(
			(playerState.activeXalianIds || [])
				.concat(playerState.unsetXalianIds || [])
				.concat(playerState.inactiveXalianIds || [])
		);
		return this.props.G.xalians
			.filter(x => owned.has(x.xalianId))
			.map(x => duelUtil.getXalianFromIdAndXalians(x.xalianId, boardState.xalians) || x);
	}

	/**
	 * Which enemies the selection can actually strike, and how each matchup
	 * reads. Computed once here rather than per cell so the board and both
	 * rails agree, and so a preview that throws can never take the board down.
	 */
	buildTargeting = (selectedId, attackableIndices, boardState) => {
		let attackableIds = new Set();
		let targetVerdicts = {};
		let details = boardState.currentTurnDetails;
		if (!selectedId || !details || details.hasAttacked) {
			return { attackableIds, targetVerdicts };
		}
		let attacker = duelUtil.getXalianFromId(selectedId, boardState);
		if (!attacker) return { attackableIds, targetVerdicts };

		(attackableIndices || []).forEach(index => {
			let occupantId = boardState.cells[index];
			if (!occupantId) return;
			if (duelUtil.xaliansAreOnSameTeam(selectedId, occupantId, boardState)) return;
			attackableIds.add(occupantId);
			let defender = duelUtil.getXalianFromId(occupantId, boardState);
			try {
				let result = duelCalculator.calculateAttackResult(attacker, defender, boardState, this.props.ctx, true);
				let effectiveness = (result && result.typeEffectiveness != null) ? result.typeEffectiveness : 1;
				targetVerdicts[occupantId] = verdictFor(effectiveness);
			} catch (err) {
				// a damage preview is a courtesy; never let one stop the board rendering
				console.error('duel: could not preview matchup', err);
			}
		});
		return { attackableIds, targetVerdicts };
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
			// attacks are validated against live G by the rules layer, so derive them from it too
			let live = this.getLiveBoardState();
			let selectedIndex = duelUtil.getIndexOfXalian(selectedId, live);

			if ((duelUtil.isPlayerPiece(selectedId, live) && duelUtil.isPlayerPiece(xalian.xalianId, live))
			|| (duelUtil.isOpponentPiece(selectedId, live) && duelUtil.isOpponentPiece(xalian.xalianId, live))) {
				this.selectPiece(xalian, index, boardState); // switching piece selection from same team
			} else if (live.cells[index] !== xalian.xalianId) {
				// the rendered snapshot is behind live state — the clicked square no longer holds
				// that piece, so the click is ambiguous. Refuse rather than submit a doomed action.
				alertUtil.sendAlert('Hold on', 'The board is still catching up — try that again in a moment.');
			} else {
				var attackablePaths = [];
				if (selectedId && (selectedIndex != null && selectedIndex != undefined)) {
					attackablePaths = duelCalculator.calculateAttackablePaths(selectedIndex, duelUtil.getXalianFromId(selectedId, live), live, this.props.ctx);
				}
				var attackableIndices = attackablePaths.map( p => p.endIndex);
				if (attackableIndices.includes(index) && (!live.currentTurnDetails.hasAttacked)) {
					// stash pending attack and let the player choose a move before executing it
					let path = attackablePaths.filter( p => (p.endIndex == index))[0];

					this.setState({ pendingAttack: { path: path, attackerId: selectedId, defenderId: xalian.xalianId } });
				} else if (live.currentTurnDetails.hasAttacked) {
					alertUtil.sendAlert('No attack left', 'Your team has already attacked this turn.');
				} else {
					alertUtil.sendAlert('Out of range', `${duelUtil.getXalianFromId(selectedId, live).species.name} can't reach that square.`);
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


	
	
	// the board deliberately RENDERS a historical snapshot while animations replay
	// (see getStartingBoardState). Actions must never be derived from that snapshot —
	// the rules layer validates against live G and would reject stale-derived paths.
	getLiveBoardState = () => {
		return boardStateManager.buildBoardState(this.props.G, this.props.ctx);
	}

	isReplayingAnimations = () => {
		let logs = boardStateManager.getAllMoveActionsFromLog(this.props.log);
		return this.state.logIndex < logs.length;
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

		// the DEBUG button dumps raw game state - dev builds only, never for players
		if (process.env.NODE_ENV !== 'production') {
			userActionButtons.push(
				<button type="button" key="duel-action-debug" className="g-btn" onClick={this.doDebugAction}>Debug</button>
			)
		}

		userActionButtons.push(
			<button
				type="button"
				key="duel-action-how-to-play"
				className="g-btn g-btn--icon"
				title="How to play"
				aria-label="How to play"
				onClick={() => this.setState({ showHowToPlay: true })}>
				<i className="bi bi-question-lg" />
			</button>
		)

		userActionButtons.push(
			<button
				type="button"
				key="duel-action-end-turn"
				className="g-btn g-btn--primary"
				disabled={!showEndTurnButton}
				onClick={this.endPlayerTurn}>
				End Turn
			</button>
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

		// The two rosters. Which one is "yours" follows the client you are looking
		// through, so the hot-seat second view is not reading the first player's
		// squad as its own.
		let ownIndex = parseInt(this.props.playerID) === 1 ? 1 : 0;
		let foeIndex = ownIndex === 0 ? 1 : 0;
		let ownRoster = this.buildRoster(ownIndex, boardState);
		let foeRoster = this.buildRoster(foeIndex, boardState);
		let ownColor = ownIndex === 0 ? duelConstants.PLAYER_ONE_COLOR : duelConstants.PLAYER_TWO_COLOR;
		let foeColor = foeIndex === 0 ? duelConstants.PLAYER_ONE_COLOR : duelConstants.PLAYER_TWO_COLOR;
		let isOwnTurn = parseInt(this.props.ctx.currentPlayer) === ownIndex;

		let { attackableIds, targetVerdicts } = this.buildTargeting(selectedId, selectedXalianAttackableIndices, boardState);

		let foeTitle = this.props.G.hasBot && foeIndex === 1 ? 'Bot Squad' : 'Their Squad';

		let selectedXalian = duelUtil.getXalianFromId(selectedId, boardState);
		// let referencedXalian = duelUtil.getXalianFromId(this.state.referencedXalianId, boardState);
		let referencedXalianId = this.getReferencedXalianId();
		let referencedXalian = duelUtil.getXalianFromId(referencedXalianId, boardState);
		// pressing an already-selected piece opens its deeper reading, docked in
		// its own roster slot rather than floated over the board
		let expandedXalianId = this.state.showXalianDetails
			? (selectedId || referencedXalianId)
			: null;
		
		let userActionButtons = this.buildUserActionButtons(boardState);

		// which client you are looking through. Only worth saying in a hot seat
		// game, where the two views really are different people - against a bot it
		// was a permanent "Player View" caption over the turn banner.
		let viewText = this.props.G.hasBot ? null : (this.props.playerID === '0' ? 'First Player' : 'Second Player');
		let turnDetails = (this.props.ctx.phase === 'play' && boardState.currentTurnDetails) ? boardState.currentTurnDetails : null;

		let clientColor = this.props.playerID === '0' ? duelConstants.PLAYER_ONE_COLOR : duelConstants.PLAYER_TWO_COLOR;
		// which end of the room you are sitting at: a low glow along your own
		// edge, not a wash over the whole page
		let clientEdge = this.props.playerID === '0' ? '115%' : '-15%';
		let backgroundForClient = `radial-gradient(60% 32% at 50% ${clientEdge}, ${clientColor}22 0%, ${clientColor}00 100%)` 
		

		
			let clientView =  (
				<div id={`duel-board-client-${this.props.playerID}`}>
					<div id={`duel-page-background-overlay-client-${this.props.playerID}`} className='duel-page-background-overlay'  style={{background: backgroundForClient}}
					onClick={() => {
						this.setXalianIds(null, null);
					}}/>

					<div className="duel-viewport">

							{/* The stage: a rail on each side, the arena between them. This
							    was a stack of absolutely-positioned rows that put the benches
							    above and below the board, so the board moved down the page the
							    moment anything died. Nothing here shifts once the match starts. */}
							<div className="duel-stage-shell">

								<header className="duel-stage-header">
									{this.state.winnerText &&
										<h1 className="duel-winner-text">{this.state.winnerText}</h1>
									}
									{!this.state.winnerText &&
										<>
											{viewText &&
												<p className="duel-view-label" style={{ opacity: isCurrentLogIndex ? 1 : 0.25 }}>{viewText}</p>
											}
											{/* whose turn it is was previously only implied by an edge
											    glow on a bench, which is not something you can read */}
											<p className={`duel-turn-banner ${isOwnTurn ? 'duel-turn-banner--yours' : 'duel-turn-banner--theirs'}`}>
												{this.props.ctx.phase === 'setup'
													? (isOwnTurn ? 'Place your squad' : 'Opponent placing')
													: (isOwnTurn ? 'Your turn' : 'Opponent’s turn')}
											</p>
										</>
									}
								</header>

								<div className={`duel-stage ${this.hasSideRails() ? 'duel-stage--rails' : 'duel-stage--stacked'}`}>

									<DuelRosterRail
									side="left"
									title={foeTitle}
									xalians={foeRoster}
									teamColor={foeColor}
									isOwn={false}
									isTurn={!isOwnTurn}
									boardState={boardState}
									ctx={this.props.ctx}
									phase={this.props.ctx.phase}
									selectedXalianId={selectedId}
									referencedXalianId={referencedId}
									attackableIds={attackableIds}
									targetVerdicts={targetVerdicts}
									expandedXalianId={expandedXalianId}
									onSelect={this.handleRosterSelection}
								/>

									<div className="duel-stage-board">
										<div className='duel-board-wrapper' >
											<div className='duel-board-wrapper-background' />
											<div className='duel-board-wrapper-background-overlay' />
											<table id="board" style={{ display: 'flex', justifyContent: 'center' }}>
												<tbody >{tbody}</tbody>
											</table>
										</div>
									</div>

									<DuelRosterRail
									side="right"
									title={"Your Squad"}
									xalians={ownRoster}
									teamColor={ownColor}
									isOwn={true}
									isTurn={isOwnTurn}
									boardState={boardState}
									ctx={this.props.ctx}
									phase={this.props.ctx.phase}
									selectedXalianId={selectedId}
									referencedXalianId={referencedId}
									attackableIds={attackableIds}
									targetVerdicts={targetVerdicts}
									expandedXalianId={expandedXalianId}
									onSelect={this.handleRosterSelection}
								/>

								</div>
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

							<FadeAlert />

							<HowToPlayModal show={this.state.showHowToPlay} onHide={this.onHideHowToPlay} />

							{this.state.pendingAttack &&
								<AttackMoveChooserModal
									show={!!this.state.pendingAttack}
									attacker={duelUtil.getXalianFromId(this.state.pendingAttack.attackerId, this.getLiveBoardState())}
									defender={duelUtil.getXalianFromId(this.state.pendingAttack.defenderId, this.getLiveBoardState())}
									G={this.props.G}
									ctx={this.props.ctx}
									onSelect={(moveIndex) => {
										let pendingAttack = this.state.pendingAttack;
										this.props.moves.doAttack(pendingAttack.path, moveIndex != null ? { moveIndex } : undefined);
										this.setState({ pendingAttack: null });
									}}
									onCancel={() => {
										this.setState({ pendingAttack: null });
									}}
								/>
							}

						{/* </Stack> */}
							{/* the turn's instruments, on a panel bolted along the bottom of
							    the console rather than a black gradient bar */}
							<div className="fixed-bottom duel-status-strip" style={{ opacity: isCurrentLogIndex ? 1 : 0.4 }}>
								{!isCurrentLogIndex &&
									<p className="duel-status-stale">Replaying — showing turn {this.state.logIndex}</p>
								}
								{turnDetails &&
									<div className="duel-status-readouts">
										{/* "Movement 3" never said three of what, nor that the pool is
										    shared across the whole squad rather than per piece */}
										<span className="duel-readout">
											<span className="duel-readout-label">Squad moves</span>
											<span className="duel-readout-value">
												{turnDetails.remainingSpacesToMove}
												<span className="duel-readout-unit">sq</span>
											</span>
										</span>
										<span className="duel-readout">
											<span className="duel-readout-label">Attack</span>
											<span className={`duel-readout-value ${turnDetails.hasAttacked ? 'duel-readout-value--spent' : 'duel-readout-value--held'}`}>
												{turnDetails.hasAttacked ? 'Spent' : 'Ready'}
											</span>
										</span>
									</div>
								}
								<div className="duel-status-actions">
									{userActionButtons}
								</div>
							</div>
							{this.state.debugText && 
								<div className="fixed-top" style={{ width: '100%', height: '90vh', backgroundColor: '#0000007a' }}>
									<pre style={{ width: '100%', height: '100%', color: 'white' }}>{this.state.debugText}</pre>
								</div>
							}
					</div>
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
