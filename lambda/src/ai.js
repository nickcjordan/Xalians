const tools = require('./tools.js');
const c = require('./constants/constants.js');
const statConstants = require('./constants/statConstants.js');
const ratingValueConstants = require('./constants/ratingValueConstants.js');
const statLevelConstants = require('./constants/statLevelConstants.js');
const mappings = require('./util/mappings.js');

module.exports = {
    selectSpecies: selectSpecies,
    selectElements: selectElements,
    populateStats: populateStats,
    giveSummary: giveSummary,
    pickStatisticalRandomRating: pickStatisticalRandomRating
};

// TWEAK SETTINGS 
// const 

var elementTypes = tools.getObject("elements");
var species = tools.getObject("species");


var totalAllocatedStatPoints = 0;
var totalUnallocatedStatPoints = Math.floor((c.STAT_COUNT_PER_CHARACTER * c.STAT_POINT_MAX) / 2); // cut in half to have each stat avg to 500/1000
var statCountRemaining = c.STAT_COUNT_PER_CHARACTER;
var ratedPrimary = [];
var unratedPrimary = [];
var ratedSecondary = [];
var unratedSecondary = [];
var percentages = [];
var totalPercentages = [];
var totalStatsList = [];


var allocations = [];

var debug = false;

if (debug) {console.log(`\ninitial totals:\n\tmaxStatPoints=${totalUnallocatedStatPoints}\n\ttotalStatCount=${statCountRemaining}`);}


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

// const valMapping = new Map();
// valMapping[ratingValueConstants.HIGH] = HIGH_VALUE;
// valMapping[ratingValueConstants.MEDIUM] = MEDIUM_VALUE;
// valMapping[ratingValueConstants.LOW] = LOW_VALUE;
// valMapping[ratingValueConstants.UNSET] = 0;

// const ratingToThresholdMapping = new Map();
// ratingToThresholdMapping[statLevelConstants.VERY_HIGH.] = c.HIGH_THRESHOLD;
// ratingToThresholdMapping[ratingValueConstants.HIGH] = c.HIGH_THRESHOLD;
// ratingToThresholdMapping[ratingValueConstants.MEDIUM] = c.MEDIUM_THRESHOLD;
// ratingToThresholdMapping[ratingValueConstants.LOW] = c.LOW_THRESHOLD;


// const valFlippedMapping = new Map();
// valFlippedMapping[3] = ratingValueConstants.HIGH;
// valFlippedMapping[2] = ratingValueConstants.MEDIUM;
// valFlippedMapping[1] = ratingValueConstants.LOW;
// valFlippedMapping[0] = ratingValueConstants.UNSET;

// const valFlippedMapping = new Map();
// valFlippedMapping[5] = statLevelConstants.levels.VERY_HIGH;
// valFlippedMapping[3] = ratingValueConstants.HIGH;
// valFlippedMapping[2] = ratingValueConstants.MEDIUM;
// valFlippedMapping[1] = ratingValueConstants.LOW;
// valFlippedMapping[1] = ratingValueConstants.LOW;
// valFlippedMapping[0] = ratingValueConstants.UNSET;

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
    totalAllocatedStatPoints = 0;
    allocations = [];
    totalUnallocatedStatPoints = Math.floor((c.STAT_COUNT_PER_CHARACTER * c.STAT_POINT_MAX) / 2); // cut in half to have each stat avg to 500/1000
    statCountRemaining = c.STAT_COUNT_PER_CHARACTER;
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
        if (val != statLevelConstants.levels.UNSET.pointValue) {
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
    //      -- '1', '2', '3', '4', or '5' for 'very low', 'low', 'medium', 'high', 'very high'; 
    //      -- average each stat to medium ('3') ==> 3 * 4 = 12 total range points per stat category
    const NUMBER_OF_PRIMARY_STATS = 4;
    const NUMBER_OF_SECONDARY_STATS = 4;
    // const AVG_STAT_LEVEL = statLevelConstants.levels.HIGH;
    const AVG_STAT_LEVEL = statLevelConstants.levels.MEDIUM;
    const AVG_STAT_LEVEL_POINTS = AVG_STAT_LEVEL.pointValue;
    var MAX_POINTS_PER_STAT_CATEGORY = AVG_STAT_LEVEL_POINTS * NUMBER_OF_PRIMARY_STATS;
    var primaryTotal = 0;
    var secondaryTotal = 0;

    // -- set summed totals for preset ranges in primary and secondary categories 
    for (const ind in ratedPrimary) {
        let stat = ratedPrimary[ind];
        let threshold = map[stat]
        primaryTotal += mappings.statValueToObject(threshold).pointValue;
    }
    for (const ind in ratedSecondary) {
        let stat = ratedSecondary[ind];
        let threshold = map[stat];
        secondaryTotal += mappings.statValueToObject(threshold).pointValue;
    }

    // -- get remaining points to be allocated to unset ranges
    var remainingPrimaryCount = unratedPrimary.length;
    var remainingSecondaryCount = unratedSecondary.length;

    // -- set remaining PRIMARY stat ranges from amount left to be allocated 
    for (const ind in unratedPrimary) {
        // select random from list of possible ['very high', 'high', 'medium', 'low', 'very low'] values based on remaining amount in category
        let ratingNumber = pickStatisticalRandomRating(getHighestPossibleRatingValue(MAX_POINTS_PER_STAT_CATEGORY - primaryTotal, remainingPrimaryCount)).pointValue;
        let ratingName = mappings.statValueToObject(ratingNumber).displayText.toLowerCase();
        remainingPrimaryCount -= 1;
        primaryTotal += ratingNumber;
        xalian.species.statRatings[unratedPrimary[ind]] = ratingName;
    }

    // -- set remaining SECONDARY stat ranges from amount left to be allocated 
    for (const ind in unratedSecondary) {
        let ratingNumber = pickStatisticalRandomRating(getHighestPossibleRatingValue(MAX_POINTS_PER_STAT_CATEGORY - secondaryTotal, remainingSecondaryCount)).pointValue;
        let ratingName = mappings.statValueToObject(ratingNumber).displayText.toLowerCase();
        remainingSecondaryCount -= 1;
        secondaryTotal += ratingNumber;
        xalian.species.statRatings[unratedSecondary[ind]] = ratingName;
    }

    // -- generate numeric values for stats and create 'stats' object to attach to xalian
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
    // -- for now I guess we will have the health be a standard 999 value 
    xalian.healthPoints = c.STAT_POINT_MAX;


    var sum = 0;
    percentages.forEach(p => {
        sum += p;
    });
    var avgPerc = Math.floor(sum / percentages.length);
    totalPercentages.push(avgPerc);
    //

    totalStatsList.push(totalAllocatedStatPoints);

    // let allocation = {
    //     "name": statsMapping[statName],
    //     "range": statRangeName,
    //     "initialPoints": finalResult,
    //     "points": finalResult,
    //     "maxPoints": adjustedMaxResult,
    //     "initialPointAllocationPercentage": percentFinal,
    //     "maxPointAllocationPercentage": percentMax,
    // };

	const totalPoints = allocations.map(a => a.points).reduce((prev, curr) => prev + curr);
	const potentialStatPoints = allocations.map(a => a.maxPoints).reduce((prev, curr) => prev + curr);
    const totalPerc = Math.floor((totalPoints/potentialStatPoints) * 100);
	const averagePercentages = Math.floor(allocations.map(a => a.initialPointAllocationPercentage).reduce((prev, curr) => prev + curr) / c.STAT_COUNT_PER_CHARACTER);
	const averagePotentialPercentages = Math.floor(allocations.map(a => a.maxPointAllocationPercentage).reduce((prev, curr) => prev + curr) / c.STAT_COUNT_PER_CHARACTER);
    const totalMaxPotentialPoints = AVG_STAT_LEVEL.rangeMax * c.STAT_POINT_MAX * c.STAT_COUNT_PER_CHARACTER;
    const statScore = Math.floor((totalPoints/totalMaxPotentialPoints) * 1000);
    const potentialStatScore = Math.floor((potentialStatPoints/totalMaxPotentialPoints) * 1000);

    xalian.meta = {
        "totalStatPoints": totalPoints,
        "potentialStatPoints": potentialStatPoints,
        "percentageOfPointsAllocated": totalPerc,
        "averageStatPercentage": averagePercentages,
        "averageStatPotentialPercentage": averagePotentialPercentages,
        "statScore": statScore,
        "potentialStatScore": potentialStatScore
    };
    

    return xalian;
}

function generateStatFromRange(xalian, statName) {
    /* 
    This can be changed to flatten out the average result and make them less sporadic
        essentially it is using a base of max versus using a base of avgLeft 
    */
                // var base = getRemainingAvgPerStat();
                // var base = Math.min(getRemainingAvgPerStat(), c.STAT_POINT_MAX);
    var base = c.STAT_POINT_MAX;
                // var base = Math.max(getRemainingAvgPerStat(), c.STAT_POINT_MAX);
                // var base = Math.floor((getRemainingAvgPerStat() + c.STAT_POINT_MAX) / 2);




    var statRangeName = xalian.species.statRatings[statName];
    let level = mappings.statValueToObject(statRangeName);
    // statRangeFactor = ratingToThresholdMapping[statRangeName];
    var rand = tools.rand();

    // -- get random scalar between 0 and 0.25
    //      -- used as the percentage amount 0% to 25% to scale the base value 
    //      -- result delta value will be point value to add or subtract from original base
    //              -- example: if delta=50, base= 
    var adjustedStatThresholdVariability = (rand) * c.STAT_THRESHOLD_VARIABILITY;
    var newBase = base * adjustedStatThresholdVariability;
    var delta = Math.floor(newBase);


    var trackingOldDelta = Math.floor(newBase);
    // decide 50/50 if it is a negative or positive value
    let neg = tools.randomBoolWeighted(c.RANDOM_WEIGHT);
    if (neg) {
        delta = 0 - delta;
    }
    // find result as the base adjusted for delta
    var result = base + delta;
    // multiply random result by the low medium or high category value (0.25, 05, 0.75)
    // var adjustedResult = Math.floor(result * statRangeFactor);
    var adjustedMinResult = Math.floor(result * level.rangeMin);
    var adjustedMaxResult = Math.floor(result * level.rangeMax);

    // adjusting any outliers
    if (adjustedMinResult > c.STAT_POINT_MAX) { adjustedMinResult = c.STAT_POINT_MAX; }
    if (adjustedMinResult < c.STAT_POINT_MIN) { adjustedMinResult = c.STAT_POINT_MIN; }
    if (adjustedMaxResult > c.STAT_POINT_MAX) { adjustedMaxResult = c.STAT_POINT_MAX; }
    if (adjustedMaxResult < c.STAT_POINT_MIN) { adjustedMaxResult = c.STAT_POINT_MIN; }

    // SELECT STARTING VALUE FOR RESULT :: RANGE OF adjustedMinResult TO adjustedMaxResult
    let adjustedDiff = adjustedMaxResult - adjustedMinResult;
    let randomDiff = adjustedDiff * Math.random();
    let finalResult = Math.floor(adjustedMinResult + randomDiff);

    // SAFE GUARD TO PREVENT SUPER MAX CHARACTER
    // I dont think I am going to do this because it limits potentials, need to run numbers on how possible it is though
    // adjustedResult = Math.min(adjustedResult, totalUnallocatedStatPoints);

    // for stat collecting purposes to compare to what was possible given ranges 
    // let potentialAllocatedPoints = Math.ceil(base * statRangeFactor);
    let potentialAllocatedPointsMin = Math.ceil(base * level.rangeMin);
    let potentialAllocatedPointsMax = Math.ceil(base * level.rangeMax);
    // let percent = Math.floor((adjustedResult / potentialAllocatedPoints) * 100);
    let percentMin = Math.floor((adjustedMinResult / potentialAllocatedPointsMin) * 100);
    let percentMax = Math.floor((adjustedMaxResult / potentialAllocatedPointsMax) * 100);
    let percentFinal = Math.floor((finalResult / potentialAllocatedPointsMax) * 100);
    statCountRemaining -= 1;

    if (debug) {console.log(`\n${statName}\n\trate=${statRangeName}\n\tbase=${base}\n\tminFactor=${level.rangeMin}\n\tmaxFactor=${level.rangeMax}\n\trand=${rand}\n\tadjustedStatThresholdVariability=${adjustedStatThresholdVariability}\n\tnewBase=${newBase}\n\toriginalDelta=${trackingOldDelta}\n\tneg=${neg}\n\tdelta=${delta}\n\tresult=${result}\n\tfinalMinPoints=${adjustedMinResult}\n\tfinalMaxPoints=${adjustedMaxResult}\n\t${statRangeName} :: MIN/MAX: ${adjustedMinResult} / ${potentialAllocatedPointsMin} = ${percentMin}% ::  SELECTED: ${finalResult} / ${potentialAllocatedPointsMax} = ${percentMax}%`);}
    percentages.push(percentFinal);



    let allocation = {
        "name": statsMapping[statName],
        "range": statRangeName,
        "initialPoints": finalResult,
        "points": finalResult,
        "maxPoints": adjustedMaxResult,
        "initialPointAllocationPercentage": percentFinal,
        "maxPointAllocationPercentage": percentMax,
    };
    allocations.push(allocation);
    return allocation;

    // return adjustedResult;
}

// -- get highest possible category between 'VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'
//      -- range can be limited by remaining points to allocate for a range category  
function getHighestPossibleRatingValue(maxLeftForCategory, remainingCount) {
    if (remainingCount == 1) { return maxLeftForCategory; }
    let numberOfCategoriesToAllocateAfterThisIteration = remainingCount - 1;
    let remainingAmountThatCanBeAllocatedAssumingAllOtherRangesRandomizedToLowest = maxLeftForCategory - (numberOfCategoriesToAllocateAfterThisIteration * statLevelConstants.levels.VERY_LOW.pointValue);
    return Math.min(remainingAmountThatCanBeAllocatedAssumingAllOtherRangesRandomizedToLowest, statLevelConstants.levels.VERY_HIGH.pointValue);
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

// 0 means 'fill remaining percentage'
var raritiesFull = [
    {
        type: statLevelConstants.levels.VERY_LOW,
        chance: 0
    },
    {
        type: statLevelConstants.levels.LOW,
        chance: 20
    }, 
    {
        type: statLevelConstants.levels.MEDIUM,
        chance: 20
    }, 
    {
        type: statLevelConstants.levels.HIGH,
        chance: 20
    },
    {
        type: statLevelConstants.levels.VERY_HIGH,
        chance: 20
    }
];

var raritiesNoVeryHigh = [
    {
        type: statLevelConstants.levels.VERY_LOW,
        chance: 0
    },
    {
        type: statLevelConstants.levels.LOW,
        chance: 25
    }, 
    {
        type: statLevelConstants.levels.MEDIUM,
        chance: 25
    }, 
    {
        type: statLevelConstants.levels.HIGH,
        chance: 25
    }
];

var raritiesNoHigh = [
    {
        type: statLevelConstants.levels.VERY_LOW,
        chance: 0
    },
    {
        type: statLevelConstants.levels.LOW,
        chance: 33
    }, 
    {
        type: statLevelConstants.levels.MEDIUM,
        chance: 33
    }
];

var raritiesNoMedium = [
    {
        type: statLevelConstants.levels.VERY_LOW,
        chance: 0
    },
    {
        type: statLevelConstants.levels.LOW,
        chance: 50
    }
];

function pickStatisticalRandomRating(val = null) {
    var highest = val;
    if (highest == null) {
        highest = statLevelConstants.levels.VERY_HIGH.pointValue;
    } 
    var rarities = null;
    if     (highest == statLevelConstants.levels.VERY_HIGH.pointValue) {    rarities = raritiesFull;
    } else if (highest == statLevelConstants.levels.HIGH.pointValue) {    rarities = raritiesNoVeryHigh;
    } else if (highest == statLevelConstants.levels.MEDIUM.pointValue) {    rarities = raritiesNoHigh;
    } else if (highest == statLevelConstants.levels.LOW.pointValue) {    rarities = raritiesNoMedium;
    } else {  return                                                    statLevelConstants.levels.VERY_LOW; }

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