var Xalian = require('./model/character.js');
const { v4: uuidv4 } = require('uuid');
const moveBuilder = require('./moveBuilder.js');
const ai = require('./ai.js');
const fs = require('fs')
const translator = require('./translator.js');

module.exports = {
    buildXalian: buildXalian
};


function buildXalian() {
    let x = new Xalian();
    x.createTimestamp = Date.now();
    x.species = ai.selectSpecies(x);
    x.xalianId = generateXalianId(x.species.id);
    x.speciesId = x.species.id;
    x.elements = ai.selectElements(x);
    x = ai.populateStats(x);
    x.species.generation = "0";

    x.moves.push(moveBuilder.getMove(x));
    x.moves.push(moveBuilder.getMove(x));
    x.moves.push(moveBuilder.getMove(x));
    x.moves.push(moveBuilder.getMove(x));

    // if (parseInt(x.meta.totalStatPoints) > 4600) {
        // console.log(`\n${JSON.stringify(x, null, 2)}`);
    // }
    return x;
    // let xalian = translator.translateCharacterToPresentableType(x);
    // let json = JSON.stringify(translated, null, 2);
    // console.log(`json:\n\n${json}\n`);
    // return json;
    // return xalian;
    // fs.writeFileSync("json/current_xalian.json", json);
}

function generateXalianId(speciesId) {
    return speciesId + '-' + uuidv4();
}