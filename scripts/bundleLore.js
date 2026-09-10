// Copies the ratified lore bundle from docs/ into packages/content/json/, which both
// apps/api and my-app read directly through the @xalians/content workspace package.
//
//   encyclopedia.json    <- docs/encyclopedia/encyclopedia.json (verbatim)
//   chronicle.json       <- docs/encyclopedia/chronicle.json (verbatim)
//   speciesRecords.json  <- docs/species-templates/<key>.json for every key in
//                           docs/species-templates/RATIFIED.json (encyclopedia entries for
//                           species live only in docs/encyclopedia/encyclopedia.json)
//   abilityCatalog.json  <- docs/ability-catalog/consolidated-<element>.md + neutral-pools.md
//                           (via scripts/bundleAbilityCatalog.js)
//   tour.json            <- docs/encyclopedia/tour.json, when it exists
//   narration.json        <- docs/encyclopedia/narration.json, when it exists
//   plates.json           <- docs/encyclopedia/plates.json, when it exists
//   ../src/registriesConst.ts <- generated from docs/species-templates/registries.json:
//                           every closed registry vocabulary as a literal `as const` array,
//                           so packages/content/src/schema/registries.ts can build zod
//                           enums whose z.infer is the literal key union instead of the
//                           `string` widening that plain JSON imports produce (issue #181).
//
// Idempotent. Run by hand after any lore change:  node scripts/bundleLore.js
// Design contract: docs/design/xalian-encyclopedia-page.md section 2.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const docs = path.join(root, 'docs');
// CONTENT_BUNDLE_OUT_DIR lets scripts/checkBundle.js redirect the write to a scratch
// directory for a stale-bundle diff without touching the committed files. Unset in normal
// use, so default behavior (writing into packages/content/json) is unchanged.
const out = process.env.CONTENT_BUNDLE_OUT_DIR
  ? path.resolve(process.env.CONTENT_BUNDLE_OUT_DIR)
  : path.join(root, 'packages', 'content', 'json');
fs.mkdirSync(out, { recursive: true });
// registriesConst.ts is TypeScript source, not bundled JSON, so it does not belong under
// packages/content/json/. When CONTENT_BUNDLE_OUT_DIR is set (scripts/checkBundle.js), it
// is written flat into that same scratch dir alongside the JSON files, which is exactly
// where checkBundle.js looks for it; in normal use it goes to packages/content/src/.
const srcOut = process.env.CONTENT_BUNDLE_OUT_DIR ? out : path.join(root, 'packages', 'content', 'src');
fs.mkdirSync(srcOut, { recursive: true });
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (name, data) => {
  fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2) + '\n');
  console.log('wrote', name);
};

write('encyclopedia.json', read(path.join(docs, 'encyclopedia', 'encyclopedia.json')));
write('chronicle.json', read(path.join(docs, 'encyclopedia', 'chronicle.json')));
const registriesSrc = read(path.join(docs, 'species-templates', 'registries.json'));
write('registries.json', registriesSrc);

// ---- registriesConst.ts: literal `as const` key arrays for every closed registry list ----
function keyArray(name, entries) {
  const keys = entries.map((entry) => entry.key);
  return `export const ${name} = ${JSON.stringify(keys)} as const;`;
}

const senses = registriesSrc.senses;
const gradedSenses = senses.filter((s) => !s.special);
const specialSenses = senses.filter((s) => s.special);

const registriesConstLines = [
  '// GENERATED FILE. Do not edit by hand -- run `node scripts/bundleLore.js` to regenerate.',
  '// Source: docs/species-templates/registries.json. Each export is the literal-typed key',
  '// list for one closed registry vocabulary. packages/content/src/schema/registries.ts',
  '// builds its zod enums from these arrays (not from the JSON bundle directly) so their',
  "// z.infer stays a literal union instead of widening to `string` (issue #181).",
  '',
  keyArray('ATTRIBUTE_KEYS', registriesSrc.attributes),
  keyArray('ARCHETYPE_KEYS', registriesSrc.archetypes),
  keyArray('TRAIT_KEYS', registriesSrc.traits),
  keyArray('ELEMENT_KEYS', registriesSrc.elements),
  keyArray('CAPABILITY_KEYS', registriesSrc.capabilities),
  keyArray('SENSE_KEYS', senses),
  // senses splits into the three always-present graded senses (sight/hearing/smell) and
  // the six additive special senses (echolocation, ...), distinguished by the JSON's
  // `special` flag; both packages/content/src/schema/record.ts (SensesSchema) and
  // packages/rules/src/generator/types.ts (GradedSenseKey) want the split, not the union.
  keyArray('GRADED_SENSE_KEYS', gradedSenses),
  keyArray('SPECIAL_SENSE_KEYS', specialSenses),
  keyArray('ANATOMY_KEYS', registriesSrc.anatomy),
  keyArray('CHANNEL_KEYS', registriesSrc.channels),
  keyArray('ACTION_KEYS', registriesSrc.actions),
  keyArray('CORPOREALITY_KEYS', registriesSrc.physiology.corporeality),
  keyArray('COMPOSITION_KEYS', registriesSrc.physiology.composition),
  keyArray('BODY_PLAN_KEYS', registriesSrc.physiology.bodyPlan),
  keyArray('COVERING_KEYS', registriesSrc.physiology.covering),
  keyArray('DIET_KEYS', registriesSrc.physiology.diet),
  keyArray('COMMUNICATION_KEYS', registriesSrc.physiology.communication),
  keyArray('MEDIUM_PHASE_KEYS', registriesSrc.physiology.media),
  keyArray('LIFESPAN_KEYS', registriesSrc.physiology.lifespan),
  // The template's roll MODE ("rolled" | "achiral"), not the per-instance value domain
  // ("levo" | "dextro" | "achiral") -- see the TODO(lever) note in schema/record.ts.
  keyArray('TEMPLATE_CHIRALITY_KEYS', registriesSrc.physiology.chirality),
  '',
].join('\n');

fs.writeFileSync(path.join(srcOut, 'registriesConst.ts'), registriesConstLines);
console.log('wrote src/registriesConst.ts');

const tourPath = path.join(docs, 'encyclopedia', 'tour.json');
if (fs.existsSync(tourPath)) {
  write('tour.json', read(tourPath));
} else {
  console.log('skipped tour.json: docs/encyclopedia/tour.json not written yet');
}

const narrationPath = path.join(docs, 'encyclopedia', 'narration.json');
if (fs.existsSync(narrationPath)) {
  write('narration.json', read(narrationPath));
} else {
  console.log('skipped narration.json: docs/encyclopedia/narration.json not written yet');
}

const platesPath = path.join(docs, 'encyclopedia', 'plates.json');
if (fs.existsSync(platesPath)) {
  write('plates.json', read(platesPath));
} else {
  console.log('skipped plates.json: docs/encyclopedia/plates.json not written yet');
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

require('./bundleAbilityCatalog.js').main();
