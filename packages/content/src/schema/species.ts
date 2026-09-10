// Schema for the legacy species.json (lambda/src/json today; CLAUDE.md: "29 canon species
// ... traits block -- canFly, attackRange -- used by the duel game"). Kept for contrast
// and for the duel prototype, which still reads this shape; the ratified replacement is
// speciesTemplate.ts / record.ts.
import { z } from 'zod';
import { LegacyElementNameSchema } from './typeEffectiveness.ts';

const RatingSchema = z.enum(['', 'low', 'medium', 'high']);

const StatRatingsSchema = z.object({
  healthRating: RatingSchema,
  standardAttackRating: RatingSchema,
  specialAttackRating: RatingSchema,
  standardDefenseRating: RatingSchema,
  specialDefenseRating: RatingSchema,
  speedRating: RatingSchema,
  evasionRating: RatingSchema,
  staminaRating: RatingSchema,
  recoveryRating: RatingSchema,
});

const LegacySpeciesTraitsSchema = z.object({
  canFly: z.boolean(),
  attackRange: z.enum(['low', 'medium', 'high']),
});

const LegacySpeciesEntrySchema = z.object({
  name: z.string().min(1),
  id: z.string().regex(/^\d+$/),
  type: LegacyElementNameSchema,
  planet: z.string().min(1),
  height: z.string().min(1),
  weight: z.string().min(1),
  description: z.string().min(1),
  statRatings: StatRatingsSchema,
  traits: LegacySpeciesTraitsSchema,
});

export const LegacySpeciesSchema = z.array(LegacySpeciesEntrySchema);

export type LegacySpeciesEntry = z.infer<typeof LegacySpeciesEntrySchema>;
