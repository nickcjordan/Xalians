import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/showroomXalian.ts';
import { XalianRecordSchema } from '@xalians/content/schema';
import { fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('showroomXalian handler', () => {
  it('generates a ratified record for an anonymous caller and persists nothing', async () => {
    const result = await handler({ requestContext: {} }, fakeContext('req-showroom'));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.keepable).toBe(false);
    expect(XalianRecordSchema.safeParse(body.record).success).toBe(true);
    expect(ddbMock.calls()).toHaveLength(0);
  });

  it('gives a different creature on each pull', async () => {
    const first = JSON.parse((await handler({ requestContext: {} }, fakeContext())).body as string);
    const second = JSON.parse((await handler({ requestContext: {} }, fakeContext())).body as string);

    expect(first.record.id).not.toBe(second.record.id);
    expect(first.record.provenance.seed).not.toBe(second.record.provenance.seed);
  });

  it('defaults to the showroom profile when no query parameter is given (issue #197)', async () => {
    const result = await handler({ requestContext: {} }, fakeContext());
    const body = JSON.parse(result.body as string);

    expect(body.profile).toBe('showroom');
    expect(body.record.provenance.profile).toBe('showroom');
  });

  it('runs the unrestricted generator when profile=full is requested', async () => {
    const result = await handler(
      { requestContext: {}, queryStringParameters: { profile: 'full' } },
      fakeContext()
    );
    const body = JSON.parse(result.body as string);

    expect(result.statusCode).toBe(200);
    expect(body.profile).toBe('full');
    expect(body.record.provenance.profile).toBe('full');
  });

  it('rejects an unknown profile value with 400 BAD_REQUEST', async () => {
    const result = await handler(
      { requestContext: {}, queryStringParameters: { profile: 'unlimited' } },
      fakeContext()
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('BAD_REQUEST');
  });
});
