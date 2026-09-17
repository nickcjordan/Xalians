import { describe, expect, it } from 'vitest';
import { AbilityTemplateSchema, AbilityPoolSchema, AbilityPatternSchema, validateAbilityPool } from '../schema/ability.ts';
import { historicalCategory } from '../abilityCompatibility.ts';
import bundle from '../../json/speciesRecords.json';
import patternData from '../../json/abilityPatterns.json';

const example = () => JSON.parse(JSON.stringify(bundle.records[0].actions[0]));
const patterns = new Map(patternData.patterns.map(p => [p.key, AbilityPatternSchema.parse(p)]));

describe('structured abilities', () => {
  it('allows the same delivery to restore, harm, or carry multiple effects', () => {
    const base = example();
    const restore = { kind: 'restore', recipient: 'target', aspect: 'integrity', persistence: 'resolved', emphasis: 'primary', onset: 'instant', likelihood: 'consistent' };
    const protect = { kind: 'protect', recipient: 'target', method: 'barrier', against: 'harm', persistence: 'lingering', duration: 'brief', emphasis: 'primary', onset: 'gradual', likelihood: 'consistent' };
    for (const effects of [[restore], [protect], [restore, {...protect, emphasis:'secondary'}]]) {
      expect(AbilityTemplateSchema.safeParse({ ...base, effects }).success).toBe(true);
    }
  });

  it('separates the signature from standard options and rejects invented dependencies', () => {
    const pool = JSON.parse(JSON.stringify(bundle.records[0].actionPool));
    pool.sets[0].options[0].requiresAbility = 'another-random-roll';
    expect(AbilityPoolSchema.safeParse(pool).success).toBe(false);
    expect(AbilityTemplateSchema.safeParse({...example(), prominence:'ordinary'}).success).toBe(false);
  });

  it('rejects ambiguous transfers, missing reactive triggers, and misspelled effect fields', () => {
    const base = example();
    expect(AbilityTemplateSchema.safeParse({ ...base, effects: [{ kind: 'transfer', from: 'self', to: 'self', resource: 'water' }] }).success).toBe(false);
    expect(AbilityTemplateSchema.safeParse({ ...base, activation: { mode: 'reactive' } }).success).toBe(false);
    expect(AbilityTemplateSchema.safeParse({ ...base, effects: [{ kind: 'restore', recipient: 'target', aspect: 'integrity', healsPlague: true }] }).success).toBe(false);
    expect(AbilityTemplateSchema.safeParse({ ...base, delivery: { ...base.delivery, mode: 'self' }, targeting: { relation: 'other', subjects: ['creature'] } }).success).toBe(false);
  });

  it('rejects absent patterns before generation', () => {
    const t = bundle.records[0];
    const pool = AbilityPoolSchema.parse(t.actionPool);
    pool.sets[0].options[0].pattern = 'missing-pattern';
    expect(() => validateAbilityPool(pool, patterns, t.instruments, [t.element], example())).toThrow('Unknown ability pattern');
  });

  it('never silently converts new support or compound effects to legacy damage', () => {
    const base = example();
    expect(() => historicalCategory({ ...base, effects: [{ kind: 'enhance', recipient: 'target', aspect: 'reactions' }] })).toThrow();
    expect(() => historicalCategory({ ...base, effects: [...base.effects, ...base.effects] })).toThrow();
  });
});
