// Promise-returning repository for XalianTable (key: speciesId + xalianId). The
// speciesId half of the key is derived from the legacy id shape (`<speciesId>-<uuid>`);
// that key design is scoped for replacement in Wave D (D1, api/registry) once generation
// moves server-side onto the ratified record id, not in this rewrite.
import { BatchGetCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/db.ts';
import * as log from '../lib/log.ts';

const TABLE_NAME = 'XalianTable';

// DynamoDB's BatchGetItem accepts at most 100 keys per request.
const BATCH_CHUNK_SIZE = 100;
const MAX_UNPROCESSED_RETRIES = 3;

function keyFor(xalianId: string): { xalianId: string; speciesId: string } {
  const speciesId = xalianId.split('-')[0];
  return { xalianId, speciesId };
}

export async function getXalian(xalianId: string): Promise<unknown | null> {
  const { speciesId } = keyFor(xalianId);
  try {
    const result = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { speciesId, xalianId } })
    );
    return result.Item ? result.Item.attributes : null;
  } catch (err) {
    log.error('getXalian failed', { xalianId, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function batchGetChunk(keys: { xalianId: string; speciesId: string }[]): Promise<unknown[]> {
  let remaining: { xalianId: string; speciesId: string }[] = keys;
  const items: unknown[] = [];

  for (let attempt = 0; attempt <= MAX_UNPROCESSED_RETRIES && remaining.length > 0; attempt++) {
    const result = await ddb.send(
      new BatchGetCommand({
        RequestItems: { [TABLE_NAME]: { Keys: remaining } },
      })
    );

    const returned = result.Responses?.[TABLE_NAME] ?? [];
    items.push(...returned);

    const unprocessed = result.UnprocessedKeys?.[TABLE_NAME]?.Keys as
      | { xalianId: string; speciesId: string }[]
      | undefined;

    if (!unprocessed || unprocessed.length === 0) {
      remaining = [];
      break;
    }

    remaining = unprocessed;
    if (attempt < MAX_UNPROCESSED_RETRIES) {
      // Short exponential backoff before retrying only the keys DynamoDB did not
      // process, per the BatchGetItem contract (throttling returns partial results).
      await sleep(2 ** attempt * 50);
    }
  }

  if (remaining.length > 0) {
    log.error('getXalianBatch: UnprocessedKeys left after max retries', { count: remaining.length });
  }

  return items;
}

export async function getXalianBatch(xalianIds: string[]): Promise<unknown[]> {
  const keys = xalianIds.map(keyFor);
  const chunks = chunk(keys, BATCH_CHUNK_SIZE);

  try {
    const results = await Promise.all(chunks.map((c) => batchGetChunk(c)));
    return results.flat();
  } catch (err) {
    log.error('getXalianBatch failed', { count: xalianIds.length, errorName: err instanceof Error ? err.name : typeof err });
    throw err;
  }
}

export async function createXalian(xalian: { xalianId: string; speciesId: string; [key: string]: unknown }): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        speciesId: xalian.speciesId,
        xalianId: xalian.xalianId,
        attributes: xalian,
      },
    })
  );
}
