const fs = require('fs')
const constants = require('./constants/constants.js');
const tools = require('./tools.js');
var Move = require('./model/move.js');

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
    console.log(JSON.stringify(character, null, 2));
    if (hasElement) {
        let selectedType = selectRandomElementTypeFromCharacter(character.elements);
        m.type = selectedType;
        m.element = tools.capitalize(tools.selectRandom(selectedType.moveTypes));
    }
    let qualifier = tools.selectRandom(moveQualifiers);
    m.qualifier = qualifier;
    let baseMove = tools.selectRandom(moves);
    m.baseMove = baseMove;
    var description = "";
    if (hasElement) {
        // let synonyms = m.element.moveTypes;
        // let selected = tools.selectRandom(synonyms);
        // let elementSynonym = tools.capitalize(selected);
        m.name = qualifier.name + " " + m.element + " " + baseMove.name;
        description += `${m.type.name}-typed ${m.qualifier.definition}${m.baseMove.sentencePrefix} ${m.baseMove.definition}`;
    } else {
        description += `${tools.capitalize(m.qualifier.definition)}${m.baseMove.sentencePrefix} ${m.baseMove.definition}`;
        m.name = qualifier.name + " " + baseMove.name;
    }
    m.description = description;
    m.potential = parseInt(m.baseMove.effectRating) + parseInt(m.qualifier.effectRating); 
    return m;
}

function selectRandomElementTypeFromCharacter(characterElementsNode) {
    if (tools.randomBool()) {
        return characterElementsNode.primaryType;
    } else {
        return characterElementsNode.secondaryType;
    }
}

