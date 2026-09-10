const statLevelConstants = require('../constants/statLevelConstants.js');

module.exports = {
    statValueToObject: statValueToObject
}

function statValueToObject(val) {
	// console.log('val=' + val);
	if (val) {
		let levels = statLevelConstants.levels;
		var selected = null;
		Object.values(levels).forEach((v) => {
			if (val == Number.parseInt(v.pointValue) || val == v.displayText.toLowerCase() || val == v.displayText) {
				selected = v;
				// console.log('SELECTED: ' + JSON.stringify(selected));
			}
		});
		return selected;
	}
}