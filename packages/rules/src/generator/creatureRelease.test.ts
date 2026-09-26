import { expect, it } from 'vitest';
import fixture from '../../../content/src/creature/fixtures/support-species.json';
import { CreatureRecordV51Schema } from '@xalians/content/creature';
import { createCreatureRelease } from './creatureRelease.ts';

const options = { origin: 'saiphus', serial: 1, generatedAt: '2026-09-21T12:00:00.000Z', profile: 'full' as const };

it('owns an immutable roster and keeps caller mutations out of subsequent generation', () => {
  const source = structuredClone(fixture);
  const release = createCreatureRelease('test-v5', [source]);
  const first = release.generateXalian(source.key, 'repeat', options);
  expect(CreatureRecordV51Schema.parse(first)).toEqual(first);
  source.actions.length = 0;
  expect(() => { release.getSpeciesTemplates()[0].actions.length = 0; }).toThrow();
  const changed = release.generateXalian(source.key, 'repeat', options);
  changed.actions.length = 0;
  expect(release.generateXalian(source.key, 'repeat', options)).toEqual(first);
});

it('rejects empty and duplicate release rosters', () => {
  expect(() => createCreatureRelease('test-v5', [])).toThrow(/empty/);
  expect(() => createCreatureRelease('test-v5', [fixture, fixture])).toThrow(/unique/);
});

it('requires explicit replay metadata and separates appearance profile from biology', () => {
  const release = createCreatureRelease('test-v5', [fixture]);
  for (const field of ['origin', 'serial', 'generatedAt', 'profile'] as const) {
    expect(() => release.generateXalian(fixture.key, 'seed', { ...options, [field]: undefined })).toThrow();
  }
  expect(() => release.generateXalian(fixture.key, '', options)).toThrow();
  const full = release.generateXalian(fixture.key, 'seed', options);
  const showroom = release.generateXalian(fixture.key, 'seed', { ...options, profile: 'showroom' });
  expect(showroom).toEqual({ ...full, provenance: { ...full.provenance, profile: 'showroom' }, appearance: { finish: 'standard' } });
});
