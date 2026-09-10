import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { getXalianBatch } from '../../src/repositories/xalians.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('getXalianBatch', () => {
  it('chunks 150 ids into two BatchGetCommands (the 100-key DynamoDB limit)', async () => {
    ddbMock.on(BatchGetCommand).resolves({ Responses: { XalianTable: [] } });

    const ids = Array.from({ length: 150 }, (_, i) => `fire-${i}`);
    await getXalianBatch(ids);

    const calls = ddbMock.commandCalls(BatchGetCommand);
    expect(calls).toHaveLength(2);
    expect(calls[0].args[0].input.RequestItems?.XalianTable.Keys).toHaveLength(100);
    expect(calls[1].args[0].input.RequestItems?.XalianTable.Keys).toHaveLength(50);
  });

  it('retries UnprocessedKeys until they are all resolved', async () => {
    const key = { xalianId: 'fire-1', speciesId: 'fire' };

    ddbMock
      .on(BatchGetCommand)
      .resolvesOnce({
        Responses: { XalianTable: [] },
        UnprocessedKeys: { XalianTable: { Keys: [key] } },
      })
      .resolvesOnce({
        Responses: { XalianTable: [{ speciesId: 'fire', xalianId: 'fire-1', attributes: { name: 'Ember' } }] },
      });

    const result = await getXalianBatch(['fire-1']);

    expect(ddbMock.commandCalls(BatchGetCommand)).toHaveLength(2);
    expect(result).toEqual([{ speciesId: 'fire', xalianId: 'fire-1', attributes: { name: 'Ember' } }]);
  });
});
