/**
 * The effect grid: every action shape the ability schema allows, as resolved actions.
 *
 * Layer one of the creature sample set (docs/design/creature-sample-set.md). Each entry is
 * schema-valid under `ActionSchema` but not necessarily plausible for any body: the grid
 * answers "does the game read this shape, and do its numbers hold", never "does a creature
 * like this exist". It is built by varying one axis at a time from a standard base
 * (consistent, immediate, repeatable, intensity 50, target recipient, contact delivery)
 * plus a small set of paired shapes games care about, not by a full cross product.
 *
 * Schema rules that shaped what is skipped (ability.ts):
 * - Only status effects may linger or be sustained; direct work (harm, restore, protect,
 *   displace, remove) resolves, or is sustained by an ongoing activation.
 * - Sustained status requires `bound`; source-bound needs ongoing activation, area-bound
 *   needs an area recipient and a persistent (not resolved) area.
 * - `protected` requires a protection descriptor, `stimulated` requires a function, and
 *   neither payload may appear on another status.
 * - Elemental harm requires the ability element; the element is meaningless otherwise
 *   here, so it is set only for elemental harm.
 * - Line, cone and sweep areas anchor at self and need other-only targeting.
 * - A dependent (`requires`) effect shares its prerequisite's recipient or affects self;
 *   the prerequisite cannot itself depend on anything.
 * - Actions carry no trigger; passives are not part of this grid.
 */
import type { Ability } from '@xalians/content/creature';
import { ElementKeySchema, Status } from '@xalians/content/creature';

type Effect = Ability['effects'][number];
type Recipient = Effect['recipient'];
type StatusKey = (typeof Status.options)[number];
export interface GridAction { label: string; action: Ability }

export const INTENSITY_POINTS = [1, 5, 10, 18, 25, 50, 75, 100, 150] as const;
const ELEMENTS = ElementKeySchema.options;
const PHYSICAL = ['impact', 'cutting', 'piercing', 'compression'] as const;
const REMOVALS = ['cooling', 'smothering', 'warming', 'cleansing', 'detoxifying', 'freeing', 'stabilizing', 'disrupting'] as const;
const FUNCTIONS = ['reactions', 'mobility', 'force', 'perception', 'composure', 'recovery'] as const;
const LIKELIHOODS = ['consistent', 'likely', 'occasional'] as const;
const PREPARATIONS = ['immediate', 'brief', 'prolonged'] as const;
const RECOVERIES = ['repeatable', 'brief', 'prolonged'] as const;
const STATUSES = Status.options;

/** How a status is usually removed. A grid choice, not a ruling: any nonempty set is legal. */
const REMOVED_BY: Record<StatusKey, readonly (typeof REMOVALS)[number][]> = {
  burning: ['cooling', 'smothering'], overheated: ['cooling'], chilled: ['warming'], corroding: ['cleansing'],
  poisoned: ['detoxifying'], slowed: ['warming'], restrained: ['freeing'], pinned: ['freeing'], frozen: ['warming'],
  buried: ['freeing'], blinded: ['cleansing'], deafened: ['stabilizing'], disoriented: ['stabilizing'],
  frightened: ['stabilizing'], entranced: ['disrupting'], sedated: ['stabilizing'], stunned: ['stabilizing'],
  paralyzed: ['stabilizing'], mending: ['disrupting'], shielded: ['disrupting'], reinforced: ['disrupting'],
  protected: ['disrupting'], stimulated: ['disrupting'], focused: ['disrupting'], concealed: ['cleansing'],
  revealed: ['cleansing'], marked: ['cleansing'], phased: ['disrupting'], dispersed: ['disrupting'],
};

const slug = (label: string) => label.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/^(\d)/, 'g-$1');

/** Effect builders. Every default is the standard base; `over` changes one thing. */
const base = { key: 'outcome', recipient: 'target', onset: 'instant', persistence: 'resolved', likelihood: 'consistent' } as const;
const harm = (mechanism: (typeof PHYSICAL)[number] | 'elemental', intensity = 50, over: Partial<Effect> = {}) =>
  ({ ...base, type: 'harm', mechanism, intensity, ...over }) as Effect;
const restore = (intensity = 50, over: Partial<Effect> = {}) => ({ ...base, type: 'restore', intensity, ...over }) as Effect;
const protect = (intensity = 50, over: Partial<Effect> = {}) => ({ ...base, type: 'protect', intensity, ...over }) as Effect;
const displace = (direction: 'toward' | 'away', intensity = 50, over: Partial<Effect> = {}) =>
  ({ ...base, type: 'displace', direction, intensity, ...over }) as Effect;
const remove = (methods: readonly (typeof REMOVALS)[number][], over: Partial<Effect> = {}) =>
  ({ ...base, type: 'remove', methods: [...methods], ...over }) as Effect;
const status = (name: StatusKey, over: Record<string, unknown> = {}) => ({
  ...base, key: 'condition', type: 'status', status: name, persistence: 'lingering', duration: 'brief',
  removable: [...REMOVED_BY[name]],
  ...(name === 'stimulated' ? { function: 'force' } : {}),
  ...(name === 'protected' ? { protection: { type: 'harm', mechanism: 'impact', degree: 'resistant' } } : {}),
  ...over,
}) as unknown as Effect;

const grid: GridAction[] = [];
const seen = new Set<string>();

interface Shape {
  /** Delivery for a directed action; defaults to contact at contact range. */
  mode?: Ability['delivery']['mode']; range?: Ability['spatial']['range']; reception?: 'visual' | 'auditory';
  approach?: 'stationary' | 'closing'; targeting?: Ability['targeting'];
  preparation?: NonNullable<Ability['timing']>['preparation']; recovery?: NonNullable<Ability['timing']>['recovery'];
  continuity?: 'discrete' | 'ongoing';
  element?: (typeof ELEMENTS)[number];
  area?: NonNullable<Ability['spatial']['area']>;
  instrument?: Ability['instrument'];
}
const AREA = { shape: 'radial', extent: 'medium', anchor: 'self', persistence: 'resolved' } as const;

/** Add one grid action. The label is its identity; geometry follows from the recipients. */
function add(label: string, effects: Effect[], shape: Shape = {}): void {
  if (seen.has(label)) throw new Error(`duplicate grid label ${label}`);
  seen.add(label);
  const usesArea = effects.some(e => e.recipient === 'area');
  const selfOnly = !usesArea && effects.every(e => e.recipient === 'self') && !shape.targeting?.includes('other');
  const directed = !selfOnly;
  const mode = selfOnly ? 'self' : shape.mode ?? (usesArea ? 'pulse' : 'contact');
  const range = directed ? shape.range ?? (mode === 'contact' ? 'contact' : 'short') : undefined;
  const area = usesArea ? shape.area ?? AREA : undefined;
  const elemental = effects.some(e => e.type === 'harm' && e.mechanism === 'elemental');
  const element = shape.element ?? (elemental ? 'fire' : undefined);
  const action: Ability = {
    key: slug(label), name: `Grid ${label}`, description: `Effect grid shape ${label}.`,
    instrument: shape.instrument ?? 'body',
    ...(element ? { element } : {}),
    activation: { continuity: shape.continuity ?? 'discrete' },
    timing: { preparation: shape.preparation ?? 'immediate', recovery: shape.recovery ?? 'repeatable' },
    delivery: { mode, approach: shape.approach ?? 'stationary', ...(shape.reception ? { reception: shape.reception } : {}) },
    targeting: selfOnly ? ['self'] : shape.targeting ?? ['other'],
    spatial: { ...(range ? { range } : {}), ...(area ? { area } : {}) },
    effects,
  } as Ability;
  // Drop keys set to undefined so the stored action is plain data.
  grid.push({ label, action: JSON.parse(JSON.stringify(action)) as Ability });
}

function build(): void {
  // Harm, physical: each mechanism at each intensity point.
  for (const m of PHYSICAL) for (const p of INTENSITY_POINTS) add(`harm/${m}/target/i${p}`, [harm(m, p)]);
  // Harm, elemental: every element at the standard point, and fire across the whole ladder.
  for (const el of ELEMENTS) add(`harm/elemental/${el}/target/i50`, [harm('elemental')], { element: el });
  for (const p of INTENSITY_POINTS) if (p !== 50) add(`harm/elemental/fire/target/i${p}`, [harm('elemental', p)]);
  // Harm on self and on an area (self-harm has no directed reach).
  add('harm/impact/self/i50', [harm('impact', 50, { recipient: 'self' })]);
  add('harm/elemental/fire/self/i50', [harm('elemental', 50, { recipient: 'self' })]);
  for (const m of PHYSICAL) add(`harm/${m}/area/i50`, [harm(m, 50, { recipient: 'area' })]);
  for (const el of ELEMENTS) add(`harm/elemental/${el}/area/i50`, [harm('elemental', 50, { recipient: 'area' })], { element: el });
  // Area plus elemental harm at each intensity point, for two elements.
  for (const el of ['fire', 'water'] as const) for (const p of INTENSITY_POINTS) {
    if (p === 50) continue;
    add(`harm/elemental/${el}/area/i${p}`, [harm('elemental', p, { recipient: 'area' })], { element: el });
  }
  // Area geometry with fire harm: radial at every anchor and extent, directed shapes at self.
  for (const extent of ['small', 'medium', 'large'] as const) {
    for (const anchor of ['self', 'target', 'location'] as const) {
      add(`area/radial/${extent}/${anchor}/harm-fire`, [harm('elemental', 50, { recipient: 'area' })], { area: { ...AREA, extent, anchor } });
    }
    for (const shape of ['line', 'cone', 'sweep'] as const) {
      add(`area/${shape}/${extent}/self/harm-fire`, [harm('elemental', 50, { recipient: 'area' })], { area: { ...AREA, shape, extent }, mode: shape === 'sweep' ? 'contact' : 'stream', range: shape === 'sweep' ? 'contact' : 'medium' });
    }
  }
  // Area lifetimes: lingering brief and prolonged, and a sustained area held by ongoing activation.
  for (const duration of ['brief', 'prolonged'] as const) {
    add(`area/radial/lingering-${duration}/status-burning`, [status('burning', { recipient: 'area' })], { mode: 'field', area: { ...AREA, anchor: 'location', persistence: 'lingering', duration } });
  }
  add('area/radial/sustained/harm-fire', [harm('elemental', 50, { recipient: 'area', persistence: 'sustained', onset: 'gradual' })],
    { mode: 'field', continuity: 'ongoing', area: { ...AREA, anchor: 'location', persistence: 'sustained' } });

  // Timing: every preparation and recovery pair on the standard harm.
  for (const prep of PREPARATIONS) for (const rec of RECOVERIES) add(`timing/${prep}-${rec}/harm-impact`, [harm('impact')], { preparation: prep, recovery: rec });
  // Likelihood on harm, status and restore.
  for (const l of LIKELIHOODS) {
    add(`likelihood/${l}/harm-impact`, [harm('impact', 50, { likelihood: l })]);
    add(`likelihood/${l}/status-burning`, [status('burning', { likelihood: l })], { element: 'fire' });
    add(`likelihood/${l}/restore`, [restore(50, { likelihood: l })]);
  }
  // Onset.
  add('onset/gradual/restore', [restore(50, { onset: 'gradual' })]);
  add('onset/gradual/harm-impact', [harm('impact', 50, { onset: 'gradual' })]);
  add('onset/gradual/status-poisoned', [status('poisoned', { onset: 'gradual' })]);

  // Delivery modes, ranges, approach and reception on the standard harm.
  add('delivery/contact/contact-closing', [harm('impact')], { approach: 'closing' });
  for (const range of ['short', 'medium', 'long'] as const) {
    add(`delivery/projectile/${range}`, [harm('impact')], { mode: 'projectile', range });
    add(`delivery/stream/${range}`, [harm('impact')], { mode: 'stream', range });
  }
  for (const range of ['short', 'medium'] as const) {
    add(`delivery/pulse/${range}`, [harm('impact')], { mode: 'pulse', range });
    add(`delivery/field/${range}`, [harm('impact')], { mode: 'field', range });
    add(`delivery/signal/${range}/none`, [harm('impact')], { mode: 'signal', range });
  }
  add('delivery/signal/short/visual', [status('frightened')], { mode: 'signal', range: 'short', reception: 'visual' });
  add('delivery/signal/short/auditory', [status('frightened')], { mode: 'signal', range: 'short', reception: 'auditory' });
  add('delivery/self/restore', [restore(50, { recipient: 'self' })]);

  // Restore, protect: each recipient across the ladder; ally-aimed and either-aimed targeting.
  for (const [type, make] of [['restore', restore], ['protect', protect]] as const) {
    for (const p of INTENSITY_POINTS) {
      add(`${type}/target/i${p}`, [make(p)]);
      add(`${type}/self/i${p}`, [make(p, { recipient: 'self' })]);
    }
    add(`${type}/area/i50`, [make(50, { recipient: 'area' })]);
    add(`${type}/area/i100`, [make(100, { recipient: 'area' })]);
    add(`${type}/ally/signal-short/i50`, [make(50)], { mode: 'signal', range: 'short', targeting: ['other'] });
    add(`${type}/either/contact/i50`, [make(50)], { targeting: ['self', 'other'] });
    add(`${type}/either/projectile-medium/i50`, [make(50)], { mode: 'projectile', range: 'medium', targeting: ['self', 'other'] });
    add(`${type}/self/sustained/i50`, [make(50, { recipient: 'self', persistence: 'sustained', onset: 'gradual' })], { continuity: 'ongoing' });
    add(`${type}/target/sustained/i50`, [make(50, { persistence: 'sustained', onset: 'gradual' })], { continuity: 'ongoing' });
  }
  for (const [name, timing] of [['brief-brief', { preparation: 'brief', recovery: 'brief' }], ['prolonged-prolonged', { preparation: 'prolonged', recovery: 'prolonged' }]] as const) {
    add(`restore/target/${name}`, [restore()], timing);
  }

  // Displace: both directions on every recipient, at low, standard and high force.
  for (const direction of ['away', 'toward'] as const) {
    for (const p of [25, 50, 100]) {
      add(`displace/${direction}/target/i${p}`, [displace(direction, p)]);
      add(`displace/${direction}/area/i${p}`, [displace(direction, p, { recipient: 'area' })]);
    }
    add(`displace/${direction}/self/i50`, [displace(direction, 50, { recipient: 'self' })]);
    add(`displace/${direction}/target/i150`, [displace(direction, 150)]);
    add(`displace/${direction}/target/i1`, [displace(direction, 1)]);
  }

  // Status: every status on a target (default intensity), on self, and across an area.
  for (const s of STATUSES) {
    add(`status/${s}/target`, [status(s)]);
    add(`status/${s}/self`, [status(s, { recipient: 'self' })]);
    add(`status/${s}/area`, [status(s, { recipient: 'area' })], { mode: 'field', area: { ...AREA, anchor: 'location', persistence: 'lingering', duration: 'prolonged' } });
  }
  // Status intensity overrides across the ladder, and durations.
  for (const p of INTENSITY_POINTS) add(`status/slowed/target/i${p}`, [status('slowed', { intensity: p })]);
  add('status/burning/target/prolonged', [status('burning', { duration: 'prolonged' })], { element: 'fire' });
  add('status/burning/target/gradual', [status('burning', { onset: 'gradual' })], { element: 'fire' });
  add('status/stunned/target/range-band', [status('stunned', { intensity: 60 })]);
  // Stimulated: every function, on target, self and allies.
  for (const f of FUNCTIONS) {
    add(`status/stimulated/${f}/target/ally`, [status('stimulated', { function: f })], { mode: 'signal', range: 'short', targeting: ['other'] });
    add(`status/stimulated/${f}/self/i75`, [status('stimulated', { function: f, recipient: 'self', intensity: 75 })]);
  }
  add('status/stimulated/force/either', [status('stimulated', { function: 'force' })], { targeting: ['self', 'other'] });
  // Protected: every protection descriptor and degree.
  for (const degree of ['resistant', 'immune'] as const) {
    for (const m of PHYSICAL) add(`status/protected/harm-${m}/${degree}`, [status('protected', { recipient: 'self', protection: { type: 'harm', mechanism: m, degree } })]);
    for (const el of ELEMENTS) add(`status/protected/harm-elemental-${el}/${degree}`, [status('protected', { recipient: 'self', protection: { type: 'harm', mechanism: 'elemental', element: el, degree } })]);
    for (const s of ['burning', 'frozen', 'paralyzed', 'restrained', 'poisoned'] as const) add(`status/protected/status-${s}/${degree}`, [status('protected', { recipient: 'self', protection: { type: 'status', status: s, degree } })]);
    add(`status/protected/displace/${degree}`, [status('protected', { recipient: 'self', protection: { type: 'displace', degree } })]);
  }
  add('status/protected/harm-impact/resistant/ally', [status('protected')], { mode: 'signal', range: 'short', targeting: ['other'] });
  // Sustained statuses: source-bound (ongoing action), and area-bound (persistent area).
  for (const s of ['restrained', 'pinned', 'slowed', 'entranced', 'stimulated', 'shielded', 'mending', 'focused', 'concealed', 'phased'] as const) {
    const self = ['stimulated', 'shielded', 'mending', 'focused', 'concealed', 'phased'].includes(s);
    add(`status/${s}/sustained-source/${self ? 'self' : 'target'}`,
      [status(s, { persistence: 'sustained', bound: 'source', duration: undefined, recipient: self ? 'self' : 'target' })], { continuity: 'ongoing' });
  }
  for (const s of ['burning', 'poisoned', 'chilled', 'corroding', 'blinded', 'slowed'] as const) {
    add(`status/${s}/sustained-area`,
      [status(s, { recipient: 'area', persistence: 'sustained', bound: 'area', duration: undefined })],
      { mode: 'field', continuity: 'ongoing', area: { ...AREA, anchor: 'location', persistence: 'lingering', duration: 'prolonged' } });
  }
  // Removal methods on a lingering status.
  for (const r of REMOVALS) add(`status/burning/removable-${r}`, [status('burning', { removable: [r] })], { element: 'fire' });
  add('status/burning/removable-multiple', [status('burning', { removable: ['cooling', 'smothering', 'disrupting'] })], { element: 'fire' });

  // Remove: each method on target, self and area; multi-method sets.
  for (const r of REMOVALS) {
    add(`remove/${r}/target`, [remove([r])]);
    add(`remove/${r}/self`, [remove([r], { recipient: 'self' })]);
    add(`remove/${r}/area`, [remove([r], { recipient: 'area' })]);
  }
  add('remove/cooling-smothering/target', [remove(['cooling', 'smothering'])]);
  add('remove/all/target', [remove(REMOVALS)]);

  // Paired shapes. Drain is harm plus a dependent self restore, across mechanisms and points.
  for (const m of [...PHYSICAL, 'elemental'] as const) {
    add(`drain/${m}/i50`, [harm(m, 50, { key: 'toll' }), restore(20, { key: 'gain', recipient: 'self', requires: 'toll' })]);
  }
  for (const p of [25, 100, 150]) {
    add(`drain/elemental/dark/i${p}`, [harm('elemental', p, { key: 'toll' }), restore(Math.round(p * 0.4), { key: 'gain', recipient: 'self', requires: 'toll' })], { element: 'dark' });
  }
  add('drain/area/impact/i50', [harm('impact', 50, { key: 'toll', recipient: 'area' }), restore(20, { key: 'gain', recipient: 'self', requires: 'toll' })]);
  add('drain/harm-and-restore-target', [harm('impact', 50, { key: 'toll' }), restore(20, { key: 'gain', requires: 'toll' })]);
  // Harm with a status rider, by mechanism and by element.
  for (const [m, s, el] of [
    ['impact', 'slowed'], ['cutting', 'poisoned'], ['piercing', 'poisoned'], ['compression', 'restrained'],
    ['elemental', 'burning', 'fire'], ['elemental', 'chilled', 'ice'], ['elemental', 'frozen', 'ice'], ['elemental', 'stunned', 'electric'],
    ['elemental', 'corroding', 'chemical'], ['elemental', 'blinded', 'light'], ['elemental', 'frightened', 'ghost'], ['elemental', 'buried', 'sand'],
  ] as const) {
    add(`rider/${m}${el ? `-${el}` : ''}/${s}`, [harm(m, 50), status(s as StatusKey, { likelihood: 'likely' })], el ? { element: el } : {});
  }
  add('rider/area/fire/burning-area', [harm('elemental', 50, { recipient: 'area' }), status('burning', { recipient: 'area', likelihood: 'likely' })], { element: 'fire' });
  add('rider/impact/dependent-status', [harm('impact', 50, { key: 'blow' }), status('stunned', { likelihood: 'occasional', requires: 'blow' })]);
  add('rider/impact/displace-away', [harm('impact', 50), displace('away', 50, { key: 'shove' })]);
  add('rider/elemental/water/displace-toward', [harm('elemental', 50), displace('toward', 50, { key: 'drag' })], { element: 'water' });
  // Support pairs.
  add('pair/restore/plus-remove-cleansing', [restore(50), remove(['cleansing'], { key: 'purge' })]);
  add('pair/restore/plus-stimulated-recovery', [restore(50), status('stimulated', { function: 'recovery', key: 'lift' })]);
  add('pair/restore/target-and-self', [restore(50), restore(30, { key: 'echo', recipient: 'self' })]);
  add('pair/protect/plus-shielded', [protect(50), status('shielded', { key: 'barrier' })]);
  add('pair/protect/ally-and-self', [protect(50), protect(30, { key: 'echo', recipient: 'self' })]);
  add('pair/stimulated/ally-and-self', [status('stimulated', { function: 'mobility' }), status('stimulated', { function: 'mobility', key: 'echo', recipient: 'self' })]);
  add('pair/shielded/self-and-ally', [status('shielded'), status('shielded', { key: 'echo', recipient: 'self' })]);
  add('pair/status/slowed-and-blinded', [status('slowed'), status('blinded', { key: 'second' })]);
  add('pair/harm/area-and-self-cost', [harm('elemental', 75, { recipient: 'area' }), harm('impact', 20, { key: 'recoil', recipient: 'self' })], { element: 'fire' });
  add('pair/harm/two-mechanisms', [harm('impact', 50), harm('piercing', 30, { key: 'second' })]);
  add('pair/displace/toward-plus-harm-area', [displace('toward', 50, { recipient: 'area' }), harm('impact', 30, { key: 'crush', recipient: 'area' })]);
  add('pair/status/restrained-plus-harm-compression', [status('restrained'), harm('compression', 40, { key: 'squeeze' })]);
}

let cached: readonly GridAction[] | undefined;
/** Every grid action with its shape label, in a fixed order. Cached; treat as read-only. */
export function effectGrid(): readonly GridAction[] {
  if (!cached) { grid.length = 0; seen.clear(); build(); cached = Object.freeze([...grid]); }
  return cached;
}
