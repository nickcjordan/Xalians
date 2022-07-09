import { INVALID_MOVE } from 'boardgame.io/core';
import { ActivePlayers } from 'boardgame.io/core';
import * as gameConstants from '../../../gameplay/duel/duelGameConstants';
import * as duelUtil from '../../../utils/duelUtil';
import * as duelCalculator from '../../../gameplay/duel/duelCalculator';
import * as duelBot from '../../../gameplay/duel/duelBot';
import * as duelConstants from '../../../gameplay/duel/duelGameConstants';
import * as boardStateManager from '../../../gameplay/duel/boardStateManager';
import * as playerStateManager from '../../../gameplay/duel/playerStateManager';
import * as plugins from '../../../gameplay/duel/plugins';
import { PluginPlayer } from 'boardgame.io/plugins';
import { v4 as uuidv4 } from 'uuid'; 
import gsap from 'gsap';
import Flip from 'gsap/Flip';
import { Hub } from "aws-amplify";
gsap.registerPlugin(Flip);

// define a function to initialize each player’s state
const playerSetup = (playerID) => {
	return {
		activeXalianIds: [],
		inactiveXalianIds: [],
		unsetXalianIds: [],
		playerID: playerID
	}
}

// filter data returned to each client to hide secret state (OPTIONAL)
const playerView = (players, playerID) => ({
  [playerID]: players[playerID],
});

export const Duel = (data) => {
	return {

		name: 'xalians-duel',

		plugins: [
			plugins.actionPlugin, 
			PluginPlayer({
				setup: playerSetup,
				playerView: playerView,
			  }),
		],

		setup: (ctx, setupData) => {
			// let unsetXalianIds = [];
			// data.playerXalians.forEach((x) => {
			// 	unsetXalianIds.push(x.xalianId);
			// });

			// let unsetOpponentXalianIds = [];
			// data.opponentXalians.forEach((x) => {
			// 	unsetOpponentXalianIds.push(x.xalianId);
			// });

			// data.teams[0]

			let totalSquares = gameConstants.BOARD_COLUMN_SIZE * gameConstants.BOARD_COLUMN_SIZE;

			let grid = duelCalculator.buildGrid(totalSquares);
			let playerFlagOptions = grid.rows[gameConstants.BOARD_COLUMN_SIZE - 2];
			let randomPlayerInd = Math.round(Math.random()*(gameConstants.BOARD_COLUMN_SIZE-1));
			let opponentTargetFlagIndex = playerFlagOptions[randomPlayerInd];
			let opponentFlagOptions = grid.rows[1];
			let randomOpponentInd = Math.round(Math.random()*(gameConstants.BOARD_COLUMN_SIZE-1));
			let playerTargetFlagIndex = opponentFlagOptions[randomOpponentInd];

			if (playerTargetFlagIndex == undefined || opponentTargetFlagIndex == undefined) {
				console.error("DID NOT SET FLAG");
			}

			let flagStates = [
				{
					index: playerTargetFlagIndex,
					startIndex: playerTargetFlagIndex,
					holder: null,
					player: 0 // indicates the player that will be targeting this flag
				},
				{
					index: opponentTargetFlagIndex,
					startIndex: opponentTargetFlagIndex,
					holder: null,
					player: 1
				}
			]

			let playerStates = [
				{
					activeXalianIds: [],
					inactiveXalianIds: [],
					unsetXalianIds: data.teams[0],
					playerID: 0
				},
				{
					activeXalianIds: [],
					inactiveXalianIds: [],
					unsetXalianIds: data.teams[1],
					playerID: 1
				}
			]
			

			return {
				cells: Array(totalSquares).fill(null),
				xalians: data.xalians,
				flags: flagStates,
				currentTurnActions: [],
				playerStates: playerStates,
				hasBot: data.bot,
				randomizeStartingPositions: data.randomizeStartingPositions
			};
		},

		turn: {
			// The turn order.
			// order: TurnOrder.DEFAULT,

			// Called at the beginning of a turn.
			onBegin: (G, ctx) => {
				// console.log('STARTING TURN');
				G.currentTurnActions = [];
				G.currentTurnDetails = null;
				G.selectedIndex = null;
				G.selectedId = null;
				
				// if (G.hasBot && ctx.currentPlayer === '0') {
				// 	var allCellElems = document.querySelectorAll(".duel-board-cell");
				// 	const cellState = Flip.getState(allCellElems, { props: "background,filter,opacity,backgroundColor" });
				// 	boardStateManager.setVisualsForAllCells(G, allCellElems, movableIndicesFromStartingSpot, attackableIndicesFromHoverSpot, draggingXalianId, hoverCellIndex);
				// 	Flip.from(cellState);
				// }

			},

			// Called at the end of a turn.
			onEnd: (G, ctx) => {
				// G.selectedIndex = null;
				// G.selectedId = null;
				let playerState = G.playerStates[parseInt(ctx.currentPlayer)];
				playerState.activeXalianIds.forEach( id => {
					let xalian = duelUtil.getXalianFromId(id, G);
					xalian.state.stamina = Math.min(duelConstants.MAX_STAMINA_POINTS, xalian.state.stamina + 1);
				});

				// doFadesAfterMove = () => {
					// var allCellElems = document.querySelectorAll(".duel-board-cell");
					// const cellState = Flip.getState(allCellElems, { props: "background,filter,opacity,backgroundColor" });
					// boardStateManager.clearVisualsForAllCells(allCellElems);
					// Flip.from(cellState);
				// }

				// if (ctx.phase === 'setup') {
				// 	let totalXaliansActive = G.playerStates[0].activeXalianIds.length + G.playerStates[1].activeXalianIds.length;
				// 	let totalXaliansUnset = G.playerStates[0].unsetXalianIds.length + G.playerStates[1].unsetXalianIds.length;
				// 	let allPiecesAreSet = (totalXaliansActive == G.xalians.length);
				// 	let noPiecesAreUnset = (totalXaliansUnset == 0);
				// 	if (allPiecesAreSet && noPiecesAreUnset) {
				// 		ctx.events.endPhase();
				// 	}
				// }

			},

			// Ends the turn if this returns true.
			endIf: (G, ctx) => {
				// if (ctx.phase === 'setup') {
				// 	let totalXaliansActive = G.playerStates[0].activeXalianIds.length + G.playerStates[1].activeXalianIds.length;
				// 	let totalXaliansUnset = G.playerStates[0].unsetXalianIds.length + G.playerStates[1].unsetXalianIds.length;
				// 	let allPiecesAreSet = (totalXaliansActive == G.xalians.length);
				// 	let noPiecesAreUnset = (totalXaliansUnset == 0);
				// 	return  allPiecesAreSet && noPiecesAreUnset;
				// }


				// if ( (G.hasBot && ctx.phase === 'play' && ctx.currentPlayer === '1')) {
				if ((!G.hasBot && ctx.phase === 'play') || (G.hasBot && ctx.phase === 'play' && ctx.currentPlayer === '1')) {
				// if (ctx.phase === 'play') {
					
					let playerID = parseInt(ctx.currentPlayer);
					let playerState = G.playerStates[playerID];
					let playerCanMove = playerStateManager.playerStateHasMoveAvailable(playerState, G, ctx);
					let turnState = G.currentTurnDetails;
					// return (turnState && turnState.isComplete) || !hasValidActionAvailable;
					return (turnState && turnState.isComplete) || !playerCanMove;
				}
			},

			// Called at the end of each move.
			onMove: (G, ctx) => {
				// if (ctx.phase === 'play') {
					G.currentTurnDetails = boardStateManager.currentTurnState(G, ctx);
				// } 
				// if (ctx.phase === 'setup') {
				// 	ctx.events.endTurn();
				// }
				// let target = gsap.utils.toArray(document.querySelectorAll(".fade-in-animation-on-move"));
				// if (target && target.length > 0) {
					// gsap.to(target, { autoAlpha: 1 });
				// }
			},

			// Prevents ending the turn before a minimum number of moves.
			// minMoves: 1,

			// Ends the turn automatically after a number of moves.
			// maxMoves: 2,

			// Calls setActivePlayers with this as argument at the
			// beginning of the turn.
			// activePlayers: ActivePlayers.ALL,

			// stages: {
			// 	ACTION: { 
			// 		maxMoves: 1,
			// 		next: 'EFFECT'
			// 	},
			// 	EFFECT: { 
			// 		moves: {},
			// 		next: 'ACTION'
			// 	}
			// }
		},

		phases: {
			setup: {
				// moves: { selectPiece, setPiece },
				moves: data.randomizeStartingPositions ? { initializeSetup } : { setPiece, initializeSetup },
				// start: data.randomizeStartingPositions? false : true,
				start: true,
				endIf: G => { 
					let totalXaliansActive = G.playerStates[0].activeXalianIds.length + G.playerStates[1].activeXalianIds.length;
					let totalXaliansUnset = G.playerStates[0].unsetXalianIds.length + G.playerStates[1].unsetXalianIds.length;
					let allPiecesAreSet = (totalXaliansActive == G.xalians.length);
					let noPiecesAreUnset = (totalXaliansUnset == 0);
					let shouldEndPhase = allPiecesAreSet && noPiecesAreUnset;
					return  shouldEndPhase;
				},
				next: 'play'
				// onBegin: (G, ctx) => {
				// 	if (G.randomizeStartingPositions) {
				// 		initializeSetup(G, ctx, null);
				// 	}
				// }
			},
			play: {
				// start: data.randomizeStartingPositions? true : false,
				// moves: { selectPiece, movePiece, movePieceThenAttack, doAttack, endTurn },
				moves: { 
					// selectPiece, 
					movePiece: {
						move: movePiece
					}, 
					doAttack, 
					endTurn
				},
			},
		},

		// moves: { selectPiece },

		endIf: (G, ctx) => {
			// if (isVictory(G.cells)) {
			// 	return { winner: ctx.currentPlayer };
			// }
			// if (isDraw(G.cells)) {
			// 	return { draw: true };
			// }


			if (duelUtil.getOpponentStartingIndices(G).includes(duelUtil.getOpponentFlagIndex(G))) {
				return { winner: 1 };
			}

			if (duelUtil.getPlayerStartingIndices(G).includes(duelUtil.getPlayerFlagIndex(G))) {
				return { winner: 0 };
			}


			let totalPlayerHealth = 0;
			duelUtil.getPlayerXalianIds(G).forEach(id => {
				let xalian = duelUtil.getXalianFromId(id, G);
				totalPlayerHealth += xalian.state.health;
			})

			let totalOpponentHealth = 0;
			duelUtil.getOpponentXalianIds(G).forEach(id => {
				let xalian = duelUtil.getXalianFromId(id, G);
				totalOpponentHealth += xalian.state.health;
			})

			
			if (totalPlayerHealth == 0) {
				return { winner: 1 };
			} else if (totalOpponentHealth == 0) {
				return { winner: 0 };
			} 


			// if (G.playerStates[0].activeXalianIds.length == 0 && G.playerStates[0].unsetXalianIds.length == 0) {
			// 	return { winner: 1 };
			// } else if (G.playerStates[1].activeXalianIds.length == 0 && G.playerStates[1].unsetXalianIds.length == 0) {
			// 	return { winner: 0 };
			// } 
		},

		// deltaState: true,
		disableUndo: true,

		ai: {
			enumerate: (G, ctx) => {
				let moves = [];
				let turnState = boardStateManager.currentTurnState(G, ctx);
				// only building moves if it is the bot's turn and it has a valid action yet to take
				if (duelUtil.isOpponentsTurn(ctx)) {

					if (ctx.phase === 'setup') {
						G.playerStates[1].unsetXalianIds.forEach(id => {
							moves = moves.concat(duelBot.buildSetupBotMoves(G, ctx, id));
						})
						if (G.randomizeStartingPositions) {
							moves = [{ move: 'initializeSetup', args: [1] }];
						}
					} else if (ctx.phase === 'play') {

						if ((!turnState.hasAttacked
							|| !turnState.hasMoved
							|| (turnState.hasMoved && turnState.remainingSpacesToMove > 0))) {

							let bestActions = duelBot.getBestBotActionsForXalianIds(G, ctx, G.playerStates[1].activeXalianIds);
							moves = moves.concat(bestActions);

							moves = moves.filter(m => (m != undefined && m != null));

							if (moves.length == 0 && ctx.phase === 'play') {
								moves.push({ move: 'endTurn', args: [] });
							}
						}
					}

				}
				
				
				moves = moves.filter(m => (m != undefined && m != null));
				return moves;
			},
			objectives: duelBot.buildBotObjectives(),
			  playoutDepth: 500,
			  iterations: 1000
		},
	};
};



	// MOVES

// COMMON
// function selectPiece(G, ctx, index, id) {
function selectPiece(G, ctx, id, dragged) {
	// G.selectedIndex = index;
	G.selectedId = id;
}

function endTurn(G, ctx) {
	ctx.events.endTurn();
}

// SETUP

function initializeSetup(G, ctx, playerId = null) {

	// G.playerStates.forEach( playerState => {
	// 	initializeSetupForPlayer(playerState, G);
	// })
	
		initializeSetupForPlayer(G.playerStates[playerId], G);
		ctx.events.endTurn();
}

function initializeSetupForPlayer(playerState, G) {
	let startingIndices = gsap.utils.shuffle(duelUtil.getStartingIndicesOfPlayer(playerState.playerID, G));
	playerState.unsetXalianIds.forEach( xalianId => {
		let selectedIndex = startingIndices.pop();
		G.cells[selectedIndex] = xalianId;
	});
	playerState.activeXalianIds = playerState.unsetXalianIds;
	playerState.unsetXalianIds = [];


}


function setPiece(G, ctx, index, selectedXalianId) {
	if (G.cells[index] !== null) {
		return INVALID_MOVE;
	}
	// console.log(JSON.stringify(ctx, null, 2));
	G.cells[index] = selectedXalianId;
	let currentTurnPlayerId = parseInt(ctx.currentPlayer);
	let currentPlayerState = G.playerStates[currentTurnPlayerId];
	if (currentPlayerState.unsetXalianIds) {
		let unset = currentPlayerState.unsetXalianIds;
		let active = currentPlayerState.activeXalianIds;
		moveXalianToActive(selectedXalianId, unset, active, ctx, true);
	}
	//  else if (duelUtil.isOpponentsTurn(ctx) && G.playerStates[1].unsetXalianIds) {
	// 	moveXalianToActive(selectedXalianId, G.playerStates[1].unsetXalianIds, G.playerStates[1].activeXalianIds, ctx, true);
	// }

	// G.playerStates[currentTurnPlayerId] = currentPlayerState;
	// if (G.playerStates[0].unsetXalianIds.length == 0 && G.playerStates[1].unsetXalianIds.length == 0) {
	// 	ctx.events.endPhase();
	// } else {
	// 	ctx.events.endTurn();
	// }
	// return G;
}

function moveXalianToActive(id, unset, active, ctx, endTurnAfterMove = false) {
	if (unset.includes(id)) {
		unset.splice(unset.indexOf(id), 1);
		active.push(id);
		if (unset.length === 0 || endTurnAfterMove) {
			ctx.events.endTurn();
		}
	}
}

// GAMEPLAY
// function movePieceThenAttack(G, ctx, movePath, attackPath, data = {}) {
// 	movePiece(G, ctx, movePath, data);
// 	doAttack(G, ctx, attackPath, data);
// }

// function movePiece(G, ctx, startIndex, endIndex, data = {}) {
function movePiece(G, ctx, path, data = {}) {
	let xalianIdToMove = G.cells[path.startIndex];
	let xalian = duelUtil.getXalianFromId(xalianIdToMove, G);
	

	let targetFlagIndex = duelUtil.getCurrentTurnTargetFlagIndex(G, ctx);
	let opponentFlagState = G.flags[parseInt(ctx.currentPlayer === '0' ? 1 : 0)];
	// set flag holder
	if (path.endIndex == targetFlagIndex) {
		let flag = G.flags[parseInt(ctx.currentPlayer)];
		if (flag) {
			flag.index = null;
			flag.holder = xalianIdToMove;
		}
		G.flags[parseInt(ctx.currentPlayer)] = flag;
	}

	// move flag back to start if recaptured
	if (path.endIndex == opponentFlagState.index) {
		opponentFlagState.index = opponentFlagState.startIndex;
	}

	G.cells[path.startIndex] = null;
	G.cells[path.endIndex] = xalianIdToMove;
	xalian.state.stamina = xalian.state.stamina - path.spacesMoved;

	let action = {
		type: duelConstants.actionTypes.MOVE,
		move: {
			moverId: xalianIdToMove,
			path: path
		}
	};
	// G.currentTurnState.actions.push(action);
	G.currentTurnActions.push(action);

}


function doAttack(G, ctx, path, data = {}) {
	let attackerIndex = path.startIndex;
	let defenderIndex = path.endIndex;
	let attackerId = G.cells[attackerIndex];
	let attacker = G.xalians.filter((x) => x.xalianId === attackerId)[0];
	// attacker.state.stamina = attacker.state.stamina - duelConstants.ATTACK_STAMINA_COST;
	attacker.state.stamina = attacker.state.stamina - path.spacesMoved;
	let defenderId = G.cells[defenderIndex];
	let defender = G.xalians.filter((x) => x.xalianId === defenderId)[0];
	if (attacker && defender) {
		// console.log('xalian ' + attacker.species.name + ' from square ' + attackerIndex + ' is attacking xalian ' + defender.species.name + ' on square ' + defenderIndex);
		var existingDefenderHealth = parseInt(defender.state.health);
		let attackResult = duelCalculator.calculateAttackResult(attacker, defender, G, ctx);
		let damage = attackResult.damage;
		defender.state.health = Math.max(0, existingDefenderHealth - damage);
		// console.log('resulting health = ' + defender.state.health);
		if (defender.state.health <= 0) {
			if (duelUtil.isPlayerPiece(defenderId, G)) {
				removeItemFromList(defenderId, G.playerStates[0].activeXalianIds);
				G.playerStates[0].inactiveXalianIds.push(defenderId);
				let flag = duelUtil.getPlayerFlagState(G);
				if (flag.holder && flag.holder === defenderId) {
					flag.holder = null;
					flag.index = defenderIndex;
				}
			} else if (duelUtil.isOpponentPiece(defenderId, G)) {
				removeItemFromList(defenderId, G.playerStates[1].activeXalianIds);
				G.playerStates[1].inactiveXalianIds.push(defenderId);
				let flag = duelUtil.getOpponentFlagState(G);
				if (flag.holder && flag.holder === defenderId) {
					flag.holder = null;
					flag.index = defenderIndex;
				}
			}
			G.cells[defenderIndex] = null;

		}

		// if (ctx.currentPlayer == 0) {
		// 	Hub.dispatch("duel-animation-event", { event: "attack", data: 
		let attackActionResult = {
			attackerIndex: attackerIndex,
			attackerId: attackerId,
			attackerType: attacker.elementType,
			defenderIndex: defenderIndex,
			defenderId: defenderId,
			defenderType: defender.elementType,
			attackResult: attackResult

		};

		let action = {
			type: duelConstants.actionTypes.ATTACK,
			attack: {
				attackerId: attackerId,
				defenderId: defenderId,
				path: path,
				result: attackActionResult
			}
		};
		G.currentTurnActions.push(action);
	} else {
		console.error(`ERROR :: DID NOT FIND ONE OF ATTACKER [${attacker}] OR DEFENDER [${defender}] DURING ATTACK ACTION`);
	}


}

function removeItemFromList(item, list) {
	return list.splice(list.indexOf(item), 1);
}
