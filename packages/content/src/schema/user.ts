// Schema for the DynamoDB user item as the API returns it. Shape read from
// apps/api/src/database/userDbDelegate.js (getUser assembles { userId, xalianIds, tokens,
// attributes } from the stored item) and userTableCRUDLambdas.js (retrieveXalianUser
// builds a "public profile" of userId + xalianIds, optionally populated with xalians, for
// anyone requesting someone else's record).
import { z } from 'zod';

export const UserRecordSchema = z.object({
  userId: z.string().min(1),
  xalianIds: z.array(z.string().min(1)),
  tokens: z.number().nonnegative(),
  // Free-form: userDbDelegate.buildXalianUsersTableItem stores the whole incoming user
  // object here (responseBuilder.js:66-72), so this is intentionally unshaped beyond
  // "an object".
  attributes: z.record(z.string(), z.unknown()),
});

// What a stranger may see of an account. Issue #180 emptied it down to the id: xalianIds
// listed the retired legacy XalianTable, and an owner's creatures now come from
// GET /xalians?ownerId=... as full XalianRecords. Fields return here as they earn a
// reason to be public (a display name, a join date, a count).
export const PublicProfileSchema = z.object({
  userId: z.string().min(1),
});

export type UserRecord = z.infer<typeof UserRecordSchema>;
export type PublicProfile = z.infer<typeof PublicProfileSchema>;
