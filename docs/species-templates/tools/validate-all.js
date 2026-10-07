#!/usr/bin/env node
/*
 * Validates every v5 species source (docs/species-templates/v5/<key>.json) and exits 1 if any
 * fails. CI runs this in the content job; run it locally from the repo root before opening a
 * species PR:
 *   node docs/species-templates/tools/validate-all.js [key ...]
 *
 * Per species it checks that the file compiles under the v5 creature model (schema,
 * permissions, derived acts, signature guardrail: packages/content/src/creature), that the
 * key matches the file name, that the same-key <key>.ability-audit.md exists, that the body
 * offers at least MIN_DISTINCT_ACTS distinct acts, and that the encyclopedia carries the
 * species entry. For the act-space and naming report on one species, use
 *   npm run check:creature-model -- docs/species-templates/v5/<key>.json
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const V5 = path.join(ROOT, 'docs', 'species-templates', 'v5');
const { compileSpecies, MIN_DISTINCT_ACTS } = require(path.join(ROOT, 'packages', 'content', 'src', 'creature', 'index.ts'));
const encyclopedia = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'encyclopedia', 'encyclopedia.json'), 'utf8'));
const entryKeys = new Set(encyclopedia.entries.map(entry => entry.key));

const all = fs.readdirSync(V5).filter(file => file.endsWith('.json')).map(file => file.slice(0, -5)).sort();
const keys = process.argv.slice(2).length ? process.argv.slice(2) : all;
let failed = 0;
for (const key of keys) {
  const errors = [];
  const file = path.join(V5, `${key}.json`);
  if (!fs.existsSync(file)) errors.push(`missing ${path.relative(ROOT, file)}`);
  else {
    const source = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (source.key !== key) errors.push(`file name says ${key}, record key says ${source.key}`);
    try {
      const compiled = compileSpecies(source);
      if (compiled.acts.distinct < MIN_DISTINCT_ACTS) errors.push(`only ${compiled.acts.distinct} distinct acts (minimum ${MIN_DISTINCT_ACTS})`);
    } catch (error) {
      errors.push(`does not compile: ${String(error.message || error).split('\n').slice(0, 6).join(' | ')}`);
    }
  }
  if (!fs.existsSync(path.join(V5, `${key}.ability-audit.md`))) errors.push(`missing ${key}.ability-audit.md`);
  if (!entryKeys.has(key)) errors.push('no encyclopedia entry in docs/encyclopedia/encyclopedia.json');
  if (errors.length) failed++;
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${key}`);
  errors.forEach(error => console.log(`  ${error}`));
}
console.log(`\n${keys.length} species checked, ${failed} failing`);
process.exit(failed ? 1 : 0);
