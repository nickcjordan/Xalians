const fs = require('fs')
const constants = require('../../constants/constants.js');
const attackConstants = require('../../constants/attackCalculationConstants.js');
const tools = require('../../tools.js');
// var Move = require('../model/move.js');
const mockMove = require('../../json/mock/mockMove.json'); 
const translator = require('../../utils/valueTranslator.js');
const duelUtil = require('../../utils/duelUtil.js');
var PF = require('pathfinding');

export function buildPath(startIndex, startCoord, endIndex, endCoord, path) {
    return {
        startIndex: startIndex, 
        startCoord: startCoord, 
        endIndex: endIndex, 
        endCoord: endCoord, 
        path: path
    };
}

export function buildGrid(totalSquares) {
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
    let totalSquares = G.cells.length;
    let boardSize = Math.sqrt(totalSquares);

    let grid = buildGrid(G.cells.length);
    let rows = grid.rows;
    let map = grid.map;
    
    let movableIndices = [];
    
    let coord = map[parseInt(currentIndex)];
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


// export function calculateMovableIndices(currentIndex, xalian, G, ctx) {
//     let distance = Math.round(Math.sqrt(parseInt(xalian.stats.speed)));
//     return module.exports.calculateIndicesWithinDistance(currentIndex, distance, G, ctx);
// }

export function calculatePathToTarget(currentIndex, endIndex, G, ctx) {
    let size = Math.sqrt(G.cells.length);
    var grid = new PF.Grid(size, size);

    let boardGrid = buildGrid(G.cells.length);


    var finder = new PF.AStarFinder();
    var currentCoord = boardGrid.map[currentIndex];
    var gridBackup = grid.clone();
    var endCoord = boardGrid.map[endIndex];
    var path = finder.findPath(currentCoord[0], currentCoord[1], endCoord[0], endCoord[1], gridBackup);
    return {
        startIndex: currentIndex,
        startCoord: currentCoord,
        endIndex: endIndex,
        endCoord: endCoord,
        path: path
    }
}

export function calculateAllValidPaths(G, ctx, currentIndex, distance) {
    return calculateValidPaths(G, ctx, currentIndex, distance, true, true);
}

export function calculateValidEnemyTargetPaths(G, ctx, currentIndex, distance) {
    return calculateValidPaths(G, ctx, currentIndex, distance, true, false);
}

export function calculateValidUnoccupiedPaths(G, ctx, currentIndex, distance, isBot = false) {
    return calculateValidPaths(G, ctx, currentIndex, distance, false, true, isBot);
}

function calculateValidPaths(G, ctx, currentIndex, distance, findOccupied, findUnoccupied, isBot = false) {
    // let distance = Math.round(Math.sqrt(parseInt(xalian.stats.speed)));
    
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

    if (!findUnoccupied) {
        unoccupied.forEach( i => {
            let coord = boardGrid.map[i];
            grid.setWalkableAt(coord[0], coord[1], false);
        })
    }

    var finder = new PF.AStarFinder();
    var currentCoord = boardGrid.map[currentIndex];
    var valid = [];
    selectedPaths.forEach( i => {
        let defenderId = G.cells[i];
        let attackerId = G.cells[currentIndex];
        if (!defenderId || (defenderId && !duelUtil.xaliansAreOnSameTeam(defenderId, attackerId, G))) {
            var gridBackup = grid.clone();
            var endCoord = boardGrid.map[i];
            // var path = finder.findPath(currentCoord[0], currentCoord[1], endCoord[0], endCoord[1], gridBackup);
            var path = calculatePathToTarget(currentIndex, i, G, ctx);
            if (path && path.path.length > 0 && (path.path.length - 1) <= distance) {
                valid.push(buildPath(currentIndex, currentCoord, i, endCoord, path.path));
            } else {
                console.error("INVALID ATTACK PATH?");
            }
        }
    })

    if (findUnoccupied && valid.length == 0) {
        console.error("NO VALID PATHS");
        if (isBot) {
            console.error("NO VALID PATHS for BOT");
        }
    }

    return valid;
}

export function calculateMovableIndices(currentIndex, xalian, G, ctx) {
    let valid = calculateMovablePaths(currentIndex, xalian, G, ctx);
    return valid.map( path => path.endIndex );
}

export function calculateMovablePaths(currentIndex, xalian, G, ctx, isBot = false) {
    let distance = G.currentTurnState.hasMoved ? G.currentTurnState.remainingSpacesToMove : xalian.stats.distance;
    return calculateValidUnoccupiedPaths(G, ctx, currentIndex, distance, isBot);
}

export function calculateAttackablePaths(currentIndex, xalian, G, ctx) {
    // let range = translator.duelStatRangeToVal(xalian.traits.attackRange);
    let range = xalian.stats.range;
    let paths = calculateValidEnemyTargetPaths(G, ctx, currentIndex, range);
    let attackablePaths = [];
    paths.forEach( path => {
        if (G.cells[path.endIndex]) {
            let defenderId = G.cells[path.endIndex];
            if (!duelUtil.xaliansAreOnSameTeam(xalian.xalianId, defenderId, G, ctx)) {
                attackablePaths.push(path);
            }
        }
    });
    return attackablePaths;
}

// export function calculateAttackResult(move, attacker, defender, matchState) => {
export function calculateAttackResult(attacker, defender, G, ctx, simulate = false) {
    let base = calculateBaseValue(attacker, defender);
    let targets = calculateMultipleTargetsValue(attacker);
    let weather = calculatePlanetEffectValue(attacker, G);
    let badge = calculateUserExperienceValue(attacker);
    let critical = calculateCriticalValue();
    let random = simulate ? 1 : calculateRandom();
    // let sameTypeBonus = calculateSameTypeAttackBonus(move, attacker);
    let sameTypeBonus = 1;
    let typeEffectiveness = calculateTypeEffectiveness(attacker, defender);
    let hinderingStatus = calculateHindranceEffect(attacker);
    let other = calculateRemainingFactors(attacker, defender, G, ctx);
    let result = base * targets * weather * badge * critical * random * sameTypeBonus * typeEffectiveness * hinderingStatus * other;
    let final = Math.floor(result * 10)/10;
    // console.log(`base=${base}, random=${random}, sameTypeBonus=${sameTypeBonus}, final=${final}`);
    
    // return defender.stats.health;
    return final * 2;
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
//     let attackerPrimary = attacker.elements.primaryType && attacker.elements.primaryType.name ? attacker.elements.primaryType.name.toLowerCase() : attacker.elements.primaryType.toLowerCase();
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

function calculateTypeEffectiveness(attacker, defender) {
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

    var base = 1;

    
    // let type = move.type && move.type.name ? move.type.name.toLowerCase() : move.type.toLowerCase();
    
    let attackerPrimaryType = attacker.elements.primaryType;
    let attackerSecondaryType = attacker.elements.secondaryType;

    let defenderPrimaryType = defender.elements.primaryType;
    let defenderSecondaryType = defender.elements.secondaryType;

    let effectivenessOfAttackerPrimaryMap = effectivenessOfAttackByElementMap[attackerPrimaryType.toLowerCase()];
    let effectivenessOfAttackerSecondaryMap = effectivenessOfAttackByElementMap[attackerSecondaryType.toLowerCase()];

    let effectivenessOfAttackerPrimaryOnDefenderPrimary = effectivenessOfAttackerPrimaryMap[defenderPrimaryType];
    let effectivenessOfAttackerPrimaryOnDefenderSecondary = effectivenessOfAttackerPrimaryMap[defenderSecondaryType];

    let effectivenessOfAttackerSecondaryOnDefenderPrimary = effectivenessOfAttackerSecondaryMap[defenderPrimaryType];
    let effectivenessOfAttackerSecondaryOnDefenderSecondary = effectivenessOfAttackerSecondaryMap[defenderSecondaryType];

    let sum = (effectivenessOfAttackerPrimaryOnDefenderPrimary * 4)
    + (effectivenessOfAttackerPrimaryOnDefenderSecondary * 3)
    + (effectivenessOfAttackerSecondaryOnDefenderPrimary * 2)
    + (effectivenessOfAttackerSecondaryOnDefenderSecondary * 1);

    let final = sum / 10;

    // let attackerPrimary = attacker.elements.primaryType && attacker.elements.primaryType.name ? attacker.elements.primaryType.name.toLowerCase() : attacker.elements.primaryType.toLowerCase();
    // let attackerSecondary = attacker.elements.secondaryType && attacker.elements.secondaryType.name ? attacker.elements.secondaryType.name.toLowerCase() : attacker.elements.secondaryType.toLowerCase();
   
    // let defenderPrimary = defender.elements.primaryType && defender.elements.primaryType.name ? defender.elements.primaryType.name.toLowerCase() : defender.elements.primaryType.toLowerCase();
    // let defenderSecondary = defender.elements.secondaryType && defender.elements.secondaryType.name ? defender.elements.secondaryType.name.toLowerCase() : defender.elements.secondaryType.toLowerCase();

    // base *= map[attackerPrimary][defenderPrimary];
    // base *= map[attackerSecondary][defenderSecondary];

    // console.log(`type effectiveness = ${final}`);

    return final;
}

function calculateHindranceEffect(attacker) {
    // this is meant to reduce the effectiveness if the attacker is hindered by a status effect such as burned
    return 1;
}

function calculateRemainingFactors(attacker, defender, G, ctx) {
    // anything in the future that we want to use to effect the outcome of the result
    return 1;
}