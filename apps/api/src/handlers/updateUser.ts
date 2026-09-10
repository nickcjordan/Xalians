/*
	PATCH /db/user. Every action is rejected with 403 FORBIDDEN_ACTION.

	The route is kept, and keeps accepting the body shape, only until a real user-settings
	action exists to put through it. Nothing a client could send is legitimate today:
	ADD_XALIAN_ID and REMOVE_XALIAN_ID wrote the user record's `xalianIds` list, which
	belonged to the legacy XalianTable keep flow retired with issue #180 (creatures now
	live in XalianRegistry, and releasing one is DELETE /xalians/{xalianId}); ADD_TOKENS
	and REMOVE_TOKENS were already server-only, because token accounting never went
	through the browser.

	Answering 403 rather than 404 or a 400 is deliberate: a stale client learns that the
	action is not permitted, not that the route or its shape is wrong.
*/
import { ApiError, withApi } from '../lib/api.ts';
import { UpdateUserBodySchema } from '../lib/schemas.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ subject, body, requestId }) => {
    log.info('updateXalianUser rejected', { requestId, userId: subject, action: body.action });
    throw new ApiError(403, 'FORBIDDEN_ACTION', `"${body.action}" is not a permitted user action`);
  },
  { auth: 'jwt', body: UpdateUserBodySchema }
);
