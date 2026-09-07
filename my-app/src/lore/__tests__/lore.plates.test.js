import { describe, it, expect } from 'vitest';
import path from 'path';
import { createRequire } from 'module';
import platesData from '../../json/plates.json';
import { erasInOrder } from '../loaders';

const require = createRequire(import.meta.url);
const fs = require('fs');
const erasDir = path.join(__dirname, '..', '..', '..', 'public', 'assets', 'img', 'lore', 'eras');

const eraKeys = new Set(erasInOrder.map((e) => e.key));

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

describe('plates.json structural validation', () => {
	const plates = platesData.plates || [];

	it('has exactly 7 plates', () => {
		expect(plates.length).toBe(7);
	});

	it('every era key is a real era key and unique', () => {
		const seen = new Map();
		for (const plate of plates) {
			expect(eraKeys.has(plate.era), `${plate.era} is a real era key`).toBe(true);
			expect(seen.has(plate.era), `${plate.era} appears more than once`).toBe(false);
			seen.set(plate.era, true);
		}
	});

	it('every file and small file exists on disk under public/assets/img/lore/eras', () => {
		for (const plate of plates) {
			const filePath = path.join(erasDir, plate.file);
			const smallPath = path.join(erasDir, plate.small);
			expect(fs.existsSync(filePath), `${plate.era}: ${plate.file} exists`).toBe(true);
			expect(fs.existsSync(smallPath), `${plate.era}: ${plate.small} exists`).toBe(true);
		}
	});

	it('every alt and caption is a non-empty string', () => {
		for (const plate of plates) {
			expect(typeof plate.alt, `${plate.era} alt`).toBe('string');
			expect(plate.alt.trim().length, `${plate.era} alt non-empty`).toBeGreaterThan(0);
			expect(typeof plate.caption, `${plate.era} caption`).toBe('string');
			expect(plate.caption.trim().length, `${plate.era} caption non-empty`).toBeGreaterThan(0);
		}
	});

	it('alt and caption contain no em dash or en dash', () => {
		for (const plate of plates) {
			expect(DASH_RE.test(plate.alt), `${plate.era} alt has a dash`).toBe(false);
			expect(DASH_RE.test(plate.caption), `${plate.era} caption has a dash`).toBe(false);
		}
	});

	it('alt and caption contain no four-digit number', () => {
		for (const plate of plates) {
			const altMatch = plate.alt.match(FOUR_DIGIT_RE);
			expect(altMatch, `${plate.era} alt contains four-digit number ${altMatch && altMatch[0]}`).toBeNull();
			const capMatch = plate.caption.match(FOUR_DIGIT_RE);
			expect(capMatch, `${plate.era} caption contains four-digit number ${capMatch && capMatch[0]}`).toBeNull();
		}
	});

	it('alt and caption contain no banned word', () => {
		for (const plate of plates) {
			for (const word of BANNED_WORDS) {
				expect(
					containsWholeWord(plate.alt, word),
					`${plate.era}: banned word "${word}" found in alt`
				).toBe(false);
				expect(
					containsWholeWord(plate.caption, word),
					`${plate.era}: banned word "${word}" found in caption`
				).toBe(false);
			}
		}
	});

	it('every plate has a non-empty run string and an integer seed', () => {
		for (const plate of plates) {
			expect(typeof plate.run, `${plate.era} run`).toBe('string');
			expect(plate.run.trim().length, `${plate.era} run non-empty`).toBeGreaterThan(0);
			expect(Number.isInteger(plate.seed), `${plate.era} seed is an integer`).toBe(true);
		}
	});
});
