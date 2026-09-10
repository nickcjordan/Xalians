import { describe, expect, it } from 'vitest';
import { AbilityCatalogSchema } from '../schema/abilityCatalog.ts';
import catalog from '../../json/abilityCatalog.json' with { type: 'json' };

describe('abilityCatalog.json', () => {
  it('validates against AbilityCatalogSchema', () => {
    const result = AbilityCatalogSchema.safeParse(catalog);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues.slice(0, 20), null, 2));
    }
  });

  it('has 14 element cells', () => {
    expect(Object.keys(catalog.elements).length).toBe(14);
  });
});
