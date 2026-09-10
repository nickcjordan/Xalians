/*
	Integration test: every record the generator can produce must satisfy the ratified
	record schema in @xalians/content/schema (docs/design/xalian-creature-data-structure.md).
	This is the check that packages/rules/src/generator/types.ts's hand-written record
	shape (deleted in favor of re-exporting the schema type) and generate.ts's actual
	output never drift apart -- if generate.ts writes something the schema rejects, this
	is where it shows up, with the zod issue path and the species key that produced it.
*/
import { describe, test, expect } from 'vitest';
import { generateBatch, getSpeciesTemplates } from '../index.ts';
import { XalianRecordSchema } from '@xalians/content/schema';

const SEED = 'schema-integration-fixed-seed';
const COUNT = 200;

describe('generator output against XalianRecordSchema', () => {
	test('generateBatch(200, fixed seed) across every ratified species all parse', () => {
		const templates = getSpeciesTemplates();
		expect(templates.length).toBeGreaterThan(0);

		const records = generateBatch(COUNT, SEED, { templates });
		expect(records.length).toBe(COUNT);

		const failures: string[] = [];
		records.forEach((record) => {
			const result = XalianRecordSchema.safeParse(record);
			if (!result.success) {
				const paths = result.error.issues
					.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
					.join('; ');
				failures.push(`species "${record.species}" (id ${record.id}): ${paths}`);
			}
		});

		if (failures.length > 0) {
			throw new Error(`${failures.length} of ${records.length} generated records failed XalianRecordSchema:\n${failures.join('\n')}`);
		}
	});
});
