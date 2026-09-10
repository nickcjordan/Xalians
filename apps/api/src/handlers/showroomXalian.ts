// GET /xalians/showroom. The free lever (docs/design/xalians-platform-vision-and-economy.md
// section 3): an anonymous visitor pulls it and watches the Generator produce a creature
// that has never existed before. It runs the same ratified generator as POST /xalians and
// returns the same XalianRecord shape, but it persists nothing and no one owns the result,
// so the response says so in `keepable`. Auth is none and the route carries its own
// API Gateway throttle (main.tf, both stages).
import { randomBytes } from 'node:crypto';
import { withApi } from '../lib/api.ts';
import { generateXalian, getSpeciesTemplates } from '@xalians/rules/generator';
import { XalianRecordSchema } from '@xalians/content/schema';
import * as log from '../lib/log.ts';

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export const handler = withApi(
  async ({ requestId }) => {
    const template = pickRandom(getSpeciesTemplates());
    const seed = randomBytes(16).toString('hex');
    const generated = generateXalian(template, seed, {
      origin: template.homePlanet,
      generatedAt: new Date().toISOString(),
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

    log.info('showroomXalian success', { requestId, species: parsed.data.species });
    return { status: 200, body: { record: parsed.data, keepable: false } };
  },
  { auth: 'none' }
);
