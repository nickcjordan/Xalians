const fs = require('fs')
const constants = require('../constants/constants.js');
const attackConstants = require('../constants/attackCalculationConstants.js');
const tools = require('../tools.js');
var Move = require('../model/move.js');

module.exports = {
    calculateAttackResult: calculateAttackResult
};

function calculateAttackResult(move, attacker, defender, matchState) {
    let base = calculateBaseValue(move, attacker, defender);
    let targets = calculateTargetsValue(move);
    let weather = calculateWeatherValue(move, matchState);
    let badge = calculateBadgeValue(attacker);
    let critical = calculateCriticalValue();
    let random = calculateRandom();
    let sameTypeBonus = calculateSameTypeAttackBonus(move, attacker);
    let typeEffectiveness = calculateTypeEffectiveness(move, defender);
    let hinderingStatus = calculateHindranceEffect(attacker);
    let other = calculateRemainingFactors(move, attacker, defender, matchState);
    let result = base * targets * weather * badge * critical * random * sameTypeBonus * typeEffectiveness * hinderingStatus * other;
    let final = Math.floor(result * 100);
    console.log(`base=${base}, random=${random}, sameTypeBonus=${sameTypeBonus}, final=${final}`);
    return final;
}

function calculateBaseValue(move, attacker, defender) {
    try {
        let k = calculateLevelK(attacker);
        let power = move.potential;
        let a_d = calculateEffectiveAttackAndDefense(move, attacker, defender);
        let baseTop = k * power * a_d;
        let baseResult = (baseTop / attackConstants.BASE_BOTTOM_VAR) + 2;
        console.log(`level=${k}, a_d=${a_d}, baseTop=${baseTop}, baseResult=${baseResult}`);
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

function calculateEffectiveAttackAndDefense(move, attacker, defender) {
    try {
        if (isSpecialTypedMove(move)) {
            let val = (attacker.stats.specialAttackPoints.points / defender.stats.specialDefensePoints.points);
            return val;
        } else {
            let val = (attacker.stats.standardAttackPoints.points / defender.stats.standardDefensePoints.points);
            return val;
        }
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

function calculateTargetsValue(move) {
    // add functionality here for if we want to allow moves that hit more than one defender
    // Targets is 0.75 if the move has more than one target and 1 otherwise
    return 1;
}

function calculateWeatherValue(move, matchState) {
    // add functionality here for if we want to allow moves that hit more than one defender
    // Weather is 1.5 if a Water-type move is being used during rain or a Fire-type move during harsh sunlight,
    // and 0.5 if a Water-type move is used during harsh sunlight or a Fire-type move during rain, and 1 otherwise.
    return 1;
}

function calculateBadgeValue(attacker) {
    // could be used to give a boost to attacks from xalians that are minted versus starter packs
    // Badge is 1.25 if the player has obtained the Badge corresponding to the used move's type, and 1 otherwise.
    return 1;
}

function calculateCriticalValue() {
    // free to implement this however
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
    // 1.5 if the move's type matches any of the user's types, and 1 if otherwise.
    if (!move.type) {
        return 1;
    }
    
    var multiplier = 1;
    if (move.type && move.type.name.toLowerCase() == attacker.elements.primaryType.name.toLowerCase()) {
        multiplier += 0.5;
    }
    if (move.type && move.type.name.toLowerCase() == attacker.elements.secondaryType.name.toLowerCase()) {
        multiplier += 0.5;
    }
    console.log(`STAB: ${multiplier}`);
    return multiplier;
}

function calculateTypeEffectiveness(move, defender) {
    // This can be 0 (ineffective); 0.25, 0.5 (not very effective); 1 (normally effective); 2, or 4 (super effective)
    
    /*
    For targets that have multiple types, the type effectiveness of a move is the product of its effectiveness against each of the types:
        - If the type of a move is super effective against both of the opponent's types (such as Dig, a Ground-type move, used against an Aggron, a Steel/Rock Pokémon), then the move does 4 times the damage;
        - If the type of a move is not very effective against both of the opponent's types (such as Wake-Up Slap, a Fighting-type move, used against a Sigilyph, a Psychic/Flying Pokémon), then the move only does ¼ of the damage;
        - If the type of a move is super effective against one of the opponent's types but not very effective against the other (such as Razor Leaf, a Grass-type move, used against a Gyarados, a Water/Flying Pokémon), then the move deals regular damage;
        - If the type of move is completely ineffective against one of the opponent's types, then the move does no damage, even if the opponent has a second type that would be vulnerable to it (as in Thunderbolt, an Electric-type move, used against a Quagsire, a Water/Ground Pokémon).
    */


    if (!move.element) {
        return 1;
    }

    let json = tools.getJson("elements");
    let nodes = JSON.parse(json.toString());
    let map = new Map();
    nodes.forEach(node => {
        map[node.name] = node.effectiveness;
    });

    var base = 1;

    let effectivenessMap = map[move.type.name];
    base *= effectivenessMap[defender.elements.primaryType.name];
    base *= effectivenessMap[defender.elements.secondaryType.name];

    console.log(`type effectiveness = ${base}`);

    return base;
}

function calculateHindranceEffect(attacker) {
    // this is meant to reduce the effectiveness if the attacker is hindered by a status effect such as burned
    return 1;
}

function calculateRemainingFactors(move, attacker, defender, matchState) {
    // anything in the future that we want to use to effect the outcome of the result
    return 1;
}