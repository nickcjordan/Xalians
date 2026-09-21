import { z } from 'zod';
import { NamingSchema } from './naming.ts';
import * as c from './catalog.ts';
import { ANATOMY_KEYS, ATTRIBUTE_KEYS, CAPABILITY_KEYS } from '../registriesConst.ts';
import { ActionTemplateSchema, PassiveTemplateSchema, ProtectionSchema, SignatureSchema, abilityIdentity, EffectTemplateSchema } from './ability.ts';

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
    if (instrument === 'voice' && !species.physiology.communication.includes('vocal')) issue(`${capability.key}: voice requires vocal communication`);
  }
});
export type Species = z.infer<typeof SpeciesSchema>;
