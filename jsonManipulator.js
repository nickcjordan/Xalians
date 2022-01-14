const ai = require('./src/ai.js');
const fs = require('fs')
const xalianBuilder = require('./src/xalianBuilder.js');
const translator = require('./src/translator.js');
const attackCalculator = require('./src/gameplay/attackCalculator.js');
const csv = require('csv-parser');
const tools = require('./src/tools.js');


addPropertyToEachSpecies();

function addPropertyToEachSpecies() {
    let fileName = "species";
    var existingSpecies = JSON.parse(fs.readFileSync("src/json/" + fileName + ".json", 'utf8').toString());
    var output = [];
    existingSpecies.forEach(node => {
        // *****  ADD NODE MANIPULATION HERE *****

        // node.temperament = "";

        // ***************************************
        output.push(node);
    });
    let dataOut = JSON.stringify(output, null, 2);
    console.log(`data:\n${dataOut}`);
    fs.writeFileSync('src/json/new_' + fileName + '.json', dataOut);
}


// function addNewMoves() {
//     var map = new Map();
//     let fileName = "moves";
  
//     const data = fs.readFileSync("src/json/" + fileName + ".json", 'utf8');
//     var existingMoves = JSON.parse(data.toString());
    
//     let existingMoveMap = new Map();
    
    
//     existingMoves.forEach(node => {
//         existingMoveMap[node.name] = node;
//     });
    
//     var output = [];
//     let newMoves = tools.getProperties("newMoves");
//     newMoves.forEach(name => {
//         if (name != "") {
//             let cleaned = tools.capitalize(name.replace("\r", ""));
//             if (existingMoveMap[cleaned]) {
//             } else {
//                 var newMove = {
//                     "name": cleaned,
//                     "definition": "",
//                     "effectRating": 0,
//                     "effect": "",
//                     "sentencePrefix": "",
//                     "category": "status"
//                 };
//                 output.push(newMove);
//             }
//         }
//     });


//     let dataOut = JSON.stringify(output, null, 2);
//     console.log(`data:\n${dataOut}`);

//     fs.writeFileSync('src/json/new_' + fileName + '.json', dataOut);
// }