const ai = require('./src/ai.js');
const fs = require('fs')
const xalianBuilder = require('./src/xalianBuilder.js');
const translator = require('./src/translator.js');
const attackCalculator = require('./src/gameplay/attackCalculator.js');

// module.exports = {
//     main: main
// };

main();

function main() {
    printXalian();
}

function printXalian() {
    let x = xalianBuilder.buildXalian();
    let translated = translator.translateCharacterToPresentableType(x);
    console.log("\n\n\traw:\n\n" + JSON.stringify(x, null, 2) + "\n\n\n\ttranslated:\n\n" + JSON.stringify(translated, null, 2));
}

function runSummary() {
    for (var i = 0; i < 30000; i++) {
        let x = xalianBuilder.buildXalian();
    }
    ai.giveSummary();
}

function simulateAttacks() {
    let attacker = xalianBuilder.buildXalian();
    let defender = xalianBuilder.buildXalian();
    console.log("attacker\n");
    logTranslated(attacker);
    console.log("defender\n");
    logTranslated(defender);


    for (var i = 0; i < 4; i++) {
        let move = attacker.moves[i];
        logMove(move, attacker, defender);
    }
}

function logTranslated(x) {
    let translated = translator.translateCharacterToPresentableType(x);
    console.log("\n\n" + JSON.stringify(translated, null, 2));
}



function logMove(move, attacker, defender) {
    let result = attackCalculator.calculateAttackResult(move, attacker, defender, null);
    let elementName = move.type ? move.type.name : "none";
    // console.log(`move: ${JSON.stringify(move, null, 2)}`);
    console.log(`${move.name} (${elementName}) [${move.potential}] ==> ${result}\n`);
}



















