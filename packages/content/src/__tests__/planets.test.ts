import { describe, expect, it } from 'vitest';
import { PlanetArtworkSchema, PlanetRecordsSchema, PlanetsSchema } from '../schema/planets.ts';
import planets from '../../json/planets.json' with { type: 'json' };
import planetRecords from '../../json/planetRecords.json' with { type: 'json' };
import planetArtwork from '../../json/planetArtwork.json' with { type: 'json' };

describe('planet artwork', () => {
  it('provides a complete captioned pair for each world and keeps landscape references in sync', () => {
    const artwork = PlanetArtworkSchema.parse(planetArtwork);
    expect(Object.keys(artwork).sort()).toEqual(planetRecords.map(p => p.key).sort());
    for (const world of planetRecords) {
      expect(artwork[world.key][0].src).toBe(world.images.landscape);
      expect(planets.find(p => p.name === world.name)?.image).toBe(world.images.landscape);
      expect(new Set(artwork[world.key].map(image => image.src)).size).toBe(2);
    }
  });
});

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
