// Schema for elements.json: the legacy 14-element move-vocabulary file the generation
// engine and the duel game read (CLAUDE.md: "elements.json defines 14 element types...
// with per-element move-type vocabularies"). Each entry also carries its own full
// type-effectiveness row, capitalized, matching typeEffectivenessMatrix.json's shape.
import { z } from 'zod';
import { LEGACY_ELEMENT_NAMES } from './typeEffectiveness.ts';

const MultiplierSchema = z.union([
  z.literal(0),
  z.literal(0.5),
  z.literal(1),
  z.literal(1.5),
  z.literal(2),
]);

const EffectivenessRowSchema = z.object(
  Object.fromEntries(LEGACY_ELEMENT_NAMES.map((name) => [name, MultiplierSchema])) as Record<
    (typeof LEGACY_ELEMENT_NAMES)[number],
    typeof MultiplierSchema
  >,
);

const LegacyElementEntrySchema = z.object({
  name: z.enum(LEGACY_ELEMENT_NAMES),
  // Move-name vocabulary words drawn on by the legacy move builder; free-form, not a
  // closed registry (the legacy engine is quarantined, not extended).
  moveTypes: z.array(z.string().min(1)).min(1),
  effectiveness: EffectivenessRowSchema,
  elements: z.array(z.string().min(1)).min(1),
});

export const ElementsSchema = z.array(LegacyElementEntrySchema).length(14);

export type LegacyElementEntry = z.infer<typeof LegacyElementEntrySchema>;
