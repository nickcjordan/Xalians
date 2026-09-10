import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/retrieveXalian.ts';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('retrieveXalian handler', () => {
  it('400s when xalianId is missing from the query string', async () => {
    const result = await handler(authedEvent('nick', { queryStringParameters: null }), fakeContext());
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('BAD_REQUEST');
  });

  it('returns the bare xalian for a single id', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { speciesId: 'fire', xalianId: 'fire-1', attributes: { name: 'Ember' } } });

    const result = await handler(
      authedEvent('nick', { queryStringParameters: { xalianId: 'fire-1' } }),
      fakeContext()
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual({ name: 'Ember' });
  });

  it('404s (as XALIAN_NOT_FOUND) when a single id is not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await handler(
      authedEvent('nick', { queryStringParameters: { xalianId: 'ghost-1' } }),
      fakeContext()
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('XALIAN_NOT_FOUND');
  });

  it('returns bare xalians, unwrapped, for a comma-separated id list', async () => {
    ddbMock.on(BatchGetCommand).resolves({
      Responses: {
        XalianTable: [
          { speciesId: 'fire', xalianId: 'fire-1', attributes: { name: 'Ember' } },
          { speciesId: 'water', xalianId: 'water-1', attributes: { name: 'Splash' } },
        ],
      },
    });

    const result = await handler(
      authedEvent('nick', { queryStringParameters: { xalianId: 'fire-1,water-1' } }),
      fakeContext()
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual([{ name: 'Ember' }, { name: 'Splash' }]);
  });
});
