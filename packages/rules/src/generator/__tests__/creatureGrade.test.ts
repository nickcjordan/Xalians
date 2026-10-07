import { describe, expect, it } from 'vitest';
import { CreatureRecordSchema, type CreatureRecord } from '@xalians/content/creature';
import { generateXalian, getSpeciesTemplates } from '../canonicalCreatureRelease.ts';
import { CREATURE_GRADE_WEIGHTS, gradeCreature, scoreCreature } from '../creatureGrade.ts';

const options = (homePlanet: string) => ({ generatedAt: '2026-10-06T00:00:00.000Z', origin: homePlanet, serial: 1, profile: 'full' as const });

function sample(key = getSpeciesTemplates()[0].key, seed = 'grade-test'): CreatureRecord {
  const species = getSpeciesTemplates().find((s) => s.key === key)!;
  return generateXalian(key, seed, options(species.homePlanet));
}

describe('creatureGrade (v5)', () => {
  it('grades a record from every species in the v5 roster against the bundled calibration', () => {
    const species = getSpeciesTemplates();
    expect(species).toHaveLength(33);
    for (const s of species) {
      const grade = gradeCreature(sample(s.key));
      expect(grade.score).toBeGreaterThanOrEqual(0);
      expect(grade.percentile).not.toBeNull();
      expect(grade.percentile!).toBeGreaterThanOrEqual(0);
      expect(grade.percentile!).toBeLessThanOrEqual(100);
      expect(['standard', 'select', 'prime', 'apex']).toContain(grade.tier);
    }
  });

  it('is a lens: grading never changes the record', () => {
    const record = sample();
    const before = JSON.stringify(record);
    gradeCreature(record);
    expect(JSON.stringify(record)).toBe(before);
    expect(CreatureRecordSchema.safeParse(record).success).toBe(true);
  });

  it('scores finish as log2(1 / odds), and standard as nothing', () => {
    const record = sample();
    expect(scoreCreature({ ...record, appearance: { finish: 'standard' } }).components.finish).toBe(0);
    expect(scoreCreature({ ...record, appearance: { finish: 'eclipse' } }).components.finish).toBeCloseTo(Math.log2(4000) * CREATURE_GRADE_WEIGHTS.finishScale);
  });

  it('has no trait or affinity component', () => {
    expect(Object.keys(scoreCreature(sample()).components).sort()).toEqual(['abilities', 'attributes', 'finish', 'size']);
  });

  it('returns no percentile or tier without a calibration', () => {
    const grade = gradeCreature(sample(), null);
    expect(grade.percentile).toBeNull();
    expect(grade.tier).toBeNull();
  });

  it('drops ability rolls that no longer replay instead of grading them on the wrong band', () => {
    // Find a record whose abilities score, then perturb every intensity so none replays.
    let record: CreatureRecord | undefined;
    for (let i = 0; i < 200 && !record; i++) {
      const candidate = sample(getSpeciesTemplates()[i % 33].key, `grade-replay-${i}`);
      if (scoreCreature(candidate).components.abilities > 0) record = candidate;
    }
    expect(record).toBeDefined();
    const bump = (abilities: CreatureRecord['actions']) => abilities.map((a) => ({
      ...a, effects: a.effects.map((e) => ('intensity' in e && typeof e.intensity === 'number' ? { ...e, intensity: e.intensity + 100000 } : e)),
    })) as CreatureRecord['actions'];
    const drifted = { ...record!, actions: bump(record!.actions), passives: bump(record!.passives) };
    expect(scoreCreature(drifted).components.abilities).toBe(0);
  });
});
