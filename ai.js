const tools = require('./tools.js');
const constants = require('./constants.js');
const statConstants = require('./statConstants.js');
const ratingValueConstants = require('./ratingValueConstants.js');

module.exports = {
    selectSpecies: selectSpecies,
    selectElements: selectElements,
    populateStats: populateStats
};

var elements = tools.getObject("elements");
var species = tools.getObject("species");
var maxStatPointsRemaining = constants.STAT_COUNT_PER_CHARACTER * constants.STAT_POINT_MAX;
var statCountRemaining = constants.STAT_COUNT_PER_CHARACTER;

function selectSpecies(xalian) {
    return tools.selectRandom(species);
}

function selectElements(xalian) {
    return tools.selectFromList(constants.MAX_ELEMENT_COUNT_PER_CHARACTER, elements);
}

var rarities = [{
    type: "common",
    chance: 0
}, {
    type: "mythics",
    chance: 35
}, {
    type: "legends",
    chance: 20
}, {
    type: "ub",
    chance: 1
}];

function pickStatistical() {
    // Calculate chances for common
    var filler = 100 - rarities.map(r => r.chance).reduce((sum, current) => sum + current);

    if (filler <= 0) {
        console.error("chances sum is higher than 100!");
        return;
    }

    // Create an array of 100 elements, based on the chances field
    var probability = rarities.map((r, i) => Array(r.chance === 0 ? filler : r.chance).fill(i)).reduce((c, v) => c.concat(v), []);

    // Pick one
    var pIndex = Math.floor(Math.random() * 100);
    var rarity = rarities[probability[pIndex]];

    return rarity.type;
}

const valMapping = new Map();
valMapping[ratingValueConstants.HIGH] = 3;
valMapping[ratingValueConstants.MEDIUM] = 2;
valMapping[ratingValueConstants.LOW] = 1;
valMapping[ratingValueConstants.UNSET] = 0;


const valFlippedMapping = new Map();
valFlippedMapping[3] = ratingValueConstants.HIGH;
valFlippedMapping[2] = ratingValueConstants.MEDIUM;
valFlippedMapping[1] = ratingValueConstants.LOW;
valFlippedMapping[0] = ratingValueConstants.UNSET;

const statsMapping = new Map();
statsMapping[statConstants.STANDARD_ATTACK_RATING] = statConstants.STANDARD_ATTACK_POINTS;
statsMapping[statConstants.SPECIAL_ATTACK_RATING] = statConstants.SPECIAL_ATTACK_POINTS;
statsMapping[statConstants.STANDARD_DEFENSE_RATING] = statConstants.STANDARD_DEFENSE_POINTS;
statsMapping[statConstants.SPECIAL_DEFENSE_RATING] = statConstants.SPECIAL_DEFENSE_POINTS;
statsMapping[statConstants.SPEED_RATING] = statConstants.SPEED_POINTS;
statsMapping[statConstants.EVASION_RATING] = statConstants.EVASION_POINTS;
statsMapping[statConstants.HEALTH_RATING] = statConstants.HEALTH_POINTS;
statsMapping[statConstants.STAMINA_RATING] = statConstants.STAMINA_POINTS;
statsMapping[statConstants.RECOVERY_RATING] = statConstants.RECOVERY_POINTS;

var ratedPrimary = [];
var unratedPrimary = [];
var ratedSecondary = [];
var unratedSecondary = [];

function populateStats(xalian) {
    // xalian.standardAttackPoints = getStatPointVariation(tools.randomThreshold());
    // xalian.standardAttackPoints = getStatPointVariation(tools.randomThreshold());
    // xalian.specialAttackPoints = getStatPointVariation(tools.randomThreshold());
    // xalian.standardDefensePoints = getStatPointVariation(tools.randomThreshold());
    // xalian.specialDefensePoints = getStatPointVariation(tools.randomThreshold());
    // xalian.speedPoints = getStatPointVariation(tools.randomThreshold());
    // xalian.evasionPoints = getStatPointVariation(tools.randomThreshold());
    // xalian.healthPoints = getStatPointVariation(tools.randomThreshold());
    // xalian.staminaPoints = getStatPointVariation(tools.randomThreshold());
    // xalian.recoveryPoints = getStatPointVariation(tools.randomThreshold());


    let map = xalian.species.statRatings;

    for (const key in map) {
        let val = map[key];
        console.log(`key=${key}: val=${val}`);
        if (val != ratingValueConstants.UNSET) {
            xalian.species.statRatings[key] = val;
            if (isPrimaryStat(key)) {
                ratedPrimary.push(key);
            } else if (isSecondaryStat(key)) {
                ratedSecondary.push(key);
            }
        } else {
            if (isPrimaryStat(key)) {
                unratedPrimary.push(key);
            } else if (isSecondaryStat(key)) {
                unratedSecondary.push(key);
            }
        }
    }

    console.log(`primary rated: ${JSON.stringify(ratedPrimary)}\nprimary unrated: ${JSON.stringify(unratedPrimary)}`);
    console.log(`secondary rated: ${JSON.stringify(ratedSecondary)}\nsecondary unrated: ${JSON.stringify(unratedSecondary)}`);

    // xalian.species.statRatings.forEach(rating => {
    //     console.log(JSON.stringify(rating, null, 2));
    // });

    var primaryMax = 8;
    var secondaryMax = 8;
    var primaryTotal = 0;
    var secondaryTotal = 0;

    // sum totals for pre-rated
    for (const ind in ratedPrimary) {
        let stat = ratedPrimary[ind];
        let threshold = map[stat]
        primaryTotal += valMapping[threshold]
    }
    for (const ind in ratedSecondary) {
        let stat = ratedSecondary[ind];
        let threshold = map[stat];
        secondaryTotal += valMapping[threshold];
    }
    console.log(`primary: ${primaryTotal} :: secondary: ${secondaryTotal}`);

    var remainingPrimaryCount = unratedPrimary.length;
    var remainingSecondaryCount = unratedSecondary.length;
    // set vals for unrated
    for (const ind in unratedPrimary) {
        let stat = unratedPrimary[ind];
        let maxLeftForCategory = primaryMax - primaryTotal;

        let possibleRatings = buildListOfPossibleRatings(maxLeftForCategory, remainingPrimaryCount);
        let selectedRating = tools.selectRandom(possibleRatings);
        let ratingNumber = valMapping[selectedRating];
        let ratingName = valFlippedMapping[ratingNumber];
        console.log(`\nprimary calculated ==>\n\tstat=${stat}\n\tmaxLeftForCategory=${maxLeftForCategory}\n\t# left in category=${remainingPrimaryCount}\n\tpossibleRatings=${possibleRatings}\n\tselectedRating=${selectedRating}\n\tratingNumber=${ratingNumber}\n\tratingName=${ratingName}`);
        remainingPrimaryCount -= 1;
        primaryTotal += ratingNumber;
        xalian.species.statRatings[stat] = ratingName;
    }
    for (const ind in unratedSecondary) {
        let stat = unratedSecondary[ind];
        let maxLeftForCategory = secondaryMax - secondaryTotal;
        

        let possibleRatings = buildListOfPossibleRatings(maxLeftForCategory, remainingSecondaryCount);
        let selectedRating = tools.selectRandom(possibleRatings);
        let ratingNumber = valMapping[selectedRating];
        let ratingName = valFlippedMapping[ratingNumber];
        console.log(`\nsecondary calculated ==>\n\tstat=${stat}\n\tmaxLeftForCategory=${maxLeftForCategory}\n\t# left in category=${remainingSecondaryCount}\n\tpossibleRatings=${possibleRatings}\n\tselectedRating=${selectedRating}\n\tratingNumber=${ratingNumber}\n\tratingName=${ratingName}`);
        remainingSecondaryCount -= 1;
        secondaryTotal += ratingNumber;
        xalian.species.statRatings[stat] = ratingName;
    }



    console.log(`built character ranges:\n${JSON.stringify(xalian.species.statRatings, null, 2)}`);

    return xalian;
}

// function buildListOfPossibleThresholds(val) {
//     var thresholds = [];
//     if (val >= 1) {
//         thresholds.push(constants.LOW_THRESHOLD);
//     }
//     if (val >= 2) {
//         thresholds.push(constants.MEDIUM_THRESHOLD);
//     }
//     if (val >= 3) {
//         thresholds.push(constants.HIGH_THRESHOLD);
//     }
//     return thresholds;
// }

function buildListOfPossibleRatings(maxLeftForCategory, remainingCount) {

    let delta = (maxLeftForCategory - (remainingCount - 1));

    var ratings = [];
    if (remainingCount == 1) {
        return [valFlippedMapping[maxLeftForCategory]];
    }
    // let val = Math.ceil(maxLeftForCategory / remainingCount);
    let val = delta;
    if (val >= 1) {
        ratings.push(ratingValueConstants.LOW);
    }
    if (val >= 2) {
        ratings.push(ratingValueConstants.MEDIUM);
    }
    if (val >= 3) {
        ratings.push(ratingValueConstants.HIGH);
    }
    return ratings;
}

function isPrimaryStat(stat) {
    return (  // primary stat
        stat == statConstants.STANDARD_ATTACK_RATING ||
        stat == statConstants.SPECIAL_ATTACK_RATING ||
        stat == statConstants.STANDARD_DEFENSE_RATING ||
        stat == statConstants.SPECIAL_DEFENSE_RATING
    );
}

function isSecondaryStat(stat) {
    return ( // secondary stat
        stat == statConstants.SPEED_RATING ||
        stat == statConstants.EVASION_RATING ||
        stat == statConstants.RECOVERY_RATING ||
        stat == statConstants.STAMINA_RATING
    );
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