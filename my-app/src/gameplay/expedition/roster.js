/*
	Expedition — building the two rosters from real creatures.

	The generator (../generator) expands seeds into creature records from the 29 ratified
	species templates. This module deals a pool of generated creatures and cuts it into
	two rosters, deterministically under the match seed, so `?seed=N` replays the same
	expedition with the same creatures.

	The pool cycles every species evenly before shuffling, so a roster of twelve is a
	spread across worlds and elements rather than twelve of one thing. Nothing here is
	game logic: the engine takes whatever records it is given.
*/

import { generateBatch } from '../generator/index.js';
import { createRngState, nextRandom } from './expeditionRules.js';
import { ROSTER_SIZE } from './expeditionInterpretation.js';

// Fisher-Yates over the engine's own PRNG so the deal is reproducible from the seed
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

/*
	buildExpeditionPool(seed, size) -> records
	One generated creature per species, cycling, until `size` records exist.
*/
export function buildExpeditionPool(seed, size) {
	return generateBatch(size, `${seed}-pool`);
}

/*
	buildRosters(seed, options) -> { rosterA, rosterB, pool }
	options.poolSize (default 60): how many creatures to generate before dealing.
*/
export function buildRosters(seed, options = {}) {
	const poolSize = options.poolSize || 60;
	const pool = buildExpeditionPool(seed, poolSize);
	const shuffled = shuffleWithRng(pool, createRngState(`${seed}-rosterbuild`));
	return {
		rosterA: shuffled.slice(0, ROSTER_SIZE),
		rosterB: shuffled.slice(ROSTER_SIZE, ROSTER_SIZE * 2),
		pool,
	};
}
