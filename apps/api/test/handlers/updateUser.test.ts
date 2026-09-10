import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/updateUser.ts';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('updateUser handler', () => {
  it('rejects ADD_TOKENS with a 403 and never touches the delegate', async () => {
    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ action: 'ADD_TOKENS', value: '1000000' }) }),
      fakeContext('req-5')
    );

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body as string).errorCode).toBe('FORBIDDEN_ACTION');
    expect(ddbMock.calls()).toHaveLength(0);
  });

  it('rejects REMOVE_TOKENS with a 403 and never touches the delegate (token accounting is server-side, D1)', async () => {
    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ action: 'REMOVE_TOKENS', value: '3' }) }),
      fakeContext('req-9')
    );

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body as string).errorCode).toBe('FORBIDDEN_ACTION');
    expect(ddbMock.calls()).toHaveLength(0);
  });

  it('rejects ADD_XALIAN_ID with a 403 and never touches the delegate (keeping is server-side, D1)', async () => {
    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ action: 'ADD_XALIAN_ID', value: 'xal_1' }) }),
      fakeContext('req-6')
    );

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body as string).errorCode).toBe('FORBIDDEN_ACTION');
    expect(ddbMock.calls()).toHaveLength(0);
  });

  it('REMOVE_XALIAN_ID sends REMOVE with the index condition', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { userId: 'nick', xalianIds: ['a', 'xal_1', 'b'], attributes: {} } });
    ddbMock.on(UpdateCommand).resolves({});

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ action: 'REMOVE_XALIAN_ID', value: 'xal_1' }) }),
      fakeContext('req-7')
    );

    expect(result.statusCode).toBe(200);
    const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(input.UpdateExpression).toBe('REMOVE xalianIds[1]');
    expect(input.ConditionExpression).toBe('xalianIds[1] = :id');
    expect(input.ExpressionAttributeValues).toEqual({ ':id': 'xal_1' });
  });

  it('REMOVE_XALIAN_ID 400s when the id is not present', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { userId: 'nick', xalianIds: [], attributes: {} } });

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ action: 'REMOVE_XALIAN_ID', value: 'ghost' }) }),
      fakeContext('req-8')
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('XALIAN_NOT_FOUND_IN_USER');
  });

  it('ignores userId in the body; the subject always comes from the JWT', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { userId: 'nick', xalianIds: ['xal_1'], attributes: {} } });
    ddbMock.on(UpdateCommand).resolves({});

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ userId: 'someone-else', action: 'REMOVE_XALIAN_ID', value: 'xal_1' }) }),
      fakeContext('req-12')
    );

    expect(result.statusCode).toBe(200);
    const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(input.Key).toEqual({ userId: 'nick' });
  });
});
