#!/usr/bin/env node
/*
 * validate-template.js: deterministic checks for one species template produced by the
 * migrate-species skill. It checks shape, registry membership, structural constraints,
 * the planet temperature range, signature collisions and reservations, prose form rules,
 * and that every quotation in the walkthrough exists verbatim in the two source files.
 * It does NOT judge whether a claim is supported by the source; that stays with the
 * independent validator agent.
 *
 * Usage (from the worktree root, C:\dev\src\xalians-catalog):
 *   node docs/species-templates/tools/validate-template.js <key>
 *   node docs/species-templates/tools/validate-template.js --json path.json --md path.md --enc path.encyclopedia.json
 *
 * Exit code 0 when there are no FAIL lines. WARN lines never fail the run but each one
 * must be answered in the walkthrough.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const TEMPLATES = path.join(ROOT, 'docs', 'species-templates');
const CATALOG = path.join(ROOT, 'docs', 'ability-catalog');
const SOURCE_DIRS = ['C:/dev/src/Xalians/lambda/src/json', path.join(ROOT, 'lambda', 'src', 'json')];

// ---------- registries (mirror of SKILL.md sections 5.1 to 5.7; keep in sync) ----------
const ATTRIBUTES = ['strength', 'vitality', 'endurance', 'agility', 'reflex', 'intelligence', 'willpower', 'instinct', 'charisma', 'resilience'];
const ARCHETYPES = ['vanguard', 'juggernaut', 'berserker', 'bulwark', 'survivor', 'stalwart', 'skirmisher', 'runner', 'prowler', 'predator', 'seeker', 'sage', 'virtuoso', 'sovereign', 'rogue', 'balanced'];
const TRAITS = ['healing', 'protective', 'regenerative', 'armored', 'anchored', 'phasing', 'resistant', 'ramming', 'toxic', 'volatile', 'reflective', 'menacing', 'hypnotic', 'perceptive', 'foresighted', 'mind-sealed', 'pack-bonded', 'solitary', 'stealthy', 'nocturnal', 'inspiring', 'slippery', 'luminous', 'telekinetic'];
const TRAIT_EXCLUSIONS = [['pack-bonded', 'solitary']];
const ELEMENTS = {
  fire: { planet: 'magmuth', secondaries: ['rock', 'chemical', 'metal'] },
  water: { planet: 'poseidas', secondaries: ['ice', 'plant', 'chemical'] },
  dark: { planet: 'grimedes', secondaries: ['ghost', 'psychic', 'ice'] },
  light: { planet: 'luminax', secondaries: ['fire', 'electric', 'psychic'] },
  plant: { planet: 'floria', secondaries: ['water', 'chemical', 'psychic'] },
  electric: { planet: 'zolton', secondaries: ['light', 'air', 'metal'] },
  ghost: { planet: 'phantiri', secondaries: ['dark', 'psychic'] },
  rock: { planet: 'stonera', secondaries: ['metal', 'sand', 'fire'] },
  chemical: { planet: 'drainov', secondaries: ['fire', 'metal', 'water'] },
  air: { planet: 'saiphus', secondaries: ['electric', 'water', 'ice'] },
  psychic: { planet: 'telypso', secondaries: ['ghost', 'light', 'dark'] },
  ice: { planet: 'krystos', secondaries: ['metal', 'water', 'dark'] },
  metal: { planet: 'veridium', secondaries: ['electric', 'fire', 'ghost'] },
  sand: { planet: 'endessa', secondaries: ['water', 'rock', 'ghost'] },
};
const ENUMS = {
  corporeality: ['corporeal', 'non-corporeal'],
  composition: ['flesh', 'plant', 'mineral', 'metal', 'slime', 'gas', 'energy', 'spectral'],
  bodyPlan: ['biped', 'quadruped', 'multiped', 'serpentine', 'avian', 'piscine', 'amorphous', 'swarm', 'floating'],
  covering: ['fur', 'feathers', 'scales', 'chitin', 'hide', 'plating', 'crystal', 'mist', 'bare'],
  diet: ['carnivore', 'herbivore', 'omnivore', 'photosynthetic', 'energy-feeder', 'none'],
  communication: ['vocal', 'vibration', 'display', 'chemical', 'telepathic'],
  phase: ['gas', 'liquid', 'vacuum'],
  special: ['echolocation', 'tremorsense', 'electroreception', 'psychic', 'heat-sense', 'void-sense'],
  lifespan: ['fleeting', 'short', 'standard', 'long', 'enduring', 'ageless'],
  chirality: ['rolled', 'achiral'],
  descriptionStatus: ['source', 'upgraded'],
};
const CAPABILITIES = ['flight', 'swim', 'burrow', 'climb', 'sprint', 'leap', 'manipulation'];
const ANATOMY = ['jaws', 'fangs', 'beak', 'tusks', 'horns', 'antlers', 'trunk', 'tongue', 'crest', 'lure', 'claws', 'talons', 'fists', 'hooves', 'pincers', 'blades', 'spurs', 'wings', 'tail', 'stinger', 'rattle', 'coils', 'hide', 'shell', 'spines', 'tendrils', 'roots', 'pseudopods', 'spinnerets', 'light-organs', 'vents', 'core', 'antennae', 'body'];
const CHANNELS = ['mind', 'gaze', 'voice', 'breath', 'secretion', 'swarm', 'aura'];
const GRASPING = ['claws', 'talons', 'fists', 'pincers', 'tendrils', 'pseudopods', 'trunk', 'tail', 'coils'];
const ACTIONS = ['strike', 'lash', 'crush', 'rake', 'shove', 'drain', 'ambush', 'beam', 'hurl', 'spray', 'burst', 'cloud', 'snare', 'ward', 'mend', 'terrorize'];
const ALLOWED = {
  jaws: ['strike', 'crush', 'rake', 'drain', 'snare'], fangs: ['strike', 'drain', 'ambush'], beak: ['strike', 'crush', 'rake', 'drain', 'ambush'],
  tusks: ['strike', 'shove', 'rake', 'crush', 'terrorize'], horns: ['strike', 'shove', 'crush', 'ward', 'terrorize'], antlers: ['strike', 'shove', 'snare', 'terrorize'],
  trunk: ['lash', 'snare', 'shove', 'spray', 'strike'], tongue: ['lash', 'snare', 'strike', 'drain'], crest: ['beam', 'burst', 'terrorize', 'ward'], lure: ['ambush', 'beam', 'snare'],
  claws: ['strike', 'rake', 'crush', 'shove', 'ambush'], talons: ['strike', 'rake', 'crush', 'snare'], fists: ['strike', 'crush', 'shove'], hooves: ['strike', 'crush', 'shove'],
  pincers: ['strike', 'crush', 'snare', 'shove', 'ward', 'hurl'], blades: ['strike', 'rake', 'lash'], spurs: ['strike', 'rake', 'ambush'], wings: ['strike', 'lash', 'shove', 'hurl', 'ward'],
  tail: ['strike', 'lash', 'crush', 'shove', 'snare', 'hurl'], stinger: ['strike', 'drain', 'ambush', 'terrorize'], rattle: ['ward', 'terrorize'], coils: ['crush', 'snare', 'shove', 'ward'],
  hide: ['ward', 'shove'], shell: ['ward', 'shove', 'crush'], spines: ['strike', 'rake', 'ward', 'hurl', 'burst'], tendrils: ['lash', 'snare', 'crush', 'drain', 'shove', 'strike'],
  roots: ['snare', 'strike', 'shove', 'drain', 'ward'], pseudopods: ['strike', 'crush', 'shove', 'snare', 'lash', 'drain'], spinnerets: ['snare', 'ward', 'hurl'],
  'light-organs': ['beam', 'burst', 'ward', 'terrorize', 'mend'], vents: ['spray', 'cloud', 'burst', 'ward'], core: ['beam', 'burst', 'ward'], antennae: ['lash', 'snare'],
  body: ['strike', 'crush', 'shove', 'ward', 'burst', 'terrorize'],
  mind: ['snare', 'shove', 'hurl', 'crush', 'drain', 'ward', 'terrorize', 'mend'], gaze: ['terrorize', 'snare', 'drain', 'beam'], voice: ['terrorize', 'ward', 'burst'],
  breath: ['spray', 'cloud', 'burst', 'beam'], secretion: ['spray', 'cloud', 'burst', 'drain', 'snare', 'ward', 'mend'], swarm: ['cloud', 'strike', 'drain', 'snare', 'rake', 'terrorize'],
  aura: ['ward', 'cloud', 'terrorize', 'drain', 'mend'],
};
const FORBIDDEN_TRAIT_KEYS = ['healer', 'guardian', 'pack-hunter', 'lone-stalker', 'charger', 'venomous', 'ambusher', 'mesmeric', 'keen-sensed', 'iron-willed', 'enduring', 'colossal', 'linked', 'conduit', 'skittish'];

// ---------- reporting ----------
const out = [];
const fail = (code, msg) => out.push(['FAIL', code, msg]);
const warn = (code, msg) => out.push(['WARN', code, msg]);
const ok = (code, msg) => out.push(['ok', code, msg]);

// ---------- args ----------
const argv = process.argv.slice(2);
let key = null, jsonPath = null, mdPath = null, encPath = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--json') jsonPath = argv[++i];
  else if (argv[i] === '--md') mdPath = argv[++i];
  else if (argv[i] === '--enc') encPath = argv[++i];
  else key = argv[i];
}
if (key) {
  jsonPath = jsonPath || path.join(TEMPLATES, key + '.json');
  mdPath = mdPath || path.join(TEMPLATES, key + '.md');
  encPath = encPath || path.join(TEMPLATES, key + '.encyclopedia.json');
}
if (!jsonPath) { console.error('usage: validate-template.js <key> | --json p --md p --enc p'); process.exit(2); }

function readJson(p, label) {
  if (!p || !fs.existsSync(p)) { fail('file.missing', label + ' not found: ' + p); return null; }
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { fail('file.parse', label + ' is not valid JSON: ' + e.message); return null; }
}
function readText(p, label) {
  if (!p || !fs.existsSync(p)) { fail('file.missing', label + ' not found: ' + p); return ''; }
  return fs.readFileSync(p, 'utf8');
}
const T = readJson(jsonPath, 'template');
const MD = readText(mdPath, 'walkthrough');
const ENC = readJson(encPath, 'encyclopedia entry');

// ---------- sources ----------
let species = null, planet = null;
(function loadSources() {
  const dir = SOURCE_DIRS.find(d => fs.existsSync(path.join(d, 'species.json')));
  if (!dir) { fail('source.missing', 'species.json not found in ' + SOURCE_DIRS.join(' or ')); return; }
  const speciesAll = JSON.parse(fs.readFileSync(path.join(dir, 'species.json'), 'utf8'));
  const planetsAll = JSON.parse(fs.readFileSync(path.join(dir, 'planets.json'), 'utf8'));
  const name = T && (T.name || T.key);
  species = speciesAll.find(s => name && s.name.toLowerCase() === String(name).toLowerCase());
  if (!species) { fail('source.species', 'no species.json entry matches name/key "' + name + '"'); return; }
  planet = planetsAll.find(p => p.name.toLowerCase() === species.planet.toLowerCase());
  if (!planet) fail('source.planet', 'no planets.json entry for ' + species.planet);
})();

// ---------- helpers ----------
const isLower = s => typeof s === 'string' && s === s.toLowerCase();
const isBand = (v, lo = 0, hi = 100) => Array.isArray(v) && v.length === 2 && v.every(n => Number.isInteger(n) && n >= lo && n <= hi) && v[0] <= v[1];
const has = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k);
function checkEnum(code, value, allowed, label) {
  if (typeof value !== 'string') { fail(code, label + ' missing or not a string'); return false; }
  if (!isLower(value)) fail(code + '.case', label + ' must be lowercase: ' + value);
  if (!allowed.includes(value)) { fail(code, label + ' "' + value + '" is not in the registry [' + allowed.join(', ') + ']'); return false; }
  return true;
}
function checkEnumArray(code, value, allowed, label, allowEmpty = true) {
  if (!Array.isArray(value)) { fail(code, label + ' must be an array'); return false; }
  if (!allowEmpty && value.length === 0) fail(code + '.empty', label + ' must not be empty');
  let good = true;
  for (const v of value) if (!checkEnum(code, v, allowed, label + ' item')) good = false;
  if (new Set(value).size !== value.length) fail(code + '.dup', label + ' has duplicates');
  return good;
}
const normalize = s => String(s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u2026/g, '...').replace(/\s+/g, ' ').trim();
const fold = s => normalize(s).toLowerCase();
const EM_DASH = /\u2014/;
const proseFieldsChecked = [];
function checkProse(code, text, label, opts = {}) {
  if (typeof text !== 'string' || !text.trim()) { fail(code, label + ' is missing or empty'); return; }
  proseFieldsChecked.push([label, text]);
  if (EM_DASH.test(text)) fail(code + '.emdash', label + ' contains an em-dash');
  if (/\b(HP|damage|cooldown|stat|stats|turn|turns|mint|minted|NFT|blockchain|wallet|crypto)\b/i.test(text)) fail(code + '.mechanics', label + ' contains game-mechanics or crypto vocabulary');
  if (/\b(he|she|his|her|mate|mates|offspring|father|mother|breed|breeds)\b/i.test(text)) warn(code + '.lineage', label + ' contains gendered or lineage language (Xalians have no sex or lineage); confirm it is not about the species');
  if (opts.noElementKeys) {
    const hits = Object.keys(ELEMENTS).filter(e => new RegExp('\\b' + e + '\\b', 'i').test(text));
    if (hits.length) warn(code + '.elementkey', label + ' uses element key word(s) as plain words: ' + hits.join(', ') + ' (allowed only as ordinary English, never as a type label)');
  }
  if (opts.wordRange) {
    const words = text.trim().split(/\s+/).length;
    if (words < opts.wordRange[0] || words > opts.wordRange[1]) fail(code + '.length', label + ' is ' + words + ' words; expected ' + opts.wordRange[0] + ' to ' + opts.wordRange[1]);
  }
}

// ---------- template checks ----------
if (T) {
  // identity
  if (!isLower(T.key || '')) fail('key', 'key must be a lowercase string');
  if (species && T.key !== species.name.toLowerCase()) fail('key.match', 'key "' + T.key + '" should be the lowercase species name "' + species.name.toLowerCase() + '"');
  if (species && T.name !== species.name) fail('name.match', 'name "' + T.name + '" must equal the species.json name "' + species.name + '"');
  const elementOk = checkEnum('element', T.element, Object.keys(ELEMENTS), 'element');
  if (elementOk && species && T.element !== species.type.toLowerCase()) fail('element.match', 'element "' + T.element + '" does not match species.json type "' + species.type + '"');
  if (!isLower(T.homePlanet || '')) fail('homePlanet.case', 'homePlanet must be lowercase');
  if (species && T.homePlanet !== species.planet.toLowerCase()) fail('homePlanet.match', 'homePlanet "' + T.homePlanet + '" does not match species.json planet "' + species.planet + '"');
  if (elementOk && ELEMENTS[T.element].planet !== T.homePlanet) warn('homePlanet.element', 'homePlanet "' + T.homePlanet + '" is not the home world of element ' + T.element + ' (' + ELEMENTS[T.element].planet + ')');
  if (!Array.isArray(T.generatorPlanets) || !T.generatorPlanets.includes(T.homePlanet)) fail('generatorPlanets', 'generatorPlanets must be an array containing the homePlanet');
  else if (!T.generatorPlanets.every(isLower)) fail('generatorPlanets.case', 'generatorPlanets must be lowercase');

  // lore
  const L = T.lore || {};
  checkEnum('lore.descriptionStatus', L.descriptionStatus, ENUMS.descriptionStatus, 'lore.descriptionStatus');
  if (L.descriptionStatus === 'source') {
    if (species && normalize(L.description) !== normalize(species.description)) fail('lore.description.verbatim', 'descriptionStatus is "source" but description is not the species.json text verbatim');
    checkProse('lore.description', L.description, 'lore.description');
  } else {
    checkProse('lore.description', L.description, 'lore.description', { wordRange: [60, 140] });
  }
  if (typeof L.biomeNiche !== 'string' || !L.biomeNiche.trim()) fail('lore.biomeNiche', 'biomeNiche missing');
  else if (EM_DASH.test(L.biomeNiche)) fail('lore.biomeNiche.emdash', 'biomeNiche contains an em-dash');

  // physiology
  const P = T.physiology || {};
  if (!T.physiology) fail('physiology', 'physiology block missing');
  checkEnum('corporeality', P.corporeality, ENUMS.corporeality, 'corporeality');
  if (!P.composition || !checkEnum('composition.primary', P.composition.primary, ENUMS.composition, 'composition.primary')) { /* reported */ }
  else if (has(P.composition, 'secondary')) {
    checkEnum('composition.secondary', P.composition.secondary, ENUMS.composition, 'composition.secondary');
    if (P.composition.secondary === P.composition.primary) fail('composition.same', 'composition.secondary equals primary');
  }
  checkEnum('bodyPlan', P.bodyPlan, ENUMS.bodyPlan, 'bodyPlan');
  const anatomyOk = checkEnumArray('anatomy', P.anatomy, ANATOMY, 'anatomy', false);
  checkEnum('covering', P.covering, ENUMS.covering, 'covering');
  if (!P.size || !Array.isArray(P.size.heightCm) || !Array.isArray(P.size.weightKg)) fail('size', 'size.heightCm and size.weightKg must be [lo, hi] arrays');
  else {
    const h = P.size.heightCm, w = P.size.weightKg;
    if (!(h.length === 2 && h[0] > 0 && h[0] <= h[1])) fail('size.height', 'heightCm band malformed: ' + JSON.stringify(h));
    if (!(w.length === 2 && w[0] > 0 && w[0] <= w[1])) fail('size.weight', 'weightKg band malformed: ' + JSON.stringify(w));
    if (species && /(\d+)\s*cm/.test(species.height)) {
      const legacy = Number(RegExp.$1);
      if (h.length === 2 && (legacy < h[0] * 0.6 || legacy > h[1] * 1.6)) warn('size.height.anchor', 'legacy height ' + legacy + ' cm is far outside the band ' + JSON.stringify(h) + '; the legacy height is a fair anchor');
    }
  }
  checkEnum('lifespan', P.lifespan, ENUMS.lifespan, 'lifespan');
  if (!P.genome || !checkEnum('genome.chirality', P.genome.chirality, ENUMS.chirality, 'genome.chirality')) { /* reported */ }
  checkEnum('diet', P.diet, ENUMS.diet, 'diet');
  checkEnumArray('communication', P.communication, ENUMS.communication, 'communication');
  checkEnumArray('breathes', P.breathes, ENUMS.phase, 'breathes');
  const ET = P.environmentalTolerance || {};
  if (!P.environmentalTolerance) fail('environmentalTolerance', 'environmentalTolerance missing');
  checkEnumArray('ambientMedia', ET.ambientMedia, ENUMS.phase, 'ambientMedia', false);
  if (Array.isArray(P.breathes) && Array.isArray(ET.ambientMedia) && !P.breathes.every(b => ET.ambientMedia.includes(b))) fail('breathes.subset', 'breathes must be a subset of ambientMedia');
  const TC = ET.temperatureC;
  if (!TC || typeof TC.min !== 'number' || typeof TC.max !== 'number' || TC.min > TC.max) fail('temperature', 'temperatureC must be { min, max } in Celsius with min <= max');
  else if (planet && planet.data) {
    const lo = parseFloat(String(planet.data['Temperature Low'] || '').replace(/[^-\d.]/g, ' ').trim().split(/\s+/)[0]);
    const hi = parseFloat(String(planet.data['Temperature High'] || '').replace(/[^-\d.]/g, ' ').trim().split(/\s+/)[0]);
    if (Number.isFinite(lo) && Number.isFinite(hi)) {
      if (TC.min < lo || TC.max > hi) fail('temperature.planet', 'temperatureC [' + TC.min + ', ' + TC.max + '] extends outside the ' + planet.name + ' data block range [' + lo + ', ' + hi + '] C; a wider band needs a quoted source sentence and a WARN-level override, otherwise narrow it');
      else ok('temperature.planet', 'temperatureC [' + TC.min + ', ' + TC.max + '] lies inside ' + planet.name + ' range [' + lo + ', ' + hi + '] C');
    } else warn('temperature.planet', 'could not parse the planet data block temperatures');
  }
  const C = P.capabilities || {};
  if (!P.capabilities) fail('capabilities', 'capabilities missing');
  for (const c of CAPABILITIES) if (!isBand(C[c])) fail('capabilities.' + c, 'capabilities.' + c + ' must be a [lo, hi] band of integers 0 to 100');
  for (const c of Object.keys(C)) if (!CAPABILITIES.includes(c)) fail('capabilities.unknown', 'unknown capability "' + c + '"');
  const S = P.senses || {};
  if (!P.senses) fail('senses', 'senses missing');
  for (const s of ['sight', 'hearing', 'smell']) if (!isBand(S[s])) fail('senses.' + s, 'senses.' + s + ' must be a [lo, hi] band');
  if (has(S, 'special')) checkEnumArray('senses.special', S.special, ENUMS.special, 'senses.special');
  if (has(S, 'special') && Array.isArray(S.special) && S.special.length === 0) fail('senses.special.empty', 'senses.special is optional; omit it rather than leaving it empty');
  if (P.corporeality === 'non-corporeal' && P.composition && !['spectral', 'energy', 'gas'].includes(P.composition.primary)) warn('corporeality.composition', 'non-corporeal body with composition ' + P.composition.primary);
  if (P.bodyPlan === 'avian' && isBand(C.flight) && C.flight[1] === 0) warn('flight.avian', 'avian body plan with zero flight');
  if (isBand(C.flight) && C.flight[1] > 0 && anatomyOk && !P.anatomy.includes('wings') && P.bodyPlan !== 'floating' && P.corporeality !== 'non-corporeal') warn('flight.means', 'flight above 0 with no wings, floating body plan, or non-corporeal body; justify the means in the walkthrough');

  // archetypes
  const AW = T.archetypeWeights || {};
  if (!T.archetypeWeights || Object.keys(AW).length === 0) fail('archetypeWeights', 'archetypeWeights must be a non-empty subset of the 16');
  for (const [k, v] of Object.entries(AW)) {
    if (!ARCHETYPES.includes(k)) fail('archetypeWeights.key', 'unknown archetype "' + k + '"');
    if (!(Number.isInteger(v) && v > 0)) fail('archetypeWeights.weight', 'archetype weight for ' + k + ' must be a positive integer');
  }

  // attributes
  const A = T.attributes || {};
  if (!T.attributes) fail('attributes', 'attributes missing');
  for (const a of ATTRIBUTES) if (!isBand(A[a])) fail('attributes.' + a, 'attributes.' + a + ' must be a [lo, hi] band 0 to 100');
  for (const a of Object.keys(A)) if (!ATTRIBUTES.includes(a)) fail('attributes.unknown', 'unknown attribute "' + a + '"');
  if (isBand(A.intelligence) && A.intelligence[1] > 85) fail('attributes.intelligence', 'intelligence upper bound ' + A.intelligence[1] + ' reaches true-human range; no species bands intelligence above 85');

  // affinity
  if (has(T, 'affinityOdds')) {
    const o = T.affinityOdds;
    if (!o || typeof o.none !== 'number' || typeof o.secondary !== 'number' || Math.abs(o.none + o.secondary - 1) > 1e-9) fail('affinityOdds', 'affinityOdds must be { none, secondary } summing to 1');
    else warn('affinityOdds.override', 'affinityOdds overrides the 75/25 baseline; the walkthrough must carry the lore reason');
  }

  // traits
  const TR = T.traits || {};
  if (!T.traits) fail('traits', 'traits block missing');
  const g = Array.isArray(TR.guaranteed) ? TR.guaranteed : (fail('traits.guaranteed', 'traits.guaranteed must be an array'), []);
  checkEnumArray('traits.guaranteed', g, TRAITS, 'traits.guaranteed');
  const pool = TR.pool && typeof TR.pool === 'object' ? TR.pool : (fail('traits.pool', 'traits.pool must be an object of trait: weight'), {});
  for (const [k, v] of Object.entries(pool)) {
    if (!TRAITS.includes(k)) fail('traits.pool.key', 'unknown trait "' + k + '"' + (FORBIDDEN_TRAIT_KEYS.includes(k) ? ' (retired draft key)' : ''));
    if (!(Number.isInteger(v) && v > 0)) fail('traits.pool.weight', 'pool weight for ' + k + ' must be a positive integer');
    if (g.includes(k)) fail('traits.pool.dup', 'trait "' + k + '" is both guaranteed and in the pool');
  }
  const rc = TR.rolledCount;
  if (!isBand(rc, 0, 3)) fail('traits.rolledCount', 'rolledCount must be [lo, hi] with 0 <= lo <= hi <= 3');
  else {
    if (g.length + rc[1] > 3) fail('traits.total.max', 'guaranteed (' + g.length + ') + rolledCount max (' + rc[1] + ') exceeds 3');
    if (g.length + rc[0] < 1) fail('traits.total.min', 'guaranteed + rolledCount min is below 1');
    if (rc[1] > 0 && Object.keys(pool).length === 0) fail('traits.pool.empty', 'rolledCount allows rolls but the pool is empty');
    if (rc[1] === 0 && Object.keys(pool).length > 0) warn('traits.pool.unused', 'pool has entries but rolledCount max is 0');
  }
  for (const [a, b] of TRAIT_EXCLUSIONS) {
    const all = [...g, ...Object.keys(pool)];
    if (all.includes(a) && all.includes(b)) fail('traits.exclusion', a + ' and ' + b + ' cannot co-occur across guaranteed and pool');
  }
  if (P.corporeality === 'non-corporeal' && !g.includes('phasing')) fail('traits.phasing', 'non-corporeal bodies must guarantee phasing');
  if (anatomyOk && (P.anatomy.includes('shell') || P.covering === 'plating' || P.covering === 'chitin') && !g.includes('armored')) warn('traits.armored', 'shell, plating, or chitin present but armored is not guaranteed; justify in the walkthrough');
  if (isBand(C.manipulation) && C.manipulation[1] > 40) {
    const grasp = anatomyOk && P.anatomy.some(k => GRASPING.includes(k));
    if (!grasp && !g.includes('telekinetic')) fail('manipulation.means', 'manipulation upper bound ' + C.manipulation[1] + ' above 40 without grasping anatomy or guaranteed telekinetic');
  }

  // instruments
  const I = Array.isArray(T.instruments) ? T.instruments : (fail('instruments', 'instruments must be an array'), []);
  if (I.length < 1 || I.length > 3) fail('instruments.count', 'instruments must have 1 to 3 entries, has ' + I.length);
  if (new Set(I).size !== I.length) fail('instruments.dup', 'instruments has duplicates');
  const predicate = {
    mind: () => T.element === 'psychic' || (Array.isArray(S.special) && S.special.includes('psychic')) || g.includes('telekinetic') || g.includes('hypnotic'),
    voice: () => Array.isArray(P.communication) && P.communication.includes('vocal'),
    breath: () => Array.isArray(P.breathes) && P.breathes.length > 0,
    swarm: () => P.bodyPlan === 'swarm',
    gaze: () => isBand(S.sight) && S.sight[1] > 0,
  };
  for (const inst of I) {
    if (ANATOMY.includes(inst)) { if (anatomyOk && !P.anatomy.includes(inst)) fail('instruments.anatomy', 'physical instrument "' + inst + '" is not in anatomy'); }
    else if (CHANNELS.includes(inst)) {
      if (predicate[inst]) { if (!predicate[inst]()) fail('instruments.predicate', 'channel "' + inst + '" fails its template predicate'); }
      else warn('instruments.predicate.source', 'channel "' + inst + '" has a source-text predicate (' + (inst === 'aura' ? 'a whole-body emanation acting on everything around it' : 'an emitted substance') + '); the validator agent must confirm the quoted sentence');
      if (inst === 'gaze') warn('instruments.predicate.source', 'channel "gaze" also needs the description to support a stare; the validator agent must confirm');
    } else fail('instruments.registry', 'instrument "' + inst + '" is not an anatomy key or channel');
  }

  // signature
  const SG = T.signatureAbility || {};
  if (!T.signatureAbility) fail('signature', 'signatureAbility missing');
  if (typeof SG.name !== 'string' || !SG.name.trim()) fail('signature.name', 'signature name missing');
  else {
    if (/-/.test(SG.name)) fail('signature.name.hyphen', 'signature name contains a hyphen');
    if (/'s\b|s'\s/.test(SG.name)) fail('signature.name.possessive', 'signature name is possessive');
    if (/[^\x20-\x7E]/.test(SG.name)) fail('signature.name.ascii', 'signature name has non-ASCII characters');
  }
  const sigInstOk = typeof SG.instrument === 'string' && (ANATOMY.includes(SG.instrument) || CHANNELS.includes(SG.instrument));
  if (!sigInstOk) fail('signature.instrument', 'signature instrument "' + SG.instrument + '" is not registry vocabulary');
  else {
    if (ANATOMY.includes(SG.instrument) && anatomyOk && !P.anatomy.includes(SG.instrument)) warn('signature.instrument.anatomy', 'signature instrument "' + SG.instrument + '" is outside the species anatomy (allowed by rule 4; justify)');
    if (!I.includes(SG.instrument)) warn('signature.instrument.list', 'signature instrument "' + SG.instrument + '" is not in the species instrument list (allowed by rule 4; justify)');
  }
  const sigActOk = checkEnum('signature.action', SG.action, ACTIONS, 'signature action');
  if (sigInstOk && sigActOk && !ALLOWED[SG.instrument].includes(SG.action)) warn('signature.action.matrix', 'signature action "' + SG.action + '" is outside the allowed set for ' + SG.instrument + ' [' + ALLOWED[SG.instrument].join(', ') + '] (allowed by rule 4; justify)');
  if (checkEnum('signature.medium', SG.medium, Object.keys(ELEMENTS), 'signature medium') && elementOk) {
    const cover = [T.element, ...ELEMENTS[T.element].secondaries];
    if (!cover.includes(SG.medium)) fail('signature.medium.cover', 'signature medium "' + SG.medium + '" is neither the primary nor an on-graph secondary of ' + T.element + ' [' + cover.join(', ') + ']');
  }
  if (!isBand(SG.intensity, 1, 100)) fail('signature.intensity', 'signature intensity must be a [lo, hi] band 1 to 100');
  checkProse('signature.description', SG.description, 'signature description', { noElementKeys: true });

  // catalog collision and reservation
  if (fs.existsSync(CATALOG) && typeof SG.name === 'string' && species) {
    const files = fs.readdirSync(CATALOG).filter(f => /^consolidated-.*\.md$|^neutral-pools\.md$/.test(f));
    const nameRe = new RegExp('(^|[^A-Za-z])' + SG.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[^A-Za-z])', 'i');
    const speciesRe = new RegExp(species.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    let collisions = [], reservations = [];
    for (const f of files) {
      const lines = fs.readFileSync(path.join(CATALOG, f), 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        const isCell = /^\*\*[a-z]+ \(\d+\):\*\*/.test(line);
        if (isCell && nameRe.test(line)) collisions.push(f + ':' + (i + 1));
        if (!isCell && speciesRe.test(line) && /signature/i.test(line)) reservations.push({ where: f + ':' + (i + 1), line });
      });
    }
    if (collisions.length) fail('signature.collision', 'signature name "' + SG.name + '" collides with a catalog cell entry at ' + collisions.join(', '));
    else ok('signature.collision', 'no catalog collision for "' + SG.name + '"');
    for (const r of reservations) {
      const m = r.line.match(/([A-Z][A-Za-z' ]+?)\s+(?:remains|is|stays)\s+signature-register/);
      const reserved = m ? m[1].trim() : null;
      if (reserved && reserved.toLowerCase() !== SG.name.toLowerCase()) fail('signature.reserved', 'catalog ledger reserves "' + reserved + '" as this species\' signature (' + r.where + ') but the template names "' + SG.name + '"');
      else if (reserved) {
        ok('signature.reserved', 'signature name matches the reserved ledger entry at ' + r.where);
        const rm = r.line.match(/ratified[^)]*?(?:instrument\s+)?([a-z-]+)\s*\/\s*([a-z]+)\s*\/\s*([a-z]+)/i);
        if (rm) {
          const [, ri, ra, rmed] = rm;
          if (SG.instrument !== ri || SG.action !== ra || SG.medium !== rmed) fail('signature.reserved.fields', 'ledger ratifies ' + ri + ' / ' + ra + ' / ' + rmed + ' for this signature (' + r.where + '); template has ' + SG.instrument + ' / ' + SG.action + ' / ' + SG.medium);
        }
      } else warn('signature.reserved', 'ledger mentions this species and a signature at ' + r.where + '; read it: ' + r.line.slice(0, 160));
    }
  }
}

// ---------- encyclopedia ----------
if (ENC && T) {
  if (ENC.key !== T.key) fail('enc.key', 'encyclopedia key must equal the template key');
  if (ENC.title !== T.name) fail('enc.title', 'encyclopedia title must equal the species name');
  if (ENC.category !== 'xalians') fail('enc.category', 'encyclopedia category must be "xalians"');
  if (!Array.isArray(ENC.related) || ENC.related.length) fail('enc.related', 'encyclopedia related must be [] (the orchestrator computes links)');
  checkProse('enc.definition', ENC.definition, 'encyclopedia definition', { noElementKeys: true });
  if (typeof ENC.definition === 'string') {
    const sentences = ENC.definition.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    if (sentences < 1 || sentences > 2) fail('enc.definition.sentences', 'encyclopedia definition should be one or two sentences, has ' + sentences);
    if (!new RegExp('\\b' + T.name + '\\b').test(ENC.definition)) warn('enc.definition.name', 'definition does not name the species');
  }
  for (const k of Object.keys(ENC)) if (!['key', 'title', 'category', 'definition', 'related'].includes(k)) fail('enc.extra', 'unexpected encyclopedia field "' + k + '"');
}

// ---------- walkthrough ----------
if (MD) {
  if (EM_DASH.test(MD)) fail('md.emdash', 'walkthrough contains an em-dash');
  if (!/authored fields/i.test(MD)) fail('md.authored', 'walkthrough has no "Authored fields" section (list every value with no source sentence, or state "none")');
  if (!/thin[- ]combo/i.test(MD)) warn('md.thincombo', 'walkthrough has no thin-combo findings section');
  if (species && planet) {
    const corpus = fold([species.description, ...(planet.history || [])].join(' \n '));
    // Convention (SKILL.md section 6, step 14): double quotes are reserved for verbatim source
    // quotations; anything else in the walkthrough uses single quotes or backticks. Pairing is
    // reset per line so one stray quote cannot mis-pair the rest of the document.
    const skillPath = path.join(ROOT, '.claude', 'skills', 'migrate-species', 'SKILL.md');
    const skillText = fs.existsSync(skillPath) ? fold(fs.readFileSync(skillPath, 'utf8')) : '';
    const own = [T && T.lore && T.lore.description, T && T.signatureAbility && T.signatureAbility.description, ENC && ENC.definition].filter(Boolean).map(fold).join(' \n ');
    const quotes = [];
    for (const line of MD.split(/\r?\n/)) {
      const re = /"([^"]{12,})"/g; let m;
      while ((m = re.exec(line))) quotes.push(m[1]);
      const bq = line.match(/^>\s*"?(.{12,}?)"?\s*$/);
      if (bq) quotes.push(bq[1]);
    }
    let bad = 0;
    const seen = new Set();
    for (const q of quotes) {
      if (/[`*\[\]{}|]/.test(q) || !/^[A-Za-z(]/.test(q.trim())) continue;   // markup or a mid-sentence fragment, not a quotation
      const nq0 = normalize(q).replace(/^"|"$/g, '');
      if (seen.has(nq0)) continue; seen.add(nq0);
      const frags = nq0.split(/\s*\.\.\.\s*/).map(x => x.replace(/^[,;:.\s]+|[,;:.\s]+$/g, '')).filter(x => x.length >= 8);
      for (const nq of frags) {
        if (corpus.includes(nq.toLowerCase()) || own.includes(nq.toLowerCase()) || skillText.includes(nq.toLowerCase())) continue;
        if (/signature-register|remains signature/i.test(nq)) continue;
        bad++; fail('md.quote', 'double-quoted text not found verbatim in species.json, the planet history, or the registry: "' + nq.slice(0, 120) + (nq.length > 120 ? '...' : '') + '"');
      }
    }
    ok('md.quotes', (seen.size - bad) + ' of ' + seen.size + ' distinct quotations found verbatim in the sources');
  }
}

// ---------- report ----------
const fails = out.filter(o => o[0] === 'FAIL').length, warns = out.filter(o => o[0] === 'WARN').length;
for (const [lvl, code, msg] of out) if (lvl !== 'ok' || process.env.VERBOSE) console.log(lvl.padEnd(4) + ' ' + code.padEnd(30) + ' ' + msg);
console.log('\n' + fails + ' FAIL, ' + warns + ' WARN' + (fails ? '' : ' (structurally clean; every WARN must be answered in the walkthrough)'));
process.exit(fails ? 1 : 0);
