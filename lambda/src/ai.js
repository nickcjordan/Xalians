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

const HIGH_VALUE = 3;
const MEDIUM_VALUE = 2;
const LOW_VALUE = 1;

var elementTypes = tools.getObject("elements");
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
    // return tools.selectRandom(species);
    return tools.selectRandom(tools.shuffle(species));
}

function selectElements(xalian) {

    var primaryType = getTypeNodeFromName(xalian.species.type);
    var primaryElement = tools.selectRandom(primaryType.elements);
    
    let secondaryType;
    while(!secondaryType || (secondaryType.name == xalian.species.type)) {
        secondaryType = tools.selectRandom(elementTypes);
    }
    let secondaryElement = tools.selectRandom(secondaryType.elements);
    
    return {
        "primaryType": primaryType,
        "primaryElement": primaryElement,
        "secondaryType": secondaryType,
        "secondaryElement": secondaryElement
    }
}

function getTypeNodeFromName(typeName) {
    var selected;
    elementTypes.forEach(type => {
        if (type.name.toLowerCase() == typeName.toLowerCase()) {
            selected = type;
        }
    });
    return selected;
}

const valMapping = new Map();
valMapping[ratingValueConstants.HIGH] = HIGH_VALUE;
valMapping[ratingValueConstants.MEDIUM] = MEDIUM_VALUE;
valMapping[ratingValueConstants.LOW] = LOW_VALUE;
valMapping[ratingValueConstants.UNSET] = 0;

const ratingToThresholdMapping = new Map();
ratingToThresholdMapping[ratingValueConstants.HIGH] = constants.HIGH_THRESHOLD;
ratingToThresholdMapping[ratingValueConstants.MEDIUM] = constants.MEDIUM_THRESHOLD;
ratingToThresholdMapping[ratingValueConstants.LOW] = constants.LOW_THRESHOLD;


const valFlippedMapping = new Map();
valFlippedMapping[3] = ratingValueConstants.HIGH;
valFlippedMapping[MEDIUM_VALUE] = ratingValueConstants.MEDIUM;
valFlippedMapping[LOW_VALUE] = ratingValueConstants.LOW;
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
    resetGlobals(); // sets meta tracking back to 0

    // -- iterate through preset stat ranges specific to species
    // -- generate ranges for any that were not preset
    var map = xalian.species.statRatings;
    for (const key in map) {
        let val = map[key];
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

    // -- set max for generated ranges 
    //      -- 4 categories in both primary and secondary
    //      -- '1', '2', or '3' for 'low', 'medium', or 'high'; 
    //      -- average each stat to medium ('2') ==> 2 * 4 = 8 total range points per stat category
    var primaryMax = 8;
    var secondaryMax = 8;
    var primaryTotal = 0;
    var secondaryTotal = 0;

    // -- set summed totals for preset ranges in primary and secondary categories 
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

    // -- get remaining points to be allocated to unset ranges
    var remainingPrimaryCount = unratedPrimary.length;
    var remainingSecondaryCount = unratedSecondary.length;

    // -- set remaining PRIMARY stat ranges from amount left to be allocated 
    for (const ind in unratedPrimary) {
        // get list of possible ['high', 'medium', 'low'] based on remaining amount in category
        let possibleRatings = buildListOfPossibleRatings(primaryMax - primaryTotal, remainingPrimaryCount);  
        
        
        var selectedRating = pickStatisticalRandomRating(possibleRatings.length);
        
        let ratingNumber = valMapping[selectedRating];
        let ratingName = valFlippedMapping[ratingNumber];
        // console.log(`\nprimary calculated ==>\n\tstat=${stat}\n\tmaxLeftForCategory=${maxLeftForCategory}\n\t# left in category=${remainingPrimaryCount}\n\tpossibleRatings=${possibleRatings}\n\tselectedRating=${selectedRating}\n\tratingNumber=${ratingNumber}\n\tratingName=${ratingName}`);
        remainingPrimaryCount -= 1;
        primaryTotal += ratingNumber;
        xalian.species.statRatings[unratedPrimary[ind]] = ratingName;
    }

    // -- set remaining SECONDARY stat ranges from amount left to be allocated 
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

    // get random scalar between 0 and 0.25
    var adjustedStatThresholdVariability = (rand) * constants.STAT_THRESHOLD_VARIABILITY;
    // get difference in base adjused for randomness
    var newBase = base * adjustedStatThresholdVariability;
    var delta = Math.floor(newBase);


    var trackingOldDelta = Math.floor(newBase);
    // decide 50/50 if it is a negative or positive value
    let neg = tools.randomBoolWeighted(constants.RANDOM_WEIGHT);
    if (neg) {
        delta = 0 - delta;
    }
    // find result as the base adjusted for delta
    var result = base + delta;
    // multiply random result by the low medium or high category value (0.25, 05, 0.75)
    var adjustedResult = Math.floor(result * statRangeFactor);

    // adjusting any outliers
    if (adjustedResult > constants.STAT_POINT_MAX) {
        adjustedResult = constants.STAT_POINT_MAX;
    }
    if (adjustedResult < constants.STAT_POINT_MIN) {
        adjustedResult = constants.STAT_POINT_MIN;
    }

    // SAFE GUARD TO PREVENT SUPER MAX CHARACTER
    // I dont think I am going to do this because it limits potentials, need to run numbers on how possible it is though
    // adjustedResult = Math.min(adjustedResult, totalStatPointsUnallocated);

    // for stat collecting purposes to compare to what was possible given ranges 
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

// -- build list of ['HIGH', 'MEDIUM', 'LOW'] potential ranges to have randomizer select from
//      -- range can be limited by remaining points to allocate for a range category 
// function buildListOfPossibleRatings(maxLeftForCategory, remainingCount) {
//     var ratings = [];
//     if (remainingCount == 1) { return [valFlippedMapping[maxLeftForCategory]]; }
//     let val = (maxLeftForCategory - (remainingCount - 1));
//     if (val >= 1) { ratings.push(ratingValueConstants.LOW); }
//     if (val >= 2) { ratings.push(ratingValueConstants.MEDIUM); }
//     if (val >= 3) { ratings.push(ratingValueConstants.HIGH); }
//     return ratings;
// }

// -- get highest possible category between 'HIGH', 'MEDIUM', 'LOW'
//      -- range can be limited by remaining points to allocate for a range category  
function getHighestPossibleRatingValue(maxLeftForCategory, remainingCount) {
    if (remainingCount == 1) { return maxLeftForCategory; }
    let numberOfCategoriesToAllocateAfterThisIteration = remainingCount - 1;
    let remainingAmountToAllocateIfAllOtherRangesRandomizedToLowest = maxLeftForCategory - (numberOfCategoriesToAllocateAfterThisIteration * LOW_VALUE);
    if (remainingAmountToAllocateIfAllOtherRangesRandomizedToLowest > HIGH_VALUE) {return HIGH_VALUE; }
    else { return remainingAmountToAllocateIfAllOtherRangesRandomizedToLowest; }
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

function pickStatisticalRandomRating(highest = HIGH_VALUE) {
    var rarities = null;
    if (highest > MEDIUM_VALUE) {
        rarities = raritiesFull;
    } else if (highest > LOW_VALUE) {
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