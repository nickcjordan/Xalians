// Copies the ratified lore bundle from docs/ into lambda/src/json/, which is the
// only place the frontend reads game data from (my-app's copy-json step mirrors it).
//
//   encyclopedia.json    <- docs/encyclopedia/encyclopedia.json (verbatim)
//   chronicle.json       <- docs/encyclopedia/chronicle.json (verbatim)
//   speciesRecords.json  <- docs/species-templates/<key>.json for every key in
//                           docs/species-templates/RATIFIED.json (encyclopedia entries for
//                           species live only in docs/encyclopedia/encyclopedia.json)
//
// Idempotent. Run by hand after any lore change:  node scripts/bundleLore.js
// Design contract: docs/design/xalian-encyclopedia-page.md section 2.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const docs = path.join(root, 'docs');
const out = path.join(root, 'lambda', 'src', 'json');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (name, data) => {
  fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2) + '\n');
  console.log('wrote', name);
};

write('encyclopedia.json', read(path.join(docs, 'encyclopedia', 'encyclopedia.json')));
write('chronicle.json', read(path.join(docs, 'encyclopedia', 'chronicle.json')));
write('registries.json', read(path.join(docs, 'species-templates', 'registries.json')));

const tourPath = path.join(docs, 'encyclopedia', 'tour.json');
if (fs.existsSync(tourPath)) {
  write('tour.json', read(tourPath));
} else {
  console.log('skipped tour.json: docs/encyclopedia/tour.json not written yet');
}

const templates = path.join(docs, 'species-templates');
const ratified = read(path.join(templates, 'RATIFIED.json'));
const records = [];
for (const key of ratified.species) {
  const record = read(path.join(templates, `${key}.json`));
  if (record.key !== key) throw new Error(`template ${key}.json carries key ${record.key}`);
  records.push(record);
}
write('speciesRecords.json', { version: ratified.version, note: ratified.note, records });
console.log(`${records.length} species records`);
