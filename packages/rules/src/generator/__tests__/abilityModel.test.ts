import {recordCapabilities,recordActions} from '@xalians/content/ability-compatibility';
import { expect, test } from 'vitest';
import { generateXalian, getSpeciesTemplates } from '../index.ts';
import { XalianRecordV4Schema, SpeciesTemplateSchema } from '@xalians/content/schema';
import { prepareAbilityPool } from '../generate.ts';
import catalog from '@xalians/content/abilityCatalog.json';
import type { AbilityCatalog } from '../types.ts';

test('all species produce one signature and independently rolled standard abilities', () => {
  for (const t of getSpeciesTemplates()) {
    const record = generateXalian(t, 'ability-model-audit');
    expect(XalianRecordV4Schema.safeParse(record).success).toBe(true);
    expect(recordCapabilities(record).filter(a => a.role === 'signature')).toHaveLength(1);
    for (const a of recordCapabilities(record)) {
      expect(a).not.toHaveProperty('action');
      expect(a).not.toHaveProperty('prominence');
      expect(a).not.toHaveProperty('origin');
    }
    expect(SpeciesTemplateSchema.safeParse({ ...t, signature: undefined }).success).toBe(false);
  }
});

test('a passive signature stays outside selectable actions', () => {
 const t=structuredClone(getSpeciesTemplates().find(t=>t.key==='bioflim')!);
 t.actionPool={count:[0,0],sets:[{key:'none',weight:1,options:[]}]};
 const first=generateXalian(t,'passive');
 expect(first.actions).toHaveLength(0); expect(recordActions(first)).toHaveLength(0);
 expect(first.passives).toHaveLength(1); expect(first.signature.kind).toBe('passive');
 first.passives[0].effects.pop();
 expect(generateXalian(t,'passive').passives[0].effects).toHaveLength(1);
});

test('sets cannot rely on secondary affinity to fill their draws', () => {
  const t = structuredClone(getSpeciesTemplates()[0]);
  t.actionPool.sets[0].options.forEach(a => { a.media = a.media.filter(m => m !== t.element); });
  expect(() => prepareAbilityPool(t, catalog as unknown as AbilityCatalog)).toThrow('primary-medium options');
});

test('draws stay inside one compatible set and never repeat an option through another medium', () => {
  const t = structuredClone(getSpeciesTemplates()[0]);
  const options = t.actionPool.sets[0].options.filter(o => o.media.includes(t.element)).slice(0, 3);
  t.actionPool.count = [3, 3];
  t.actionPool.sets = ['first', 'second'].map(key => ({ key, weight: 1, options: structuredClone(options) }));
  const observed = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const record = generateXalian(t, String(seed));
    const standard = recordCapabilities(record).filter(a => a.role === 'standard');
    const set = standard[0].key.includes('-standard-first-') ? 'first' : 'second';
    observed.add(set);
    expect(standard).toHaveLength(3);
    expect(standard.every(a => a.key.includes('-standard-' + set + '-'))).toBe(true);
    for (const option of options) expect(standard.filter(a => a.key.includes('-' + option.key + '-'))).toHaveLength(1);
  }
  expect(observed.size).toBe(2);
});

test('compiled pools are reused and insufficient naming capacity fails before drawing', () => {
  const t = getSpeciesTemplates()[0];
  const frozenCatalog = Object.freeze(structuredClone(catalog)) as unknown as AbilityCatalog;
  expect(prepareAbilityPool(t, frozenCatalog)).toBe(prepareAbilityPool(t, frozenCatalog));
  expect(() => prepareAbilityPool(t, { elements: {}, neutral: {} } as AbilityCatalog)).toThrow('Insufficient distinct names');
});
