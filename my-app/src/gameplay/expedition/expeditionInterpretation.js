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

import rawTypeEffectivenessMatrix from '@xalians/content/typeEffectivenessMatrix.json';

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

// A sweep removes this share of a strike's power, from every OTHER creature at the
// world, both sides (assumption 5). The role was called "area" until Pass 2's vocabulary
// ruling renamed it (assumption 17's table, "the area role becomes sweep").
export const SWEEP_DISCOUNT = 0.6;

// Bolster's floor (assumption 8): an ally already comfortable gains this much hold,
// since there is no strain grade left to lift it out of.
export const BOLSTER_FLOOR = 1;

/*
	Pass 2, "every attribute a job" (docs/design/reclamation-base-redesign.md assumption
	17). Five of the record's ten attributes were read by the engine and five were not, so
	a creature built on the unread half was weak by construction. Each constant below is
	the threshold or scale of one attribute's job, and each has a matching key in
	DEFAULT_RULES so the simulator can ablate it.
*/

// willpower: at or above this the creature suffers one grade less strain, applied before
// bolster and never pushing past comfortable.
export const WILLFUL_THRESHOLD = 65;

/*
	charisma: presences scale by 0.5 + charisma/100, so a creature of charisma 50 plays a
	presence exactly as it did before this pass, 100 plays it half again as strong and 0
	plays it at half. It multiplies a bolster's grade lift, its floor and its recovery, and
	a shield's cancelled fraction (which is clamped at 1: a shield can never cancel more
	than the whole attack).
*/
export const PRESENCE_SCALE_FLOOR = 0.5;
export const PRESENCE_SCALE_PER_POINT = 0.01;

export function presenceScaleOf(record, rules) {
	if (rules && rules.presenceScale === false) {
		return 1;
	}
	const attrs = (record && record.attributes) || {};
	const charisma = typeof attrs.charisma === 'number' ? attrs.charisma : 50;
	return PRESENCE_SCALE_FLOOR + charisma * PRESENCE_SCALE_PER_POINT;
}

/*
	instinct: targeting. At or above KEEN_INSTINCT a creature picks the enemy it can down
	with this attack, and failing that the enemy it takes the most off (after matchup); at
	or below DULL_INSTINCT it simply hits whatever was sent earliest; in between it follows
	its archetype's conduct line as it always has.
*/
export const KEEN_INSTINCT = 65;
export const DULL_INSTINCT = 35;

// 'keen' | 'conduct' | 'dull' - which targeting lane a creature reads its target from.
// One definition, read by the engine's own pick and by the bot's preview of it, so the
// two can never disagree about who a creature would hit.
export function instinctLaneOf(record, rules) {
	if (rules && rules.instinctLanes === false) {
		return 'conduct';
	}
	const attrs = (record && record.attributes) || {};
	const instinct = typeof attrs.instinct === 'number' ? attrs.instinct : 50;
	const keen = rules && typeof rules.keenInstinct === 'number' ? rules.keenInstinct : KEEN_INSTINCT;
	const dull = rules && typeof rules.dullInstinct === 'number' ? rules.dullInstinct : DULL_INSTINCT;
	if (instinct >= keen) {
		return 'keen';
	}
	if (instinct <= dull) {
		return 'dull';
	}
	return 'conduct';
}

/*
	agility + reflex: speed. At or above this a creature is `swift` and may move once per
	round during Deploy (assumption 20, which replaced the vanguard fall-back).

	Set 2026-09-09 by a sweep over 65, 75 and 85 (200 matches, simulator seed 11,
	validation seed 7). Swift moves per match 4.67, 2.54, 0.80; share flipping a losing
	world 16.5, 17.1, 10.1 percent; round-one starter win rate 45.0, 42.5, 44.5; side A
	47.0, 45.5, 45.5; proctor mirror 52.5, 45.5, 51.0. 65 is the setting whose starter win
	rate sits closest to even while the move still fires several times a match; 85 drops it
	under once a match, which is a rule the table would rarely see. FRICTION: all three
	starter readings sit inside one another's intervals (+/- 6.9), so this pick is made on
	the point estimate and the move's frequency, not on a resolved difference.
*/
export const SWIFT_SPEED = 65;

// assumption 18: an attack lands scaled by the attacker's remaining share of its hold, so
// hitting first shapes every exchange.
export const HURT_ATTACKS_LESS = true;

/*
	assumption 19: at the Ruling, each ally at a bolster's world recovers this share of the
	damage it took this round, times the bolsterer's presence scale.

	Set 2026-09-09 by a sweep over 0.5, 0.75 and 1.0 (200 matches, simulator seed 11,
	validation seed 7, at swiftSpeed 65). Hold recovered per bolster send 0.61, 0.92, 1.19;
	bolster keeper win rate 46.6 / 47.2 / 47.2 in the draft and 48.9 / 53.6 / 57.0 in the
	simulator; always-presence-first against the proctor mirror 41.0 against 51.0, 43.5
	against 50.5, and 42.0 against 46.5. Every setting keeps bolster inside the 40 to 60
	band, so the binding gauge is the naive policy: leading with the presences is 10.0
	points behind the mirror at 0.5, 7.0 at 0.75 and 4.5 at 1.0, where the tool flags the
	deploy decisions as possibly decorative. 0.5 is the largest setting that clears the
	eight-point bar.
*/
export const BOLSTER_RECOVERY = 0.5;

// Hidden first (assumption 9): a hidden creature's blow lands before all others at its
// world, in initiative order among the hidden.
export const HIDDEN_FIRST = true;

/*
	PASS 3: THE PRICE OF HIDING (docs/design/reclamation-base-redesign.md assumption 21).

	Pass 2 measured always-hidden at 46.5 percent against a 51.0 proctor mirror, four and
	a half points under it, against an eight-point bar. Hidden-first plus
	hurt-attacks-for-less is a strong pair: the hidden creature lands first and unhurt, and
	every reply is already scaled down. Three variants price it, each a rules key so the
	sweep can read them alone and in combination:

	- HIDDEN_SEND_COST: what a hidden send costs against the round's sendable cap, charged
	  exactly the way RETURNED_SEND_COST is (see expeditionRules.sendCostFor). 1 is free,
	  the pass 2 setting; 2 makes hiding cost a send.
	- HIDDEN_FIRST_NEEDS_COMPANY: when true a hidden creature's attack only lands first if
	  another creature of its own side stands at that world, so hiding is a coordinated
	  play rather than a solo ambush.
	- HIDDEN_POWER: the multiplier on an attack thrown from hiding.

	Set 2026-09-10 by a sweep over all eight combinations, 200 matches on each of seeds 7,
	13 and 21. Always-hidden's gap under the proctor mirror, by seed:

		baseline (free, always first, full power)  7.5 / 4.5 / 1.5   hidden rate 6.0 / 3.4 / 3.3
		a  cost 2                                 19.5 / 22.5 / 10.5 hidden rate 7.0 / 5.1 / 4.7
		b  needs company                           8.0 / 0.0 / 2.5   hidden rate 9.3 / 6.7 / 6.7
		c  power 0.75                             11.0 / 4.0 / 3.5   hidden rate 9.1 / 6.0 / 6.0
		a+b                                       31.5 / 23.0 / 16.5 hidden rate 3.2 / 2.1 / 2.6
		a+c                                       20.0 / 22.0 / 17.0 hidden rate 7.8 / 6.2 / 5.9
		b+c                                        9.5 / 4.5 / 6.0   hidden rate 8.7 / 6.5 / 6.1
		a+b+c                                     33.0 / 23.5 / 23.0 hidden rate 2.7 / 2.0 / 2.0

	The gauge is an eight-point gap on all three seeds, a hidden send rate still between 5
	and 15 percent, and the broker's hidden rate still above the proctor's. Neither b nor c
	alone reaches the gap on any seed but the first; a alone reaches it everywhere but
	leaves the hidden rate at 4.7 percent on seed 21, three tenths under the band; anything
	carrying b prices hiding out of the game altogether (2 to 3 percent). a+c is the
	smallest combination that meets all three gauges on all three seeds, and is the setting
	below. The broker stays above the proctor on every one of them (+5.4 / +4.1 / +4.3).

	OVERRIDABLE (levers, not stone): a alone misses the rate band by 0.3 points on one seed,
	which is inside the noise of 200 matches. If Nick wants one lever rather than two, set
	hiddenPower back to 1 and the game keeps a 19.5 / 22.5 / 10.5 gap.
*/
export const HIDDEN_SEND_COST = 2;
export const HIDDEN_FIRST_NEEDS_COMPANY = false;
export const HIDDEN_POWER = 0.75;

/*
	PASS 3: THE STAKE (assumption 22). A comeback avenue as a chosen risk, never a gift.
	Before Deploy in any round each handler may stake one of the round's worlds, once per
	Proving: it counts STAKE_SITE_VALUE toward the Charter for whoever holds it at the
	Ruling, and STAKE_BOTH_VALUE when both handlers staked the same world. A tie counts
	nothing, as a tied world always has.
*/
export const STAKE_ENABLED = true;
export const STAKE_SITE_VALUE = 2;
export const STAKE_BOTH_VALUE = 3;

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

/*
	PASS 3: THE DRAFT'S SHAPE (assumption 23). Seventeen of twenty-nine species sat outside
	the 30 to 90 percent keep band because a keep of twelve from eighteen by total order
	always cuts the same bottom third. Two levers, both rules keys so the sweep can read
	them alone and together:

	- DRAFT_POOL_SIZE: how many creatures each side is dealt before keeping ROSTER_SIZE.
	  A smaller pool cuts less, so more of what is dealt survives.
	- DRAFT_DISTINCT_SPECIES: deal a species-distinct pool, so no species is dealt twice
	  to the same handler and the keep cannot be a run of the same best species.

	Set 2026-09-10 by the variant sweep (200 matches, seed 7). Species outside the 30 to 90
	keep band: eighteen-and-deal-as-dealt 17 (five under 30, twelve over 90), fifteen 17
	(one under 30, sixteen over 90), the distinct deal 17 (five under, twelve over), both
	together 20. FRICTION: none of the three reaches the "10 or under" gauge, and the
	arithmetic says none can. The mean keep rate is ROSTER_SIZE / poolSize by construction -
	66.7 percent at eighteen, 80 percent at fifteen - so a smaller pool moves the whole
	distribution toward the top of the band as fast as it lifts its floor. The band needs
	the SPREAD of the ratings narrowed, which is a change to what the draft values, not to
	how many creatures it is dealt.

	Fifteen is chosen as the best of the three on the readings that are not arithmetic:
	dead species fall from five to one, the one dominant species (luceras, kept above 80
	with its keeper winning above 60) disappears, and every role's keeper win rate stays
	inside the 40 to 60 fairness band (bolster 48.6, shield 49.8, strike 51.1, sweep 49.2).
	The distinct deal removes the dominant species too but leaves all five dead ones, and
	both levers together are worse than either alone.
*/
export const DRAFT_POOL_SIZE = 15;
export const DRAFT_DISTINCT_SPECIES = false;

// Trailing-seat compensation, Pass 2's roster-economy lever (docs/design/
// reclamation-play-enhancements.md "Pass 2 levers"): the side holding fewer worlds after a
// round gets this many extra sends (SENDABLE + ROSTER_TRAILING_BONUS) for the very next
// round only.
// Cut by assumption 20 ("no gifts to the losing side"): the default is 0 sends, and the
// constant survives only so an ablation row can put the catch-up send back and measure
// what removing it cost.
export const ROSTER_TRAILING_BONUS = 0;

// The Loki line (docs/design/reclamation-play-enhancements.md "Pass 2 levers"): a creature
// withdrawn from a LOST world (not a tie) returns to its handler's roster and may be sent
// again this match, but its next send counts RETURNED_SEND_COST against SENDABLE.
export const RETURNED_SEND_COST = 2;

// ---------------------------------------------------------------------------
// the four roles (assumption 4)
// ---------------------------------------------------------------------------

export const ROLE = {
	STRIKE: 'strike',
	// Pass 2 vocabulary (assumption 17): the area role is a sweep, on the table and in
	// every field the interface reads.
	SWEEP: 'sweep',
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

// carrying one of these makes an attacking creature a SWEEP rather than a STRIKE
// (assumption 4)
export const SWEEP_ABILITY_ACTIONS = ['burst', 'spray', 'cloud'];

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

/*
	Pass 2 (assumption 17): attack power is strength for every contact attack and
	intelligence for every projected or area attack. Before this pass the table spread the
	governing attribute across agility, reflex, endurance and instinct, which gave those
	attributes a second job while strength and intelligence had almost none, and left the
	reading of a creature's plate unable to say what makes it hit hard. The lever-pool acts
	(shove, snare, ambush, drain) keep the entries they had, since nothing in the base
	reaches them.

	`hurl` is governed by intelligence, with the other projections. The Pass 2 brief listed
	it among the contact attacks, which contradicted ACT_CLASS_BY_ACTION's own reading of it
	as a projection and would have left one action classed one way and powered the other;
	corrected 2026-09-09 so the class table and this table agree on every row.
*/
export const GOVERNING_ATTRIBUTE_BY_ACTION = {
	// contact: strength
	strike: 'strength',
	crush: 'strength',
	lash: 'strength',
	rake: 'strength',
	shove: 'strength',

	// projected and area: intelligence
	hurl: 'intelligence',
	beam: 'intelligence',
	spray: 'intelligence',
	burst: 'intelligence',
	cloud: 'intelligence',

	// lever pool, unchanged
	snare: 'reflex',

	ambush: 'instinct',

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
