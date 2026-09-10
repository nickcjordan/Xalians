import { describe, expect, it } from 'vitest';
import { LegacyXalianListSchema, LegacyXalianTableItemListSchema, MovesSchema, QualifiersSchema } from '../schema/legacy.ts';
import moves from '../../json/moves.json' with { type: 'json' };
import qualifiers from '../../json/qualifiers.json' with { type: 'json' };
import mockXalianList from '../../json/mock/mockXalianList.json' with { type: 'json' };
import xalianSamples from '../../json/mock/xalianSamples.json' with { type: 'json' };
import mockUserData from '../../json/mock/mockUserData.json' with { type: 'json' };
import { UserRecordSchema } from '../schema/user.ts';

function assertValid(schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: unknown[] } } }, value: unknown) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(JSON.stringify(result.error?.issues, null, 2));
  }
}

describe('legacy word corpora', () => {
  it('moves.json validates against MovesSchema', () => {
    assertValid(MovesSchema, moves);
  });

  it('qualifiers.json validates against QualifiersSchema', () => {
    assertValid(QualifiersSchema, qualifiers);
  });
});

describe('mock fixtures', () => {
  it('mock/mockXalianList.json validates against LegacyXalianListSchema', () => {
    assertValid(LegacyXalianListSchema, mockXalianList);
  });

  it('mock/xalianSamples.json validates against LegacyXalianListSchema', () => {
    assertValid(LegacyXalianListSchema, xalianSamples);
  });

  it('mock/mockUserData.json validates against UserRecordSchema (xalians field aside)', () => {
    const { xalians: _xalians, ...userFields } = mockUserData as Record<string, unknown>;
    assertValid(UserRecordSchema, userFields);
  });

  it("mock/mockUserData.json's populated xalians validate as raw XalianTable rows", () => {
    assertValid(LegacyXalianTableItemListSchema, (mockUserData as { xalians: unknown }).xalians);
  });
});
