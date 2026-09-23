/** Frozen v5 candidate roster. Games continue to use the current v4 entry point. */
import akinza from '../../../../docs/species-templates/v5/akinza.json';
import avilily from '../../../../docs/species-templates/v5/avilily.json';
import bioflim from '../../../../docs/species-templates/v5/bioflim.json';
import chromocat from '../../../../docs/species-templates/v5/chromocat.json';
import codazzo from '../../../../docs/species-templates/v5/codazzo.json';
import crystorn from '../../../../docs/species-templates/v5/crystorn.json';
import drilltail from '../../../../docs/species-templates/v5/drilltail.json';
import dromeus from '../../../../docs/species-templates/v5/dromeus.json';
import ectoghoul from '../../../../docs/species-templates/v5/ectoghoul.json';
import figzy from '../../../../docs/species-templates/v5/figzy.json';
import foromeer from '../../../../docs/species-templates/v5/foromeer.json';
import frackworm from '../../../../docs/species-templates/v5/frackworm.json';
import graviclaw from '../../../../docs/species-templates/v5/graviclaw.json';
import hippochamp from '../../../../docs/species-templates/v5/hippochamp.json';
import hypnopet from '../../../../docs/species-templates/v5/hypnopet.json';
import imprit from '../../../../docs/species-templates/v5/imprit.json';
import kosanos from '../../../../docs/species-templates/v5/kosanos.json';
import luceras from '../../../../docs/species-templates/v5/luceras.json';
import neph from '../../../../docs/species-templates/v5/neph.json';
import newtapede from '../../../../docs/species-templates/v5/newtapede.json';
import scalatto from '../../../../docs/species-templates/v5/scalatto.json';
import shuntara from '../../../../docs/species-templates/v5/shuntara.json';
import smokat from '../../../../docs/species-templates/v5/smokat.json';
import sonalloy from '../../../../docs/species-templates/v5/sonalloy.json';
import terragoyle from '../../../../docs/species-templates/v5/terragoyle.json';
import thirstaserp from '../../../../docs/species-templates/v5/thirstaserp.json';
import tizzie from '../../../../docs/species-templates/v5/tizzie.json';
import venemist from '../../../../docs/species-templates/v5/venemist.json';
import vespersyn from '../../../../docs/species-templates/v5/vespersyn.json';
import voltish from '../../../../docs/species-templates/v5/voltish.json';
import xylum from '../../../../docs/species-templates/v5/xylum.json';
import yetimoth from '../../../../docs/species-templates/v5/yetimoth.json';
import { createCreatureRelease, GENERATOR_VERSION, SCHEMA_VERSION } from './creatureRelease.ts';
export { CreatureRecordSchema } from '@xalians/content/creature';
export { GENERATOR_VERSION, SCHEMA_VERSION };

const release = createCreatureRelease('generation-0.7.0-5', [
  akinza, avilily, bioflim, chromocat, codazzo, crystorn, drilltail, dromeus,
  ectoghoul, figzy, foromeer, frackworm, graviclaw, hippochamp, hypnopet, imprit,
  kosanos, luceras, neph, newtapede, scalatto, shuntara, smokat, sonalloy,
  terragoyle, thirstaserp, tizzie, venemist, vespersyn, voltish, xylum, yetimoth,
]);
export const GENERATION_RELEASE_ID = release.GENERATION_RELEASE_ID;
export const getSpeciesTemplates = release.getSpeciesTemplates;
export const generateXalian = release.generateXalian;
