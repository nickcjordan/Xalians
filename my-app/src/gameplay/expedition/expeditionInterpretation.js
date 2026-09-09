/*
	Expedition - interpretation tables.

	Owned by this game, not the creature registry, per docs/design/reclamation-design.md
	("The game bends to the creatures, never the reverse... What the game needs to know
	is registry fact, usable by any game"). These tables are read-only lenses over the
	creature record; nothing here is ever written back to a record.

	Rewritten 2026-09-09 for the base redesign (docs/design/reclamation-base-redesign.md).
	The Orders phase, the sixteen acts as player choices, the stagger/rout thresholds and
	the cross-world projection reach are gone (assumptions 1, 3, 5, 10, 15). What is left
	is the four roles, the blow arithmetic, and the levers the simulator sweeps. Every
	tunable below is ALSO an entry in expeditionRules.DEFAULT_RULES, so a batch can move
	it without editing this file (assumption 15).
*/

import rawTypeEffectivenessMatrix from '../../json/typeEffectivenessMatrix.json';

// ---------------------------------------------------------------------------
// tunable constants - the "first settings" from the base redesign's interpretation
// layer table. Each has a matching key in DEFAULT_RULES.
// ---------------------------------------------------------------------------

/*
	Hold compression (assumption 11). The registry's attribute range is 1 to 99 (the
	generator clamps every attribute there, my-app/src/gameplay/generator/generate.js),
	so the raw mean of vitality/resilience/endurance is read against a 0 to 100 scale and
	mapped onto [HOLD_FLOOR, HOLD_CEILING]:

		hold = HOLD_FLOOR + (raw - RAW_ATTRIBUTE_MIN) * (HOLD_CEILING - HOLD_FLOOR)
		                    / (RAW_ATTRIBUTE_MAX - RAW_ATTRIBUTE_MIN)

	A higher floor compresses the spread; a floor of 0 leaves the species spread exactly
	as the records make it. Measured 2026-09-09 over 1200 generated creatures, the species
	mean raw runs 29.6 (tizzie) to 78.0 (yetimoth), so an uncompressed floor gives a
	2.63:1 species mean hold spread, not the 4:1 the design doc estimated. The first
	setting below targets the doc's 2:1 and measures 1.95:1 over the pool.

	Set 2026-09-09 by the sweep in Measurement step 2 (200 matches, seed 7, at the
	ratified magnitude scale). Floor/ceiling pairs giving 4:1, 3:1, 2:1 and 1.5:1 species
	spread moved the match shape (comeback 26.9, 24.2, 28.3, 27.5 percent; decided after
	round 1 44.0, 49.5, 40.5, 40.5 percent) and 2:1 was the best of the four on both.
	FRICTION: the sweep did NOT move the gauge the design doc names for this lever. The
	species keep rate stayed at 21 of 29 species outside the 30 to 90 percent band at every
	setting, because botDraft ranks creatures by mean hold and the compression is a
	monotone affine map of hold, which cannot change a ranking. Compression alone can never
	move the draft keep rate; moving it needs a change in what the draft values.
*/
export const RAW_ATTRIBUTE_MIN = 0;
export const RAW_ATTRIBUTE_MAX = 100;
export const HOLD_FLOOR = 2.8;
export const HOLD_CEILING = 17.6;

// Hold is multiplied by this on the creature's origin world ("home ground").
export const HOME_GROUND_MULTIPLIER = 1.5;

// Strain halves hold and blow magnitudes; severe strain (cannot breathe the site's
// medium at all) quarters them instead. Bolster lifts a creature one grade up this
// ladder (assumption 8).
export const STRAIN_MULTIPLIER = 0.5;
export const SEVERE_STRAIN_MULTIPLIER = 0.25;

/*
	Magnitude scale (assumption 12): every blow's printed magnitude is multiplied by this
	before it is subtracted from a hold, so "a typical strike takes about a third of a
	typical hold" is one number rather than a rewrite of the magnitude formula.

	Set 2026-09-09 by the sweep in docs/design/reclamation-base-redesign.md's Measurement
	step 3 (200 matches, seed 7): 0.55 gave 2.0 routs per match, 0.8 gave 3.1, 1.1 gave
	4.1, 1.5 gave 5.0, 2.0 gave 5.8. The gauge is 3 to 5 routs per match, so 1.1 sits in
	the middle of the band. The companion gauge (resolution changes the leader at 25 to 40
	percent of worlds) is NOT met at any setting: it reaches 23.5 percent only at 2.5,
	where routs are already half again over the band.
*/
export const MAGNITUDE_SCALE = 1.1;

// An area blow removes this share of a strike's magnitude, from every OTHER creature at
// the world, both sides (assumption 5).
export const AREA_DISCOUNT = 0.6;

// Bolster's floor (assumption 8): an ally already comfortable gains this much hold,
// since there is no strain grade left to lift it out of.
export const BOLSTER_FLOOR = 1;

// Hidden first (assumption 9): a hidden creature's blow lands before all others at its
// world, in initiative order among the hidden.
export const HIDDEN_FIRST = true;

// Armored (the base, "Traits that remain"): blows against an armored creature are
// reduced by this fraction.
export const ARMORED_REDUCTION = 0.25;

/*
	Shield pricing. A cancel of any size, free, measured as the strongest thing a creature
	can be (shield keeper win rate 67.7 percent against the 40 to 60 fairness band, and
	the always-presence-first policy within five points of the proctor, validation
	2026-09-09). SHIELD_CAP is the lever that prices it; see expeditionRules.resolveWorld's
	shield step for what each setting does.
*/
export const SHIELD_CAPS = ['none', 'ownHold', 'half'];
/*
	Set 2026-09-09 (200 matches, simulator seed 11, validation seed 7). Shield keeper win
	rate: 'none' 67.7 percent, 'ownHold' 63.7, 'half' 59.0 - only 'half' is inside the 40
	to 60 fairness band. Always-presence-first against the proctor: 45.5, 48.5, 43.0, so
	'half' is also the setting where leading with the presences is worth least.
*/
export const SHIELD_CAP = 'half';

// A blow-role creature with no attacking ability at all still strikes, at the pool's
// minimum printed magnitude (magnitudeOf floors at 1). The simulator counts how often
// this fallback fires.
export const MIN_BLOW_MAGNITUDE = 1;

// Roster economy and match structure. A match is FRAMES_PER_MATCH rounds; each round
// the Court's frame loads WORLDS_PER_FRAME worlds side by side, every world at one of its
// sites, drawn so no world repeats within a match (docs/design/reclamation-design.md,
// "The Proving", 2026-09-04). SITES_TO_CLINCH counts worlds held: five of the nine.
export const SITES_TO_CLINCH = 5;
export const ROSTER_SIZE = 12;
export const SENDABLE = 10;
export const FRAMES_PER_MATCH = 3;
export const WORLDS_PER_FRAME = 3;
// distinct worlds a match draws from the fourteen
export const WORLDS_PER_MATCH = FRAMES_PER_MATCH * WORLDS_PER_FRAME;
// every authored world carries this many sites; the frame loads one of them
export const SITES_PER_WORLD = 3;

// Trailing-seat compensation, Pass 2's roster-economy lever (docs/design/
// reclamation-play-enhancements.md "Pass 2 levers"): the side holding fewer worlds after a
// round gets this many extra sends (SENDABLE + ROSTER_TRAILING_BONUS) for the very next
// round only.
export const ROSTER_TRAILING_BONUS = 1;

// The Loki line (docs/design/reclamation-play-enhancements.md "Pass 2 levers"): a creature
// withdrawn from a LOST world (not a tie) returns to its handler's roster and may be sent
// again this match, but its next send counts RETURNED_SEND_COST against SENDABLE.
export const RETURNED_SEND_COST = 2;

// ---------------------------------------------------------------------------
// the four roles (assumption 4)
// ---------------------------------------------------------------------------

export const ROLE = {
	STRIKE: 'strike',
	AREA: 'area',
	BOLSTER: 'bolster',
	SHIELD: 'shield',
	// what a creature degrades to when its role is switched off by rules.roles: a plain
	// holder, present at the world and counted in its hold, doing nothing else.
	NONE: 'none',
};

/*
	Presence archetypes and their default presence, per assumption 4: "survivor, bulwark,
	stalwart, sage are presences (bolster or shield by their abilities and element)".
	Between bolster and shield the ruling is shield for bulwark and stalwart (both are
	framed as the creatures that stand in front of something) and bolster for survivor and
	sage (both are framed as the creatures that keep others going). See roleOf() in
	creatureOnTable.js for the one case that overrides this table.
*/
export const PRESENCE_BY_ARCHETYPE = {
	bulwark: ROLE.SHIELD,
	stalwart: ROLE.SHIELD,
	survivor: ROLE.BOLSTER,
	sage: ROLE.BOLSTER,
};

// ---------------------------------------------------------------------------
// the ability vocabulary the registry writes, grouped by what it touches. Nothing in
// the game lets a player choose among these any more (assumption 1): the tables survive
// only because magnitude derivation and role assignment read them - the class decides
// which of a creature's abilities can be its blow, the action decides the governing
// attribute, and AREA_ABILITY_ACTIONS decides whether a blow creature is an area.
// ---------------------------------------------------------------------------

export const ACT_CLASS = {
	CONTACT: 'contact',
	REACH: 'reach',
	PROJECTION: 'projection',
	SUPPORT: 'support',
};

export const ACT_CLASS_BY_ACTION = {
	// contact - touches the site the creature stands at
	strike: ACT_CLASS.CONTACT,
	crush: ACT_CLASS.CONTACT,
	rake: ACT_CLASS.CONTACT,
	lash: ACT_CLASS.CONTACT,
	shove: ACT_CLASS.CONTACT,

	// reach - touches the site with a condition
	snare: ACT_CLASS.REACH,
	drain: ACT_CLASS.REACH,
	ambush: ACT_CLASS.REACH,

	// projection - since assumption 3 (sealed worlds) these reach no further than
	// contact does; the class is kept only because favoredAct's archetype table names it
	beam: ACT_CLASS.PROJECTION,
	hurl: ACT_CLASS.PROJECTION,
	burst: ACT_CLASS.PROJECTION,
	spray: ACT_CLASS.PROJECTION,
	cloud: ACT_CLASS.PROJECTION,

	// support - never a blow
	ward: ACT_CLASS.SUPPORT,
	mend: ACT_CLASS.SUPPORT,
	terrorize: ACT_CLASS.SUPPORT,
};

// carrying one of these makes a blow creature an AREA rather than a STRIKE (assumption 4)
export const AREA_ABILITY_ACTIONS = ['burst', 'spray', 'cloud'];

// the two support abilities that override the archetype's default presence (see roleOf)
export const WARD_ABILITY_ACTION = 'ward';
export const MEND_ABILITY_ACTION = 'mend';

export function getActClass(action) {
	if (!action) {
		return null;
	}
	const key = String(action).toLowerCase();
	return Object.prototype.hasOwnProperty.call(ACT_CLASS_BY_ACTION, key) ? ACT_CLASS_BY_ACTION[key] : null;
}

// ---------------------------------------------------------------------------
// governing attribute per action - the magnitude formula's second term
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
// favored act per archetype - since assumption 1 nobody gives orders, so this table no
// longer decides what a creature does; it decides WHICH of a blow creature's abilities
// is the one blow it throws (creatureOnTable.blowActOf). Support-favoring rows still
// exist because a blow creature can have an archetype that prefers a support act it does
// not own, and the fallback path has to be written down somewhere.
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
// conduct: whom a creature chooses ("Conduct: whom a creature chooses"). Unchanged by
// the base redesign except that every line now reads only the creature's OWN world
// (assumption 2 keeps conduct derived and assumption 3 seals the worlds).
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
// temperament refinement thresholds - "high"/"low" per the design doc's conduct
// refinement paragraph.
// ---------------------------------------------------------------------------

export const TEMPERAMENT_HIGH_THRESHOLD = 65;
export const TEMPERAMENT_LOW_THRESHOLD = 35;

// ---------------------------------------------------------------------------
// traits with fixed meanings. `anchored` is cut from the base (assumption 10) and is no
// longer read by the engine; it stays out of this table so nothing can quietly revive it.
// ---------------------------------------------------------------------------

export const TRAIT = {
	PACK_BONDED: 'pack-bonded',
	SOLITARY: 'solitary',
	MENACING: 'menacing',
	ARMORED: 'armored',
	RESILIENT: 'resilient',
	STEALTHY: 'stealthy',
	NOCTURNAL: 'nocturnal',
	LUMINOUS: 'luminous',
};

export const PACK_BOND_HOLD_BONUS_PER_KIN = 1;
export const SOLITARY_HOLD_PENALTY_PER_ALLY = 1;

// ---------------------------------------------------------------------------
// type effectiveness matrix - lowercase both axes since creature records use lowercase
// element strings while the source JSON is capitalized.
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
