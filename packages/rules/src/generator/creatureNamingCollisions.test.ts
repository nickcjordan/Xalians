import { expect, it } from 'vitest';
import { getSpeciesTemplates, generateXalian } from './canonicalCreatureRelease.ts';

/**
 * A structural parenthetical is naming's escape hatch, not its main path, and two of a
 * creature's four actions should never read as the same move. This measures both over
 * the canonical roster so an author sees the rate before a species is ratified.
 */
const SEEDS = 120;
const LIMIT = 2;

export interface CollisionReading { key: string; parenthetical: number; collision: number }

export function measureCollisions(seeds = SEEDS): CollisionReading[] {
  return getSpeciesTemplates().map(species => {
    const homePlanet = (species as unknown as { homePlanet: string }).homePlanet;
    let ordinary = 0, parenthetical = 0, collided = 0;
    for (let index = 0; index < seeds; index++) {
      const record = generateXalian(species.key, `${species.key}:${index}`, {
        origin: homePlanet, serial: index + 1, profile: 'full', generatedAt: '2026-09-22T00:00:00.000Z',
      } as never);
      // Guaranteed actions keep their authored names; only generated slots are named here.
      const generated = record.actions.filter(action => /(^|-)ordinary-\d+$/.test(action.key));
      ordinary += generated.length;
      parenthetical += generated.filter(action => action.name.includes(' (')).length;
      // Tier two words are part of the name: "Quick Punch" and "Punch" are distinct.
      // Only the structural parenthetical is stripped before comparing.
      const bases = generated.map(action => action.name.split(' (')[0].toLowerCase());
      if (new Set(bases).size !== bases.length) collided++;
    }
    return { key: species.key, parenthetical: ordinary ? parenthetical / ordinary * 100 : 0, collision: collided / seeds * 100 };
  });
}

it('keeps structural parentheticals and shared base names rare on every canonical species', () => {
  const readings = measureCollisions();
  const pad = (value: string, width: number) => value.padEnd(width);
  const table = [`${pad('species', 14)} parenthetical%  collision%`,
    ...readings.map(r => `${pad(r.key, 14)} ${pad(r.parenthetical.toFixed(1), 15)} ${r.collision.toFixed(1)}`)].join('\n');
  console.log(`\nOrdinary action naming over ${SEEDS} seeds per species\n${table}\n`);
  const over = readings.filter(r => r.parenthetical > LIMIT || r.collision > LIMIT);
  expect(over.map(r => `${r.key} paren ${r.parenthetical.toFixed(1)}% collision ${r.collision.toFixed(1)}%`)).toEqual([]);
});
