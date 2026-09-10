#!/usr/bin/env node
// Applies the 2026-09-10 placement audit (docs/ability-catalog/placement-audit-2026-09-10/class-*.md)
// after the orchestrator's review. Reads every UNSOUND row, drops the ones the orchestrator overturned
// (KEEP) or held for Nick (HOLD), removes the remaining placements from the element files and the neutral
// pools, and adds the "move to" targets where the name is not already there. Writes FABLE-AUDIT.md next to
// the class files with every disposition. Idempotent: a second run finds nothing to remove.
//
//   node docs/ability-catalog/tools/apply-placement-audit.js [--dry]
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const AUDIT = path.join(ROOT, 'docs', 'ability-catalog', 'placement-audit-2026-09-10');
const CATALOG = path.join(ROOT, 'docs', 'ability-catalog');
const DRY = process.argv.includes('--dry');

// Orchestrator overrides (Fable, 2026-09-10). Key = "Name|placement".
// KEEP: the agent's UNSOUND is overturned; the placement stays. Reason recorded in FABLE-AUDIT.md.
const KEEP = {
  // class 1: pattern arguments ("curtain is a ward word elsewhere") are not definition failures; idioms the
  // catalog already tolerates (bolt as projectile) stay; register calls the agent itself flagged as close stay.
  'Ash Sweep|fire/spray': 'a swept shower of ash over an area is spray by its own definition; the lash pattern elsewhere is not a definition',
  'Bolt Hail|electric/hurl': 'the bolt-as-projectile idiom is tolerated across the catalog (the agent kept Surge Barrage on the same ground)',
  'Bolt Salvo|electric/hurl': 'same idiom',
  'Bolt Volley|electric/hurl': 'same idiom',
  'Mist Curtain|water/cloud': 'a curtain of mist is a lingering volume of matter; cloud holds by definition, whatever ward also holds',
  'Mist Shroud|water/cloud': 'same',
  'Mist Veil|water/cloud': 'same',
  'Blinding Glare|electric/terrorize': 'a lightning flash blinds; judgment call, and judgment calls stay',
  'Numbing Lash|electric/lash': 'a shock numbs; judgment call',
  'Numbing Sap|electric/drain': 'same',
  'Piercing Jab|ice/strike': 'an icicle pierces; judgment call',
  'Piercing Rake|ice/rake': 'same',
  'Wire Whip|electric/lash': 'a live wire is an electric idiom; judgment call',
  'Chain Lash|electric/lash': 'chain lightning whips; judgment call',
  'Searing Blow|light/strike': 'focused light sears; the agent cited a lean, not a failure',
  // class 2: presence is an effect occupying space; a psychic strike lands through the gaze (that is the element's fantasy)
  'Baleful Presence|ghost/cloud': 'a presence is an effect that occupies space; cloud names effect as well as matter',
  'Dread Presence|ghost/cloud': 'same', 'Fear Presence|ghost/cloud': 'same', 'Grave Presence|ghost/cloud': 'same',
  'Horror Presence|ghost/cloud': 'same', 'Phantom Presence|ghost/cloud': 'same', 'Sinister Presence|ghost/cloud': 'same',
  'Spectral Presence|ghost/cloud': 'same', 'Terror Presence|ghost/cloud': 'same', 'Vengeful Presence|ghost/cloud': 'same',
  'Wraith Presence|ghost/cloud': 'same',
  'Piercing Gaze|psychic/strike': 'a psychic blow lands without contact; that is the element',
  'Piercing Stare|psychic/strike': 'same',
  'Reagent Volley|chemical/spray': 'agent flagged it as a judgment call; a volley of reagent reads as a shower',
  // class 4
  'Reeling Blow|neutral/shove': 'the name says the target reels, which is force that moves it',
  'Staggering Blow|neutral/shove': 'the name says the target staggers',
  'Buffet|neutral/strike': 'a buffet is also a single blow; judgment call',
  'Snap|neutral/ambush': 'a snap is a sudden closing bite; judgment call',
  // class 3, layer calls: a bare word in an element cell is harmless overlap the owner tolerates, and many of these
  // words ARE the element's medium (beam for light, field for electric, blast for air). Only action failures apply.
  // Elemental words the agent misfiled: generic English stays neutral.
  'Bolt|neutral/ambush': 'to bolt is to dash; plain English, no medium',
  'Attrition|neutral/drain': 'attrition is plain English wearing-down',
  'Essence|neutral/drain': 'essence is not chemical; draining essence is drain by definition',
  'Essence Siphon|neutral/drain': 'same',
  'Toll|neutral/drain': 'toll is plain English',
  'Regeneration|neutral/mend': 'regeneration is generic biology, not plant',
  'Regrowth|neutral/mend': 'regrowth of flesh is generic',
  'Siphon|neutral/drain': 'a siphon is a mechanism, not water',
  'Film|neutral/cloud': 'film is generic',
  'Cloak|neutral/cloud': 'cloak is generic; judgment call on the action',
  'Shackle|neutral/snare': 'shackle is generic restraint',
  'Elixir|neutral/mend': 'the consolidate skill lists tonic and balm as neutral leakage words; elixir is the same register',
  'Tonic|neutral/mend': 'same, named in the skill',
  'Swoop|neutral/ambush': 'any flier swoops',
  'Windmill Strike|neutral/lash': 'windmill is a motion idiom',
  'Upheaval|neutral/burst': 'upheaval is plain English; an outward heave is burst',
  'Upheaval|neutral/shove': 'judgment call',
  'Searing Line|light/beam': 'focused light sears',
  'Momentum Strike|air/strike': 'momentum is in both dark and air productive lists (class 1 agent)',
  'Vise Grip|metal/snare': 'a vise holds; snare holds by definition',
  'Vise Lock|metal/snare': 'same',
  'Aura|neutral/terrorize': 'a menacing aura acts on courage; judgment call',
  'Blast|neutral/spray': 'a blast of spray; judgment call',
  'Jolt|neutral/shove': 'a jolt moves the target; judgment call',
  'Jolt|electric/mend': 'a jolt restarts a heart; electric mend idiom',
};
// HOLD: needs Nick's ruling (the religious-register ward/mend split is already queued for him).
const HOLD = {
  'Benediction|light/mend': 'religious register ward/mend split, queued for Nick',
  'Blessing|light/mend': 'same',
  'Grace|light/mend': 'same',
};
// class 3 NEUTRAL-layer rows: keep every element placement except explicit action failures listed here.
const NEUTRAL_LAYER_ACTION_FAILS = new Set([
  'Vault|rock/terrorize', 'Jolt Strike|electric/ambush', 'Sweeping Strike|air/ambush', 'Sweeping Charge|air/ambush',
  'Sweeping Charge|neutral/shove', 'Mantle|neutral/cloud', 'Veil|neutral/cloud', 'Blast|neutral/beam',
]);

function parseAudit(file) {
  const rows = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 4 || cells[0] === 'Name' || /^-+$/.test(cells[0])) continue;
    let name, layer = null, placement, verdict, reason;
    if (cells.length >= 5 && /^(ELEMENTAL|NEUTRAL)$/.test(cells[1])) [name, layer, placement, verdict, reason] = cells;
    else [name, placement, verdict, reason] = cells;
    if (verdict !== 'UNSOUND') continue;
    const mv = reason.match(/move to ([a-z]+\/[a-z]+)/i);
    rows.push({ name, layer, placement, reason, moveTo: mv ? mv[1].toLowerCase() : null, file: path.basename(file) });
  }
  return rows;
}

const all = ['class-1.md', 'class-2.md', 'class-3.md', 'class-4.md'].flatMap((f) => parseAudit(path.join(AUDIT, f)));
const dispositions = [];
for (const r of all) {
  const key = `${r.name}|${r.placement}`;
  if (KEEP[key]) { dispositions.push({ ...r, disposition: 'KEEP', why: KEEP[key] }); continue; }
  if (HOLD[key]) { dispositions.push({ ...r, disposition: 'HOLD', why: HOLD[key] }); continue; }
  if (r.layer === 'NEUTRAL' && !r.placement.startsWith('neutral/') && !NEUTRAL_LAYER_ACTION_FAILS.has(key)) {
    dispositions.push({ ...r, disposition: 'KEEP', why: 'bare word in an element cell is tolerated overlap; only action failures apply (orchestrator policy)' });
    continue;
  }
  if (r.layer === 'NEUTRAL' && r.placement.startsWith('neutral/') && !NEUTRAL_LAYER_ACTION_FAILS.has(key)) {
    dispositions.push({ ...r, disposition: 'KEEP', why: 'judgment call on a neutral action; judgment calls stay' });
    continue;
  }
  dispositions.push({ ...r, disposition: 'REMOVE', why: r.reason });
}

// ---------- catalog editing ----------
const SEP = ' · ';
function readFile(p) { return fs.readFileSync(p, 'utf8'); }
const edits = { removed: [], added: [], missing: [], alreadyThere: [] };
const elementFiles = {};
function elementPath(el) { return path.join(CATALOG, `consolidated-${el}.md`); }
function loadElement(el) {
  if (!elementFiles[el]) elementFiles[el] = { text: readFile(elementPath(el)), changed: false };
  return elementFiles[el];
}
function cellRegex(action) { return new RegExp(`^(\\*\\*${action} \\((\\d+)\\):\\*\\*)(.*)$`, 'm'); }
function nameOf(item) { return item.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim(); }

function removeFromElement(el, action, name) {
  const f = loadElement(el);
  const re = cellRegex(action);
  const m = f.text.match(re);
  if (!m) { edits.missing.push(`${name} @ ${el}/${action} (no cell)`); return false; }
  const items = m[3].trim().split(SEP);
  const idx = items.findIndex((it) => nameOf(it).toLowerCase() === name.toLowerCase());
  if (idx < 0) { edits.missing.push(`${name} @ ${el}/${action}`); return false; }
  items.splice(idx, 1);
  f.text = f.text.replace(re, `**${action} (${items.length}):** ${items.join(SEP)}`);
  f.changed = true;
  edits.removed.push(`${name} @ ${el}/${action}`);
  return true;
}
function addToElement(el, action, name) {
  const f = loadElement(el);
  const re = cellRegex(action);
  const m = f.text.match(re);
  if (!m) { edits.missing.push(`${name} -> ${el}/${action} (no cell)`); return false; }
  const items = m[3].trim().split(SEP);
  if (items.some((it) => nameOf(it).toLowerCase() === name.toLowerCase())) { edits.alreadyThere.push(`${name} -> ${el}/${action}`); return false; }
  items.push(name);
  f.text = f.text.replace(re, `**${action} (${items.length}):** ${items.join(SEP)}`);
  f.changed = true;
  edits.added.push(`${name} -> ${el}/${action}`);
  return true;
}
let neutral = { text: readFile(path.join(CATALOG, 'neutral-pools.md')), changed: false };
function neutralSection(action) {
  const re = new RegExp(`^## \\d+\\. ${action.toUpperCase()}\\b[\\s\\S]*?(?=^## \\d+\\. |\\Z)`, 'm');
  // JS has no \Z; emulate by matching to the next section header or end
  const start = neutral.text.search(new RegExp(`^## \\d+\\. ${action.toUpperCase()}\\b`, 'm'));
  if (start < 0) return null;
  const rest = neutral.text.slice(start + 3);
  const nextRel = rest.search(/^## \d+\. /m);
  const end = nextRel < 0 ? neutral.text.length : start + 3 + nextRel;
  return { start, end };
}
function removeFromNeutral(action, name) {
  const sec = neutralSection(action);
  if (!sec) { edits.missing.push(`${name} @ neutral/${action} (no section)`); return false; }
  const body = neutral.text.slice(sec.start, sec.end);
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('**') || lines[i].startsWith('#') || !lines[i].trim()) continue;
    const items = lines[i].split(',').map((s) => s.trim()).filter(Boolean);
    const idx = items.findIndex((it) => nameOf(it).toLowerCase() === name.toLowerCase());
    if (idx < 0) continue;
    items.splice(idx, 1);
    lines[i] = items.join(', ');
    neutral.text = neutral.text.slice(0, sec.start) + lines.join('\n') + neutral.text.slice(sec.end);
    neutral.changed = true;
    edits.removed.push(`${name} @ neutral/${action}`);
    return true;
  }
  edits.missing.push(`${name} @ neutral/${action}`);
  return false;
}
function addToNeutral(action, name) {
  const sec = neutralSection(action);
  if (!sec) { edits.missing.push(`${name} -> neutral/${action} (no section)`); return false; }
  const body = neutral.text.slice(sec.start, sec.end);
  if (body.split(/[\n,]/).some((it) => nameOf(it).toLowerCase() === name.toLowerCase())) { edits.alreadyThere.push(`${name} -> neutral/${action}`); return false; }
  const lines = body.split('\n');
  const header = name.includes(' ') ? '(two-word compositions)' : '(single words)';
  let hi = lines.findIndex((l) => l.startsWith('**Neutral pool**') && l.includes(header));
  if (hi < 0) hi = lines.findIndex((l) => l.startsWith('**Neutral pool**'));
  if (hi < 0) { edits.missing.push(`${name} -> neutral/${action} (no pool line)`); return false; }
  lines[hi + 1] = lines[hi + 1].trim() ? lines[hi + 1].replace(/,?\s*$/, '') + ', ' + name : name;
  neutral.text = neutral.text.slice(0, sec.start) + lines.join('\n') + neutral.text.slice(sec.end);
  neutral.changed = true;
  edits.added.push(`${name} -> neutral/${action}`);
  return true;
}
function remove(placement, name) {
  const [el, action] = placement.split('/');
  return el === 'neutral' ? removeFromNeutral(action, name) : removeFromElement(el, action, name);
}
function add(placement, name) {
  const [el, action] = placement.split('/');
  return el === 'neutral' ? addToNeutral(action, name) : addToElement(el, action, name);
}

for (const d of dispositions) {
  if (d.disposition !== 'REMOVE') continue;
  const ok = remove(d.placement, d.name);
  if (ok && d.moveTo) add(d.moveTo, d.name);
}

if (!DRY) {
  for (const [el, f] of Object.entries(elementFiles)) if (f.changed) fs.writeFileSync(elementPath(el), f.text);
  if (neutral.changed) fs.writeFileSync(path.join(CATALOG, 'neutral-pools.md'), neutral.text);
}

// ---------- ledger ----------
const counts = { REMOVE: 0, KEEP: 0, HOLD: 0 };
for (const d of dispositions) counts[d.disposition]++;
const lines = [];
lines.push('# Placement audit, orchestrator dispositions (2026-09-10)');
lines.push('');
lines.push('Fable review of the four Sonnet class audits. Policy applied: duplication is never a reason; a placement goes only for an action-definition failure or for an elemental word sitting in the neutral pool (which would hand that word to elements it does not fit). A bare neutral word sitting in an element cell is tolerated overlap and stays. Agent verdicts the orchestrator overturned are listed as KEEP with the reason; HOLD rows wait on Nick.');
lines.push('');
lines.push(`Counts: UNSOUND rows reviewed ${dispositions.length}; REMOVE ${counts.REMOVE}; KEEP (overturned) ${counts.KEEP}; HOLD ${counts.HOLD}. Applied: ${edits.removed.length} placements removed, ${edits.added.length} placements added by move, ${edits.missing.length} not found in the files, ${edits.alreadyThere.length} move targets already held the name.`);
lines.push('');
lines.push('| Name | Placement | Disposition | Reason | Source |');
lines.push('|---|---|---|---|---|');
for (const d of dispositions.sort((a, b) => a.name.localeCompare(b.name) || a.placement.localeCompare(b.placement))) {
  lines.push(`| ${d.name} | ${d.placement} | ${d.disposition}${d.disposition === 'REMOVE' && d.moveTo ? ' (move to ' + d.moveTo + ')' : ''} | ${d.why.replace(/\|/g, '/')} | ${d.file} |`);
}
lines.push('');
lines.push('## Applied edits');
lines.push('');
lines.push('Removed: ' + (edits.removed.join('; ') || 'none'));
lines.push('');
lines.push('Added: ' + (edits.added.join('; ') || 'none'));
lines.push('');
lines.push('Not found (already absent, or the name is written differently in the cell): ' + (edits.missing.join('; ') || 'none'));
lines.push('');
lines.push('Move target already held the name: ' + (edits.alreadyThere.join('; ') || 'none'));
if (!DRY) fs.writeFileSync(path.join(AUDIT, 'FABLE-AUDIT.md'), lines.join('\n') + '\n');
console.log(`dispositions ${dispositions.length}: REMOVE ${counts.REMOVE}, KEEP ${counts.KEEP}, HOLD ${counts.HOLD}; removed ${edits.removed.length}, added ${edits.added.length}, missing ${edits.missing.length}, alreadyThere ${edits.alreadyThere.length}${DRY ? ' (dry run)' : ''}`);
if (edits.missing.length) console.log('MISSING:\n  ' + edits.missing.join('\n  '));
