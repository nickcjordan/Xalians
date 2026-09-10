/*
	PATCH /db/user. Updates the caller's own user record given a hard coded action
	keyword. The subject always comes from the JWT; any userId in the body is ignored.

	ACTIONS:
		ADD_XALIAN_ID
		REMOVE_XALIAN_ID
		REMOVE_TOKENS

	ADD_TOKENS is rejected: token issuance is server-only.

	The three real actions are atomic (audit F9): ADD_XALIAN_ID and REMOVE_XALIAN_ID use a
	condition expression as a race guard around a read that makes the common case a
	no-op/lookup, REMOVE_TOKENS is a single conditional SET. See repositories/users.ts for
	the expressions.
*/
import { ApiError, withApi } from '../lib/api.ts';
import { UpdateUserBodySchema } from '../lib/schemas.ts';
import * as usersRepo from '../repositories/users.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ subject, body, requestId }) => {
    const userId = subject as string;

    if (body.action === 'ADD_TOKENS') {
      throw new ApiError(403, 'FORBIDDEN_ACTION', 'Token issuance is server-only');
    }

    if (body.action === 'ADD_XALIAN_ID') {
      await usersRepo.addXalianId(userId, body.value);
      log.info('updateXalianUser success', { requestId, userId, action: body.action });
      return { status: 200, body: { message: 'ok' } };
    }

    if (body.action === 'REMOVE_XALIAN_ID') {
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
    }

    // body.action === 'REMOVE_TOKENS'
    const result = await usersRepo.removeTokens(userId, body.value);
    if (result === 'insufficient') {
      throw new ApiError(400, 'INSUFFICIENT_TOKENS', `User tokens were not enough to remove requested [${body.value}]`);
    }
    log.info('updateXalianUser success', { requestId, userId, action: body.action });
    return { status: 200, body: { message: 'ok' } };
  },
  { auth: 'jwt', body: UpdateUserBodySchema }
);
