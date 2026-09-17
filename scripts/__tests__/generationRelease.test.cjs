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
        assert.deepEqual(XalianRecordSchema.parse(record), record, 'current readers preserve historical representation');
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
