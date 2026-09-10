// Schema for registries.json: the machine-readable controlled vocabularies published
// alongside the creature record schema (docs/design/xalian-creature-data-structure.md
// section 4). Every closed list documented there (attributes, archetypes, traits,
// elements, anatomy, channels, actions, and the physiology sub-vocabularies) is asserted
// here as a zod enum built from ../registriesConst.ts, a generated file of literal
// `as const` key arrays (see scripts/bundleLore.js). That file, not registries.json
// directly, is the enum source: `resolveJsonModule` types every JSON string as plain
// `string`, so a z.enum built straight from the JSON import would infer `string`, not the
// literal key union (issue #181). registriesConst.ts is generated FROM registries.json in
// the same bundle step, so the two cannot drift -- `npm run check:bundle -w
// packages/content` fails CI if registriesConst.ts is stale relative to it, the same way
// it already fails for a stale registries.json.
import { z } from 'zod';
import {
  ACTION_KEYS,
  ANATOMY_KEYS,
  ARCHETYPE_KEYS,
  ATTRIBUTE_KEYS,
  BODY_PLAN_KEYS,
  CAPABILITY_KEYS,
  CHANNEL_KEYS,
  COMMUNICATION_KEYS,
  COMPOSITION_KEYS,
  CORPOREALITY_KEYS,
  COVERING_KEYS,
  DIET_KEYS,
  ELEMENT_KEYS,
  GRADED_SENSE_KEYS,
  LIFESPAN_KEYS,
  MEDIUM_PHASE_KEYS,
  SPECIAL_SENSE_KEYS,
  TEMPLATE_CHIRALITY_KEYS,
  TRAIT_KEYS,
} from '../registriesConst.ts';

// ---- registry entry shape -------------------------------------------------------------

const RegistryEntrySchema = z.object({
  key: z.string(),
  name: z.string(),
  nature: z.string(),
});

const ArchetypeEntrySchema = RegistryEntrySchema.extend({
  favors: z.array(z.string()),
});

// ---- closed-list enums, derived from the generated const arrays ------------------------

export const AttributeKeySchema = z.enum(ATTRIBUTE_KEYS);
export const ArchetypeKeySchema = z.enum(ARCHETYPE_KEYS);
export const TraitKeySchema = z.enum(TRAIT_KEYS);
export const ElementKeySchema = z.enum(ELEMENT_KEYS);
export const CapabilityKeySchema = z.enum(CAPABILITY_KEYS);
export const SenseKeySchema = z.enum([...GRADED_SENSE_KEYS, ...SPECIAL_SENSE_KEYS] as const);
export const AnatomyKeySchema = z.enum(ANATOMY_KEYS);
export const ChannelKeySchema = z.enum(CHANNEL_KEYS);
export const ActionKeySchema = z.enum(ACTION_KEYS);

// The instrument vocabulary an ability's `instrument` field draws from is anatomy keys
// plus the innate channel keys (docs/design/xalian-creature-data-structure.md section 4:
// "34 keys + 7 innate channels"); instrumentActions in the JSON is keyed by exactly this
// union.
export const InstrumentKeySchema = z.enum([...ANATOMY_KEYS, ...CHANNEL_KEYS] as const);

export const CorporealityKeySchema = z.enum(CORPOREALITY_KEYS);
export const CompositionKeySchema = z.enum(COMPOSITION_KEYS);
export const BodyPlanKeySchema = z.enum(BODY_PLAN_KEYS);
export const CoveringKeySchema = z.enum(COVERING_KEYS);
export const DietKeySchema = z.enum(DIET_KEYS);
export const CommunicationKeySchema = z.enum(COMMUNICATION_KEYS);
export const MediumPhaseKeySchema = z.enum(MEDIUM_PHASE_KEYS);
export const LifespanKeySchema = z.enum(LIFESPAN_KEYS);
// The template's roll MODE ("rolled" | "achiral"), not the per-instance value domain --
// see the TODO(lever) note by ChiralitySchema in ./record.ts.
export const ChiralityKeySchema = z.enum(TEMPLATE_CHIRALITY_KEYS);

// ---- exported key types, derived from the schemas above --------------------------------
// packages/rules/src/generator/types.ts re-exports these instead of hand-writing the
// unions (issue #181); z.infer is now the literal key union because the schemas above are
// built from registriesConst.ts's `as const` arrays, not from the plain-`string`-typed
// JSON import.

export type AttributeKey = z.infer<typeof AttributeKeySchema>;
export type ArchetypeKey = z.infer<typeof ArchetypeKeySchema>;
export type TraitKey = z.infer<typeof TraitKeySchema>;
export type ElementKey = z.infer<typeof ElementKeySchema>;
export type CapabilityKey = z.infer<typeof CapabilityKeySchema>;
export type SenseKey = z.infer<typeof SenseKeySchema>;
export type AnatomyKey = z.infer<typeof AnatomyKeySchema>;
export type ChannelKey = z.infer<typeof ChannelKeySchema>;
export type ActionKey = z.infer<typeof ActionKeySchema>;
export type InstrumentKey = z.infer<typeof InstrumentKeySchema>;
export type CorporealityKey = z.infer<typeof CorporealityKeySchema>;
export type CompositionKey = z.infer<typeof CompositionKeySchema>;
export type BodyPlanKey = z.infer<typeof BodyPlanKeySchema>;
export type CoveringKey = z.infer<typeof CoveringKeySchema>;
export type DietKey = z.infer<typeof DietKeySchema>;
export type CommunicationKey = z.infer<typeof CommunicationKeySchema>;
export type MediumPhaseKey = z.infer<typeof MediumPhaseKeySchema>;
export type LifespanKey = z.infer<typeof LifespanKeySchema>;
export type TemplateChiralityKey = z.infer<typeof ChiralityKeySchema>;

// ---- the whole file ---------------------------------------------------------------------

const PhysiologyRegistrySchema = z.object({
  corporeality: z.array(RegistryEntrySchema),
  composition: z.array(RegistryEntrySchema),
  bodyPlan: z.array(RegistryEntrySchema),
  covering: z.array(RegistryEntrySchema),
  diet: z.array(RegistryEntrySchema),
  communication: z.array(RegistryEntrySchema),
  media: z.array(RegistryEntrySchema),
  lifespan: z.array(RegistryEntrySchema),
  chirality: z.array(RegistryEntrySchema),
});

export const RegistriesSchema = z.object({
  version: z.string(),
  note: z.string(),
  attributes: z.array(RegistryEntrySchema).length(10),
  archetypes: z.array(ArchetypeEntrySchema).length(16),
  traits: z.array(RegistryEntrySchema),
  elements: z.array(RegistryEntrySchema).length(14),
  physiology: PhysiologyRegistrySchema,
  capabilities: z.array(RegistryEntrySchema),
  senses: z.array(RegistryEntrySchema),
  anatomy: z.array(RegistryEntrySchema),
  channels: z.array(RegistryEntrySchema),
  actions: z.array(RegistryEntrySchema).length(16),
  // instrument key -> the action keys that instrument can perform (the allowed-actions
  // matrix). Values are validated against ActionKeySchema; keys are validated against the
  // instrument union by the test suite (z.record can't express "exactly these keys" here
  // without duplicating the union check, so the test cross-checks key coverage directly).
  instrumentActions: z.record(z.string(), z.array(ActionKeySchema)),
});

export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;
export type ArchetypeEntry = z.infer<typeof ArchetypeEntrySchema>;
export type Registries = z.infer<typeof RegistriesSchema>;
