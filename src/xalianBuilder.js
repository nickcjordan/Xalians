var Xalian = require('./model/character.js');

const moveBuilder = require('./moveBuilder.js');
const ai = require('./ai.js');
const fs = require('fs')
const translator = require('./translator.js');

module.exports = {
    buildXalian: buildXalian
};


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
    // let json = JSON.stringify(translated, null, 2);
    // console.log(`json:\n\n${json}\n`);
    // return json;
    return translated;
    // fs.writeFileSync("json/current_xalian.json", json);
}