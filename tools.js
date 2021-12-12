const fs = require('fs')
const constants = require('./constants.js');

module.exports = {
    getProperties: getProperties,
    random: random,
    randomStat: randomStat,
    selectFromList: selectFromList,
    selectRandomSublist: selectRandomSublist,
    selectRandom: selectRandom,
    randomBool: randomBool,
    randomThreshold: randomThreshold,
    getJson: getJson,
    getObject: getObject,
    capitalize: capitalize,
    shuffle: shuffle
};


function getProperties(fileName) {
    if (fileName.includes('json')) {
        fileName = "json/" + fileName;
    } else if (fileName.includes('txt')) {
        fileName = "txt/" + fileName;
    }
    try {
        const data = fs.readFileSync(fileName, 'utf8');
        if (data.includes(",")) {
            return data.toString().split(",");
        } else {
            return data.toString().split("\n");
        }
    } catch (err) {
        console.error(err);
    }
}

function getObject(fileName) {
    return JSON.parse(getJson(fileName));
}

function getJson(fileName) {
    fileName = "json/" + fileName + ".json";
    try {
        const data = fs.readFileSync(fileName, 'utf8');
        return data.toString()
    } catch (err) {
        console.error(err);
    }
}




// FUNCTIONS TO GENERATE RANDOM NUMBERS AND SELECT RANDOM FROM LIST

function random(min, max) {
    var diff = (max + 1) - min;
    return min + randomStat(diff);
}

function randomStat(maxRange) {
    return Math.floor(Math.random() * (maxRange));
}

function selectFromList(maxCount, list) {
    var elementCount = random(1, maxCount);
    return selectRandomSublist(elementCount, list);
}

function selectRandomSublist(elementCount, list) {
    var selected = [];
    while (selected.length < elementCount) {
        var index = random(0, list.length - 1);
        var selectedElement = list[index];
        if (!selected.includes(selectedElement)) {
            selected.push(selectedElement);
        }
    }
    return selected;
}

function selectRandom(list) {
    var index = random(0, list.length - 1);
    return list[index];
}

function randomBool() {
    let val = Math.random();
    return val >= 0.5;
}

function randomThreshold() {
    let num = Math.floor(Math.random() * 3);
    if (num == 0) {
        return constants.LOW_THRESHOLD;
    } else if (num == 1) {
        return constants.MEDIUM_THRESHOLD;
    } else if (num == 2) {
        return constants.HIGH_THRESHOLD;
    }
}

function capitalize(str) {
    const lower = (str + '').toLowerCase();
    return (str + '').charAt(0).toUpperCase() + lower.slice(1);
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}