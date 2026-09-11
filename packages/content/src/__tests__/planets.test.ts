import { describe, expect, it } from 'vitest';
import { PlanetRecordsSchema, PlanetsSchema } from '../schema/planets.ts';
import planets from '../../json/planets.json' with { type: 'json' };
import planetRecords from '../../json/planetRecords.json' with { type: 'json' };

describe('planets.json (legacy)', () => {
  it('validates against PlanetsSchema', () => {
    const result = PlanetsSchema.safeParse(planets);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
  });
});

describe('planetRecords.json', () => {
  it('validates against PlanetRecordsSchema', () => {
    const result = PlanetRecordsSchema.safeParse(planetRecords);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
  });

  it('requires the habitable band used by creature validation', () => {
    const withoutBand = JSON.parse(JSON.stringify(planetRecords));
    delete (withoutBand[0] as { environment?: unknown }).environment;
    expect(PlanetRecordsSchema.safeParse(withoutBand).success).toBe(false);
  });
});
