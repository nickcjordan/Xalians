var Xalian = require('./character.js');
var Move = require('./move.js');

const tools = require('./tools.js');
const constants = require('./constants.js');
const moveBuilder = require('./moveBuilder.js');
const ai = require('./ai.js');
const fs = require('fs')
const translator = require('./translator.js');

// module.exports = {
//     main: main
// };

main();

function main() {
    // for (var i = 0; i<50000; i++) {
        buildXalian();
    // }

    ai.giveSummary();
}


function buildXalian() {
    let x = new Xalian();

    x.species = ai.selectSpecies(x);
    x.elements = ai.selectElements(x);
    x = ai.populateStats(x);

    x.moves.push(moveBuilder.getMove(x));
    x.moves.push(moveBuilder.getMove(x));
    x.moves.push(moveBuilder.getMove(x));
    x.moves.push(moveBuilder.getMove(x));

    // if (parseInt(x.meta.totalStatPoints) > 4600) {
    //     console.log(`\n${JSON.stringify(x, null, 2)}`);
    // }
    let translated = translator.translateCharacterToPresentableType(x);
    let json = JSON.stringify(translated, null, 2);
    console.log(`json:\n\n${json}\n`);
    return json;
    // fs.writeFileSync("json/current_xalian.json", json);
}





















