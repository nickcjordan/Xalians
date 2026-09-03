/*
	Tribute — interpretation tables.

	Owned by this game, not the creature registry. Per docs/design/tribute-design.md,
	these tables (range class per action, governing attribute per action, the provisional
	Decree set) are "provisional interpretation data owned by this game, pending registry
	delivery-class tags on instrument-action pairs" (Assumption #4). They are read-only
	lenses over the creature record; nothing here is ever written back to a record.
*/

// Plain static JSON import: Vite (and Vitest) handle this natively and it keeps this core
// engine file free of any Node-only API. Plain `node` cannot load a bare JSON import, so
// devtools/runNode.cjs bundles this package with esbuild before running a devtools
// script such as the simulator. See its header comment.
import rawTypeEffectivenessMatrix from '../../json/typeEffectivenessMatrix.json';

// Row a range class grants. Support grants no row by itself (see design doc's table);
// every creature is separately always Close-eligible via the bare-body fallback,
// handled in tributeCardBuilder.js, not here.
export const ROW = {
	CLOSE: 'close',
	MID: 'mid',
	FAR: 'far',
};

// action -> range class -> row granted. `null` means the action grants no row by itself
// (support actions are usable from wherever the creature already stands).
export const RANGE_CLASS_BY_ACTION = {
	// contact
	strike: ROW.CLOSE,
	crush: ROW.CLOSE,
	rake: ROW.CLOSE,
	shove: ROW.CLOSE,

	// reach
	lash: ROW.MID,
	snare: ROW.MID,
	drain: ROW.MID,
	ambush: ROW.MID,

	// projection
	beam: ROW.FAR,
	hurl: ROW.FAR,
	spray: ROW.FAR,
	burst: ROW.FAR,
	cloud: ROW.FAR,

	// support - grants no row
	ward: null,
	mend: null,
	terrorize: null,
};

// action -> governing attribute, per the design doc's table.
export const GOVERNING_ATTRIBUTE_BY_ACTION = {
	strike: 'strength',
	crush: 'strength',
	shove: 'strength',
	hurl: 'strength',

	lash: 'agility',
	rake: 'agility',

	snare: 'reflex',

	ambush: 'instinct',
	beam: 'instinct',

	spray: 'endurance',
	burst: 'endurance',
	cloud: 'endurance',

	drain: 'vitality',

	ward: 'willpower',

	mend: 'intelligence',

	terrorize: 'charisma',
};

// The provisional legal Decree set (design doc "Decrees" section): six elements picked
// as an analytic first guess, named from planet lore. Keyed by lowercase element (record
// shape), since Tribute reads creature elements which are lowercase.
export const DECREES = [
	{ element: 'psychic', name: 'Telypso Dreamwake' },
	{ element: 'rock', name: 'Stonera Jorian Rain' },
	{ element: 'water', name: 'Poseidas Death Tide' },
	{ element: 'air', name: 'Saiphus Benthane Gale' },
	{ element: 'ice', name: 'Krystos Whiteout' },
	{ element: 'electric', name: 'Zolton Bloodstorm' },
];

export const LEGAL_DECREE_ELEMENTS = DECREES.map((d) => d.element);

function capitalizeElement(element) {
	if (!element) {
		return element;
	}
	return element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
}

// The 14x14 type effectiveness matrix, normalized to lowercase element keys on both axes
// (the source JSON at my-app/src/json/typeEffectivenessMatrix.json uses capitalized
// element names - {AttackerElement: {DefenderElement: multiplier}} - while creature
// records use lowercase element strings throughout).
export const TYPE_EFFECTIVENESS_MATRIX = (() => {
	const normalized = {};
	Object.keys(rawTypeEffectivenessMatrix).forEach((attackerKey) => {
		const attackerLower = attackerKey.toLowerCase();
		const row = rawTypeEffectivenessMatrix[attackerKey];
		normalized[attackerLower] = {};
		Object.keys(row).forEach((defenderKey) => {
			normalized[attackerLower][defenderKey.toLowerCase()] = row[defenderKey];
		});
	});
	return normalized;
})();

// Looks up attacker -> defender multiplier. Returns 1 (neutral) if either element is
// unknown to the matrix, rather than throwing - the matrix is trusted data but this keeps
// callers simple.
export function typeEffectivenessMultiplier(attackerElement, defenderElement) {
	try {
		const row = TYPE_EFFECTIVENESS_MATRIX[String(attackerElement).toLowerCase()];
		if (!row) {
			return 1;
		}
		const value = row[String(defenderElement).toLowerCase()];
		return typeof value === 'number' ? value : 1;
	} catch (e) {
		return 1;
	}
}

export function getRangeClassForAction(action) {
	if (!action) {
		return null;
	}
	const key = String(action).toLowerCase();
	return Object.prototype.hasOwnProperty.call(RANGE_CLASS_BY_ACTION, key)
		? RANGE_CLASS_BY_ACTION[key]
		: null;
}

export function getGoverningAttributeForAction(action) {
	if (!action) {
		return null;
	}
	const key = String(action).toLowerCase();
	return Object.prototype.hasOwnProperty.call(GOVERNING_ATTRIBUTE_BY_ACTION, key)
		? GOVERNING_ATTRIBUTE_BY_ACTION[key]
		: null;
}

export { capitalizeElement };
