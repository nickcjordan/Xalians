import { describe, expect, it } from 'vitest';
import { ElementsSchema } from '../schema/elements.ts';
import elements from '../../json/elements.json' with { type: 'json' };

describe('elements.json', () => {
  it('validates against ElementsSchema', () => {
    const result = ElementsSchema.safeParse(elements);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
  });
});
