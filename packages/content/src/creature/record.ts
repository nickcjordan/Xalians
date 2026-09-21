import { z } from 'zod';
import { ATTRIBUTE_KEYS, CAPABILITY_KEYS } from '../registriesConst.ts';
import * as c from './catalog.ts';
import { TemplatePhysiologySchema, checkPhysiology } from './species.ts';
import { ActionSchema, PassiveSchema, SignatureSchema, abilityIdentity } from './ability.ts';

const physiology = TemplatePhysiologySchema.omit({ size: true, genome: true, capabilities: true, senses: true }).extend({
  heightCm: z.number().positive(), weightKg: z.number().positive(),
  genome: z.strictObject({ chirality: z.enum(['levo', 'dextro', 'achiral']) }),
  capabilities: z.record(z.enum(CAPABILITY_KEYS), c.Rating),
  senses: z.strictObject({ sight: c.Rating, hearing: c.Rating, smell: c.Rating, special: z.array(c.SpecialSense) }),
}).superRefine(checkPhysiology);
const spectrum = z.number().int().min(0).max(100);
const data = z.strictObject({
  species: c.Key, element: c.ElementKeySchema, physiology,
  attributes: z.record(z.enum(ATTRIBUTE_KEYS), c.Rating),
  temperament: z.strictObject({ boldness: spectrum, curiosity: spectrum, energy: spectrum, aggression: spectrum, sociability: spectrum }),
  signature: SignatureSchema, actions: z.array(ActionSchema).length(4), passives: z.array(PassiveSchema),
});
function checkAbilities(value: z.infer<typeof data>, ctx: z.RefinementCtx) {
  const capabilities = [...value.actions, ...value.passives];
  if (new Set(capabilities.map(a => a.key)).size !== capabilities.length) ctx.addIssue({ code: 'custom', message: 'ability keys must be unique' });
  if (!(value.signature.type === 'action' ? value.actions : value.passives).some(a => a.key === value.signature.key)) ctx.addIssue({ code: 'custom', message: 'signature must reference its declared ability type' });
  if (new Set(value.actions.map(abilityIdentity)).size !== 4) ctx.addIssue({ code: 'custom', message: 'actions must be structurally distinct' });
}
/** Resolved biology and abilities; suitable for previews without claiming a frozen release. */
export const CreatureDataSchema = data.superRefine(checkAbilities);
export type CreatureData = z.infer<typeof CreatureDataSchema>;

/** Persistence boundary. Draft generation cannot assign itself a canonical release ID. */
export const CreatureRecordSchema = data.extend({
  id: z.string().regex(/^xal_/),
  provenance: z.strictObject({ seed: z.string().min(1), generatorVersion: z.string().min(1), schemaVersion: z.literal('5.0.0'),
    releaseId: z.string().min(1), generatedAt: z.string().datetime({ offset: true }), origin: c.Key,
    serial: z.number().int().positive(), profile: z.enum(['full', 'showroom']) }),
  appearance: z.strictObject({ finish: z.enum(['standard', 'gleam', 'prismatic', 'eclipse']) }),
}).superRefine(checkAbilities);
export type CreatureRecord = z.infer<typeof CreatureRecordSchema>;
