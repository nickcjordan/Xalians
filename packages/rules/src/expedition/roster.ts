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

import { generateBatch } from '../generator/index.ts';
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
*/
export function buildExpeditionPool(seed: string | number, size: number): XalianRecord[] {
	return generateBatch(size, `${seed}-pool`);
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
