const ai = require('./lambda/src/ai.js');
const fs = require('fs')
const xalianBuilder = require('./lambda/src/xalianBuilder.js');
const translator = require('./lambda/src/translator.js');
const attackCalculator = require('./lambda/src/gameplay/attackCalculator.js');

// module.exports = {
//     main: main
// };

main();

function main() {
    // printXalian();

    simulateAttacks();
}

// var AWS = require("aws-sdk");

// AWS.config.getCredentials(function(err) {
//   if (err) console.log(err.stack);
//   // credentials not loaded
//   else {
//     console.log("Access key:", JSON.stringify(AWS.config.credentials));
//   }
// });

function printXalian() {

        let x = xalianBuilder.buildXalian();
        let translated = translator.translateCharacterToPresentableType(x);


    console.log(JSON.stringify(translated, null, 2));
}

function runSet() {

    var max = 0;
    var maxChar = null;
    var maxCharTranslated = null;
    
    var maxPotential = 0;
    var maxCharPotential = null;
    var maxCharTranslatedPotential = null;

    var min = 5000;
    var minChar = null;
    var minCharTranslated = null;

    let xalians = [];


    for (var i = 0; i<10000; i++) {
        let x = xalianBuilder.buildXalian();
        let translated = translator.translateCharacterToPresentableType(x);
        xalians.push(x);
        if (x.meta.statScore > max) {
            max = x.meta.statScore;
            maxChar = x;
            maxCharTranslated = translated;
        } else if (x.meta.statScore < min) {
            min = x.meta.statScore;
            minChar = x;
            minCharTranslated = translated;
        }

        if (x.meta.potentialStatScore > maxPotential) {
            maxPotential = x.meta.potentialStatScore;
            maxCharPotential = x;
            maxCharTranslatedPotential = translated;
        }
    }





    console.log('LOSER:\n\n' + JSON.stringify(minCharTranslated, null, 2));
    console.log('\n\nWINNER:\n\n' + JSON.stringify(maxCharTranslated, null, 2));
    console.log('\n\nWINNER POTENTIAL:\n\n' + JSON.stringify(maxCharTranslatedPotential, null, 2));
    // console.log("\n\n\traw:\n\n" + JSON.stringify(x, null, 2) + "\n\n\n\ttranslated:\n\n" + JSON.stringify(translated, null, 2));
    // console.log(JSON.stringify(translated, null, 2));
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



















