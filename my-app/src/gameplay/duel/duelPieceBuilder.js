
import * as duelConstants from './duelGameConstants'; 
import * as translator from '../../utils/valueTranslator';
import species from '../../json/species.json';

export function buildDuelPiece(xalian) {
    let stAttackPts = translator.statRangeToInteger(xalian.stats["standardAttackPoints"].range);
    let spAttackPts = translator.statRangeToInteger(xalian.stats["specialAttackPoints"].range);
    // let attackPts = Math.floor(((stAttackPts + spAttackPts)*10)/2)/10; // round to 1 decimal if necessary
    let attackPts = Math.floor(((stAttackPts + spAttackPts)*10))/10; // round to 1 decimal if necessary

    let stDefensePts = translator.statRangeToInteger(xalian.stats["standardDefensePoints"].range);
    let spDefensePts = translator.statRangeToInteger(xalian.stats["specialDefensePoints"].range);
    // let defensePts = Math.floor(((stDefensePts + spDefensePts)*10)/2)/10; // round to 1 decimal if necessary
    let defensePts = Math.floor(((stDefensePts + spDefensePts)*10))/10; // round to 1 decimal if necessary
    
    let speedPts = translator.statRangeToInteger(xalian.stats["speedPoints"].range);
    
    // let distance = Math.round(Math.sqrt(speedPts));
    let distance = speedPts > 3 ? 3 : speedPts > 2 ? 2 : 1;

    let evasionPts = translator.statRangeToInteger(xalian.stats["evasionPoints"].range) * 2;

    var selectedSpecies = species.filter( s => s.id === xalian.species.id)[0];

    let ranges = new Map();
    ranges['high'] = 3;
    ranges['medium'] = 2;
    ranges['low'] = 1;

    let attackRange = ranges[selectedSpecies.traits.attackRange];

    function buildReducedSpecies(fullSpecies) {
        return {
            id: fullSpecies.id,
            name: fullSpecies.name,
            planet: fullSpecies.planet
        }
    }

    return {
        xalianId: xalian.xalianId,
        species: buildReducedSpecies(xalian.species),
        elementType: xalian.elements.primaryType,
        stats: {
            attack: attackPts,
            defense: defensePts,
            speed: speedPts,
            range: attackRange,
            distance: distance,
            evasion: evasionPts,
        },
        state: {
            health: duelConstants.MAX_HEALTH_POINTS,
            stamina: duelConstants.MAX_STAMINA_POINTS
        },
        traits: selectedSpecies.traits
    }
}