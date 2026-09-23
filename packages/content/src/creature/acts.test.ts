import { describe, expect, it } from 'vitest';
import fixture from './fixtures/support-species.json';
import { INSTRUMENT_ROWS, MEDIUM_ROWS, MIN_DISTINCT_ACTS, PATTERNS, deriveMechanisms } from './acts.ts';
import { MechanismSchema, SpeciesSchema, type Species } from './species.ts';
import { compileSpecies } from './compiler.ts';
import { Removal, Status } from './catalog.ts';
import { ANATOMY_KEYS, CHANNEL_KEYS, ELEMENT_KEYS } from '../registriesConst.ts';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * A body carrying exactly one instrument, plus whatever that instrument's channel
 * predicate demands. Guaranteed actions and mechanisms are stripped so the only
 * capacity under test is what the tables derive.
 */
function bodyWith(instrument: string, element = 'chemical'): Record<string, unknown> {
  const species = copy(fixture) as unknown as Record<string, unknown> & {
    physiology: { anatomy: string[]; bodyPlan: string; communication: string[]; breathes: string[]; senses: { sight: [number, number]; special: string[] } };
  };
  species.element = element;
  species.mechanisms = [];
  species.channels = [];
  const channel = (CHANNEL_KEYS as readonly string[]).includes(instrument);
  species.physiology.anatomy = channel ? ['body'] : [instrument];
  if (channel) (species.channels as string[]).push(instrument);
  if (instrument === 'voice') species.physiology.communication = ['vocal'];
  if (instrument === 'breath') species.physiology.breathes = ['gas'];
  if (instrument === 'swarm') species.physiology.bodyPlan = 'swarm';
  if (instrument === 'mind') species.physiology.communication = ['telepathic'];
  if (instrument === 'gaze') species.physiology.senses.sight = [40, 60];
  // The signature action uses secretion; keep it only when secretion is under test.
  species.actions = [];
  species.passives = [];
  species.signature = { type: 'action', key: 'none' };
  return species;
}
/** A species needs a signature that points at a guaranteed ability, so keep one cheap
 * self-delivered passive whose instrument is always present. Call it last, after any
 * anatomy the test sets, because the passive borrows the body's first instrument. */
function withSignature(species: Record<string, unknown>): Record<string, unknown> {
  species.passives = [{
    key: 'mark', name: 'Mark', description: 'A constant identifying signal.', instrument: (species.physiology as { anatomy: string[] }).anatomy[0],
    activation: { continuity: 'ongoing' }, delivery: { mode: 'self', approach: 'stationary' },
    targeting: ['self'], spatial: {},
    effects: [{ key: 'mark', type: 'status', status: 'marked', recipient: 'self', onset: 'instant', persistence: 'sustained', bound: 'source', likelihood: 'consistent', removable: ['disrupting'] }],
  }];
  species.signature = { type: 'passive', key: 'mark' };
  return species;
}

describe('the derivation tables', () => {
  it('lists only known patterns on every instrument row', () => {
    for (const [instrument, row] of Object.entries(INSTRUMENT_ROWS)) {
      for (const pattern of row.patterns) expect(PATTERNS, instrument).toContain(pattern);
    }
    for (const [element, row] of Object.entries(MEDIUM_ROWS)) {
      for (const pattern of row.patterns) expect(PATTERNS, element).toContain(pattern);
    }
  });
  it('covers every instrument and every element exactly once', () => {
    expect(Object.keys(INSTRUMENT_ROWS).sort()).toEqual([...ANATOMY_KEYS, ...CHANNEL_KEYS].sort());
    expect(Object.keys(MEDIUM_ROWS).sort()).toEqual([...ELEMENT_KEYS].sort());
  });
  it('names only catalog statuses and catalog removals', () => {
    const check = (value?: { status: string; removable: readonly string[] }) => {
      if (!value) return;
      expect(Status.options).toContain(value.status);
      for (const removal of value.removable) expect(Removal.options).toContain(removal);
    };
    for (const row of Object.values(INSTRUMENT_ROWS)) check(row.bind);
    for (const row of Object.values(MEDIUM_ROWS)) {
      check(row.status); check(row.bind);
      if (row.ward) expect(Status.options).toContain(row.ward);
    }
  });
});

describe('derivation produces valid mechanisms for every body', () => {
  it.each([...ANATOMY_KEYS, ...CHANNEL_KEYS])('derives valid, compilable acts from %s alone', instrument => {
    const species = withSignature(bodyWith(instrument));
    for (const mechanism of deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0])) {
      const result = MechanismSchema.safeParse(mechanism);
      expect(result.success, `${mechanism.key}: ${result.error?.message}`).toBe(true);
    }
    // Breath is an emitter with no physical patterns: it contributes nothing without a
    // conduit. Every other instrument contributes at least one act on its own.
    const derived = deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0])
      .filter(mechanism => mechanism.instrument === instrument);
    if (INSTRUMENT_ROWS[instrument].patterns.length) expect(derived.length, instrument).toBeGreaterThan(0);
    else expect(derived, instrument).toHaveLength(0);
  });
  it.each([...ELEMENT_KEYS])('derives valid, compilable acts from a %s conduit', element => {
    const species = withSignature(bodyWith('body', element));
    species.conduits = { body: element };
    const parsed = SpeciesSchema.parse(species);
    for (const mechanism of deriveMechanisms(parsed as unknown as Parameters<typeof deriveMechanisms>[0])) {
      const result = MechanismSchema.safeParse(mechanism);
      expect(result.success, `${mechanism.key}: ${result.error?.message}`).toBe(true);
    }
    const compiled = compileSpecies(species);
    expect(compiled.acts.distinct).toBeGreaterThanOrEqual(MIN_DISTINCT_ACTS);
  });
  it('grants the whole medium row through a conduit, not only the patterns the part already had', () => {
    const species = bodyWith('body', 'fire');
    (species.physiology as { anatomy: string[] }).anatomy = ['fists'];
    withSignature(species);
    species.conduits = { fists: 'fire' };
    const derived = deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0]);
    const keys = derived.map(mechanism => mechanism.key);
    // Fists have no physical lash, but a fire conduit carries the medium's lash anyway:
    // the union is the ruling, and delivery still comes from the part (contact).
    expect(keys).toContain('derived-fists-lash-fire');
    expect(keys).not.toContain('derived-fists-lash');
    expect(Object.keys(derived.find(m => m.key === 'derived-fists-lash-fire')!.delivery)).toEqual(['contact']);
    expect(derived.find(m => m.key === 'derived-fists-lash-fire')!.delivery.contact!.area!.shape).toEqual(['sweep']);
  });
  it('gives a medium variant the signal delivery of a signal channel', () => {
    const species = bodyWith('mind', 'psychic');
    withSignature(species);
    species.conduits = { mind: 'psychic' };
    const derived = deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0]);
    const mend = derived.find(mechanism => mechanism.key === 'derived-mind-mend-other-psychic')!;
    expect(Object.keys(mend.delivery)).toEqual(['signal']);
  });
  it('still requires a bind for a medium snare and a status for a cloud', () => {
    const species = bodyWith('body', 'metal');
    (species.physiology as { anatomy: string[] }).anatomy = ['fists'];
    withSignature(species);
    species.conduits = { fists: 'metal' };
    const keys = deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0]).map(m => m.key);
    // Metal has no status and no bind of its own, and fists have no bind either.
    expect(keys).not.toContain('derived-fists-cloud-metal');
    expect(keys).not.toContain('derived-fists-snare-metal');
  });
  it('compiles a whole body with anatomy, a channel and a conduit', () => {
    const species = bodyWith('body', 'fire');
    (species.physiology as { anatomy: string[] }).anatomy = ['jaws', 'claws', 'tail'];
    species.channels = ['aura'];
    withSignature(species);
    species.conduits = { jaws: 'fire' };
    const compiled = compileSpecies(species);
    expect(compiled.acts.distinct).toBeGreaterThanOrEqual(MIN_DISTINCT_ACTS);
    expect(Object.keys(compiled.acts.byInstrument).sort()).toEqual(['aura', 'claws', 'jaws', 'tail']);
  });
});

describe('the four lever moves of 2026-09-22', () => {
  const keysOf = (species: Record<string, unknown>) =>
    deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0]).map(mechanism => mechanism.key);

  it('derives no physical drain from jaws, but a dark conduit on jaws drains', () => {
    const plain = bodyWith('body', 'dark');
    (plain.physiology as { anatomy: string[] }).anatomy = ['jaws'];
    withSignature(plain);
    const bare = keysOf(plain);
    expect(bare).not.toContain('derived-jaws-drain-piercing');
    expect(bare).not.toContain('derived-jaws-drain-compression');
    expect(bare).toContain('derived-jaws-strike-piercing');

    const channelled = bodyWith('body', 'dark');
    (channelled.physiology as { anatomy: string[] }).anatomy = ['jaws'];
    withSignature(channelled);
    channelled.conduits = { jaws: 'dark' };
    expect(keysOf(channelled)).toContain('derived-jaws-drain-dark');
  });

  it('gives a body no terrorize without display communication, and one with it', () => {
    const mute = bodyWith('body', 'fire');
    (mute.physiology as { communication: string[] }).communication = ['vibration'];
    withSignature(mute);
    expect(keysOf(mute)).not.toContain('derived-body-terrorize');

    const showy = bodyWith('body', 'fire');
    (showy.physiology as { communication: string[] }).communication = ['display'];
    withSignature(showy);
    expect(keysOf(showy)).toContain('derived-body-terrorize');
  });

  it('gives a rattle no terrorize without vocal or vibration communication', () => {
    const silent = bodyWith('body', 'fire');
    (silent.physiology as { anatomy: string[]; communication: string[] }).anatomy = ['rattle'];
    (silent.physiology as { communication: string[] }).communication = ['display'];
    withSignature(silent);
    const keys = keysOf(silent);
    expect(keys).not.toContain('derived-rattle-terrorize');
    // The ward is all a silent rattle still offers, which is what the per-instrument rule surfaces.
    expect(keys).toContain('derived-rattle-ward');

    const heard = bodyWith('body', 'fire');
    (heard.physiology as { anatomy: string[] }).anatomy = ['rattle'];
    (heard.physiology as { communication: string[] }).communication = ['vibration'];
    withSignature(heard);
    expect(keysOf(heard)).toContain('derived-rattle-terrorize');
  });

  it.each(['rock', 'ice', 'metal'] as const)('derives a projectile elemental hurl from a %s conduit', element => {
    const species = bodyWith('body', element);
    (species.physiology as { anatomy: string[] }).anatomy = ['tail'];
    withSignature(species);
    species.conduits = { tail: element };
    const derived = deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0]);
    const hurl = derived.find(mechanism => mechanism.key === `derived-tail-hurl-${element}`);
    expect(hurl, element).toBeDefined();
    expect(Object.keys(hurl!.delivery)).toEqual(['projectile']);
    expect(hurl!.delivery.projectile!.range).toEqual(['short', 'medium']);
    expect(hurl!.effects).toHaveLength(1);
    expect(hurl!.effects[0].type).toBe('harm');
    expect((hurl!.effects[0] as { mechanism?: string }).mechanism).toBe('elemental');
    // Rock, ice and metal are the only rows that gained hurl; a physical tail has none.
    expect(derived.map(mechanism => mechanism.key)).not.toContain('derived-tail-hurl-impact');
  });

  it('delivers the other form of a psychic mend by signal from a gaze channel', () => {
    const species = bodyWith('gaze', 'psychic');
    withSignature(species);
    species.conduits = { gaze: 'psychic' };
    const derived = deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0]);
    const mend = derived.find(mechanism => mechanism.key === 'derived-gaze-mend-other-psychic')!;
    expect(mend).toBeDefined();
    expect(Object.keys(mend.delivery)).toEqual(['signal']);
    expect(mend.delivery.signal!.reception).toBe('visual');
    expect(mend.effects[0].type).toBe('restore');
  });
});

describe('species narrow or re-band what the tables grant', () => {
  const body = () => {
    const species = bodyWith('body', 'fire');
    (species.physiology as { anatomy: string[] }).anatomy = ['jaws', 'claws', 'tail'];
    return withSignature(species);
  };
  it('removes excluded acts by instrument, by pattern and by wildcard', () => {
    const open = compileSpecies(body()).acts;
    const narrowed = compileSpecies({ ...body(), acts: { exclude: ['claws/*', '*/shove', 'jaws/drain'] } }).acts;
    expect(narrowed.distinct).toBeLessThan(open.distinct);
    expect(narrowed.byInstrument.claws).toBeUndefined();
    expect(narrowed.exclusions).toEqual(['claws/*', '*/shove', 'jaws/drain']);
  });
  it('applies an output override to the named act and leaves the rest on the attribute band', () => {
    const species = { ...body(), acts: { output: { 'jaws/crush': [7, 9] as [number, number] } } };
    const derived = deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0]);
    const crush = derived.find(mechanism => mechanism.key === 'derived-jaws-crush')!;
    expect(crush.effects[0].intensity).toEqual([7, 9]);
    const strike = derived.find(mechanism => mechanism.key === 'derived-jaws-strike-piercing')!;
    expect(strike.effects[0].intensity).not.toEqual([7, 9]);
  });
  it('rejects an exclusion or override naming an instrument or pattern the body has not got', () => {
    expect(() => compileSpecies({ ...body(), acts: { exclude: ['wings/strike'] } })).toThrow(/not an instrument this species has/);
    expect(() => compileSpecies({ ...body(), acts: { exclude: ['jaws/ambush'] } })).toThrow(/not a known pattern/);
    expect(() => compileSpecies({ ...body(), acts: { output: { '*/strike': [1, 2] } } })).toThrow(/not an instrument this species has/);
  });
});

describe('channels and conduits are declared claims, not free labels', () => {
  it('rejects a channel used by a guaranteed ability but never declared', () => {
    const species = copy(fixture) as Record<string, unknown>;
    species.channels = [];
    expect(() => compileSpecies(species)).toThrow(/channel secretion is used but not declared/);
    expect(() => compileSpecies({ ...species, channels: ['secretion'] })).not.toThrow();
  });
  it.each([
    ['voice', { communication: [] }, /channel voice requires vocal communication/],
    ['breath', { breathes: [] }, /channel breath requires a nonempty breathes list/],
    ['swarm', { bodyPlan: 'biped' }, /channel swarm requires the swarm body plan/],
    ['mind', { communication: ['vocal'] }, /channel mind requires telepathic/],
  ] as const)('holds the %s predicate against physiology', (channel, physiology, message) => {
    const species = withSignature(bodyWith(channel)) as Record<string, unknown> & { physiology: Record<string, unknown> };
    species.physiology = { ...species.physiology, ...physiology };
    expect(() => compileSpecies(species)).toThrow(message);
  });
  it('rejects gaze without sight throughout the band', () => {
    const species = withSignature(bodyWith('gaze')) as Record<string, unknown> & { physiology: { senses: { sight: [number, number] } } };
    species.physiology.senses.sight = [0, 60];
    expect(() => compileSpecies(species)).toThrow(/sight throughout the species band/);
  });
  it('rejects a conduit whose instrument the body has not got', () => {
    const species = withSignature(bodyWith('body', 'fire'));
    expect(() => compileSpecies({ ...species, conduits: { wings: 'fire' } })).toThrow(/absent from anatomy and channels/);
  });
  it('rejects a foreign element unless an authored ability already uses it there', () => {
    const species = withSignature(bodyWith('body', 'fire')) as Record<string, unknown>;
    expect(() => compileSpecies({ ...species, conduits: { body: 'ice' } })).toThrow(/a foreign element needs a guaranteed or authored ability/);
    const justified = {
      ...species, conduits: { body: 'ice' },
      mechanisms: [{
        key: 'frost-coat', name: 'Frost Coat', description: 'A cold film forms across the body.', instrument: 'body', element: 'ice',
        targeting: ['other'], activation: { continuity: ['discrete'] },
        timing: { preparation: ['brief'], recovery: ['brief'] },
        delivery: { contact: { approach: ['stationary'], range: ['contact'] } },
        effects: [{ key: 'chill', type: 'status', status: 'chilled', recipient: 'target', onset: 'instant', persistence: 'lingering', duration: 'brief', likelihood: ['likely'], removable: ['warming'] }],
      }],
    };
    expect(() => compileSpecies(justified)).not.toThrow();
  });
});

describe('a self-guard applies', () => {
  it('wards consistently for a brief duration', () => {
    const species = withSignature(bodyWith('body', 'fire'));
    const ward = deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0])
      .find(mechanism => mechanism.key === 'derived-body-ward')!;
    expect(ward.effects[0].likelihood).toEqual(['consistent']);
    expect(ward.effects[0].duration).toBe('brief');
  });
});

describe('output bands follow the governing attribute', () => {
  it('scales heavy and light physical harm by the calibrated class factors and floors at one', () => {
    const species = bodyWith('body', 'fire') as Species & Record<string, unknown>;
    (species.physiology as { anatomy: string[] }).anatomy = ['fists', 'spurs'];
    withSignature(species);
    species.attributes = { ...species.attributes, strength: [100, 200] };
    const derived = deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0]);
    expect(derived.find(m => m.key === 'derived-fists-strike-impact')!.effects[0].intensity).toEqual([80, 160]);
    expect(derived.find(m => m.key === 'derived-spurs-strike-piercing')!.effects[0].intensity).toEqual([85, 170]);
    species.attributes = { ...species.attributes, strength: [0, 1] };
    const floored = deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0]);
    expect(floored.find(m => m.key === 'derived-fists-strike-impact')!.effects[0].intensity).toEqual([1, 1]);
  });
});

describe('charge-up acts, 2026-09-23', () => {
  it('lets crush, beam and burst be prepared at length, and nothing else', () => {
    const species = bodyWith('body', 'fire') as Species & Record<string, unknown>;
    (species.physiology as { anatomy: string[] }).anatomy = ['fists'];
    withSignature(species);
    species.conduits = { fists: 'fire' };
    const derived = deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0]);
    const chargeable = derived.filter(m => m.timing.preparation.includes('prolonged')).map(m => m.key).sort();
    expect(chargeable).toEqual(['derived-fists-beam-fire', 'derived-fists-burst-fire', 'derived-fists-crush']);
  });
});

describe('push force follows what pushes, 2026-09-23', () => {
  it('scales a body push by strength and a mind or medium push by willpower', () => {
    const species = bodyWith('body', 'water') as Species & Record<string, unknown>;
    (species.physiology as { anatomy: string[] }).anatomy = ['trunk'];
    (species.physiology as { communication: string[] }).communication = ['telepathic'];
    withSignature(species);
    species.channels = ['mind'];
    species.conduits = { trunk: 'water' };
    species.attributes = { ...species.attributes, strength: [10, 20], willpower: [100, 200] };
    const derived = deriveMechanisms(SpeciesSchema.parse(species) as unknown as Parameters<typeof deriveMechanisms>[0]);
    const force = (key: string) => derived.find(m => m.key === key)!.effects[0].intensity;
    expect(force('derived-trunk-shove')).toEqual([8, 16]);
    expect(force('derived-trunk-shove-water')).toEqual([80, 160]);
    expect(force('derived-mind-shove')).toEqual([80, 160]);
  });
});
