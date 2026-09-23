import { z } from 'zod';
import { NamingSchema } from './naming.ts';
import * as c from './catalog.ts';
import { ANATOMY_KEYS, ATTRIBUTE_KEYS, CAPABILITY_KEYS, CHANNEL_KEYS } from '../registriesConst.ts';
import { ActionTemplateSchema, PassiveTemplateSchema, ProtectionSchema, SignatureSchema, abilityIdentity, EffectTemplateSchema } from './ability.ts';
import { PATTERNS } from './acts.ts';

const RecipientPermissions = z.union([c.Recipient, z.partialRecord(c.Delivery, c.choices(c.Recipient))]);
// Branch payloads are checked against the very same effect schema as resolved abilities.
// This authoring form varies recipient and likelihood, never effect presence or type.
export const MechanismEffectSchema = z.strictObject({
  key: c.Key, type: z.enum(['harm', 'restore', 'protect', 'displace', 'status', 'remove']),
  recipient: RecipientPermissions, onset: c.Onset, persistence: c.Persistence,
  duration: c.Duration.optional(), likelihood: c.choices(c.Likelihood), requires: c.Key.optional(),
  intensity: c.Output.optional(), mechanism: c.Harm.optional(), direction: z.enum(['toward', 'away']).optional(),
  status: c.Status.optional(), removable: c.choices(c.Removal).optional(), bound: z.enum(['source', 'area']).optional(),
  protection: ProtectionSchema.optional(), function: c.Function.optional(), methods: c.choices(c.Removal).optional(),
}).superRefine((effect, ctx) => {
  const result = EffectTemplateSchema.safeParse({ ...effect, recipient: 'target', likelihood: effect.likelihood[0] });
  if (!result.success) for (const issue of result.error.issues) ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
});
export const MechanismSchema = z.strictObject({
  key: c.Key, name: z.string().min(1), description: z.string().min(1), instrument: c.InstrumentKeySchema,
  naming: NamingSchema.optional(),
  element: c.ElementKeySchema.optional(), targeting: c.choices(c.Target),
  activation: z.strictObject({ continuity: c.choices(c.Continuity) }),
  timing: z.strictObject({ preparation: c.choices(c.Preparation), recovery: c.choices(c.Recovery) }),
  delivery: z.partialRecord(c.Delivery, z.strictObject({
    approach: c.choices(c.Approach), reception: c.Reception.optional(), range: c.choices(c.Range).optional(),
    area: z.strictObject({ shape: c.choices(c.Shape), extent: c.choices(c.Extent), anchor: c.choices(c.Anchor),
      persistence: c.Persistence, duration: c.Duration.optional() }).optional(),
  })).refine(v => Object.keys(v).length > 0, 'at least one delivery mode is required'),
  effects: z.array(MechanismEffectSchema).nonempty(),
}).superRefine((mechanism, ctx) => {
  for (const effect of mechanism.effects) if (typeof effect.recipient !== 'string') {
    if (Object.keys(effect.recipient).sort().join() !== Object.keys(mechanism.delivery).sort().join()) {
      ctx.addIssue({ code: 'custom', message: `${effect.key}: recipient permissions must cover exactly the mechanism's delivery modes` });
    }
  }
});
export type Mechanism = z.infer<typeof MechanismSchema>;

const ratings = c.band(c.Rating);
export const TemplatePhysiologySchema = z.strictObject({
  composition: z.strictObject({ primary: c.CompositionKeySchema, secondary: c.CompositionKeySchema.optional() })
    .refine(v => v.primary !== v.secondary, 'secondary composition must differ from primary'),
  bodyPlan: c.BodyPlanKeySchema, anatomy: c.choices(c.AnatomyKeySchema)
    .refine(v => !(v.includes('shell') && v.includes('hide')), 'choose the resting surface classification, not both shell and hide'), covering: c.CoveringKeySchema,
  size: z.strictObject({ heightCm: c.band(z.number().positive()), weightKg: c.band(z.number().positive()) }),
  lifespan: c.LifespanKeySchema, genome: z.strictObject({ chirality: z.enum(['rolled', 'achiral']) }),
  diet: c.DietKeySchema, communication: z.array(c.CommunicationKeySchema), breathes: z.array(c.MediumPhaseKeySchema),
  environmentalTolerance: z.strictObject({ ambientMedia: c.choices(c.MediumPhaseKeySchema),
    temperatureC: z.strictObject({ min: z.number(), max: z.number() }).refine(v => v.min <= v.max, 'temperature bounds are reversed') }),
  capabilities: z.record(z.enum(CAPABILITY_KEYS), ratings),
  senses: z.strictObject({ sight: ratings, hearing: ratings, smell: ratings, special: z.array(c.SpecialSense) }),
  protections: z.array(ProtectionSchema), traversal: z.array(c.Traversal),
});
export function checkPhysiology(value: { breathes: string[]; environmentalTolerance: { ambientMedia: string[] } }, ctx: z.RefinementCtx) {
  if (value.breathes.some(phase => !value.environmentalTolerance.ambientMedia.includes(phase))) ctx.addIssue({ code: 'custom', message: 'breathing media must be supported ambient media' });
}
export const SpeciesSchema = z.strictObject({
  schemaVersion: z.literal('5.0.0'), key: c.Key, name: z.string().min(1), nameOrigin: z.string().min(1),
  element: c.ElementKeySchema, homePlanet: c.Key, generatorPlanets: c.choices(c.Key),
  lore: z.strictObject({ description: z.string().min(1), appearance: z.array(z.string().min(1)).min(3).max(8),
    origin: z.string().min(1), habitat: z.string().min(1), feeding: z.string().min(1), behavior: z.string().min(1), company: z.string().min(1) }),
  physiology: TemplatePhysiologySchema.superRefine(checkPhysiology),
  attributes: z.record(z.enum(ATTRIBUTE_KEYS), ratings),
  temperament: z.strictObject({ boldness: c.band(z.number().int().min(0).max(100)), curiosity: c.band(z.number().int().min(0).max(100)),
    energy: c.band(z.number().int().min(0).max(100)), aggression: c.band(z.number().int().min(0).max(100)), sociability: c.band(z.number().int().min(0).max(100)) }),
  signature: SignatureSchema, actions: z.array(ActionTemplateSchema).max(4), passives: z.array(PassiveTemplateSchema),
  mechanisms: z.array(MechanismSchema),
  // Anatomy grants, lore subtracts. Channels and conduits say where power leaves the
  // body; `acts` narrows or re-bands what the tables would otherwise derive.
  channels: z.array(z.enum(CHANNEL_KEYS)).default([]),
  conduits: z.partialRecord(c.InstrumentKeySchema, c.ElementKeySchema).default({}),
  acts: z.strictObject({
    exclude: z.array(z.string()).optional(),
    output: z.record(z.string(), c.band(c.Intensity)).optional(),
  }).optional(),
}).superRefine((species, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const guaranteed = [...species.actions, ...species.passives];
  if (new Set(guaranteed.map(a => a.key)).size !== guaranteed.length) issue('guaranteed ability keys must be unique');
  if (new Set(species.mechanisms.map(a => a.key)).size !== species.mechanisms.length) issue('mechanism keys must be unique');
  const signatures = species.signature.type === 'action' ? species.actions : species.passives;
  if (!signatures.some(a => a.key === species.signature.key)) issue('signature must reference a guaranteed ability of its declared type');
  if (new Set(species.actions.map(abilityIdentity)).size !== species.actions.length) issue('guaranteed actions must be structurally distinct');
  for (const capability of [...guaranteed, ...species.mechanisms]) {
    const instrument = capability.instrument;
    if ((ANATOMY_KEYS as readonly string[]).includes(instrument) && !species.physiology.anatomy.includes(instrument as typeof ANATOMY_KEYS[number])) issue(`${capability.key}: instrument ${instrument} is absent from anatomy`);
    if (instrument === 'gaze' && species.physiology.senses.sight[0] <= 0) issue(`${capability.key}: gaze requires sight throughout the species band`);
  }
  checkChannels(species, issue);
  checkConduits(species, issue);
  checkActs(species, issue);
});

/** The ratified predicates. A channel is a claim about the body, not a free label. */
const CHANNEL_PREDICATES: Partial<Record<typeof CHANNEL_KEYS[number], { holds: (species: SpeciesShape) => boolean; requirement: string }>> = {
  voice: { holds: s => s.physiology.communication.includes('vocal'), requirement: 'vocal communication' },
  breath: { holds: s => s.physiology.breathes.length > 0, requirement: 'a nonempty breathes list' },
  swarm: { holds: s => s.physiology.bodyPlan === 'swarm', requirement: 'the swarm body plan' },
  mind: { holds: s => s.physiology.communication.includes('telepathic') || s.physiology.senses.special.includes('psychic') || s.element === 'psychic', requirement: 'telepathic communication, a psychic special sense or the psychic element' },
  gaze: { holds: s => s.physiology.senses.sight[0] > 0, requirement: 'sight throughout the species band' },
};
type SpeciesShape = {
  element: string;
  physiology: { anatomy: readonly string[]; bodyPlan: string; communication: readonly string[]; breathes: readonly string[]; senses: { sight: readonly [number, number]; special: readonly string[] } };
  channels: readonly string[]; conduits: Readonly<Partial<Record<string, string>>>;
  acts?: { exclude?: string[]; output?: Record<string, [number, number]> };
  actions: readonly { key: string; instrument: string; element?: string }[];
  passives: readonly { key: string; instrument: string; element?: string }[];
  mechanisms: readonly { key: string; instrument: string; element?: string }[];
};
function checkChannels(species: SpeciesShape, issue: (message: string) => void): void {
  for (const channel of species.channels) {
    const predicate = CHANNEL_PREDICATES[channel as typeof CHANNEL_KEYS[number]];
    if (predicate && !predicate.holds(species)) issue(`channel ${channel} requires ${predicate.requirement}`);
  }
  for (const capability of [...species.actions, ...species.passives, ...species.mechanisms]) {
    if ((CHANNEL_KEYS as readonly string[]).includes(capability.instrument) && !species.channels.includes(capability.instrument)) {
      issue(`${capability.key}: channel ${capability.instrument} is used but not declared in channels`);
    }
  }
}
function checkConduits(species: SpeciesShape, issue: (message: string) => void): void {
  const authored = [...species.actions, ...species.passives, ...species.mechanisms];
  for (const [instrument, element] of Object.entries(species.conduits)) {
    if (!species.physiology.anatomy.includes(instrument) && !species.channels.includes(instrument)) {
      issue(`conduit ${instrument}: the instrument is absent from anatomy and channels`);
    }
    // No species acquires a new element by declaration alone; an authored ability is the evidence.
    if (element !== species.element && !authored.some(a => a.instrument === instrument && a.element === element)) {
      issue(`conduit ${instrument}/${element}: a foreign element needs a guaranteed or authored ability already using it`);
    }
  }
}
function checkActs(species: SpeciesShape, issue: (message: string) => void): void {
  const instruments = [...species.physiology.anatomy, ...species.channels];
  const check = (value: string, field: string, wildcards: boolean) => {
    const [instrument, pattern] = value.split('/');
    if (!(wildcards && instrument === '*') && !instruments.includes(instrument)) issue(`acts.${field} ${value}: ${instrument} is not an instrument this species has`);
    if (!(wildcards && pattern === '*') && !(PATTERNS as readonly string[]).includes(pattern)) issue(`acts.${field} ${value}: ${pattern} is not a known pattern`);
  };
  for (const value of species.acts?.exclude ?? []) check(value, 'exclude', true);
  for (const value of Object.keys(species.acts?.output ?? {})) check(value, 'output', false);
}
export type Species = z.infer<typeof SpeciesSchema>;
