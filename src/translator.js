const constants = require('./constants/constants.js');
const tools = require('./tools.js');
var Xalian = require('./model/character.js');

module.exports = {
    translateCharacterToPresentableType: translateCharacterToPresentableType
};

function translateCharacterToPresentableType(xalian) {
    let conditionedMoves = makeMovesPresentable(xalian);
    return {
        "species": {
          "name": xalian.species.name,
          "origin": xalian.origin,
          "description": xalian.species.description,
        },
        "elements": xalian.elements.map(x => x.name),
        "healthPoints": xalian.healthPoints,
        "stats": xalian.stats,
        "moves": conditionedMoves,
        "meta": xalian.meta
      };
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
    var totalMoveRating = parseInt(move.baseMove.effectRating) + parseInt(move.qualifier.effectRating); 
    var elementName = move.element != null ? move.element.name : "none";
    return {
        "name": move.name,
        "description": move.description,
        "element": elementName,
        "rating": totalMoveRating,
        "cost": move.cost
    };
}