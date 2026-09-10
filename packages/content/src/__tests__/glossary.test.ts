import { describe, expect, it } from 'vitest';
import { GlossarySchema } from '../schema/glossary.ts';
import glossary from '../../json/glossary.json' with { type: 'json' };

describe('glossary.json', () => {
  it('validates against GlossarySchema', () => {
    const result = GlossarySchema.safeParse(glossary);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
  });
});
