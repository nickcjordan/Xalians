const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { readManifest, replay, archiveRoot, freeze } = require('../generationRelease.cjs');

const fixtureFile = path.join(__dirname, 'fixtures/generation-release-records.json');
const fixtures = () => JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
const historicalSpeciesEntries = () => {
  const root = path.join(__dirname, '../../docs/species-templates/v5/revisions');
  return fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()).flatMap(entry => {
    const directory = path.join(root, entry.name);
    return fs.readdirSync(directory).filter(file => file.endsWith('.json')).map(file => ({
      revision: file.slice(0, -5),
      template: JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')),
    }));
  });
};
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
    const { artifact, manifest } = readManifest(entry.name);
    const archived = await import(pathToFileURL(artifact).href);
    const entries = manifest.kind === 'species-independent'
      ? historicalSpeciesEntries()
      : archived.getSpeciesTemplates().map(template => ({ template }));
    for (const { template, revision } of entries) {
      for (const profile of ['full', 'showroom']) {
        const options = {
          profile, generatedAt: '2026-09-15T12:34:56.000Z', serial: 42, origin: 'saiphus',
        };
        const record = manifest.kind === 'species-independent'
          ? archived.generateXalian(template, revision, 'historical:' + template.key, options)
          : archived.generateXalian(template.key, 'historical:' + template.key, options);
        const schema = archived.SCHEMA_VERSION.startsWith('5.') ? archived.CreatureRecordSchema : XalianRecordSchema;
        assert.deepEqual(schema.parse(record), record, 'schema for the archived representation accepts replay');
        assert.deepEqual(await replay(record), record, entry.name + ': ' + template.key + ': ' + profile);
      }
    }
  }
});

test('schema 5.1 changes scale without rerolling other v5 creature facts', async () => {
  const before = await import(pathToFileURL(readManifest('generation-0.7.0-5').artifact).href);
  const after = await import(pathToFileURL(readManifest('generation-0.8.0-1').artifact).href);
  const options = { profile: 'full', generatedAt: '2026-09-23T12:00:00.000Z', serial: 1, origin: 'saiphus' };
  for (const { key } of after.getSpeciesTemplates()) {
    const oldSize = before.getSpeciesTemplates().find(source => source.key === key).physiology.size;
    const newSize = after.getSpeciesTemplates().find(source => source.key === key).physiology.size;
    assert.deepEqual(newSize.massKg, oldSize.weightKg, key + ': mass band');
    assert.deepEqual(key === 'frackworm' ? newSize.lengthCm : newSize.heightCm, oldSize.heightCm, key + ': overall extent band');
    const oldRecord = before.generateXalian(key, 'scale-migration:' + key, options);
    const newRecord = after.generateXalian(key, 'scale-migration:' + key, options);
    for (const field of ['attributes', 'temperament', 'signature', 'actions', 'passives']) {
      assert.deepEqual(newRecord[field], oldRecord[field], key + ': ' + field);
    }
    const { heightCm: oldHeight, weightKg: oldWeight, ...oldPhysiology } = oldRecord.physiology;
    const { heightCm: newHeight, lengthCm, widthCm, massKg, ...newPhysiology } = newRecord.physiology;
    assert.deepEqual(newPhysiology, oldPhysiology, key + ': remaining physiology');
    assert.ok(massKg > 0, key + ': mass');
    assert.ok([newHeight, lengthCm, widthCm].some(value => typeof value === 'number'), key + ': linear dimension');
    if (key === 'frackworm') {
      assert.equal(newHeight, undefined);
      assert.ok(lengthCm >= 900 && lengthCm <= 1500);
    } else {
      assert.ok(typeof newHeight === 'number');
    }
    assert.ok(oldHeight > 0 && oldWeight > 0);
  }
});

test('Fathomaw release adds one species without changing existing v5 results', async () => {
  const before = await import(pathToFileURL(readManifest('generation-0.8.0-1').artifact).href);
  const after = await import(pathToFileURL(readManifest('generation-0.8.0-2').artifact).href);
  const previous = before.getSpeciesTemplates().map(species => species.key);
  assert.deepEqual(after.getSpeciesTemplates().map(species => species.key), [
    ...previous.slice(0, previous.indexOf('figzy')), 'fathomaw', ...previous.slice(previous.indexOf('figzy')),
  ]);
  const options = { profile: 'full', generatedAt: '2026-09-24T12:00:00.000Z', serial: 1, origin: 'poseidas' };
  for (const key of previous) {
    const oldRecord = before.generateXalian(key, 'fathomaw-content-release:' + key, options);
    const newRecord = after.generateXalian(key, 'fathomaw-content-release:' + key, options);
    assert.deepEqual({ ...newRecord, provenance: { ...newRecord.provenance, releaseId: oldRecord.provenance.releaseId } }, oldRecord, key);
  }
  const newRecord = after.generateXalian('fathomaw', 'fathomaw-content-release', options);
  assert.equal(newRecord.provenance.releaseId, 'generation-0.8.0-2');
  assert.equal(newRecord.actions[0].name, 'Yield Point');
  assert.deepEqual(after.CreatureRecordSchema.parse(newRecord), newRecord);
  assert.deepEqual(await replay(newRecord), newRecord);
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
const independentCreatureEntry = 'packages/rules/src/generator/creatureEngineRelease.ts';
test('the species-independent engine freezes without any roster data and replays all current species', async t => {
  const temporary = temporaryArchive(t);
  const releaseId = 'generation-0.9.0-1';
  const manifest = await freeze({ entryPoint: independentCreatureEntry, releaseId, archives: temporary });
  assert.equal(manifest.kind, 'species-independent');
  const v5Files = fs.readdirSync(path.join(__dirname, '../../docs/species-templates/v5')).filter(file => file.endsWith('.json'));
  assert.equal(Object.keys(manifest.inputs).filter(file => /species-templates\/v5\/|canonicalSpeciesCatalog\.json/.test(file)).length, 0);
  const catalog = historicalSpeciesEntries();
  assert.deepEqual(catalog.map(entry => entry.template.key).sort(), v5Files.map(file => file.slice(0, -5)).sort());
  const { artifact } = readManifest(releaseId, temporary);
  const archived = await import(pathToFileURL(artifact).href);
  for (const { template, revision } of catalog) {
    for (const profile of ['full', 'showroom']) {
      const record = archived.generateXalian(template, revision, 'v5-replay:' + template.key, {
        profile, generatedAt: '2026-09-21T12:34:56.000Z', serial: 7, origin: 'saiphus',
      });
      assert.deepEqual(archived.CreatureRecordSchema.parse(record), record);
      assert.deepEqual(await replay(record, temporary), record);
    }
  }
});
test('a new valid species uses the existing engine archive and its own content revision', async t => {
  const temporary = temporaryArchive(t);
  const revisions = temporaryArchive(t);
  const releaseId = 'generation-0.9.0-1';
  const manifest = await freeze({ entryPoint: independentCreatureEntry, releaseId, archives: temporary });
  const { artifact } = readManifest(releaseId, temporary);
  const archived = await import(pathToFileURL(artifact).href);
  const template = JSON.parse(fs.readFileSync(path.join(__dirname, '../../packages/content/src/creature/fixtures/support-species.json'), 'utf8'));
  template.key = 'future-species';
  template.name = 'Future Species';
  const { revisionOf } = require('../historicalSpeciesRevision.cjs');
  const revision = revisionOf(template);
  const directory = path.join(revisions, template.key);
  fs.mkdirSync(directory);
  const file = path.join(directory, `${revision}.json`);
  fs.writeFileSync(file, JSON.stringify(template));
  const record = archived.generateXalian(template, revision, 'future-seed', {
    profile: 'full', generatedAt: '2026-09-25T12:00:00.000Z', serial: 1, origin: 'saiphus',
  });
  assert.equal(record.species, template.key);
  assert.equal(record.provenance.releaseId, releaseId);
  assert.equal(record.provenance.speciesRevision, revision);
  assert.deepEqual(await replay(record, temporary, revisions), record);
  assert.equal(manifest.inputs['packages/content/json/canonicalSpeciesCatalog.json'], undefined);
  template.name = 'Changed after generation';
  fs.writeFileSync(file, JSON.stringify(template));
  await assert.rejects(replay(record, temporary, revisions), /Species revision integrity failure/);
});
test('separating the roster does not reroll existing species', async () => {
  const previous = await import(pathToFileURL(readManifest('generation-0.8.0-2').artifact).href);
  const current = await import(pathToFileURL(readManifest('generation-0.9.0-1').artifact).href);
  const catalog = historicalSpeciesEntries();
  const options = { profile: 'full', generatedAt: '2026-09-25T12:00:00.000Z', serial: 1, origin: 'poseidas' };
  for (const { template, revision } of catalog) {
    const seed = 'independent-roster:' + template.key;
    const oldRecord = previous.generateXalian(template.key, seed, options);
    const newRecord = current.generateXalian(template, revision, seed, options);
    const { provenance: oldProvenance, ...oldFacts } = oldRecord;
    const { provenance: newProvenance, ...newFacts } = newRecord;
    assert.deepEqual(newFacts, oldFacts, template.key);
    assert.equal(newProvenance.speciesRevision, revision);
    assert.equal(oldProvenance.seed, newProvenance.seed);
  }
});
test('v5 freezes its actual species, catalog, compiler and naming dependencies and replays standalone', async t => {
  const temporary = temporaryArchive(t);
  const manifest = await freeze({ entryPoint: creatureEntry, releaseId: 'test-creature-v5', archives: temporary });
  assert.equal(manifest.schemaVersion, '5.1.0');
  assert.equal(manifest.generatorVersion, '0.8.0');
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
