/*
	Duel: pathfinding, movement/attack range and the attack-result formula.

	Moved from apps/web/src/gameplay/duel/duelCalculator.js (issue #184, the duel half of
	the packages/rules move; PR #199 did the same for expedition). The old file pulled
	in six things via require(): three collapse here -
	  - constants/attackCalculationConstants.js -> only BASE_BOTTOM_VAR was used; it now
	    lives in duelGameConstants.ts.
	  - constants/constants.js -> was imported but never referenced in this file at all.
	  - utils/duelUtil.js -> xaliansAreOnSameTeam now lives in boardUtil.ts, in-package.
	  - tools.js's elements.json load -> replaced with expeditionInterpretation.ts's
	    typeEffectivenessMultiplier, which already wraps
	    @xalians/content/typeEffectivenessMatrix.json (the same effectiveness table
	    elements.json's per-element "effectiveness" rows are a copy of).
	  - utils/valueTranslator.js -> its only reference here was a commented-out line
	    (duelStatRangeToVal), so the import is simply dropped.
	  - pathfinding -> now a direct dependency of this package (see package.json).
*/

import * as duelConstants from './duelGameConstants.ts';
import { typeEffectivenessMultiplier } from '../expedition/expeditionInterpretation.ts';
import PF from 'pathfinding';
import * as duelUtil from './boardUtil.ts';
import type { BoardGrid, BoardState, Coordinate, DuelCtx, DuelPath, DuelPiece, DuelMove, AttackResult } from './types.ts';

export function buildPath(startIndex: number, startCoord: Coordinate, endIndex: number, endCoord: Coordinate, path: Coordinate[]): DuelPath {
	return {
		startIndex: startIndex,
		startCoord: startCoord,
		endIndex: endIndex,
		endCoord: endCoord,
		path: path,
		spacesMoved: path.length - 1,
	};
}

export function buildGrid(totalSquares = 0): BoardGrid {
	if (totalSquares === 0) {
		totalSquares = duelConstants.BOARD_COLUMN_SIZE * duelConstants.BOARD_COLUMN_SIZE;
	}
	let boardSize = Math.sqrt(totalSquares);

	let rows: number[][] = [];
	let index = 0;
	let map: Record<number, Coordinate> = {};
	for (let col = 0; col < boardSize; col++) {
		let cols: number[] = [];
		for (let row = 0; row < boardSize; row++) {
			let entry: Coordinate = [row, col];
			map[index] = entry;
			cols.push(index++);
		}
		rows.push(cols);
	}
	return {
		map: map,
		rows: rows,
	};
}

// each side's flag row is the second row in from that side's home row (home rows are the first and last rows of the board)
export function getFlagRowIndices(boardSize: number = duelConstants.BOARD_COLUMN_SIZE) {
	let playerHomeRow = boardSize - 1;
	let opponentHomeRow = 0;
	return {
		playerFlagRow: playerHomeRow - 1,
		opponentFlagRow: opponentHomeRow + 1,
	};
}

export function calculateIndicesWithinDistance(currentIndex: number, distance: number, G: BoardState, ctx: DuelCtx): number[] {
	let boardSize = duelConstants.BOARD_COLUMN_SIZE;

	let grid = buildGrid();
	let rows = grid.rows;
	let map = grid.map;

	let movableIndices: number[] = [];

	let coord = map[currentIndex];
	if (!coord) {
		return [];
	}
	for (let x = coord[0]; x >= 0; x--) {
		let y = coord[1];
		let xOff = Math.abs(coord[0] - x);
		let remainingMoves = distance - xOff;
		let r = remainingMoves;
		while (r >= 0) {
			if (y + r < boardSize) {
				let n = rows[y + r];
				let m = n[x];
				movableIndices.push(m);
			}
			if (y - r >= 0) {
				let n = rows[y - r];
				let m = n[x];
				movableIndices.push(m);
			}
			r -= 1;
		}
	}
	for (let x = coord[0]; x < boardSize; x++) {
		let y = coord[1];
		let xOff = Math.abs(coord[0] - x);
		let remainingMoves = distance - xOff;
		let r = remainingMoves;
		while (r >= 0) {
			if (y + r < boardSize) {
				let n = rows[y + r];
				let m = n[x];
				movableIndices.push(m);
			}
			if (y - r >= 0) {
				let n = rows[y - r];
				let m = n[x];
				movableIndices.push(m);
			}
			r -= 1;
		}
	}
	if (movableIndices.includes(currentIndex)) {
		movableIndices = movableIndices.filter((value) => value !== currentIndex);
	}

	return [...new Set(movableIndices)];
}

export function calculatePathToTarget(currentIndex: number, endIndex: number, G: BoardState, ctx: DuelCtx, builtGrid: PF.Grid | null = null): DuelPath {
	let size = Math.sqrt(G.cells.length);

	let boardGrid = buildGrid(G.cells.length);

	let finder = new PF.AStarFinder();
	let currentCoord = boardGrid.map[currentIndex];

	let grid = new PF.Grid(size, size);
	let gridBackup = grid.clone();
	if (builtGrid) {
		gridBackup = builtGrid;
	}

	let endCoord = boardGrid.map[endIndex];
	let path = finder.findPath(currentCoord[0], currentCoord[1], endCoord[0], endCoord[1], gridBackup) as Coordinate[];
	return buildPath(currentIndex, currentCoord, endIndex, endCoord, path);
}

export function calculateAllValidPaths(G: BoardState, ctx: DuelCtx, currentIndex: number, distance: number, stamina: number): DuelPath[] {
	return calculateValidPaths(G, ctx, currentIndex, distance, true, true, stamina);
}

export function calculateValidEnemyTargetPaths(G: BoardState, ctx: DuelCtx, currentIndex: number, distance: number, stamina: number): DuelPath[] {
	return calculateValidPaths(G, ctx, currentIndex, distance, true, false, stamina);
}

export function calculateValidUnoccupiedPaths(G: BoardState, ctx: DuelCtx, currentIndex: number, distance: number, stamina: number, canFlyOver = false): DuelPath[] {
	return calculateValidPaths(G, ctx, currentIndex, distance, false, true, stamina, canFlyOver);
}

function calculateValidPaths(G: BoardState, ctx: DuelCtx, currentIndex: number, uneditedDistance: number, findOccupied: boolean, findUnoccupied: boolean, stamina: number, canFlyOver = false): DuelPath[] {
	let distance = Math.max(uneditedDistance, 0);
	let size = Math.sqrt(G.cells.length);
	let grid = new PF.Grid(size, size);
	let indicesWithinDistance = calculateIndicesWithinDistance(currentIndex, distance, G, ctx);
	let unoccupied: number[] = [];
	let occupied: number[] = [];
	indicesWithinDistance.forEach((i) => {
		if (G.cells[i]) {
			occupied.push(i);
		} else {
			unoccupied.push(i);
		}
	});

	let selectedPaths: number[] = [];
	if (findOccupied) {
		selectedPaths = selectedPaths.concat(occupied);
	}
	if (findUnoccupied) {
		selectedPaths = selectedPaths.concat(unoccupied);
	}

	let boardGrid = buildGrid(G.cells.length);

	// pieces block movement - unless the mover can fly, which lets it path OVER them
	// (it still can't land on an occupied square: only unoccupied cells are candidates)
	if (!findOccupied && !canFlyOver) {
		occupied.forEach((i) => {
			let coord = boardGrid.map[i];
			grid.setWalkableAt(coord[0], coord[1], false);
		});
	}

	let valid: DuelPath[] = [];
	selectedPaths.forEach((i) => {
		let defenderId = G.cells[i];
		let attackerId = G.cells[currentIndex];
		if (!defenderId || (defenderId && !duelUtil.xaliansAreOnSameTeam(defenderId, attackerId, G))) {
			let path = calculatePathToTarget(currentIndex, i, G, ctx, grid.clone());
			if (path && path.spacesMoved > 0 && path.spacesMoved <= distance && path.spacesMoved <= stamina) {
				valid.push(path);
			}
		}
	});

	return valid;
}

export function calculateMovableIndices(currentIndex: number, xalian: DuelPiece, G: BoardState, ctx: DuelCtx): number[] {
	let valid = calculateMovablePaths(currentIndex, xalian, G, ctx);
	return valid.map((path) => path.endIndex);
}

export function calculateMovablePaths(currentIndex: number, xalian: DuelPiece, G: BoardState, ctx: DuelCtx, isBot = false): DuelPath[] {
	if (ctx.phase === 'play') {
		let remainingForTurn = duelConstants.MAX_SPACES_MOVED_PER_TURN;
		let remainingForXalian = xalian.stats.distance;

		if (G.currentTurnDetails) {
			remainingForTurn = G.currentTurnDetails.remainingSpacesToMove;
			G.currentTurnDetails.moves.forEach((move) => {
				if (xalian.xalianId === move.moverId) {
					remainingForXalian -= move.spacesMoved;
				}
			});
		} else {
			if (G.currentTurnActions) {
				G.currentTurnActions.forEach((action) => {
					if (action.type === duelConstants.actionTypes.MOVE && 'move' in action) {
						let moveDistance = action.move.path.spacesMoved;
						remainingForTurn -= moveDistance;

						if (xalian.xalianId === action.move.moverId) {
							remainingForXalian -= moveDistance;
						}
					}
				});
			}
		}

		let distance = Math.min(remainingForXalian, remainingForTurn);

		// hauling a flag slows you down
		if (isCarryingFlag(xalian, G)) {
			distance = Math.min(distance, duelConstants.FLAG_CARRIER_MAX_SPACES_PER_TURN);
		}

		return calculateValidUnoccupiedPaths(G, ctx, currentIndex, distance, xalian.state.stamina, canFly(xalian));
	}
	return [];
}

export function isCarryingFlag(xalian: DuelPiece, G: BoardState): boolean {
	try {
		return (G.flags || []).some((flag) => flag && flag.holder === xalian.xalianId);
	} catch (e) {
		return false;
	}
}

function canFly(xalian: DuelPiece): boolean {
	return !!(xalian && xalian.traits && xalian.traits.canFly);
}

export function calculateAttackableIndices(currentIndex: number, xalian: DuelPiece, boardState: BoardState, ctx: DuelCtx, onlyOccupiedCells = true): number[] {
	let valid = calculateAttackablePaths(currentIndex, xalian, boardState, ctx, onlyOccupiedCells);
	return valid.map((path) => path.endIndex);
}

export function calculateAttackablePaths(currentIndex: number, xalian: DuelPiece, boardState: BoardState, ctx: DuelCtx, onlyOccupiedCells = true): DuelPath[] {
	let range = xalian.stats.range;
	let paths = onlyOccupiedCells
		? calculateValidEnemyTargetPaths(boardState, ctx, currentIndex, range, xalian.state.stamina)
		: calculateAllValidPaths(boardState, ctx, currentIndex, range, xalian.state.stamina);
	let attackablePaths: DuelPath[] = [];
	paths.forEach((path) => {
		if (boardState.cells[path.endIndex]) {
			let defenderId = boardState.cells[path.endIndex];
			if (!duelUtil.xaliansAreOnSameTeam(xalian.xalianId, defenderId, boardState)) {
				attackablePaths.push(path);
			}
		} else if (!onlyOccupiedCells) {
			attackablePaths.push(path);
		}
	});
	return attackablePaths;
}

export function calculateAttackResult(attacker: DuelPiece, defender: DuelPiece, G: BoardState, ctx: DuelCtx, simulate = false, move: DuelMove | null = null): AttackResult {
	let base = calculateBaseValue(attacker, defender);
	let power = move && move.rating ? move.rating / 10 : 1;
	let targets = calculateMultipleTargetsValue();
	let weather = calculatePlanetEffectValue();
	let badge = calculateUserExperienceValue();
	let critical = calculateCriticalValue();
	let random = simulate ? 1 : calculateRandom();
	let sameTypeBonus = calculateSameTypeAttackBonus(move, attacker);
	// This can be 0 (ineffective); 0.25, 0.5 (not very effective); 1 (normally effective); 2, or 4 (super effective)
	let attackType = move && move.type ? move.type : null;
	let typeEffectiveness = calculateTypeEffectiveness(attackType, defender);
	let hinderingStatus = calculateHindranceEffect();
	let evasion = calculateEvasionMitigation(defender);
	let other = calculateRemainingFactors();
	let result = base * power * targets * weather * badge * critical * random * sameTypeBonus * typeEffectiveness * hinderingStatus * other;
	let final = Math.floor(result * 10) / 10;

	// No single blow may take a full health bar: stacking move power, STAB and a
	// dual-type weakness used to reach ~25 against 15 HP. Type advantage should win
	// the trade, not delete the piece outright. Expressed as a share of max health so
	// it follows MAX_HEALTH_POINTS if that is ever retuned.
	let rawDamage = final * 2;
	let ceiling = duelConstants.MAX_SINGLE_HIT_HEALTH_FRACTION * duelConstants.MAX_HEALTH_POINTS;
	// evasion applies after the ceiling so it still matters against the biggest hits
	let damage = Math.floor(Math.min(rawDamage, ceiling) * evasion * 10) / 10;

	return {
		damage: damage,
		uncappedDamage: rawDamage,
		reactionDamage: 0,
		typeEffectiveness: typeEffectiveness,
		move: move ? { name: move.name, type: move.type || null } : null,
	};
}

// evasion softens incoming damage instead of rolling a dodge - see duelGameConstants
function calculateEvasionMitigation(defender: DuelPiece): number {
	try {
		let evasion = defender && defender.stats ? defender.stats.evasion : 0;
		if (!Number.isFinite(evasion) || evasion <= 0) {
			return 1;
		}
		let reduction = Math.min(evasion * duelConstants.EVASION_DAMAGE_REDUCTION_PER_POINT, duelConstants.MAX_EVASION_DAMAGE_REDUCTION);
		return 1 - reduction;
	} catch (e) {
		return 1;
	}
}

function calculateBaseValue(attacker: DuelPiece, defender: DuelPiece): number {
	try {
		let k = calculateLevelK();
		let a_d = calculateEffectiveAttackAndDefense(attacker, defender);
		let baseTop = k * a_d;
		return (baseTop / duelConstants.BASE_BOTTOM_VAR) + 2;
	} catch (e) {
		return 1;
	}
}

function calculateLevelK(): number {
	try {
		let levelVarPlaceholder = 10;
		return ((2 * levelVarPlaceholder) / 5) + 2;
	} catch (e) {
		return 1;
	}
}

function calculateEffectiveAttackAndDefense(attacker: DuelPiece, defender: DuelPiece): number {
	try {
		return attacker.stats.attack / defender.stats.defense;
	} catch (e) {
		return 1;
	}
}

function calculateMultipleTargetsValue(): number {
	// add functionality here for if we want to allow moves that hit more than one defender
	// Targets is 0.75 if the move has more than one target and 1 otherwise
	return 1;
}

function calculatePlanetEffectValue(): number {
	// Weather is 1.5 if a Water-type move is being used during rain or a Fire-type move during harsh sunlight,
	// and 0.5 if a Water-type move is used during harsh sunlight or a Fire-type move during rain, and 1 otherwise.

	// maybe this is where the planet comes in?
	return 1;
}

function calculateUserExperienceValue(): number {
	// could be used to give a boost to attacks from xalians that are minted versus starter packs
	// Pokemon uses Badge Value --> is 1.25 if the player has obtained the Badge corresponding to the used move's type, and 1 otherwise.
	return 1;
}

function calculateCriticalValue(): number {
	// free to implement this however
	// Critical is 1.5 for a critical hit, and 1 otherwise.
	return 1;
}

function calculateRandom(): number {
	// random integer percentage between 85% and 100% (inclusive)
	try {
		return (Math.random() * 0.15) + 0.85;
	} catch (e) {
		return 1;
	}
}

function calculateSameTypeAttackBonus(move: DuelMove | null, attacker: DuelPiece): number {
	// 1.5 if the move's type matches any of the attacker's types, and 1 otherwise.
	if (!move || !move.type) {
		return 1;
	}

	try {
		let elements = attacker.elements || { primaryType: attacker.elementType, secondaryType: null };
		let type = move.type.toLowerCase();
		let attackerPrimary = elements.primaryType ? elements.primaryType.toLowerCase() : null;
		let attackerSecondary = elements.secondaryType ? elements.secondaryType.toLowerCase() : null;

		if (type === attackerPrimary || type === attackerSecondary) {
			return 1.5;
		}
		return 1;
	} catch (e) {
		return 1;
	}
}

export function calculateTypeEffectiveness(attackType: string | null | undefined, defender: DuelPiece): number {
	// This can be 0 (ineffective); 0.5 (not very effective); 1 (normally effective); 1.5, or 2 (super effective)
	// For targets that have multiple types, the type effectiveness of a move is the product of its effectiveness against each of the types.
	if (!attackType) {
		return 1;
	}

	try {
		let defenderPrimaryType = defender.elementType;
		let defenderSecondaryType = defender.elements && defender.elements.secondaryType;

		let effectivenessOnPrimary = typeEffectivenessMultiplier(attackType, defenderPrimaryType);
		let effectivenessOnSecondary = defenderSecondaryType ? typeEffectivenessMultiplier(attackType, defenderSecondaryType) : 1;

		return effectivenessOnPrimary * effectivenessOnSecondary;
	} catch (e) {
		return 1;
	}
}

function calculateHindranceEffect(): number {
	// this is meant to reduce the effectiveness if the attacker is hindered by a status effect such as burned
	return 1;
}

function calculateRemainingFactors(): number {
	// anything in the future that we want to use to effect the outcome of the result
	return 1;
}
