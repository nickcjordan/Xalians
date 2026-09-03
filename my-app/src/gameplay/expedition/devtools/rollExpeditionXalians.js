/*
	*** PROVISIONAL / THROWAWAY TEST DATA - NEVER CANON ***

	Wraps the first design's devtools/rollProvisionalXalians.js (rollXalians) rather than
	duplicating it, per the task's own instruction to import identical code from the
	tribute package. That roller never assigns trait keywords (traits.guaranteed/rolled
	always come back empty), which is fine for the row game but means none of this
	design's trait rules (stealthy hidden sends, anchored, armored, resilient,
	pack-bonded, solitary, menacing, nocturnal, luminous) would ever exercise in the
	simulator. This module deterministically layers a provisional trait roll on top,
	seeded independently of the base roll so it doesn't disturb the first design's own
	determinism if both are ever run side by side against the same seed.
*/

import { rollXalians } from '../../tribute/devtools/rollProvisionalXalians.js';
import { createRngState, nextRandom } from '../expeditionRules.js';

const TRAIT_POOL = [
	'pack-bonded', 'solitary', 'menacing', 'armored', 'anchored',
	'resilient', 'stealthy', 'nocturnal', 'luminous',
];

// each roll gets 0-2 traits, weighted toward 0-1 so most creatures are trait-free (the
// design doc frames traits as a notable exception, not the default)
function rollTraitCount(rng) {
	const r = rng();
	if (r < 0.5) {
		return 0;
	}
	if (r < 0.85) {
		return 1;
	}
	return 2;
}

function makeRng(seed) {
	let state = createRngState(seed);
	return () => {
		const { value, nextState } = nextRandom(state);
		state = nextState;
		return value;
	};
}

function pickDistinct(rng, pool, count) {
	const shuffled = pool.slice();
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled.slice(0, count);
}

/*
	rollExpeditionXalians(count, seed) -> array of full creature records (same shape as
	rollXalians), each augmented with a provisional traits.rolled list. Deterministic
	under seed.
*/
export function rollExpeditionXalians(count, seed) {
	const records = rollXalians(count, seed);
	const rng = makeRng(`${seed}-traits`);
	return records.map((record) => {
		const traitCount = rollTraitCount(rng);
		const rolled = pickDistinct(rng, TRAIT_POOL, traitCount);
		return {
			...record,
			traits: { guaranteed: record.traits ? record.traits.guaranteed : [], rolled },
		};
	});
}
