import { describe, it, expect } from 'vitest';
import tourData from '../../json/tour.json';
import encyclopediaData from '../../json/encyclopedia.json';
import chronicleData from '../../json/chronicle.json';
import planetRecordsData from '../../json/planetRecords.json';

const eraKeys = new Set(chronicleData.eras.map((e) => e.key));
const planetKeys = new Set(planetRecordsData.map((p) => p.key));
const planetsByKey = new Map(planetRecordsData.map((p) => [p.key, p]));
const entryKeys = new Set(encyclopediaData.entries.map((e) => e.key));
const entriesByKey = new Map(encyclopediaData.entries.map((e) => [e.key, e]));

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

describe('tour.json structural validation', () => {
	const beats = tourData.beats;

	it('has beats', () => {
		expect(Array.isArray(beats)).toBe(true);
		expect(beats.length).toBeGreaterThan(0);
	});

	// At least 8 beats now (the original First Survey); the story pass adds a
	// Deep Past beat, bringing the count to 9 -- Fable tightens this to an
	// exact count at integration once the writer's beat has landed.
	it('has at least 8 beats', () => {
		expect(beats.length).toBe(9);
	});

	it('every beat has a key, title, and prose', () => {
		for (const beat of beats) {
			expect(beat.key, 'key').toBeTruthy();
			expect(beat.title, `${beat.key} title`).toBeTruthy();
			expect(beat.prose, `${beat.key} prose`).toBeTruthy();
		}
	});

	it('order values are 0..N-1, unique, and contiguous', () => {
		const orders = beats.map((b) => b.order);
		const sorted = [...orders].sort((a, b) => a - b);
		expect(new Set(orders).size, 'orders must be unique').toBe(orders.length);
		expect(sorted).toEqual(Array.from({ length: beats.length }, (_, i) => i));
	});

	it('every beat has a real era key', () => {
		for (const beat of beats) {
			expect(eraKeys.has(beat.era), `${beat.key} era ${beat.era}`).toBe(true);
		}
	});

	it('every beat has 1 to 4 worlds, all real planet keys', () => {
		for (const beat of beats) {
			expect(Array.isArray(beat.worlds), `${beat.key} worlds`).toBe(true);
			expect(beat.worlds.length, `${beat.key} worlds count`).toBeGreaterThanOrEqual(1);
			expect(beat.worlds.length, `${beat.key} worlds count`).toBeLessThanOrEqual(4);
			for (const world of beat.worlds) {
				expect(planetKeys.has(world), `${beat.key} world ${world}`).toBe(true);
			}
		}
	});

	it('every beat lists real entry keys', () => {
		for (const beat of beats) {
			expect(Array.isArray(beat.entries), `${beat.key} entries`).toBe(true);
			for (const entryKey of beat.entries) {
				expect(entryKeys.has(entryKey), `${beat.key} entry ${entryKey}`).toBe(true);
			}
		}
	});

	it('every beat has at least two sources, each resolving to an existing history paragraph', () => {
		for (const beat of beats) {
			expect(Array.isArray(beat.sources), `${beat.key} sources`).toBe(true);
			expect(beat.sources.length, `${beat.key} sources count`).toBeGreaterThanOrEqual(2);
			for (const source of beat.sources) {
				expect(source.planet, `${beat.key} source planet`).toBeTruthy();
				expect(typeof source.paragraph, `${beat.key} source paragraph`).toBe('number');
				const planet = planetsByKey.get(source.planet);
				expect(planet, `${beat.key} source planet ${source.planet} exists`).toBeDefined();
				if (planet) {
					expect(
						source.paragraph >= 0 && source.paragraph < planet.history.length,
						`${beat.key} source ${source.planet}:${source.paragraph} resolves to a history paragraph`
					).toBe(true);
				}
			}
		}
	});

	it('every beat prose is 120 to 220 words', () => {
		for (const beat of beats) {
			const wordCount = beat.prose.trim().split(/\s+/).filter(Boolean).length;
			expect(wordCount, `${beat.key} word count (${wordCount})`).toBeGreaterThanOrEqual(120);
			expect(wordCount, `${beat.key} word count (${wordCount})`).toBeLessThanOrEqual(220);
		}
	});

	it('no beat prose or title contains an em dash or en dash', () => {
		for (const beat of beats) {
			expect(DASH_RE.test(beat.prose), `${beat.key} prose has a dash`).toBe(false);
			expect(DASH_RE.test(beat.title), `${beat.key} title has a dash`).toBe(false);
		}
	});

	it('no beat prose contains a four-digit number (years are forbidden; three-digit numbers like 606 are fine)', () => {
		for (const beat of beats) {
			const match = beat.prose.match(FOUR_DIGIT_RE);
			expect(match, `${beat.key} prose contains four-digit number ${match && match[0]}`).toBeNull();
		}
	});

	// entries[] is the "records consulted" list, not a list of titles named in
	// the prose; a beat may consult an entry it only alludes to. Every beat must
	// still name at least one of its consulted entries so the auto-linker has
	// something to catch.
	it('every beat names at least one of its consulted entries in its prose', () => {
		for (const beat of beats) {
			const named = beat.entries
				.map((key) => entriesByKey.get(key))
				.filter(Boolean)
				.some((entry) => containsWholeWord(beat.prose, entry.title) || containsWholeWord(beat.prose, entry.title + 's'));
			expect(named, `${beat.key}: none of its consulted entries is named in the prose`).toBe(true);
		}
	});

	it('no beat prose contains a banned word', () => {
		for (const beat of beats) {
			for (const word of BANNED_WORDS) {
				expect(
					containsWholeWord(beat.prose, word),
					`${beat.key}: banned word "${word}" found in prose`
				).toBe(false);
			}
		}
	});
});

describe('encyclopedia.json structural validation', () => {
	const entries = encyclopediaData.entries;

	it('no entry definition contains an em dash or en dash', () => {
		for (const entry of entries) {
			expect(DASH_RE.test(entry.definition || ''), `${entry.key} definition has a dash`).toBe(false);
		}
	});

	it('every entry has a non-empty definition', () => {
		for (const entry of entries) {
			expect(typeof entry.definition, `${entry.key} definition type`).toBe('string');
			expect(entry.definition.trim().length, `${entry.key} definition non-empty`).toBeGreaterThan(0);
		}
	});

	it('every related key exists', () => {
		for (const entry of entries) {
			for (const relatedKey of entry.related || []) {
				expect(entryKeys.has(relatedKey), `${entry.key} -> related ${relatedKey}`).toBe(true);
			}
		}
	});

	it('every key is kebab-case', () => {
		const kebabRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
		for (const entry of entries) {
			expect(kebabRe.test(entry.key), `${entry.key} is kebab-case`).toBe(true);
		}
	});

	it('every key is unique', () => {
		const counts = new Map();
		for (const entry of entries) {
			counts.set(entry.key, (counts.get(entry.key) || 0) + 1);
		}
		for (const [key, count] of counts) {
			expect(count, `${key} appears ${count} times`).toBe(1);
		}
	});
});
