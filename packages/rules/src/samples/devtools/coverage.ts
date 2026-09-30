/**
 * Coverage report for the creature sample set.
 *
 * Prints what the generated set covers (per element, role, attribute profile and output
 * band, the element by role and role by band matrices, and the shapes the generated actions
 * actually use), then the roles and grid shapes the guidelines could not express directly.
 *
 * Run: node apps/web/scripts/runNode.cjs packages/rules/src/samples/devtools/coverage.ts
 */
import { ElementKeySchema, Status } from '@xalians/content/creature';
import {
  effectGrid, sampleAxes, sampleCreatures, sampleSpecies, sampleTemplates,
  SAMPLE_BANDS, SAMPLE_PROFILES, SAMPLE_ROLES,
} from '../index.ts';

const ELEMENTS = ElementKeySchema.options;
const axes = sampleTemplates().map(entry => entry.axes);
const records = sampleCreatures(3);
const byKey = sampleAxes();
const grid = effectGrid();

const pad = (value: unknown, width: number) => String(value).padEnd(width);
const padStart = (value: unknown, width: number) => String(value).padStart(width);
function counts<T extends string | number>(title: string, values: readonly T[], of: (axis: (typeof axes)[number]) => T) {
  console.log(`\n${title}`);
  for (const value of values) {
    const templates = axes.filter(axis => of(axis) === value).length;
    const generated = records.filter(record => of(byKey.get(record.species)!) === value).length;
    console.log(`  ${pad(value, 16)} templates ${padStart(templates, 3)}   records ${padStart(generated, 4)}`);
  }
}
function matrix<R extends string | number, C extends string | number>(title: string, rows: readonly R[], cols: readonly C[],
  row: (axis: (typeof axes)[number]) => R, col: (axis: (typeof axes)[number]) => C) {
  console.log(`\n${title} (templates)`);
  console.log(`  ${pad('', 15)}${cols.map(value => padStart(String(value).slice(0, 8), 9)).join('')}`);
  for (const r of rows) {
    console.log(`  ${pad(r, 15)}${cols.map(c => padStart(axes.filter(axis => row(axis) === r && col(axis) === c).length || '.', 9)).join('')}`);
  }
}

console.log('CREATURE SAMPLE SET COVERAGE');
console.log(`grid actions ${grid.length}   templates ${axes.length}   records ${records.length} (3 per template)`);
counts('Per element', ELEMENTS, axis => axis.element);
counts('Per role', SAMPLE_ROLES, axis => axis.role);
counts('Per attribute profile', SAMPLE_PROFILES, axis => axis.profile);
counts('Per output band (principal effect of the signature)', SAMPLE_BANDS, axis => axis.band);
matrix('Element x role', ELEMENTS, SAMPLE_ROLES, axis => axis.element, axis => axis.role);
matrix('Role x output band', SAMPLE_ROLES, SAMPLE_BANDS, axis => axis.role, axis => axis.band);
matrix('Role x attribute profile', SAMPLE_ROLES, SAMPLE_PROFILES, axis => axis.role, axis => axis.profile);

// What the generated records actually use, across all four actions of every record.
const actions = records.flatMap(record => record.actions.map(action => ({ record, action })));
const effects = actions.flatMap(({ record, action }) => action.effects.map(effect => ({ record, action, effect })));
const tally = (values: readonly string[]) => Object.entries(values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {}))
  .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k} ${v}`).join(', ');
console.log('\nGenerated action shapes (all four actions of every record)');
console.log(`  effect types      ${tally(effects.map(({ effect }) => effect.type))}`);
console.log(`  recipients        ${tally(effects.map(({ effect }) => effect.recipient))}`);
console.log(`  delivery modes    ${tally(actions.map(({ action }) => action.delivery.mode))}`);
console.log(`  area shapes       ${tally(actions.flatMap(({ action }) => action.spatial.area ? [action.spatial.area.shape] : []))}`);
console.log(`  harm mechanisms   ${tally(effects.flatMap(({ effect }) => effect.type === 'harm' ? [effect.mechanism] : []))}`);
console.log(`  displace          ${tally(effects.flatMap(({ effect }) => effect.type === 'displace' ? [effect.direction] : []))}`);
const statusSeen = new Set(effects.flatMap(({ effect }) => effect.type === 'status' ? [effect.status] : []));
console.log(`  statuses seen     ${statusSeen.size}/${Status.options.length}; missing: ${Status.options.filter(s => !statusSeen.has(s)).join(', ') || 'none'}`);
console.log(`  stimulated        ${tally(effects.flatMap(({ effect }) => effect.type === 'status' && effect.status === 'stimulated' ? [effect.function ?? '?'] : []))}`);
console.log(`  sustained effects ${effects.filter(({ effect }) => effect.persistence === 'sustained').length}   ongoing actions ${actions.filter(({ action }) => action.activation.continuity === 'ongoing').length}`);
console.log(`  dependent (requires) effects ${effects.filter(({ effect }) => effect.requires).length}`);
const dependentSelf = effects.filter(({ effect }) => effect.requires && effect.recipient === 'self').length;
console.log(`  drain shape (harm + dependent self restore) ${dependentSelf}`);
const supportHarm = actions.filter(({ record, action }) => byKey.get(record.species)!.role === 'pure-support' && action.effects.some(effect => effect.type === 'harm')).length;
console.log(`  harm actions on pure-support records ${supportHarm} (must be 0)`);

// Role signature reach: how many of a role's records carry each effect type beyond the signature.
console.log('\nAct space per role (distinct acts on offer, min to max over templates; authored mechanisms)');
for (const role of SAMPLE_ROLES) {
  const compiled = sampleSpecies().filter(entry => byKey.get(entry.species.key)!.role === role);
  const distinct = compiled.map(entry => entry.acts.distinct);
  const authored = compiled.reduce((sum, entry) => sum + entry.species.mechanisms.length, 0);
  const clamped = compiled.reduce((sum, entry) => sum + entry.acts.clamped.length, 0);
  console.log(`  ${pad(role, 16)} acts ${padStart(Math.min(...distinct), 3)} to ${padStart(Math.max(...distinct), 3)}   authored mechanisms ${authored}   clamped by signature ${clamped}`);
}

/**
 * Roles and grid shapes the guidelines could not produce without authoring, or not at all.
 * Kept by hand: the compiler cannot say why a shape is missing. Each is also a Finding in
 * docs/design/creature-sample-set.md. "authored" means legal but not derived from the body.
 */
const NOT_DERIVED: readonly [string, string][] = [
  ['booster (stimulated with a function)', 'authored: no instrument or medium row produces stimulated; every booster needs an authored mechanism'],
  ['ally shielder (protect or shielded aimed at another)', 'authored: the ward pattern shields self only; ally-aimed protect exists only as an authored mechanism'],
  ['binder (sustained hold, ongoing action)', 'authored: snare derives lingering holds only; a sustained source-bound hold is authored (Shuntara pattern)'],
  ['displace toward (a pull)', 'authored: shove derives away only; no row derives toward'],
  ['pure support with no attack', 'legal via five acts.exclude entries; a body of only mend and ward rows does not exist among the instruments'],
  ['hinderer or applier whose status is off the medium row', 'authored: the medium rows carry one status and one bind per element; metal carries neither'],
  ['ally cleanse (remove aimed at another)', 'authored: no row derives remove (fixture washing-fluid pattern)'],
];
const NOT_IN_GRID: readonly [string, string][] = [
  ['lingering or sustained direct effects (harm, restore, protect, displace, remove)', 'schema: direct work cannot linger; lasting conditions use status'],
  ['status with persistence resolved', 'schema: status requires sustained or lingering'],
  ['sustained status without a bound, or bound on a lingering status', 'schema: only sustained statuses carry bound'],
  ['directed area (line, cone, sweep) aimed by a self-selecting action', 'schema: needs other-only targeting'],
  ['non-radial area anchored at target or location', 'schema: line, cone and sweep originate at self'],
  ['passive shapes (contact, harmed, ally-harmed triggers, ongoing passives)', 'outside this grid by design: it validates against ActionSchema, not PassiveSchema'],
  ['chained or cyclic requires; a dependent on a different recipient than its prerequisite', 'schema: requires is depth one and shares the recipient or affects self'],
];
console.log('\nRoles and shapes needing authored mechanisms (legal, not derived from the body)');
for (const [what, why] of NOT_DERIVED) console.log(`  - ${what}: ${why}`);
console.log('\nGrid shapes skipped because the schema forbids them');
for (const [what, why] of NOT_IN_GRID) console.log(`  - ${what}: ${why}`);
