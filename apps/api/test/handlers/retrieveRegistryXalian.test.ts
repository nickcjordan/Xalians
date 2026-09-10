import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/retrieveRegistryXalian.ts';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('retrieveRegistryXalian handler', () => {
  it('requires a subject', async () => {
    const result = await handler({ pathParameters: { xalianId: 'xal_1' }, requestContext: {} }, fakeContext());
    expect(result.statusCode).toBe(401);
  });

  it('404s with XALIAN_NOT_FOUND when the record does not exist', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await handler(
      authedEvent('nick', { pathParameters: { xalianId: 'xal_ghost' } }),
      fakeContext()
    );

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body as string).errorCode).toBe('XALIAN_NOT_FOUND');
  });

  it('returns the record for any authenticated caller, not just its owner', async () => {
    const record = { id: 'xal_1', species: 'graviclaw' };
    ddbMock.on(GetCommand).resolves({
      Item: { xalianId: 'xal_1', ownerId: 'someoneelse', generatedAt: '2026-09-10T00:00:00.000Z', species: 'graviclaw', record },
    });

    const result = await handler(
      authedEvent('nick', { pathParameters: { xalianId: 'xal_1' } }),
      fakeContext()
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual(record);
  });
});
