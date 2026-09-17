// One-time, idempotent migration from 1.x tuples or 2.x repertoires to schema 3. Prose and numeric bands
// are preserved. Signature-specific semantic decisions are explicit below.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const write = (p, value) => fs.writeFileSync(path.join(root, p), JSON.stringify(value, null, 2) + '\n');
const delivery = (mode, shape = 'focused', approach = 'stationary', persistence = 'instant') => ({ mode, shape, approach, persistence });
const harm = mechanism => ({ kind: 'harm', recipient: 'target', mechanism });
const definitions = {
  strike: [delivery('contact'), harm('impact'), 'A direct impact delivered through the stated instrument.'],
  lash: [delivery('contact', 'sweep'), harm('impact'), 'A sweeping impact delivered through the stated instrument.'],
  crush: [delivery('contact', 'focused', 'stationary', 'maintained'), harm('compression'), 'Sustained pressure compresses the recipient.'],
  rake: [delivery('contact', 'sweep'), harm('cutting'), 'A cutting pass opens the recipient.'],
  shove: [delivery('contact'), { kind: 'displace', recipient: 'target', direction: 'away' }, 'Force displaces the recipient away from the source.'],
  drain: [delivery('contact', 'focused', 'stationary', 'maintained'), { kind: 'transfer', from: 'target', to: 'self', resource: 'energy' }, 'The source draws usable energy from the recipient and retains it.'],
  ambush: [delivery('contact', 'focused', 'closing'), harm('impact'), 'The source closes the distance and delivers an impact.'],
  beam: [delivery('stream'), harm('elemental'), 'A narrow projected stream exposes the recipient to the stated medium.'],
  hurl: [delivery('projectile'), harm('impact'), 'A launched solid delivers an impact to the recipient.'],
  spray: [delivery('stream', 'diffuse'), harm('elemental'), 'A spreading stream exposes recipients to the stated medium.'],
  burst: [delivery('pulse', 'radial'), harm('elemental'), 'An outward pulse exposes nearby recipients to the stated medium.'],
  cloud: [delivery('field', 'diffuse', 'stationary', 'residual'), harm('elemental'), 'A lingering volume exposes recipients to the stated medium.'],
  snare: [delivery('contact', 'focused', 'stationary', 'maintained'), { kind: 'restrain', recipient: 'target', faculty: 'movement' }, 'The instrument holds or binds the recipient, restricting movement.'],
  ward: [delivery('field', 'radial', 'stationary', 'maintained'), { kind: 'protect', recipient: 'target', method: 'barrier', against: 'harm' }, 'A protective expression shields the recipient against harm.'],
  mend: [delivery('contact', 'focused', 'stationary', 'maintained'), { kind: 'restore', recipient: 'target', aspect: 'integrity' }, 'The source restores the functional integrity of a compatible recipient.'],
  terrorize: [delivery('signal'), { kind: 'suppress', recipient: 'target', aspect: 'composure' }, 'A directed signal unsettles the recipient and suppresses composure.'],
};
function patternFor(key) {
  const [form, effect, description] = definitions[key];
  return { key, nameFamily: key, activation: { mode: 'active' }, delivery: form,
    targeting: { relation: ['ward', 'mend'].includes(key) ? 'self-or-other' : 'other', subjects: ['creature', 'object'] },
    effects: [effect], description };
}
const patterns = Object.keys(definitions).map(patternFor);
const patternsPath = 'docs/ability-catalog/ability-patterns.json';
if (!fs.existsSync(path.join(root, patternsPath))) write(patternsPath, { version: '2.0.0', patterns });

function migrateAbility(old, speciesKey, intensity = old.intensity) {
  const p = structuredClone(patternFor(old.action));
  const { nameFamily, ...facts } = p;
  const result = { ...facts, key: `${speciesKey}-defining`, name: old.name, prominence: 'defining',
    instrument: old.instrument, medium: old.medium, intensity, description: old.description };
  // These refinements describe only what the existing signature already says.
  if (['bioflim', 'scalatto', 'yetimoth'].includes(speciesKey)) {
    result.delivery = delivery('self', 'focused', 'stationary', 'maintained');
    result.targeting = { relation: 'self', subjects: ['creature'] };
    result.effects[0].method = speciesKey === 'scalatto' ? 'deflection' : 'barrier';
  }
  if (['hypnopet', 'tizzie'].includes(speciesKey)) {
    result.delivery = delivery('signal', 'focused', 'stationary', 'maintained');
    result.targeting = { relation: 'other', subjects: ['creature'], compatibility: { reception: 'visual' } };
    result.effects = [{ kind: 'restrain', recipient: 'target', faculty: 'attention' }];
  }
  if (speciesKey === 'ectoghoul') result.targeting = { relation: 'other', subjects: ['creature'], compatibility: { reception: 'auditory' } };
  if (speciesKey === 'sonalloy') result.targeting = { relation: 'other', subjects: ['creature', 'object'], compatibility: { corporeality: ['corporeal'], composition: ['metal'] } };
  if (speciesKey === 'thirstaserp') result.effects[0].resource = 'water';
  if (speciesKey === 'xylum') result.targeting.subjects = ['creature', 'environment'];
  if (speciesKey === 'vespersyn') result.effects = [harm('piercing')];
  if (speciesKey === 'chromocat') result.delivery.approach = 'closing';
  if (speciesKey === 'venemist') result.delivery.persistence = 'residual';
  return result;
}

function migrateTemplates() {
  const registry = read('docs/species-templates/registries.json');
  const { ELEMENT_ADJACENCY, CONDUIT_ACTIONS_BY_MEDIUM } = require(path.join(root, 'packages/rules/src/generator/constants.ts'));
  const manifest = read('docs/species-templates/RATIFIED.json');
  for (const key of manifest.species) {
    const file = `docs/species-templates/${key}.json`;
    const t = read(file);
    if (t.actionPool || t.abilityPool) continue;
    if (t.repertoire) {
      if (t.repertoire.inherent.length !== 1) throw new Error('Manual signature decision required: ' + key);
      t.signatureAbility = t.repertoire.inherent[0];
      delete t.signatureAbility.prominence;
      t.abilityPool = { count: [2,3], sets: [{ key: 'default', weight: 1, options: t.repertoire.potential }] };
      delete t.repertoire;
      t.schemaVersion = '3.0.0';
      write(file, t);
      continue;
    }
    const potential = [];
    for (const instrument of t.instruments) {
      for (const medium of [t.element, ...ELEMENT_ADJACENCY[t.element]]) {
        const actions = [...new Set([...(registry.instrumentActions[instrument] || []),
          ...(t.conduits?.[instrument] === medium ? CONDUIT_ACTIONS_BY_MEDIUM[medium] : [])])];
        for (const pattern of actions) potential.push({ key: `${instrument}-${medium}-${pattern}`, pattern, instrument, medium, weight: 1 });
      }
    }
    const groups = new Map();
    for (const a of potential) {
      const k = a.instrument + '-' + a.pattern;
      if (!groups.has(k)) groups.set(k, { key: k, pattern: a.pattern, instrument: a.instrument, media: [], weight: a.weight });
      groups.get(k).media.push(a.medium);
    }
    t.signatureAbility = migrateAbility(t.signatureAbility, key);
    delete t.signatureAbility.prominence;
    t.abilityPool = { count: [2,3], sets: [{ key: 'default', weight: 1, options: [...groups.values()] }] };
    t.schemaVersion = '3.0.0';
    write(file, t);
  }
  manifest.version = read('docs/species-templates/' + manifest.species[0] + '.json').schemaVersion;
  write('docs/species-templates/RATIFIED.json', manifest);
}
if (require.main === module) migrateTemplates();
module.exports = { migrateAbility, patternFor };
