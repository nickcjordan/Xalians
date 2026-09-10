import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handler } from '../../src/handlers/generateXalian.ts';
import { verifyRecord } from '../../src/lib/signing.ts';
import { fakeContext } from '../testEvent.ts';

const ORIGINAL_SECRET = process.env.XALIAN_SIGNING_SECRET;

beforeEach(() => {
  process.env.XALIAN_SIGNING_SECRET = 'test-secret';
});

afterEach(() => {
  process.env.XALIAN_SIGNING_SECRET = ORIGINAL_SECRET;
});

describe('generateXalian handler', () => {
  it('returns 200 with a signed envelope over the legacy translated shape, unauthenticated', async () => {
    const result = await handler({ requestContext: { http: { method: 'GET' } } }, fakeContext());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(typeof body.xalian.species.name).toBe('string');
    expect(body.xalian.moves).toHaveLength(4);
    expect(body.xalian.xalianId).toEqual(expect.any(String));
    expect(body.signature).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyRecord(body.xalian, body.signature)).toBe(true);
  });
});
