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

  it('instrumentActions is keyed by exactly the anatomy + channel key union', () => {
    const anatomyKeys = registries.anatomy.map((a: { key: string }) => a.key);
    const channelKeys = registries.channels.map((c: { key: string }) => c.key);
    const instrumentKeys = new Set([...anatomyKeys, ...channelKeys]);
    const iaKeys = Object.keys(registries.instrumentActions);
    expect(iaKeys.sort()).toEqual([...instrumentKeys].sort());
  });

  it('every archetype favors exactly two attributes, except balanced which favors none', () => {
    const attributeKeys = new Set(registries.attributes.map((a: { key: string }) => a.key));
    for (const archetype of registries.archetypes) {
      expect(archetype.favors.length).toBe(archetype.key === 'balanced' ? 0 : 2);
      for (const favored of archetype.favors) {
        expect(attributeKeys.has(favored)).toBe(true);
      }
    }
  });
});
