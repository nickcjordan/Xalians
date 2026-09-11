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
  // registryRepo.nextSerial's UpdateCommand (the global per-species COUNTER# item) is
  // asked for ReturnValues: 'UPDATED_NEW', so it needs a shaped Attributes response to
  // unwrap; stubbed generically here so each test only has to arrange the PutCommand it
  // cares about.
  ddbMock.on(UpdateCommand).resolves({ Attributes: { serial: 1 } });
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

  it('passes the counted serial into provenance.serial via a single global per-species counter item', async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(UpdateCommand).resolves({ Attributes: { serial: 7 } });
    const species = 'graviclaw';

    const result = await handler(authedEvent('nick', { body: JSON.stringify({ species }) }), fakeContext());

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(body.provenance.serial).toBe(7);

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    const input = updateCalls[0].args[0].input;
    expect(input.TableName).toBe('XalianRegistry');
    expect(input.Key).toEqual({ xalianId: 'COUNTER#graviclaw' });
    expect(input.UpdateExpression).toBe('ADD serial :one');
    expect(input.ExpressionAttributeValues).toEqual({ ':one': 1 });
    expect(input.ReturnValues).toBe('UPDATED_NEW');

    // Only registryRepo.putRecord's PutCommand runs; no XalianUsersTable write.
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].args[0].input.TableName).toBe('XalianRegistry');
  });

  it('draws a species uniformly when none is given', async () => {
    ddbMock.on(PutCommand).resolves({});

    const result = await handler(authedEvent('nick', { body: '{}' }), fakeContext());

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    const keys = getSpeciesTemplates().map((t) => t.key);
    expect(keys).toContain(body.species);
  });

  // issue #197: profile defaults to 'full' (the unrestricted generator) so a signed-in
  // caller is unaffected unless the site's visible toggle asks for the showroom preview.
  it('defaults to the full profile when none is given', async () => {
    ddbMock.on(PutCommand).resolves({});

    const result = await handler(authedEvent('nick', { body: '{}' }), fakeContext());

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(body.provenance.profile).toBe('full');
  });

  it('runs the constrained showroom profile and stamps it into provenance when requested', async () => {
    ddbMock.on(PutCommand).resolves({});
    const species = 'graviclaw';

    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ species, profile: 'showroom' }) }),
      fakeContext()
    );

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(body.provenance.profile).toBe('showroom');
    expect(body.appearance.finish).toBe('standard');
    expect(Object.keys(body.element.affinities)).toEqual([body.element.primary]);
  });

  it('rejects an unknown profile value with 400 BAD_REQUEST', async () => {
    const result = await handler(
      authedEvent('nick', { body: JSON.stringify({ profile: 'unlimited' }) }),
      fakeContext()
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string).errorCode).toBe('BAD_REQUEST');
    expect(ddbMock.calls()).toHaveLength(0);
  });
});
