// Schemas for the files that only the quarantined legacy generation engine and its mock
// fixtures still use: moves.json and qualifiers.json (the word corpora
// ai.js/moveBuilder.js draw from) and the mock legacy Xalian / user records under
// json/mock/ (consumed by the duel prototype and account-page mocks). These are not part
// of the ratified record system; schemas here are permissive on purpose so the legacy
// engine's ad hoc fields (which vary move to move) do not need to be fully enumerated.
import { z } from 'zod';

export const LegacyMoveSchema = z.object({
  name: z.string().min(1),
  definition: z.string().min(1),
  effectRating: z.number(),
  sentencePrefix: z.string(),
  category: z.enum(['standard', 'special']),
});

export const MovesSchema = z.array(LegacyMoveSchema);

export const LegacyQualifierSchema = z.object({
  name: z.string().min(1),
  definition: z.string().min(1),
  effectRating: z.number(),
});

export const QualifiersSchema = z.array(LegacyQualifierSchema);

// The legacy wire-format Xalian, as translator.translateCharacterToPresentableType()
// produces it (CLAUDE.md: "the internal character.js model is not the API shape"). Mock
// fixtures under json/mock/ carry this shape for the duel prototype and account-page
// previews. Only the fields every consumer relies on are asserted; everything else
// (stats' per-stat point-allocation details, per-move rating/cost/type) is passed through
// unvalidated because it belongs to the scrapped stat system this schema does not want to
// pin down further.
export const LegacyXalianItemSchema = z
  .object({
    xalianId: z.string().min(1),
    speciesId: z.string().min(1),
    createTimestamp: z.number(),
    species: z.record(z.string(), z.unknown()),
    elements: z.record(z.string(), z.unknown()),
    healthPoints: z.number(),
    stats: z.record(z.string(), z.unknown()),
    moves: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();

export const LegacyXalianListSchema = z.array(LegacyXalianItemSchema);

// The raw DynamoDB row shape (responseBuilder.buildXalianTableItem / xalianDbDelegate's
// getXalianBatch, which returns data.Responses.XalianTable unwrapped verbatim): the key
// attributes plus the whole translated record nested under `attributes`. This is what
// userTableCRUDLambdas.retrieveXalianUser's populateXalians path actually returns, which
// differs from the flattened shape the duel mocks (mock/mockXalianList.json,
// mock/xalianSamples.json) carry.
export const LegacyXalianTableItemSchema = z.object({
  speciesId: z.string().min(1),
  xalianId: z.string().min(1),
  attributes: LegacyXalianItemSchema,
});

export const LegacyXalianTableItemListSchema = z.array(LegacyXalianTableItemSchema);

export type LegacyMove = z.infer<typeof LegacyMoveSchema>;
export type LegacyQualifier = z.infer<typeof LegacyQualifierSchema>;
export type LegacyXalianItem = z.infer<typeof LegacyXalianItemSchema>;
export type LegacyXalianTableItem = z.infer<typeof LegacyXalianTableItemSchema>;
