const constants = require('./constants/constants.js');
const tools = require('./tools.js');
var Xalian = require('./model/character.js');

module.exports = {
    translateCharacterToPresentableType: translateCharacterToPresentableType
};

function translateCharacterToPresentableType(xalian) {
    let conditionedMoves = makeMovesPresentable(xalian);
    let cleanedElements = makeElementsPresentable(xalian.elements);
    return {
        "species": {
          "name": xalian.species.name,
          "origin": xalian.origin,
          "description": xalian.species.description,
        },
        "elements": makeElementsPresentable(xalian.elements),
        "healthPoints": xalian.healthPoints,
        "stats": xalian.stats,
        "moves": conditionedMoves,
        "meta": xalian.meta
      };
}

function makeElementsPresentable(e) {
    return {
        "primaryType": tools.capitalize(e.primaryType.name),
        "primaryElement": tools.capitalize(e.primaryElement),
        "secondaryType": tools.capitalize(e.secondaryType.name),
        "secondaryElement": tools.capitalize(e.secondaryElement)
    }
}

function makeMovesPresentable(xalian) {
    var fixedMoves = [];
    for (var ind in xalian.moves) {
        let move = xalian.moves[ind];
        var fixedMove = fixMove(move);
        fixedMoves.push(fixedMove);
    }
    return fixedMoves;
}

function fixMove(move) {
    var moveType = move.type;
    var totalMoveRating = parseInt(move.baseMove.effectRating) + parseInt(move.qualifier.effectRating); 
    if (moveType) {
        return {
            "name": move.name,
            "description": move.description,
            "type": move.type.name,
            "element": move.element,
            "rating": totalMoveRating,
            "cost": move.cost
        };
    } else {
        return {
            "name": move.name,
            "description": move.description,
            "rating": totalMoveRating,
            "cost": move.cost
        };
    }
   
}