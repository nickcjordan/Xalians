/*
	Generator content tables. Every number here is a lever (CLAUDE.md, "levers, not
	stone"): the odds, tilt strengths and bands below are the current setting, pinned by
	GENERATOR_VERSION so a later change never alters a creature already generated.

	Sources: docs/design/xalian-creature-system-redesign.md sections 5b, 5c, 6, 8c, 9, 10;
	.claude/skills/migrate-species/SKILL.md sections 5.3, 5.7, 5.7a, 5.8, 5.9.
*/

// 0.x: the first runnable generator. It follows the ratified pipeline but is not yet the
// bit-exact spec (canonical PRNG, hashed manifest) the redesign doc's audit section asks
// for before real Scrambler Tokens are expanded. Bump when any table below moves.
export const GENERATOR_VERSION = '0.1.0';
export const SCHEMA_VERSION = '1.0.0';

export const ATTRIBUTE_KEYS = [
	'strength', 'vitality', 'endurance', 'agility', 'reflex',
	'intelligence', 'willpower', 'instinct', 'charisma', 'resilience',
];

export const CAPABILITY_KEYS = ['flight', 'swim', 'burrow', 'climb', 'sprint', 'leap', 'manipulation'];
export const GRADED_SENSE_KEYS = ['sight', 'hearing', 'smell'];
export const TEMPERAMENT_KEYS = ['boldness', 'curiosity', 'energy', 'aggression', 'sociability'];

// 5c: on-graph secondaries per primary element. Every rolled secondary comes from here.
export const ELEMENT_ADJACENCY = {
	fire: ['rock', 'chemical', 'metal'],
	water: ['ice', 'plant', 'chemical'],
	dark: ['ghost', 'psychic', 'ice'],
	light: ['fire', 'electric', 'psychic'],
	plant: ['water', 'chemical', 'psychic'],
	electric: ['light', 'air', 'metal'],
	ghost: ['dark', 'psychic'],
	rock: ['metal', 'sand', 'fire'],
	chemical: ['fire', 'metal', 'water'],
	air: ['electric', 'water', 'ice'],
	psychic: ['ghost', 'light', 'dark'],
	ice: ['metal', 'water', 'dark'],
	metal: ['electric', 'fire', 'ghost'],
	sand: ['water', 'rock', 'ghost'],
};

// 5b: 75% no secondary / 25% one on-graph secondary, graded 1 to 99.
export const SECONDARY_AFFINITY_CHANCE = 0.25;

// 9.2: favored attributes roll toward the top of their band (best of two draws); nothing
// is ever suppressed.
export const FAVORED_DRAWS = 2;

// 6: exclusion pairs. The higher tilted percent rolls first; a landed partner skips the other.
export const TRAIT_EXCLUSIONS = [['pack-bonded', 'solitary']];

// 6: tilt table. Each entry names the rolled quantity that tilts the trait and the
// direction. The tilt multiplies the authored percent by 1 + TILT_STRENGTH * (p - 0.5) *
// direction, where p is where the rolled value sits in its species band (0 bottom, 1
// top); entries at 100 are exempt; results clamp to 1 to 99.
export const TILT_STRENGTH = 0.6;
export const TRAIT_TILTS = {
	stealthy: { on: 'mass', dir: -1 },
	anchored: { on: 'mass', dir: 1 },
	menacing: { on: 'height', dir: 1 },
	ramming: { on: 'capability:sprint', dir: 1 },
	perceptive: { on: 'senses', dir: 1 },
	telekinetic: { on: 'capability:manipulation', dir: 1 },
	armored: { on: 'mass', dir: 1 },
	resistant: { on: 'attribute:resilience', dir: 1 },
	'mind-sealed': { on: 'attribute:willpower', dir: 1 },
	foresighted: { on: 'attribute:instinct', dir: 1 },
	hypnotic: { on: 'attribute:charisma', dir: 1 },
	inspiring: { on: 'attribute:charisma', dir: 1 },
	slippery: { on: 'attribute:agility', dir: 1 },
	regenerative: { on: 'attribute:vitality', dir: 1 },
	'pack-bonded': { on: 'attribute:charisma', dir: 1 },
	solitary: { on: 'attribute:charisma', dir: -1 },
	phasing: { on: 'affinity:ghost', dir: 1 },
};

// 10 / 5.9: appearance finish odds.
export const FINISH_ODDS = [
	['eclipse', 1 / 4000],
	['prismatic', 1 / 400],
	['gleam', 1 / 40],
];

// 8c / 5.8: signature plus 2 or 3 rolled abilities; rolled intensity band.
export const ROLLED_ABILITY_COUNT = [2, 3];
export const ROLLED_INTENSITY_BAND = [15, 95];
// when a secondary affinity exists, the share of rolled abilities that use it as medium
export const SECONDARY_MEDIUM_SHARE = 0.4;

// 5.7a: what an element can do through a declared conduit.
export const CONDUIT_ACTIONS_BY_MEDIUM = {
	fire: ['strike', 'beam', 'spray', 'burst', 'cloud', 'hurl', 'lash'],
	water: ['spray', 'burst', 'cloud', 'snare', 'shove', 'mend', 'lash'],
	dark: ['snare', 'crush', 'shove', 'drain', 'burst', 'ward', 'terrorize'],
	light: ['beam', 'burst', 'ward', 'mend', 'terrorize', 'spray'],
	plant: ['snare', 'ward', 'mend', 'lash', 'cloud', 'spray'],
	electric: ['beam', 'burst', 'lash', 'strike', 'snare', 'spray'],
	ghost: ['terrorize', 'drain', 'cloud', 'snare', 'ward'],
	rock: ['ward', 'crush', 'hurl', 'burst', 'shove', 'strike'],
	chemical: ['spray', 'cloud', 'burst', 'drain', 'snare'],
	air: ['shove', 'burst', 'cloud', 'hurl', 'lash', 'ward'],
	psychic: ['burst', 'snare', 'terrorize', 'ward', 'mend', 'drain', 'shove', 'hurl'],
	ice: ['snare', 'ward', 'spray', 'burst', 'crush', 'mend'],
	metal: ['strike', 'ward', 'hurl', 'beam', 'crush', 'rake'],
	sand: ['cloud', 'spray', 'drain', 'snare', 'burst', 'rake'],
};

// 5.9: temperament rolls last, tilted by the rolled body. Each axis starts at 50, moves by
// TEMPERAMENT_ATTRIBUTE_PULL per point the named attributes sit from 50 (averaged), plus
// fixed nudges for archetype and traits, then a uniform jitter.
export const TEMPERAMENT_ATTRIBUTE_PULL = 0.35;
export const TEMPERAMENT_JITTER = 18;
export const TEMPERAMENT_TILTS = {
	boldness: { attributes: ['strength', 'resilience'], traits: { menacing: 8, protective: 4 } },
	curiosity: { attributes: ['intelligence', 'instinct'], traits: { perceptive: 6, foresighted: 6 } },
	energy: { attributes: ['agility', 'reflex'], traits: { ramming: 6, anchored: -10 } },
	aggression: {
		attributes: ['strength', 'instinct'],
		traits: { menacing: 6, toxic: 4, healing: -8, protective: -4 },
		archetypes: { predator: 10, berserker: 12, juggernaut: 6, prowler: 4, bulwark: -6, survivor: -6, sage: -8, seeker: -4 },
	},
	sociability: { attributes: ['charisma'], traits: { 'pack-bonded': 16, solitary: -16, inspiring: 8 } },
};
