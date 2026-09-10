import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError, withApi } from '../src/lib/api.ts';
import { authedEvent, fakeContext } from './testEvent.ts';

describe('withApi error mapping', () => {
  it('never leaks a thrown error into the response body (ports responseBuilder buildError test)', async () => {
    const sensitiveError = new Error('DynamoDB table XalianUsersTable not found');
    (sensitiveError as unknown as { tableName: string }).tableName = 'XalianUsersTable';
    (sensitiveError as unknown as { $metadata: unknown }).$metadata = { requestId: 'internal-aws-request-id' };

    const handler = withApi(
      async () => {
        throw sensitiveError;
      },
      { auth: 'none' }
    );

    const result = await handler({}, fakeContext('req-99'));
    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body as string);
    expect(Object.keys(body).sort()).toEqual(['errorCode', 'errorMessage', 'requestId']);
    expect(body.errorCode).toBe('INTERNAL_ERROR');
    expect(body.errorMessage).toBe('Unexpected error');
    expect(body.requestId).toBe('req-99');
    expect(result.body).not.toContain('XalianUsersTable');
    expect(result.body).not.toContain('DynamoDB');
    expect(result.body).not.toContain('internal-aws-request-id');
  });

  it('maps a thrown ApiError to its status and errorCode (ports responseBuilder buildXalianError test)', async () => {
    const handler = withApi(
      async () => {
        throw new ApiError(404, 'USER_NOT_FOUND', 'Did not find user with userId=nick');
      },
      { auth: 'none' }
    );

    const result = await handler({}, fakeContext());
    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body as string);
    expect(body.errorCode).toBe('USER_NOT_FOUND');
    expect(body.errorMessage).toBe('Did not find user with userId=nick');
  });

  it('rejects a bad body with 400 naming the offending field', async () => {
    const handler = withApi(
      async () => ({ status: 200, body: { ok: true } }),
      { auth: 'none', body: z.object({ xalianId: z.string().min(1) }) }
    );

    const result = await handler(
      { body: JSON.stringify({ xalianId: '' }) },
      fakeContext()
    );
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.errorCode).toBe('BAD_REQUEST');
    expect(body.errorMessage).toContain('xalianId');
  });

  it('requires a subject for auth: jwt and returns 401 when absent', async () => {
    const handler = withApi(async () => ({ status: 200, body: {} }), { auth: 'jwt' });
    const result = await handler({ requestContext: {} }, fakeContext());
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body as string).errorCode).toBe('UNAUTHORIZED');
  });

  it('passes the lowercased subject through for auth: jwt', async () => {
    let seenSubject: string | null = null;
    const handler = withApi(
      async ({ subject }) => {
        seenSubject = subject;
        return { status: 200, body: {} };
      },
      { auth: 'jwt' }
    );
    await handler(authedEvent('Nick'), fakeContext());
    expect(seenSubject).toBe('nick');
  });

  it('reads the subject from payload format 1.0 claims as well as 2.0', async () => {
    let seenSubject: string | null = null;
    const handler = withApi(
      async ({ subject }) => {
        seenSubject = subject;
        return { status: 200, body: {} };
      },
      { auth: 'jwt' }
    );
    await handler(
      { requestContext: { authorizer: { claims: { 'cognito:username': 'King_Kozrak' } } } },
      fakeContext()
    );
    expect(seenSubject).toBe('king_kozrak');
  });
});
