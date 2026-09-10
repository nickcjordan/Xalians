import { describe, expect, it } from 'vitest';
import { LegacySpeciesSchema } from '../schema/species.ts';
import species from '../../json/species.json' with { type: 'json' };

describe('species.json (legacy)', () => {
  it('validates against LegacySpeciesSchema', () => {
    const result = LegacySpeciesSchema.safeParse(species);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
  });
});
