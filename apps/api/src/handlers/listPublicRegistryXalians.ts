// GET /registry/owners/{ownerId}/xalians. Public read-only binder route. The owner
// must be explicit so this route never guesses identity from an unverified request.
import { withApi } from '../lib/api.ts';
import { PublicRegistryListQuerySchema, PublicRegistryOwnerParamsSchema } from '../lib/schemas.ts';
import * as registryRepo from '../repositories/registry.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ params, query, requestId }) => {
    const result = await registryRepo.listByOwner(params.ownerId.toLowerCase(), {
      limit: query.limit,
      cursor: query.cursor,
    });

    log.info('listPublicRegistryXalians success', {
      requestId,
      ownerId: params.ownerId,
      count: result.items.length,
    });
    return {
      status: 200,
      body: result.nextCursor ? { items: result.items, nextCursor: result.nextCursor } : { items: result.items },
    };
  },
  { auth: 'none', params: PublicRegistryOwnerParamsSchema, query: PublicRegistryListQuerySchema }
);
