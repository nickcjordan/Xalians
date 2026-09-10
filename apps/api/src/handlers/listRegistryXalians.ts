// GET /xalians (the registry). Without ownerId, lists the caller's own generated records;
// with ownerId, lists that owner's -- registry records are public, and this is how a
// profile page reads someone's creatures now that the user record no longer carries any.
import { withApi } from '../lib/api.ts';
import { ListRegistryXaliansQuerySchema } from '../lib/schemas.ts';
import * as registryRepo from '../repositories/registry.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ subject, query, requestId }) => {
    const ownerId = query.ownerId ?? (subject as string);

    const result = await registryRepo.listByOwner(ownerId, {
      limit: query.limit,
      cursor: query.cursor,
    });

    log.info('listRegistryXalians success', { requestId, ownerId, count: result.items.length });
    return {
      status: 200,
      body: result.nextCursor ? { items: result.items, nextCursor: result.nextCursor } : { items: result.items },
    };
  },
  { auth: 'jwt', query: ListRegistryXaliansQuerySchema }
);
