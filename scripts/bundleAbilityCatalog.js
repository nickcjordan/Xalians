// Bundles the ability-name catalog (docs/ability-catalog/consolidated-<element>.md, one
// file per element, sixteen cells each, plus neutral-pools.md, one pool per action) into
// lambda/src/json/abilityCatalog.json so the generator can draw names at run time.
//
// The markdown is the source of truth and stays hand-audited; this script only reads the
// cell lines. Cell line form (see any consolidated file, "## Cells"):
//
//   **strike (78):** Breaker · Water Hammer · Fluke Slam [tail] · Waterspout (dual: air)
//
// A bracketed list is the set of instruments allowed to draw the name (untagged names are
// drawable by any instrument that can perform the action). Dual cross-references stay in
// the owning element's cell; the "(dual: x)" note is dropped.
//
// Neutral pool form (neutral-pools.md, one "## N. ACTION" section per action):
//
//   **Neutral pool** (single words):
//   Blow, Strike, Body Slam (instrument: body), Roundhouse (flag: ...held for auditor)
//
// Names with an "(instrument: ...)" note carry those tags; names with a "(flag: ...)"
// note are held out of the pool, per the file's own disposition notes.
//
// Output shape (compact on purpose, the file ships in the frontend bundle):
//
//   { version, source, elements: { fire: { strike: [ "Blazing Strike", ["Blazing Punch", ["fists"]] ] } },
//     neutral: { strike: [ ... same entry shape ... ] }, counts: { ... } }
//
// Idempotent. Run by hand after any catalog change (bundleLore.js calls it too):
//   node scripts/bundleAbilityCatalog.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const catalogDir = path.join(root, 'docs', 'ability-catalog');
const outDir = path.join(root, 'lambda', 'src', 'json');

const ELEMENTS = ['fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock', 'chemical', 'air', 'psychic', 'ice', 'metal', 'sand'];
const ACTIONS = ['strike', 'lash', 'crush', 'rake', 'shove', 'drain', 'ambush', 'beam', 'hurl', 'spray', 'burst', 'cloud', 'snare', 'ward', 'mend', 'terrorize'];
const INSTRUMENTS = new Set([
  'jaws', 'fangs', 'beak', 'tusks', 'horns', 'antlers', 'trunk', 'tongue', 'crest', 'lure', 'claws', 'talons', 'fists', 'hooves',
  'pincers', 'blades', 'spurs', 'wings', 'tail', 'stinger', 'rattle', 'coils', 'hide', 'shell', 'spines', 'tendrils', 'roots',
  'pseudopods', 'spinnerets', 'light-organs', 'vents', 'core', 'antennae', 'body', 'mind', 'gaze', 'voice', 'breath', 'secretion',
  'swarm', 'aura',
]);

function entry(name, tags) {
  const known = (tags || []).map((t) => t.trim().toLowerCase()).filter((t) => INSTRUMENTS.has(t));
  return known.length > 0 ? [name, known] : name;
}

function nameOf(e) {
  return Array.isArray(e) ? e[0] : e;
}

// ---- element cells -----------------------------------------------------------

function parseCellLine(line) {
  const names = [];
  line.split(' · ').forEach((raw) => {
    let s = raw.trim();
    if (!s) return;
    const tagMatch = s.match(/\[([^\]]*)\]/);
    const tags = tagMatch ? tagMatch[1].split(',') : [];
    s = s.replace(/\[[^\]]*\]/g, '').replace(/\((dual|cross|see)[^)]*\)/gi, '').replace(/\*/g, '').trim();
    s = s.replace(/\s+/g, ' ');
    if (!s) return;
    names.push(entry(s, tags));
  });
  return names;
}

function parseElementFile(element) {
  const text = fs.readFileSync(path.join(catalogDir, `consolidated-${element}.md`), 'utf8');
  const cells = {};
  const re = /^\*\*([a-z]+) \((\d+)\):\*\*\s*(.*)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const action = m[1];
    if (!ACTIONS.includes(action)) continue;
    const declared = Number(m[2]);
    const names = parseCellLine(m[3]);
    if (cells[action]) throw new Error(`${element}: cell ${action} appears twice`);
    cells[action] = names;
    if (Math.abs(names.length - declared) > Math.max(3, declared * 0.05)) {
      console.warn(`warn ${element}/${action}: declared ${declared}, parsed ${names.length}`);
    }
  }
  ACTIONS.forEach((a) => {
    if (!cells[a]) throw new Error(`${element}: missing cell ${a}`);
  });
  return cells;
}

// ---- neutral pools --------------------------------------------------------------

function parseNeutralItem(raw) {
  let s = raw.trim();
  if (!s) return null;
  if (/\(flag:/i.test(s)) return null; // held out by the file's own disposition
  const instMatch = s.match(/\(instrument:\s*([^)]*)\)/i);
  const tags = instMatch ? instMatch[1].split(/[\/,]/) : [];
  s = s.replace(/\([^)]*\)/g, '').replace(/\*/g, '').trim().replace(/\s+/g, ' ');
  if (!s || /^[a-z]/.test(s) === false && /^[A-Z]/.test(s) === false) return null;
  if (s.split(' ').length > 3) return null;
  return entry(s, tags);
}

function parseNeutralPools() {
  const text = fs.readFileSync(path.join(catalogDir, 'neutral-pools.md'), 'utf8');
  const pools = {};
  const sections = text.split(/^## /m).slice(1);
  sections.forEach((section) => {
    const header = section.split('\n')[0].trim();
    const hm = header.match(/^\d+\.\s+([A-Z]+)/);
    if (!hm) return;
    const action = hm[1].toLowerCase();
    if (!ACTIONS.includes(action)) return;
    const names = [];
    const lines = section.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/^\*\*Neutral pool\*\*/.test(lines[i].trim())) {
        // the list is the next non-empty line
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        if (j < lines.length) {
          lines[j].split(',').forEach((item) => {
            const e = parseNeutralItem(item);
            if (e) names.push(e);
          });
        }
      }
    }
    pools[action] = names;
  });
  ACTIONS.forEach((a) => {
    if (!pools[a] || pools[a].length === 0) throw new Error(`neutral: missing pool ${a}`);
  });
  return pools;
}

// ---- assemble -----------------------------------------------------------------------

function dedupe(list) {
  const seen = new Set();
  return list.filter((e) => {
    const k = nameOf(e).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function build() {
  const elements = {};
  const counts = { elements: {}, neutral: {} };
  ELEMENTS.forEach((el) => {
    const cells = parseElementFile(el);
    ACTIONS.forEach((a) => { cells[a] = dedupe(cells[a]); });
    elements[el] = cells;
    counts.elements[el] = ACTIONS.reduce((n, a) => n + cells[a].length, 0);
  });
  const neutral = parseNeutralPools();
  ACTIONS.forEach((a) => {
    neutral[a] = dedupe(neutral[a]);
    counts.neutral[a] = neutral[a].length;
  });
  return {
    version: '1.0.0',
    source: 'docs/ability-catalog/consolidated-<element>.md (v5 cells) and neutral-pools.md, bundled by scripts/bundleAbilityCatalog.js',
    elements,
    neutral,
    counts,
  };
}

function main() {
  const catalog = build();
  const outPath = path.join(outDir, 'abilityCatalog.json');
  fs.writeFileSync(outPath, JSON.stringify(catalog) + '\n');
  const total = Object.values(catalog.counts.elements).reduce((a, b) => a + b, 0);
  const neutralTotal = Object.values(catalog.counts.neutral).reduce((a, b) => a + b, 0);
  console.log(`wrote abilityCatalog.json: ${total} element names, ${neutralTotal} neutral names, ${Math.round(fs.statSync(outPath).size / 1024)} KB`);
}

if (require.main === module) {
  main();
}

module.exports = { build, main };
