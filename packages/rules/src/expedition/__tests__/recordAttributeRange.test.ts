import { describe, test, expect } from 'vitest';
import { XalianRecordSchema } from '@xalians/content/schema';
import { generateXalian } from '../../generator/index.ts';
import { RAW_ATTRIBUTE_MIN, RAW_ATTRIBUTE_MAX } from '../expeditionInterpretation.ts';

/*
	PASS 46 (open item 8). The hold compression reads attributes against a scale, and the
	record schema publishes the range every attribute sits in. The schema is frozen with the
	generation release, so the game restates the range; this holds the two equal.
*/
describe('the hold scale is the record schema attribute range', () => {
	const record = generateXalian('yetimoth', 'attribute-range');
	const withVitality = (value: number) => ({ ...record, attributes: { ...record.attributes, vitality: value } });

	test('the schema accepts both ends of the scale', () => {
		expect(XalianRecordSchema.safeParse(withVitality(RAW_ATTRIBUTE_MIN)).success).toBe(true);
		expect(XalianRecordSchema.safeParse(withVitality(RAW_ATTRIBUTE_MAX)).success).toBe(true);
	});

	test('and refuses anything past either end', () => {
		expect(XalianRecordSchema.safeParse(withVitality(RAW_ATTRIBUTE_MIN - 0.5)).success).toBe(false);
		expect(XalianRecordSchema.safeParse(withVitality(RAW_ATTRIBUTE_MAX + 0.5)).success).toBe(false);
	});
});
