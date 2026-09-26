import { expect, it } from 'vitest';
import source from '../../../../packages/content/src/creature/fixtures/support-species.json';
import { CreatureRecordSchema } from '@xalians/content/creature';
import { createCreatureCatalog } from './prototypeCreature.ts';

const options = { origin: 'saiphus', serial: 1, generatedAt: '2026-09-25T12:00:00.000Z', profile: 'full' as const };

it('generates a valid prototype record without version or release metadata', () => {
  const catalog = createCreatureCatalog([source]);
  const creature = catalog.generateXalian(source.key, 'prototype-seed', options);
  expect(CreatureRecordSchema.parse(creature)).toEqual(creature);
  expect(Object.keys(creature.provenance).sort()).toEqual(['generatedAt', 'origin', 'profile', 'seed', 'serial']);
  expect(catalog.generateXalian(source.key, 'prototype-seed', options)).toEqual(creature);
});

it('accepts a new species through data alone', () => {
  const { schemaVersion: _legacyVersion, ...unversionedSource } = source;
  const another = { ...unversionedSource, key: 'future-species', name: 'Future Species' };
  const catalog = createCreatureCatalog([source, another]);
  expect(catalog.getSpeciesTemplates().map(species => species.key)).toEqual([source.key, another.key]);
  expect(catalog.generateXalian(another.key, 'new-seed', options).species).toBe(another.key);
});
