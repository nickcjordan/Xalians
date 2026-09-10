import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import * as registryRepo from '../../src/repositories/registry.ts';
import type { XalianRecord } from '@xalians/content/schema';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

function makeRecord(overrides: Partial<XalianRecord> = {}): XalianRecord {
  return {
    id: 'xal_deadbeef',
    species: 'graviclaw',
    provenance: {
      seed: 'abc',
      generatorVersion: '1',
      schemaVersion: '1',
      generatedAt: '2026-09-10T00:00:00.000Z',
      origin: 'stonera',
      serial: 1,
    },
    ...overrides,
  } as XalianRecord;
}

describe('registry repository', () => {
  it('putRecord persists under the owner with attribute_not_exists(xalianId)', async () => {
    ddbMock.on(PutCommand).resolves({});
    const record = makeRecord();

    await registryRepo.putRecord('nick', record);

    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(1);
    const input = calls[0].args[0].input;
    expect(input.ConditionExpression).toBe('attribute_not_exists(xalianId)');
    expect(input.Item).toEqual({
      xalianId: 'xal_deadbeef',
      ownerId: 'nick',
      generatedAt: '2026-09-10T00:00:00.000Z',
      species: 'graviclaw',
      record,
    });
  });

  it('putRecord throws XalianAlreadyExistsError on a condition failure', async () => {
    const err = Object.assign(new Error('conditional check failed'), { name: 'ConditionalCheckFailedException' });
    ddbMock.on(PutCommand).rejects(err);

    await expect(registryRepo.putRecord('nick', makeRecord())).rejects.toBeInstanceOf(
      registryRepo.XalianAlreadyExistsError
    );
  });

  it('getRecord returns the record, not the wrapper item', async () => {
    const record = makeRecord();
    ddbMock.on(GetCommand).resolves({
      Item: { xalianId: record.id, ownerId: 'nick', generatedAt: record.provenance.generatedAt, species: record.species, record },
    });

    const result = await registryRepo.getRecord('xal_deadbeef');
    expect(result).toEqual(record);
  });

  it('getRecord returns null on a miss', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    const result = await registryRepo.getRecord('xal_ghost');
    expect(result).toBeNull();
  });

  it('listByOwner queries the byOwner GSI newest first', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    await registryRepo.listByOwner('nick', { limit: 10 });

    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls).toHaveLength(1);
    const input = calls[0].args[0].input;
    expect(input.IndexName).toBe('byOwner');
    expect(input.ScanIndexForward).toBe(false);
    expect(input.Limit).toBe(10);
    expect(input.KeyConditionExpression).toBe('ownerId = :ownerId');
    expect(input.ExpressionAttributeValues).toEqual({ ':ownerId': 'nick' });
  });

  it('encodes and decodes the cursor round trip through LastEvaluatedKey/ExclusiveStartKey', async () => {
    const record = makeRecord();
    const lastKey = { xalianId: 'xal_deadbeef', ownerId: 'nick', generatedAt: record.provenance.generatedAt };

    ddbMock
      .on(QueryCommand)
      .resolvesOnce({
        Items: [{ xalianId: record.id, ownerId: 'nick', generatedAt: record.provenance.generatedAt, species: record.species, record }],
        LastEvaluatedKey: lastKey,
      })
      .resolvesOnce({ Items: [] });

    const first = await registryRepo.listByOwner('nick');
    expect(first.nextCursor).toBeTypeOf('string');
    expect(first.items).toEqual([record]);

    await registryRepo.listByOwner('nick', { cursor: first.nextCursor });

    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls[1].args[0].input.ExclusiveStartKey).toEqual(lastKey);
  });
});
