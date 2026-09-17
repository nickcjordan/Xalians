import { expect, test } from 'vitest';
import { ActionTemplateSchema, PassiveTemplateSchema } from '../schema/ability.ts';
import { matchingStatuses, STATUS_CATALOG, STATUS_KEYS } from '../schema/status.ts';
import examples from './fixtures/capabilities.json';

test('the five worked examples conform to the action/passive contract', () => {
  examples.actions.forEach(a => expect(ActionTemplateSchema.safeParse(a).success).toBe(true));
  examples.passives.forEach(a => expect(PassiveTemplateSchema.safeParse(a).success).toBe(true));
  expect(Object.keys(STATUS_CATALOG)).toEqual([...STATUS_KEYS]);
});
test('cooling removes all and only compatible applications, without relying on status name', () => {
  const statuses = [
    { status: 'burning', removable: ['cooling', 'smothering'] as const },
    { status: 'overheated', removable: ['cooling'] as const },
    { status: 'poisoned', removable: ['detoxifying'] as const },
    { status: 'shielded', removable: ['disrupting'] as const },
  ];
  expect(matchingStatuses(statuses, ['cooling']).map(s => s.status)).toEqual(['burning', 'overheated']);
  expect(matchingStatuses(statuses, [])).toEqual([]);
  expect(statuses).toHaveLength(4); // matching does not mutate encounter state or damage
});
test('instigator cannot be used without an event trigger', () => {
  const reflex = examples.passives[1];
  expect(ActionTemplateSchema.safeParse({...reflex, activation:{operation:'discrete'}}).success).toBe(false);
  expect(PassiveTemplateSchema.safeParse({...reflex, activation:{operation:'discrete'}}).success).toBe(false);
});
test('a body-centered aura has one extent and no use timing', () => {
  const aura = examples.passives[0];
  expect(PassiveTemplateSchema.safeParse({...aura, spatial:{...aura.spatial, range:'short'}}).success).toBe(false);
  expect(PassiveTemplateSchema.safeParse({...aura, timing:{preparation:'brief',recovery:'brief'}}).success).toBe(false);
});
test('effect scope cannot broaden recipients and exactly one effect is primary', () => {
  const repair = examples.actions[1];
  expect(ActionTemplateSchema.safeParse({...repair, effects:repair.effects.map(e=>({...e,emphasis:'primary'}))}).success).toBe(false);
  expect(ActionTemplateSchema.safeParse({...repair, effects:repair.effects.map(e=>({...e,compatibility:{composition:['metal']}}))}).success).toBe(false);
});
test('lingering needs duration; sustained needs ongoing operation; status parameters are bounded', () => {
  const fire = examples.actions[0];
  const status = {...fire.effects[1],duration:undefined};
  expect(ActionTemplateSchema.safeParse({...fire,effects:[fire.effects[0],status]}).success).toBe(false);
  expect(ActionTemplateSchema.safeParse({...fire,effects:[fire.effects[0],{...status,persistence:'sustained'}]}).success).toBe(false);
  expect(ActionTemplateSchema.safeParse({...fire,effects:[fire.effects[0],{...fire.effects[1],status:'resistant'}]}).success).toBe(false);
});

test('effect subjects inherit the narrower capability compatibility boundary', () => {
  const original = examples.actions[0];
  const fire = {...original,targeting:{...original.targeting,compatibility:{subjects:['creature']}}};
  const effects = fire.effects.map(e => ({...e, compatibility:{subjects:['object']}}));
  expect(ActionTemplateSchema.safeParse({...fire,effects}).success).toBe(false);
  expect(ActionTemplateSchema.safeParse(fire).success).toBe(true);
});

test('capability compatibility cannot add subjects outside its targeting', () => {
  const fire = examples.actions[0];
  const targeting = {...fire.targeting, subjects:['creature'], compatibility:{subjects:['object']}};
  expect(ActionTemplateSchema.safeParse({...fire,targeting}).success).toBe(false);
});

test('self-only targeting must admit a creature and cannot transfer to itself', () => {
  const repair = examples.actions[1];
  const self = {...repair, spatial:{selectivity:'selective'}, delivery:{mode:'self',approach:'stationary'}, targeting:{relation:'self',subjects:['creature']}};
  expect(ActionTemplateSchema.safeParse(self).success).toBe(true);
  expect(ActionTemplateSchema.safeParse({...self,targeting:{relation:'self',subjects:['object']}}).success).toBe(false);
  const effect = {kind:'transfer',from:'target',to:'self',resource:'energy',recipient:'self',emphasis:'primary',onset:'instant',persistence:'resolved',likelihood:'consistent'};
  expect(ActionTemplateSchema.safeParse({...self,effects:[effect]}).success).toBe(false);
  expect(ActionTemplateSchema.safeParse({...self,spatial:{range:'contact',selectivity:'selective'},delivery:{mode:'contact',approach:'stationary'},targeting:{relation:'other',subjects:['creature']},effects:[effect]}).success).toBe(true);
});
