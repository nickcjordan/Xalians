import { describe, expect, it } from 'vitest';
import { handler } from '../../src/handlers/generateXalian.ts';
import { fakeContext } from '../testEvent.ts';

describe('generateXalian handler', () => {
  it('returns 200 with the legacy translated shape, unauthenticated', async () => {
    const result = await handler({ requestContext: { http: { method: 'GET' } } }, fakeContext());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(typeof body.species.name).toBe('string');
    expect(body.moves).toHaveLength(4);
    expect(body.xalianId).toEqual(expect.any(String));
  });
});
