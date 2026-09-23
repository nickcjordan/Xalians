import { expect, it } from 'vitest';
import fixture from '../../../content/src/creature/fixtures/support-species.json';
import { abilityIdentity, CreatureDataSchema } from '@xalians/content/creature';
import { compileSpecies, creatureDraw, generateCreatureAbilities, generateCreatureDraft } from './creature.ts';

it('reproduces the same abilities and keeps four unique structures across seeds', () => {
  const compiled = compileSpecies(fixture);
  for (let index = 0; index < 100; index++) {
    const seed = `seed-${index}`;
    const first = generateCreatureAbilities(compiled, seed);
    expect(generateCreatureAbilities(compiled, seed)).toEqual(first);
    expect(new Set(first.actions.map(abilityIdentity)).size).toBe(4);
  }
});
it('draws reproducibly from domains larger than a safe JavaScript integer', () => {
  const bound = (1n << 100n) + 31n;
  const draw = creatureDraw('large-space');
  const value = draw(bound, 'structural-choice');
  expect(value).toBeGreaterThanOrEqual(0n);
  expect(value).toBeLessThan(bound);
  expect(creatureDraw('large-space')(bound, 'structural-choice')).toBe(value);
  expect(draw(1n, 'one')).toBe(0n);
});
it('generates the full resolved model without traits, archetypes or implicit physiology grants', () => {
  const source = JSON.parse(JSON.stringify(fixture));
  source.attributes.strength = [150,180];
  const compiled = compileSpecies(source);
  const creature = generateCreatureDraft(compiled, 'whole-creature');
  expect(generateCreatureDraft(compiled, 'whole-creature')).toEqual(creature);
  expect(CreatureDataSchema.safeParse(creature).success).toBe(true);
  expect(creature.attributes.strength).toBeGreaterThanOrEqual(150);
  expect(creature.physiology.massKg).toBeGreaterThanOrEqual(source.physiology.size.massKg[0]);
  expect(creature.physiology.massKg).toBeLessThanOrEqual(source.physiology.size.massKg[1]);
  const heightScale = (creature.physiology.heightCm! - source.physiology.size.heightCm[0]) /
    (source.physiology.size.heightCm[1] - source.physiology.size.heightCm[0]);
  const massScale = (creature.physiology.massKg - source.physiology.size.massKg[0]) /
    (source.physiology.size.massKg[1] - source.physiology.size.massKg[0]);
  expect(heightScale).toBeCloseTo(massScale, 12);
  expect(creature).not.toHaveProperty('traits');
  expect(creature).not.toHaveProperty('archetype');
  expect(creature.physiology).not.toHaveProperty('corporeality');
  expect(creature.physiology.protections).toEqual([]);
});

it('resolves every declared overall dimension together and leaves undeclared ones absent', () => {
  const source = JSON.parse(JSON.stringify(fixture));
  source.physiology.size.lengthCm = [100, 200];
  source.physiology.size.widthCm = [20, 40];
  const creature = generateCreatureDraft(compileSpecies(source), 'three-dimensions');
  const { size } = source.physiology;
  const percentile = (creature.physiology.massKg - size.massKg[0]) / (size.massKg[1] - size.massKg[0]);
  for (const key of ['heightCm', 'lengthCm', 'widthCm'] as const) {
    expect((creature.physiology[key]! - size[key][0]) / (size[key][1] - size[key][0])).toBeCloseTo(percentile, 12);
  }
  delete source.physiology.size.heightCm;
  delete source.physiology.size.widthCm;
  const lengthOnly = generateCreatureDraft(compileSpecies(source), 'length-only');
  expect(lengthOnly.physiology.heightCm).toBeUndefined();
  expect(lengthOnly.physiology.widthCm).toBeUndefined();
  expect(lengthOnly.physiology.lengthCm).toBeGreaterThanOrEqual(100);
  expect(CreatureDataSchema.safeParse(lengthOnly).success).toBe(true);
});
