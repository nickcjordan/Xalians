// Shallow structural schemas for the pure authored-prose lore bundles: chronicle.json,
// narration.json, tour.json, plates.json, sites.json, creatureGradeCalibration.json. Per the plan
// brief, these need only enough structure to catch a shape break; the prose itself is
// hand-authored and fact-checked outside this package (see the lore-factcheck-gate rule
// in CLAUDE.md's memory), not schema-validated word by word.
import { z } from 'zod';
import { ElementKeySchema } from './registries.ts';

// ---- chronicle.json -----------------------------------------------------------------

const ChronicleEraSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  definition: z.string().min(1),
});

const ChronicleEventSchema = z
  .object({
    key: z.string().min(1),
    title: z.string().min(1),
    era: z.string().min(1),
    order: z.number(),
    firmness: z.string().min(1),
    planets: z.array(z.string().min(1)),
  })
  .passthrough();

const ChronicleParagraphSchema = z
  .object({
    planet: z.string().min(1),
    index: z.number().int().nonnegative(),
    era: z.string().min(1),
    summary: z.string().min(1),
  })
  .passthrough();

export const ChronicleSchema = z.object({
  version: z.string().min(1),
  note: z.string(),
  eras: z.array(ChronicleEraSchema).min(1),
  events: z.array(ChronicleEventSchema),
  paragraphs: z.array(ChronicleParagraphSchema),
});

// ---- narration.json -------------------------------------------------------------------

const NarrationWorldSchema = z.object({
  key: z.string().min(1),
  prose: z.string().min(1),
  sources: z.array(z.unknown()),
  entries: z.array(z.unknown()).optional(),
});

export const NarrationSchema = z.object({
  version: z.string().min(1),
  note: z.string(),
  worlds: z.array(NarrationWorldSchema).min(1),
});

// ---- tour.json ----------------------------------------------------------------------

const TourBeatSchema = z.object({
  key: z.string().min(1),
  order: z.number().int().nonnegative(),
  title: z.string().min(1),
  era: z.string().min(1),
  worlds: z.array(z.string().min(1)),
  entries: z.array(z.string().min(1)),
  sources: z.array(z.unknown()),
  prose: z.string().min(1),
});

export const TourSchema = z.object({
  version: z.string().min(1),
  note: z.string(),
  title: z.string().min(1),
  beats: z.array(TourBeatSchema).min(1),
});

// ---- plates.json --------------------------------------------------------------------

const PlateSchema = z.object({
  era: z.string().min(1),
  file: z.string().min(1),
  small: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().min(1),
  run: z.unknown().optional(),
  seed: z.unknown().optional(),
});

export const PlatesSchema = z.object({
  _about: z.string(),
  style: z.string(),
  plates: z.array(PlateSchema).min(1),
});

// ---- sites.json (keyed by capitalized legacy planet name) ---------------------------

const SiteEntrySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    planet: z.string().min(1),
    element: ElementKeySchema,
    environment: z.object({
      medium: z.string().min(1),
      temperatureC: z.object({ min: z.number(), max: z.number() }),
    }),
    description: z.string().min(1),
  })
  .passthrough();

export const SitesSchema = z.record(z.string().min(1), z.array(SiteEntrySchema));

// ---- creatureGradeCalibration.json ----------------------------------------------------
// Written by packages/rules/src/generator/devtools/simulateCreatures.ts --calibrate; read
// by creatureGrade.ts. The v5 prototype carries no generator version, so the CI check
// (npm run check:creature-simulation) is what keeps it current. One [percentile, score]
// pair per whole percentile 0..100, ascending.
export const CreatureGradeCalibrationSchema = z.strictObject({
  seed: z.string().min(1),
  n: z.number().int().positive(),
  quantiles: z.array(z.tuple([z.number().int().min(0).max(100), z.number()])).length(101),
});

export type Chronicle = z.infer<typeof ChronicleSchema>;
export type Narration = z.infer<typeof NarrationSchema>;
export type Tour = z.infer<typeof TourSchema>;
export type Plates = z.infer<typeof PlatesSchema>;
export type Sites = z.infer<typeof SitesSchema>;
export type CreatureGradeCalibration = z.infer<typeof CreatureGradeCalibrationSchema>;
