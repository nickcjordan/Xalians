import { describe, expect, it } from 'vitest';
import { SpeciesRecordsBundleSchema } from '../schema/speciesTemplate.ts';
import bundle from '../../json/speciesRecords.json' with { type: 'json' };

describe('speciesRecords.json', () => {
  it('validates against SpeciesRecordsBundleSchema', () => {
    const result = SpeciesRecordsBundleSchema.safeParse(bundle);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.data.records.length).toBeGreaterThan(0);
  });

  it('has no duplicate species keys', () => {
    const keys = bundle.records.map((r: { key: string }) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
