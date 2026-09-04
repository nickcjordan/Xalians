import { describe, it, expect } from 'vitest';
import narrationData from '../../json/narration.json';
import encyclopediaData from '../../json/encyclopedia.json';
import planetRecordsData from '../../json/planetRecords.json';

const planetKeys = new Set(planetRecordsData.map((p) => p.key));
const planetsByKey = new Map(planetRecordsData.map((p) => [p.key, p]));
const entryKeys = new Set(encyclopediaData.entries.map((e) => e.key));

const DASH_RE = /[—–]/; // em dash, en dash
const FOUR_DIGIT_RE = /\b\d{4}\b/;
const BANNED_WORDS = ['NFT', 'blockchain', 'crypto', 'token minting', 'wallet', 'HP', 'damage', 'stat', 'cooldown'];

function escapeRegExp(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWholeWord(text, word) {
	const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
	return re.test(text);
}

describe('narration.json structural validation', () => {
	const worlds = narrationData.worlds || [];

	// This validator runs long before the fifteen texts (contract §Narration)
	// are written -- narration.json currently ships with worlds: [], which is
	// fine (loaders.js / narration.js treat a missing world as "no lede yet").
	// Once ledes start landing, every one of them must satisfy every rule
	// below; Fable tightens this to exactly 14 at integration.
	it('has exactly 14 worlds', () => {
		expect(worlds.length).toBe(14);
	});

	it('every world key is real and unique', () => {
		const seen = new Map();
		for (const lede of worlds) {
			expect(planetKeys.has(lede.key), `${lede.key} is a real world key`).toBe(true);
			expect(seen.has(lede.key), `${lede.key} appears more than once`).toBe(false);
			seen.set(lede.key, true);
		}
	});

	it('every lede has a key and prose', () => {
		for (const lede of worlds) {
			expect(lede.key, 'key').toBeTruthy();
			expect(lede.prose, `${lede.key} prose`).toBeTruthy();
		}
	});

	it('every prose is 50 to 110 words', () => {
		for (const lede of worlds) {
			const wordCount = lede.prose.trim().split(/\s+/).filter(Boolean).length;
			expect(wordCount, `${lede.key} word count (${wordCount})`).toBeGreaterThanOrEqual(50);
			expect(wordCount, `${lede.key} word count (${wordCount})`).toBeLessThanOrEqual(110);
		}
	});

	it('every lede has at least two sources, each resolving to a history paragraph of that same world', () => {
		for (const lede of worlds) {
			expect(Array.isArray(lede.sources), `${lede.key} sources`).toBe(true);
			expect(lede.sources.length, `${lede.key} sources count`).toBeGreaterThanOrEqual(2);
			for (const source of lede.sources) {
				expect(source.planet, `${lede.key} source planet`).toBe(lede.key);
				expect(typeof source.paragraph, `${lede.key} source paragraph`).toBe('number');
				const planet = planetsByKey.get(source.planet);
				expect(planet, `${lede.key} source planet ${source.planet} exists`).toBeDefined();
				if (planet) {
					expect(
						source.paragraph >= 0 && source.paragraph < planet.history.length,
						`${lede.key} source ${source.planet}:${source.paragraph} resolves to a history paragraph`
					).toBe(true);
				}
			}
		}
	});

	it('no lede prose contains an em dash or en dash', () => {
		for (const lede of worlds) {
			expect(DASH_RE.test(lede.prose), `${lede.key} prose has a dash`).toBe(false);
		}
	});

	it('no lede prose contains a four-digit number (years are forbidden; three-digit numbers like 606 are fine)', () => {
		for (const lede of worlds) {
			const match = lede.prose.match(FOUR_DIGIT_RE);
			expect(match, `${lede.key} prose contains four-digit number ${match && match[0]}`).toBeNull();
		}
	});

	it('no lede prose contains a banned word', () => {
		for (const lede of worlds) {
			for (const word of BANNED_WORDS) {
				expect(
					containsWholeWord(lede.prose, word),
					`${lede.key}: banned word "${word}" found in prose`
				).toBe(false);
			}
		}
	});

	it('every lede names its own world in the prose', () => {
		for (const lede of worlds) {
			const planet = planetsByKey.get(lede.key);
			const name = planet ? planet.name : lede.key;
			expect(containsWholeWord(lede.prose, name), `${lede.key}: world name "${name}" not named in prose`).toBe(true);
		}
	});

	it('every consulted entry key is real', () => {
		for (const lede of worlds) {
			for (const entryKey of lede.entries || []) {
				expect(entryKeys.has(entryKey), `${lede.key} entry ${entryKey}`).toBe(true);
			}
		}
	});
});
