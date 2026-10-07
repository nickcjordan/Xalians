import { describe, test, expect } from 'vitest';
import { CreatureRecordSchema } from '@xalians/content/creature';
import { generateXalian, getSpeciesTemplates } from '../../generator/canonicalCreatureRelease.ts';
import { RAW_ATTRIBUTE_MIN, RAW_ATTRIBUTE_MAX } from '../expeditionInterpretation.ts';

/*
	PASS 46 (open item 8). The hold compression reads attributes against a scale, and the
	creature record's attributes are ratings. The schema bounds a rating below (a
	non-negative integer) but states no ceiling, so the game restates the range and this holds
	it equal to what the generator actually produces for every species.
*/
describe('the hold scale is the range generated attributes sit in', () => {
	const records = getSpeciesTemplates().map((template: { key: string; homePlanet?: string }, i: number) =>
		generateXalian(template.key, `attribute-range-${i}`, {
			origin: String(template.homePlanet || template.key), serial: i + 1, profile: 'full', generatedAt: '2026-09-21T00:00:00.000Z',
		}));
	const withVitality = (value: number) => ({ ...records[0], attributes: { ...records[0].attributes, vitality: value } });

	test('every generated attribute is inside the scale the hold compression reads', () => {
		expect(records.length).toBeGreaterThan(0);
		records.forEach((record: any) => {
			Object.values(record.attributes as Record<string, number>).forEach((value) => {
				expect(value).toBeGreaterThanOrEqual(RAW_ATTRIBUTE_MIN);
				expect(value).toBeLessThanOrEqual(RAW_ATTRIBUTE_MAX);
			});
		});
	});

	test('the schema accepts the low end of the scale, and refuses anything below it', () => {
		expect(CreatureRecordSchema.safeParse(withVitality(RAW_ATTRIBUTE_MIN)).success).toBe(true);
		expect(CreatureRecordSchema.safeParse(withVitality(RAW_ATTRIBUTE_MIN - 1)).success).toBe(false);
		expect(CreatureRecordSchema.safeParse(withVitality(RAW_ATTRIBUTE_MIN + 0.5)).success).toBe(false);
	});
});
