const ai = require('./src/ai.js');
const fs = require('fs')
const xalianBuilder = require('./src/xalianBuilder.js');

// module.exports = {
//     main: main
// };

main();

function main() {
    // for (var i = 0; i<50000; i++) {
        xalianBuilder.buildXalian();
    // }

    ai.giveSummary();
}























