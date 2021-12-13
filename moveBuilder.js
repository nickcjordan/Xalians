const fs = require('fs')
const constants = require('./constants.js');
const tools = require('./tools.js');
var Move = require('./move.js');

module.exports = {
    getMove: getMove
};

var moveQualifiers = tools.getObject("qualifiers");
var moves = tools.getObject("moves");

function getMove(character) {
    moves = tools.shuffle(moves);
    moveQualifiers = tools.shuffle(moveQualifiers);
    let m = new Move();
    let hasElement = tools.randomBool();
    if (hasElement) {
        // let element = tools.capitalize(tools.selectFromList(1, character.elements));
        m.element = tools.selectRandom(character.elements);
    }
    let qualifier = tools.selectRandom(moveQualifiers);
    m.qualifier = qualifier;
    let baseMove = tools.selectRandom(moves);
    m.baseMove = baseMove;
    var description = "";
    if (hasElement) {
        let elementSynonym = tools.capitalize(tools.selectRandom(m.element.synonyms));
        m.name = qualifier.name + " " + elementSynonym + " " + baseMove.name;
        description += `${m.element.name}-typed ${m.qualifier.definition}${m.baseMove.sentencePrefix} ${m.baseMove.definition}`;
    } else {
        description += `${tools.capitalize(m.qualifier.definition)}${m.baseMove.sentencePrefix} ${m.baseMove.definition}`;
        m.name = qualifier.name + " " + baseMove.name;
    }
    m.description = description;
    return m;
}

