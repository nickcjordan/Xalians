import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createMemoryState } from '@xalians/rules/arcade';
import { handler } from '../../src/handlers/completeArcade.ts';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => ddbMock.reset());

function winningMatch(seed: string) {
  const deck = createMemoryState(seed).deck;
  return Array.from(new Set(deck)).flatMap((pair) =>
    deck.map((value, index) => value === pair ? index : -1).filter((index) => index >= 0)
  );
}

describe('completeArcade handler', () => {
  it('requires a signed-in subject', async () => {
    const result = await handler({ body: '{}', requestContext: {} }, fakeContext());
    expect(result.statusCode).toBe(401);
  });

  it('rejects a move log that does not replay to a win', async () => {
    const result = await handler(authedEvent('nick', { body: JSON.stringify({
      gameId: 'match', sessionId: 'session_bad_1', seed: 'daily', actions: [0],
    }) }), fakeContext());
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).errorCode).toBe('INVALID_COMPLETION');
    expect(ddbMock.calls()).toHaveLength(0);
  });

  it('atomically converts verified credits at the token boundary', async () => {
    const seed = 'verified-match';
    ddbMock.on(GetCommand).resolves({ Item: {
      userId: 'nick', xalianIds: [], attributes: { tokens: 2, arcadeCredits: 90, arcadeDay: new Date().toISOString().slice(0, 10), arcadeEarnedToday: 20 },
    } });
    ddbMock.on(UpdateCommand).resolves({});

    const result = await handler(authedEvent('nick', { body: JSON.stringify({
      gameId: 'match', sessionId: 'session_win_1', seed, actions: winningMatch(seed),
    }) }), fakeContext());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({ awardedCredits: 15, credits: 5, tokensAwarded: 1, tokenBalance: 3 });
    const update = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(update.ConditionExpression).toContain('#attrs = :expected');
    expect(update.ExpressionAttributeValues?.[':next']).toMatchObject({ arcadeCredits: 5, arcadeEarnedToday: 35, tokens: 3, arcadeClaimIds: ['session_win_1'] });
  });

  it('returns an idempotent no-op for an already claimed session', async () => {
    const seed = 'duplicate-match';
    const day = new Date().toISOString().slice(0, 10);
    ddbMock.on(GetCommand).resolves({ Item: {
      userId: 'nick', xalianIds: [], attributes: {
        tokens: 3, arcadeCredits: 5, arcadeDay: day, arcadeEarnedToday: 35, arcadeClaimIds: ['session_repeat_1'],
      },
    } });

    const result = await handler(authedEvent('nick', { body: JSON.stringify({
      gameId: 'match', sessionId: 'session_repeat_1', seed, actions: winningMatch(seed),
    }) }), fakeContext());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({ awardedCredits: 0, credits: 5, earnedToday: 35, duplicate: true });
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });
});
