// GET /xalians/{xalianId} (D1, the registry). Any authenticated caller may read any
// registry record (they are public, like the legacy collection view); ownership only
// gates generation and future spends. 404 XALIAN_NOT_FOUND here, unlike the legacy
// /db/xalian route which keeps its historical 400 XALIAN_NOT_FOUND for compatibility.
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
    log.info('retrieveRegistryXalian success', { requestId, xalianId: params.xalianId });
    return { status: 200, body: record };
  },
  { auth: 'jwt', params: RetrieveRegistryXalianParamsSchema }
);
