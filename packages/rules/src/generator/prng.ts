/*
	Generator PRNG: a 128-bit deterministic stream (generator 0.2.0).

	The generator must reproduce the same creature from the same seed forever (the record
	contract in docs/design/xalian-creature-data-structure.md, section 1). Every decision
	draws from a small deterministic stream; each generation step forks its own labelled
	sub-stream so that adding a draw to one step never shifts the draws of another
	(domain separation, per the redesign doc's spec parking lot).

	Why 128 bits (Decision 7 of docs/design/xalian-creature-system-hardening.md). The
	redesign doc section 3 mints a creature from a random 128-bit seed, and a Scrambler
	Token genome is that seed. Generator 0.1.0 folded any seed string into a single 32-bit
	word before stepping mulberry32, so the whole genome collapsed to at most about four
	billion distinct streams per species, and two independently minted tokens would expand
	to the same creature after roughly 65,000 mints (the birthday bound, sqrt of 2^32).
	Ephemeral Reclamation rosters never noticed; anything persisted and owned would.

	So the seed string is now hashed with cyrb128 into four 32-bit words, which seed
	xoshiro128** (128 bits of state, period 2^128 - 1, all four words feeding every draw).
	A fork hashes `${seed}|${label}` into its own four words, so sub-streams stay
	independent of each other and of the parent.

	The public surface is unchanged (float, int, range, chance, pick, weighted, hex, fork),
	so callers do not care; only the numbers moved, which is what GENERATOR_VERSION pins.
*/

export interface Rng {
	// uniform in [0, 1)
	float(): number;
	// integer in [0, maxExclusive)
	int(maxExclusive: number): number;
	// integer in [lo, hi] inclusive
	range(lo: number, hi: number): number;
	// true with probability p
	chance(p: number): boolean;
	pick<T>(array: T[]): T;
	// entries: [[key, weight], ...]; weights need not sum to anything
	weighted<T>(entries: Array<[T, number]>): T | undefined;
	// hex string of n characters
	hex(n: number): string;
	// an independent sub-stream for one generation step
	fork(label: string): Rng;
}

type Seed = string | number;

// cyrb128: a seed string to four well-mixed 32-bit words. Numbers are stringified so a
// numeric seed and its decimal spelling mean the same stream.
function cyrb128(seed: Seed): [number, number, number, number] {
	const str = String(seed);
	let h1 = 1779033703;
	let h2 = 3144134277;
	let h3 = 1013904242;
	let h4 = 2773480762;
	for (let i = 0; i < str.length; i++) {
		const k = str.charCodeAt(i);
		h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
		h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
		h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
		h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
	}
	h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
	h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
	h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
	h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
	const words: [number, number, number, number] = [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
	// xoshiro's all-zero state is a fixed point; it is unreachable in practice but cheap
	// to rule out.
	if (words[0] === 0 && words[1] === 0 && words[2] === 0 && words[3] === 0) {
		words[0] = 0x9e3779b9;
	}
	return words;
}

// xoshiro128**: 128 bits of state, one uniform in [0, 1) per step.
function makeXoshiro([w0, w1, w2, w3]: [number, number, number, number]): () => number {
	let a = w0 >>> 0;
	let b = w1 >>> 0;
	let c = w2 >>> 0;
	let d = w3 >>> 0;
	return function next() {
		let r = Math.imul(b, 5);
		r = Math.imul((r << 7) | (r >>> 25), 9);
		const t = b << 9;
		c ^= a;
		d ^= b;
		b ^= c;
		a ^= d;
		c ^= t;
		d = (d << 11) | (d >>> 21);
		return (r >>> 0) / 4294967296;
	};
}

export function makeRng(seed: Seed): Rng {
	const next = makeXoshiro(cyrb128(seed));
	const rng: Rng = {
		// uniform in [0, 1)
		float() {
			return next();
		},
		// integer in [0, maxExclusive)
		int(maxExclusive: number) {
			return Math.floor(rng.float() * maxExclusive);
		},
		// integer in [lo, hi] inclusive
		range(lo: number, hi: number) {
			if (hi <= lo) {
				return lo;
			}
			return lo + Math.floor(rng.float() * (hi - lo + 1));
		},
		// true with probability p
		chance(p: number) {
			return rng.float() < p;
		},
		pick<T>(array: T[]): T {
			return array[rng.int(array.length)];
		},
		// entries: [[key, weight], ...]; weights need not sum to anything
		weighted<T>(entries: Array<[T, number]>): T | undefined {
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
		hex(n: number) {
			let out = '';
			while (out.length < n) {
				out += Math.floor(rng.float() * 0x100000000).toString(16).padStart(8, '0');
			}
			return out.slice(0, n);
		},
		// an independent sub-stream for one generation step
		fork(label: string) {
			return makeRng(`${seed}|${label}`);
		},
	};
	return rng;
}
