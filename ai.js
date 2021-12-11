const tools = require('./tools.js');
const constants = require('./constants.js');

module.exports = {
    selectSpecies: selectSpecies
};




function characterSpecies(character) {
    tools.selectRandom(tools.getObject("species"));
}

function selectElements(character) {
    tools.selectRandom(tools.getObject("species"));
}

var rarities = [{
    type: "common",
    chance: 0
}, {
    type: "mythics",
    chance: 35
}, {
    type: "legends",
    chance: 20
}, {
    type: "ub",
    chance: 1
}];

function pickStatistical() {
    // Calculate chances for common
    var filler = 100 - rarities.map(r => r.chance).reduce((sum, current) => sum + current);

    if (filler <= 0) {
        console.error("chances sum is higher than 100!");
        return;
    }

    // Create an array of 100 elements, based on the chances field
    var probability = rarities.map((r, i) => Array(r.chance === 0 ? filler : r.chance).fill(i)).reduce((c, v) => c.concat(v), []);

    // Pick one
    var pIndex = Math.floor(Math.random() * 100);
    var rarity = rarities[probability[pIndex]];

    return rarity.type;
}