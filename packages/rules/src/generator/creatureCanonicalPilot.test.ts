import { expect, it } from 'vitest';
import avilily from '../../../../docs/species-templates/v5/avilily.json';
import bioflim from '../../../../docs/species-templates/v5/bioflim.json';
import yetimoth from '../../../../docs/species-templates/v5/yetimoth.json';
import { CreatureDataSchema, abilityIdentity } from '@xalians/content/creature';
import { compileSpecies, generateCreatureDraft } from './creature.ts';

it('constructs the three staged species with guaranteed identity and distinct ordinary actions', () => {
  for (const source of [avilily, bioflim, yetimoth]) {
    const compiled = compileSpecies(source);
    for (let index = 0; index < 80; index++) {
      const seed = `${source.key}:${index}`;
      const creature = generateCreatureDraft(compiled, seed);
      expect(CreatureDataSchema.safeParse(creature).success).toBe(true);
      expect(creature.actions).toHaveLength(4);
      expect(new Set(creature.actions.map(abilityIdentity)).size).toBe(4);
      expect(generateCreatureDraft(compiled, seed)).toEqual(creature);
      if (source.key === 'bioflim') {
        expect(creature.signature.type).toBe('passive');
        expect(creature.passives.some(passive => passive.effects.some(effect => effect.type === 'restore'))).toBe(true);
        expect(creature.actions.some(action => action.key === 'bioflim-acid')).toBe(true);
      }
      if (source.key === 'avilily') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'status' && effect.status === 'paralyzed'))).toBe(true);
      }
      if (source.key === 'yetimoth') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'status' && effect.status === 'shielded'))).toBe(true);
        expect(creature.actions.some(action => action.key === 'yetimoth-encasement' && action.effects.some(effect => effect.type === 'status' && effect.status === 'frozen'))).toBe(true);
      }
    }
  }
});
