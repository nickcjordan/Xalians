import { INVALID_MOVE } from 'boardgame.io/core';
import * as gameConstants from './duelGameConstants';
import * as duelUtil from '../../utils/duelUtil';
import * as duelCalculator from '../../gameplay/duelCalculator';

export const Duel = (data) => {
	return {
		setup: (ctx, setupData) => {
      let unsetXalianIds = [];
      data.playerXalians.forEach( x => {
        unsetXalianIds.push(x.xalianId)
      })

      let unsetOpponentXalianIds = [];
      data.opponentXalians.forEach( x => {
        unsetOpponentXalianIds.push(x.xalianId)
      })


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
        unsetOpponentXalianIds: unsetOpponentXalianIds
			};
		},

		turn: {
			// The turn order.
			// order: TurnOrder.DEFAULT,

			// Called at the beginning of a turn.
			onBegin: (G, ctx) => {
        console.log("STARTING TURN");
      },

			// Called at the end of a turn.
			onEnd: (G, ctx) => {
        console.log("ENDING TURN");
      },

			// Ends the turn if this returns true.
			endIf: (G, ctx) => {
        console.log("DECIDING TO END");
        return true;
      },

			// Called at the end of each move.
			onMove: (G, ctx) => {
        console.log("MOVE END");
      },

			// Prevents ending the turn before a minimum number of moves.
			minMoves: 1,

			// Ends the turn automatically after a number of moves.
			maxMoves: 1,

			// Calls setActivePlayers with this as argument at the
			// beginning of the turn.
			// activePlayers: { ... },
		},

		moves: {
			// clickCell: (G, ctx, index, selectedXalianId) => {
			// 	if (G.cells[index] !== null) {
			// 		return INVALID_MOVE;
			// 	}

			// 	// G.cells[id] = ctx.currentPlayer;
			// 	G.cells[index] = selectedXalianId;
			// },

      setPiece: (G, ctx, index, selectedXalianId) => {
				if (G.cells[index] !== null) {
					return INVALID_MOVE;
				}
				G.cells[index] = selectedXalianId;
        // player
        if (G.unsetXalianIds) {
          if (G.unsetXalianIds.includes(selectedXalianId)) {
            G.unsetXalianIds.splice(G.unsetXalianIds.indexOf(selectedXalianId), 1);
            G.activeXalianIds.push(selectedXalianId);
          }
        }
        // opponent
        if (G.unsetOpponentXalianIds) {
          if (G.unsetOpponentXalianIds.includes(selectedXalianId)) {
            G.unsetOpponentXalianIds.splice(G.unsetOpponentXalianIds.indexOf(selectedXalianId), 1);
            G.activeOpponentXalianIds.push(selectedXalianId);
          }
        }
			},

      movePiece: (G, ctx, startIndex, endIndex, xalianIdToMove) => {
				G.cells[startIndex] = null;
				G.cells[endIndex] = xalianIdToMove;
			},

      doAttack: (G, ctx, attackerIndex, defenderIndex) => {
        let attackerId = G.cells[attackerIndex];
        let attacker = G.xalians.filter((x) => x.xalianId === attackerId)[0];
        let defenderId = G.cells[defenderIndex];
        let defender = G.xalians.filter((x) => x.xalianId === defenderId)[0];
				console.log('xalian ' + attacker.species.name + ' from square ' + attackerIndex + ' is attacking xalian ' + defender.species.name + ' on square ' + defenderIndex);
        var existingDefenderHealth = parseInt(defender.stats.health);
        let damage = duelCalculator.calculateAttackResult(attacker, defender, G, ctx);
        defender.stats.health = existingDefenderHealth - damage;
        console.log("resulting health = " + defender.stats.health);
        if (parseInt(defender.stats.health) == 0) {
          if (duelUtil.isPlayerPiece(defenderId, G)) {
            removeItemFromList(defenderId, G.activeXalianIds);
            G.inactiveXalianIds.push(defenderId);
          } else if (duelUtil.isOpponentPiece(defenderId, G)) {
            removeItemFromList(defenderId, G.activeOpponentXalianIds);
            G.inactiveOpponentXalianIds.push(defenderId);
          }
          G.cells[defenderIndex] = null;
        }
      },

		},

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




function calculateDamageDealt(attacker, defender) {

}