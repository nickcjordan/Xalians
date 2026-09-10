/*
	Expedition - the pre-match draft.

	Per docs/design/reclamation-play-enhancements.md "Pass 3, the draft": before the
	Proving the frame shows its first three worlds and eighteen generated creatures; the
	handler keeps twelve; the rival drafts by its own style. The roster economy (twelve
	brought, ten sent) is unchanged; this module only decides which twelve of eighteen
	each side brings to it.

	Pure and deterministic under the match seed, same discipline as roster.js: two
	disjoint pools of DRAFT_POOL_SIZE dealt from the generator with the engine's own
	PRNG, and the nine worlds of the Proving reproduced by calling createMatch with
	placeholder rosters of the right size and reading its `frames` back out, exactly as
	the task asked (drawFrames itself is not exported, and this module has no business
	reaching past createMatch's public contract to get at it).
*/

import { generateBatch } from '@xalians/rules/generator';
import { createRngState, nextRandom, createMatch } from './expeditionRules.js';
import { getWorlds } from './sites.js';
import { prepare, roleOf, speedOf } from './creatureOnTable.js';
import {
	ROSTER_SIZE, ROLE, SWEEP_DISCOUNT, BOLSTER_FLOOR, SHIELD_CAP,
	DRAFT_POOL_SIZE as DEFAULT_DRAFT_POOL_SIZE, DRAFT_DISTINCT_SPECIES,
} from './expeditionInterpretation.js';

// a sweep catches this many creatures at a world on the numbers the simulator measures
// (mean creatures per world at deploy end, both sides), so a sweep's worth is its
// discounted magnitude times this
export const SWEEP_EXPECTED_CREATURES = 3;
// a bolsterer lifts about this many allies at a world, itself excluded
export const BOLSTER_EXPECTED_ALLIES = 2;

/*
	Both sides draft from a pool of DRAFT_POOL_SIZE and keep twelve (ROSTER_SIZE). The
	number itself lives in expeditionInterpretation.js with every other lever (docs/design/
	reclamation-base-redesign.md assumption 15) and is re-exported here so the draft's own
	callers keep one import; a match's rules object can move it per batch through
	`rules.draftPoolSize` (assumption 23).
*/
export const DRAFT_POOL_SIZE = DEFAULT_DRAFT_POOL_SIZE;

function shuffleWithRng(array, rngState) {
	const result = array.slice();
	let state = rngState;
	for (let i = result.length - 1; i > 0; i--) {
		const { value, nextState } = nextRandom(state);
		state = nextState;
		const j = Math.floor(value * (i + 1));
		const tmp = result[i];
		result[i] = result[j];
		result[j] = tmp;
	}
	return result;
}

// a placeholder roster of the right size, just to satisfy createMatch's validation
// while we read its frame draw back out; these records never touch a real match
function placeholderRoster(prefix) {
	const roster = [];
	for (let i = 0; i < ROSTER_SIZE; i++) {
		roster.push({
			id: `${prefix}_${i}`,
			species: 'placeholder',
			provenance: { serial: i, origin: 'magmuth' },
			attributes: {
				strength: 50, vitality: 50, endurance: 50, agility: 50, reflex: 50,
				intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 50,
			},
			element: { primary: 'fire', affinities: { fire: 100 } },
			archetype: { key: 'balanced', favors: [] },
			physiology: {
				breathes: ['gas'],
				environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -100, max: 100 } },
			},
			traits: [],
			temperament: { boldness: 50, curiosity: 50, energy: 50, aggression: 50, sociability: 50 },
			abilities: [],
		});
	}
	return roster;
}

/*
	drawnFrames(seed) -> frames

	Reproduces the nine-world draw createMatch makes for this seed, without needing a
	real match to exist yet. createMatch is deterministic from the seed alone (the frame
	draw happens before any roster content is read), so a placeholder pair of rosters of
	the right shape yields the same `frames` the real match will use.
*/
export function drawnFrames(seed) {
	const match = createMatch({
		rosterA: placeholderRoster('draftA'),
		rosterB: placeholderRoster('draftB'),
		worlds: getWorlds(),
		seed,
	});
	return match.frames;
}

/*
	dealDistinct(shuffled, size) -> [poolA, poolB]

	The species-distinct deal (docs/design/reclamation-base-redesign.md assumption 23,
	variant b). Walking the shuffled batch once, each pool takes the first creature of a
	species it does not already hold, so no handler is ever dealt two of the same species
	and the keep cannot be a run of the best species in the batch. If the batch cannot
	supply `size` distinct species to a pool - the generator deals from twenty-nine species,
	so an unlucky batch can fall short - the pool is topped up from what is left, which is
	the "distinct as far as possible" fallback the brief asks for rather than a failure.
*/
function dealDistinct(shuffled, size) {
	const pools = [[], []];
	const seen = [new Set(), new Set()];
	const leftovers = [];
	shuffled.forEach((record) => {
		const species = record.species || 'unknown';
		for (let i = 0; i < 2; i++) {
			if (pools[i].length < size && !seen[i].has(species)) {
				pools[i].push(record);
				seen[i].add(species);
				return;
			}
		}
		leftovers.push(record);
	});
	// top up, in order, so the deal stays deterministic under the seed
	let next = 0;
	for (let i = 0; i < 2; i++) {
		while (pools[i].length < size && next < leftovers.length) {
			pools[i].push(leftovers[next]);
			next++;
		}
	}
	return pools;
}

/*
	buildDraftPools(seed, options) -> { poolA, poolB, frames }

	Two disjoint pools of `options.poolSize` (default DRAFT_POOL_SIZE) generated creatures,
	dealt from the same kind of generator pool roster.js uses (one big generated batch,
	shuffled by the engine's PRNG, then cut), and the nine worlds of the Proving in frame
	order.

	options (assumption 23; a caller holding a match's rules object can pass it straight
	through as { poolSize: rules.draftPoolSize, distinctSpecies: rules.draftDistinctSpecies }):
	- poolSize: how many creatures each side is dealt.
	- distinctSpecies: deal each pool species-distinct (see dealDistinct). The batch is
	  generated larger in that case, since a distinct deal consumes duplicates.
*/
export function buildDraftPools(seed, options = {}) {
	const poolSize = typeof options.poolSize === 'number' ? options.poolSize : DRAFT_POOL_SIZE;
	const distinct = options.distinctSpecies !== undefined ? !!options.distinctSpecies : DRAFT_DISTINCT_SPECIES;
	// a distinct deal throws duplicates back, so it needs a deeper batch to fill two pools
	const batchSize = distinct ? poolSize * 6 : poolSize * 2;
	const pool = generateBatch(batchSize, `${seed}-draftpool`);
	const shuffled = shuffleWithRng(pool, createRngState(`${seed}-draftbuild`));
	if (distinct) {
		const [poolA, poolB] = dealDistinct(shuffled, poolSize);
		return { poolA, poolB, frames: drawnFrames(seed) };
	}
	return {
		poolA: shuffled.slice(0, poolSize),
		poolB: shuffled.slice(poolSize, poolSize * 2),
		frames: drawnFrames(seed),
	};
}

// the draft options a match's rules object carries (assumption 23), so every caller reads
// the same two keys off the same place rather than each inventing its own plumbing
export function draftOptionsFromRules(rules) {
	return {
		poolSize: rules && typeof rules.draftPoolSize === 'number' ? rules.draftPoolSize : DRAFT_POOL_SIZE,
		distinctSpecies: rules && rules.draftDistinctSpecies !== undefined
			? !!rules.draftDistinctSpecies : DRAFT_DISTINCT_SPECIES,
	};
}

// every site across a frame list, in frame order
function sitesOf(frames) {
	const sites = [];
	frames.forEach((frame) => frame.sites.forEach((site) => sites.push(site)));
	return sites;
}

/*
	rateForDraft(record, frames, options) -> { best, mean, homes, role, roleValue, rating, byWorld }

	byWorld is one row per site of the nine-world Proving (frame order preserved), each
	{ planet, element, hold, isHome, strainLevel, blowMagnitude, bolsterLift }, built from
	prepare() exactly as the bench and figures read a creature - no formula of this
	module's own.

	RATING = mean hold + role value (2026-09-09, docs/design/reclamation-base-redesign.md
	assumption 4). Rating by hold alone left 21 of 29 species outside the 30 to 90 percent
	keep band, because a creature's whole contribution to a world is its hold PLUS what
	its one role does there, and the draft was pricing only the first half. Role value, in
	hold units, matched to how expeditionBot.roleValueOf prices the same creature at a
	real world:

	- strike:  its mean blow magnitude across the nine worlds
	- sweep:   the same, times rules.sweepDiscount, times SWEEP_EXPECTED_CREATURES
	- shield:  a typical cancel, which is the POOL's mean blow magnitude (options.poolMeanBlow),
	           priced by rules.shieldCap the way the engine pays it out: 'half' nets half a
	           blow, since the shielder takes the other half itself
	- bolster: its mean own-strain grade lift across the nine worlds, times
	           BOLSTER_EXPECTED_ALLIES, plus rules.bolsterFloor for itself

	options: { rules, poolMeanBlow }. Both optional; with neither, the module constants and
	a shield value of zero are used, which is what a caller with no pool in hand can know.
*/
export function rateForDraft(record, frames, options = {}) {
	const rules = options.rules || null;
	const sweepDiscount = rules && typeof rules.sweepDiscount === 'number' ? rules.sweepDiscount : SWEEP_DISCOUNT;
	const bolsterFloor = rules && typeof rules.bolsterFloor === 'number' ? rules.bolsterFloor : BOLSTER_FLOOR;
	const shieldCap = (rules && rules.shieldCap) || SHIELD_CAP;

	const byWorld = sitesOf(frames).map((site) => {
		const view = prepare(record, site, null, 0, { rules });
		const lifted = prepare(record, site, null, 0, { rules, bolstered: true });
		return {
			planet: site.world.planet,
			element: site.world.element,
			hold: view.hold,
			isHome: view.isHome,
			strainLevel: view.strainLevel,
			blowMagnitude: view.blowMagnitude,
			bolsterLift: Math.max(0, lifted.hold - view.hold),
		};
	});
	const holds = byWorld.map((w) => w.hold);
	const best = holds.reduce((a, b) => Math.max(a, b), 0);
	const mean = holds.length > 0 ? holds.reduce((a, b) => a + b, 0) / holds.length : 0;
	const homes = byWorld.filter((w) => w.isHome).length;

	const role = roleOf(record, rules);
	const meanBlow = byWorld.length > 0 ? byWorld.reduce((sum, w) => sum + w.blowMagnitude, 0) / byWorld.length : 0;
	const meanLift = byWorld.length > 0 ? byWorld.reduce((sum, w) => sum + w.bolsterLift, 0) / byWorld.length : 0;

	let roleValue = 0;
	if (role === ROLE.STRIKE) {
		roleValue = meanBlow;
	} else if (role === ROLE.SWEEP) {
		roleValue = meanBlow * sweepDiscount * SWEEP_EXPECTED_CREATURES;
	} else if (role === ROLE.SHIELD) {
		const typicalCancel = typeof options.poolMeanBlow === 'number' ? options.poolMeanBlow : 0;
		roleValue = shieldCap === 'half' ? typicalCancel / 2 : typicalCancel;
	} else if (role === ROLE.BOLSTER) {
		roleValue = meanLift * BOLSTER_EXPECTED_ALLIES + bolsterFloor;
	}

	return { best, mean, homes, role, roleValue, rating: mean + roleValue, byWorld };
}

/*
	poolMeanBlowOf(pool, frames, rules) -> the mean blow magnitude of every blow creature
	in the pool across the nine worlds. This is what a shield's cancel is worth on average,
	and it is a property of the POOL, not of the shielder, which is why it is computed once
	here and handed to rateForDraft rather than derived per creature.
*/
export function poolMeanBlowOf(pool, frames, rules) {
	const sites = sitesOf(frames);
	const magnitudes = [];
	pool.forEach((record) => {
		const role = roleOf(record, rules);
		if (role !== ROLE.STRIKE && role !== ROLE.SWEEP) {
			return;
		}
		sites.forEach((site) => {
			magnitudes.push(prepare(record, site, null, 0, { rules }).blowMagnitude);
		});
	});
	return magnitudes.length > 0 ? magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length : 0;
}

// the planet a creature holds best at, used by the windsailor's spread bonus/penalty
function bestPlanetOf(rating) {
	if (rating.byWorld.length === 0) {
		return null;
	}
	return rating.byWorld.reduce((a, b) => (b.hold > a.hold ? b : a)).planet;
}

// stealthy read straight off the record's traits, no site needed
function isStealthy(record) {
	const traits = record && record.traits;
	if (Array.isArray(traits)) {
		return traits.includes('stealthy');
	}
	if (traits && typeof traits === 'object') {
		const guaranteed = Array.isArray(traits.guaranteed) ? traits.guaranteed : [];
		const rolled = Array.isArray(traits.rolled) ? traits.rolled : [];
		return guaranteed.includes('stealthy') || rolled.includes('stealthy');
	}
	return false;
}

/*
	botDraft(pool, frames, rival) -> the twelve record ids the rival keeps

	Each creature is scored by its mean hold across the nine worlds plus a bonus for its
	best world, per rateForDraft. Rival styles (expeditionBot.RIVALS ids) bend the score:

	- windsailor: prefers spread, penalized for sharing a best world with an
	  already-kept pick (its Deploy style piles into every world at once, so the draft
	  matches it by not stacking all its strength on one world before the match starts)
	- heir: prefers the top mean holds outright (stacks a lead, so it keeps the
	  creatures that hold everywhere rather than gambling on niche specialists)
	- broker: prefers stealthy creatures (its style is built on hiding sends)
	- envoy: prefers high speed (rations the roster and wants first attacks to
	  matter when it finally spends)
	- proctor, and any unrecognized id: the plain rating, by the book

	The rating every habit bends is now hold PLUS role value (see rateForDraft), not hold
	alone, so a creature is drafted for what it will do at a world as well as for how long
	it will stand there.

	Deterministic: ties break on record id so the result never depends on iteration
	order or floating-point jitter.
*/
export function botDraft(pool, frames, rival, options = {}) {
	const rivalId = (rival && rival.id) || 'proctor';
	const rules = options.rules || null;
	const poolMeanBlow = poolMeanBlowOf(pool, frames, rules);
	const ratings = pool.map((record) => ({
		record,
		rating: rateForDraft(record, frames, { rules, poolMeanBlow }),
	}));

	const scored = ratings.map(({ record, rating }) => {
		let score = rating.rating + rating.best * 0.25;
		if (rivalId === 'heir') {
			score = rating.rating * 1.5 + rating.best * 0.1;
		} else if (rivalId === 'broker') {
			score += isStealthy(record) ? 4 : 0;
		} else if (rivalId === 'envoy') {
			score += speedOf(record) * 0.08;
		}
		return { record, rating, score, bestPlanet: bestPlanetOf(rating) };
	});

	// the windsailor's spread bias: a running penalty for a repeated best-world, so the
	// discount can change the order as the keep fills (a habit, not a static score)
	const bestPlanetCounts = new Map();
	const adjust = rivalId === 'windsailor'
		? (candidate) => candidate.score - (candidate.bestPlanet ? (bestPlanetCounts.get(candidate.bestPlanet) || 0) * 3 : 0)
		: (candidate) => candidate.score;
	const onPick = rivalId === 'windsailor'
		? (candidate) => {
			if (candidate.bestPlanet) {
				bestPlanetCounts.set(candidate.bestPlanet, (bestPlanetCounts.get(candidate.bestPlanet) || 0) + 1);
			}
		}
		: () => {};

	return draftPick(scored, adjust, onPick).map((k) => k.record.id);
}

/*
	draftPick(scored, adjust, onPick) -> the ROSTER_SIZE entries kept.

	A greedy pick under the SPREAD RULE (2026-09-09): at most MAX_PER_SPECIES of any one
	species, and at least one creature of every role the pool can offer. Rating by hold
	plus role value already narrowed the keep-rate spread, but eighteen of twenty-nine
	species still sat outside the 30 to 90 percent band, because a rating is a total order
	and a total order always keeps its own top twelve. The spread rule is the smallest
	thing that makes the draft a composition problem rather than a sort: a second copy of
	the best species is worth less than the first, and a squad with no shield is not a
	squad.

	`adjust` prices a candidate as the keep fills (the windsailor's repeated-best-world
	penalty) and `onPick` records whatever that pricing reads. Deterministic throughout:
	ties break on record id.
*/
export const MAX_PER_SPECIES = 2;

function draftPick(scored, adjust, onPick) {
	const remaining = scored.slice();
	const kept = [];
	const speciesCounts = new Map();
	const roleCounts = new Map();
	const rolesInPool = [...new Set(scored.map((c) => c.rating.role))];

	const speciesOf = (candidate) => candidate.record.species || 'unknown';
	const speciesOk = (candidate) => (speciesCounts.get(speciesOf(candidate)) || 0) < MAX_PER_SPECIES;

	while (kept.length < ROSTER_SIZE && remaining.length > 0) {
		remaining.sort((x, y) => adjust(y) - adjust(x) || x.record.id.localeCompare(y.record.id));
		const slotsLeft = ROSTER_SIZE - kept.length;
		// roles still missing that the remainder can still supply
		const missing = rolesInPool.filter(
			(role) => (roleCounts.get(role) || 0) === 0 && remaining.some((c) => c.rating.role === role),
		);

		let pick = null;
		if (missing.length >= slotsLeft) {
			// every remaining slot is spoken for by a missing role: take the best candidate
			// of one, preferring one that also keeps the species cap
			pick = remaining.find((c) => missing.includes(c.rating.role) && speciesOk(c))
				|| remaining.find((c) => missing.includes(c.rating.role));
		}
		if (!pick) {
			// the species cap is relaxed only when nothing else is left to take
			pick = remaining.find(speciesOk) || remaining[0];
		}

		remaining.splice(remaining.indexOf(pick), 1);
		kept.push(pick);
		speciesCounts.set(speciesOf(pick), (speciesCounts.get(speciesOf(pick)) || 0) + 1);
		roleCounts.set(pick.rating.role, (roleCounts.get(pick.rating.role) || 0) + 1);
		onPick(pick);
	}

	return kept;
}

/*
	validateKeep(pool, keepIds) -> boolean

	True only when keepIds names exactly ROSTER_SIZE distinct ids, all of them present
	in the pool.
*/
export function validateKeep(pool, keepIds) {
	if (!Array.isArray(keepIds) || keepIds.length !== ROSTER_SIZE) {
		return false;
	}
	const uniqueIds = new Set(keepIds);
	if (uniqueIds.size !== ROSTER_SIZE) {
		return false;
	}
	const poolIds = new Set((pool || []).map((r) => r.id));
	return keepIds.every((id) => poolIds.has(id));
}
