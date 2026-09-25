#!/usr/bin/env node
// Current species data is separate from the archived generator executable.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const speciesDirectory = path.join(root, 'docs/species-templates/v5');
const revisionDirectory = path.join(speciesDirectory, 'revisions');
const catalogPath = path.join(root, 'packages/content/json/canonicalSpeciesCatalog.json');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const canonical = value => JSON.stringify(stable(value));
const revisionOf = value => crypto.createHash('sha256').update(canonical(value)).digest('hex');
const revisionPath = (key, revision) => path.join(revisionDirectory, key, `${revision}.json`);

function expectedCatalog() {
  const files = fs.readdirSync(speciesDirectory).filter(file => file.endsWith('.json')).sort();
  if (!files.length) throw new Error('Canonical species catalog must not be empty');
  return files.map(file => {
    const template = JSON.parse(fs.readFileSync(path.join(speciesDirectory, file), 'utf8'));
    const key = file.slice(0, -5);
    if (template.key !== key) throw new Error(`${file}: species key disagrees with file name`);
    return { revision: revisionOf(template), template };
  });
}

function checkCatalog() {
  const expected = expectedCatalog();
  const actual = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (canonical(actual) !== canonical(expected)) throw new Error('Canonical species catalog is stale; run npm run sync:species');
  for (const { revision, template } of expected) {
    const file = revisionPath(template.key, revision);
    if (!fs.existsSync(file)) throw new Error(`Missing immutable species revision: ${template.key}/${revision}`);
    const archived = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (revisionOf(archived) !== revision || canonical(archived) !== canonical(template)) {
      throw new Error(`Species revision differs from its content hash: ${template.key}/${revision}`);
    }
  }
  for (const key of fs.readdirSync(revisionDirectory)) {
    if (!/^[a-z0-9-]+$/.test(key)) throw new Error(`Invalid archived species key: ${key}`);
    const directory = path.join(revisionDirectory, key);
    if (!fs.statSync(directory).isDirectory()) throw new Error(`Invalid species revision directory: ${key}`);
    for (const name of fs.readdirSync(directory)) {
      const revision = name.slice(0, -5);
      if (!/^[a-f0-9]{64}\.json$/.test(name)) throw new Error(`Invalid species revision file: ${key}/${name}`);
      const archived = JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
      if (archived.key !== key || revisionOf(archived) !== revision) throw new Error(`Species revision integrity failure: ${key}/${name}`);
    }
  }
  return expected;
}

function syncCatalog() {
  const entries = expectedCatalog();
  for (const { revision, template } of entries) {
    const file = revisionPath(template.key, revision);
    if (fs.existsSync(file)) {
      const archived = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (revisionOf(archived) !== revision || canonical(archived) !== canonical(template)) {
        throw new Error(`Refusing to overwrite immutable species revision: ${template.key}/${revision}`);
      }
      continue;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(stable(template), null, 2) + '\n', { flag: 'wx' });
  }
  fs.writeFileSync(catalogPath, JSON.stringify(entries, null, 2) + '\n');
  checkCatalog();
  return entries.length;
}

module.exports = { checkCatalog, syncCatalog, revisionOf, revisionPath };
if (require.main === module) {
  try {
    const count = process.argv.includes('--check') ? checkCatalog().length : syncCatalog();
    console.log(`Verified ${count} current species and their independent revisions`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
