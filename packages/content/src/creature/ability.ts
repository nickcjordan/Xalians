import { z } from 'zod';
import * as c from './catalog.ts';

const degree = z.enum(['resistant', 'immune']);
export const ProtectionSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('status'), status: c.Status, degree }),
  z.strictObject({ type: z.literal('harm'), mechanism: c.Harm, element: c.ElementKeySchema.optional(), degree })
    .refine(v => (v.mechanism === 'elemental') === (v.element !== undefined), 'only elemental harm protection requires element'),
  z.strictObject({ type: z.literal('displace'), degree }),
]);
export type Protection = z.infer<typeof ProtectionSchema>;

function effectSchema<T extends z.ZodType>(output: T) {
  const common = {
    key: c.Key, recipient: c.Recipient, onset: c.Onset, persistence: c.Persistence,
    duration: c.Duration.optional(), likelihood: c.Likelihood, requires: c.Key.optional(),
  };
  return z.discriminatedUnion('type', [
    z.strictObject({ ...common, type: z.literal('harm'), mechanism: c.Harm, intensity: output }),
    z.strictObject({ ...common, type: z.literal('restore'), intensity: output }),
    z.strictObject({ ...common, type: z.literal('protect'), intensity: output }),
    z.strictObject({ ...common, type: z.literal('displace'), direction: z.enum(['toward', 'away']), intensity: output }),
    z.strictObject({ ...common, type: z.literal('status'), status: c.Status, intensity: output.optional(),
      removable: c.choices(c.Removal), bound: z.enum(['source', 'area']).optional(),
      protection: ProtectionSchema.optional(), function: c.Function.optional() }),
    z.strictObject({ ...common, type: z.literal('remove'), methods: c.choices(c.Removal) }),
  ]).superRefine((effect, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    if ((effect.persistence === 'lingering') !== (effect.duration !== undefined)) issue('only lingering effects require duration');
    if (!('status' in effect)) {
      if (effect.persistence === 'lingering') issue('lasting applied conditions use status; direct work cannot linger');
      return;
    }
    if (effect.persistence === 'resolved') issue('status requires sustained or lingering persistence');
    if ((effect.persistence === 'sustained') !== (effect.bound !== undefined)) issue('only sustained statuses require bound');
    if ((effect.status === 'protected') !== (effect.protection !== undefined)) issue('only protected requires protection');
    if ((effect.status === 'stimulated') !== (effect.function !== undefined)) issue('only stimulated requires function');
  });
}
export const EffectSchema = effectSchema(c.Intensity);
export const EffectTemplateSchema = effectSchema(c.Output);
export type Effect = z.infer<typeof EffectSchema>;
export type EffectTemplate = z.infer<typeof EffectTemplateSchema>;

export const AreaSchema = z.strictObject({
  shape: c.Shape, extent: c.Extent, anchor: c.Anchor, persistence: c.Persistence, duration: c.Duration.optional(),
}).superRefine((area, ctx) => {
  if ((area.persistence === 'lingering') !== (area.duration !== undefined)) ctx.addIssue({ code: 'custom', message: 'only lingering areas require duration' });
  if (area.shape !== 'radial' && area.anchor !== 'self') ctx.addIssue({ code: 'custom', message: 'line, cone and sweep originate at self and aim toward the selected target' });
});

function abilitySchema<T extends typeof EffectSchema | typeof EffectTemplateSchema>(effect: T, passive: boolean) {
  return z.strictObject({
    key: c.Key, name: z.string().min(1), description: z.string().min(1), instrument: c.InstrumentKeySchema,
    element: c.ElementKeySchema.optional(),
    activation: z.strictObject({ continuity: c.Continuity, trigger: c.Trigger.optional() }),
    timing: z.strictObject({ preparation: c.Preparation, recovery: c.Recovery }).optional(),
    delivery: z.strictObject({ mode: c.Delivery, approach: c.Approach, reception: c.Reception.optional() }),
    targeting: c.choices(c.Target),
    spatial: z.strictObject({ range: c.Range.optional(), area: AreaSchema.optional() }),
    effects: z.array(effect).nonempty(),
  }).superRefine((ability, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    const { activation, delivery, spatial, effects } = ability;
    if (!passive && activation.trigger) issue('actions do not have automatic triggers');
    if (passive && (activation.continuity === 'discrete') !== (activation.trigger !== undefined)) issue('discrete passives require trigger; ongoing passives omit it');
    if ((!passive || activation.continuity === 'discrete') !== (ability.timing !== undefined)) issue('actions and discrete passives require timing; ongoing passives omit timing');
    if (delivery.reception && delivery.mode !== 'signal') issue('reception belongs only to signal delivery');
    if (delivery.mode === 'self' && (ability.targeting.length !== 1 || ability.targeting[0] !== 'self')) issue('self delivery targets only self');
    const directed = delivery.mode !== 'self' && ability.targeting.includes('other');
    if (!directed && spatial.range) issue('self-only delivery omits range');
    if (directed && !spatial.range) issue('directed delivery requires range');
    const usesArea = effects.some(e => e.recipient === 'area');
    if (usesArea !== (spatial.area !== undefined)) issue('area geometry exists exactly when an effect uses area');
    if (spatial.area?.persistence === 'sustained' && activation.continuity !== 'ongoing') issue('sustained area requires ongoing activation');
    if (spatial.area && spatial.area.shape !== 'radial' && ability.targeting.some(target => target !== 'other')) issue('directed area requires other-only targeting; selecting self supplies no direction');
    if (new Set(effects.map(e => e.key)).size !== effects.length) issue('effect keys must be unique');
    for (const effect of effects) {
      if (effect.type === 'harm' && effect.mechanism === 'elemental' && !ability.element) issue('elemental harm requires ability element');
      if (effect.persistence === 'sustained') {
        if (effect.type === 'status' && effect.bound === 'area') {
          if (effect.recipient !== 'area' || !spatial.area || spatial.area.persistence === 'resolved') issue('area-bound status requires area recipient and a persistent area');
        } else if (activation.continuity !== 'ongoing') issue('source-sustained effects require ongoing activation');
      }
      if (effect.requires) {
        const prerequisite = effects.find(e => e.key === effect.requires);
        if (!prerequisite || prerequisite === effect || prerequisite.requires) issue('requires must refer to a different independent effect; no chains or cycles');
        const selfOnly = ability.targeting.length === 1 && ability.targeting[0] === 'self' && !activation.trigger;
        const recipient = (value: string) => selfOnly && value === 'target' ? 'self' : value;
        if (prerequisite && recipient(effect.recipient) !== 'self' && recipient(effect.recipient) !== recipient(prerequisite.recipient)) issue('dependent effects share the prerequisite recipient, or affect self once');
      }
    }
  });
}
export const ActionSchema = abilitySchema(EffectSchema, false);
export const PassiveSchema = abilitySchema(EffectSchema, true);
export const ActionTemplateSchema = abilitySchema(EffectTemplateSchema, false);
export const PassiveTemplateSchema = abilitySchema(EffectTemplateSchema, true);
export type Ability = z.infer<typeof ActionSchema>;
export type AbilityTemplate = z.infer<typeof ActionTemplateSchema>;
export const SignatureSchema = z.strictObject({ type: z.enum(['action', 'passive']), key: c.Key });

/** Comparison preserves dependency semantics while ignoring IDs, prose, output and array order. */
export function abilityIdentity(ability: AbilityTemplate | Ability): string {
  const selectsSelf = ability.targeting.length === 1 && ability.targeting[0] === 'self' && !ability.activation.trigger;
  const effectFacts = (effect: AbilityTemplate['effects'][number]) => {
    const { key: _key, requires: _requires, ...facts } = effect;
    if ('intensity' in facts) delete facts.intensity;
    if (selectsSelf && facts.recipient === 'target') facts.recipient = 'self';
    return facts;
  };
  const { key: _key, name: _name, description: _description, effects, ...facts } = ability;
  const spatial = facts.spatial.area && selectsSelf && facts.spatial.area.anchor === 'target'
    ? { ...facts.spatial, area: { ...facts.spatial.area, anchor: 'self' } } : facts.spatial;
  // Dependencies form depth-one trees. Keep each prerequisite with its dependents:
  // two outcomes sharing one success are not equivalent to two independent successes.
  const roots = effects.filter(effect => !effect.requires).map(effect => ({
    effect: effectFacts(effect),
    dependents: effects.filter(child => child.requires === effect.key).map(effectFacts).map(stable).sort(),
  }));
  const invalid = effects.filter(effect => effect.requires && !effects.some(parent => parent.key === effect.requires && !parent.requires))
    .map(effect => ({ effect: effectFacts(effect), invalidDependency: effect.requires }));
  return stable({ ...facts, spatial, targeting: [...facts.targeting].sort(), effects: [...roots, ...invalid].map(stable).sort() });
}
export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).sort().join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
