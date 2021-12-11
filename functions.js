var Xalian = require('./character.js');
var Move = require('./move.js');

const tools = require('./tools.js');
const constants = require('./constants.js');

var maxStatPointsRemaining = constants.STAT_COUNT_PER_CHARACTER * constants.STAT_POINT_MAX;
var statCountRemaining = constants.STAT_COUNT_PER_CHARACTER;

var elements = tools.getProperties("elements.txt");
var species = tools.getProperties("species.txt");
var moveNames = tools.getProperties("move_names.txt");
// var moveQualifiers = tools.getProperties("qualifiers.txt");
var moveQualifiers = tools.getObject("qualifier_ratings");




main();

function main() {
    let x = new Xalian();

    x.species = tools.selectRandom(species);
    x.elements = tools.selectFromList(constants.MAX_ELEMENT_COUNT_PER_CHARACTER, elements);
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

    x.moves.push(getMove(x));
    x.moves.push(getMove(x));
    x.moves.push(getMove(x));
    x.moves.push(getMove(x));

    console.log(`\n${JSON.stringify(x, null, 2)}`);

    // let data = JSON.stringify(student);
    // fs.writeFileSync('student-2.json', data);
}

function getMove(character) {
    let m = new Move();
    let hasElement = tools.randomBool();
    if (hasElement) {
        let element = capitalize(tools.selectFromList(1, character.elements));
        m.element = element;
    } else {
        m.element = null;
    }
    let qualifier = tools.selectFromList(1, moveQualifiers)[0];
    m.qualifier = qualifier;
    let baseMove = capitalize(tools.selectFromList(1, moveNames));
    m.baseMove = baseMove;
    if (hasElement) {
        m.name = qualifier.word + " " + m.element + " " + baseMove;
    } else {
        m.name = qualifier.word + " " + baseMove;
    }
    return m;
}

function capitalize(str) {
    const lower = (str + '').toLowerCase();
    return (str + '').charAt(0).toUpperCase() + lower.slice(1);
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















