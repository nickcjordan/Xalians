import { ApiError, withApi } from '../lib/api.ts';
import { TradeParamsSchema } from '../lib/schemas.ts';
import * as tradesRepo from '../repositories/trades.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ params, requestId }) => {
    const trade = await tradesRepo.getTrade(params.tradeId);
    if (!trade) throw new ApiError(404, 'TRADE_NOT_FOUND', 'This trade offer was not found');
    log.info('retrieveTrade success', { requestId, tradeId: trade.id, status: trade.status });
    return { status: 200, body: trade };
  },
  { auth: 'none', params: TradeParamsSchema }
);
