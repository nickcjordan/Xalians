var Xalian = require('./character.js');
var Move = require('./move.js');

const tools = require('./tools.js');
const constants = require('./constants.js');
const moveBuilder = require('./moveBuilder.js');
const ai = require('./ai.js');


for (var i = 0; i<1000; i++) {
    main();
}

ai.giveSummary();

function main() {
    let x = new Xalian();

    x.species = ai.selectSpecies(x);
    x.elements = ai.selectElements(x);
    x = ai.populateStats(x);

    x.moves.push(moveBuilder.getMove(x));
    x.moves.push(moveBuilder.getMove(x));
    x.moves.push(moveBuilder.getMove(x));
    x.moves.push(moveBuilder.getMove(x));

    // console.log(`\n${JSON.stringify(x, null, 2)}`);
}





















