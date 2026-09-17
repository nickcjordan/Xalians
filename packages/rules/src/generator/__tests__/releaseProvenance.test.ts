import { describe, expect, test } from 'vitest';
import { generateBatch, generateXalian, getSpeciesTemplate, getSpeciesTemplates, GENERATION_RELEASE_ID } from '../index.ts';

const generatedAt = '2026-09-15T12:34:56.000Z';

describe('generation release provenance', () => {
	test('species keys and canonical templates identify the frozen release', () => {
		const template = getSpeciesTemplate('graviclaw')!;
		for (const species of ['graviclaw', template]) {
			expect(generateXalian(species, 'release-proof', { generatedAt }).provenance.releaseId).toBe(GENERATION_RELEASE_ID);
		}
	});

	test('custom templates cannot claim the canonical release, even with the same key', () => {
		const custom = structuredClone(getSpeciesTemplate('graviclaw')!);
		expect(generateXalian(custom, 'custom', { generatedAt }).provenance.releaseId).toBeUndefined();
	});

	test('mixed batches identify only canonical inputs across repeated selections', () => {
		const canonical = getSpeciesTemplate('graviclaw')!;
		const custom = structuredClone(canonical);
		const records = generateBatch(6, 'mixed', { templates: [canonical, custom], generatedAt });
		expect(records.map(record => record.provenance.releaseId)).toEqual([
			GENERATION_RELEASE_ID, undefined, GENERATION_RELEASE_ID, undefined, GENERATION_RELEASE_ID, undefined,
		]);
		expect(generateBatch(3, 'default', { generatedAt }).every(record => record.provenance.releaseId === GENERATION_RELEASE_ID)).toBe(true);
	});

	test('public template access cannot mutate canonical generation inputs', () => {
		const before = generateXalian('graviclaw', 'immutable', { generatedAt });
		const templates = getSpeciesTemplates();
		const template = templates.find(candidate => candidate.key === 'graviclaw')!;
		expect(() => { template.name = 'Changed'; }).toThrow(TypeError);
		expect(() => { template.actions[0].effects.length = 0; }).toThrow(TypeError);
		templates.length = 0;
		expect(getSpeciesTemplates().length).toBeGreaterThan(0);
		expect(generateXalian('graviclaw', 'immutable', { generatedAt })).toEqual(before);
	});
});
