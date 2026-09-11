// GET /xalians/showroom. The free lever (docs/design/xalians-platform-vision-and-economy.md
// section 3): an anonymous visitor pulls it and watches the Generator produce a creature
// that has never existed before. It runs the same ratified generator as POST /xalians and
// returns the same XalianRecord shape, but it persists nothing and no one owns the result,
// so the response says so in `keepable`. Auth is none and the route carries its own
// API Gateway throttle (main.tf, both stages).
//
// profile (issue #197): defaults to 'showroom', the constrained preview the ratified
// design calls for (finish forced to standard, no rare trait or secondary-affinity
// outcomes -- see @xalians/rules/generator's SHOWROOM_PROFILE). It is read from the query
// string, which on an anonymous route means a caller can ask for 'full' just by passing
// it: this is deliberately not a gate. Nick's 2026-09-10 direction is a visible site
// toggle to compare the two modes while the economy is still being worked out; real
// enforcement (species-weight limits, an entitlement check) is parked, not built here.
import { randomBytes } from 'node:crypto';
import { withApi } from '../lib/api.ts';
import { ShowroomXalianQuerySchema } from '../lib/schemas.ts';
import { generateXalian, getSpeciesTemplates } from '@xalians/rules/generator';
import { XalianRecordSchema } from '@xalians/content/schema';
import * as log from '../lib/log.ts';

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export const handler = withApi(
  async ({ query, requestId }) => {
    const profile = query.profile || 'showroom';
    const template = pickRandom(getSpeciesTemplates());
    const seed = randomBytes(16).toString('hex');
    const generated = generateXalian(template, seed, {
      origin: template.homePlanet,
      generatedAt: new Date().toISOString(),
      profile,
    });

    // Same drift guard as generateRegistryXalian: a mismatch between the generator and
    // the schema is a server bug, so it is logged with the issue paths and surfaces as
    // a 500 rather than being handed to the browser.
    const parsed = XalianRecordSchema.safeParse(generated);
    if (!parsed.success) {
      log.error('showroomXalian: generated record failed schema validation', {
        requestId,
        issues: parsed.error.issues.map((issue) => issue.path.join('.')),
      });
      throw new Error('Generated record did not match XalianRecordSchema');
    }

    log.info('showroomXalian success', { requestId, species: parsed.data.species, profile });
    return { status: 200, body: { record: parsed.data, keepable: false, profile } };
  },
  { auth: 'none', query: ShowroomXalianQuerySchema }
);
