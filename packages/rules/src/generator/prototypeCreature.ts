import { CreatureRecordSchema, type CreatureRecord } from '@xalians/content/creature';
import { compileSpecies, creatureDraw, generateCreatureDraft } from './creature.ts';
import { makeRng } from './prng.ts';

type Options = Omit<CreatureRecord['provenance'], 'seed'>;
/** Odds of each rare finish; 'standard' takes the remainder. Read by creatureGrade.ts. */
export const CREATURE_FINISH_ODDS = [['eclipse', 1 / 4000], ['prismatic', 1 / 400], ['gleam', 1 / 40]] as const;
const finishOdds = CREATURE_FINISH_ODDS;

/** One rolled ability output: where the drawn intensity sat in its band, 0 at the bottom, 1 at the top. */
export interface IntensityRoll {
  kind: 'action' | 'passive';
  ability: string;
  effect: string;
  intensity: number;
  position: number;
}
const draftSeed = (species: string, seed: string) => JSON.stringify([species, seed, '0.7.0']);

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
        ...generateCreatureDraft(selected, draftSeed(species, seed)),
        id: `xal_${rng.fork('id').hex(20)}`,
        provenance: inputs,
        appearance: { finish: inputs.profile === 'showroom' ? 'standard' : finish },
      };
    },
    /**
     * Replays a creature's ability draw and reports every banded intensity roll with its
     * band position. Draws fork by label, so replaying the ability step alone reproduces
     * the same numbers generateXalian stored. The caller compares `intensity` with the
     * record before trusting a position: a record generated under an older catalog no
     * longer replays.
     */
    intensityRolls(species: string, seed: string): IntensityRoll[] {
      const selected = catalog.get(species);
      if (!selected) throw new Error(`Unknown creature species: ${species}`);
      const draw = creatureDraw(draftSeed(species, seed));
      const positions: Omit<IntensityRoll, 'intensity'>[] = [];
      const resolved = selected.abilities((exclusive, label) => {
        const value = draw(exclusive, label);
        const match = /^(action|passive)\/(.+)\/([^/]+)\/intensity$/.exec(label);
        // A band of one value is not a roll, so it carries no position.
        if (match && exclusive > 1n) {
          const [, kind, ability, effect] = match;
          positions.push({ kind: kind as IntensityRoll['kind'], ability, effect, position: Number(value) / Number(exclusive - 1n) });
        }
        return value;
      });
      const intensityOf = (roll: Omit<IntensityRoll, 'intensity'>) => {
        const abilities = roll.kind === 'action' ? resolved.actions : resolved.passives;
        const effect = abilities.find(a => a.key === roll.ability)?.effects.find(e => e.key === roll.effect);
        return effect && 'intensity' in effect && typeof effect.intensity === 'number' ? effect.intensity : NaN;
      };
      return positions.map(roll => ({ ...roll, intensity: intensityOf(roll) }));
    },
  };
}
