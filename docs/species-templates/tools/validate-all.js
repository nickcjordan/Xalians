#!/usr/bin/env node
/*
 * Runs validate-template.js over every ratified species (docs/species-templates/RATIFIED.json)
 * without touching the validation logs, and exits 1 if any record FAILs. CI runs this in the
 * content job; run it locally from the repo root before opening a species PR:
 *   node docs/species-templates/tools/validate-all.js [key ...]
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'species-templates', 'RATIFIED.json'), 'utf8'));
const status = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'species-templates', 'lore-status.json'), 'utf8'));
const keys = process.argv.slice(2).length ? process.argv.slice(2) : manifest.species;
const rows = [];
let failed = 0;
for (const key of keys) {
  const review = status.species && status.species[key];
  const expected = { description: 'source', appearance: 'ratified', fields: 'ratified', traits: 'ratified' };
  const statusErrors = !review
    ? ['missing lore-status row']
    : Object.entries(expected).filter(([field, value]) => review[field] !== value).map(([field, value]) => field + ' must be ' + value + ', got ' + JSON.stringify(review[field]));
  if (statusErrors.length) {
    failed++;
    console.log('FAIL ' + key + ' review status');
    statusErrors.forEach(error => console.log('  ' + error));
  }
  const r = spawnSync(process.execPath, [path.join(__dirname, 'validate-template.js'), key, '--no-log'], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/(\d+) FAIL, (\d+) WARN/);
  const fails = m ? Number(m[1]) : (r.status === 0 ? 0 : 1);
  const warns = m ? Number(m[2]) : 0;
  if (fails || r.status !== 0) { failed++; console.log('FAIL ' + key); console.log(out.split(/\r?\n/).filter(l => /FAIL/.test(l)).map(l => '  ' + l).join('\n')); }
  rows.push([key, fails + statusErrors.length, warns]);
}
console.log(rows.map(([k, f, w]) => k.padEnd(12) + ' ' + f + ' FAIL ' + w + ' WARN').join('\n'));
console.log('\n' + keys.length + ' species checked, ' + failed + ' failing');
process.exit(failed ? 1 : 0);
