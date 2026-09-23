#!/usr/bin/env node
// Shared release tooling. Archives are executable application code; only load trusted archives.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { buildSync, version: esbuildVersion } = require('esbuild');
const root = path.resolve(__dirname, '..');
const archiveRoot = path.join(root, 'packages/rules/releases');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceHash = file => hash(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
const validId = id => typeof id === 'string' && /^[a-z0-9][a-z0-9._-]*$/.test(id);
function bundle(entryPoint = 'packages/rules/src/generator/index.ts') {
  return buildSync({ absWorkingDir: root, entryPoints: [entryPoint], bundle: true, platform: 'neutral', format: 'esm', target: 'es2022', write: false, metafile: true, minify: true, legalComments: 'inline' });
}
function readManifest(id, archives = archiveRoot) {
  if (!validId(id)) throw new Error('Invalid or missing generation release ID; historical release cannot be inferred');
  const dir = path.join(archives, id);
  if (!fs.existsSync(path.join(dir, 'manifest.json'))) throw new Error(`Unavailable generation release: ${id}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  if (manifest.formatVersion !== 1 || manifest.releaseId !== id || manifest.artifact.file !== 'generator.mjs') throw new Error('Invalid release manifest');
  const artifact = path.join(dir, 'generator.mjs');
  if (hash(fs.readFileSync(artifact)) !== manifest.artifact.sha256) throw new Error(`Release artifact integrity failure: ${id}`);
  return { manifest, artifact };
}
async function replay(record, archives = archiveRoot) {
  const p = record?.provenance;
  if (!p || typeof record.species !== 'string' || !record.species || typeof p.seed !== 'string' || !p.seed || typeof p.origin !== 'string' || !p.origin || !Number.isInteger(p.serial) || p.serial < 1 || typeof p.generatedAt !== 'string' || !Number.isFinite(Date.parse(p.generatedAt)) || (p.profile !== undefined && !['full', 'showroom'].includes(p.profile))) throw new Error('Incomplete or invalid replay inputs');
  const { manifest, artifact } = readManifest(record.provenance.releaseId, archives);
  if (manifest.generatorVersion !== record.provenance.generatorVersion || manifest.schemaVersion !== record.provenance.schemaVersion) throw new Error('Record versions disagree with release manifest');
  const archived = await import(pathToFileURL(artifact).href);
  if (archived.GENERATOR_VERSION !== manifest.generatorVersion || archived.SCHEMA_VERSION !== manifest.schemaVersion || archived.GENERATION_RELEASE_ID !== manifest.releaseId) throw new Error('Archived generator disagrees with release manifest');
  return archived.generateXalian(record.species, p.seed, { origin: p.origin, serial: p.serial, generatedAt: p.generatedAt, profile: p.profile || 'full' });
}
function checkFrozenSource(releaseId, entryPoint) {
  const { manifest } = readManifest(releaseId);
  for (const [file, expected] of Object.entries(manifest.inputs)) {
    if (sourceHash(path.join(root, file)) !== expected) throw new Error(`Frozen release ${releaseId} changed: ${file}. Create a new release ID and freeze it.`);
  }
  if (manifest.build.esbuild !== esbuildVersion) throw new Error('Release build tool changed; create a new release');
  if (hash(bundle(entryPoint).outputFiles[0].contents) !== manifest.artifact.sha256) throw new Error(`Generator bundle differs from frozen release ${releaseId}; create a new release`);
  return manifest;
}
function checkCurrent() {
  const { releaseId } = require('../packages/rules/src/generator/currentRelease.json');
  const creature = require('../packages/rules/src/generator/currentCreatureRelease.json');
  const legacyManifest = checkFrozenSource(releaseId);
  const creatureManifest = checkFrozenSource(creature.releaseId, creature.entryPoint);
  return [legacyManifest, creatureManifest];
}
async function freeze({ entryPoint, releaseId = require('../packages/rules/src/generator/currentRelease.json').releaseId, archives = archiveRoot } = {}) {
  if (!validId(releaseId)) throw new Error('Invalid release ID');
  const dir = path.join(archives, releaseId);
  if (fs.existsSync(dir)) throw new Error(`Release ${releaseId} already exists; never overwrite a frozen release`);
  const result = bundle(entryPoint);
  if (result.metafile.outputs[Object.keys(result.metafile.outputs)[0]].imports.length) throw new Error('Release must have no external runtime dependencies');
  const bytes = result.outputFiles[0].contents;
  const inputs = Object.fromEntries(Object.keys(result.metafile.inputs).sort().map(file => [file.replaceAll('\\', '/'), sourceHash(path.join(root, file))]));
  // Validate before allocating the immutable destination. Exclusive mkdir also
  // prevents two concurrent freeze commands from overwriting the same release.
  const archived = await import(`data:text/javascript;base64,${Buffer.from(bytes).toString('base64')}`);
  if (archived.GENERATION_RELEASE_ID !== releaseId || typeof archived.GENERATOR_VERSION !== 'string' || typeof archived.SCHEMA_VERSION !== 'string' || typeof archived.generateXalian !== 'function') throw new Error('Release entry point does not match the requested release contract');
  const manifest = { formatVersion: 1, releaseId, generatorVersion: archived.GENERATOR_VERSION, schemaVersion: archived.SCHEMA_VERSION, build: { esbuild: esbuildVersion, target: 'es2022', runtime: 'ECMAScript 2022 (Node 20+ replay tooling)' }, artifact: { file: 'generator.mjs', sha256: hash(bytes) }, inputs };
  fs.mkdirSync(archives, { recursive: true });
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'generator.mjs'), bytes, { flag: 'wx' });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
module.exports = { freeze, checkCurrent, readManifest, replay, archiveRoot };
if (require.main === module) (async () => {
  const [command, file] = process.argv.slice(2);
  if (command === 'freeze') console.log(`Frozen ${(await freeze()).releaseId}`);
  else if (command === 'check') {
    const baseIndex = process.argv.indexOf('--base');
    if (baseIndex >= 0) {
      const base = process.argv[baseIndex + 1];
      if (!base || base.startsWith('-')) throw new Error('Missing comparison git ref');
      const changed = require('node:child_process').execFileSync('git', ['diff', '--name-only', '--diff-filter=MDR', base, '--', 'packages/rules/releases'], { cwd: root, encoding: 'utf8' }).trim();
      if (changed) throw new Error(`Previously archived release files changed:\n${changed}`);
    }
    for (const entry of fs.readdirSync(archiveRoot, { withFileTypes: true })) if (entry.isDirectory()) readManifest(entry.name);
    console.log(`Verified ${checkCurrent().map(manifest => manifest.releaseId).join(' and ')} plus archived artifact integrity`);
  } else if (command === 'replay' && file) console.log(JSON.stringify(await replay(JSON.parse(fs.readFileSync(file, 'utf8'))), null, 2));
  else throw new Error('Usage: node scripts/generationRelease.cjs freeze|check|replay <record.json>');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
