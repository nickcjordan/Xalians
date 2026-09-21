// Hypothetical roster for release integration tests; never a canonical release pointer.
import fixture from '../../../packages/content/src/creature/fixtures/support-species.json';
import { createCreatureRelease } from '../../../packages/rules/src/generator/creatureRelease.ts';
export { GENERATOR_VERSION, SCHEMA_VERSION } from '../../../packages/rules/src/generator/creatureRelease.ts';
export { CreatureRecordSchema } from '../../../packages/content/src/creature/record.ts';
export const { GENERATION_RELEASE_ID, generateXalian, getSpeciesTemplates } = createCreatureRelease('test-creature-v5', [fixture]);
