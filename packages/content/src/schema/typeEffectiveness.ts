// Schema for typeEffectivenessMatrix.json: the legacy 14x14 element type-effectiveness
// matrix (capitalized element names, per lambda/src/json and CLAUDE.md's duel-game combat
// section). Multipliers are the closed set {0, 0.5, 1, 1.5, 2}.
import { z } from 'zod';

export const LEGACY_ELEMENT_NAMES = [
  'Fire',
  'Water',
  'Air',
  'Electric',
  'Rock',
  'Plant',
  'Chemical',
  'Light',
  'Dark',
  'Psychic',
  'Ghost',
  'Metal',
  'Ice',
  'Sand',
] as const;

export const LegacyElementNameSchema = z.enum(LEGACY_ELEMENT_NAMES);

const MultiplierSchema = z.union([
  z.literal(0),
  z.literal(0.5),
  z.literal(1),
  z.literal(1.5),
  z.literal(2),
]);

const MatrixRowSchema = z.object(
  Object.fromEntries(LEGACY_ELEMENT_NAMES.map((name) => [name, MultiplierSchema])) as Record<
    (typeof LEGACY_ELEMENT_NAMES)[number],
    typeof MultiplierSchema
  >,
);

export const TypeEffectivenessMatrixSchema = z.object(
  Object.fromEntries(LEGACY_ELEMENT_NAMES.map((name) => [name, MatrixRowSchema])) as Record<
    (typeof LEGACY_ELEMENT_NAMES)[number],
    typeof MatrixRowSchema
  >,
);

export type TypeEffectivenessMatrix = z.infer<typeof TypeEffectivenessMatrixSchema>;
