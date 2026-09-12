// GET /registry/xalians/{xalianId}. Public read-only record route for share links.
// Records are public by product contract; mutations remain on authenticated routes.
import { ApiError, withApi } from '../lib/api.ts';
import { RetrieveRegistryXalianParamsSchema } from '../lib/schemas.ts';
import * as registryRepo from '../repositories/registry.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ params, requestId }) => {
    const record = await registryRepo.getRecord(params.xalianId);
    if (!record) {
      throw new ApiError(404, 'XALIAN_NOT_FOUND', `Did not find xalian with xalianId=${params.xalianId}`);
    }
    log.info('retrievePublicRegistryXalian success', { requestId, xalianId: params.xalianId });
    return { status: 200, body: record };
  },
  { auth: 'none', params: RetrieveRegistryXalianParamsSchema }
);
