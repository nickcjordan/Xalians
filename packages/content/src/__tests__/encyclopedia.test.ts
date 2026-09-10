import { describe, expect, it } from 'vitest';
import { EncyclopediaSchema } from '../schema/encyclopedia.ts';
import encyclopedia from '../../json/encyclopedia.json' with { type: 'json' };

describe('encyclopedia.json', () => {
  it('validates against EncyclopediaSchema', () => {
    const result = EncyclopediaSchema.safeParse(encyclopedia);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
  });

  it('has no duplicate entry keys', () => {
    const keys = encyclopedia.entries.map((e: { key: string }) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
