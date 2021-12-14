const ai = require('./src/ai.js');
const fs = require('fs')
const xalianBuilder = require('./src/xalianBuilder.js');
const translator = require('./src/translator.js');

// module.exports = {
//     main: main
// };

main();

function main() {
    // for (var i = 0; i<50000; i++) {
        let x = xalianBuilder.buildXalian();
        console.log(JSON.stringify(x, null, 2));
        let translated = translator.translateCharacterToPresentableType(x);
        console.log("\n\n" + JSON.stringify(translated, null, 2));
    // }

    ai.giveSummary();
}























