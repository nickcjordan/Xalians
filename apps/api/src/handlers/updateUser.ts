/*
	PATCH /db/user. Updates the caller's own user record given a hard coded action
	keyword. The subject always comes from the JWT; any userId in the body is ignored.

	ACTIONS:
		REMOVE_XALIAN_ID

	ADD_XALIAN_ID is rejected: keeping a xalian is now the server-side effect of
	POST /db/xalian (createXalian.ts), which verifies the server's own signature before
	persisting and appending the id in one call. ADD_TOKENS and REMOVE_TOKENS are rejected:
	token accounting is server-only (nothing spends tokens yet; issuance never went through
	the client). usersRepo.removeTokens and addXalianId are not deleted -- the registry
	(D1) and future token spending still use them -- only their client entry points are
	closed here.

	REMOVE_XALIAN_ID is atomic (audit F9): it uses a condition expression as a race guard
	around a read that makes the common case a no-op/lookup. See repositories/users.ts for
	the expression.
*/
import { ApiError, withApi } from '../lib/api.ts';
import { UpdateUserBodySchema } from '../lib/schemas.ts';
import * as usersRepo from '../repositories/users.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ subject, body, requestId }) => {
    const userId = subject as string;

    if (body.action === 'ADD_TOKENS' || body.action === 'REMOVE_TOKENS') {
      throw new ApiError(403, 'FORBIDDEN_ACTION', 'Token accounting is server-side');
    }

    if (body.action === 'ADD_XALIAN_ID') {
      throw new ApiError(403, 'FORBIDDEN_ACTION', 'Keeping is server-side');
    }

    // body.action === 'REMOVE_XALIAN_ID'
    let result: usersRepo.RemoveXalianIdResult;
    try {
      result = await usersRepo.removeXalianId(userId, body.value);
    } catch (err) {
      if (err instanceof usersRepo.ConditionFailedError) {
        throw new ApiError(409, 'CONFLICT', err.message);
      }
      throw err;
    }
    if (result === 'not-found') {
      throw new ApiError(400, 'XALIAN_NOT_FOUND_IN_USER', 'Did not find xalian with xalianId=' + body.value);
    }
    log.info('updateXalianUser success', { requestId, userId, action: body.action });
    return { status: 200, body: { message: 'ok' } };
  },
  { auth: 'jwt', body: UpdateUserBodySchema }
);
