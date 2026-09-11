/*
	Generator content tables. Every number here is a lever (CLAUDE.md, "levers, not
	stone"): the odds, tilt strengths and bands below are the current setting, pinned by
	GENERATOR_VERSION so a later change never alters a creature already generated.

	Sources: docs/design/xalian-creature-system-redesign.md sections 5b, 5c, 6, 8c, 9, 10;
	.claude/skills/migrate-species/SKILL.md sections 5.3, 5.7, 5.7a, 5.8, 5.9.
*/
import type {
	ActionKey,
	AttributeKey,
	CapabilityKey,
	ElementKey,
	Finish,
	FinishOdds,
	GradedSenseKey,
	TemperamentKey,
	TemperamentTiltSpec,
	TraitKey,
	TraitTiltSpec,
} from './types.ts';

// 0.x: still short of the bit-exact spec (a hashed content manifest) the redesign doc's
// audit section asks for before real Scrambler Tokens are expanded, but 0.2.0 closes the
// two gaps that mattered most: the seed is now a full 128-bit stream (prng.js, cyrb128
// into xoshiro128**) instead of a 32-bit fold, and the ability name draw is weighted by
// heft so a heavy roll gets a heavy name. Records from 0.1.0 do not reproduce under
// 0.2.0, which is exactly what pinning the version is for. Bump when any table below
// moves.
export const GENERATOR_VERSION = '0.2.0';
export const SCHEMA_VERSION = '1.0.0';

export const ATTRIBUTE_KEYS: AttributeKey[] = [
	'strength', 'vitality', 'endurance', 'agility', 'reflex',
	'intelligence', 'willpower', 'instinct', 'charisma', 'resilience',
];

export const CAPABILITY_KEYS: CapabilityKey[] = ['flight', 'swim', 'burrow', 'climb', 'sprint', 'leap', 'manipulation'];
export const GRADED_SENSE_KEYS: GradedSenseKey[] = ['sight', 'hearing', 'smell'];
export const TEMPERAMENT_KEYS: TemperamentKey[] = ['boldness', 'curiosity', 'energy', 'aggression', 'sociability'];

// 5c: on-graph secondaries per primary element. Every rolled secondary comes from here.
export const ELEMENT_ADJACENCY: Record<ElementKey, ElementKey[]> = {
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
export const TRAIT_EXCLUSIONS: TraitKey[][] = [['pack-bonded', 'solitary']];

// 6: tilt table. Each entry names the rolled quantity that tilts the trait and the
// direction. The tilt multiplies the authored percent by 1 + TILT_STRENGTH * (p - 0.5) *
// direction, where p is where the rolled value sits in its species band (0 bottom, 1
// top); entries at 100 are exempt; results clamp to 1 to 99.
export const TILT_STRENGTH = 0.6;
export const TRAIT_TILTS: Partial<Record<TraitKey, TraitTiltSpec>> = {
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
export const FINISH_ODDS: FinishOdds = [
	['eclipse', 1 / 4000],
	['prismatic', 1 / 400],
	['gleam', 1 / 40],
];

// 8c / 5.8: signature plus 2 or 3 rolled abilities; rolled intensity band.
export const ROLLED_ABILITY_COUNT: [number, number] = [2, 3];
export const ROLLED_INTENSITY_BAND: [number, number] = [15, 95];
// 8c: intensity-weighted naming (hardening Decision 9). A rolled intensity picks a target
// heft (1 below 34, 2 from 34 to 66, 3 above 66) and the name draw weights candidates by
// how far their bundled heft sits from that target: a match, a neighbor, anything else.
// The catalog computes heft; these weights decide how hard it pulls.
export const HEFT_BANDS: [number, number] = [34, 66];
export const HEFT_MATCH_WEIGHTS: number[] = [3, 2, 1];
// when a secondary affinity exists, the share of rolled abilities that use it as medium
export const SECONDARY_MEDIUM_SHARE = 0.4;

// 5.7a: what an element can do through a declared conduit.
export const CONDUIT_ACTIONS_BY_MEDIUM: Record<ElementKey, ActionKey[]> = {
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
export const TEMPERAMENT_TILTS: Record<TemperamentKey, TemperamentTiltSpec> = {
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

/*
	Showroom profile (issue #197, docs/design/xalians-platform-vision-and-economy.md
	section 3): a generator lever, not an entitlement check. Nick's 2026-09-10 direction
	is a visible toggle on the site so the two modes can be compared live, with real
	gating parked until tokens exist -- see apps/web's generator page toggle and
	apps/api's showroom/registry handlers. A profiled generation still draws from every
	rng fork exactly as the full profile does (rollAffinities, rollTraits and rollFinish
	in generate.ts all consume the same draws either way); the profile only constrains the
	outcome afterward, so the same seed under both profiles agrees on every unconstrained
	field.

	rareTraitMaxPercent: species trait pools in speciesRecords.json use percents from 5 up
	to 100 (5, 8, 10, 12, 13, 14, 15, 16, 18, 20, 22, 25, 26, 30, 35, 36, 38, 40, 45, 100 are
	the values actually used as of 2026-09-10). 20 draws the line just above the 15/18
	cluster: a showroom pull can still land the common 20-45 percent traits but never the
	long tail of sub-20 rarities, which is the ratified "no rare trait outcomes" intent.

	secondaryAffinityChance: 0 means a showroom creature is always single-element; this
	profile does not touch SECONDARY_AFFINITY_CHANCE itself (that stays the lever for the
	full profile), it just discards a landed secondary after the roll.

	Species-weight gap (still open): the ratified line also says "common-tier species
	weights only," but speciesRecords.json templates carry no rarity or weight field, and
	both the showroom handler and generateBatch already pick species uniformly. `tier` in
	grade.ts is a computed display label on a finished record, not a species property, so
	there is nothing to constrain species selection against yet. That half of the ratified
	line needs a per-species rarity field before it can be implemented; flagged on issue
	#197 rather than worked around here.
*/
export const SHOWROOM_RARE_TRAIT_MAX_PERCENT = 20;
export const SHOWROOM_PROFILE = {
	finish: 'standard' as Finish,
	rareTraitMaxPercent: SHOWROOM_RARE_TRAIT_MAX_PERCENT,
	secondaryAffinityChance: 0,
};
