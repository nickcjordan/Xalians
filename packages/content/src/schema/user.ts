// Schema for the DynamoDB user item as the API returns it: { userId, tokens, attributes }.
// The legacy xalianIds list was removed in the v5 cutover (issue #796): creatures live
// only in XalianRegistry and are listed through GET /xalians, so the account record
// carries no creature ids.
import { z } from 'zod';

export const UserRecordSchema = z.object({
  userId: z.string().min(1),
  tokens: z.number().nonnegative(),
  // Free-form account attributes (token balance, Arcade credit bookkeeping), so this is
  // intentionally unshaped beyond "an object".
  attributes: z.record(z.string(), z.unknown()),
});

// What a stranger may see of an account. Issue #180 emptied it down to the id: an
// owner's creatures come from GET /xalians?ownerId=... as full CreatureRecords. Fields return here as they earn a
// reason to be public (a display name, a join date, a count).
export const PublicProfileSchema = z.object({
  userId: z.string().min(1),
});

export type UserRecord = z.infer<typeof UserRecordSchema>;
export type PublicProfile = z.infer<typeof PublicProfileSchema>;
