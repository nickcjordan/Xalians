import patternData from '@xalians/content/abilityPatterns.json';
import { AbilityPatternSchema, validateAbilityPool } from '@xalians/content/schema';
const abilityPatterns = new Map(patternData.patterns.map(p => { const parsed = AbilityPatternSchema.parse(p); return [parsed.key, parsed] as const; }));
/*
	The Xalian generator: expands a seed into a full creature record from a ratified
	species template.

	This is the "expand(seed, generatorVersion, mintOrigin)" pipeline of
	docs/design/xalian-creature-system-redesign.md section 9, in generation order:
	archetype, attributes, physiology, affinity, traits, appearance, abilities,
	temperament. The record it produces is the shape in docs/design/
	xalian-creature-data-structure.md: nature only, no game numbers. Games derive.

	It is React-free and imports no game code. It lives in packages/rules now (moved out
	of apps/web unchanged, B2 of the backend modernization plan) so it can be shared by the
	frontend and the Lambda that will mint real Scrambler Tokens.

	Everything tunable is in ./constants.ts and pinned by GENERATOR_VERSION.
*/

import { makeRng } from './prng.ts';
import type { Rng } from './prng.ts';
import {
	GENERATOR_VERSION,
	SCHEMA_VERSION,
	ATTRIBUTE_KEYS,
	CAPABILITY_KEYS,
	GRADED_SENSE_KEYS,
	TEMPERAMENT_KEYS,
	ELEMENT_ADJACENCY,
	SECONDARY_AFFINITY_CHANCE,
	FAVORED_DRAWS,
	TRAIT_EXCLUSIONS,
	TILT_STRENGTH,
	TRAIT_TILTS,
	FINISH_ODDS,
	ROLLED_ABILITY_COUNT,
	ROLLED_INTENSITY_BAND,
	HEFT_BANDS,
	HEFT_MATCH_WEIGHTS,
	SECONDARY_MEDIUM_SHARE,
	TEMPERAMENT_ATTRIBUTE_PULL,
	TEMPERAMENT_JITTER,
	TEMPERAMENT_TILTS,
	SHOWROOM_PROFILE,
} from './constants.ts';
import type {
	AbilityCatalog,
	ActionKey,
	ArchetypeKey,
	AttributeKey,
	Band,
	CatalogEntry,
	Chirality,
	ElementKey,
	Finish,
	GenerateBatchArgs,
	GeneratorProfile,
	GenerateXalianArgs,
	InstrumentKey,
	Registries,
	SpeciesTemplate,
	TraitKey,
	XalianRecord,
} from './types.ts';

// record.ts's nested shapes have no standalone exported name (they're inline in
// XalianRecord), so this package names them locally for its own intermediate results.
type RecordArchetype = XalianRecord['archetype'];
type RecordElement = XalianRecord['element'];
type RecordPhysiology = XalianRecord['physiology'];
type RecordAbility = XalianRecord['actions'][number];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function clamp(n: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, n));
}

function band(value: unknown, fallback: Band): Band {
	if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
		return [Math.min(value[0], value[1]), Math.max(value[0], value[1])];
	}
	return fallback;
}

// where a rolled value sits in its band, 0 at the bottom and 1 at the top
function percentile(value: number, [lo, hi]: Band): number {
	if (hi <= lo) {
		return 0.5;
	}
	return clamp((value - lo) / (hi - lo), 0, 1);
}

function rollInBand(rng: Rng, [lo, hi]: Band): number {
	return rng.range(lo, hi);
}

// favored attributes skew toward the band top: best of FAVORED_DRAWS draws
function rollFavoredInBand(rng: Rng, [lo, hi]: Band): number {
	let best = lo;
	for (let i = 0; i < FAVORED_DRAWS; i++) {
		best = Math.max(best, rng.range(lo, hi));
	}
	return best;
}

// ---------------------------------------------------------------------------
// steps
// ---------------------------------------------------------------------------

function rollArchetype(rng: Rng, template: SpeciesTemplate, registries: Registries): RecordArchetype {
	const weights = Object.entries(template.archetypeWeights || { balanced: 100 }) as Array<[string, number]>;
	// template.archetypeWeights is keyed by ArchetypeKeySchema, so every entry key is
	// already an ArchetypeKey; rng.weighted only narrows to what it was handed.
	const key = rng.weighted(weights) as ArchetypeKey;
	const row = (registries.archetypes || []).find((a) => a.key === key);
	// registries.archetypes entries carry `favors` as the generic RegistryEntry shape
	// (z.array(z.string())), not narrowed to AttributeKey -- registries.ts keeps that entry
	// shape untyped by design (the test suite cross-checks favors against the attribute
	// union instead of duplicating it in the type). The cast asserts what the test
	// guarantees.
	return { key, favors: row && Array.isArray(row.favors) ? (row.favors.slice() as AttributeKey[]) : [] };
}

interface AttributesResult {
	attributes: Record<AttributeKey, number>;
	bands: Record<AttributeKey, Band>;
}

function rollAttributes(rng: Rng, template: SpeciesTemplate, archetype: RecordArchetype): AttributesResult {
	const attributes = {} as Record<AttributeKey, number>;
	const bands = {} as Record<AttributeKey, Band>;
	ATTRIBUTE_KEYS.forEach((key) => {
		const b = band(template.attributes && template.attributes[key], [30, 70]);
		bands[key] = b;
		attributes[key] = archetype.favors.includes(key) ? rollFavoredInBand(rng, b) : rollInBand(rng, b);
	});
	return { attributes, bands };
}

interface PhysiologyResult {
	physiology: RecordPhysiology;
	heightBand: Band;
	weightBand: Band;
	capabilityBands: Record<string, Band>;
	senseBands: Record<string, Band>;
}

function rollPhysiology(rng: Rng, template: SpeciesTemplate): PhysiologyResult {
	const src = template.physiology || ({} as SpeciesTemplate['physiology']);
	const size = src.size || ({} as SpeciesTemplate['physiology']['size']);
	const heightBand = band(size.heightCm, [100, 200]);
	const weightBand = band(size.weightKg, [50, 150]);
	// a band that starts under 5 (a floating Neph weighs a few kilograms) keeps one
	// decimal so its whole band is reachable; everything else rolls whole units
	const sizeRound = (value: number, [lo]: Band) => (lo < 5 ? Math.round(value * 10) / 10 : Math.round(value));
	const heightCm = sizeRound(heightBand[0] + (heightBand[1] - heightBand[0]) * rng.float(), heightBand);
	// weight follows height with some scatter, so a tall individual is usually heavy too
	const heightP = percentile(heightCm, heightBand);
	const weightP = clamp(heightP + (rng.float() - 0.5) * 0.5, 0, 1);
	const weightKg = sizeRound(weightBand[0] + (weightBand[1] - weightBand[0]) * weightP, weightBand);

	const capabilities = {} as RecordPhysiology['capabilities'];
	const capabilityBands: Record<string, Band> = {};
	CAPABILITY_KEYS.forEach((key) => {
		const b = band(src.capabilities && src.capabilities[key], [0, 0]);
		capabilityBands[key] = b;
		capabilities[key] = rollInBand(rng, b);
	});

	const senses = {} as RecordPhysiology['senses'];
	const senseBands: Record<string, Band> = {};
	GRADED_SENSE_KEYS.forEach((key) => {
		const b = band(src.senses && src.senses[key], [0, 0]);
		senseBands[key] = b;
		senses[key] = rollInBand(rng, b);
	});
	if (src.senses && Array.isArray(src.senses.special) && src.senses.special.length > 0) {
		senses.special = src.senses.special.slice();
	}

	const chiralityRule = src.genome && src.genome.chirality;
	const chirality: Chirality = chiralityRule === 'achiral' ? 'achiral' : (rng.chance(0.5) ? 'levo' : 'dextro');

	const composition: RecordPhysiology['composition'] = { primary: (src.composition && src.composition.primary) || 'flesh' };
	if (src.composition && src.composition.secondary) {
		composition.secondary = src.composition.secondary;
	}

	const tolerance = src.environmentalTolerance || {};
	const physiology: RecordPhysiology = {
		corporeality: src.corporeality || 'corporeal',
		composition,
		bodyPlan: src.bodyPlan || 'biped',
		anatomy: Array.isArray(src.anatomy) ? src.anatomy.slice() : [],
		covering: src.covering || 'bare',
		heightCm,
		weightKg,
		lifespan: src.lifespan || 'standard',
		genome: { chirality },
		diet: src.diet || 'none',
		communication: Array.isArray(src.communication) ? src.communication.slice() : [],
		breathes: Array.isArray(src.breathes) ? src.breathes.slice() : [],
		environmentalTolerance: {
			ambientMedia: Array.isArray(tolerance.ambientMedia) ? tolerance.ambientMedia.slice() : [],
			temperatureC: tolerance.temperatureC
				? { min: tolerance.temperatureC.min, max: tolerance.temperatureC.max }
				: { min: -10, max: 40 },
		},
		capabilities,
		senses,
	};
	return { physiology, heightBand, weightBand, capabilityBands, senseBands };
}

interface AffinitiesResult {
	element: RecordElement;
	secondary: ElementKey | null;
}

function rollAffinities(rng: Rng, template: SpeciesTemplate, profile: GeneratorProfile): AffinitiesResult {
	// template.element is validated against the closed element enum by
	// SpeciesTemplateSchema (packages/content/src/schema/speciesTemplate.ts) at bundle
	// parse time in index.ts, but registries.json-derived key enums infer as a bare
	// `string` (see the note in ./types.ts), so this package's own ElementKey union is
	// narrower than the schema's; the cast asserts what parsing already guaranteed.
	const primary = template.element as ElementKey;
	const affinities: RecordElement['affinities'] = { [primary]: 100 };
	const graph = ELEMENT_ADJACENCY[primary] || [];
	let secondary: ElementKey | null = null;
	// draw exactly as the full profile does (same chance, same follow-up draws when it
	// lands) so the rng stream never shifts between profiles; the showroom constraint
	// (no rare affinity outcomes) only discards the landed result afterward.
	if (graph.length > 0 && rng.chance(SECONDARY_AFFINITY_CHANCE)) {
		const rolledSecondary = rng.pick(graph);
		const rolledPercent = rng.range(1, 99);
		if (profile !== 'showroom') {
			secondary = rolledSecondary;
			affinities[secondary] = rolledPercent;
		}
	}
	return { element: { primary, affinities }, secondary };
}

// the context a trait tilt or a temperament tilt reads from the already-rolled body
interface TiltContext {
	physiology: RecordPhysiology;
	heightBand: Band;
	weightBand: Band;
	capabilityBands: Record<string, Band>;
	senseBands: Record<string, Band>;
	attributes: Record<AttributeKey, number>;
	attributeBands: Record<AttributeKey, Band>;
	element: RecordElement;
}

// the quantity a tilt reads, as a 0..1 percentile of its band
function tiltPercentile(spec: { on: string }, ctx: TiltContext): number {
	const [kind, name] = spec.on.split(':');
	switch (kind) {
		case 'mass':
			return percentile(ctx.physiology.weightKg, ctx.weightBand);
		case 'height':
			return percentile(ctx.physiology.heightCm, ctx.heightBand);
		case 'capability':
			return percentile(ctx.physiology.capabilities[name as keyof RecordPhysiology['capabilities']], ctx.capabilityBands[name]);
		case 'attribute':
			return percentile(ctx.attributes[name as AttributeKey], ctx.attributeBands[name as AttributeKey]);
		case 'senses': {
			const ps = GRADED_SENSE_KEYS.map((k) => percentile(ctx.physiology.senses[k], ctx.senseBands[k]));
			return ps.reduce((a, b) => a + b, 0) / ps.length;
		}
		case 'affinity':
			return clamp((ctx.element.affinities[name as ElementKey] || 0) / 100, 0, 1);
		default:
			return 0.5;
	}
}

function tiltedPercent(key: TraitKey, percent: number, ctx: TiltContext): number {
	if (percent >= 100) {
		return 100;
	}
	const spec = TRAIT_TILTS[key];
	if (!spec) {
		return clamp(percent, 1, 99);
	}
	if (key === 'phasing' && ctx.physiology.corporeality !== 'corporeal') {
		return 100;
	}
	const p = tiltPercentile(spec, ctx);
	const factor = 1 + TILT_STRENGTH * (p - 0.5) * spec.dir;
	return clamp(Math.round(percent * factor), 1, 99);
}

function rollTraits(rng: Rng, template: SpeciesTemplate, ctx: TiltContext, profile: GeneratorProfile): TraitKey[] {
	// template.traits.pool is keyed by TraitKeySchema (Partial<Record<TraitKey, number>>);
	// Object.keys always returns string[] regardless of the record's key type (a TS
	// limitation, not a narrowing gap), so every key pulled off it here is cast back to
	// TraitKey, which is what the record actually contains.
	const pool = ((template.traits && template.traits.pool) || {}) as Partial<Record<TraitKey, number>>;
	const poolKeys = Object.keys(pool) as TraitKey[];
	const tilted = poolKeys
		.filter((key) => (pool[key] ?? 0) > 0)
		.map((key) => ({ key, percent: tiltedPercent(key, pool[key] ?? 0, ctx) }));

	// a non-corporeal body phases whether or not the template listed it
	if (ctx.physiology.corporeality === 'non-corporeal' && !tilted.some((t) => t.key === 'phasing')) {
		tilted.push({ key: 'phasing', percent: 100 });
	}

	// exclusion partners: the higher percent rolls first, its partner skips if it lands
	const order = tilted.slice().sort((a, b) => b.percent - a.percent);
	const landed: TraitKey[] = [];
	const partnerOf = (key: TraitKey) => {
		const pair = TRAIT_EXCLUSIONS.find((p) => p.includes(key));
		return pair ? pair.find((k) => k !== key) : null;
	};
	order.forEach(({ key, percent }) => {
		const partner = partnerOf(key);
		if (partner && landed.includes(partner)) {
			return;
		}
		if (percent >= 100 || rng.chance(percent / 100)) {
			landed.push(key);
		}
	});
	// showroom (no rare trait outcomes): every candidate above still rolled exactly as the
	// full profile does; this only drops a landed rare trait from the final list afterward,
	// keyed on the species' authored pool percent, not the tilted one, so a tilt can never
	// smuggle a rare trait through. Traits outside the pool (the forced 'phasing' push
	// above) default to 100 and are never dropped.
	const kept = profile === 'showroom'
		? landed.filter((key) => (pool[key] ?? 100) >= SHOWROOM_PROFILE.rareTraitMaxPercent)
		: landed;
	// stored in template order so two individuals of a species list traits alike
	return poolKeys.concat(['phasing']).filter((k, i, arr) => kept.includes(k) && arr.indexOf(k) === i);
}

function rollFinish(rng: Rng, profile: GeneratorProfile): Finish {
	const r = rng.float();
	let acc = 0;
	let result: Finish = 'standard';
	for (const [finish, odds] of FINISH_ODDS) {
		acc += odds;
		if (r < acc) {
			result = finish;
			break;
		}
	}
	// showroom (finish forced to standard): the draw above still happens so the rng
	// stream matches the full profile; only the returned outcome is pinned.
	return profile === 'showroom' ? 'standard' : result;
}

/*
	Catalog entry shape (scripts/bundleAbilityCatalog.js): a bare name when the entry is
	untagged and of ordinary heft, [name, tags] when it is tagged and of ordinary heft,
	[name, tags, heft] otherwise. Heft is 1 small, 2 ordinary, 3 grand, computed at bundle
	time; an entry that omits it is heft 2.
*/
function entryName(e: CatalogEntry): string {
	return Array.isArray(e) ? e[0] : e;
}

function entryAllows(e: CatalogEntry, instrument: InstrumentKey): boolean {
	return !Array.isArray(e) || e[1].length === 0 || e[1].includes(instrument);
}

function entryHeft(e: CatalogEntry): number {
	return Array.isArray(e) && typeof e[2] === 'number' ? e[2] : 2;
}

// name candidates: the medium's cell for the action plus the neutral pool, filtered to
// names this instrument may carry and names this creature has not used yet
function nameCandidates(catalog: AbilityCatalog, medium: ElementKey, action: ActionKey, instrument: InstrumentKey, usedNames: Set<string>) {
	const cell = (catalog.elements && catalog.elements[medium] && catalog.elements[medium][action]) || [];
	const neutral = (catalog.neutral && catalog.neutral[action]) || [];
	const pick = (list: CatalogEntry[]) => list.filter((e) => entryAllows(e, instrument) && !usedNames.has(entryName(e).toLowerCase()));
	return { owned: pick(cell), neutral: pick(neutral) };
}

// the heft a rolled intensity asks for: a light hit gets a small name, a heavy one gets a
// grand name (redesign doc 8c, hardening Decision 9)
function targetHeft(intensity: number): number {
	if (intensity < HEFT_BANDS[0]) {
		return 1;
	}
	return intensity > HEFT_BANDS[1] ? 3 : 2;
}

// draw one name from a candidate list, weighted toward the target heft
function drawName(rng: Rng, entries: CatalogEntry[], wanted: number): string {
	return rng.weighted(entries.map((e): [string, number] => {
		const distance = Math.abs(entryHeft(e) - wanted);
		const weight = HEFT_MATCH_WEIGHTS[Math.min(distance, HEFT_MATCH_WEIGHTS.length - 1)];
		return [entryName(e), weight];
	})) as string;
}

// Compiled once for frozen canonical templates. Custom editable templates are checked
// afresh; neither path evaluates a completed creature or retries invalid draws.
const preparedPools = new WeakMap<SpeciesTemplate, WeakMap<AbilityCatalog, ReturnType<typeof compilePool>>>();
function compilePool(template: SpeciesTemplate, catalog: AbilityCatalog) {
  validateAbilityPool(template.actionPool, abilityPatterns, template.instruments, [template.element, ...ELEMENT_ADJACENCY[template.element]], [...template.actions,...template.passives].find(a=>a.key===template.signature.key)!);
  const guaranteed = [...template.actions, ...template.passives];
  const reserved = new Set(guaranteed.map(a => a.name.toLowerCase()));
  for (const capability of guaranteed) {
    if (!template.instruments.includes(capability.instrument)) throw new Error('Undeclared guaranteed instrument');
    if (![template.element, ...ELEMENT_ADJACENCY[template.element]].includes(capability.medium)) throw new Error('Unsupported guaranteed medium');
  }
  return template.actionPool.sets.map(set => ({ ...set, options: set.options.map(option => {
    const pattern = abilityPatterns.get(option.pattern)!;
    const variants = option.media.map(medium => {
      const key = template.key + '-standard-' + set.key + '-' + option.key + '-' + medium;
      if (guaranteed.some(a => a.key === key)) throw new Error('Standard option key collides with guaranteed capability');
      const names = nameCandidates(catalog, medium, pattern.nameFamily, option.instrument, reserved);
      if (new Set([...names.owned, ...names.neutral].map(e => entryName(e).toLowerCase())).size < template.actionPool.count[1]) {
        throw new Error('Insufficient distinct names for ability option: ' + template.key + '/' + option.key + '/' + medium);
      }
      return { medium, names };
    });
    return { ...option, pattern, variants };
  }) }));
}
export function prepareAbilityPool(template: SpeciesTemplate, catalog: AbilityCatalog) {
  if (!Object.isFrozen(template) || !Object.isFrozen(catalog)) return compilePool(template, catalog);
  let byCatalog = preparedPools.get(template);
  if (!byCatalog) { byCatalog = new WeakMap(); preparedPools.set(template, byCatalog); }
  let compiled = byCatalog.get(catalog);
  if (!compiled) { compiled = compilePool(template, catalog); byCatalog.set(catalog, compiled); }
  return compiled;
}
function rollAbilities(
  rng: Rng, template: SpeciesTemplate, element: RecordElement,
  secondary: ElementKey | null, registries: Registries, catalog: AbilityCatalog,
): RecordAbility[] {
  const sets = prepareAbilityPool(template, catalog);
  const abilities: RecordAbility[] = template.actions.map(a=>({...structuredClone(a),intensity:rollInBand(rng,a.intensity)}));
  const set = rng.weighted(sets.map(s => [s, s.weight]))!;
  const count = rng.range(template.actionPool.count[0], template.actionPool.count[1]);
  const candidates = set.options.filter(o => o.variants.some(v => v.medium === element.primary || v.medium === secondary));
  const usedKeys = new Set<string>();
  const usedNames = new Set([...template.actions, ...template.passives].map(a => a.name.toLowerCase()));
  for (let i = 0; i < count; i += 1) {
    const available = candidates.filter(o => !usedKeys.has(o.key));
    const preferSecondary = secondary && rng.chance(SECONDARY_MEDIUM_SHARE);
    const wantedMedium = preferSecondary ? secondary : element.primary;
    const preferred = available.filter(o => o.variants.some(v => v.medium === wantedMedium));
    const choice = rng.weighted((preferred.length ? preferred : available).map(o => [o, o.weight]))!;
    usedKeys.add(choice.key);
    const variant = choice.variants.find(v => v.medium === wantedMedium) || choice.variants.find(v => v.medium === element.primary || v.medium === secondary)!;
    const intensity = rollInBand(rng, ROLLED_INTENSITY_BAND);
    const owned = variant.names.owned.filter(e => !usedNames.has(entryName(e).toLowerCase()));
    const neutral = variant.names.neutral.filter(e => !usedNames.has(entryName(e).toLowerCase()));
    const entries = owned.length && (!neutral.length || rng.chance(0.8)) ? owned : neutral;
    const name = drawName(rng, entries, targetHeft(intensity));
    usedNames.add(name.toLowerCase());
    const pattern = choice.pattern;
    abilities.push({
      key: template.key + '-standard-' + set.key + '-' + choice.key + '-' + variant.medium,
      name, instrument: choice.instrument, medium: variant.medium, intensity,
      activation: structuredClone(pattern.activation), timing: structuredClone(pattern.timing), spatial: structuredClone(pattern.spatial), delivery: structuredClone(pattern.delivery),
      targeting: structuredClone(pattern.targeting), effects: structuredClone(pattern.effects), description: pattern.description,
    });
  }
  return abilities;
}

function rollTemperament(rng: Rng, attributes: Record<AttributeKey, number>, archetype: RecordArchetype, traits: string[]) {
	const temperament = {} as XalianRecord['temperament'];
	TEMPERAMENT_KEYS.forEach((axis) => {
		const spec = TEMPERAMENT_TILTS[axis] || { attributes: [] as AttributeKey[] };
		let center = 50;
		if (spec.attributes && spec.attributes.length > 0) {
			const mean = spec.attributes.reduce((n, k) => n + (attributes[k] || 50), 0) / spec.attributes.length;
			center += (mean - 50) * TEMPERAMENT_ATTRIBUTE_PULL;
		}
		Object.entries(spec.traits || {}).forEach(([trait, nudge]) => {
			if (traits.includes(trait)) {
				center += nudge;
			}
		});
		if (spec.archetypes && spec.archetypes[archetype.key]) {
			center += spec.archetypes[archetype.key];
		}
		const jitter = rng.range(-TEMPERAMENT_JITTER, TEMPERAMENT_JITTER);
		temperament[axis] = clamp(Math.round(center + jitter), 0, 100);
	});
	return temperament;
}

// ---------------------------------------------------------------------------
// generateXalian
// ---------------------------------------------------------------------------

/*
	generateXalian({ template, seed, origin, serial, generatedAt, registries, catalog })
	  -> creature record

	template:    a ratified species template (one entry of speciesRecords.json records)
	seed:        the genome; any string or number. Same seed + same GENERATOR_VERSION
	             always yields the same record.
	origin:      planet key whose Generator expands the token (defaults to the species'
	             home planet)
	serial:      Nth of this species ever generated (bookkeeping; the caller knows)
	generatedAt: ISO timestamp (defaults to now; pass a fixed value for golden fixtures)
	registries:  registries.json (archetype favors, instrument action rows)
	catalog:     abilityCatalog.json (name cells)
*/
export function generateXalian({ template, seed, origin, serial, generatedAt, registries, catalog, profile }: GenerateXalianArgs): XalianRecord {
	if (!template || !template.key) {
		throw new Error('generateXalian: a species template with a key is required');
	}
	const resolvedProfile: GeneratorProfile = profile || 'full';
	const root = makeRng(`${template.key}|${seed}|${GENERATOR_VERSION}`);

	const archetype = rollArchetype(root.fork('archetype'), template, registries || ({} as Registries));
	const { attributes, bands: attributeBands } = rollAttributes(root.fork('attributes'), template, archetype);
	const phys = rollPhysiology(root.fork('physiology'), template);
	const { element, secondary } = rollAffinities(root.fork('affinity'), template, resolvedProfile);

	const tiltContext: TiltContext = {
		physiology: phys.physiology,
		heightBand: phys.heightBand,
		weightBand: phys.weightBand,
		capabilityBands: phys.capabilityBands,
		senseBands: phys.senseBands,
		attributes,
		attributeBands,
		element,
	};
	const traits = rollTraits(root.fork('traits'), template, tiltContext, resolvedProfile);
	const finish = rollFinish(root.fork('appearance'), resolvedProfile);
	const abilities = rollAbilities(root.fork('abilities'), template, element, secondary, registries || ({} as Registries), catalog || ({} as AbilityCatalog));
	const temperament = rollTemperament(root.fork('temperament'), attributes, archetype, traits);
	const id = `xal_${root.fork('id').hex(20)}`;

	return {
		id,
		species: template.key,
		provenance: {
			seed: String(seed),
			generatorVersion: GENERATOR_VERSION,
			schemaVersion: SCHEMA_VERSION,
			generatedAt: generatedAt || new Date().toISOString(),
			origin: origin || template.homePlanet,
			serial: typeof serial === 'number' ? serial : 1,
			profile: resolvedProfile,
		},
		physiology: phys.physiology,
		archetype,
		attributes,
		element,
		traits,
		temperament,
		appearance: { finish },
		actions: abilities,
		passives: template.passives.map(a=>({...structuredClone(a),intensity:rollInBand(root.fork('passive:'+a.key),a.intensity)})),
		signature: {...template.signature},
	};
}

/*
	generateBatch({ templates, seed, count, registries, catalog, generatedAt })
	  -> array of records, cycling through the templates in order so a batch of N covers
	     every species about N / templates.length times. Deterministic under seed.
*/
export function generateBatch({ templates, seed, count, registries, catalog, generatedAt, profile }: GenerateBatchArgs): XalianRecord[] {
	if (!Array.isArray(templates) || templates.length === 0) {
		return [];
	}
	const records: XalianRecord[] = [];
	for (let i = 0; i < count; i++) {
		const template = templates[i % templates.length];
		const serial = Math.floor(i / templates.length) + 1;
		records.push(generateXalian({
			template,
			seed: `${seed}-${i}`,
			origin: template.homePlanet,
			serial,
			generatedAt,
			registries,
			catalog,
			profile,
		}));
	}
	return records;
}
