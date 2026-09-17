import { z } from 'zod';
import { ActionKeySchema, CompositionKeySchema, CorporealityKeySchema, ElementKeySchema, InstrumentKeySchema } from './registries.ts';

// Creature facts, not combat rules. These are independent axes: a stream can restore,
// a field can protect, and a contact application can stimulate an existing function.
export const DeliverySchema = z.strictObject({
  mode: z.enum(['contact', 'projectile', 'stream', 'pulse', 'field', 'signal', 'self']),
  shape: z.enum(['focused', 'sweep', 'radial', 'diffuse']),
  approach: z.enum(['stationary', 'closing']),
  persistence: z.enum(['instant', 'maintained', 'residual']),
});

const persistence = z.enum(['instant', 'maintained', 'residual']).optional();
const recipient = z.enum(['target', 'self']);
export const EffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('harm'), recipient, persistence, mechanism: z.enum(['impact', 'cutting', 'piercing', 'compression', 'elemental']) }),
  z.strictObject({ kind: z.literal('restore'), recipient, persistence, aspect: z.enum(['integrity', 'composure', 'reserve']) }),
  z.strictObject({ kind: z.literal('protect'), recipient, persistence, method: z.enum(['barrier', 'deflection', 'bracing', 'resistance']), against: z.enum(['harm', 'impairment']) }),
  z.strictObject({ kind: z.literal('enhance'), recipient, persistence, aspect: z.enum(['reactions', 'mobility', 'force', 'perception', 'composure', 'recovery']) }),
  z.strictObject({ kind: z.literal('suppress'), recipient, persistence, aspect: z.enum(['reactions', 'mobility', 'force', 'perception', 'composure', 'recovery']) }),
  z.strictObject({ kind: z.literal('restrain'), recipient, persistence, faculty: z.enum(['movement', 'attention']) }),
  z.strictObject({ kind: z.literal('displace'), recipient, persistence, direction: z.enum(['away', 'toward', 'redirect']) }),
  z.strictObject({ kind: z.literal('transfer'), persistence, from: z.enum(['target', 'self']), to: z.enum(['target', 'self']), resource: z.enum(['vitality', 'water', 'heat', 'charge', 'energy']) }),
  z.strictObject({ kind: z.literal('remove'), recipient, persistence, state: z.enum(['contaminant', 'restraint', 'stimulation', 'protection', 'sensory-interference']) }),
  z.strictObject({ kind: z.literal('reveal'), recipient, persistence, aspect: z.enum(['location', 'damage', 'intent']) }),
]);

export const TargetingSchema = z.strictObject({
  relation: z.enum(['self', 'other', 'self-or-other']),
  subjects: z.array(z.enum(['creature', 'object', 'environment'])).min(1),
  // Omitted compatibility is unspecified, NOT a promise of universal efficacy.
  compatibility: z.strictObject({
    composition: z.array(CompositionKeySchema).min(1).optional(),
    corporeality: z.array(CorporealityKeySchema).min(1).optional(),
    reception: z.enum(['visual', 'auditory', 'mental']).optional(),
  }).optional(),
});

export const ActivationSchema = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('active') }),
  z.strictObject({ mode: z.literal('passive') }),
  z.strictObject({ mode: z.literal('reactive'), trigger: z.enum(['contact', 'incoming-harm', 'ally-distress']) }),
]);

const AbilityFactsSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  instrument: InstrumentKeySchema,
  medium: ElementKeySchema,
  activation: ActivationSchema,
  delivery: DeliverySchema,
  targeting: TargetingSchema,
  effects: z.array(EffectSchema).min(1),
  description: z.string().min(1),
});

function checkFacts(value: Pick<z.infer<typeof AbilityFactsSchema>, 'delivery' | 'targeting' | 'effects'>, ctx: z.RefinementCtx) {
  if (value.delivery.mode === 'self' && value.targeting.relation !== 'self') {
    ctx.addIssue({ code: 'custom', path: ['targeting', 'relation'], message: 'self delivery requires self targeting' });
  }
  value.effects.forEach((effect, index) => {
    if (effect.kind === 'transfer' && effect.from === effect.to) {
      ctx.addIssue({ code: 'custom', path: ['effects', index], message: 'transfer requires distinct source and recipient' });
    }
  });
}

export const LegacyStructuredAbilitySchema = AbilityFactsSchema.extend({
  prominence: z.enum(['defining', 'ordinary']),
  // Expression strength within its definition. It is not HP, duration, cost or a
  // per-effect budget; a consumer must price the complete effects list together.
  intensity: z.number().min(1).max(100),
  origin: z.enum(['inherent', 'generated']),
}).superRefine(checkFacts);

export const AbilitySchema = AbilityFactsSchema.extend({
  role: z.enum(['signature', 'standard']),
  intensity: z.number().min(1).max(100),
}).superRefine(checkFacts);

export const AbilityTemplateSchema = AbilityFactsSchema.extend({
  intensity: z.tuple([z.number().min(1).max(100), z.number().min(1).max(100)])
    .refine(([lo, hi]) => lo <= hi, 'intensity band must be ordered'),
}).superRefine(checkFacts);

export const AbilityPatternSchema = z.strictObject({
  key: z.string().min(1),
  // The old catalog cells are lexical families only, never the effect definition.
  nameFamily: ActionKeySchema,
  activation: ActivationSchema,
  delivery: DeliverySchema,
  targeting: TargetingSchema,
  effects: z.array(EffectSchema).min(1),
  description: z.string().min(1),
}).superRefine(checkFacts);

// Every set is authored as mutually compatible. Choose one set, then sample its
// independent options. Dependencies on another randomly selected option are forbidden.
export const AbilityPoolOptionSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  pattern: z.string().min(1),
  instrument: InstrumentKeySchema,
  media: z.array(ElementKeySchema).min(1).refine(v => new Set(v).size === v.length, 'media must be unique'),
  weight: z.number().positive(),
});
export const AbilityPoolSchema = z.strictObject({
  count: z.tuple([z.number().int().min(0), z.number().int().min(0)])
    .refine(([lo, hi]) => lo <= hi, 'ability count must be ordered'),
  sets: z.array(z.strictObject({
    key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    weight: z.number().positive(),
    options: z.array(AbilityPoolOptionSchema),
  })).min(1),
}).superRefine((pool, ctx) => {
  if (new Set(pool.sets.map(s => s.key)).size !== pool.sets.length) ctx.addIssue({code: 'custom', message: 'set keys must be unique'});
  for (const set of pool.sets) {
    if (new Set(set.options.map(o => o.key)).size !== set.options.length) ctx.addIssue({code: 'custom', message: 'option keys must be unique within a set'});
  }
});
export type Ability = z.infer<typeof AbilitySchema>;
export type AbilityTemplate = z.infer<typeof AbilityTemplateSchema>;
export type AbilityPattern = z.infer<typeof AbilityPatternSchema>;
export type AbilityPool = z.infer<typeof AbilityPoolSchema>;

// Authoring/build-time checks. Semantics and source evidence are reviewed when
// authoring sets; generation does not evaluate or reject completed individuals.
export function validateAbilityPool(pool: AbilityPool, patterns: ReadonlyMap<string, AbilityPattern>, instruments: readonly string[], allowedMedia: readonly string[], signature: AbilityTemplate): void {
  if (!allowedMedia.includes(signature.medium)) throw new Error('Unsupported signature medium: ' + signature.medium);
  for (const set of pool.sets) {
    for (const option of set.options) {
      if (!patterns.has(option.pattern)) throw new Error('Unknown ability pattern: ' + option.pattern);
      if (!instruments.includes(option.instrument)) throw new Error('Undeclared ability-pool instrument: ' + option.instrument);
      for (const medium of option.media) if (!allowedMedia.includes(medium)) throw new Error('Unsupported ability-pool medium: ' + medium);
    }
    // Every individual has the primary medium. Secondary affinity can expand options,
    // but is never necessary to fill a valid draw. Each option can be selected once.
    if (set.options.filter(o => o.media.includes(allowedMedia[0] as z.infer<typeof ElementKeySchema>)).length < pool.count[1]) {
      throw new Error('Ability set lacks enough primary-medium options: ' + set.key);
    }
  }
}
