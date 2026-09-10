import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/releaseRegistryXalian.ts';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

function storedItem(ownerId: string) {
  return {
    Item: {
      xalianId: 'xal_1',
      ownerId,
      generatedAt: '2026-09-10T00:00:00.000Z',
      species: 'graviclaw',
      record: { id: 'xal_1', species: 'graviclaw' },
    },
  };
}

describe('releaseRegistryXalian handler', () => {
  it('requires a subject', async () => {
    const result = await handler({ pathParameters: { xalianId: 'xal_1' }, requestContext: {} }, fakeContext());
    expect(result.statusCode).toBe(401);
  });

  it('404s when the record does not exist', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await handler(authedEvent('nick', { pathParameters: { xalianId: 'xal_ghost' } }), fakeContext());

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body as string).errorCode).toBe('XALIAN_NOT_FOUND');
    expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(0);
  });

  it('403s NOT_OWNER when the record belongs to someone else, and deletes nothing', async () => {
    ddbMock.on(GetCommand).resolves(storedItem('someoneelse'));

    const result = await handler(authedEvent('nick', { pathParameters: { xalianId: 'xal_1' } }), fakeContext());

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body as string).errorCode).toBe('NOT_OWNER');
    expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(0);
  });

  it('deletes the owner\'s own record', async () => {
    ddbMock.on(GetCommand).resolves(storedItem('nick'));
    ddbMock.on(DeleteCommand).resolves({});

    const result = await handler(authedEvent('Nick', { pathParameters: { xalianId: 'xal_1' } }), fakeContext());

    expect(result.statusCode).toBe(200);
    const calls = ddbMock.commandCalls(DeleteCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toMatchObject({ TableName: 'XalianRegistry', Key: { xalianId: 'xal_1' } });
  });
});
