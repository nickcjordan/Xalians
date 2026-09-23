/**
 * Derived acts: the body decides what the creature can do.
 *
 * Contract: docs/design/creature-derived-acts.md. Anatomy grants, lore subtracts. Every
 * table here is a lever, a current setting recorded so work can proceed, movable on
 * evidence. `deriveMechanisms` turns a species' anatomy, channels and conduits into
 * ordinary `Mechanism` records, so the compiler's branch building, act-first selection,
 * alias matching and naming all run unchanged over derived and authored mechanisms alike.
 */
import type { z } from 'zod';
import type * as c from './catalog.ts';
import { ANATOMY_KEYS, CHANNEL_KEYS, ELEMENT_KEYS } from '../registriesConst.ts';
import type { Mechanism } from './species.ts';

type Instrument = z.infer<typeof c.InstrumentKeySchema>;
type Element = z.infer<typeof c.ElementKeySchema>;
type StatusKey = c.StatusKey;
type Removal = z.infer<typeof c.Removal>;
type HarmMechanism = Exclude<z.infer<typeof c.Harm>, 'elemental'>;
type Reception = z.infer<typeof c.Reception>;

/** Physical patterns need an instrument row that lists them; medium patterns need a conduit. */
export const PATTERNS = Object.freeze([
  'strike', 'crush', 'rake', 'lash', 'drain', 'shove', 'snare', 'hurl', 'terrorize', 'ward', 'mend',
  'beam', 'burst', 'spray', 'cloud',
] as const);
export type Pattern = typeof PATTERNS[number];
/** Medium-only patterns need a conduit. Drain joined them on 2026-09-22: the species pass
 * excluded a physical life drain on 17 of 32 records, because a mouth is not a vampire.
 * A biological drainer authors its own mechanism; a dark, ghost, chemical, sand or psychic
 * conduit still derives one. */
const MEDIUM_ONLY: readonly Pattern[] = Object.freeze(['beam', 'burst', 'spray', 'cloud', 'drain'] as const);

/** Class sets the output factor. `channel` is mind, gaze, voice, secretion, swarm and aura. */
export type InstrumentClass = 'heavy' | 'light' | 'channel';
export interface InstrumentRow {
  readonly patterns: readonly Pattern[];
  readonly harm: readonly HarmMechanism[];
  readonly class: InstrumentClass;
  readonly bind?: { readonly status: StatusKey; readonly removable: readonly Removal[] };
  readonly reception?: Reception | 'none';
}
const row = (value: InstrumentRow): InstrumentRow => Object.freeze({
  ...value, patterns: Object.freeze(value.patterns), harm: Object.freeze(value.harm),
  ...(value.bind ? { bind: Object.freeze({ ...value.bind, removable: Object.freeze(value.bind.removable) }) } : {}),
});
const restrained = { status: 'restrained' as const, removable: ['freeing'] as const };
const entranced = { status: 'entranced' as const, removable: ['disrupting'] as const };

export const INSTRUMENT_ROWS: Readonly<Record<Instrument, InstrumentRow>> = Object.freeze({
  jaws: row({ patterns: ['strike', 'crush', 'rake', 'drain', 'snare'], harm: ['piercing', 'compression'], class: 'heavy', bind: restrained }),
  fangs: row({ patterns: ['strike', 'drain'], harm: ['piercing'], class: 'light' }),
  beak: row({ patterns: ['strike', 'crush', 'rake', 'drain'], harm: ['piercing', 'impact'], class: 'light' }),
  tusks: row({ patterns: ['strike', 'shove', 'rake', 'crush', 'terrorize'], harm: ['piercing', 'impact'], class: 'heavy', reception: 'visual' }),
  horns: row({ patterns: ['strike', 'shove', 'crush', 'ward', 'terrorize'], harm: ['piercing', 'impact'], class: 'heavy', reception: 'visual' }),
  antlers: row({ patterns: ['strike', 'shove', 'snare', 'terrorize'], harm: ['impact'], class: 'heavy', bind: restrained, reception: 'visual' }),
  trunk: row({ patterns: ['lash', 'snare', 'shove', 'strike'], harm: ['impact'], class: 'heavy', bind: restrained }),
  tongue: row({ patterns: ['lash', 'snare', 'strike', 'drain'], harm: ['impact'], class: 'light', bind: restrained }),
  crest: row({ patterns: ['terrorize', 'ward'], harm: [], class: 'light', reception: 'visual' }),
  lure: row({ patterns: ['snare'], harm: [], class: 'light', bind: entranced }),
  claws: row({ patterns: ['strike', 'rake', 'crush', 'shove'], harm: ['cutting', 'piercing'], class: 'light' }),
  talons: row({ patterns: ['strike', 'rake', 'crush', 'snare'], harm: ['piercing', 'cutting'], class: 'light', bind: restrained }),
  fists: row({ patterns: ['strike', 'crush', 'shove'], harm: ['impact'], class: 'heavy' }),
  hooves: row({ patterns: ['strike', 'crush', 'shove'], harm: ['impact'], class: 'heavy' }),
  pincers: row({ patterns: ['strike', 'crush', 'snare', 'shove', 'ward'], harm: ['compression', 'cutting'], class: 'heavy', bind: restrained }),
  blades: row({ patterns: ['strike', 'rake', 'lash'], harm: ['cutting'], class: 'light' }),
  spurs: row({ patterns: ['strike', 'rake'], harm: ['piercing', 'cutting'], class: 'light' }),
  wings: row({ patterns: ['strike', 'lash', 'shove', 'ward'], harm: ['impact'], class: 'light' }),
  tail: row({ patterns: ['strike', 'lash', 'crush', 'shove', 'snare'], harm: ['impact'], class: 'heavy', bind: restrained }),
  stinger: row({ patterns: ['strike', 'drain', 'terrorize'], harm: ['piercing'], class: 'light', reception: 'none' }),
  rattle: row({ patterns: ['ward', 'terrorize'], harm: [], class: 'light', reception: 'auditory' }),
  coils: row({ patterns: ['crush', 'snare', 'shove', 'ward'], harm: ['compression'], class: 'heavy', bind: restrained }),
  hide: row({ patterns: ['strike', 'ward', 'shove'], harm: ['impact'], class: 'heavy' }),
  shell: row({ patterns: ['strike', 'ward', 'shove', 'crush'], harm: ['impact'], class: 'heavy' }),
  spines: row({ patterns: ['strike', 'rake', 'ward', 'hurl'], harm: ['piercing'], class: 'light' }),
  tendrils: row({ patterns: ['lash', 'snare', 'crush', 'drain', 'shove', 'strike'], harm: ['impact', 'compression'], class: 'heavy', bind: restrained }),
  roots: row({ patterns: ['snare', 'strike', 'shove', 'drain', 'ward'], harm: ['compression', 'impact'], class: 'heavy', bind: restrained }),
  pseudopods: row({ patterns: ['strike', 'crush', 'shove', 'snare', 'lash', 'drain'], harm: ['impact', 'compression'], class: 'heavy', bind: restrained }),
  spinnerets: row({ patterns: ['snare', 'ward'], harm: [], class: 'light', bind: restrained }),
  'light-organs': row({ patterns: ['ward', 'terrorize', 'mend'], harm: [], class: 'light', reception: 'visual' }),
  vents: row({ patterns: ['ward'], harm: [], class: 'light' }),
  core: row({ patterns: ['ward'], harm: [], class: 'light' }),
  antennae: row({ patterns: ['lash', 'snare'], harm: ['impact'], class: 'light', bind: restrained }),
  body: row({ patterns: ['strike', 'crush', 'shove', 'ward', 'terrorize'], harm: ['impact', 'compression'], class: 'heavy', reception: 'visual' }),
  mind: row({ patterns: ['snare', 'shove', 'crush', 'drain', 'ward', 'terrorize', 'mend'], harm: ['compression'], class: 'channel', bind: entranced, reception: 'none' }),
  gaze: row({ patterns: ['terrorize', 'snare'], harm: [], class: 'channel', bind: entranced, reception: 'visual' }),
  voice: row({ patterns: ['terrorize', 'ward'], harm: [], class: 'channel', reception: 'auditory' }),
  breath: row({ patterns: [], harm: [], class: 'channel' }),
  secretion: row({ patterns: ['snare', 'ward', 'mend'], harm: [], class: 'channel', bind: { status: 'restrained', removable: ['cleansing', 'freeing'] } }),
  swarm: row({ patterns: ['strike', 'drain', 'snare', 'rake', 'terrorize'], harm: ['piercing'], class: 'channel', bind: restrained, reception: 'visual' }),
  aura: row({ patterns: ['ward', 'terrorize', 'mend'], harm: [], class: 'channel', reception: 'none' }),
} satisfies Record<Instrument, InstrumentRow>);

/** Channels that reach by signal rather than by contact. Medium patterns fix their own delivery. */
const SIGNAL_CHANNELS: readonly Instrument[] = Object.freeze(['mind', 'gaze', 'voice', 'aura'] as const);

export interface MediumRow {
  readonly patterns: readonly Pattern[];
  readonly status?: { readonly status: StatusKey; readonly removable: readonly Removal[] };
  readonly bind?: { readonly status: StatusKey; readonly removable: readonly Removal[] };
  readonly ward?: StatusKey;
}
const medium = (value: MediumRow): MediumRow => Object.freeze({
  ...value, patterns: Object.freeze(value.patterns),
  ...(value.status ? { status: Object.freeze({ ...value.status, removable: Object.freeze(value.status.removable) }) } : {}),
  ...(value.bind ? { bind: Object.freeze({ ...value.bind, removable: Object.freeze(value.bind.removable) }) } : {}),
});

export const MEDIUM_ROWS: Readonly<Record<Element, MediumRow>> = Object.freeze({
  fire: medium({ patterns: ['strike', 'beam', 'spray', 'burst', 'cloud', 'lash'], status: { status: 'burning', removable: ['cooling', 'smothering'] } }),
  water: medium({ patterns: ['spray', 'burst', 'cloud', 'snare', 'shove', 'mend', 'lash'], status: { status: 'slowed', removable: ['warming'] }, bind: restrained }),
  dark: medium({ patterns: ['snare', 'crush', 'shove', 'drain', 'burst', 'ward', 'terrorize'], bind: { status: 'pinned', removable: ['freeing'] } }),
  light: medium({ patterns: ['beam', 'burst', 'ward', 'mend', 'terrorize', 'spray'], status: { status: 'blinded', removable: ['stabilizing'] } }),
  plant: medium({ patterns: ['snare', 'ward', 'mend', 'lash', 'cloud', 'spray'], status: { status: 'sedated', removable: ['stabilizing'] }, bind: restrained }),
  electric: medium({ patterns: ['beam', 'burst', 'lash', 'strike', 'snare', 'spray'], status: { status: 'stunned', removable: ['stabilizing'] }, bind: { status: 'paralyzed', removable: ['stabilizing'] } }),
  ghost: medium({ patterns: ['terrorize', 'drain', 'cloud', 'snare', 'ward'], status: { status: 'frightened', removable: ['stabilizing'] }, bind: restrained, ward: 'phased' }),
  rock: medium({ patterns: ['ward', 'crush', 'burst', 'shove', 'strike', 'hurl'], bind: { status: 'buried', removable: ['freeing'] }, ward: 'reinforced' }),
  chemical: medium({ patterns: ['spray', 'cloud', 'burst', 'drain', 'snare'], status: { status: 'corroding', removable: ['cleansing'] }, bind: { status: 'restrained', removable: ['cleansing', 'freeing'] } }),
  air: medium({ patterns: ['shove', 'burst', 'cloud', 'lash', 'ward'], status: { status: 'disoriented', removable: ['stabilizing'] } }),
  psychic: medium({ patterns: ['burst', 'snare', 'terrorize', 'ward', 'mend', 'drain', 'shove'], status: { status: 'disoriented', removable: ['stabilizing'] }, bind: entranced, ward: 'focused' }),
  ice: medium({ patterns: ['snare', 'ward', 'spray', 'burst', 'crush', 'mend', 'hurl'], status: { status: 'chilled', removable: ['warming'] }, bind: { status: 'frozen', removable: ['warming'] } }),
  metal: medium({ patterns: ['strike', 'ward', 'beam', 'crush', 'rake', 'hurl'], ward: 'reinforced' }),
  sand: medium({ patterns: ['cloud', 'spray', 'drain', 'snare', 'burst', 'rake'], status: { status: 'blinded', removable: ['cleansing'] }, bind: { status: 'buried', removable: ['freeing'] } }),
} satisfies Record<Element, MediumRow>);

/** Governing attribute times factor, rounded, floored at 1. Levers. */
export const OUTPUT_FACTORS = Object.freeze({
  physicalHarmHeavy: 0.8, physicalHarmLight: 0.85, lashScale: 0.8, displace: 0.8,
  elementalHarm: 0.85, burst: 0.7, channelHarm: 0.75, mend: 0.6, drainRestore: 0.4,
});

/** The pilot floor: a body this coarse is not worth generating four actions from. */
export const MIN_DISTINCT_ACTS = 8;

type Attribute = 'strength' | 'willpower' | 'vitality';
type Bands = Partial<Record<string, readonly [number, number]>>;
function bandFor(bands: Bands, attribute: Attribute, factor: number): [number, number] {
  const source = bands[attribute] ?? [40, 60];
  const scale = (value: number) => Math.max(1, Math.round(value * factor));
  return [scale(source[0]), scale(source[1])];
}

type Effect = Mechanism['effects'][number];
type Delivery = Mechanism['delivery'];

interface DeriveInput {
  element: Element;
  attributes: Bands;
  anatomy: readonly string[];
  communication: readonly string[];
  channels: readonly string[];
  conduits: Readonly<Partial<Record<string, string>>>;
  exclude: readonly string[];
  output: Readonly<Record<string, readonly [number, number]>>;
}

/** `instrument/pattern` with `*` permitted on either side. */
function excluded(patterns: readonly string[], instrument: string, pattern: Pattern): boolean {
  return patterns.some(value => {
    const [left, right] = value.split('/');
    return (left === '*' || left === instrument) && (right === '*' || right === pattern);
  });
}

const title = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const PATTERN_NOUNS: Readonly<Record<Pattern, string>> = Object.freeze({
  strike: 'Strike', crush: 'Crush', rake: 'Rake', lash: 'Lash', drain: 'Drain', shove: 'Shove',
  snare: 'Snare', hurl: 'Throw', terrorize: 'Threat', ward: 'Guard', mend: 'Mend',
  beam: 'Beam', burst: 'Burst', spray: 'Spray', cloud: 'Cloud',
});

/**
 * The signature guardrail, 2026-09-23 (a lever; contract "Signature guardrail").
 *
 * A species' signature is its defining act, so an ordinary act never outclasses it at
 * what it does. What an effect "does" is its kind: harm by mechanism (and by element when
 * the harm is elemental), displace by direction, restore as one kind. Each harm, displace
 * or restore effect of an action signature sets a cap for its kind; every derived ordinary
 * effect of the same kind is clamped so neither end of its band exceeds the cap's matching
 * end. An element-bearing signature's physical harm also caps elemental harm of its
 * element. Passive signatures set no caps.
 */
export type Band = readonly [number, number];
export interface SignatureCap { readonly kind: string; readonly band: Band; readonly signature: string }
interface KindedEffect { readonly type: string; readonly mechanism?: string; readonly direction?: string; readonly intensity?: number | readonly number[] }
interface SignatureSource {
  signature?: { readonly type: string; readonly key: string };
  actions?: readonly { readonly key: string; readonly element?: string; readonly effects: readonly KindedEffect[] }[];
}

/** The kind of one effect, or undefined when the guardrail does not compare it. */
export function effectKind(effect: KindedEffect, element: string | undefined): string | undefined {
  if (effect.type === 'harm') return effect.mechanism === 'elemental' ? `elemental ${element ?? 'unspecified'} harm` : `${effect.mechanism} harm`;
  if (effect.type === 'displace') return `displace ${effect.direction}`;
  if (effect.type === 'restore') return 'restore';
  return undefined;
}
const asBand = (value: number | readonly number[]): Band => typeof value === 'number' ? [value, value] : [value[0], value[1]];
const showBand = (band: Band) => `[${band[0]}, ${band[1]}]`;

/** The caps an action signature sets, by kind. Two effects of one kind cap at the wider. */
export function signatureCaps(species: SignatureSource): ReadonlyMap<string, SignatureCap> {
  const caps = new Map<string, SignatureCap>();
  if (species.signature?.type !== 'action') return caps;
  const signature = species.actions?.find(action => action.key === species.signature!.key);
  if (!signature) return caps;
  const cap = (kind: string, band: Band) => {
    const prior = caps.get(kind)?.band;
    caps.set(kind, { kind, signature: signature.key,
      band: prior ? [Math.max(prior[0], band[0]), Math.max(prior[1], band[1])] : band });
  };
  for (const effect of signature.effects) {
    const kind = effectKind(effect, signature.element);
    if (!kind || effect.intensity === undefined) continue;
    const band = asBand(effect.intensity);
    cap(kind, band);
    // An element-bearing signature's physical harm is also what that element does through
    // the same body (Terragoyle's thrown boulder is impact on a rock tail; the derived rock
    // hurl is elemental rock), so it caps elemental harm of its element too. The reverse
    // half (an elemental harm capping a physical mechanism) needs a signature carrying both
    // shapes; none does, so it is not implemented.
    if (effect.type === 'harm' && effect.mechanism !== 'elemental' && signature.element) cap(effectKind({ type: 'harm', mechanism: 'elemental' }, signature.element)!, band);
  }
  return caps;
}
/** Whether a band outclasses a cap at either end. */
function exceeds(band: Band, cap: Band): boolean { return band[0] > cap[0] || band[1] > cap[1]; }

export interface DerivedActs {
  readonly mechanisms: Mechanism[];
  /** Keys of derived mechanisms with at least one band lowered by the signature guardrail. */
  readonly clamped: readonly string[];
  /** Authored bands above a signature cap: an explicit `acts.output` or an authored mechanism. */
  readonly violations: readonly string[];
}

type DeriveSpecies = SignatureSource & {
  element: string; attributes: Bands;
  physiology: { anatomy: readonly string[]; communication?: readonly string[] };
  channels?: readonly string[];
  conduits?: Readonly<Partial<Record<string, string>>>;
  acts?: { exclude?: readonly string[]; output?: Readonly<Record<string, readonly [number, number]>> };
  mechanisms?: readonly { readonly key: string; readonly element?: string; readonly effects: readonly KindedEffect[] }[];
};

/** The derived mechanisms. Throws when an authored band breaks the signature guardrail. */
export function deriveMechanisms(species: DeriveSpecies): Mechanism[] {
  const result = deriveActs(species);
  if (result.violations.length) throw new Error(`signature guardrail: ${result.violations.join('; ')}`);
  return result.mechanisms;
}

/** Derivation with the guardrail's bookkeeping: what it clamped and what it refuses. */
export function deriveActs(species: DeriveSpecies): DerivedActs {
  const input: DeriveInput = {
    element: species.element as Element, attributes: species.attributes,
    anatomy: species.physiology.anatomy, communication: species.physiology.communication ?? [], channels: species.channels ?? [],
    conduits: species.conduits ?? {}, exclude: species.acts?.exclude ?? [], output: species.acts?.output ?? {},
  };
  const caps = signatureCaps(species);
  const mechanisms: Mechanism[] = [];
  const clamped: string[] = [];
  const violations: string[] = [];
  /** Clamp after overrides: an override may sit below a cap, never above it. */
  const guard = (built: Mechanism[], act: string) => {
    const override = input.output[act];
    for (const mechanism of built) {
      let lowered = false;
      for (const effect of mechanism.effects) {
        if (!Array.isArray(effect.intensity)) continue;
        const kind = effectKind(effect, mechanism.element);
        const cap = kind ? caps.get(kind) : undefined;
        if (!cap) continue;
        const band = effect.intensity as unknown as Band;
        if (!exceeds(band, cap.band)) continue;
        if (override) {
          const message = `acts.output ${act} ${showBand(override)} exceeds the signature ${cap.signature} ${showBand(cap.band)} on ${kind} (${mechanism.key})`;
          if (!violations.includes(message)) violations.push(message);
          continue;
        }
        effect.intensity = [Math.min(band[0], cap.band[0]), Math.min(band[1], cap.band[1])];
        lowered = true;
      }
      if (lowered) clamped.push(mechanism.key);
      mechanisms.push(mechanism);
    }
  };
  for (const instrument of [...input.anatomy, ...input.channels] as Instrument[]) {
    const row = INSTRUMENT_ROWS[instrument];
    for (const pattern of row.patterns) {
      if (MEDIUM_ONLY.includes(pattern)) continue;
      if (excluded(input.exclude, instrument, pattern)) continue;
      if (pattern === 'terrorize' && !canDisplay(input, instrument, row)) continue;
      guard(build(input, instrument, row, pattern, undefined), `${instrument}/${pattern}`);
    }
    const element = input.conduits[instrument] as Element | undefined;
    if (!element) continue;
    for (const pattern of MEDIUM_ROWS[element].patterns) {
      if (excluded(input.exclude, instrument, pattern)) continue;
      guard(build(input, instrument, row, pattern, element), `${instrument}/${pattern}`);
    }
  }
  // Authored mechanisms are checked, never clamped: the author wrote that number.
  for (const mechanism of species.mechanisms ?? []) {
    for (const effect of mechanism.effects) {
      const kind = effectKind(effect, mechanism.element);
      const cap = kind ? caps.get(kind) : undefined;
      if (!cap || effect.intensity === undefined) continue;
      const band = asBand(effect.intensity);
      if (exceeds(band, cap.band)) violations.push(`mechanism ${mechanism.key} ${showBand(band)} exceeds the signature ${cap.signature} ${showBand(cap.band)} on ${kind}`);
    }
  }
  return { mechanisms, clamped, violations };
}

/** A body part only threatens with what the species can signal: a visual display needs
 * display communication, a sound needs vocal. Channels carry their own predicates. */
function canDisplay(input: DeriveInput, instrument: Instrument, row: InstrumentRow): boolean {
  if ((CHANNEL_KEYS as readonly string[]).includes(instrument)) return true;
  if (row.reception === 'visual') return input.communication.includes('display');
  // A rattle signals by sound whether or not the species calls; vibration communication counts.
  if (row.reception === 'auditory') return input.communication.includes('vocal') || input.communication.includes('vibration');
  return true;
}

/** One pattern on one instrument, optionally through a medium. Strike, drain and hurl
 * make one mechanism per harm mechanism the row lists; mend makes a self form and an
 * other form. Everything else makes exactly one. */
function build(input: DeriveInput, instrument: Instrument, row: InstrumentRow, pattern: Pattern, element: Element | undefined): Mechanism[] {
  const mediumRow = element ? MEDIUM_ROWS[element] : undefined;
  const elemental = element !== undefined;
  const harms: (HarmMechanism | 'elemental' | undefined)[] = elemental && ['strike', 'drain', 'hurl'].includes(pattern)
    ? ['elemental']
    : ['strike', 'drain', 'hurl'].includes(pattern) ? (row.harm.length ? [...row.harm] : []) : [undefined];
  if (!harms.length) return [];

  const key = (suffix: string[]) => ['derived', instrument, pattern, ...suffix, ...(element ? [element] : [])].join('-');
  const bandOf = (attribute: Attribute, factor: number): [number, number] =>
    (input.output[`${instrument}/${pattern}`] as [number, number] | undefined) ?? bandFor(input.attributes, attribute, factor);
  const physicalFactor = row.class === 'channel' ? OUTPUT_FACTORS.channelHarm
    : row.class === 'heavy' ? OUTPUT_FACTORS.physicalHarmHeavy : OUTPUT_FACTORS.physicalHarmLight;
  const harmBand = (): [number, number] => elemental
    ? bandOf('willpower', pattern === 'burst' ? OUTPUT_FACTORS.burst : OUTPUT_FACTORS.elementalHarm)
    : bandOf(row.class === 'channel' ? 'willpower' : 'strength', physicalFactor);

  const contactRange = { approach: ['stationary', 'closing'] as const, range: ['contact'] as const };
  const signalDelivery = { approach: ['stationary'] as const, range: ['short', 'medium'] as const };
  const channelSignal = SIGNAL_CHANNELS.includes(instrument);
  const timing = (): Mechanism['timing'] => ({ preparation: ['immediate', 'brief'], recovery: ['repeatable', 'brief'] });
  const held = (): Mechanism['timing'] => ({ preparation: ['brief'], recovery: ['brief', 'prolonged'] });
  /** Acts a body can gather itself for: held pressure and projected energy may be charged. */
  const charged = (): Mechanism['timing'] => ({ preparation: ['brief', 'prolonged'], recovery: ['brief', 'prolonged'] });

  /** The same reach with a sweep area over it, for lash. */
  const sweeping = (): Delivery => {
    const area = { shape: ['sweep'] as const, extent: ['small', 'medium'] as const, anchor: ['self'] as const, persistence: 'resolved' as const };
    const base = reach();
    const [mode, value] = Object.entries(base)[0] as [keyof Delivery, NonNullable<Delivery[keyof Delivery]>];
    return { [mode]: { ...value, area: { shape: [...area.shape], extent: [...area.extent], anchor: [...area.anchor], persistence: area.persistence } } } as Delivery;
  };
  /** The physical contact mode, or the channel's own reach when it is a signal channel. */
  const reach = (): Delivery => channelSignal
    ? { signal: { approach: [...signalDelivery.approach], range: [...signalDelivery.range], ...(row.reception && row.reception !== 'none' ? { reception: row.reception } : {}) } }
    : { contact: { approach: [...contactRange.approach], range: [...contactRange.range] } };

  const name = (words: string[]) => words.join(' ');
  const partWord = title(instrument);
  const mediumWord = element ? title(element) : undefined;

  const make = (parts: {
    key: string; name: string; description: string; targeting: Mechanism['targeting'];
    timing: Mechanism['timing']; delivery: Delivery; effects: Effect[];
  }): Mechanism => ({
    key: parts.key, name: parts.name, description: parts.description, instrument,
    ...(element ? { element } : {}), targeting: parts.targeting,
    activation: { continuity: ['discrete'] }, timing: parts.timing, delivery: parts.delivery, effects: parts.effects as Mechanism['effects'],
  });

  const harmEffect = (mechanism: HarmMechanism | 'elemental', recipient: Effect['recipient'] = 'target', key = 'outcome'): Effect => ({
    key, type: 'harm', recipient, onset: 'instant', persistence: 'resolved',
    likelihood: ['consistent'], mechanism, intensity: harmBand(),
  });
  const mediumStatus = (recipient: Effect['recipient']): Effect | undefined => mediumRow?.status && {
    key: 'condition', type: 'status', status: mediumRow.status.status, recipient, onset: 'instant',
    persistence: 'lingering', duration: 'brief', likelihood: ['likely', 'occasional'], removable: [...mediumRow.status.removable] as Effect['removable'],
  };

  switch (pattern) {
    case 'strike': return harms.map(mechanism => {
      const suffix = elemental ? [] : [mechanism as string];
      const extra = mediumStatus('target');
      return make({
        key: key(suffix), name: name([mediumWord ?? partWord, PATTERN_NOUNS.strike].filter(Boolean) as string[]),
        description: `${title(instrument)} deliver a ${elemental ? `${element} ` : `${mechanism} `}blow at close contact.`,
        targeting: ['other'], timing: timing(), delivery: reach(),
        effects: [harmEffect(mechanism!), ...(extra ? [extra] : [])],
      });
    });
    case 'crush': {
      const extra = mediumStatus('target');
      return [make({
        key: key([]), name: name([mediumWord ?? partWord, PATTERN_NOUNS.crush]),
        description: `${title(instrument)} apply held pressure to a held target.`,
        targeting: ['other'], timing: charged(), delivery: reach(),
        effects: [harmEffect(elemental ? 'elemental' : 'compression'), ...(extra ? [extra] : [])],
      })];
    }
    case 'rake': {
      const extra = mediumStatus('target');
      return [make({
        key: key([]), name: name([mediumWord ?? partWord, PATTERN_NOUNS.rake]),
        description: `${title(instrument)} drag across the target's surface.`,
        targeting: ['other'], timing: timing(), delivery: reach(),
        effects: [harmEffect(elemental ? 'elemental' : 'cutting'), ...(extra ? [extra] : [])],
      })];
    }
    case 'lash': {
      const mechanism: HarmMechanism = instrument === 'blades' ? 'cutting' : 'impact';
      const factor = elemental ? OUTPUT_FACTORS.elementalHarm : physicalFactor * OUTPUT_FACTORS.lashScale;
      const extra = mediumStatus('area');
      return [make({
        key: key([]), name: name([mediumWord ?? partWord, PATTERN_NOUNS.lash]),
        description: `${title(instrument)} sweep through everything within reach.`,
        targeting: ['other'], timing: timing(),
        delivery: sweeping(),
        effects: [{ key: 'outcome', type: 'harm', recipient: 'area', onset: 'instant', persistence: 'resolved',
          likelihood: ['consistent'], mechanism: elemental ? 'elemental' : mechanism,
          intensity: (input.output[`${instrument}/lash`] as [number, number] | undefined) ?? bandFor(input.attributes, elemental ? 'willpower' : 'strength', factor) },
          ...(extra ? [extra] : [])],
      })];
    }
    case 'drain': return harms.map(mechanism => make({
      key: key(elemental ? [] : [mechanism as string]), name: name([mediumWord ?? partWord, PATTERN_NOUNS.drain]),
      description: `${title(instrument)} take from the target and return the gain to the body.`,
      targeting: ['other'], timing: timing(), delivery: reach(),
      effects: [harmEffect(mechanism!, 'target', 'toll'),
        { key: 'gain', type: 'restore', recipient: 'self', onset: 'instant', persistence: 'resolved',
          likelihood: ['consistent'], intensity: bandOf('vitality', OUTPUT_FACTORS.drainRestore), requires: 'toll' }],
    }));
    case 'shove': return [make({
      key: key([]), name: name([mediumWord ?? partWord, PATTERN_NOUNS.shove]),
      description: `${title(instrument)} drive the target back.`,
      targeting: ['other'], timing: timing(), delivery: reach(),
      effects: [{ key: 'force', type: 'displace', direction: 'away', recipient: 'target', onset: 'instant',
        persistence: 'resolved', likelihood: ['consistent'], intensity: bandOf(elemental || row.class === 'channel' ? 'willpower' : 'strength', OUTPUT_FACTORS.displace) }],
    })];
    case 'snare': {
      const bind = mediumRow?.bind ?? row.bind;
      if (!bind) return [];
      const projectile = instrument === 'spinnerets';
      return [make({
        key: key([]), name: name([mediumWord ?? partWord, PATTERN_NOUNS.snare]),
        description: `${title(instrument)} catch and hold the target in place.`,
        targeting: ['other'], timing: timing(),
        delivery: projectile ? { projectile: { approach: ['stationary'], range: ['short', 'medium'] } } : reach(),
        effects: [{ key: 'hold', type: 'status', status: bind.status, recipient: 'target', onset: 'instant',
          persistence: 'lingering', duration: 'brief', likelihood: ['likely', 'occasional'], removable: [...bind.removable] as Effect['removable'] }],
      })];
    }
    case 'hurl': return harms.map(mechanism => make({
      key: key(elemental ? [] : [mechanism as string]), name: name([mediumWord ?? partWord, PATTERN_NOUNS.hurl]),
      description: `${title(instrument)} launch at a target beyond reach.`,
      targeting: ['other'], timing: timing(),
      delivery: { projectile: { approach: ['stationary'], range: ['short', 'medium'] } },
      effects: [harmEffect(mechanism!)],
    }));
    case 'terrorize': {
      const reception = row.reception && row.reception !== 'none' ? row.reception : undefined;
      return [make({
        key: key([]), name: name([mediumWord ?? partWord, PATTERN_NOUNS.terrorize]),
        description: `${title(instrument)} present a display the target reads as a threat.`,
        targeting: ['other'], timing: timing(),
        delivery: { signal: { approach: ['stationary'], range: ['short', 'medium'], ...(reception ? { reception } : {}) } },
        effects: [{ key: 'fear', type: 'status', status: 'frightened', recipient: 'target', onset: 'instant',
          persistence: 'lingering', duration: 'brief', likelihood: ['likely', 'occasional'], removable: ['stabilizing'] }],
      })];
    }
    case 'ward': return [make({
      key: key([]), name: name([mediumWord ?? partWord, PATTERN_NOUNS.ward]),
      description: `${title(instrument)} close into a guard that intercepts what follows.`,
      targeting: ['self'], timing: held(), delivery: { self: { approach: ['stationary'] } },
      effects: [{ key: 'guard', type: 'status', status: mediumRow?.ward ?? 'shielded', recipient: 'self', onset: 'instant',
        persistence: 'lingering', duration: 'brief', likelihood: ['consistent'], removable: ['disrupting'] }],
    })];
    case 'mend': {
      const band = bandOf('vitality', OUTPUT_FACTORS.mend);
      const other: Delivery = SIGNAL_CHANNELS.includes(instrument)
        ? { signal: { approach: ['stationary'], range: ['short'], ...(row.reception && row.reception !== 'none' ? { reception: row.reception } : {}) } }
        : { contact: { approach: ['stationary'], range: ['contact'] } };
      const repair = (recipient: Effect['recipient']): Effect => ({ key: 'repair', type: 'restore', recipient,
        onset: 'instant', persistence: 'resolved', likelihood: ['consistent'], intensity: band });
      return [
        make({ key: key(['self']), name: name([mediumWord ?? partWord, PATTERN_NOUNS.mend]),
          description: `${title(instrument)} turn inward and repair the body's own tissue.`,
          targeting: ['self'], timing: held(), delivery: { self: { approach: ['stationary'] } }, effects: [repair('self')] }),
        make({ key: key(['other']), name: name([mediumWord ?? partWord, PATTERN_NOUNS.mend]),
          description: `${title(instrument)} carry repair to another body.`,
          targeting: ['other'], timing: held(), delivery: other, effects: [repair('target')] }),
      ];
    }
    case 'beam': return [make({
      key: key([]), name: name([mediumWord!, PATTERN_NOUNS.beam]),
      description: `A sustained ${element} stream runs from the ${instrument.replace(/-/g, ' ')} to the target.`,
      targeting: ['other'], timing: charged(),
      delivery: { stream: { approach: ['stationary'], range: ['short', 'medium', 'long'] } },
      effects: [harmEffect('elemental')],
    })];
    case 'burst': return [make({
      key: key([]), name: name([mediumWord!, PATTERN_NOUNS.burst]),
      description: `${title(element!)} releases outward from the ${instrument.replace(/-/g, ' ')} in every direction.`,
      targeting: ['other'], timing: { preparation: ['immediate', 'brief', 'prolonged'], recovery: ['brief', 'prolonged'] },
      delivery: { pulse: { approach: ['stationary'], range: ['short', 'medium'],
        area: { shape: ['radial'], extent: ['small', 'medium'], anchor: ['self'], persistence: 'resolved' } } },
      effects: [harmEffect('elemental', 'area')],
    })];
    case 'spray': {
      const extra = mediumStatus('target');
      return [make({
        key: key([]), name: name([mediumWord!, PATTERN_NOUNS.spray]),
        description: `${title(element!)} throws from the ${instrument.replace(/-/g, ' ')} across the gap.`,
        targeting: ['other'], timing: timing(),
        delivery: { projectile: { approach: ['stationary'], range: ['short', 'medium'] } },
        effects: [harmEffect('elemental'), ...(extra ? [extra] : [])],
      })];
    }
    case 'cloud': {
      if (!mediumRow?.status) return [];
      return [make({
        key: key([]), name: name([mediumWord!, PATTERN_NOUNS.cloud]),
        description: `${title(element!)} settles over a patch of ground and stays there.`,
        targeting: ['other'], timing: timing(),
        delivery: { field: { approach: ['stationary'], range: ['short', 'medium'],
          area: { shape: ['radial'], extent: ['small', 'medium'], anchor: ['location'], persistence: 'lingering', duration: 'prolonged' } } },
        effects: [{ key: 'condition', type: 'status', status: mediumRow.status.status, recipient: 'area', onset: 'instant',
          persistence: 'lingering', duration: 'brief', likelihood: ['likely', 'occasional'], removable: [...mediumRow.status.removable] as Effect['removable'] }],
      })];
    }
  }
}

export { ANATOMY_KEYS, CHANNEL_KEYS, ELEMENT_KEYS };
