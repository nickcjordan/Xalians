// Applies docs/ability-catalog/DEDUPE-LEDGER-2026-09-07.md to the catalog markdown.
//
//   node docs/ability-catalog/tools/apply-dedupe-ledger.js [--dry-run]
//
// The ledger is the single source of the edits: this script parses its four class
// tables and, for every row, removes the named entry from every location the row
// lists except the surviving one. Nothing is decided here. Rows dispositioned HOLD
// are skipped entirely.
//
// What it touches, per edited file:
//   - element cells   `**action (N):**  Name [tags] . Name (dual: x) . ...`
//     the losing token is removed together with one adjoining separator, and the
//     declared count N is rewritten to the number of tokens the line now parses to.
//   - neutral pools   `**Neutral pool** (single words):` / `(two-word compositions):`
//     followed by one comma separated list line; the losing item is removed together
//     with one adjoining comma.
//   - a `(dual: x)` note is added to the surviving token when the disposition says so.
//   - a dated `## Dedupe 2026-09-07` section is appended listing every removal.
//
// Name matching follows scripts/bundleAbilityCatalog.js exactly, so that what the
// bundle reports as a duplicate is what gets removed: element tokens drop `[tags]`,
// `(dual|cross|see ...)` notes and `*`; neutral items drop every parenthetical.
//
// Idempotent: a second run finds nothing to remove, so it rewrites no count, adds no
// dual note twice, and appends no second dated section. Only cells it actually edits
// have their declared count rewritten; a cell the ledger does not touch is left alone
// even if its header already disagrees with its list.
const fs = require('fs');
const path = require('path');

const catalogDir = path.join(__dirname, '..');
const LEDGER = path.join(catalogDir, 'DEDUPE-LEDGER-2026-09-07.md');
const SECTION = '## Dedupe 2026-09-07';
const REASON = 'see DEDUPE-LEDGER-2026-09-07.md';
const ACTIONS = ['strike', 'lash', 'crush', 'rake', 'shove', 'drain', 'ambush', 'beam', 'hurl', 'spray', 'burst', 'cloud', 'snare', 'ward', 'mend', 'terrorize'];

const dryRun = process.argv.slice(2).includes('--dry-run');

// ---- name normalisation (mirrors the bundler) ----------------------------------

function elementName(token) {
  return token
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\((dual|cross|see)[^)]*\)/gi, '')
    .replace(/\*/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function neutralName(item) {
  return item
    .replace(/\([^)]*\)/g, '')
    .replace(/\*/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

const eq = (a, b) => a.toLowerCase() === b.toLowerCase();

// ---- ledger ---------------------------------------------------------------------

// A ledger row: | Name | loc, loc | disposition | reason |
function parseLedger() {
  const text = fs.readFileSync(LEDGER, 'utf8');
  const rows = [];
  const seen = new Map();
  text.split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t.startsWith('|') || !t.endsWith('|')) return;
    const cells = t.slice(1, -1).split('|').map((c) => c.trim());
    if (cells.length !== 4) return;
    if (cells[0] === 'Name' || /^-+$/.test(cells[0])) return;
    const [name, where, disposition] = cells;
    if (!/^(HOLD|[a-z]+\/[a-z]+)/.test(disposition)) return; // header and tally tables
    const locations = where.split(',').map((s) => s.trim()).filter(Boolean);
    if (!locations.every((l) => /^[a-z]+\/[a-z]+$/.test(l))) {
      throw new Error(`ledger line ${i + 1}: unparseable locations "${where}"`);
    }
    const m = disposition.match(/^([a-z]+\/[a-z]+)(?:\s*\(dual:\s*([a-z]+)\))?$/);
    const row = {
      name,
      locations,
      hold: disposition === 'HOLD',
      survivor: m ? m[1] : null,
      dual: m && m[2] ? m[2] : null,
      line: i + 1,
    };
    if (!row.hold && !row.survivor) throw new Error(`ledger line ${i + 1}: bad disposition "${disposition}"`);
    if (!row.hold && !row.locations.includes(row.survivor)) {
      throw new Error(`ledger line ${i + 1}: survivor ${row.survivor} is not one of the listed locations`);
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      const prev = seen.get(key);
      if (prev.survivor !== row.survivor || prev.dual !== row.dual) {
        throw new Error(`ledger: "${name}" has two disagreeing dispositions (lines ${prev.line} and ${row.line})`);
      }
      return;
    }
    seen.set(key, row);
    rows.push(row);
  });
  if (rows.length === 0) throw new Error('ledger: no rows parsed');
  return rows;
}

// ---- file model -----------------------------------------------------------------

function fileFor(element) {
  return element === 'neutral' ? 'neutral-pools.md' : `consolidated-${element}.md`;
}

const files = new Map(); // filename -> { lines, changed, removals: [] }

function load(filename) {
  if (!files.has(filename)) {
    const p = path.join(catalogDir, filename);
    const text = fs.readFileSync(p, 'utf8');
    // the catalog files are a mix of CRLF and LF; keep each file's own ending
    const eol = text.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
    files.set(filename, { path: p, eol, lines: text.split(/\r?\n/), changed: false, removals: [] });
  }
  return files.get(filename);
}

// Index of element cell lines: action -> line number.
function elementCells(f) {
  const idx = {};
  f.lines.forEach((line, i) => {
    const m = line.match(/^\*\*([a-z]+) \((\d+)\):\*\*\s*(.*)$/);
    if (m && ACTIONS.includes(m[1]) && idx[m[1]] === undefined) idx[m[1]] = i;
  });
  return idx;
}

// Index of neutral pool list lines: action -> [line numbers].
function neutralPools(f) {
  const idx = {};
  let action = null;
  f.lines.forEach((line, i) => {
    const h = line.match(/^##\s+\d+\.\s+([A-Z]+)/);
    if (h) {
      const a = h[1].toLowerCase();
      action = ACTIONS.includes(a) ? a : null;
      return;
    }
    if (!action) return;
    if (/^\*\*Neutral pool\*\*/.test(line.trim())) {
      let j = i + 1;
      while (j < f.lines.length && f.lines[j].trim() === '') j++;
      if (j < f.lines.length) (idx[action] = idx[action] || []).push(j);
    }
  });
  return idx;
}

// ---- edits ----------------------------------------------------------------------

// Removes every token matching name from a ` . ` separated cell line. Returns the
// new line, or null when nothing matched.
function removeFromCell(line, name) {
  const m = line.match(/^(\*\*[a-z]+ \()(\d+)(\):\*\*\s*)(.*)$/);
  if (!m) return null;
  const tokens = m[4].split(' · ');
  const kept = tokens.filter((tok) => !eq(elementName(tok), name));
  if (kept.length === tokens.length) return null;
  const count = kept.filter((tok) => elementName(tok) !== '').length;
  return m[1] + count + m[3] + kept.join(' · ');
}

function removeFromPool(line, name) {
  const items = line.split(',');
  const kept = items.filter((it) => !eq(neutralName(it), name));
  if (kept.length === items.length) return null;
  return kept
    .map((it, i) => (i === 0 ? it.trimStart() : it))
    .join(',')
    .replace(/^\s+/, '')
    .replace(/\s+$/, '');
}

function addDual(line, name, dual) {
  const m = line.match(/^(\*\*[a-z]+ \(\d+\):\*\*\s*)(.*)$/);
  if (!m) return null;
  let touched = false;
  const tokens = m[2].split(' · ').map((tok) => {
    if (!eq(elementName(tok), name)) return tok;
    if (new RegExp(`\\(dual:[^)]*\\b${dual}\\b`, 'i').test(tok)) return tok;
    touched = true;
    return `${tok.trimEnd()} (dual: ${dual})`;
  });
  return touched ? m[1] + tokens.join(' · ') : null;
}

function applyRow(row, stats) {
  if (row.hold) {
    stats.held += 1;
    return;
  }
  row.locations.forEach((location) => {
    if (location === row.survivor) return;
    const [element, action] = location.split('/');
    const filename = fileFor(element);
    const f = load(filename);
    let removed = false;
    if (element === 'neutral') {
      const lineNos = neutralPools(f)[action] || [];
      lineNos.forEach((n) => {
        const next = removeFromPool(f.lines[n], row.name);
        if (next !== null) {
          f.lines[n] = next;
          removed = true;
        }
      });
    } else {
      const n = elementCells(f)[action];
      if (n !== undefined) {
        const next = removeFromCell(f.lines[n], row.name);
        if (next !== null) {
          f.lines[n] = next;
          removed = true;
        }
      }
    }
    if (removed) {
      f.changed = true;
      f.removals.push({ name: row.name, action, survivor: row.survivor });
      stats.removed += 1;
    } else {
      stats.alreadyGone += 1;
    }
  });
  if (row.dual) {
    const [element, action] = row.survivor.split('/');
    if (element !== 'neutral') {
      const f = load(fileFor(element));
      const n = elementCells(f)[action];
      if (n !== undefined) {
        const next = addDual(f.lines[n], row.name, row.dual);
        if (next !== null) {
          f.lines[n] = next;
          f.changed = true;
          stats.duals += 1;
        }
      }
    }
  }
}

function appendSection(f) {
  const body = f.removals
    .slice()
    .sort((a, b) => a.action.localeCompare(b.action) || a.name.localeCompare(b.name))
    .map((r) => `- \`${r.action}\`: removed **${r.name}** (survives in \`${r.survivor}\`), ${REASON}.`);
  const block = [
    SECTION,
    '',
    `${f.removals.length} duplicate placements removed by \`docs/ability-catalog/tools/apply-dedupe-ledger.js\`, ${REASON}.`,
    '',
  ]
    .concat(body)
    .concat(['']);
  while (f.lines.length && f.lines[f.lines.length - 1].trim() === '') f.lines.pop();
  f.lines.push('', ...block);
}

function main() {
  const rows = parseLedger();
  const stats = { removed: 0, alreadyGone: 0, held: 0, duals: 0 };
  rows.forEach((row) => applyRow(row, stats));

  const report = [];
  files.forEach((f, filename) => {
    if (!f.changed) return;
    if (f.removals.length && !f.lines.some((l) => l.trim() === SECTION)) appendSection(f);
    report.push({ filename, removals: f.removals.length });
    if (!dryRun) fs.writeFileSync(f.path, f.lines.join(f.eol));
  });

  report.sort((a, b) => b.removals - a.removals);
  console.log(`${dryRun ? 'DRY RUN, nothing written' : 'applied'}: ${rows.length} ledger rows`);
  console.log(`  ${stats.removed} entries removed, ${stats.alreadyGone} already absent, ${stats.duals} dual notes added, ${stats.held} rows held`);
  report.forEach((r) => console.log(`  ${r.filename.padEnd(26)} ${String(r.removals).padStart(4)} removed`));
  if (report.length === 0) console.log('  no file needed changing (the ledger is already applied)');
}

if (require.main === module) {
  main();
}

module.exports = { parseLedger, removeFromCell, removeFromPool, addDual, main };
