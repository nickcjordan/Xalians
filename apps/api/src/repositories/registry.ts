// Promise-returning repository for XalianRegistry (hash key xalianId, GSI byOwner on
// ownerId + generatedAt). This is the only table holding creatures: the legacy XalianTable
// and its code path were retired with issue #180, and XalianUsersTable now carries nothing
// but account identity (see repositories/users.ts).
import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { XalianRecord } from '@xalians/content/schema';
import { ddb } from '../lib/db.ts';
import * as log from '../lib/log.ts';

const TABLE_NAME = 'XalianRegistry';
const GSI_NAME = 'byOwner';
const DEFAULT_LIMIT = 50;

export type RegistryItem = {
  xalianId: string;
  ownerId: string;
  generatedAt: string;
  species: string;
  record: XalianRecord;
};

export class XalianAlreadyExistsError extends Error {
  constructor(xalianId: string) {
    super(`xalian ${xalianId} already exists in the registry`);
    this.name = 'XalianAlreadyExistsError';
  }
}

export async function putRecord(ownerId: string, record: XalianRecord): Promise<void> {
  const item: RegistryItem = {
    xalianId: record.id,
    ownerId,
    generatedAt: record.provenance.generatedAt,
    species: record.species,
    record,
  };

  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(xalianId)',
      })
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
      throw new XalianAlreadyExistsError(record.id);
    }
    log.error('putRecord failed', { xalianId: record.id, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }
}

// The whole item, ownerId included. Reading a record is open to any authenticated caller,
// so getRecord below is the common path; this exists for the writes that must first check
// who owns the thing (releaseRegistryXalian.ts).
export async function getItem(xalianId: string): Promise<RegistryItem | null> {
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { xalianId } }));
    return (result.Item as RegistryItem | undefined) ?? null;
  } catch (err) {
    log.error('getItem failed', { xalianId, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }
}

export async function deleteRecord(xalianId: string): Promise<void> {
  try {
    await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { xalianId } }));
  } catch (err) {
    log.error('deleteRecord failed', { xalianId, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }
}

export async function getRecord(xalianId: string): Promise<XalianRecord | null> {
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { xalianId } }));
    const item = result.Item as RegistryItem | undefined;
    return item ? item.record : null;
  } catch (err) {
    log.error('getRecord failed', { xalianId, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }
}

export type ListByOwnerOptions = {
  limit?: number;
  cursor?: string;
};

export type ListByOwnerResult = {
  items: XalianRecord[];
  nextCursor?: string;
};

// Cursor is base64url of the raw LastEvaluatedKey, opaque to the caller. Encoding it
// rather than exposing generatedAt/xalianId directly keeps the wire contract stable if
// the GSI's key schema ever changes.
function encodeCursor(key: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(key), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid cursor');
  }
}

export async function listByOwner(ownerId: string, options: ListByOwnerOptions = {}): Promise<ListByOwnerResult> {
  const limit = options.limit ?? DEFAULT_LIMIT;

  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI_NAME,
        KeyConditionExpression: 'ownerId = :ownerId',
        ExpressionAttributeValues: { ':ownerId': ownerId },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: options.cursor ? decodeCursor(options.cursor) : undefined,
      })
    );

    const items = (result.Items ?? []) as RegistryItem[];
    return {
      items: items.map((item) => item.record),
      nextCursor: result.LastEvaluatedKey ? encodeCursor(result.LastEvaluatedKey) : undefined,
    };
  } catch (err) {
    log.error('listByOwner failed', { ownerId, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }
}
