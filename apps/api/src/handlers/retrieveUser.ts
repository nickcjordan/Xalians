// GET /db/user. Subject comes from the JWT, never from the client. With no userId query
// param the caller gets their own full record; with a userId param that matches the
// subject, same thing; with a userId param for someone else, only the public profile.
//
// Lazy creation (audit F16): when the target is the caller's own id and no record exists
// yet, the record is created here rather than returning USER_NOT_FOUND, replacing the
// browser-side create-after-sign-up call that could be skipped if the tab closed early.
//
// The user record no longer carries creatures. `populateXalians` batch-loaded the legacy
// XalianTable, which was retired with issue #180; the parameter is accepted and ignored,
// and a caller wanting someone's creatures reads GET /xalians?ownerId=... instead. That
// also empties the public profile down to the one field a stranger may see today.
import { ApiError, withApi } from '../lib/api.ts';
import { RetrieveUserQuerySchema } from '../lib/schemas.ts';
import * as usersRepo from '../repositories/users.ts';
import * as log from '../lib/log.ts';
import type { UserRecord, PublicProfile } from '@xalians/content/schema';

function publicProfile(user: UserRecord): PublicProfile {
  return { userId: user.userId };
}

export const handler = withApi(
  async ({ subject, query, requestId }) => {
    const requestedUserId = query.userId ? query.userId.toLowerCase() : null;
    const targetUserId = requestedUserId ?? (subject as string);
    const isOwnProfile = targetUserId === subject;

    let user = await usersRepo.getUser(targetUserId);

    if (!user) {
      if (isOwnProfile) {
        await usersRepo.createUserIfMissing(targetUserId);
        user = { userId: targetUserId, xalianIds: [], tokens: 0, attributes: {} };
        log.info('retrieveXalianUser lazily created user record', { requestId, targetUserId });
      } else {
        throw new ApiError(400, 'USER_NOT_FOUND', 'Did not find user with userId=' + targetUserId);
      }
    }

    log.info('retrieveXalianUser success', { requestId, targetUserId, isOwnProfile });

    return { status: 200, body: isOwnProfile ? user : publicProfile(user) };
  },
  { auth: 'jwt', query: RetrieveUserQuerySchema }
);
