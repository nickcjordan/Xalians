/** Prototype generator reads the current roster without a release or content revision. */
import catalog from '../../../../packages/content/json/canonicalSpeciesCatalog.json';
import { createCreatureCatalog } from './prototypeCreature.ts';

const current = createCreatureCatalog(catalog);
export { CreatureRecordSchema } from '@xalians/content/creature';
export const getSpeciesTemplates = current.getSpeciesTemplates;
export const generateXalian = current.generateXalian;
