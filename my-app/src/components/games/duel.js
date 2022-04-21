import { INVALID_MOVE } from 'boardgame.io/core';
import * as gameConstants from './duelGameConstants';
import * as duelUtil from '../../utils/duelUtil';
import * as duelCalculator from '../../gameplay/duelCalculator';

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

			let user = data.user;

			return {
				cells: Array(gameConstants.BOARD_COLUMN_SIZE * gameConstants.BOARD_COLUMN_SIZE).fill(null),
				xalians: data.xalians,
				user: user,
				activeXalianIds: [],
				inactiveXalianIds: [],
				unsetXalianIds: unsetXalianIds,
				activeOpponentXalianIds: [],
				inactiveOpponentXalianIds: [],
				unsetOpponentXalianIds: unsetOpponentXalianIds,
				selectedId: null,
				selectedIndex: null
			};
		},

		turn: {
			// The turn order.
			// order: TurnOrder.DEFAULT,

			// Called at the beginning of a turn.
			onBegin: (G, ctx) => {
				console.log('STARTING TURN');
				G.currentTurnState = {
					hasAttacked: false,
					hasMoved: false,
					remainingSpacesToMove: 0
				};
			},

			// Called at the end of a turn.
			onEnd: (G, ctx) => {
				console.log('ENDING TURN');
			},

			// Ends the turn if this returns true.
			endIf: (G, ctx) => {
				// console.log('DECIDING TO END');
				if (ctx.phase === 'play') {

					let cantMove = (G.currentTurnState.hasMoved && G.currentTurnState.remainingSpacesToMove == 0);
					var canAttack = true;
					if (duelUtil.isPlayersTurn(ctx)) {
						G.activeXalianIds.forEach( id => {
							let xalian = duelUtil.getXalianFromId(id, G);
							let ind = G.cells.filter( c => ( c && c === id ))[0];
							let attackableSpaces = duelCalculator.calculateAttackableIndices(ind, xalian, G, ctx);
							canAttack = canAttack && attackableSpaces && attackableSpaces.length > 0;
						})
					} else if (duelUtil.isOpponentsTurn(ctx)) {
						G.activeOpponentXalianIds.forEach( id => {
							let xalian = duelUtil.getXalianFromId(id, G);
							let ind = G.cells.filter( c => ( c && c === id ))[0];
							let attackableSpaces = duelCalculator.calculateAttackableIndices(ind, xalian, G, ctx);
							canAttack = canAttack && attackableSpaces && attackableSpaces.length > 0;
						})
					} 
					
					return G.currentTurnState && (
						cantMove && !canAttack
						);
				}
			},

			// Called at the end of each move.
			onMove: (G, ctx) => {
				console.log('MOVE END');
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
				endIf: G => ( G.unsetXalianIds.length == 0 && G.unsetOpponentXalianIds.length == 0 ),
				next: 'play'
			},
			play: {
				moves: { selectPiece, movePiece, doAttack },
			},
		},

		moves: { selectPiece },

		endIf: (G, ctx) => {
			if (isVictory(G.cells)) {
				return { winner: ctx.currentPlayer };
			}
			if (isDraw(G.cells)) {
				return { draw: true };
			}
		},

		ai: {
			enumerate: (G, ctx) => {
				let moves = [];
				for (let i = 0; i < gameConstants.BOARD_COLUMN_SIZE; i++) {
					if (G.cells[i] === null) {
						moves.push({ move: 'clickCell', args: [i] });
					}
				}
				return moves;
			},
		},
	};
};

// MOVES
function selectPiece(G, ctx, index, id) {
	G.selectedIndex = index;
	G.selectedId = id;
}


function setPiece(G, ctx, index, selectedXalianId) {
	if (G.cells[index] !== null) {
		return INVALID_MOVE;
	}
	// console.log(JSON.stringify(ctx, null, 2));
	G.cells[index] = selectedXalianId;

	if (duelUtil.isPlayersTurn(ctx) && G.unsetXalianIds) {
		moveXalianToActive(selectedXalianId, G.unsetXalianIds, G.activeXalianIds, ctx);
	} else if (duelUtil.isOpponentsTurn(ctx) && G.unsetOpponentXalianIds) {
		moveXalianToActive(selectedXalianId, G.unsetOpponentXalianIds, G.activeOpponentXalianIds, ctx);
	}
}

function moveXalianToActive(id, unset, active, ctx) {
	if (unset.includes(id)) {
		unset.splice(unset.indexOf(id), 1);
		active.push(id);
		if (unset.length === 0) {
			ctx.events.endTurn();
		}
	}
}

function movePiece(G, ctx, startIndex, endIndex, xalianIdToMove) {
	let xalian = duelUtil.getXalianFromId(xalianIdToMove, G);
	if (!G.currentTurnState.hasMoved) {
		G.currentTurnState.hasMoved = true;
		G.currentTurnState.remainingSpacesToMove = xalian.stats.distance;
	}

	let paths = duelCalculator.calculateValidPaths(startIndex, xalian, G, ctx);
	let selectedPaths = paths.filter( path => ( path.endIndex == endIndex ));
	let selectedPath = selectedPaths[0];
	if (selectedPath) {
		let distance = selectedPath.path.length - 1; // subtract starting sqare from path length;
		G.currentTurnState.remainingSpacesToMove = G.currentTurnState.remainingSpacesToMove - distance;
	} else {
		console.log("NO INDEX?!?");
	}

	G.cells[startIndex] = null;
	G.cells[endIndex] = xalianIdToMove;
}

function doAttack(G, ctx, attackerIndex, defenderIndex) {
	G.currentTurnState.hasAttacked = true;

	let attackerId = G.cells[attackerIndex];
	let attacker = G.xalians.filter((x) => x.xalianId === attackerId)[0];
	let defenderId = G.cells[defenderIndex];
	let defender = G.xalians.filter((x) => x.xalianId === defenderId)[0];
	console.log('xalian ' + attacker.species.name + ' from square ' + attackerIndex + ' is attacking xalian ' + defender.species.name + ' on square ' + defenderIndex);
	var existingDefenderHealth = parseInt(defender.stats.health);
	let damage = duelCalculator.calculateAttackResult(attacker, defender, G, ctx);
	defender.stats.health = existingDefenderHealth - damage;
	console.log('resulting health = ' + defender.stats.health);
	if (defender.stats.health <= 0) {
		if (duelUtil.isPlayerPiece(defenderId, G)) {
			removeItemFromList(defenderId, G.activeXalianIds);
			G.inactiveXalianIds.push(defenderId);
		} else if (duelUtil.isOpponentPiece(defenderId, G)) {
			removeItemFromList(defenderId, G.activeOpponentXalianIds);
			G.inactiveOpponentXalianIds.push(defenderId);
		}
		G.cells[defenderIndex] = null;
	}
	G.currentTurnState.hasAttacked = true;
}

// Return true if `cells` is in a winning configuration.
function isVictory(cells) {
	const positions = [
		[0, 1, 2],
		[3, 4, 5],
		[6, 7, 8],
		[0, 3, 6],
		[1, 4, 7],
		[2, 5, 8],
		[0, 4, 8],
		[2, 4, 6],
	];

	const isRowComplete = (row) => {
		const symbols = row.map((i) => cells[i]);
		return symbols.every((i) => i !== null && i === symbols[0]);
	};

	return positions.map(isRowComplete).some((i) => i === true);
}

// Return true if all `cells` are occupied.
function isDraw(cells) {
	return cells.filter((c) => c === null).length === 0;
}

function removeItemFromList(item, list) {
	return list.splice(list.indexOf(item), 1);
}

function calculateDamageDealt(attacker, defender) {}
