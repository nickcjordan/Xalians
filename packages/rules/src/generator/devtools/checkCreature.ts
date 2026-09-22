import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileSpecies, generateCreatureDraft } from '../creature.ts';
import type { CompiledSpecies } from '@xalians/content/creature';

/** What an author needs before ratifying: how often naming falls back to a structural
 * parenthetical, and how often two of the four actions read as the same move. Both
 * should be near zero; if not, author a `naming` vocabulary for this body. */
function collisionLine(compiled: CompiledSpecies): string {
  const seeds = 24;
  let ordinary = 0, parenthetical = 0, collided = 0;
  for (let index = 0; index < seeds; index++) {
    const generated = generateCreatureDraft(compiled, `${compiled.species.key}:${index}`).actions
      .filter(action => /(^|-)ordinary-\d+$/.test(action.key));
    ordinary += generated.length;
    parenthetical += generated.filter(action => action.name.includes(' (')).length;
    const bases = generated.map(action => action.name.split(' (')[0].toLowerCase());
    if (new Set(bases).size !== bases.length) collided++;
  }
  const rate = (value: number, of: number) => of ? `${(value / of * 100).toFixed(1)}%` : 'n/a';
  return `  naming over ${seeds} seeds: ${rate(parenthetical, ordinary)} of ordinary actions carry a structural parenthetical, `
    + `${rate(collided, seeds)} of creatures have two ordinary actions sharing a base name`;
}

/** What the body grants before any draw: how wide the act space is, where it comes
 * from, and what the record's own audit took back out. */
function actLine(compiled: CompiledSpecies): string {
  const { distinct, byInstrument, exclusions } = compiled.acts;
  const breakdown = Object.entries(byInstrument).map(([instrument, count]) => `${instrument} ${count}`).join(', ');
  return `  acts: ${distinct} distinct on offer (${breakdown})`
    + `; exclusions: ${exclusions.length ? exclusions.join(', ') : 'none'}`;
}

const paths = process.argv.slice(2);
if (!paths.length) throw new Error('Pass one or more redesigned species JSON paths; add --example last to print a resolved example.');
const example = paths.at(-1) === '--example';
if (example) paths.pop();
if (!paths.length) throw new Error('At least one species JSON path is required.');
for (const path of paths) {
  const compiled = compileSpecies(JSON.parse(readFileSync(resolve(path), 'utf8')));
  if (example) console.log(JSON.stringify(generateCreatureDraft(compiled, 'authoring-preview'), null, 2));
  else {
    console.log(`${compiled.species.key}: valid permissions, four distinct actions constructible`);
    console.log(actLine(compiled));
    console.log(collisionLine(compiled));
  }
}
