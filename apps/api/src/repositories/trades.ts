import { GetCommand, PutCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TradeOfferSchema, type TradeOffer } from '@xalians/content/schema';
import { ddb } from '../lib/db.ts';
import * as log from '../lib/log.ts';

const TABLE_NAME = 'XalianTradeOffers';
const REGISTRY_TABLE_NAME = 'XalianRegistry';

export class TradeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TradeConflictError';
  }
}

function isConditionalFailure(err: unknown): boolean {
  return err instanceof Error && (
    err.name === 'ConditionalCheckFailedException' || err.name === 'TransactionCanceledException'
  );
}

export async function getTrade(tradeId: string): Promise<TradeOffer | null> {
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { tradeId } }));
    return result.Item ? TradeOfferSchema.parse(result.Item) : null;
  } catch (err) {
    log.error('getTrade failed', { tradeId, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }
}

export async function createTrade(trade: TradeOffer): Promise<void> {
  const item = { ...trade, tradeId: trade.id };

  try {
    if (!trade.counterTo) {
      await ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(tradeId)',
      }));
      return;
    }

    await ddb.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: item,
            ConditionExpression: 'attribute_not_exists(tradeId)',
          },
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { tradeId: trade.counterTo },
            UpdateExpression: 'SET #status = :countered, respondedAt = :respondedAt',
            ConditionExpression: '#status = :open AND recipientId = :proposerId AND proposerId = :recipientId',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':open': 'open',
              ':countered': 'countered',
              ':respondedAt': trade.createdAt,
              ':proposerId': trade.proposerId,
              ':recipientId': trade.recipientId,
            },
          },
        },
      ],
    }));
  } catch (err) {
    if (isConditionalFailure(err)) {
      throw new TradeConflictError('The original offer is no longer open for a counteroffer');
    }
    log.error('createTrade failed', { tradeId: trade.id, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }
}

// Ownership changes and the offer status transition are one DynamoDB transaction. If a
// single creature changed hands or disappeared after the proposal was created, every
// write is rolled back and the caller receives a conflict instead of a partial swap.
export async function acceptTrade(trade: TradeOffer, respondedAt: string): Promise<TradeOffer> {
  const ownershipUpdates = [
    ...trade.offeredXalianIds.map((xalianId) => ({ xalianId, from: trade.proposerId, to: trade.recipientId })),
    ...trade.requestedXalianIds.map((xalianId) => ({ xalianId, from: trade.recipientId, to: trade.proposerId })),
  ];

  try {
    await ddb.send(new TransactWriteCommand({
      TransactItems: [
        ...ownershipUpdates.map(({ xalianId, from, to }) => ({
          Update: {
            TableName: REGISTRY_TABLE_NAME,
            Key: { xalianId },
            UpdateExpression: 'SET ownerId = :newOwner',
            ConditionExpression: 'ownerId = :currentOwner AND attribute_exists(#record)',
            ExpressionAttributeNames: { '#record': 'record' },
            ExpressionAttributeValues: { ':currentOwner': from, ':newOwner': to },
          },
        })),
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { tradeId: trade.id },
            UpdateExpression: 'SET #status = :accepted, respondedAt = :respondedAt',
            ConditionExpression: '#status = :open AND recipientId = :recipientId',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':open': 'open',
              ':accepted': 'accepted',
              ':respondedAt': respondedAt,
              ':recipientId': trade.recipientId,
            },
          },
        },
      ],
    }));
  } catch (err) {
    if (isConditionalFailure(err)) {
      throw new TradeConflictError('This offer is stale or is no longer open');
    }
    log.error('acceptTrade failed', { tradeId: trade.id, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }

  return { ...trade, status: 'accepted', respondedAt };
}

export async function cancelTrade(trade: TradeOffer, proposerId: string, respondedAt: string): Promise<TradeOffer> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { tradeId: trade.id },
      UpdateExpression: 'SET #status = :cancelled, respondedAt = :respondedAt',
      ConditionExpression: '#status = :open AND proposerId = :proposerId',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':open': 'open',
        ':cancelled': 'cancelled',
        ':respondedAt': respondedAt,
        ':proposerId': proposerId,
      },
    }));
  } catch (err) {
    if (isConditionalFailure(err)) {
      throw new TradeConflictError('This offer is no longer open');
    }
    log.error('cancelTrade failed', { tradeId: trade.id, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }

  return { ...trade, status: 'cancelled', respondedAt };
}
