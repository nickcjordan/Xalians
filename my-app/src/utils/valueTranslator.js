let statColorMap = new Map();
statColorMap['standardAttackRating'] = '#a84032';
statColorMap['specialAttackRating'] = '#753027';
statColorMap['standardDefenseRating'] = '#535dc2';
statColorMap['specialDefenseRating'] = '#494f8c';
statColorMap['speedRating'] = '#d0d466';
statColorMap['evasionRating'] = '#aaad53';
statColorMap['staminaRating'] = '#4bbf4e';
statColorMap['recoveryRating'] = '#479e4a';

statColorMap['standardAttackPoints'] = '#df9320be';
statColorMap['specialAttackPoints'] = '#b37519d0';
statColorMap['standardDefensePoints'] = '#70a5dbb7';
statColorMap['specialDefensePoints'] = '#2e73b8c2';
statColorMap['speedPoints'] = '#64b43cc2';
statColorMap['evasionPoints'] = '#4b862dc4';
statColorMap['staminaPoints'] = '#c04141c9';
statColorMap['recoveryPoints'] = '#8f1f1fc9';

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

transMap["low"] = "Low";
transMap["medium"] = "Medium";
transMap["high"] = "High";

let valMap = new Map();
valMap["low"] = 1;
valMap["medium"] = 2;
valMap["high"] = 3;

export const statFieldToDescription = (val) => {
	return transMap[val];
};

export const statFieldToDescriptionCondensed = (val) => {
	return condensedTransMap[val];
};

export const statRangeToInteger = (val) => {
	return valMap[val];
};

export const statRangeToScaledVal = (val) => {
	return parseInt(valMap[val]) * 250;
};

export const statFieldToBarColor = (val) => {
	return statColorMap[val];
};

