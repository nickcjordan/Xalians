/** Redesigned ability generation. Existing game entry points remain on their current release. */
import { compileSpecies, type CompiledSpecies, type Draw, type CreatureData } from '@xalians/content/creature';
import { makeRng } from './prng.ts';

/** Unbiased integer draws even when a factored domain exceeds Number.MAX_SAFE_INTEGER. */
export function creatureDraw(seed: string): Draw {
  const rng = makeRng(seed);
  return (exclusive, label) => {
    if (exclusive <= 0n) throw new Error('draw interval must be positive');
    if (exclusive === 1n) return 0n;
    const stream = rng.fork(label);
    const bits = (exclusive - 1n).toString(2).length;
    const words = Math.ceil(bits / 32);
    const mask = (1n << BigInt(bits)) - 1n;
    // Entropy rejection is not creature rejection: no capability is constructed here.
    for (;;) {
      let value = 0n;
      for (let i = 0; i < words; i++) value = (value << 32n) | BigInt(stream.int(0x100000000));
      value &= mask;
      if (value < exclusive) return value;
    }
  };
}

export function generateCreatureAbilities(compiled: CompiledSpecies, seed: string) {
  return compiled.abilities(creatureDraw(seed));
}

/** All resolved species facts, without manufacturing publication metadata or rarity. */
export function generateCreatureDraft(compiled: CompiledSpecies, seed: string): CreatureData {
  const species = compiled.species;
  const draw = creatureDraw(seed);
  const roll = (band: [number, number], label: string) => band[0] + Number(draw(BigInt(band[1]) - BigInt(band[0]) + 1n, label));
  const ratings = <T extends Record<string, [number, number]>>(bands: T, prefix: string) =>
    Object.fromEntries(Object.entries(bands).map(([key, band]) => [key, roll(band, `${prefix}/${key}`)])) as { [K in keyof T]: number };
  const { size, genome, capabilities, senses, ...facts } = species.physiology;
  const sizeScale = makeRng(seed).fork('size/scale').float();
  const physical = (band: [number, number]) => band[0] + (band[1] - band[0]) * sizeScale;
  const dimensions = Object.fromEntries((['heightCm', 'lengthCm', 'widthCm'] as const).flatMap(key =>
    size[key] ? [[key, physical(size[key])]] : []));
  return {
    species: species.key, element: species.element,
    physiology: {
      ...JSON.parse(JSON.stringify(facts)),
      ...dimensions, massKg: physical(size.massKg),
      genome: { chirality: genome.chirality === 'achiral' ? 'achiral' : draw(2n, 'chirality') === 0n ? 'levo' : 'dextro' },
      capabilities: ratings(capabilities, 'capability'),
      senses: { sight: roll(senses.sight, 'sense/sight'), hearing: roll(senses.hearing, 'sense/hearing'),
        smell: roll(senses.smell, 'sense/smell'), special: [...senses.special] },
    },
    attributes: ratings(species.attributes, 'attribute'), temperament: ratings(species.temperament, 'temperament'),
    ...compiled.abilities(draw),
  };
}
export { compileSpecies };
