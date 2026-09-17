import { z } from 'zod';
import { ActionKeySchema, CompositionKeySchema, CorporealityKeySchema, ElementKeySchema, InstrumentKeySchema } from './registries.ts';
import { AbilityPoolSchema } from './legacyAbility.ts';
import { StatusKeySchema, RemovalMethodSchema, FunctionSchema, ExposureSchema } from './status.ts';
export { AbilityPoolSchema } from './legacyAbility.ts';
export const CompatibilitySchema = z.strictObject({
  subjects:z.array(z.enum(['creature','object','environment'])).min(1).optional(),
  composition: z.array(CompositionKeySchema).min(1).optional(),
  corporeality: z.array(CorporealityKeySchema).min(1).optional(),
  reception: z.enum(['visual','auditory','mental']).optional(),
});
const timing = z.strictObject({preparation:z.enum(['immediate','brief','prolonged']), recovery:z.enum(['repeatable','brief','prolonged'])});
export const ActivationSchema = z.strictObject({operation:z.enum(['discrete','ongoing']), trigger:z.enum(['contact','incoming-harm','ally-distress']).optional()});
export const DeliverySchema = z.strictObject({mode:z.enum(['contact','projectile','stream','pulse','field','signal','self']), approach:z.enum(['stationary','closing'])});
export const SpatialSchema = z.strictObject({
  range:z.enum(['contact','short','medium','long']).optional(),
  area:z.strictObject({shape:z.enum(['line','cone','radial','sweep']), extent:z.enum(['small','medium','large']), anchor:z.enum(['creature','point','impact'])}).optional(),
  selectivity:z.enum(['selective','indiscriminate']),
});
export const TargetingSchema = z.strictObject({relation:z.enum(['self','other','self-or-other']), subjects:z.array(z.enum(['creature','object','environment'])).min(1), compatibility:CompatibilitySchema.optional()});
const common = {
  recipient:z.enum(['target','self','area','instigator']), emphasis:z.enum(['primary','secondary']),
  onset:z.enum(['instant','gradual']), persistence:z.enum(['resolved','sustained','lingering']),
  duration:z.enum(['brief','prolonged']).optional(), likelihood:z.enum(['consistent','likely','occasional']),
  compatibility:CompatibilitySchema.optional(),
};
export const EffectSchema=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('harm'),...common,mechanism:z.enum(['impact','cutting','piercing','compression','elemental'])}),
 z.strictObject({kind:z.literal('restore'),...common,aspect:z.enum(['integrity','composure','reserve'])}),
 z.strictObject({kind:z.literal('protect'),...common,method:z.enum(['barrier','deflection','bracing','resistance']),against:z.enum(['harm','impairment'])}),
 z.strictObject({kind:z.literal('enhance'),...common,aspect:FunctionSchema}),
 z.strictObject({kind:z.literal('suppress'),...common,aspect:FunctionSchema}),
 z.strictObject({kind:z.literal('restrain'),...common,faculty:z.enum(['movement','attention'])}),
 z.strictObject({kind:z.literal('displace'),...common,direction:z.enum(['away','toward','redirect'])}),
 z.strictObject({kind:z.literal('transfer'),...common,from:z.enum(['target','self']),to:z.enum(['target','self']),resource:z.enum(['vitality','water','heat','charge','energy'])}),
 z.strictObject({kind:z.literal('reveal'),...common,aspect:z.enum(['location','damage','intent'])}),
 z.strictObject({kind:z.literal('status'),...common,status:StatusKeySchema,removable:z.array(RemovalMethodSchema),exposure:ExposureSchema.optional(),function:FunctionSchema.optional()}),
 z.strictObject({kind:z.literal('remove'),...common,methods:z.array(RemovalMethodSchema).min(1)}),
]);
const facts = {
  key:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name:z.string().min(1), instrument:InstrumentKeySchema, medium:ElementKeySchema,
  activation:ActivationSchema, timing:timing.optional(), delivery:DeliverySchema, spatial:SpatialSchema, targeting:TargetingSchema,
  effects:z.array(EffectSchema).min(1), description:z.string().min(1),
};
function check(value:any, ctx:z.RefinementCtx) {
  const issue=(message:string)=>ctx.addIssue({code:'custom',message});
  if(value.effects.filter((e:any)=>e.emphasis==='primary').length!==1) issue('Exactly one primary effect is required');
  const centered=value.spatial.area?.anchor==='creature' && value.spatial.area?.shape==='radial';
  if((centered || value.targeting.relation==='self') && value.spatial.range) issue('Self-only and body-centered capabilities have no remote range');
  if(!centered && value.targeting.relation!=='self' && !value.spatial.range) issue('External delivery requires range');
  if(value.delivery.mode==='self' && value.targeting.relation!=='self') issue('Self delivery requires self targeting');
  for(const e of value.effects) {
    if(e.recipient==='instigator' && !value.activation.trigger) issue('Instigator requires a trigger');
    if(e.recipient==='area' && !value.spatial.area) issue('Area recipient requires an area');
    if(e.persistence==='lingering' ? !e.duration : !!e.duration) issue('Duration is required only for lingering effects');
    if(e.persistence==='sustained' && value.activation.operation!=='ongoing') issue('Sustained effects require ongoing operation');
    if(e.kind==='transfer' && e.from===e.to) issue('Transfer endpoints must differ');
    if(e.kind==='status') {
      if(e.persistence==='resolved') issue('Statuses require sustained or lingering persistence');
      if((e.status==='resistant') !== !!e.exposure) issue('Only resistant requires exposure');
      if((e.status==='stimulated') !== !!e.function) issue('Only stimulated requires function');
    }
    if(e.compatibility?.subjects?.some((s:string)=>!value.targeting.subjects.includes(s))) issue('Effect subjects cannot broaden targeting');
    for(const k of ['composition','corporeality'] as const) {
      const parent=value.targeting.compatibility?.[k];
      if(parent && e.compatibility?.[k]?.some((v:string)=>!parent.includes(v))) issue('Effect compatibility cannot broaden targeting');
    }
    const reception=value.targeting.compatibility?.reception;
    if(reception && e.compatibility?.reception && reception!==e.compatibility.reception) issue('Conflicting reception requirements');
  }
}
const band=z.tuple([z.number().min(1).max(100),z.number().min(1).max(100)]).refine(([a,b])=>a<=b);
const template=z.strictObject({...facts,intensity:band});
const resolved=z.strictObject({...facts,intensity:z.number().min(1).max(100)});
const actionCheck=(v:any,c:z.RefinementCtx)=>{check(v,c);if(!v.timing)c.addIssue({code:'custom',message:'Actions require timing'});};
const passiveCheck=(v:any,c:z.RefinementCtx)=>{check(v,c);if(v.activation.operation==='discrete'&&!v.activation.trigger)c.addIssue({code:'custom',message:'Discrete passives require a trigger'});if(v.activation.operation==='discrete'&&!v.timing)c.addIssue({code:'custom',message:'Triggered discrete passives require timing'});if(v.activation.operation==='ongoing'&&v.timing)c.addIssue({code:'custom',message:'Ongoing passives omit use timing'});};
export const ActionTemplateSchema=template.superRefine(actionCheck);
export const PassiveTemplateSchema=template.superRefine(passiveCheck);
export const ActionSchema=resolved.superRefine(actionCheck);
export const PassiveSchema=resolved.superRefine(passiveCheck);
export const AbilityTemplateSchema=ActionTemplateSchema;
export const AbilitySchema=ActionSchema;
export const SignatureSchema=z.strictObject({kind:z.enum(['action','passive']),key:z.string().min(1)});
export function checkSignature(v:any,c:z.RefinementCtx) {
  const all=[...v.actions,...v.passives];
  if(new Set(all.map((a:any)=>a.key)).size!==all.length)c.addIssue({code:'custom',message:'Capability keys must be unique'});
  const entries=v.signature.kind==='action'?v.actions:v.passives;
  if(!entries.some((a:any)=>a.key===v.signature.key))c.addIssue({code:'custom',message:'Signature must reference a guaranteed capability'});
  if('actionPool' in v && v.actions.some((a:any)=>v.signature.kind!=='action'||a.key!==v.signature.key)) c.addIssue({code:'custom',message:'Only the signature action can be guaranteed; standard actions belong in actionPool'});
}
const {key: _key,name:_name,instrument:_instrument,medium:_medium,...patternFacts}=facts;
export const AbilityPatternSchema=z.strictObject({key:z.string().min(1),nameFamily:ActionKeySchema,...patternFacts}).superRefine(actionCheck);
export type Ability=z.infer<typeof ActionSchema>;
export type AbilityTemplate=z.infer<typeof ActionTemplateSchema>;
export type AbilityPattern=z.infer<typeof AbilityPatternSchema>;
export type AbilityPool=z.infer<typeof AbilityPoolSchema>;
export function validateAbilityPool(pool:AbilityPool, patterns:ReadonlyMap<string,AbilityPattern>, instruments:readonly string[], media:readonly string[], signature?:AbilityTemplate) {
  if(signature&&!media.includes(signature.medium))throw new Error('Unsupported signature medium');
  for(const set of pool.sets){
    for(const o of set.options){
      if(!patterns.has(o.pattern))throw new Error('Unknown ability pattern: '+o.pattern);
      if(!instruments.includes(o.instrument))throw new Error('Undeclared ability-pool instrument: '+o.instrument);
      if(o.media.some(m=>!media.includes(m)))throw new Error('Unsupported ability-pool medium');
    }
    if(set.options.filter(o=>o.media.includes(media[0] as any)).length<pool.count[1])throw new Error('Ability set lacks enough primary-medium options: '+set.key);
  }
}
