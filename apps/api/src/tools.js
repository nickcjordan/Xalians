const fs = require('fs')
const path = require('path')
const constants = require('./constants/constants.js');

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
    shuffle: shuffle,
    rand: rand,
    randomBoolWeighted: randomBoolWeighted
};

function getProperties(fileName) {
    try {
        return getPropsFromFile("./src/txt/" + fileName + ".txt");
    } catch (err) {
        try {
            return getPropsFromFile("./txt/" + fileName + ".txt");
        } catch (e) {
            console.error(err);
        }
    }
}

function getPropsFromFile(fullfileName) {
    try {
        const data = fs.readFileSync(fullfileName, 'utf8');
        if (data.includes(",")) {
            return data.toString().split(",");
        } else {
            return data.toString().split("\n");
        }
    } catch (err) {
        console.error(err);
    }
}

// Shared game data (elements, species, qualifiers, moves) lives in the
// @xalians/content workspace package, not under this app. In dev and test
// (npm workspaces linked, CWD irrelevant) require.resolve finds it on the
// module path. In the deployed Lambda zip the workspace package is not
// present (the zip is built from apps/api alone), so scripts/stageApiContent.js
// (run in CI before `terraform apply`) copies the four engine JSON files into
// apps/api/dist-content/, and that is the fallback below. This staging step
// goes away in PR C2 once esbuild bundles the @xalians/content imports directly.
function getObject(fileName) {
    return JSON.parse(getJson(fileName));
}

function getJson(fileName) {
    try {
        return getJsonFromFile(require.resolve('@xalians/content/' + fileName + '.json'));
    } catch (err) {
        try {
            return getJsonFromFile(path.join(__dirname, '..', 'dist-content', fileName + '.json'));
        } catch (e) {
            console.error(err);
        }
    }
}

function getJsonFromFile(fileName) {
    const data = fs.readFileSync(fileName, 'utf8');
    return data.toString()
}



// FUNCTIONS TO GENERATE RANDOM NUMBERS AND SELECT RANDOM FROM LIST

function random(min, max) {
    var diff = (max + 1) - min;
    return min + randomStat(diff);
}

function randomStat(maxRange) {
    return Math.floor(rand() * (maxRange));
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
    let val = rand();
    return val >= 0.5;
}

function randomBoolWeighted(weight = 0.5) {
    let val = rand();
    return val >= weight;
}



function randomThreshold() {
    let num = Math.floor(rand() * 3);
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
        randomIndex = Math.floor(rand() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

var rando = getRandomFunction(new Date().getTime());

function getRandomFunction(userSeed) {
    let seed = xmur3(userSeed);
    return sfc32(seed(), seed(), seed(), seed());
}

function rand() {
    var a = Math.random();
    var b = rando();
    var c = rando();
    var x = (a + b + c) / 3;
    // console.log(`a=${a} :: b=${b} :: c=${c} :: x=${x}`);
    return x;
}

function gaussianRand() {
    var rand = 0;
    var k = 100;
  
    for (var i = 0; i < k; i += 1) {
      rand += Math.random();
    }
  
    return rand / k;
  }

// function rand() {
//     return randn_bm();
// }

function randn_bm() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

function xmur3(str) {
    for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
        h = h << 13 | h >>> 19;
    return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

function sfc32(a, b, c, d) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}
