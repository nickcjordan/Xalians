import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/handlers/generateRegistryXalian.ts';
import { XalianRecordSchema } from '@xalians/content/schema';
import { getSpeciesTemplates } from '@xalians/rules/generator';
import { authedEvent, fakeContext } from '../testEvent.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
  // createUserIfMissing's PutCommand (XalianUsersTable) and nextSerial's UpdateCommands
  // share the same mocked DynamoDBDocumentClient as registryRepo.putRecord's PutCommand;
  // both are stubbed generically here so each test only has to arrange the calls it cares
  // about. nextSerial's second UpdateCommand (the ADD) is asked for ReturnValues:
  // 'UPDATED_NEW', so it needs a shaped Attributes response to unwrap; a Proxy stands in
  // for the per-species map so this generic stub answers "1" for whichever species key
  // (including the randomly-picked one in the "no species given" test) nextSerial reads.
  const serialsProxy = new Proxy({}, { get: () => 1 });
  ddbMock.on(UpdateCommand).resolves({ Attributes: { attributes: { serials: serialsProxy } } });
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

    // createUserIfMissing's XalianUsersTable PutCommand runs first, then
    // registryRepo.putRecord's XalianRegistry PutCommand.
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(2);
    expect(putCalls[1].args[0].input.Item).toMatchObject({ ownerId: 'nick', xalianId: body.id, species });
  });

  it('creates the owner user item first, then passes the counted serial into provenance.serial', async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(UpdateCommand).resolves({ Attributes: { attributes: { serials: { graviclaw: 7 } } } });
    const species = 'graviclaw';

    const result = await handler(authedEvent('nick', { body: JSON.stringify({ species }) }), fakeContext());

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(body.provenance.serial).toBe(7);

    const putCalls = ddbMock.commandCalls(PutCommand);
    // createUserIfMissing's PutCommand (XalianUsersTable) runs before registryRepo.putRecord's
    expect(putCalls).toHaveLength(2);
    expect(putCalls[0].args[0].input.TableName).toBe('XalianUsersTable');
    expect(putCalls[0].args[0].input.ConditionExpression).toBe('attribute_not_exists(userId)');
    expect(putCalls[1].args[0].input.TableName).toBe('XalianRegistry');

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(2);
    expect(updateCalls[0].args[0].input.UpdateExpression).toBe('SET #attrs.#serials = if_not_exists(#attrs.#serials, :empty)');
    expect(updateCalls[1].args[0].input.UpdateExpression).toBe('ADD #attrs.#serials.#species :one');
    expect(updateCalls[1].args[0].input.ExpressionAttributeNames).toEqual({
      '#attrs': 'attributes',
      '#serials': 'serials',
      '#species': 'graviclaw',
    });
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
