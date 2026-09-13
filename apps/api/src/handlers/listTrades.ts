import { withApi } from '../lib/api.ts';
import * as tradesRepo from '../repositories/trades.ts';
import * as log from '../lib/log.ts';

// The authenticated caller's trade activity. The repository queries both participant
// indexes; callers cannot select another account and cannot enumerate unrelated offers.
export const handler = withApi(
  async ({ subject, requestId }) => {
    const userId = subject as string;
    const items = await tradesRepo.listTradesForUser(userId);

    log.info('listTrades success', { requestId, userId, count: items.length });
    return { status: 200, body: { items } };
  },
  { auth: 'jwt' }
);
