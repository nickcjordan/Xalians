/*
	Shared types for the generator: the species template shape (speciesRecords.json), the
	registries shape (registries.json), the ability catalog shape (abilityCatalog.json),
	and the generated creature record shape, per docs/design/xalian-creature-data-structure.md
	and docs/design/sample-record-graviclaw.json.

	These are derived from what generate.js/index.js/grade.js actually read and write, not
	hand-invented. A zod-validated version of the record and template shapes is being built
	independently in packages/content/src/schema (branch content/schemas); these types are
	the structural contract this package needs until that lands, and are deliberately loose
	where the JSON data is looser than the ratified doc (see the `Band` / optional-field
	notes below).
*/

// a [min, max] roll band; JSON stores these as two-element arrays
export type Band = [number, number];

export type AttributeKey =
	| 'strength' | 'vitality' | 'endurance' | 'agility' | 'reflex'
	| 'intelligence' | 'willpower' | 'instinct' | 'charisma' | 'resilience';

export type CapabilityKey = 'flight' | 'swim' | 'burrow' | 'climb' | 'sprint' | 'leap' | 'manipulation';
export type GradedSenseKey = 'sight' | 'hearing' | 'smell';
export type TemperamentKey = 'boldness' | 'curiosity' | 'energy' | 'aggression' | 'sociability';

export type ElementKey =
	| 'fire' | 'water' | 'dark' | 'light' | 'plant' | 'electric' | 'ghost'
	| 'rock' | 'chemical' | 'air' | 'psychic' | 'ice' | 'metal' | 'sand';

export type Chirality = 'levo' | 'dextro' | 'achiral';
export type Corporeality = 'corporeal' | 'non-corporeal';
export type Finish = 'standard' | 'gleam' | 'prismatic' | 'eclipse';

// -----------------------------------------------------------------------------------
// species template (one entry of @xalians/content/speciesRecords.json's `records` array)
// -----------------------------------------------------------------------------------

export interface SpeciesTemplateSize {
	heightCm: Band;
	weightKg: Band;
}

export interface SpeciesTemplatePhysiology {
	corporeality?: Corporeality;
	composition?: { primary?: string; secondary?: string };
	bodyPlan?: string;
	anatomy?: string[];
	covering?: string;
	size: SpeciesTemplateSize;
	lifespan?: string;
	genome?: { chirality?: 'rolled' | Chirality };
	diet?: string;
	communication?: string[];
	breathes?: string[];
	environmentalTolerance?: {
		ambientMedia?: string[];
		temperatureC?: { min: number; max: number };
	};
	capabilities?: Partial<Record<CapabilityKey, Band>>;
	senses?: Partial<Record<GradedSenseKey, Band>> & { special?: string[] };
}

export interface SpeciesTemplateSignatureAbility {
	name: string;
	instrument: string;
	action: string;
	medium: string;
	intensity: Band;
	description?: string;
}

export interface SpeciesTemplate {
	key: string;
	name: string;
	element: ElementKey;
	homePlanet: string;
	generatorPlanets?: string[];
	lore?: Record<string, unknown>;
	physiology: SpeciesTemplatePhysiology;
	archetypeWeights: Record<string, number>;
	attributes: Record<AttributeKey, Band>;
	traits: { pool: Record<string, number> };
	instruments: string[];
	conduits?: Record<string, string>;
	signatureAbility: SpeciesTemplateSignatureAbility;
}

export interface SpeciesRecordsBundle {
	records: SpeciesTemplate[];
}

// -----------------------------------------------------------------------------------
// registries.json
// -----------------------------------------------------------------------------------

export interface ArchetypeRow {
	key: string;
	name: string;
	nature: string;
	favors: string[];
}

export interface Registries {
	version?: string;
	note?: string;
	archetypes: ArchetypeRow[];
	instrumentActions: Record<string, string[]>;
	[key: string]: unknown;
}

// -----------------------------------------------------------------------------------
// abilityCatalog.json
// -----------------------------------------------------------------------------------

// a bare name (untagged, ordinary heft), [name, tags] (ordinary heft), or
// [name, tags, heft] (heft 1 or 3) — scripts/bundleAbilityCatalog.js's entry shape
export type CatalogEntry = string | [string, string[]] | [string, string[], number];

export interface AbilityCatalog {
	elements: Record<string, Record<string, CatalogEntry[]>>;
	neutral: Record<string, CatalogEntry[]>;
	counts?: { heft?: Record<string, number>; [key: string]: unknown };
	[key: string]: unknown;
}

// -----------------------------------------------------------------------------------
// generated record (generate.js's generateXalian output; docs/design/
// xalian-creature-data-structure.md section 2)
// -----------------------------------------------------------------------------------

export interface RecordProvenance {
	seed: string;
	generatorVersion: string;
	schemaVersion: string;
	generatedAt: string;
	origin: string;
	serial: number;
}

export interface RecordPhysiology {
	corporeality: Corporeality;
	composition: { primary: string; secondary?: string };
	bodyPlan: string;
	anatomy: string[];
	covering: string;
	heightCm: number;
	weightKg: number;
	lifespan: string;
	genome: { chirality: Chirality };
	diet: string;
	communication: string[];
	breathes: string[];
	environmentalTolerance: {
		ambientMedia: string[];
		temperatureC: { min: number; max: number };
	};
	capabilities: Record<CapabilityKey, number>;
	senses: Record<GradedSenseKey, number> & { special?: string[] };
}

export interface RecordArchetype {
	key: string;
	favors: string[];
}

export interface RecordElement {
	primary: ElementKey;
	affinities: Partial<Record<ElementKey, number>>;
}

export interface RecordAbility {
	name: string;
	signature: boolean;
	instrument: string;
	action: string;
	medium: string;
	intensity: number;
	description?: string;
}

export interface XalianRecord {
	id: string;
	species: string;
	provenance: RecordProvenance;
	physiology: RecordPhysiology;
	archetype: RecordArchetype;
	attributes: Record<AttributeKey, number>;
	element: RecordElement;
	traits: string[];
	temperament: Record<TemperamentKey, number>;
	appearance: { finish: Finish };
	abilities: RecordAbility[];
}

// -----------------------------------------------------------------------------------
// generateXalian / generateBatch options
// -----------------------------------------------------------------------------------

export interface GenerateOptions {
	origin?: string;
	serial?: number;
	generatedAt?: string;
}

export interface GenerateBatchOptions extends Omit<GenerateOptions, 'origin' | 'serial'> {
	templates?: SpeciesTemplate[];
}

export interface GenerateXalianArgs {
	template: SpeciesTemplate;
	seed: string | number;
	origin?: string;
	serial?: number;
	generatedAt?: string;
	registries?: Registries;
	catalog?: AbilityCatalog;
}

// -----------------------------------------------------------------------------------
// constants.js lever tables
// -----------------------------------------------------------------------------------

export interface TraitTiltSpec {
	on: string; // "mass" | "height" | "senses" | "capability:<key>" | "attribute:<key>" | "affinity:<key>"
	dir: 1 | -1;
}

export interface TemperamentTiltSpec {
	attributes: AttributeKey[];
	traits?: Record<string, number>;
	archetypes?: Record<string, number>;
}

export type FinishOdds = Array<[Finish, number]>;

export interface GenerateBatchArgs {
	templates: SpeciesTemplate[];
	seed: string | number;
	count: number;
	registries?: Registries;
	catalog?: AbilityCatalog;
	generatedAt?: string;
}
