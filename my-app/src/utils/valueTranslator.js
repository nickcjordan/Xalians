import { stat, statPoints } from '../constants/designTokens';

let statColorMap = new Map();
statColorMap['standardAttackRating'] = stat.standardAttack;
statColorMap['specialAttackRating'] = stat.specialAttack;
statColorMap['standardDefenseRating'] = stat.standardDefense;
statColorMap['specialDefenseRating'] = stat.specialDefense;
statColorMap['speedRating'] = stat.speed;
statColorMap['evasionRating'] = stat.evasion;
statColorMap['staminaRating'] = stat.stamina;
statColorMap['recoveryRating'] = stat.recovery;

statColorMap['standardAttackPoints'] = statPoints.standardAttack;
statColorMap['specialAttackPoints'] = statPoints.specialAttack;
statColorMap['standardDefensePoints'] = statPoints.standardDefense;
statColorMap['specialDefensePoints'] = statPoints.specialDefense;
statColorMap['speedPoints'] = statPoints.speed;
statColorMap['evasionPoints'] = statPoints.evasion;
statColorMap['staminaPoints'] = statPoints.stamina;
statColorMap['recoveryPoints'] = statPoints.recovery;

let condensedTransMap = new Map();
condensedTransMap['standardAttackPoints'] = 'ATT';
condensedTransMap['specialAttackPoints'] = 'Sp.ATT';
condensedTransMap['standardDefensePoints'] = 'DEF';
condensedTransMap['specialDefensePoints'] = 'Sp.DEF';
condensedTransMap['speedPoints'] = 'SPD';
condensedTransMap['evasionPoints'] = 'EV';
condensedTransMap['staminaPoints'] = 'STA';
condensedTransMap['recoveryPoints'] = 'REC';

condensedTransMap['standardAttackRating'] = 'ATT';
condensedTransMap['specialAttackRating'] = 'Sp.ATT';
condensedTransMap['standardDefenseRating'] = 'DEF';
condensedTransMap['specialDefenseRating'] = 'Sp.DEF';
condensedTransMap['speedRating'] = 'SPD';
condensedTransMap['evasionRating'] = 'EV';
condensedTransMap['staminaRating'] = 'STA';
condensedTransMap['recoveryRating'] = 'REC';

let transMap = new Map();
transMap['standardAttackRating'] = 'Attack';
transMap['specialAttackRating'] = 'Sp. Attack';
transMap['standardDefenseRating'] = 'Defense';
transMap['specialDefenseRating'] = 'Sp. Defense';
transMap['speedRating'] = 'Speed';
transMap['evasionRating'] = 'Evasion';
transMap['staminaRating'] = 'Stamina';
transMap['recoveryRating'] = 'Recovery';

transMap['standardAttackPoints'] = 'Standard Attack';
transMap['specialAttackPoints'] = 'Special Attack';
transMap['standardDefensePoints'] = 'Standard Defense';
transMap['specialDefensePoints'] = 'Special Defense';
transMap['speedPoints'] = 'Speed';
transMap['evasionPoints'] = 'Evasion';
transMap['staminaPoints'] = 'Stamina';
transMap['recoveryPoints'] = 'Recovery';


transMap["very low"] = "Very Low";
transMap["low"] = "Low";
transMap["medium"] = "Medium";
transMap["high"] = "High";
transMap["very high"] = "Very High";

let valMap = new Map();
valMap["very low"] = 1;
valMap["low"] = 2;
valMap["medium"] = 3;
valMap["high"] = 4;
valMap["very high"] = 5;


let duelRangeMap = new Map();
duelRangeMap["low"] = 1;
duelRangeMap["medium"] = 2;
duelRangeMap["high"] = 3;

export const duelStatRangeToVal = (val) => {
	return duelRangeMap[val];
};

export const statFieldToDescription = (val) => {
	return transMap[val];
};

export const statFieldToDescriptionCondensed = (val) => {
	return condensedTransMap[val];
};

export const statRangeToInteger = (val) => {
	return parseInt(valMap[val]);
};

export const statRangeToScaledVal = (val) => {
	return parseInt(valMap[val]) * 250;
};

export const statFieldToBarColor = (val) => {
	return statColorMap[val];
};

export const translateHeightString = (val) => {
	let split = val.split(' / ');
	let inches = split[0].replace(' in', '');
	let cm = split[1].replace(' cm', '');

	return translateToHeightStringInches(inches) + ' / ' + translateToHeightStringCentimeters(cm);
};

export const translateToHeightStringInches = (inches) => {
	var result = "";

	let feet = Math.floor(inches / 12);
	let remainderInches = Math.floor(inches % 12);
	
	if (feet > 0) {
	  result = result + `${feet}ft ${remainderInches}in`;
	} else {
	  result = result + `${inches}in`;
	}

	return result;
};

export const translateToHeightStringCentimeters = (cm) => {
	var result = "";

	let meters = Math.floor(cm / 100);
	let remainderCentimeters = Math.floor(cm % 100);
	
	if (meters > 0) {
	  result = result + `${meters}m ${remainderCentimeters}cm`;
	} else {
	  result = result + `${cm}cm`;
	}

	return result;
};

     



