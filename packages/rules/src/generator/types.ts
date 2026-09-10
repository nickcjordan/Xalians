/*
	Generator types. The species template, registries, ability catalog and generated
	record shapes are no longer hand-written here: `@xalians/content/schema` derives them
	from zod schemas (docs/design/xalian-creature-data-structure.md), and this file
	re-exports those so every existing `from './types.ts'` import keeps working. What
	remains here is generator-internal: types with no schema counterpart, because they
	describe something the schema doesn't (a roll band, the generator's own option bags,
	the lever tables in constants.ts) or narrow a schema field the schema itself leaves as
	a bare `string` (the closed key unions below -- see "Schema changes" in the PR that
	introduced this file for why those stay local instead of widening call sites).
*/

export type {
	AbilityCatalog,
	CatalogEntry,
	Registries,
	SpeciesRecordsBundle,
	SpeciesTemplate,
	XalianRecord,
} from '@xalians/content/schema';

// a [min, max] roll band; JSON stores these as two-element arrays. The schema expresses
// the same shape as a validated tuple inline (speciesTemplate.ts's `range()`) but does
// not export a standalone name for it.
export type Band = [number, number];

/*
	registries.json's closed vocabularies are zod enums built from the JSON at runtime
	(packages/content/src/schema/registries.ts), which keeps the *values* honest but,
	because `resolveJsonModule` types every JSON string as plain `string`, their z.infer
	type is `string`, not a literal union -- so the schema has no narrow-key counterpart
	to re-export here. The generator leans on these unions for real safety (exhaustive
	switches in generate.ts, `Record<AttributeKey, ...>` maps that must stay total), so
	they stay hand-written and local rather than being loosened to `string` at every call
	site. See "Schema changes" in this PR's description for the follow-up option.
*/
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
// generateXalian / generateBatch options -- generator-internal, no schema counterpart
// -----------------------------------------------------------------------------------

import type { AbilityCatalog, Registries, SpeciesTemplate } from '@xalians/content/schema';

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
// constants.ts lever tables -- generator-internal, no schema counterpart
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
