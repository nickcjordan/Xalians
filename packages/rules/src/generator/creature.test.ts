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
  expect(creature).not.toHaveProperty('traits');
  expect(creature).not.toHaveProperty('archetype');
  expect(creature.physiology).not.toHaveProperty('corporeality');
  expect(creature.physiology.protections).toEqual([]);
});
