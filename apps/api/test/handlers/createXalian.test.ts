import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/createXalian.ts';
import { signRecord } from '../../src/lib/signing.ts';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);
const ORIGINAL_SECRET = process.env.XALIAN_SIGNING_SECRET;

beforeEach(() => {
  ddbMock.reset();
  process.env.XALIAN_SIGNING_SECRET = 'test-secret';
});

afterEach(() => {
  process.env.XALIAN_SIGNING_SECRET = ORIGINAL_SECRET;
});

function makeXalian(overrides: Record<string, unknown> = {}) {
  return {
    xalianId: 'fire-1',
    speciesId: 'fire',
    name: 'Ember',
    createTimestamp: Date.now(),
    ...overrides,
  };
}

describe('createXalian handler (keep flow, D1 / audit F2)', () => {
  it('requires a subject', async () => {
    const xalian = makeXalian();
    const result = await handler(
      { body: JSON.stringify({ xalian, signature: signRecord(xalian) }), requestContext: {} },
      fakeContext()
    );
    expect(result.statusCode).toBe(401);
  });

  it('rejects a body missing xalian/signature with 400', async () => {
    const result = await handler(authedEvent('nick', { body: JSON.stringify({}) }), fakeContext());
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('BAD_REQUEST');
  });

  it('rejects a bad signature with 400 INVALID_SIGNATURE', async () => {
    const xalian = makeXalian();
    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ xalian, signature: 'a'.repeat(64) }) }),
      fakeContext()
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('INVALID_SIGNATURE');
    expect(ddbMock.calls()).toHaveLength(0);
  });

  it('rejects a tampered record whose signature no longer matches', async () => {
    const xalian = makeXalian();
    const signature = signRecord(xalian);
    const tampered = { ...xalian, name: 'Somethingelse' };

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ xalian: tampered, signature }) }),
      fakeContext()
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('INVALID_SIGNATURE');
  });

  it('rejects a signature older than 24 hours with 400 SIGNATURE_EXPIRED', async () => {
    const xalian = makeXalian({ createTimestamp: Date.now() - 25 * 60 * 60 * 1000 });
    const signature = signRecord(xalian);

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ xalian, signature }) }),
      fakeContext()
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('SIGNATURE_EXPIRED');
    expect(ddbMock.calls()).toHaveLength(0);
  });

  it('409s when the xalian has already been kept', async () => {
    const xalian = makeXalian();
    const signature = signRecord(xalian);
    const err = Object.assign(new Error('conditional check failed'), { name: 'ConditionalCheckFailedException' });
    ddbMock.on(PutCommand).rejects(err);

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ xalian, signature }) }),
      fakeContext()
    );

    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body as string).errorCode).toBe('ALREADY_KEPT');
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('persists the item then appends the id to the caller, in one call', async () => {
    const xalian = makeXalian();
    const signature = signRecord(xalian);
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(GetCommand).resolves({ Item: { userId: 'nick', xalianIds: [], attributes: {} } });
    ddbMock.on(UpdateCommand).resolves({});

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ xalian, signature }) }),
      fakeContext()
    );

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body).toEqual({ message: 'ok', xalianId: 'fire-1' });

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].args[0].input.Item).toEqual({
      speciesId: 'fire',
      xalianId: 'fire-1',
      attributes: xalian,
    });
    expect(putCalls[0].args[0].input.ConditionExpression).toBe('attribute_not_exists(xalianId)');

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0].input.Key).toEqual({ userId: 'nick' });
    expect(updateCalls[0].args[0].input.ExpressionAttributeValues).toMatchObject({ ':id': 'fire-1' });
  });
});
