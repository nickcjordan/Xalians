import { expect, it } from 'vitest';
import fixture from '../../../content/src/creature/fixtures/support-species.json';
import { ActionSchema, nameOrdinaryActions, type Ability } from '@xalians/content/creature';
import { compileSpecies, creatureDraw, generateCreatureAbilities } from './creature.ts';

function corrosion(): Ability {
  return ActionSchema.parse({
    ...fixture.actions[0], key: 'corrosion', name: 'Placeholder', targeting: ['other'],
    effects: [{ key: 'corrode', type: 'status', status: 'corroding', recipient: 'target', onset: 'instant',
      persistence: 'lingering', duration: 'brief', likelihood: 'likely', removable: ['cleansing'] }],
  });
}

it('names contact, targeted projectile and splash from their actual structures', () => {
  const contact = corrosion();
  const projectile: Ability = { ...corrosion(), key: 'projectile', delivery: { mode: 'projectile', approach: 'stationary' }, spatial: { range: 'short' } };
  const splash: Ability = { ...projectile, key: 'splash', spatial: { range: 'short', area: { shape: 'radial', extent: 'small', anchor: 'location', persistence: 'resolved' } },
    effects: projectile.effects.map(effect => ({ ...effect, recipient: 'area' })) };
  const named = nameOrdinaryActions([contact, projectile, splash], [], [], creatureDraw('names'));
  expect(named.map(a => a.name)).toEqual(['Corrosive Touch', 'Corrosive Shot', 'Corrosive Splash']);
});

it('permits source-authored flavor without deriving acid from chemical identity', () => {
  const value = { ...corrosion(), delivery: { mode: 'projectile' as const, approach: 'stationary' as const }, spatial: { range: 'short' as const } };
  expect(nameOrdinaryActions([value], [], [], creatureDraw('names'))[0].name).toBe('Corrosive Shot');
  expect(nameOrdinaryActions([value], [], [{ qualifiers: ['Acid'], delivery: { projectile: ['Glob'] } }], creatureDraw('names'))[0].name).toBe('Acid Glob');
});

it('uses actual differences to distinguish names and preserves guaranteed names', () => {
  const short = { ...corrosion(), delivery: { mode: 'projectile' as const, approach: 'stationary' as const }, spatial: { range: 'short' as const } };
  const long = { ...short, key: 'long', spatial: { range: 'long' as const } };
  const guaranteed = [{ name: 'Corrosive Shot' }];
  const named = nameOrdinaryActions([short, long], guaranteed, [], creatureDraw('names'));
  expect(named.map(a => a.name)).toEqual(['Corrosive Shot (Short Range)', 'Corrosive Shot (Long Range)']);
  expect(guaranteed).toEqual([{ name: 'Corrosive Shot' }]);
  expect(named.map(({ name: _name, ...facts }) => facts)).toEqual([short, long].map(({ name: _name, ...facts }) => facts));
});

it('handles collisions distinguished by effect likelihood rather than delivery', () => {
  const first = corrosion();
  const second = { ...corrosion(), key: 'occasional', effects: corrosion().effects.map(effect => ({ ...effect, likelihood: 'occasional' as const })) };
  const named = nameOrdinaryActions([first, second], [], [], creatureDraw('names'));
  expect(named[0].name).not.toBe(named[1].name);
  expect(named[0].name).toContain('Likely');
  expect(named[1].name).toContain('Occasional');
});

it('keeps naming changes out of generation decisions and preserves the signature', () => {
  const flavored = JSON.parse(JSON.stringify(fixture));
  flavored.mechanisms[0].naming = { qualifiers: ['Washing', 'Cleansing'], delivery: { projectile: ['Jet'] } };
  const original = compileSpecies(fixture);
  const revised = compileSpecies(flavored);
  for (let i = 0; i < 40; i++) {
    const seed = `naming-${i}`;
    const before = generateCreatureAbilities(original, seed);
    const after = generateCreatureAbilities(revised, seed);
    const facts = (actions: Ability[]) => actions.map(({ name: _name, ...action }) => action);
    expect(facts(after.actions)).toEqual(facts(before.actions));
    expect(after.actions[0]).toEqual(before.actions[0]);
    expect(generateCreatureAbilities(revised, seed)).toEqual(after);
    expect(new Set(after.actions.map(a => a.name.toLowerCase())).size).toBe(4);
  }
});
