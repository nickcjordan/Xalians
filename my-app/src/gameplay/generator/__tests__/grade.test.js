import { describe, test, expect } from 'vitest';
import { gradeRecord, gradeWithBundledCalibration } from '../grade.js';
import { getSpeciesTemplates, generateBatch } from '../index.js';

/*
	Decision 11 (docs/design/xalian-creature-system-hardening.md WP4): gradeRecord is an
	information-theoretic score over a record plus a calibration lookup, never a field on
	the record. These fixtures build minimal templates/records by hand so each assertion
	isolates one scoring rule instead of depending on the generator's own randomness.
*/

const ATTRIBUTE_KEYS = ['strength', 'vitality', 'endurance', 'agility', 'reflex', 'intelligence', 'willpower', 'instinct', 'charisma', 'resilience'];

function baseTemplate(overrides = {}) {
	const attributes = {};
	ATTRIBUTE_KEYS.forEach((k) => {
		attributes[k] = [30, 70];
	});
	return {
		key: 'fixture',
		attributes,
		physiology: { size: { heightCm: [100, 200], weightKg: [50, 150] } },
		traits: { pool: {} },
		...overrides,
	};
}

function baseRecord(overrides = {}) {
	const attributes = {};
	ATTRIBUTE_KEYS.forEach((k) => {
		attributes[k] = 50; // dead center of the default [30, 70] band on every attribute
	});
	return {
		species: 'fixture',
		attributes,
		physiology: { heightCm: 150, weightKg: 100 }, // dead center of the default bands
		element: { primary: 'fire', affinities: { fire: 100 } },
		traits: [],
		appearance: { finish: 'standard' },
		abilities: [
			{ name: 'Signature', signature: true, instrument: 'body', action: 'strike', medium: 'fire', intensity: 70 },
			{ name: 'Rolled', signature: false, instrument: 'body', action: 'burst', medium: 'fire', intensity: 50 },
		],
		...overrides,
	};
}

describe('gradeRecord: never mutates the record', () => {
	test('the record is unchanged after grading', () => {
		const template = baseTemplate({ traits: { pool: { stealthy: 40 } } });
		const record = baseRecord({ traits: ['stealthy'] });
		const before = JSON.parse(JSON.stringify(record));
		gradeRecord(record, template, null);
		expect(record).toEqual(before);
	});
});

describe('gradeRecord: traits', () => {
	test('a trait that lands at 6 percent scores more than three that land at 45 percent', () => {
		const rareTemplate = baseTemplate({ traits: { pool: { rare: 6 } } });
		const rareRecord = baseRecord({ traits: ['rare'] });
		const commonTemplate = baseTemplate({ traits: { pool: { a: 45, b: 45, c: 45 } } });
		const commonRecord = baseRecord({ traits: ['a', 'b', 'c'] });

		const rareGrade = gradeRecord(rareRecord, rareTemplate, null);
		const commonGrade = gradeRecord(commonRecord, commonTemplate, null);

		expect(rareGrade.components.traits).toBeGreaterThan(commonGrade.components.traits);
		expect(rareGrade.score).toBeGreaterThan(commonGrade.score);
	});

	test('a missed low-percent trait costs almost nothing; a missed near-certain one costs a lot', () => {
		const template = baseTemplate({ traits: { pool: { rare: 6, common: 96 } } });
		const missedRare = gradeRecord(baseRecord({ traits: ['common'] }), template, null);
		const missedCommon = gradeRecord(baseRecord({ traits: ['rare'] }), template, null);
		expect(missedCommon.components.traits).toBeGreaterThan(missedRare.components.traits);
	});
});

describe('gradeRecord: secondary affinity', () => {
	test('a secondary affinity outgrades an otherwise identical record without one', () => {
		const template = baseTemplate();
		const withSecondary = gradeRecord(baseRecord({ element: { primary: 'fire', affinities: { fire: 100, rock: 60 } } }), template, null);
		const withoutSecondary = gradeRecord(baseRecord(), template, null);
		expect(withSecondary.score).toBeGreaterThan(withoutSecondary.score);
		expect(withSecondary.components.affinity).toBeGreaterThan(withoutSecondary.components.affinity);
	});
});

describe('gradeRecord: finish', () => {
	test('eclipse outgrades prismatic outgrades gleam outgrades standard', () => {
		const template = baseTemplate();
		const standard = gradeRecord(baseRecord({ appearance: { finish: 'standard' } }), template, null);
		const gleam = gradeRecord(baseRecord({ appearance: { finish: 'gleam' } }), template, null);
		const prismatic = gradeRecord(baseRecord({ appearance: { finish: 'prismatic' } }), template, null);
		const eclipse = gradeRecord(baseRecord({ appearance: { finish: 'eclipse' } }), template, null);

		expect(eclipse.score).toBeGreaterThan(prismatic.score);
		expect(prismatic.score).toBeGreaterThan(gleam.score);
		expect(gleam.score).toBeGreaterThan(standard.score);
	});
});

describe('gradeWithBundledCalibration', () => {
	test('returns a percentile in 0..100 for every ratified species over a small batch', () => {
		const templates = getSpeciesTemplates();
		const templateByKey = new Map(templates.map((t) => [t.key, t]));
		const batch = generateBatch(templates.length * 5, 'grade-test-seed');
		expect(batch.length).toBeGreaterThan(0);
		batch.forEach((record) => {
			const template = templateByKey.get(record.species);
			const graded = gradeWithBundledCalibration(record, template);
			expect(typeof graded.score).toBe('number');
			expect(graded.percentile).toBeGreaterThanOrEqual(0);
			expect(graded.percentile).toBeLessThanOrEqual(100);
			expect(['standard', 'select', 'prime', 'apex']).toContain(graded.tier);
		});
	});
});
