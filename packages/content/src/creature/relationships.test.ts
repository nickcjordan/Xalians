import { describe, expect, it } from 'vitest';
import fixture from './fixtures/support-species.json';
import { ActionSchema, ActionTemplateSchema, PassiveTemplateSchema, abilityIdentity, type AbilityTemplate } from './ability.ts';
import { nameOrdinaryActions } from './naming.ts';
import { compileSpecies } from './compiler.ts';
import { SpeciesSchema } from './species.ts';

const specimen = () => SpeciesSchema.parse(fixture);
const base = (): AbilityTemplate => specimen().actions[0];
const restoration = (): AbilityTemplate => ({ ...base(), activation: { continuity: 'ongoing' }, timing: undefined,
  delivery: { mode: 'self', approach: 'stationary' }, targeting: ['self'], spatial: {},
  effects: [{ key: 'regrow', type: 'restore', recipient: 'self', onset: 'gradual', persistence: 'sustained', likelihood: 'consistent', intensity: [30,60] }],
});

describe('representative source relationships, without migrating species', () => {
  it('allows ongoing self-centered auras with both area and self effects', () => {
    const aura: AbilityTemplate = { ...restoration(), key: 'repair-aura', delivery: { mode: 'field', approach: 'stationary' },
      spatial: { area: { shape: 'radial', extent: 'small', anchor: 'self', persistence: 'sustained' } },
      effects: [...restoration().effects, { ...restoration().effects[0], key: 'aura', recipient: 'area' }] };
    expect(PassiveTemplateSchema.safeParse(aura).success).toBe(true);
    for (const anchor of ['target', 'location'] as const) {
      expect(PassiveTemplateSchema.safeParse({ ...aura, spatial: { area: { ...aura.spatial.area, anchor } } }).success).toBe(false);
    }
    const species = specimen();
    species.passives = [aura];
    expect(() => compileSpecies(species)).not.toThrow();
  });
  it('rejects externally directed ongoing passives at authoring while allowing maintained actions', () => {
    const directed: AbilityTemplate = { ...restoration(), key: 'directed-repair', delivery: { mode: 'stream', approach: 'stationary' },
      targeting: ['other'], spatial: { range: 'short' },
      effects: restoration().effects.map(effect => ({ ...effect, recipient: 'target' })) };
    expect(PassiveTemplateSchema.safeParse(directed).success).toBe(false);
    const species = specimen();
    species.passives = [directed];
    expect(() => compileSpecies(species)).toThrow(/ongoing passives target only self/);
    expect(ActionTemplateSchema.safeParse({ ...directed, timing: base().timing }).success).toBe(true);
  });
  it.each(['contact', 'harmed', 'ally-harmed'] as const)('preserves the event-supplied target for %s responses', trigger => {
    expect(PassiveTemplateSchema.safeParse({ ...base(), activation: { continuity: 'discrete', trigger } }).success).toBe(true);
  });
  it('supports Bioflim-style automatic regrowth without requiring a selected repair action', () => {
    const species = specimen();
    species.actions = [];
    species.passives = [restoration()];
    species.signature = { type: 'passive', key: species.passives[0].key };
    const compiled = compileSpecies(species);
    for (const draw of [() => 0n, (max: bigint) => max - 1n]) {
      const generated = compiled.abilities(draw);
      expect(generated.actions).toHaveLength(4);
      expect(generated.passives).toHaveLength(1);
      expect(generated.passives[0].effects[0].type).toBe('restore');
    }
  });
  it('supports a Newtapede-style source-maintained hold but not an unmaintained sustained hold', () => {
    const hold: AbilityTemplate = { ...base(), activation: { continuity: 'ongoing' }, effects: [
      { key: 'hold', type: 'status', status: 'restrained', recipient: 'target', onset: 'instant', persistence: 'sustained', bound: 'source', likelihood: 'consistent', removable: ['freeing'] },
    ] };
    expect(ActionTemplateSchema.safeParse(hold).success).toBe(true);
    expect(ActionTemplateSchema.safeParse({ ...hold, activation: { continuity: 'discrete' } }).success).toBe(false);
  });
  it('keeps a lingering patch separate from a condition maintained by that patch', () => {
    const area: AbilityTemplate = { ...base(), spatial: { range: 'short', area: { shape: 'radial', extent: 'small', anchor: 'location', persistence: 'lingering', duration: 'prolonged' } },
      delivery: { mode: 'stream', approach: 'stationary' }, effects: [
        { key: 'coat', type: 'status', status: 'corroding', recipient: 'area', onset: 'instant', persistence: 'sustained', bound: 'area', likelihood: 'likely', removable: ['cleansing'] },
      ] };
    expect(ActionTemplateSchema.safeParse(area).success).toBe(true);
    const wrong = { ...area, effects: area.effects.map(effect => ({ ...effect, recipient: 'target' })) };
    expect(ActionTemplateSchema.safeParse(wrong).success).toBe(false);
  });
  it('requires an external direction for every permitted cone selection', () => {
    const cone: AbilityTemplate = { ...base(), targeting: ['other'], spatial: { range: 'short', area: { shape: 'cone', extent: 'small', anchor: 'self', persistence: 'resolved' } },
      effects: base().effects.map(effect => ({ ...effect, recipient: 'area' })) };
    expect(ActionTemplateSchema.safeParse(cone).success).toBe(true);
    expect(ActionTemplateSchema.safeParse({ ...cone, targeting: ['self','other'] }).success).toBe(false);
  });
  it('supports Hypnopet-style visually received influence without calling all visible effects visual reception', () => {
    const signal: AbilityTemplate = { ...base(), instrument: 'mind', element: 'psychic', delivery: { mode: 'signal', approach: 'stationary', reception: 'visual' },
      spatial: { range: 'short' }, effects: [{ key: 'steady', type: 'remove', recipient: 'target', onset: 'instant', persistence: 'resolved', likelihood: 'consistent', methods: ['stabilizing'] }] };
    expect(ActionTemplateSchema.safeParse(signal).success).toBe(true);
    expect(ActionTemplateSchema.safeParse({ ...signal, delivery: { ...signal.delivery, mode: 'projectile' } }).success).toBe(false);
  });
  it('does not infer phase traversal or elemental immunity from temporary smoke dispersal', () => {
    const shift: AbilityTemplate = { ...base(), targeting: ['self'], delivery: { mode: 'self', approach: 'stationary' }, spatial: {}, effects: [
      { key: 'shift', type: 'status', status: 'dispersed', recipient: 'self', onset: 'instant', persistence: 'lingering', duration: 'brief', likelihood: 'consistent', removable: ['disrupting'] },
    ] };
    const parsed = ActionTemplateSchema.parse(shift);
    expect(parsed.effects).toHaveLength(1);
    expect(parsed.effects[0]).not.toHaveProperty('protection');
    expect(parsed.effects[0]).toHaveProperty('status', 'dispersed');
  });
  it('allows sourced sound production independently of communication and respiration', () => {
    const species = specimen();
    species.physiology.communication = [];
    species.physiology.breathes = [];
    species.actions[0].instrument = 'voice';
    species.actions[0].description = 'Noncanonical fixture: an internal resonator emits a repairing vibration; no communication behavior is implied.';
    expect(() => compileSpecies(species)).not.toThrow();
  });
  it('checks passive-only physical instruments, not only ordinary action sources', () => {
    const species = specimen();
    species.passives = [{ ...restoration(), key: 'shell-regrowth', instrument: 'shell' }];
    expect(() => compileSpecies(species)).toThrow(/absent from anatomy/);
    species.physiology.anatomy.push('shell');
    expect(() => compileSpecies(species)).not.toThrow();
  });
  it('rejects recipient mappings that omit one of the permitted delivery modes', () => {
    const species = specimen();
    species.mechanisms[0].effects[0].recipient = { contact: ['target'] };
    expect(() => compileSpecies(species)).toThrow(/cover exactly/);
  });
  it('reports unused area permissions instead of silently discarding authored possibilities', () => {
    const species = specimen();
    species.mechanisms[0].effects[0].recipient = 'target';
    expect(() => compileSpecies(species)).toThrow(/unreachable/);
  });
});

function compound(shared: boolean): AbilityTemplate {
  return { ...base(), effects: [
    { key: 'first', type: 'harm', mechanism: 'impact', recipient: 'target', onset: 'instant', persistence: 'resolved', likelihood: 'likely', intensity: 50 },
    { key: 'second', type: 'harm', mechanism: 'impact', recipient: 'target', onset: 'instant', persistence: 'resolved', likelihood: 'likely', intensity: 50 },
    { key: 'repair', type: 'restore', recipient: 'self', onset: 'instant', persistence: 'resolved', likelihood: 'consistent', intensity: 50, requires: 'first' },
    { key: 'guard', type: 'protect', recipient: 'self', onset: 'instant', persistence: 'resolved', likelihood: 'consistent', intensity: 50, requires: shared ? 'first' : 'second' },
  ] };
}
it('distinguishes shared success from independent success despite identical prerequisite descriptors', () => {
  const shared = compound(true);
  const independent = compound(false);
  expect(ActionTemplateSchema.safeParse(shared).success).toBe(true);
  expect(ActionTemplateSchema.safeParse(independent).success).toBe(true);
  expect(abilityIdentity(shared)).not.toBe(abilityIdentity(independent));
  const renamed = JSON.parse(JSON.stringify(shared)) as AbilityTemplate;
  for (const effect of renamed.effects) { effect.key = `renamed-${effect.key}`; if (effect.requires) effect.requires = `renamed-${effect.requires}`; }
  renamed.effects.reverse();
  expect(abilityIdentity(renamed)).toBe(abilityIdentity(shared));
});
it('does not lose distinct dependency structures during capacity proof or selection', () => {
  const species = specimen();
  species.mechanisms = [true, false].map(shared => ({
    ...species.mechanisms[0], key: shared ? 'shared' : 'independent',
    delivery: { contact: { approach: ['stationary'], range: ['contact'] } },
    effects: compound(shared).effects.map(effect => ({ ...effect, likelihood: [effect.likelihood] })),
  }));
  const compiled = compileSpecies(species);
  const generated = compiled.abilities(() => 0n);
  expect(new Set(generated.actions.map(abilityIdentity)).size).toBe(4);
});

it('can name the distinction between a shared prerequisite and independent prerequisites', () => {
  const named = nameOrdinaryActions([ActionSchema.parse(compound(true)), ActionSchema.parse(compound(false))], [], [], () => 0n);
  expect(named[0].name).toContain('Shared Success');
  expect(named[1].name).toContain('Dependent');
  expect(named[0].name).not.toBe(named[1].name);
});

it('constructs correlated target/area recipients from requires, without a second relationship field', () => {
  const species = specimen();
  const recipients = { contact: ['target'] as ['target'], projectile: ['target', 'area'] as ['target', 'area'] };
  species.mechanisms[0].effects = [
    { key: 'harm', type: 'harm', mechanism: 'impact', recipient: recipients, onset: 'instant', persistence: 'resolved', likelihood: ['consistent'], intensity: 50 },
    { key: 'repair', type: 'restore', recipient: recipients, onset: 'instant', persistence: 'resolved', likelihood: ['consistent'], intensity: 50, requires: 'harm' },
  ];
  const compiled = compileSpecies(species);
  const structures = new Set<string>();
  for (let rank = 0n; rank < 14n; rank++) {
    const ability = compiled.abilities((max, label) => label === 'structure/0' ? rank % max : 0n).actions[1];
    expect(ability.effects[0].recipient).toBe(ability.effects[1].recipient);
    expect(ActionTemplateSchema.safeParse(ability).success).toBe(true);
    structures.add(abilityIdentity(ability));
  }
  expect(structures.size).toBe(14);
});

it('retains the dependent-self alternative alongside correlated target and area choices', () => {
  const species = specimen();
  species.mechanisms[0].effects = [
    { key: 'harm', type: 'harm', mechanism: 'impact', recipient: { contact: ['target'], projectile: ['target','area'] }, onset: 'instant', persistence: 'resolved', likelihood: ['consistent'], intensity: 50 },
    { key: 'repair', type: 'restore', recipient: { contact: ['target','self'], projectile: ['target','area','self'] }, onset: 'instant', persistence: 'resolved', likelihood: ['consistent'], intensity: 50, requires: 'harm' },
  ];
  const compiled = compileSpecies(species);
  const structures = new Set<string>();
  for (let rank = 0n; rank < 28n; rank++) {
    const ability = compiled.abilities((max, label) => label === 'structure/0' ? rank % max : 0n).actions[1];
    expect(ability.effects[1].recipient === 'self' || ability.effects[1].recipient === ability.effects[0].recipient).toBe(true);
    expect(ActionTemplateSchema.safeParse(ability).success).toBe(true);
    structures.add(abilityIdentity(ability));
  }
  expect(structures.size).toBe(28);
});

it('uses the same self-only recipient equivalence for validation and generation', () => {
  const ability = compound(true);
  ability.targeting = ['self']; ability.spatial = {};
  ability.effects[0].recipient = 'self'; ability.effects[2].recipient = 'target';
  expect(ActionTemplateSchema.safeParse(ability).success).toBe(true);
  const species = specimen();
  species.mechanisms[0].targeting = ['self'];
  species.mechanisms[0].delivery = { self: { approach: ['stationary'] } };
  species.mechanisms[0].timing = { preparation: ['immediate','brief','prolonged'], recovery: ['brief'] };
  species.mechanisms[0].effects = ability.effects.map(effect => ({ ...effect, likelihood: [effect.likelihood] }));
  const generated = compileSpecies(species).abilities(() => 0n);
  expect(generated.actions.slice(1).every(action => action.effects.every(effect => effect.recipient === 'self'))).toBe(true);
});
