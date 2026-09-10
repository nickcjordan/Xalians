// GET /db/xalian and GET /db/xalians. Requires an authenticated caller; any authenticated
// caller may read any xalian (collections are viewable by other users, e.g. from
// userDetailsPage). Both routes point at this handler (see main.tf); the query param
// accepts either a single id or a comma-separated list.
import { ApiError, withApi } from '../lib/api.ts';
import { RetrieveXalianQuerySchema } from '../lib/schemas.ts';
import * as xaliansRepo from '../repositories/xalians.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ query, requestId }) => {
    const xalianIds = query.xalianId.split(',');

    if (xalianIds.length === 1) {
      const xalianId = xalianIds[0];
      const xalian = await xaliansRepo.getXalian(xalianId);
      if (!xalian) {
        throw new ApiError(400, 'XALIAN_NOT_FOUND', 'Did not find xalian with xaianId=' + xalianId);
      }
      log.info('retrieveXalian success', { requestId, xalianId });
      return { status: 200, body: xalian };
    }

    const batch = await xaliansRepo.getXalianBatch(xalianIds);
    // Return bare xalians like the single-id path does, not raw table items.
    const unwrapped = batch.map((item) =>
      item && typeof item === 'object' && 'attributes' in item ? (item as { attributes: unknown }).attributes : item
    );
    log.info('retrieveXalian batch success', { requestId, count: unwrapped.length });
    return { status: 200, body: unwrapped };
  },
  { auth: 'jwt', query: RetrieveXalianQuerySchema }
);
