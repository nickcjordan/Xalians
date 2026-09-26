import { CreatureRecordSchema, type CreatureRecord } from '@xalians/content/creature';
import { compileSpecies, generateCreatureDraft } from './creature.ts';
import { makeRng } from './prng.ts';

type Options = Omit<CreatureRecord['provenance'], 'seed'>;
const finishOdds = [['eclipse', 1 / 4000], ['prismatic', 1 / 400], ['gleam', 1 / 40]] as const;

export function createCreatureCatalog(templates: readonly unknown[]) {
  if (!templates.length) throw new Error('Creature catalog must not be empty');
  const compiled = templates.map(compileSpecies);
  const catalog = new Map(compiled.map(entry => [entry.species.key, entry] as const));
  if (catalog.size !== templates.length) throw new Error('Creature catalog species keys must be unique');
  return {
    getSpeciesTemplates: () => compiled.map(entry => entry.species),
    generateXalian(species: string, seed: string, options: Options): CreatureRecord {
      const selected = catalog.get(species);
      if (!selected) throw new Error(`Unknown creature species: ${species}`);
      const inputs = CreatureRecordSchema.shape.provenance.parse({ ...options, seed });
      // Keep the existing seed namespaces so removing release metadata does not reroll creatures.
      const rng = makeRng(JSON.stringify([species, seed, '0.8.0']));
      const roll = rng.fork('appearance').float();
      let finish: CreatureRecord['appearance']['finish'] = 'standard';
      let cumulative = 0;
      for (const [candidate, odds] of finishOdds) {
        cumulative += odds;
        if (roll < cumulative) { finish = candidate; break; }
      }
      return {
        ...generateCreatureDraft(selected, JSON.stringify([species, seed, '0.7.0'])),
        id: `xal_${rng.fork('id').hex(20)}`,
        provenance: inputs,
        appearance: { finish: inputs.profile === 'showroom' ? 'standard' : finish },
      };
    },
  };
}
