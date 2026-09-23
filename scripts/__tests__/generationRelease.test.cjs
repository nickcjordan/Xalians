const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { readManifest, replay, archiveRoot, freeze } = require('../generationRelease.cjs');

const fixtureFile = path.join(__dirname, 'fixtures/generation-release-records.json');
const fixtures = () => JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
function temporaryArchive(t) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'xalian-release-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temporary).startsWith('xalian-release-test-'));
    fs.rmSync(temporary, { recursive: true, force: true });
  });
  return temporary;
}

test('historical fixtures replay exactly, including full provenance and both profiles', async () => {
  const records = fixtures();
  assert.deepEqual(new Set(records.map(record => record.provenance.profile)), new Set(['full', 'showroom']));
  for (const record of records) assert.deepEqual(await replay(record), record);
});

test('all species in every archived release replay with both profiles', async () => {
  const { XalianRecordSchema } = require('../../packages/content/src/schema/record.ts');
  for (const entry of fs.readdirSync(archiveRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const { artifact } = readManifest(entry.name);
    const archived = await import(pathToFileURL(artifact).href);
    for (const template of archived.getSpeciesTemplates()) {
      for (const profile of ['full', 'showroom']) {
        const record = archived.generateXalian(template.key, 'historical:' + template.key, {
          profile, generatedAt: '2026-09-15T12:34:56.000Z', serial: 42, origin: 'saiphus',
        });
        const schema = archived.SCHEMA_VERSION === '5.0.0' ? archived.CreatureRecordSchema : XalianRecordSchema;
        assert.deepEqual(schema.parse(record), record, 'schema for the archived representation accepts replay');
        assert.deepEqual(await replay(record), record, entry.name + ': ' + template.key + ': ' + profile);
      }
    }
  }
});

test('a copied archive replays independently of the live template tree', async t => {
  const temporary = temporaryArchive(t);
  const record = fixtures()[0];
  const id = record.provenance.releaseId;
  fs.cpSync(path.join(archiveRoot, id), path.join(temporary, id), { recursive: true });
  assert.deepEqual(await replay(record, temporary), record);
});

test('replay refuses missing release IDs, unknown releases, and traversal', async () => {
  for (const releaseId of [undefined, 'unavailable-release', '../escape']) {
    const record = fixtures()[0];
    record.provenance.releaseId = releaseId;
    await assert.rejects(replay(record), /missing generation release ID|Unavailable generation release/);
  }
});

test('replay refuses provenance versions that disagree with the archive', async () => {
  for (const field of ['generatorVersion', 'schemaVersion']) {
    const record = fixtures()[0];
    record.provenance[field] = '999.0.0';
    await assert.rejects(replay(record), /versions disagree/);
  }
});

test('replay refuses incomplete or malformed original inputs', async () => {
  for (const [field, value] of [
    ['seed', undefined], ['seed', ''], ['origin', undefined], ['serial', 0],
    ['serial', 1.5], ['generatedAt', undefined], ['generatedAt', 'not-a-date'], ['profile', 'unknown'],
  ]) {
    const record = fixtures()[0];
    record.provenance[field] = value;
    await assert.rejects(replay(record), /invalid replay inputs/, field);
  }
  const record = fixtures()[0];
  delete record.species;
  await assert.rejects(replay(record), /invalid replay inputs/);
  await assert.rejects(replay({}), /invalid replay inputs/);
});

test('freeze cannot overwrite an existing release', async () => {
  await assert.rejects(freeze(), /already exists; never overwrite/);
});

test('manifest versions must match the archived executable, not only the record', async t => {
  const temporary = temporaryArchive(t);
  const record = fixtures()[0];
  const id = record.provenance.releaseId;
  fs.cpSync(path.join(archiveRoot, id), path.join(temporary, id), { recursive: true });
  const manifestFile = path.join(temporary, id, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  manifest.generatorVersion = record.provenance.generatorVersion = '999.0.0';
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  await assert.rejects(replay(record, temporary), /Archived generator disagrees/);
});

test('artifact tampering fails even after a successful import', async t => {
  const temporary = temporaryArchive(t);
  const record = fixtures()[0];
  const id = record.provenance.releaseId;
  fs.cpSync(path.join(archiveRoot, id), path.join(temporary, id), { recursive: true });
  assert.deepEqual(await replay(record, temporary), record);
  fs.appendFileSync(path.join(temporary, id, 'generator.mjs'), '\n// unexpected edit\n');
  await assert.rejects(replay(record, temporary), /artifact integrity failure/);
});
const creatureEntry = 'scripts/__tests__/fixtures/creature-release.ts';
const canonicalCreatureEntry = 'packages/rules/src/generator/canonicalCreatureRelease.ts';
test('the complete v5 roster freezes and replays without the live species tree', async t => {
  const temporary = temporaryArchive(t);
  const releaseId = 'generation-0.7.0-2';
  const manifest = await freeze({ entryPoint: canonicalCreatureEntry, releaseId, archives: temporary });
  const ratified = JSON.parse(fs.readFileSync(path.join(__dirname, '../../docs/species-templates/RATIFIED.json'), 'utf8')).species;
  assert.equal(Object.keys(manifest.inputs).filter(file => /^docs\/species-templates\/v5\/[^/]+\.json$/.test(file)).length, 32);
  const { artifact } = readManifest(releaseId, temporary);
  const archived = await import(pathToFileURL(artifact).href);
  assert.deepEqual(archived.getSpeciesTemplates().map(template => template.key).sort(), [...ratified].sort());
  for (const key of ratified) {
    for (const profile of ['full', 'showroom']) {
      const record = archived.generateXalian(key, 'v5-replay:' + key, {
        profile, generatedAt: '2026-09-21T12:34:56.000Z', serial: 7, origin: 'saiphus',
      });
      assert.deepEqual(archived.CreatureRecordSchema.parse(record), record);
      assert.deepEqual(await replay(record, temporary), record);
    }
  }
});
test('v5 freezes its actual species, catalog, compiler and naming dependencies and replays standalone', async t => {
  const temporary = temporaryArchive(t);
  const manifest = await freeze({ entryPoint: creatureEntry, releaseId: 'test-creature-v5', archives: temporary });
  assert.equal(manifest.schemaVersion, '5.0.0');
  assert.equal(manifest.generatorVersion, '0.7.0');
  for (const file of ['catalog.ts', 'benchmarks.ts', 'compiler.ts', 'naming.ts', 'species.ts', 'record.ts', 'fixtures/support-species.json']) {
    assert.ok(manifest.inputs['packages/content/src/creature/' + file], file);
  }
  assert.ok(manifest.inputs['packages/content/src/registriesConst.ts']);
  assert.ok(manifest.inputs['packages/rules/src/generator/prng.ts']);
  assert.equal(manifest.inputs['packages/content/src/speciesRecords.json'], undefined);
  const { artifact } = readManifest(manifest.releaseId, temporary);
  const archived = await import(pathToFileURL(artifact).href);
  const species = archived.getSpeciesTemplates()[0].key;
  for (const profile of ['full', 'showroom']) {
    for (const seed of ['release-one', 'release-two', 'release-three']) {
      const record = archived.generateXalian(species, seed, { profile, origin: 'saiphus', serial: 3, generatedAt: '2026-09-21T12:00:00.000Z' });
      assert.deepEqual(archived.CreatureRecordSchema.parse(record), record);
      assert.deepEqual(await replay(record, temporary), record);
      // Fresh process: cannot use already-loaded live generator modules or compiled species.
      const output = require('node:child_process').execFileSync(process.execPath, ['-e',
        `const {replay}=require('./scripts/generationRelease.cjs'); let s=''; process.stdin.on('data',v=>s+=v); process.stdin.on('end',async()=>console.log(JSON.stringify(await replay(JSON.parse(s),process.argv[1]))));`, temporary],
        { cwd: path.resolve(__dirname, '../..'), input: JSON.stringify(record), encoding: 'utf8' });
      assert.deepEqual(JSON.parse(output), record);
    }
  }
  assert.throws(() => archived.generateXalian(species, 'seed', {}), /seed|generatedAt|origin|serial|profile/);
  assert.throws(() => archived.generateXalian('missing', 'seed', {}), /Unknown release species/);
  await assert.rejects(freeze({ entryPoint: creatureEntry, releaseId: manifest.releaseId, archives: temporary }), /already exists/);
});

test('freeze refuses mismatched release identity before writing an archive', async t => {
  const temporary = temporaryArchive(t);
  await assert.rejects(freeze({ entryPoint: creatureEntry, releaseId: 'wrong-id', archives: temporary }), /does not match/);
  assert.deepEqual(fs.readdirSync(temporary), []);
});
