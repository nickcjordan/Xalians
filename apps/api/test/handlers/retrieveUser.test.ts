import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/retrieveUser.ts';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('retrieveUser handler', () => {
  it('returns 401 when there is no subject (ports userTableCRUDLambdas test)', async () => {
    const result = await handler({ queryStringParameters: null, requestContext: {} }, fakeContext('req-1'));
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body as string).errorCode).toBe('UNAUTHORIZED');
  });

  it('returns the full record for the caller\'s own profile (ports userTableCRUDLambdas test)', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { userId: 'nick', xalianIds: ['a'], attributes: { tokens: 5 } },
    });

    const result = await handler(authedEvent('Nick', { queryStringParameters: null }), fakeContext('req-2'));
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.userId).toBe('nick');
    expect(body.tokens).toBe(5);
    expect('attributes' in body).toBe(true);
  });

  it('returns a public profile for another user (ports userTableCRUDLambdas test)', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { userId: 'someoneelse', xalianIds: ['a', 'b'], attributes: { tokens: 999 } },
    });

    const result = await handler(
      authedEvent('nick', { queryStringParameters: { userId: 'someoneelse' } }),
      fakeContext('req-3')
    );
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    // The public profile is userId and nothing else (issue #180): xalianIds listed the
    // retired legacy XalianTable, and a stranger's creatures now come from
    // GET /xalians?ownerId=... instead.
    expect(body).toEqual({ userId: 'someoneelse' });
  });

  it('lazily creates the caller\'s own record on a miss instead of 404ing (audit F16)', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    ddbMock.on(PutCommand).resolves({});

    const result = await handler(authedEvent('nick', { queryStringParameters: null }), fakeContext('req-4'));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.userId).toBe('nick');
    expect(body.xalianIds).toEqual([]);

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].args[0].input.ConditionExpression).toBe('attribute_not_exists(userId)');
  });

  it('still 404s when the target is someone else\'s missing record', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await handler(
      authedEvent('nick', { queryStringParameters: { userId: 'ghost' } }),
      fakeContext('req-5')
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('USER_NOT_FOUND');
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it('ignores populateXalians and never batch-loads the legacy table', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { userId: 'nick', xalianIds: ['fire-1'], attributes: {} },
    });

    const result = await handler(
      authedEvent('nick', { queryStringParameters: { populateXalians: 'true' } }),
      fakeContext('req-6')
    );

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect('xalians' in body).toBe(false);
    expect(ddbMock.commandCalls(BatchGetCommand)).toHaveLength(0);
  });
});
