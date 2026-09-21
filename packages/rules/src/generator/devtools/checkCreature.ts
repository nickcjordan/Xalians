import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileSpecies, generateCreatureDraft } from '../creature.ts';

const paths = process.argv.slice(2);
if (!paths.length) throw new Error('Pass one or more redesigned species JSON paths; add --example last to print a resolved example.');
const example = paths.at(-1) === '--example';
if (example) paths.pop();
if (!paths.length) throw new Error('At least one species JSON path is required.');
for (const path of paths) {
  const compiled = compileSpecies(JSON.parse(readFileSync(resolve(path), 'utf8')));
  if (example) console.log(JSON.stringify(generateCreatureDraft(compiled, 'authoring-preview'), null, 2));
  else console.log(`${compiled.species.key}: valid permissions, four distinct actions constructible`);
}
