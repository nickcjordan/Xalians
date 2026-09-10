import { describe, expect, it } from 'vitest';
import { XalianRecordSchema } from '../schema/record.ts';
import sampleGraviclaw from '../../../../docs/design/sample-record-graviclaw.json' with { type: 'json' };

function parseOrThrow<T>(schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: unknown[] }; data?: T } }, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`${label} failed validation:\n${JSON.stringify(result.error?.issues, null, 2)}`);
  }
  return result.data as T;
}

describe('XalianRecordSchema', () => {
  it('validates the ratified sample record (sample-record-graviclaw.json)', () => {
    parseOrThrow(XalianRecordSchema, sampleGraviclaw, 'sample-record-graviclaw.json');
  });

  it('rejects a record whose id does not start with xal_', () => {
    const bad = { ...sampleGraviclaw, id: 'not-a-record-id' };
    expect(XalianRecordSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a record with more than one signature ability', () => {
    const bad = {
      ...sampleGraviclaw,
      abilities: sampleGraviclaw.abilities.map((a) => ({ ...a, signature: true })),
    };
    expect(XalianRecordSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a record whose breathes phases are not a subset of ambientMedia', () => {
    const bad = {
      ...sampleGraviclaw,
      physiology: {
        ...sampleGraviclaw.physiology,
        breathes: ['vacuum'],
      },
    };
    expect(XalianRecordSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an element block whose primary is not affinities-at-100', () => {
    const bad = {
      ...sampleGraviclaw,
      element: { primary: 'dark', affinities: { dark: 80 } },
    };
    expect(XalianRecordSchema.safeParse(bad).success).toBe(false);
  });
});
