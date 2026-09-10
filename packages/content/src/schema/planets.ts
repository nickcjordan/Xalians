// Schemas for the two planet files: planets.json (legacy, still rendered by
// apps/web/src/pages/planetPage.js) and planetRecords.json (the ratified structured
// version, physical + Generator "report" + history). Both carry long-form authored prose
// history paragraphs, which are validated structurally (array of non-empty strings), not
// word by word.
import { z } from 'zod';
import { LegacyElementNameSchema } from './typeEffectiveness.ts';
import { ElementKeySchema } from './registries.ts';

// ---- legacy planets.json ---------------------------------------------------------------

const LegacyPlanetDataSchema = z.object({
  Type: LegacyElementNameSchema,
  Terrain: z.string().min(1),
  Size: z.string().min(1),
  Radius: z.string().min(1),
  Gravity: z.string().min(1),
  'Temperature Low': z.string().min(1),
  'Temperature High': z.string().min(1),
});

const LegacyPlanetEntrySchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1),
  planetImage: z.string().min(1),
  data: LegacyPlanetDataSchema,
  history: z.array(z.string().min(1)).min(1),
});

export const PlanetsSchema = z.array(LegacyPlanetEntrySchema).length(14);

// ---- planetRecords.json ------------------------------------------------------------------

const MobilityRatingSchema = z.enum(['optimal', 'viable', 'inefficient', 'unsupported', 'not-applicable']);

const MobilityEntrySchema = z.object({
  rating: MobilityRatingSchema,
  note: z.string().min(1).optional(),
});

const PlanetRecordReportSchema = z.object({
  unit: z.string().min(1),
  protocol: z.string().min(1),
  cycle: z.string().min(1),
  terrain: z.object({
    features: z.array(z.string().min(1)).min(1),
    notes: z.string().min(1),
  }),
  mobility: z.object({
    sprint: MobilityEntrySchema,
    climb: MobilityEntrySchema,
    flight: MobilityEntrySchema,
    burrow: MobilityEntrySchema,
    swim: MobilityEntrySchema,
  }),
  fauna: z.object({
    observations: z.array(z.string().min(1)).min(1),
  }),
  hazards: z.array(z.string().min(1)),
  outputPriorities: z.array(z.string().min(1)),
});

const PlanetRecordEntrySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  element: ElementKeySchema,
  images: z.object({
    landscape: z.string().min(1),
    planet: z.string().min(1),
  }),
  physical: z.object({
    terrainLabel: z.string().min(1),
    sizeVsEarth: z.number().positive(),
    radiusMiles: z.number().positive(),
    radiusKm: z.number().positive(),
    gravityVsEarth: z.number().positive(),
    temperatureC: z.object({ low: z.number(), high: z.number() }),
  }),
  report: PlanetRecordReportSchema,
  history: z.array(z.string().min(1)).min(1),
});

export const PlanetRecordsSchema = z.array(PlanetRecordEntrySchema).length(14);

export type LegacyPlanetEntry = z.infer<typeof LegacyPlanetEntrySchema>;
export type PlanetRecordEntry = z.infer<typeof PlanetRecordEntrySchema>;
