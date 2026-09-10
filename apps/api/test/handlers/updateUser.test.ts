import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/updateUser.ts';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

// Every action is rejected (issue #180): the xalian-id actions belonged to the retired
// legacy keep flow and token accounting was already server-only. The route survives only
// until a real user-settings action exists.
describe('updateUser handler', () => {
  const actions = [
    ['ADD_TOKENS', '1000000'],
    ['REMOVE_TOKENS', '3'],
    ['ADD_XALIAN_ID', 'xal_1'],
    ['REMOVE_XALIAN_ID', 'xal_1'],
  ] as const;

  actions.forEach(([action, value], index) => {
    it(`rejects ${action} with a 403 and never touches the table`, async () => {
      const result = await handler(
        authedEvent('nick', { body: JSON.stringify({ action, value }) }),
        fakeContext(`req-${index}`)
      );

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body as string).errorCode).toBe('FORBIDDEN_ACTION');
      expect(ddbMock.calls()).toHaveLength(0);
    });
  });

  it('still 400s on a body shape it has never accepted', async () => {
    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ action: 'RENAME', value: 'x' }) }),
      fakeContext('req-shape')
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('BAD_REQUEST');
  });

  it('401s before the body is read when there is no subject', async () => {
    const result = await handler(
      { body: JSON.stringify({ action: 'REMOVE_XALIAN_ID', value: 'x' }), requestContext: {} },
      fakeContext('req-anon')
    );

    expect(result.statusCode).toBe(401);
  });
});
