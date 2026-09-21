import { describe, expect, it } from 'vitest';
import fixture from './fixtures/support-species.json';
import { ActionSchema, ActionTemplateSchema, PassiveSchema, ProtectionSchema, abilityIdentity, type AbilityTemplate } from './ability.ts';
import { compileSpecies } from './compiler.ts';
import { SpeciesSchema, type Species } from './species.ts';
import { STATUS_CATALOG, Status } from './catalog.ts';
import { effectiveProtection, removableApplications, statusIntensity } from './semantics.ts';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const template = (): Species => SpeciesSchema.parse(fixture);
const action = (): AbilityTemplate => copy(template().actions[0]);
const fireball = (): AbilityTemplate => ({ ...action(), element: 'fire', effects: [
  { key: 'heat', type: 'harm', mechanism: 'elemental', recipient: 'target', onset: 'instant', persistence: 'resolved', likelihood: 'consistent', intensity: [30,70] },
  { key: 'ignite', type: 'status', status: 'burning', recipient: 'target', onset: 'instant', persistence: 'lingering', duration: 'brief', likelihood: 'likely', removable: ['cooling','smothering'] },
] });

describe('redesigned ability contract', () => {
  it('requires explicit elemental classification, with burning independent of harm success', () => {
    const value = fireball();
    expect(ActionTemplateSchema.safeParse(value).success).toBe(true);
    delete value.element;
    expect(ActionTemplateSchema.safeParse(value).success).toBe(false);
  });
  it('permits one-level drain dependence but rejects missing, cyclic and chained references', () => {
    const value = fireball();
    value.effects[1] = { key: 'repair', type: 'restore', recipient: 'self', onset: 'instant', persistence: 'resolved', likelihood: 'consistent', intensity: 30, requires: 'heat' };
    expect(ActionTemplateSchema.safeParse(value).success).toBe(true);
    value.effects[0].requires = 'repair';
    expect(ActionTemplateSchema.safeParse(value).success).toBe(false);
    value.effects[0].requires = 'missing';
    expect(ActionTemplateSchema.safeParse(value).success).toBe(false);
  });
  it('requires geometry only for area recipients, with no selective-area field', () => {
    const value = fireball();
    value.effects[1].recipient = 'area';
    expect(ActionTemplateSchema.safeParse(value).success).toBe(false);
    value.spatial.area = { shape: 'radial', extent: 'small', anchor: 'location', persistence: 'resolved' };
    expect(ActionTemplateSchema.safeParse(value).success).toBe(true);
    expect(ActionTemplateSchema.safeParse({ ...value, spatial: { ...value.spatial, area: { ...value.spatial.area, selectivity: 'allies' } } }).success).toBe(false);
  });
  it('separates area lifetime from the lifetime of a status bound to it', () => {
    const value = fireball();
    value.effects = [{ key: 'ignite', type: 'status', status: 'burning', recipient: 'area', onset: 'instant', persistence: 'sustained', bound: 'area', likelihood: 'likely', removable: ['cooling'] }];
    value.spatial.area = { shape: 'radial', extent: 'small', anchor: 'location', persistence: 'lingering', duration: 'prolonged' };
    expect(ActionTemplateSchema.safeParse(value).success).toBe(true);
    value.spatial.area = { ...value.spatial.area, persistence: 'resolved', duration: undefined };
    expect(ActionTemplateSchema.safeParse(value).success).toBe(false);
  });
  it('separates automatic ongoing processes from deliberate actions', () => {
    const value = { ...action(), activation: { continuity: 'ongoing' }, timing: undefined,
      effects: [{ key: 'repair', type: 'restore', recipient: 'self', onset: 'instant', persistence: 'sustained', likelihood: 'consistent', intensity: 50 }] };
    expect(PassiveSchema.safeParse(value).success).toBe(true);
    expect(ActionSchema.safeParse(value).success).toBe(false);
    expect(PassiveSchema.safeParse({ ...value, activation: { continuity: 'discrete' } }).success).toBe(false);
  });
  it.each(['kind','medium','intensity','compatibility','emphasis'] as const)('rejects retired ability field %s', field => {
    expect(ActionTemplateSchema.safeParse({ ...action(), [field]: 'old' }).success).toBe(false);
  });
  it('keeps effect names, ordering and output out of structural identity, preserving dependence', () => {
    const original = fireball();
    const renamed = copy(original);
    renamed.key = 'renamed'; renamed.name = 'Other Name';
    renamed.effects[0].key = 'renamed-effect';
    if (renamed.effects[0].type === 'harm') renamed.effects[0].intensity = 999;
    renamed.effects.reverse();
    expect(abilityIdentity(renamed)).toBe(abilityIdentity(original));
    original.effects[1].requires = original.effects[0].key;
    expect(abilityIdentity(renamed)).not.toBe(abilityIdentity(original));
  });
  it('does not use self versus target spelling to duplicate a self-only action', () => {
    const original = action(); original.targeting = ['self'];
    const equivalent = copy(original); equivalent.effects[0].recipient = 'self';
    expect(abilityIdentity(original)).toBe(abilityIdentity(equivalent));
  });
});

describe('author once, construct valid combinations', () => {
  it('always returns four distinct actions, including pure support', () => {
    const compiled = compileSpecies(fixture);
    for (let offset = 0n; offset < 30n; offset++) {
      const generated = compiled.abilities(max => offset % max);
      expect(generated.actions).toHaveLength(4);
      expect(new Set(generated.actions.map(abilityIdentity)).size).toBe(4);
      for (const value of generated.actions) {
        expect(ActionSchema.safeParse(value).success).toBe(true);
        expect(value.effects.some(e => e.type === 'harm')).toBe(false);
      }
    }
  });
  it('includes every authored combination: contact, projectile, area, range and timing', () => {
    const compiled = compileSpecies(fixture);
    const identities = new Set<string>();
    // 2 contact + 4 projectile targeted + 8 projectile area = 14, not a move whitelist.
    for (let rank = 0n; rank < 14n; rank++) {
      const generated = compiled.abilities((max, label) => label === 'structure/0' ? rank % max : 0n);
      identities.add(abilityIdentity(generated.actions[1]));
    }
    expect(identities.size).toBe(14);
  });
  it('rejects inadequate capacity even when mechanisms repeat with different names and output', () => {
    const species = template();
    const mechanism = species.mechanisms[0];
    delete mechanism.delivery.projectile;
    mechanism.effects[0].recipient = 'target';
    species.mechanisms.push({ ...copy(mechanism), key: 'alias', name: 'Alias' });
    expect(() => compileSpecies(species)).toThrow(/four structurally distinct/);
  });
  it('rejects intensity-only duplicates of guaranteed actions before generation', () => {
    const species = template();
    const mechanism = species.mechanisms[0];
    mechanism.targeting = species.actions[0].targeting;
    mechanism.effects = [{ ...species.actions[0].effects[0], likelihood: ['consistent'], intensity: [100,200] }];
    mechanism.delivery = { contact: { approach: ['stationary'], range: ['contact'] } };
    mechanism.timing = { preparation: ['brief'], recovery: ['brief'] };
    expect(() => compileSpecies(species)).toThrow(/four structurally distinct/);
  });
  it('excludes cross-mechanism aliases without retrying draws', () => {
    const species = template();
    species.mechanisms.push({ ...copy(species.mechanisms[0]), key: 'alias', name: 'Another Name' });
    let draws = 0;
    const generated = compileSpecies(species).abilities((max, label) => { if (label.startsWith('structure/')) draws++; return max - 1n; });
    expect(draws).toBe(3);
    expect(new Set(generated.actions.map(abilityIdentity)).size).toBe(4);
  });
  it('excludes self-only recipient aliases without pretending they provide extra capacity', () => {
    const species = template();
    species.mechanisms[0].targeting = ['self'];
    species.mechanisms[0].delivery = { contact: { approach: ['stationary'] } };
    species.mechanisms[0].effects[0].recipient = { contact: ['self','target'] };
    // Two timing choices, not four distinct moves from synonymous recipients.
    expect(() => compileSpecies(species)).toThrow(/four structurally distinct/);
  });
  it('partitions two area-capable effects without omitting or duplicating combinations', () => {
    const species = template();
    species.mechanisms[0].effects.push({ ...copy(species.mechanisms[0].effects[0]), key: 'cool', methods: ['cooling'] });
    const compiled = compileSpecies(species);
    const structures = new Set<string>();
    for (let rank = 0n; rank < 30n; rank++) {
      const selected = compiled.abilities((max, label) => label === 'structure/0' ? rank % max : 0n).actions[1];
      expect(ActionSchema.safeParse(selected).success).toBe(true);
      structures.add(abilityIdentity(selected));
    }
    expect(structures.size).toBe(30);
  });
  it('matches reordered compound definitions across mechanisms', () => {
    const species = template();
    species.mechanisms[0].effects.push({ ...copy(species.mechanisms[0].effects[0]), key: 'cool', methods: ['cooling'] });
    const alias = copy(species.mechanisms[0]); alias.key = 'alias'; alias.effects.reverse();
    species.mechanisms.push(alias);
    const generated = compileSpecies(species).abilities(() => 0n);
    expect(new Set(generated.actions.map(abilityIdentity)).size).toBe(4);
  });
  it('checks every physiological band, including guaranteed-only sources', () => {
    const species = template();
    species.actions[0].instrument = 'gaze';
    species.physiology.senses.sight = [0,50];
    expect(() => compileSpecies(species)).toThrow(/throughout/);
    species.physiology.senses.sight = [1,50];
    expect(() => compileSpecies(species)).not.toThrow();
    species.actions[0].instrument = 'tail';
    expect(() => compileSpecies(species)).toThrow(/absent from anatomy/);
  });
  it('checks full permissions rather than accepting a valid first combination', () => {
    const species = template();
    species.mechanisms[0].delivery.projectile!.area!.shape.push('cone');
    expect(() => compileSpecies(species)).toThrow(/originate at self/);
  });
  it('keeps delivery independent of approach and range for a supported closing attack', () => {
    const value = fireball();
    value.delivery = { mode: 'contact', approach: 'closing' };
    value.spatial.range = 'short';
    expect(ActionTemplateSchema.safeParse(value).success).toBe(true);
  });
  it('keeps mandatory compound effects while varying only their approved likelihood', () => {
    const species = template();
    species.mechanisms[0].element = 'fire';
    species.mechanisms[0].effects = fireball().effects.map(effect => ({ ...effect, likelihood: ['likely', 'occasional'] }));
    const compiled = compileSpecies(species);
    for (const draw of [() => 0n, (max: bigint) => max - 1n]) {
      const generated = compiled.abilities(draw);
      for (const value of generated.actions.slice(1)) expect(value.effects.map(e => e.type)).toEqual(['harm','status']);
    }
  });
  it('does not roll signature structure and allows output above 100', () => {
    const species = template();
    const effect = species.actions[0].effects[0];
    if (effect.type === 'restore') effect.intensity = [101,200];
    const compiled = compileSpecies(species);
    const low = compiled.abilities(() => 0n).actions[0];
    const high = compiled.abilities(max => max - 1n).actions[0];
    expect(abilityIdentity(low)).toBe(abilityIdentity(high));
    expect('intensity' in high.effects[0] && high.effects[0].intensity).toBe(200);
    expect(ActionSchema.safeParse(high).success).toBe(true);
  });
  it('treats passive signatures as outside action slots', () => {
    const species = template();
    species.passives = [{ ...species.actions[0], key: 'repair-passive', activation: { continuity: 'ongoing' }, timing: undefined }];
    species.actions = [];
    species.signature = { type: 'passive', key: 'repair-passive' };
    const generated = compileSpecies(species).abilities(() => 0n);
    expect(generated.actions).toHaveLength(4);
    expect(generated.passives).toHaveLength(1);
  });
  it('rejects old alternate permission authorities and independent traits', () => {
    for (const field of ['instruments','conduits','actionPool','traits','archetypeWeights']) {
      expect(() => compileSpecies({ ...fixture, [field]: [] })).toThrow();
    }
  });
});

describe('status and protection semantics', () => {
  it('gives every status the same omitted-intensity baseline', () => {
    for (const status of Status.options) expect(STATUS_CATALOG[status].intensity).toBe(50);
    const effect = fireball().effects[1];
    if (effect.type !== 'status') throw new Error('fixture');
    expect(statusIntensity({ ...effect, intensity: undefined })).toBe(50);
    expect(statusIntensity({ ...effect, intensity: 120 })).toBe(120);
  });
  it('preserves resistance under temporary immunity without merging their scopes', () => {
    const resistance = ProtectionSchema.parse({ type: 'status', status: 'burning', degree: 'resistant' });
    const immunity = ProtectionSchema.parse({ type: 'status', status: 'burning', degree: 'immune' });
    const scope = { type: 'status', status: 'burning' } as const;
    expect(effectiveProtection([resistance, immunity], scope)).toBe('immune');
    expect(effectiveProtection([resistance], scope)).toBe('resistant');
    expect(effectiveProtection([immunity], { type: 'harm', mechanism: 'elemental', element: 'fire' })).toBeUndefined();
    expect(resistance.degree).toBe('resistant');
  });
  it('does not infer removals from an element or status name', () => {
    const applications = [{ status: 'burning', removable: ['cooling'] }, { status: 'burning', removable: ['disrupting'] }] as const;
    expect(removableApplications(applications, ['cooling'])).toEqual([applications[0]]);
    expect(applications).toHaveLength(2);
  });
  it('does not force poisoned to inflict harm or classify corrosion as metal-only', () => {
    expect(STATUS_CATALOG.poisoned.harm).toEqual({ mechanism: 'elemental', element: 'chemical', required: false });
    expect(STATUS_CATALOG.corroding.harm?.element).toBe('chemical');
  });
});
