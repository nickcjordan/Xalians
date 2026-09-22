import { expect, it } from 'vitest';
import fixture from '../../../content/src/creature/fixtures/support-species.json';
import { ActionSchema, nameOrdinaryActions, statusIntensity, type Ability } from '@xalians/content/creature';
import { compileSpecies, creatureDraw, generateCreatureAbilities } from './creature.ts';

function corrosion(): Ability {
  return ActionSchema.parse({
    ...fixture.actions[0], key: 'corrosion', name: 'Placeholder', targeting: ['other'],
    effects: [{ key: 'corrode', type: 'status', status: 'corroding', recipient: 'target', onset: 'instant',
      persistence: 'lingering', duration: 'brief', likelihood: 'likely', removable: ['cleansing'] }],
  });
}

it('compiles and names paralysis variants without adding harm or sedation', () => {
  // Anatomy grants acts of its own now; this test names the authored mechanism, so it
  // switches derivation off with a whole-body exclusion.
  const compiled = compileSpecies({ ...fixture, acts: { exclude: ['*/*'] }, mechanisms: fixture.mechanisms.map(mechanism => ({
    ...mechanism, effects: [{ key: 'paralyze', type: 'status', status: 'paralyzed',
      recipient: mechanism.effects[0].recipient, onset: 'instant', persistence: 'lingering', duration: 'brief',
      likelihood: ['likely'], removable: ['detoxifying'] }],
  })) });
  const result = generateCreatureAbilities(compiled, 'paralysis');
  expect(result.actions).toHaveLength(4);
  for (const action of result.actions.slice(1)) {
    expect(ActionSchema.safeParse(action).success).toBe(true);
    expect(action.name).toContain('Paralyzing');
    expect(action.effects).toHaveLength(1);
    const effect = action.effects[0];
    if (effect.type !== 'status') throw new Error('Expected only an applied status');
    expect(effect.status).toBe('paralyzed');
    expect(statusIntensity(effect)).toBe(50);
    expect(effect.removable).toEqual(['detoxifying']);
  }
  expect(generateCreatureAbilities(compiled, 'paralysis')).toEqual(result);
});

it('names contact, targeted projectile and splash from their actual structures', () => {
  const contact = corrosion();
  const projectile: Ability = { ...corrosion(), key: 'projectile', delivery: { mode: 'projectile', approach: 'stationary' }, spatial: { range: 'short' } };
  const splash: Ability = { ...projectile, key: 'splash', spatial: { range: 'short', area: { shape: 'radial', extent: 'small', anchor: 'location', persistence: 'resolved' } },
    effects: projectile.effects.map(effect => ({ ...effect, recipient: 'area' })) };
  const named = nameOrdinaryActions([contact, projectile, splash], [], [], creatureDraw('names'));
  expect(named.map(a => a.name)).toEqual(['Corrosive Touch', 'Corrosive Shot', 'Corrosive Splash']);
});

it('names a resolved radial pulse a Burst, and a lingering one a Field', () => {
  const radial = (mode: Ability['delivery']['mode'], persistence: 'resolved' | 'lingering'): Ability => ({
    ...corrosion(), key: `${mode}-${persistence}`, delivery: { mode, approach: 'stationary' },
    spatial: { range: 'short', area: { shape: 'radial', extent: 'small', anchor: 'self', persistence,
      ...(persistence === 'lingering' ? { duration: 'brief' as const } : {}) } },
    effects: corrosion().effects.map(effect => ({ ...effect, recipient: 'area' as const })),
  });
  const named = (ability: Ability) => nameOrdinaryActions([ability], [], [], creatureDraw('names'))[0].name;
  expect(named(radial('pulse', 'resolved'))).toBe('Corrosive Burst');
  // A pulse that stays behind is still a field, and a non-pulse radial is unchanged.
  expect(named(radial('pulse', 'lingering'))).toBe('Corrosive Field');
  expect(named(radial('field', 'resolved'))).toBe('Corrosive Field');
});

it('names a contact strike for the body part that makes it, and keeps Touch for a channel', () => {
  const contact = (instrument: Ability['instrument']): Ability => ({ ...corrosion(), key: instrument, instrument });
  const named = (instrument: Ability['instrument']) => nameOrdinaryActions([contact(instrument)], [], [], creatureDraw('names'))[0].name;
  expect(named('jaws')).toBe('Corrosive Bite');
  expect(named('hooves')).toBe('Corrosive Kick');
  expect(named('claws')).toBe('Corrosive Swipe');
  expect(named('roots')).toBe('Corrosive Grip');
  // A channel does not strike, and a crest has no single contact verb: both stay Touch.
  expect(named('secretion')).toBe('Corrosive Touch');
  expect(named('crest')).toBe('Corrosive Touch');
  // Geometry still wins: an instrument noun describes a strike, not an area.
  const sweep: Ability = { ...contact('jaws'), key: 'sweep', targeting: ['other'],
    spatial: { area: { shape: 'sweep', extent: 'small', anchor: 'self', persistence: 'resolved' } },
    effects: contact('jaws').effects.map(effect => ({ ...effect, recipient: 'area' })) };
  expect(nameOrdinaryActions([sweep], [], [], creatureDraw('names'))[0].name).toBe('Corrosive Sweep');
});

it('names harm for what it does rather than for its registry mechanism word', () => {
  const harm = (mechanism: 'impact' | 'cutting' | 'piercing' | 'compression'): Ability => ({
    ...corrosion(), key: mechanism, instrument: 'fists',
    effects: [{ key: 'hit', type: 'harm', mechanism, intensity: 40, recipient: 'target',
      onset: 'instant', persistence: 'resolved', likelihood: 'consistent' }],
  });
  const named = (mechanism: 'impact' | 'cutting' | 'piercing' | 'compression') =>
    nameOrdinaryActions([harm(mechanism)], [], [], creatureDraw('names'))[0].name;
  expect(named('impact')).toBe('Heavy Punch');
  expect(named('cutting')).toBe('Slashing Punch');
  expect(named('piercing')).toBe('Piercing Punch');
  expect(named('compression')).toBe('Crushing Punch');
  // Elemental harm still takes the element's own title, not a mechanism word.
  const elemental: Ability = { ...harm('impact'), key: 'elemental', element: 'chemical',
    effects: [{ ...harm('impact').effects[0], mechanism: 'elemental' }] as Ability['effects'] };
  expect(nameOrdinaryActions([elemental], [], [], creatureDraw('names'))[0].name).toBe('Chemical Punch');
});

it('lets an authored vocabulary override the instrument noun and the mechanism word', () => {
  const bite: Ability = { ...corrosion(), instrument: 'jaws',
    effects: [{ key: 'hit', type: 'harm', mechanism: 'impact', intensity: 40, recipient: 'target',
      onset: 'instant', persistence: 'resolved', likelihood: 'consistent' }] };
  expect(nameOrdinaryActions([bite], [], [], creatureDraw('names'))[0].name).toBe('Heavy Bite');
  expect(nameOrdinaryActions([bite], [], [{ qualifiers: ['Crushing'], delivery: { contact: ['Maw'] } }], creatureDraw('names'))[0].name).toBe('Crushing Maw');
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
  // The guaranteed name holds the bare reading, so the plain short-range shot states
  // its range; the long one simply reads Distant.
  expect(named.map(a => a.name)).toEqual(['Corrosive Shot (Short Range)', 'Distant Corrosive Shot']);
  expect(guaranteed).toEqual([{ name: 'Corrosive Shot' }]);
  expect(named.map(({ name: _name, ...facts }) => facts)).toEqual([short, long].map(({ name: _name, ...facts }) => facts));
});

it('handles collisions distinguished by effect likelihood rather than delivery', () => {
  const first = corrosion();
  const second = { ...corrosion(), key: 'occasional', effects: corrosion().effects.map(effect => ({ ...effect, likelihood: 'occasional' as const })) };
  const named = nameOrdinaryActions([first, second], [], [], creatureDraw('names'));
  expect(named[0].name).not.toBe(named[1].name);
  // Likely is the plain reading and takes no word; occasional reads Glancing.
  expect(named[0].name).toBe('Corrosive Touch');
  expect(named[1].name).toBe('Glancing Corrosive Touch');
});

/** A contact punch at every plain setting: brief preparation and recovery, stationary
 * approach, a likely outcome on the target. It carries no fact word at all. */
function punch(overrides: Partial<Ability> = {}): Ability {
  return { ...corrosion(), key: 'punch', instrument: 'fists',
    timing: { preparation: 'brief', recovery: 'brief' },
    effects: [{ key: 'hit', type: 'harm', mechanism: 'impact', intensity: 40, recipient: 'target',
      onset: 'instant', persistence: 'resolved', likelihood: 'likely' }], ...overrides } as Ability;
}
const namesOf = (abilities: Ability[], guaranteed: { name: string }[] = []) =>
  nameOrdinaryActions(abilities, guaranteed, [], creatureDraw('names')).map(a => a.name);

it('gives the plainest reading the bare name and states only what actually differs', () => {
  // Slot order deliberately puts the fact-carrying action first: the plainest still wins.
  const quick = punch({ key: 'quick', timing: { preparation: 'immediate', recovery: 'brief' } });
  expect(namesOf([quick, punch()])).toEqual(['Quick Heavy Punch', 'Heavy Punch']);
});

it('names each setting that varies inside one act with its own word', () => {
  const at = (overrides: Partial<Ability>, key: string) => punch({ ...overrides, key });
  const cases: [Partial<Ability>, string][] = [
    [{ timing: { preparation: 'immediate', recovery: 'brief' } }, 'Quick'],
    [{ timing: { preparation: 'prolonged', recovery: 'brief' } }, 'Charged'],
    [{ timing: { preparation: 'brief', recovery: 'repeatable' } }, 'Rapid'],
    [{ timing: { preparation: 'brief', recovery: 'prolonged' } }, 'Mighty'],
    [{ delivery: { mode: 'contact', approach: 'closing' } }, 'Lunging'],
  ];
  for (const [overrides, word] of cases) {
    expect(namesOf([at(overrides, 'variant'), punch()])).toEqual([`${word} Heavy Punch`, 'Heavy Punch']);
  }
  // Range and area extent are read off a projectile, likelihood and duration off effects.
  const shot = (overrides: Partial<Ability>, key: string): Ability => ({ ...punch(),
    key, delivery: { mode: 'projectile', approach: 'stationary' }, spatial: { range: 'short' }, ...overrides } as Ability);
  expect(namesOf([shot({ spatial: { range: 'medium' } }, 'far'), shot({}, 'near')])).toEqual(['Far Heavy Shot', 'Heavy Shot']);
  expect(namesOf([shot({ spatial: { range: 'long' } }, 'distant'), shot({}, 'near')])).toEqual(['Distant Heavy Shot', 'Heavy Shot']);
  const atLikelihood = (likelihood: 'consistent' | 'occasional', key: string) =>
    shot({ effects: [{ ...punch().effects[0], likelihood }] } as Partial<Ability>, key);
  expect(namesOf([atLikelihood('occasional', 'glancing'), shot({}, 'near')])).toEqual(['Glancing Heavy Shot', 'Heavy Shot']);
  expect(namesOf([atLikelihood('consistent', 'sure'), shot({}, 'near')])).toEqual(['Sure Heavy Shot', 'Heavy Shot']);
  // Who it lands on is a fact word too, and it is read before the timing words.
  const onSelf = punch({ key: 'on-self', targeting: ['self'], spatial: {},
    effects: [{ ...punch().effects[0], recipient: 'self' }] } as Partial<Ability>);
  expect(namesOf([onSelf, punch()])).toEqual(['Self Heavy Punch', 'Heavy Punch']);
  const area = (extent: 'medium' | 'large', duration: 'brief' | 'prolonged', key: string): Ability => ({ ...shot({}, key),
    targeting: ['other'], spatial: { range: 'short', area: { shape: 'radial', extent, anchor: 'location', persistence: 'resolved' } },
    effects: [{ key: 'burn', type: 'status', status: 'burning', recipient: 'area', onset: 'instant',
      persistence: 'lingering', duration, likelihood: 'likely', removable: ['smothering'] }] } as Ability);
  expect(namesOf([area('large', 'brief', 'wide'), area('medium', 'brief', 'plain')])).toEqual(['Wide Burning Splash', 'Burning Splash']);
  expect(namesOf([area('medium', 'prolonged', 'lasting'), area('medium', 'brief', 'plain')])).toEqual(['Lasting Burning Splash', 'Burning Splash']);
});

it('falls back to a structural parenthetical when two actions share every fact word', () => {
  // Same base name and identical settings, so both carry exactly the same fact words.
  // The real difference is the onset, which has no word: tier two has nothing to say.
  const instant = punch({ key: 'instant' });
  const gradual = punch({ key: 'gradual',
    effects: [{ ...punch().effects[0], onset: 'gradual' }] } as Partial<Ability>);
  const named = namesOf([instant, gradual]);
  expect(named[0]).toBe('Heavy Punch');
  expect(named[1]).toMatch(/^Heavy Punch \(.+\)$/);
});

it('reserves guaranteed names, so an ordinary action never takes one', () => {
  const named = namesOf([punch(), punch({ key: 'quick', timing: { preparation: 'immediate', recovery: 'brief' } })], [{ name: 'Heavy Punch' }]);
  expect(named).not.toContain('Heavy Punch');
  expect(named).toContain('Quick Heavy Punch');
  expect(new Set(named.map(n => n.toLowerCase())).size).toBe(2);
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
