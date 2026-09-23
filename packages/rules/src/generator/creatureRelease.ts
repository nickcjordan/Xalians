/** Bind the redesigned generator to an explicitly supplied release roster. */
import { z } from 'zod';
import { CreatureRecordSchema, type CreatureRecord } from '@xalians/content/creature';
import { compileSpecies, generateCreatureDraft } from './creature.ts';
import { makeRng } from './prng.ts';

export const GENERATOR_VERSION = '0.7.0';
export const SCHEMA_VERSION = '5.0.0';
const replayInputs = CreatureRecordSchema.shape.provenance.omit({ generatorVersion: true, schemaVersion: true, releaseId: true });
type Options = Omit<CreatureRecord['provenance'], 'seed' | 'generatorVersion' | 'schemaVersion' | 'releaseId'>;
// Preserve the existing appearance policy; no retired v4 generation tables are imported.
const finishOdds = [['eclipse', 1 / 4000], ['prismatic', 1 / 400], ['gleam', 1 / 40]] as const;

/** Compilation happens once per roster load. Generation does not evaluate finished creatures. */
export function createCreatureRelease(releaseId: string, sources: readonly unknown[]) {
  z.string().regex(/^[a-z0-9][a-z0-9._-]*$/).parse(releaseId);
  if (!sources.length) throw new Error('Release roster must not be empty');
  const roster = new Map(sources.map(source => {
    const compiled = compileSpecies(source);
    return [compiled.species.key, compiled] as const;
  }));
  if (roster.size !== sources.length) throw new Error('Release species keys must be unique');
  return {
    GENERATION_RELEASE_ID: releaseId,
    getSpeciesTemplates: () => [...roster.values()].map(value => value.species),
    generateXalian(species: string, seed: string, options: Options): CreatureRecord {
      const compiled = roster.get(species);
      if (!compiled) throw new Error(`Unknown release species: ${species}`);
      // Validate caller metadata only, not generated combinations. Never invent replay inputs.
      const inputs = replayInputs.parse({ ...options, seed });
      const generationSeed = JSON.stringify([species, seed, GENERATOR_VERSION]);
      const rng = makeRng(generationSeed);
      const roll = rng.fork('appearance').float();
      let finish: CreatureRecord['appearance']['finish'] = 'standard';
      let cumulative = 0;
      for (const [candidate, odds] of finishOdds) {
        cumulative += odds;
        if (roll < cumulative) { finish = candidate; break; }
      }
      return {
        ...generateCreatureDraft(compiled, generationSeed),
        id: `xal_${rng.fork('id').hex(20)}`,
        provenance: { ...inputs, generatorVersion: GENERATOR_VERSION, schemaVersion: SCHEMA_VERSION, releaseId },
        appearance: { finish: inputs.profile === 'showroom' ? 'standard' : finish },
      };
    },
  };
}
