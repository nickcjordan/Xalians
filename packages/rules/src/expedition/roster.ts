/*
	Expedition — building the two rosters from real creatures.

	The generator (@xalians/rules/generator) expands seeds into creature records from the
	29 ratified species templates. This module deals a pool of generated creatures and
	cuts it into two rosters, deterministically under the match seed, so `?seed=N`
	replays the same expedition with the same creatures.

	The pool cycles every species evenly before shuffling, so a roster of twelve is a
	spread across worlds and elements rather than twelve of one thing. Nothing here is
	game logic: the engine takes whatever records it is given.
*/

import { generateXalian, getSpeciesTemplates } from '../generator/canonicalCreatureRelease.ts';
import type { XalianRecord } from '@xalians/content/schema';
import { createRngState, nextRandom } from './expeditionRules.ts';
import { ROSTER_SIZE } from './expeditionInterpretation.ts';

// Fisher-Yates over the engine's own PRNG so the deal is reproducible from the seed
function shuffleWithRng(array: XalianRecord[], rngState: number): XalianRecord[] {
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

/*
	buildExpeditionPool(seed, size) -> records
	One generated creature per species, cycling, until `size` records exist.

	SCHEMA 5. There is no `generateBatch` any more, and `generateXalian` now takes replay
	metadata the caller must supply: the release comments "Validate caller metadata only,
	not generated combinations. Never invent replay inputs." So the pool is built here, one
	creature at a time, cycling the release's own species list exactly as the v4 batch did.

	The metadata is derived from the match seed rather than from the clock, because the
	whole point of `?seed=N` is that it replays the same expedition. A `generatedAt` of
	`Date.now()` would make a provenance field differ between two runs of the same seed;
	these creatures are a game's scratch pool, not registry records, so the timestamp is
	fixed and the serial counts within the pool.

	The species list is the frozen release's own, so a species added to a later release
	joins the pool without this file changing.
*/
const POOL_GENERATED_AT = '2026-09-21T00:00:00.000Z';

export function buildExpeditionPool(seed: string | number, size: number): XalianRecord[] {
	/*
		`origin` is a PLANET, not a species: home ground compares it against the world's own
		planet name (creatureOnTable, "a straight lowercase compare of provenance.origin
		against the world's planet name"). Passing the species key here would typecheck,
		generate cleanly, and silently make every creature a stranger everywhere, because no
		world is named "akinza". The template states `homePlanet`, so that is what is passed.
	*/
	const species = getSpeciesTemplates()
		.map((template: { key: string; homePlanet?: string }) => ({
			key: template.key,
			home: String(template.homePlanet || template.key),
		}));
	if (species.length === 0) {
		return [];
	}
	const records: XalianRecord[] = [];
	for (let i = 0; i < size; i++) {
		const { key, home } = species[i % species.length];
		records.push(generateXalian(key, `${seed}-pool-${i}`, {
			origin: home,
			serial: i + 1,
			profile: 'full',
			generatedAt: POOL_GENERATED_AT,
		}) as unknown as XalianRecord);
	}
	return records;
}

export interface BuildRostersOptions {
	poolSize?: number;
}

export interface Rosters {
	rosterA: XalianRecord[];
	rosterB: XalianRecord[];
	pool: XalianRecord[];
}

/*
	buildRosters(seed, options) -> { rosterA, rosterB, pool }
	options.poolSize (default 60): how many creatures to generate before dealing.
*/
export function buildRosters(seed: string | number, options: BuildRostersOptions = {}): Rosters {
	const poolSize = options.poolSize || 60;
	const pool = buildExpeditionPool(seed, poolSize);
	const shuffled = shuffleWithRng(pool, createRngState(`${seed}-rosterbuild`));
	return {
		rosterA: shuffled.slice(0, ROSTER_SIZE),
		rosterB: shuffled.slice(ROSTER_SIZE, ROSTER_SIZE * 2),
		pool,
	};
}
