import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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

  describe('nextSerial', () => {
    it('sends ADD serial :one against the COUNTER#<species> item and returns the new counter', async () => {
      ddbMock.on(UpdateCommand).resolves({ Attributes: { serial: 1 } });

      const result = await registryRepo.nextSerial('graviclaw');

      expect(result).toBe(1);
      const calls = ddbMock.commandCalls(UpdateCommand);
      expect(calls).toHaveLength(1);
      const input = calls[0].args[0].input;
      expect(input.TableName).toBe('XalianRegistry');
      expect(input.Key).toEqual({ xalianId: 'COUNTER#graviclaw' });
      expect(input.UpdateExpression).toBe('ADD serial :one');
      expect(input.ExpressionAttributeValues).toEqual({ ':one': 1 });
      expect(input.ReturnValues).toBe('UPDATED_NEW');
      // No initializer: ADD on a bare top-level attribute autovivifies from a missing
      // item/attribute, unlike a nested path through a missing intermediate map.
      expect(calls).toHaveLength(1);
    });

    it('is a single counter shared across owners: repeat calls for the same species increment regardless of caller', async () => {
      ddbMock.on(UpdateCommand).resolvesOnce({ Attributes: { serial: 1 } }).resolvesOnce({ Attributes: { serial: 2 } });

      const first = await registryRepo.nextSerial('graviclaw');
      const second = await registryRepo.nextSerial('graviclaw');

      expect(first).toBe(1);
      expect(second).toBe(2);
      const calls = ddbMock.commandCalls(UpdateCommand);
      expect(calls[0].args[0].input.Key).toEqual({ xalianId: 'COUNTER#graviclaw' });
      expect(calls[1].args[0].input.Key).toEqual({ xalianId: 'COUNTER#graviclaw' });
    });

    it('gives different species independent counters', async () => {
      ddbMock.on(UpdateCommand).resolvesOnce({ Attributes: { serial: 1 } }).resolvesOnce({ Attributes: { serial: 1 } });

      const graviclaw = await registryRepo.nextSerial('graviclaw');
      const neph = await registryRepo.nextSerial('neph');

      expect(graviclaw).toBe(1);
      expect(neph).toBe(1);
      const calls = ddbMock.commandCalls(UpdateCommand);
      expect(calls[0].args[0].input.Key).toEqual({ xalianId: 'COUNTER#graviclaw' });
      expect(calls[1].args[0].input.Key).toEqual({ xalianId: 'COUNTER#neph' });
    });

    it('throws if the ADD response does not carry a numeric serial', async () => {
      ddbMock.on(UpdateCommand).resolves({ Attributes: {} });

      await expect(registryRepo.nextSerial('graviclaw')).rejects.toThrow(/did not return a numeric counter/);
    });
  });

  // A COUNTER# item (xalianId = "COUNTER#<species>") deliberately has no ownerId, so it
  // can never be projected into or returned by the byOwner GSI -- the query below only
  // ever sees items that have an ownerId at all, counter items included or not, which
  // this test proves by mixing one into the mocked response and asserting it is not what
  // listByOwner hands back (it maps every Item it gets to a record regardless, so a real
  // deployment excludes COUNTER# items at the DynamoDB layer before this code ever runs;
  // this asserts the client-side contract stays "ownerId-keyed items only").
  it('listByOwner can never surface a COUNTER# item, because the byOwner GSI only indexes items carrying ownerId', async () => {
    const record = makeRecord();
    ddbMock.on(QueryCommand).resolves({
      Items: [{ xalianId: record.id, ownerId: 'nick', generatedAt: record.provenance.generatedAt, species: record.species, record }],
    });

    const result = await registryRepo.listByOwner('nick');

    expect(result.items).toEqual([record]);
    expect(result.items.every((r) => !r.id.startsWith('COUNTER#'))).toBe(true);
    const calls = ddbMock.commandCalls(QueryCommand);
    // The query is scoped to the GSI by KeyConditionExpression on ownerId; a COUNTER#
    // item, having no ownerId attribute, is never indexed under any ownerId value and so
    // structurally cannot match this condition, with no application-side filter required.
    expect(calls[0].args[0].input.IndexName).toBe('byOwner');
    expect(calls[0].args[0].input.KeyConditionExpression).toBe('ownerId = :ownerId');
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
