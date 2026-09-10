// Promise-returning repository for XalianRegistry (hash key xalianId, GSI byOwner on
// ownerId + generatedAt). This is the only table holding creatures: the legacy XalianTable
// and its code path were retired with issue #180, and XalianUsersTable now carries nothing
// but account identity (see repositories/users.ts).
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { XalianRecord } from '@xalians/content/schema';
import { ddb } from '../lib/db.ts';
import * as log from '../lib/log.ts';

const TABLE_NAME = 'XalianRegistry';
const GSI_NAME = 'byOwner';
const DEFAULT_LIMIT = 50;

// nextSerial's counter items live in this same table, keyed xalianId = "COUNTER#<species>",
// so they share capacity/billing with real records but can never collide with a real
// xalianId (real ids are "xal_..."). They deliberately carry no ownerId, generatedAt, or
// species field of their own (species is already in the key), which is what keeps them
// out of listByOwner: the byOwner GSI's key schema requires an ownerId attribute to be
// projected into the index at all, so an item that never has one is structurally excluded
// from every GSI query, with no filter needed. See registry.test.ts for an assertion of
// this. A base-table Scan (there isn't one today) would see COUNTER# items; if one is ever
// added, it must filter begins_with(xalianId, "COUNTER#") out.
const COUNTER_PREFIX = 'COUNTER#';

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
// who owns the thing (releaseRegistryXalian.ts). Like getRecord, a counter item
// (COUNTER#<species>) is not a creature and reads as not found.
export async function getItem(xalianId: string): Promise<RegistryItem | null> {
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { xalianId } }));
    const item = result.Item as RegistryItem | undefined;
    return item && item.record ? item : null;
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
    // A counter item (COUNTER#<species>) has no record; treat a read of one as not found.
    return item && item.record ? item.record : null;
  } catch (err) {
    log.error('getRecord failed', { xalianId, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }
}

// Global per-species generation counter, read by generateRegistryXalian to fill
// provenance.serial ("Nth of this species ever generated" per
// docs/design/xalian-creature-data-structure.md:28 -- a single count across every owner,
// not per-owner). One counter item per species (xalianId = "COUNTER#<speciesKey>") with a
// numeric `serial` attribute. `ADD serial :one` both creates the attribute (starting at 1)
// the first time a species is generated and increments it every time after, so no
// initializing SET/if_not_exists step is needed the way users.ts's removeTokens/the old
// per-owner serial counter did -- ADD on a bare top-level attribute of a keyed item
// autovivifies; it only refuses to autovivify a missing *intermediate map* on a nested
// path, which does not apply here since `serial` sits directly on the counter item.
//
// Accepted lever at current scale: every generation of a given species contends on the
// same partition key (COUNTER#<species>), so this is a deliberate single-partition
// hot spot per species, not an oversight. Fine for the registry's current write volume;
// revisit (sharded counters, or a different serial scheme) if per-species generation
// throughput ever gets DynamoDB-hot.
export async function nextSerial(speciesKey: string): Promise<number> {
  try {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { xalianId: `${COUNTER_PREFIX}${speciesKey}` },
        UpdateExpression: 'ADD serial :one',
        ExpressionAttributeValues: { ':one': 1 },
        ReturnValues: 'UPDATED_NEW',
      })
    );

    const value = result.Attributes?.serial;
    if (typeof value !== 'number') {
      throw new Error(`nextSerial: UpdateCommand did not return a numeric counter for species "${speciesKey}"`);
    }
    return value;
  } catch (err) {
    log.error('nextSerial failed', { speciesKey, errorName: err instanceof Error ? err.name : typeof err });
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
