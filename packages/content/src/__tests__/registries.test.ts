import { describe, expect, it } from 'vitest';
import { RegistriesSchema } from '../schema/registries.ts';
import registries from '../../json/registries.json' with { type: 'json' };

describe('registries.json', () => {
  it('validates against RegistriesSchema', () => {
    const result = RegistriesSchema.safeParse(registries);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
  });

  it('keys are unique within every vocabulary', () => {
    const lists = [
      registries.attributes, registries.elements, registries.capabilities, registries.senses,
      registries.anatomy, registries.channels, ...Object.values(registries.physiology),
    ];
    for (const list of lists) {
      const keys = list.map((entry: { key: string }) => entry.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('no anatomy key doubles as a channel key, so an instrument resolves one way', () => {
    const channels = new Set(registries.channels.map((c: { key: string }) => c.key));
    expect(registries.anatomy.filter((a: { key: string }) => channels.has(a.key))).toEqual([]);
  });
});
