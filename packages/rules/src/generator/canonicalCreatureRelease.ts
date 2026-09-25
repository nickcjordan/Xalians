/** The current roster is data. It is not part of the archived generator executable. */
import catalog from '../../../../packages/content/json/canonicalSpeciesCatalog.json';
import { createCreatureCatalog, GENERATION_RELEASE_ID, GENERATOR_VERSION, SCHEMA_VERSION } from './creatureEngineRelease.ts';

const current = createCreatureCatalog(catalog);
export { GENERATION_RELEASE_ID, GENERATOR_VERSION, SCHEMA_VERSION };
export { CreatureRecordSchema } from '@xalians/content/creature';
export const getSpeciesTemplates = current.getSpeciesTemplates;
export const generateXalian = current.generateXalian;
