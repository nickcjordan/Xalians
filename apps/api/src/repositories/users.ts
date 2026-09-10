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

// Per-owner, per-species generation counter, read by generateRegistryXalian to fill
// provenance.serial ("the 1-based count of records this owner has generated of this
// species" per docs/design/xalian-creature-data-structure.md's provenance.serial note).
// The caller must have already ensured the user item exists (createUserIfMissing).
//
// This needs two separate UpdateCommands, not one:
//   1. SET #attrs.#serials = if_not_exists(#attrs.#serials, :empty) initializes the
//      per-species map the first time this owner ever generates anything. ADD cannot do
//      this itself: DynamoDB does not auto-vivify an intermediate map for a nested ADD
//      path, so `ADD #attrs.#serials.#species :one` fails with a document-path
//      ValidationException while attributes.serials does not yet exist, even though
//      attributes itself does (createUserIfMissing seeds attributes: {}). This first
//      update is idempotent (if_not_exists is a no-op once the map exists), so repeat
//      calls for the same owner do not disturb existing per-species counters.
//   2. ADD #attrs.#serials.#species :one increments (or creates) that one species' count
//      and returns it.
//   These cannot be combined into one UpdateExpression: DynamoDB rejects a single
//   expression whose clauses name overlapping document paths (here, #attrs.#serials and
//   #attrs.#serials.#species overlap), the same rule documented above removeTokens.
//
// If generation or persistence fails after this increments, the serial is simply skipped
// (an owner's per-species serials can have gaps) -- acceptable, since serial is bookkeeping
// for display/rarity flavor, not a dense sequence anything depends on.
export async function nextSerial(userId: string, speciesKey: string): Promise<number> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId },
      UpdateExpression: 'SET #attrs.#serials = if_not_exists(#attrs.#serials, :empty)',
      ExpressionAttributeNames: { '#attrs': 'attributes', '#serials': 'serials' },
      ExpressionAttributeValues: { ':empty': {} },
    })
  );

  const result = await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId },
      UpdateExpression: 'ADD #attrs.#serials.#species :one',
      ExpressionAttributeNames: { '#attrs': 'attributes', '#serials': 'serials', '#species': speciesKey },
      ExpressionAttributeValues: { ':one': 1 },
      ReturnValues: 'UPDATED_NEW',
    })
  );

  const updatedAttributes = (result.Attributes?.attributes ?? {}) as Record<string, unknown>;
  const serials = (updatedAttributes.serials ?? {}) as Record<string, unknown>;
  const value = serials[speciesKey];
  if (typeof value !== 'number') {
    throw new Error(`nextSerial: UpdateCommand did not return a numeric counter for ${userId}/${speciesKey}`);
  }
  return value;
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
