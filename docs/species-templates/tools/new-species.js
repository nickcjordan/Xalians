#!/usr/bin/env node
/*
 * Scaffolds a brand-new species: appends the legacy entry to packages/content/json/species.json
 * with the next five-digit id (the site's species ids, legacy routes and the duel prototype
 * still read that file) and prints the remaining steps. It never writes the v5 template, the
 * ability audit or an encyclopedia entry; those are the migrate-species skill's outputs. See
 * docs/species-templates/NEW-SPECIES.md.
 *
 *   node docs/species-templates/tools/new-species.js --key frackworm --name Frackworm --element Sand \
 *     --planet Endessa --height "472 in / 1200 cm" --weight "7055 lbs / 3200 kg" --description "..." [--dry]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const SPECIES = path.join(ROOT, 'packages', 'content', 'json', 'species.json');
const ELEMENTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'content', 'json', 'elements.json'), 'utf8'));
const PLANETS = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'content', 'json', 'planets.json'), 'utf8'));

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { const k = argv[i].slice(2); if (argv[i + 1] && !argv[i + 1].startsWith('--')) args[k] = argv[++i]; else args[k] = true; } }
const need = ['key', 'name', 'element', 'planet', 'height', 'weight', 'description'];
const missing = need.filter(k => !args[k]);
if (missing.length) { console.error('missing: --' + missing.join(' --')); process.exit(2); }
const errors = [];
if (!/^[a-z][a-z0-9-]*$/.test(args.key)) errors.push('key must be lowercase letters, digits and hyphens');
const elementNames = (Array.isArray(ELEMENTS) ? ELEMENTS : ELEMENTS.elements || Object.values(ELEMENTS)).map(e => (e && (e.name || e.type || e.key)) || e).filter(x => typeof x === 'string');
if (elementNames.length && !elementNames.some(n => n.toLowerCase() === String(args.element).toLowerCase())) errors.push('element ' + args.element + ' is not in elements.json (' + elementNames.join(', ') + ')');
const planetNames = (Array.isArray(PLANETS) ? PLANETS : Object.values(PLANETS)).map(p => p && p.name).filter(Boolean);
if (!planetNames.some(n => n.toLowerCase() === String(args.planet).toLowerCase())) errors.push('planet ' + args.planet + ' is not in planets.json (' + planetNames.join(', ') + ')');
if (!/^\d+ in \/ \d+ cm$/.test(args.height)) errors.push('height must read "<in> in / <cm> cm"');
if (!/^\d+ lbs \/ \d+ kg$/.test(args.weight)) errors.push('weight must read "<lbs> lbs / <kg> kg"');
if (/\u2014/.test(args.description)) errors.push('description contains an em-dash');
const species = JSON.parse(fs.readFileSync(SPECIES, 'utf8'));
if (species.some(s => s.name.toLowerCase() === args.name.toLowerCase())) errors.push('a species named ' + args.name + ' already exists');
if (fs.existsSync(path.join(ROOT, 'docs', 'species-templates', 'v5', args.key + '.json'))) errors.push('docs/species-templates/v5/' + args.key + '.json already exists');
if (errors.length) { errors.forEach(e => console.error('error: ' + e)); process.exit(1); }

const nextId = String(Math.max(...species.map(s => Number(s.id))) + 1).padStart(5, '0');
const entry = {
  name: args.name, id: nextId, type: args.element, planet: args.planet, height: args.height, weight: args.weight,
  description: args.description,
  statRatings: { healthRating: '', standardAttackRating: '', specialAttackRating: '', standardDefenseRating: '', specialDefenseRating: '', speedRating: '', evasionRating: '', staminaRating: '', recoveryRating: '' },
  traits: { canFly: false, attackRange: 'low' },
};
const artPath = path.join(ROOT, 'docs', 'species-templates', 'art', args.key + '.png');
console.log(JSON.stringify(entry, null, 2));
if (args.dry) { console.log('\n--dry: nothing written'); process.exit(0); }
const raw = fs.readFileSync(SPECIES, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
species.push(entry);
fs.writeFileSync(SPECIES, JSON.stringify(species, null, 2).replace(/\n/g, eol) + eol);
console.log('\nwrote species.json entry ' + nextId + ' for ' + args.key);
console.log('\nNext (docs/species-templates/NEW-SPECIES.md):');
console.log('  1. ' + (fs.existsSync(artPath) ? 'art present: ' : 'ADD THE ART: ') + path.relative(ROOT, artPath));
console.log('  2. run the migrate-species skill for ' + args.key + ' (it writes docs/species-templates/v5/' + args.key + '.json, its ability audit and the encyclopedia entry)');
console.log('  3. npm run check:creature-model -- docs/species-templates/v5/' + args.key + '.json, then the lore-factcheck skill on the prose');
console.log('  4. present to Nick; on ratification run node scripts/bundleLore.js and node docs/species-templates/tools/validate-all.js');
