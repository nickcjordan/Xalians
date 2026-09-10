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
  it('rejects ADD_TOKENS with a single 403 and never touches the delegate (ports userTableCRUDLambdas test)', async () => {
    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ action: 'ADD_TOKENS', value: '1000000' }) }),
      fakeContext('req-5')
    );

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body as string).errorCode).toBe('FORBIDDEN_ACTION');
    expect(ddbMock.calls()).toHaveLength(0);
  });

  it('ADD_XALIAN_ID ignores userId in the body and sends the list_append/contains update (ports userTableCRUDLambdas test)', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { userId: 'nick', xalianIds: [], attributes: {} } });
    ddbMock.on(UpdateCommand).resolves({});

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ userId: 'someone-else', action: 'ADD_XALIAN_ID', value: 'xal_1' }) }),
      fakeContext('req-6')
    );

    expect(result.statusCode).toBe(200);
    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    const input = updateCalls[0].args[0].input;
    expect(input.Key).toEqual({ userId: 'nick' });
    expect(input.UpdateExpression).toContain('list_append');
    expect(input.ConditionExpression).toBe('NOT contains(xalianIds, :id)');
    expect(input.ExpressionAttributeValues).toMatchObject({ ':id': 'xal_1' });
  });

  it('ADD_XALIAN_ID is a no-op success when the id is already present (idempotent)', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { userId: 'nick', xalianIds: ['xal_1'], attributes: {} } });

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ action: 'ADD_XALIAN_ID', value: 'xal_1' }) }),
      fakeContext('req-6b')
    );

    expect(result.statusCode).toBe(200);
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
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

  it('REMOVE_TOKENS sends the subtract with the >= condition', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ action: 'REMOVE_TOKENS', value: '3' }) }),
      fakeContext('req-9')
    );

    expect(result.statusCode).toBe(200);
    const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(input.UpdateExpression).toContain('#attrs.tokens');
    expect(input.ConditionExpression).toBe('#attrs.tokens >= :n');
    expect(input.ExpressionAttributeValues).toMatchObject({ ':n': 3 });
  });

  it('REMOVE_TOKENS maps a ConditionalCheckFailedException to 400 INSUFFICIENT_TOKENS', async () => {
    const err = Object.assign(new Error('conditional check failed'), { name: 'ConditionalCheckFailedException' });
    ddbMock.on(UpdateCommand).rejects(err);

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ action: 'REMOVE_TOKENS', value: '1000000' }) }),
      fakeContext('req-10')
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('INSUFFICIENT_TOKENS');
  });

  it('rejects a negative REMOVE_TOKENS value with 400 BAD_REQUEST before touching the delegate', async () => {
    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ action: 'REMOVE_TOKENS', value: '-1' }) }),
      fakeContext('req-11')
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('BAD_REQUEST');
    expect(ddbMock.calls()).toHaveLength(0);
  });
});
