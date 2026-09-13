// Promise-returning repository for XalianUsersTable (key: userId). No callbacks; every
// function either resolves or throws. Mutations that can race (adding/removing a
// xalianId, spending tokens) use DynamoDB condition expressions instead of a blind
// read-modify-write, so two concurrent requests cannot silently drop one write.
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { UserRecord } from '@xalians/content/schema';
import { ddb } from '../lib/db.ts';
import * as log from '../lib/log.ts';

const TABLE_NAME = 'XalianUsersTable';

export class ConditionFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConditionFailedError';
  }
}

type StoredUserItem = {
  userId: string;
  xalianIds?: string[];
  attributes?: Record<string, unknown>;
};

function toUserRecord(item: StoredUserItem): UserRecord {
  const attributes = item.attributes ?? {};
  const tokens = typeof attributes.tokens === 'number' ? attributes.tokens : 0;
  return {
    userId: item.userId,
    xalianIds: item.xalianIds ?? [],
    tokens,
    attributes,
  };
}

export async function getUser(userId: string): Promise<UserRecord | null> {
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { userId }, ConsistentRead: true }));
    return result.Item ? toUserRecord(result.Item as StoredUserItem) : null;
  } catch (err) {
    log.error('getUser failed', { userId, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }
}

// Idempotent create: a record that already exists is left untouched, so a repeated
// lazy-create on sign-in (or a retried POST /db/user) never clobbers existing xalianIds
// or attributes.
export async function createUserIfMissing(userId: string): Promise<void> {
  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { userId, xalianIds: [], attributes: {} },
        ConditionExpression: 'attribute_not_exists(userId)',
      })
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
      return;
    }
    throw err;
  }
}

export type AddXalianIdResult = 'added' | 'already-present';

// A single ConditionExpression cannot say "append this id only if it is not already
// present and only if the list already contains other ids" in one atomic step, so this
// reads first to make the common case (and the idempotent-retry case) a no-op without an
// extra write, then appends under a NOT contains(...) condition as the race guard: two
// concurrent adds of the same id can both pass the read check, but only one write wins.
export async function addXalianId(userId: string, xalianId: string): Promise<AddXalianIdResult> {
  const user = await getUser(userId);
  if (user && user.xalianIds.includes(xalianId)) {
    return 'already-present';
  }

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId },
        UpdateExpression: 'SET xalianIds = list_append(if_not_exists(xalianIds, :empty), :ids)',
        ConditionExpression: 'NOT contains(xalianIds, :id)',
        ExpressionAttributeValues: { ':ids': [xalianId], ':id': xalianId, ':empty': [] },
      })
    );
    return 'added';
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
      return 'already-present';
    }
    throw err;
  }
}

export type RemoveXalianIdResult = 'removed' | 'not-found';

// Reads to find the index (DynamoDB has no "remove by value" update), then removes that
// exact index under a condition that the value at it has not changed since the read. A
// concurrent mutation that shifted the list between the read and the write fails the
// condition rather than silently deleting the wrong element.
export async function removeXalianId(userId: string, xalianId: string): Promise<RemoveXalianIdResult> {
  const user = await getUser(userId);
  const index = user ? user.xalianIds.indexOf(xalianId) : -1;
  if (index === -1) {
    return 'not-found';
  }

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId },
        UpdateExpression: `REMOVE xalianIds[${index}]`,
        ConditionExpression: `xalianIds[${index}] = :id`,
        ExpressionAttributeValues: { ':id': xalianId },
      })
    );
    return 'removed';
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
      throw new ConditionFailedError(`xalianIds for ${userId} changed between the read and the write; retry`);
    }
    throw err;
  }
}

export type RemoveTokensResult = 'ok' | 'insufficient';

// The ConditionExpression requires attributes.tokens to exist and cover the amount, so
// the subtraction can reference the path directly. Do not add if_not_exists
// initializers for #attrs here: DynamoDB rejects an UpdateExpression whose SET clauses
// name overlapping document paths (#attrs and #attrs.tokens), so that form fails every
// spend at runtime. A user with no attributes map or no tokens field simply fails the
// condition, which is the correct "insufficient" answer.
export async function removeTokens(userId: string, amount: number): Promise<RemoveTokensResult> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId },
        UpdateExpression: 'SET #attrs.tokens = #attrs.tokens - :n',
        ConditionExpression: '#attrs.tokens >= :n',
        ExpressionAttributeNames: { '#attrs': 'attributes' },
        ExpressionAttributeValues: { ':n': amount },
      })
    );
    return 'ok';
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
      return 'insufficient';
    }
    throw err;
  }
}

export type ArcadeAwardResult = {
  awardedCredits: number;
  credits: number;
  earnedToday: number;
  dailyCap: number;
  tokensAwarded: number;
  tokenBalance: number;
  duplicate: boolean;
};

const ARCADE_DAILY_CAP = 100;
const ARCADE_TOKEN_PRICE = 100;

const finiteNonnegative = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

// Credits and token conversion are one CAS-protected write. Replacing the attributes map
// is safe here because the equality condition rejects any concurrent account mutation;
// the retry then recomputes against the fresh map instead of dropping either write.
export async function awardArcadeCredits(
  userId: string,
  day: string,
  sessionId: string,
  requestedAward: number
): Promise<ArcadeAwardResult> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let user = await getUser(userId);
    if (!user) {
      await createUserIfMissing(userId);
      user = await getUser(userId);
      if (!user) throw new Error(`Could not initialize account for ${userId}`);
    }

    const expected = { ...user.attributes };
    const sameDay = expected.arcadeDay === day;
    const claims = sameDay && Array.isArray(expected.arcadeClaimIds)
      ? expected.arcadeClaimIds.filter((claim): claim is string => typeof claim === 'string')
      : [];
    const credits = finiteNonnegative(expected.arcadeCredits);
    const earnedToday = sameDay ? finiteNonnegative(expected.arcadeEarnedToday) : 0;
    const tokenBalance = finiteNonnegative(expected.tokens);

    if (claims.includes(sessionId)) {
      return { awardedCredits: 0, credits, earnedToday, dailyCap: ARCADE_DAILY_CAP, tokensAwarded: 0, tokenBalance, duplicate: true };
    }

    const awardedCredits = Math.min(Math.max(0, Math.floor(requestedAward)), Math.max(0, ARCADE_DAILY_CAP - earnedToday));
    const combined = credits + awardedCredits;
    const tokensAwarded = Math.floor(combined / ARCADE_TOKEN_PRICE);
    const nextAttributes = {
      ...expected,
      arcadeDay: day,
      arcadeCredits: combined % ARCADE_TOKEN_PRICE,
      arcadeEarnedToday: earnedToday + awardedCredits,
      arcadeClaimIds: [...claims, sessionId],
      tokens: tokenBalance + tokensAwarded,
    };

    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { userId },
          UpdateExpression: 'SET #attrs = :next',
          ConditionExpression: 'attribute_not_exists(#attrs) OR #attrs = :expected',
          ExpressionAttributeNames: { '#attrs': 'attributes' },
          ExpressionAttributeValues: { ':expected': expected, ':next': nextAttributes },
        })
      );
      return {
        awardedCredits,
        credits: nextAttributes.arcadeCredits,
        earnedToday: nextAttributes.arcadeEarnedToday,
        dailyCap: ARCADE_DAILY_CAP,
        tokensAwarded,
        tokenBalance: nextAttributes.tokens,
        duplicate: false,
      };
    } catch (err) {
      if (!(err instanceof Error) || err.name !== 'ConditionalCheckFailedException') throw err;
    }
  }
  throw new ConditionFailedError(`Account ${userId} changed repeatedly while awarding Arcade Credits; retry`);
}
