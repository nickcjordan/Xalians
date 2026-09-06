/*
	Expedition — the pre-match draft.

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

import { generateBatch } from '../generator/index.js';
import { createRngState, nextRandom, createMatch } from './expeditionRules.js';
import { getWorlds } from './sites.js';
import { prepare } from './creatureOnTable.js';
import { ROSTER_SIZE } from './expeditionInterpretation.js';

// both sides draft from a pool of eighteen and keep twelve (ROSTER_SIZE)
export const DRAFT_POOL_SIZE = 18;

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
	buildDraftPools(seed) -> { poolA, poolB, frames }

	Two disjoint pools of DRAFT_POOL_SIZE generated creatures, dealt from the same kind
	of generator pool roster.js uses (one big generated batch, shuffled by the engine's
	PRNG, then cut), and the nine worlds of the Proving in frame order.
*/
export function buildDraftPools(seed) {
	const pool = generateBatch(DRAFT_POOL_SIZE * 2, `${seed}-draftpool`);
	const shuffled = shuffleWithRng(pool, createRngState(`${seed}-draftbuild`));
	return {
		poolA: shuffled.slice(0, DRAFT_POOL_SIZE),
		poolB: shuffled.slice(DRAFT_POOL_SIZE, DRAFT_POOL_SIZE * 2),
		frames: drawnFrames(seed),
	};
}

// every site across a frame list, in frame order
function sitesOf(frames) {
	const sites = [];
	frames.forEach((frame) => frame.sites.forEach((site) => sites.push(site)));
	return sites;
}

/*
	rateForDraft(record, frames) -> { best, mean, homes, byWorld }

	byWorld is one row per site of the nine-world Proving (frame order preserved), each
	{ planet, element, hold, isHome, strainLevel }, built from prepare() exactly as the
	bench and figures read a creature — no formula of this module's own.
*/
export function rateForDraft(record, frames) {
	const byWorld = sitesOf(frames).map((site) => {
		const view = prepare(record, site, null, 0);
		return {
			planet: site.world.planet,
			element: site.world.element,
			hold: view.hold,
			isHome: view.isHome,
			strainLevel: view.strainLevel,
		};
	});
	const holds = byWorld.map((w) => w.hold);
	const best = holds.reduce((a, b) => Math.max(a, b), 0);
	const mean = holds.length > 0 ? holds.reduce((a, b) => a + b, 0) / holds.length : 0;
	const homes = byWorld.filter((w) => w.isHome).length;
	return { best, mean, homes, byWorld };
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

function meanInitiativeOf(record) {
	const attrs = (record && record.attributes) || {};
	const reflex = typeof attrs.reflex === 'number' ? attrs.reflex : 0;
	const agility = typeof attrs.agility === 'number' ? attrs.agility : 0;
	return (reflex + agility) / 2;
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
	- envoy: prefers high initiative (rations the roster and wants first strikes to
	  matter when it finally spends)
	- proctor, and any unrecognized id: plain mean hold, by the book

	Deterministic: ties break on record id so the result never depends on iteration
	order or floating-point jitter.
*/
export function botDraft(pool, frames, rival) {
	const rivalId = (rival && rival.id) || 'proctor';
	const ratings = pool.map((record) => ({ record, rating: rateForDraft(record, frames) }));

	const scored = ratings.map(({ record, rating }) => {
		let score = rating.mean + rating.best * 0.25;
		if (rivalId === 'heir') {
			score = rating.mean * 1.5 + rating.best * 0.1;
		} else if (rivalId === 'broker') {
			score += isStealthy(record) ? 4 : 0;
		} else if (rivalId === 'envoy') {
			score += meanInitiativeOf(record) * 0.08;
		}
		return { record, rating, score, bestPlanet: bestPlanetOf(rating) };
	});

	if (rivalId === 'windsailor') {
		// greedy pick with a running penalty for a repeated best-world: sort once by raw
		// score, then walk it, discounting a candidate that shares a best world with a
		// creature already kept and re-sorting the remainder so the discount can change
		// the order (a spread bias, not just a static score).
		const remaining = scored.slice().sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id));
		const kept = [];
		const bestPlanetCounts = new Map();
		while (kept.length < ROSTER_SIZE && remaining.length > 0) {
			remaining.sort((a, b) => {
				const penaltyA = a.bestPlanet ? (bestPlanetCounts.get(a.bestPlanet) || 0) * 3 : 0;
				const penaltyB = b.bestPlanet ? (bestPlanetCounts.get(b.bestPlanet) || 0) * 3 : 0;
				const adjA = a.score - penaltyA;
				const adjB = b.score - penaltyB;
				return adjB - adjA || a.record.id.localeCompare(b.record.id);
			});
			const pick = remaining.shift();
			kept.push(pick);
			if (pick.bestPlanet) {
				bestPlanetCounts.set(pick.bestPlanet, (bestPlanetCounts.get(pick.bestPlanet) || 0) + 1);
			}
		}
		return kept.map((k) => k.record.id);
	}

	return scored
		.sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id))
		.slice(0, ROSTER_SIZE)
		.map((s) => s.record.id);
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
