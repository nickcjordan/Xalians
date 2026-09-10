import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/createUser.ts';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('createUser handler', () => {
  it('ignores userId in the body and creates the record for the subject (ports userTableCRUDLambdas test)', async () => {
    ddbMock.on(PutCommand).resolves({});

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ userId: 'someone-else', xalianIds: ['x'] }) }),
      fakeContext('req-4')
    );

    expect(result.statusCode).toBe(200);
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].args[0].input.Item).toMatchObject({ userId: 'nick', xalianIds: [] });
  });

  it('is idempotent: an existing record is left untouched', async () => {
    const err = Object.assign(new Error('conditional check failed'), { name: 'ConditionalCheckFailedException' });
    ddbMock.on(PutCommand).rejects(err);

    const result = await handler(authedEvent('nick'), fakeContext('req-idempotent'));
    expect(result.statusCode).toBe(200);
  });
});
