var Xalian = require('./character.js');
var Move = require('./move.js');

const tools = require('./tools.js');
const constants = require('./constants.js');
const moveBuilder = require('./moveBuilder.js');

var maxStatPointsRemaining = constants.STAT_COUNT_PER_CHARACTER * constants.STAT_POINT_MAX;
var statCountRemaining = constants.STAT_COUNT_PER_CHARACTER;

// var elements = tools.getProperties("elements.txt");
var elements = tools.getObject("elements");
var species = tools.getProperties("species.txt");




main();

function main() {
    let x = new Xalian();

    x.species = tools.selectRandom(species);
    x.elements = selectElements(x);
    x.standardAttackPoints = getStatPointVariation(tools.randomThreshold());
    x.standardAttackPoints = getStatPointVariation(tools.randomThreshold());
    x.specialAttackPoints = getStatPointVariation(tools.randomThreshold());
    x.standardDefensePoints = getStatPointVariation(tools.randomThreshold());
    x.specialDefensePoints = getStatPointVariation(tools.randomThreshold());
    x.speedPoints = getStatPointVariation(tools.randomThreshold());
    x.evasionPoints = getStatPointVariation(tools.randomThreshold());
    x.healthPoints = getStatPointVariation(tools.randomThreshold());
    x.staminaPoints = getStatPointVariation(tools.randomThreshold());
    x.recoveryPoints = getStatPointVariation(tools.randomThreshold());

    x.moves.push(moveBuilder.getMove(x));
    x.moves.push(moveBuilder.getMove(x));
    x.moves.push(moveBuilder.getMove(x));
    x.moves.push(moveBuilder.getMove(x));

    console.log(`\n${JSON.stringify(x, null, 2)}`);

    // let data = JSON.stringify(student);
    // fs.writeFileSync('student-2.json', data);
}



function selectElements(xalian) {
    return tools.selectFromList(constants.MAX_ELEMENT_COUNT_PER_CHARACTER, elements);
}

function getStatPointVariation(statRangeFactor) {
    // var avg = getRemainingAvgPerStat();
    var avg = constants.STAT_POINT_MAX;
    var delta = Math.floor(avg * (Math.random() * constants.STAT_THRESHOLD_VARIABILITY));
    if (tools.randomBool()) {
        delta = 0 - delta;
    }
    var result = avg + delta;
    var adjustedResult = Math.floor(result * statRangeFactor);
    maxStatPointsRemaining -= adjustedResult;
    statCountRemaining -= 1;
    if (adjustedResult > constants.STAT_POINT_MAX) {
        adjustedResult = constants.STAT_POINT_MAX;
    }
    // console.log(`\tavg remaining: ${avg}\n\tdelta: ${delta}\n\tresult: ${result}\n\tadjustedResult: ${adjustedResult}\n`);
    return adjustedResult;
}

function getRemainingAvgPerStat() {
    return Math.floor(maxStatPointsRemaining / statCountRemaining);
}















