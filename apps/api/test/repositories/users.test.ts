import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as usersRepo from '../../src/repositories/users.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('users repository', () => {
  describe('createUserIfMissing', () => {
    it('puts a fresh item under attribute_not_exists(userId)', async () => {
      ddbMock.on(PutCommand).resolves({});

      await usersRepo.createUserIfMissing('nick');

      const calls = ddbMock.commandCalls(PutCommand);
      expect(calls).toHaveLength(1);
      const input = calls[0].args[0].input;
      expect(input.TableName).toBe('XalianUsersTable');
      expect(input.ConditionExpression).toBe('attribute_not_exists(userId)');
      expect(input.Item).toEqual({ userId: 'nick', xalianIds: [], attributes: {} });
    });

    it('is a no-op when the item already exists (ConditionalCheckFailedException swallowed)', async () => {
      const err = Object.assign(new Error('conditional check failed'), { name: 'ConditionalCheckFailedException' });
      ddbMock.on(PutCommand).rejects(err);

      await expect(usersRepo.createUserIfMissing('nick')).resolves.toBeUndefined();
    });
  });

  describe('nextSerial', () => {
    it('sends the map-initializing SET, then the per-species ADD, and returns the new counter', async () => {
      ddbMock.on(UpdateCommand).resolvesOnce({}).resolvesOnce({ Attributes: { attributes: { serials: { graviclaw: 1 } } } });

      const result = await usersRepo.nextSerial('nick', 'graviclaw');

      expect(result).toBe(1);
      const calls = ddbMock.commandCalls(UpdateCommand);
      expect(calls).toHaveLength(2);

      const setInput = calls[0].args[0].input;
      expect(setInput.TableName).toBe('XalianUsersTable');
      expect(setInput.Key).toEqual({ userId: 'nick' });
      expect(setInput.UpdateExpression).toBe('SET #attrs.#serials = if_not_exists(#attrs.#serials, :empty)');
      expect(setInput.ExpressionAttributeNames).toEqual({ '#attrs': 'attributes', '#serials': 'serials' });
      expect(setInput.ExpressionAttributeValues).toEqual({ ':empty': {} });
      // Guard against the DynamoDB rule that bit removeTokens: a SET/ADD expression may
      // not name overlapping document paths, so #attrs and #attrs.#serials must never
      // appear together in one UpdateExpression here.
      expect(setInput.UpdateExpression).not.toContain('#attrs.#serials.#species');

      const addInput = calls[1].args[0].input;
      expect(addInput.UpdateExpression).toBe('ADD #attrs.#serials.#species :one');
      expect(addInput.ExpressionAttributeNames).toEqual({ '#attrs': 'attributes', '#serials': 'serials', '#species': 'graviclaw' });
      expect(addInput.ExpressionAttributeValues).toEqual({ ':one': 1 });
      expect(addInput.ReturnValues).toBe('UPDATED_NEW');
    });

    it('produces independent counters for different species for the same owner', async () => {
      ddbMock
        .on(UpdateCommand)
        .resolvesOnce({})
        .resolvesOnce({ Attributes: { attributes: { serials: { graviclaw: 1 } } } })
        .resolvesOnce({})
        .resolvesOnce({ Attributes: { attributes: { serials: { neph: 1 } } } })
        .resolvesOnce({})
        .resolvesOnce({ Attributes: { attributes: { serials: { graviclaw: 2 } } } });

      const first = await usersRepo.nextSerial('nick', 'graviclaw');
      const second = await usersRepo.nextSerial('nick', 'neph');
      const third = await usersRepo.nextSerial('nick', 'graviclaw');

      expect(first).toBe(1);
      expect(second).toBe(1);
      expect(third).toBe(2);
    });

    it('throws if the ADD response does not carry a numeric counter for the species', async () => {
      ddbMock.on(UpdateCommand).resolvesOnce({}).resolvesOnce({ Attributes: { attributes: { serials: {} } } });

      await expect(usersRepo.nextSerial('nick', 'graviclaw')).rejects.toThrow(/did not return a numeric counter/);
    });
  });
});
