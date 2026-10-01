/**
 * The creature sample set: synthetic creatures for testing games.
 *
 * Contract: docs/design/creature-sample-set.md. Two layers, never merged with the real
 * catalog and never bundled: an exhaustive effect grid of schema-valid actions, and
 * plausible sample species authored as ordinary templates and generated through the real
 * generator with fixed seeds. Games report catalog and samples as separate columns.
 */
import { compileSpecies, type CreatureRecord } from '@xalians/content/creature';
import { createCreatureCatalog } from '../generator/prototypeCreature.ts';
import { makeRng } from '../generator/prng.ts';
import { sampleTemplates, type SampleAxes } from './templates.ts';

export { effectGrid, INTENSITY_POINTS, type GridAction } from './effectGrid.ts';
export {
  sampleTemplates, roleNote, SAMPLE_ROLES, SAMPLE_PROFILES, SAMPLE_BANDS,
  type SampleAxes, type SampleRole, type SampleProfile, type SampleBand, type SampleTemplate,
} from './templates.ts';

const GENERATED_AT = '2026-09-29T00:00:00.000Z';

let compiled: ReturnType<typeof compileSpecies>[] | undefined;
/** The compiled sample species, in template order. Compilation proves each template is legal. */
export function sampleSpecies() {
  return (compiled ??= sampleTemplates().map(entry => compileSpecies(entry.template)));
}

/** The axes each sample key covers. */
export function sampleAxes(): ReadonlyMap<string, SampleAxes> {
  return new Map(sampleTemplates().map(entry => [entry.axes.key, entry.axes] as const));
}

let catalog: ReturnType<typeof createCreatureCatalog> | undefined;
const records = new Map<number, readonly CreatureRecord[]>();
/**
 * Generated records, `perSpecies` per template with seeds `sample-<key>-<j>`, in template
 * order. Serials count up across the whole set; everything is deterministic and cached.
 */
export function sampleCreatures(perSpecies = 3): readonly CreatureRecord[] {
  const hit = records.get(perSpecies);
  if (hit) return hit;
  catalog ??= createCreatureCatalog(sampleTemplates().map(entry => entry.template));
  const list: CreatureRecord[] = [];
  for (const { axes } of sampleTemplates()) {
    for (let j = 0; j < perSpecies; j++) {
      list.push(catalog.generateXalian(axes.key, `sample-${axes.key}-${j}`,
        { origin: 'sample', serial: list.length + 1, generatedAt: GENERATED_AT, profile: 'full' }));
    }
  }
  const frozen = Object.freeze(list);
  records.set(perSpecies, frozen);
  return frozen;
}

/**
 * Deterministic squads of four distinct sample creatures, one per index, from a seeded
 * shuffle of the whole set. Creatures may repeat a species across squads, never inside one.
 */
export function sampleSquads(n: number, seed: string, perSpecies = 3): CreatureRecord[][] {
  const pool = sampleCreatures(perSpecies);
  const squads: CreatureRecord[][] = [];
  for (let i = 0; i < n; i++) {
    const rng = makeRng(`${seed}|squad|${i}`);
    const order = pool.map((_, index) => index);
    for (let k = order.length - 1; k > 0; k--) {
      const swap = rng.int(k + 1);
      [order[k], order[swap]] = [order[swap], order[k]];
    }
    squads.push(order.slice(0, 4).map(index => pool[index]));
  }
  return squads;
}
