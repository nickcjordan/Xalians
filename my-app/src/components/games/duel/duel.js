import { INVALID_MOVE } from 'boardgame.io/core';
import * as gameConstants from '../../../gameplay/duel/duelGameConstants';
import * as duelUtil from '../../../utils/duelUtil';
import * as duelCalculator from '../../../gameplay/duel/duelCalculator';
import * as duelBot from '../../../gameplay/duel/duelBot';
import * as duelConstants from '../../../gameplay/duel/duelGameConstants'

export const Duel = (data) => {
	return {
		setup: (ctx, setupData) => {
			let unsetXalianIds = [];
			data.playerXalians.forEach((x) => {
				unsetXalianIds.push(x.xalianId);
			});

			let unsetOpponentXalianIds = [];
			data.opponentXalians.forEach((x) => {
				unsetOpponentXalianIds.push(x.xalianId);
			});

			let totalSquares = gameConstants.BOARD_COLUMN_SIZE * gameConstants.BOARD_COLUMN_SIZE;

			let user = data.user;
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
					holder: null,
					player: 0 // indicates the player that will be targeting this flag
				},
				{
					index: opponentTargetFlagIndex,
					holder: null,
					player: 1
				}
			]

			return {
				cells: Array(totalSquares).fill(null),
				xalians: data.xalians,
				user: user,
				activeXalianIds: [],
				inactiveXalianIds: [],
				unsetXalianIds: unsetXalianIds,
				activeOpponentXalianIds: [],
				inactiveOpponentXalianIds: [],
				unsetOpponentXalianIds: unsetOpponentXalianIds,
				selectedId: null,
				selectedIndex: null,
				flags: flagStates
			};
		},

		turn: {
			// The turn order.
			// order: TurnOrder.DEFAULT,

			// Called at the beginning of a turn.
			onBegin: (G, ctx) => {
				// console.log('STARTING TURN');
				G.currentTurnState = {
					actions: [] 
				};
				G.currentTurnDetails = null;
			},

			// Called at the end of a turn.
			onEnd: (G, ctx) => {
				// console.log('ENDING TURN');
				G.selectedIndex = null;
				G.selectedId = null;
			},

			// Ends the turn if this returns true.
			endIf: (G, ctx) => {
				if (ctx.phase === 'play') {
					// let turnState = duelUtil.currentTurnState(G);
					let turnState = G.currentTurnDetails;

					var hasValidActionAvailable = false;
					if (duelUtil.isPlayersTurn(ctx)) {
						G.activeXalianIds.forEach( id => {
							if (duelUtil.xalianHasValidActionAvailable(id, G, ctx)) {
								hasValidActionAvailable = true;
							}
						})
					} else if (duelUtil.isOpponentsTurn(ctx)) {
						G.activeOpponentXalianIds.forEach( id => {
							if (duelUtil.xalianHasValidActionAvailable(id, G, ctx)) {
								hasValidActionAvailable = true;
							}
						})
					}

					// var cantMove = (turnState.hasMoved && turnState.remainingSpacesToMove == 0);
					
					// var canAttack = 0;
					
					// let cantAttack = turnState.hasAttacked || canAttack == 0;
					// return cantMove && cantAttack;
					return turnState.isComplete || !hasValidActionAvailable;
				}
			},

			// Called at the end of each move.
			onMove: (G, ctx) => {
				// console.log('MOVE END');
				if (ctx.phase === 'play') {
					let turnState = duelUtil.currentTurnState(G, ctx);
					G.currentTurnDetails = turnState;
				}
			},

			// Prevents ending the turn before a minimum number of moves.
			minMoves: 1,

			// Ends the turn automatically after a number of moves.
			// maxMoves: 2,

			// Calls setActivePlayers with this as argument at the
			// beginning of the turn.
			// activePlayers: { ... },
		},

		phases: {
			setup: {
				moves: { selectPiece, setPiece },
				start: true,
				endIf: G => ( 
					(G.unsetXalianIds.length == 0 && G.unsetOpponentXalianIds.length == 0)
					),
				next: 'play'
			},
			play: {
				moves: { selectPiece, movePiece, movePieceThenAttack, doAttack, endTurn },
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
				totalPlayerHealth += xalian.stats.health;
			})

			let totalOpponentHealth = 0;
			duelUtil.getOpponentXalianIds(G).forEach(id => {
				let xalian = duelUtil.getXalianFromId(id, G);
				totalOpponentHealth += xalian.stats.health;
			})

			
			if (totalPlayerHealth == 0) {
				return { winner: 1 };
			} else if (totalOpponentHealth == 0) {
				return { winner: 0 };
			} 
		},

		ai: {
			enumerate: (G, ctx) => {
				let moves = [];
				// let turnState = duelUtil.currentTurnState(G);
				let turnState = duelUtil.currentTurnState(G, ctx);
				// only building moves if it is the bot's turn and it has a valid action yet to take
				if (duelUtil.isOpponentsTurn(ctx) 
					&& (!turnState.hasAttacked 
						|| !turnState.hasMoved 
						|| (turnState.hasMoved && turnState.remainingSpacesToMove > 0))) {


					if (ctx.phase === 'setup') {
						G.unsetOpponentXalianIds.forEach( id => {
							moves = moves.concat(duelBot.buildSetupBotMoves(G, ctx, id));
						})
					}
					
					
					
					else if (ctx.phase === 'play') {
						let best = duelBot.getBestBotActionForXalianIds(G, ctx, G.activeOpponentXalianIds);
						moves.push(best);

						// G.activeOpponentXalianIds.forEach( id => {
							// moves = moves.concat(possible);
						// })

						// if (duelUtil.currentTurnState(G).hasMoved || duelUtil.currentTurnState(G).hasAttacked) {
						// 	moves.push({ move: 'endTurn', args: [] });
						// }
					}
					
				} else {
					// moves.push({ move: 'endTurn', args: [] });
				}

				
				return moves;
			},
			// objectives: buildBotObjectives
			objectives: () => ({
				'flag-captured': {
				  checker: (G) => {
					//   console.log("doing check");
					  return duelUtil.getOpponentStartingIndices(G).includes(duelUtil.getOpponentFlagIndex(G));
					},
				  weight: 100,
				},
			  }),
			  playoutDepth: 500,
			  iterations: 500
		},
	};
};


// BOT





	// MOVES

// COMMON
// function selectPiece(G, ctx, index, id) {
function selectPiece(G, ctx, id) {
	// G.selectedIndex = index;
	G.selectedId = id;
}

function endTurn(G, ctx) {
	ctx.events.endTurn();
}

// SETUP

function setPiece(G, ctx, index, selectedXalianId) {
	if (G.cells[index] !== null) {
		return INVALID_MOVE;
	}
	// console.log(JSON.stringify(ctx, null, 2));
	G.cells[index] = selectedXalianId;

	if (duelUtil.isPlayersTurn(ctx) && G.unsetXalianIds) {
		moveXalianToActive(selectedXalianId, G.unsetXalianIds, G.activeXalianIds, ctx, true);
	} else if (duelUtil.isOpponentsTurn(ctx) && G.unsetOpponentXalianIds) {
		moveXalianToActive(selectedXalianId, G.unsetOpponentXalianIds, G.activeOpponentXalianIds, ctx, true);
	}
	ctx.events.endTurn();
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
function movePieceThenAttack(G, ctx, movePath, attackPath, data = {}) {
	movePiece(G, ctx, movePath, data);
	doAttack(G, ctx, attackPath, data);
}

// function movePiece(G, ctx, startIndex, endIndex, data = {}) {
function movePiece(G, ctx, path, data = {}) {
	let xalianIdToMove = G.cells[path.startIndex];
	let xalian = duelUtil.getXalianFromId(xalianIdToMove, G);


	let target = duelUtil.getCurrentTurnTargetFlagIndex(G, ctx);

	// set flag holder
	if (path.endIndex == target) {
		let flag = G.flags[parseInt(ctx.currentPlayer)];
		if (flag) {
			flag.index = null;
			flag.holder = xalianIdToMove;
		}
		G.flags[parseInt(ctx.currentPlayer)] = flag;
	}

	G.cells[path.startIndex] = null;
	G.cells[path.endIndex] = xalianIdToMove;

	let action = {
		type: duelConstants.actionTypes.MOVE,
		move: {
			moverId: xalianIdToMove,
			path: path
		}
	};
	G.currentTurnState.actions.push(action);

}


function doAttack(G, ctx, path, data = {}) {
	let attackerIndex = path.startIndex;
	let defenderIndex = path.endIndex;
	let attackerId = G.cells[attackerIndex];
	let attacker = G.xalians.filter((x) => x.xalianId === attackerId)[0];
	let defenderId = G.cells[defenderIndex];
	let defender = G.xalians.filter((x) => x.xalianId === defenderId)[0];
	// console.log('xalian ' + attacker.species.name + ' from square ' + attackerIndex + ' is attacking xalian ' + defender.species.name + ' on square ' + defenderIndex);
	var existingDefenderHealth = parseInt(defender.stats.health);
	let damage = duelCalculator.calculateAttackResult(attacker, defender, G, ctx);
	defender.stats.health = existingDefenderHealth - damage;
	// console.log('resulting health = ' + defender.stats.health);
	if (defender.stats.health <= 0) {
		if (duelUtil.isPlayerPiece(defenderId, G)) {
			removeItemFromList(defenderId, G.activeXalianIds);
			G.inactiveXalianIds.push(defenderId);
			let flag = duelUtil.getPlayerFlagState(G);
			if (flag.holder && flag.holder === defenderId) {
				flag.holder = null;
				flag.index = defenderIndex;
			}
		} else if (duelUtil.isOpponentPiece(defenderId, G)) {
			removeItemFromList(defenderId, G.activeOpponentXalianIds);
			G.inactiveOpponentXalianIds.push(defenderId);
			let flag = duelUtil.getOpponentFlagState(G);
			if (flag.holder && flag.holder === defenderId) {
				flag.holder = null;
				flag.index = defenderIndex;
			}
		}
		G.cells[defenderIndex] = null;
	}

	let action = {
		type: duelConstants.actionTypes.ATTACK,
		attack: {
			attackerId: attackerId,
			defenderId: defenderId,
			path: path
		}
	};
	G.currentTurnState.actions.push(action);
}

function removeItemFromList(item, list) {
	return list.splice(list.indexOf(item), 1);
}