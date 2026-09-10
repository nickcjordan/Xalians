import { describe, expect, it } from 'vitest';
import { TypeEffectivenessMatrixSchema } from '../schema/typeEffectiveness.ts';
import matrix from '../../json/typeEffectivenessMatrix.json' with { type: 'json' };

describe('typeEffectivenessMatrix.json', () => {
  it('validates against TypeEffectivenessMatrixSchema', () => {
    const result = TypeEffectivenessMatrixSchema.safeParse(matrix);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
  });

  it('is a complete 14x14 matrix', () => {
    expect(Object.keys(matrix).length).toBe(14);
    for (const row of Object.values(matrix)) {
      expect(Object.keys(row as object).length).toBe(14);
    }
  });
});
