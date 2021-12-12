const tools = require('./tools.js');
const fs = require('fs')
const axios = require("axios").default;
const statConstants = require('./statConstants.js');
const ratingValueConstants = require('./ratingValueConstants.js');


// fix("elements");
// fix("species");
// fix("move_names");
// fix("qualifiers");

// newSynonyms("move_names");

// filter("file_to_be_filtered");

// combineLists("synonyms", "qualifiers");

// addDefinitions("ordered");

// fixJson("moves");

// filterJson("fixedmove_data");

// buildElementJson("elements");

// getSynonymsAsync("built_elements");

alterJson("species");

function capitalize(str) {
    const lower = (str + '').toLowerCase();
    return (str + '').charAt(0).toUpperCase() + lower.slice(1);
}

function fix(fileName) {
    var list = tools.getProperties(fileName + ".txt");
    var newList = [];
    list.forEach(element => {
        if (!newList.includes(capitalize(element))) {
            newList.push(capitalize(element))
        }
    });
    newList.sort();
    var newTextList = "";
    newList.forEach(element => {
        newTextList = newTextList + element + "\n";
    });
    newTextList = newTextList.substring(0, newTextList.length - 1);
    let data = JSON.stringify(newList, null, 2);
    fs.writeFileSync('json/' + fileName + '.json', data);
    fs.writeFileSync('txt/' + fileName + '.txt', newTextList);
}

function newSynonyms(fileName) {
    var list = tools.getProperties(fileName + ".txt");
    list.forEach(element => {
        synonyms(element);
    });
}

function synonyms(word) {
    var logger = fs.createWriteStream('txt/synonyms.txt', {
        flags: 'a' // 'a' means appending (old data will be preserved)
    });
    var options = {
        method: 'GET',
        url: `https://wordsapiv1.p.rapidapi.com/words/${word}/synonyms`,
        headers: {
            'x-rapidapi-host': 'wordsapiv1.p.rapidapi.com',
            'x-rapidapi-key': 'e2491ca8b6msh2ac61811d62c960p17f530jsn81de2cbaa68d'
        }
    };

    axios.request(options).then(function (response) {
        response.data.synonyms.forEach(x => {
            logger.write(x + '\n');
        });
    }).catch(function (error) {
        console.error(error);
    });
}

function filter(fileName) {
    var list = tools.getProperties(fileName + ".txt");
    var logger = fs.createWriteStream('txt/filtered_' + fileName + '.txt', {
        flags: 'a' // 'a' means appending (old data will be preserved)
    });
    var newList = [];
    list.forEach(x => {
        if (!x.includes("-") && !x.includes(" ") && !newList.includes(capitalize(x))) {
            newList.push(capitalize(x));
        }
    });
    newList.sort();
    newList.forEach(x => {
        logger.write(x + '\n');
    });
}

function combineLists(fileName, destination) {
    var origin = tools.getProperties(fileName + ".txt");
    var dest = tools.getProperties(fileName + ".txt");

    var logger = fs.createWriteStream('result.txt');


    var newList = [];

    origin.forEach(x => {
        if (!newList.includes(capitalize(x))) {
            newList.push(capitalize(x));
        }
    });

    dest.forEach(x => {
        if (!newList.includes(capitalize(x))) {
            newList.push(capitalize(x));
        }
    });

    newList.sort();

    newList.forEach(x => {
        logger.write(x + '\n');
    });
}

function getSynonymsAsync(fileName) {
    const data = fs.readFileSync("json/" + fileName + ".json", 'utf8');
    var nodes = JSON.parse(data.toString());
    var output = [];
    nodes.forEach(node => {

        var options = {
            method: 'GET',
            url: `https://wordsapiv1.p.rapidapi.com/words/${node.name}/synonyms`,
            headers: {
                'x-rapidapi-host': 'wordsapiv1.p.rapidapi.com',
                'x-rapidapi-key': 'e2491ca8b6msh2ac61811d62c960p17f530jsn81de2cbaa68d'
            }
        };
        axios.request(options).then(function (response) {
            let list = response.data.synonyms;
            var newNode = {
                "name": node.name,
                "synonyms": list
            }
            output.push(newNode);
        }).catch(function (error) {
            console.error(error);
        });
    });

    setTimeout(function() {
        console.log('done waiting');

        let data = JSON.stringify(output, null, 2);
        // console.log(`data:\n${data}`);
        fs.writeFileSync('json/populated_' + fileName + '.json', data);
        // let allData = JSON.stringify(allOutput, null, 2);
        // console.log(`all data:\n${allData}`);
        // fs.writeFileSync('json/' + 'all_move_data' + '.json', allData);
    }, 15000);
}

// function addDefinitions(fileName) {
//     var allOutput = [];
//     var output = [];
//     console.log(`filename: ${fileName}`);
//     var list = tools.getProperties(fileName + ".txt");
//     list.sort();
//     list.forEach(word => {

//         var options = {
//             method: 'GET',
//             url: 'https://wordsapiv1.p.rapidapi.com/words/' + word,
//             headers: {
//                 'x-rapidapi-host': 'wordsapiv1.p.rapidapi.com',
//                 'x-rapidapi-key': 'e2491ca8b6msh2ac61811d62c960p17f530jsn81de2cbaa68d'
//             }
//         };
//         let calling = true;
//         axios.request(options).then(function (response) {
//             // console.log(JSON.stringify(response.data, null, 2));
//             allOutput.push(response.data);
//             var definitions = [];
//             response.data.results.forEach(x => {
//                 if (x.partOfSpeech == "noun") {
//                     definitions.push(x.definition);
//                 }
//             });
//             var node = {
//                 "word": word,
//                 "definitions": definitions
//             }
//             // console.log(`pushing node:\n${JSON.stringify(node, null, 2)}`);
//             output.push(node);
//         }).catch(function (error) {
//             console.error(error);
//         }).finally(function () {
//             calling = false;
//         });
//     });

//     setTimeout(function() {
//         console.log('done waiting');

//         let data = JSON.stringify(output, null, 2);
//         // console.log(`data:\n${data}`);
//         fs.writeFileSync('json/' + 'move_data' + '.json', data);
//         let allData = JSON.stringify(allOutput, null, 2);
//         // console.log(`all data:\n${allData}`);
//         fs.writeFileSync('json/' + 'all_move_data' + '.json', allData);
//     }, 120000);
// }

function alterJson(fileName) {
    const data = fs.readFileSync("json/" + fileName + ".json", 'utf8');
    var nodes = JSON.parse(data.toString());


    var newNodes = [];

    const stats = new Map();

    stats[statConstants.STANDARD_ATTACK_RATING] = ratingValueConstants.UNSET;
    stats[statConstants.SPECIAL_ATTACK_RATING] = ratingValueConstants.UNSET;
    stats[statConstants.STANDARD_DEFENSE_RATING] = ratingValueConstants.UNSET;
    stats[statConstants.SPECIAL_DEFENSE_RATING] = ratingValueConstants.UNSET;
    stats[statConstants.SPEED_RATING] = ratingValueConstants.UNSET;
    stats[statConstants.EVASION_RATING] = ratingValueConstants.UNSET;
    stats[statConstants.HEALTH_RATING] = ratingValueConstants.UNSET;
    stats[statConstants.STAMINA_RATING] = ratingValueConstants.UNSET;
    stats[statConstants.RECOVERY_RATING] = ratingValueConstants.UNSET;

    nodes.forEach(x => {
            let newNode = {
                "name": x.name,
                "origin": null,
                "description": null,
                "statRatings": stats
            }
            newNodes.push(newNode);
    });

    fs.writeFileSync("json/altered_" + fileName + ".json", JSON.stringify(newNodes, null, 2));
}

function fixJson(fileName) {
    const data = fs.readFileSync("json/" + fileName + ".json", 'utf8');
    var nodes = JSON.parse(data.toString());

    // nodes.sort(function (x, y) {
    //     if (x.word < y.word) {
    //         return -1;
    //     }
    //     if (x.word > y.word) {
    //         return 1;
    //     }
    //     return 0;
    // });

    var newNodes = [];

    nodes.forEach(x => {
        let def = x.definitions[0];
        let newNode = {
            "name": x.word,
            "definition": def,
            "effectRating": x.effectRating
        }
        newNodes.push(newNode);
    });

    fs.writeFileSync("json/redone_" + fileName + ".json", JSON.stringify(newNodes, null, 2));
}

function sortJson(fileName) {

    const data = fs.readFileSync("json/" + fileName + ".json", 'utf8');
    var nodes = JSON.parse(data.toString());

    nodes.sort(function (x, y) {
        if (x.word < y.word) {
            return -1;
        }
        if (x.word > y.word) {
            return 1;
        }
        return 0;
    });

    var newNodes = [];

    nodes.forEach(x => {
        let newNode = {
            "word": x.word,
            "definitions": x.definitions,
            "effectRating": 5
        }
        newNodes.push(newNode);
    });

    fs.writeFileSync("json/new" + fileName + ".json", JSON.stringify(newNodes, null, 2));
}

function buildElementJson(fileName) {
    var elementNames = tools.getProperties(fileName + ".txt");


    var newNodes = [];

    elementNames.forEach(x => {
        let newNode = {
            "name": x,
            "synonyms": []
        }
        newNodes.push(newNode);
    });

    fs.writeFileSync("json/built_" + fileName + ".json", JSON.stringify(newNodes, null, 2));
}