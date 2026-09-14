import { randomBytes } from 'node:crypto';
import { TradeOfferSchema } from '@xalians/content/schema';
import { ApiError, withApi } from '../lib/api.ts';
import { CreateTradeBodySchema } from '../lib/schemas.ts';
import * as registryRepo from '../repositories/registry.ts';
import * as tradesRepo from '../repositories/trades.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ subject, body, requestId }) => {
    const proposerId = subject as string;
    const recipientId = body.recipientId.toLowerCase();
    if (recipientId === proposerId) {
      throw new ApiError(400, 'INVALID_TRADE', 'Choose a different owner for a trade');
    }

    if (body.counterTo) {
      const original = await tradesRepo.getTrade(body.counterTo);
      if (!original) throw new ApiError(404, 'TRADE_NOT_FOUND', 'The original trade was not found');
      if (original.status !== 'open') throw new ApiError(409, 'TRADE_CONFLICT', 'The original offer is no longer open');
      if (original.recipientId !== proposerId || original.proposerId !== recipientId) {
        throw new ApiError(403, 'NOT_TRADE_PARTICIPANT', 'Only the recipient may counter this offer');
      }
    }

    const allIds = [...body.offeredXalianIds, ...body.requestedXalianIds];
    const items = await Promise.all(allIds.map((id) => registryRepo.getItem(id)));
    if (items.some((item) => !item)) {
      throw new ApiError(404, 'XALIAN_NOT_FOUND', 'One or more Xalians in this proposal no longer exist');
    }

    const offered = items.slice(0, body.offeredXalianIds.length);
    const requested = items.slice(body.offeredXalianIds.length);
    if (offered.some((item) => item?.ownerId !== proposerId)) {
      throw new ApiError(403, 'NOT_OWNER', 'You may only offer Xalians you own');
    }
    if (requested.some((item) => item?.ownerId !== recipientId)) {
      throw new ApiError(409, 'TRADE_CONFLICT', 'One or more requested Xalians changed owners');
    }

    const trade = TradeOfferSchema.parse({
      id: `trd_${randomBytes(12).toString('hex')}`,
      proposerId,
      recipientId,
      offeredXalianIds: body.offeredXalianIds,
      requestedXalianIds: body.requestedXalianIds,
      status: 'open',
      createdAt: new Date().toISOString(),
      counterTo: body.counterTo,
    });

    try {
      await tradesRepo.createTrade(trade);
    } catch (err) {
      if (err instanceof tradesRepo.TradeConflictError) {
        throw new ApiError(409, 'TRADE_CONFLICT', err.message);
      }
      throw err;
    }

    log.info('createTrade success', { requestId, tradeId: trade.id, proposerId, recipientId });
    return { status: 201, body: trade };
  },
  { auth: 'jwt', body: CreateTradeBodySchema }
);
