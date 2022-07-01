const fs = require('fs')
const constants = require('../../constants/constants.js');
const attackConstants = require('../../constants/attackCalculationConstants.js');
const tools = require('../../tools.js');
// var Move = require('../model/move.js');
const mockMove = require('../../json/mock/mockMove.json'); 
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

export function calculateValidUnoccupiedPaths(G, ctx, currentIndex, distance, stamina, isBot = false) {
    return calculateValidPaths(G, ctx, currentIndex, distance, false, true, stamina, isBot);
}

function calculateValidPaths(G, ctx, currentIndex, uneditedDistance, findOccupied, findUnoccupied, stamina, isBot = false) {
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

    if (!findOccupied) {
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
        return calculateValidUnoccupiedPaths(G, ctx, currentIndex, distance, xalian.state.stamina, isBot);
    }
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

export function calculateAttackResult(attacker, defender, G, ctx, simulate = false, secondary = false) {
    let base = calculateBaseValue(attacker, defender);
    let targets = calculateMultipleTargetsValue(attacker);
    let weather = calculatePlanetEffectValue(attacker, G);
    let badge = calculateUserExperienceValue(attacker);
    let critical = calculateCriticalValue();
    let random = simulate ? 1 : calculateRandom();
    // let sameTypeBonus = calculateSameTypeAttackBonus(move, attacker);
    let sameTypeBonus = 1;
    // This can be 0 (ineffective); 0.25, 0.5 (not very effective); 1 (normally effective); 2, or 4 (super effective)
    let typeEffectiveness = calculateTypeEffectiveness(attacker, defender, secondary);
    let hinderingStatus = calculateHindranceEffect(attacker);
    let other = calculateRemainingFactors(attacker, defender, G, ctx);
    let result = base * targets * weather * badge * critical * random * sameTypeBonus * typeEffectiveness * hinderingStatus * other;
    let final = Math.floor(result * 10)/10;
    // console.log(`base=${base}, random=${random}, sameTypeBonus=${sameTypeBonus}, final=${final}`);
    

    // BUILD SUMMARY OBJECT

    // return defender.state.health;
    let damage = final * 2;

    return {
        damage: damage,
        reactionDamage: 0,
        typeEffectiveness: typeEffectiveness
    }
}

function calculateBaseValue(attacker, defender) {
    try {
        let k = calculateLevelK(attacker);
        // let power = move.potential || move.rating;
        let power = 1;
        let a_d = calculateEffectiveAttackAndDefense(attacker, defender);
        let baseTop = k * power * a_d;
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

// function calculateSameTypeAttackBonus(move, attacker) {
//     // 1.5 if the move's type matches any of the user's types, and 1 if otherwise.
//     if (!move.type) {
//         return 1;
//     }

//     let type = move.type && move.type.name ? move.type.name.toLowerCase() : move.type.toLowerCase();
//     let attackerPrimary = attacker.elementType && attacker.elementType.name ? attacker.elementType.name.toLowerCase() : attacker.elementType.toLowerCase();
//     let attackerSecondary = attacker.elements.secondaryType && attacker.elements.secondaryType.name ? attacker.elements.secondaryType.name.toLowerCase() : attacker.elements.secondaryType.toLowerCase();
    
//     var multiplier = 1;
//     if (type == attackerPrimary) {
//         multiplier += 0.5;
//     }
//     if (type == attackerSecondary) {
//         multiplier += 0.5;
//     }
//     console.log(`STAB: ${multiplier}`);
//     return multiplier;
// }

export function calculateTypeEffectiveness(attacker, defender, secondary = true) {
    // This can be 0 (ineffective); 0.25, 0.5 (not very effective); 1 (normally effective); 2, or 4 (super effective)
    
    /*
    For targets that have multiple types, the type effectiveness of a move is the product of its effectiveness against each of the types:
        - If the type of a move is super effective against both of the opponent's types (such as Dig, a Ground-type move, used against an Aggron, a Steel/Rock Pokémon), then the move does 4 times the damage;
        - If the type of a move is not very effective against both of the opponent's types (such as Wake-Up Slap, a Fighting-type move, used against a Sigilyph, a Psychic/Flying Pokémon), then the move only does ¼ of the damage;
        - If the type of a move is super effective against one of the opponent's types but not very effective against the other (such as Razor Leaf, a Grass-type move, used against a Gyarados, a Water/Flying Pokémon), then the move deals regular damage;
        - If the type of move is completely ineffective against one of the opponent's types, then the move does no damage, even if the opponent has a second type that would be vulnerable to it (as in Thunderbolt, an Electric-type move, used against a Quagsire, a Water/Ground Pokémon).
    */

    let json = tools.getJson("elements");
    let nodes = JSON.parse(json.toString());
    let effectivenessOfAttackByElementMap = new Map();
    nodes.forEach(node => {
        effectivenessOfAttackByElementMap[node.name.toLowerCase()] = node.effectiveness;
    });

    let effectivenessOfAttackerPrimaryMap = effectivenessOfAttackByElementMap[attacker.elementType.toLowerCase()];
    let effectivenessOfAttackerPrimaryOnDefenderPrimary = effectivenessOfAttackerPrimaryMap[defender.elementType];
    if (!secondary) {
        return effectivenessOfAttackerPrimaryOnDefenderPrimary;
    } else {
        let effectivenessOfAttackerSecondaryMap = effectivenessOfAttackByElementMap[attacker.elements.secondaryType.toLowerCase()];
        let defenderSecondaryType = defender.elements.secondaryType;
        let effectivenessOfAttackerSecondaryOnDefenderSecondary = effectivenessOfAttackerSecondaryMap[defenderSecondaryType];
        let effectivenessOfAttackerPrimaryOnDefenderSecondary = effectivenessOfAttackerPrimaryMap[defenderSecondaryType];
        
        let sum = (effectivenessOfAttackerPrimaryOnDefenderPrimary * 4)
        + (effectivenessOfAttackerPrimaryOnDefenderSecondary * 3)
        + (effectivenessOfAttackerSecondaryMap[defender.elementType] * 2)
        + (effectivenessOfAttackerSecondaryOnDefenderSecondary * 1);
    
        let final = sum / 10;
        return final;

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