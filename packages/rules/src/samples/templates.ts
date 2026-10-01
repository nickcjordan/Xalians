/**
 * Sample species templates: layer two of the creature sample set.
 *
 * Non-canonical fixtures authored as ordinary species templates and compiled by the real
 * pipeline (`compileSpecies`, derived acts, `createCreatureCatalog`). They skip lore review,
 * fact-checking, ratification and bundling, and are never part of any real catalog.
 *
 * Every template is built from one base by four axes: element, role, attribute profile and
 * output band. Assignment is a fixed rotation, not a cross product: 14 roles x 4 elements
 * each covers all 14 elements four times, every role sees four of the five output bands,
 * and every attribute profile appears. The role's shape lives in the guaranteed signature
 * action; shapes the derivation tables cannot produce for that body are added as authored
 * mechanisms (the same route Shuntara, Figzy and Sonalloy use), never as table changes.
 */
import { ElementKeySchema, MEDIUM_ROWS } from '@xalians/content/creature';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Element = (typeof ElementKeySchema.options)[number];

export const SAMPLE_ROLES = [
  'striker', 'area-striker', 'drain', 'ally-healer', 'self-healer', 'ally-shielder', 'self-guard',
  'booster', 'hinderer', 'binder', 'displacer', 'charger', 'status-applier', 'pure-support',
] as const;
export type SampleRole = (typeof SAMPLE_ROLES)[number];

export const SAMPLE_PROFILES = ['standard', 'fragile', 'bulky', 'slow', 'fast', 'minimal', 'exceptional'] as const;
export type SampleProfile = (typeof SAMPLE_PROFILES)[number];

/** Output bands: the centre of the signature's principal effect. 130 is "above 100". */
export const SAMPLE_BANDS = [25, 50, 75, 100, 130] as const;
export type SampleBand = (typeof SAMPLE_BANDS)[number];

export interface SampleAxes { key: string; element: Element; role: SampleRole; profile: SampleProfile; band: SampleBand }
export interface SampleTemplate { axes: SampleAxes; template: Json }

const ELEMENTS = ElementKeySchema.options;
const PLANETS: Record<Element, string> = {
  fire: 'magmuth', water: 'poseidas', dark: 'grimedes', light: 'luminax', plant: 'floria', electric: 'zolton',
  ghost: 'phantiri', rock: 'stonera', chemical: 'drainov', air: 'saiphus', psychic: 'telypso', ice: 'krystos',
  metal: 'veridium', sand: 'endessa',
};
const cap = (value: string) => value.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');

/** Attribute overrides per profile; every other attribute stays at the standard 40 to 60. */
const PROFILE_ATTRIBUTES: Record<SampleProfile, Record<string, [number, number]>> = {
  standard: {},
  fragile: { vitality: [12, 20], endurance: [15, 25], resilience: [12, 20] },
  bulky: { vitality: [95, 110], endurance: [85, 100], resilience: [95, 110] },
  slow: { agility: [10, 18], reflex: [10, 18] },
  fast: { agility: [92, 108], reflex: [92, 108] },
  minimal: { strength: [8, 12], vitality: [8, 12], endurance: [8, 12], agility: [8, 12], reflex: [8, 12], intelligence: [8, 12], willpower: [8, 12], instinct: [8, 12], charisma: [8, 12], resilience: [8, 12] },
  exceptional: { strength: [95, 105], vitality: [95, 105], endurance: [95, 105], agility: [95, 105], reflex: [95, 105], intelligence: [95, 105], willpower: [95, 105], instinct: [95, 105], charisma: [95, 105], resilience: [95, 105] },
};
const PROFILE_MASS: Record<SampleProfile, [number, number]> = {
  standard: [30, 45], fragile: [5, 8], bulky: [400, 600], slow: [60, 90], fast: [15, 25], minimal: [1, 2], exceptional: [200, 300],
};
const PROFILE_HEIGHT: Record<SampleProfile, [number, number]> = {
  standard: [90, 120], fragile: [30, 45], bulky: [220, 280], slow: [110, 150], fast: [70, 90], minimal: [10, 18], exceptional: [180, 240],
};

const band = (centre: number): [number, number] => [Math.max(1, centre - 5), centre + 5];
const asOutput = ([low, high]: [number, number]) => (low === high ? low : [low, high]);

/** One guaranteed action with the standard timing unless overridden. */
function action(over: Json): Json {
  return {
    activation: { continuity: 'discrete' },
    timing: { preparation: 'immediate', recovery: 'brief' },
    spatial: {}, ...over,
  };
}
const effect = (over: Json): Json => ({ onset: 'instant', persistence: 'resolved', likelihood: 'consistent', ...over });
const lingering = (over: Json): Json => effect({ type: 'status', persistence: 'lingering', duration: 'brief', ...over });

/** A mechanism with one delivery mode and scalar recipients, the common authored shape. */
function mechanism(over: Json): Json {
  return {
    activation: { continuity: ['discrete'] },
    timing: { preparation: ['immediate', 'brief'], recovery: ['repeatable', 'brief'] },
    ...over,
  };
}
const arr = <T>(value: T): T[] => [value];

interface Role {
  anatomy: string[]; channels: string[]; conduit?: string; exclude?: string[];
  actions: Json[]; mechanisms: Json[]; signature: string; note: string;
}

/** Statuses a hinderer or applier carries, by element. A sample table, not a ruling. */
const HINDER: Record<Element, string> = {
  fire: 'overheated', water: 'slowed', dark: 'pinned', light: 'blinded', plant: 'sedated', electric: 'paralyzed', ghost: 'frightened',
  rock: 'buried', chemical: 'poisoned', air: 'disoriented', psychic: 'entranced', ice: 'chilled', metal: 'slowed', sand: 'deafened',
};
const APPLY: Record<Element, string> = {
  fire: 'burning', water: 'chilled', dark: 'disoriented', light: 'blinded', plant: 'poisoned', electric: 'stunned', ghost: 'marked',
  rock: 'pinned', chemical: 'corroding', air: 'deafened', psychic: 'frightened', ice: 'frozen', metal: 'revealed', sand: 'buried',
};
const REMOVED_BY: Record<string, string[]> = {
  burning: ['cooling', 'smothering'], overheated: ['cooling'], chilled: ['warming'], corroding: ['cleansing'], poisoned: ['detoxifying'],
  slowed: ['warming'], pinned: ['freeing'], frozen: ['warming'], buried: ['freeing'], blinded: ['cleansing'], deafened: ['stabilizing'],
  disoriented: ['stabilizing'], frightened: ['stabilizing'], entranced: ['disrupting'], sedated: ['stabilizing'], stunned: ['stabilizing'],
  paralyzed: ['stabilizing'], marked: ['cleansing'], revealed: ['cleansing'], restrained: ['freeing'],
};
const FUNCTIONS = ['reactions', 'mobility', 'force', 'perception', 'composure', 'recovery'] as const;

/** True when the element's medium row already yields this status through a derived act. */
const derivesStatus = (element: Element, value: string) => {
  const row = MEDIUM_ROWS[element];
  return row.status?.status === value || row.bind?.status === value;
};
const derivesPattern = (element: Element, pattern: string) => (MEDIUM_ROWS[element].patterns as readonly string[]).includes(pattern);

/** The role blueprints. `n` is the template's position within its role (0 to 3). */
function blueprint(role: SampleRole, element: Element, principal: [number, number], n: number): Role {
  const out = asOutput(principal);
  const breathBody = { anatomy: ['body', 'claws', 'jaws'], channels: ['breath'], conduit: 'breath' };
  const secretion = { anatomy: ['body'], channels: ['secretion'] };
  switch (role) {
    case 'striker':
      return {
        ...breathBody, signature: 'sample-strike', note: 'single-target elemental projectile harm',
        actions: [action({
          key: 'sample-strike', name: `${cap(element)} Shot`, description: `A single ${element} projectile hits one target.`, instrument: 'breath', element,
          delivery: { mode: 'projectile', approach: 'stationary' }, targeting: ['other'], spatial: { range: 'short' },
          effects: [effect({ key: 'outcome', type: 'harm', mechanism: 'elemental', recipient: 'target', intensity: out })],
        })],
        mechanisms: [],
      };
    case 'area-striker':
      return {
        ...breathBody, signature: 'sample-burst', note: 'radial elemental harm to an area',
        actions: [action({
          key: 'sample-burst', name: `${cap(element)} Burst`, description: `${cap(element)} releases outward in every direction.`, instrument: 'breath', element,
          delivery: { mode: 'pulse', approach: 'stationary' }, targeting: ['other'],
          spatial: { range: 'short', area: { shape: 'radial', extent: 'medium', anchor: 'self', persistence: 'resolved' } },
          effects: [effect({ key: 'outcome', type: 'harm', mechanism: 'elemental', recipient: 'area', intensity: out })],
        })],
        mechanisms: derivesPattern(element, 'burst') ? [] : [mechanism({
          key: 'radial-release', name: 'Radial Release', description: `${cap(element)} releases outward from the breath.`, instrument: 'breath', element, targeting: ['other'],
          timing: { preparation: ['immediate', 'brief'], recovery: ['brief', 'prolonged'] },
          delivery: { pulse: { approach: ['stationary'], range: ['short', 'medium'], area: { shape: ['radial'], extent: ['small', 'medium'], anchor: ['self'], persistence: 'resolved' } } },
          effects: [{ key: 'outcome', type: 'harm', mechanism: 'elemental', recipient: 'area', onset: 'instant', persistence: 'resolved', likelihood: ['consistent'], intensity: principal }],
        })],
      };
    case 'drain': {
      const gain = asOutput(band(Math.max(1, Math.round((principal[0] + principal[1]) / 2 * 0.4))));
      return {
        ...breathBody, signature: 'sample-drain', note: 'elemental harm with a dependent self restore',
        actions: [action({
          key: 'sample-drain', name: `${cap(element)} Drain`, description: `${cap(element)} draws from the target and returns the gain to the body.`, instrument: 'breath', element,
          delivery: { mode: 'contact', approach: 'stationary' }, targeting: ['other'], spatial: { range: 'contact' },
          effects: [
            effect({ key: 'toll', type: 'harm', mechanism: 'elemental', recipient: 'target', intensity: out }),
            effect({ key: 'gain', type: 'restore', recipient: 'self', requires: 'toll', intensity: gain }),
          ],
        })],
        mechanisms: derivesPattern(element, 'drain') ? [] : [mechanism({
          key: 'sample-draw', name: 'Sample Draw', description: `${cap(element)} draws from the target through contact.`, instrument: 'breath', element, targeting: ['other'],
          delivery: { contact: { approach: ['stationary'], range: ['contact'] } },
          effects: [
            { key: 'toll', type: 'harm', mechanism: 'elemental', recipient: 'target', onset: 'instant', persistence: 'resolved', likelihood: ['consistent'], intensity: principal },
            { key: 'gain', type: 'restore', recipient: 'self', onset: 'instant', persistence: 'resolved', likelihood: ['consistent'], intensity: band(Math.max(1, Math.round((principal[0] + principal[1]) / 2 * 0.4))), requires: 'toll' },
          ],
        })],
      };
    }
    case 'ally-healer':
      return {
        ...secretion, signature: 'sample-mend', note: 'restore aimed at another body',
        actions: [action({
          key: 'sample-mend', name: 'Restorative Secretion', description: 'A secretion repairs another body.', instrument: 'secretion',
          timing: { preparation: 'brief', recovery: 'brief' },
          delivery: { mode: 'contact', approach: 'stationary' }, targeting: ['other'], spatial: { range: 'contact' },
          effects: [effect({ key: 'repair', type: 'restore', recipient: 'target', intensity: out })],
        })],
        mechanisms: [],
      };
    case 'self-healer':
      return {
        ...secretion, signature: 'sample-renew', note: 'restore on the performer only',
        actions: [action({
          key: 'sample-renew', name: 'Self Renewal', description: 'The body turns inward and repairs its own tissue.', instrument: 'secretion',
          timing: { preparation: 'brief', recovery: 'brief' },
          delivery: { mode: 'self', approach: 'stationary' }, targeting: ['self'],
          effects: [effect({ key: 'repair', type: 'restore', recipient: 'self', intensity: out })],
        })],
        mechanisms: [],
      };
    case 'ally-shielder':
      return {
        ...secretion, signature: 'sample-brace', note: 'protect aimed at another body; authored (tables ward self only)',
        actions: [action({
          key: 'sample-brace', name: 'Bracing Film', description: 'A film spreads over another body and turns aside incoming force.', instrument: 'secretion',
          timing: { preparation: 'brief', recovery: 'brief' },
          delivery: { mode: 'contact', approach: 'stationary' }, targeting: ['other'], spatial: { range: 'contact' },
          effects: [effect({ key: 'outcome', type: 'protect', recipient: 'target', intensity: out })],
        })],
        mechanisms: [mechanism({
          key: 'ally-barrier', name: 'Ally Barrier', description: 'A film spreads over another body and hardens.', instrument: 'secretion', targeting: ['other'],
          timing: { preparation: ['brief', 'prolonged'], recovery: ['brief', 'prolonged'] },
          delivery: { contact: { approach: ['stationary'], range: ['contact'] } },
          effects: [
            { key: 'barrier', type: 'status', status: 'shielded', recipient: 'target', onset: 'instant', persistence: 'lingering', duration: 'brief', likelihood: ['consistent'], removable: ['disrupting'], intensity: principal },
          ],
        })],
      };
    case 'self-guard':
      return {
        anatomy: ['body', 'shell'], channels: [], signature: 'sample-guard', note: 'shielded status on the performer',
        actions: [action({
          key: 'sample-guard', name: 'Shell Guard', description: 'The shell closes into a guard that intercepts what follows.', instrument: 'shell',
          timing: { preparation: 'brief', recovery: 'brief' },
          delivery: { mode: 'self', approach: 'stationary' }, targeting: ['self'],
          effects: [lingering({ key: 'guard', status: 'shielded', recipient: 'self', removable: ['disrupting'], intensity: out })],
        })],
        mechanisms: [],
      };
    case 'booster': {
      const fn = FUNCTIONS[(n + ELEMENTS.indexOf(element)) % FUNCTIONS.length];
      return {
        anatomy: ['body'], channels: ['secretion'], signature: 'sample-boost', note: `stimulated (${fn}) on an ally; authored (no derived stimulant)`,
        actions: [action({
          key: 'sample-boost', name: 'Stimulant Secretion', description: `A secretion heightens another body's ${fn}.`, instrument: 'secretion',
          timing: { preparation: 'brief', recovery: 'brief' },
          delivery: { mode: 'contact', approach: 'stationary' }, targeting: ['other'], spatial: { range: 'contact' },
          effects: [lingering({ key: 'lift', status: 'stimulated', function: fn, recipient: 'target', removable: ['disrupting'], intensity: out })],
        })],
        mechanisms: [mechanism({
          key: 'stimulant', name: 'Stimulant', description: `A secretion heightens the ${fn} of a body it touches.`, instrument: 'secretion', targeting: ['self', 'other'],
          timing: { preparation: ['brief'], recovery: ['brief', 'prolonged'] },
          delivery: { contact: { approach: ['stationary'], range: ['contact'] } },
          effects: [{ key: 'lift', type: 'status', status: 'stimulated', function: fn, recipient: { contact: ['self', 'target'] }, onset: 'instant', persistence: 'lingering', duration: 'brief', likelihood: ['consistent'], removable: ['disrupting'], intensity: principal }],
        })],
      };
    }
    case 'hinderer': {
      const s = HINDER[element];
      return {
        ...breathBody, signature: 'sample-hinder', note: `${s} on a target through the breath${derivesStatus(element, s) ? '' : '; authored (not in the medium row)'}`,
        actions: [action({
          key: 'sample-hinder', name: `${cap(element)} Hindrance`, description: `${cap(element)} settles on a target and impairs it.`, instrument: 'breath', element,
          delivery: { mode: 'projectile', approach: 'stationary' }, targeting: ['other'], spatial: { range: 'short' },
          effects: [lingering({ key: 'impair', status: s, recipient: 'target', likelihood: 'likely', removable: REMOVED_BY[s], intensity: out })],
        })],
        mechanisms: derivesStatus(element, s) ? [] : [mechanism({
          key: 'sample-impair', name: 'Sample Impairment', description: `${cap(element)} settles on a target and impairs it.`, instrument: 'breath', element, targeting: ['other'],
          delivery: { projectile: { approach: ['stationary'], range: ['short', 'medium'] } },
          effects: [{ key: 'impair', type: 'status', status: s, recipient: 'target', onset: 'instant', persistence: 'lingering', duration: 'brief', likelihood: ['likely', 'occasional'], removable: REMOVED_BY[s], intensity: principal }],
        })],
      };
    }
    case 'binder':
      return {
        anatomy: ['body', 'tendrils'], channels: [], signature: 'sample-bind', note: 'sustained restrained held by an ongoing action; authored (tables lay lingering holds only)',
        actions: [action({
          key: 'sample-bind', name: 'Holding Coils', description: 'Tendrils hold a contacted target for as long as the hold is kept.', instrument: 'tendrils',
          activation: { continuity: 'ongoing' }, timing: { preparation: 'brief', recovery: 'brief' },
          delivery: { mode: 'contact', approach: 'stationary' }, targeting: ['other'], spatial: { range: 'contact' },
          effects: [effect({ key: 'hold', type: 'status', status: 'restrained', recipient: 'target', persistence: 'sustained', bound: 'source', likelihood: 'likely', removable: ['freeing'], intensity: out })],
        })],
        mechanisms: [mechanism({
          key: 'sustained-hold', name: 'Sustained Hold', description: 'Tendrils physically hold a contacted target.', instrument: 'tendrils', targeting: ['other'],
          activation: { continuity: ['ongoing'] }, timing: { preparation: ['brief', 'prolonged'], recovery: ['brief'] },
          delivery: { contact: { approach: ['stationary'], range: ['contact'] } },
          effects: [{ key: 'hold', type: 'status', status: 'restrained', recipient: 'target', onset: 'instant', persistence: 'sustained', bound: 'source', likelihood: ['likely', 'occasional'], removable: ['freeing'], intensity: principal }],
        })],
      };
    case 'displacer':
      return {
        anatomy: ['body', 'hooves', 'tendrils'], channels: [], signature: 'sample-shove', note: 'displace away (hooves); a toward pull is authored (tendrils rows have no pull)',
        actions: [action({
          key: 'sample-shove', name: 'Hoof Shove', description: 'A heavy kick drives the target back.', instrument: 'hooves',
          delivery: { mode: 'contact', approach: 'stationary' }, targeting: ['other'], spatial: { range: 'contact' },
          effects: [effect({ key: 'force', type: 'displace', direction: 'away', recipient: 'target', intensity: out })],
        })],
        mechanisms: [mechanism({
          key: 'drag', name: 'Drag', description: 'Tendrils haul the target toward the body.', instrument: 'tendrils', targeting: ['other'],
          delivery: { contact: { approach: ['stationary'], range: ['contact'] } },
          effects: [{ key: 'force', type: 'displace', direction: 'toward', recipient: 'target', onset: 'instant', persistence: 'resolved', likelihood: ['consistent'], intensity: principal }],
        })],
      };
    case 'charger':
      return {
        ...breathBody, signature: 'sample-charge', note: 'prolonged preparation and recovery on a long stream of elemental harm',
        actions: [action({
          key: 'sample-charge', name: `Charged ${cap(element)} Stream`, description: `${cap(element)} gathers, then runs in one long stream.`, instrument: 'breath', element,
          timing: { preparation: 'prolonged', recovery: 'prolonged' },
          delivery: { mode: 'stream', approach: 'stationary' }, targeting: ['other'], spatial: { range: 'long' },
          effects: [effect({ key: 'outcome', type: 'harm', mechanism: 'elemental', recipient: 'target', intensity: out })],
        })],
        mechanisms: derivesPattern(element, 'beam') ? [] : [mechanism({
          key: 'sample-stream', name: 'Sample Stream', description: `A sustained ${element} stream runs from the breath to the target.`, instrument: 'breath', element, targeting: ['other'],
          timing: { preparation: ['brief', 'prolonged'], recovery: ['brief', 'prolonged'] },
          delivery: { stream: { approach: ['stationary'], range: ['short', 'medium', 'long'] } },
          effects: [{ key: 'outcome', type: 'harm', mechanism: 'elemental', recipient: 'target', onset: 'instant', persistence: 'resolved', likelihood: ['consistent'], intensity: principal }],
        })],
      };
    case 'status-applier': {
      const s = APPLY[element];
      return {
        ...breathBody, signature: 'sample-apply', note: `${s} on a target through the breath${derivesStatus(element, s) ? '' : '; authored (not in the medium row)'}`,
        actions: [action({
          key: 'sample-apply', name: `${cap(element)} Affliction`, description: `${cap(element)} settles on a target and afflicts it.`, instrument: 'breath', element,
          delivery: { mode: 'projectile', approach: 'stationary' }, targeting: ['other'], spatial: { range: 'short' },
          effects: [lingering({ key: 'affliction', status: s, recipient: 'target', likelihood: 'likely', removable: REMOVED_BY[s], intensity: out })],
        })],
        mechanisms: derivesStatus(element, s) ? [] : [mechanism({
          key: 'sample-afflict', name: 'Sample Affliction', description: `${cap(element)} settles on a target and afflicts it.`, instrument: 'breath', element, targeting: ['other'],
          delivery: { projectile: { approach: ['stationary'], range: ['short', 'medium'] } },
          effects: [{ key: 'affliction', type: 'status', status: s, recipient: 'target', onset: 'instant', persistence: 'lingering', duration: 'brief', likelihood: ['likely', 'occasional'], removable: REMOVED_BY[s], intensity: principal }],
        })],
      };
    }
    case 'pure-support': {
      const actions = [action({
        key: 'sample-support', name: 'Restorative Secretion', description: 'A secretion repairs another body.', instrument: 'secretion',
        timing: { preparation: 'brief', recovery: 'brief' },
        delivery: { mode: 'contact', approach: 'stationary' }, targeting: ['other'], spatial: { range: 'contact' },
        effects: [effect({ key: 'repair', type: 'restore', recipient: 'target', intensity: out })],
      })];
      if (n % 2 === 1) {
        actions.push(action({
          key: 'sample-cleanse', name: 'Washing Fluid', description: 'The fluid carries away compatible applied substances.', instrument: 'secretion',
          timing: { preparation: 'brief', recovery: 'brief' },
          delivery: { mode: 'contact', approach: 'stationary' }, targeting: ['other'], spatial: { range: 'contact' },
          effects: [effect({ key: 'wash', type: 'remove', recipient: 'target', methods: ['cleansing'] })],
        }));
      }
      return {
        anatomy: ['body'], channels: ['secretion', 'aura'],
        // No harm and no hold: every derived act left is a mend or a ward.
        exclude: ['*/strike', '*/crush', '*/shove', '*/terrorize', '*/snare'],
        signature: 'sample-support', note: `no attack at all${n % 2 === 1 ? ', plus a cleanse' : ''}`, actions, mechanisms: [],
      };
    }
  }
}

/** The species template for one set of axes. */
function templateFor(axes: SampleAxes, n: number): Json {
  const { key, element, role, profile } = axes;
  const centre = axes.band;
  const kit = blueprint(role, element, band(centre), n);
  const [mass, height] = [PROFILE_MASS[profile], PROFILE_HEIGHT[profile]];
  const standard: [number, number] = [40, 60];
  const attributes: Record<string, [number, number]> = Object.fromEntries(
    ['strength', 'vitality', 'endurance', 'agility', 'reflex', 'intelligence', 'willpower', 'instinct', 'charisma', 'resilience']
      .map(name => [name, PROFILE_ATTRIBUTES[profile][name] ?? standard]));
  const sprint: [number, number] = profile === 'fast' ? [70, 90] : profile === 'slow' ? [10, 20] : [30, 50];
  return {
    key,
    name: `Sample ${cap(role)} (${cap(element)})`,
    nameOrigin: `Non-canonical sample species. Covers element ${element}, role ${role}, attribute profile ${profile}, output band ${centre}. Not offered to players.`,
    element, homePlanet: PLANETS[element], generatorPlanets: [PLANETS[element]],
    lore: {
      description: `A non-canonical sample body for testing the ${role.replace(/-/g, ' ')} role.`,
      appearance: ['Plain body', 'Even proportions', 'Smooth resting outline'],
      origin: 'Non-canonical sample fixture.', habitat: 'Non-canonical sample fixture.', feeding: 'Non-canonical sample fixture.',
      behavior: 'Non-canonical sample fixture.', company: 'Non-canonical sample fixture.',
    },
    physiology: {
      composition: { primary: 'flesh' }, bodyPlan: 'quadruped', anatomy: kit.anatomy, covering: 'bare',
      size: { massKg: mass, heightCm: height }, lifespan: 'standard', genome: { chirality: 'rolled' }, diet: 'omnivore',
      communication: [], breathes: ['gas'],
      environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: 5, max: 40 } },
      capabilities: { flight: [0, 0], swim: [20, 40], burrow: [0, 0], climb: [10, 30], sprint, leap: [10, 30], manipulation: [10, 30] },
      senses: { sight: [40, 60], hearing: [40, 60], smell: [40, 60], special: [] },
      protections: [], traversal: [],
    },
    attributes,
    temperament: { boldness: [40, 60], curiosity: [40, 60], energy: [40, 60], aggression: [40, 60], sociability: [40, 60] },
    channels: kit.channels,
    conduits: kit.conduit ? { [kit.conduit]: element } : {},
    ...(kit.exclude ? { acts: { exclude: kit.exclude } } : {}),
    signature: { type: 'action', key: kit.signature },
    actions: kit.actions, passives: [], mechanisms: kit.mechanisms,
  };
}

/** Role-specific note for the template list and the doc. */
export function roleNote(role: SampleRole, element: Element, n: number): string {
  return blueprint(role, element, [50, 50], n).note;
}

let cached: readonly SampleTemplate[] | undefined;
/**
 * The sample templates, fixed order: role by role, four elements each. Role `r`, slot `n`
 * takes element (4r + n) mod 14, band (r + n) mod 5 and profile (r + 2n) mod 7.
 */
export function sampleTemplates(): readonly SampleTemplate[] {
  if (cached) return cached;
  const list: SampleTemplate[] = [];
  SAMPLE_ROLES.forEach((role, r) => {
    for (let n = 0; n < 4; n++) {
      const element = ELEMENTS[(4 * r + n) % ELEMENTS.length];
      const axes: SampleAxes = {
        key: `sample-${role}-${element}`, element, role,
        profile: SAMPLE_PROFILES[(r + 2 * n) % SAMPLE_PROFILES.length], band: SAMPLE_BANDS[(r + n) % SAMPLE_BANDS.length],
      };
      list.push({ axes, template: templateFor(axes, n) });
    }
  });
  cached = Object.freeze(list);
  return cached;
}
