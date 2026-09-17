import type { Ability, AbilityTemplate } from './schema/ability.ts';
import type { ActionKey } from './schema/registries.ts';

// Boundary for historical catalog tooling and Reclamation's existing act taxonomy.
// Canonical abilities contain no action key. New effect families must be implemented
// by the consumer explicitly; they must never silently become damaging attacks.
export function historicalCategory(ability: Ability | AbilityTemplate | any): ActionKey {
  if (!ability.effects && ability.action) return ability.action; // genuine 1.x records
  const e = ability.effects?.[0];
  const d = ability.delivery;
  if (!e || !d || ability.effects.length !== 1) throw new Error(`Unsupported ability composition: ${ability.key || ability.name}`);
  if (e.kind === 'restore' && e.aspect === 'integrity') return 'mend';
  if (e.kind === 'protect' && e.against === 'harm') return 'ward';
  if (e.kind === 'restrain') return 'snare';
  if (e.kind === 'suppress' && e.aspect === 'composure') return 'terrorize';
  if (e.kind === 'transfer' && e.from === 'target' && e.to === 'self') return 'drain';
  if (e.kind === 'displace' && e.direction === 'away') return 'shove';
  if (e.kind === 'harm') {
    if (d.mode === 'field') return 'cloud';
    if (d.mode === 'pulse') return 'burst';
    if (d.mode === 'projectile') return 'hurl';
    if (d.mode === 'stream') return (d.shape === 'focused' || (!d.shape && !ability.spatial?.area)) ? 'beam' : 'spray';
    if (e.mechanism === 'cutting') return 'rake';
    if (d.approach === 'closing') return 'ambush';
    if (e.mechanism === 'compression') return 'crush';
    if (d.shape === 'sweep' || ability.spatial?.area?.shape === 'sweep') return 'lash';
    return 'strike';
  }
  throw new Error(`Consumer has no interpretation for ${e.kind}: ${ability.key || ability.name}`);
}

export function definingAbility(template: any) {
  if (template.signature?.key) return [...template.actions,...template.passives].find((a:any)=>a.key===template.signature.key);
  return template.signatureAbility || template.repertoire?.inherent.find((a: any) => a.prominence === 'defining')
    || template.repertoire?.inherent[0] || template.signatureAbility;
}

export function isSignatureAbility(ability: any): boolean {
  if (ability.role) return ability.role === 'signature';
  return ability.prominence ? ability.prominence === 'defining' : ability.signature === true;
}

// Validation of historical prose quotations/cell reservations still needs the old
// spelling. This projection is never persisted or used to generate new abilities.
export function historicalTemplateView(template: any) {
  const a = definingAbility(template);
  let action: ActionKey | undefined;
  try { action = a && historicalCategory(a); } catch { /* new families have no historical reservation */ }
  return { ...template, signatureAbility: a ? { ...a, action } : undefined };
}

// Historical API name retained for older consumers.
export const isDefiningAbility = isSignatureAbility;

import type { StoredXalianRecord, XalianRecord } from './schema/record.ts';
type OldRecord=Exclude<StoredXalianRecord,{actions:unknown}>;
export type DisplayAbility=OldRecord['abilities'][number] | (Ability & {role:'signature'|'standard'});
export function recordActions(record:XalianRecord):Array<Ability & {role:'signature'|'standard'}>;
export function recordActions(record:StoredXalianRecord):DisplayAbility[];
export function recordActions(record:StoredXalianRecord):DisplayAbility[]{
 if('actions' in record)return record.actions.map(a=>({...a,role:record.signature.kind==='action'&&a.key===record.signature.key?'signature':'standard'}));
 return record.abilities.filter(a=>!('activation' in a)||a.activation.mode!=='passive');
}
export function recordPassives(record:XalianRecord):Array<Ability & {role:'signature'|'standard'}>;
export function recordPassives(record:StoredXalianRecord):DisplayAbility[];
export function recordPassives(record:StoredXalianRecord):DisplayAbility[]{
 if('passives' in record)return record.passives.map(a=>({...a,role:record.signature.kind==='passive'&&a.key===record.signature.key?'signature':'standard'}));
 return record.abilities.filter(a=>'activation' in a&&a.activation.mode==='passive');
}
export function recordCapabilities(record:XalianRecord):Array<Ability & {role:'signature'|'standard'}>;
export function recordCapabilities(record:StoredXalianRecord):DisplayAbility[];
export function recordCapabilities(record:StoredXalianRecord):DisplayAbility[]{return [...recordActions(record),...recordPassives(record)];}
