const tools = require('./tools.js');
const constants = require('./constants/constants.js');
const statConstants = require('./constants/statConstants.js');
const ratingValueConstants = require('./constants/ratingValueConstants.js');

module.exports = {
    selectSpecies: selectSpecies,
    selectElements: selectElements,
    populateStats: populateStats,
    giveSummary: giveSummary,
    pickStatisticalRandomRating: pickStatisticalRandomRating
};

var elements = tools.getObject("elements");
var species = tools.getObject("species");
var totalStats = 0;
var totalStatPointsUnallocated = Math.floor((constants.STAT_COUNT_PER_CHARACTER * constants.STAT_POINT_MAX) / 2); // cut in half to have each stat avg to 500/1000
var statCountRemaining = constants.STAT_COUNT_PER_CHARACTER;
var ratedPrimary = [];
var unratedPrimary = [];
var ratedSecondary = [];
var unratedSecondary = [];
var percentages = [];
var totalPercentages = [];
var totalStatsList = [];

var debug = false;

if (debug) {console.log(`\ninitial totals:\n\tmaxStatPoints=${totalStatPointsUnallocated}\n\ttotalStatCount=${statCountRemaining}`);}


function selectSpecies(xalian) {
    return tools.selectRandom(species);
}

function selectElements(xalian) {
    return tools.selectFromList(constants.MAX_ELEMENT_COUNT_PER_CHARACTER, elements);
}

const valMapping = new Map();
valMapping[ratingValueConstants.HIGH] = 3;
valMapping[ratingValueConstants.MEDIUM] = 2;
valMapping[ratingValueConstants.LOW] = 1;
valMapping[ratingValueConstants.UNSET] = 0;

const ratingToThresholdMapping = new Map();
ratingToThresholdMapping[ratingValueConstants.HIGH] = constants.HIGH_THRESHOLD;
ratingToThresholdMapping[ratingValueConstants.MEDIUM] = constants.MEDIUM_THRESHOLD;
ratingToThresholdMapping[ratingValueConstants.LOW] = constants.LOW_THRESHOLD;


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

function resetGlobals() {
    totalStats = 0;
    totalStatPointsUnallocated = Math.floor((constants.STAT_COUNT_PER_CHARACTER * constants.STAT_POINT_MAX) / 2); // cut in half to have each stat avg to 500/1000
    statCountRemaining = constants.STAT_COUNT_PER_CHARACTER;
    ratedPrimary = [];
    unratedPrimary = [];
    ratedSecondary = [];
    unratedSecondary = [];
    percentages = [];
}

function populateStats(xalian) {
    resetGlobals();

    var map = xalian.species.statRatings;
    for (const key in map) {
        let val = map[key];
        // console.log(`key=${key}: val=${val}`);
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

    // console.log(`primary rated: ${JSON.stringify(ratedPrimary)}\nprimary unrated: ${JSON.stringify(unratedPrimary)}`);
    // console.log(`secondary rated: ${JSON.stringify(ratedSecondary)}\nsecondary unrated: ${JSON.stringify(unratedSecondary)}`);

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
    if (debug) {console.log(`primary: ${primaryTotal} :: secondary: ${secondaryTotal}`);}

    var remainingPrimaryCount = unratedPrimary.length;
    var remainingSecondaryCount = unratedSecondary.length;
    // set vals for unrated
    for (const ind in unratedPrimary) {
        let stat = unratedPrimary[ind];
        let maxLeftForCategory = primaryMax - primaryTotal;

        let possibleRatings = buildListOfPossibleRatings(maxLeftForCategory, remainingPrimaryCount);
        
        
        // let selectedRating = tools.selectRandom(possibleRatings);
        var selectedRating = pickStatisticalRandomRating(possibleRatings.length);
        
        let ratingNumber = valMapping[selectedRating];
        let ratingName = valFlippedMapping[ratingNumber];
        // console.log(`\nprimary calculated ==>\n\tstat=${stat}\n\tmaxLeftForCategory=${maxLeftForCategory}\n\t# left in category=${remainingPrimaryCount}\n\tpossibleRatings=${possibleRatings}\n\tselectedRating=${selectedRating}\n\tratingNumber=${ratingNumber}\n\tratingName=${ratingName}`);
        remainingPrimaryCount -= 1;
        primaryTotal += ratingNumber;
        xalian.species.statRatings[stat] = ratingName;
    }
    for (const ind in unratedSecondary) {
        let stat = unratedSecondary[ind];
        let maxLeftForCategory = secondaryMax - secondaryTotal;


        let possibleRatings = buildListOfPossibleRatings(maxLeftForCategory, remainingSecondaryCount);
        
        // let selectedRating = tools.selectRandom(possibleRatings);
        var selectedRating = pickStatisticalRandomRating(possibleRatings.length);
        
        let ratingNumber = valMapping[selectedRating];
        let ratingName = valFlippedMapping[ratingNumber];
        // console.log(`\nsecondary calculated ==>\n\tstat=${stat}\n\tmaxLeftForCategory=${maxLeftForCategory}\n\t# left in category=${remainingSecondaryCount}\n\tpossibleRatings=${possibleRatings}\n\tselectedRating=${selectedRating}\n\tratingNumber=${ratingNumber}\n\tratingName=${ratingName}`);
        remainingSecondaryCount -= 1;
        secondaryTotal += ratingNumber;
        xalian.species.statRatings[stat] = ratingName;
    }
    // console.log(`built character ranges:\n${JSON.stringify(xalian.species.statRatings, null, 2)}`);


    // xalian.standardAttackPoints = generateStatFromRange(xalian, statConstants.STANDARD_ATTACK_RATING);
    // xalian.specialAttackPoints = generateStatFromRange(xalian, statConstants.SPECIAL_ATTACK_RATING);
    // xalian.standardDefensePoints = generateStatFromRange(xalian, statConstants.STANDARD_DEFENSE_RATING);
    // xalian.specialDefensePoints = generateStatFromRange(xalian, statConstants.SPECIAL_DEFENSE_RATING);
    // xalian.speedPoints = generateStatFromRange(xalian, statConstants.SPEED_RATING);
    // xalian.evasionPoints = generateStatFromRange(xalian, statConstants.EVASION_RATING);
    // xalian.recoveryPoints = generateStatFromRange(xalian, statConstants.RECOVERY_RATING);
    // xalian.staminaPoints = generateStatFromRange(xalian, statConstants.STAMINA_RATING);
    var stats = new Map();
    stats[statConstants.STANDARD_ATTACK_POINTS] = generateStatFromRange(xalian, statConstants.STANDARD_ATTACK_RATING);
    stats[statConstants.SPECIAL_ATTACK_POINTS] = generateStatFromRange(xalian, statConstants.SPECIAL_ATTACK_RATING);
    stats[statConstants.STANDARD_DEFENSE_POINTS] = generateStatFromRange(xalian, statConstants.STANDARD_DEFENSE_RATING);
    stats[statConstants.SPECIAL_DEFENSE_POINTS] = generateStatFromRange(xalian, statConstants.SPECIAL_DEFENSE_RATING);
    stats[statConstants.SPEED_POINTS] = generateStatFromRange(xalian, statConstants.SPEED_RATING);
    stats[statConstants.EVASION_POINTS] = generateStatFromRange(xalian, statConstants.EVASION_RATING);
    stats[statConstants.RECOVERY_POINTS] = generateStatFromRange(xalian, statConstants.RECOVERY_RATING);
    stats[statConstants.STAMINA_POINTS] = generateStatFromRange(xalian, statConstants.STAMINA_RATING);
    xalian.stats = stats;

    // xalian.healthPoints = generateStatFromRange(xalian, statConstants.HEALTH_RATING);
    xalian.healthPoints = constants.STAT_POINT_MAX;


    // debug
    var sum = 0;
    percentages.forEach(p => {
        sum += p;
    });
    var avgPerc = Math.floor(sum / percentages.length);
    // console.log(`percentage :: avg=${avgPerc}% :: ${JSON.stringify(percentages)}`);
    totalPercentages.push(avgPerc);
    // console.log(`totalPercentages=${JSON.stringify(totalPercentages)}`);
    //

    totalStatsList.push(totalStats);

    xalian.meta = {
        "avgPercentage": avgPerc,
        "totalStatPoints": totalStats
    };
    

    return xalian;
}

function generateStatFromRange(xalian, statName) {
    var rate = xalian.species.statRatings[statName];
    statRangeFactor = ratingToThresholdMapping[rate];

    /* 
    
    This can be changed to flatten out the average result and make them less sporadic
        essentially it is using a base of max versus using a base of avgLeft 

    */

    // var base = getRemainingAvgPerStat();
    // var base = Math.min(getRemainingAvgPerStat(), constants.STAT_POINT_MAX);
    var base = constants.STAT_POINT_MAX;
    // var base = Math.max(getRemainingAvgPerStat(), constants.STAT_POINT_MAX);
    // var base = Math.floor((getRemainingAvgPerStat() + constants.STAT_POINT_MAX) / 2);

    var rand = tools.rand();

    var adjustedStatThresholdVariability = (rand) * constants.STAT_THRESHOLD_VARIABILITY;
    var newBase = base * adjustedStatThresholdVariability;
    var delta = Math.floor(newBase);


    var trackingOldDelta = Math.floor(newBase);
    let neg = tools.randomBoolWeighted(constants.RANDOM_WEIGHT);
    if (neg) {
        delta = 0 - delta;
    }
    var result = base + delta;
    var adjustedResult = Math.floor(result * statRangeFactor);

    if (adjustedResult > constants.STAT_POINT_MAX) {
        adjustedResult = constants.STAT_POINT_MAX;
    }
    if (adjustedResult < constants.STAT_POINT_MIN) {
        adjustedResult = constants.STAT_POINT_MIN;
    }

    // SAFE GUARD TO PREVENT SUPER MAX CHARACTER
    // adjustedResult = Math.min(adjustedResult, totalStatPointsUnallocated);


    let potentialMax = Math.ceil(base * statRangeFactor);
    let percent = Math.floor((adjustedResult / potentialMax) * 100);
    totalStatPointsUnallocated -= adjustedResult;
    statCountRemaining -= 1;
    totalStats += adjustedResult;

    if (debug) {console.log(`\n${statName}\n\trate=${rate}\n\tbase=${base}\n\tfactor=${statRangeFactor}\n\trand=${rand}\n\tadjustedStatThresholdVariability=${adjustedStatThresholdVariability}\n\tnewBase=${newBase}\n\toriginalDelta=${trackingOldDelta}\n\tneg=${neg}\n\tdelta=${delta}\n\tresult=${result}\n\tfinal=${adjustedResult}\n\t${rate} :: ${adjustedResult} / ${potentialMax} = ${percent}%`);}
    if (debug) {console.log(`\nrunning totals:\n\ttotalStatPointsUnallocated=${totalStatPointsUnallocated}\n\tstatCountRemaining=${statCountRemaining}\n\ttotalStatsBuilt=${totalStats}\n\tavg remaining=${getRemainingAvgPerStat()}`);}
    percentages.push(percent);

    return {
        "name": statsMapping[statName],
        "range": rate,
        "points": adjustedResult,
        "percentage": percent
    }

    // return adjustedResult;
}


// function getThreshold(val) {
//     var thresholds = [constants.LOW_THRESHOLD, constants.MEDIUM_THRESHOLD, constants.HIGH_THRESHOLD];
//     return thresholds[val - 1];
// }

function buildListOfPossibleRatings(maxLeftForCategory, remainingCount) {
    var ratings = [];
    if (remainingCount == 1) {
        return [valFlippedMapping[maxLeftForCategory]];
    }
    let val = (maxLeftForCategory - (remainingCount - 1));;
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


function getRemainingAvgPerStat() {
    return Math.floor(totalStatPointsUnallocated / statCountRemaining);
}

//debug
function giveSummary() {
    // debug
    var sum = 0;
    totalPercentages.sort(function(a, b) {
        return a - b;
      });
    totalPercentages.forEach(p => {
        sum += p;
    });

    var curve = new Map();

    totalPercentages.forEach(p => {
        if (curve[p] != undefined && curve[p] != null) {
            var val = curve[p];
            val += 1;
            curve[p] = val;
        } else {
            curve[p] = 1;
        }
    });

    // totalStatsList.forEach(p => {
    //     if (curve[p] != undefined && curve[p] != null) {
    //         var val = curve[p];
    //         val += 1;
    //         curve[p] = val;
    //     } else {
    //         curve[p] = 1;
    //     }
    // });


    var flip = true;
    console.log("\n")
    for (const key in curve) {
        let val = curve[key];
        var bar = "";
        for (var i = 0; i<val; i++) {
            bar += "|";
        }
        if (flip) {
            console.log(`${key}\t${val}\t--${bar}`);
        }
        flip = !flip;
    }
    console.log("\n");

    totalPercentages.reverse().slice(0, 20).forEach(p => {
        console.log(p);
    });
    console.log("\n...\n");

    let midIndex = (totalPercentages.length / 2);
    totalPercentages.slice(midIndex - 10, midIndex + 10).forEach(p => {
        console.log(p);
    });

    console.log("\n...\n");
    totalPercentages.reverse().slice(0, 20).reverse().forEach(p => {
        console.log(p);
    });
    var avg = Math.floor(sum / totalPercentages.length);
    //
    
    console.log(`\n\n\t\tavg= ${avg} :: std dev = ${getStandardDeviation(totalPercentages)}%`);
    console.log(``);
}

function getStandardDeviation(array) {
    const n = array.length
    const mean = array.reduce((a, b) => a + b) / n
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
}


var raritiesFull = [{
    type: ratingValueConstants.LOW,
    chance: 0
}, {
    type: ratingValueConstants.MEDIUM,
    chance: 35
}, {
    type: ratingValueConstants.HIGH,
    chance: 20
}];

var raritiesNoHigh = [{
    type: ratingValueConstants.LOW,
    chance: 0
}, {
    type: ratingValueConstants.MEDIUM,
    chance: 50
}];

function pickStatisticalRandomRating(highest = 3) {
    var rarities = null;
    if (highest > 2) {
        rarities = raritiesFull;
    } else if (highest > 1) {
        rarities = raritiesNoHigh;
    } else {
        return ratingValueConstants.LOW;
    }
    // Calculate chances for common
    var filler = 100 - rarities.map(r => r.chance).reduce((sum, current) => sum + current);

    if (filler <= 0) {
        console.error("chances sum is higher than 100!");
        return;
    }

    // Create an array of 100 elements, based on the chances field
    var probability = rarities.map((r, i) => Array(r.chance === 0 ? filler : r.chance).fill(i)).reduce((c, v) => c.concat(v), []);

    // Pick one
    var pIndex = Math.floor(tools.rand() * 100);
    var rarity = rarities[probability[pIndex]];

    return rarity.type;
}