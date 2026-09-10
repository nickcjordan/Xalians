import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/listRegistryXalians.ts';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('listRegistryXalians handler', () => {
  it('requires a subject', async () => {
    const result = await handler({ queryStringParameters: null, requestContext: {} }, fakeContext());
    expect(result.statusCode).toBe(401);
  });

  it('without ownerId, lists the caller\'s own records', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await handler(authedEvent('nick', { queryStringParameters: null }), fakeContext());

    expect(result.statusCode).toBe(200);
    const input = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(input.ExpressionAttributeValues).toEqual({ ':ownerId': 'nick' });
  });

  it('with ownerId, lists that owner\'s records (public, like the legacy collection view)', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await handler(
      authedEvent('nick', { queryStringParameters: { ownerId: 'someoneelse' } }),
      fakeContext()
    );

    expect(result.statusCode).toBe(200);
    const input = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(input.ExpressionAttributeValues).toEqual({ ':ownerId': 'someoneelse' });
  });

  it('encodes and decodes the cursor and returns nextCursor when there is another page', async () => {
    const lastKey = { xalianId: 'xal_1', ownerId: 'nick', generatedAt: '2026-09-10T00:00:00.000Z' };
    ddbMock.on(QueryCommand).resolves({ Items: [], LastEvaluatedKey: lastKey });

    const result = await handler(authedEvent('nick', { queryStringParameters: null }), fakeContext());
    const body = JSON.parse(result.body as string);
    expect(typeof body.nextCursor).toBe('string');

    ddbMock.resetHistory();
    await handler(
      authedEvent('nick', { queryStringParameters: { cursor: body.nextCursor } }),
      fakeContext()
    );
    const secondInput = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(secondInput.ExclusiveStartKey).toEqual(lastKey);
  });

  it('omits nextCursor when there is no further page', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await handler(authedEvent('nick', { queryStringParameters: null }), fakeContext());
    const body = JSON.parse(result.body as string);
    expect('nextCursor' in body).toBe(false);
  });
});
