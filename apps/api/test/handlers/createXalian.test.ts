import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/createXalian.ts';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('createXalian handler', () => {
  it('requires a subject', async () => {
    const result = await handler(
      { body: JSON.stringify({ xalianId: 'fire-1', speciesId: 'fire' }), requestContext: {} },
      fakeContext()
    );
    expect(result.statusCode).toBe(401);
  });

  it('rejects a body missing xalianId/speciesId with 400', async () => {
    const result = await handler(authedEvent('nick', { body: JSON.stringify({}) }), fakeContext());
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('BAD_REQUEST');
  });

  it('persists the item keyed by speciesId + xalianId with the whole body as attributes', async () => {
    ddbMock.on(PutCommand).resolves({});

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ xalianId: 'fire-1', speciesId: 'fire', name: 'Ember' }) }),
      fakeContext()
    );

    expect(result.statusCode).toBe(200);
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].args[0].input.Item).toEqual({
      speciesId: 'fire',
      xalianId: 'fire-1',
      attributes: { xalianId: 'fire-1', speciesId: 'fire', name: 'Ember' },
    });
  });
});
