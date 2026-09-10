// GET /db/user. Subject comes from the JWT, never from the client. With no userId query
// param the caller gets their own full record; with a userId param that matches the
// subject, same thing; with a userId param for someone else, only the public profile
// (userId + xalianIds, optionally populated xalians) is returned.
//
// Lazy creation (audit F16): when the target is the caller's own id and no record exists
// yet, the record is created here rather than returning USER_NOT_FOUND, replacing the
// browser-side create-after-sign-up call that could be skipped if the tab closed early.
import { ApiError, withApi } from '../lib/api.ts';
import { RetrieveUserQuerySchema } from '../lib/schemas.ts';
import * as usersRepo from '../repositories/users.ts';
import * as xaliansRepo from '../repositories/xalians.ts';
import * as log from '../lib/log.ts';
import type { UserRecord, PublicProfile } from '@xalians/content/schema';

function publicProfile(user: UserRecord): PublicProfile {
  return { userId: user.userId, xalianIds: user.xalianIds };
}

export const handler = withApi(
  async ({ subject, query, requestId }) => {
    const requestedUserId = query.userId ? query.userId.toLowerCase() : null;
    const targetUserId = requestedUserId ?? (subject as string);
    const isOwnProfile = targetUserId === subject;
    const shouldPopulateXalians = query.populateXalians === 'true';

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

    let xalians: unknown[] | undefined;
    if (shouldPopulateXalians && user.xalianIds.length > 0) {
      xalians = await xaliansRepo.getXalianBatch(user.xalianIds);
    }

    log.info('retrieveXalianUser success', { requestId, targetUserId, isOwnProfile });

    if (isOwnProfile) {
      return { status: 200, body: xalians ? { ...user, xalians } : user };
    }

    const profile = publicProfile(user);
    return { status: 200, body: xalians ? { ...profile, xalians } : profile };
  },
  { auth: 'jwt', query: RetrieveUserQuerySchema }
);
