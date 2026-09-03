/*
	Expedition — interpretation tables.

	Owned by this game, not the creature registry, per docs/design/reclamation-design.md
	("The game bends to the creatures, never the reverse... What the game needs to know
	is registry fact, usable by any game"). These tables are read-only lenses over the
	creature record; nothing here is ever written back to a record.

	This is the SECOND Tribute design (the expedition game). It replaces the row game's
	engine at ../tribute/ entirely for this game's purposes, but that directory is left
	untouched as a reference implementation of the engine skeleton.
*/

import rawTypeEffectivenessMatrix from '../../json/typeEffectivenessMatrix.json';

// ---------------------------------------------------------------------------
// tunable constants — every one of these is a "first pass"/"first guess" number from
// the design doc, named so the simulator can tune them later without touching logic.
// ---------------------------------------------------------------------------

// Base hold = mean(vitality, resilience, endurance) / HOLD_DIVISOR (design doc: "a 0 to 20
// scale, typically 6 to 16").
export const HOLD_DIVISOR = 5;

// Hold is multiplied by this on the creature's origin world ("home ground").
export const HOME_GROUND_MULTIPLIER = 1.5;

// Strain halves hold and act magnitudes; severe strain (cannot breathe the site's medium
// at all) quarters them instead.
export const STRAIN_MULTIPLIER = 0.5;
export const SEVERE_STRAIN_MULTIPLIER = 0.25;

// Contact-strike thresholds (fraction of target's current hold): below STAGGER_FRACTION
// is shrugged, at least STAGGER_FRACTION but below ROUT_FRACTION is staggered, at least
// ROUT_FRACTION is routed. Armored creatures raise both.
export const STAGGER_FRACTION = 0.5;
export const ROUT_FRACTION = 1.0;
export const ARMORED_STAGGER_FRACTION = 0.75;
export const ARMORED_ROUT_FRACTION = 1.5;

// Roster economy and match structure.
export const SITES_TO_CLINCH = 5;
export const ROSTER_SIZE = 12;
export const SENDABLE = 10;
export const WORLDS_PER_MATCH = 3;
export const SITES_PER_WORLD = 3;

// ---------------------------------------------------------------------------
// the sixteen acts, grouped by what they touch ("The acts" section of the design doc)
// ---------------------------------------------------------------------------

export const ACT_CLASS = {
	CONTACT: 'contact',
	REACH: 'reach',
	PROJECTION: 'projection',
	SUPPORT: 'support',
};

// action -> class. `hold` (the creature does nothing) is handled specially by the rules
// engine and is not an "act" with a class of its own.
export const ACT_CLASS_BY_ACTION = {
	// contact — touches the site the creature stands at
	strike: ACT_CLASS.CONTACT,
	crush: ACT_CLASS.CONTACT,
	rake: ACT_CLASS.CONTACT,
	lash: ACT_CLASS.CONTACT,
	shove: ACT_CLASS.CONTACT,

	// reach — touches the site with a condition
	snare: ACT_CLASS.REACH,
	drain: ACT_CLASS.REACH,
	ambush: ACT_CLASS.REACH,

	// projection — reaches any site on the world
	beam: ACT_CLASS.PROJECTION,
	hurl: ACT_CLASS.PROJECTION,
	burst: ACT_CLASS.PROJECTION,
	spray: ACT_CLASS.PROJECTION,
	cloud: ACT_CLASS.PROJECTION,

	// support — touches allies
	ward: ACT_CLASS.SUPPORT,
	mend: ACT_CLASS.SUPPORT,
	terrorize: ACT_CLASS.SUPPORT,
};

export const ALL_ACTIONS = Object.keys(ACT_CLASS_BY_ACTION);

// the "every creature at one site, both sides" projection acts
export const AREA_ACTIONS = ['burst', 'spray', 'cloud'];

// simple strikes governed by the stagger/rout threshold rules (contact strikes plus the
// projection/reach strikes: beam, hurl, drain act as strikes for threshold purposes)
export const STRIKE_ACTIONS = ['strike', 'crush', 'rake', 'lash', 'beam', 'hurl', 'drain'];

export function getActClass(action) {
	if (!action) {
		return null;
	}
	const key = String(action).toLowerCase();
	return Object.prototype.hasOwnProperty.call(ACT_CLASS_BY_ACTION, key) ? ACT_CLASS_BY_ACTION[key] : null;
}

// ---------------------------------------------------------------------------
// governing attribute per action (reused convention from the first design's table,
// extended for this design's action list — same attribute families: strength for hard
// contact, agility/reflex for quick or evasive acts, instinct for ambush/beam precision,
// endurance for sustained area effects, vitality for drain, willpower/intelligence/
// charisma for support acts)
// ---------------------------------------------------------------------------

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

export function getGoverningAttributeForAction(action) {
	if (!action) {
		return null;
	}
	const key = String(action).toLowerCase();
	return Object.prototype.hasOwnProperty.call(GOVERNING_ATTRIBUTE_BY_ACTION, key)
		? GOVERNING_ATTRIBUTE_BY_ACTION[key]
		: null;
}

// ---------------------------------------------------------------------------
// favored act per archetype — the design doc does not spell this table out (it only
// says "the one its archetype prefers"), so this is a first pass, documented here:
// attacking archetypes favor their strongest available contact or projection act
// (whichever the creature actually has and hits hardest with), bulwark/stalwart favor
// warding their most vulnerable ally, sage/seeker favor mending since they are framed as
// the support-flavored knowledge archetypes, survivor favors holding (its own conduct
// line is "itself" defensively, so doing nothing and keeping full hold is the fit),
// skirmisher/runner favor their fastest available strike (agility-flavored: lash/rake),
// rogue favors whatever act can rout its chosen target, virtuoso/sovereign favor their
// single hardest-hitting act of any class. This is resolved per-creature at
// creatureOnTable.prepare() time against the creature's actual ability list — this table
// only says which *class* (or specific action, where the archetype is that specific) to
// prefer when more than one qualifies.
// ---------------------------------------------------------------------------

export const FAVORED_ACT_BY_ARCHETYPE = {
	predator: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT, ACT_CLASS.PROJECTION] },
	prowler: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT, ACT_CLASS.PROJECTION] },
	juggernaut: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT] },
	berserker: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT] },
	vanguard: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT, ACT_CLASS.PROJECTION] },
	balanced: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT, ACT_CLASS.PROJECTION] },
	bulwark: { prefer: 'specificAction', action: 'ward' },
	stalwart: { prefer: 'specificAction', action: 'ward' },
	survivor: { prefer: 'hold' },
	skirmisher: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT], actionPriority: ['lash', 'rake'] },
	runner: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT], actionPriority: ['lash', 'rake'] },
	seeker: { prefer: 'specificAction', action: 'mend' },
	sage: { prefer: 'specificAction', action: 'mend' },
	virtuoso: { prefer: 'strongestOverall' },
	sovereign: { prefer: 'strongestOverall' },
	rogue: { prefer: 'strongestOverall' },
};

export function getFavoredActSpec(archetypeKey) {
	if (!archetypeKey) {
		return null;
	}
	const key = String(archetypeKey).toLowerCase();
	return Object.prototype.hasOwnProperty.call(FAVORED_ACT_BY_ARCHETYPE, key)
		? FAVORED_ACT_BY_ARCHETYPE[key]
		: null;
}

// ---------------------------------------------------------------------------
// conduct: whom a creature chooses, per archetype ("Conduct: whom a creature chooses")
// ---------------------------------------------------------------------------

export const CONDUCT_BY_ARCHETYPE = {
	predator: { attacking: 'weakestEnemyInReach', supporting: 'allyWithLeastHold' },
	prowler: { attacking: 'weakestEnemyInReach', supporting: 'allyWithLeastHold' },
	juggernaut: { attacking: 'strongestEnemyInReach', supporting: 'allyWithMostHold' },
	berserker: { attacking: 'strongestEnemyInReach', supporting: 'allyWithMostHold' },
	vanguard: { attacking: 'enemySentEarliest', supporting: 'allySentEarliest' },
	balanced: { attacking: 'enemySentEarliest', supporting: 'allySentEarliest' },
	bulwark: { attacking: 'enemyThreateningWeakestAlly', supporting: 'allyWithLeastHold' },
	stalwart: { attacking: 'enemyThreateningWeakestAlly', supporting: 'allyWithLeastHold' },
	survivor: { attacking: 'enemyWithLowestMagnitude', supporting: 'self' },
	skirmisher: { attacking: 'slowerEnemyWeakestFirst', supporting: 'fastestAlly' },
	runner: { attacking: 'slowerEnemyWeakestFirst', supporting: 'fastestAlly' },
	seeker: { attacking: 'enemyMostVulnerableToElement', supporting: 'allyMostVulnerablePresent' },
	sage: { attacking: 'enemyMostVulnerableToElement', supporting: 'allyMostVulnerablePresent' },
	virtuoso: { attacking: 'enemyWithHighestMagnitude', supporting: 'allyWithHighestMagnitude' },
	sovereign: { attacking: 'enemyWithHighestMagnitude', supporting: 'allyWithHighestMagnitude' },
	rogue: { attacking: 'enemyRoutableElseWeakest', supporting: 'allyWithHighestMagnitude' },
};

export function getConductSpec(archetypeKey) {
	if (!archetypeKey) {
		return null;
	}
	const key = String(archetypeKey).toLowerCase();
	return Object.prototype.hasOwnProperty.call(CONDUCT_BY_ARCHETYPE, key)
		? CONDUCT_BY_ARCHETYPE[key]
		: null;
}

// ---------------------------------------------------------------------------
// temperament refinement thresholds — "high"/"low" per the design doc's conduct
// refinement paragraph. First pass: symmetric bands around the neutral midpoint (the
// provisional roller's NEUTRAL_BAND is [30, 70], so 65/35 sit just outside it).
// ---------------------------------------------------------------------------

export const TEMPERAMENT_HIGH_THRESHOLD = 65;
export const TEMPERAMENT_LOW_THRESHOLD = 35;

// ---------------------------------------------------------------------------
// traits with fixed meanings (design doc, end of "Conduct" section)
// ---------------------------------------------------------------------------

export const TRAIT = {
	PACK_BONDED: 'pack-bonded',
	SOLITARY: 'solitary',
	MENACING: 'menacing',
	ARMORED: 'armored',
	ANCHORED: 'anchored',
	RESILIENT: 'resilient',
	STEALTHY: 'stealthy',
	NOCTURNAL: 'nocturnal',
	LUMINOUS: 'luminous',
};

export const PACK_BOND_HOLD_BONUS_PER_KIN = 1;
export const SOLITARY_HOLD_PENALTY_PER_ALLY = 1;

// ---------------------------------------------------------------------------
// type effectiveness matrix — same normalization strategy as the first design
// (tribute/tributeInterpretation.js): lowercase both axes since creature records use
// lowercase element strings while the source JSON is capitalized.
// ---------------------------------------------------------------------------

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
