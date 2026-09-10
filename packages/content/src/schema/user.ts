// Schema for the DynamoDB user item as the API returns it. Shape read from
// apps/api/src/database/userDbDelegate.js (getUser assembles { userId, xalianIds, tokens,
// attributes } from the stored item) and userTableCRUDLambdas.js (retrieveXalianUser
// builds a "public profile" of userId + xalianIds, optionally populated with xalians, for
// anyone requesting someone else's record).
import { z } from 'zod';
import { LegacyXalianTableItemSchema } from './legacy.ts';

export const UserRecordSchema = z.object({
  userId: z.string().min(1),
  xalianIds: z.array(z.string().min(1)),
  tokens: z.number().nonnegative(),
  // Free-form: userDbDelegate.buildXalianUsersTableItem stores the whole incoming user
  // object here (responseBuilder.js:66-72), so this is intentionally unshaped beyond
  // "an object".
  attributes: z.record(z.string(), z.unknown()),
});

export const PublicProfileSchema = z.object({
  userId: z.string().min(1),
  xalianIds: z.array(z.string().min(1)),
  // Present only when the caller requested populateXalians=true; items are raw XalianTable
  // rows (speciesId/xalianId/attributes), not the ratified XalianRecord, because the
  // populated table today is the legacy XalianTable (see legacy.ts).
  xalians: z.array(LegacyXalianTableItemSchema).optional(),
});

export type UserRecord = z.infer<typeof UserRecordSchema>;
export type PublicProfile = z.infer<typeof PublicProfileSchema>;
