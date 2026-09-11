import { describe, expect, it } from 'vitest';
import { SpeciesRecordsBundleSchema, SpeciesTemplateSchema } from '../schema/speciesTemplate.ts';
import bundle from '../../json/speciesRecords.json' with { type: 'json' };

describe('speciesRecords.json', () => {
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

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

  it('requires a documented origin for every species name', () => {
    for (const record of bundle.records) {
      expect(record.nameOrigin.trim(), record.key).not.toBe('');
    }

    const missingNameOrigin = clone(bundle.records[0]) as unknown as Record<string, unknown>;
    delete missingNameOrigin.nameOrigin;
    expect(SpeciesTemplateSchema.safeParse(missingNameOrigin).success).toBe(false);
  });

  it('rejects authoring-rule drift that would change generated populations', () => {
    const base = clone(bundle.records[0]);

    const tooManyAppearanceEntries = clone(base);
    tooManyAppearanceEntries.lore.appearance = Array.from({ length: 9 }, (_, index) => `quality ${index}`);
    expect(SpeciesTemplateSchema.safeParse(tooManyAppearanceEntries).success).toBe(false);

    const badArchetypeTotal = clone(base);
    const archetypeWeights = badArchetypeTotal.archetypeWeights as unknown as Record<string, number>;
    const firstArchetype = Object.keys(archetypeWeights)[0];
    archetypeWeights[firstArchetype] -= 1;
    expect(SpeciesTemplateSchema.safeParse(badArchetypeTotal).success).toBe(false);

    const badTraitTotal = clone(base);
    const traitPool = badTraitTotal.traits.pool as unknown as Record<string, number>;
    const rolledTrait = Object.keys(traitPool).find((key) => traitPool[key] < 100);
    expect(rolledTrait).toBeDefined();
    traitPool[rolledTrait!] -= 1;
    expect(SpeciesTemplateSchema.safeParse(badTraitTotal).success).toBe(false);
  });
});
