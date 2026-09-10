import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/generateRegistryXalian.ts';
import { XalianRecordSchema } from '@xalians/content/schema';
import { getSpeciesTemplates } from '@xalians/rules/generator';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('generateRegistryXalian handler', () => {
  it('requires a subject', async () => {
    const result = await handler({ body: '{}', requestContext: {} }, fakeContext());
    expect(result.statusCode).toBe(401);
  });

  it('rejects an unknown species with 400 UNKNOWN_SPECIES', async () => {
    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ species: 'not-a-real-species' }) }),
      fakeContext()
    );
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('UNKNOWN_SPECIES');
    expect(ddbMock.calls()).toHaveLength(0);
  });

  it('generates from a given ratified species, persists under the subject, and returns 201 with a record that passes XalianRecordSchema', async () => {
    ddbMock.on(PutCommand).resolves({});
    const species = getSpeciesTemplates()[0].key;

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ species }) }),
      fakeContext()
    );

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(() => XalianRecordSchema.parse(body)).not.toThrow();
    expect(body.species).toBe(species);

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].args[0].input.Item).toMatchObject({ ownerId: 'nick', xalianId: body.id, species });
  });

  it('draws a species uniformly when none is given', async () => {
    ddbMock.on(PutCommand).resolves({});

    const result = await handler(authedEvent('nick', { body: '{}' }), fakeContext());

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    const keys = getSpeciesTemplates().map((t) => t.key);
    expect(keys).toContain(body.species);
  });
});
