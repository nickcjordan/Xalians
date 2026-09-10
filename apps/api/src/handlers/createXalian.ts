// POST /db/xalian. Requires an authenticated caller. The body is still trusted as-is; a
// later PR (Wave D, D1 in docs/design/backend-modernization-plan.md) moves generation
// server-side so a client can no longer post arbitrary stats.
import { withApi } from '../lib/api.ts';
import { CreateXalianBodySchema } from '../lib/schemas.ts';
import * as xaliansRepo from '../repositories/xalians.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ body, requestId }) => {
    await xaliansRepo.createXalian(body);
    log.info('createXalian success', { requestId, xalianId: body.xalianId });
    return { status: 200, body: { message: 'ok' } };
  },
  { auth: 'jwt', body: CreateXalianBodySchema }
);
