// POST /db/user. Ignores any userId in the body; the record is always created for the
// subject. Idempotent: an existing record is left untouched (see
// repositories/users.ts createUserIfMissing's ConditionExpression).
import { withApi } from '../lib/api.ts';
import * as usersRepo from '../repositories/users.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ subject, requestId }) => {
    const userId = subject as string;
    await usersRepo.createUserIfMissing(userId);
    log.info('createXalianUser success', { requestId, userId });
    return { status: 200, body: { message: 'ok' } };
  },
  { auth: 'jwt' }
);
