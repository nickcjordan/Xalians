import { ApiError, withApi } from '../lib/api.ts';
import { TradeParamsSchema } from '../lib/schemas.ts';
import * as tradesRepo from '../repositories/trades.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ subject, params, requestId }) => {
    const trade = await tradesRepo.getTrade(params.tradeId);
    if (!trade) throw new ApiError(404, 'TRADE_NOT_FOUND', 'This trade offer was not found');
    if (trade.proposerId !== subject) {
      throw new ApiError(403, 'NOT_TRADE_PROPOSER', 'Only the proposer may cancel this offer');
    }
    if (trade.status !== 'open') throw new ApiError(409, 'TRADE_CONFLICT', 'This offer is no longer open');

    try {
      const cancelled = await tradesRepo.cancelTrade(trade, subject as string, new Date().toISOString());
      log.info('cancelTrade success', { requestId, tradeId: trade.id, proposerId: subject });
      return { status: 200, body: cancelled };
    } catch (err) {
      if (err instanceof tradesRepo.TradeConflictError) {
        throw new ApiError(409, 'TRADE_CONFLICT', err.message);
      }
      throw err;
    }
  },
  { auth: 'jwt', params: TradeParamsSchema }
);
