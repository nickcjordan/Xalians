/*
	Generator types. The species template, registries, ability catalog and generated
	record shapes are no longer hand-written here: `@xalians/content/schema` derives them
	from zod schemas (docs/design/xalian-creature-data-structure.md), and this file
	re-exports those so every existing `from './types.ts'` import keeps working. What
	remains here is generator-internal: types with no schema counterpart, because they
	describe something the schema doesn't (a roll band, the generator's own option bags,
	the lever tables in constants.ts).
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
	registries.json's closed vocabularies used to widen to `string` here because
	`resolveJsonModule` types every JSON string as plain `string`, so
	packages/content/src/schema/registries.ts could only build zod enums whose z.infer was
	`string`, not a literal union -- and this file hand-wrote eight of these unions as the
	only source of real narrowing (issue #181). Fixed by generating
	packages/content/src/registriesConst.ts (literal `as const` key arrays, from
	scripts/bundleLore.js) and building the zod enums from that instead of the JSON import;
	the schema's z.infer types are now the literal unions, so this file imports and
	re-exports them (a plain `export type { X } from ...` re-export does not bind the name
	locally, and TemperamentTiltSpec/FinishOdds below need to reference some of these, so
	they come in as a regular `import type` and are re-exported alongside). AttributeKey,
	CapabilityKey, ElementKey, ArchetypeKey, TraitKey, InstrumentKey and ActionKey come from
	registries.json via registriesConst.ts; GradedSenseKey, TemperamentKey, Chirality and
	Finish are not registry lists (temperament axes, instance chirality and cosmetic finish
	are fixed parts of the record shape, and GradedSenseKey is the registries.senses split
	by its `special` flag) so their one hand-authored source is
	packages/content/src/schema/record.ts, not this file. Corporeality keeps its
	generator-facing name here (re-exported from CorporealityKey) to avoid touching every
	call site.
*/
import type {
	AbilityCatalog,
	ActionKey,
	ArchetypeKey,
	AttributeKey,
	CapabilityKey,
	Chirality,
	CorporealityKey,
	ElementKey,
	Finish,
	GradedSenseKey,
	InstrumentKey,
	Registries,
	SpeciesTemplate,
	TemperamentKey,
	TraitKey,
} from '@xalians/content/schema';

export type {
	ActionKey,
	ArchetypeKey,
	AttributeKey,
	CapabilityKey,
	Chirality,
	ElementKey,
	Finish,
	GradedSenseKey,
	InstrumentKey,
	TemperamentKey,
	TraitKey,
};
export type { CorporealityKey as Corporeality };

// -----------------------------------------------------------------------------------
// generateXalian / generateBatch options -- generator-internal, no schema counterpart
// -----------------------------------------------------------------------------------

// The showroom lever (issue #197, docs/design/xalians-platform-vision-and-economy.md
// section 3): 'full' is the current unconstrained generator, 'showroom' pins finish to
// standard, drops rare trait outcomes and never rolls a secondary affinity. It is a
// generator-internal option, not an entitlement check -- see constants.ts's
// SHOWROOM_PROFILE for the actual table and apps/web's toggle for how it is driven today.
export type GeneratorProfile = 'full' | 'showroom';

export interface GenerateOptions {
	origin?: string;
	serial?: number;
	generatedAt?: string;
	profile?: GeneratorProfile;
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
	profile?: GeneratorProfile;
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
	profile?: GeneratorProfile;
}
