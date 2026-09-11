// POST /xalians (the registry). Generates a ratified XalianRecord server-side from
// @xalians/rules with a server-drawn seed, persists it under the caller, and returns it.
// This is the "generate" verb the vision doc ratified (the word "mint" is banned
// platform-wide): the creature is the caller's from the moment it exists, so there is no
// second "keep" call a client could skip, forge, or race.
// GET /xalians/showroom is the same generator with nothing persisted.
//
// profile (issue #197) defaults to 'full', the unrestricted generator: a signed-in
// caller only gets the constrained showroom preview when the request asks for it, which
// is what lets the visible site toggle drive this branch too. It persists in the returned
// record's provenance, so a claimed record stays reproducible under the profile it was
// generated with.
import { randomBytes } from 'node:crypto';
import { ApiError, withApi } from '../lib/api.ts';
import { GenerateRegistryXalianBodySchema } from '../lib/schemas.ts';
import { generateXalian, getSpeciesTemplate, getSpeciesTemplates } from '@xalians/rules/generator';
import { XalianRecordSchema } from '@xalians/content/schema';
import * as registryRepo from '../repositories/registry.ts';
import * as log from '../lib/log.ts';

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export const handler = withApi(
  async ({ subject, body, requestId }) => {
    const ownerId = subject as string;

    const template = body.species ? getSpeciesTemplate(body.species) : pickRandom(getSpeciesTemplates());
    if (!template) {
      throw new ApiError(400, 'UNKNOWN_SPECIES', `"${body.species}" is not a ratified species`);
    }

    // Global per-species count, not per-owner: see the doc comment on registryRepo.nextSerial.
    const serial = await registryRepo.nextSerial(template.key);

    const seed = randomBytes(16).toString('hex');
    const generated = generateXalian(template, seed, {
      origin: template.homePlanet,
      serial,
      generatedAt: new Date().toISOString(),
      profile: body.profile || 'full',
    });

    // The generator and the schema are already integration-tested together (see
    // packages/rules); this parse is a guard against drift between the two packages, not
    // a substitute for that coverage. A failure here is a server bug, not a client error,
    // so it is logged with the zod issue path and surfaces as a 500.
    const parsed = XalianRecordSchema.safeParse(generated);
    if (!parsed.success) {
      log.error('generateRegistryXalian: generated record failed schema validation', {
        requestId,
        issues: parsed.error.issues.map((issue) => issue.path.join('.')),
      });
      throw new Error('Generated record did not match XalianRecordSchema');
    }
    const record = parsed.data;

    await registryRepo.putRecord(ownerId, record);

    log.info('generateRegistryXalian success', { requestId, ownerId, xalianId: record.id, species: record.species });
    return { status: 201, body: record };
  },
  { auth: 'jwt', body: GenerateRegistryXalianBodySchema }
);
