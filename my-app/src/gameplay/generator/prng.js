/*
	Generator PRNG.

	The generator must reproduce the same creature from the same seed forever (the record
	contract in docs/design/xalian-creature-data-structure.md, section 1). Every decision
	draws from a small deterministic stream; each generation step forks its own labelled
	sub-stream so that adding a draw to one step never shifts the draws of another
	(domain separation, per the redesign doc's spec parking lot).

	The core is the same mulberry32 step the expedition rules use, so a seed string means
	the same thing across the whole codebase.
*/

function hashSeed(seed) {
	if (typeof seed === 'number') {
		return seed >>> 0;
	}
	const str = String(seed);
	let s = 0;
	for (let i = 0; i < str.length; i++) {
		s = (Math.imul(31, s) + str.charCodeAt(i)) >>> 0;
	}
	return s >>> 0;
}

function step(state) {
	let a = state >>> 0;
	a = (a + 0x6d2b79f5) | 0;
	let t = a;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	return { value, nextState: a >>> 0 };
}

export function makeRng(seed) {
	let state = hashSeed(seed);
	const rng = {
		// uniform in [0, 1)
		float() {
			const { value, nextState } = step(state);
			state = nextState;
			return value;
		},
		// integer in [0, maxExclusive)
		int(maxExclusive) {
			return Math.floor(rng.float() * maxExclusive);
		},
		// integer in [lo, hi] inclusive
		range(lo, hi) {
			if (hi <= lo) {
				return lo;
			}
			return lo + Math.floor(rng.float() * (hi - lo + 1));
		},
		// true with probability p
		chance(p) {
			return rng.float() < p;
		},
		pick(array) {
			return array[rng.int(array.length)];
		},
		// entries: [[key, weight], ...]; weights need not sum to anything
		weighted(entries) {
			const total = entries.reduce((n, [, w]) => n + Math.max(0, w), 0);
			if (total <= 0) {
				return entries.length > 0 ? entries[0][0] : undefined;
			}
			let roll = rng.float() * total;
			for (const [key, w] of entries) {
				roll -= Math.max(0, w);
				if (roll < 0) {
					return key;
				}
			}
			return entries[entries.length - 1][0];
		},
		// hex string of n characters
		hex(n) {
			let out = '';
			while (out.length < n) {
				out += Math.floor(rng.float() * 0x100000000).toString(16).padStart(8, '0');
			}
			return out.slice(0, n);
		},
		// an independent sub-stream for one generation step
		fork(label) {
			return makeRng(`${seed}|${label}`);
		},
	};
	return rng;
}
