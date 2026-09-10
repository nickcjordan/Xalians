// DELETE /xalians/{xalianId} (the registry). Releasing a Xalian: the owner gives it up
// and the registry item is removed. Reading a record is open to any authenticated caller
// (retrieveRegistryXalian.ts), but writing is owner-only, so a record that exists and
// belongs to someone else is a 403 rather than a silent no-op, and one that does not
// exist is a 404.
import { ApiError, withApi } from '../lib/api.ts';
import { ReleaseRegistryXalianParamsSchema } from '../lib/schemas.ts';
import * as registryRepo from '../repositories/registry.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ subject, params, requestId }) => {
    const ownerId = subject as string;
    const item = await registryRepo.getItem(params.xalianId);

    if (!item) {
      throw new ApiError(404, 'XALIAN_NOT_FOUND', `Did not find xalian with xalianId=${params.xalianId}`);
    }
    if (item.ownerId !== ownerId) {
      throw new ApiError(403, 'NOT_OWNER', 'Only the owner of a Xalian may release it');
    }

    await registryRepo.deleteRecord(params.xalianId);

    log.info('releaseRegistryXalian success', { requestId, ownerId, xalianId: params.xalianId });
    return { status: 200, body: { message: 'ok' } };
  },
  { auth: 'jwt', params: ReleaseRegistryXalianParamsSchema }
);
