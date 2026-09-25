/** Species-independent creature generator. The executable archive contains no roster. */
import { z } from 'zod';
import { CreatureRecordSchema, type CreatureRecord } from '@xalians/content/creature';
import { compileSpecies, generateCreatureDraft } from './creature.ts';
import { makeRng } from './prng.ts';

export const RELEASE_KIND = 'species-independent';
export const GENERATION_RELEASE_ID = 'generation-0.9.0-1';
export const GENERATOR_VERSION = '0.9.0';
export const SCHEMA_VERSION = '5.2.0';
// This packaging change does not reroll established creature facts or appearance.
const GENERATION_SEED_NAMESPACE_VERSION = '0.8.0';
const CREATURE_FACT_NAMESPACE_VERSION = '0.7.0';
const revisionSchema = z.string().regex(/^[a-f0-9]{64}$/);
const replayInputs = CreatureRecordSchema.shape.provenance.omit({
  generatorVersion: true, schemaVersion: true, releaseId: true, speciesRevision: true,
});
type Options = Omit<CreatureRecord['provenance'], 'seed' | 'generatorVersion' | 'schemaVersion' | 'releaseId' | 'speciesRevision'>;
type Entry = { revision: string; template: unknown };
const finishOdds = [['eclipse', 1 / 4000], ['prismatic', 1 / 400], ['gleam', 1 / 40]] as const;

export function createCreatureCatalog(entries: readonly Entry[]) {
  if (!entries.length) throw new Error('Creature catalog must not be empty');
  const catalog = new Map(entries.map(({ revision, template }) => {
    revisionSchema.parse(revision);
    const compiled = compileSpecies(template);
    return [compiled.species.key, { revision, compiled }] as const;
  }));
  if (catalog.size !== entries.length) throw new Error('Creature catalog species keys must be unique');
  return {
    getSpeciesTemplates: () => [...catalog.values()].map(value => value.compiled.species),
    generateXalian(species: string, seed: string, options: Options): CreatureRecord {
      const selected = catalog.get(species);
      if (!selected) throw new Error(`Unknown release species: ${species}`);
      const inputs = replayInputs.parse({ ...options, seed });
      const generationSeed = JSON.stringify([species, seed, GENERATION_SEED_NAMESPACE_VERSION]);
      const creatureFactSeed = JSON.stringify([species, seed, CREATURE_FACT_NAMESPACE_VERSION]);
      const rng = makeRng(generationSeed);
      const roll = rng.fork('appearance').float();
      let finish: CreatureRecord['appearance']['finish'] = 'standard';
      let cumulative = 0;
      for (const [candidate, odds] of finishOdds) {
        cumulative += odds;
        if (roll < cumulative) { finish = candidate; break; }
      }
      return {
        ...generateCreatureDraft(selected.compiled, creatureFactSeed),
        id: `xal_${rng.fork('id').hex(20)}`,
        provenance: {
          ...inputs, generatorVersion: GENERATOR_VERSION, schemaVersion: SCHEMA_VERSION,
          releaseId: GENERATION_RELEASE_ID, speciesRevision: selected.revision,
        },
        appearance: { finish: inputs.profile === 'showroom' ? 'standard' : finish },
      };
    },
  };
}

/** Historical replay supplies the exact archived template identified by the record. */
export function generateXalian(template: unknown, revision: string, seed: string, options: Options): CreatureRecord {
  const catalog = createCreatureCatalog([{ template, revision }]);
  const species = catalog.getSpeciesTemplates()[0].key;
  return catalog.generateXalian(species, seed, options);
}

export { CreatureRecordSchema } from '@xalians/content/creature';
