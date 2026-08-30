const constants = require('../../constants/constants.js');
const attackConstants = require('../../constants/attackCalculationConstants.js');
const tools = require('../../tools.js');
// var Move = require('../model/move.js');
const translator = require('../../utils/valueTranslator.js');
const duelUtil = require('../../utils/duelUtil.js');
const duelConstants = require('../../gameplay/duel/duelGameConstants.js');
var PF = require('pathfinding');

export function buildPath(startIndex, startCoord, endIndex, endCoord, path) {
    return {
        startIndex: startIndex, 
        startCoord: startCoord, 
        endIndex: endIndex, 
        endCoord: endCoord, 
        path: path,
        spacesMoved: path.length - 1
    };
}

export function buildGrid(totalSquares = 0) {
    if (totalSquares == 0) {
        totalSquares = duelConstants.BOARD_COLUMN_SIZE * duelConstants.BOARD_COLUMN_SIZE;
    }
    let boardSize = Math.sqrt(totalSquares);

    let rows = [];
    let index = 0;
    let map = new Map();
    for (var col = 0; col < boardSize; col++) {
        let cols = [];
        for (var row = 0; row < boardSize; row++) {
            let entry = [row, col];
            map[index] = entry;
            cols.push(index++);
        }
        rows.push(cols);
    }
    return {
        map: map,
        rows: rows
    }
}

// each side's flag row is the second row in from that side's home row (home rows are the first and last rows of the board)
export function getFlagRowIndices(boardSize = duelConstants.BOARD_COLUMN_SIZE) {
    let playerHomeRow = boardSize - 1;
    let opponentHomeRow = 0;
    return {
        playerFlagRow: playerHomeRow - 1,
        opponentFlagRow: opponentHomeRow + 1
    };
}

export function calculateIndicesWithinDistance(currentIndex, distance, G, ctx) {
    let boardSize = duelConstants.BOARD_COLUMN_SIZE;

    let grid = buildGrid();
    let rows = grid.rows;
    let map = grid.map;
    
    let movableIndices = [];
    
    let coord = map[parseInt(currentIndex)];
    if (!coord) {
        // console.error("!");
        return [];
    }
    for (var x = coord[0]; x >= 0; x--) {
        var y = coord[1];
        let xOff = Math.abs(coord[0] - x);
        var remainingMoves = distance - xOff;
        var r = remainingMoves;
        while(r >= 0) {
            if (y + r < boardSize) {
                let n = rows[y + r];
                let m = n[x];
                movableIndices.push(m);
            }
            if (y - r >= 0) {
                let n = rows[y-r];
                let m = n[x];
                movableIndices.push(m);
            }
            r -= 1;
        }

    }
    for (var x = coord[0]; x < boardSize; x++) {
        var y = coord[1];
        let xOff = Math.abs(coord[0] - x);
        var remainingMoves = distance - xOff;
        var r = remainingMoves;
        while(r >= 0) {
            if (y + r < boardSize) {
                let n = rows[y + r];
                let m = n[x];
                movableIndices.push(m);
            }
            if (y - r >= 0) {
                let n = rows[y-r];
                let m = n[x];
                movableIndices.push(m);
            }
            r -= 1;
        }

    }
    if (movableIndices.includes(currentIndex)) {
        movableIndices = movableIndices.filter(function(value, index, arr){ 
            return value != currentIndex;
        });
    }

    let filtered =  [...new Set(movableIndices)];
    return filtered;
}


export function calculatePathToTarget(currentIndex, endIndex, G, ctx, builtGrid = null) {
    let size = Math.sqrt(G.cells.length);
    
    let boardGrid = buildGrid(G.cells.length);
    
    
    var finder = new PF.AStarFinder();
    var currentCoord = boardGrid.map[currentIndex];

    var grid = new PF.Grid(size, size);
    var gridBackup = grid.clone();
    if (builtGrid) {
        gridBackup = builtGrid;
    }

    var endCoord = boardGrid.map[endIndex];
    var path = finder.findPath(currentCoord[0], currentCoord[1], endCoord[0], endCoord[1], gridBackup);
    return buildPath(currentIndex, currentCoord, endIndex, endCoord, path);
}

export function calculateAllValidPaths(G, ctx, currentIndex, distance, stamina) {
    return calculateValidPaths(G, ctx, currentIndex, distance, true, true, stamina);
}

export function calculateValidEnemyTargetPaths(G, ctx, currentIndex, distance, stamina) {
    return calculateValidPaths(G, ctx, currentIndex, distance, true, false, stamina);
}

export function calculateValidUnoccupiedPaths(G, ctx, currentIndex, distance, stamina, canFlyOver = false) {
    return calculateValidPaths(G, ctx, currentIndex, distance, false, true, stamina, canFlyOver);
}

function calculateValidPaths(G, ctx, currentIndex, uneditedDistance, findOccupied, findUnoccupied, stamina, canFlyOver = false) {
    let distance = Math.max(uneditedDistance, 0);
    let size = Math.sqrt(G.cells.length);
    var grid = new PF.Grid(size, size); 
    let indicesWithinDistance = calculateIndicesWithinDistance(currentIndex, distance, G, ctx);
    var unoccupied = [];
    var occupied = [];
    indicesWithinDistance.forEach( i => {
        if (G.cells[i]) {
            occupied.push(i);
        } else {
            unoccupied.push(i);
        }
    });

    var selectedPaths = [];
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
        occupied.forEach( i => {
            let coord = boardGrid.map[i];
            grid.setWalkableAt(coord[0], coord[1], false);
        })
    }

    var valid = [];
    selectedPaths.forEach( i => {
        let defenderId = G.cells[i];
        let attackerId = G.cells[currentIndex];
        if (!defenderId || (defenderId && !duelUtil.xaliansAreOnSameTeam(defenderId, attackerId, G))) {
            var path = calculatePathToTarget(currentIndex, i, G, ctx, grid.clone());
            if (path && path.spacesMoved > 0 && path.spacesMoved <= distance && path.spacesMoved <= stamina) {
                valid.push(path);
            } else {
                // console.error("INVALID ATTACK PATH?");
            }
        }
    })

    return valid;
}

export function calculateMovableIndices(currentIndex, xalian, G, ctx) {
    let valid = calculateMovablePaths(currentIndex, xalian, G, ctx);
    return valid.map( path => path.endIndex );
}

export function calculateMovablePaths(currentIndex, xalian, G, ctx, isBot = false) {
    // let distance = G.currentTurnDetails.hasMoved ? G.currentTurnDetails.remainingSpacesToMove : xalian.stats.distance;
    if (ctx.phase === 'play') {

        var remainingForTurn = duelConstants.MAX_SPACES_MOVED_PER_TURN;
        var remainingForXalian = xalian.stats.distance;

        if (G.currentTurnDetails) {
            remainingForTurn = G.currentTurnDetails.remainingSpacesToMove;
            G.currentTurnDetails.moves.forEach( move => {
                if (xalian.xalianId === move.moverId) {
                    remainingForXalian -= move.spacesMoved;
                }
            })
        } else {
            if (G.currentTurnActions) {
                G.currentTurnActions.forEach(action => {
                    if (action.type == duelConstants.actionTypes.MOVE) {
                        let moveDistance = action.move.path.spacesMoved;
                        remainingForTurn -= moveDistance;

                        if (xalian.xalianId === action.move.moverId) {
                            remainingForXalian -= moveDistance
                        }
                    }
                })
            }
        }
        
        // let moves = turnState.moves || [];
        // moves.forEach( move => {
        //     if (move.id === xalian.xalianId) {
        //         remainingForXalian -= move.spacesMoved;
        //     }
        // })
        var distance = Math.min(remainingForXalian, remainingForTurn);

        // hauling a flag slows you down
        if (isCarryingFlag(xalian, G)) {
            distance = Math.min(distance, duelConstants.FLAG_CARRIER_MAX_SPACES_PER_TURN);
        }

        return calculateValidUnoccupiedPaths(G, ctx, currentIndex, distance, xalian.state.stamina, canFly(xalian));
    }
}

export function isCarryingFlag(xalian, G) {
    try {
        return (G.flags || []).some((flag) => flag && flag.holder === xalian.xalianId);
    } catch (e) {
        return false;
    }
}

function canFly(xalian) {
    return !!(xalian && xalian.traits && xalian.traits.canFly);
}

export function calculateAttackableIndices(currentIndex, xalian, boardState, ctx, onlyOccupiedCells = true) {
    let valid = calculateAttackablePaths(currentIndex, xalian, boardState, ctx, onlyOccupiedCells);
    return valid.map( path => path.endIndex );
}

export function calculateAttackablePaths(currentIndex, xalian, boardState, ctx, onlyOccupiedCells = true) {
    // let range = translator.duelStatRangeToVal(xalian.traits.attackRange);
    let range = xalian.stats.range;
    let paths = onlyOccupiedCells ? calculateValidEnemyTargetPaths(boardState, ctx, currentIndex, range, xalian.state.stamina) : calculateAllValidPaths(boardState, ctx, currentIndex, range, xalian.state.stamina);
    let attackablePaths = [];
    paths.forEach( path => {
        if (boardState.cells[path.endIndex]) {
            let defenderId = boardState.cells[path.endIndex];
            if (!duelUtil.xaliansAreOnSameTeam(xalian.xalianId, defenderId, boardState, ctx)) {
                attackablePaths.push(path);
            }
        } else if (!onlyOccupiedCells) {
            attackablePaths.push(path);
        }
    });
    return attackablePaths;
}

export function calculateAttackResult(attacker, defender, G, ctx, simulate = false, move = null) {
    let base = calculateBaseValue(attacker, defender);
    let power = move && move.rating ? move.rating / 10 : 1;
    let targets = calculateMultipleTargetsValue(attacker);
    let weather = calculatePlanetEffectValue(attacker, G);
    let badge = calculateUserExperienceValue(attacker);
    let critical = calculateCriticalValue();
    let random = simulate ? 1 : calculateRandom();
    let sameTypeBonus = calculateSameTypeAttackBonus(move, attacker);
    // This can be 0 (ineffective); 0.25, 0.5 (not very effective); 1 (normally effective); 2, or 4 (super effective)
    let attackType = move && move.type ? move.type : null;
    let typeEffectiveness = calculateTypeEffectiveness(attackType, defender);
    let hinderingStatus = calculateHindranceEffect(attacker);
    let evasion = calculateEvasionMitigation(defender);
    let other = calculateRemainingFactors(attacker, defender, G, ctx);
    let result = base * power * targets * weather * badge * critical * random * sameTypeBonus * typeEffectiveness * hinderingStatus * other;
    let final = Math.floor(result * 10)/10;
    // console.log(`base=${base}, random=${random}, sameTypeBonus=${sameTypeBonus}, final=${final}`);


    // BUILD SUMMARY OBJECT

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
        move: move ? { name: move.name, type: move.type || null } : null
    }
}

// evasion softens incoming damage instead of rolling a dodge - see duelGameConstants
function calculateEvasionMitigation(defender) {
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

function calculateBaseValue(attacker, defender) {
    try {
        let k = calculateLevelK(attacker);
        let a_d = calculateEffectiveAttackAndDefense(attacker, defender);
        let baseTop = k * a_d;
        let baseResult = (baseTop / attackConstants.BASE_BOTTOM_VAR) + 2;
        // console.log(`level=${k}, a_d=${a_d}, baseTop=${baseTop}, baseResult=${baseResult}`);
        return baseResult;
    } catch (e) {
        return 1;
    }
}

function calculateLevelK(xalian) {
    try {
        let levelVarPlaceholder = 10;
        return ((2 * levelVarPlaceholder) / 5) + 2;
    } catch (e) {
        return 1;
    }
}

function calculateEffectiveAttackAndDefense(attacker, defender) {
    try {
            let val = (attacker.stats.attack / defender.stats.defense);
            return val;
    } catch (e) {
        return 1;
    }
}

function isSpecialTypedMove(move) {
    try {
        return move.element ? true : false;
    } catch (e) {
        return false;
    }
}

function calculateMultipleTargetsValue(move) {
    // add functionality here for if we want to allow moves that hit more than one defender
    // Targets is 0.75 if the move has more than one target and 1 otherwise
    return 1;
}

function calculatePlanetEffectValue(move, matchState) {
    // Weather is 1.5 if a Water-type move is being used during rain or a Fire-type move during harsh sunlight,
    // and 0.5 if a Water-type move is used during harsh sunlight or a Fire-type move during rain, and 1 otherwise.

    // maybe this is where the planet comes in?
    return 1;
}

function calculateUserExperienceValue(attacker) {
    // could be used to give a boost to attacks from xalians that are minted versus starter packs
    // Pokemon uses Badge Value --> is 1.25 if the player has obtained the Badge corresponding to the used move's type, and 1 otherwise.
    return 1;
}

function calculateCriticalValue() {
    // free to implement this however

    // random?

    // Critical is 1.5 for a critical hit, and 1 otherwise.
    return 1;
}

function calculateRandom() {
    // random integer percentage between 85% and 100% (inclusive)
    try {
        return (Math.random() * 0.15) + 0.85;
    } catch (e) {
        return 1;
    }
}

function calculateSameTypeAttackBonus(move, attacker) {
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

export function calculateTypeEffectiveness(attackType, defender) {
    // This can be 0 (ineffective); 0.5 (not very effective); 1 (normally effective); 1.5, or 2 (super effective)
    // For targets that have multiple types, the type effectiveness of a move is the product of its effectiveness against each of the types.
    if (!attackType) {
        return 1;
    }

    try {
        let json = tools.getJson("elements");
        let nodes = JSON.parse(json.toString());
        let effectivenessOfAttackByElementMap = new Map();
        nodes.forEach(node => {
            effectivenessOfAttackByElementMap[node.name.toLowerCase()] = node.effectiveness;
        });

        let effectivenessMap = effectivenessOfAttackByElementMap[attackType.toLowerCase()];
        let defenderPrimaryType = defender.elementType;
        let defenderSecondaryType = defender.elements && defender.elements.secondaryType;

        let effectivenessOnPrimary = effectivenessMap[defenderPrimaryType];
        effectivenessOnPrimary = typeof effectivenessOnPrimary === 'number' ? effectivenessOnPrimary : 1;

        let effectivenessOnSecondary = 1;
        if (defenderSecondaryType) {
            let val = effectivenessMap[defenderSecondaryType];
            effectivenessOnSecondary = typeof val === 'number' ? val : 1;
        }

        return effectivenessOnPrimary * effectivenessOnSecondary;
    } catch (e) {
        return 1;
    }
}

function calculateHindranceEffect(attacker) {
    // this is meant to reduce the effectiveness if the attacker is hindered by a status effect such as burned
    return 1;
}

function calculateRemainingFactors(attacker, defender, G, ctx) {
    // anything in the future that we want to use to effect the outcome of the result
    return 1;
}