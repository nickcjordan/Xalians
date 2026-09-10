import { describe, expect, it } from 'vitest';
import {
  ChronicleSchema,
  GradeCalibrationSchema,
  NarrationSchema,
  PlatesSchema,
  SitesSchema,
  TourSchema,
} from '../schema/lore.ts';
import chronicle from '../../json/chronicle.json' with { type: 'json' };
import narration from '../../json/narration.json' with { type: 'json' };
import tour from '../../json/tour.json' with { type: 'json' };
import plates from '../../json/plates.json' with { type: 'json' };
import sites from '../../json/sites.json' with { type: 'json' };
import gradeCalibration from '../../json/gradeCalibration.json' with { type: 'json' };

function assertValid(schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: unknown[] } } }, value: unknown) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(JSON.stringify(result.error?.issues, null, 2));
  }
}

describe('lore bundles', () => {
  it('chronicle.json validates against ChronicleSchema', () => {
    assertValid(ChronicleSchema, chronicle);
  });

  it('narration.json validates against NarrationSchema', () => {
    assertValid(NarrationSchema, narration);
  });

  it('tour.json validates against TourSchema', () => {
    assertValid(TourSchema, tour);
  });

  it('plates.json validates against PlatesSchema', () => {
    assertValid(PlatesSchema, plates);
  });

  it('sites.json validates against SitesSchema', () => {
    assertValid(SitesSchema, sites);
  });

  it('sites.json has an entry for all 14 planets', () => {
    expect(Object.keys(sites).length).toBe(14);
  });

  it('gradeCalibration.json validates against GradeCalibrationSchema', () => {
    assertValid(GradeCalibrationSchema, gradeCalibration);
  });
});
