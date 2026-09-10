// Schema for abilityCatalog.json (scripts/bundleAbilityCatalog.js), the ~395 KB bundle of
// ability names cells keyed by action x element medium plus the neutral pools. Validated
// structurally, not name-by-name, to stay fast: the test suite asserts the shape and spot
// checks a sample rather than walking all ~22,700 names through zod one at a time.
import { z } from 'zod';
import { ActionKeySchema, ElementKeySchema, InstrumentKeySchema } from './registries.ts';

// An entry is a bare name string, a [name, instrumentTags] pair, or (when its heft is not
// the ordinary default of 2) a [name, instrumentTags, heft] triple. See
// scripts/bundleAbilityCatalog.js's `entry()` for exactly how these three shapes are
// produced.
const CatalogNameEntrySchema = z.union([
  z.string().min(1),
  z.tuple([z.string().min(1), z.array(InstrumentKeySchema)]),
  z.tuple([z.string().min(1), z.array(InstrumentKeySchema), z.union([z.literal(1), z.literal(2), z.literal(3)])]),
]);

// One cell: the names available for one action, drawable within one element (or the
// neutral pool). Keyed by ActionKeySchema's 16 keys, but not every action necessarily has
// a non-empty cell for every element, so this is a partial record.
const CellSchema = z.partialRecord(ActionKeySchema, z.array(CatalogNameEntrySchema));

export const AbilityCatalogSchema = z.object({
  version: z.string().min(1),
  source: z.string().min(1),
  elements: z.partialRecord(ElementKeySchema, CellSchema),
  neutral: CellSchema,
  counts: z.object({
    elements: z.partialRecord(ElementKeySchema, z.number().int().nonnegative()),
    neutral: z.partialRecord(ActionKeySchema, z.number().int().nonnegative()),
    heft: z.object({
      '1': z.number().int().nonnegative(),
      '2': z.number().int().nonnegative(),
      '3': z.number().int().nonnegative(),
    }),
  }),
});

export type AbilityCatalog = z.infer<typeof AbilityCatalogSchema>;
// Exported so consumers (packages/rules's generator) that walk individual cell entries
// have a name for one, instead of reaching into AbilityCatalog['neutral'][action][number].
export type CatalogEntry = z.infer<typeof CatalogNameEntrySchema>;
