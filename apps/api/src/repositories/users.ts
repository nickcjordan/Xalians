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
    const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { userId } }));
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

// #attrs (attributes) and its tokens field may not exist yet on a user who has never held
// tokens; if_not_exists in the SET clause initializes both to a usable starting point
// (an empty map, then zero) before the subtraction is applied. The ConditionExpression
// runs against the item's state before this update, so it fails closed exactly when the
// stored balance (treated as zero when the field is absent) is less than the amount
// requested.
export async function removeTokens(userId: string, amount: number): Promise<RemoveTokensResult> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId },
        UpdateExpression: 'SET #attrs = if_not_exists(#attrs, :emptyMap), #attrs.tokens = if_not_exists(#attrs.tokens, :zero) - :n',
        ConditionExpression: '#attrs.tokens >= :n',
        ExpressionAttributeNames: { '#attrs': 'attributes' },
        ExpressionAttributeValues: { ':n': amount, ':zero': 0, ':emptyMap': {} },
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
