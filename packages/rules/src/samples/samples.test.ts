import { describe, expect, it } from 'vitest';
import { ActionSchema, CreatureRecordSchema, ElementKeySchema, Status } from '@xalians/content/creature';
import { effectGrid, INTENSITY_POINTS, sampleAxes, sampleCreatures, sampleSpecies, sampleSquads, sampleTemplates, SAMPLE_BANDS, SAMPLE_PROFILES, SAMPLE_ROLES } from './index.ts';

describe('effect grid', () => {
  const grid = effectGrid();
  it('has unique short labels', () => {
    expect(new Set(grid.map(entry => entry.label)).size).toBe(grid.length);
    for (const { label } of grid) expect(label.length).toBeLessThanOrEqual(60);
  });
  it('passes ActionSchema for every action', () => {
    const failures = grid.flatMap(({ label, action }) => {
      const result = ActionSchema.safeParse(action);
      return result.success ? [] : [`${label}: ${result.error.issues.map(issue => issue.message).join('; ')}`];
    });
    expect(failures).toEqual([]);
  });
  it('covers every effect type, status, element, recipient, likelihood, timing pair and intensity point', () => {
    const effects = grid.flatMap(({ action }) => action.effects.map(effect => ({ effect, action })));
    const types = new Set(effects.map(({ effect }) => effect.type));
    expect([...types].sort()).toEqual(['displace', 'harm', 'protect', 'remove', 'restore', 'status']);
    for (const status of Status.options) expect(effects.some(({ effect }) => 'status' in effect && effect.status === status), status).toBe(true);
    for (const element of ElementKeySchema.options) {
      expect(effects.some(({ effect, action }) => effect.type === 'harm' && effect.mechanism === 'elemental' && action.element === element), element).toBe(true);
    }
    for (const type of types) for (const recipient of ['self', 'target', 'area']) {
      expect(effects.some(({ effect }) => effect.type === type && effect.recipient === recipient), `${type}/${recipient}`).toBe(true);
    }
    for (const mechanism of ['impact', 'cutting', 'piercing', 'compression', 'elemental']) {
      expect(effects.some(({ effect }) => effect.type === 'harm' && effect.mechanism === mechanism), mechanism).toBe(true);
    }
    for (const direction of ['toward', 'away']) expect(effects.some(({ effect }) => effect.type === 'displace' && effect.direction === direction)).toBe(true);
    for (const likelihood of ['consistent', 'likely', 'occasional']) expect(effects.some(({ effect }) => effect.likelihood === likelihood)).toBe(true);
    for (const preparation of ['immediate', 'brief', 'prolonged']) for (const recovery of ['repeatable', 'brief', 'prolonged']) {
      expect(grid.some(({ action }) => action.timing?.preparation === preparation && action.timing?.recovery === recovery), `${preparation}/${recovery}`).toBe(true);
    }
    for (const point of INTENSITY_POINTS) {
      expect(effects.some(({ effect }) => 'intensity' in effect && effect.intensity === point), `i${point}`).toBe(true);
      expect(grid.some(({ label }) => label.startsWith('harm/elemental/') && label.includes('/area/') && label.endsWith(`i${point}`)), `area i${point}`).toBe(true);
    }
    for (const mode of ['contact', 'projectile', 'stream', 'pulse', 'field', 'signal', 'self']) expect(grid.some(({ action }) => action.delivery.mode === mode), mode).toBe(true);
  });
  it('includes the paired shapes games care about', () => {
    expect(grid.some(({ action }) => action.effects.some(e => e.type === 'restore' && e.recipient === 'self' && e.requires) && action.effects.some(e => e.type === 'harm'))).toBe(true);
    expect(grid.some(({ action }) => action.effects.some(e => e.type === 'harm') && action.effects.some(e => e.type === 'status'))).toBe(true);
    expect(grid.some(({ action }) => action.targeting.includes('other') && action.effects.some(e => e.type === 'status' && e.status === 'stimulated'))).toBe(true);
  });
});

describe('sample species', () => {
  it('compiles every template', () => {
    expect(sampleSpecies().length).toBe(sampleTemplates().length);
    for (const entry of sampleSpecies()) expect(entry.acts.distinct, entry.species.key).toBeGreaterThanOrEqual(4);
  });
  it('uses sample-prefixed unique keys and a non-canonical note', () => {
    const keys = sampleTemplates().map(entry => entry.template.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const entry of sampleTemplates()) {
      expect(entry.template.key.startsWith('sample-')).toBe(true);
      expect(entry.template.nameOrigin).toMatch(/Non-canonical/);
    }
  });
  it('covers every element, role, attribute profile and output band', () => {
    const axes = sampleTemplates().map(entry => entry.axes);
    for (const element of ElementKeySchema.options) expect(axes.some(a => a.element === element), element).toBe(true);
    for (const role of SAMPLE_ROLES) expect(axes.some(a => a.role === role), role).toBe(true);
    for (const profile of SAMPLE_PROFILES) expect(axes.some(a => a.profile === profile), profile).toBe(true);
    for (const band of SAMPLE_BANDS) expect(axes.some(a => a.band === band), String(band)).toBe(true);
    expect(sampleTemplates().length).toBeGreaterThanOrEqual(40);
    expect(sampleTemplates().length).toBeLessThanOrEqual(70);
  });
  it('gives every role at least three elements and every element at least three roles', () => {
    const axes = sampleTemplates().map(entry => entry.axes);
    for (const role of SAMPLE_ROLES) expect(new Set(axes.filter(a => a.role === role).map(a => a.element)).size).toBeGreaterThanOrEqual(3);
    for (const element of ElementKeySchema.options) expect(new Set(axes.filter(a => a.element === element).map(a => a.role)).size).toBeGreaterThanOrEqual(3);
  });
  it('spans ratings near 10, near 100 and above the principal band of 100', () => {
    const attributes = sampleTemplates().flatMap(entry => Object.values(entry.template.attributes as Record<string, [number, number]>));
    expect(attributes.some(([low, high]) => low <= 12 && high <= 12)).toBe(true);
    expect(attributes.some(([low, high]) => low >= 95 && high <= 105)).toBe(true);
    expect(sampleTemplates().some(entry => entry.axes.band > 100)).toBe(true);
  });
});

describe('sample creatures', () => {
  it('generates records that pass CreatureRecordSchema, three per species', () => {
    const records = sampleCreatures(3);
    expect(records.length).toBe(sampleTemplates().length * 3);
    const failures = records.flatMap(record => {
      const result = CreatureRecordSchema.safeParse(record);
      return result.success ? [] : [`${record.species}: ${result.error.issues[0]?.message}`];
    });
    expect(failures).toEqual([]);
    expect(new Set(records.map(record => record.id)).size).toBe(records.length);
  });
  it('is deterministic for the same seed', () => {
    const first = sampleCreatures(2);
    expect(sampleCreatures(2)).toEqual(first);
    // A different cache slot regenerates from the same seeds and must agree.
    const wider = sampleCreatures(3);
    for (const record of first) {
      expect(wider.find(other => other.provenance.seed === record.provenance.seed)?.actions).toEqual(record.actions);
    }
  });
  it('guarantees each creature its signature action', () => {
    const axes = sampleAxes();
    for (const record of sampleCreatures(3)) {
      expect(record.actions.some(action => action.key === record.signature.key), axes.get(record.species)?.role).toBe(true);
    }
  });
  it('deals deterministic squads of four distinct creatures', () => {
    const squads = sampleSquads(5, 'seed');
    expect(sampleSquads(5, 'seed')).toEqual(squads);
    expect(sampleSquads(5, 'other')).not.toEqual(squads);
    for (const squad of squads) {
      expect(squad.length).toBe(4);
      expect(new Set(squad.map(record => record.id)).size).toBe(4);
    }
  });
});
